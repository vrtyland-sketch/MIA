"use strict";

/**
 * Master Canon 0020 — Working Memory: context buffer, tasks, focus, expiration, API.
 */

const crypto = require("crypto");
const { createMemoryRecord, MEMORY_TYPE, MEMORY_LIFECYCLE } = require("./memorySystem");

const WORKING_MEMORY_COMPONENT = Object.freeze({
  CONTEXT_BUFFER: "context_buffer",
  ACTIVE_CONVERSATION: "active_conversation",
  ACTIVE_TASKS: "active_tasks",
  DECISION_BUFFER: "decision_buffer",
  EVENT_CONTEXT: "event_context",
  TEMPORARY_OBJECTS: "temporary_objects",
  ATTENTION_MANAGER: "attention_manager",
  FOCUS_MANAGER: "focus_manager",
  CACHE_MANAGER: "cache_manager",
  MEMORY_EXPIRATION: "memory_expiration",
  SYNCHRONIZATION_MANAGER: "synchronization_manager",
  WORKING_MEMORY_API: "working_memory_api"
});

const WORKING_MEMORY_COMPONENT_ORDER = Object.freeze(
  Object.values(WORKING_MEMORY_COMPONENT)
);

const WORKING_CONTEXT_KIND = Object.freeze({
  CONTEXT_BUFFER: "context_buffer",
  CONVERSATION: "conversation",
  TASK: "task",
  DECISION: "decision",
  EVENT: "event",
  TEMPORARY: "temporary",
  CACHE: "cache"
});

const WORKING_TASK_STATUS = Object.freeze({
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  CANCELLED: "cancelled"
});

const WORKING_MEMORY_OPERATION = Object.freeze({
  CREATE: "create_context",
  UPDATE: "update_context",
  READ: "read_context",
  LOCK: "lock_context",
  RELEASE: "release_context",
  DELETE: "delete_context"
});

const DEFAULT_TTL_MS = Object.freeze({
  [WORKING_CONTEXT_KIND.CONVERSATION]: 10 * 60 * 1000,
  [WORKING_CONTEXT_KIND.TASK]: 30 * 60 * 1000,
  [WORKING_CONTEXT_KIND.DECISION]: 5 * 60 * 1000,
  [WORKING_CONTEXT_KIND.EVENT]: 2 * 60 * 1000,
  [WORKING_CONTEXT_KIND.TEMPORARY]: 15 * 60 * 1000,
  [WORKING_CONTEXT_KIND.CACHE]: 60 * 1000,
  [WORKING_CONTEXT_KIND.CONTEXT_BUFFER]: 5 * 60 * 1000
});

const WORKING_FORBIDDEN_ACTIVITIES = Object.freeze([
  "store_long_term",
  "archive_data",
  "decide_economy",
  "replace_database",
  "unlimited_retention"
]);

const WORKING_MEMORY_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-memory-core/workingMemory.js",
  "shared/mia-memory-core/memorySystem.js",
  "scripts/MIA_SESSION_MEMORY.js",
  "scripts/pipeline/run.js"
]);

const DEFAULT_CAPACITY = 256;

function createWorkingContext(input = {}) {
  const kind = Object.values(WORKING_CONTEXT_KIND).includes(input.kind)
    ? input.kind
    : WORKING_CONTEXT_KIND.CONTEXT_BUFFER;

  const contextId =
    typeof input.contextId === "string" && input.contextId.trim()
      ? input.contextId.trim()
      : `wm-${crypto.randomUUID()}`;

  const createdAt = input.createdAt != null ? Number(input.createdAt) : Date.now();
  const ttlMs = input.ttlMs != null ? Number(input.ttlMs) : DEFAULT_TTL_MS[kind] || 60000;

  return Object.freeze({
    contextId,
    kind,
    data: Object.freeze({ ...(input.data || {}) }),
    createdAt,
    expiresAt: createdAt + ttlMs,
    locked: Boolean(input.locked),
    lockOwner: input.lockOwner != null ? String(input.lockOwner) : null,
    attentionScore: input.attentionScore != null ? Number(input.attentionScore) : 0,
    focusPriority: input.focusPriority != null ? Number(input.focusPriority) : 0
  });
}

