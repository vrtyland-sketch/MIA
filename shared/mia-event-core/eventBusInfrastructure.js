"use strict";

/**
 * Master Canon 0010 — Event Bus infrastructure registry, journey, subscribers, DLQ, audit.
 * Builds on 0003 event definition; runtime anchor = ingest queue + pipeline.
 */

const crypto = require("crypto");
const { EVENT_PRIORITY } = require("./eventPriority");

const EVENT_BUS_COMPONENT = Object.freeze({
  GATEWAY: "event_gateway",
  VALIDATOR: "validator",
  REGISTRY: "event_registry",
  ROUTER: "router",
  PRIORITY_MANAGER: "priority_manager",
  QUEUE_MANAGER: "queue_manager",
  DISPATCHER: "dispatcher",
  RETRY_MANAGER: "retry_manager",
  DEAD_LETTER_QUEUE: "dead_letter_queue",
  AUDIT_LOGGER: "audit_logger",
  METRICS_COLLECTOR: "metrics_collector",
  EVENT_HISTORY: "event_history"
});

const EVENT_BUS_COMPONENT_ORDER = Object.freeze(Object.values(EVENT_BUS_COMPONENT));

/** Mandatory journey (0010 §4). */
const EVENT_JOURNEY_STEP = Object.freeze({
  SOURCE: "source",
  GATEWAY: "gateway",
  VALIDATOR: "validator",
  REGISTRY: "registry",
  PRIORITY: "priority",
  QUEUE: "queue",
  ROUTER: "router",
  DISPATCHER: "dispatcher",
  SUBSCRIBER: "subscriber",
  AUDIT: "audit",
  HISTORY: "history"
});

const EVENT_JOURNEY_ORDER = Object.freeze([
  EVENT_JOURNEY_STEP.SOURCE,
  EVENT_JOURNEY_STEP.GATEWAY,
  EVENT_JOURNEY_STEP.VALIDATOR,
  EVENT_JOURNEY_STEP.REGISTRY,
  EVENT_JOURNEY_STEP.PRIORITY,
  EVENT_JOURNEY_STEP.QUEUE,
  EVENT_JOURNEY_STEP.ROUTER,
  EVENT_JOURNEY_STEP.DISPATCHER,
  EVENT_JOURNEY_STEP.SUBSCRIBER,
  EVENT_JOURNEY_STEP.AUDIT,
  EVENT_JOURNEY_STEP.HISTORY
]);

/** Canon priority queues (0010 §9). */
const PRIORITY_QUEUE = Object.freeze({
  CRITICAL: "critical_queue",
  HIGH: "high_queue",
  NORMAL: "normal_queue",
  LOW: "low_queue",
  BACKGROUND: "background_queue"
});

const PRIORITY_QUEUE_BY_PRIORITY = Object.freeze({
  [EVENT_PRIORITY.CRITICAL]: PRIORITY_QUEUE.CRITICAL,
  [EVENT_PRIORITY.HIGH]: PRIORITY_QUEUE.HIGH,
  [EVENT_PRIORITY.NORMAL]: PRIORITY_QUEUE.NORMAL,
  [EVENT_PRIORITY.LOW]: PRIORITY_QUEUE.LOW,
  [EVENT_PRIORITY.BACKGROUND]: PRIORITY_QUEUE.BACKGROUND
});

/** Registered event types (0010 §7) — unknown types require explicit allowlist extension. */
const KNOWN_EVENT_TYPES = Object.freeze({
  CHAT_MESSAGE: "CHAT_MESSAGE",
  GIFT_RECEIVED: "GIFT_RECEIVED",
  FOLLOW: "FOLLOW",
  SUBSCRIBE: "SUBSCRIBE",
  VIDEO_PLAY: "VIDEO_PLAY",
  AI_RESPONSE: "AI_RESPONSE",
  KOJNOZROUT_FEED: "KOJNOZROUT_FEED",
  SYSTEM_START: "SYSTEM_START",
  SYSTEM_STOP: "SYSTEM_STOP"
});

const AUDIT_STEP = Object.freeze({
  RECEIVED: "received",
  VALIDATED: "validated",
  ENQUEUED: "enqueued",
  DISPATCHED: "dispatched",
  DELIVERED: "delivered",
  PROCESSED: "processed",
  ARCHIVED: "archived"
});

const AUDIT_STEP_ORDER = Object.freeze(Object.values(AUDIT_STEP));

const SUBSCRIBER_FIELDS = Object.freeze([
  "systemId",
  "eventTypes",
  "priority",
  "filter",
  "maxProcessingRate"
]);

const EVENT_BUS_FORBIDDEN_ACTIVITIES = Object.freeze([
  "decide_for_ai",
  "mutate_game_economy",
  "mutate_event_payload",
  "render_graphics",
  "persist_business_data_directly",
  "business_logic"
]);

/** MIA reference pipeline (0010 §23). */
const MIA_REFERENCE_PIPELINE = Object.freeze([
  { step: 1, node: "External Platforms", examples: ["TikTok", "Kick", "OBS"] },
  { step: 2, node: "Integration System", module: "scripts/MIA_PLATFORM_BRIDGES.js" },
  { step: 3, node: "Ingest Layer", module: "routes/ingest + scripts/MIA_INGEST_HTTP.js" },
  { step: 4, node: "Normalizer", module: "shared/platform_normalizers/normalize_event.js" },
  { step: 5, node: "Event Bus", module: "scripts/MIA_INGEST_QUEUE.js" },
  { step: 6, node: "Decision Layer", module: "MIA_NEXT/engine_shadow_runtime.js" },
  { step: 7, node: "Action Orchestrator", module: "scripts/MIA_DELIVERY_RUNTIME.js" },
  { step: 8, node: "Video Engine", module: "scripts/MIA_VIDEO_ENGINE.js" },
  { step: 9, node: "Kojnožrout Engine", module: "scripts/MIA_KOJNOZROUT_ENGINE.js" },
  { step: 10, node: "Memory System", module: "scripts/MIA_SESSION_MEMORY.js" },
  { step: 11, node: "Logging & Analytics", module: "writeLog + logs/" }
]);

