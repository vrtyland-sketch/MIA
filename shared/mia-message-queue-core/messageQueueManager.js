"use strict";

/**
 * Master Canon 0077 — Message Queue Manager.
 * Kernel Layer 0 sole central authority for work-message queues.
 * MQM stores work messages — NOT event distribution (that's Event Bus 0076).
 */

const crypto = require("crypto");

const MQM_COMPONENT = Object.freeze({
  MESSAGE_QUEUE_MANAGER: "message_queue_manager",
  INTAKE_GATE: "intake_gate",
  QUEUE_REGISTRY: "queue_registry",
  PRIORITY_SCHEDULER: "priority_scheduler",
  FIFO_CONTROLLER: "fifo_controller",
  DEQUEUE_ENGINE: "dequeue_engine",
  ACK_CONTROLLER: "ack_controller",
  NACK_RETRY_CONTROLLER: "nack_retry_controller",
  DEAD_LETTER_QUEUE: "dead_letter_queue",
  SECURITY_GATE: "security_gate",
  QUEUE_AUDIT: "queue_audit",
  METRICS_AUDIT: "metrics_audit"
});

const MQM_COMPONENT_ORDER = Object.freeze(Object.values(MQM_COMPONENT));

const MQM_DESCRIPTOR_FIELDS = Object.freeze([
  "messageId",
  "queueId",
  "type",
  "priority",
  "payload",
  "created",
  "retryCount",
  "status",
  "correlationId"
]);

const MQM_PRIORITY = Object.freeze({
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  CRITICAL: "critical"
});

/** Ascending rank; higher priority dequeued first within a queue. */
const MQM_PRIORITY_ORDER = Object.freeze([
  MQM_PRIORITY.LOW,
  MQM_PRIORITY.NORMAL,
  MQM_PRIORITY.HIGH,
  MQM_PRIORITY.CRITICAL
]);

const MQM_PRIORITY_RANK = Object.freeze({
  [MQM_PRIORITY.LOW]: 0,
  [MQM_PRIORITY.NORMAL]: 1,
  [MQM_PRIORITY.HIGH]: 2,
  [MQM_PRIORITY.CRITICAL]: 3
});

const MQM_STATUS = Object.freeze({
  CREATED: "created",
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETED: "completed",
  RETRYING: "retrying",
  DEAD_LETTER: "dead_letter"
});

const MQM_DEFAULT_QUEUES = Object.freeze([
  "ai",
  "battle",
  "overlay",
  "obs",
  "inventory",
  "platform"
]);

const MQM_AUTHORIZED_SOURCES = Object.freeze([
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
  "message_queue",
  "message-queue",
  "message_queue_manager",
  "message-queue-manager",
  "event_bus",
  "event-bus",
  "ai_engine",
  "battle_engine",
  "gift_engine",
  "chat_engine",
  "overlay_engine",
  "obs_connector",
  "tiktok_connector",
  "kick_connector",
  "inventory",
  "platform",
  "security",
  "monitoring",
  "producer",
  "consumer"
]);

const MQM_FLAGS = Object.freeze({
  soleMessageQueueAuthority: true,
  distributesEvents: false,
  separatedFromEventBus: true,
  dlqNeverAutoDeletes: true,
  singleConsumerCompletion: true
});

const MQM_PUBLIC_API = Object.freeze([
  "enqueue",
  "dequeue",
  "ack",
  "nack",
  "retry",
  "peek",
  "purge"
]);

const MQM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-message-queue-core/messageQueueManager.js",
  "shared/mia-scheduler-core/taskScheduler.js",
  "shared/mia-event-bus-core/eventBusManager.js",
  "docs/master-canon/0077-message-queue-manager.md"
]);

let activeMessageQueueManager = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function normalizePriority(value) {
  const raw = String(value || MQM_PRIORITY.NORMAL)
    .trim()
    .toLowerCase();
  if (Object.prototype.hasOwnProperty.call(MQM_PRIORITY_RANK, raw)) return raw;
  return null;
}

