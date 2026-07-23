"use strict";

/**
 * Phase 14b — room mood from chat tone (lexicon + intent).
 * Server-side only; consumed by bodyLiveSync + Koj display + holo overlay.
 */

const DEFAULT_HOLD_MS = 12000;
const MIN_HOLD_MS = 8000;
const DEBOUNCE_MS = 2800;

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function isCommunityMoodLive(slot, now = Date.now()) {
  if (!slot || typeof slot !== "object") return false;
  return toNumber(slot.holdUntilTs, 0) > now || slot.active === true;
}

/** Map rolling lexicon + last message intent → MIA body mood + Koj display mood. */
function deriveRoomMoods(input = {}) {
  const tone = input.lexiconTone && typeof input.lexiconTone === "object" ? input.lexiconTone : {};
  const intent = input.intent && typeof input.intent === "object" ? input.intent : {};
  const spice = toNumber(tone.spiceLevel, 0);
  const energy = toNumber(tone.energyLevel, 0);
  const casual = toNumber(tone.casualLevel, 0);
  const chatTone = safeString(intent.tone, "neutral").toLowerCase();
  const moodHint = safeString(intent.moodHint, "").toLowerCase();
  const emotion = safeString(intent.emotion?.type || intent.emotion, "neutral").toLowerCase();
  const addressedTo = safeString(intent.addressedTo, "community").toLowerCase();

  let roomTone = "calm";
  let miaMood = "idle";
  let kojMood = "warm";

  if (
    chatTone === "serious" ||
    moodHint === "serious" ||
    emotion === "grief" ||
    emotion === "grief_pet" ||
    emotion === "sadness" ||
    emotion === "stress"
  ) {
    roomTone = "sensitive";
    miaMood = "think";
    kojMood = "warm";
  } else if (moodHint === "excited" || emotion === "joy" || energy >= 58) {
    roomTone = "upbeat";
    miaMood = "happy";
    kojMood = energy >= 70 ? "excited" : "laugh";
  } else if (moodHint === "playful" || addressedTo === "kojnozout" || addressedTo === "kojnozrout") {
    roomTone = "playful";
    miaMood = "idle";
    kojMood = "play";
  } else if (spice >= 42 && energy >= 35) {
    roomTone = "spicy";
    miaMood = "think";
    kojMood = "laugh";
  } else if (casual >= 40 && energy >= 28) {
    roomTone = "cozy";
    miaMood = "happy";
    kojMood = "warm";
  } else if (energy >= 38) {
    roomTone = "chatty";
    miaMood = "happy";
    kojMood = "curious";
  }

  return { roomTone, miaMood, kojMood, spice, energy, casual, chatTone, moodHint, emotion };
}

function computeCommunityMood(input = {}, now = Date.now()) {
  const derived = deriveRoomMoods(input);
  const prev = input.previousSlot;
  const prevMia = safeString(prev?.miaMood, "idle").toLowerCase();
  const prevKoj = safeString(prev?.kojMood, "warm").toLowerCase();
  const sameMoods = prevMia === derived.miaMood && prevKoj === derived.kojMood;
  const prevUpdated = toNumber(prev?.updatedAt, 0);
  if (sameMoods && isCommunityMoodLive(prev, now)) {
    return {
      ...derived,
      source: "mood_brain_v1",
      active: true,
      updatedAt: now,
      holdUntilTs: now + DEFAULT_HOLD_MS,
      extended: true
    };
  }
  if (
    !sameMoods &&
    prevUpdated > 0 &&
    now - prevUpdated < DEBOUNCE_MS &&
    isCommunityMoodLive(prev, now)
  ) {
    return null;
  }

  const holdMs = Math.max(MIN_HOLD_MS, DEFAULT_HOLD_MS);
  return {
    roomTone: derived.roomTone,
    miaMood: derived.miaMood,
    kojMood: derived.kojMood,
    spice: derived.spice,
    energy: derived.energy,
    source: "mood_brain_v1",
    active: true,
    updatedAt: now,
    holdUntilTs: now + holdMs,
    extended: false
  };
}

function resolveMiaMoodFromCommunity(communityMood, now = Date.now()) {
  if (!isCommunityMoodLive(communityMood, now)) return null;
  const mood = safeString(communityMood.miaMood, "idle").toLowerCase();
  if (!mood || mood === "idle") return null;
  const allowed = new Set(["happy", "think", "wave"]);
  return allowed.has(mood) ? mood : null;
}

function resolveKojSpriteFromCommunity(communityMood, now = Date.now()) {
  if (!isCommunityMoodLive(communityMood, now)) return null;
  const key = safeString(communityMood.kojMood, "").toLowerCase();
  if (!key || key === "idle") return null;
  const map = {
    warm: "warm",
    laugh: "laugh",
    excited: "excited",
    curious: "curious",
    play: "play",
    stressed: "stressed",
    calm: "idle"
  };
  return map[key] || key;
}

module.exports = {
  DEFAULT_HOLD_MS,
  deriveRoomMoods,
  computeCommunityMood,
  isCommunityMoodLive,
  resolveMiaMoodFromCommunity,
  resolveKojSpriteFromCommunity
};
