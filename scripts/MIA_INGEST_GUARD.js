"use strict";

function isEmptyScalar(value) {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  if (typeof value === "number") {
    return !Number.isFinite(value);
  }

  if (typeof value === "boolean") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }

  return false;
}

function hasIngestPayloadSignal(payload = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }

  const keys = Object.keys(payload);
  if (keys.length === 0) {
    return false;
  }

  for (const key of keys) {
    if (!isEmptyScalar(payload[key])) {
      return true;
    }
  }

  return false;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function createIngestDeduper(deps = {}) {
  const windowMs = Math.max(1000, Number(deps.windowMs || 4500));
  const nowTs = typeof deps.nowTs === "function" ? deps.nowTs : () => Date.now();
  const recent = new Map();

  function prune(now) {
    for (const [key, seenAt] of recent.entries()) {
      if (now - seenAt > windowMs * 2) {
        recent.delete(key);
      }
    }
  }

  function buildDedupeKey(normalized = {}) {
    const eventType = safeString(normalized.eventType || normalized.type, "UNKNOWN").toUpperCase();
    const platform = safeString(normalized.platform, "unknown").toLowerCase();
    const user = normalized.user || {};
    const userKey = safeString(
      user.userId ?? user.username ?? user.nickname,
      "anon"
    ).toLowerCase();

    if (eventType === "GIFT") {
      const support = normalized.support || {};
      return [
        platform,
        eventType,
        userKey,
        safeString(support.giftId || support.giftName, "gift").toLowerCase(),
        String(support.coins ?? support.totalCoins ?? 0),
        String(support.repeatCount ?? 1)
      ].join("|");
    }

    const message = safeString(
      normalized.message ||
        normalized.comment ||
        normalized.content ||
        normalized.text
    ).toLowerCase();

    const sourceEventId = safeString(
      normalized.eventId || normalized.messageId || normalized.traceId
    );

    if (sourceEventId) {
      return `${platform}|${eventType}|${sourceEventId}`;
    }

    return `${platform}|${eventType}|${userKey}|${message}`;
  }

  function checkDuplicate(normalized = {}) {
    const now = nowTs();
    prune(now);

    const key = buildDedupeKey(normalized);
    const seenAt = recent.get(key);

    if (seenAt && now - seenAt < windowMs) {
      return {
        duplicate: true,
        key,
        ageMs: now - seenAt,
        windowMs
      };
    }

    recent.set(key, now);

    return {
      duplicate: false,
      key,
      windowMs
    };
  }

  return {
    checkDuplicate,
    buildDedupeKey
  };
}

module.exports = {
  hasIngestPayloadSignal,
  createIngestDeduper
};
