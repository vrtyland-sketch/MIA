"use strict";

/**
 * Master Canon 0015 — Priority Manager: assignment, queues, fair scheduling, overflow.
 */

const crypto = require("crypto");
const { EVENT_PRIORITY, compareEventPriority, isEventPriority } = require("./eventPriority");
const { PRIORITY_QUEUE, PRIORITY_QUEUE_BY_PRIORITY } = require("./eventBusInfrastructure");
const { resolveCanonicalEventName } = require("./eventRegistry");

const PRIORITY_MANAGER_COMPONENT = Object.freeze({
  PRIORITY_RESOLVER: "priority_resolver",
  QUEUE_SELECTOR: "queue_selector",
  FAIR_SCHEDULER: "fair_scheduler",
  STARVATION_PROTECTION: "starvation_protection",
  LOAD_BALANCER: "load_balancer",
  DYNAMIC_PRIORITY_ENGINE: "dynamic_priority_engine",
  OVERFLOW_MANAGER: "overflow_manager",
  METRICS_COLLECTOR: "metrics_collector",
  AUDIT_LOGGER: "audit_logger"
});

const PRIORITY_MANAGER_COMPONENT_ORDER = Object.freeze(
  Object.values(PRIORITY_MANAGER_COMPONENT)
);

const PRIORITY_LEVEL = Object.freeze({
  P0: "P0",
  P1: "P1",
  P2: "P2",
  P3: "P3",
  P4: "P4"
});

const PRIORITY_LEVEL_BY_EVENT_PRIORITY = Object.freeze({
  [EVENT_PRIORITY.CRITICAL]: PRIORITY_LEVEL.P0,
  [EVENT_PRIORITY.HIGH]: PRIORITY_LEVEL.P1,
  [EVENT_PRIORITY.NORMAL]: PRIORITY_LEVEL.P2,
  [EVENT_PRIORITY.LOW]: PRIORITY_LEVEL.P3,
  [EVENT_PRIORITY.BACKGROUND]: PRIORITY_LEVEL.P4
});

const EVENT_PRIORITY_BY_LEVEL = Object.freeze({
  [PRIORITY_LEVEL.P0]: EVENT_PRIORITY.CRITICAL,
  [PRIORITY_LEVEL.P1]: EVENT_PRIORITY.HIGH,
  [PRIORITY_LEVEL.P2]: EVENT_PRIORITY.NORMAL,
  [PRIORITY_LEVEL.P3]: EVENT_PRIORITY.LOW,
  [PRIORITY_LEVEL.P4]: EVENT_PRIORITY.BACKGROUND
});

/** Recommended assignment (0015 §6). */
const DEFAULT_EVENT_PRIORITY_BY_TYPE = Object.freeze({
  EVENT_RUNTIME_FAILED: EVENT_PRIORITY.CRITICAL,
  EVENT_SYSTEM_STOPPED: EVENT_PRIORITY.CRITICAL,
  EVENT_GIFT_RECEIVED: EVENT_PRIORITY.HIGH,
  EVENT_AI_RESPONSE: EVENT_PRIORITY.HIGH,
  EVENT_CHAT_MESSAGE: EVENT_PRIORITY.NORMAL,
  EVENT_KOJNOZROUT_FED: EVENT_PRIORITY.NORMAL,
  EVENT_POINTS_CHANGED: EVENT_PRIORITY.NORMAL,
  EVENT_FOLLOW: EVENT_PRIORITY.LOW,
  EVENT_SYSTEM_STARTED: EVENT_PRIORITY.BACKGROUND
});

const PRIORITY_FORBIDDEN_ACTIVITIES = Object.freeze([
  "mutate_payload",
  "route_events",
  "ai_decision",
  "mutate_economy",
  "persist_business_data"
]);

const DEFAULT_FAIR_SCHEDULER = Object.freeze({
  highBurstLimit: 8,
  normalSliceEvery: 8
});

const DEFAULT_STARVATION_MS = Object.freeze({
  [PRIORITY_QUEUE.LOW]: 120000,
  [PRIORITY_QUEUE.BACKGROUND]: 300000,
  [PRIORITY_QUEUE.NORMAL]: 60000
});

const DEFAULT_QUEUE_CAPACITY = Object.freeze({
  [PRIORITY_QUEUE.CRITICAL]: 1000,
  [PRIORITY_QUEUE.HIGH]: 5000,
  [PRIORITY_QUEUE.NORMAL]: 10000,
  [PRIORITY_QUEUE.LOW]: 5000,
  [PRIORITY_QUEUE.BACKGROUND]: 2000
});

