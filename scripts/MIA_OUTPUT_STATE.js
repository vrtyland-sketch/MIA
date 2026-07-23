"use strict";

/**
 * MIA_OUTPUT_STATE.js
 *
 * Stav výstupní vrstvy:
 * - poslední event
 * - poslední overlay
 * - anti-repeat texty
 * - anti-duplicitní chat signatury
 * - anti-duplicitní support signatury
 * - audit overlay priority rozhodnutí
 * - support burst summary state
 * - deferred community overlay queue
 *
 * FIX:
 * - deferred queue teď drží vždy stejný state reference
 * - enqueue / prune / shift už si queue navzájem nerozbijí
 * - queueLength teď odpovídá realitě
 */

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowTs() {
  return Date.now();
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function createEmptySupportBurst() {
  return {
    startedAt: 0,
    updatedAt: 0,
    count: 0,
    totalCoins: 0,
    highestTier: "T1",
    lastGiftName: "",
    lastUserLabel: ""
  };
}

function createOutputState() {
  return {
    lastEvent: null,
    lastOverlay: null,
    queueSize: 0,
    lastChatMessage: null,

    rotationIndex: {},
    lastTexts: {},

    recentChatSignatures: {},
    recentSupportSignatures: {},
    lastOverlayDecision: null,

    supportBurst: createEmptySupportBurst(),
    deferredCommunityQueue: [],
    avatarRuntime: {
      lastUpdatedAt: 0,
      currentActions: [],
      recentActions: []
    }
  };
}

function ensureDeferredCommunityQueue(state) {
  if (!state || typeof state !== "object") {
    return [];
  }

  if (!Array.isArray(state.deferredCommunityQueue)) {
    state.deferredCommunityQueue = [];
  }

  return state.deferredCommunityQueue;
}

function setLastEvent(state, event) {
  if (!state) return null;

  state.lastEvent = event ? clone(event) : null;
  return state.lastEvent;
}

function setLastOverlay(state, overlay) {
  if (!state) return null;

  state.lastOverlay = overlay ? clone(overlay) : null;
  return state.lastOverlay;
}

function setQueueSize(state, size) {
  if (!state) return 0;

  const safeSize = Number.isFinite(Number(size)) ? Number(size) : 0;
  state.queueSize = Math.max(0, safeSize);
  return state.queueSize;
}

function setLastChatMessage(state, text) {
  if (!state) return null;

  const safeText =
    typeof text === "string" && text.trim()
      ? text.trim()
      : null;

  state.lastChatMessage = safeText;
  return safeText;
}

function getNextRotationIndex(state, key, poolLength) {
  if (!state) return 0;
  if (!state.rotationIndex || typeof state.rotationIndex !== "object") {
    state.rotationIndex = {};
  }

  const safeKey = safeString(key, "default");
  const safePoolLength = Math.max(1, toNumber(poolLength, 1));
  const current = toNumber(state.rotationIndex[safeKey], 0);
  const next = ((current % safePoolLength) + safePoolLength) % safePoolLength;

  state.rotationIndex[safeKey] = (next + 1) % safePoolLength;
  return next;
}

function getLastText(state, speaker) {
  if (!state) return "";
  if (!state.lastTexts || typeof state.lastTexts !== "object") {
    state.lastTexts = {};
  }

  return safeString(state.lastTexts[safeString(speaker, "default")]);
}

function setLastText(state, speaker, text) {
  if (!state) return "";
  if (!state.lastTexts || typeof state.lastTexts !== "object") {
    state.lastTexts = {};
  }

  const safeSpeaker = safeString(speaker, "default");
  const safeText =
    typeof text === "string" && text.trim()
      ? text.trim()
      : null;

  state.lastTexts[safeSpeaker] = safeText;
  return safeText;
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

function hasRecentChatSignature(state, signature, windowMs = 8000) {
  if (!state) return false;

  const safeSignature = safeString(signature);
  if (!safeSignature) return false;

  if (!state.recentChatSignatures || typeof state.recentChatSignatures !== "object") {
    state.recentChatSignatures = {};
  }

  pruneSignatureMap(state.recentChatSignatures, windowMs);

  const lastTs = toNumber(state.recentChatSignatures[safeSignature], 0);
  if (!lastTs) return false;

  return nowTs() - lastTs < Math.max(0, toNumber(windowMs, 0));
}

function markRecentChatSignature(state, signature, ts = nowTs()) {
  if (!state) return null;

  const safeSignature = safeString(signature);
  if (!safeSignature) return null;

  if (!state.recentChatSignatures || typeof state.recentChatSignatures !== "object") {
    state.recentChatSignatures = {};
  }

  state.recentChatSignatures[safeSignature] = toNumber(ts, nowTs());
  return state.recentChatSignatures[safeSignature];
}

function hasRecentSupportSignature(state, signature, windowMs = 4000) {
  if (!state) return false;

  const safeSignature = safeString(signature);
  if (!safeSignature) return false;

  if (!state.recentSupportSignatures || typeof state.recentSupportSignatures !== "object") {
    state.recentSupportSignatures = {};
  }

  pruneSignatureMap(state.recentSupportSignatures, windowMs);

  const lastTs = toNumber(state.recentSupportSignatures[safeSignature], 0);
  if (!lastTs) return false;

  return nowTs() - lastTs < Math.max(0, toNumber(windowMs, 0));
}

function markRecentSupportSignature(state, signature, ts = nowTs()) {
  if (!state) return null;

  const safeSignature = safeString(signature);
  if (!safeSignature) return null;

  if (!state.recentSupportSignatures || typeof state.recentSupportSignatures !== "object") {
    state.recentSupportSignatures = {};
  }

  state.recentSupportSignatures[safeSignature] = toNumber(ts, nowTs());
  return state.recentSupportSignatures[safeSignature];
}

function setLastOverlayDecision(state, decision) {
  if (!state) return null;

  state.lastOverlayDecision = decision ? clone(decision) : null;
  return state.lastOverlayDecision;
}

function getTierRank(tier) {
  const safeTier = safeString(tier, "T1").toUpperCase();
  if (safeTier === "T3") return 3;
  if (safeTier === "T2") return 2;
  return 1;
}

function resetSupportBurst(state) {
  if (!state) return createEmptySupportBurst();

  state.supportBurst = createEmptySupportBurst();
  return clone(state.supportBurst);
}

function getSupportBurst(state) {
  if (!state) return createEmptySupportBurst();
  if (!state.supportBurst || typeof state.supportBurst !== "object") {
    state.supportBurst = createEmptySupportBurst();
  }
  return state.supportBurst;
}

function applySupportBurst(state, payload = {}, options = {}) {
  if (!state) return createEmptySupportBurst();

  const burstWindowMs = Math.max(0, toNumber(options.burstWindowMs, 5000));
  const ts = toNumber(payload.ts, nowTs());
  const tier = safeString(payload.tier, "T1").toUpperCase();
  const totalCoins = Math.max(
    0,
    toNumber(payload.totalCoins, payload.rawValue || payload.coins || 0)
  );
  const giftName = safeString(payload.giftName);
  const userLabel = safeString(payload.userLabel);

  const current = getSupportBurst(state);
  const shouldReset =
    !toNumber(current.updatedAt, 0) ||
    ts - toNumber(current.updatedAt, 0) > burstWindowMs;

  if (shouldReset) {
    state.supportBurst = {
      startedAt: ts,
      updatedAt: ts,
      count: 1,
      totalCoins,
      highestTier: tier,
      lastGiftName: giftName,
      lastUserLabel: userLabel
    };

    return clone(state.supportBurst);
  }

  current.updatedAt = ts;
  current.count = Math.max(1, toNumber(current.count, 1)) + 1;
  current.totalCoins = Math.max(0, toNumber(current.totalCoins, 0)) + totalCoins;

  if (getTierRank(tier) > getTierRank(current.highestTier)) {
    current.highestTier = tier;
  }

  if (giftName) current.lastGiftName = giftName;
  if (userLabel) current.lastUserLabel = userLabel;

  return clone(current);
}

function buildDeferredOverlayKey(entry = {}) {
  const overlay = entry.overlayPayload || {};

  return [
    safeString(entry.route, "community").toLowerCase(),
    safeString(entry.owner || overlay.owner || overlay.creature).toLowerCase(),
    safeString(overlay.text),
    safeString(overlay.action),
    safeString(overlay.type),
    String(toNumber(entry.overlayControl?.priority, overlay.priority || 0))
  ].join("|");
}

function pruneDeferredCommunityQueue(state, options = {}) {
  if (!state) return [];

  const queue = ensureDeferredCommunityQueue(state);
  const maxAgeMs = Math.max(0, toNumber(options.maxAgeMs, 15000));
  const now = nowTs();

  const kept = queue.filter((item) => {
    const expiresAt = toNumber(item.expiresAt, 0);
    const queuedAt = toNumber(item.queuedAt, 0);

    if (expiresAt > now) return true;
    if (!expiresAt && queuedAt >= now - maxAgeMs) return true;
    return false;
  });

  state.deferredCommunityQueue = kept;
  setQueueSize(state, kept.length);

  return state.deferredCommunityQueue;
}

function enqueueDeferredCommunityOverlay(state, payload = {}, options = {}) {
  if (!state) return null;

  pruneDeferredCommunityQueue(state, {
    maxAgeMs: Number(options.maxAgeMs || 15000)
  });

  const queue = ensureDeferredCommunityQueue(state);
  const ts = nowTs();
  const maxItems = Math.max(1, toNumber(options.maxItems, 6));
  const maxAgeMs = Math.max(0, toNumber(options.maxAgeMs, 15000));

  const entry = {
    id: safeString(
      payload.id,
      `deferred_overlay_${ts}_${Math.random().toString(36).slice(2, 8)}`
    ),
    queuedAt: ts,
    expiresAt: ts + maxAgeMs,
    route: safeString(payload.route, "community").toLowerCase(),
    owner: safeString(payload.owner, "").toLowerCase(),
    reason: safeString(payload.reason, "deferred"),
    overlayPayload: payload.overlayPayload ? clone(payload.overlayPayload) : null,
    overlayControl: payload.overlayControl ? clone(payload.overlayControl) : {},
    meta: payload.meta ? clone(payload.meta) : {}
  };

  const dedupeKey = buildDeferredOverlayKey(entry);
  const existingIndex = queue.findIndex(
    (item) => buildDeferredOverlayKey(item) === dedupeKey
  );

  if (existingIndex >= 0) {
    queue[existingIndex] = {
      ...queue[existingIndex],
      queuedAt: entry.queuedAt,
      expiresAt: entry.expiresAt,
      reason: entry.reason,
      overlayPayload: entry.overlayPayload,
      overlayControl: entry.overlayControl,
      meta: entry.meta
    };

    setQueueSize(state, queue.length);
    return clone(queue[existingIndex]);
  }

  queue.push(entry);

  while (queue.length > maxItems) {
    queue.shift();
  }

  setQueueSize(state, queue.length);
  return clone(entry);
}

function peekDeferredCommunityOverlay(state, options = {}) {
  if (!state) return null;

  pruneDeferredCommunityQueue(state, options);
  const queue = ensureDeferredCommunityQueue(state);

  if (!queue.length) return null;
  return clone(queue[0]);
}

function shiftDeferredCommunityOverlay(state, options = {}) {
  if (!state) return null;

  pruneDeferredCommunityQueue(state, options);
  const queue = ensureDeferredCommunityQueue(state);

  if (!queue.length) {
    setQueueSize(state, 0);
    return null;
  }

  const item = queue.shift();
  setQueueSize(state, queue.length);
  return clone(item);
}

function clearDeferredCommunityQueue(state) {
  if (!state) return [];

  state.deferredCommunityQueue = [];
  setQueueSize(state, 0);
  return [];
}

function getDeferredCommunityQueue(state) {
  if (!state) return [];
  return clone(ensureDeferredCommunityQueue(state));
}

function ensureAvatarRuntime(state) {
  if (!state || typeof state !== "object") {
    return {
      lastUpdatedAt: 0,
      currentActions: [],
      recentActions: []
    };
  }

  if (!state.avatarRuntime || typeof state.avatarRuntime !== "object") {
    state.avatarRuntime = {
      lastUpdatedAt: 0,
      currentActions: [],
      recentActions: []
    };
  }

  if (!Array.isArray(state.avatarRuntime.currentActions)) {
    state.avatarRuntime.currentActions = [];
  }

  if (!Array.isArray(state.avatarRuntime.recentActions)) {
    state.avatarRuntime.recentActions = [];
  }

  return state.avatarRuntime;
}

function setAvatarActions(state, actions = [], options = {}) {
  if (!state) return [];

  const runtime = ensureAvatarRuntime(state);
  const ts = nowTs();
  const maxRecent = Math.max(1, toNumber(options.maxRecent, 12));
  const safeActions = Array.isArray(actions)
    ? actions
        .filter((item) => item && typeof item === "object")
        .map((item) => clone(item))
    : [];

  runtime.lastUpdatedAt = ts;
  runtime.currentActions = safeActions;

  safeActions.forEach((action) => {
    runtime.recentActions.push({
      ts,
      action
    });
  });

  while (runtime.recentActions.length > maxRecent) {
    runtime.recentActions.shift();
  }

  return clone(runtime.currentActions);
}

function clearAvatarActions(state) {
  if (!state) return [];

  const runtime = ensureAvatarRuntime(state);
  runtime.lastUpdatedAt = nowTs();
  runtime.currentActions = [];
  return [];
}

function getAvatarRuntimeSnapshot(state) {
  if (!state) {
    return clone(createOutputState().avatarRuntime);
  }

  return clone(ensureAvatarRuntime(state));
}

function getOutputStateSnapshot(state) {
  return clone(state || createOutputState());
}

function markOutputEvent(state, { event = null, overlay = null, queueSize, chatMessage = null } = {}) {
  if (!state) return null;

  if (event !== undefined) setLastEvent(state, event);
  if (overlay !== undefined) setLastOverlay(state, overlay);
  if (queueSize !== undefined) setQueueSize(state, queueSize);
  if (chatMessage !== undefined) setLastChatMessage(state, chatMessage);

  return getOutputStateSnapshot(state);
}

function resetOutputState(state) {
  if (!state) return createOutputState();

  const fresh = createOutputState();

  state.lastEvent = fresh.lastEvent;
  state.lastOverlay = fresh.lastOverlay;
  state.queueSize = fresh.queueSize;
  state.lastChatMessage = fresh.lastChatMessage;
  state.rotationIndex = fresh.rotationIndex;
  state.lastTexts = fresh.lastTexts;
  state.recentChatSignatures = fresh.recentChatSignatures;
  state.recentSupportSignatures = fresh.recentSupportSignatures;
  state.lastOverlayDecision = fresh.lastOverlayDecision;
  state.supportBurst = fresh.supportBurst;
  state.deferredCommunityQueue = fresh.deferredCommunityQueue;
  state.avatarRuntime = fresh.avatarRuntime;

  return state;
}

module.exports = {
  createOutputState,
  setLastEvent,
  setLastOverlay,
  setQueueSize,
  setLastChatMessage,
  getNextRotationIndex,
  getLastText,
  setLastText,
  hasRecentChatSignature,
  markRecentChatSignature,
  hasRecentSupportSignature,
  markRecentSupportSignature,
  setLastOverlayDecision,
  getSupportBurst,
  applySupportBurst,
  resetSupportBurst,
  getDeferredCommunityQueue,
  pruneDeferredCommunityQueue,
  enqueueDeferredCommunityOverlay,
  peekDeferredCommunityOverlay,
  shiftDeferredCommunityOverlay,
  clearDeferredCommunityQueue,
  setAvatarActions,
  clearAvatarActions,
  getAvatarRuntimeSnapshot,
  getOutputStateSnapshot,
  markOutputEvent,
  resetOutputState
};