"use strict";

/**
 * Assemble grouped OBS safe-call host bindings from flat index bindings.
 */

function buildObsSafeCallHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      safeString: b.safeString,
      writeLog: b.writeLog
    },
    obs: {
      ensureObsConnected: b.ensureObsConnected,
      getObs: b.getObs
    }
  };
}

module.exports = { buildObsSafeCallHost };
