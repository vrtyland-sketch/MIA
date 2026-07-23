"use strict";

/**
 * MIA NEXT — overlay_payload contract
 *
 * Jediný povolený formát pro overlay.
 */

const CONTRACT_VERSION = "v1";

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createOverlayPayload(input = {}) {
  return {
    contractVersion: CONTRACT_VERSION,

    owner: safeString(input.owner, "mia"),
    route: safeString(input.route, "community"),

    text: safeString(input.text),
    subtext: safeString(input.subtext),

    priority: toNumber(input.priority, 1),
    holdMs: toNumber(input.holdMs, 4000),

    user: safeString(input.user),
    giftName: safeString(input.giftName),
    tier: safeString(input.tier),

    mood: safeString(input.mood),
    stage: safeString(input.stage),

    meta:
      input.meta && typeof input.meta === "object"
        ? clone(input.meta)
        : null
  };
}

function isOverlayPayload(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    value.contractVersion === CONTRACT_VERSION
  );
}

function validateOverlayPayload(value) {
  const errors = [];

  if (!value || typeof value !== "object") {
    return {
      ok: false,
      errors: ["overlay_payload must be object"]
    };
  }

  if (value.contractVersion !== CONTRACT_VERSION) {
    errors.push(`contractVersion must be ${CONTRACT_VERSION}`);
  }

  if (!safeString(value.text)) {
    errors.push("text is required");
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

module.exports = {
  CONTRACT_VERSION,
  createOverlayPayload,
  isOverlayPayload,
  validateOverlayPayload
};