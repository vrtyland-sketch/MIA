"use strict";

/**
 * Phase 1 — runtime state persistence.
 * Writes data/runtime-state.json (bowl + Koj critical + queue snapshot).
 * Does NOT wipe data/kojnozout-state.json — references it and may compose fields.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_PATH = path.join(ROOT, "data", "runtime-state.json");
const KOJ_REF = "data/kojnozout-state.json";

const KOJ_CRITICAL_FIELDS = [
  "bowlPercent",
  "bowlFillPercent",
  "bowlState",
  "bowlVisualLevel",
  "feedPoints",
  "hunger",
  "energy",
  "mood",
  "stage",
  "behavior",
  "evolutionTier",
  "socialState",
  "isSleeping",
  "lastFedAt",
  "lastDecayAt",
  "vitals",
  "affliction",
  "bond",
  "robotModes",
  "fatigue",
  "techCharge"
];

let storePath = DEFAULT_PATH;
let payloadPath = null;
let pendingPath = null;
let saveTimer = null;
let dirty = false;
let lastPayload = null;
let intervalHandle = null;

const ANNOTATION_GUARDED_FIELDS = new Set([
  "version",
  "updatedAt",
  "kojRef",
  "koj",
  "bowl",
  "queue"
]);

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pickKojCritical(koj = {}) {
  const out = {};
  for (const field of KOJ_CRITICAL_FIELDS) {
    if (koj[field] !== undefined && koj[field] !== null) {
      out[field] = koj[field];
    }
  }
  return out;
}

function extractBowl(koj = {}, streamState = {}) {
  return {
    bowlPercent: toNumber(
      koj.bowlPercent ?? koj.bowlFillPercent ?? streamState.bowlPercent,
      0
    ),
    bowlFillPercent: toNumber(koj.bowlFillPercent ?? koj.bowlPercent, 0),
    bowlState: koj.bowlState || streamState.bowlState || null,
    bowlVisualLevel: koj.bowlVisualLevel ?? null
  };
}

function buildPayload({
  koj = {},
  streamState = {},
  queueSnapshot = null,
  extra = {}
} = {}) {
  return {
    version: 1,
    updatedAt: Date.now(),
    kojRef: KOJ_REF,
    bowl: extractBowl(koj, streamState),
    koj: pickKojCritical(koj),
    queue: queueSnapshot && typeof queueSnapshot === "object" ? queueSnapshot : null,
    ...extra
  };
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function samePath(left, right) {
  if (!left || !right) return false;
  return path.resolve(left) === path.resolve(right);
}

function readRuntimeFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed;
  } catch (_err) {
    return null;
  }
}

function commitPayload(filePath, payload) {
  ensureDir(filePath);
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
  lastPayload = payload;
  storePath = filePath;
  payloadPath = filePath;
}

function loadRuntimeState(filePath = storePath) {
  const requested = path.resolve(filePath || storePath || DEFAULT_PATH);
  const owned = path.resolve(payloadPath || storePath || DEFAULT_PATH);
  const pendingSameStore = Boolean(dirty && lastPayload && owned === requested);

  if (dirty && lastPayload && owned !== requested) {
    return readRuntimeFile(requested);
  }

  if (!pendingSameStore) storePath = requested;
  const parsed = readRuntimeFile(requested);
  if (!pendingSameStore && parsed) {
    lastPayload = parsed;
    payloadPath = requested;
  }
  return parsed;
}

function applyAnnotation(payload, metadata) {
  const next = { ...payload };
  for (const [key, value] of Object.entries(metadata || {})) {
    if (ANNOTATION_GUARDED_FIELDS.has(key)) continue;
    next[key] = value;
  }
  next.updatedAt = payload.updatedAt;
  return next;
}

function armSaveTimer(delayMs) {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (!dirty || !lastPayload) return;
    const target = pendingPath || payloadPath || storePath;
    try {
      commitPayload(target, lastPayload);
      dirty = false;
      pendingPath = null;
    } catch (_err) {
      dirty = true;
    }
  }, delayMs);
  if (typeof saveTimer.unref === "function") saveTimer.unref();
}

/**
 * Attach metadata onto the current runtime snapshot without rebuilding Koj,
 * bowl, or queue and without moving updatedAt. A dirty pending snapshot stays
 * the in-memory authority. No file and no payload means nothing is created.
 */
