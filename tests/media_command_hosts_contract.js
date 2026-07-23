"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildStoryFeedHost } = require("../scripts/MIA_STORY_FEED_HOST");
const { buildStoryFeedCtx } = require("../scripts/MIA_STORY_FEED_CTX");
const { buildGiftMediaHost } = require("../scripts/MIA_GIFT_MEDIA_HOST");
const { buildGiftMediaCtx } = require("../scripts/MIA_GIFT_MEDIA_CTX");
const { buildWorldModeHost } = require("../scripts/MIA_WORLD_MODE_HOST");
const { buildWorldModeCtx } = require("../scripts/MIA_WORLD_MODE_CTX");
const { buildShowcaseCommandHost } = require("../scripts/MIA_SHOWCASE_COMMAND_HOST");
const { buildShowcaseCommandCtx } = require("../scripts/MIA_SHOWCASE_COMMAND_CTX");
const { buildStreamerMediaHost } = require("../scripts/MIA_STREAMER_MEDIA_HOST");
const { buildStreamerMediaCtx } = require("../scripts/MIA_STREAMER_MEDIA_CTX");
const { buildSoloStreamHost } = require("../scripts/MIA_SOLO_STREAM_HOST");
const { buildSoloStreamCtx } = require("../scripts/MIA_SOLO_STREAM_CTX");
const { buildOverlayPublicHost } = require("../scripts/MIA_OVERLAY_PUBLIC_HOST");
const { buildOverlayPublicCtx } = require("../scripts/MIA_OVERLAY_PUBLIC_CTX");
const { buildCareCommandsHost } = require("../scripts/MIA_CARE_COMMANDS_HOST");
const { buildCareCommandsCtx } = require("../scripts/MIA_CARE_COMMANDS_CTX");
const { buildActionBuilderHost } = require("../scripts/MIA_ACTION_BUILDER_HOST");
const { buildActionBuilderCtx } = require("../scripts/MIA_ACTION_BUILDER_CTX");
const { buildPipelineSummaryHost } = require("../scripts/MIA_PIPELINE_SUMMARY_HOST");
const { buildPipelineSummaryCtx } = require("../scripts/MIA_PIPELINE_SUMMARY_CTX");
const { buildStatusHost } = require("../scripts/MIA_STATUS_HOST");
const { buildStatusCtx } = require("../scripts/MIA_STATUS_CTX");
const { buildTranslationHost } = require("../scripts/MIA_TRANSLATION_HOST");
const { buildTranslationCtx } = require("../scripts/MIA_TRANSLATION_CTX");
const { buildShowcaseHost } = require("../scripts/MIA_SHOWCASE_HOST");
const { buildShowcaseCtx } = require("../scripts/MIA_SHOWCASE_CTX");
const { buildRuntimeStateHost } = require("../scripts/MIA_RUNTIME_STATE_HOST");
const { buildRuntimeStateCtx } = require("../scripts/MIA_RUNTIME_STATE_CTX");
const { buildKojMomentsHost } = require("../scripts/MIA_KOJ_MOMENTS_HOST");
const { buildKojMomentsCtx } = require("../scripts/MIA_KOJ_MOMENTS_CTX");
const { buildEventPipelineHost } = require("../scripts/MIA_EVENT_PIPELINE_HOST");
const { buildEventPipelineCtx } = require("../scripts/MIA_EVENT_PIPELINE_CTX");
const { buildIngestHttpHost } = require("../scripts/MIA_INGEST_HTTP_HOST");
const { buildIngestHttpCtx } = require("../scripts/MIA_INGEST_HTTP_CTX");
const { buildDebugRoutesHost } = require("../scripts/MIA_DEBUG_ROUTES_HOST");
const { buildDebugRoutesCtx } = require("../scripts/MIA_DEBUG_ROUTES_CTX");
const { buildWorldLayerHost } = require("../scripts/MIA_WORLD_LAYER_HOST");
const { buildWorldLayerCtx } = require("../scripts/MIA_WORLD_LAYER_CTX");
const { buildIngestUtilsHost } = require("../scripts/MIA_INGEST_UTILS_HOST");
const { buildIngestUtilsCtx } = require("../scripts/MIA_INGEST_UTILS_CTX");
const { buildDeliveryHost } = require("../scripts/MIA_DELIVERY_HOST");
const { buildDeliveryCtx } = require("../scripts/MIA_DELIVERY_CTX");
const { buildOverlayStateHost } = require("../scripts/MIA_OVERLAY_STATE_HOST");
const { buildOverlayStateCtx } = require("../scripts/MIA_OVERLAY_STATE_CTX");
const { buildStreamStateHost } = require("../scripts/MIA_STREAM_STATE_HOST");
const { buildStreamStateCtx } = require("../scripts/MIA_STREAM_STATE_CTX");
const { buildObsBootstrapHost } = require("../scripts/MIA_OBS_BOOTSTRAP_HOST");
const { buildObsBootstrapCtx } = require("../scripts/MIA_OBS_BOOTSTRAP_CTX");
const { buildObsSafeCallHost } = require("../scripts/MIA_OBS_SAFE_CALL_HOST");
const { buildObsSafeCallCtx } = require("../scripts/MIA_OBS_SAFE_CALL_CTX");
const { buildObsPostConnectHost } = require("../scripts/MIA_OBS_POST_CONNECT_HOST");
const { buildObsPostConnectCtx } = require("../scripts/MIA_OBS_POST_CONNECT_CTX");
const { buildObsWatchdogHost } = require("../scripts/MIA_OBS_WATCHDOG_HOST");
const { buildObsWatchdogCtx } = require("../scripts/MIA_OBS_WATCHDOG_CTX");
const { buildObsOverlaySyncHost } = require("../scripts/MIA_OBS_OVERLAY_SYNC_HOST");
const { buildObsOverlaySyncCtx } = require("../scripts/MIA_OBS_OVERLAY_SYNC_CTX");
const { buildPlatformBridgesHost } = require("../scripts/MIA_PLATFORM_BRIDGES_HOST");
const { buildPlatformBridgesCtx } = require("../scripts/MIA_PLATFORM_BRIDGES_CTX");
const { buildRuntimeLoopsHost } = require("../scripts/MIA_RUNTIME_LOOPS_HOST");
const { buildRuntimeLoopsCtx } = require("../scripts/MIA_RUNTIME_LOOPS_CTX");
const { buildServerBootstrapHost } = require("../scripts/MIA_SERVER_BOOTSTRAP_HOST");
const { buildServerBootstrapCtx } = require("../scripts/MIA_SERVER_BOOTSTRAP_CTX");
const { buildHealthHost } = require("../scripts/MIA_HEALTH_HOST");
const { buildHealthCtx } = require("../scripts/MIA_HEALTH_CTX");
const { buildStartupOverlayHost } = require("../scripts/MIA_STARTUP_OVERLAY_HOST");
const { buildStartupOverlayCtx } = require("../scripts/MIA_STARTUP_OVERLAY_CTX");
const { buildSpamSessionHost } = require("../scripts/MIA_SPAM_SESSION_HOST");
const { buildSpamSessionCtx } = require("../scripts/MIA_SPAM_SESSION_CTX");
const { buildRuntimeSecurityHost } = require("../scripts/MIA_RUNTIME_SECURITY_HOST");
const { buildRuntimeSecurityCtx } = require("../scripts/MIA_RUNTIME_SECURITY_CTX");
const { buildRuntimeStateSeedHost } = require("../scripts/MIA_RUNTIME_STATE_SEED_HOST");
const { buildRuntimeStateSeedCtx } = require("../scripts/MIA_RUNTIME_STATE_SEED_CTX");
const { buildVideoEngineHost } = require("../scripts/MIA_VIDEO_ENGINE_HOST");
const { buildVideoEngineCtx } = require("../scripts/MIA_VIDEO_ENGINE_CTX");
const { buildMiaEyesHost } = require("../scripts/MIA_MIA_EYES_HOST");
const { buildMiaEyesCtx } = require("../scripts/MIA_MIA_EYES_CTX");
const { buildTtsEngineHost } = require("../scripts/MIA_TTS_ENGINE_HOST");
const { buildTtsEngineCtx } = require("../scripts/MIA_TTS_ENGINE_CTX");
const { buildInterpreterHost } = require("../scripts/MIA_INTERPRETER_HOST");
const { buildInterpreterCtx } = require("../scripts/MIA_INTERPRETER_CTX");
const { buildOverlayStateCacheHost } = require("../scripts/MIA_OVERLAY_STATE_CACHE_HOST");
const { buildOverlayStateCacheCtx } = require("../scripts/MIA_OVERLAY_STATE_CACHE_CTX");
const { buildOutputPolicyHost } = require("../scripts/MIA_OUTPUT_POLICY_HOST");
const { buildOutputPolicyCtx } = require("../scripts/MIA_OUTPUT_POLICY_CTX");
const { buildArenaBattleDemoHost } = require("../scripts/MIA_ARENA_BATTLE_DEMO_HOST");
const { buildArenaBattleDemoCtx } = require("../scripts/MIA_ARENA_BATTLE_DEMO_CTX");
const { buildOverlayTimingHost } = require("../scripts/MIA_OVERLAY_TIMING_HOST");
const { buildOverlayTimingCtx } = require("../scripts/MIA_OVERLAY_TIMING_CTX");
const { buildVoicePriorityHost } = require("../scripts/MIA_VOICE_PRIORITY_HOST");
const { buildVoicePriorityCtx } = require("../scripts/MIA_VOICE_PRIORITY_CTX");
const { buildOverlayQueueHost } = require("../scripts/MIA_OVERLAY_QUEUE_HOST");
const { buildOverlayQueueCtx } = require("../scripts/MIA_OVERLAY_QUEUE_CTX");
const { buildObsOverlayRendererHost } = require("../scripts/MIA_OBS_OVERLAY_RENDERER_HOST");
const { buildObsOverlayRendererCtx } = require("../scripts/MIA_OBS_OVERLAY_RENDERER_CTX");
const { buildObsOverlaySyncWrappersHost } = require("../scripts/MIA_OBS_OVERLAY_SYNC_WRAPPERS_HOST");
const { buildObsOverlaySyncWrappersCtx } = require("../scripts/MIA_OBS_OVERLAY_SYNC_WRAPPERS_CTX");
const { buildBossMissionHost } = require("../scripts/MIA_BOSS_MISSION_HOST");
const { buildBossMissionCtx } = require("../scripts/MIA_BOSS_MISSION_CTX");
const { buildIngestDeduperHost } = require("../scripts/MIA_INGEST_DEDUPER_HOST");
const { buildIngestDeduperCtx } = require("../scripts/MIA_INGEST_DEDUPER_CTX");
const { buildVoiceTimingHost } = require("../scripts/MIA_VOICE_TIMING_HOST");
const { buildVoiceTimingCtx } = require("../scripts/MIA_VOICE_TIMING_CTX");
const { buildMattingIngestBridgeHost } = require("../scripts/MIA_MATTING_INGEST_BRIDGE_HOST");
const { buildMattingIngestBridgeCtx } = require("../scripts/MIA_MATTING_INGEST_BRIDGE_CTX");
const { buildVisionContextHost } = require("../scripts/MIA_VISION_CONTEXT_HOST");
const { buildVisionContextCtx } = require("../scripts/MIA_VISION_CONTEXT_CTX");
const { buildObsVisionHost } = require("../scripts/MIA_OBS_VISION_HOST");
const { buildObsVisionCtx } = require("../scripts/MIA_OBS_VISION_CTX");
const { buildVoiceLayerHost } = require("../scripts/MIA_VOICE_LAYER_HOST");
const { buildVoiceControlLayerCtx } = require("../scripts/MIA_VOICE_CONTROL_LAYER_CTX");

