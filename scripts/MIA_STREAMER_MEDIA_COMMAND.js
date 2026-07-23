"use strict";

/**
 * Streamer (VasaSpinak) — na povel přehraje dlouhé video/písničku (>2 min).
 * Šéf může kdykoli (i mimo solo) kvůli testům; ostatní nemají přístup.
 * Chat: „MIA, přehraj písničku“ / „mia prehraj video“
 */

const path = require("path");
const { loadCatalog, resolveMediaAbs } = require("./MIA_MEDIA_CATALOG");
const { resolveStreamerAccess } = require("./MIA_STREAMER_ACCESS");

const MIN_LONG_MEDIA_MS = Math.max(
  120_000,
  Number(process.env.MIA_STREAMER_MEDIA_MIN_MS || 120_000)
);
const PLAYBACK_COOLDOWN_MS = Math.max(
  15_000,
  Number(process.env.MIA_STREAMER_MEDIA_COOLDOWN_MS || 30_000)
);

const MIA_ALIASES = ["mia", "mio", "miu", "mii", "myo"];

const SONG_HINTS = ["pisnick", "pisen", "hudb", "song", "music", "audio", "track"];
const VIDEO_HINTS = ["video", "klip", "clip", "film", "pribeh", "story"];

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeCommandText(message = "") {
  return safeString(message)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[!?.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasWord(text = "", words = []) {
  const padded = ` ${text} `;
  return words.some((word) => padded.includes(` ${word} `) || text.startsWith(`${word} `));
}

function mentionsMia(text = "") {
  return MIA_ALIASES.some((alias) => hasWord(text, [alias]));
}

function hasPlayVerb(text = "") {
  return (
    /\b(prehraj|prehr|pus(t|ť)|pusti|spust|play)\b/.test(text) ||
    /\b(dej|dej mi|pust)\s+(pisnick|video|hudb|klip|song)/.test(text)
  );
}

function parseStreamerMediaCommand(message = "") {
  const text = normalizeCommandText(message);
  if (!text || !mentionsMia(text) || !hasPlayVerb(text)) {
    return null;
  }

  if (/\b(testy|testu|testovani|demo|ukaz|ukazka|showcase|funkce)\b/.test(text)) {
    return null;
  }

  if (SONG_HINTS.some((hint) => text.includes(hint))) {
    return { kind: "song", raw: text };
  }

  if (VIDEO_HINTS.some((hint) => text.includes(hint))) {
    return { kind: "video", raw: text };
  }

  if (/\b(prehraj|prehr|pus(t|ť)|pusti|spust|play)\b/.test(text)) {
    return { kind: "video", raw: text };
  }

  return null;
}

function isSoloHostMode(ctx = {}) {
  const outputState = ctx.outputState || {};
  const worldMode = safeString(
    outputState.worldMode || ctx.ecosystemState?.worldMode,
    "default"
  ).toLowerCase();

  if (worldMode === "nejsem_tu") {
    return true;
  }

  const soloModule = ctx.soloStreamModule;
  if (soloModule && typeof soloModule.getSoloStreamState === "function") {
    const phase = safeString(soloModule.getSoloStreamState(outputState).phase).toLowerCase();
    if (phase === "solo") {
      return true;
    }
  }

  return false;
}

function scoreLongMediaItem(item = {}, kind = "video") {
  let score = toNumber(item.qualityScore, 0);
  const durationMs = toNumber(item.durationMs, 0);
  const contentKind = safeString(item.contentKind);

  if (durationMs >= MIN_LONG_MEDIA_MS) score += 4;
  if (durationMs >= 180_000) score += 2;

  if (kind === "song") {
    if (contentKind === "story_music") score += 12;
    if (item.hasEmbeddedAudio === true) score += 8;
  } else {
    if (contentKind === "story_legend") score += 10;
    if (contentKind === "story_epic") score += 8;
    if (contentKind === "story_music") score += 4;
    if (contentKind === "donator_moment") score += 3;
  }

  return score;
}

function listLongMediaCandidates(catalog = null, kind = "video") {
  const items = Array.isArray(catalog?.items) ? catalog.items : [];

  return items
    .filter((item) => item?.kind === "videos")
    .filter((item) => toNumber(item.durationMs, 0) >= MIN_LONG_MEDIA_MS)
    .filter((item) => {
      if (kind !== "song") return true;
      const contentKind = safeString(item.contentKind);
      return contentKind === "story_music" || item.hasEmbeddedAudio === true;
    })
    .sort((a, b) => {
      const scoreDiff = scoreLongMediaItem(b, kind) - scoreLongMediaItem(a, kind);
      if (scoreDiff !== 0) return scoreDiff;
      return toNumber(b.durationMs, 0) - toNumber(a.durationMs, 0);
    });
}

function pickRotatedMedia(catalog = null, kind = "video", outputState = {}) {
  const candidates = listLongMediaCandidates(catalog, kind);
  if (!candidates.length) return null;

  if (!outputState.streamerMediaRotation || typeof outputState.streamerMediaRotation !== "object") {
    outputState.streamerMediaRotation = {};
  }

  const key = `long_${kind}`;
  const index = toNumber(outputState.streamerMediaRotation[key], 0) % candidates.length;
  outputState.streamerMediaRotation[key] = index + 1;

  const pick = candidates[index];
  const abs = resolveMediaAbs(catalog, pick.rel || pick.id);
  if (!abs) return null;

  return {
    ...pick,
    abs: path.normalize(abs),
    kind
  };
}

function resolveObsSlotForLongMedia(catalog = null, runtimeConfig = {}) {
  const slots =
    catalog?.tierSlotNames?.T5 ||
    runtimeConfig?.obs?.tierSources?.T5 ||
    [];

  if (Array.isArray(slots) && slots.length > 0) {
    return safeString(slots[0], "T5_VIDEO_19");
  }

  return "T5_VIDEO_19";
}

function formatDurationLabel(durationMs = 0) {
  const totalSec = Math.max(0, Math.round(toNumber(durationMs, 0) / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min <= 0) return `${sec} s`;
  if (sec === 0) return `${min} min`;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function buildAckOverlay(kind = "video", media = {}, userLabel = "Spináku") {
  const label = kind === "song" ? "písničku" : "video";
  const durationLabel = formatDurationLabel(media.durationMs);
  const title = safeString(media.title || media.rel || "dlouhý klip");

  return {
    owner: "mia",
    speaker: "mia",
    route: "community",
    title: "MIA",
    text: `${userLabel}, pouštím ${label} (${durationLabel}).`,
    subtext: title.slice(0, 72),
    mood: "focused",
    stage: "streamer_media",
    action: "streamer_solo_media",
    holdMs: 6800,
    priority: 3,
    meta: {
      source: "streamer_media_command",
      kind,
      durationMs: media.durationMs,
      rel: media.rel,
      contentKind: media.contentKind
    }
  };
}

function buildRejectOverlay(reason = "", userLabel = "") {
  const messages = {
    streamer_only: "Přehrání dlouhého videa je jen pro streamera.",
    solo_mode_only: "Dlouhé video jde jen v solo / Nejsem tu režimu.",
    cooldown: "Počkej chvíli, minule jsem ještě hrála klip.",
    no_media: "Nemám v knihovně video delší než 2 minuty.",
    video_busy: "Teď běží jiné video — zkus to za moment.",
    obs_unavailable: "Video engine teď není dostupný.",
    playback_failed: "Video se nepodařilo spustit — zkontroluj OBS slot T5 a restart MIA.",
    forced_source_not_found: "V OBS chybí slot pro dlouhé video (T5)."
  };

  return {
    owner: "mia",
    speaker: "mia",
    route: "community",
    title: "MIA",
    text: messages[reason] || "Teď to nejde spustit.",
    subtext: "streamer_media",
    mood: "warm",
    stage: "streamer_media_reject",
    holdMs: 5200,
    priority: 2,
    meta: {
      source: "streamer_media_command",
      rejected: reason,
      userLabel
    }
  };
}

function canPlayNow(outputState = {}, videoSnapshot = {}) {
  const lastAt = toNumber(outputState.lastStreamerMediaAt, 0);
  if (lastAt > 0 && Date.now() - lastAt < PLAYBACK_COOLDOWN_MS) {
    return { ok: false, reason: "cooldown" };
  }

  if (
    videoSnapshot?.processing ||
    videoSnapshot?.specialPlaybackActive ||
    safeString(videoSnapshot?.currentPlayback?.sourceName)
  ) {
    return { ok: false, reason: "video_busy" };
  }

  return { ok: true, reason: "ready" };
}

async function executeStreamerMediaPlay(ctx = {}) {
  const {
    normalized = {},
    outputState = {},
    runtimeConfig = {},
    videoEngine,
    writeLog
  } = ctx;

  const parsed = ctx.parsed || parseStreamerMediaCommand(normalized.message);
  if (!parsed) {
    return { ok: false, reason: "not_a_command" };
  }

  const userLabel = safeString(
    normalized.user?.nickname || normalized.user?.username || normalized.nickname,
    "Streamer"
  );
  const access = resolveStreamerAccess(userLabel, runtimeConfig);
  if (!access.isStreamerBoss) {
    return { ok: false, reason: "streamer_only" };
  }

  const videoSnapshot =
    videoEngine && typeof videoEngine.getSnapshot === "function"
      ? videoEngine.getSnapshot()
      : {};

  const gate = canPlayNow(outputState, videoSnapshot);
  if (!gate.ok) {
    return { ok: false, reason: gate.reason };
  }

  const catalog = loadCatalog();
  const media =
    ctx.media && ctx.media.abs
      ? ctx.media
      : pickRotatedMedia(catalog, parsed.kind, outputState);
  if (!media?.abs) {
    return { ok: false, reason: "no_media" };
  }

  if (!videoEngine || typeof videoEngine.playSpecialEvent !== "function") {
    return { ok: false, reason: "obs_unavailable" };
  }

  const durationMs = toNumber(media.durationMs, MIN_LONG_MEDIA_MS);
  const obsSource = resolveObsSlotForLongMedia(catalog, runtimeConfig);
  const maxWaitMs = Math.min(durationMs + 25_000, 900_000);

  outputState.lastStreamerMediaAt = Date.now();
  outputState.lastStreamerMedia = {
    kind: parsed.kind,
    rel: media.rel,
    durationMs,
    startedAt: Date.now()
  };

  if (typeof writeLog === "function") {
    writeLog("mia-events", {
      ts: Date.now(),
      stage: "streamer_media_play_start",
      kind: parsed.kind,
      rel: media.rel,
      durationMs,
      obsSource,
      userLabel
    });
  }

  const result = await videoEngine.playSpecialEvent("T5", normalized, {
    sourceName: obsSource,
    mediaAbs: media.abs,
    mediaRel: media.rel,
    playbackMs: durationMs + 3000,
    waitForMediaEnd: true,
    maxWaitMs,
    forceFullPlayback: true,
    reason: "streamer_solo_media",
    mediaPick: {
      obsSource,
      rel: media.rel,
      abs: media.abs,
      durationMs,
      streamerFullPlay: true,
      hasEmbeddedAudio: media.hasEmbeddedAudio === true,
      contentKind: safeString(media.contentKind),
      contentKindLabel: safeString(media.contentKindLabel, "dlouhý klip"),
      pickedBy: "streamer_media_command"
    }
  });

  if (typeof writeLog === "function") {
    writeLog("mia-events", {
      ts: Date.now(),
      stage: "streamer_media_play_done",
      ok: result?.ok === true,
      reason: result?.reason || null,
      rel: media.rel
    });
  }

  return {
    ok: result?.ok === true,
    reason: result?.ok ? "played" : result?.reason || "playback_failed",
    media,
    result
  };
}

module.exports = {
  MIN_LONG_MEDIA_MS,
  PLAYBACK_COOLDOWN_MS,
  parseStreamerMediaCommand,
  isSoloHostMode,
  listLongMediaCandidates,
  pickRotatedMedia,
  buildAckOverlay,
  buildRejectOverlay,
  canPlayNow,
  executeStreamerMediaPlay,
  formatDurationLabel
};
