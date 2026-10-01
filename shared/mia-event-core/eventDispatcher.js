"use strict";

/**
 * Master Canon 0017 — Event Dispatcher: delivery, ACK/NACK, retry, idempotency.
 */

const crypto = require("crypto");
const { createRetryPolicy, createDeadLetterRecord } = require("./eventBusInfrastructure");
const { computeDistributionPlan } = require("./eventRouter");
const { dequeueForDispatcher, scheduleNextQueue, resolveOrderMode, QUEUE_ORDER_MODE } = require("./queueManager");

const DISPATCHER_COMPONENT = Object.freeze({
  DISPATCH_SCHEDULER: "dispatch_scheduler",
  DELIVERY_MANAGER: "delivery_manager",
  ACK_MANAGER: "ack_manager",
  RETRY_MANAGER: "retry_manager",
  TIMEOUT_MANAGER: "timeout_manager",
  IDEMPOTENCY_MANAGER: "idempotency_manager",
  DELIVERY_MONITOR: "delivery_monitor",
  DELIVERY_LOGGER: "delivery_logger",
  FAILURE_HANDLER: "failure_handler",
  METRICS_COLLECTOR: "metrics_collector"
});

const DISPATCHER_COMPONENT_ORDER = Object.freeze(Object.values(DISPATCHER_COMPONENT));

const DELIVERY_ACK = Object.freeze({
  ACK: "ACK",
  NACK: "NACK",
  TIMEOUT: "TIMEOUT"
});

const DELIVERY_MODE = Object.freeze({
  FIRE_AND_FORGET: "fire_and_forget",
  CONFIRMED: "confirmed",
  GUARANTEED: "guaranteed"
});

const DISPATCHER_FORBIDDEN_ACTIVITIES = Object.freeze([
  "mutate_payload",
  "change_priority",
  "change_routing",
  "create_business_events",
  "ai_decision"
]);

const DEFAULT_SUBSCRIBER_TIMEOUT_MS = Object.freeze({
  "graphics.overlay": 100,
  "ai.conversation": 20000,
  "ai.response": 20000,
  "analytics.stream": 60000,
  "analytics.telemetry": 5000,
  "memory.session": 5000,
  "economy.gift_engine": 10000,
  "game.kojnozout": 10000,
  "graphics.video_engine": 15000,
  "logging.system": 1000
});

const DEFAULT_DELIVERY_MODE_BY_SUBSCRIBER = Object.freeze({
  "logging.system": DELIVERY_MODE.FIRE_AND_FORGET,
  "analytics.telemetry": DELIVERY_MODE.FIRE_AND_FORGET,
  "ai.conversation": DELIVERY_MODE.CONFIRMED,
  "economy.gift_engine": DELIVERY_MODE.CONFIRMED,
  "game.kojnozout": DELIVERY_MODE.CONFIRMED,
  "memory.session": DELIVERY_MODE.CONFIRMED,
  "graphics.overlay": DELIVERY_MODE.CONFIRMED,
  "graphics.video_engine": DELIVERY_MODE.CONFIRMED
});

const MIA_CHAT_DISPATCH_CHAIN = Object.freeze([
  "ai.conversation",
  "graphics.overlay",
  "memory.session",
  "moderation.engine",
  "analytics.stream"
]);

const MIA_GIFT_DISPATCH_CHAIN = Object.freeze([
  "economy.gift_engine",
  "game.kojnozout",
  "graphics.video_engine",
  "graphics.overlay",
  "memory.session",
  "analytics.stream"
]);

const DISPATCHER_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-event-core/eventDispatcher.js",
  "shared/mia-event-core/eventRouter.js",
  "shared/mia-event-core/queueManager.js",
  "scripts/pipeline/run.js",
  "scripts/MIA_DELIVERY_RUNTIME.js"
]);

function createIdempotencyStore() {
  const delivered = new Set();
  return {
    key(eventId, subscriberId, correlationId) {
      return `${eventId}:${subscriberId}:${correlationId || eventId}`;
    },
    has(eventId, subscriberId, correlationId) {
      return delivered.has(this.key(eventId, subscriberId, correlationId));
    },
    mark(eventId, subscriberId, correlationId) {
      delivered.add(this.key(eventId, subscriberId, correlationId));
    },
    clear() {
      delivered.clear();
    }
  };
}

