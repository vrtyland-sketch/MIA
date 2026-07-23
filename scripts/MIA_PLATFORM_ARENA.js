"use strict";

/**
 * Multi-platform aréna MIA:
 * - každá platforma má vlastního Kojnožrouta (body, aktivita, dárky)
 * - 5min aktivní duel napříč platformami (MIA body, ne mince platforem)
 * - turnaj: vítězná platforma vládne do dalšího turnaje
 * - statistiky platform + top uživatelé
 *
 * Ekonomika: počítáme MIA body (naše měna). TikTok ~50% z dárku je jejich
 * výplata — v aréně rozhoduje aktivita a MIA body, ne peníze platformy.
 */

const fs = require("fs");
const path = require("path");
const arenaBattle = require("./MIA_ARENA_BATTLE");

const PLATFORMS = ["tiktok", "kick", "twitch", "youtube"];

/** Phase 3 Battle MVP timing (announce → countdown → active → finished). */
const DUEL_ANNOUNCE_MS = 5_000;
const DUEL_COUNTDOWN_MS = 5_000;
const DUEL_ACTION_INTERVAL_MS = 8_000;
const DUEL_ACTION_ENERGY_COST = 12;
const DUEL_GIFT_ENERGY_GAIN = 0.35;

function envFlag(name) {
  const v = String(process.env[name] || "").trim().toLowerCase();
  if (!v) return null;
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return null;
}

/**
 * Battle phase machine ON by default (Phase 3). Set MIA_BATTLE_MVP=0 for legacy instant-active.
 */
function isBattleMvpEnabled() {
  const env = envFlag("MIA_BATTLE_MVP");
  if (env === false) return false;
  return true;
}

/**
 * Každá platforma = vlastní Kojnožrout (coin-eater, ne hrášek).
 * Detail rosteru: scripts/MIA_KOJ_ROSTER.js
 */
const PLATFORM_IDENTITY = {
  tiktok: {
    id: "tiktok",
    label: "Tokžrout",
    mascot: "Tokžrout",
    styleRef: "tok_neon",
    accent: "#00f2ea",
    accent2: "#ff0050",
    mood: "neon_combat",
    note: "Žrout clipů a coinů — boj + hravost. Neon."
  },
  kick: {
    id: "kick",
    label: "Stackžrout",
    mascot: "Stackžrout",
    styleRef: "stack_acid",
    accent: "#53fc18",
    accent2: "#0b0b0b",
    mood: "acid_stack",
    note: "Žrout stacků — duel a tlak. Acid green."
  },
  twitch: {
    id: "twitch",
    label: "Bitsžrout",
    mascot: "Bitsžrout",
    styleRef: "bits_purple",
    accent: "#9146ff",
    accent2: "#efeff1",
    mood: "bond_purple",
    note: "Žrout bitů a vazby — láska/bond + obrana. Purple."
  },
  youtube: {
    id: "youtube",
    label: "Kisstube",
    mascot: "Kisstube",
    styleRef: "kiss_radio",
    accent: "#e6007e",
    accent2: "#ff8dc7",
    accent3: "#ffd6ec",
    mood: "kiss_radio",
    note:
      "POUZE YouTube: motiv Radio Kiss. Koj = Patrik Hezucký, MIA = Barbora Tlučhořová. Pořád coin-žrout.",
    previewPng: "/assets/kojnozrout/kisstube/koj-kisstube-preview.png",
    aliases: [
      "kisstube",
      "kiss tube",
      "kiss radio",
      "kissradio",
      "júkiss",
      "jukiss",
      "raadia"
    ]
  }
};

const PLATFORM_LABELS = {
  tiktok: PLATFORM_IDENTITY.tiktok.label,
  kick: PLATFORM_IDENTITY.kick.label,
  twitch: PLATFORM_IDENTITY.twitch.label,
  youtube: PLATFORM_IDENTITY.youtube.label
};

