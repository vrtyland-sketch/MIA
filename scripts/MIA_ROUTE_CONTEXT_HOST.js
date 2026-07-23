"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Assemble grouped route-context host bindings from flat index bindings.
 */

function buildRouteContextHost(bindings = {}) {
  const b = bindings;

  return {
    modules: {
      overlayStateModule: b.overlayStateModule,
      platformArenaModule: b.platformArenaModule,
      overlayStateCache: resolveRuntimeGetter(b.getOverlayStateCache, b.overlayStateCache),
      mediaCatalogModule: b.mediaCatalogModule,
      mediaOrchestratorModule: b.mediaOrchestratorModule,
      mediaApplyObsModule: b.mediaApplyObsModule,
      mediaTemplateRendererModule: b.mediaTemplateRendererModule,
      selfRestartModule: b.selfRestartModule,
      speakerRoutingModule: b.speakerRoutingModule,
      obsFixLayoutModule: b.obsFixLayoutModule,
      immersiveSceneModule: b.immersiveSceneModule,
      streamerMattingModule: b.streamerMattingModule,
      obsStreamerCamerasModule: b.obsStreamerCamerasModule,
      bossMissionModule: b.bossMissionModule,
      mattingIngestBridge: resolveRuntimeGetter(b.getMattingIngestBridge, b.mattingIngestBridge),
      streamerIdentityModule: b.streamerIdentityModule,
      kojnozoutDuelModule: b.kojnozoutDuelModule,
      kojnozoutBackpackModule: b.kojnozoutBackpackModule,
      kojRosterModule: b.kojRosterModule,
      arenaBattleDemo: resolveRuntimeGetter(b.getArenaBattleDemo, b.arenaBattleDemo),
      remoteDevModule: b.remoteDevModule,
      giftMapEnterprise: b.giftMapEnterprise,
      miaPaintBridge: b.miaPaintBridge,
      miaPaintWs: b.miaPaintWs,
      languageModule: b.languageModule,
      translateModule: b.translateModule,
      getInterpreterRuntime: b.getInterpreterRuntime,
      translationRuntime: resolveRuntimeGetter(b.getInterpreterRuntime, b.translationRuntime),
      runtimeSecurityModule: b.runtimeSecurityModule,
      capybaraFlowModule: b.capybaraFlowModule,
      giftVisualComposerModule: b.giftVisualComposerModule,
      viewerStoryModule: b.viewerStoryModule,
      storyAnimationEngineModule: b.storyAnimationEngineModule,
      storyVideoEngineModule: b.storyVideoEngineModule,
      soloStreamModule: b.soloStreamModule,
      proactiveHostModule: b.proactiveHostModule,
      voiceLayer: resolveRuntimeGetter(b.getVoiceLayer, b.voiceLayer),
      miaEyesModule: b.miaEyesModule,
      displayVisionModule: b.displayVisionModule,
      obsVision: resolveRuntimeGetter(b.getObsVision, b.obsVision),
      obsVisionModule: b.obsVisionModule,
      animationEngineModule: b.animationEngineModule,
      kojTestModeModule: b.kojTestModeModule,
      kojnozoutVitalsModule: b.kojnozoutVitalsModule,
      kojnozoutPersistenceModule: b.kojnozoutPersistenceModule,
      kojnozoutModule: b.kojnozoutModule,
      streamerShowcaseModule: b.streamerShowcaseModule
    },
    state: {
      getOverlayState: b.getOverlayState,
      setOverlayState: b.setOverlayState,
      getPort: b.getPort,
      getObsConnected: b.getObsConnected,
      getObs: b.getObs,
      getDuelState: b.getDuelState,
      setDuelState: b.setDuelState,
      getBackpackState: b.getBackpackState,
      getArenaState: b.getArenaState,
      setArenaState: b.setArenaState,
      getLastGiftMapping: b.getLastGiftMapping,
      getOutputState: b.getOutputState,
      getKojnozoutState: b.getKojnozoutState,
      setKojnozoutState: b.setKojnozoutState
    },
    routes: {
      buildStartupCheckPayload: b.buildStartupCheckPayload,
      buildHealthPayload: b.buildHealthPayload,
      buildDiagnosePayload: b.buildDiagnosePayload,
      ingestAuthGuard: b.ingestAuthGuard,
      handleIngest: b.handleIngest,
      handleAudienceIngest: b.handleAudienceIngest,
      localAdminGuard: b.localAdminGuard,
      debugRouteGuard: b.debugRouteGuard,
      buildPublicOverlayStateResponse: b.buildPublicOverlayStateResponse,
      buildOverlayStateCacheKey: b.buildOverlayStateCacheKey,
      setOverlay: b.setOverlay,
      executeOverlay: b.executeOverlay,
      deliverActionVoice: b.deliverActionVoice,
      getVoicePlaybackSnapshot: b.getVoicePlaybackSnapshot,
      buildVisionContext: b.buildVisionContext,
      buildMiaStatusResponse: b.buildMiaStatusResponse,
      mirrorSpeechOverlayFromVoice: b.mirrorSpeechOverlayFromVoice,
      invalidateOverlayStateCache: b.invalidateOverlayStateCache,
      handleDebugComment: b.handleDebugComment,
      handleDebugGift: b.handleDebugGift,
      processEvent: b.processEvent,
      applyWorldModeChange: b.applyWorldModeChange,
      activateComboMoment: b.activateComboMoment,
      activateBossCinematic: b.activateBossCinematic,
      buildSoloStreamSceneCtx: b.buildSoloStreamSceneCtx,
      maybeDeliverMiaVoice: b.maybeDeliverMiaVoice,
      deliverMicTranslation: b.deliverMicTranslation,
      speakMiaShowcaseLine: b.speakMiaShowcaseLine
    },
    obs: {
      refreshObsMiaBrowserSources: b.refreshObsMiaBrowserSources,
      ensureObsConnectedWithRetry: b.ensureObsConnectedWithRetry,
      safeObsCall: b.safeObsCall,
      fixObsOverlayBrowserLayouts: b.fixObsOverlayBrowserLayouts,
      fixObsOverlaySceneTransforms: b.fixObsOverlaySceneTransforms,
      ensureObsVoiceBrowserReady: b.ensureObsVoiceBrowserReady,
      auditObsMiaBrowserSources: b.auditObsMiaBrowserSources,
      ensureObsStreamerCameras: b.ensureObsStreamerCameras,
      buildObsHealthSnapshot: b.buildObsHealthSnapshot,
      forceReconnectObs: b.forceReconnectObs,
      runObsMaintenanceScript: b.runObsMaintenanceScript,
      ensureObsHands: b.ensureObsHands
    },
    media: {
      videoEngine: resolveRuntimeGetter(b.getVideoEngine, b.videoEngine),
      bowlFullVideoModule: b.bowlFullVideoModule,
      miaEyes: resolveRuntimeGetter(b.getMiaEyes, b.miaEyes)
    },
    koj: {
      scheduleWorldSave: b.scheduleWorldSave
    },
    core: {
      safeRequire: b.safeRequire,
      getServerStartedAt: b.getServerStartedAt,
      getStreamSession: b.getStreamSession,
      setStreamSession: b.setStreamSession,
      deliveryRuntime: b.deliveryRuntime,
      runtimeConfig: b.runtimeConfig,
      writeLog: b.writeLog,
      safeString: b.safeString,
      lastDuelSyncSummary: b.lastDuelSyncSummary,
      MIA_SPLIT_OVERLAYS: b.MIA_SPLIT_OVERLAYS,
      overlayStaticDir: b.overlayStaticDir,
      streamSessionModule: b.streamSessionModule,
      getSpamSessionEngine: b.getSpamSessionEngine,
      spamSessionEngine: resolveRuntimeGetter(b.getSpamSessionEngine, b.spamSessionEngine),
      getStreamState: b.getStreamState,
      serverStartedAt: b.serverStartedAt,
      ecosystemState: b.ecosystemState,
      ttsEngine: resolveRuntimeGetter(b.getTtsEngine, b.ttsEngine),
      MIA_OVERLAY_BASE: b.MIA_OVERLAY_BASE,
      voiceHoldUntilTs: b.voiceHoldUntilTs
    }
  };
}

module.exports = { buildRouteContextHost };
