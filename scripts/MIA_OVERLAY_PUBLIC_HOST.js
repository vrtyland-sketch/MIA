"use strict";

/**
 * Assemble grouped overlay-public host bindings from flat index bindings.
 */

function buildOverlayPublicHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      cloneJson: b.cloneJson,
      runtimeConfig: b.runtimeConfig,
      obsConnected: b.obsConnected
    },
    modules: {
      overlayStateModule: b.overlayStateModule,
      kojnozoutModule: b.kojnozoutModule,
      kojnozoutDuelModule: b.kojnozoutDuelModule,
      kojnozoutBackpackModule: b.kojnozoutBackpackModule,
      kojnozoutItemCommandModule: b.kojnozoutItemCommandModule,
      getVideoEngine: b.getVideoEngine,
      getSpamSessionEngine: b.getSpamSessionEngine,
      careOpportunitiesModule: b.careOpportunitiesModule,
      kojnozoutBondModule: b.kojnozoutBondModule,
      platformArenaModule: b.platformArenaModule,
      kojDisplayModule: b.kojDisplayModule,
      giftUserLedgerModule: b.giftUserLedgerModule,
      capybaraFlowModule: b.capybaraFlowModule,
      giftSupporterProfileModule: b.giftSupporterProfileModule,
      kojnozoutVitalsModule: b.kojnozoutVitalsModule,
      ecosystemOrchestratorModule: b.ecosystemOrchestratorModule,
      getInterpreterRuntime: b.getInterpreterRuntime
    },
    state: {
      getOverlayState: b.getOverlayState,
      getKojnozoutStateForSnapshot: b.getKojnozoutStateForSnapshot,
      getKojnozoutState: b.getKojnozoutState,
      getStreamState: b.getStreamState,
      getDuelState: b.getDuelState,
      getBackpackState: b.getBackpackState,
      getItemDisplayState: b.getItemDisplayState,
      setItemDisplayState: b.setItemDisplayState,
      getArenaState: b.getArenaState,
      getGiftUserLedger: b.getGiftUserLedger,
      getGiftSupporterProfile: b.getGiftSupporterProfile,
      getOutputState: b.getOutputState,
      getEcosystemState: b.getEcosystemState,
      getOverlayLastAcceptedAt: b.getOverlayLastAcceptedAt,
      getOutputLastStreamerMediaAt: b.getOutputLastStreamerMediaAt
    },
    delivery: {
      getVoicePlaybackSnapshot: b.getVoicePlaybackSnapshot,
      getVoicePlaybackSeq: b.getVoicePlaybackSeq,
      getVoiceSpeakQueueLength: b.getVoiceSpeakQueueLength
    }
  };
}

module.exports = { buildOverlayPublicHost };
