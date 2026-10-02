"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_STORE = path.resolve(__dirname, "..", "data", "kojnozout-world.json");
const SAVE_DEBOUNCE_MS = 2500;

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

function cloneJson(value) {
  if (value == null) return null;
  return JSON.parse(JSON.stringify(value));
}

function snapshotWorld(worldState = {}) {
  return {
    version: 1,
    updatedAt: nextUpdatedAt(),
    backpack: cloneJson(worldState.backpack),
    duel: cloneJson(worldState.duel)
  };
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

function loadWorldSeed(filePath = DEFAULT_STORE) {
  const primary = readPayload(filePath);
  const backup = readPayload(`${filePath}.bak`);
  if (primary.missing && backup.missing) {
    return {
      backpack: null,
      duel: null,
      ok: true,
      reason: "missing",
      recovered: false
    };
  }

  const valid = [];
  if (primary.ok) valid.push({ source: "primary", parsed: primary.parsed });
  if (backup.ok) valid.push({ source: "backup", parsed: backup.parsed });
  if (valid.length === 0) {
    console.error(
      `[kojnozout-world] world state is malformed and no valid backup was found at ${filePath}. Inventory and duel were not recovered.`
    );
    return {
      backpack: null,
      duel: null,
      ok: false,
      reason: "world_state_corrupt",
      recovered: false,
      error: "world_state_malformed"
    };
  }

  valid.sort((a, b) => logicalTime(b.parsed) - logicalTime(a.parsed));
  const best = valid[0];
  const recovered = best.source !== "primary";
  if (recovered && primary.malformed) {
    console.warn(
      `[kojnozout-world] primary world file is malformed; recovered inventory and duel from ${filePath}.bak.`
    );
  }
  let reason = "primary";
  if (recovered && primary.malformed) reason = "recovered_from_backup";
  else if (recovered) reason = "newest_backup";
  return {
    backpack: best.parsed.backpack ?? null,
    duel: best.parsed.duel ?? null,
    updatedAt: logicalTime(best.parsed),
    ok: true,
    reason,
    recovered,
    error: recovered && primary.malformed ? "world_state_malformed" : undefined
  };
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

function scheduleSaveWorld(worldState = {}, filePath = DEFAULT_STORE) {
  const target = filePath || DEFAULT_STORE;
  const slot = slotFor(target);
  slot.pending = snapshotWorld(worldState);
  if (slot.writing) return;
  armTimer(target, SAVE_DEBOUNCE_MS);
}

function flushSaveWorld(worldState, filePath = DEFAULT_STORE) {
  const target = filePath || DEFAULT_STORE;
  const slot = slotFor(target);
  if (arguments.length > 0 && worldState != null) {
    slot.pending = snapshotWorld(worldState);
  }
  if (slot.timer) {
    clearTimeout(slot.timer);
    slot.timer = null;
  }
  if (slot.writing) return false;
  return writeSlot(target);
}

module.exports = {
  DEFAULT_STORE,
  SAVE_DEBOUNCE_MS,
  loadWorldSeed,
  scheduleSaveWorld,
  flushSaveWorld
};