function createDeliveryLog(input = {}) {
  const eventId = String(input.eventId || "").trim();
  const subscriberId = String(input.subscriberId || "").trim();
  if (!eventId || !subscriberId) {
    throw new Error("eventId and subscriberId are required");
  }

  const sentAt = input.sentAt != null ? Number(input.sentAt) : Date.now();
  const ackAt = input.ackAt != null ? Number(input.ackAt) : null;

  return Object.freeze({
    deliveryId:
      typeof input.deliveryId === "string" && input.deliveryId.trim()
        ? input.deliveryId.trim()
        : `delivery-${crypto.randomUUID()}`,
    eventId,
    subscriberId,
    correlationId: String(input.correlationId || eventId),
    sentAt,
    ackAt,
    result: String(input.result || DELIVERY_ACK.ACK),
    durationMs: ackAt != null ? Math.max(0, ackAt - sentAt) : null,
    deliveryMode: input.deliveryMode || DELIVERY_MODE.CONFIRMED,
    readOnly: true
  });
}

function createRetryAttempt(input = {}) {
  const eventId = String(input.eventId || "").trim();
  const subscriberId = String(input.subscriberId || "").trim();
  if (!eventId || !subscriberId) throw new Error("eventId and subscriberId are required");

  const attempt = Number.isFinite(input.attempt) ? input.attempt : 1;
  const intervalMs = Number.isFinite(input.intervalMs) ? input.intervalMs : 1000;

  return Object.freeze({
    retryId:
      typeof input.retryId === "string" && input.retryId.trim()
        ? input.retryId.trim()
        : `retry-${crypto.randomUUID()}`,
    eventId,
    subscriberId,
    attempt,
    reason: String(input.reason || "delivery_failed"),
    nextAttemptAt: input.nextAttemptAt != null ? Number(input.nextAttemptAt) : Date.now() + intervalMs
  });
}

function resolveSubscriberTimeout(subscriberId = "") {
  const key = String(subscriberId || "").trim();
  if (DEFAULT_SUBSCRIBER_TIMEOUT_MS[key] != null) {
    return DEFAULT_SUBSCRIBER_TIMEOUT_MS[key];
  }
  const prefix = key.split(".")[0];
  if (prefix === "analytics") return 60000;
  if (prefix === "ai") return 20000;
  if (prefix === "graphics") return 10000;
  return 5000;
}

function resolveDeliveryMode(subscriberId = "") {
  return DEFAULT_DELIVERY_MODE_BY_SUBSCRIBER[subscriberId] || DELIVERY_MODE.CONFIRMED;
}

function evaluateAckResponse(response = {}) {
  const ack = String(response.ack || response.result || "").toUpperCase();
  if (ack === DELIVERY_ACK.ACK) return DELIVERY_ACK.ACK;
  if (ack === DELIVERY_ACK.NACK) return DELIVERY_ACK.NACK;
  if (ack === DELIVERY_ACK.TIMEOUT) return DELIVERY_ACK.TIMEOUT;
  return response.ok === false ? DELIVERY_ACK.NACK : DELIVERY_ACK.ACK;
}

