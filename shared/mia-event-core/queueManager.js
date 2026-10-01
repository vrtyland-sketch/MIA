"use strict";

/**
 * Master Canon 0016 — Queue Manager: registry, storage, scheduling, recovery, metrics.
 */

const crypto = require("crypto");
const { EVENT_PRIORITY } = require("./eventPriority");
const { PRIORITY_QUEUE } = require("./eventBusInfrastructure");
const { resolveCanonicalEventName } = require("./eventRegistry");
const {
  createFairSchedulerState,
  pickNextQueue,
  handleQueueOverflow,
  DEFAULT_QUEUE_CAPACITY
} = require("./priorityManager");

const QUEUE_MANAGER_COMPONENT = Object.freeze({
  QUEUE_REGISTRY: "queue_registry",
  QUEUE_FACTORY: "queue_factory",
  QUEUE_STORAGE: "queue_storage",
  QUEUE_SCHEDULER: "queue_scheduler",
  CAPACITY_MANAGER: "capacity_manager",
  OVERFLOW_MANAGER: "overflow_manager",
  QUEUE_RECOVERY: "queue_recovery",
  QUEUE_MONITOR: "queue_monitor",
  QUEUE_METRICS: "queue_metrics",
  QUEUE_AUDIT: "queue_audit",
  DISPATCHER_CONNECTOR: "dispatcher_connector"
});

const QUEUE_MANAGER_COMPONENT_ORDER = Object.freeze(
  Object.values(QUEUE_MANAGER_COMPONENT)
);

const QUEUE_TYPE = Object.freeze({
  PRIORITY: "priority",
  FIFO: "fifo",
  SCHEDULED: "scheduled",
  RETRY: "retry",
  DEAD_LETTER: "dead_letter"
});

const QUEUE_STATE = Object.freeze({
  ACTIVE: "active",
  PAUSED: "paused",
  DRAINING: "draining",
  CLOSED: "closed"
});

const QUEUE_ORDER_MODE = Object.freeze({
  STRICT: "strict_order",
  PARALLEL: "parallel_order"
});

const QUEUE_OPERATION = Object.freeze({
  ENQUEUE: "enqueue",
  DEQUEUE: "dequeue",
  CLAIM: "claim",
  RELEASE: "release",
  RECOVER: "recover",
  OVERFLOW: "overflow",
  DROP: "drop"
});

const MIA_DOMAIN_QUEUE = Object.freeze({
  CHAT: "chat",
  GIFTS: "gifts",
  AI_REQUESTS: "ai_requests",
  AI_RESPONSES: "ai_responses",
  OVERLAY: "overlay",
  VIDEO_ENGINE: "video_engine",
  KOJNOZROUT: "kojnozout",
  INVENTORY: "inventory",
  MEMORY: "memory",
  ANALYTICS: "analytics",
  LOGGING: "logging"
});

const QUEUE_FORBIDDEN_ACTIVITIES = Object.freeze([
  "ai_decision",
  "route_events",
  "mutate_payload",
  "change_priority",
  "persist_business_data"
]);

const DEFAULT_ORDER_MODE_BY_EVENT_TYPE = Object.freeze({
  EVENT_GIFT_RECEIVED: QUEUE_ORDER_MODE.STRICT,
  EVENT_POINTS_CHANGED: QUEUE_ORDER_MODE.STRICT,
  EVENT_CHAT_MESSAGE: QUEUE_ORDER_MODE.PARALLEL,
  EVENT_AI_RESPONSE: QUEUE_ORDER_MODE.PARALLEL,
  EVENT_FOLLOW: QUEUE_ORDER_MODE.PARALLEL
});

const DEFAULT_MIA_DOMAIN_BY_EVENT_TYPE = Object.freeze({
  EVENT_CHAT_MESSAGE: MIA_DOMAIN_QUEUE.CHAT,
  EVENT_GIFT_RECEIVED: MIA_DOMAIN_QUEUE.GIFTS,
  EVENT_AI_RESPONSE: MIA_DOMAIN_QUEUE.AI_RESPONSES,
  EVENT_KOJNOZROUT_FED: MIA_DOMAIN_QUEUE.KOJNOZROUT,
  EVENT_POINTS_CHANGED: MIA_DOMAIN_QUEUE.INVENTORY,
  EVENT_FOLLOW: MIA_DOMAIN_QUEUE.ANALYTICS
});

const QUEUE_MANAGER_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-event-core/queueManager.js",
  "shared/mia-event-core/eventQueues.js",
  "scripts/MIA_INGEST_QUEUE.js",
  "scripts/pipeline/run.js"
]);

function createEmptyQueueStats() {
  return {
    queueLength: 0,
    averageWaitMs: 0,
    peakSize: 0,
    throughput: 0,
    retryCount: 0,
    overflowCount: 0,
    dropCount: 0
  };
}

