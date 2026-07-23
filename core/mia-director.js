"use strict";

/**
 * Phase 2 — MIA Director (roadmap §4).
 *
 * Central "show direction" decisions from normalized events + runtime state.
 * Pure planning: does not speak or render. Callers consult the plan when enabled.
 *
 * Enable: default ON (safe advisory). Disable: MIA_DIRECTOR=0 or
 * runtimeConfig.phase2.director.enabled === false / phase1.director.enabled === false.
 *
 * Dual voice: always OFF unless MIA_DUAL_VOICE=1 — Director never revives dual.
 */

const { isDualVoiceEnabled } = require("../scripts/MIA_DUAL_VOICE");

const MOODS = Object.freeze({
  calm: "calm",
  warm: "warm",
  hype: "hype",
  chaos: "chaos",
  celebrate: "celebrate"
});

const SPEAKERS = Object.freeze({
  mia: "mia",
  kojnozout: "kojnozout"
});

function envFlag(name) {
  const v = String(process.env[name] || "").trim().toLowerCase();
  if (!v) return null;
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return null;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Default ON — advisory only. Explicit OFF via env or config.
 */
function isDirectorEnabled(runtimeConfig = {}) {
  const env = envFlag("MIA_DIRECTOR");
  if (env === false) return false;
  if (env === true) return true;

  const cfg =
    runtimeConfig?.phase2?.director ??
    runtimeConfig?.director ??
    runtimeConfig?.phase1?.director;
  if (cfg && typeof cfg === "object") {
    if (cfg.enabled === false) return false;
    if (cfg.enabled === true) return true;
  }
  return true;
}

function resolveTier(input = {}) {
  const event = input.event || {};
  const gift = event.gift || {};
  const tier = safeString(
    input.tier ||
      gift.streamTier ||
      event.support?.streamTier ||
      event.meta?.streamTier ||
      input.runtimeState?.lastTier,
    ""
  ).toUpperCase();
  if (tier) return tier;

  const miaPoints = toNumber(gift.miaPoints ?? event.miaPoints, 0);
  if (miaPoints >= 7500) return "T4";
  if (miaPoints >= 1500) return "T3";
  if (miaPoints >= 150) return "T2";
  if (event.type === "gift" || gift.name) return "T1";
  return "T0";
}

function tierIntensity(tier) {
  const t = safeString(tier).toUpperCase();
  if (t === "T6" || t === "T5") return 1;
  if (t === "T4") return 0.92;
  if (t === "T3") return 0.72;
  if (t === "T2") return 0.48;
  if (t === "T1") return 0.28;
  return 0.12;
}

function resolveBowlPercent(input = {}) {
  const koj = input.kojVitals || input.koj || {};
  const rs = input.runtimeState || {};
  return toNumber(
    koj.bowlPercent ??
      koj.bowlFillPercent ??
      rs.bowl?.bowlPercent ??
      rs.koj?.bowlPercent,
    0
  );
}

function resolveHunger(input = {}) {
  const koj = input.kojVitals || input.koj || {};
  return toNumber(koj.hunger ?? koj.vitals?.hunger, 0.5);
}

/**
 * Who speaks — gift lane prefers Koj; dual voice never forced on.
 */
function resolveSpeaker(input = {}, intensity = 0.3) {
  const event = input.event || {};
  const type = safeString(event.type).toLowerCase();
  const preferred = safeString(input.preferredSpeaker).toLowerCase();
  const dual = isDualVoiceEnabled();

  if (preferred === "mia" || preferred === "kojnozout") {
    return {
      speaker: preferred === "kojnozout" ? SPEAKERS.kojnozout : SPEAKERS.mia,
      dualVoice: false,
      companion: null,
      reason: "preferred_override"
    };
  }

  if (type === "gift" || type === "support") {
    // Big spectacle: MIA can host announce when intensity is high; else Koj owns gift lane.
    const speaker =
      intensity >= 0.9 && dual === false ? SPEAKERS.mia : SPEAKERS.kojnozout;
    // Without dual, never schedule companion — anti-echo.
    return {
      speaker: intensity >= 0.85 ? SPEAKERS.kojnozout : speaker,
      dualVoice: false,
      companion: dual && intensity >= 0.9 ? SPEAKERS.mia : null,
      reason: dual && intensity >= 0.9 ? "gift_spectacle_dual" : "gift_lane_koj"
    };
  }

  if (type === "chat" || type === "comment") {
    return {
      speaker: SPEAKERS.mia,
      dualVoice: false,
      companion: null,
      reason: "chat_host_mia"
    };
  }

  return {
    speaker: SPEAKERS.mia,
    dualVoice: false,
    companion: null,
    reason: "default_mia"
  };
}

function resolveMood(intensity, bowlPercent, momentType) {
  if (momentType === "bowl_rush" || bowlPercent >= 95) return MOODS.celebrate;
  if (momentType === "community_burst" || intensity >= 0.85) return MOODS.chaos;
  if (intensity >= 0.65) return MOODS.hype;
  if (intensity >= 0.35) return MOODS.warm;
  return MOODS.calm;
}

function resolveCoalescePolicy(intensity, mood, momentType) {
  if (mood === MOODS.chaos || momentType === "community_burst") {
    return {
      mode: "aggressive",
      windowMs: 3200,
      mergeSpamGifts: true,
      dropIdle: true
    };
  }
  if (intensity >= 0.7) {
    return {
      mode: "tight",
      windowMs: 2200,
      mergeSpamGifts: true,
      dropIdle: true
    };
  }
  if (mood === MOODS.calm) {
    return {
      mode: "relaxed",
      windowMs: 1800,
      mergeSpamGifts: true,
      dropIdle: false
    };
  }
  return {
    mode: "normal",
    windowMs: 2500,
    mergeSpamGifts: true,
    dropIdle: false
  };
}

function resolveOverlayHints(tier, intensity, mood, momentType) {
  const t = safeString(tier, "T1").toUpperCase();
  return {
    effectIntensity: clamp(intensity, 0, 1),
    animationTier: t === "T0" ? "T1" : t,
    giftStageSpectacle: intensity >= 0.7 || ["T3", "T4", "T5", "T6"].includes(t),
    particles: mood === MOODS.chaos || mood === MOODS.celebrate,
    dimBackground: intensity >= 0.85,
    showProfile: intensity >= 0.48,
    momentType: momentType || null
  };
}

function emptyPlan(reason = "disabled") {
  return {
    enabled: false,
    mood: MOODS.calm,
    speaker: SPEAKERS.mia,
    intensity: 0.2,
    overlayHints: resolveOverlayHints("T1", 0.2, MOODS.calm, null),
    coalescePolicy: resolveCoalescePolicy(0.2, MOODS.calm, null),
    celebrate: null,
    dualVoice: false,
    companion: null,
    reason
  };
}

/**
 * Build direction plan.
 *
 * @param {object} input
 * @param {object} [input.event] — unified runtime event
 * @param {object} [input.runtimeState]
 * @param {object} [input.kojVitals]
 * @param {object} [input.comboMoment] — { type, ... } from combo-moments
 * @param {object} [input.viewerMemory] — optional viewer stats
 * @param {object} [input.runtimeConfig]
 * @param {string} [input.preferredSpeaker]
 * @param {string} [input.tier]
 */
function planDirection(input = {}) {
  const runtimeConfig = input.runtimeConfig || {};
  if (!isDirectorEnabled(runtimeConfig)) {
    return emptyPlan("disabled");
  }

  const event = input.event || {};
  const tier = resolveTier(input);
  const bowlPercent = resolveBowlPercent(input);
  const hunger = resolveHunger(input);
  const momentType = safeString(
    input.comboMoment?.type || input.comboMoment?.momentType || input.momentType
  );

  let intensity = tierIntensity(tier);

  if (momentType === "community_burst" || momentType === "gift_storm") {
    intensity = Math.max(intensity, 0.78);
  }
  if (momentType === "solo_combo") {
    intensity = Math.max(intensity, 0.55);
  }
  if (momentType === "bowl_rush" || bowlPercent >= 90) {
    intensity = Math.max(intensity, 0.88);
  }
  if (momentType === "first_support") {
    intensity = Math.max(intensity, 0.4);
  }
  if (hunger >= 0.75 && (event.type === "gift" || event.gift)) {
    intensity = Math.min(1, intensity + 0.08);
  }

  intensity = clamp(intensity, 0, 1);
  const mood = resolveMood(intensity, bowlPercent, momentType || null);
  const speakerPlan = resolveSpeaker(input, intensity);
  const coalescePolicy = resolveCoalescePolicy(intensity, mood, momentType || null);
  const overlayHints = resolveOverlayHints(tier, intensity, mood, momentType || null);

  const viewer = input.viewerMemory && typeof input.viewerMemory === "object"
    ? input.viewerMemory
    : null;
  const giftCount = toNumber(viewer?.giftCount ?? viewer?.totalGifts, 0);
  const useMemoryLine =
    Boolean(viewer) &&
    giftCount >= 2 &&
    intensity < 0.9 &&
    mood !== MOODS.chaos;

  const celebrate =
    mood === MOODS.celebrate || momentType === "first_support" || useMemoryLine
      ? {
          active: mood === MOODS.celebrate || Boolean(momentType),
          useViewerMemory: useMemoryLine || momentType === "first_support",
          momentType: momentType || null,
          firstSupport: momentType === "first_support",
          bowlFull: bowlPercent >= 95
        }
      : null;

  return {
    enabled: true,
    mood,
    speaker: speakerPlan.speaker,
    intensity,
    overlayHints,
    coalescePolicy,
    celebrate,
    dualVoice: false,
    companion: speakerPlan.companion,
    tier,
    bowlPercent,
    reason: speakerPlan.reason,
    stayCalm: mood === MOODS.calm || mood === MOODS.warm,
    chaos: mood === MOODS.chaos
  };
}

/**
 * Apply director hints onto a TTS/voice plan (non-destructive merge).
 * Never enables dual voice.
 */
function applyDirectorToVoicePlan(voicePlan = {}, direction = null) {
  if (!direction || direction.enabled === false) return voicePlan;
  const next = { ...voicePlan };

  if (direction.speaker && !next.voiceSpeakerLocked) {
    next.voiceSpeaker = direction.speaker;
    next.primaryOwner = direction.speaker;
  }

  if (direction.celebrate?.useViewerMemory) {
    next.useViewerMemory = true;
  }

  if (direction.coalescePolicy) {
    next.directorCoalesceMs = direction.coalescePolicy.windowMs;
    next.directorCoalesceMode = direction.coalescePolicy.mode;
  }

  next.director = {
    mood: direction.mood,
    intensity: direction.intensity,
    stayCalm: direction.stayCalm,
    chaos: direction.chaos,
    reason: direction.reason
  };

  // Hard: never revive dual via director.
  if (!isDualVoiceEnabled()) {
    next.companionVoiceText = "";
    next.companionOwner = null;
  }

  return next;
}

module.exports = {
  MOODS,
  SPEAKERS,
  isDirectorEnabled,
  planDirection,
  applyDirectorToVoicePlan,
  resolveTier,
  emptyPlan
};
