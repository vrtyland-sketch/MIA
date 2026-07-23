"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped world-mode host bindings for createWorldModeRuntime.
 */

function buildWorldModeCtx(host = {}) {
  const { core = {}, modules = {}, state = {}, obs = {}, overlay = {} } = host;

  return {
    safeString: core.safeString,
    writeLog: core.writeLog,
    awayModeModule: modules.awayModeModule,
    safeObsCall: obs.safeObsCall,
    runtimeConfig: core.runtimeConfig,
    getOutputState: state.getOutputState,
    getEcosystemState: state.getEcosystemState,
    overlayStateCache: resolveRuntimeGetter(overlay.getOverlayStateCache, overlay.overlayStateCache)
  };
}

module.exports = { buildWorldModeCtx };
