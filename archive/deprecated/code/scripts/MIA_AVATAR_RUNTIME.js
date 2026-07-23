"use strict";

/**
 * MIA_AVATAR_RUNTIME.js
 *
 * Future-proof avatar runtime queue / executor.
 *
 * Cíl:
 * - nepouštět avatar actions jen jako "seznam"
 * - ale jako reálný runtime:
 *   - queue
 *   - active action
 *   - completed history
 *
 * Safe:
 * - nic nevolá do OBS
 * - nic nerozbíjí T1/T2/T3 support video fallback
 * - slouží jako mezivrstva před skutečným visual/avatar rendererem
 */

function nowTs() {
  return Date.now();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function createAvatarRuntimeState() {
  return {
    lastUpdatedAt: 0,
    lastTickAt: 0,
    lastEnqueueAt: 0,

    activeAction: null,
    queue: [],

    currentActions: [],
    recentActions: [],
    completedActions: [],

    recentSignatures: {},

    stats: {
      enqueued: 0,
      started: 0,
      completed: 0,
      dropped: 0
    }
  };
}

function pruneSignatureMap(map, windowMs) {
  if (!map || typeof map !== "object") return;

  const threshold = nowTs() - Math.max(0, toNumber(windowMs, 0));

  Object.keys(map).forEach((key) => {
    if (toNumber(map[key], 0) < threshold) {
      delete map[key];
    }
  });
}

function buildActionSignature(action = {}) {
  const actorUserId = safeString(action?.actor?.userId);
  const actorLabel = safeString(action?.actor?.label);
  const payloadLabel = safeString(action?.payload?.label);

  return [
    safeString(action.kind).toLowerCase(),
    safeString(action.entityType).toLowerCase(),
    safeString(action.entityId).toLowerCase(),
    safeString(action.action).toLowerCase(),
    safeString(action.route).toLowerCase(),
    safeString(action.targetType).toLowerCase(),
    safeString(action.targetId).toLowerCase(),
    safeString(action.targetAnchor).toLowerCase(),
    actorUserId.toLowerCase(),
    actorLabel.toLowerCase(),
    payloadLabel.toLowerCase()
  ].join("|");
}

function hasRecentSignature(state, signature, dedupeWindowMs) {
  if (!state || !signature) return false;

  if (!state.recentSignatures || typeof state.recentSignatures !== "object") {
    state.recentSignatures = {};
  }

  pruneSignatureMap(state.recentSignatures, dedupeWindowMs);

  const lastTs = toNumber(state.recentSignatures[signature], 0);
  if (!lastTs) return false;

  return nowTs() - lastTs < dedupeWindowMs;
}

function markRecentSignature(state, signature) {
  if (!state || !signature) return;

  if (!state.recentSignatures || typeof state.recentSignatures !== "object") {
    state.recentSignatures = {};
  }

  state.recentSignatures[signature] = nowTs();
}

function normalizeAction(rawAction = {}) {
  const ts = nowTs();
  const baseDuration =
    Math.max(
      300,
      toNumber(rawAction.durationMs, 0) ||
      toNumber(rawAction.holdMs, 0) ||
      2400
    );

  const normalized = clone(rawAction);

  normalized.runtimeId =
    safeString(rawAction.runtimeId) ||
    `avatar_${ts}_${Math.random().toString(36).slice(2, 8)}`;

  normalized.ts = toNumber(rawAction.ts, ts);
  normalized.priority = toNumber(rawAction.priority, 100);
  normalized.route = safeString(rawAction.route, "community").toLowerCase();
  normalized.stage = "queued";
  normalized.queuedAt = ts;
  normalized.startedAt = 0;
  normalized.completedAt = 0;
  normalized.durationMs = baseDuration;
  normalized.endsAt = 0;
  normalized.runtimeStatus = "QUEUED";

  return normalized;
}

function sortQueue(queue = []) {
  queue.sort((a, b) => {
    const prioDiff = toNumber(b.priority, 0) - toNumber(a.priority, 0);
    if (prioDiff !== 0) return prioDiff;

    return toNumber(a.queuedAt, 0) - toNumber(b.queuedAt, 0);
  });

  return queue;
}

function updateCurrentActions(state, options = {}) {
  if (!state) return [];

  const maxVisibleQueue = Math.max(1, toNumber(options.maxVisibleQueue, 3));
  const visible = [];

  if (state.activeAction && typeof state.activeAction === "object") {
    visible.push(clone(state.activeAction));
  }

  state.queue.slice(0, maxVisibleQueue).forEach((item) => {
    visible.push(clone(item));
  });

  state.currentActions = visible;
  state.lastUpdatedAt = nowTs();

  return clone(state.currentActions);
}

function pushRecentAction(state, action, options = {}) {
  if (!state || !action) return;

  const maxRecent = Math.max(1, toNumber(options.maxRecent, 12));

  state.recentActions.push({
    ts: nowTs(),
    action: clone(action)
  });

  while (state.recentActions.length > maxRecent) {
    state.recentActions.shift();
  }
}

function pushCompletedAction(state, action, options = {}) {
  if (!state || !action) return;

  const maxCompleted = Math.max(1, toNumber(options.maxCompleted, 20));

  state.completedActions.push(clone(action));

  while (state.completedActions.length > maxCompleted) {
    state.completedActions.shift();
  }
}

function enqueueAvatarActions(state, actions = [], options = {}) {
  if (!state || !Array.isArray(actions) || !actions.length) {
    return [];
  }

  const dedupeWindowMs = Math.max(0, toNumber(options.dedupeWindowMs, 3000));
  const maxQueue = Math.max(1, toNumber(options.maxQueue, 24));

  const accepted = [];

  actions.forEach((rawAction) => {
    if (!rawAction || typeof rawAction !== "object") {
      return;
    }

    const signature = buildActionSignature(rawAction);

    if (dedupeWindowMs > 0 && hasRecentSignature(state, signature, dedupeWindowMs)) {
      state.stats.dropped += 1;
      return;
    }

    markRecentSignature(state, signature);

    const normalized = normalizeAction(rawAction);
    normalized.signature = signature;

    state.queue.push(normalized);
    state.stats.enqueued += 1;
    accepted.push(clone(normalized));
  });

  sortQueue(state.queue);

  while (state.queue.length > maxQueue) {
    state.queue.pop();
    state.stats.dropped += 1;
  }

  state.lastEnqueueAt = nowTs();
  updateCurrentActions(state, options);

  return accepted;
}

function startNextAction(state, options = {}) {
  if (!state) return null;
  if (state.activeAction) return clone(state.activeAction);
  if (!Array.isArray(state.queue) || !state.queue.length) {
    updateCurrentActions(state, options);
    return null;
  }

  const next = state.queue.shift();
  const ts = nowTs();

  next.stage = "active";
  next.startedAt = ts;
  next.endsAt = ts + Math.max(300, toNumber(next.durationMs, 2400));
  next.runtimeStatus = "ACTIVE";

  state.activeAction = next;
  state.stats.started += 1;

  pushRecentAction(state, next, options);
  updateCurrentActions(state, options);

  return clone(state.activeAction);
}

function completeActiveAction(state, options = {}) {
  if (!state || !state.activeAction) return null;

  const finished = clone(state.activeAction);
  finished.stage = "completed";
  finished.completedAt = nowTs();
  finished.runtimeStatus = "COMPLETED";

  pushCompletedAction(state, finished, options);

  state.activeAction = null;
  state.stats.completed += 1;

  updateCurrentActions(state, options);

  return finished;
}

function tickAvatarRuntime(state, options = {}) {
  if (!state) return createAvatarRuntimeState();

  state.lastTickAt = nowTs();

  if (state.activeAction) {
    const endsAt = toNumber(state.activeAction.endsAt, 0);

    if (endsAt > 0 && endsAt <= nowTs()) {
      completeActiveAction(state, options);
    }
  }

  if (!state.activeAction && Array.isArray(state.queue) && state.queue.length) {
    startNextAction(state, options);
  }

  updateCurrentActions(state, options);
  return getAvatarRuntimeSnapshot(state);
}

function clearAvatarRuntime(state) {
  if (!state) return createAvatarRuntimeState();

  const fresh = createAvatarRuntimeState();

  state.lastUpdatedAt = fresh.lastUpdatedAt;
  state.lastTickAt = fresh.lastTickAt;
  state.lastEnqueueAt = fresh.lastEnqueueAt;
  state.activeAction = fresh.activeAction;
  state.queue = fresh.queue;
  state.currentActions = fresh.currentActions;
  state.recentActions = fresh.recentActions;
  state.completedActions = fresh.completedActions;
  state.recentSignatures = fresh.recentSignatures;
  state.stats = fresh.stats;

  return getAvatarRuntimeSnapshot(state);
}

function getAvatarRuntimeSnapshot(state) {
  const safeState = state || createAvatarRuntimeState();

  return clone({
    lastUpdatedAt: toNumber(safeState.lastUpdatedAt, 0),
    lastTickAt: toNumber(safeState.lastTickAt, 0),
    lastEnqueueAt: toNumber(safeState.lastEnqueueAt, 0),

    activeAction: safeState.activeAction ? clone(safeState.activeAction) : null,
    queue: Array.isArray(safeState.queue) ? clone(safeState.queue) : [],
    currentActions: Array.isArray(safeState.currentActions) ? clone(safeState.currentActions) : [],
    recentActions: Array.isArray(safeState.recentActions) ? clone(safeState.recentActions) : [],
    completedActions: Array.isArray(safeState.completedActions) ? clone(safeState.completedActions) : [],

    queueLength: Array.isArray(safeState.queue) ? safeState.queue.length : 0,
    hasActiveAction: Boolean(safeState.activeAction),

    stats: clone(safeState.stats || {
      enqueued: 0,
      started: 0,
      completed: 0,
      dropped: 0
    })
  });
}

module.exports = {
  createAvatarRuntimeState,
  enqueueAvatarActions,
  tickAvatarRuntime,
  clearAvatarRuntime,
  getAvatarRuntimeSnapshot
};