"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped streamer-media host bindings for createStreamerMediaRuntime.
 */

function buildStreamerMediaCtx(host = {}) {
  const { modules = {}, core = {}, state = {}, handlers = {}, media = {} } = host;

  return {
    streamerMediaCommandModule: modules.streamerMediaCommandModule,
    streamerAccessModule: modules.streamerAccessModule,
    safeString: core.safeString,
    getUserLabel: core.getUserLabel,
    videoEngine: resolveRuntimeGetter(media.getVideoEngine, media.videoEngine),
    getOutputState: state.getOutputState,
    runtimeConfig: core.runtimeConfig,
    mediaCatalogModule: modules.mediaCatalogModule,
    executeOverlay: handlers.executeOverlay,
    maybeDeliverMiaVoice: handlers.maybeDeliverMiaVoice,
    getEcosystemState: state.getEcosystemState,
    ecosystemState: state.ecosystemState,
    getStreamState: state.getStreamState,
    soloStreamModule: modules.soloStreamModule,
    writeLog: core.writeLog
  };
}

module.exports = { buildStreamerMediaCtx };
