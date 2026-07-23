"use strict";

/**
 * Gift Map validator — ověří vstupní event a resolved kontext.
 */

const { listCatalogKeys, tiers } = require("./resolver");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function validateGiftEvent(input = {}) {
  const errors = [];
  const warnings = [];

  if (!safeString(input.giftName) && input.giftId == null) {
    errors.push("missing_gift_identity");
  }

  const coins = toNumber(input.coins ?? input.coinValue ?? input.value ?? input.giftValue, NaN);
  if (!Number.isFinite(coins) || coins < 0) {
    warnings.push("missing_or_invalid_coins");
  }

  const count = toNumber(input.count ?? input.repeatCount, 1);
  if (count < 1) {
    errors.push("invalid_count");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}

function validateResolved(resolved = {}) {
  const errors = [];
  const warnings = [];
  const keys = new Set(listCatalogKeys());

  if (!resolved.giftKey) errors.push("missing_gift_key");
  if (!keys.has(resolved.giftKey) && resolved.giftKey !== "GENERIC") {
    warnings.push("unknown_gift_key");
  }

  const streamTiers = tiers.streamTiers || [];
  if (!streamTiers.includes(resolved.tier)) {
    errors.push("invalid_tier");
  }

  if (resolved.overlay?.showCoins === true) {
    errors.push("overlay_must_not_show_coins");
  }

  if (!(resolved.priority >= 1)) {
    warnings.push("low_priority");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}

module.exports = {
  validateGiftEvent,
  validateResolved
};
