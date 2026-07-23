"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped vision-context host bindings for createVisionContextRuntime.
 */

function buildVisionContextCtx(host = {}) {
  const { modules = {}, core = {}, state = {}, media = {}, handlers = {} } = host;

  return {
    overlayStateModule: modules.overlayStateModule,
    getOverlayState: state.getOverlayState,
    runtimeConfig: core.runtimeConfig,
    kojnozoutDuelModule: modules.kojnozoutDuelModule,
    getDuelState: state.getDuelState,
    kickBridgeModule: modules.kickBridgeModule,
    miaEyes: resolveRuntimeGetter(media.getMiaEyes, media.miaEyes),
    isStartupSlideActive: handlers.isStartupSlideActive
  };
}

module.exports = { buildVisionContextCtx };
