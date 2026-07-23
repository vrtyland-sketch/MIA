"use strict";

/**
 * Assemble grouped MIA eyes host bindings from flat index bindings.
 */

function buildMiaEyesHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      runtimeConfig: b.runtimeConfig,
      writeLog: b.writeLog
    },
    obs: {
      safeObsCall: b.safeObsCall
    }
  };
}

module.exports = { buildMiaEyesHost };
