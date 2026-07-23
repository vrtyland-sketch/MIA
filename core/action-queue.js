"use strict";

/**
 * Phase 1 / Post-DoD — Action Queue (roadmap §3) + production harden.
 *
 * Priorities (higher wins):
 *   technical_error 100 · T4/big gift 90 · battle 85 · T3 70 · T2 60 ·
 *   mia_direct 50 · T1 40 · idle 10
 *
 * Enable (default OFF — not soak-default):
 *   MIA_ACTION_QUEUE=1 | runtimeConfig.phase1.actionQueue.enabled |
 *   admin toggle (data/mia-action-queue.json + process override)
 * Kill switch: MIA_ACTION_QUEUE=0 always wins.
 *
 * Full routing flag: MIA_ACTION_QUEUE_FULL=1 or actionQueue.fullRouting
 */

const fs = require("fs");
const path = require("path");

const PRIORITY = Object.freeze({
  technical_error: 100,
  t4_gift: 90,
  battle_result: 85,
  t3_gift: 70,
  t2_gift: 60,
  mia_direct: 50,
  t1_gift: 40,
  idle: 10
});

const DEFAULT_COALESCE_MS = 2500;
const STATE_PATH = path.join(__dirname, "..", "data", "mia-action-queue.json");

/** @type {null|boolean} process override from admin (null = unset) */
let runtimeOverride = null;
let diskStateCache = null;

