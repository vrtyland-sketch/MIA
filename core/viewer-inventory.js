"use strict";

/**
 * Phase 3 — thin viewer inventory (roadmap inventory slice).
 * Local cosmetic/key stubs only — no economy rewrite.
 * File: data/viewer-inventory.json
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_PATH = path.join(ROOT, "data", "viewer-inventory.json");

const STUB_CATALOG = Object.freeze({
  koj_sticker: { id: "koj_sticker", label: "Koj samolepka", kind: "cosmetic" },
  bowl_badge: { id: "bowl_badge", label: "Odznak misky", kind: "cosmetic" },
  battle_token: { id: "battle_token", label: "Battle token", kind: "key" },
  form_key_scout: { id: "form_key_scout", label: "Klíč Scout", kind: "key" }
});

let storePath = DEFAULT_PATH;
/** @type {{ version:number, updatedAt:number, inventories: Record<string, object> }} */
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

function isInventoryEnabled(runtimeConfig = {}) {
  const env = envFlag("MIA_VIEWER_INVENTORY");
  if (env === false) return false;
  if (env === true) return true;
  const cfg = runtimeConfig?.phase3?.inventory ?? runtimeConfig?.inventory;
  if (cfg && cfg.enabled === false) return false;
  return true;
}

function emptyStore() {
  return { version: 1, updatedAt: Date.now(), inventories: {} };
}

function configureViewerInventory(options = {}) {
  if (options.path) {
    storePath = path.isAbsolute(options.path)
      ? options.path
      : path.join(ROOT, options.path);
  }
  cache = null;
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadStore() {
  if (cache) return cache;
  try {
    if (fs.existsSync(storePath)) {
      const raw = JSON.parse(fs.readFileSync(storePath, "utf8"));
      if (raw && typeof raw === "object" && raw.inventories && typeof raw.inventories === "object") {
        cache = {
          version: toNumber(raw.version, 1),
          updatedAt: toNumber(raw.updatedAt, Date.now()),
          inventories: raw.inventories
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

function resolveItemDef(itemId) {
  const id = safeString(itemId).toLowerCase();
  if (STUB_CATALOG[id]) return { ...STUB_CATALOG[id] };
  return {
    id: id || "unknown_item",
    label: id || "Neznámý item",
    kind: "cosmetic"
  };
}

function publicInventory(row) {
  if (!row) return null;
  return {
    userId: row.userId || null,
    name: row.name || "",
    items: Array.isArray(row.items)
      ? row.items.map((it) => ({
          id: it.id,
          label: it.label,
          kind: it.kind,
          qty: toNumber(it.qty, 1),
          earnedAt: toNumber(it.earnedAt, 0),
          source: safeString(it.source, "stub")
        }))
      : []
  };
}

function getInventory(query = {}) {
  const store = loadStore();
  const key = viewerKey(query.userId || query.id, query.name || query.displayName);
  if (!key) return null;
  return publicInventory(store.inventories[key] || null);
}

/**
 * Grant a stub item. Never stores coins.
 */
function grantItem(query = {}, itemId, options = {}) {
  if (!isInventoryEnabled(options.runtimeConfig) && !options.force) {
    return { ok: false, reason: "inventory_disabled", inventory: null };
  }

  const now = toNumber(options.now, Date.now());
  const userId = safeString(query.userId || query.id);
  const name = safeString(query.name || query.displayName, "Divák");
  const key = viewerKey(userId, name);
  if (!key) return { ok: false, reason: "no_viewer", inventory: null };

  const def = resolveItemDef(itemId);
  const store = loadStore();
  let row = store.inventories[key];
  if (!row) {
    row = { userId: userId || null, name, items: [] };
  } else {
    row.name = name || row.name;
    if (userId) row.userId = userId;
    if (!Array.isArray(row.items)) row.items = [];
  }

  const existing = row.items.find((it) => it.id === def.id);
  if (existing) {
    existing.qty = toNumber(existing.qty, 1) + Math.max(1, toNumber(options.qty, 1));
    existing.earnedAt = now;
    existing.source = safeString(options.source, existing.source || "stub");
  } else {
    row.items.push({
      id: def.id,
      label: def.label,
      kind: def.kind,
      qty: Math.max(1, toNumber(options.qty, 1)),
      earnedAt: now,
      source: safeString(options.source, "stub")
    });
  }

  store.inventories[key] = row;
  scheduleSave(options.saveDelayMs);
  return { ok: true, reason: null, inventory: publicInventory(row), item: def };
}

function getInventorySnapshot(limit = 12) {
  const store = loadStore();
  const list = Object.values(store.inventories || {})
    .map(publicInventory)
    .filter((row) => row && row.items.length > 0)
    .sort((a, b) => b.items.length - a.items.length)
    .slice(0, Math.max(1, limit));
  return {
    updatedAt: store.updatedAt,
    count: Object.keys(store.inventories || {}).length,
    catalog: Object.values(STUB_CATALOG),
    top: list
  };
}

function resetViewerInventoryForTest() {
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
  STUB_CATALOG,
  isInventoryEnabled,
  configureViewerInventory,
  loadStore,
  flushSync,
  getInventory,
  grantItem,
  getInventorySnapshot,
  resetViewerInventoryForTest,
  resolveItemDef
};
