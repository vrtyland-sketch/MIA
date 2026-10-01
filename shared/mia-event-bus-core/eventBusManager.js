"use strict";

/**
 * Master Canon 0076 — Event Bus Manager.
 * Kernel Layer 0 sole central authority for in-process event distribution.
 * EBM only delivers — no business decisions, no rewrite, no system state memory.
 * Distinct from Event Store (0075) and legacy mia-event-core (0010–0017).
 */

const crypto = require("crypto");

const EBM_COMPONENT = Object.freeze({
  EVENT_BUS_MANAGER: "event_bus_manager",
  PUBLISH_GATE: "publish_gate",
  SUBSCRIBE_REGISTRY: "subscribe_registry",
  TOPIC_ROUTER: "topic_router",
  PRIORITY_QUEUE: "priority_queue",
  DELIVERY_ENGINE: "delivery_engine",
  ORDERING_CONTROLLER: "ordering_controller",
  RETRY_CONTROLLER: "retry_controller",
  DEAD_LETTER_QUEUE: "dead_letter_queue",
  SECURITY_GATE: "security_gate",
  DELIVERY_AUDIT: "delivery_audit",
  METRICS_AUDIT: "metrics_audit"
});

const EBM_COMPONENT_ORDER = Object.freeze(Object.values(EBM_COMPONENT));

const EBM_DESCRIPTOR_FIELDS = Object.freeze([
  "eventId",
  "eventType",
  "timestamp",
  "publisher",
  "correlationId",
  "payload",
  "priority",
  "version"
]);

const EBM_PRIORITY = Object.freeze({
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  CRITICAL: "critical"
});

/** Ascending rank; higher priority delivered first when queued. */
const EBM_PRIORITY_ORDER = Object.freeze([
  EBM_PRIORITY.LOW,
  EBM_PRIORITY.NORMAL,
  EBM_PRIORITY.HIGH,
  EBM_PRIORITY.CRITICAL
]);

const EBM_PRIORITY_RANK = Object.freeze({
  [EBM_PRIORITY.LOW]: 0,
  [EBM_PRIORITY.NORMAL]: 1,
  [EBM_PRIORITY.HIGH]: 2,
  [EBM_PRIORITY.CRITICAL]: 3
});

const EBM_DELIVERY_POLICY = Object.freeze({
  BROADCAST: "broadcast",
  TARGETED: "targeted",
  FILTERED: "filtered"
});

const EBM_AUTHORIZED_SOURCES = Object.freeze([
  "kernel",
  "operator",
  "admin",
  "system",
  "runtime",
  "runtime_manager",
  "runtime-manager",
  "scheduler",
  "task_scheduler",
  "service_manager",
  "service-manager",
  "event_bus",
  "event-bus",
  "event_bus_manager",
  "event-bus-manager",
  "event_store",
  "event-store",
  "ai_engine",
  "battle_engine",
  "gift_engine",
  "chat_engine",
  "obs_connector",
  "tiktok_connector",
  "kick_connector",
  "security",
  "monitoring"
]);

const EBM_FLAGS = Object.freeze({
  soleEventBusAuthority: true,
  makesBusinessDecisions: false,
  rewritesEvents: false,
  storesSystemState: false,
  separatedFromEventStore: true,
  dlqNeverAutoDeletes: true
});

const EBM_PUBLIC_API = Object.freeze([
  "publish",
  "subscribe",
  "unsubscribe",
  "ack",
  "retry",
  "reject"
]);

const EBM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-event-bus-core/eventBusManager.js",
  "shared/mia-service-core/serviceManager.js",
  "shared/mia-scheduler-core/taskScheduler.js",
  "shared/mia-event-store-core/eventStoreManager.js",
  "docs/master-canon/0076-event-bus-manager.md"
]);

let activeEventBusManager = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function normalizePriority(value) {
  const raw = String(value || EBM_PRIORITY.NORMAL)
    .trim()
    .toLowerCase();
  if (Object.prototype.hasOwnProperty.call(EBM_PRIORITY_RANK, raw)) return raw;
  return null;
}

function topicMatches(pattern, topic) {
  const p = String(pattern || "").trim();
  const t = String(topic || "").trim();
  if (!p || !t) return false;
  if (p === "*") return true;
  if (p === t) return true;
  if (p.endsWith(".*")) {
    const prefix = p.slice(0, -1); // keep trailing '.'
    return t.startsWith(prefix) || t === p.slice(0, -2);
  }
  if (p.endsWith("*")) {
    const prefix = p.slice(0, -1);
    return t.startsWith(prefix);
  }
  return false;
}

