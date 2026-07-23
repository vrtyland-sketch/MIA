"use strict";

/**
 * Flatten grouped OBS safe-call host bindings for createObsSafeCall.
 */

function buildObsSafeCallCtx(host = {}) {
  const { core = {}, obs = {} } = host;

  return {
    ensureObsConnected: obs.ensureObsConnected,
    getObs: obs.getObs,
    safeString: core.safeString,
    writeLog: core.writeLog
  };
}

module.exports = { buildObsSafeCallCtx };
