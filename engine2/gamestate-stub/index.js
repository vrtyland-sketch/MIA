"use strict";

/**
 * Engine 2.0 — GameState stub (read-only, not wired to index.js).
 * Phase E1 vertical slice prototype.
 */

const DEFAULT_VERSION = "engine2-stub/0.1.0";

function createGameStateStub(options = {}) {
  const loaders = options.loaders || {};
  const loadKoj = typeof loaders.loadKoj === "function" ? loaders.loadKoj : () => null;
  const loadWorld = typeof loaders.loadWorld === "function" ? loaders.loadWorld : () => null;
  const loadArena = typeof loaders.loadArena === "function" ? loaders.loadArena : () => null;

  return {
    getSnapshot() {
      return Object.freeze({
        version: DEFAULT_VERSION,
        readOnly: true,
        koj: loadKoj(),
        world: loadWorld(),
        arena: loadArena(),
        economy: null
      });
    }
  };
}

module.exports = {
  DEFAULT_VERSION,
  createGameStateStub
};