function envFlag(name) {
  const v = String(process.env[name] || "").trim().toLowerCase();
  if (!v) return null;
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return null;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resolveActionQueueConfig(runtimeConfig = {}) {
  return (
    runtimeConfig?.phase1?.actionQueue ||
    runtimeConfig?.actionQueue ||
    runtimeConfig?.postDod?.actionQueue ||
    {}
  );
}

function loadDiskState() {
  if (diskStateCache) return diskStateCache;
  try {
    if (!fs.existsSync(STATE_PATH)) return null;
    const parsed = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    diskStateCache = {
      enabled: parsed.enabled === true,
      updatedAt: Number(parsed.updatedAt) || 0
    };
    return diskStateCache;
  } catch (_err) {
    return null;
  }
}

function saveDiskState(state) {
  try {
    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
    const next = {
      enabled: state.enabled === true,
      updatedAt: Date.now()
    };
    fs.writeFileSync(STATE_PATH, JSON.stringify(next, null, 2), "utf8");
    diskStateCache = next;
    return next;
  } catch (_err) {
    diskStateCache = {
      enabled: state.enabled === true,
      updatedAt: Date.now()
    };
    return diskStateCache;
  }
}

/**
 * Default OFF. Kill switch MIA_ACTION_QUEUE=0 wins over config/admin.
 */
function isActionQueueEnabled(runtimeConfig = {}) {
  const env = envFlag("MIA_ACTION_QUEUE");
  if (env === false) return false;
  if (env === true) return true;
  if (envFlag("MIA_ACTION_QUEUE_FULL") === true) return true;

  if (runtimeOverride !== null) return runtimeOverride === true;

  const disk = loadDiskState();
  if (disk && typeof disk.enabled === "boolean" && disk.updatedAt > 0) {
    return disk.enabled === true;
  }

  const cfg = resolveActionQueueConfig(runtimeConfig);
  if (cfg && cfg.enabled === true) return true;
  return false;
}

function isFullRoutingEnabled(runtimeConfig = {}) {
  if (envFlag("MIA_ACTION_QUEUE_FULL") === true) return true;
  if (envFlag("MIA_ACTION_QUEUE_FULL") === false) return false;
  const cfg = resolveActionQueueConfig(runtimeConfig);
  return cfg?.fullRouting === true;
}

/**
 * Live toggle without env restart. Kill switch still overrides reads.
 * Mutates runtimeConfig.phase1.actionQueue.enabled when object is provided.
 */
function setActionQueueEnabled(enabled, runtimeConfig = null) {
  const next = enabled === true;
  runtimeOverride = next;
  saveDiskState({ enabled: next });

  if (runtimeConfig && typeof runtimeConfig === "object") {
    if (!runtimeConfig.phase1 || typeof runtimeConfig.phase1 !== "object") {
      runtimeConfig.phase1 = {};
    }
    if (
      !runtimeConfig.phase1.actionQueue ||
      typeof runtimeConfig.phase1.actionQueue !== "object"
    ) {
      runtimeConfig.phase1.actionQueue = {};
    }
    runtimeConfig.phase1.actionQueue.enabled = next;
  }

  const kill = envFlag("MIA_ACTION_QUEUE") === false;
  return {
    ok: true,
    enabled: isActionQueueEnabled(runtimeConfig || {}),
    requested: next,
    killSwitch: kill,
    note: kill
      ? "Saved, but MIA_ACTION_QUEUE=0 kill switch keeps queue OFF"
      : next
        ? "Action Queue ON (no restart needed)"
        : "Action Queue OFF"
  };
}

function clearActionQueueOverrideForTest() {
  runtimeOverride = null;
  // Force-ignore on-disk admin toggle for isolated contract tests.
  diskStateCache = { enabled: false, updatedAt: 0 };
}

function resolvePriorityFromTier(tier) {
  const t = safeString(tier).toUpperCase();
  if (t === "T6" || t === "T5" || t === "T4") return PRIORITY.t4_gift;
  if (t === "T3") return PRIORITY.t3_gift;
  if (t === "T2") return PRIORITY.t2_gift;
  if (t === "T1" || t === "T0") return PRIORITY.t1_gift;
  return PRIORITY.mia_direct;
}

/**
 * Director intensity bumps speak priority so high-spectacle gifts preempt calm thanks.
 */
function applyDirectorIntensityToPriority(basePriority, intensity) {
  const base = toNumber(basePriority, PRIORITY.mia_direct);
  const i = clamp(toNumber(intensity, 0), 0, 1);
  if (i >= 0.9) return Math.max(base, PRIORITY.t4_gift);
  if (i >= 0.7) return Math.max(base, PRIORITY.t3_gift);
  if (i >= 0.55) return Math.max(base, PRIORITY.t2_gift);
  return base;
}

function resolveSpeakPriority(plan = {}, actionResult = {}) {
  if (plan.priority != null) {
    return applyDirectorIntensityToPriority(
      plan.priority,
      plan.directorIntensity ?? plan.director?.intensity ?? actionResult?.meta?.miaDirection?.intensity
    );
  }
  if (actionResult?.meta?.priority != null) {
    return applyDirectorIntensityToPriority(
      actionResult.meta.priority,
      actionResult?.meta?.miaDirection?.intensity
    );
  }
  const tier =
    plan.tier ||
    actionResult?.meta?.streamTier ||
    actionResult?.support?.streamTier ||
    actionResult?.meta?.tier;
  let priority = tier ? resolvePriorityFromTier(tier) : PRIORITY.mia_direct;
  if (plan.kind === "idle" || plan.source === "idle") priority = PRIORITY.idle;
  if (plan.kind === "battle" || plan.source === "battle") {
    priority = PRIORITY.battle_result;
  }
  if (plan.preempt || actionResult?.voicePreempt || actionResult?.meta?.miaInterrupt) {
    priority = Math.max(priority, PRIORITY.t4_gift);
  }
  const intensity =
    plan.directorIntensity ??
    plan.director?.intensity ??
    actionResult?.meta?.miaDirection?.intensity ??
    plan.intensity;
  return applyDirectorIntensityToPriority(priority, intensity);
}

function resolveCoalesceWindowMs(plan = {}, runtimeConfig = {}, fallback = DEFAULT_COALESCE_MS) {
  const fromDirector =
    plan.directorCoalesceMs ??
    plan.director?.coalescePolicy?.windowMs ??
    plan.coalesceWindowMs;
  if (fromDirector != null) return Math.max(200, toNumber(fromDirector, fallback));
  const cfg = resolveActionQueueConfig(runtimeConfig);
  if (cfg?.coalesceWindowMs != null) {
    return Math.max(200, toNumber(cfg.coalesceWindowMs, fallback));
  }
  return Math.max(200, toNumber(fallback, DEFAULT_COALESCE_MS));
}

function createActionQueue(options = {}) {
  let coalesceWindowMs = Math.max(
    200,
    toNumber(options.coalesceWindowMs, DEFAULT_COALESCE_MS)
  );
  const maxSize = Math.max(1, toNumber(options.maxSize, 64));
  /** @type {Array<object>} */
  let items = [];
  let seq = 0;
  let current = null;

  function snapshot() {
    return {
      size: items.filter((item) => item.delivered !== true).length,
      pending: items.length,
      current: current
        ? { id: current.id, type: current.type, priority: current.priority }
        : null,
      items: items.map((item) => ({
        id: item.id,
        type: item.type,
        priority: item.priority,
        coalesceKey: item.coalesceKey || null,
        enqueuedAt: item.enqueuedAt
      })),
      coalesceWindowMs
    };
  }

  function sortQueue() {
    items.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.seq - b.seq;
    });
  }

  function canInterrupt(incoming, running) {
    if (!running) return true;
    if (incoming.interrupt === false) return false;
    const inPri = toNumber(incoming.priority, 0);
    const runPri = toNumber(running.priority, 0);
    if (inPri >= PRIORITY.t4_gift && inPri > runPri) return true;
    if (incoming.preempt === true && inPri >= runPri) return true;
    // Director high intensity / spectacle cue
    const intensity = toNumber(incoming.directorIntensity ?? incoming.payload?.directorIntensity, 0);
    if (intensity >= 0.85 && inPri > runPri) return true;
    return false;
  }

  function pruneStale(now = Date.now()) {
    const keepMs = Math.max(coalesceWindowMs * 2, 5000);
    items = items.filter((item) => {
      if (!item.coalesceKey) return true;
      if (item.delivered === true) return now - item.updatedAt <= keepMs;
      return true;
    });
    if (items.length > maxSize) {
      items = items
        .filter((item) => item.delivered !== true)
        .concat(items.filter((item) => item.delivered === true));
      while (items.length > maxSize) items.pop();
    }
  }

  function effectiveCoalesceMs(action) {
    const fromAction =
      action.coalesceWindowMs ??
      action.payload?.directorCoalesceMs ??
      action.payload?.coalesceWindowMs;
    if (fromAction != null) return Math.max(200, toNumber(fromAction, coalesceWindowMs));
    return coalesceWindowMs;
  }

  function coalesceSpamGifts(action) {
    pruneStale();
    if (!action.coalesceKey) return null;
    const now = Date.now();
    const windowMs = effectiveCoalesceMs(action);
    const existing = items.find(
      (item) =>
        item.coalesceKey === action.coalesceKey &&
        item.delivered !== true &&
        now - item.enqueuedAt <= windowMs
    );
    if (!existing) return null;

    existing.count = toNumber(existing.count, 1) + toNumber(action.count, 1);
    existing.priority = Math.max(existing.priority, action.priority);
    existing.directorIntensity = Math.max(
      toNumber(existing.directorIntensity, 0),
      toNumber(action.directorIntensity, 0)
    );
    existing.payload = {
      ...existing.payload,
      ...action.payload,
      coalescedCount: existing.count,
      lastText: action.payload?.text || existing.payload?.lastText
    };
    if (action.preempt === true) existing.preempt = true;
    existing.updatedAt = now;
    sortQueue();
    return existing;
  }

  function isCoalesceType(type) {
    const t = safeString(type).toLowerCase();
    return (
      t === "tts_speak" ||
      t === "gift_thanks" ||
      t === "speak" ||
      t === "gift_present" ||
      t === "gift_stage"
    );
  }

  function enqueue(input = {}) {
    const now = Date.now();
    pruneStale(now);
    const action = {
      id: safeString(input.id) || `aq-${Date.now()}-${++seq}`,
      type: safeString(input.type, "generic"),
      priority: toNumber(input.priority, PRIORITY.mia_direct),
      coalesceKey: safeString(input.coalesceKey) || null,
      coalesceWindowMs:
        input.coalesceWindowMs != null ? toNumber(input.coalesceWindowMs) : null,
      count: Math.max(1, toNumber(input.count, 1)),
      preempt: input.preempt === true,
      interrupt: input.interrupt !== false,
      directorIntensity: toNumber(
        input.directorIntensity ?? input.payload?.directorIntensity,
        0
      ),
      payload: input.payload && typeof input.payload === "object" ? input.payload : {},
      enqueuedAt: now,
      updatedAt: now,
      seq: ++seq,
      delivered: false
    };

    if (isCoalesceType(action.type)) {
      const merged = coalesceSpamGifts(action);
      if (merged) {
        return {
          ok: true,
          coalesced: true,
          action: merged,
          interrupted: false,
          dropped: false
        };
      }
    }

    while (items.length >= maxSize) {
      sortQueue();
      const dropped = items.pop();
      if (!dropped) break;
    }

    items.push(action);
    sortQueue();

    let interrupted = false;
    if (current && canInterrupt(action, current)) {
      interrupted = true;
      if (current.interruptible !== false) {
        items.push({
          ...current,
          seq: ++seq,
          enqueuedAt: now,
          requeued: true
        });
        sortQueue();
      }
      current = null;
    }

    return {
      ok: true,
      coalesced: false,
      action,
      interrupted,
      dropped: false
    };
  }

  function markDelivered(id) {
    const item = items.find((x) => x.id === id);
    if (item) {
      item.delivered = true;
      item.updatedAt = Date.now();
    }
    if (current && current.id === id) current = null;
  }

  function dequeue() {
    sortQueue();
    const next = items.shift() || null;
    current = next;
    return next;
  }

  function peek() {
    sortQueue();
    return items[0] || null;
  }

  function clear() {
    items = [];
    current = null;
    return { ok: true, flushed: true, size: 0 };
  }

  function markDone(id) {
    markDelivered(id);
  }

  function size() {
    return items.filter((item) => item.delivered !== true).length;
  }

  function configure(nextOptions = {}) {
    if (nextOptions.coalesceWindowMs != null) {
      coalesceWindowMs = Math.max(200, toNumber(nextOptions.coalesceWindowMs, coalesceWindowMs));
    }
    return { ok: true, coalesceWindowMs };
  }

  return {
    enqueue,
    dequeue,
    peek,
    clear,
    size,
    snapshot,
    markDone,
    markDelivered,
    configure,
    canInterrupt: (incoming, running) =>
      canInterrupt(
        {
          priority: toNumber(incoming?.priority, 0),
          preempt: incoming?.preempt === true,
          interrupt: incoming?.interrupt !== false,
          directorIntensity: incoming?.directorIntensity,
          payload: incoming?.payload
        },
        running
      ),
    get coalesceWindowMs() {
      return coalesceWindowMs;
    }
  };
}

