"use strict";

/**
 * Assemble grouped streamer-media host bindings from flat index bindings.
 */

function buildStreamerMediaHost(bindings = {}) {
  const b = bindings;

  return {
    modules: {
      streamerMediaCommandModule: b.streamerMediaCommandModule,
      streamerAccessModule: b.streamerAccessModule,
      mediaCatalogModule: b.mediaCatalogModule,
      soloStreamModule: b.soloStreamModule
    },
    core: {
      safeString: b.safeString,
      getUserLabel: b.getUserLabel,
      runtimeConfig: b.runtimeConfig,
      writeLog: b.writeLog
    },
    state: {
      getOutputState: b.getOutputState,
      getEcosystemState: b.getEcosystemState,
      getStreamState: b.getStreamState
    },
    handlers: {
      executeOverlay: b.executeOverlay,
      maybeDeliverMiaVoice: b.maybeDeliverMiaVoice
    },
    media: {
      getVideoEngine: b.getVideoEngine
    }
  };
}

module.exports = { buildStreamerMediaHost };
