"use strict";

/**
 * Assemble grouped world-mode host bindings from flat index bindings.
 */

function buildWorldModeHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      safeString: b.safeString,
      writeLog: b.writeLog,
      runtimeConfig: b.runtimeConfig
    },
    modules: {
      awayModeModule: b.awayModeModule
    },
    state: {
      getOutputState: b.getOutputState,
      getEcosystemState: b.getEcosystemState
    },
    obs: {
      safeObsCall: b.safeObsCall
    },
    overlay: {
      getOverlayStateCache: b.getOverlayStateCache,
      overlayStateCache: b.overlayStateCache
    }
  };
}

module.exports = { buildWorldModeHost };
