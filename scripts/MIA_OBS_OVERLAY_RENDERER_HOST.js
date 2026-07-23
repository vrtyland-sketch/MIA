"use strict";

/**
 * Assemble grouped OBS overlay renderer host bindings from flat index bindings.
 */

function buildObsOverlayRendererHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      runtimeConfig: b.runtimeConfig
    },
    obs: {
      getObs: b.getObs,
      isObsConnected: b.isObsConnected,
      safeObsCall: b.safeObsCall
    }
  };
}

module.exports = { buildObsOverlayRendererHost };
