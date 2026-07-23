"use strict";

const { applyCareAction, CARE_ACTIONS } = require("./MIA_KOJNOZROUT_CARE");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function resolveWalkDurationMs(env = process.env) {
  return Math.max(12000, toNumber(env.MIA_KOJ_WALK_DURATION_MS, 45000));
}

function isWalking(state = {}) {
  return toNumber(state.walkUntilTs, 0) > Date.now();
}

function resolveWalkNeed(state = {}) {
  const energy = toNumber(state.energy, 100);
  const sleepDepth = toNumber(state?.vitals?.sleepDepth, 0);
  const isSleeping = Boolean(state.isSleeping) || sleepDepth >= 58;

  if (isSleeping) return false;
  if (isWalking(state)) return true;
  if (energy <= 38) return true;
  if (energy <= 52 && sleepDepth >= 42) return true;
  return false;
}

function tickWalkState(state = {}, env = process.env) {
  const next = { ...state };
  const until = toNumber(next.walkUntilTs, 0);

  if (!until || Date.now() >= until) {
    if (next.behavior === "walking") {
      next.behavior = "watching";
    }
    next.walkUntilTs = 0;
    next.walkActive = false;
    return next;
  }

  next.walkActive = true;
  next.behavior = "walking";
  if (safeString(next.mood).toLowerCase() !== "sick") {
    next.mood = "excited";
  }
  next.walkRemainingSec = Math.ceil((until - Date.now()) / 1000);
  return next;
}

function applyWalkCare(kojnozoutState = {}, env = process.env) {
  const careConfig = CARE_ACTIONS.vencit;
  const next = applyCareAction(kojnozoutState, careConfig);
  const durationMs = resolveWalkDurationMs(env);

  next.walkUntilTs = Date.now() + durationMs;
  next.walkStartedAt = Date.now();
  next.walkActive = true;
  next.behavior = "walking";
  next.lastCareAction = "vencit";
  if (safeString(next.mood).toLowerCase() !== "sick") {
    next.mood = "excited";
  }
  next.walkRemainingSec = Math.ceil(durationMs / 1000);

  return next;
}

function buildWalkOverlayPayload(userLabel = "", speechText = "") {
  return {
    owner: "kojnozout",
    route: "community",
    stage: "care_walk",
    title: "Venčení",
    text: safeString(
      speechText,
      `${safeString(userLabel, "Kamaráde").split(/\s+/)[0]}, jdeme na procházku!`
    ),
    subtext: "CARE · venčení · energie ↑",
    user: safeString(userLabel),
    mood: "excited",
    meta: {
      careAction: "vencit",
      walkActive: true
    },
    holdMs: 9000
  };
}

function buildWalkNeedHint(state = {}) {
  if (!resolveWalkNeed(state) || isWalking(state)) {
    return null;
  }

  const energy = Math.round(toNumber(state.energy, 0));
  return `Koj potřebuje ven — energie ${energy}%. Napiš: venc koj`;
}

/**
 * Jedna vizuální cesta chůze: CARE venčení vs ambient wander.
 * Runtime i DISPLAY mají číst tento snapshot — ne inventovat druhý walk.
 */
function resolveWalkVisual(state = {}, now = Date.now()) {
  const until = toNumber(state.walkUntilTs, 0);
  const careWalking =
    Boolean(state.walkActive) ||
    until > now ||
    safeString(state.behavior).toLowerCase() === "walking";

  if (careWalking) {
    return {
      active: true,
      kind: "care",
      cssWander: true,
      spriteMood: "hop",
      remainingSec: until > now ? Math.ceil((until - now) / 1000) : toNumber(state.walkRemainingSec, 0)
    };
  }

  return {
    active: false,
    kind: null,
    cssWander: false,
    spriteMood: null,
    remainingSec: 0
  };
}

module.exports = {
  resolveWalkDurationMs,
  isWalking,
  resolveWalkNeed,
  tickWalkState,
  applyWalkCare,
  buildWalkOverlayPayload,
  buildWalkNeedHint,
  resolveWalkVisual
};
