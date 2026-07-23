"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped runtime-loops host bindings for createRuntimeLoops.
 */

function buildRuntimeLoopsCtx(host = {}) {
  const { core = {}, modules = {}, state = {}, handlers = {} } = host;

  return {
    runtimeConfig: core.runtimeConfig,
    writeLog: core.writeLog,
    bowlEngine: modules.bowlEngine,
    getKojnozoutState: state.getKojnozoutState,
    setKojnozoutState: state.setKojnozoutState,
    getStreamState: state.getStreamState,
    videoEngine: resolveRuntimeGetter(modules.getVideoEngine, modules.videoEngine),
    bowlFullVideoModule: modules.bowlFullVideoModule,
    getOutputState: state.getOutputState,
    executeOverlay: handlers.executeOverlay,
    capybaraFlowModule: modules.capybaraFlowModule,
    getEcosystemState: state.getEcosystemState,
    deliverCapybaraWaitPrompt: handlers.deliverCapybaraWaitPrompt,
    proactiveHostModule: modules.proactiveHostModule,
    getOverlayState: state.getOverlayState,
    serverStartedAt: core.serverStartedAt,
    syncSoloStreamObsScene: handlers.syncSoloStreamObsScene,
    deliverProactiveHostMoment: handlers.deliverProactiveHostMoment,
    runDuelPeerSync: handlers.runDuelPeerSync,
    getObsConnected: state.getObsConnected,
    getLastIngestSummary: state.getLastIngestSummary,
    ensureObsConnected: handlers.ensureObsConnected,
    forceReconnectObs: handlers.forceReconnectObs,
    getMiaEyes: state.getMiaEyes,
    getMattingIngestBridge: state.getMattingIngestBridge
  };
}

module.exports = { buildRuntimeLoopsCtx };
