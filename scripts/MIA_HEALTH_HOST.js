"use strict";

/**
 * Assemble grouped health-runtime host bindings from flat index bindings.
 */

function buildHealthHost(bindings = {}) {
  const b = bindings;

  return {
    modules: {
      kojnozoutModule: b.kojnozoutModule,
      kickBridgeModule: b.kickBridgeModule,
      twitchBridgeModule: b.twitchBridgeModule,
      telegramBridgeModule: b.telegramBridgeModule,
      overlayStateModule: b.overlayStateModule,
      getTtsEngine: b.getTtsEngine,
      llmAdapterModule: b.llmAdapterModule,
      getVideoEngine: b.getVideoEngine
    },
    core: {
      getPort: b.getPort,
      nowIso: b.nowIso,
      runtimeConfig: b.runtimeConfig,
      MIA_SPLIT_OVERLAYS: b.MIA_SPLIT_OVERLAYS
    },
    state: {
      getKojnozoutState: b.getKojnozoutState,
      getStreamState: b.getStreamState,
      getObsConnected: b.getObsConnected,
      getLastIngestSummary: b.getLastIngestSummary,
      getOverlayState: b.getOverlayState
    },
    obs: {
      resolveObsOverlayMode: b.resolveObsOverlayMode,
      buildObsHealthSnapshot: b.buildObsHealthSnapshot
    },
    overlay: {
      getVoicePlaybackSnapshot: b.getVoicePlaybackSnapshot,
      getOverlayTiming: b.getOverlayTiming,
      getVoicePriorityLayer: b.getVoicePriorityLayer,
      getOverlayQueue: b.getOverlayQueue
    }
  };
}

module.exports = { buildHealthHost };
