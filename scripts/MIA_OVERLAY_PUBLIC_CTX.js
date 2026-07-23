"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped overlay-public host bindings for createOverlayPublicApi.
 */

function buildOverlayPublicCtx(host = {}) {
  const { core = {}, modules = {}, state = {}, delivery = {} } = host;

  return {
    cloneJson: core.cloneJson,
    overlayStateModule: modules.overlayStateModule,
    getOverlayState: state.getOverlayState,
    kojnozoutModule: modules.kojnozoutModule,
    getKojnozoutStateForSnapshot: state.getKojnozoutStateForSnapshot,
    getKojnozoutState: state.getKojnozoutState,
    getStreamState: state.getStreamState,
    streamState: state.streamState,
    kojnozoutDuelModule: modules.kojnozoutDuelModule,
    getDuelState: state.getDuelState,
    kojnozoutBackpackModule: modules.kojnozoutBackpackModule,
    getBackpackState: state.getBackpackState,
    kojnozoutItemCommandModule: modules.kojnozoutItemCommandModule,
    getItemDisplayState: state.getItemDisplayState,
    setItemDisplayState: state.setItemDisplayState,
    videoEngine: resolveRuntimeGetter(modules.getVideoEngine, modules.videoEngine),
    spamSessionEngine: resolveRuntimeGetter(
      modules.getSpamSessionEngine,
      modules.spamSessionEngine
    ),
    careOpportunitiesModule: modules.careOpportunitiesModule,
    kojnozoutBondModule: modules.kojnozoutBondModule,
    platformArenaModule: modules.platformArenaModule,
    getArenaState: state.getArenaState,
    kojDisplayModule: modules.kojDisplayModule,
    giftUserLedgerModule: modules.giftUserLedgerModule,
    getGiftUserLedger: state.getGiftUserLedger,
    capybaraFlowModule: modules.capybaraFlowModule,
    getOutputState: state.getOutputState,
    giftSupporterProfileModule: modules.giftSupporterProfileModule,
    getGiftSupporterProfile: state.getGiftSupporterProfile,
    kojnozoutVitalsModule: modules.kojnozoutVitalsModule,
    ecosystemOrchestratorModule: modules.ecosystemOrchestratorModule,
    getEcosystemState: state.getEcosystemState,
    runtimeConfig: core.runtimeConfig,
    obsConnected: core.obsConnected,
    getVoicePlaybackSnapshot: delivery.getVoicePlaybackSnapshot,
    translationRuntime: resolveRuntimeGetter(
      modules.getInterpreterRuntime,
      modules.translationRuntime
    ),
    getVoicePlaybackSeq: delivery.getVoicePlaybackSeq,
    getVoiceSpeakQueueLength: delivery.getVoiceSpeakQueueLength,
    getOverlayLastAcceptedAt: state.getOverlayLastAcceptedAt,
    getOutputLastStreamerMediaAt: state.getOutputLastStreamerMediaAt
  };
}

module.exports = { buildOverlayPublicCtx };
