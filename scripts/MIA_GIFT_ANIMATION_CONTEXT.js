"use strict";

/**
 * Gift animace podle stavu Kojnožrouta a péče komunity (kánon §10).
 */

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resolvePrimaryNeed(kojnozoutState = {}) {
  const mood = safeString(kojnozoutState.mood).toLowerCase();
  const affliction = safeString(kojnozoutState.affliction).toLowerCase();
  const hunger = toNumber(kojnozoutState.hunger, 0);
  const sleepDepth = toNumber(kojnozoutState?.vitals?.sleepDepth, 0);
  const isSleeping = Boolean(kojnozoutState.isSleeping) || sleepDepth >= 55;

  if (isSleeping || mood === "sleepy") return "sleepy";
  if (affliction === "sick" || mood === "sick") return "sick";
  if (affliction === "sad" || mood === "sad") return "sad";
  if (affliction === "annoyed" || mood === "annoyed") return "annoyed";
  if (mood === "hungry" || hunger >= 52) return "hungry";
  if (mood === "happy" || mood === "excited" || mood === "full") return "happy";
  if (hunger >= 40) return "hungry";
  return "happy";
}

function buildGiftAnimationContext(kojnozoutState = {}, streamState = {}, giftProfile = {}) {
  const primaryNeed = resolvePrimaryNeed(kojnozoutState);
  const hunger = toNumber(kojnozoutState.hunger, 0);
  const bowlPercent = toNumber(
    kojnozoutState.bowlPercent ?? streamState?.bowlPercent,
    0
  );
  const neglect = toNumber(kojnozoutState?.bond?.neglect, 0);
  const careBond = toNumber(kojnozoutState?.bond?.careBond, 0);
  const rawMood = safeString(kojnozoutState.mood, "idle");
  const effectProgram = safeString(giftProfile.effectProgram, "");
  const isCareFeed = effectProgram === "care_feed";
  const isPetReact = effectProgram === "pet_react";

  return {
    primaryNeed,
    rawMood,
    hunger,
    bowlPercent,
    neglect,
    careBond,
    isCareFeed,
    isPetReact,
    effectProgram
  };
}

function resolveGiftReactionMood(context = {}, giftProfile = {}) {
  const need = safeString(context.primaryNeed, "happy");
  const effectProgram = safeString(
    giftProfile.effectProgram || context.effectProgram,
    ""
  );

  if (effectProgram === "care_feed") {
    if (need === "hungry" || need === "annoyed" || context.hunger >= 40) {
      return "eating";
    }
    return "happy";
  }

  if (effectProgram === "pet_react") {
    if (need === "happy" || need === "sleepy") return "happy";
    if (need === "hungry") return "hungry";
    return "excited";
  }

  const needToMood = {
    hungry: "hungry",
    annoyed: "stressed",
    sick: "sick",
    sad: "sad",
    sleepy: "sleepy",
    happy: "happy"
  };

  if (needToMood[need]) {
    return needToMood[need];
  }

  return safeString(context.rawMood, "happy").toLowerCase() || "happy";
}

function resolveCareVariantOffset(context = {}) {
  let offset = 0;
  const need = safeString(context.primaryNeed, "");
  const neglect = toNumber(context.neglect, 0);
  const careBond = toNumber(context.careBond, 0);

  if (need === "sick") offset += 6;
  else if (need === "sad") offset += 5;
  else if (need === "hungry" || need === "annoyed") offset += 4;
  else if (need === "sleepy") offset += 3;
  else if (need === "happy" && careBond >= 35) offset -= 2;

  if (neglect >= 55) offset += 3;
  else if (neglect <= 20 && careBond >= 25) offset -= 1;

  return offset;
}

module.exports = {
  resolvePrimaryNeed,
  buildGiftAnimationContext,
  resolveGiftReactionMood,
  resolveCareVariantOffset
};
