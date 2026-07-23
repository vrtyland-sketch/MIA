"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped delivery-runtime host bindings for createDeliveryRuntime.
 */

function buildDeliveryCtx(host = {}) {
  const { core = {}, overlay = {}, obs = {}, media = {}, state = {}, obsConnect = {}, handlers = {}, modules = {} } =
    host;

  return {
    runtimeConfig: core.runtimeConfig,
    writeLog: core.writeLog,
    safeString: core.safeString,
    cloneJson: core.cloneJson,
    voiceHoldUntilTs: core.voiceHoldUntilTs,
    setOverlay: overlay.setOverlay,
    getOverlayState: overlay.getOverlayState,
    overlayStateModule: overlay.overlayStateModule,
    overlayStateCache: resolveRuntimeGetter(overlay.getOverlayStateCache, overlay.overlayStateCache),
    invalidateOverlayStateCache: overlay.invalidateOverlayStateCache,
    overlayTiming: resolveRuntimeGetter(overlay.getOverlayTiming, overlay.overlayTiming),
    overlayQueue: resolveRuntimeGetter(overlay.getOverlayQueue, overlay.overlayQueue),
    voicePriorityLayer: resolveRuntimeGetter(overlay.getVoicePriorityLayer, overlay.voicePriorityLayer),
    obsOverlayRenderer: resolveRuntimeGetter(overlay.getObsOverlayRenderer, overlay.obsOverlayRenderer),
    overlayEmitResultModule: overlay.overlayEmitResultModule,
    obsBrowserRefreshOnOverlayEnabled: obs.obsBrowserRefreshOnOverlayEnabled,
    scheduleObsBrowserRefresh: obs.scheduleObsBrowserRefresh,
    videoEngine: resolveRuntimeGetter(media.getVideoEngine, media.videoEngine),
    videoEngineModule: media.videoEngineModule,
    bowlFullVideoModule: media.bowlFullVideoModule,
    getOutputState: state.getOutputState,
    getKojnozoutState: state.getKojnozoutState,
    getObsConnected: state.getObsConnected,
    forceReconnectObs: obsConnect.forceReconnectObs,
    ensureObsConnectedWithRetry: obsConnect.ensureObsConnectedWithRetry,
    getUserLabel: handlers.getUserLabel,
    tryAutoBossMissionFromGift: handlers.tryAutoBossMissionFromGift,
    speakerRoutingModule: modules.speakerRoutingModule,
    ttsEngine: resolveRuntimeGetter(modules.getTtsEngine, modules.ttsEngine),
    languageModule: modules.languageModule,
    sessionMemoryModule: modules.sessionMemoryModule
  };
}

module.exports = { buildDeliveryCtx };
