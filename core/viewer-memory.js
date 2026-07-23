"use strict";

/**
 * Phase 2 — Viewer memory (roadmap §9 start).
 *
 * Local safe stream stats only — no private chat storage.
 * File: data/viewer-memory.json
 *
 * Fields: userId, name, totalMiaPoints, giftCount, chatCount,
 *         firstSeen, lastSeen, favoriteGift, level (derived)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_PATH = path.join(ROOT, "data", "viewer-memory.json");

/** Cumulative miaPoints thresholds → level (1-based). */
const LEVEL_THRESHOLDS = Object.freeze([0, 50, 150, 400, 1000, 2500, 6000]);

let storePath = DEFAULT_PATH;
/** @type {{ version:number, updatedAt:number, viewers: Record<string, object> }} */
let cache = null;
let saveTimer = null;
let dirty = false;

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function envFlag(name) {
  const v = String(process.env[name] || "").trim().toLowerCase();
  if (!v) return null;
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return null;
}

function isViewerMemoryEnabled(runtimeConfig = {}) {
  const env = envFlag("MIA_VIEWER_MEMORY");
  if (env === false) return false;
  if (env === true) return true;
  const cfg = runtimeConfig?.phase2?.viewerMemory ?? runtimeConfig?.viewerMemory;
  if (cfg && cfg.enabled === false) return false;
  return true;
}

function emptyStore() {
  return { version: 1, updatedAt: Date.now(), viewers: {} };
}

function configureViewerMemory(options = {}) {
  if (options.path) {
    storePath = path.isAbsolute(options.path)
      ? options.path
      : path.join(ROOT, options.path);
  }
  cache = null;
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadStore() {
  if (cache) return cache;
  try {
    if (fs.existsSync(storePath)) {
      const raw = JSON.parse(fs.readFileSync(storePath, "utf8"));
      if (raw && typeof raw === "object" && raw.viewers && typeof raw.viewers === "object") {
        cache = {
          version: toNumber(raw.version, 1),
          updatedAt: toNumber(raw.updatedAt, Date.now()),
          viewers: raw.viewers
        };
        return cache;
      }
    }
  } catch (_err) {
    /* corrupt → fresh */
  }
  cache = emptyStore();
  return cache;
}

function flushSync() {
  if (!dirty || !cache) return false;
  try {
    ensureDir(storePath);
    cache.updatedAt = Date.now();
    fs.writeFileSync(storePath, JSON.stringify(cache, null, 2), "utf8");
    dirty = false;
    return true;
  } catch (_err) {
    return false;
  }
}

function scheduleSave(delayMs = 1500) {
  dirty = true;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    flushSync();
  }, Math.max(200, delayMs));
  if (typeof saveTimer.unref === "function") saveTimer.unref();
}

function viewerKey(userId, name) {
  const id = safeString(userId);
  if (id) return `id:${id}`;
  const n = safeString(name).toLowerCase();
  if (n) return `name:${n}`;
  return null;
}

