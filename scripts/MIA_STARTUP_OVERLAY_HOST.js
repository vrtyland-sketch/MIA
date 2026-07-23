"use strict";

/**
 * Assemble grouped startup-overlay host bindings from flat index bindings.
 */

function buildStartupOverlayHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      writeLog: b.writeLog,
      runtimeConfig: b.runtimeConfig,
      getPort: b.getPort,
      getBindHost: b.getBindHost,
      voiceHoldUntilTs: b.voiceHoldUntilTs,
      projectRoot: b.projectRoot
    },
    modules: {
      startupCheckModule: b.startupCheckModule,
      mediaCatalogModule: b.mediaCatalogModule,
      getTtsEngine: b.getTtsEngine,
      kickBridgeModule: b.kickBridgeModule,
      runtimeSecurityModule: b.runtimeSecurityModule,
      preflightTestsModule: b.preflightTestsModule
    },
    state: {
      getObsConnected: b.getObsConnected,
      getObs: b.getObs
    },
    media: {
      getVideoEngine: b.getVideoEngine,
      MIA_SPLIT_OVERLAYS: b.MIA_SPLIT_OVERLAYS
    },
    obs: {
      flashStartupCheckBrowserSource: b.flashStartupCheckBrowserSource,
      obsBrowserRefreshOnConnectEnabled: b.obsBrowserRefreshOnConnectEnabled,
      refreshObsMiaBrowserSources: b.refreshObsMiaBrowserSources
    },
    handlers: {
      executeOverlay: b.executeOverlay,
      deliveryRuntime: b.deliveryRuntime,
      mirrorSpeechOverlayFromVoice: b.mirrorSpeechOverlayFromVoice,
      invalidateOverlayStateCache: b.invalidateOverlayStateCache
    }
  };
}

module.exports = { buildStartupOverlayHost };
