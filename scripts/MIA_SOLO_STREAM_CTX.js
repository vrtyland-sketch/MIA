"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped solo-stream host bindings for createSoloStreamRuntime.
 */

function buildSoloStreamCtx(host = {}) {
  const { modules = {}, core = {}, state = {}, handlers = {}, obs = {}, media = {} } = host;

  return {
    soloStreamModule: modules.soloStreamModule,
    videoEngine: resolveRuntimeGetter(
      media.getVideoEngine || modules.getVideoEngine,
      media.videoEngine ?? modules.videoEngine
    ),
    getStreamState: state.getStreamState,
    streamState: state.streamState,
    getOutputState: state.getOutputState,
    getOverlayState: state.getOverlayState,
    runtimeConfig: core.runtimeConfig,
    serverStartedAt: core.serverStartedAt,
    getKojnozoutState: state.getKojnozoutState,
    getObsConnected: state.getObsConnected,
    obsConnected: state.obsConnected,
    isVoicePlaybackActive: handlers.isVoicePlaybackActive,
    safeObsCall: obs.safeObsCall,
    writeLog: core.writeLog,
    executeOverlay: handlers.executeOverlay,
    maybeDeliverMiaVoice: handlers.maybeDeliverMiaVoice,
    safeString: core.safeString
  };
}

module.exports = { buildSoloStreamCtx };