async function deliverToSubscriber(event, subscriberId, options = {}) {
  const eventId = String(event.eventId || "").trim();
  const correlationId = String(event.correlationId || eventId);
  const sentAt = options.now != null ? Number(options.now) : Date.now();
  const mode = options.deliveryMode || resolveDeliveryMode(subscriberId);
  const timeoutMs = options.timeoutMs != null ? options.timeoutMs : resolveSubscriberTimeout(subscriberId);

  if (options.idempotency?.has(eventId, subscriberId, correlationId)) {
    return Object.freeze({
      skipped: true,
      subscriberId,
      ack: DELIVERY_ACK.ACK,
      log: createDeliveryLog({
        eventId,
        subscriberId,
        correlationId,
        sentAt,
        ackAt: sentAt,
        result: "idempotent_skip",
        deliveryMode: mode
      })
    });
  }

  const handler =
    typeof options.handlers?.[subscriberId] === "function"
      ? options.handlers[subscriberId]
      : options.defaultHandler;

  let ack = DELIVERY_ACK.TIMEOUT;
  let error = null;

  if (mode === DELIVERY_MODE.FIRE_AND_FORGET) {
    if (typeof handler === "function") {
      try {
        await handler(event, { subscriberId, mode });
      } catch (err) {
        error = err;
      }
    }
    ack = error ? DELIVERY_ACK.NACK : DELIVERY_ACK.ACK;
  } else if (typeof handler === "function") {
    try {
      const result = await Promise.race([
        Promise.resolve(handler(event, { subscriberId, mode })),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("delivery_timeout")), timeoutMs);
        })
      ]);
      ack = evaluateAckResponse(result || {});
    } catch (err) {
      error = err;
      ack = err?.message === "delivery_timeout" ? DELIVERY_ACK.TIMEOUT : DELIVERY_ACK.NACK;
    }
  } else {
    ack = DELIVERY_ACK.ACK;
  }

  const ackAt = Date.now();
  if (ack === DELIVERY_ACK.ACK && options.idempotency) {
    options.idempotency.mark(eventId, subscriberId, correlationId);
  }

  const log = createDeliveryLog({
    eventId,
    subscriberId,
    correlationId,
    sentAt,
    ackAt,
    result: ack,
    deliveryMode: mode
  });

  return Object.freeze({
    skipped: false,
    subscriberId,
    ack,
    error: error ? String(error.message || error) : null,
    log
  });
}

function handleDeliveryFailure(event, subscriberId, deliveryResult, options = {}) {
  const policy = options.retryPolicy || createRetryPolicy();
  const attempt = Number(deliveryResult?.attempt || 1);

  if (attempt < policy.maxAttempts) {
    const interval = policy.intervalMs * policy.backoffMultiplier ** (attempt - 1);
    const retry = createRetryAttempt({
      eventId: event.eventId,
      subscriberId,
      attempt: attempt + 1,
      reason: deliveryResult?.ack || "delivery_failed",
      intervalMs: interval,
      nextAttemptAt: (options.now != null ? Number(options.now) : Date.now()) + interval
    });
    return Object.freeze({ action: "retry", retry });
  }

  const deadLetter = createDeadLetterRecord({
    eventId: event.eventId,
    reason: `subscriber_failed:${subscriberId}`,
    attemptCount: attempt,
    lastError: deliveryResult?.error || deliveryResult?.ack || "delivery_failed",
    correlationId: event.correlationId || event.eventId,
    payload: event.payload
  });

  return Object.freeze({
    action: "dead_letter",
    error: Object.freeze({
      code: "delivery_failed",
      subscriberId,
      ack: deliveryResult?.ack
    }),
    deadLetter
  });
}

async function dispatchEvent(event = {}, options = {}) {
  const planResult =
    options.distributionPlan ||
    computeDistributionPlan(event, {
      cache: options.routeCache,
      rules: options.routeRules,
      useCache: options.useCache
    });

  if (!planResult.ok) {
    return Object.freeze({ ok: false, error: planResult.error });
  }

  const plan = planResult.plan;
  const recipients = Object.freeze([...(plan.recipients || [])]);
  const idempotency = options.idempotency || createIdempotencyStore();
  const strictOrder = resolveOrderMode(event) === QUEUE_ORDER_MODE.STRICT;
  const logs = [];
  const deliveries = [];
  const failures = [];
  const retries = [];

  const deliverOne = async (subscriberId) => {
    const result = await deliverToSubscriber(event, subscriberId, {
      ...options,
      idempotency
    });
    logs.push(result.log);
    deliveries.push(result);
    if (result.ack !== DELIVERY_ACK.ACK && !result.skipped) {
      const failure = handleDeliveryFailure(event, subscriberId, result, options);
      if (failure.action === "retry") retries.push(failure.retry);
      else failures.push(failure);
    }
    return result;
  };

  if (strictOrder) {
    for (const subscriberId of recipients) {
      await deliverOne(subscriberId);
    }
  } else {
    const results = await Promise.all(recipients.map((subscriberId) => deliverOne(subscriberId)));
    for (const result of results) {
      if (result.ack !== DELIVERY_ACK.ACK && !result.skipped) {
        // already recorded in deliverOne via closures - actually in parallel branch deliverOne already pushes
      }
    }
  }

  const metrics = createDeliveryMetricsSnapshot(deliveries, { logs, failures, retries });

  return Object.freeze({
    ok: true,
    eventId: event.eventId,
    plan,
    deliveries: Object.freeze(deliveries),
    logs: Object.freeze(logs),
    failures: Object.freeze(failures),
    retries: Object.freeze(retries),
    metrics,
    partialFailure: failures.length > 0 || retries.length > 0
  });
}

