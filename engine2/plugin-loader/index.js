"use strict";

/**
 * Engine 2.0 — E4 plugin loader stub.
 * Load/unload game plugins in dev without server restart.
 * Plugins cannot call OBS directly or write overlay coin values.
 */

const fs = require("fs");
const path = require("path");
const { stripValueFieldsForPublic } = require("../../scripts/MIA_OVERLAY_PUBLIC_RESPONSE");
const { createStubState } = require("../event-applicator");

const FORBIDDEN_PERMISSIONS = Object.freeze([
  "obs.direct",
  "obs.write",
  "overlay.coins",
  "overlay.giftvalue",
  "overlay.write"
]);

const LOADER_VERSION = "engine2/0.1.0-e4";

let singleton = null;

function createSandboxBus() {
  const handlers = new Map();
  return Object.freeze({
    on(eventType, handler) {
      const key = String(eventType || "").toUpperCase();
      if (typeof handler !== "function") {
        throw new Error("bus.on requires function handler");
      }
      handlers.set(key, handler);
    },
    emit(eventType, payload) {
      const key = String(eventType || "").toUpperCase();
      const handler = handlers.get(key);
      if (!handler) return { delivered: false };
      const safe = stripValueFieldsForPublic(payload || {});
      handler(safe);
      return { delivered: true };
    },
    obs: Object.freeze({
      call() {
        throw new Error("plugins cannot call OBS directly");
      }
    }),
    overlay: Object.freeze({
      set() {
        throw new Error("plugins cannot write overlay directly");
      },
      setCoins() {
        throw new Error("plugins cannot write overlay coin values");
      }
    })
  });
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("plugin manifest must be object");
  }
  if (!manifest.id || typeof manifest.id !== "string") {
    throw new Error("plugin manifest.id required");
  }
  const perms = Array.isArray(manifest.permissions) ? manifest.permissions : [];
  for (const perm of perms) {
    const p = String(perm || "").toLowerCase();
    if (FORBIDDEN_PERMISSIONS.some((blocked) => p.includes(blocked))) {
      throw new Error(`forbidden plugin permission: ${perm}`);
    }
  }
  return manifest;
}

function createPluginLoader(options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, "..", "..", "game");
  const loaded = new Map();

  function readRegistry() {
    const registryPath = path.join(rootDir, "_registry.json");
    if (!fs.existsSync(registryPath)) {
      return { plugins: [], loadOrder: [] };
    }
    return JSON.parse(fs.readFileSync(registryPath, "utf8"));
  }

  function resolvePluginDir(pluginId) {
    const id = String(pluginId || "").trim();
    const registry = readRegistry();
    const allowed = new Set(
      [...(registry.plugins || []), ...(registry.loadOrder || [])].map((p) => String(p))
    );
    if (!allowed.has(id)) {
      throw new Error(`plugin not in registry: ${id}`);
    }
    const dir = path.join(rootDir, id);
    if (!fs.existsSync(dir)) {
      throw new Error(`plugin directory missing: ${id}`);
    }
    return dir;
  }

  function loadPlugin(pluginId) {
    const id = String(pluginId || "").trim();
    if (loaded.has(id)) {
      return { ok: true, pluginId: id, alreadyLoaded: true };
    }

    const dir = resolvePluginDir(id);
    const manifest = validateManifest(
      JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"))
    );
    const entryPath = path.join(dir, "index.js");
    const mod = require(entryPath);
    const bus = createSandboxBus();
    const gameState = createStubState();

    if (typeof mod.registerHandlers === "function") {
      mod.registerHandlers(bus, gameState);
    }

    loaded.set(id, {
      id,
      manifest,
      bus,
      gameState,
      mod,
      loadedAt: Date.now()
    });

    return { ok: true, pluginId: id, manifestId: manifest.id };
  }

  function unloadPlugin(pluginId) {
    const id = String(pluginId || "").trim();
    const entry = loaded.get(id);
    if (!entry) {
      return { ok: false, reason: "not_loaded", pluginId: id };
    }

    if (entry.mod && typeof entry.mod.unregisterHandlers === "function") {
      entry.mod.unregisterHandlers();
    }

    loaded.delete(id);

    try {
      const entryPath = path.join(rootDir, id, "index.js");
      delete require.cache[require.resolve(entryPath)];
    } catch (_err) {
      // cache clear best-effort
    }

    return { ok: true, pluginId: id };
  }

  function getLoadedPlugins() {
    return [...loaded.values()].map((entry) => ({
      pluginId: entry.id,
      manifestId: entry.manifest.id,
      version: entry.manifest.version,
      loadedAt: entry.loadedAt
    }));
  }

  function getActivePlugin() {
    const entries = [...loaded.values()];
    if (!entries.length) return null;
    const entry = entries[entries.length - 1];
    return {
      id: entry.manifest.id,
      pluginId: entry.id,
      version: entry.manifest.version,
      loadedAt: entry.loadedAt
    };
  }

  function getSnapshot() {
    return Object.freeze({
      version: LOADER_VERSION,
      registry: readRegistry(),
      loaded: getLoadedPlugins(),
      active: getActivePlugin()
    });
  }

  return Object.freeze({
    loadPlugin,
    unloadPlugin,
    getLoadedPlugins,
    getActivePlugin,
    getSnapshot,
    readRegistry
  });
}

function getPluginLoader(options) {
  if (!singleton) {
    singleton = createPluginLoader(options);
  }
  return singleton;
}

function resetPluginLoaderForTests() {
  singleton = null;
}

module.exports = {
  LOADER_VERSION,
  FORBIDDEN_PERMISSIONS,
  createPluginLoader,
  getPluginLoader,
  resetPluginLoaderForTests,
  createSandboxBus,
  validateManifest
};
