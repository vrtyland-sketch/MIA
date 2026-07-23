"use strict";

/**
 * MIA_GIFT_RUNTIME_HELPERS.js
 *
 * Bezpečná runtime helper vrstva nad giftProfile.
 *
 * Cíl:
 * - nic nepřepočítává
 * - nic nemění na support tieringu
 * - nic nemění na queue
 * - jen sjednocuje čtení gift metadata pro budoucí animace
 */

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cloneJson(value, fallback = null) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_err) {
    return fallback;
  }
}

function normalizeOwner(value, fallback = "both") {
  const owner = safeString(value, fallback).toLowerCase();
  if (owner === "mia" || owner === "kojnozout" || owner === "both") {
    return owner;
  }
  return fallback;
}

function normalizeFamily(value, fallback = "generic") {
  const family = safeString(value, fallback).toLowerCase();
  return family || fallback;
}

function normalizeEffect(value, fallback = "generic_support") {
  const effect = safeString(value, fallback).toLowerCase();
  return effect || fallback;
}

function normalizeMood(value, fallback = "warm") {
  const mood = safeString(value, fallback).toLowerCase();
  return mood || fallback;
}

function normalizeSceneModes(value) {
  if (!Array.isArray(value)) return ["MAIN", "AFK", "COMMUNITY"];

  const out = [];
  const seen = new Set();

  for (const item of value) {
    const normalized = safeString(item).toUpperCase();
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }

  return out.length > 0 ? out : ["MAIN", "AFK", "COMMUNITY"];
}

function normalizeTags(value) {
  if (!Array.isArray(value)) return [];

  const out = [];
  const seen = new Set();

  for (const item of value) {
    const normalized = safeString(item).toLowerCase();
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }

  return out;
}

function getGiftProfile(event = {}) {
  const supportProfile = event?.support?.giftProfile;
  if (supportProfile && typeof supportProfile === "object") {
    return supportProfile;
  }

  return null;
}

function buildResolvedGiftRuntimeProfile(event = {}) {
  const profile = getGiftProfile(event);
  const totalCoins = Math.max(
    0,
    toNumber(event?.support?.totalCoins, toNumber(event?.support?.coins, 0))
  );

  if (!profile) {
    return {
      exists: false,
      owner: "both",
      visualFamily: "generic",
      effectProgram: "generic_support",
      moodHint: "warm",
      label: safeString(event?.support?.giftName, "Unknown Gift"),
      giftName: safeString(event?.support?.giftName, "Unknown Gift"),
      coinsBucket: totalCoins >= 5000 ? "epic" : totalCoins >= 1000 ? "big" : totalCoins >= 100 ? "mid" : totalCoins > 0 ? "small" : "unknown",
      recommendedSceneModes: ["MAIN", "AFK", "COMMUNITY"],
      tags: [],
      raw: null
    };
  }

  return {
    exists: true,
    owner: normalizeOwner(profile.animationOwner, "both"),
    visualFamily: normalizeFamily(profile.visualFamily, "generic"),
    effectProgram: normalizeEffect(profile.effectProgram, "generic_support"),
    moodHint: normalizeMood(profile.moodHint, "warm"),
    label: safeString(profile.label, safeString(profile.giftName, "Unknown Gift")),
    giftName: safeString(profile.giftName, safeString(profile.label, "Unknown Gift")),
    coinsBucket: safeString(profile.coinsBucket, "unknown").toLowerCase(),
    recommendedSceneModes: normalizeSceneModes(profile.recommendedSceneModes),
    tags: normalizeTags(profile.tags),
    raw: cloneJson(profile, null)
  };
}

function shouldMiaAnimate(event = {}) {
  const profile = buildResolvedGiftRuntimeProfile(event);
  return profile.owner === "mia" || profile.owner === "both";
}

function shouldKojnozoutAnimate(event = {}) {
  const profile = buildResolvedGiftRuntimeProfile(event);
  return profile.owner === "kojnozout" || profile.owner === "both";
}

function isDualAnimationGift(event = {}) {
  return buildResolvedGiftRuntimeProfile(event).owner === "both";
}

function isBattleGift(event = {}) {
  return buildResolvedGiftRuntimeProfile(event).visualFamily === "battle";
}

function isCareGift(event = {}) {
  const profile = buildResolvedGiftRuntimeProfile(event);
  return (
    profile.visualFamily === "food" ||
    profile.tags.includes("care") ||
    profile.effectProgram === "care_feed"
  );
}

function isMusicGift(event = {}) {
  const profile = buildResolvedGiftRuntimeProfile(event);
  return (
    profile.visualFamily === "music" ||
    profile.tags.includes("playlist")
  );
}

function isRomanceGift(event = {}) {
  const profile = buildResolvedGiftRuntimeProfile(event);
  return (
    profile.visualFamily === "romance" ||
    profile.visualFamily === "flowers"
  );
}

function buildAnimationHint(event = {}, extra = {}) {
  const profile = buildResolvedGiftRuntimeProfile(event);

  return {
    owner: profile.owner,
    visualFamily: profile.visualFamily,
    effectProgram: profile.effectProgram,
    moodHint: profile.moodHint,
    label: profile.label,
    giftName: profile.giftName,
    coinsBucket: profile.coinsBucket,
    recommendedSceneModes: profile.recommendedSceneModes.slice(),
    tags: profile.tags.slice(),
    supportTier: safeString(event?.support?.tier),
    totalCoins: Math.max(
      0,
      toNumber(event?.support?.totalCoins, toNumber(event?.support?.coins, 0))
    ),
    burstCount: Math.max(1, toNumber(extra.burstCount, 1)),
    bowlPercent: Math.max(0, toNumber(extra.bowlPercent, 0)),
    dual: profile.owner === "both",
    rawGiftProfile: cloneJson(profile.raw, null)
  };
}

module.exports = {
  getGiftProfile,
  buildResolvedGiftRuntimeProfile,
  shouldMiaAnimate,
  shouldKojnozoutAnimate,
  isDualAnimationGift,
  isBattleGift,
  isCareGift,
  isMusicGift,
  isRomanceGift,
  buildAnimationHint
};