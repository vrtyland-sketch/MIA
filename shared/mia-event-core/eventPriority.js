"use strict";

/**
 * Master Canon 0003 — event priority levels (§7).
 */

const EVENT_PRIORITY = Object.freeze({
  CRITICAL: "critical",
  HIGH: "high",
  NORMAL: "normal",
  LOW: "low",
  BACKGROUND: "background"
});

const EVENT_PRIORITY_RANK = Object.freeze({
  [EVENT_PRIORITY.CRITICAL]: 5,
  [EVENT_PRIORITY.HIGH]: 4,
  [EVENT_PRIORITY.NORMAL]: 3,
  [EVENT_PRIORITY.LOW]: 2,
  [EVENT_PRIORITY.BACKGROUND]: 1
});

function isEventPriority(value) {
  return typeof value === "string" && Object.values(EVENT_PRIORITY).includes(value);
}

function compareEventPriority(a, b) {
  const ra = EVENT_PRIORITY_RANK[isEventPriority(a) ? a : EVENT_PRIORITY.NORMAL] || 0;
  const rb = EVENT_PRIORITY_RANK[isEventPriority(b) ? b : EVENT_PRIORITY.NORMAL] || 0;
  return rb - ra;
}

function resolveGiftEventPriority(tier = "") {
  const t = String(tier || "").toUpperCase();
  if (t === "T5" || t === "T6") return EVENT_PRIORITY.CRITICAL;
  if (t === "T3" || t === "T4") return EVENT_PRIORITY.HIGH;
  return EVENT_PRIORITY.HIGH;
}

module.exports = {
  EVENT_PRIORITY,
  EVENT_PRIORITY_RANK,
  isEventPriority,
  compareEventPriority,
  resolveGiftEventPriority
};