function createQueueRecord(input = {}) {
  const queueId = String(input.queueId || "").trim();
  const name = String(input.name || "").trim();
  if (!queueId) throw new Error("queueId is required");
  if (!name) throw new Error("name is required");

  const type = Object.values(QUEUE_TYPE).includes(input.type)
    ? input.type
    : QUEUE_TYPE.FIFO;

  return Object.freeze({
    queueId,
    name,
    type,
    priority: Object.values(EVENT_PRIORITY).includes(input.priority)
      ? input.priority
      : EVENT_PRIORITY.NORMAL,
    capacity: input.capacity != null ? Number(input.capacity) : 10000,
    size: input.size != null ? Number(input.size) : 0,
    state: Object.values(QUEUE_STATE).includes(input.state)
      ? input.state
      : QUEUE_STATE.ACTIVE,
    stats: Object.freeze({
      ...createEmptyQueueStats(),
      ...(input.stats || {})
    })
  });
}

function createQueueRegistry() {
  const queues = new Map();
  return {
    register(record) {
      if (!record || !record.queueId) throw new Error("queue record required");
      if (queues.has(record.queueId)) {
        throw new Error(`queue already registered: ${record.queueId}`);
      }
      queues.set(record.queueId, record);
      return record;
    },
    get(queueId) {
      return queues.get(String(queueId)) || null;
    },
    list() {
      return Array.from(queues.values());
    },
    has(queueId) {
      return queues.has(String(queueId));
    }
  };
}

function createQueueAuditEvent(input = {}) {
  const queueId = String(input.queueId || "").trim();
  const eventId = String(input.eventId || "").trim();
  const operation = String(input.operation || "").trim();
  if (!queueId || !eventId || !operation) {
    throw new Error("queueId, eventId and operation are required");
  }

  return Object.freeze({
    auditId:
      typeof input.auditId === "string" && input.auditId.trim()
        ? input.auditId.trim()
        : `queue-audit-${crypto.randomUUID()}`,
    queueId,
    eventId,
    operation,
    result: String(input.result || "ok"),
    at: input.at != null ? Number(input.at) : Date.now(),
    component: String(input.component || QUEUE_MANAGER_COMPONENT.QUEUE_AUDIT)
  });
}

function createQueueViaFactory(registry, input = {}, options = {}) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registry is required");
  }

  const queueId =
    typeof input.queueId === "string" && input.queueId.trim()
      ? input.queueId.trim()
      : `queue-${crypto.randomUUID()}`;

  const record = createQueueRecord({ ...input, queueId });
  registry.register(record);

  const audit = createQueueAuditEvent({
    queueId: record.queueId,
    eventId: options.factoryEventId || "queue-factory",
    operation: "create",
    result: "registered",
    component: QUEUE_MANAGER_COMPONENT.QUEUE_FACTORY
  });

  return Object.freeze({ record, audit });
}

function createInMemoryQueueStorage() {
  const buckets = new Map();
  const claimed = new Set();

  function bucket(queueId) {
    const key = String(queueId);
    if (!buckets.has(key)) buckets.set(key, []);
    return buckets.get(key);
  }

  return {
    enqueue(queueId, event) {
      const list = bucket(queueId);
      list.push({ ...event, enqueuedAt: Date.now() });
      return list.length;
    },
    dequeue(queueId) {
      const list = bucket(queueId);
      return list.shift() || null;
    },
    peek(queueId) {
      const list = bucket(queueId);
      return list[0] || null;
    },
    size(queueId) {
      return bucket(queueId).length;
    },
    claim(queueId, workerId) {
      const item = this.dequeue(queueId);
      if (!item) return null;
      const claimKey = `${item.eventId}:${workerId}`;
      if (claimed.has(claimKey)) return null;
      claimed.add(claimKey);
      return Object.freeze({ ...item, workerId, claimedAt: Date.now() });
    },
    release(claimKey) {
      claimed.delete(String(claimKey));
    },
    snapshot() {
      const out = {};
      for (const [queueId, items] of buckets.entries()) {
        out[queueId] = items.map((item) => ({ ...item }));
      }
      return out;
    },
    restore(snapshot = {}) {
      buckets.clear();
      claimed.clear();
      for (const [queueId, items] of Object.entries(snapshot)) {
        buckets.set(queueId, items.map((item) => ({ ...item })));
      }
    }
  };
}

function checkCapacity(record, nextSize = 0) {
  const capacity = Number(record?.capacity) || 10000;
  const size = nextSize != null ? Number(nextSize) : Number(record?.size) || 0;
  return Object.freeze({
    ok: size < capacity,
    capacity,
    size,
    remaining: Math.max(0, capacity - size)
  });
}

