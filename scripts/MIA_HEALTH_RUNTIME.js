"use strict";

/**
 * Health and diagnose HTTP payloads.
 */

function createHealthRuntime(deps = {}) {
  const {
    kojnozoutModule,
    getKojnozoutState,
    getStreamState,
    kickBridgeModule,
    twitchBridgeModule,
    telegramBridgeModule,
    getPort,
    getObsConnected,
    nowIso,
    getLastIngestSummary,
    resolveObsOverlayMode,
    MIA_SPLIT_OVERLAYS,
    overlayStateModule,
    getOverlayState,
    buildObsHealthSnapshot,
    ttsEngine,
    runtimeConfig,
    getVoicePlaybackSnapshot,
    llmAdapterModule,
    videoEngine,
    overlayTiming,
    voicePriorityLayer,
    overlayQueue
  } = deps;

  function buildHealthPayload() {
    const kojnozoutState = typeof getKojnozoutState === "function" ? getKojnozoutState() : {};
    const streamState = typeof getStreamState === "function" ? getStreamState() : {};
    const kojSnap =
      typeof kojnozoutModule?.getKojnozoutSnapshot === "function"
        ? kojnozoutModule.getKojnozoutSnapshot(kojnozoutState, streamState)
        : kojnozoutState;

    const kickStatus =
      typeof kickBridgeModule?.getKickBridgeStatus === "function"
        ? kickBridgeModule.getKickBridgeStatus()
        : null;

    const twitchStatus =
      typeof twitchBridgeModule?.getTwitchBridgeStatus === "function"
        ? twitchBridgeModule.getTwitchBridgeStatus()
        : null;

    const port = typeof getPort === "function" ? getPort() : 3000;
    const obsConnected = typeof getObsConnected === "function" ? getObsConnected() : false;
    const splitOverlays =
      typeof MIA_SPLIT_OVERLAYS === "function" ? MIA_SPLIT_OVERLAYS() : {};

    return {
      ok: true,
      service: "MIA",
      port,
      obsConnected,
      time: typeof nowIso === "function" ? nowIso() : new Date().toISOString(),
      lastIngest:
        typeof getLastIngestSummary === "function" ? getLastIngestSummary() || null : null,
      kickBridge: kickStatus,
      twitchBridge: twitchStatus,
      bowlPercent: kojSnap?.bowlPercent ?? null,
      overlays: {
        mode: typeof resolveObsOverlayMode === "function" ? resolveObsOverlayMode() : "split",
        ...splitOverlays
      }
    };
  }

  async function buildDiagnosePayload() {
    const overlayState =
      typeof getOverlayState === "function" ? getOverlayState() : {};
    const snap =
      typeof overlayStateModule?.getOverlaySnapshot === "function"
        ? overlayStateModule.getOverlaySnapshot(overlayState, { maxChatFeedItems: 3 })
        : overlayState;

    const obsHealth =
      typeof buildObsHealthSnapshot === "function" ? await buildObsHealthSnapshot() : null;

    const port = typeof getPort === "function" ? getPort() : 3000;
    const obsConnected = typeof getObsConnected === "function" ? getObsConnected() : false;
    const splitOverlays =
      typeof MIA_SPLIT_OVERLAYS === "function" ? MIA_SPLIT_OVERLAYS() : {};

    return {
      ok: true,
      server: "running",
      port,
      obsConnected,
      obsHealth,
      lastIngest:
        typeof getLastIngestSummary === "function" ? getLastIngestSummary() || null : null,
      activeOverlays: {
        mia: snap?.miaOverlay?.text || null,
        koj: snap?.kojnozoutOverlay?.text || null,
        miaHoldUntil: snap?.miaOverlay?.holdUntilTs || null,
        kojHoldUntil: snap?.kojnozoutOverlay?.holdUntilTs || null
      },
      obsBrowserUrl: splitOverlays.speech,
      obsOverlayMode:
        typeof resolveObsOverlayMode === "function" ? resolveObsOverlayMode() : "split",
      obsOverlayUrls: splitOverlays,
      pingUrl: `http://127.0.0.1:${port}/ping-overlay`,
      ttsTestUrl: `http://127.0.0.1:${port}/tts/test`,
      tikfinityIngest: `http://127.0.0.1:${port}/ingest`,
      tts: ttsEngine
        ? (() => {
            const cfg =
              typeof ttsEngine.resolveConfig === "function"
                ? ttsEngine.resolveConfig(runtimeConfig)
                : {};
            const { apiKey: _apiKey, ...safeCfg } = cfg;
            return {
              ...safeCfg,
              apiKeyConfigured: Boolean(cfg.apiKey),
              voicePlayback:
                typeof getVoicePlaybackSnapshot === "function"
                  ? getVoicePlaybackSnapshot()
                  : null
            };
          })()
        : { enabled: false },
      llm: llmAdapterModule?.resolveConfig
        ? (() => {
            const cfg = llmAdapterModule.resolveConfig(runtimeConfig);
            const chain =
              typeof llmAdapterModule.resolveProviderChain === "function"
                ? llmAdapterModule.resolveProviderChain(runtimeConfig)
                : [];
            return {
              mode: cfg.mode,
              enabled: llmAdapterModule.isEnabled(runtimeConfig),
              apiKeyConfigured: chain.length > 0,
              provider: cfg.provider || "openai",
              model: cfg.model,
              chain: chain.map((c) => ({ provider: c.provider, model: c.model }))
            };
          })()
        : { enabled: false },
      video:
        videoEngine && typeof videoEngine.getSnapshot === "function"
          ? {
              ...videoEngine.getSnapshot(),
              obsRequired: true,
              obsConnected,
              giftScene: runtimeConfig?.obs?.sceneName || "SPINAK_ENGINE_GIFTS",
              testUrl: `http://127.0.0.1:${port}/video/test?tier=T1`,
              diagUrl: `http://127.0.0.1:${port}/video/diag`
            }
          : { obsConnected, enabled: false },
      overlay: {
        timing: overlayTiming?.getSnapshot?.() || null,
        voicePriority: voicePriorityLayer?.getSnapshot?.() || null,
        queueSize: overlayQueue?.size?.() ?? 0,
        chatFeed: Array.isArray(snap?.chatFeed) ? snap.chatFeed.slice(0, 5) : []
      },
      kickBridge:
        typeof kickBridgeModule?.getKickBridgeStatus === "function"
          ? kickBridgeModule.getKickBridgeStatus()
          : null,
      telegramBridge:
        typeof telegramBridgeModule?.getTelegramBridgeStatus === "function"
          ? telegramBridgeModule.getTelegramBridgeStatus()
          : null
    };
  }

  return {
    buildHealthPayload,
    buildDiagnosePayload
  };
}

module.exports = { createHealthRuntime };
