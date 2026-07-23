"use strict";

/**
 * Assemble grouped runtime-loops host bindings from flat index bindings.
 */

function buildRuntimeLoopsHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      runtimeConfig: b.runtimeConfig,
      writeLog: b.writeLog,
      serverStartedAt: b.serverStartedAt
    },
    modules: {
      bowlEngine: b.bowlEngine,
      getVideoEngine: b.getVideoEngine,
      bowlFullVideoModule: b.bowlFullVideoModule,
      capybaraFlowModule: b.capybaraFlowModule,
      proactiveHostModule: b.proactiveHostModule
    },
    state: {
      getKojnozoutState: b.getKojnozoutState,
      setKojnozoutState: b.setKojnozoutState,
      getStreamState: b.getStreamState,
      getOutputState: b.getOutputState,
      getEcosystemState: b.getEcosystemState,
      getOverlayState: b.getOverlayState,
      getObsConnected: b.getObsConnected,
      getLastIngestSummary: b.getLastIngestSummary,
      getMiaEyes: b.getMiaEyes,
      getMattingIngestBridge: b.getMattingIngestBridge
    },
    handlers: {
      executeOverlay: b.executeOverlay,
      deliverCapybaraWaitPrompt: b.deliverCapybaraWaitPrompt,
      syncSoloStreamObsScene: b.syncSoloStreamObsScene,
      deliverProactiveHostMoment: b.deliverProactiveHostMoment,
      runDuelPeerSync: b.runDuelPeerSync,
      ensureObsConnected: b.ensureObsConnected,
      forceReconnectObs: b.forceReconnectObs
    }
  };
}

module.exports = { buildRuntimeLoopsHost };
