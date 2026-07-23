"use strict";

/**
 * Assemble grouped overlay-state host bindings from flat index bindings.
 */

function buildOverlayStateHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      safeString: b.safeString
    },
    modules: {
      overlayStateModule: b.overlayStateModule,
      outputStateModule: b.outputStateModule
    },
    state: {
      getOverlayState: b.getOverlayState,
      getOutputState: b.getOutputState
    },
    overlay: {
      getOverlayStateCache: b.getOverlayStateCache
    }
  };
}

module.exports = { buildOverlayStateHost };
