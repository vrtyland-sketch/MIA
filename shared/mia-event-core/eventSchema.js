"use strict";

/**
 * Master Canon 0003 — mandatory event fields (§5) + validation.
 */

const { EVENT_LIFECYCLE, isEventLifecycleState } = require("./eventLifecycle");
const { EVENT_CATEGORY, isEventCategory, resolveStreamEventCategory } = require("./eventCategories");
const { EVENT_PRIORITY, isEventPriority, resolveGiftEventPriority } = require("./eventPriority");

const EVENT_SCHEMA_VERSION = "1.0";

const REQUIRED_EVENT_FIELDS = Object.freeze([
  "eventId",
  "eventType",
  "createdAt",
  "source",
  "target",
  "priority",
  "payload",
  "state",
  "schemaVersion"
]);

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function validateEventRecord(record = {}) {
  const errors = [];
  if (!record || typeof record !== "object") {
    return { ok: false, errors: ["not_an_object"], normalized: null };
  }

  const eventId = safeString(record.eventId);
  if (!eventId) errors.push("missing_eventId");

  const eventType = safeString(record.eventType);
  if (!eventType) errors.push("missing_eventType");

  const createdAt = safeString(record.createdAt);
  if (!createdAt) errors.push("missing_createdAt");

  const source = safeString(record.source);
  if (!source) errors.push("missing_source");

  const target = record.target;
  if (target != null && typeof target !== "string") errors.push("invalid_target");

  const priority = safeString(record.priority, EVENT_PRIORITY.NORMAL);
  if (!isEventPriority(priority)) errors.push("invalid_priority");

  const payload = record.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    errors.push("invalid_payload");
  }

  const state = safeString(record.state);
  if (!isEventLifecycleState(state)) errors.push("invalid_state");

  const schemaVersion = safeString(record.schemaVersion);
  if (!schemaVersion) errors.push("missing_schemaVersion");

  const category = record.category != null ? safeString(record.category) : "";
  if (category && !isEventCategory(category)) errors.push("invalid_category");

  const normalized =
    errors.length === 0
      ? {
          eventId,
          eventType,
          createdAt,
          source,
          target: target != null ? safeString(target) : null,
          priority,
          payload: { ...payload },
          state,
          schemaVersion,
          ...(category ? { category } : {}),
          ...(record.traceId ? { traceId: safeString(record.traceId) } : {})
        }
      : null;

  return { ok: errors.length === 0, errors, normalized };
}

function createEventRecord(input = {}) {
  const now = new Date().toISOString();
  const eventType = safeString(input.eventType, "UNKNOWN");
  const category =
    input.category ||
    resolveStreamEventCategory(eventType) ||
    EVENT_CATEGORY.SYSTEM;

  let priority = input.priority || EVENT_PRIORITY.NORMAL;
  if (eventType === "GIFT" && input.payload?.tier) {
    priority = resolveGiftEventPriority(input.payload.tier);
  }

  const draft = {
    eventId: input.eventId,
    eventType,
    createdAt: input.createdAt || now,
    source: input.source || "unknown",
    target: input.target != null ? input.target : null,
    priority,
    payload: input.payload && typeof input.payload === "object" ? input.payload : {},
    state: input.state || EVENT_LIFECYCLE.CREATED,
    schemaVersion: input.schemaVersion || EVENT_SCHEMA_VERSION,
    category,
    ...(input.traceId ? { traceId: input.traceId } : {})
  };
  return validateEventRecord(draft);
}

/**
 * Bridge from runtime normalize_event output → canon event record (best-effort).
 */
function fromNormalizedIngestEvent(normalized = {}) {
  if (!normalized || typeof normalized !== "object") {
    return validateEventRecord({});
  }
  const eventType = safeString(normalized.eventType, "UNKNOWN");
  return createEventRecord({
    eventId: normalized.eventId,
    eventType,
    createdAt: normalized.isoTime || new Date(normalized.ts || Date.now()).toISOString(),
    source: safeString(normalized.platform, normalized.source || "unknown"),
    target: normalized.route || null,
    traceId: normalized.traceId,
    payload: {
      route: normalized.route,
      user: normalized.user || null,
      support: normalized.support || null,
      communityImpact: normalized.communityImpact || null,
      message: normalized.message || null
    },
    state: EVENT_LIFECYCLE.CREATED
  });
}

module.exports = {
  EVENT_SCHEMA_VERSION,
  REQUIRED_EVENT_FIELDS,
  EVENT_LIFECYCLE,
  EVENT_CATEGORY,
  EVENT_PRIORITY,
  validateEventRecord,
  createEventRecord,
  fromNormalizedIngestEvent
};