const EVENT_BUS_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-event-core/eventBusInfrastructure.js",
  "shared/mia-event-core/eventBus.js",
  "scripts/MIA_INGEST_QUEUE.js",
  "scripts/MIA_INGEST_GUARD.js",
  "scripts/pipeline/run.js",
  "logs/ingest-*.jsonl"
]);

function isKnownEventType(value) {
  return typeof value === "string" && Object.values(KNOWN_EVENT_TYPES).includes(value);
}

function resolvePriorityQueue(priority) {
  return PRIORITY_QUEUE_BY_PRIORITY[priority] || PRIORITY_QUEUE.NORMAL;
}

function isEventJourneyStep(value) {
  return typeof value === "string" && EVENT_JOURNEY_ORDER.includes(value);
}

function createSubscriberRegistration(input = {}) {
  const systemId = String(input.systemId || "").trim();
  if (!systemId) {
    throw new Error("systemId is required");
  }
  return Object.freeze({
    systemId,
    eventTypes: Object.freeze(
      Array.isArray(input.eventTypes) ? input.eventTypes.map((t) => String(t)) : []
    ),
    priority: Object.values(EVENT_PRIORITY).includes(input.priority)
      ? input.priority
      : EVENT_PRIORITY.NORMAL,
    filter: input.filter != null ? input.filter : null,
    maxProcessingRate:
      input.maxProcessingRate != null ? Number(input.maxProcessingRate) : null
  });
}

function createEventAuditStep(input = {}) {
  const eventId = String(input.eventId || "").trim();
  const step = String(input.step || "").trim();
  if (!eventId) throw new Error("eventId is required");
  if (!AUDIT_STEP_ORDER.includes(step)) throw new Error(`invalid audit step: ${step}`);

  return Object.freeze({
    eventId,
    step,
    at: input.at != null ? Number(input.at) : Date.now(),
    component: String(input.component || "event_bus"),
    correlationId: String(input.correlationId || eventId),
    metadata: input.metadata != null ? Object.freeze({ ...input.metadata }) : null
  });
}

function createDeadLetterRecord(input = {}) {
  const eventId = String(input.eventId || "").trim();
  if (!eventId) throw new Error("eventId is required");

  return Object.freeze({
    eventId,
    reason: String(input.reason || "delivery_failed"),
    attemptCount: Number.isFinite(input.attemptCount) ? input.attemptCount : 0,
    failedAt: input.failedAt != null ? Number(input.failedAt) : Date.now(),
    lastError: String(input.lastError || ""),
    correlationId: String(input.correlationId || eventId),
    payload: input.payload != null ? Object.freeze({ ...input.payload }) : null
  });
}

function createRetryPolicy(input = {}) {
  return Object.freeze({
    maxAttempts: Number.isFinite(input.maxAttempts) ? input.maxAttempts : 3,
    intervalMs: Number.isFinite(input.intervalMs) ? input.intervalMs : 1000,
    backoffMultiplier: Number.isFinite(input.backoffMultiplier) ? input.backoffMultiplier : 2
  });
}

function createEventHistoryRecord(input = {}) {
  const eventId = String(input.eventId || "").trim();
  if (!eventId) throw new Error("eventId is required");

  return Object.freeze({
    eventId,
    payload: input.payload != null ? Object.freeze({ ...input.payload }) : null,
    createdAt: input.createdAt != null ? Number(input.createdAt) : Date.now(),
    source: String(input.source || ""),
    recipients: Object.freeze(Array.isArray(input.recipients) ? input.recipients : []),
    processingDurationMs:
      input.processingDurationMs != null ? Number(input.processingDurationMs) : null,
    result: String(input.result || "unknown"),
    correlationId: String(input.correlationId || eventId),
    readOnly: true
  });
}

function ensureCorrelationId(record = {}) {
  const existing = String(record.correlationId || record.traceId || "").trim();
  if (existing) return existing;
  const eventId = String(record.eventId || "").trim();
  return eventId || `corr-${crypto.randomUUID()}`;
}

function assertEventBusForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !EVENT_BUS_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function describeEventJourney() {
  return EVENT_JOURNEY_ORDER.join(" → ");
}

function describeMiaReferencePipeline() {
  return MIA_REFERENCE_PIPELINE.map((row) => row.node).join(" → ");
}

module.exports = {
  EVENT_BUS_COMPONENT,
  EVENT_BUS_COMPONENT_ORDER,
  EVENT_JOURNEY_STEP,
  EVENT_JOURNEY_ORDER,
  PRIORITY_QUEUE,
  PRIORITY_QUEUE_BY_PRIORITY,
  KNOWN_EVENT_TYPES,
  AUDIT_STEP,
  AUDIT_STEP_ORDER,
  SUBSCRIBER_FIELDS,
  EVENT_BUS_FORBIDDEN_ACTIVITIES,
  MIA_REFERENCE_PIPELINE,
  EVENT_BUS_RUNTIME_ANCHORS,
  isKnownEventType,
  resolvePriorityQueue,
  isEventJourneyStep,
  createSubscriberRegistration,
  createEventAuditStep,
  createDeadLetterRecord,
  createRetryPolicy,
  createEventHistoryRecord,
  ensureCorrelationId,
  assertEventBusForbiddenActivity,
  describeEventJourney,
  describeMiaReferencePipeline
};