function resolveOrderMode(event = {}) {
  const canonical =
    resolveCanonicalEventName(event.eventType || event.canonicalEventType) ||
    String(event.eventType || "").toUpperCase();
  return DEFAULT_ORDER_MODE_BY_EVENT_TYPE[canonical] || QUEUE_ORDER_MODE.PARALLEL;
}

function resolveMiaDomainQueue(event = {}) {
  const canonical =
    resolveCanonicalEventName(event.eventType || event.canonicalEventType) ||
    String(event.eventType || "").toUpperCase();
  return DEFAULT_MIA_DOMAIN_BY_EVENT_TYPE[canonical] || MIA_DOMAIN_QUEUE.LOGGING;
}

function enqueueEvent(registry, storage, queueId, event = {}, options = {}) {
  const record = registry.get(queueId);
  if (!record) throw new Error(`unknown queue: ${queueId}`);
  if (record.state === QUEUE_STATE.CLOSED) {
    return Object.freeze({ ok: false, reason: "queue_closed" });
  }

  const eventId = String(event.eventId || "").trim();
  if (!eventId) throw new Error("eventId is required");

  const nextSize = (storage.size(queueId) || 0) + 1;
  const capacity = checkCapacity(record, nextSize);
  const overflow = handleQueueOverflow(
    queueId,
    nextSize,
    { capacity: { [queueId]: record.capacity } }
  );

  if (overflow.action === "reject") {
    const audit = createQueueAuditEvent({
      queueId,
      eventId,
      operation: QUEUE_OPERATION.DROP,
      result: "rejected_overflow",
      component: QUEUE_MANAGER_COMPONENT.OVERFLOW_MANAGER
    });
    return Object.freeze({ ok: false, overflow, audit });
  }

  storage.enqueue(queueId, event);
  const audit = createQueueAuditEvent({
    queueId,
    eventId,
    operation: QUEUE_OPERATION.ENQUEUE,
    result: overflow.overflow ? "accepted_overflow_warning" : "ok",
    component: QUEUE_MANAGER_COMPONENT.QUEUE_STORAGE
  });

  return Object.freeze({
    ok: true,
    capacity,
    overflow,
    audit,
    size: storage.size(queueId)
  });
}

function dequeueForDispatcher(registry, storage, queueId) {
  const record = registry.get(queueId);
  if (!record || record.state !== QUEUE_STATE.ACTIVE) {
    return Object.freeze({ ok: false, item: null });
  }

  const item = storage.dequeue(queueId);
  if (!item) return Object.freeze({ ok: false, item: null });

  const audit = createQueueAuditEvent({
    queueId,
    eventId: item.eventId,
    operation: QUEUE_OPERATION.DEQUEUE,
    component: QUEUE_MANAGER_COMPONENT.DISPATCHER_CONNECTOR
  });

  return Object.freeze({ ok: true, item, audit });
}

function createQueueSchedulerState(input = {}) {
  return {
    fairScheduler: createFairSchedulerState(input.fairScheduler),
    priorityQueues: input.priorityQueues || Object.values(PRIORITY_QUEUE)
  };
}

function scheduleNextQueue(schedulerState, storage) {
  const depths = {};
  for (const queueName of schedulerState.priorityQueues) {
    depths[queueName] = storage.size(queueName) || 0;
  }
  const next = pickNextQueue(schedulerState.fairScheduler, depths);
  return next;
}

function recoverQueuesFromSnapshot(registry, storage, snapshot = {}, options = {}) {
  const seen = new Set();
  const cleaned = {};
  let dropped = 0;

  for (const [queueId, items] of Object.entries(snapshot)) {
    if (!registry.has(queueId)) {
      dropped += items.length;
      continue;
    }
    const valid = [];
    for (const item of items) {
      const eventId = String(item?.eventId || "").trim();
      if (!eventId || seen.has(eventId)) {
        dropped += 1;
        continue;
      }
      seen.add(eventId);
      valid.push(item);
    }
    cleaned[queueId] = valid;
  }

  storage.restore(cleaned);

  const audit = createQueueAuditEvent({
    queueId: options.recoveryQueueId || "recovery",
    eventId: options.recoveryEventId || "system-recovery",
    operation: QUEUE_OPERATION.RECOVER,
    result: `restored:${Object.keys(cleaned).length},dropped:${dropped}`,
    component: QUEUE_MANAGER_COMPONENT.QUEUE_RECOVERY
  });

  return Object.freeze({ restored: cleaned, dropped, audit });
}

function createQueueMetrics(record, storage, queueId) {
  const size = storage.size(queueId);
  const stats = record?.stats || createEmptyQueueStats();
  return Object.freeze({
    queueId,
    queueLength: size,
    averageWaitMs: stats.averageWaitMs,
    peakSize: Math.max(stats.peakSize, size),
    throughput: stats.throughput,
    retryCount: stats.retryCount,
    overflowCount: stats.overflowCount,
    dropCount: stats.dropCount
  });
}