const ROOT = path.resolve(__dirname, "..");

function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`ok - ${name}`))
    .catch((err) => {
      console.error(`fail - ${name}`);
      throw err;
    });
}

async function run() {
  await test("buildStoryFeedHost chains into buildStoryFeedCtx", () => {
    const getOverlayState = () => ({ storyVisual: null });
    const ctx = buildStoryFeedCtx(
      buildStoryFeedHost({
        writeLog: () => {},
        safeString: String,
        runtimeConfig: {},
        storyAnimationEngineModule: { id: "anim" },
        storyVideoEngineModule: {},
        overlayStateModule: {},
        getOverlayState,
        getUserLabel: () => "Alice",
        getAvatarUrl: () => "",
        executeOverlay: async () => ({}),
        getVideoEngine: () => ({ id: "video" }),
        getMiaEyes: () => ({ id: "eyes" })
      })
    );
    assert.equal(ctx.storyAnimationEngineModule.id, "anim");
    assert.equal(ctx.videoEngine.id, "video");
    assert.equal(ctx.getOverlayState, getOverlayState);
  });

  await test("buildGiftMediaHost resolves scheduleStoryAnimationAfterFeed via getter", () => {
    const scheduleStoryAnimationAfterFeed = async () => ({ ok: true });
    const ctx = buildGiftMediaCtx(
      buildGiftMediaHost({
        writeLog: () => {},
        safeString: String,
        giftPresentationModule: {},
        animationReactionModule: {},
        overlayStateModule: {},
        giftAnimationContextModule: {},
        mediaOrchestratorModule: {},
        giftMapModule: {},
        giftVisualComposerModule: {},
        mediaCatalogModule: {},
        viewerStoryModule: {},
        storyAnimationEngineModule: {},
        getOverlayState: () => ({}),
        getKojnozoutState: () => ({}),
        getStreamState: () => ({}),
        getUserLabel: () => "viewer",
        getAvatarUrl: () => "",
        getScheduleStoryAnimationAfterFeed: () => scheduleStoryAnimationAfterFeed,
        invalidateOverlayStateCache: () => {},
        getOverlayStateCache: () => null
      })
    );
    assert.equal(ctx.scheduleStoryAnimationAfterFeed, scheduleStoryAnimationAfterFeed);
  });

  await test("buildWorldModeHost chains into buildWorldModeCtx", () => {
    const getOutputState = () => ({ worldMode: "default" });
    const ctx = buildWorldModeCtx(
      buildWorldModeHost({
        safeString: String,
        writeLog: () => {},
        runtimeConfig: {},
        awayModeModule: { id: "away" },
        getOutputState,
        getEcosystemState: () => ({}),
        safeObsCall: async () => ({}),
        getOverlayStateCache: () => null
      })
    );
    assert.equal(ctx.awayModeModule.id, "away");
    assert.equal(ctx.getOutputState, getOutputState);
  });

  await test("buildShowcaseCommandHost chains into buildShowcaseCommandCtx", () => {
    const getOverlayState = () => ({ showcase: true });
    const ctx = buildShowcaseCommandCtx(
      buildShowcaseCommandHost({
        streamerShowcaseModule: { id: "showcase" },
        streamerIdentityModule: {},
        overlayStateModule: {},
        kojTestModeModule: {},
        kojnozoutVitalsModule: {},
        kojnozoutDuelModule: {},
        runtimeConfig: {},
        safeString: String,
        getUserLabel: () => "Boss",
        writeLog: () => {},
        getEnv: () => ({}),
        getOverlayState,
        getKojnozoutState: () => ({}),
        setKojnozoutState: () => {},
        getDuelState: () => ({}),
        setDuelState: () => {},
        executeOverlay: async () => ({}),
        speakMiaShowcaseLine: async () => ({}),
        getVideoEngine: () => ({ id: "video" }),
        scheduleWorldSave: () => {}
      })
    );
    assert.equal(ctx.getOverlayState, getOverlayState);
    assert.equal(ctx.videoEngine.id, "video");
  });

  await test("buildStreamerMediaHost chains into buildStreamerMediaCtx", () => {
    let ecoCount = 0;
    const ctx = buildStreamerMediaCtx(
      buildStreamerMediaHost({
        streamerMediaCommandModule: {},
        streamerAccessModule: {},
        mediaCatalogModule: {},
        soloStreamModule: {},
        safeString: String,
        getUserLabel: () => "Boss",
        runtimeConfig: {},
        writeLog: () => {},
        getOutputState: () => ({}),
        getEcosystemState: () => ({ worldMode: `w${++ecoCount}` }),
        getStreamState: () => ({}),
        executeOverlay: async () => ({}),
        maybeDeliverMiaVoice: async () => ({}),
        getVideoEngine: () => ({ id: "video" })
      })
    );
    assert.equal(ctx.getEcosystemState().worldMode, "w1");
    assert.equal(ctx.getEcosystemState().worldMode, "w2");
  });

  await test("buildSoloStreamHost chains into buildSoloStreamCtx", () => {
    const video = { id: "solo-video" };
    const ctx = buildSoloStreamCtx(
      buildSoloStreamHost({
        soloStreamModule: {},
        getVideoEngine: () => video,
        runtimeConfig: {},
        serverStartedAt: 1,
        writeLog: () => {},
        safeString: String,
        getStreamState: () => ({}),
        getOutputState: () => ({}),
        getOverlayState: () => ({}),
        getKojnozoutState: () => ({}),
        getObsConnected: () => true,
        isVoicePlaybackActive: () => false,
        executeOverlay: async () => ({}),
        maybeDeliverMiaVoice: async () => ({}),
        safeObsCall: async () => ({})
      })
    );
    assert.equal(ctx.videoEngine.id, "solo-video");
    assert.equal(ctx.getObsConnected(), true);
  });

  await test("buildOverlayPublicHost chains into buildOverlayPublicCtx", () => {
    const getOverlayState = () => ({ miaOverlay: null });
    const ctx = buildOverlayPublicCtx(
      buildOverlayPublicHost({
        cloneJson: (v) => v,
        runtimeConfig: {},
        obsConnected: true,
        overlayStateModule: { id: "overlay" },
        kojnozoutModule: {},
        kojnozoutDuelModule: {},
        kojnozoutBackpackModule: {},
        kojnozoutItemCommandModule: {},
        getVideoEngine: () => ({ id: "video" }),
        getSpamSessionEngine: () => ({ id: "spam" }),
        careOpportunitiesModule: {},
        kojnozoutBondModule: {},
        platformArenaModule: {},
        kojDisplayModule: {},
        giftUserLedgerModule: {},
        capybaraFlowModule: {},
        giftSupporterProfileModule: {},
        kojnozoutVitalsModule: {},
        ecosystemOrchestratorModule: {},
        getInterpreterRuntime: () => ({ id: "interp" }),
        getOverlayState,
        getKojnozoutStateForSnapshot: () => ({}),
        getKojnozoutState: () => ({}),
        getStreamState: () => ({}),
        getDuelState: () => ({}),
        getBackpackState: () => ({}),
        getItemDisplayState: () => ({}),
        setItemDisplayState: () => {},
        getArenaState: () => ({}),
        getGiftUserLedger: () => ({}),
        getGiftSupporterProfile: () => ({}),
        getOutputState: () => ({}),
        getEcosystemState: () => ({}),
        getOverlayLastAcceptedAt: () => 0,
        getOutputLastStreamerMediaAt: () => 0,
        getVoicePlaybackSnapshot: () => ({}),
        getVoicePlaybackSeq: () => 1,
        getVoiceSpeakQueueLength: () => 0
      })
    );
    assert.equal(ctx.getOverlayState, getOverlayState);
    assert.equal(ctx.spamSessionEngine.id, "spam");
  });

  await test("buildCareCommandsHost chains into buildCareCommandsCtx", () => {
    const executeOverlay = async () => ({});
    const ctx = buildCareCommandsCtx(
      buildCareCommandsHost({
        safeString: String,
        upper: (v) => String(v).toUpperCase(),
        writeLog: () => {},
        getRuntimeConfig: () => ({ stream: { platform: "tiktok" } }),
        getStreamPlatformKey: () => "tiktok",
        getStreamState: () => ({}),
        getOutputState: () => ({}),
        setOutputState: () => {},
        getKojnozoutState: () => ({}),
        setKojnozoutState: () => {},
        getKojnozoutBackpackState: () => ({}),
        setKojnozoutBackpackState: () => {},
        getItemDisplayState: () => ({}),
        setItemDisplayState: () => {},
        getKojnozoutDuelState: () => ({}),
        setKojnozoutDuelState: () => {},
        getPlatformArenaState: () => ({}),
        setPlatformArenaState: () => {},
        getUserLabel: () => "viewer",
        executeOverlay,
        deliverQuestCompleteMoment: async () => ({}),
        scheduleWorldSave: () => {},
        scheduleStoryAnimationAfterFeed: async () => ({}),
        giftMapEnterprise: {},
        kojTestModeModule: {},
        kojnozoutVitalsModule: {},
        kojnozoutPersistenceModule: {},
        kojnozoutDuelModule: {},
        kojnozoutItemCommandModule: {},
        careOpportunitiesModule: {},
        careQuestModule: { id: "quest" },
        kojnozoutCareModule: {},
        kojnozoutCareValidationModule: {},
        careRewardModule: {},
        responseEngine: {},
        kojWalkModule: {},
        platformArenaModule: {}
      })
    );
    assert.equal(ctx.executeOverlay, executeOverlay);
    assert.equal(ctx.modules.careQuestModule.id, "quest");
  });

  await test("buildActionBuilderHost chains into buildActionBuilderCtx", () => {
    const getOutputState = () => ({ phase: "live" });
    const ctx = buildActionBuilderCtx(
      buildActionBuilderHost({
        safeString: String,
        getUserLabel: () => "Viewer",
        runtimeConfig: {},
        chatBrain: { id: "brain" },
        responseEngine: {},
        getKojnozoutState: () => ({}),
        getOutputState
      })
    );
    assert.equal(ctx.getOutputState, getOutputState);
    assert.equal(ctx.chatBrain.id, "brain");
  });

  await test("buildPipelineSummaryHost chains into buildPipelineSummaryCtx", () => {
    let saved = null;
    const ctx = buildPipelineSummaryCtx(
      buildPipelineSummaryHost({
        nowIso: () => "iso",
        statusSnapshotModule: {},
        setLastIngestSummary: (summary) => {
          saved = summary;
        },
        setLastShadowPipelineSummary: () => {}
      })
    );
    ctx.setLastIngestSummary({ lane: "community" });
    assert.equal(saved.lane, "community");
  });

  await test("buildStatusHost chains into buildStatusCtx", () => {
    const getStreamState = () => ({ audience: { viewerCount: 5 } });
    const ctx = buildStatusCtx(
      buildStatusHost({
        getVideoEngine: () => ({ id: "video" }),
        getSpamSessionEngine: () => ({ id: "spam" }),
        kojnozoutModule: {},
        overlayStateModule: {},
        kickBridgeModule: {},
        streamSessionModule: {},
        streamEconomyConfig: {},
        giftMapEnterprise: {},
        awayModeModule: {},
        kojnozoutVitalsModule: {},
        kojnozoutDuelModule: {},
        kojnozoutBackpackModule: {},
        kojnozoutAssetsModule: {},
        ecosystemOrchestratorModule: {},
        chatLexiconModule: {},
        sessionMemoryModule: {},
        llmAdapterModule: {},
        statusSnapshotModule: {},
        proactiveHostModule: {},
        supportPolicyModule: {},
        soloStreamModule: {},
        logRotationModule: {},
        cloneJson: (v) => v,
        runtimeConfig: {},
        nowIso: () => "now",
        getPort: () => 3000,
        getKojnozoutStateForSnapshot: () => ({}),
        getKojnozoutState: () => ({}),
        getStreamState,
        getOverlayState: () => ({}),
        getServerStartedAt: () => 1,
        getStreamSession: () => ({}),
        getObsConnected: () => false,
        getLastGiftMapping: () => ({}),
        getOutputState: () => ({}),
        getHostTeamScoreState: () => ({}),
        getEcosystemState: () => ({}),
        getDuelState: () => ({}),
        getLastDuelSyncSummary: () => ({}),
        getBackpackState: () => ({}),
        getLastIngestSummary: () => ({}),
        getLastShadowPipelineSummary: () => ({})
      })
    );
    assert.equal(ctx.getStreamState, getStreamState);
    assert.equal(ctx.videoEngine.id, "video");
  });

  await test("buildTranslationHost chains into buildTranslationCtx", () => {
    const deliveryRuntime = () => ({ id: "delivery" });
    const interpreter = { id: "interp" };
    const ctx = buildTranslationCtx(
      buildTranslationHost({
        writeLog: () => {},
        safeString: String,
        runtimeConfig: {},
        voiceHoldUntilTs: (n) => n,
        getTtsEngine: () => ({ id: "tts" }),
        getInterpreterRuntime: () => interpreter,
        translateModule: {},
        languageModule: {},
        setOverlay: () => ({}),
        invalidateOverlayStateCache: () => {},
        getUserLabel: () => "viewer",
        deliveryRuntime
      })
    );
    assert.equal(ctx.deliveryRuntime, deliveryRuntime);
    assert.equal(ctx.translationRuntime.id, "interp");
  });

  await test("buildShowcaseHost chains into buildShowcaseCtx", () => {
    const tts = { id: "tts" };
    const deliveryRuntime = () => ({});
    const ctx = buildShowcaseCtx(
      buildShowcaseHost({
        safeString: String,
        runtimeConfig: {},
        voiceHoldUntilTs: (n) => n,
        getTtsEngine: () => tts,
        deliveryRuntime,
        mirrorSpeechOverlayFromVoice: () => null,
        invalidateOverlayStateCache: () => {}
      })
    );
    assert.equal(ctx.ttsEngine.id, "tts");
    assert.equal(ctx.deliveryRuntime, deliveryRuntime);
  });

  await test("buildRuntimeStateHost chains into buildRuntimeStateCtx", () => {
    const getStreamState = () => ({ gifts: 2 });
    const ctx = buildRuntimeStateCtx(
      buildRuntimeStateHost({
        upper: (v) => String(v || "").toUpperCase(),
        extractSupportPayload: (n) => n.support,
        extractCommunityImpact: () => ({}),
        runtimeConfig: {},
        gameConfig: { id: "game" },
        writeLog: () => {},
        streamStateModule: {},
        kojnozoutModule: {},
        kojnozoutPersistenceModule: {},
        kojnozoutWorldPersistenceModule: {},
        getStreamState,
        setStreamState: () => {},
        getKojnozoutState: () => ({}),
        setKojnozoutState: () => {},
        getKojnozoutBackpackState: () => ({}),
        getDuelState: () => ({})
      })
    );
    assert.equal(ctx.getStreamState, getStreamState);
    assert.equal(ctx.gameConfig.id, "game");
  });

  await test("buildKojMomentsHost chains into buildKojMomentsCtx", () => {
    const executeOverlay = async () => ({});
    const ctx = buildKojMomentsCtx(
      buildKojMomentsHost({
        upper: (v) => String(v).toUpperCase(),
        safeString: String,
        runtimeConfig: {},
        writeLog: () => {},
        careQuestModule: { id: "quest" },
        careOpportunitiesModule: {},
        kojnozoutPersistenceModule: {},
        kojnozoutDuelBridgeModule: {},
        kojnozoutDuelModule: {},
        kojnozoutEvolutionModule: {},
        getKojnozoutState: () => ({}),
        setKojnozoutState: () => {},
        getDuelState: () => ({}),
        setDuelState: () => {},
        setLastDuelSyncSummary: () => {},
        getOutputState: () => ({}),
        getUserLabel: () => "Viewer",
        executeOverlay,
        scheduleWorldSave: () => {}
      })
    );
    assert.equal(ctx.executeOverlay, executeOverlay);
    assert.equal(ctx.careQuestModule.id, "quest");
  });

  await test("buildEventPipelineHost chains into buildEventPipelineCtx", () => {
    const applyWorldLayer = () => ({ ok: true });
    const video = { id: "video" };
    const ctx = buildEventPipelineCtx(
      buildEventPipelineHost({
        normalizeIncomingEvent: (e) => e,
        upper: (v) => String(v).toUpperCase(),
        writeLog: () => {},
        safeString: String,
        nowIso: () => "now",
        runtimeConfig: {},
        recordIngestSummary: () => {},
        recordShadowPipelineSummary: () => {},
        streamSessionModule: { id: "session" },
        getIngestDeduper: () => ({ id: "deduper" }),
        shadowRuntime: { id: "shadow" },
        applyWorldLayer,
        getVideoEngine: () => video,
        getObsSourceAudioMap: () => ({}),
        getOutputState: () => ({ solo: true }),
        getOverlayState: () => ({}),
        getKojnozoutState: () => ({}),
        getEcosystemState: () => ({})
      })
    );
    assert.equal(ctx.applyWorldLayer, applyWorldLayer);
    assert.equal(ctx.videoEngine.id, "video");
    assert.equal(ctx.ingestDeduper.id, "deduper");
  });

  await test("buildIngestHttpHost chains into buildIngestHttpCtx", () => {
    const processEvent = async () => ({ status: 200, body: { ok: true } });
    const spam = { id: "spam" };
    const ctx = buildIngestHttpCtx(
      buildIngestHttpHost({
        normalizer: { id: "norm" },
        languageModule: {},
        ingestGuardModule: {},
        streamAudienceModule: {},
        getSpamSessionEngine: () => spam,
        runtimeConfig: {},
        safeString: String,
        upper: (v) => String(v).toUpperCase(),
        writeLog: () => {},
        getStreamState: () => ({}),
        setStreamState: () => {},
        recordIngestSummary: () => {},
        processEvent
      })
    );
    assert.equal(ctx.processEvent, processEvent);
    assert.equal(ctx.spamSessionEngine.id, "spam");
  });

  await test("buildDebugRoutesHost chains into buildDebugRoutesCtx", () => {
    const processEvent = async () => ({ status: 200, body: { ok: true } });
    const ctx = buildDebugRoutesCtx(
      buildDebugRoutesHost({
        getProcessEvent: () => processEvent
      })
    );
    assert.equal(ctx.processEvent, processEvent);
  });

  await test("buildWorldLayerHost chains into buildWorldLayerCtx", () => {
    const scheduleWorldSave = () => {};
    const ctx = buildWorldLayerCtx(
      buildWorldLayerHost({
        upper: (v) => String(v).toUpperCase(),
        safeString: String,
        writeLog: () => {},
        kojnozoutModule: {},
        kojnozoutBackpackModule: {},
        kojnozoutDuelModule: {},
        platformArenaModule: {},
        chatRewardModule: {},
        kojRosterModule: {},
        getKojnozoutBackpackState: () => ({}),
        setKojnozoutBackpackState: () => {},
        getDuelState: () => ({}),
        setDuelState: () => {},
        getArenaState: () => ({}),
        setArenaState: () => {},
        getUserLabel: () => "Viewer",
        extractSupportPayload: (n) => n.support || {},
        setOverlay: () => ({}),
        invalidateOverlayStateCache: () => {},
        scheduleWorldSave
      })
    );
    assert.equal(ctx.scheduleWorldSave, scheduleWorldSave);
  });

  await test("buildIngestUtilsHost chains into buildIngestUtilsCtx", () => {
    const getOverlayState = () => ({ chatFeed: [] });
    const ctx = buildIngestUtilsCtx(
      buildIngestUtilsHost({
        safeString: String,
        runtimeConfig: {},
        overlayStateModule: {},
        getOverlayState,
        getUserLabel: () => "Viewer",
        getAvatarUrl: () => "url"
      })
    );
    assert.equal(ctx.getOverlayState, getOverlayState);
  });

  await test("buildDeliveryHost chains into buildDeliveryCtx", () => {
    const setOverlay = () => ({ accepted: true });
    const video = { id: "video" };
    const cache = { id: "cache" };
    const ctx = buildDeliveryCtx(
      buildDeliveryHost({
        runtimeConfig: {},
        writeLog: () => {},
        safeString: String,
        cloneJson: (v) => v,
        voiceHoldUntilTs: (n) => n,
        setOverlay,
        getOverlayState: () => ({}),
        overlayStateModule: {},
        getOverlayStateCache: () => cache,
        invalidateOverlayStateCache: () => {},
        getOverlayTiming: () => ({}),
        getOverlayQueue: () => ({}),
        getVoicePriorityLayer: () => ({}),
        getObsOverlayRenderer: () => ({}),
        overlayEmitResultModule: {},
        obsBrowserRefreshOnOverlayEnabled: () => false,
        scheduleObsBrowserRefresh: () => {},
        getVideoEngine: () => video,
        videoEngineModule: {},
        bowlFullVideoModule: {},
        getOutputState: () => ({}),
        getKojnozoutState: () => ({}),
        getObsConnected: () => false,
        forceReconnectObs: async () => {},
        ensureObsConnectedWithRetry: async () => ({}),
        getUserLabel: () => "x",
        tryAutoBossMissionFromGift: async () => null,
        speakerRoutingModule: {},
        getTtsEngine: () => ({ id: "tts" }),
        languageModule: {},
        sessionMemoryModule: {}
      })
    );
    assert.equal(ctx.setOverlay, setOverlay);
    assert.equal(ctx.videoEngine.id, "video");
    assert.equal(ctx.overlayStateCache.id, "cache");
  });

  await test("buildOverlayStateHost chains into buildOverlayStateCtx", () => {
    const getOverlayState = () => ({ miaOverlay: null });
    const cache = { id: "cache" };
    const ctx = buildOverlayStateCtx(
      buildOverlayStateHost({
        safeString: String,
        overlayStateModule: {},
        outputStateModule: {},
        getOverlayState,
        getOutputState: () => ({}),
        getOverlayStateCache: () => cache
      })
    );
    assert.equal(ctx.getOverlayState, getOverlayState);
    assert.equal(ctx.overlayStateCache.id, "cache");
  });

  await test("buildStreamStateHost chains into buildStreamStateCtx", () => {
    const ctx = buildStreamStateCtx(
      buildStreamStateHost({
        streamSessionModule: { id: "session" },
        giftUserLedgerModule: {},
        giftSupporterProfileModule: {},
        streamStateModule: {},
        mediaCatalogModule: {},
        writeLog: () => {},
        serverStartedAt: 1000
      })
    );
    assert.equal(ctx.serverStartedAt, 1000);
    assert.equal(ctx.streamSessionModule.id, "session");
  });

  await test("buildObsBootstrapHost chains into buildObsBootstrapCtx", () => {
    const state = { obs: null, obsConnected: false };
    const onAfterConnect = async () => ({ ok: true });
    const ctx = buildObsBootstrapCtx(
      buildObsBootstrapHost({
        obsSharedState: state,
        runtimeConfig: {},
        writeLog: () => {},
        getPort: () => 3000,
        reconnectMs: 5000,
        OBSWebSocket: class {},
        obsSceneGuardModule: {},
        getObsWatchdog: () => null,
        onAfterConnect,
        onConnectionClosed: () => {},
        onMediaPlaybackEnded: () => {}
      })
    );
    assert.equal(ctx.state, state);
    assert.equal(ctx.onAfterConnect, onAfterConnect);
  });

  await test("buildObsSafeCallHost chains into buildObsSafeCallCtx", () => {
    const ensureObsConnected = async () => ({ ok: false });
    const ctx = buildObsSafeCallCtx(
      buildObsSafeCallHost({
        safeString: String,
        writeLog: () => {},
        ensureObsConnected,
        getObs: () => null
      })
    );
    assert.equal(ctx.ensureObsConnected, ensureObsConnected);
  });

  await test("buildObsPostConnectHost chains into buildObsPostConnectCtx", () => {
    const video = { id: "video" };
    const ctx = buildObsPostConnectCtx(
      buildObsPostConnectHost({
        writeLog: () => {},
        safeString: String,
        runtimeConfig: {},
        ensureObsHands: async () => ({}),
        configureObsMiaLiveHub: async () => ({}),
        fixObsOverlayBrowserLayouts: async () => {},
        fixObsOverlaySceneTransforms: async () => {},
        ensureObsMiaSourceVisibleInProgramScene: async () => ({}),
        ensureObsVoiceBrowserReady: async () => {},
        obsBrowserRefreshOnConnectEnabled: () => false,
        refreshObsMiaBrowserSources: async () => ({}),
        getVideoEngine: () => video,
        getObsVision: () => ({ id: "vision" }),
        getMiaEyes: () => ({ id: "eyes" })
      })
    );
    assert.equal(ctx.videoEngine.id, "video");
    assert.equal(ctx.miaEyes.id, "eyes");
  });

  await test("buildObsWatchdogHost chains into buildObsWatchdogCtx", () => {
    let running = false;
    const ctx = buildObsWatchdogCtx(
      buildObsWatchdogHost({
        config: { enabled: true },
        isProcessRunning: () => running,
        log: () => {},
        now: () => 123
      })
    );
    assert.equal(ctx.isProcessRunning(), false);
    running = true;
    assert.equal(ctx.isProcessRunning(), true);
  });

  await test("buildObsOverlaySyncHost chains into buildObsOverlaySyncCtx", () => {
    const getObs = () => ({ id: "obs" });
    const eyes = { id: "eyes" };
    const ctx = buildObsOverlaySyncCtx(
      buildObsOverlaySyncHost({
        getObs,
        getObsConnected: () => true,
        getSplitOverlays: () => ({ speech: "x" }),
        getOverlayBase: () => "http://127.0.0.1:3000",
        runtimeConfig: {},
        safeString: String,
        writeLog: () => {},
        obsFixLayoutModule: {},
        obsHandsModule: { id: "hands" },
        obsAwaySceneModule: {},
        obsStreamerCamerasModule: {},
        selfRestartModule: {},
        buildVisionContext: () => ({}),
        getVoicePlaybackSnapshot: () => null,
        getMiaEyes: () => eyes,
        setStartupSlideActiveUntil: () => {}
      })
    );
    assert.equal(ctx.getObs, getObs);
    assert.equal(ctx.obsHandsModule.id, "hands");
    assert.equal(ctx.getMiaEyes().id, "eyes");
  });

  await test("buildPlatformBridgesHost chains into buildPlatformBridgesCtx", () => {
    const processEvent = async () => ({ ok: true });
    const ctx = buildPlatformBridgesCtx(
      buildPlatformBridgesHost({
        app: { id: "app" },
        runtimeConfig: {},
        writeLog: () => {},
        cloneJson: (v) => v,
        safeString: String,
        getProcessEvent: () => processEvent,
        kickBridgeModule: {},
        twitchBridgeModule: {},
        telegramBridgeModule: {},
        responseEngine: {},
        getOutputState: () => ({}),
        getKojnozoutState: () => ({})
      })
    );
    assert.equal(ctx.app.id, "app");
    assert.equal(ctx.processEvent, processEvent);
  });

  await test("buildRuntimeLoopsHost chains into buildRuntimeLoopsCtx", () => {
    const video = { id: "video" };
    const ctx = buildRuntimeLoopsCtx(
      buildRuntimeLoopsHost({
        runtimeConfig: {},
        writeLog: () => {},
        serverStartedAt: 1,
        bowlEngine: {},
        getVideoEngine: () => video,
        bowlFullVideoModule: {},
        capybaraFlowModule: {},
        proactiveHostModule: {},
        getKojnozoutState: () => ({}),
        setKojnozoutState: () => {},
        getStreamState: () => ({}),
        getOutputState: () => ({}),
        getEcosystemState: () => ({}),
        getOverlayState: () => ({}),
        getObsConnected: () => false,
        getMiaEyes: () => null,
        getMattingIngestBridge: () => null,
        executeOverlay: () => ({}),
        deliverCapybaraWaitPrompt: async () => {},
        syncSoloStreamObsScene: async () => {},
        deliverProactiveHostMoment: async () => {},
        runDuelPeerSync: async () => null
      })
    );
    assert.equal(ctx.videoEngine.id, "video");
    assert.equal(ctx.serverStartedAt, 1);
  });

  await test("buildServerBootstrapHost chains into buildServerBootstrapCtx", () => {
    const app = { listen() {} };
    const connectObs = async () => ({ ok: true });
    const ctx = buildServerBootstrapCtx(
      buildServerBootstrapHost({
        app,
        PORT: 3000,
        BIND_HOST: "127.0.0.1",
        overlayStaticDir: "/tmp",
        MIA_SPLIT_OVERLAYS: () => ({}),
        portGuardModule: {},
        runtimeSecurityModule: {},
        selfRestartModule: {},
        miaPaintWs: {},
        miaPaintBridge: {},
        emitStartupOverlay: async () => {},
        markStreamSessionEnded: () => ({}),
        warnOnDeadObsSceneFiles: () => {},
        connectObs
      })
    );
    assert.equal(ctx.app, app);
    assert.equal(ctx.connectObs, connectObs);
  });

  await test("buildHealthHost chains into buildHealthCtx", () => {
    const getStreamState = () => ({ audience: { viewerCount: 4 } });
    const ctx = buildHealthCtx(
      buildHealthHost({
        kojnozoutModule: {},
        kickBridgeModule: {},
        twitchBridgeModule: {},
        telegramBridgeModule: {},
        overlayStateModule: {},
        getTtsEngine: () => ({ id: "tts" }),
        llmAdapterModule: {},
        getVideoEngine: () => ({ id: "video" }),
        getPort: () => 3000,
        nowIso: () => "now",
        runtimeConfig: {},
        MIA_SPLIT_OVERLAYS: () => ({}),
        getKojnozoutState: () => ({}),
        getStreamState,
        getObsConnected: () => true,
        getLastIngestSummary: () => null,
        getOverlayState: () => ({}),
        resolveObsOverlayMode: () => "split",
        buildObsHealthSnapshot: async () => ({}),
        getVoicePlaybackSnapshot: () => null,
        getOverlayTiming: () => ({}),
        getVoicePriorityLayer: () => ({}),
        getOverlayQueue: () => ({})
      })
    );
    assert.equal(ctx.getStreamState, getStreamState);
    assert.equal(ctx.videoEngine.id, "video");
  });

  await test("buildStartupOverlayHost chains into buildStartupOverlayCtx", () => {
    const getObsConnected = () => true;
    const video = { id: "video" };
    const ctx = buildStartupOverlayCtx(
      buildStartupOverlayHost({
        writeLog: () => {},
        runtimeConfig: {},
        getPort: () => 3000,
        getBindHost: () => "127.0.0.1",
        voiceHoldUntilTs: (n) => n,
        projectRoot: ROOT,
        startupCheckModule: {},
        mediaCatalogModule: {},
        getTtsEngine: () => ({ id: "tts" }),
        kickBridgeModule: {},
        runtimeSecurityModule: {},
        preflightTestsModule: {},
        getObsConnected,
        getObs: () => null,
        getVideoEngine: () => video,
        MIA_SPLIT_OVERLAYS: () => ({}),
        flashStartupCheckBrowserSource: async () => ({}),
        obsBrowserRefreshOnConnectEnabled: () => false,
        refreshObsMiaBrowserSources: async () => ({}),
        executeOverlay: async () => ({}),
        deliveryRuntime: () => ({}),
        mirrorSpeechOverlayFromVoice: () => {},
        invalidateOverlayStateCache: () => {}
      })
    );
    assert.equal(ctx.getObsConnected, getObsConnected);
    assert.equal(ctx.videoEngine.id, "video");
  });

  await test("buildSpamSessionHost chains into buildSpamSessionCtx", () => {
    const ctx = buildSpamSessionCtx(
      buildSpamSessionHost({
        spamConfig: { windowMs: 7000, minSequenceCount: 4, rewardThresholds: [] }
      })
    );
    assert.equal(ctx.windowMs, 7000);
  });

  await test("buildRuntimeSecurityHost chains into buildRuntimeSecurityCtx", () => {
    assert.deepEqual(buildRuntimeSecurityCtx(buildRuntimeSecurityHost({})), {});
  });

  await test("buildRuntimeStateSeedHost chains into buildRuntimeStateSeedCtx", () => {
    const ctx = buildRuntimeStateSeedCtx(
      buildRuntimeStateSeedHost({
        runtimeConfig: { ecosystem: { worldMode: "day" } },
        outputStateModule: {},
        overlayStateModule: {},
        hostTeamPointsModule: {},
        kojnozoutModule: {},
        kojnozoutPersistenceModule: { loadPersistedSeed: () => ({}) },
        kojnozoutWorldPersistenceModule: { loadWorldSeed: () => ({}) },
        kojnozoutBackpackModule: {},
        platformArenaModule: {},
        kojnozoutDuelModule: {},
        ecosystemOrchestratorModule: {},
        kojnozoutItemCommandModule: {}
      })
    );
    assert.equal(ctx.runtimeConfig.ecosystem.worldMode, "day");
  });

  await test("buildVideoEngineHost chains into buildVideoEngineCtx", () => {
    let active = false;
    const ctx = buildVideoEngineCtx(
      buildVideoEngineHost({
        runtimeConfig: {},
        writeLog: () => {},
        outputState: {},
        safeObsCall: async () => ({ ok: true }),
        isVoicePlaybackActive: () => active,
        pickNextMediaForTier: () => null
      })
    );
    assert.equal(ctx.isMiaVoiceActive(), false);
    active = true;
    assert.equal(ctx.isMiaVoiceActive(), true);
  });

  await test("buildMiaEyesHost chains into buildMiaEyesCtx", () => {
    const safeObsCall = async () => ({ ok: true });
    const ctx = buildMiaEyesCtx(
      buildMiaEyesHost({
        runtimeConfig: {},
        writeLog: () => {},
        safeObsCall
      })
    );
    assert.equal(ctx.safeObsCall, safeObsCall);
  });

  await test("buildTtsEngineHost chains into buildTtsEngineCtx", () => {
    const writeLog = () => {};
    const ctx = buildTtsEngineCtx(
      buildTtsEngineHost({
        writeLog,
        cacheDir: "/tmp/cache"
      })
    );
    assert.equal(ctx.appendJsonLog, writeLog);
    assert.equal(ctx.cacheDir, "/tmp/cache");
  });

  await test("buildInterpreterHost chains into buildInterpreterCtx", () => {
    assert.deepEqual(buildInterpreterCtx(buildInterpreterHost({})), {});
  });

  await test("buildOverlayStateCacheHost chains into buildOverlayStateCacheCtx", () => {
    const ctx = buildOverlayStateCacheCtx(
      buildOverlayStateCacheHost({
        ttlMs: 900
      })
    );
    assert.equal(ctx.ttlMs, 900);
  });

  await test("buildOutputPolicyHost chains into buildOutputPolicyCtx", () => {
    const ctx = buildOutputPolicyCtx(
      buildOutputPolicyHost({
        policyInput: { minActionIntervalMs: 8000, ttsEnabled: true }
      })
    );
    assert.equal(ctx.minActionIntervalMs, 8000);
    assert.equal(ctx.ttsEnabled, true);
  });

  await test("buildArenaBattleDemoHost chains into buildArenaBattleDemoCtx", () => {
    const platformArenaModule = { id: "arena" };
    const ctx = buildArenaBattleDemoCtx(
      buildArenaBattleDemoHost({
        platformArenaModule
      })
    );
    assert.equal(ctx.platformArenaModule, platformArenaModule);
  });

  await test("buildOverlayTimingHost chains into buildOverlayTimingCtx", () => {
    const ctx = buildOverlayTimingCtx(
      buildOverlayTimingHost({
        baseDelayMs: 750
      })
    );
    assert.equal(ctx.baseDelayMs, 750);
  });

  await test("buildVoicePriorityHost chains into buildVoicePriorityCtx", () => {
    const writeLog = () => {};
    const ctx = buildVoicePriorityCtx(
      buildVoicePriorityHost({
        writeLog
      })
    );
    assert.equal(ctx.appendJsonLog, writeLog);
  });

  await test("buildOverlayQueueHost chains into buildOverlayQueueCtx", () => {
    const writeLog = () => {};
    const ctx = buildOverlayQueueCtx(
      buildOverlayQueueHost({
        writeLog
      })
    );
    assert.equal(ctx.appendJsonLog, writeLog);
  });

  await test("buildObsOverlayRendererHost chains into buildObsOverlayRendererCtx", () => {
    let connected = false;
    const getObs = () => ({ id: "obs" });
    const ctx = buildObsOverlayRendererCtx(
      buildObsOverlayRendererHost({
        runtimeConfig: {},
        getObs,
        isObsConnected: () => connected,
        safeObsCall: async () => ({ ok: true })
      })
    );
    assert.equal(ctx.getObs().id, "obs");
    assert.equal(ctx.isObsConnected(), false);
    connected = true;
    assert.equal(ctx.isObsConnected(), true);
  });

  await test("buildObsOverlaySyncWrappersHost chains into buildObsOverlaySyncWrappersCtx", () => {
    let mode = "split";
    const getApi = () => ({
      resolveObsOverlayMode: () => mode
    });
    const ctx = buildObsOverlaySyncWrappersCtx(
      buildObsOverlaySyncWrappersHost({
        getApi
      })
    );
    assert.equal(ctx.getApi().resolveObsOverlayMode(), "split");
    mode = "single";
    assert.equal(ctx.getApi().resolveObsOverlayMode(), "single");
  });

  await test("buildBossMissionHost chains into buildBossMissionCtx", () => {
    const getOverlayState = () => ({ miaOverlay: null });
    const getVideoEngine = () => ({ id: "video" });
    const ctx = buildBossMissionCtx(
      buildBossMissionHost({
        runtimeConfig: {},
        safeString: String,
        getUserLabel: () => "Viewer",
        writeLog: () => {},
        bossMissionModule: {},
        getOverlayState,
        getVideoEngine
      })
    );
    assert.equal(ctx.getOverlayState, getOverlayState);
    assert.equal(ctx.videoEngine.id, "video");
  });

  await test("buildIngestDeduperHost chains into buildIngestDeduperCtx", () => {
    const writeLog = () => {};
    const ctx = buildIngestDeduperCtx(
      buildIngestDeduperHost({
        windowMs: 5000,
        writeLog
      })
    );
    assert.equal(ctx.windowMs, 5000);
    assert.equal(ctx.appendJsonLog, writeLog);
  });

  await test("buildVoiceTimingHost chains into buildVoiceTimingCtx", () => {
    const getEnv = () => ({ MIA_VOICE_HOLD_MIN_MS: "3500" });
    const runtimePerfModule = { id: "perf" };
    const ctx = buildVoiceTimingCtx(
      buildVoiceTimingHost({
        getEnv,
        runtimePerfModule
      })
    );
    assert.equal(ctx.getEnv, getEnv);
    assert.equal(ctx.runtimePerfModule, runtimePerfModule);
  });

  await test("buildMattingIngestBridgeHost chains into buildMattingIngestBridgeCtx", () => {
    let count = 0;
    const ctx = buildMattingIngestBridgeCtx(
      buildMattingIngestBridgeHost({
        runtimeConfig: {},
        writeLog: () => {},
        safeObsCall: async () => ({ ok: true }),
        streamerMattingModule: {},
        getImmersiveSceneSnapshot: () => ({ sceneId: ++count })
      })
    );
    assert.equal(ctx.getImmersiveSceneSnapshot().sceneId, 1);
    assert.equal(ctx.getImmersiveSceneSnapshot().sceneId, 2);
  });

  await test("buildVisionContextHost chains into buildVisionContextCtx", () => {
    const getOverlayState = () => ({ miaOverlay: null });
    const getMiaEyes = () => ({ id: "eyes" });
    const ctx = buildVisionContextCtx(
      buildVisionContextHost({
        overlayStateModule: {},
        kojnozoutDuelModule: {},
        kickBridgeModule: {},
        runtimeConfig: {},
        getOverlayState,
        getDuelState: () => ({}),
        getMiaEyes,
        isStartupSlideActive: () => false
      })
    );
    assert.equal(ctx.getOverlayState, getOverlayState);
    assert.equal(ctx.miaEyes.id, "eyes");
  });

  await test("buildObsVisionHost chains into buildObsVisionCtx", () => {
    const buildVisionContext = () => ({ mode: "live" });
    const getMiaEyes = () => ({ id: "eyes" });
    const ctx = buildObsVisionCtx(
      buildObsVisionHost({
        runtimeConfig: {},
        writeLog: () => {},
        safeObsCall: async () => ({ ok: true }),
        getMiaEyes,
        buildVisionContext
      })
    );
    assert.equal(ctx.miaEyes.id, "eyes");
    assert.equal(ctx.getContext, buildVisionContext);
    assert.deepEqual(ctx.getContext(), { mode: "live" });
  });

  await test("buildVoiceLayerHost chains into buildVoiceControlLayerCtx", () => {
    const writeLog = () => {};
    const ctx = buildVoiceControlLayerCtx(
      buildVoiceLayerHost({
        writeLog
      })
    );
    assert.equal(ctx.appendJsonLog, writeLog);
  });

  await test("index.js uses collect*BindingsHost and build*Host modules", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectStoryFeedBindingsHost\(\)/);
    assert.match(indexSrc, /MIA_STORY_FEED_HOST/);
    assert.match(indexSrc, /function collectGiftMediaBindingsHost\(\)/);
    assert.match(indexSrc, /MIA_GIFT_MEDIA_HOST/);
    assert.match(indexSrc, /function collectWorldModeBindingsHost\(\)/);
    assert.match(indexSrc, /MIA_WORLD_MODE_HOST/);
    assert.match(indexSrc, /getScheduleStoryAnimationAfterFeed: \(\) => scheduleStoryAnimationAfterFeed/);
    assert.match(indexSrc, /MIA_CAPYBARA_FLOW_HOST/);
    assert.match(indexSrc, /MIA_GIFT_RUNTIME_HOST/);
    assert.match(indexSrc, /MIA_PARTICIPANT_HOST/);
    assert.match(indexSrc, /MIA_SHOWCASE_COMMAND_HOST/);
    assert.match(indexSrc, /MIA_STREAMER_MEDIA_HOST/);
    assert.match(indexSrc, /MIA_SOLO_STREAM_HOST/);
    assert.match(indexSrc, /MIA_OVERLAY_PUBLIC_HOST/);
    assert.match(indexSrc, /MIA_CARE_COMMANDS_HOST/);
    assert.match(indexSrc, /MIA_ACTION_BUILDER_HOST/);
    assert.match(indexSrc, /MIA_PIPELINE_SUMMARY_HOST/);
    assert.match(indexSrc, /MIA_STATUS_HOST/);
    assert.match(indexSrc, /MIA_TRANSLATION_HOST/);
    assert.match(indexSrc, /MIA_SHOWCASE_HOST/);
    assert.match(indexSrc, /MIA_RUNTIME_STATE_HOST/);
    assert.match(indexSrc, /MIA_KOJ_MOMENTS_HOST/);
    assert.match(indexSrc, /MIA_EVENT_PIPELINE_HOST/);
    assert.match(indexSrc, /MIA_INGEST_HTTP_HOST/);
    assert.match(indexSrc, /MIA_DEBUG_ROUTES_HOST/);
    assert.match(indexSrc, /MIA_WORLD_LAYER_HOST/);
    assert.match(indexSrc, /MIA_INGEST_UTILS_HOST/);
    assert.match(indexSrc, /MIA_DELIVERY_HOST/);
    assert.match(indexSrc, /MIA_OVERLAY_STATE_HOST/);
    assert.match(indexSrc, /MIA_STREAM_STATE_HOST/);
    assert.match(indexSrc, /MIA_OBS_BOOTSTRAP_HOST/);
    assert.match(indexSrc, /MIA_OBS_SAFE_CALL_HOST/);
    assert.match(indexSrc, /MIA_OBS_POST_CONNECT_HOST/);
    assert.match(indexSrc, /MIA_OBS_WATCHDOG_HOST/);
    assert.match(indexSrc, /MIA_OBS_OVERLAY_SYNC_HOST/);
    assert.match(indexSrc, /MIA_PLATFORM_BRIDGES_HOST/);
    assert.match(indexSrc, /MIA_RUNTIME_LOOPS_HOST/);
    assert.match(indexSrc, /MIA_SERVER_BOOTSTRAP_HOST/);
    assert.match(indexSrc, /MIA_HEALTH_HOST/);
    assert.match(indexSrc, /MIA_STARTUP_OVERLAY_HOST/);
    assert.match(indexSrc, /MIA_SPAM_SESSION_HOST/);
    assert.match(indexSrc, /MIA_RUNTIME_SECURITY_HOST/);
    assert.match(indexSrc, /MIA_RUNTIME_STATE_SEED_HOST/);
    assert.match(indexSrc, /MIA_VIDEO_ENGINE_HOST/);
    assert.match(indexSrc, /MIA_MIA_EYES_HOST/);
    assert.match(indexSrc, /MIA_TTS_ENGINE_HOST/);
    assert.match(indexSrc, /MIA_INTERPRETER_HOST/);
    assert.match(indexSrc, /MIA_OVERLAY_STATE_CACHE_HOST/);
    assert.match(indexSrc, /MIA_OUTPUT_POLICY_HOST/);
    assert.match(indexSrc, /MIA_ARENA_BATTLE_DEMO_HOST/);
    assert.match(indexSrc, /MIA_OVERLAY_TIMING_HOST/);
    assert.match(indexSrc, /MIA_VOICE_PRIORITY_HOST/);
    assert.match(indexSrc, /MIA_OVERLAY_QUEUE_HOST/);
    assert.match(indexSrc, /MIA_OBS_OVERLAY_RENDERER_HOST/);
    assert.match(indexSrc, /MIA_OBS_OVERLAY_SYNC_WRAPPERS_HOST/);
    assert.match(indexSrc, /MIA_BOSS_MISSION_HOST/);
    assert.match(indexSrc, /MIA_INGEST_DEDUPER_HOST/);
    assert.match(indexSrc, /MIA_VOICE_TIMING_HOST/);
    assert.match(indexSrc, /MIA_MATTING_INGEST_BRIDGE_HOST/);
    assert.match(indexSrc, /MIA_VISION_CONTEXT_HOST/);
    assert.match(indexSrc, /MIA_OBS_VISION_HOST/);
    assert.match(indexSrc, /MIA_VOICE_LAYER_HOST/);
    assert.match(indexSrc, /function initMediaSingletonsRuntime\(\)/);
    assert.match(indexSrc, /getVideoEngine: videoEngineRuntime/);
    assert.match(indexSrc, /initParticipantRuntime\(\)/);
    assert.match(
      indexSrc,
      /initStoryFeedRuntime\(\);\s*\n\s*initGiftMediaRuntime\(\);\s*\n\s*initGiftRuntime\(\);\s*\n\s*initParticipantRuntime\(\);/
    );
  });

  console.log("media_command_hosts_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
