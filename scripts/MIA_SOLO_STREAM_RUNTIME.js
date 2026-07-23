"use strict";

/**
 * Solo stream OBS scene sync + proactive host moment delivery.
 */

function createSoloStreamRuntime(deps = {}) {
  const {
    soloStreamModule,
    videoEngine,
    getStreamState,
    streamState,
    getOutputState,
    getOverlayState,
    runtimeConfig,
    serverStartedAt,
    getKojnozoutState,
    getObsConnected,
    obsConnected,
    isVoicePlaybackActive,
    safeObsCall,
    writeLog,
    executeOverlay,
    maybeDeliverMiaVoice,
    safeString
  } = deps;

  function resolveStreamState() {
    if (typeof getStreamState === "function") return getStreamState();
    return streamState;
  }

  function resolveObsConnected() {
    if (typeof getObsConnected === "function") return getObsConnected();
    return Boolean(obsConnected);
  }

  function buildSoloStreamSceneCtx(tick = null) {
    const outputState = typeof getOutputState === "function" ? getOutputState() : {};
    const overlayState = typeof getOverlayState === "function" ? getOverlayState() : {};
    const kojnozoutState =
      typeof getKojnozoutState === "function" ? getKojnozoutState() : {};
    const videoSnapshot =
      videoEngine && typeof videoEngine.getSnapshot === "function"
        ? videoEngine.getSnapshot()
        : null;

    return {
      tick,
      streamState: resolveStreamState(),
      outputState,
      overlayState,
      runtimeConfig,
      serverStartedAt,
      kojnozoutState,
      obsConnected: resolveObsConnected(),
      voiceActive: isVoicePlaybackActive(),
      supportRouteActive: Boolean(
        videoSnapshot?.processing || videoSnapshot?.specialPlaybackActive
      ),
      videoSnapshot
    };
  }

  async function syncSoloStreamObsScene(tick = null) {
    if (typeof soloStreamModule?.evaluateSoloStreamAction !== "function") {
      return null;
    }

    const action = soloStreamModule.evaluateSoloStreamAction(buildSoloStreamSceneCtx(tick));

    if (
      !action ||
      action.action === "noop" ||
      action.action === "hold" ||
      action.action === "enter_deferred"
    ) {
      return action;
    }

    if (typeof soloStreamModule.applySoloStreamAction !== "function") {
      return action;
    }

    const outputState = typeof getOutputState === "function" ? getOutputState() : {};
    const applied = await soloStreamModule.applySoloStreamAction(action, {
      safeObsCall,
      runtimeConfig,
      outputState,
      writeLog
    });

    return { ...action, applied };
  }

  async function handleSoloStreamChatActivity() {
    if (typeof soloStreamModule?.getSoloStreamState !== "function") return;

    const outputState = typeof getOutputState === "function" ? getOutputState() : {};
    const state = soloStreamModule.getSoloStreamState(outputState);
    if (state.phase !== "solo") return;

    const action = soloStreamModule.evaluateSoloStreamAction(buildSoloStreamSceneCtx(null));
    if (action?.action !== "exit") return;

    await soloStreamModule.applySoloStreamAction(action, {
      safeObsCall,
      runtimeConfig,
      outputState,
      writeLog
    });
  }

  async function deliverProactiveHostMoment(payload = {}) {
    if (!payload?.text) return;

    const source =
      safeString(payload?.meta?.source) === "solo_stream"
        ? "solo_stream"
        : "proactive_host";

    await executeOverlay(payload, {
      source,
      force: false,
      priority: payload.priority || 2
    });

    await maybeDeliverMiaVoice({
      ok: true,
      route: "community",
      overlayPayload: payload,
      speech_text: safeString(payload.text),
      responseContract: {
        speaker: "mia",
        intent: source === "solo_stream" ? "solo_stream" : "proactive_host"
      }
    });

    if (
      source === "solo_stream" &&
      typeof soloStreamModule?.noteSoloSegment === "function"
    ) {
      const outputState = typeof getOutputState === "function" ? getOutputState() : {};
      soloStreamModule.noteSoloSegment(outputState, {
        level: payload?.meta?.soloStreamLevel || payload?.meta?.proactiveLevel || 1
      });
    }
  }

  return {
    buildSoloStreamSceneCtx,
    syncSoloStreamObsScene,
    handleSoloStreamChatActivity,
    deliverProactiveHostMoment
  };
}

module.exports = { createSoloStreamRuntime };
