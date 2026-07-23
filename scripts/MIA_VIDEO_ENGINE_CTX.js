"use strict";

/**
 * Flatten grouped video-engine host bindings for createVideoEngine.
 */

function buildVideoEngineCtx(host = {}) {
  const { core = {}, state = {}, obs = {}, handlers = {} } = host;

  return {
    runtimeConfig: core.runtimeConfig,
    outputState: state.outputState,
    appendJsonLog: core.writeLog,
    safeObsCall: obs.safeObsCall,
    isMiaVoiceActive: handlers.isVoicePlaybackActive,
    pickNextMediaForTier: handlers.pickNextMediaForTier
  };
}

module.exports = { buildVideoEngineCtx };
