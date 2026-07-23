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
let saveTimer = null;
let dirty = false;
let lastPayload = null;
let intervalHandle = null;

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

function writePayload(payload) {
  ensureDir(storePath);
  const tmp = `${storePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), "utf8");
  fs.renameSync(tmp, storePath);
  lastPayload = payload;
}

function loadRuntimeState(filePath = storePath) {
  storePath = filePath || DEFAULT_PATH;
  if (!fs.existsSync(storePath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(storePath, "utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    lastPayload = parsed;
    return parsed;
  } catch (_err) {
    return null;
  }
}

/**
 * Merge critical bits into an existing koj seed without replacing kojnozout-state.json.
 */
function composeKojSeed(kojPersistedSeed = {}, runtimeState = null) {
  const seed = { ...(kojPersistedSeed || {}) };
  const rs = runtimeState || loadRuntimeState();
  if (!rs || typeof rs !== "object") return seed;

  const rsUpdated = toNumber(rs.updatedAt, 0);
  const seedUpdated = toNumber(seed.updatedAt ?? seed.lastFedAt, 0);

  // Prefer runtime-state only when it looks fresher or seed is empty of bowl.
  const seedBowl = toNumber(seed.bowlPercent ?? seed.bowlFillPercent, 0);
  const useRuntime =
    (rs.koj && typeof rs.koj === "object" && Object.keys(rs.koj).length > 0) &&
    (rsUpdated >= seedUpdated || seedBowl <= 0);

  if (!useRuntime) return seed;

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
  storePath = options.filePath || storePath || DEFAULT_PATH;
  const payload = buildPayload(input);
  try {
    writePayload(payload);
    dirty = false;
    return { ok: true, path: storePath, updatedAt: payload.updatedAt };
  } catch (err) {
    dirty = true;
    return { ok: false, error: err.message };
  }
}

function scheduleSaveRuntimeState(input = {}, options = {}) {
  lastPayload = buildPayload(input);
  dirty = true;
  const delayMs = Math.max(250, toNumber(options.delayMs, 2000));
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (!dirty || !lastPayload) return;
    try {
      writePayload(lastPayload);
      dirty = false;
    } catch (_err) {
      dirty = true;
    }
  }, delayMs);
  if (typeof saveTimer.unref === "function") saveTimer.unref();
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
  flushRuntimeState,
  startRuntimeStateInterval,
  stopRuntimeStateInterval,
  getLastRuntimeState,
  getRuntimeStatePath,
  buildPayload,
  pickKojCritical
};
