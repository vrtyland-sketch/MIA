"use strict";

/**
 * shared/mia-gift-animation — stream gift → ~10s animation (procedural v1).
 *
 * Flow:
 *  1) Resolve gift via gift map (LION/lev/…)
 *  2) Build prompt from gift + avatar + optional viewer words
 *  3) Generate procedural pack (manifest + poster + optional ken-burns webm)
 *  4) Publish to overlay-state for OBS browser source
 *
 * Not a Runway/Sora video model — motion graphics from stills. Same API shape
 * can later call a real video provider without changing OBS wiring.
 */

const fs = require("fs");
const path = require("path");
const { getConfig, saveDiskConfig } = require("./config");
const { buildPromptBrief } = require("./promptBuilder");
const { generateProceduralAnimation, OUT_DIR } = require("./proceduralRenderer");

const ROOT = path.resolve(__dirname, "..", "..");

let activeJob = null;
let pendingAsk = null;
let pendingAskTimer = null;
let lastJobs = [];
let overlayHooks = {
  getOverlayState: null,
  overlayStateModule: null,
  invalidateOverlayStateCache: null,
  writeLog: null,
  scheduleObsBrowserRefresh: null,
  ensureGiftAnimationObsVisible: null
};

const TIER_RANK = { T0: 0, T1: 1, T2: 2, T3: 3, T4: 4, T5: 5, T6: 6 };

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeUser(value) {
  return safeString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function bindOverlayHooks(hooks = {}) {
  overlayHooks = { ...overlayHooks, ...hooks };
}

function writeLog(channel, payload) {
  if (typeof overlayHooks.writeLog === "function") {
    try {
      overlayHooks.writeLog(channel, payload);
    } catch (_err) {
      /* ignore */
    }
  }
}

function resolveGiftIdentity(input = {}) {
  let giftKey = safeString(input.giftKey);
  let giftLabel = safeString(input.giftLabel || input.giftName);
  try {
    const gifts = require("../gifts");
    const resolved =
      typeof gifts.resolveGift === "function"
        ? gifts.resolveGift({
            giftName: giftLabel || giftKey || input.giftName,
            giftId: input.giftId
          })
        : null;
    if (resolved?.giftKey) {
      giftKey = resolved.giftKey;
      giftLabel = safeString(resolved.label || giftLabel, giftKey);
    }
  } catch (_err) {
    /* gift map optional at import time */
  }
  if (!giftKey && giftLabel) giftKey = giftLabel.toUpperCase();
  return { giftKey, giftLabel: giftLabel || giftKey || "dárek" };
}

function publishActiveToOverlay(payload = {}) {
  const mod = overlayHooks.overlayStateModule;
  const getState = overlayHooks.getOverlayState;
  if (!mod || typeof mod.setGiftAnimationMoment !== "function" || typeof getState !== "function") {
    return null;
  }
  try {
    const state = getState();
    const snap = mod.setGiftAnimationMoment(state, payload);
    if (typeof overlayHooks.invalidateOverlayStateCache === "function") {
      overlayHooks.invalidateOverlayStateCache();
    }
    if (typeof overlayHooks.ensureGiftAnimationObsVisible === "function") {
      try {
        void Promise.resolve(overlayHooks.ensureGiftAnimationObsVisible());
      } catch (_err) {
        /* OBS optional */
      }
    }
    if (typeof overlayHooks.scheduleObsBrowserRefresh === "function") {
      try {
        overlayHooks.scheduleObsBrowserRefresh(true);
      } catch (_err) {
        /* OBS optional */
      }
    }
    return snap;
  } catch (_err) {
    return null;
  }
}

function getStatus() {
  const cfg = getConfig();
  return {
    ok: true,
    config: cfg,
    active: activeJob,
    pendingAsk,
    recent: lastJobs.slice(0, 8),
    outDir: OUT_DIR,
    note:
      "v32 gfx-whole = one graphics product: Soft Neon Rig Desk + tech-energy runtime + gift stage (lion/universe/galaxy WAU). trueAiVideo=false."
  };
}

function previewBrief(input = {}) {
  const id = resolveGiftIdentity(input);
  const cfg = getConfig();
  return {
    ok: true,
    brief: buildPromptBrief({
      ...input,
      ...id,
      wordsTimeoutMs: cfg.wordsTimeoutMs
    })
  };
}

async function generateNow(input = {}) {
  const id = resolveGiftIdentity(input);
  const result = await generateProceduralAnimation({
    ...input,
    giftKey: id.giftKey,
    giftLabel: id.giftLabel,
    giftName: id.giftLabel,
    profileImageUrl: input.profileImageUrl || input.avatarUrl,
    username: input.username || input.userLabel
  });

  if (!result?.ok) return result;

  activeJob = {
    jobId: result.jobId,
    manifestUrl: result.manifestUrl,
    overlayUrl: result.overlayUrl,
    posterUrl: result.posterUrl,
    videoUrl: result.videoUrl,
    giftKey: id.giftKey,
    username: result.brief.username,
    caption: result.brief.caption,
    createdAt: Date.now(),
    expiresAt: Date.now() + (result.durationMs || 10000) + 1500
  };
  lastJobs.unshift(activeJob);
  lastJobs = lastJobs.slice(0, 20);

  publishActiveToOverlay({
    jobId: result.jobId,
    manifestUrl: result.manifestUrl,
    overlayUrl: result.overlayUrl,
    posterUrl: result.posterUrl,
    videoUrl: result.videoUrl,
    avatarUrl: result.avatarUrl,
    giftKey: id.giftKey,
    giftName: id.giftLabel,
    userLabel: result.brief.username,
    caption: result.brief.caption,
    improvLine: result.brief.improvLine,
    motif: result.brief.motif,
    phase: "playing",
    holdMs: (result.durationMs || 10000) + 800,
    trueAiVideo: false,
    provider: result.provider,
    qualityTier: result.brief?.motif?.qualityTier || "mia_soft_neon_v2"
  });

  writeLog("mia-events", {
    ts: Date.now(),
    stage: "gift_animation_generated",
    jobId: result.jobId,
    giftKey: id.giftKey,
    provider: result.provider
  });

  return result;
}

function clearPendingAskTimer() {
  if (pendingAskTimer) {
    clearTimeout(pendingAskTimer);
    pendingAskTimer = null;
  }
}

/**
 * Start ask-words flow: publish chat prompt to overlay, wait for viewer reply or timeout.
 */
function startAskWords(input = {}) {
  const cfg = getConfig();
  const id = resolveGiftIdentity(input);
  const username = safeString(input.username || input.userLabel, "Divák");
  const timeoutMs = Math.max(5000, Number(input.wordsTimeoutMs) || cfg.wordsTimeoutMs);
  const brief = buildPromptBrief({
    ...input,
    ...id,
    username,
    wordsTimeoutMs: timeoutMs
  });

  clearPendingAskTimer();
  pendingAsk = {
    id: `ask-${Date.now()}`,
    giftKey: id.giftKey,
    giftLabel: id.giftLabel,
    username,
    profileImageUrl: safeString(input.profileImageUrl || input.avatarUrl),
    encodeVideo: input.encodeVideo,
    startedAt: Date.now(),
    deadlineAt: Date.now() + timeoutMs,
    askChatPrompt: brief.askChatPrompt,
    status: "waiting_words"
  };

  publishActiveToOverlay({
    phase: "ask_words",
    giftKey: id.giftKey,
    giftName: id.giftLabel,
    userLabel: username,
    caption: brief.askChatPrompt,
    improvLine: "Čekám na 1–3 slova v chatu…",
    motif: brief.motif,
    askChatPrompt: brief.askChatPrompt,
    holdMs: timeoutMs + 2000,
    trueAiVideo: false,
    provider: "procedural_v2"
  });

  writeLog("mia-events", {
    ts: Date.now(),
    stage: "gift_animation_ask_words",
    giftKey: id.giftKey,
    username
  });

  // Auto-resolve on timeout with improvised words.
  const askId = pendingAsk.id;
  pendingAskTimer = setTimeout(() => {
    pendingAskTimer = null;
    if (!pendingAsk || pendingAsk.id !== askId) return;
    if (pendingAsk.status !== "waiting_words") return;
    void finalizeAskWords(null, { reason: "timeout" });
  }, timeoutMs + 50);

  return { ok: true, pendingAsk, brief };
}

async function finalizeAskWords(words, meta = {}) {
  if (!pendingAsk) return { ok: false, error: "no_pending_ask" };
  clearPendingAskTimer();
  const snap = { ...pendingAsk };
  pendingAsk = null;
  const extraWords = safeString(words) || null;
  const result = await generateNow({
    giftKey: snap.giftKey,
    giftLabel: snap.giftLabel,
    giftName: snap.giftLabel,
    username: snap.username,
    profileImageUrl: snap.profileImageUrl,
    extraWords,
    encodeVideo: snap.encodeVideo
  });
  return {
    ok: true,
    reason: meta.reason || (extraWords ? "words_received" : "improv"),
    extraWords,
    result
  };
}

/**
 * Called when a chat message arrives (or when polling chatFeed).
 * Returns a Promise when capture triggers generation; otherwise null.
 */
function tryCaptureWordsFromChat(userLabel, text) {
  if (!pendingAsk || pendingAsk.status !== "waiting_words") return null;
  if (Date.now() > pendingAsk.deadlineAt) {
    return finalizeAskWords(null, { reason: "timeout" });
  }
  const user = normalizeUser(userLabel);
  const want = normalizeUser(pendingAsk.username);
  if (!user || !want || user !== want) return null;
  const words = safeString(text);
  if (!words || words.length > 120) return null;
  // Ignore our own prompt echo.
  if (/napiš 1.?3 slova/i.test(words)) return null;
  return finalizeAskWords(words.slice(0, 80), { reason: "chat_reply" });
}

function pollChatFeedForWords() {
  if (!pendingAsk) return null;
  const getState = overlayHooks.getOverlayState;
  if (typeof getState !== "function") return null;
  const feed = getState()?.chatFeed || [];
  for (const item of feed) {
    const hit = tryCaptureWordsFromChat(item.userLabel || item.user, item.text);
    if (hit) return hit;
  }
  return null;
}

function tierAllowed(tier, minTier) {
  const t = TIER_RANK[String(tier || "T1").toUpperCase()] ?? 1;
  const m = TIER_RANK[String(minTier || "T3").toUpperCase()] ?? 3;
  return t >= m;
}

/**
 * Optional auto hook from gift media pipeline.
 */
async function maybeQueueFromGift(normalized = {}, actionResult = {}, giftProfile = {}) {
  const cfg = getConfig();
  if (!cfg.autoEnabled && !actionResult?.forceGiftAnimation) return null;

  const giftKey = safeString(giftProfile.key || normalized?.support?.giftKey);
  if (cfg.giftKeysAllow && cfg.giftKeysAllow.length) {
    const allow = cfg.giftKeysAllow.map((k) => String(k).toUpperCase());
    if (giftKey && !allow.includes(giftKey.toUpperCase())) return null;
  }

  const tier = safeString(actionResult?.tier || normalized?.support?.tier, "T1");
  if (!tierAllowed(tier, cfg.minTier) && !actionResult?.forceGiftAnimation) return null;

  const username = safeString(
    normalized?.userLabel || normalized?.user || normalized?.support?.userLabel,
    "Divák"
  );
  const avatarUrl = safeString(
    normalized?.avatarUrl ||
      normalized?.user?.avatarUrl ||
      normalized?.support?.avatarUrl ||
      ""
  );
  const giftName = safeString(
    giftProfile.label || normalized?.support?.giftName || normalized?.giftName,
    giftKey
  );

  const payload = {
    giftKey,
    giftLabel: giftName,
    giftName,
    username,
    profileImageUrl: avatarUrl,
    userLabel: username
  };

  if (cfg.askWordsByDefault || actionResult?.askGiftAnimationWords) {
    return startAskWords(payload);
  }
  return generateNow(payload);
}

function loadManifest(jobId) {
  const id = safeString(jobId).replace(/[^a-zA-Z0-9_-]/g, "");
  if (!id) return null;
  const file = path.join(OUT_DIR, id, "manifest.json");
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (_err) {
    return null;
  }
}

function listRecentJobs(limit = 12) {
  ensureOutDir();
  if (!fs.existsSync(OUT_DIR)) return [];
  return fs
    .readdirSync(OUT_DIR)
    .filter((name) => fs.existsSync(path.join(OUT_DIR, name, "manifest.json")))
    .map((name) => {
      const st = fs.statSync(path.join(OUT_DIR, name));
      return { jobId: name, mtimeMs: st.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, Math.max(1, limit));
}

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const storyboard = require("./storyboard");

module.exports = {
  bindOverlayHooks,
  getConfig,
  saveDiskConfig,
  getStatus,
  previewBrief,
  generateNow,
  startAskWords,
  finalizeAskWords,
  tryCaptureWordsFromChat,
  pollChatFeedForWords,
  maybeQueueFromGift,
  loadManifest,
  listRecentJobs,
  resolveGiftIdentity,
  OUT_DIR,
  ROOT,
  storyboard,
  resolveStoryboard: storyboard.resolveStoryboard,
  buildStoryboardTimeline: storyboard.buildStoryboardTimeline,
  listStoryboards: storyboard.listStoryboards
};
