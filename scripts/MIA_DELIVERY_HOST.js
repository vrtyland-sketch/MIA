"use strict";

/**
 * Assemble grouped delivery-runtime host bindings from flat index bindings.
 */

function buildDeliveryHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      runtimeConfig: b.runtimeConfig,
      writeLog: b.writeLog,
      safeString: b.safeString,
      cloneJson: b.cloneJson,
      voiceHoldUntilTs: b.voiceHoldUntilTs
    },
    overlay: {
      setOverlay: b.setOverlay,
      getOverlayState: b.getOverlayState,
      overlayStateModule: b.overlayStateModule,
      getOverlayStateCache: b.getOverlayStateCache,
      invalidateOverlayStateCache: b.invalidateOverlayStateCache,
      getOverlayTiming: b.getOverlayTiming,
      getOverlayQueue: b.getOverlayQueue,
      getVoicePriorityLayer: b.getVoicePriorityLayer,
      getObsOverlayRenderer: b.getObsOverlayRenderer,
      overlayEmitResultModule: b.overlayEmitResultModule
    },
    obs: {
      obsBrowserRefreshOnOverlayEnabled: b.obsBrowserRefreshOnOverlayEnabled,
      scheduleObsBrowserRefresh: b.scheduleObsBrowserRefresh
    },
    media: {
      getVideoEngine: b.getVideoEngine,
      videoEngineModule: b.videoEngineModule,
      bowlFullVideoModule: b.bowlFullVideoModule
    },
    state: {
      getOutputState: b.getOutputState,
      getKojnozoutState: b.getKojnozoutState,
      getObsConnected: b.getObsConnected
    },
    obsConnect: {
      forceReconnectObs: b.forceReconnectObs,
      ensureObsConnectedWithRetry: b.ensureObsConnectedWithRetry
    },
    handlers: {
      getUserLabel: b.getUserLabel,
      tryAutoBossMissionFromGift: b.tryAutoBossMissionFromGift
    },
    modules: {
      speakerRoutingModule: b.speakerRoutingModule,
      getTtsEngine: b.getTtsEngine,
      languageModule: b.languageModule,
      sessionMemoryModule: b.sessionMemoryModule
    }
  };
}

module.exports = { buildDeliveryHost };
