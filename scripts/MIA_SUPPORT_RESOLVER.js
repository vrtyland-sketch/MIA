"use strict";

/**
 * MIA_SUPPORT_RESOLVER — support source-of-truth (přesunuto z legacy/).
 */

const { resolveGiftProfile, resolveGiftMapping, GIFT_MAP_VERSION } = require("./MIA_GIFT_MAP");
const giftEconomy = require("./MIA_GIFT_ECONOMY");
const giftTiers = require("./MIA_GIFT_TIERS");
const giftMapEnterprise = require("../shared/gifts");

const MIA_POINTS_PER_UNIT = giftTiers.MIA_POINTS_PER_UNIT;
const SUPPORT_TIER_THRESHOLDS = giftTiers.SUPPORT_TIER_THRESHOLDS;

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function isObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizePlatform(value, fallback = "unknown") {
  const platform = safeString(value, fallback).toLowerCase();

  if (platform === "tiktok" || platform === "kick") {
    return platform;
  }

  return fallback;
}

function useCoinTierEconomy() {
  const flag = safeString(process.env.MIA_GIFT_ECONOMY_TIERS, "coins").toLowerCase();
  return flag !== "legacy" && flag !== "miapoints";
}

function normalizeTier(value) {
  const tier = safeString(value).toUpperCase();

  if (giftTiers.STREAM_TIERS.includes(tier)) {
    return tier;
  }

  return "";
}

function pickFirstPositiveNumber(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }
  return 0;
}

function buildSupportInput(normalizedEvent = {}, rawEvent = {}) {
  const support = isObject(normalizedEvent?.support) ? normalizedEvent.support : {};
  const meta = isObject(normalizedEvent?.meta) ? normalizedEvent.meta : {};
  const raw = isObject(normalizedEvent?.raw) ? normalizedEvent.raw : {};
  const sourceRaw = isObject(rawEvent) ? rawEvent : {};

  return {
    platform: normalizePlatform(
      normalizedEvent?.platform ||
        sourceRaw?.platform ||
        sourceRaw?.source ||
        raw?.platform ||
        raw?.source ||
        "unknown"
    ),

    giftId:
      support.giftId ??
      meta.giftId ??
      sourceRaw.giftId ??
      raw.giftId ??
      sourceRaw.id ??
      raw.id ??
      null,

    giftName:
      safeString(support.giftName) ||
      safeString(meta.giftName) ||
      safeString(sourceRaw.giftName) ||
      safeString(raw.giftName) ||
      safeString(sourceRaw.gift) ||
      safeString(raw.gift) ||
      safeString(sourceRaw.name) ||
      safeString(raw.name) ||
      safeString(sourceRaw.value1) ||
      safeString(raw.value1) ||
      "",

    displayName:
      safeString(normalizedEvent?.user?.nickname) ||
      safeString(normalizedEvent?.user?.displayName) ||
      safeString(normalizedEvent?.nickname) ||
      safeString(normalizedEvent?.displayName) ||
      safeString(meta.nickname) ||
      safeString(meta.displayName) ||
      safeString(sourceRaw.nickname) ||
      safeString(sourceRaw.displayName) ||
      safeString(sourceRaw.uniqueId) ||
      safeString(raw.nickname) ||
      safeString(raw.displayName) ||
      "Viewer",

    coins: pickFirstPositiveNumber(
      support.coins,
      meta.coins,
      meta.amount,
      sourceRaw.coins,
      sourceRaw.coinValue,
      sourceRaw.value,
      sourceRaw.rawValue,
      sourceRaw.amount,
      sourceRaw.diamondCount,
      sourceRaw.giftValue,
      raw.coins,
      raw.coinValue,
      raw.value,
      raw.rawValue,
      raw.amount,
      raw.diamondCount,
      raw.giftValue
    ),

    repeatCount: pickFirstPositiveNumber(
      support.repeatCount,
      meta.repeatCount,
      sourceRaw.repeatCount,
      sourceRaw.count,
      sourceRaw.quantity,
      raw.repeatCount,
      raw.count,
      raw.quantity,
      1
    ),

    explicitTotalCoins: pickFirstPositiveNumber(
      support.totalCoins,
      meta.totalCoins,
      meta.totalValue,
      sourceRaw.totalCoins,
      sourceRaw.totalValue,
      sourceRaw.totalCoinValue,
      raw.totalCoins,
      raw.totalValue,
      raw.totalCoinValue
    ),

    explicitMiaPoints: pickFirstPositiveNumber(
      support.miaPoints,
      support.supportIndex,
      support.points,
      support.totalPoints,
      meta.miaPoints,
      meta.supportIndex,
      meta.points,
      meta.totalPoints,
      sourceRaw.miaPoints,
      sourceRaw.supportIndex,
      sourceRaw.points,
      sourceRaw.totalPoints,
      raw.miaPoints,
      raw.supportIndex,
      raw.points,
      raw.totalPoints
    ),

    rawValue: pickFirstPositiveNumber(
      support.rawValue,
      meta.rawValue,
      sourceRaw.rawValue,
      sourceRaw.value,
      sourceRaw.amount,
      raw.rawValue,
      raw.value,
      raw.amount
    ),

    inputTier:
      normalizeTier(support.tier) ||
      normalizeTier(meta.tier) ||
      normalizeTier(sourceRaw.tier) ||
      normalizeTier(raw.tier) ||
      ""
  };
}

