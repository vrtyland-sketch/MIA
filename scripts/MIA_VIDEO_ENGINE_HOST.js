"use strict";

/**
 * Assemble grouped video-engine host bindings from flat index bindings.
 */

function buildVideoEngineHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      runtimeConfig: b.runtimeConfig,
      writeLog: b.writeLog
    },
    state: {
      outputState: b.outputState
    },
    obs: {
      safeObsCall: b.safeObsCall
    },
    handlers: {
      isVoicePlaybackActive: b.isVoicePlaybackActive,
      pickNextMediaForTier: b.pickNextMediaForTier
    }
  };
}

module.exports = { buildVideoEngineHost };
