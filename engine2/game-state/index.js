"use strict";

/**
 * Engine 2.0 — GameState (read-only snapshot facade).
 * Single-writer principle: renderers read snapshots; mutations go via Event Bus (future E2).
 */

const DEFAULT_VERSION = "engine2/0.1.0-e2";

function createGameState(options = {}) {
  const loaders = options.loaders || {};
  const loadKoj = typeof loaders.loadKoj === "function" ? loaders.loadKoj : () => null;
  const loadWorld = typeof loaders.loadWorld === "function" ? loaders.loadWorld : () => null;
  const loadArena = typeof loaders.loadArena === "function" ? loaders.loadArena : () => null;
  const loadEconomy =
    typeof loaders.loadEconomy === "function" ? loaders.loadEconomy : () => null;
  const loadChat = typeof loaders.loadChat === "function" ? loaders.loadChat : () => null;
  const loadObs = typeof loaders.loadObs === "function" ? loaders.loadObs : () => null;
  const loadDebug = typeof loaders.loadDebug === "function" ? loaders.loadDebug : () => null;

  return {
    getSnapshot() {
      return Object.freeze({
        version: DEFAULT_VERSION,
        readOnly: true,
        koj: loadKoj() || {},
        world: loadWorld() || {},
        arena: loadArena() || {},
        economy: loadEconomy() || { miaPoints: 0 },
        chat: loadChat() || { recent: [] },
        obs: loadObs() || { scene: "main", mediaQueue: [] },
        debug: loadDebug() || { queueDepth: 0, health: "ok" }
      });
    }
  };
}

/** @deprecated use createGameState — kept for gamestate-stub compat */
function createGameStateStub(options = {}) {
  return createGameState(options);
}

module.exports = {
  DEFAULT_VERSION,
  createGameState,
  createGameStateStub
};
