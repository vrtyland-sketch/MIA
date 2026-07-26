"use strict";

/**
 * Engine 2.0 — E1 first slice entry point.
 * Default OFF via MIA_ENGINE2_STUB; no production behavior change when unset.
 */

const { isEngine2StubEnabled } = require("./flag");
const { createGameState, createGameStateStub, DEFAULT_VERSION } = require("./game-state");
const { createVisibilityEngine, PLATFORMS } = require("./visibility-engine");
const {
  PLATFORM_IDS,
  projectForPlatform
} = require("./platform-projection");
const { createPlatformRenderer } = require("./platform-renderer");

function createEngine2Pipeline(options = {}) {
  const gameState = createGameState(options);
  const visibilityEngine = createVisibilityEngine(options.visibility || {});
  const renderer = createPlatformRenderer({
    gameState,
    visibilityEngine,
    projectForPlatform
  });

  return {
    gameState,
    visibilityEngine,
    renderer,
    render(platform) {
      return renderer.render(platform);
    },
    renderAll(platforms) {
      return renderer.renderAll(platforms);
    }
  };
}

module.exports = {
  isEngine2StubEnabled,
  createGameState,
  createGameStateStub,
  createVisibilityEngine,
  createPlatformRenderer,
  createEngine2Pipeline,
  projectForPlatform,
  PLATFORMS,
  PLATFORM_IDS,
  DEFAULT_VERSION
};