function matchesFilter(filter, event) {
  if (filter == null) return true;
  if (typeof filter === "function") {
    try {
      return filter(event) === true;
    } catch (_err) {
      return false;
    }
  }
  if (typeof filter === "object" && !Array.isArray(filter)) {
    for (const [key, expected] of Object.entries(filter)) {
      if (key === "eventType" || key === "topic") {
        const actual = event.eventType || event.topic;
        if (actual !== expected) return false;
        continue;
      }
      if (key === "publisher") {
        if (event.publisher !== expected) return false;
        continue;
      }
      if (key === "priority") {
        if (event.priority !== expected) return false;
        continue;
      }
      const payload = event.payload || {};
      if (payload[key] !== expected) return false;
    }
    return true;
  }
  return false;
}

function createBusEventDescriptor(input = {}) {
  const eventType = String(input.eventType || input.topic || "").trim();
  if (!eventType) return { ok: false, error: "missing_eventType" };

  const publisher = String(input.publisher || "").trim();
  if (!publisher) return { ok: false, error: "missing_publisher" };

  const priority = normalizePriority(input.priority);
  if (!priority) return { ok: false, error: "invalid_priority" };

  const timestamp =
    typeof input.timestamp === "number" && Number.isFinite(input.timestamp)
      ? input.timestamp
      : Date.now();

  const correlationId =
    input.correlationId != null && String(input.correlationId).trim()
      ? String(input.correlationId).trim()
      : makeId("corr");

  const eventId =
    input.eventId != null && String(input.eventId).trim()
      ? String(input.eventId).trim()
      : makeId("bus");

  const version =
    input.version != null && String(input.version).trim()
      ? String(input.version).trim()
      : "1.0.0";

  const payloadRaw =
    input.payload != null && typeof input.payload === "object"
      ? { ...input.payload }
      : {};

  const descriptor = {
    eventId,
    eventType,
    timestamp,
    publisher,
    correlationId,
    payload: Object.freeze(payloadRaw),
    priority,
    version
  };

  if (input.topic != null && String(input.topic).trim()) {
    descriptor.topic = String(input.topic).trim();
  }

  return {
    ok: true,
    descriptor: Object.freeze(descriptor)
  };
}

