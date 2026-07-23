"use strict";

/**
 * /status response builder — stream, koj, overlay, gift map snapshot.
 */

function createStatusRuntime(deps = {}) {
  const {
    videoEngine,
    spamSessionEngine,
    kojnozoutModule,
    getKojnozoutStateForSnapshot,
    getKojnozoutState,
    getStreamState,
    cloneJson,
    overlayStateModule,
    getOverlayState,
    runtimeConfig,
    kickBridgeModule,
    getPort,
    nowIso,
    getServerStartedAt,
    streamSessionModule,
    getStreamSession,
    streamEconomyConfig,
    getObsConnected,
    giftMapEnterprise,
    getLastGiftMapping,
    getOutputState,
    getHostTeamScoreState,
    awayModeModule,
    getEcosystemState,
    kojnozoutVitalsModule,
    kojnozoutDuelModule,
    getDuelState,
    getLastDuelSyncSummary,
    kojnozoutBackpackModule,
    getBackpackState,
    kojnozoutAssetsModule,
    ecosystemOrchestratorModule,
    getLastIngestSummary,
    chatLexiconModule,
    sessionMemoryModule,
    llmAdapterModule,
    statusSnapshotModule,
    getLastShadowPipelineSummary,
    proactiveHostModule,
    supportPolicyModule,
    soloStreamModule,
    logRotationModule
  } = deps;

  function buildMiaStatusResponse() {
    const streamState = typeof getStreamState === "function" ? getStreamState() : {};
    const kojnozoutState = typeof getKojnozoutState === "function" ? getKojnozoutState() : {};
    const overlayState = typeof getOverlayState === "function" ? getOverlayState() : {};
    const outputState = typeof getOutputState === "function" ? getOutputState() : {};
    const ecosystemState = typeof getEcosystemState === "function" ? getEcosystemState() : {};
    const streamSession = typeof getStreamSession === "function" ? getStreamSession() : {};
    const lastGiftMapping =
      typeof getLastGiftMapping === "function" ? getLastGiftMapping() : null;
    const hostTeamScoreState =
      typeof getHostTeamScoreState === "function" ? getHostTeamScoreState() : {};
    const kojnozoutDuelState = typeof getDuelState === "function" ? getDuelState() : {};
    const kojnozoutBackpackState =
      typeof getBackpackState === "function" ? getBackpackState() : {};
    const lastDuelSyncSummary =
      typeof getLastDuelSyncSummary === "function" ? getLastDuelSyncSummary() : null;
    const lastIngestSummary =
      typeof getLastIngestSummary === "function" ? getLastIngestSummary() : null;
    const lastShadowPipelineSummary =
      typeof getLastShadowPipelineSummary === "function" ? getLastShadowPipelineSummary() : null;
    const serverStartedAt =
      typeof getServerStartedAt === "function" ? getServerStartedAt() : Date.now();
    const port = typeof getPort === "function" ? getPort() : 3000;
    const obsConnected = typeof getObsConnected === "function" ? getObsConnected() : false;

    const videoSnapshot =
      videoEngine && typeof videoEngine.getSnapshot === "function"
        ? videoEngine.getSnapshot()
        : {};

    const spamSession =
      typeof spamSessionEngine?.getSpamSessionState === "function"
        ? spamSessionEngine.getSpamSessionState()
        : null;

    const kojnozoutSnapshot =
      typeof kojnozoutModule?.getKojnozoutSnapshot === "function"
        ? kojnozoutModule.getKojnozoutSnapshot(
            typeof getKojnozoutStateForSnapshot === "function"
              ? getKojnozoutStateForSnapshot()
              : kojnozoutState,
            streamState
          )
        : typeof cloneJson === "function"
          ? cloneJson(kojnozoutState, kojnozoutState)
          : kojnozoutState;

    const overlaySnapshot =
      typeof overlayStateModule?.getOverlaySnapshot === "function"
        ? overlayStateModule.getOverlaySnapshot(overlayState, {
            maxChatFeedItems: runtimeConfig?.overlay?.maxChatFeedItems || 6,
            chatFeedMaxAgeMs: runtimeConfig?.overlay?.chatFeedMaxAgeMs || 15000
          })
        : overlayState;

    const kickStatus =
      typeof kickBridgeModule?.getKickBridgeStatus === "function"
        ? kickBridgeModule.getKickBridgeStatus()
        : { started: false, connected: false };

    const audience = streamState?.audience || {};
    const streamCounters = streamState?.counters || {};

    return {
      ok: true,
      service: "MIA",
      port,
      time: typeof nowIso === "function" ? nowIso() : new Date().toISOString(),
      uptimeSec: Math.floor((Date.now() - serverStartedAt) / 1000),
      runtime: {
        selectedRuntime: "MIA_NEXT"
      },
      streamSession:
        typeof streamSessionModule?.getSnapshot === "function"
          ? streamSessionModule.getSnapshot(streamSession)
          : { phase: streamSession?.phase || "PRELIVE" },
      streamEconomy:
        typeof streamEconomyConfig?.getConfig === "function"
          ? {
              version: streamEconomyConfig.getConfig()?.version || "1.0.0",
              miaPointsPerCoin:
                typeof streamEconomyConfig.getTierConfig === "function"
                  ? streamEconomyConfig.getTierConfig()?.miaPointsPerCoin
                  : null
            }
          : null,
      obs: {
        connected: obsConnected,
        url: runtimeConfig?.obs?.url || "ws://127.0.0.1:4455",
        giftScene: runtimeConfig?.obs?.giftScene || "SPINAK_ENGINE_GIFTS"
      },
      kick: kickStatus,
      audience: {
        viewerCount: Number(audience.viewerCount || 0),
        source: audience.source || "unknown",
        platform: audience.platform || null,
        updatedAt: audience.updatedAt || null,
        lastLikeCount: audience.lastLikeCount || null,
        lastTotalLikeCount: audience.lastTotalLikeCount || null
      },
      spam: spamSession
        ? {
            active: Boolean(spamSession.active),
            audienceBand: spamSession.audienceBand || null,
            viewerCount: spamSession.viewerCount || 0,
            totalPoints: spamSession.totalPoints || 0,
            eventCount: spamSession.eventCount || 0,
            remainingWindowSec: spamSession.remainingWindowSec || 0,
            nextRewardTier: spamSession.nextRewardTier || null,
            spamRewardTier: spamSession.nextRewardTier || null,
            pointsToNextReward: spamSession.pointsToNextReward || 0,
            lastRewardTierGranted: spamSession.lastRewardTierGranted || null
          }
        : null,
      giftMap:
        typeof giftMapEnterprise?.getPublicSnapshot === "function"
          ? {
              ...(giftMapEnterprise.getPublicSnapshot(5) || {}),
              lastMapping: lastGiftMapping
                ? {
                    giftKey: lastGiftMapping.giftKey || null,
                    giftName: lastGiftMapping.giftName || null,
                    streamTier: lastGiftMapping.streamTier || null,
                    coinTier: lastGiftMapping.coinTier || null,
                    mapTier: lastGiftMapping.mapTier || null,
                    care: lastGiftMapping.care || null,
                    priority: lastGiftMapping.priority || null,
                    streak: lastGiftMapping.streak || null,
                    achievements: lastGiftMapping.achievements || [],
                    overlayText: lastGiftMapping.overlayText || null
                  }
                : null,
              userThrottle: outputState?.userAckThrottle
                ? {
                    trackedUsers: Object.keys(outputState.userAckThrottle.byUser || {}).length
                  }
                : { trackedUsers: 0 }
            }
          : null,
      hostTeamScore: hostTeamScoreState,
      hostMode:
        typeof awayModeModule?.buildHostModeSnapshot === "function"
          ? awayModeModule.buildHostModeSnapshot({
              outputState,
              ecosystemState,
              runtimeConfig
            })
          : null,
      video: {
        queueLength: Number(videoSnapshot.queueLength || 0),
        playing: Boolean(videoSnapshot.playing || videoSnapshot.currentPlayback),
        currentTier: videoSnapshot.currentPlayback?.tier || null,
        currentSource: videoSnapshot.currentPlayback?.sourceName || null,
        failedJobs: Number(videoSnapshot.failedJobs || 0)
      },
      kojnozout: {
        bowlPercent: Number(kojnozoutSnapshot?.bowlPercent || 0),
        mood: kojnozoutSnapshot?.mood || "idle",
        stage: kojnozoutSnapshot?.stage || "idle",
        behavior: kojnozoutSnapshot?.behavior || null,
        evolutionTier: kojnozoutSnapshot?.evolutionTier || "egg",
        feedPoints: Number(kojnozoutSnapshot?.feedPoints || 0),
        hunger: Number(kojnozoutSnapshot?.hunger || 0),
        affliction: kojnozoutSnapshot?.affliction || null,
        isSleeping: Boolean(kojnozoutSnapshot?.isSleeping),
        lastGiftCareAction: kojnozoutSnapshot?.lastGiftCareAction || null,
        lastGiftCareGroup: kojnozoutSnapshot?.lastGiftCareGroup || null,
        vitalsSummary:
          typeof kojnozoutVitalsModule?.describeVitals === "function"
            ? kojnozoutVitalsModule.describeVitals(kojnozoutSnapshot)
            : null
      },
      duel:
        typeof kojnozoutDuelModule?.getDuelSnapshot === "function"
          ? kojnozoutDuelModule.getDuelSnapshot(kojnozoutDuelState)
          : null,
      duelSync: lastDuelSyncSummary,
      backpack:
        typeof kojnozoutBackpackModule?.getBackpackSnapshot === "function"
          ? kojnozoutBackpackModule.getBackpackSnapshot(kojnozoutBackpackState)
          : null,
      kojnozoutAssets:
        typeof kojnozoutAssetsModule?.inspectKojnozoutAssets === "function"
          ? kojnozoutAssetsModule.inspectKojnozoutAssets()
          : null,
      ecosystem:
        typeof ecosystemOrchestratorModule?.getEcosystemSnapshot === "function"
          ? ecosystemOrchestratorModule.getEcosystemSnapshot(ecosystemState, runtimeConfig)
          : null,
      overlay: {
        miaText: overlaySnapshot?.miaOverlay?.text || "",
        kojnozoutText: overlaySnapshot?.kojnozoutOverlay?.text || "",
        miaAccepted: Boolean(overlaySnapshot?.miaOverlay?.accepted),
        chatFeedCount: Array.isArray(overlaySnapshot?.chatFeed)
          ? overlaySnapshot.chatFeed.length
          : 0
      },
      stream: {
        totalEvents: Number(streamCounters.totalEvents || 0),
        communityEvents: Number(streamCounters.communityEvents || 0),
        supportEvents: Number(streamCounters.supportEvents || 0),
        lastEventAt: streamState?.lastEventAt || null
      },
      lastIngest: lastIngestSummary,
      chatLexicon:
        typeof chatLexiconModule?.getLexiconSnapshot === "function"
          ? chatLexiconModule.getLexiconSnapshot()
          : null,
      sessionMemory:
        typeof sessionMemoryModule?.getSessionSnapshot === "function"
          ? sessionMemoryModule.getSessionSnapshot()
          : null,
      llm:
        typeof llmAdapterModule?.resolveConfig === "function"
          ? (() => {
              const cfg = llmAdapterModule.resolveConfig(runtimeConfig);
              const chain =
                typeof llmAdapterModule.resolveProviderChain === "function"
                  ? llmAdapterModule.resolveProviderChain(runtimeConfig)
                  : [];
              return {
                enabled: llmAdapterModule.isEnabled(runtimeConfig),
                mode: cfg.mode,
                provider: cfg.provider || "openai",
                apiKeyConfigured: chain.length > 0,
                model: cfg.model,
                chain: chain.map((c) => ({ provider: c.provider, model: c.model }))
              };
            })()
          : null,
      ...(typeof statusSnapshotModule?.buildMiaRuntimeDiagnostics === "function"
        ? statusSnapshotModule.buildMiaRuntimeDiagnostics({
            outputState,
            streamState,
            overlayState,
            serverStartedAt,
            runtimeConfig,
            lastShadowPipelineSummary,
            proactiveHostModule,
            supportPolicyModule,
            kojnozoutState,
            soloStreamModule,
            obsConnected
          })
        : {}),
      logs: {
        retentionDays:
          typeof logRotationModule?.getRetentionDays === "function"
            ? logRotationModule.getRetentionDays()
            : 7,
        maxMb:
          typeof logRotationModule?.getMaxBytes === "function"
            ? Math.round(logRotationModule.getMaxBytes() / (1024 * 1024))
            : 5
      }
    };
  }

  return { buildMiaStatusResponse };
}

module.exports = { createStatusRuntime };