const PRIORITY_MANAGER_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-event-core/priorityManager.js",
  "shared/mia-event-core/eventPriority.js",
  "scripts/MIA_INGEST_QUEUE.js",
  "scripts/MIA_INGEST_LANE.js"
]);

function boostPriority(priority) {
  const order = [
    EVENT_PRIORITY.BACKGROUND,
    EVENT_PRIORITY.LOW,
    EVENT_PRIORITY.NORMAL,
    EVENT_PRIORITY.HIGH,
    EVENT_PRIORITY.CRITICAL
  ];
  const idx = order.indexOf(priority);
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : priority;
}

function resolveDynamicGiftPriority(coins = 0) {
  const value = Number(coins);
  if (!Number.isFinite(value)) return EVENT_PRIORITY.NORMAL;
  if (value >= 5000) return EVENT_PRIORITY.HIGH;
  if (value >= 1000) return EVENT_PRIORITY.HIGH;
  if (value <= 1) return EVENT_PRIORITY.NORMAL;
  return EVENT_PRIORITY.HIGH;
}

function resolveEventPriority(event = {}, options = {}) {
  const canonical =
    resolveCanonicalEventName(event.eventType || event.canonicalEventType) ||
    String(event.eventType || "").toUpperCase();

  let priority = event.priority;
  if (!isEventPriority(priority)) {
    priority = DEFAULT_EVENT_PRIORITY_BY_TYPE[canonical] || EVENT_PRIORITY.NORMAL;
  }

  if (canonical === "EVENT_GIFT_RECEIVED" || String(event.eventType).toUpperCase() === "GIFT") {
    const coins = event.payload?.support?.coins ?? event.payload?.coins;
    priority = resolveDynamicGiftPriority(coins);
  }

  if (options.streamMode === "live" && canonical === "EVENT_CHAT_MESSAGE") {
    priority = compareEventPriority(priority, EVENT_PRIORITY.NORMAL) >= 0 ? priority : EVENT_PRIORITY.NORMAL;
  }

  if (options.adminPriorityOverride && isEventPriority(options.adminPriorityOverride)) {
    priority = options.adminPriorityOverride;
  }

  return priority;
}

function selectQueueForPriority(priority) {
  return PRIORITY_QUEUE_BY_PRIORITY[priority] || PRIORITY_QUEUE.NORMAL;
}

function createPriorityChangeEvent(input = {}) {
  const eventId = String(input.eventId || "").trim();
  if (!eventId) throw new Error("eventId is required");

  const previous = input.previousPriority;
  const next = input.newPriority;
  if (!isEventPriority(previous) || !isEventPriority(next)) {
    throw new Error("previousPriority and newPriority must be valid");
  }

  return Object.freeze({
    priorityEventId:
      typeof input.priorityEventId === "string" && input.priorityEventId.trim()
        ? input.priorityEventId.trim()
        : `priority-${crypto.randomUUID()}`,
    eventId,
    previousPriority: previous,
    newPriority: next,
    reason: String(input.reason || ""),
    changedAt: input.changedAt != null ? Number(input.changedAt) : Date.now(),
    component: String(input.component || "priority_manager")
  });
}

function applyStarvationProtection(queueState = {}, options = {}) {
  const thresholds = options.starvationMs || DEFAULT_STARVATION_MS;
  const now = options.now != null ? Number(options.now) : Date.now();
  const changes = [];

  for (const [queueName, waitingSince] of Object.entries(queueState.waitingSince || {})) {
    const threshold = thresholds[queueName];
    if (!threshold || waitingSince == null) continue;
    const waited = now - Number(waitingSince);
    if (waited < threshold) continue;

    const basePriority = Object.entries(PRIORITY_QUEUE_BY_PRIORITY).find(
      ([, q]) => q === queueName
    )?.[0];
    if (!basePriority) continue;

    const boosted = boostPriority(basePriority);
    if (boosted === basePriority) continue;

    changes.push(
      createPriorityChangeEvent({
        eventId: queueState.eventId || "queue-starvation",
        previousPriority: basePriority,
        newPriority: boosted,
        reason: `starvation_protection:${queueName}`,
        component: PRIORITY_MANAGER_COMPONENT.STARVATION_PROTECTION
      })
    );
  }

  return Object.freeze({ changes });
}