const SPEAK_TYPES = new Set(["tts_speak", "gift_thanks", "speak"]);
const OVERLAY_TYPES = new Set(["overlay", "overlay_action", "overlay_text"]);
const GIFT_PRESENT_TYPES = new Set(["gift_present", "gift_stage"]);

function isSpeakAction(type) {
  return SPEAK_TYPES.has(safeString(type).toLowerCase());
}

function isOverlayAction(type) {
  return OVERLAY_TYPES.has(safeString(type).toLowerCase());
}

function isGiftPresentAction(type) {
  return GIFT_PRESENT_TYPES.has(safeString(type).toLowerCase());
}

/**
 * Single runner that drains speak + overlay + gift-stage cues.
 * Handlers are injected — queue never talks to OBS/TTS directly.
 */
function createActionQueueRunner(queue, handlers = {}) {
  let draining = false;
  let drainTimer = null;
  let processed = 0;
  // handlers may be a shared mutable bag (Object.assign later).
  const bag = handlers && typeof handlers === "object" ? handlers : {};

  async function handleOne(action) {
    const dry = bag.dry === true;
    const type = safeString(action?.type, "generic").toLowerCase();
    if (isSpeakAction(type)) {
      if (typeof bag.speak === "function") {
        return bag.speak(action, { dry });
      }
      return { ok: true, skipped: true, reason: "no_speak_handler" };
    }
    if (isOverlayAction(type)) {
      if (typeof bag.overlay === "function") {
        return bag.overlay(action, { dry });
      }
      return { ok: true, skipped: true, reason: "no_overlay_handler" };
    }
    if (isGiftPresentAction(type)) {
      if (typeof bag.giftPresent === "function") {
        return bag.giftPresent(action, { dry });
      }
      if (typeof bag.generic === "function") {
        return bag.generic(action, { dry });
      }
      return { ok: true, skipped: true, reason: "no_gift_present_handler" };
    }
    if (typeof bag.generic === "function") {
      return bag.generic(action, { dry });
    }
    return { ok: true, skipped: true, reason: "unhandled_type", type };
  }

  async function drainOnce(limit = 32) {
    if (draining) return { ok: true, busy: true, processed: 0 };
    draining = true;
    let count = 0;
    const results = [];
    try {
      const max = Math.max(1, toNumber(limit, 32));
      while (count < max) {
        const next = queue.dequeue();
        if (!next) break;
        if (next.delivered === true) continue;
        let result;
        try {
          result = await handleOne(next);
        } catch (err) {
          result = { ok: false, error: err.message };
          if (typeof bag.onError === "function") {
            try {
              bag.onError(err, next);
            } catch (_err) {
              /* ignore */
            }
          }
        }
        queue.markDone(next.id);
        count += 1;
        processed += 1;
        results.push({ id: next.id, type: next.type, result });
      }
      return { ok: true, processed: count, results };
    } finally {
      draining = false;
    }
  }

  function kick(delayMs = 0) {
    if (drainTimer) return;
    const ms = Math.max(0, toNumber(delayMs, 0));
    drainTimer = setTimeout(() => {
      drainTimer = null;
      void drainOnce().then((summary) => {
        if (queue.size() > 0) kick(40);
        if (typeof bag.onDrain === "function") {
          try {
            bag.onDrain(summary);
          } catch (_err) {
            /* ignore */
          }
        }
      });
    }, ms);
    if (typeof drainTimer.unref === "function") drainTimer.unref();
  }

  function stop() {
    if (drainTimer) {
      clearTimeout(drainTimer);
      drainTimer = null;
    }
  }

  return {
    drainOnce,
    kick,
    stop,
    isDraining: () => draining,
    get processed() {
      return processed;
    }
  };
}

