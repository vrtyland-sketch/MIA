"use strict";

/**
 * Assemble grouped voice-timing host bindings from flat index bindings.
 */

function buildVoiceTimingHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      getEnv: b.getEnv
    },
    modules: {
      runtimePerfModule: b.runtimePerfModule
    }
  };
}

module.exports = { buildVoiceTimingHost };
