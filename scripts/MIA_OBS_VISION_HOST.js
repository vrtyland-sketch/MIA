"use strict";

/**
 * Assemble grouped OBS vision host bindings from flat index bindings.
 */

function buildObsVisionHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      runtimeConfig: b.runtimeConfig,
      writeLog: b.writeLog
    },
    obs: {
      safeObsCall: b.safeObsCall
    },
    media: {
      getMiaEyes: b.getMiaEyes
    },
    handlers: {
      buildVisionContext: b.buildVisionContext
    }
  };
}

module.exports = { buildObsVisionHost };
