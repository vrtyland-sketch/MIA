"use strict";

const REQUIRED_PARTS = ["head", "eyes", "hands", "torso", "feet"];
const FORBIDDEN_PUBLIC_KEYS = new Set([
  "coins",
  "giftValue",
  "totalCoins",
  "rawValue",
  "diamondCount",
  "repeatCount"
]);

function evaluateBodyStatePayload(data = {}) {
  const parts = data.parts && typeof data.parts === "object" ? data.parts : {};
  const missingParts = REQUIRED_PARTS.filter((key) => typeof parts[key] !== "boolean");

  return {
    ok: data.ok === true && typeof data.mood === "string" && missingParts.length === 0,
    mood: safeString(data.mood),
    phase: safeString(data.phase),
    source: safeString(data.source),
    missingParts,
    detail:
      missingParts.length === 0
        ? `mood=${safeString(data.mood, "idle")} source=${safeString(data.source, "?")}`
        : `chybí parts: ${missingParts.join(", ")}`
  };
}

function containsForbiddenPublicValueFields(value, path = "") {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      containsForbiddenPublicValueFields(item, `${path}[${index}]`)
    );
  }

  const hits = [];
  for (const [key, nested] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (FORBIDDEN_PUBLIC_KEYS.has(key)) {
      hits.push(nextPath);
    }
    hits.push(...containsForbiddenPublicValueFields(nested, nextPath));
  }
  return hits;
}

function evaluateOverlayPublicSanitized(snapshot = {}) {
  const hits = containsForbiddenPublicValueFields(snapshot);
  return {
    ok: hits.length === 0,
    hits,
    detail: hits.length ? `zakázaná pole: ${hits.slice(0, 4).join(", ")}` : "bez coins/giftValue"
  };
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

module.exports = {
  REQUIRED_PARTS,
  FORBIDDEN_PUBLIC_KEYS,
  evaluateBodyStatePayload,
  evaluateOverlayPublicSanitized,
  containsForbiddenPublicValueFields
};