function createWorkingMemoryStore(input = {}) {
  const capacity = input.capacity != null ? Number(input.capacity) : DEFAULT_CAPACITY;
  const contexts = new Map();
  let focusContextId = input.focusContextId || null;

  return {
    capacity,
    get focusContextId() {
      return focusContextId;
    },
    size() {
      return contexts.size;
    },
    create(inputCtx = {}, operation = WORKING_MEMORY_OPERATION.CREATE) {
      if (contexts.size >= capacity) {
        const overflow = handleWorkingMemoryOverflow({ contexts, capacity });
        if (!overflow.accepted) {
          return Object.freeze({ ok: false, error: "capacity_exceeded", overflow });
        }
      }
      const ctx = createWorkingContext(inputCtx);
      contexts.set(ctx.contextId, ctx);
      return Object.freeze({ ok: true, context: ctx, operation });
    },
    read(contextId) {
      const ctx = contexts.get(String(contextId));
      if (!ctx) return Object.freeze({ ok: false, error: "not_found" });
      return Object.freeze({ ok: true, context: ctx, operation: WORKING_MEMORY_OPERATION.READ });
    },
    update(contextId, patch = {}) {
      const existing = contexts.get(String(contextId));
      if (!existing) return Object.freeze({ ok: false, error: "not_found" });
      if (existing.locked && patch.lockOwner !== existing.lockOwner) {
        return Object.freeze({ ok: false, error: "locked" });
      }
      const next = createWorkingContext({
        ...existing,
        data: { ...existing.data, ...(patch.data || {}) },
        attentionScore: patch.attentionScore != null ? patch.attentionScore : existing.attentionScore,
        focusPriority: patch.focusPriority != null ? patch.focusPriority : existing.focusPriority,
        locked: patch.locked != null ? patch.locked : existing.locked,
        lockOwner: patch.lockOwner != null ? patch.lockOwner : existing.lockOwner
      });
      contexts.set(next.contextId, next);
      return Object.freeze({ ok: true, context: next, operation: WORKING_MEMORY_OPERATION.UPDATE });
    },
    lock(contextId, lockOwner = "system") {
      return this.update(contextId, { locked: true, lockOwner });
    },
    release(contextId, lockOwner = "system") {
      const existing = contexts.get(String(contextId));
      if (!existing) return Object.freeze({ ok: false, error: "not_found" });
      if (existing.locked && existing.lockOwner !== lockOwner) {
        return Object.freeze({ ok: false, error: "lock_owner_mismatch" });
      }
      return this.update(contextId, { locked: false, lockOwner: null });
    },
    delete(contextId) {
      const existed = contexts.delete(String(contextId));
      if (focusContextId === contextId) focusContextId = null;
      return Object.freeze({
        ok: existed,
        operation: WORKING_MEMORY_OPERATION.DELETE
      });
    },
    setFocus(contextId) {
      const ctx = contexts.get(String(contextId));
      if (!ctx) return Object.freeze({ ok: false, error: "not_found" });
      focusContextId = ctx.contextId;
      return Object.freeze({ ok: true, focusContextId });
    },
    list() {
      return Array.from(contexts.values());
    },
    sweepExpired(now = Date.now()) {
      const removed = [];
      for (const [id, ctx] of contexts.entries()) {
        if (ctx.expiresAt <= now && !ctx.locked) {
          contexts.delete(id);
          removed.push(id);
        }
      }
      if (removed.includes(focusContextId)) focusContextId = null;
      return Object.freeze({ removed: Object.freeze(removed) });
    }
  };
}

function createContextBuffer(data = {}) {
  return createWorkingContext({
    kind: WORKING_CONTEXT_KIND.CONTEXT_BUFFER,
    data: {
      lastQuestion: data.lastQuestion || null,
      lastAnswer: data.lastAnswer || null,
      activeTopic: data.activeTopic || null,
      language: data.language || "cs",
      platform: data.platform || null,
      battleActive: Boolean(data.battleActive),
      streamState: data.streamState || null
    }
  });
}

function createActiveConversation(data = {}) {
  return createWorkingContext({
    kind: WORKING_CONTEXT_KIND.CONVERSATION,
    data: {
      userId: data.userId || null,
      question: data.question || "",
      draftAnswer: data.draftAnswer || "",
      finalAnswer: data.finalAnswer || null,
      status: data.status || WORKING_TASK_STATUS.RUNNING
    }
  });
}

function createActiveTask(data = {}) {
  return createWorkingContext({
    kind: WORKING_CONTEXT_KIND.TASK,
    data: {
      taskId: data.taskId || `task-${crypto.randomUUID()}`,
      taskType: data.taskType || "generic",
      status: data.status || WORKING_TASK_STATUS.RUNNING,
      taskContext: Object.freeze({ ...(data.taskContext || {}) })
    },
    focusPriority: data.focusPriority != null ? Number(data.focusPriority) : 50
  });
}

function createDecisionBuffer(data = {}) {
  return createWorkingContext({
    kind: WORKING_CONTEXT_KIND.DECISION,
    data: {
      eventType: data.eventType || null,
      giftSize: data.giftSize != null ? Number(data.giftSize) : null,
      isSpam: Boolean(data.isSpam),
      battleActive: Boolean(data.battleActive),
      kojMood: data.kojMood || null,
      selectedReaction: data.selectedReaction || null
    }
  });
}

