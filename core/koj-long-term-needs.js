"use strict";

/**
 * Phase 3 — Koj long-term needs (roadmap §5 start).
 *
 * Extends existing hunger/energy/mood with fatigue + techCharge.
 * Does not own bowl CARE math — only soft meters that persist across streams.
 */

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

/** Fatigue rises when energy is low; techCharge slowly drains, rises with CARE. */
const RATES = Object.freeze({
  fatigueRisePerMinute: 0.12,
  fatigueExtraWhenLowEnergy: 0.18,
  fatigueRecoveryPerMinute: 0.05,
  techChargeDecayPerMinute: 0.06,
  careFatigueRelief: 8,
  careTechChargeBoost: 6,
  feedTechChargeBoost: 4
});

function createLongTermNeeds(seed = {}) {
  return {
    fatigue: clamp(toNumber(seed.fatigue, 18), 0, 100),
    techCharge: clamp(toNumber(seed.techCharge, 35), 0, 100)
  };
}

function applyLongTermNeedsSeed(state = {}, seed = {}) {
  const needs = createLongTermNeeds({
    fatigue: seed.fatigue ?? state.fatigue,
    techCharge: seed.techCharge ?? state.techCharge
  });
  state.fatigue = needs.fatigue;
  state.techCharge = needs.techCharge;
  return state;
}

/**
 * Tick meters using the same clock as applyPassiveDecay (minutesElapsed).
 * Mutates state in place; safe to call when minutes ≈ 0.
 */
function tickLongTermNeeds(state = {}, options = {}) {
  const minutes = Math.max(0, toNumber(options.minutesElapsed, 0));
  applyLongTermNeedsSeed(state, state);

  if (minutes <= 0) return state;

  const energy = clamp(toNumber(state.energy, 50), 0, 100);
  let fatigue = toNumber(state.fatigue, 0);
  let techCharge = toNumber(state.techCharge, 0);

  if (energy < 35) {
    fatigue += minutes * (RATES.fatigueRisePerMinute + RATES.fatigueExtraWhenLowEnergy);
  } else if (energy >= 70) {
    fatigue -= minutes * RATES.fatigueRecoveryPerMinute;
  } else {
    fatigue += minutes * RATES.fatigueRisePerMinute * 0.4;
  }

  techCharge -= minutes * RATES.techChargeDecayPerMinute;

  state.fatigue = clamp(fatigue, 0, 100);
  state.techCharge = clamp(techCharge, 0, 100);
  return state;
}

/**
 * Soft CARE bump — does not touch hunger/bowl deltas (caller already applied those).
 */
function applyCareToLongTermNeeds(state = {}, careConfig = {}) {
  applyLongTermNeedsSeed(state, state);
  const actionId = safeString(careConfig.id || careConfig.action).toLowerCase();
  const energyGain = toNumber(careConfig.energy, 0);
  const hungerDelta = toNumber(careConfig.hunger, 0);

  let relief = RATES.careFatigueRelief * 0.5;
  let charge = RATES.careTechChargeBoost * 0.5;

  if (actionId === "nakrmit" || hungerDelta < 0) {
    relief = RATES.careFatigueRelief;
    charge = RATES.feedTechChargeBoost;
  } else if (actionId === "lecit" || actionId === "uklidnit") {
    relief = RATES.careFatigueRelief * 1.2;
  } else if (energyGain > 0) {
    relief = RATES.careFatigueRelief * 0.8;
    charge = RATES.careTechChargeBoost;
  }

  state.fatigue = clamp(toNumber(state.fatigue, 0) - relief, 0, 100);
  state.techCharge = clamp(toNumber(state.techCharge, 0) + charge, 0, 100);
  return state;
}

/**
 * Map meters → existing master mood ids (hint only; vitals still own expressive mood).
 */
function mapNeedsToMoodHint(state = {}) {
  const hunger = clamp(toNumber(state.hunger, 0), 0, 100);
  const energy = clamp(toNumber(state.energy, 50), 0, 100);
  const fatigue = clamp(toNumber(state.fatigue, 0), 0, 100);
  const techCharge = clamp(toNumber(state.techCharge, 0), 0, 100);
  const mood = safeString(state.mood, "idle").toLowerCase();
  const affliction = safeString(state.affliction).toLowerCase();

  if (affliction === "sick" || mood === "sick") {
    return { moodHint: "sick", reason: "affliction", primary: "sick" };
  }
  if (hunger >= 75) {
    return { moodHint: "hungry", reason: "hunger", primary: "hungry" };
  }
  if (fatigue >= 80 || (energy < 25 && fatigue >= 55)) {
    return { moodHint: "sleepy", reason: "fatigue", primary: "fatigue" };
  }
  if (fatigue >= 65 && hunger < 50) {
    return { moodHint: "stressed", reason: "fatigue", primary: "fatigue" };
  }
  if (techCharge >= 70 && energy >= 50 && hunger < 55) {
    return { moodHint: "excited", reason: "techCharge", primary: "techCharge" };
  }
  if (energy >= 70 && fatigue < 35 && hunger < 45) {
    return { moodHint: "happy", reason: "rested", primary: "energy" };
  }
  return { moodHint: mood || "idle", reason: "ambient", primary: null };
}

function getLongTermNeedsSnapshot(state = {}) {
  applyLongTermNeedsSeed(state, state);
  const hint = mapNeedsToMoodHint(state);
  return {
    hunger: Math.round(toNumber(state.hunger, 0)),
    energy: Math.round(toNumber(state.energy, 0)),
    fatigue: Math.round(toNumber(state.fatigue, 0)),
    techCharge: Math.round(toNumber(state.techCharge, 0)),
    mood: safeString(state.mood, "idle"),
    moodHint: hint.moodHint,
    moodHintReason: hint.reason,
    primaryNeed: hint.primary
  };
}

module.exports = {
  RATES,
  createLongTermNeeds,
  applyLongTermNeedsSeed,
  tickLongTermNeeds,
  applyCareToLongTermNeeds,
  mapNeedsToMoodHint,
  getLongTermNeedsSnapshot
};
