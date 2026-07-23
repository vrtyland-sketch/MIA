"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped health-runtime host bindings for createHealthRuntime.
 */

function buildHealthCtx(host = {}) {
  const { modules = {}, core = {}, state = {}, obs = {}, overlay = {} } = host;

  return {
    kojnozoutModule: modules.kojnozoutModule,
    getKojnozoutState: state.getKojnozoutState,
    getStreamState: state.getStreamState,
    kickBridgeModule: modules.kickBridgeModule,
    twitchBridgeModule: modules.twitchBridgeModule,
    telegramBridgeModule: modules.telegramBridgeModule,
    getPort: core.getPort,
    getObsConnected: state.getObsConnected,
    nowIso: core.nowIso,
    getLastIngestSummary: state.getLastIngestSummary,
    resolveObsOverlayMode: obs.resolveObsOverlayMode,
    MIA_SPLIT_OVERLAYS: core.MIA_SPLIT_OVERLAYS,
    overlayStateModule: modules.overlayStateModule,
    getOverlayState: state.getOverlayState,
    buildObsHealthSnapshot: obs.buildObsHealthSnapshot,
    ttsEngine: resolveRuntimeGetter(modules.getTtsEngine, modules.ttsEngine),
    runtimeConfig: core.runtimeConfig,
    getVoicePlaybackSnapshot: overlay.getVoicePlaybackSnapshot,
    llmAdapterModule: modules.llmAdapterModule,
    videoEngine: resolveRuntimeGetter(modules.getVideoEngine, modules.videoEngine),
    overlayTiming: resolveRuntimeGetter(overlay.getOverlayTiming, overlay.overlayTiming),
    voicePriorityLayer: resolveRuntimeGetter(overlay.getVoicePriorityLayer, overlay.voicePriorityLayer),
    overlayQueue: resolveRuntimeGetter(overlay.getOverlayQueue, overlay.overlayQueue)
  };
}

module.exports = { buildHealthCtx };