function computeRepeatCount(input = {}) {
  const repeatCount = toNumber(input.repeatCount, 1);
  return repeatCount > 0 ? repeatCount : 1;
}

function computeCoins(input = {}) {
  return pickFirstPositiveNumber(
    input.explicitTotalCoins,
    input.totalCoins,
    input.coins,
    input.value,
    input.rawValue,
    input.totalValue,
    input.coinValue,
    input.amount
  );
}

function computeUnitCoins(input = {}) {
  return pickFirstPositiveNumber(
    input.coins,
    input.coinValue,
    input.value,
    input.rawValue,
    input.amount
  );
}

function computeTotalCoins(input = {}) {
  const explicitTotalCoins = pickFirstPositiveNumber(
    input.explicitTotalCoins,
    input.totalCoins,
    input.totalValue
  );

  if (explicitTotalCoins > 0) {
    return explicitTotalCoins;
  }

  const repeatCount = computeRepeatCount(input);
  const unitCoins = computeUnitCoins(input);

  if (unitCoins > 0) {
    return unitCoins * repeatCount;
  }

  return 0;
}

function computeMiaPointsFromCoins(totalCoins = 0) {
  return giftTiers.computeMiaPointsFromCoins(totalCoins);
}

function computeMiaPoints(input = {}) {
  const directPoints = pickFirstPositiveNumber(
    input.explicitMiaPoints,
    input.miaPoints,
    input.supportIndex,
    input.points,
    input.totalPoints
  );

  if (directPoints > 0) {
    return directPoints;
  }

  const totalCoins = computeTotalCoins(input);
  return computeMiaPointsFromCoins(totalCoins);
}

function resolveTierFromMiaPoints(miaPoints = 0) {
  return giftTiers.resolveTierFromMiaPoints(miaPoints);
}

function resolveTierFromEconomy(totalCoins = 0, miaPoints = 0) {
  if (useCoinTierEconomy()) {
    return giftTiers.resolveStreamTierFromCoins(totalCoins);
  }
  return resolveTierFromMiaPoints(miaPoints);
}

function toPlaybackTier(tierValue, fallback = "T1") {
  const tier = safeString(tierValue, fallback).toUpperCase();
  // Gift mapa má T0; stream/video pool běží na T1–T6.
  if (tier === "T0") return "T1";
  return giftTiers.normalizeStreamTier(tier, fallback);
}

function pickHigherPlaybackTier(a, b) {
  const left = toPlaybackTier(a, "T1");
  const right = toPlaybackTier(b, "T1");
  return giftTiers.tierRank(left) >= giftTiers.tierRank(right) ? left : right;
}