const DEFAULT_DUEL_MS = 5 * 60 * 1000;
const DEFAULT_TOURNAMENT_MS = 30 * 60 * 1000;
const STATE_PATH = path.join(__dirname, "..", "data", "platform-arena.json");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nowTs() {
  return Date.now();
}

function normalizePlatform(value = "") {
  const p = safeString(value, "tiktok")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
  if (p === "tt" || p === "tik_tok") return "tiktok";
  if (
    p === "yt" ||
    p === "youtube.com" ||
    p === "youtube" ||
    p === "kisstube" ||
    p === "kissradio" ||
    p === "jukiss" ||
    p === "raadia" ||
    p === "raadiajukiss"
  ) {
    return "youtube";
  }
  if (PLATFORMS.includes(p)) return p;
  return "tiktok";
}

function getPlatformIdentity(id = "tiktok") {
  const key = normalizePlatform(id);
  return PLATFORM_IDENTITY[key] || PLATFORM_IDENTITY.tiktok;
}

function createPlatformKoj(id = "tiktok", seed = {}) {
  const identity = getPlatformIdentity(id);
  return {
    id: identity.id,
    label: safeString(seed.label, identity.label),
    mascot: safeString(seed.mascot, identity.mascot),
    styleRef: safeString(seed.styleRef, identity.styleRef),
    theme: {
      accent: identity.accent,
      accent2: identity.accent2,
      accent3: identity.accent3 || identity.accent2,
      mood: identity.mood,
      note: identity.note
    },
    miaPoints: toNumber(seed.miaPoints, 0),
    giftPoints: toNumber(seed.giftPoints, 0),
    activityPoints: toNumber(seed.activityPoints, 0),
    events: toNumber(seed.events, 0),
    gifts: toNumber(seed.gifts, 0),
    wins: toNumber(seed.wins, 0),
    losses: toNumber(seed.losses, 0),
    reigns: toNumber(seed.reigns, 0),
    contributors: seed.contributors && typeof seed.contributors === "object" ? seed.contributors : {}
  };
}

function createArenaState(seed = {}) {
  const platforms = {};
  for (const id of PLATFORMS) {
    const seedRow = seed.platforms?.[id] || {};
    // Identita (Kisstube / barvy) vždy z kánonu — ne ze starého save „Koj YouTube“.
    const identity = getPlatformIdentity(id);
    platforms[id] = createPlatformKoj(id, {
      ...seedRow,
      label: identity.label,
      mascot: identity.mascot,
      styleRef: identity.styleRef
    });
  }

  return {
    version: 1,
    platforms,
    duel: {
      active: Boolean(seed.duel?.active),
      phase: safeString(seed.duel?.phase, "idle"),
      startedAt: toNumber(seed.duel?.startedAt, 0),
      endsAt: toNumber(seed.duel?.endsAt, 0),
      announceEndsAt: toNumber(seed.duel?.announceEndsAt, 0),
      countdownEndsAt: toNumber(seed.duel?.countdownEndsAt, 0),
      activeStartedAt: toNumber(seed.duel?.activeStartedAt, 0),
      durationMs: toNumber(seed.duel?.durationMs, DEFAULT_DUEL_MS),
      scores: seed.duel?.scores && typeof seed.duel.scores === "object" ? seed.duel.scores : {},
      energy:
        seed.duel?.energy && typeof seed.duel.energy === "object" ? seed.duel.energy : {},
      lastActionAt: toNumber(seed.duel?.lastActionAt, 0),
      winner: seed.duel?.winner || null,
      phasesEnabled: seed.duel?.phasesEnabled !== false
    },
    tournament: {
      active: Boolean(seed.tournament?.active),
      startedAt: toNumber(seed.tournament?.startedAt, 0),
      endsAt: toNumber(seed.tournament?.endsAt, 0),
      durationMs: toNumber(seed.tournament?.durationMs, DEFAULT_TOURNAMENT_MS),
      scores: seed.tournament?.scores && typeof seed.tournament.scores === "object"
        ? seed.tournament.scores
        : {},
      champion: seed.tournament?.champion || null,
      history: Array.isArray(seed.tournament?.history) ? seed.tournament.history.slice(0, 50) : []
    },
    users: seed.users && typeof seed.users === "object" ? seed.users : {},
    battle:
      typeof arenaBattle.createBattleState === "function"
        ? arenaBattle.createBattleState(seed.battle || {})
        : { actions: [], lastActionId: 0 },
    updatedAt: toNumber(seed.updatedAt, 0)
  };
}

