"use strict";

const streamEconomy = require("./MIA_STREAM_ECONOMY_CONFIG");
const tierCfg = streamEconomy.getTierConfig();

/**
 * Centralizované tier / coin konstanty — jediný zdroj pro economy, map, resolver, spam.
 */

const STREAM_TIERS = Object.freeze(["T1", "T2", "T3", "T4", "T5", "T6"]);

/** Stream tier z celkových coinů (TikTok diamonds). */
const COIN_TIER_THRESHOLDS = Object.freeze({ ...(tierCfg.coinThresholds || {}) });

/** Auto-map bucket prahy pro neznámé dárky (MIA_GIFT_MAP). */
const COIN_VALUE_BUCKETS = Object.freeze({
  mid: 100,
  big: 1000,
  epic: 5000,
  legendary: 15000
});

/** Legacy miaPoints tier prahy (MIA_GIFT_ECONOMY_TIERS=legacy). */
const LEGACY_MIA_POINTS_THRESHOLDS = Object.freeze({
  T1: 0,
  T2: 250,
  T3: 3492.5,
  T4: 7500,
  T5: 10000,
  T6: 187500
});

/** 1 coin → MIA body (soulad s MIA_GAME_CONFIG.ECONOMY.coin_to_points). */
const MIA_POINTS_PER_COIN = tierCfg.miaPointsPerCoin ?? 7.5;

const MIA_POINTS_PER_UNIT = MIA_POINTS_PER_COIN;
const SUPPORT_TIER_THRESHOLDS = LEGACY_MIA_POINTS_THRESHOLDS;

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeStreamTier(value, fallback = "T1") {
  const tier = safeString(value).toUpperCase();
  if (STREAM_TIERS.includes(tier)) {
    return tier;
  }
  return fallback;
}

function tierRank(tier = "T1") {
  return Number(normalizeStreamTier(tier).replace(/\D/g, "")) || 1;
}

function resolveStreamTierFromCoins(totalCoins = 0) {
  const coins = Math.max(0, toNumber(totalCoins, 0));
  if (coins <= 0) return "T1";
  if (coins >= COIN_TIER_THRESHOLDS.T6) return "T6";
  if (coins >= COIN_TIER_THRESHOLDS.T5) return "T5";
  if (coins >= COIN_TIER_THRESHOLDS.T4) return "T4";
  if (coins >= COIN_TIER_THRESHOLDS.T3) return "T3";
  if (coins >= COIN_TIER_THRESHOLDS.T2) return "T2";
  return "T1";
}

function resolveCoinValueBucket(totalCoins = 0) {
  const coins = Math.max(0, toNumber(totalCoins, 0));
  if (coins >= COIN_VALUE_BUCKETS.legendary) return "legendary";
  if (coins >= COIN_VALUE_BUCKETS.epic) return "epic";
  if (coins >= COIN_VALUE_BUCKETS.big) return "big";
  if (coins >= COIN_VALUE_BUCKETS.mid) return "mid";
  if (coins > 0) return "small";
  return "unknown";
}

function computeMiaPointsFromCoins(totalCoins = 0) {
  const safeCoins = toNumber(totalCoins, 0);
  if (safeCoins <= 0) return 0;
  return safeCoins * MIA_POINTS_PER_COIN;
}

function resolveTierFromMiaPoints(miaPoints = 0) {
  const points = toNumber(miaPoints, 0);
  if (points >= LEGACY_MIA_POINTS_THRESHOLDS.T6) return "T6";
  if (points >= LEGACY_MIA_POINTS_THRESHOLDS.T5) return "T5";
  if (points >= LEGACY_MIA_POINTS_THRESHOLDS.T4) return "T4";
  if (points >= LEGACY_MIA_POINTS_THRESHOLDS.T3) return "T3";
  if (points >= LEGACY_MIA_POINTS_THRESHOLDS.T2) return "T2";
  return "T1";
}

module.exports = {
  STREAM_TIERS,
  COIN_TIER_THRESHOLDS,
  COIN_VALUE_BUCKETS,
  LEGACY_MIA_POINTS_THRESHOLDS,
  SUPPORT_TIER_THRESHOLDS,
  MIA_POINTS_PER_COIN,
  MIA_POINTS_PER_UNIT,
  normalizeStreamTier,
  tierRank,
  resolveStreamTierFromCoins,
  resolveCoinValueBucket,
  computeMiaPointsFromCoins,
  resolveTierFromMiaPoints
};