function createEventBusManager(options = {}) {
  if (
    activeEventBusManager &&
    activeEventBusManager.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "event_bus_manager_already_active",
      soleEventBusAuthority: true
    });
  }

  const authorized = new Set(
    options.authorizedSources || EBM_AUTHORIZED_SOURCES
  );
  const maxAttempts =
    options.maxAttempts != null && Number.isFinite(Number(options.maxAttempts))
      ? Math.max(1, Number(options.maxAttempts))
      : 3;
  const autoDeliver = options.autoDeliver !== false;

  const subscribers = new Map();
  const publisherSequences = new Map();
  const eventIndex = new Map();
  const knownEventIds = new Set();
  const publishersSeen = new Set();
  const queue = [];
  const deadLetters = [];
  const deliveryAuditLog = [];
  const pendingAcks = new Map();

  let eventCount = 0;
  let retryCount = 0;
  let latencySumMs = 0;
  let latencySamples = 0;
  let queueSeq = 0;
  let active = true;

  function isAuthorized(meta = {}) {
    return (
      meta.authorized === true ||
      authorized.has(meta.source || "") ||
      authorized.has(meta.actor || "") ||
      authorized.has(meta.publisher || "") ||
      authorized.has(meta.subscriberId || "")
    );
  }

  function isSourceVerified(meta = {}) {
    if (meta.forged === true) return false;
    if (meta.sourceVerified === false) return false;
    if (meta.sourceVerified === true) return true;
    return isAuthorized(meta);
  }

  function gate(meta, operation, { requireAuth = true } = {}) {
    if (requireAuth && !isAuthorized(meta)) {
      return Object.freeze({ ok: false, error: "unauthorized_event_bus" });
    }
    if (!isSourceVerified(meta)) {
      return Object.freeze({ ok: false, error: "forged_event_bus_blocked" });
    }
    return null;
  }

  function recordAudit(entry) {
    deliveryAuditLog.push(
      Object.freeze({
        eventId: entry.eventId,
        publisher: entry.publisher,
        subscriber: entry.subscriber,
        publishTime: entry.publishTime,
        deliverTime: entry.deliverTime,
        retries: entry.retries != null ? entry.retries : 0,
        result: entry.result || "unknown"
      })
    );
  }

  function resolveTopic(event) {
    if (event.topic != null && String(event.topic).trim()) {
      return String(event.topic).trim();
    }
    return String(event.eventType || "").trim();
  }

  function findMatchingSubscribers(event, policy, meta) {
    const topic = resolveTopic(event);
    const matches = [];

    for (const sub of subscribers.values()) {
      if (!topicMatches(sub.topicPattern, topic)) continue;

      if (policy === EBM_DELIVERY_POLICY.TARGETED) {
        const targetId =
          (meta && meta.subscriberId) ||
          (meta && meta.targetSubscriberId) ||
          event.targetSubscriberId;
        if (!targetId || sub.subscriberId !== String(targetId)) continue;
      }

      if (
        policy === EBM_DELIVERY_POLICY.FILTERED ||
        sub.filter != null ||
        (meta && meta.filter != null)
      ) {
        const filter = (meta && meta.filter) || sub.filter;
        if (!matchesFilter(filter, event)) continue;
      }

      matches.push(sub);
    }

    return matches;
  }

  function enqueueDelivery(job) {
    queue.push(job);
    queue.sort((a, b) => {
      if (a.publisher === b.publisher) {
        return a.publisherSeq - b.publisherSeq;
      }
      const pr =
        EBM_PRIORITY_RANK[b.event.priority] - EBM_PRIORITY_RANK[a.event.priority];
      if (pr !== 0) return pr;
      return a.queueSeq - b.queueSeq;
    });
  }

  function deliverToSubscriber(job, sub) {
    const deliverTime = Date.now();
    const attempts = job.attempts || 0;
    let handlerResult;
    let error = null;

    try {
      handlerResult = sub.handler(job.event, {
        subscriberId: sub.subscriberId,
        attempt: attempts + 1,
        ack: () => ack(job.event.eventId, { subscriberId: sub.subscriberId }),
        reject: (reason) =>
          reject(job.event.eventId, reason, { subscriberId: sub.subscriberId })
      });
    } catch (err) {
      error = err;
      handlerResult = { ok: false, error: err && err.message ? err.message : "handler_threw" };
    }

    const rejectedExplicitly =
      handlerResult &&
      typeof handlerResult === "object" &&
      (handlerResult.ok === false || handlerResult.reject === true);

    const failed = error != null || rejectedExplicitly === true;

    if (!failed) {
      latencySumMs += Math.max(0, deliverTime - job.publishTime);
      latencySamples += 1;
      recordAudit({
        eventId: job.event.eventId,
        publisher: job.event.publisher,
        subscriber: sub.subscriberId,
        publishTime: job.publishTime,
        deliverTime,
        retries: Math.max(0, attempts),
        result: "delivered"
      });
      pendingAcks.set(`${job.event.eventId}::${sub.subscriberId}`, {
        eventId: job.event.eventId,
        subscriberId: sub.subscriberId,
        status: "delivered"
      });
      return { ok: true, delivered: true };
    }

    const nextAttempts = attempts + 1;
    const reason =
      (handlerResult && handlerResult.error) ||
      (error && error.message) ||
      "delivery_failed";

    if (nextAttempts < maxAttempts) {
      retryCount += 1;
      recordAudit({
        eventId: job.event.eventId,
        publisher: job.event.publisher,
        subscriber: sub.subscriberId,
        publishTime: job.publishTime,
        deliverTime,
        retries: nextAttempts,
        result: "retry"
      });
      enqueueDelivery({
        ...job,
        attempts: nextAttempts,
        lastFailureReason: reason,
        targetSubscriberId: sub.subscriberId,
        queueSeq: ++queueSeq
      });
      return { ok: false, retry: true, attempts: nextAttempts };
    }

    deadLetters.push(
      Object.freeze({
        originalEvent: job.event,
        failureReason: reason,
        attempts: nextAttempts,
        timestamp: deliverTime,
        subscriberId: sub.subscriberId,
        neverAutoDeletes: true
      })
    );
    recordAudit({
      eventId: job.event.eventId,
      publisher: job.event.publisher,
      subscriber: sub.subscriberId,
      publishTime: job.publishTime,
      deliverTime,
      retries: nextAttempts,
      result: "dead_letter"
    });
    return { ok: false, deadLetter: true, attempts: nextAttempts };
  }

  function processOneJob(job) {
    const policy = job.policy || EBM_DELIVERY_POLICY.BROADCAST;
    let targets;

    if (job.targetSubscriberId) {
      const sub = subscribers.get(job.targetSubscriberId);
      targets = sub ? [sub] : [];
    } else {
      targets = findMatchingSubscribers(job.event, policy, job.meta || {});
    }

    const results = [];
    for (const sub of targets) {
      results.push(deliverToSubscriber(job, sub));
    }
    return Object.freeze({
      ok: true,
      eventId: job.event.eventId,
      deliveredTo: targets.map((s) => s.subscriberId),
      results: Object.freeze(results)
    });
  }

  function processQueue(limit) {
    const max =
      limit != null && Number.isFinite(Number(limit))
        ? Math.max(0, Number(limit))
        : queue.length;
    const processed = [];
    let n = 0;
    while (n < max && queue.length > 0) {
      const job = queue.shift();
      processed.push(processOneJob(job));
      n += 1;
    }
    return Object.freeze({
      ok: true,
      processed: processed.length,
      remaining: queue.length,
      results: Object.freeze(processed)
    });
  }

  function deliverNow(eventId) {
    const id = String(eventId || "").trim();
    const idx = queue.findIndex((j) => j.event.eventId === id);
    if (idx < 0) {
      return Object.freeze({ ok: false, error: "event_not_in_queue", eventId: id });
    }
    const [job] = queue.splice(idx, 1);
    return processOneJob(job);
  }

  function publish(input = {}, meta = {}) {
    const authMeta = {
      ...meta,
      publisher: meta.publisher || input.publisher,
      source: meta.source || input.publisher || meta.publisher
    };
    const blocked = gate(authMeta, "publish");
    if (blocked) return blocked;

    if (meta.writeToEventStore === true || input.writeToEventStore === true) {
      return Object.freeze({
        ok: false,
        error: "write_to_event_store_rejected",
        separatedFromEventStore: true
      });
    }

    const desc = createBusEventDescriptor({
      ...input,
      publisher: input.publisher || meta.publisher || meta.source,
      timestamp:
        typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
          ? meta.nowMs
          : input.timestamp
    });
    if (!desc.ok) return Object.freeze(desc);

    const d = desc.descriptor;
    if (knownEventIds.has(d.eventId)) {
      return Object.freeze({
        ok: false,
        error: "duplicate_eventId",
        eventId: d.eventId
      });
    }

    // Per-publisher monotonic ordering — reject reorder
    const prevSeq = publisherSequences.get(d.publisher) || 0;
    let publisherSeq;
    if (meta.publisherSequence != null || input.publisherSequence != null) {
      const requested = Number(
        meta.publisherSequence != null
          ? meta.publisherSequence
          : input.publisherSequence
      );
      if (!Number.isFinite(requested) || requested !== prevSeq + 1) {
        return Object.freeze({
          ok: false,
          error: "publisher_reorder_rejected",
          publisher: d.publisher,
          expectedSequence: prevSeq + 1,
          requestedSequence: requested
        });
      }
      publisherSeq = requested;
    } else {
      publisherSeq = prevSeq + 1;
    }
    publisherSequences.set(d.publisher, publisherSeq);
    publishersSeen.add(d.publisher);
    knownEventIds.add(d.eventId);
    eventCount += 1;

    const event = Object.freeze({
      ...d,
      publisherSequence: publisherSeq
    });

    const policyRaw = String(
      meta.deliveryPolicy || input.deliveryPolicy || EBM_DELIVERY_POLICY.BROADCAST
    )
      .trim()
      .toLowerCase();
    const policy = Object.values(EBM_DELIVERY_POLICY).includes(policyRaw)
      ? policyRaw
      : EBM_DELIVERY_POLICY.BROADCAST;

    const job = {
      event,
      publishTime: d.timestamp,
      publisher: d.publisher,
      publisherSeq,
      policy,
      meta: authMeta,
      attempts: 0,
      queueSeq: ++queueSeq,
      targetSubscriberId:
        policy === EBM_DELIVERY_POLICY.TARGETED
          ? String(meta.subscriberId || meta.targetSubscriberId || input.subscriberId || "")
          : null
    };

    eventIndex.set(d.eventId, {
      event,
      publishTime: d.timestamp,
      publisherSeq,
      policy,
      meta: authMeta
    });

    enqueueDelivery(job);

    let delivery = null;
    if (autoDeliver || meta.deliverNow === true || input.deliverNow === true) {
      delivery = deliverNow(d.eventId);
    }

    return Object.freeze({
      ok: true,
      eventId: d.eventId,
      event,
      publisherSequence: publisherSeq,
      policy,
      queued: delivery == null,
      delivery,
      separatedFromEventStore: true,
      makesBusinessDecisions: false,
      rewritesEvents: false
    });
  }

  function subscribe(subscriberId, topicPattern, handlerOrMeta, options = {}) {
    let handler = handlerOrMeta;
    let meta = options;
    if (
      handlerOrMeta &&
      typeof handlerOrMeta === "object" &&
      typeof handlerOrMeta.handler === "function"
    ) {
      handler = handlerOrMeta.handler;
      meta = { ...handlerOrMeta, ...options };
    } else if (typeof handlerOrMeta !== "function") {
      return Object.freeze({ ok: false, error: "missing_handler" });
    }

    const id = String(subscriberId || "").trim();
    if (!id) return Object.freeze({ ok: false, error: "missing_subscriberId" });

    const pattern = String(topicPattern || "").trim();
    if (!pattern) return Object.freeze({ ok: false, error: "missing_topicPattern" });

    const authMeta = {
      ...meta,
      subscriberId: id,
      source: meta.source || id,
      authorized: meta.authorized
    };
    const blocked = gate(authMeta, "subscribe");
    if (blocked) return blocked;

    if (subscribers.has(id)) {
      return Object.freeze({
        ok: false,
        error: "subscriber_already_registered",
        subscriberId: id
      });
    }

    const entry = Object.freeze({
      subscriberId: id,
      topicPattern: pattern,
      handler,
      filter: meta.filter != null ? meta.filter : options.filter,
      authorized: true
    });
    subscribers.set(id, entry);

    return Object.freeze({
      ok: true,
      subscriberId: id,
      topicPattern: pattern
    });
  }

  function unsubscribe(subscriberId, meta = {}) {
    const id = String(subscriberId || "").trim();
    const authMeta = {
      ...meta,
      subscriberId: id,
      source: meta.source || id
    };
    const blocked = gate(authMeta, "unsubscribe");
    if (blocked) return blocked;

    if (!subscribers.has(id)) {
      return Object.freeze({ ok: false, error: "subscriber_not_found", subscriberId: id });
    }
    subscribers.delete(id);
    return Object.freeze({ ok: true, subscriberId: id, unsubscribed: true });
  }

  function ack(eventId, meta = {}) {
    const blocked = gate(meta, "ack");
    if (blocked) return blocked;
    const id = String(eventId || "").trim();
    const key =
      meta.subscriberId != null
        ? `${id}::${meta.subscriberId}`
        : id;
    const existing = pendingAcks.get(key) || pendingAcks.get(id);
    pendingAcks.set(key, {
      eventId: id,
      subscriberId: meta.subscriberId || (existing && existing.subscriberId) || null,
      status: "acked",
      time: meta.nowMs != null ? meta.nowMs : Date.now()
    });
    recordAudit({
      eventId: id,
      publisher: (eventIndex.get(id) && eventIndex.get(id).event.publisher) || null,
      subscriber: meta.subscriberId || null,
      publishTime:
        (eventIndex.get(id) && eventIndex.get(id).publishTime) || null,
      deliverTime: Date.now(),
      retries: 0,
      result: "acked"
    });
    return Object.freeze({ ok: true, eventId: id, acked: true });
  }

  function retry(eventId, meta = {}) {
    const blocked = gate(meta, "retry");
    if (blocked) return blocked;
    const id = String(eventId || "").trim();
    const indexed = eventIndex.get(id);
    if (!indexed) {
      return Object.freeze({ ok: false, error: "event_not_found", eventId: id });
    }

    retryCount += 1;
    const job = {
      event: indexed.event,
      publishTime: indexed.publishTime,
      publisher: indexed.event.publisher,
      publisherSeq: indexed.publisherSeq,
      policy: indexed.policy,
      meta: { ...indexed.meta, ...meta },
      attempts: 0,
      queueSeq: ++queueSeq,
      targetSubscriberId: meta.subscriberId || null
    };
    enqueueDelivery(job);

    let delivery = null;
    if (autoDeliver || meta.deliverNow === true) {
      delivery = deliverNow(id);
    }

    return Object.freeze({
      ok: true,
      eventId: id,
      retried: true,
      delivery
    });
  }

  function reject(eventId, reason, meta = {}) {
    const blocked = gate(meta, "reject");
    if (blocked) return blocked;
    const id = String(eventId || "").trim();
    const indexed = eventIndex.get(id);
    if (!indexed) {
      return Object.freeze({ ok: false, error: "event_not_found", eventId: id });
    }

    const failureReason = String(reason || "rejected").trim() || "rejected";
    deadLetters.push(
      Object.freeze({
        originalEvent: indexed.event,
        failureReason,
        attempts: meta.attempts != null ? Number(meta.attempts) : 1,
        timestamp: meta.nowMs != null ? meta.nowMs : Date.now(),
        subscriberId: meta.subscriberId || null,
        neverAutoDeletes: true
      })
    );
    recordAudit({
      eventId: id,
      publisher: indexed.event.publisher,
      subscriber: meta.subscriberId || null,
      publishTime: indexed.publishTime,
      deliverTime: Date.now(),
      retries: 0,
      result: "rejected"
    });
    return Object.freeze({
      ok: true,
      eventId: id,
      rejected: true,
      deadLetter: true,
      failureReason
    });
  }

  function getDeadLetters() {
    return Object.freeze([...deadLetters]);
  }

  function metrics() {
    return Object.freeze({
      eventCount,
      publisherCount: publishersSeen.size,
      subscriberCount: subscribers.size,
      retryCount,
      dlqCount: deadLetters.length,
      averageLatencyMs:
        latencySamples > 0 ? latencySumMs / latencySamples : 0,
      queueDepth: queue.length,
      soleEventBusAuthority: true,
      separatedFromEventStore: true,
      dlqNeverAutoDeletes: true,
      makesBusinessDecisions: false,
      rewritesEvents: false,
      storesSystemState: false
    });
  }

  function deliveryAudit() {
    return Object.freeze([...deliveryAuditLog]);
  }

  function status() {
    return Object.freeze({
      ok: true,
      singleton: true,
      soleEventBusAuthority: true,
      makesBusinessDecisions: false,
      rewritesEvents: false,
      storesSystemState: false,
      separatedFromEventStore: true,
      dlqNeverAutoDeletes: true,
      components: EBM_COMPONENT_ORDER,
      eventCount,
      subscriberCount: subscribers.size,
      publisherCount: publishersSeen.size,
      queueDepth: queue.length,
      dlqCount: deadLetters.length,
      maxAttempts
    });
  }

  function blockDlqMutation(op) {
    return Object.freeze({
      ok: false,
      error: "dlq_never_auto_deletes",
      blocked: true,
      operation: op,
      dlqNeverAutoDeletes: true
    });
  }

  const manager = Object.freeze({
    ok: true,
    publish,
    subscribe,
    unsubscribe,
    ack,
    retry,
    reject,
    processQueue,
    deliverNow,
    getDeadLetters,
    metrics,
    deliveryAudit,
    status,
    isActive() {
      return active === true;
    },
    purgeDeadLetters() {
      return blockDlqMutation("purgeDeadLetters");
    },
    deleteDeadLetter() {
      return blockDlqMutation("deleteDeadLetter");
    },
    clearDlq() {
      return blockDlqMutation("clearDlq");
    },
    rewriteEvent() {
      return Object.freeze({
        ok: false,
        error: "rewrites_events_forbidden",
        rewritesEvents: false
      });
    }
  });

  activeEventBusManager = {
    isActive: manager.isActive
  };

  return manager;
}

function clearEventBusSingletonForTest() {
  activeEventBusManager = null;
}

module.exports = {
  EBM_COMPONENT,
  EBM_COMPONENT_ORDER,
  EBM_DESCRIPTOR_FIELDS,
  EBM_PRIORITY,
  EBM_PRIORITY_ORDER,
  EBM_PRIORITY_RANK,
  EBM_DELIVERY_POLICY,
  EBM_AUTHORIZED_SOURCES,
  EBM_FLAGS,
  EBM_PUBLIC_API,
  EBM_RUNTIME_ANCHORS,
  topicMatches,
  createBusEventDescriptor,
  createEventBusManager,
  clearEventBusSingletonForTest,
  separatedFromEventStore: true,
  soleEventBusAuthority: true,
  dlqNeverAutoDeletes: true
};
