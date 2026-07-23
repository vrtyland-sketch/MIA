"use strict";

/**
 * Flatten grouped MIA eyes host bindings for createMiaEyes.
 */

function buildMiaEyesCtx(host = {}) {
  const { core = {}, obs = {} } = host;

  return {
    runtimeConfig: core.runtimeConfig,
    safeObsCall: obs.safeObsCall,
    appendJsonLog: core.writeLog
  };
}

module.exports = { buildMiaEyesCtx };