function createMessageDescriptor(input = {}) {
  const queueId = String(input.queueId || input.queue || "").trim();
  if (!queueId) return { ok: false, error: "missing_queueId" };

  const type = String(input.type || "").trim();
  if (!type) return { ok: false, error: "missing_type" };

  const priority = normalizePriority(input.priority);
  if (!priority) return { ok: false, error: "invalid_priority" };

  const created =
    typeof input.created === "number" && Number.isFinite(input.created)
      ? input.created
      : Date.now();

  const correlationId =
    input.correlationId != null && String(input.correlationId).trim()
      ? String(input.correlationId).trim()
      : makeId("corr");

  const messageId =
    input.messageId != null && String(input.messageId).trim()
      ? String(input.messageId).trim()
      : makeId("msg");

  const retryCount =
    input.retryCount != null && Number.isFinite(Number(input.retryCount))
      ? Math.max(0, Number(input.retryCount))
      : 0;

  const statusRaw = String(input.status || MQM_STATUS.CREATED)
    .trim()
    .toLowerCase();
  const status = Object.values(MQM_STATUS).includes(statusRaw)
    ? statusRaw
    : MQM_STATUS.CREATED;

  const payloadRaw =
    input.payload != null && typeof input.payload === "object"
      ? { ...input.payload }
      : {};

  const descriptor = {
    messageId,
    queueId,
    type,
    priority,
    payload: Object.freeze(payloadRaw),
    created,
    retryCount,
    status,
    correlationId
  };

  return {
    ok: true,
    descriptor: Object.freeze(descriptor)
  };
}

