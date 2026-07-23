"use strict";

/**
 * MIA_TIKTOK_NORMALIZER.js
 *
 * MIA38 FIX:
 * - ODSTRANĚN source-of-truth tier
 * - normalizer už NIKDY neurčuje finální tier
 *
 * PRAVIDLO:
 * - normalizer = RAW DATA ONLY
 * - resolver = source-of-truth
 */

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeTikTokEvent(input = {}) {
  const giftName =
    safeString(input.giftName) ||
    safeString(input.gift) ||
    safeString(input.value1) ||
    "gift";

  const coins =
    toNumber(input.coins, NaN) ||
    toNumber(input.coinValue, NaN) ||
    toNumber(input.value, NaN) ||
    toNumber(input.rawValue, 0);

  const repeatCount =
    toNumber(input.repeatCount, NaN) ||
    toNumber(input.repeat, NaN) ||
    toNumber(input.count, 1);

  const totalCoins =
    toNumber(input.totalCoins, NaN) ||
    (coins > 0 ? coins * repeatCount : 0);

  return {
    platform: "tiktok",
    eventType: "GIFT",
    route: "support",

    user: {
      userId: safeString(input.userId),
      username: safeString(input.username),
      nickname: safeString(input.nickname)
    },

    support: {
      giftName,
      coins,
      repeatCount,
      totalCoins,

      /**
       * 🔴 DŮLEŽITÉ:
       * tier zde NEEXISTUJE jako source-of-truth
       * resolver ho dopočítá
       */
      tier: "" 
    },

    raw: input
  };
}

module.exports = {
  normalizeTikTokEvent
};