/** Process-wide queue for TTS thank-you / gift-present wiring. */
let sharedQueue = null;
let sharedRunner = null;
/** Mutable handler bag so speak + giftPresent can register independently. */
let sharedRunnerHandlers = null;

function getSharedActionQueue(options = {}) {
  if (!sharedQueue) {
    sharedQueue = createActionQueue(options);
  } else if (options && options.coalesceWindowMs != null) {
    sharedQueue.configure({ coalesceWindowMs: options.coalesceWindowMs });
  }
  return sharedQueue;
}

function getSharedActionQueueRunner(handlers = {}, queueOptions = {}) {
  if (!sharedRunnerHandlers) {
    sharedRunnerHandlers = { ...(handlers || {}) };
  } else if (handlers && typeof handlers === "object") {
    Object.assign(sharedRunnerHandlers, handlers);
  }
  if (!sharedRunner) {
    sharedRunner = createActionQueueRunner(
      getSharedActionQueue(queueOptions),
      sharedRunnerHandlers
    );
  }
  return sharedRunner;
}

function flushSharedActionQueue() {
  const q = getSharedActionQueue();
  const before = q.size();
  q.clear();
  return { ok: true, flushed: true, cleared: before, size: 0 };
}

function resetSharedActionQueueForTest() {
  if (sharedRunner) {
    try {
      sharedRunner.stop();
    } catch (_err) {
      /* ignore */
    }
  }
  sharedRunner = null;
  sharedRunnerHandlers = null;
  sharedQueue = null;
  clearActionQueueOverrideForTest();
}

