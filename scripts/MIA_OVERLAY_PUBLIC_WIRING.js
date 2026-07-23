"use strict";

/**
 * Overlay public response factory deps for /overlay-state.
 */

function buildOverlayPublicDeps(ctx) {
  return {
    cloneJson: ctx.cloneJson,
    overlayStateModule: ctx.overlayStateModule,
    getOverlayState: ctx.getOverlayState,
    kojnozoutModule: ctx.kojnozoutModule,
    getKojnozoutStateForSnapshot: ctx.getKojnozoutStateForSnapshot,
    getKojnozoutState: ctx.getKojnozoutState,
    getStreamState: ctx.getStreamState,
    streamState: ctx.streamState,
    kojnozoutDuelModule: ctx.kojnozoutDuelModule,
    getDuelState: ctx.getDuelState,
    kojnozoutBackpackModule: ctx.kojnozoutBackpackModule,
    getBackpackState: ctx.getBackpackState,
    kojnozoutItemCommandModule: ctx.kojnozoutItemCommandModule,
    getItemDisplayState: ctx.getItemDisplayState,
    setItemDisplayState: ctx.setItemDisplayState,
    videoEngine: ctx.videoEngine,
    spamSessionEngine: ctx.spamSessionEngine,
    careOpportunitiesModule: ctx.careOpportunitiesModule,
    kojnozoutBondModule: ctx.kojnozoutBondModule,
    platformArenaModule: ctx.platformArenaModule,
    getArenaState: ctx.getArenaState,
    kojDisplayModule: ctx.kojDisplayModule,
    giftUserLedgerModule: ctx.giftUserLedgerModule,
    getGiftUserLedger: ctx.getGiftUserLedger,
    capybaraFlowModule: ctx.capybaraFlowModule,
    getOutputState: ctx.getOutputState,
    giftSupporterProfileModule: ctx.giftSupporterProfileModule,
    getGiftSupporterProfile: ctx.getGiftSupporterProfile,
    kojnozoutVitalsModule: ctx.kojnozoutVitalsModule,
    ecosystemOrchestratorModule: ctx.ecosystemOrchestratorModule,
    getEcosystemState: ctx.getEcosystemState,
    runtimeConfig: ctx.runtimeConfig,
    obsConnected: ctx.obsConnected,
    getVoicePlaybackSnapshot: ctx.getVoicePlaybackSnapshot,
    translationRuntime: ctx.translationRuntime,
    getVoicePlaybackSeq: ctx.getVoicePlaybackSeq,
    getVoiceSpeakQueueLength: ctx.getVoiceSpeakQueueLength,
    getOverlayLastAcceptedAt: ctx.getOverlayLastAcceptedAt,
    getOutputLastStreamerMediaAt: ctx.getOutputLastStreamerMediaAt
  };
}

function createOverlayPublicApi(overlayPublicResponseModule, ctx) {
  if (typeof overlayPublicResponseModule?.createOverlayPublicResponse !== "function") {
    return {
      buildOverlayStateCacheKey: () => "",
      buildPublicOverlayStateResponse: () => ({ ok: false, error: "overlay_public_missing" })
    };
  }

  return overlayPublicResponseModule.createOverlayPublicResponse(buildOverlayPublicDeps(ctx));
}

module.exports = { buildOverlayPublicDeps, createOverlayPublicApi };
