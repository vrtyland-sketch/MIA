"use strict";

/**
 * Flatten grouped OBS overlay renderer host bindings for createObsOverlayRenderer.
 */

function buildObsOverlayRendererCtx(host = {}) {
  const { core = {}, obs = {} } = host;

  return {
    runtimeConfig: core.runtimeConfig,
    getObs: obs.getObs,
    isObsConnected: obs.isObsConnected,
    safeObsCall: obs.safeObsCall
  };
}

module.exports = { buildObsOverlayRendererCtx };