function getActionQueuePublicSnapshot(runtimeConfig = {}) {
  const q = getSharedActionQueue();
  const snap = q.snapshot();
  const disk = loadDiskState();
  return {
    enabled: isActionQueueEnabled(runtimeConfig),
    fullRouting: isFullRoutingEnabled(runtimeConfig),
    killSwitch: envFlag("MIA_ACTION_QUEUE") === false,
    override: runtimeOverride,
    diskEnabled: disk ? disk.enabled === true : null,
    depth: snap.size,
    snapshot: snap
  };
}

/**
 * Map a unified runtime event → enqueueable action shell (replay / dry apply).
 */
function eventToQueueAction(event = {}, options = {}) {
  const type = safeString(event.type, "unknown").toLowerCase();
  const userKey = safeString(event.user?.id || event.user?.name || "anon", "anon");
  const miaPoints = toNumber(event.gift?.miaPoints ?? event.miaPoints, 0);
  const tier =
    miaPoints >= 7500 ? "T4" : miaPoints >= 1500 ? "T3" : miaPoints >= 150 ? "T2" : "T1";
  const intensity = toNumber(options.directorIntensity ?? event.miaDirection?.intensity, 0);

  if (type === "gift") {
    return {
      type: "tts_speak",
      priority: applyDirectorIntensityToPriority(resolvePriorityFromTier(tier), intensity),
      coalesceKey: `tts:${userKey}:${tier}`,
      coalesceWindowMs: options.coalesceWindowMs || null,
      directorIntensity: intensity,
      count: Math.max(1, toNumber(event.gift?.count, 1)),
      payload: {
        text: options.text || `thanks ${safeString(event.user?.name, "viewer")}`,
        speaker: "mia",
        eventId: event.id || null,
        giftName: event.gift?.name || null,
        miaPoints,
        dry: options.dry === true,
        directorIntensity: intensity
      }
    };
  }

  if (type === "chat" || type === "comment") {
    return {
      type: "overlay",
      priority: PRIORITY.mia_direct,
      coalesceKey: null,
      payload: {
        text: safeString(event.text).slice(0, 120),
        user: event.user?.name || null,
        eventId: event.id || null,
        dry: options.dry === true
      }
    };
  }

  return {
    type: "generic",
    priority: PRIORITY.idle,
    payload: { eventType: type, eventId: event.id || null, dry: options.dry === true }
  };
}

