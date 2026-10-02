"use strict";

const { readTrustedGiftSourceId } = require("../shared/platform_normalizers/normalize_event");

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

function readExplicitId(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return "";
}

function resolveGiftTrustedSourceId(normalized = {}) {
  const direct = readExplicitId(normalized.trustedSourceId);
  if (direct) return direct;

  const fromRaw = readTrustedGiftSourceId(normalized.raw || {});
  if (fromRaw) return fromRaw;

  const fromSanitized = readTrustedGiftSourceId(normalized.sanitizedRaw || {});
  if (fromSanitized) return fromSanitized;

  if (normalized.eventIdentityTrusted === true) {
    return readExplicitId(normalized.eventId);
  }

  return readTrustedGiftSourceId({
    messageId: normalized.messageId,
    msgId: normalized.msgId,
    uuid: normalized.uuid,
    transactionId: normalized.transactionId
  });
}

function createIngestDeduper(deps = {}) {
  const windowMs = Math.max(1000, Number(deps.windowMs || 4500));
  const nowTs = typeof deps.nowTs === "function" ? deps.nowTs : () => Date.now();
  const appendJsonLog =
    typeof deps.appendJsonLog === "function"
      ? deps.appendJsonLog
      : typeof deps.writeLog === "function"
        ? deps.writeLog
        : null;
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
      const trustedSourceId = resolveGiftTrustedSourceId(normalized);
      if (!trustedSourceId) return null;
      return [platform, eventType, trustedSourceId].join("|");
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
    if (!key && safeString(normalized.eventType || normalized.type, "UNKNOWN").toUpperCase() === "GIFT") {
      const untrusted = {
        duplicate: false,
        key: null,
        windowMs,
        trustedSourceId: null,
        identity: "untrusted",
        reason: "no_trusted_gift_source_id"
      };
      if (appendJsonLog) {
        try {
          appendJsonLog("ingest-deduped", {
            eventType: "GIFT",
            duplicate: false,
            reason: untrusted.reason,
            identity: untrusted.identity,
            trustedSourceId: null,
            platform: safeString(normalized.platform, "unknown").toLowerCase()
          });
        } catch (_err) {
          /* identity reporting must not block ingest */
        }
      }
      return untrusted;
    }

    const seenAt = recent.get(key);

    if (seenAt && now - seenAt < windowMs) {
      return {
        duplicate: true,
        key,
        ageMs: now - seenAt,
        windowMs,
        trustedSourceId: resolveGiftTrustedSourceId(normalized) || null,
        identity: safeString(normalized.eventType || normalized.type).toUpperCase() === "GIFT"
          ? "trusted"
          : null,
        reason: safeString(normalized.eventType || normalized.type).toUpperCase() === "GIFT"
          ? "trusted_source_id"
          : null
      };
    }

    recent.set(key, now);

    const eventType = safeString(normalized.eventType || normalized.type, "UNKNOWN").toUpperCase();
    return {
      duplicate: false,
      key,
      windowMs,
      trustedSourceId: eventType === "GIFT" ? resolveGiftTrustedSourceId(normalized) || null : null,
      identity: eventType === "GIFT" ? "trusted" : null,
      reason: eventType === "GIFT" ? "trusted_source_id" : null
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
