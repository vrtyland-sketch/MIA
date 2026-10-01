"use strict";

/**
 * Master Canon 0003 — event categories (§6).
 */

const EVENT_CATEGORY = Object.freeze({
  USER: "user",
  STREAM: "stream",
  AI: "ai",
  GRAPHIC: "graphic",
  SYSTEM: "system",
  SCHEDULER: "scheduler"
});

const STREAM_EVENT_TYPES = Object.freeze([
  "COMMENT",
  "LIKE",
  "FOLLOW",
  "SHARE",
  "GIFT",
  "VIEWER_COUNT"
]);

function isEventCategory(value) {
  return typeof value === "string" && Object.values(EVENT_CATEGORY).includes(value);
}

function resolveStreamEventCategory(eventType = "") {
  const type = String(eventType || "").toUpperCase();
  return STREAM_EVENT_TYPES.includes(type) ? EVENT_CATEGORY.STREAM : null;
}

module.exports = {
  EVENT_CATEGORY,
  STREAM_EVENT_TYPES,
  isEventCategory,
  resolveStreamEventCategory
};
