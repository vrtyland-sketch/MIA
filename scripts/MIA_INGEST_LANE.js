"use strict";

/**
 * Klasifikace ingest lane — sdílené mezi HTTP frontou a EventContext.
 */

function isLikelyGiftIngestPayload(payload = {}, safeString = String) {
  if (!payload || typeof payload !== "object") return false;
  const joined = [
    safeString(payload.eventType),
    safeString(payload.type),
    safeString(payload.event),
    safeString(payload.kind)
  ]
    .join(" ")
    .toLowerCase();

  if (joined.includes("gift") || joined.includes("donation") || joined.includes("tip")) {
    return true;
  }

  return Boolean(
    payload.giftName ||
      payload.giftId ||
      payload.coins ||
      payload.coinValue ||
      payload.diamondCount ||
      payload.repeatCount
  );
}

function resolveIngestLane(payload = {}, safeString = String) {
  if (!payload || typeof payload !== "object") return "community";

  if (isLikelyGiftIngestPayload(payload, safeString)) {
    return "support";
  }

  const type = safeString(payload.eventType || payload.type).toUpperCase();
  if (type.includes("GIFT") || type.includes("DONATION") || type.includes("TIP")) {
    return "support";
  }

  if (
    type.includes("AUDIENCE") ||
    payload.viewerCount != null ||
    payload.audienceCount != null
  ) {
    return "audience";
  }

  return "community";
}

function resolveLaneFromNormalized(normalized = {}, safeString = String) {
  const route = safeString(normalized.route).toLowerCase();
  if (route === "support") return "support";

  const eventType = safeString(normalized.eventType || normalized.type).toUpperCase();
  if (eventType === "GIFT" || eventType === "DONATION") return "support";
  if (eventType === "AUDIENCE") return "audience";

  if (normalized.support?.giftName || normalized.giftName) return "support";

  return "community";
}

module.exports = {
  isLikelyGiftIngestPayload,
  resolveIngestLane,
  resolveLaneFromNormalized
};
