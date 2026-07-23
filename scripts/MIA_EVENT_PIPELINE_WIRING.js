"use strict";

/**
 * Event pipeline factory — deps bag for createEventPipeline.
 */

function buildEventPipelineDeps(ctx) {
  return {
    normalizeIncomingEvent: ctx.normalizeIncomingEvent,
    upper: ctx.upper,
    streamSessionModule: ctx.streamSessionModule,
    ingestDeduper: ctx.ingestDeduper,
    writeLog: ctx.writeLog,
    safeString: ctx.safeString,
    recordIngestSummary: ctx.recordIngestSummary,
    t0EngagementModule: ctx.t0EngagementModule,
    executeOverlay: ctx.executeOverlay,
    activateT0Flyby: ctx.activateT0Flyby,
    getUserLabel: ctx.getUserLabel,
    pushRecentParticipant: ctx.pushRecentParticipant,
    pushChatFeed: ctx.pushChatFeed,
    proactiveHostModule: ctx.proactiveHostModule,
    handleSoloStreamChatActivity: ctx.handleSoloStreamChatActivity,
    chatLexiconModule: ctx.chatLexiconModule,
    sessionMemoryModule: ctx.sessionMemoryModule,
    chatBrain: ctx.chatBrain,
    runtimeConfig: ctx.runtimeConfig,
    immersiveSceneModule: ctx.immersiveSceneModule,
    applyCareQuestProgress: ctx.applyCareQuestProgress,
    deliverQuestCompleteMoment: ctx.deliverQuestCompleteMoment,
    tryHandleKojnozoutCommands: ctx.tryHandleKojnozoutCommands,
    tryHandleKojStateShowcaseCommand: ctx.tryHandleKojStateShowcaseCommand,
    tryHandleStreamerShowcaseCommand: ctx.tryHandleStreamerShowcaseCommand,
    tryHandleStreamerMediaCommand: ctx.tryHandleStreamerMediaCommand,
    tryHandleCapybaraWaitingComment: ctx.tryHandleCapybaraWaitingComment,
    supportResolver: ctx.supportResolver,
    enrichGiftEconomyContext: ctx.enrichGiftEconomyContext,
    nowIso: ctx.nowIso,
    giftUserLedgerModule: ctx.giftUserLedgerModule,
    applyRuntimeStateImpact: ctx.applyRuntimeStateImpact,
    applyWorldLayer: ctx.applyWorldLayer,
    streamAudienceModule: ctx.streamAudienceModule,
    shadowRuntime: ctx.shadowRuntime,
    recordShadowPipelineSummary: ctx.recordShadowPipelineSummary,
    buildSupportAction: ctx.buildSupportAction,
    buildDirectChatAction: ctx.buildDirectChatAction,
    normalizeActionResult: ctx.normalizeActionResult,
    prepareGiftEconomyPresentation: ctx.prepareGiftEconomyPresentation,
    kojnozoutVitalsModule: ctx.kojnozoutVitalsModule,
    kojnozoutPersistenceModule: ctx.kojnozoutPersistenceModule,
    deliverChatTranslation: ctx.deliverChatTranslation,
    responseEngine: ctx.responseEngine,
    llmAdapterModule: ctx.llmAdapterModule,
    attachGiftVideoPlan: ctx.attachGiftVideoPlan,
    speakerRoutingModule: ctx.speakerRoutingModule,
    videoEngine: ctx.videoEngine,
    getObsSourceAudioMap: ctx.getObsSourceAudioMap,
    executeGiftPresentationOverlays: ctx.executeGiftPresentationOverlays,
    deliverActionVoice: ctx.deliverActionVoice,
    animationTraceModule: ctx.animationTraceModule,
    runtimeExecution: ctx.runtimeExecution,
    executeVideo: ctx.executeVideo,
    schedulePostGiftMediaExperiences: ctx.schedulePostGiftMediaExperiences,
    capybaraFlowModule: ctx.capybaraFlowModule,
    giftMapModule: ctx.giftMapModule,
    giftAnimationContextModule: ctx.giftAnimationContextModule,
    scheduleDeferredMiaVoice: ctx.scheduleDeferredMiaVoice,
    maybeDeliverMiaVoice: ctx.maybeDeliverMiaVoice,
    deliverEvolutionMoment: ctx.deliverEvolutionMoment,
    getStreamSession: ctx.getStreamSession,
    setStreamSession: ctx.setStreamSession,
    getGiftSupporterProfile: ctx.getGiftSupporterProfile,
    setGiftSupporterProfile: ctx.setGiftSupporterProfile,
    getGiftUserLedger: ctx.getGiftUserLedger,
    setGiftUserLedger: ctx.setGiftUserLedger,
    getLastGiftMapping: ctx.getLastGiftMapping,
    setLastGiftMapping: ctx.setLastGiftMapping,
    getStreamState: ctx.getStreamState,
    setStreamState: ctx.setStreamState,
    getOutputState: ctx.getOutputState,
    getOverlayState: ctx.getOverlayState,
    getKojnozoutState: ctx.getKojnozoutState,
    getEcosystemState: ctx.getEcosystemState
  };
}

function createEventPipelineApi(eventPipelineModule, ctx) {
  if (typeof eventPipelineModule?.createEventPipeline !== "function") {
    return {
      processEvent: async () => ({
        status: 503,
        body: { ok: false, error: "event_pipeline_missing" }
      })
    };
  }

  return eventPipelineModule.createEventPipeline(buildEventPipelineDeps(ctx));
}

module.exports = { buildEventPipelineDeps, createEventPipelineApi };