function createQueueMonitorSnapshot(registry, storage) {
  const queues = registry.list().map((record) => ({
    ...record,
    size: storage.size(record.queueId),
    metrics: createQueueMetrics(record, storage, record.queueId)
  }));

  return Object.freeze({
    capturedAt: Date.now(),
    queues: Object.freeze(queues),
    totalDepth: queues.reduce((sum, q) => sum + q.size, 0)
  });
}

function claimEventForWorker(registry, storage, queueId, workerId) {
  const record = registry.get(queueId);
  if (!record) throw new Error(`unknown queue: ${queueId}`);

  const item = storage.claim(queueId, workerId);
  if (!item) return Object.freeze({ ok: false, claim: null });

  const audit = createQueueAuditEvent({
    queueId,
    eventId: item.eventId,
    operation: QUEUE_OPERATION.CLAIM,
    result: `worker:${workerId}`,
    component: QUEUE_MANAGER_COMPONENT.QUEUE_STORAGE
  });

  return Object.freeze({ ok: true, claim: item, audit });
}

function bootstrapDefaultMiaQueues(registry, options = {}) {
  const created = [];
  const capacity = options.capacity || DEFAULT_QUEUE_CAPACITY;

  const defs = [
    { queueId: PRIORITY_QUEUE.CRITICAL, name: "Critical Queue", type: QUEUE_TYPE.PRIORITY, priority: EVENT_PRIORITY.CRITICAL },
    { queueId: PRIORITY_QUEUE.HIGH, name: "High Queue", type: QUEUE_TYPE.PRIORITY, priority: EVENT_PRIORITY.HIGH },
    { queueId: PRIORITY_QUEUE.NORMAL, name: "Normal Queue", type: QUEUE_TYPE.PRIORITY, priority: EVENT_PRIORITY.NORMAL },
    { queueId: PRIORITY_QUEUE.LOW, name: "Low Queue", type: QUEUE_TYPE.PRIORITY, priority: EVENT_PRIORITY.LOW },
    { queueId: PRIORITY_QUEUE.BACKGROUND, name: "Background Queue", type: QUEUE_TYPE.PRIORITY, priority: EVENT_PRIORITY.BACKGROUND },
    { queueId: "retry_queue", name: "Retry Queue", type: QUEUE_TYPE.RETRY, priority: EVENT_PRIORITY.HIGH },
    { queueId: "dead_letter_queue", name: "Dead Letter Queue", type: QUEUE_TYPE.DEAD_LETTER, priority: EVENT_PRIORITY.LOW }
  ];

  for (const def of defs) {
    if (registry.has(def.queueId)) continue;
    const { record } = createQueueViaFactory(registry, {
      ...def,
      capacity: capacity[def.queueId] || 10000
    });
    created.push(record);
  }

  for (const domain of Object.values(MIA_DOMAIN_QUEUE)) {
    const queueId = `mia_${domain}`;
    if (registry.has(queueId)) continue;
    const { record } = createQueueViaFactory(registry, {
      queueId,
      name: `MIA ${domain}`,
      type: QUEUE_TYPE.FIFO,
      priority: domain === MIA_DOMAIN_QUEUE.GIFTS ? EVENT_PRIORITY.HIGH : EVENT_PRIORITY.NORMAL
    });
    created.push(record);
  }

  return Object.freeze(created);
}

function assertQueueForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !QUEUE_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

module.exports = {
  QUEUE_MANAGER_COMPONENT,
  QUEUE_MANAGER_COMPONENT_ORDER,
  QUEUE_TYPE,
  QUEUE_STATE,
  QUEUE_ORDER_MODE,
  QUEUE_OPERATION,
  MIA_DOMAIN_QUEUE,
  QUEUE_FORBIDDEN_ACTIVITIES,
  DEFAULT_ORDER_MODE_BY_EVENT_TYPE,
  DEFAULT_MIA_DOMAIN_BY_EVENT_TYPE,
  QUEUE_MANAGER_RUNTIME_ANCHORS,
  createEmptyQueueStats,
  createQueueRecord,
  createQueueRegistry,
  createQueueAuditEvent,
  createQueueViaFactory,
  createInMemoryQueueStorage,
  checkCapacity,
  resolveOrderMode,
  resolveMiaDomainQueue,
  enqueueEvent,
  dequeueForDispatcher,
  createQueueSchedulerState,
  scheduleNextQueue,
  recoverQueuesFromSnapshot,
  createQueueMetrics,
  createQueueMonitorSnapshot,
  claimEventForWorker,
  bootstrapDefaultMiaQueues,
  assertQueueForbiddenActivity
};
