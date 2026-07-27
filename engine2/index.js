"use strict";

/**
 * Engine 2.0 — E1/E2 entry point.
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
const { createStubState, applyNormalizedEvent } = require("./event-applicator");
const { ingestNormalizedEvent } = require("./event-bus-stub");
const { routeObsProjection, ROUTE_VERSION } = require("./obs-router-boundary");

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
  createStubState,
  applyNormalizedEvent,
  ingestNormalizedEvent,
  routeObsProjection,
  projectForPlatform,
  PLATFORMS,
  PLATFORM_IDS,
  DEFAULT_VERSION,
  ROUTE_VERSION
};