/**
 * Gift animation present cue — queued so spam T1 doesn't stampede OBS gift stage.
 * Coins never included; miaPoints only.
 */
function giftPresentToQueueAction(input = {}, options = {}) {
  const userKey = safeString(
    input.userId || input.userLabel || input.username || "anon",
    "anon"
  );
  const tier = safeString(input.tier, "T1").toUpperCase();
  const giftKey = safeString(input.giftKey || input.giftName, "gift");
  const intensity = toNumber(
    options.directorIntensity ?? input.directorIntensity ?? input.miaDirection?.intensity,
    0
  );
  const miaPoints = toNumber(input.miaPoints, 0);

  return {
    type: "gift_present",
    priority: applyDirectorIntensityToPriority(resolvePriorityFromTier(tier), intensity),
    coalesceKey: `gift_present:${userKey}:${giftKey}:${tier}`,
    coalesceWindowMs: options.coalesceWindowMs || null,
    directorIntensity: intensity,
    preempt: intensity >= 0.85 || ["T4", "T5", "T6"].includes(tier),
    count: 1,
    payload: {
      giftKey,
      giftName: safeString(input.giftName || giftKey),
      userLabel: safeString(input.userLabel || input.username, userKey),
      tier,
      miaPoints,
      avatarUrl: safeString(input.avatarUrl || input.profileImageUrl),
      directorIntensity: intensity,
      giftStageSpectacle: intensity >= 0.7 || ["T3", "T4", "T5", "T6"].includes(tier),
      delivery: input.delivery || null,
      dry: options.dry === true
    }
  };
}

module.exports = {
  PRIORITY,
  DEFAULT_COALESCE_MS,
  isActionQueueEnabled,
  isFullRoutingEnabled,
  setActionQueueEnabled,
  resolvePriorityFromTier,
  resolveSpeakPriority,
  resolveCoalesceWindowMs,
  applyDirectorIntensityToPriority,
  createActionQueue,
  createActionQueueRunner,
  getSharedActionQueue,
  getSharedActionQueueRunner,
  flushSharedActionQueue,
  resetSharedActionQueueForTest,
  clearActionQueueOverrideForTest,
  getActionQueuePublicSnapshot,
  eventToQueueAction,
  giftPresentToQueueAction,
  isSpeakAction,
  isOverlayAction,
  isGiftPresentAction
};
