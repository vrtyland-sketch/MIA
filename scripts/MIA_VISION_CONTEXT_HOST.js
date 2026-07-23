"use strict";

/**
 * Assemble grouped vision-context host bindings from flat index bindings.
 */

function buildVisionContextHost(bindings = {}) {
  const b = bindings;

  return {
    modules: {
      overlayStateModule: b.overlayStateModule,
      kojnozoutDuelModule: b.kojnozoutDuelModule,
      kickBridgeModule: b.kickBridgeModule
    },
    core: {
      runtimeConfig: b.runtimeConfig
    },
    state: {
      getOverlayState: b.getOverlayState,
      getDuelState: b.getDuelState
    },
    media: {
      getMiaEyes: b.getMiaEyes
    },
    handlers: {
      isStartupSlideActive: b.isStartupSlideActive
    }
  };
}

module.exports = { buildVisionContextHost };
