"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped startup-overlay host bindings for createStartupOverlayRuntime.
 */

function buildStartupOverlayCtx(host = {}) {
  const { core = {}, modules = {}, state = {}, media = {}, obs = {}, handlers = {} } = host;

  return {
    writeLog: core.writeLog,
    startupCheckModule: modules.startupCheckModule,
    mediaCatalogModule: modules.mediaCatalogModule,
    ttsEngine: resolveRuntimeGetter(modules.getTtsEngine, modules.ttsEngine),
    runtimeConfig: core.runtimeConfig,
    kickBridgeModule: modules.kickBridgeModule,
    runtimeSecurityModule: modules.runtimeSecurityModule,
    getPort: core.getPort,
    getBindHost: core.getBindHost,
    getObsConnected: state.getObsConnected,
    getObs: state.getObs,
    videoEngine: resolveRuntimeGetter(media.getVideoEngine, media.videoEngine),
    MIA_SPLIT_OVERLAYS: media.MIA_SPLIT_OVERLAYS,
    flashStartupCheckBrowserSource: obs.flashStartupCheckBrowserSource,
    executeOverlay: handlers.executeOverlay,
    deliveryRuntime: handlers.deliveryRuntime,
    mirrorSpeechOverlayFromVoice: handlers.mirrorSpeechOverlayFromVoice,
    invalidateOverlayStateCache: handlers.invalidateOverlayStateCache,
    voiceHoldUntilTs: core.voiceHoldUntilTs,
    obsBrowserRefreshOnConnectEnabled: obs.obsBrowserRefreshOnConnectEnabled,
    refreshObsMiaBrowserSources: obs.refreshObsMiaBrowserSources,
    projectRoot: core.projectRoot,
    preflightTestsModule: modules.preflightTestsModule
  };
}

module.exports = { buildStartupOverlayCtx };