function createMessageQueueManager(options = {}) {
  if (
    activeMessageQueueManager &&
    activeMessageQueueManager.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "message_queue_manager_already_active",
      soleMessageQueueAuthority: true
    });
  }

  const authorized = new Set(
    options.authorizedSources || MQM_AUTHORIZED_SOURCES
  );
  const maxRetries =
    options.maxRetries != null && Number.isFinite(Number(options.maxRetries))
      ? Math.max(0, Number(options.maxRetries))
      : 3;

  /** @type {Map<string, { queueId: string, pending: Array, processing: Map, fifoSeq: number }>} */
  const queues = new Map();
  /** @type {Map<string, object>} */
  const messageIndex = new Map();
  const knownMessageIds = new Set();
  const deadLetters = [];
  const queueAuditLog = [];

  let messageCount = 0;
  let retryCountTotal = 0;
  let ackCount = 0;
  let nackCount = 0;
  let waitSumMs = 0;
  let waitSamples = 0;
  let active = true;

  function ensureQueue(queueId) {
    const id = String(queueId || "").trim();
    if (!id) return null;
    if (!queues.has(id)) {
      queues.set(id, {
        queueId: id,
        pending: [],
        processing: new Map(),
        fifoSeq: 0
      });
    }
    return queues.get(id);
  }

  // Default independent queues
  for (const q of MQM_DEFAULT_QUEUES) {
    ensureQueue(q);
  }

  function isAuthorized(meta = {}) {
    return (
      meta.authorized === true ||
      authorized.has(meta.source || "") ||
      authorized.has(meta.actor || "") ||
      authorized.has(meta.producer || "") ||
      authorized.has(meta.consumerId || "") ||
      authorized.has(meta.consumer || "")
    );
  }

  function isSourceVerified(meta = {}) {
    if (meta.forged === true) return false;
    if (meta.sourceVerified === false) return false;
    if (meta.sourceVerified === true) return true;
    return isAuthorized(meta);
  }

  function gate(meta, _operation, { requireAuth = true } = {}) {
    if (requireAuth && !isAuthorized(meta)) {
      return Object.freeze({ ok: false, error: "unauthorized_message_queue" });
    }
    if (!isSourceVerified(meta)) {
      return Object.freeze({ ok: false, error: "forged_message_queue_blocked" });
    }
    return null;
  }

  function recordAudit(entry) {
    queueAuditLog.push(
      Object.freeze({
        messageId: entry.messageId,
        queueId: entry.queueId,
        producer: entry.producer != null ? entry.producer : null,
        consumer: entry.consumer != null ? entry.consumer : null,
        created: entry.created != null ? entry.created : null,
        completed: entry.completed != null ? entry.completed : null,
        retryCount: entry.retryCount != null ? entry.retryCount : 0,
        result: entry.result || "unknown"
      })
    );
  }

  function sortPending(queue) {
    queue.pending.sort((a, b) => {
      const pr =
        MQM_PRIORITY_RANK[b.message.priority] -
        MQM_PRIORITY_RANK[a.message.priority];
      if (pr !== 0) return pr;
      return a.fifoSeq - b.fifoSeq;
    });
  }

  function createQueue(queueId, meta = {}) {
    if (meta.source || meta.authorized === true || meta.actor) {
      const authBlocked = gate(meta, "createQueue");
      if (authBlocked) return authBlocked;
    }

    const id = String(queueId || "").trim();
    if (!id) return Object.freeze({ ok: false, error: "missing_queueId" });
    if (queues.has(id)) {
      return Object.freeze({
        ok: true,
        queueId: id,
        created: false,
        alreadyExists: true
      });
    }
    ensureQueue(id);
    return Object.freeze({ ok: true, queueId: id, created: true });
  }

  function enqueue(input = {}, meta = {}) {
    const authMeta = {
      ...meta,
      producer: meta.producer || input.producer || meta.source,
      source: meta.source || input.producer || meta.producer
    };
    const blocked = gate(authMeta, "enqueue");
    if (blocked) return blocked;

    if (
      meta.asEventBusPublish === true ||
      input.asEventBusPublish === true ||
      meta.writeToEventBus === true ||
      input.writeToEventBus === true
    ) {
      return Object.freeze({
        ok: false,
        error: "write_to_event_bus_rejected",
        separatedFromEventBus: true,
        distributesEvents: false
      });
    }

    const queueId = String(input.queueId || input.queue || "").trim();
    if (!queueId) return Object.freeze({ ok: false, error: "missing_queueId" });
    const queue = ensureQueue(queueId);

    const desc = createMessageDescriptor({
      ...input,
      queueId,
      status: MQM_STATUS.CREATED,
      created:
        typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
          ? meta.nowMs
          : input.created
    });
    if (!desc.ok) return Object.freeze(desc);

    const d = desc.descriptor;
    if (knownMessageIds.has(d.messageId)) {
      return Object.freeze({
        ok: false,
        error: "duplicate_messageId",
        messageId: d.messageId
      });
    }

    knownMessageIds.add(d.messageId);
    messageCount += 1;

    const message = Object.freeze({
      ...d,
      status: MQM_STATUS.QUEUED,
      producer: authMeta.producer || authMeta.source || null
    });

    const entry = {
      message,
      fifoSeq: ++queue.fifoSeq,
      enqueuedAt: message.created,
      producer: authMeta.producer || authMeta.source || null
    };
    queue.pending.push(entry);
    sortPending(queue);

    messageIndex.set(d.messageId, {
      message,
      queueId,
      entry,
      state: "pending",
      consumerId: null,
      dequeuedAt: null,
      producer: entry.producer
    });

    recordAudit({
      messageId: d.messageId,
      queueId,
      producer: entry.producer,
      consumer: null,
      created: message.created,
      completed: null,
      retryCount: message.retryCount,
      result: "enqueued"
    });

    return Object.freeze({
      ok: true,
      messageId: d.messageId,
      message,
      queueId,
      separatedFromEventBus: true,
      distributesEvents: false
    });
  }

  function dequeue(queueId, consumerId, meta = {}) {
    const qid = String(queueId || "").trim();
    const cid = String(consumerId || "").trim();
    if (!qid) return Object.freeze({ ok: false, error: "missing_queueId" });
    if (!cid) return Object.freeze({ ok: false, error: "missing_consumerId" });

    const authMeta = {
      ...meta,
      consumerId: cid,
      consumer: meta.consumer || cid,
      source: meta.source || cid
    };
    const blocked = gate(authMeta, "dequeue");
    if (blocked) return blocked;

    const queue = queues.get(qid);
    if (!queue) {
      return Object.freeze({ ok: false, error: "queue_not_found", queueId: qid });
    }

    if (queue.pending.length === 0) {
      return Object.freeze({
        ok: false,
        error: "queue_empty",
        queueId: qid
      });
    }

    sortPending(queue);
    const slot = queue.pending.shift();
    const now =
      typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
        ? meta.nowMs
        : Date.now();

    const processingMessage = Object.freeze({
      ...slot.message,
      status: MQM_STATUS.PROCESSING
    });

    const processingEntry = {
      message: processingMessage,
      fifoSeq: slot.fifoSeq,
      enqueuedAt: slot.enqueuedAt,
      producer: slot.producer,
      consumerId: cid,
      dequeuedAt: now
    };

    if (queue.processing.has(processingMessage.messageId)) {
      // Reject duplicate processing — put back and fail
      queue.pending.unshift(slot);
      sortPending(queue);
      return Object.freeze({
        ok: false,
        error: "duplicate_processing_rejected",
        messageId: processingMessage.messageId,
        singleConsumerCompletion: true
      });
    }

    queue.processing.set(processingMessage.messageId, processingEntry);

    waitSumMs += Math.max(0, now - slot.enqueuedAt);
    waitSamples += 1;

    messageIndex.set(processingMessage.messageId, {
      message: processingMessage,
      queueId: qid,
      entry: processingEntry,
      state: "processing",
      consumerId: cid,
      dequeuedAt: now,
      producer: slot.producer
    });

    recordAudit({
      messageId: processingMessage.messageId,
      queueId: qid,
      producer: slot.producer,
      consumer: cid,
      created: processingMessage.created,
      completed: null,
      retryCount: processingMessage.retryCount,
      result: "dequeued"
    });

    return Object.freeze({
      ok: true,
      messageId: processingMessage.messageId,
      message: processingMessage,
      queueId: qid,
      consumerId: cid,
      singleConsumerCompletion: true
    });
  }

  function ack(messageId, meta = {}) {
    const blocked = gate(
      {
        ...meta,
        consumerId: meta.consumerId || meta.consumer,
        source: meta.source || meta.consumerId || meta.consumer
      },
      "ack"
    );
    if (blocked) return blocked;

    const id = String(messageId || "").trim();
    const indexed = messageIndex.get(id);
    if (!indexed) {
      return Object.freeze({ ok: false, error: "message_not_found", messageId: id });
    }
    if (indexed.state === "completed") {
      return Object.freeze({
        ok: false,
        error: "duplicate_ack_rejected",
        messageId: id,
        singleConsumerCompletion: true
      });
    }
    if (indexed.state !== "processing") {
      return Object.freeze({
        ok: false,
        error: "message_not_processing",
        messageId: id,
        status: indexed.message.status
      });
    }

    if (
      meta.consumerId != null &&
      indexed.consumerId &&
      String(meta.consumerId) !== String(indexed.consumerId)
    ) {
      return Object.freeze({
        ok: false,
        error: "consumer_mismatch",
        messageId: id,
        expectedConsumerId: indexed.consumerId
      });
    }

    const queue = queues.get(indexed.queueId);
    if (queue) {
      queue.processing.delete(id);
    }

    const now =
      typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
        ? meta.nowMs
        : Date.now();

    const completed = Object.freeze({
      ...indexed.message,
      status: MQM_STATUS.COMPLETED
    });

    messageIndex.set(id, {
      ...indexed,
      message: completed,
      state: "completed",
      completedAt: now
    });

    ackCount += 1;
    recordAudit({
      messageId: id,
      queueId: indexed.queueId,
      producer: indexed.producer,
      consumer: indexed.consumerId,
      created: completed.created,
      completed: now,
      retryCount: completed.retryCount,
      result: "acked"
    });

    return Object.freeze({
      ok: true,
      messageId: id,
      acked: true,
      status: MQM_STATUS.COMPLETED,
      singleConsumerCompletion: true
    });
  }

  function moveToDlq(message, reason, attempts, meta = {}) {
    const timestamp =
      typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
        ? meta.nowMs
        : Date.now();
    const dlqEntry = Object.freeze({
      message: Object.freeze({
        ...message,
        status: MQM_STATUS.DEAD_LETTER
      }),
      failureReason: String(reason || "max_retries_exceeded").trim(),
      attempts: attempts != null ? Number(attempts) : message.retryCount,
      timestamp,
      neverAutoDeletes: true
    });
    deadLetters.push(dlqEntry);
    messageIndex.set(message.messageId, {
      message: dlqEntry.message,
      queueId: message.queueId,
      entry: null,
      state: "dead_letter",
      consumerId: null,
      dequeuedAt: null,
      producer: message.producer || null
    });
    recordAudit({
      messageId: message.messageId,
      queueId: message.queueId,
      producer: message.producer || null,
      consumer: meta.consumerId || null,
      created: message.created,
      completed: timestamp,
      retryCount: message.retryCount,
      result: "dead_letter"
    });
    return dlqEntry;
  }

  function requeueMessage(indexed, nextRetryCount, status, meta = {}) {
    const queue = ensureQueue(indexed.queueId);
    const now =
      typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
        ? meta.nowMs
        : Date.now();
    const requeued = Object.freeze({
      ...indexed.message,
      retryCount: nextRetryCount,
      status
    });
    const entry = {
      message: requeued,
      fifoSeq: ++queue.fifoSeq,
      enqueuedAt: now,
      producer: indexed.producer
    };
    queue.pending.push(entry);
    sortPending(queue);
    messageIndex.set(requeued.messageId, {
      message: requeued,
      queueId: indexed.queueId,
      entry,
      state: "pending",
      consumerId: null,
      dequeuedAt: null,
      producer: indexed.producer
    });
    return requeued;
  }

  function nack(messageId, reason, meta = {}) {
    const authMeta = {
      ...meta,
      consumerId: meta.consumerId || meta.consumer,
      source: meta.source || meta.consumerId || meta.consumer
    };
    const blocked = gate(authMeta, "nack");
    if (blocked) return blocked;

    const id = String(messageId || "").trim();
    const indexed = messageIndex.get(id);
    if (!indexed) {
      return Object.freeze({ ok: false, error: "message_not_found", messageId: id });
    }
    if (indexed.state !== "processing") {
      return Object.freeze({
        ok: false,
        error: "message_not_processing",
        messageId: id
      });
    }

    const queue = queues.get(indexed.queueId);
    if (queue) {
      queue.processing.delete(id);
    }

    nackCount += 1;
    const failureReason = String(reason || "nack").trim() || "nack";
    const nextRetry = indexed.message.retryCount + 1;

    if (nextRetry > maxRetries) {
      const dlq = moveToDlq(
        Object.freeze({
          ...indexed.message,
          retryCount: nextRetry
        }),
        failureReason,
        nextRetry,
        authMeta
      );
      return Object.freeze({
        ok: true,
        messageId: id,
        nacked: true,
        deadLetter: true,
        deleted: false,
        failureReason: dlq.failureReason,
        retryCount: nextRetry
      });
    }

    retryCountTotal += 1;
    const requeued = requeueMessage(
      indexed,
      nextRetry,
      MQM_STATUS.QUEUED,
      authMeta
    );
    // Also allow status "retrying" visibility via audit
    recordAudit({
      messageId: id,
      queueId: indexed.queueId,
      producer: indexed.producer,
      consumer: indexed.consumerId,
      created: requeued.created,
      completed: null,
      retryCount: nextRetry,
      result: "nacked_retry"
    });

    return Object.freeze({
      ok: true,
      messageId: id,
      nacked: true,
      retried: true,
      deleted: false,
      status: requeued.status,
      retryCount: nextRetry
    });
  }

  function retry(messageId, meta = {}) {
    const blocked = gate(meta, "retry");
    if (blocked) return blocked;

    const id = String(messageId || "").trim();
    const indexed = messageIndex.get(id);
    if (!indexed) {
      return Object.freeze({ ok: false, error: "message_not_found", messageId: id });
    }

    if (indexed.state === "processing") {
      const queue = queues.get(indexed.queueId);
      if (queue) queue.processing.delete(id);
    } else if (indexed.state === "pending") {
      return Object.freeze({
        ok: false,
        error: "message_already_queued",
        messageId: id
      });
    } else if (indexed.state === "completed") {
      return Object.freeze({
        ok: false,
        error: "message_already_completed",
        messageId: id
      });
    } else if (indexed.state === "dead_letter") {
      // Manual retry from DLQ: requeue without removing DLQ entry (DLQ never auto-deletes)
      retryCountTotal += 1;
      const fromDlq = {
        message: Object.freeze({
          ...indexed.message,
          status: MQM_STATUS.RETRYING,
          retryCount: indexed.message.retryCount
        }),
        queueId: indexed.queueId,
        producer: indexed.producer
      };
      const requeued = requeueMessage(
        fromDlq,
        indexed.message.retryCount,
        MQM_STATUS.QUEUED,
        meta
      );
      recordAudit({
        messageId: id,
        queueId: indexed.queueId,
        producer: indexed.producer,
        consumer: meta.consumerId || null,
        created: requeued.created,
        completed: null,
        retryCount: requeued.retryCount,
        result: "manual_retry_from_dlq"
      });
      return Object.freeze({
        ok: true,
        messageId: id,
        retried: true,
        fromDeadLetter: true,
        status: requeued.status
      });
    }

    retryCountTotal += 1;
    const nextRetry = indexed.message.retryCount + 1;
    if (nextRetry > maxRetries) {
      const dlq = moveToDlq(
        Object.freeze({
          ...indexed.message,
          retryCount: nextRetry
        }),
        meta.reason || "manual_retry_exhausted",
        nextRetry,
        meta
      );
      return Object.freeze({
        ok: true,
        messageId: id,
        retried: false,
        deadLetter: true,
        failureReason: dlq.failureReason
      });
    }

    const requeued = requeueMessage(
      indexed,
      nextRetry,
      MQM_STATUS.RETRYING,
      meta
    );
    recordAudit({
      messageId: id,
      queueId: indexed.queueId,
      producer: indexed.producer,
      consumer: meta.consumerId || null,
      created: requeued.created,
      completed: null,
      retryCount: nextRetry,
      result: "manual_retry"
    });

    return Object.freeze({
      ok: true,
      messageId: id,
      retried: true,
      status: requeued.status,
      retryCount: nextRetry
    });
  }

  function peek(queueId, meta = {}) {
    const qid = String(queueId || "").trim();
    if (!qid) return Object.freeze({ ok: false, error: "missing_queueId" });
    const queue = queues.get(qid);
    if (!queue) {
      return Object.freeze({ ok: false, error: "queue_not_found", queueId: qid });
    }
    sortPending(queue);
    if (queue.pending.length === 0) {
      return Object.freeze({
        ok: true,
        queueId: qid,
        empty: true,
        message: null
      });
    }
    const top = queue.pending[0].message;
    return Object.freeze({
      ok: true,
      queueId: qid,
      empty: false,
      message: top,
      messageId: top.messageId
    });
  }

  function purge(queueId, meta = {}) {
    const qid = String(queueId || "").trim();
    if (!qid) return Object.freeze({ ok: false, error: "missing_queueId" });
    const queue = queues.get(qid);
    if (!queue) {
      return Object.freeze({ ok: false, error: "queue_not_found", queueId: qid });
    }

    const purgedPending = queue.pending.length;
    for (const slot of queue.pending) {
      messageIndex.delete(slot.message.messageId);
    }
    queue.pending = [];

    // processing left intact unless force
    let purgedProcessing = 0;
    if (meta.forceProcessing === true) {
      purgedProcessing = queue.processing.size;
      for (const mid of queue.processing.keys()) {
        messageIndex.delete(mid);
      }
      queue.processing.clear();
    }

    recordAudit({
      messageId: null,
      queueId: qid,
      producer: meta.source || null,
      consumer: null,
      created: null,
      completed: Date.now(),
      retryCount: 0,
      result: "purged"
    });

    return Object.freeze({
      ok: true,
      queueId: qid,
      purgedPending,
      purgedProcessing,
      dlqUntouched: true,
      dlqNeverAutoDeletes: true
    });
  }

  function purgeDlq(meta = {}) {
    if (meta.forceDlqPurge !== true) {
      return Object.freeze({
        ok: false,
        error: "dlq_purge_requires_force",
        blocked: true,
        dlqNeverAutoDeletes: true
      });
    }
    const n = deadLetters.length;
    deadLetters.length = 0;
    return Object.freeze({
      ok: true,
      purged: n,
      forceDlqPurge: true
    });
  }

  function getDeadLetters() {
    return Object.freeze([...deadLetters]);
  }

  function metrics() {
    let pendingCount = 0;
    let processingCount = 0;
    for (const q of queues.values()) {
      pendingCount += q.pending.length;
      processingCount += q.processing.size;
    }
    return Object.freeze({
      queueCount: queues.size,
      messageCount,
      pendingCount,
      processingCount,
      retryCount: retryCountTotal,
      dlqCount: deadLetters.length,
      averageWaitMs: waitSamples > 0 ? waitSumMs / waitSamples : 0,
      ackCount,
      nackCount,
      soleMessageQueueAuthority: true,
      distributesEvents: false,
      separatedFromEventBus: true,
      dlqNeverAutoDeletes: true,
      singleConsumerCompletion: true
    });
  }

  function queueAudit() {
    return Object.freeze([...queueAuditLog]);
  }

  function status() {
    const queueIds = [...queues.keys()];
    return Object.freeze({
      ok: true,
      singleton: true,
      soleMessageQueueAuthority: true,
      distributesEvents: false,
      separatedFromEventBus: true,
      dlqNeverAutoDeletes: true,
      singleConsumerCompletion: true,
      components: MQM_COMPONENT_ORDER,
      queueCount: queues.size,
      queueIds: Object.freeze(queueIds),
      messageCount,
      dlqCount: deadLetters.length,
      maxRetries
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
    enqueue,
    dequeue,
    ack,
    nack,
    retry,
    peek,
    purge,
    createQueue,
    getDeadLetters,
    metrics,
    queueAudit,
    status,
    purgeDlq,
    isActive() {
      return active === true;
    },
    deleteDeadLetter() {
      return blockDlqMutation("deleteDeadLetter");
    },
    clearDlq() {
      return blockDlqMutation("clearDlq");
    },
    purgeDeadLetters() {
      return blockDlqMutation("purgeDeadLetters");
    }
  });

  activeMessageQueueManager = {
    isActive: manager.isActive
  };

  return manager;
}

function clearMessageQueueSingletonForTest() {
  activeMessageQueueManager = null;
}

module.exports = {
  MQM_COMPONENT,
  MQM_COMPONENT_ORDER,
  MQM_DESCRIPTOR_FIELDS,
  MQM_PRIORITY,
  MQM_PRIORITY_ORDER,
  MQM_PRIORITY_RANK,
  MQM_STATUS,
  MQM_DEFAULT_QUEUES,
  MQM_AUTHORIZED_SOURCES,
  MQM_FLAGS,
  MQM_PUBLIC_API,
  MQM_RUNTIME_ANCHORS,
  createMessageDescriptor,
  createMessageQueueManager,
  clearMessageQueueSingletonForTest,
  separatedFromEventBus: true,
  soleMessageQueueAuthority: true,
  distributesEvents: false,
  dlqNeverAutoDeletes: true,
  singleConsumerCompletion: true
};
