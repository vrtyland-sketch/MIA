"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_STORE = path.resolve(__dirname, "..", "data", "kojnozout-state.json");

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
let dirty = false;
let saveTimer = null;

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function extractPersistedState(state = {}) {
  const payload = {
    version: 1,
    updatedAt: Date.now()
  };

  for (const field of PERSISTED_FIELDS) {
    if (state[field] !== undefined && state[field] !== null) {
      payload[field] = state[field];
    }
  }

  return payload;
}

function loadPersistedSeed(filePath = DEFAULT_STORE) {
  storePath = filePath || DEFAULT_STORE;

  if (!fs.existsSync(storePath)) {
    return {};
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(storePath, "utf8"));
    if (!parsed || typeof parsed !== "object") return {};
    const seed = {};
    for (const field of PERSISTED_FIELDS) {
      if (parsed[field] !== undefined) {
        seed[field] = parsed[field];
      }
    }
    return seed;
  } catch (_err) {
    return {};
  }
}

function scheduleSaveKojnozoutState(state = {}) {
  dirty = true;
  if (saveTimer) return;

  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (!dirty) return;
    dirty = false;

    try {
      const dir = path.dirname(storePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        storePath,
        JSON.stringify(extractPersistedState(state), null, 2),
        "utf8"
      );
    } catch (_err) {
      dirty = true;
    }
  }, 2500);
}

function flushSaveKojnozoutState(state = {}) {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  dirty = false;

  try {
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      storePath,
      JSON.stringify(extractPersistedState(state), null, 2),
      "utf8"
    );
    return true;
  } catch (_err) {
    return false;
  }
}

module.exports = {
  DEFAULT_STORE,
  PERSISTED_FIELDS,
  loadPersistedSeed,
  extractPersistedState,
  scheduleSaveKojnozoutState,
  flushSaveKojnozoutState
};