function createEventContext(event = {}) {
  return createWorkingContext({
    kind: WORKING_CONTEXT_KIND.EVENT,
    data: {
      eventId: String(event.eventId || ""),
      correlationId: String(event.correlationId || event.eventId || ""),
      priority: event.priority || null,
      source: event.source || null,
      subscribers: Object.freeze(Array.isArray(event.subscribers) ? event.subscribers : []),
      processingState: event.processingState || WORKING_TASK_STATUS.RUNNING
    },
    ttlMs: DEFAULT_TTL_MS[WORKING_CONTEXT_KIND.EVENT]
  });
}

function createTemporaryObject(data = {}) {
  return createWorkingContext({
    kind: WORKING_CONTEXT_KIND.TEMPORARY,
    data: {
      objectType: data.objectType || "generic",
      payload: Object.freeze({ ...(data.payload || {}) })
    }
  });
}

function computeAttentionScore(item = {}, options = {}) {
  let score = Number(item.attentionScore) || 0;
  if (item.kind === WORKING_CONTEXT_KIND.DECISION && item.data?.giftSize >= 1000) score += 80;
  if (item.data?.battleActive) score += 60;
  if (options.moderatorQuestion) score += 70;
  if (options.criticalError) score += 100;
  return Math.min(100, score);
}

function pickAttentionTarget(contexts = []) {
  if (!contexts.length) return null;
  const ranked = contexts
    .map((ctx) => ({
      contextId: ctx.contextId,
      score: computeAttentionScore(ctx)
    }))
    .sort((a, b) => b.score - a.score);
  return ranked[0] || null;
}

function pickFocusTarget(contexts = []) {
  if (!contexts.length) return null;
  const ranked = contexts
    .filter((c) => c.kind === WORKING_CONTEXT_KIND.TASK || c.focusPriority > 0)
    .sort((a, b) => (b.focusPriority || 0) - (a.focusPriority || 0));
  return ranked[0] || null;
}

function isWorkingContextExpired(context, now = Date.now()) {
  return Number(context?.expiresAt) <= now;
}

function promoteToShortTerm(context, options = {}) {
  const what =
    options.what ||
    context.data?.finalAnswer ||
    context.data?.question ||
    context.data?.taskType ||
    `working:${context.kind}`;
  const record = createMemoryRecord({
    what: String(what),
    why: options.why || "promoted_from_working_memory",
    memoryType: MEMORY_TYPE.SHORT_TERM,
    lifecycle: MEMORY_LIFECYCLE.SHORT_TERM,
    context: {
      userId: context.data?.userId || null,
      topic: context.data?.activeTopic || context.data?.taskType || null
    }
  });
  return Object.freeze({
    promoted: true,
    fromContextId: context.contextId,
    record,
    component: WORKING_MEMORY_COMPONENT.SYNCHRONIZATION_MANAGER
  });
}

function handleWorkingMemoryOverflow(state = {}) {
  const contexts = state.contexts;
  const capacity = state.capacity || DEFAULT_CAPACITY;
  if (!contexts || contexts.size < capacity) {
    return Object.freeze({ accepted: true, action: "none" });
  }

  const candidates = Array.from(contexts.values())
    .filter((c) => !c.locked)
    .sort((a, b) => (a.attentionScore || 0) - (b.attentionScore || 0));

  const evicted = [];
  while (contexts.size >= capacity && candidates.length > 0) {
    const victim = candidates.shift();
    if (!victim) break;
    if (victim.focusPriority >= 90) continue;
    contexts.delete(victim.contextId);
    evicted.push(victim.contextId);
  }

  return Object.freeze({
    accepted: contexts.size < capacity,
    action: evicted.length > 0 ? "evict_low_priority" : "reject",
    warning: "working_memory_overflow",
    evicted: Object.freeze(evicted)
  });
}

function assertWorkingMemoryForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !WORKING_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

module.exports = {
  WORKING_MEMORY_COMPONENT,
  WORKING_MEMORY_COMPONENT_ORDER,
  WORKING_CONTEXT_KIND,
  WORKING_TASK_STATUS,
  WORKING_MEMORY_OPERATION,
  DEFAULT_TTL_MS,
  WORKING_FORBIDDEN_ACTIVITIES,
  WORKING_MEMORY_RUNTIME_ANCHORS,
  DEFAULT_CAPACITY,
  createWorkingContext,
  createWorkingMemoryStore,
  createContextBuffer,
  createActiveConversation,
  createActiveTask,
  createDecisionBuffer,
  createEventContext,
  createTemporaryObject,
  computeAttentionScore,
  pickAttentionTarget,
  pickFocusTarget,
  isWorkingContextExpired,
  promoteToShortTerm,
  handleWorkingMemoryOverflow,
  assertWorkingMemoryForbiddenActivity
};