function loadArenaState(filePath = STATE_PATH) {
  try {
    if (!fs.existsSync(filePath)) return createArenaState();
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return createArenaState(raw);
  } catch (_err) {
    return createArenaState();
  }
}

function saveArenaState(state, filePath = STATE_PATH) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const next = createArenaState(state);
  next.updatedAt = nowTs();
  fs.writeFileSync(filePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

function bumpUser(state, platform, userLabel, points, eventType) {
  const key = `${platform}:${safeString(userLabel, "anon").toLowerCase()}`;
  if (!state.users[key]) {
    state.users[key] = {
      userLabel: safeString(userLabel, "anon"),
      platform,
      miaPoints: 0,
      gifts: 0,
      events: 0
    };
  }
  state.users[key].miaPoints += points;
  state.users[key].events += 1;
  if (eventType === "GIFT") state.users[key].gifts += 1;
}

function bumpContributor(platformRow, userLabel, points) {
  const key = safeString(userLabel, "anon").toLowerCase();
  if (!platformRow.contributors[key]) {
    platformRow.contributors[key] = {
      userLabel: safeString(userLabel, key),
      points: 0
    };
  }
  platformRow.contributors[key].points += points;
}

function resolveActivityPoints(eventType, miaPoints) {
  const type = safeString(eventType).toUpperCase();
  const base = Math.max(0, toNumber(miaPoints, 0));
  if (type === "GIFT") return Math.max(base, 1);
  if (type === "LIKE") return Math.max(1.5, base || 1.5);
  if (type === "FOLLOW") return Math.max(3, base || 3);
  if (type === "SHARE") return Math.max(2, base || 2);
  if (type === "COMMENT") return Math.max(2, base || 2);
  return base;
}

function emptyEnergyMap() {
  const energy = {};
  for (const id of PLATFORMS) energy[id] = 0;
  return energy;
}

function duelScoringOpen(duel = {}) {
  return duel.active && safeString(duel.phase) === "active" && nowTs() < toNumber(duel.endsAt, 0);
}

function ingestArenaActivity(state, payload = {}) {
  const next = createArenaState(state);
  advanceDuelPhases(next);

  const platform = normalizePlatform(payload.platform);
  const eventType = safeString(payload.eventType, "COMMENT").toUpperCase();
  const userLabel = safeString(payload.userLabel, "divák");
  const points = resolveActivityPoints(eventType, payload.miaPoints);
  if (points <= 0) return { state: next, applied: false, reason: "no_points" };

  const row = next.platforms[platform];
  row.miaPoints += points;
  row.events += 1;
  if (eventType === "GIFT") {
    row.gifts += 1;
    row.giftPoints += points;
  } else {
    row.activityPoints += points;
  }
  bumpContributor(row, userLabel, points);
  bumpUser(next, platform, userLabel, points, eventType);

  if (duelScoringOpen(next.duel)) {
    next.duel.scores[platform] = toNumber(next.duel.scores[platform], 0) + points;
    if (!next.duel.energy || typeof next.duel.energy !== "object") {
      next.duel.energy = emptyEnergyMap();
    }
    const gain =
      eventType === "GIFT"
        ? Math.max(2, points * DUEL_GIFT_ENERGY_GAIN)
        : Math.max(0.5, points * 0.15);
    next.duel.energy[platform] = Math.min(
      100,
      toNumber(next.duel.energy[platform], 0) + gain
    );
  } else if (next.duel.active && nowTs() >= next.duel.endsAt && next.duel.phase === "active") {
    finishArenaDuel(next);
  }

  if (next.tournament.active && nowTs() < next.tournament.endsAt) {
    next.tournament.scores[platform] =
      toNumber(next.tournament.scores[platform], 0) + points;
  } else if (next.tournament.active && nowTs() >= next.tournament.endsAt) {
    finishTournament(next);
  }

  next.updatedAt = nowTs();
  return { state: next, applied: true, platform, points };
}

/**
 * Battle akce z dárku/itemu — útočník = platforma zdroje.
 * Phase 3: jen ve fázi active + energy + interval limit.
 */
function pushPlatformBattleAction(state, payload = {}) {
  const next = createArenaState(state);
  advanceDuelPhases(next);

  if (!next.duel.active && !next.tournament.active) {
    return { state: next, action: null, reason: "battle_inactive" };
  }

  if (next.duel.active && next.duel.phase !== "active") {
    return { state: next, action: null, reason: `phase_${next.duel.phase}` };
  }

  const now = nowTs();
  if (
    next.duel.active &&
    next.duel.lastActionAt &&
    now - toNumber(next.duel.lastActionAt, 0) < DUEL_ACTION_INTERVAL_MS
  ) {
    return { state: next, action: null, reason: "action_interval" };
  }

  const attacker = normalizePlatform(payload.platform || payload.attacker || "tiktok");
  if (next.duel.active) {
    if (!next.duel.energy || typeof next.duel.energy !== "object") {
      next.duel.energy = emptyEnergyMap();
    }
    const energy = toNumber(next.duel.energy[attacker], 0);
    if (energy < DUEL_ACTION_ENERGY_COST) {
      return { state: next, action: null, reason: "energy" };
    }
    next.duel.energy[attacker] = Math.max(0, energy - DUEL_ACTION_ENERGY_COST);
  }

  const result = arenaBattle.pushBattleAction(next.battle, payload);
  next.battle = result.state;

  // Damage efekt: body z cílů na útočníka (token/Pokémon styl).
  const action = result.action;
  if (action && action.effect === "damage" && action.power > 0) {
    for (const target of action.targets || []) {
      const row = next.platforms[target];
      if (!row) continue;
      const steal = Math.min(row.miaPoints, action.power);
      row.miaPoints = Math.max(0, row.miaPoints - steal);
      next.platforms[action.attacker].miaPoints += steal;
      if (next.duel.active && next.duel.phase === "active") {
        next.duel.scores[target] = Math.max(
          0,
          toNumber(next.duel.scores[target], 0) - steal
        );
        next.duel.scores[action.attacker] =
          toNumber(next.duel.scores[action.attacker], 0) + steal;
      }
      if (next.tournament.active) {
        next.tournament.scores[target] = Math.max(
          0,
          toNumber(next.tournament.scores[target], 0) - steal
        );
        next.tournament.scores[action.attacker] =
          toNumber(next.tournament.scores[action.attacker], 0) + steal;
      }
    }
  }

  if (next.duel.active) {
    next.duel.lastActionAt = now;
  }
  next.updatedAt = now;
  return { state: next, action, reason: "ok" };
}

function startArenaDuel(state, options = {}) {
  const next = createArenaState(state);
  const durationMs = Math.max(30_000, toNumber(options.durationMs, DEFAULT_DUEL_MS));
  const now = nowTs();
  const scores = {};
  for (const id of PLATFORMS) scores[id] = 0;
  const phasesEnabled =
    options.phasesEnabled === false
      ? false
      : options.skipPhases === true
        ? false
        : isBattleMvpEnabled();

  if (!phasesEnabled) {
    next.duel = {
      active: true,
      phase: "active",
      startedAt: now,
      endsAt: now + durationMs,
      announceEndsAt: 0,
      countdownEndsAt: 0,
      activeStartedAt: now,
      durationMs,
      scores,
      energy: emptyEnergyMap(),
      lastActionAt: 0,
      winner: null,
      phasesEnabled: false
    };
  } else {
    const announceMs = Math.max(1_000, toNumber(options.announceMs, DUEL_ANNOUNCE_MS));
    const countdownMs = Math.max(1_000, toNumber(options.countdownMs, DUEL_COUNTDOWN_MS));
    const announceEndsAt = now + announceMs;
    const countdownEndsAt = announceEndsAt + countdownMs;
    const activeStartedAt = countdownEndsAt;
    next.duel = {
      active: true,
      phase: "announce",
      startedAt: now,
      endsAt: activeStartedAt + durationMs,
      announceEndsAt,
      countdownEndsAt,
      activeStartedAt,
      durationMs,
      scores,
      energy: emptyEnergyMap(),
      lastActionAt: 0,
      winner: null,
      phasesEnabled: true
    };
  }
  next.updatedAt = now;
  return next;
}

/**
 * Advance announce → countdown → active (mutates duel in place on state).
 */
function advanceDuelPhases(state) {
  const duel = state?.duel;
  if (!duel || !duel.active) return state;
  if (duel.phasesEnabled === false) return state;

  const now = nowTs();
  if (duel.phase === "announce" && now >= toNumber(duel.announceEndsAt, 0)) {
    duel.phase = "countdown";
  }
  if (duel.phase === "countdown" && now >= toNumber(duel.countdownEndsAt, 0)) {
    duel.phase = "active";
    duel.activeStartedAt = now;
    // Keep endsAt as scheduled end of active window if still in future.
    if (toNumber(duel.endsAt, 0) <= now) {
      duel.endsAt = now + toNumber(duel.durationMs, DEFAULT_DUEL_MS);
    }
  }
  return state;
}

function rankScores(scores = {}) {
  return PLATFORMS.map((id) => ({
    platform: id,
    label: PLATFORM_LABELS[id],
    points: toNumber(scores[id], 0)
  })).sort((a, b) => b.points - a.points);
}

function finishArenaDuel(state) {
  const next = createArenaState(state);
  // active stays true through announce/countdown/active; finished clears it.
  if (!next.duel.active) return next;

  const ranking = rankScores(next.duel.scores);
  const winner = ranking[0]?.points > 0 ? ranking[0].platform : null;
  const second = ranking[1]?.platform || null;

  if (winner) {
    next.platforms[winner].wins += 1;
    if (second) next.platforms[second].losses += 1;
  }

  next.duel.active = false;
  next.duel.phase = "finished";
  next.duel.winner = winner;
  next.updatedAt = nowTs();
  return next;
}

function startTournament(state, options = {}) {
  const next = createArenaState(state);
  const durationMs = Math.max(60_000, toNumber(options.durationMs, DEFAULT_TOURNAMENT_MS));
  const now = nowTs();
  const scores = {};
  for (const id of PLATFORMS) scores[id] = 0;

  next.tournament = {
    active: true,
    startedAt: now,
    endsAt: now + durationMs,
    durationMs,
    scores,
    champion: next.tournament.champion || null,
    history: next.tournament.history || []
  };
  // Turnaj často startuje i s 5min duely — volitelně rovnou duel.
  if (options.withDuel !== false) {
    Object.assign(next, startArenaDuel(next, { durationMs: DEFAULT_DUEL_MS }));
  }
  next.updatedAt = now;
  return next;
}

function finishTournament(state) {
  const next = createArenaState(state);
  if (!next.tournament.active) return next;

  const ranking = rankScores(next.tournament.scores);
  const champion = ranking[0]?.points > 0 ? ranking[0].platform : null;
  const previous = next.tournament.champion;

  if (champion) {
    next.platforms[champion].reigns += 1;
    next.platforms[champion].wins += 1;
    if (previous && previous !== champion && next.platforms[previous]) {
      next.platforms[previous].losses += 1;
    }
  }

  next.tournament.history.unshift({
    at: nowTs(),
    champion,
    previous,
    scores: { ...next.tournament.scores },
    ranking
  });
  next.tournament.history = next.tournament.history.slice(0, 50);
  next.tournament.active = false;
  next.tournament.champion = champion;
  next.updatedAt = nowTs();
  return next;
}

function tickArena(state) {
  let next = createArenaState(state);
  advanceDuelPhases(next);
  if (next.duel.active && next.duel.phase === "active" && nowTs() >= next.duel.endsAt) {
    next = finishArenaDuel(next);
  }
  if (next.tournament.active && nowTs() >= next.tournament.endsAt) {
    next = finishTournament(next);
  }
  return next;
}

function getTopUsers(state, limit = 10) {
  const users = Object.values(createArenaState(state).users || {});
  return users
    .sort((a, b) => toNumber(b.miaPoints, 0) - toNumber(a.miaPoints, 0))
    .slice(0, Math.max(1, limit));
}

function getArenaSnapshot(state) {
  const next = tickArena(state);
  const platformRows = PLATFORMS.map((id) => {
    const row = next.platforms[id];
    const top = Object.values(row.contributors || {})
      .sort((a, b) => toNumber(b.points, 0) - toNumber(a.points, 0))
      .slice(0, 5);
    return {
      id,
      label: row.label,
      mascot: row.mascot || row.label,
      styleRef: row.styleRef || "default",
      theme: row.theme || getPlatformIdentity(id),
      miaPoints: row.miaPoints,
      giftPoints: row.giftPoints,
      activityPoints: row.activityPoints,
      events: row.events,
      gifts: row.gifts,
      wins: row.wins,
      losses: row.losses,
      reigns: row.reigns,
      topContributors: top,
      isChampion: next.tournament.champion === id
    };
  }).sort((a, b) => b.miaPoints - a.miaPoints);

  return {
    platforms: platformRows,
    duel: {
      ...next.duel,
      ranking: rankScores(next.duel.scores),
      remainingMs: next.duel.active
        ? Math.max(0, next.duel.endsAt - nowTs())
        : 0,
      phaseRemainingMs: (() => {
        if (!next.duel.active) return 0;
        const phase = safeString(next.duel.phase);
        if (phase === "announce") {
          return Math.max(0, toNumber(next.duel.announceEndsAt, 0) - nowTs());
        }
        if (phase === "countdown") {
          return Math.max(0, toNumber(next.duel.countdownEndsAt, 0) - nowTs());
        }
        if (phase === "active") {
          return Math.max(0, toNumber(next.duel.endsAt, 0) - nowTs());
        }
        return 0;
      })(),
      energy: next.duel.energy || emptyEnergyMap(),
      winnerLabel: next.duel.winner ? PLATFORM_LABELS[next.duel.winner] : null
    },
    tournament: {
      active: next.tournament.active,
      champion: next.tournament.champion,
      championLabel: next.tournament.champion
        ? PLATFORM_LABELS[next.tournament.champion]
        : null,
      startedAt: next.tournament.startedAt,
      endsAt: next.tournament.endsAt,
      remainingMs: next.tournament.active
        ? Math.max(0, next.tournament.endsAt - nowTs())
        : 0,
      ranking: rankScores(next.tournament.scores),
      history: next.tournament.history.slice(0, 10)
    },
    topUsers: getTopUsers(next, 12),
    battle: arenaBattle.getBattleSnapshot(next.battle),
    economyNote:
      "Skóre = MIA body (naše měna). Nezávislé na výplatě platforem (~50 % TikTok).",
    updatedAt: next.updatedAt
  };
}

module.exports = {
  PLATFORMS,
  PLATFORM_LABELS,
  PLATFORM_IDENTITY,
  DEFAULT_DUEL_MS,
  DEFAULT_TOURNAMENT_MS,
  DUEL_ANNOUNCE_MS,
  DUEL_COUNTDOWN_MS,
  DUEL_ACTION_INTERVAL_MS,
  DUEL_ACTION_ENERGY_COST,
  STATE_PATH,
  isBattleMvpEnabled,
  createArenaState,
  loadArenaState,
  saveArenaState,
  normalizePlatform,
  getPlatformIdentity,
  ingestArenaActivity,
  pushPlatformBattleAction,
  startArenaDuel,
  finishArenaDuel,
  advanceDuelPhases,
  startTournament,
  finishTournament,
  tickArena,
  getArenaSnapshot,
  getTopUsers
};
