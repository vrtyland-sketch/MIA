"use strict";

/**
 * MIA NEXT — normalized_event contract
 *
 * Source of truth pro vstup do decision layeru.
 *
 * Pravidlo:
 * - každý event MUSÍ projít tímto kontraktem
 * - žádné "napůl validní" objekty dál
 */

const CONTRACT_VERSION = "v1";

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeEventType(value) {
  const type = safeString(value).toUpperCase();

  if (
    type === "GIFT" ||
    type === "COMMENT" ||
    type === "CHAT" ||
    type === "LIKE" ||
    type === "FOLLOW" ||
    type === "SHARE" ||
    type === "SYSTEM"
  ) {
    return type;
  }

  return "UNKNOWN";
}

function normalizeRoute(value, eventType) {
  const route = safeString(value).toLowerCase();

  if (route === "support" || route === "community" || route === "system") {
    return route;
  }

  // fallback z eventType
  if (eventType === "GIFT") return "support";
  if (eventType === "COMMENT" || eventType === "CHAT") return "community";

  return "ignore";
}

function createNormalizedEvent(input = {}) {
  const eventType = normalizeEventType(input.eventType);

  return {
    contractVersion: CONTRACT_VERSION,

    platform: safeString(input.platform, "unknown"),
    source: safeString(input.source, "unknown"),

    eventType,
    route: normalizeRoute(input.route, eventType),

    message: safeString(input.message || input.text),

    user: input.user && typeof input.user === "object" ? input.user : {},

    support:
      input.support && typeof input.support === "object"
        ? {
            tier: safeString(input.support.tier).toUpperCase(),
            coins: Number(input.support.coins || 0),
            giftName: safeString(input.support.giftName)
          }
        : null,

    communityImpact:
      input.communityImpact && typeof input.communityImpact === "object"
        ? input.communityImpact
        : null,

    ts: Number(input.ts || Date.now()),

    raw: input.raw || null
  };
}

function validateNormalizedEvent(event) {
  const errors = [];

  if (!event || typeof event !== "object") {
    return { ok: false, errors: ["event must be object"] };
  }

  if (event.contractVersion !== CONTRACT_VERSION) {
    errors.push("invalid contractVersion");
  }

  if (!event.eventType) {
    errors.push("missing eventType");
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

module.exports = {
  createNormalizedEvent,
  validateNormalizedEvent
};