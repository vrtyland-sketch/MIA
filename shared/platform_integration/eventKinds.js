"use strict";

/**
 * Unified MIA event kinds for multi-platform ingest.
 * Bridges map platform-native payloads → these kinds before /ingest.
 */
const EVENT_KINDS = Object.freeze({
  CHAT: "COMMENT",
  COMMENT: "COMMENT",
  GIFT: "GIFT",
  FOLLOW: "FOLLOW",
  SUBSCRIBE: "GIFT", // support lane; monetization adapters only
  LIKE: "LIKE",
  SHARE: "SHARE",
  SYSTEM: "SYSTEM"
});

/** Chat-only freeze policy: monetization kinds stay off until Core unlock. */
const CHAT_ONLY_KINDS = Object.freeze(["COMMENT", "FOLLOW", "SYSTEM", "LIKE", "SHARE"]);

function isChatOnlyKind(eventType) {
  const t = String(eventType || "").toUpperCase();
  return CHAT_ONLY_KINDS.includes(t);
}

function toMiaEventType(kind) {
  const key = String(kind || "").toUpperCase();
  return EVENT_KINDS[key] || "UNKNOWN";
}

module.exports = {
  EVENT_KINDS,
  CHAT_ONLY_KINDS,
  isChatOnlyKind,
  toMiaEventType
};
