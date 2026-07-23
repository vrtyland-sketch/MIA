"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped overlay-state host bindings for createOverlayStateRuntime.
 */

function buildOverlayStateCtx(host = {}) {
  const { core = {}, modules = {}, state = {}, overlay = {} } = host;

  return {
    safeString: core.safeString,
    overlayStateModule: modules.overlayStateModule,
    getOverlayState: state.getOverlayState,
    outputStateModule: modules.outputStateModule,
    getOutputState: state.getOutputState,
    overlayStateCache: resolveRuntimeGetter(overlay.getOverlayStateCache, overlay.overlayStateCache)
  };
}

module.exports = { buildOverlayStateCtx };
