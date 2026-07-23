"use strict";

/**
 * Assemble grouped event-pipeline host bindings from flat index bindings.
 */

function buildEventPipelineHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      normalizeIncomingEvent: b.normalizeIncomingEvent,
      upper: b.upper,
      writeLog: b.writeLog,
      safeString: b.safeString,
      nowIso: b.nowIso,
      runtimeConfig: b.runtimeConfig,
      recordIngestSummary: b.recordIngestSummary,
      recordShadowPipelineSummary: b.recordShadowPipelineSummary
    },
    modules: {
      streamSessionModule: b.streamSessionModule,
      getIngestDeduper: b.getIngestDeduper,
      t0EngagementModule: b.t0EngagementModule,
      proactiveHostModule: b.proactiveHostModule,
      chatLexiconModule: b.chatLexiconModule,
      sessionMemoryModule: b.sessionMemoryModule,
      chatBrain: b.chatBrain,
      immersiveSceneModule: b.immersiveSceneModule,
      supportResolver: b.supportResolver,
      giftUserLedgerModule: b.giftUserLedgerModule,
      streamAudienceModule: b.streamAudienceModule,
      shadowRuntime: b.shadowRuntime,
      kojnozoutVitalsModule: b.kojnozoutVitalsModule,
      kojnozoutPersistenceModule: b.kojnozoutPersistenceModule,
      responseEngine: b.responseEngine,
      llmAdapterModule: b.llmAdapterModule,
      speakerRoutingModule: b.speakerRoutingModule,
      animationTraceModule: b.animationTraceModule,
      runtimeExecution: b.runtimeExecution,
      capybaraFlowModule: b.capybaraFlowModule,
      giftMapModule: b.giftMapModule,
      giftAnimationContextModule: b.giftAnimationContextModule
    },
    handlers: {
      executeOverlay: b.executeOverlay,
      activateT0Flyby: b.activateT0Flyby,
      getUserLabel: b.getUserLabel,
      pushRecentParticipant: b.pushRecentParticipant,
      pushChatFeed: b.pushChatFeed,
      handleSoloStreamChatActivity: b.handleSoloStreamChatActivity,
      applyCareQuestProgress: b.applyCareQuestProgress,
      deliverQuestCompleteMoment: b.deliverQuestCompleteMoment,
      tryHandleKojnozoutCommands: b.tryHandleKojnozoutCommands,
      tryHandleKojStateShowcaseCommand: b.tryHandleKojStateShowcaseCommand,
      tryHandleStreamerShowcaseCommand: b.tryHandleStreamerShowcaseCommand,
      tryHandleStreamerMediaCommand: b.tryHandleStreamerMediaCommand,
      tryHandleCapybaraWaitingComment: b.tryHandleCapybaraWaitingComment,
      enrichGiftEconomyContext: b.enrichGiftEconomyContext,
      applyRuntimeStateImpact: b.applyRuntimeStateImpact,
      applyWorldLayer: b.applyWorldLayer,
      buildSupportAction: b.buildSupportAction,
      buildDirectChatAction: b.buildDirectChatAction,
      normalizeActionResult: b.normalizeActionResult,
      prepareGiftEconomyPresentation: b.prepareGiftEconomyPresentation,
      deliverChatTranslation: b.deliverChatTranslation,
      attachGiftVideoPlan: b.attachGiftVideoPlan,
      executeGiftPresentationOverlays: b.executeGiftPresentationOverlays,
      deliverActionVoice: b.deliverActionVoice,
      executeVideo: b.executeVideo,
      schedulePostGiftMediaExperiences: b.schedulePostGiftMediaExperiences,
      scheduleDeferredMiaVoice: b.scheduleDeferredMiaVoice,
      maybeDeliverMiaVoice: b.maybeDeliverMiaVoice,
      deliverEvolutionMoment: b.deliverEvolutionMoment
    },
    media: {
      getVideoEngine: b.getVideoEngine,
      getObsSourceAudioMap: b.getObsSourceAudioMap
    },
    state: {
      getStreamSession: b.getStreamSession,
      setStreamSession: b.setStreamSession,
      getGiftSupporterProfile: b.getGiftSupporterProfile,
      setGiftSupporterProfile: b.setGiftSupporterProfile,
      getGiftUserLedger: b.getGiftUserLedger,
      setGiftUserLedger: b.setGiftUserLedger,
      getLastGiftMapping: b.getLastGiftMapping,
      setLastGiftMapping: b.setLastGiftMapping,
      getStreamState: b.getStreamState,
      setStreamState: b.setStreamState,
      getOutputState: b.getOutputState,
      getOverlayState: b.getOverlayState,
      getKojnozoutState: b.getKojnozoutState,
      getEcosystemState: b.getEcosystemState
    }
  };
}

module.exports = { buildEventPipelineHost };