function createDispatchSchedulerState(input = {}) {
  return {
    queueScheduler: input.queueScheduler || null,
    lastQueueId: input.lastQueueId || null
  };
}

function pickNextDispatchItem(queueRegistry, queueStorage, schedulerState = {}) {
  const queueId = scheduleNextQueue(schedulerState.queueScheduler || {}, queueStorage);
  if (!queueId) return Object.freeze({ ok: false, item: null, queueId: null });

  const dequeued = dequeueForDispatcher(queueRegistry, queueStorage, queueId);
  schedulerState.lastQueueId = queueId;
  return Object.freeze({
    ok: dequeued.ok,
    item: dequeued.item,
    queueId,
    audit: dequeued.audit || null
  });
}

function createDeliveryMetricsSnapshot(deliveries = [], options = {}) {
  const total = deliveries.length;
  const success = deliveries.filter((d) => d.ack === DELIVERY_ACK.ACK || d.skipped).length;
  const timeouts = deliveries.filter((d) => d.ack === DELIVERY_ACK.TIMEOUT).length;
  const nacks = deliveries.filter((d) => d.ack === DELIVERY_ACK.NACK).length;
  const durations = deliveries
    .map((d) => d.log?.durationMs)
    .filter((v) => Number.isFinite(v));

  const averageDurationMs =
    durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  const slowest = deliveries
    .filter((d) => Number.isFinite(d.log?.durationMs))
    .sort((a, b) => (b.log.durationMs || 0) - (a.log.durationMs || 0))[0];

  return Object.freeze({
    capturedAt: options.now != null ? Number(options.now) : Date.now(),
    deliveryCount: total,
    successCount: success,
    failureCount: total - success,
    timeoutCount: timeouts,
    nackCount: nacks,
    averageDurationMs,
    slowestSubscriber: slowest?.subscriberId || null,
    retryCount: (options.retries || []).length,
    deadLetterCount: (options.failures || []).filter((f) => f.action === "dead_letter").length
  });
}

function createDeliveryMonitorSnapshot(metrics) {
  return Object.freeze({
    capturedAt: metrics?.capturedAt || Date.now(),
    deliveryCount: metrics?.deliveryCount || 0,
    successRate:
      metrics?.deliveryCount > 0
        ? metrics.successCount / metrics.deliveryCount
        : 1,
    timeoutCount: metrics?.timeoutCount || 0,
    averageDurationMs: metrics?.averageDurationMs || 0,
    slowestSubscriber: metrics?.slowestSubscriber || null,
    errorRate:
      metrics?.deliveryCount > 0
        ? metrics.failureCount / metrics.deliveryCount
        : 0
  });
}

function assertDispatcherForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !DISPATCHER_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function describeMiaChatDispatchChain() {
  return MIA_CHAT_DISPATCH_CHAIN.join(" → ");
}

function describeMiaGiftDispatchChain() {
  return MIA_GIFT_DISPATCH_CHAIN.join(" → ");
}

module.exports = {
  DISPATCHER_COMPONENT,
  DISPATCHER_COMPONENT_ORDER,
  DELIVERY_ACK,
  DELIVERY_MODE,
  DISPATCHER_FORBIDDEN_ACTIVITIES,
  DEFAULT_SUBSCRIBER_TIMEOUT_MS,
  DEFAULT_DELIVERY_MODE_BY_SUBSCRIBER,
  MIA_CHAT_DISPATCH_CHAIN,
  MIA_GIFT_DISPATCH_CHAIN,
  DISPATCHER_RUNTIME_ANCHORS,
  createIdempotencyStore,
  createDeliveryLog,
  createRetryAttempt,
  resolveSubscriberTimeout,
  resolveDeliveryMode,
  evaluateAckResponse,
  deliverToSubscriber,
  handleDeliveryFailure,
  dispatchEvent,
  createDispatchSchedulerState,
  pickNextDispatchItem,
  createDeliveryMetricsSnapshot,
  createDeliveryMonitorSnapshot,
  assertDispatcherForbiddenActivity,
  describeMiaChatDispatchChain,
  describeMiaGiftDispatchChain
};