function handleQueueOverflow(queueName, queueDepth, options = {}) {
  const capacity = options.capacity || DEFAULT_QUEUE_CAPACITY;
  const max = capacity[queueName] || 10000;
  const depth = Number(queueDepth) || 0;

  if (depth < max) {
    return Object.freeze({ action: "accept", overflow: false });
  }

  if (queueName === PRIORITY_QUEUE.CRITICAL) {
    return Object.freeze({ action: "accept_force", overflow: true, warning: "critical_never_rejected" });
  }

  if (queueName === PRIORITY_QUEUE.BACKGROUND || queueName === PRIORITY_QUEUE.LOW) {
    return Object.freeze({ action: "reject", overflow: true, warning: "overflow_reject_low_priority" });
  }

  return Object.freeze({ action: "defer", overflow: true, warning: "overflow_defer" });
}

function createFairSchedulerState(input = {}) {
  return {
    highProcessed: input.highProcessed || 0,
    config: { ...DEFAULT_FAIR_SCHEDULER, ...(input.config || {}) }
  };
}

function pickNextQueue(schedulerState = {}, queueDepths = {}) {
  const config = schedulerState.config || DEFAULT_FAIR_SCHEDULER;
  const critical = queueDepths[PRIORITY_QUEUE.CRITICAL] || 0;
  if (critical > 0) return PRIORITY_QUEUE.CRITICAL;

  const high = queueDepths[PRIORITY_QUEUE.HIGH] || 0;
  const normal = queueDepths[PRIORITY_QUEUE.NORMAL] || 0;

  if (high > 0) {
    if (
      schedulerState.highProcessed >= config.normalSliceEvery &&
      normal > 0
    ) {
      schedulerState.highProcessed = 0;
      return PRIORITY_QUEUE.NORMAL;
    }
    schedulerState.highProcessed += 1;
    return PRIORITY_QUEUE.HIGH;
  }

  schedulerState.highProcessed = 0;
  if (normal > 0) return PRIORITY_QUEUE.NORMAL;
  if ((queueDepths[PRIORITY_QUEUE.LOW] || 0) > 0) return PRIORITY_QUEUE.LOW;
  if ((queueDepths[PRIORITY_QUEUE.BACKGROUND] || 0) > 0) return PRIORITY_QUEUE.BACKGROUND;
  return null;
}

function assignEventPriority(event = {}, options = {}) {
  const previous = event.priority;
  const resolved = resolveEventPriority(event, options);
  const queue = selectQueueForPriority(resolved);
  const overflow = handleQueueOverflow(queue, options.queueDepth, options);

  const audit =
    previous && previous !== resolved
      ? createPriorityChangeEvent({
          eventId: event.eventId || "unknown",
          previousPriority: isEventPriority(previous) ? previous : EVENT_PRIORITY.NORMAL,
          newPriority: resolved,
          reason: options.reason || "priority_resolver",
          component: PRIORITY_MANAGER_COMPONENT.PRIORITY_RESOLVER
        })
      : null;

  return Object.freeze({
    eventId: event.eventId || null,
    priority: resolved,
    level: PRIORITY_LEVEL_BY_EVENT_PRIORITY[resolved],
    queue,
    overflow,
    audit,
    accepted: overflow.action !== "reject"
  });
}

function createPriorityMetricsSnapshot(queueDepths = {}, options = {}) {
  return Object.freeze({
    capturedAt: options.now != null ? Number(options.now) : Date.now(),
    queueDepths: Object.freeze({ ...queueDepths }),
    priorityChanges: Number(options.priorityChanges || 0),
    overflowEvents: Number(options.overflowEvents || 0),
    rejectedEvents: Number(options.rejectedEvents || 0)
  });
}

function assertPriorityForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !PRIORITY_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

module.exports = {
  PRIORITY_MANAGER_COMPONENT,
  PRIORITY_MANAGER_COMPONENT_ORDER,
  PRIORITY_LEVEL,
  PRIORITY_LEVEL_BY_EVENT_PRIORITY,
  EVENT_PRIORITY_BY_LEVEL,
  DEFAULT_EVENT_PRIORITY_BY_TYPE,
  PRIORITY_FORBIDDEN_ACTIVITIES,
  DEFAULT_FAIR_SCHEDULER,
  DEFAULT_STARVATION_MS,
  DEFAULT_QUEUE_CAPACITY,
  PRIORITY_MANAGER_RUNTIME_ANCHORS,
  boostPriority,
  resolveDynamicGiftPriority,
  resolveEventPriority,
  selectQueueForPriority,
  createPriorityChangeEvent,
  applyStarvationProtection,
  handleQueueOverflow,
  createFairSchedulerState,
  pickNextQueue,
  assignEventPriority,
  createPriorityMetricsSnapshot,
  assertPriorityForbiddenActivity
};
