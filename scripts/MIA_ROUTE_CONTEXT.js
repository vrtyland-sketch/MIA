"use strict";

/**
 * HTTP route context factory — deps bag for registerAllRoutes.
 */

function createRouteContextRuntime(deps = {}) {
  const {
    overlayStateModule,
    getOverlayState,
    setOverlayState,
    safeRequire,
    getPort,
    getObsConnected,
    getObs,
    getDuelState,
    setDuelState,
    getBackpackState,
    getArenaState,
    setArenaState,
    platformArenaModule,
    getLastGiftMapping,
    getServerStartedAt,
    getStreamSession,
    setStreamSession,
    getOutputState,
    getKojnozoutState,
    setKojnozoutState,
    deliveryRuntime,
    getDuelStateActive,
    bumpVoicePlaybackSeq,
    setVoicePlaybackState
  } = deps;

  function resetOverlayState() {
    const next =
      typeof overlayStateModule?.createOverlayState === "function"
        ? overlayStateModule.createOverlayState()
        : { miaOverlay: null, kojnozoutOverlay: null, chatFeed: [] };
    if (typeof setOverlayState === "function") {
      setOverlayState(next);
    }
  }

  function buildMiaRouteContext() {
    const port = typeof getPort === "function" ? getPort() : deps.PORT;
    const overlayState = typeof getOverlayState === "function" ? getOverlayState() : deps.overlayState;
    const resolveStreamState = () => {
      if (typeof deps.getStreamState === "function") return deps.getStreamState();
      return deps.streamState || {};
    };
    const routeGetStreamState =
      typeof deps.getStreamState === "function"
        ? deps.getStreamState
        : () => deps.streamState || {};

    return {
      buildStartupCheckPayload: deps.buildStartupCheckPayload,
      buildHealthPayload: deps.buildHealthPayload,
      buildDiagnosePayload: deps.buildDiagnosePayload,
      ingestAuthGuard: deps.ingestAuthGuard,
      handleIngest: deps.handleIngest,
      handleAudienceIngest: deps.handleAudienceIngest,
      localAdminGuard: deps.localAdminGuard,
      debugRouteGuard: deps.debugRouteGuard,
      buildPublicOverlayStateResponse: deps.buildPublicOverlayStateResponse,
      overlayStateCache: deps.overlayStateCache,
      buildOverlayStateCacheKey: deps.buildOverlayStateCacheKey,
      setOverlay: deps.setOverlay,
      refreshObsMiaBrowserSources: deps.refreshObsMiaBrowserSources,
      executeOverlay: deps.executeOverlay,
      resetOverlayState,
      PORT: port,
      mediaCatalogModule: deps.mediaCatalogModule,
      mediaOrchestratorModule: deps.mediaOrchestratorModule,
      mediaApplyObsModule: deps.mediaApplyObsModule,
      mediaTemplateRendererModule: deps.mediaTemplateRendererModule,
      ensureObsConnectedWithRetry: deps.ensureObsConnectedWithRetry,
      selfRestartModule: deps.selfRestartModule,
      runtimeConfig: deps.runtimeConfig,
      videoEngine: deps.videoEngine,
      bowlFullVideoModule: deps.bowlFullVideoModule,
      safeObsCall: deps.safeObsCall,
      miaEyes: deps.miaEyes,
      deliverActionVoice: deps.deliverActionVoice,
      getVoicePlaybackSnapshot: deps.getVoicePlaybackSnapshot,
      speakerRoutingModule: deps.speakerRoutingModule,
      fixObsOverlayBrowserLayouts: deps.fixObsOverlayBrowserLayouts,
      fixObsOverlaySceneTransforms: deps.fixObsOverlaySceneTransforms,
      ensureObsVoiceBrowserReady: deps.ensureObsVoiceBrowserReady,
      auditObsMiaBrowserSources: deps.auditObsMiaBrowserSources,
      ensureObsStreamerCameras: deps.ensureObsStreamerCameras,
      buildObsHealthSnapshot: deps.buildObsHealthSnapshot,
      forceReconnectObs: deps.forceReconnectObs,
      getObsConnected: typeof getObsConnected === "function" ? getObsConnected : () => false,
      getObs: typeof getObs === "function" ? getObs : () => null,
      runObsMaintenanceScript: deps.runObsMaintenanceScript,
      obsFixLayoutModule: deps.obsFixLayoutModule,
      buildVisionContext: deps.buildVisionContext,
      immersiveSceneModule: deps.immersiveSceneModule,
      streamerMattingModule: deps.streamerMattingModule,
      overlayStateModule: deps.overlayStateModule,
      overlayState,
      getOverlayState: typeof getOverlayState === "function" ? getOverlayState : () => overlayState,
      obsStreamerCamerasModule: deps.obsStreamerCamerasModule,
      bossMissionModule: deps.bossMissionModule,
      mattingIngestBridge: deps.mattingIngestBridge,
      ensureObsHands: deps.ensureObsHands,
      streamerIdentityModule: deps.streamerIdentityModule,
      writeLog: deps.writeLog,
      safeString: deps.safeString,
      kojnozoutDuelModule: deps.kojnozoutDuelModule,
      kojnozoutBackpackModule: deps.kojnozoutBackpackModule,
      platformArenaModule,
      kojRosterModule: deps.kojRosterModule,
      arenaBattleDemo: deps.arenaBattleDemo,
      scheduleWorldSave: deps.scheduleWorldSave,
      getDuelState: typeof getDuelState === "function" ? getDuelState : () => ({}),
      setDuelState: typeof setDuelState === "function" ? setDuelState : () => {},
      getBackpackState: typeof getBackpackState === "function" ? getBackpackState : () => ({}),
      getArenaState: typeof getArenaState === "function" ? getArenaState : () => ({}),
      setArenaState: typeof setArenaState === "function" ? setArenaState : () => {},
      saveArenaState: (next) => {
        if (typeof platformArenaModule?.saveArenaState === "function") {
          platformArenaModule.saveArenaState(next);
        }
      },
      lastDuelSyncSummary: deps.lastDuelSyncSummary,
      MIA_SPLIT_OVERLAYS: deps.MIA_SPLIT_OVERLAYS,
      overlayStaticDir: deps.overlayStaticDir,
      safeRequire,
      remoteDevModule: deps.remoteDevModule,
      giftMapEnterprise: deps.giftMapEnterprise,
      getLastGiftMapping:
        typeof getLastGiftMapping === "function" ? getLastGiftMapping : () => null,
      getServerStartedAt:
        typeof getServerStartedAt === "function" ? getServerStartedAt : () => Date.now(),
      paintBridge: deps.paintBridge,
      paintWs: deps.paintWs,
      streamSessionModule: deps.streamSessionModule,
      getStreamSession,
      setStreamSession,
      buildMiaStatusResponse: deps.buildMiaStatusResponse,
      buildObsLiveManifest: () => {
        const obsManifest =
          typeof safeRequire === "function"
            ? safeRequire("./scripts/MIA_OBS_LIVE_MANIFEST", {})
            : {};
        return typeof obsManifest.buildLiveManifest === "function"
          ? obsManifest.buildLiveManifest({ port })
          : null;
      },
      spamSessionEngine: deps.spamSessionEngine,
      getOutputState: typeof getOutputState === "function" ? getOutputState : () => ({}),
      getKojnozoutState: typeof getKojnozoutState === "function" ? getKojnozoutState : () => ({}),
      setKojnozoutState: typeof setKojnozoutState === "function" ? setKojnozoutState : () => {},
      getStreamState: routeGetStreamState,
      streamState: resolveStreamState(),
      serverStartedAt: deps.serverStartedAt,
      ecosystemState: deps.ecosystemState,
      ttsEngine: deps.ttsEngine,
      languageModule: deps.languageModule,
      translateModule: deps.translateModule,
      getInterpreterRuntime:
        typeof deps.getInterpreterRuntime === "function"
          ? deps.getInterpreterRuntime
          : () => deps.translationRuntime,
      translationRuntime:
        typeof deps.getInterpreterRuntime === "function"
          ? deps.getInterpreterRuntime()
          : deps.translationRuntime,
      deliverMicTranslation: deps.deliverMicTranslation,
      MIA_OVERLAY_BASE: deps.MIA_OVERLAY_BASE,
      voiceHoldUntilTs: deps.voiceHoldUntilTs,
      mirrorSpeechOverlayFromVoice: deps.mirrorSpeechOverlayFromVoice,
      invalidateOverlayStateCache: deps.invalidateOverlayStateCache,
      bumpVoicePlaybackSeq:
        typeof bumpVoicePlaybackSeq === "function"
          ? bumpVoicePlaybackSeq
          : () => deliveryRuntime?.().bumpVoicePlaybackSeq?.() ?? 0,
      setVoicePlaybackState:
        typeof setVoicePlaybackState === "function"
          ? setVoicePlaybackState
          : (next) => deliveryRuntime?.().setVoicePlaybackState?.(next),
      getDuelStateActive:
        typeof getDuelStateActive === "function" ? getDuelStateActive : () => false,
      runtimeSecurityModule: deps.runtimeSecurityModule,
      handleDebugComment: deps.handleDebugComment,
      handleDebugGift: deps.handleDebugGift,
      processEvent: deps.processEvent,
      applyWorldModeChange: deps.applyWorldModeChange,
      activateComboMoment: deps.activateComboMoment,
      activateBossCinematic: deps.activateBossCinematic,
      capybaraFlowModule: deps.capybaraFlowModule,
      giftVisualComposerModule: deps.giftVisualComposerModule,
      viewerStoryModule: deps.viewerStoryModule,
      storyAnimationEngineModule: deps.storyAnimationEngineModule,
      storyVideoEngineModule: deps.storyVideoEngineModule,
      soloStreamModule: deps.soloStreamModule,
      proactiveHostModule: deps.proactiveHostModule,
      buildSoloStreamSceneCtx: deps.buildSoloStreamSceneCtx,
      voiceLayer: deps.voiceLayer,
      maybeDeliverMiaVoice: deps.maybeDeliverMiaVoice,
      miaEyesModule: deps.miaEyesModule,
      displayVisionModule: deps.displayVisionModule,
      obsVision: deps.obsVision,
      obsVisionModule: deps.obsVisionModule,
      animationEngineModule: deps.animationEngineModule,
      kojTestModeModule: deps.kojTestModeModule,
      kojnozoutVitalsModule: deps.kojnozoutVitalsModule,
      kojnozoutPersistenceModule: deps.kojnozoutPersistenceModule,
      kojnozoutModule: deps.kojnozoutModule,
      streamerShowcaseModule: deps.streamerShowcaseModule,
      speakMiaShowcaseLine: deps.speakMiaShowcaseLine
    };
  }

  return {
    buildMiaRouteContext,
    resetOverlayState
  };
}

module.exports = { createRouteContextRuntime };