function buildResolvedSupport(input = {}) {
  const repeatCount = computeRepeatCount(input);
  const unitCoins = computeUnitCoins(input);
  const totalCoins = computeTotalCoins(input);
  const miaPoints = computeMiaPoints({
    ...input,
    totalCoins
  });

  const xpBase = totalCoins;
  const coinTier = resolveTierFromEconomy(totalCoins, miaPoints);

  const giftMapping = resolveGiftMapping({
    platform: normalizePlatform(input.platform, "unknown"),
    giftId: input.giftId ?? null,
    giftName: safeString(input.giftName, ""),
    coins: unitCoins,
    totalCoins,
    repeatCount
  });
  const giftProfile = giftMapping.profile;

  const giftMap = giftMapEnterprise.resolveGift({
    platform: normalizePlatform(input.platform, "unknown"),
    giftId: input.giftId ?? null,
    giftName: safeString(input.giftName, ""),
    displayName: safeString(input.displayName || input.nickname || input.user, "Viewer"),
    coins: unitCoins,
    totalCoins,
    count: repeatCount
  });

  // Playback tier = max(coin economy, gift-map katalog). Lion/Galaxy tak nejsou T1 video.
  const mapPlaybackTier = toPlaybackTier(giftMap.tier, coinTier);
  const streamTier = pickHigherPlaybackTier(coinTier, mapPlaybackTier);
  const videoPoolTier = toPlaybackTier(
    giftMap.video?.tierPool || giftMap.tier,
    streamTier
  );
  const obsTier = giftEconomy.mapStreamTierToObsTier(
    pickHigherPlaybackTier(streamTier, videoPoolTier)
  );
  const tier = streamTier;

  return {
    giftId: input.giftId ?? null,
    giftName: safeString(input.giftName, ""),
    coins: unitCoins,
    repeatCount,
    totalCoins,
    rawValue: pickFirstPositiveNumber(input.rawValue, totalCoins, unitCoins),
    xpBase,
    xp: xpBase,
    miaPoints,
    supportIndex: miaPoints,
    coinTier,
    streamTier,
    obsTier,
    tier,
    giftProfile,
    giftMap,
    giftKey: giftMap.giftKey,
    giftCategory: giftMap.category,
    giftPriority: giftMap.priority,
    giftCare: giftMap.care,
    giftBowl: giftMap.bowl,
    giftOverlay: giftMap.overlay,
    giftVoice: giftMap.voice,
    giftVideo: giftMap.video,
    giftXp: giftMap.xp,
    giftMappingSource: giftMapping.mappingSource,
    giftMappingConfidence: giftMapping.mappingConfidence,
    economy: {
      platform: normalizePlatform(input.platform, "unknown"),
      miaPointsPerUnit: MIA_POINTS_PER_UNIT,
      tierMode: useCoinTierEconomy() ? "coins" : "miaPoints",
      tierThresholds: useCoinTierEconomy()
        ? clone(giftTiers.COIN_TIER_THRESHOLDS)
        : clone(SUPPORT_TIER_THRESHOLDS),
      sourceOfTruth: "MIA_SUPPORT_RESOLVER+shared/gifts",
      giftMapVersion: giftMap.version || GIFT_MAP_VERSION,
      giftMappingSource: giftMapping.mappingSource,
      giftMappingConfidence: giftMapping.mappingConfidence,
      giftEconomyVersion: giftEconomy.GIFT_ECONOMY_VERSION,
      coinTier,
      mapTier: giftMap.tier,
      videoPoolTier
    }
  };
}

function enrichNormalizedSupport(normalizedEvent = {}, rawEvent = {}) {
  if (!isObject(normalizedEvent)) {
    return normalizedEvent;
  }

  if (!isObject(normalizedEvent.support)) {
    normalizedEvent.support = {};
  }

  const supportInput = buildSupportInput(normalizedEvent, rawEvent);
  const resolvedSupport = buildResolvedSupport(supportInput);

  normalizedEvent.support = {
    ...normalizedEvent.support,
    ...resolvedSupport
  };

  return normalizedEvent;
}

function resolveSupport(eventOrRaw = {}) {
  const normalizedEvent = isObject(eventOrRaw) ? clone(eventOrRaw) : {};
  const rawEvent = isObject(normalizedEvent.raw) ? normalizedEvent.raw : normalizedEvent;

  const syntheticNormalizedEvent = {
    platform: normalizedEvent.platform || rawEvent.platform || rawEvent.source || "unknown",
    support: isObject(normalizedEvent.support) ? normalizedEvent.support : {},
    meta: isObject(normalizedEvent.meta) ? normalizedEvent.meta : {},
    raw: isObject(normalizedEvent.raw) ? normalizedEvent.raw : rawEvent
  };

  const supportInput = buildSupportInput(syntheticNormalizedEvent, rawEvent);
  return buildResolvedSupport(supportInput);
}

module.exports = {
  enrichNormalizedSupport,
  resolveSupport,
  computeCoins,
  computeTotalCoins,
  computeMiaPoints,
  computeMiaPointsFromCoins,
  resolveTierFromMiaPoints,
  resolveTierFromEconomy,
  useCoinTierEconomy,
  SUPPORT_TIER_THRESHOLDS,
  MIA_POINTS_PER_UNIT
};