function annotateRuntimeState(metadata = {}, options = {}) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { ok: false, reason: "no_metadata" };
  }

  if (dirty && lastPayload) {
    lastPayload = applyAnnotation(lastPayload, metadata);
    return { ok: true, pending: true, updatedAt: lastPayload.updatedAt };
  }

  const active = path.resolve(storePath || DEFAULT_PATH);
  const owned = payloadPath ? path.resolve(payloadPath) : null;
  let base = lastPayload && owned === active ? lastPayload : null;
  if (!base) {
    base = readRuntimeFile(active);
    if (!base) return { ok: false, reason: "no_runtime_state" };
  }

  lastPayload = applyAnnotation(base, metadata);
  storePath = active;
  payloadPath = active;
  pendingPath = active;
  dirty = true;
  armSaveTimer(Math.max(250, toNumber(options.delayMs, 800)));
  return { ok: true, pending: true, updatedAt: lastPayload.updatedAt };
}

function persistenceClock(value) {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Merge critical bits into an existing koj seed without replacing kojnozout-state.json.
 * Runtime-state wins only when its koj snapshot is non-empty and its updatedAt is
 * greater than or equal to the persisted file updatedAt. Explicit bowl 0 is a real
 * value. A missing bowl field is not a missing snapshot, and lastFedAt is not the clock.
 */
function composeKojSeed(kojPersistedSeed = {}, runtimeState = null) {
  const seed = { ...(kojPersistedSeed || {}) };
  const rs = runtimeState || loadRuntimeState();
  if (!rs || typeof rs !== "object") return seed;

  const hasRuntimeKoj =
    rs.koj && typeof rs.koj === "object" && Object.keys(rs.koj).length > 0;
  if (!hasRuntimeKoj) return seed;

  const rsUpdated = persistenceClock(rs.updatedAt);
  const seedUpdated = persistenceClock(seed.updatedAt);
  if (rsUpdated < seedUpdated) return seed;

  for (const field of KOJ_CRITICAL_FIELDS) {
    if (rs.koj[field] !== undefined) seed[field] = rs.koj[field];
  }
  if (rs.bowl && typeof rs.bowl === "object") {
    for (const [k, v] of Object.entries(rs.bowl)) {
      if (v !== undefined && v !== null) seed[k] = v;
    }
  }
  return seed;
}

function saveRuntimeState(input = {}, options = {}) {
  storePath = path.resolve(options.filePath || storePath || DEFAULT_PATH);
  const payload = buildPayload(input);
  try {
    commitPayload(storePath, payload);
    dirty = false;
    pendingPath = null;
    return { ok: true, path: storePath, updatedAt: payload.updatedAt };
  } catch (err) {
    dirty = true;
    return { ok: false, error: err.message };
  }
}

function scheduleSaveRuntimeState(input = {}, options = {}) {
  storePath = path.resolve(options.filePath || storePath || DEFAULT_PATH);
  payloadPath = storePath;
  pendingPath = storePath;
  lastPayload = buildPayload(input);
  dirty = true;
  armSaveTimer(Math.max(250, toNumber(options.delayMs, 2000)));
}

function flushRuntimeState(input = null) {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (input) lastPayload = buildPayload(input);
  if (!lastPayload) return { ok: false, error: "nothing_to_flush" };
  return saveRuntimeState(
    {
      koj: lastPayload.koj,
      streamState: { bowlPercent: lastPayload.bowl?.bowlPercent },
      queueSnapshot: lastPayload.queue
    },
    { filePath: storePath }
  );
}

function startRuntimeStateInterval(getSnapshot, intervalMs = 8000) {
  stopRuntimeStateInterval();
  const ms = Math.max(3000, toNumber(intervalMs, 8000));
  intervalHandle = setInterval(() => {
    try {
      const snap = typeof getSnapshot === "function" ? getSnapshot() : getSnapshot;
      if (snap) scheduleSaveRuntimeState(snap, { delayMs: 500 });
    } catch (_err) {
      /* ignore */
    }
  }, ms);
  if (typeof intervalHandle.unref === "function") intervalHandle.unref();
  return intervalHandle;
}

function stopRuntimeStateInterval() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

function getLastRuntimeState() {
  return lastPayload;
}

function getRuntimeStatePath() {
  return storePath;
}

module.exports = {
  DEFAULT_PATH,
  KOJ_REF,
  KOJ_CRITICAL_FIELDS,
  loadRuntimeState,
  composeKojSeed,
  saveRuntimeState,
  scheduleSaveRuntimeState,
  annotateRuntimeState,
  flushRuntimeState,
  startRuntimeStateInterval,
  stopRuntimeStateInterval,
  getLastRuntimeState,
  getRuntimeStatePath,
  buildPayload,
  pickKojCritical
};
