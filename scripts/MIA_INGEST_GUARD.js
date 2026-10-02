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
    for (const [key, entry] of recent.entries()) {
      if (!entry || entry.status === "pending") continue;
      if (now - entry.at > windowMs * 2) {
        recent.delete(key);
      }
    }
  }

  function logLifecycle(entry) {
    if (!appendJsonLog) return;
    try {
      appendJsonLog("ingest-dedupe-lifecycle", entry);
    } catch (_err) {
      /* lifecycle diagnostics must not block ingest */
    }
  }

  function trustedGiftResult(normalized, key, extra = {}) {
    const result = {
      duplicate: Boolean(extra.duplicate),
      key,
      windowMs,
      trustedSourceId: resolveGiftTrustedSourceId(normalized) || null,
      identity: "trusted",
      reason: extra.reason,
      reservation: extra.reservation
    };
    if (extra.ageMs !== undefined) result.ageMs = extra.ageMs;
    return result;
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
          appendJsonLog("ingest-identity", {
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

    const eventType = safeString(normalized.eventType || normalized.type, "UNKNOWN").toUpperCase();
    const entry = recent.get(key);

    if (eventType === "GIFT") {
      if (entry?.status === "pending") {
        return trustedGiftResult(normalized, key, {
          duplicate: true,
          ageMs: now - entry.at,
          reason: "trusted_source_pending",
          reservation: "pending"
        });
      }

      if (entry?.status === "committed" && now - entry.at < windowMs) {
        return trustedGiftResult(normalized, key, {
          duplicate: true,
          ageMs: now - entry.at,
          reason: "trusted_source_committed",
          reservation: "committed"
        });
      }

      recent.set(key, { status: "pending", at: now });
      return trustedGiftResult(normalized, key, {
        duplicate: false,
        reason: "trusted_source_id",
        reservation: "pending"
      });
    }

    if (entry && now - entry.at < windowMs) {
      return {
        duplicate: true,
        key,
        ageMs: now - entry.at,
        windowMs,
        trustedSourceId: null,
        identity: null,
        reason: null
      };
    }

    recent.set(key, { status: "committed", at: now });

    return {
      duplicate: false,
      key,
      windowMs,
      trustedSourceId: null,
      identity: null,
      reason: null
    };
  }

  function commitTrustedGift(normalized = {}) {
    const eventType = safeString(normalized.eventType || normalized.type, "UNKNOWN").toUpperCase();
    if (eventType !== "GIFT") {
      return { committed: false, reason: "not_gift" };
    }

    const key = buildDedupeKey(normalized);
    if (!key) {
      return { committed: false, key: null, reason: "no_trusted_gift_source_id" };
    }

    const entry = recent.get(key);
    if (!entry) {
      return { committed: false, key, reason: "no_pending_reservation" };
    }
    if (entry.status === "committed") {
      return { committed: true, key, reservation: "committed", already: true };
    }

    const now = nowTs();
    recent.set(key, { status: "committed", at: now });
    return { committed: true, key, reservation: "committed", at: now };
  }

  function abortTrustedGift(normalized = {}, err) {
    const eventType = safeString(normalized.eventType || normalized.type, "UNKNOWN").toUpperCase();
    if (eventType !== "GIFT") {
      return { action: "ignored" };
    }

    const key = buildDedupeKey(normalized);
    if (!key) {
      return { action: "ignored", reason: "no_trusted_gift_source_id" };
    }

    const entry = recent.get(key);
    if (!entry) {
      return { action: "ignored", key };
    }

    const trustedSourceId = resolveGiftTrustedSourceId(normalized) || null;
    const platform = safeString(normalized.platform, "unknown").toLowerCase();
    const error = err && (err.message || String(err));

    if (entry.status === "pending") {
      recent.delete(key);
      logLifecycle({
        eventType: "GIFT",
        duplicate: false,
        identity: "trusted",
        reason: "reservation_released_before_side_effects",
        reservation: "released",
        trustedSourceId,
        key,
        platform,
        error: error || null
      });
      return {
        action: "released",
        key,
        reason: "reservation_released_before_side_effects"
      };
    }

    logLifecycle({
      eventType: "GIFT",
      duplicate: false,
      identity: "trusted",
      reason: "downstream_failure_after_commit",
      reservation: "committed",
      trustedSourceId,
      key,
      platform,
      error: error || null
    });
    return {
      action: "retained",
      key,
      reason: "downstream_failure_after_commit"
    };
  }

  return {
    checkDuplicate,
    buildDedupeKey,
    commitTrustedGift,
    abortTrustedGift
  };
}

module.exports = {
  hasIngestPayloadSignal,
  createIngestDeduper
};
