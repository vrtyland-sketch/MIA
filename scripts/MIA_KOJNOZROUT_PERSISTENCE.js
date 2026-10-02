"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_STORE = path.resolve(__dirname, "..", "data", "kojnozout-state.json");
const SAVE_DEBOUNCE_MS = 2500;

const PERSISTED_FIELDS = [
  "feedPoints",
  "bowlPercent",
  "bowlState",
  "bowlFillPercent",
  "bowlVisualLevel",
  "hunger",
  "energy",
  "socialState",
  "supportBurst",
  "totalFedCoins",
  "totalFeedEvents",
  "totalCommunityPings",
  "lastFedAt",
  "lastPingAt",
  "lastDecayAt",
  "evolutionTier",
  "mood",
  "stage",
  "behavior",
  "vitals",
  "affliction",
  "isSleeping",
  "careQuest",
  "bond",
  "lastCareAt",
  "robotModes",
  "fatigue",
  "techCharge"
];

let storePath = DEFAULT_STORE;
let lastUpdatedAt = 0;
const slots = new Map();

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nextUpdatedAt() {
  const now = Date.now();
  lastUpdatedAt = now > lastUpdatedAt ? now : lastUpdatedAt + 1;
  return lastUpdatedAt;
}

function slotFor(filePath) {
  const key = path.resolve(filePath);
  if (!slots.has(key)) {
    slots.set(key, {
      timer: null,
      pending: null,
      writing: false
    });
  }
  return slots.get(key);
}

function extractPersistedState(state = {}) {
  const payload = {
    version: 1,
    updatedAt: nextUpdatedAt()
  };

  for (const field of PERSISTED_FIELDS) {
    if (state[field] !== undefined && state[field] !== null) {
      payload[field] = state[field];
    }
  }

  return JSON.parse(JSON.stringify(payload));
}

function logicalTime(parsed) {
  return toNumber(parsed && parsed.updatedAt, 0);
}

function readPayload(filePath) {
  if (!fs.existsSync(filePath)) return { missing: true, ok: false, malformed: false };
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { missing: false, ok: false, malformed: true };
    }
    return { missing: false, ok: true, malformed: false, parsed };
  } catch (_err) {
    return { missing: false, ok: false, malformed: true };
  }
}

function chooseNewestPayload(filePath) {
  const primary = readPayload(filePath);
  const backup = readPayload(`${filePath}.bak`);
  const valid = [primary, backup].filter((row) => row.ok).map((row) => row.parsed);
  if (valid.length === 0) return null;
  valid.sort((a, b) => logicalTime(b) - logicalTime(a));
  return valid[0];
}

function fieldsFromPayload(parsed) {
  const seed = {};
  for (const field of PERSISTED_FIELDS) {
    if (parsed[field] !== undefined) seed[field] = parsed[field];
  }
  return seed;
}

function loadPersistedSeed(filePath = DEFAULT_STORE) {
  storePath = filePath || DEFAULT_STORE;
  const chosen = chooseNewestPayload(storePath);
  if (!chosen) return {};
  return fieldsFromPayload(chosen);
}

function writeAllSync(fd, body) {
  const buffer = Buffer.from(body, "utf8");
  let offset = 0;
  while (offset < buffer.length) {
    const written = fs.writeSync(fd, buffer, offset, buffer.length - offset, offset);
    if (!written || written < 0) {
      throw new Error("short write");
    }
    offset += written;
  }
}

function fsyncDirectory(dir) {
  let dirFd = null;
  try {
    dirFd = fs.openSync(dir, "r");
    fs.fsyncSync(dirFd);
  } catch (_err) {
    // The file itself is already complete. Directory fsync is best-effort.
  } finally {
    if (dirFd != null) {
      try { fs.closeSync(dirFd); } catch (_closeErr) { /* ignore */ }
    }
  }
}

function publishBackup(filePath, payload) {
  const bak = `${filePath}.bak`;
  const existing = readPayload(bak);
  if (existing.ok && logicalTime(existing.parsed) > logicalTime(payload)) return;
  const dir = path.dirname(filePath);
  const bakTmp = path.join(
    dir,
    `.${path.basename(filePath)}.bak.${process.pid}.${Date.now()}.tmp`
  );
  fs.copyFileSync(filePath, bakTmp);
  const bakFd = fs.openSync(bakTmp, "r+");
  try {
    fs.fsyncSync(bakFd);
  } finally {
    fs.closeSync(bakFd);
  }
  try {
    fs.renameSync(bakTmp, bak);
  } catch (err) {
    try { fs.unlinkSync(bakTmp); } catch (_unlinkErr) { /* ignore */ }
    throw err;
  }
}

function atomicWriteJson(filePath, payload) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`
  );
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  const fd = fs.openSync(tmp, "w");
  try {
    writeAllSync(fd, body);
    fs.fsyncSync(fd);
  } catch (err) {
    try { fs.closeSync(fd); } catch (_closeErr) { /* ignore */ }
    try { fs.unlinkSync(tmp); } catch (_unlinkErr) { /* ignore */ }
    throw err;
  }
  fs.closeSync(fd);
  try {
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch (_unlinkErr) { /* ignore */ }
    throw err;
  }
  fsyncDirectory(dir);
  try {
    publishBackup(filePath, payload);
  } catch (_bakErr) {
    // The primary file is already the complete snapshot.
  }
}

function armTimer(filePath, delayMs) {
  const slot = slotFor(filePath);
  if (slot.timer || slot.writing) return;
  slot.timer = setTimeout(() => {
    slot.timer = null;
    writeSlot(filePath);
  }, delayMs);
  if (typeof slot.timer.unref === "function") slot.timer.unref();
}

function writeSlot(filePath) {
  const slot = slotFor(filePath);
  if (slot.writing || !slot.pending) return false;
  const snapshot = slot.pending;
  slot.pending = null;
  slot.writing = true;
  let ok = true;
  try {
    atomicWriteJson(filePath, snapshot);
  } catch (_err) {
    ok = false;
    if (!slot.pending) slot.pending = snapshot;
  } finally {
    slot.writing = false;
  }
  if (slot.pending) armTimer(filePath, 0);
  return ok;
}

function scheduleSaveKojnozoutState(state = {}) {
  const filePath = storePath;
  const slot = slotFor(filePath);
  slot.pending = extractPersistedState(state);
  if (slot.writing) return;
  armTimer(filePath, SAVE_DEBOUNCE_MS);
}

function flushSaveKojnozoutState(state) {
  const filePath = storePath;
  const slot = slotFor(filePath);
  if (arguments.length > 0) {
    slot.pending = extractPersistedState(state || {});
  }
  if (slot.timer) {
    clearTimeout(slot.timer);
    slot.timer = null;
  }
  if (slot.writing) return false;
  return writeSlot(filePath);
}

module.exports = {
  DEFAULT_STORE,
  SAVE_DEBOUNCE_MS,
  PERSISTED_FIELDS,
  loadPersistedSeed,
  extractPersistedState,
  scheduleSaveKojnozoutState,
  flushSaveKojnozoutState
};