function levelFromMiaPoints(totalMiaPoints) {
  const pts = Math.max(0, toNumber(totalMiaPoints, 0));
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i += 1) {
    if (pts >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  const idx = level - 1;
  const currentFloor = LEVEL_THRESHOLDS[idx] || 0;
  const nextFloor =
    level < LEVEL_THRESHOLDS.length
      ? LEVEL_THRESHOLDS[level]
      : currentFloor + 5000;
  return {
    level,
    totalMiaPoints: pts,
    nextLevelAt: nextFloor,
    pointsToNext: Math.max(0, nextFloor - pts)
  };
}

function publicViewer(row) {
  if (!row) return null;
  const totalMiaPoints = toNumber(row.totalMiaPoints, 0);
  const levelInfo = levelFromMiaPoints(totalMiaPoints);
  return {
    userId: row.userId || null,
    name: row.name || "",
    totalMiaPoints,
    giftCount: toNumber(row.giftCount, 0),
    chatCount: toNumber(row.chatCount, 0),
    firstSeen: toNumber(row.firstSeen, 0),
    lastSeen: toNumber(row.lastSeen, 0),
    favoriteGift: row.favoriteGift || null,
    level: levelInfo.level,
    nextLevelAt: levelInfo.nextLevelAt,
    pointsToNext: levelInfo.pointsToNext,
    // aliases for existing thank-line helpers
    totalGifts: toNumber(row.giftCount, 0),
    displayName: row.name || ""
  };
}

function getViewer(query = {}) {
  const store = loadStore();
  const key = viewerKey(query.userId || query.id, query.name || query.displayName);
  if (!key) return null;
  return publicViewer(store.viewers[key] || null);
}

function upsertBase(event = {}, now = Date.now()) {
  const store = loadStore();
  const userId = safeString(event.user?.id || event.userId);
  const name = safeString(
    event.user?.name || event.user?.nickname || event.displayName || event.name,
    "Divák"
  );
  const key = viewerKey(userId, name);
  if (!key) return { key: null, row: null, wasNew: false };

  let row = store.viewers[key];
  const wasNew = !row;
  if (!row) {
    row = {
      userId: userId || null,
      name,
      totalMiaPoints: 0,
      giftCount: 0,
      chatCount: 0,
      firstSeen: now,
      lastSeen: now,
      favoriteGift: null,
      _giftTallies: {}
    };
  } else {
    row.name = name || row.name;
    if (userId) row.userId = userId;
    row.lastSeen = now;
  }
  store.viewers[key] = row;
  return { key, row, wasNew };
}

/**
 * Record a gift. Returns { viewer, wasNew } — wasNew means first gift ever.
 * Never stores coins — only miaPoints.
 */
function recordGift(event = {}, options = {}) {
  if (!isViewerMemoryEnabled(options.runtimeConfig)) {
    return { viewer: null, wasNew: false, skipped: true };
  }
  const now = toNumber(options.now, Date.now());
  const { row, wasNew } = upsertBase(event, now);
  if (!row) return { viewer: null, wasNew: false };

  const miaPoints = Math.max(
    0,
    toNumber(event.gift?.miaPoints ?? event.miaPoints, 0)
  );
  const giftName = safeString(event.gift?.name || event.giftName);
  const count = Math.max(1, toNumber(event.gift?.count, 1));
  const prevLevel = levelFromMiaPoints(row.totalMiaPoints).level;

  row.giftCount = toNumber(row.giftCount, 0) + count;
  row.totalMiaPoints = toNumber(row.totalMiaPoints, 0) + miaPoints;
  row.lastSeen = now;

  if (giftName) {
    if (!row._giftTallies || typeof row._giftTallies !== "object") {
      row._giftTallies = {};
    }
    const gKey = giftName.toUpperCase();
    row._giftTallies[gKey] = toNumber(row._giftTallies[gKey], 0) + count;
    let best = row.favoriteGift;
    let bestN = best ? toNumber(row._giftTallies[String(best).toUpperCase()], 0) : 0;
    for (const [k, n] of Object.entries(row._giftTallies)) {
      if (toNumber(n, 0) > bestN) {
        best = k;
        bestN = toNumber(n, 0);
      }
    }
    row.favoriteGift = best;
  }

  const viewer = publicViewer(row);
  const leveledUp = viewer.level > prevLevel;
  scheduleSave(options.saveDelayMs);
  return { viewer, wasNew, skipped: false, leveledUp, previousLevel: prevLevel };
}

/**
 * Record a chat message — counts only, no message text stored.
 */
function recordChat(event = {}, options = {}) {
  if (!isViewerMemoryEnabled(options.runtimeConfig)) {
    return { viewer: null, wasNew: false, skipped: true };
  }
  const now = toNumber(options.now, Date.now());
  const { row, wasNew } = upsertBase(event, now);
  if (!row) return { viewer: null, wasNew: false };

  row.chatCount = toNumber(row.chatCount, 0) + 1;
  row.lastSeen = now;
  // Explicitly do not store event.text / message content.
  scheduleSave(options.saveDelayMs);
  return { viewer: publicViewer(row), wasNew, skipped: false };
}

/**
 * Shape compatible with buildGiftMemoryLine / resolveGiftMemoryForEvent.
 */
function toGiftMemoryShape(viewer, currentGiftKey = "") {
  if (!viewer) return null;
  return {
    displayName: viewer.name || viewer.displayName || "",
    totalGifts: toNumber(viewer.giftCount ?? viewer.totalGifts, 0),
    totalMiaPoints: toNumber(viewer.totalMiaPoints, 0),
    level: toNumber(viewer.level, 1),
    favoriteGift: viewer.favoriteGift || null,
    giftCount: toNumber(viewer.giftCount, 0),
    chatCount: toNumber(viewer.chatCount, 0),
    firstSeen: viewer.firstSeen || 0,
    lastSeen: viewer.lastSeen || 0,
    currentGiftKey: safeString(currentGiftKey).toUpperCase() || null,
    careRole: "supporter",
    source: "phase2_viewer_memory"
  };
}

/**
 * Thank-you line variant when Director allows (no private data).
 */
function buildMemoryThankLine(viewer, options = {}) {
  if (!viewer) return "";
  const name = safeString(options.userLabel || viewer.name, "Divák").split(/\s+/)[0];
  const giftName = safeString(options.giftName, viewer.favoriteGift || "dárek");
  const giftCount = toNumber(viewer.giftCount ?? viewer.totalGifts, 0);
  const fav = safeString(viewer.favoriteGift).toUpperCase();
  const current = safeString(options.giftKey || options.currentGiftKey).toUpperCase();
  const speaker = safeString(options.speaker, "mia").toLowerCase();
  const isKoj = speaker === "kojnozout" || speaker === "kojnozrout";

  if (options.firstSupport || giftCount <= 1) {
    return isKoj
      ? `${name}, první dárek? Vítám tě u misky.`
      : `${name}, díky za první podporu. Vítej.`;
  }

  if (fav && current && fav === current && giftCount >= 3) {
    return isKoj
      ? `${name}, zase ${giftName}? To je tvoje klasika. Díky.`
      : `${name}, zase ${giftName}. Děkujeme — typická podpora.`;
  }

  const level = toNumber(viewer.level, 0);
  if (options.leveledUp && level >= 2) {
    return isKoj
      ? `${name}, level ${level}! Rosteš se mnou.`
      : `${name}, gratulace — level ${level}.`;
  }

  if (level >= 3 && giftCount >= 3 && !options.skipLevelLine) {
    return isKoj
      ? `${name}, level ${level} u misky. Díky.`
      : `${name}, díky — jsi level ${level}.`;
  }

  if (giftCount >= 5) {
    return isKoj
      ? `${name}, už ${giftCount}× jsi mě podpořil. Miska to ví.`
      : `${name}, díky — už ${giftCount} dárků v paměti.`;
  }

  return "";
}

function getSnapshot(limit = 20) {
  const store = loadStore();
  const list = Object.values(store.viewers || {})
    .map(publicViewer)
    .filter(Boolean)
    .sort((a, b) => b.totalMiaPoints - a.totalMiaPoints)
    .slice(0, Math.max(1, limit));
  // Strip internal tallies — publicViewer already safe; ensure no chat text.
  return {
    updatedAt: store.updatedAt,
    count: Object.keys(store.viewers || {}).length,
    top: list.map((v) => ({
      userId: v.userId,
      name: v.name,
      totalMiaPoints: v.totalMiaPoints,
      level: v.level,
      giftCount: v.giftCount,
      chatCount: v.chatCount,
      favoriteGift: v.favoriteGift,
      firstSeen: v.firstSeen,
      lastSeen: v.lastSeen
    }))
  };
}

function resetViewerMemoryForTest() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  cache = emptyStore();
  dirty = false;
  try {
    if (fs.existsSync(storePath)) fs.unlinkSync(storePath);
  } catch (_err) {
    /* ignore */
  }
}

module.exports = {
  DEFAULT_PATH,
  LEVEL_THRESHOLDS,
  levelFromMiaPoints,
  isViewerMemoryEnabled,
  configureViewerMemory,
  loadStore,
  flushSync,
  getViewer,
  recordGift,
  recordChat,
  toGiftMemoryShape,
  buildMemoryThankLine,
  getSnapshot,
  resetViewerMemoryForTest,
  scheduleSave
};
