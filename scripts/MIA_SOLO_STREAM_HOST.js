"use strict";

/**
 * Assemble grouped solo-stream host bindings from flat index bindings.
 */

function buildSoloStreamHost(bindings = {}) {
  const b = bindings;

  return {
    modules: {
      soloStreamModule: b.soloStreamModule
    },
    media: {
      getVideoEngine: b.getVideoEngine
    },
    core: {
      runtimeConfig: b.runtimeConfig,
      serverStartedAt: b.serverStartedAt,
      writeLog: b.writeLog,
      safeString: b.safeString
    },
    state: {
      getStreamState: b.getStreamState,
      getOutputState: b.getOutputState,
      getOverlayState: b.getOverlayState,
      getKojnozoutState: b.getKojnozoutState,
      getObsConnected: b.getObsConnected
    },
    handlers: {
      isVoicePlaybackActive: b.isVoicePlaybackActive,
      executeOverlay: b.executeOverlay,
      maybeDeliverMiaVoice: b.maybeDeliverMiaVoice
    },
    obs: {
      safeObsCall: b.safeObsCall
    }
  };
}

module.exports = { buildSoloStreamHost };
