"use strict";

require("./scripts/MIA_ENV").loadLocalEnv();

const express = require("express");
const path = require("path");
const fs = require("fs");
const net = require("net");
const { execSync } = require("child_process");
const { safeRequire } = require("./scripts/MIA_SAFE_REQUIRE");

const OBSWebSocket = safeRequire("obs-websocket-js", { default: null }).default;

const GAME_CONFIG = safeRequire("./scripts/MIA_GAME_CONFIG", {});
const configModule = safeRequire("./scripts/MIA_CONFIG", {});
const normalizer = safeRequire("./shared/platform_normalizers/normalize_event", {});
const outputPolicyModule = safeRequire("./scripts/MIA_OUTPUT_POLICY", {});
const outputStateModule = safeRequire("./scripts/MIA_OUTPUT_STATE", {});
const overlayStateModule = safeRequire("./scripts/MIA_OVERLAY_STATE", {});
const giftUserLedgerModule = safeRequire("./scripts/MIA_GIFT_USER_LEDGER", {});
const giftEconomyModule = safeRequire("./scripts/MIA_GIFT_ECONOMY", {});
const giftPresentationModule = safeRequire("./scripts/MIA_GIFT_PRESENTATION", {});
const awayModeModule = safeRequire("./scripts/MIA_AWAY_MODE", {});
const viewerStoryModule = safeRequire("./scripts/MIA_VIEWER_STORY_MOMENT", {});
const kojWalkModule = safeRequire("./scripts/MIA_KOJNOZROUT_WALK", {});
const giftSupporterProfileModule = safeRequire("./scripts/MIA_GIFT_SUPPORTER_PROFILE", {});
const t0EngagementModule = safeRequire("./scripts/MIA_T0_ENGAGEMENT", {});
const runtimeAuditModule = safeRequire("./scripts/MIA_RUNTIME_AUDIT", {});
const hostTeamPointsModule = safeRequire("./scripts/MIA_HOST_TEAM_POINTS", {});
const overlayTimingModule = safeRequire("./scripts/MIA_OVERLAY_TIMING", {});
const overlayQueueModule = safeRequire("./scripts/MIA_OVERLAY_QUEUE", {});
const voicePriorityModule = safeRequire("./scripts/MIA_VOICE_PRIORITY", {});
const speakerRoutingModule = safeRequire("./scripts/MIA_SPEAKER_ROUTING", {});
const streamStateModule = safeRequire("./scripts/MIA_STREAM_STATE", {});
const supportResolver = safeRequire("./scripts/MIA_SUPPORT_RESOLVER", {});
const responseEngine = safeRequire("./scripts/MIA_RESPONSE_ENGINE", {});
const chatBrain = safeRequire("./scripts/MIA_CHAT_BRAIN", {});
const chatLexiconModule = safeRequire("./scripts/MIA_CHAT_LEXICON", {});
const videoEngineModule = safeRequire("./scripts/MIA_VIDEO_ENGINE", {});
const obsWatchdogModule = safeRequire("./scripts/MIA_OBS_WATCHDOG", {});
const obsSceneGuardModule = safeRequire("./scripts/MIA_OBS_SCENE_GUARD", {});
const bowlFullVideoModule = safeRequire("./scripts/MIA_BOWL_FULL_VIDEO", {});
const bowlEngine = safeRequire("./scripts/KOJNOZROUT_BOWL_ENGINE", {});
const kojnozoutModule = safeRequire("./scripts/MIA_KOJNOZROUT_ENGINE", {});
const kojnozoutPersistenceModule = safeRequire("./scripts/MIA_KOJNOZROUT_PERSISTENCE", {});
const kojnozoutEvolutionModule = safeRequire("./scripts/MIA_KOJNOZROUT_EVOLUTION", {});
const kojnozoutBackpackModule = safeRequire("./scripts/MIA_KOJNOZROUT_BACKPACK", {});
const kojnozoutDuelBridgeModule = safeRequire("./scripts/MIA_KOJNOZROUT_DUEL_BRIDGE", {});
const kojnozoutDuelModule = safeRequire("./scripts/MIA_KOJNOZROUT_DUEL", {});
const kojnozoutWorldPersistenceModule = safeRequire("./scripts/MIA_KOJNOZROUT_WORLD_PERSISTENCE", {});
const kojnozoutVitalsModule = safeRequire("./scripts/MIA_KOJNOZROUT_VITALS", {});
const kickBridgeModule = safeRequire("./scripts/MIA_KICK_BRIDGE", {});
const twitchBridgeModule = safeRequire("./scripts/MIA_TWITCH_BRIDGE", {});
const telegramBridgeModule = safeRequire("./scripts/MIA_TELEGRAM_BRIDGE", {});
const voiceLayerModule = safeRequire("./scripts/MIA_VOICE_CONTROL_LAYER", {});
const shadowRuntime = safeRequire("./MIA_NEXT/engine_shadow_runtime", {});
const spamSessionEngine = safeRequire("./MIA_NEXT/engine_spam_session", {});
const streamAudienceModule = safeRequire("./scripts/MIA_STREAM_AUDIENCE", {});
const ingestGuardModule = safeRequire("./scripts/MIA_INGEST_GUARD", {});
const logRotationModule = safeRequire("./scripts/MIA_LOG_ROTATION", {});
const overlayEmitResultModule = safeRequire("./scripts/MIA_OVERLAY_EMIT_RESULT", {});
const portGuardModule = safeRequire("./scripts/MIA_PORT_GUARD", {});
const runtimeExecution = safeRequire("./shared/runtime_execution", {});
const animationTraceModule = safeRequire("./scripts/MIA_ANIMATION_TRACE", {});
const obsRendererModule = safeRequire("./renderers/obs_overlay_render", {});
const proactiveHostModule = safeRequire("./scripts/MIA_PROACTIVE_HOST", {});
const soloStreamModule = safeRequire("./scripts/MIA_SOLO_STREAM", {});
const sessionMemoryModule = safeRequire("./scripts/MIA_SESSION_MEMORY", {});
const llmAdapterModule = safeRequire("./scripts/MIA_LLM_ADAPTER", {});
const languageModule = safeRequire("./scripts/MIA_LANGUAGE", {});
const translateModule = safeRequire("./scripts/MIA_TRANSLATE", {});
const platformArenaModule = safeRequire("./scripts/MIA_PLATFORM_ARENA", {});
const arenaBattleDemoModule = safeRequire("./scripts/MIA_ARENA_BATTLE_DEMO", {});
const kojRosterModule = safeRequire("./scripts/MIA_KOJ_ROSTER", {});
const chatRewardModule = safeRequire("./scripts/MIA_CHAT_REWARD_ENGINE", {});
const ttsEngineModule = safeRequire("./scripts/MIA_TTS_ENGINE", {});
const supportPolicyModule = safeRequire("./scripts/MIA_SUPPORT_REACTION_POLICY", {});
const statusSnapshotModule = safeRequire("./scripts/MIA_STATUS_SNAPSHOT", {});
const kojnozoutAssetsModule = safeRequire("./scripts/MIA_KOJNOZROUT_ASSETS", {});
const ecosystemOrchestratorModule = safeRequire("./scripts/MIA_ECOSYSTEM_ORCHESTRATOR", {});
const kojnozoutItemCommandModule = safeRequire("./scripts/MIA_KOJNOZROUT_ITEM_COMMAND", {});
const kojnozoutCareModule = safeRequire("./scripts/MIA_KOJNOZROUT_CARE", {});
const kojnozoutCareValidationModule = safeRequire("./scripts/MIA_KOJNOZROUT_CARE_VALIDATION", {});
const careOpportunitiesModule = safeRequire("./scripts/MIA_KOJNOZROUT_CARE_OPPORTUNITIES", {});
const kojnozoutBondModule = safeRequire("./scripts/MIA_KOJNOZROUT_BOND", {});
const careRewardModule = safeRequire("./scripts/MIA_KOJNOZROUT_CARE_REWARD", {});
const careQuestModule = safeRequire("./scripts/MIA_KOJNOZROUT_CARE_QUEST", {});
const kojDisplayModule = safeRequire("./scripts/MIA_KOJNOZROUT_DISPLAY", {});
const kojBattleChoreoModule = safeRequire("./scripts/MIA_KOJ_BATTLE_CHOREOGRAPHY", {});
const kojTestModeModule = safeRequire("./scripts/MIA_KOJNOZROUT_TEST_MODE", {});
const streamerShowcaseModule = safeRequire("./scripts/MIA_STREAMER_SHOWCASE", {});
const streamerIdentityModule = safeRequire("./scripts/MIA_STREAMER_IDENTITY", {});
const giftVisualComposerModule = safeRequire("./scripts/MIA_GIFT_VISUAL_COMPOSER", {});
const giftAnimationContextModule = safeRequire("./scripts/MIA_GIFT_ANIMATION_CONTEXT", {});
const animationReactionModule = safeRequire("./scripts/MIA_ANIMATION_REACTION", {});
const immersiveSceneModule = safeRequire("./scripts/MIA_IMMERSIVE_SCENE", {});
const bossMissionModule = safeRequire("./scripts/MIA_BOSS_MISSION", {});
const streamerMattingModule = safeRequire("./scripts/MIA_STREAMER_MATTING", {});
const mattingIngestBridgeModule = safeRequire("./scripts/MIA_MATTING_INGEST_BRIDGE", {});
const animationEngineModule = safeRequire("./shared/mia-animation-engine", {});
const capybaraFlowModule = safeRequire("./scripts/MIA_CAPYBARA_FLOW", {});
const hostModeConfigModule = safeRequire("./scripts/MIA_HOST_MODE_CONFIG", {});
const streamerMediaCommandModule = safeRequire("./scripts/MIA_STREAMER_MEDIA_COMMAND", {});
const giftMapModule = safeRequire("./scripts/MIA_GIFT_MAP", {});
const giftMapEnterprise = safeRequire("./shared/gifts", {});
const remoteDevModule = safeRequire("./scripts/MIA_REMOTE_DEV", {});
const streamSessionModule = safeRequire("./scripts/MIA_STREAM_SESSION", {});
const remoteDevRoutes = safeRequire("./routes/remote_dev", {});
const miaPaintRoutes = safeRequire("./routes/mia_paint", {});
const miaPaintBridge = safeRequire("./scripts/MIA_PAINT_BRIDGE", {});
const miaPaintWs = safeRequire("./scripts/MIA_PAINT_WS", {});
const streamSessionRoutes = safeRequire("./routes/stream_session", {});
const statusRoutes = safeRequire("./routes/status", {});
const streamEconomyConfig = safeRequire("./scripts/MIA_STREAM_ECONOMY_CONFIG", {});
const careCommandsRoutes = safeRequire("./routes/care_commands", {});
const miaRoutes = safeRequire("./routes", {});
const storyAnimationEngineModule = safeRequire("./scripts/MIA_STORY_ANIMATION_ENGINE", {});
const storyVideoEngineModule = safeRequire("./scripts/MIA_STORY_VIDEO_ENGINE", {});
const miaEyesModule = safeRequire("./scripts/MIA_EYES", {});
const displayVisionModule = safeRequire("./scripts/MIA_DISPLAY_VISION", {});
const mediaCatalogModule = safeRequire("./scripts/MIA_MEDIA_CATALOG", {});
const mediaTemplateRendererModule = safeRequire("./scripts/MIA_MEDIA_TEMPLATE_RENDERER", {});
const mediaApplyObsModule = safeRequire("./scripts/media_apply_obs", {});
const mediaOrchestratorModule = safeRequire("./scripts/MIA_MEDIA_ORCHESTRATOR", {});
const startupCheckModule = safeRequire("./scripts/MIA_STARTUP_CHECK", {});
const obsHandsModule = safeRequire("./scripts/MIA_OBS_HANDS", {});
const obsStreamerCamerasModule = safeRequire("./scripts/MIA_OBS_STREAMER_CAMERAS", {});
const obsAwaySceneModule = safeRequire("./scripts/MIA_OBS_AWAY_SCENE", {});
const obsFixLayoutModule = safeRequire("./scripts/obs_fix_overlay_layout", {});
const obsVisionModule = safeRequire("./scripts/MIA_OBS_VISION", {});
const selfRestartModule = safeRequire("./scripts/MIA_SELF_RESTART", {});
const preflightTestsModule = safeRequire("./scripts/run_preflight_tests", {});
const runtimeSecurityModule = safeRequire("./scripts/MIA_RUNTIME_SECURITY", {});
const runtimePerfModule = safeRequire("./scripts/MIA_RUNTIME_PERF", {});
const overlayPublicResponseModule = safeRequire("./scripts/MIA_OVERLAY_PUBLIC_RESPONSE", {});
const ingestHttpModule = safeRequire("./scripts/MIA_INGEST_HTTP", {});
const eventPipelineModule = safeRequire("./scripts/MIA_EVENT_PIPELINE", {});
const eventPipelineWiringModule = safeRequire("./scripts/MIA_EVENT_PIPELINE_WIRING", {});
const eventPipelineCtxModule = safeRequire("./scripts/MIA_EVENT_PIPELINE_CTX", {});
const ingestHttpWiringModule = safeRequire("./scripts/MIA_INGEST_HTTP_WIRING", {});
const debugRoutesRuntimeModule = safeRequire("./scripts/MIA_DEBUG_ROUTES_RUNTIME", {});
const overlayPublicCtxModule = safeRequire("./scripts/MIA_OVERLAY_PUBLIC_CTX", {});
const careCommandsCtxModule = safeRequire("./scripts/MIA_CARE_COMMANDS_CTX", {});
const streamStateRuntimeModule = safeRequire("./scripts/MIA_STREAM_STATE_RUNTIME", {});
const obsOverlaySyncRuntimeModule = safeRequire("./scripts/MIA_OBS_OVERLAY_SYNC_RUNTIME", {});
const obsOverlaySyncCtxModule = safeRequire("./scripts/MIA_OBS_OVERLAY_SYNC_CTX", {});
const deliveryCtxModule = safeRequire("./scripts/MIA_DELIVERY_CTX", {});
const statusCtxModule = safeRequire("./scripts/MIA_STATUS_CTX", {});
const platformBridgesCtxModule = safeRequire("./scripts/MIA_PLATFORM_BRIDGES_CTX", {});
const capybaraFlowHostModule = safeRequire("./scripts/MIA_CAPYBARA_FLOW_HOST", {});
const giftRuntimeHostModule = safeRequire("./scripts/MIA_GIFT_RUNTIME_HOST", {});
const participantHostModule = safeRequire("./scripts/MIA_PARTICIPANT_HOST", {});
const storyFeedHostModule = safeRequire("./scripts/MIA_STORY_FEED_HOST", {});
const giftMediaHostModule = safeRequire("./scripts/MIA_GIFT_MEDIA_HOST", {});
const worldModeHostModule = safeRequire("./scripts/MIA_WORLD_MODE_HOST", {});
const showcaseCommandHostModule = safeRequire("./scripts/MIA_SHOWCASE_COMMAND_HOST", {});
const streamerMediaHostModule = safeRequire("./scripts/MIA_STREAMER_MEDIA_HOST", {});
const soloStreamHostModule = safeRequire("./scripts/MIA_SOLO_STREAM_HOST", {});
const overlayPublicHostModule = safeRequire("./scripts/MIA_OVERLAY_PUBLIC_HOST", {});
const careCommandsHostModule = safeRequire("./scripts/MIA_CARE_COMMANDS_HOST", {});
const actionBuilderHostModule = safeRequire("./scripts/MIA_ACTION_BUILDER_HOST", {});
const pipelineSummaryHostModule = safeRequire("./scripts/MIA_PIPELINE_SUMMARY_HOST", {});
const statusHostModule = safeRequire("./scripts/MIA_STATUS_HOST", {});
const translationHostModule = safeRequire("./scripts/MIA_TRANSLATION_HOST", {});
const showcaseHostModule = safeRequire("./scripts/MIA_SHOWCASE_HOST", {});
const runtimeStateHostModule = safeRequire("./scripts/MIA_RUNTIME_STATE_HOST", {});
const kojMomentsHostModule = safeRequire("./scripts/MIA_KOJ_MOMENTS_HOST", {});
const eventPipelineHostModule = safeRequire("./scripts/MIA_EVENT_PIPELINE_HOST", {});
const ingestHttpHostModule = safeRequire("./scripts/MIA_INGEST_HTTP_HOST", {});
const debugRoutesHostModule = safeRequire("./scripts/MIA_DEBUG_ROUTES_HOST", {});
const worldLayerHostModule = safeRequire("./scripts/MIA_WORLD_LAYER_HOST", {});
const ingestUtilsHostModule = safeRequire("./scripts/MIA_INGEST_UTILS_HOST", {});
const deliveryHostModule = safeRequire("./scripts/MIA_DELIVERY_HOST", {});
const overlayStateHostModule = safeRequire("./scripts/MIA_OVERLAY_STATE_HOST", {});
const streamStateHostModule = safeRequire("./scripts/MIA_STREAM_STATE_HOST", {});
const obsBootstrapHostModule = safeRequire("./scripts/MIA_OBS_BOOTSTRAP_HOST", {});
const obsSafeCallHostModule = safeRequire("./scripts/MIA_OBS_SAFE_CALL_HOST", {});
const obsPostConnectHostModule = safeRequire("./scripts/MIA_OBS_POST_CONNECT_HOST", {});
const obsWatchdogHostModule = safeRequire("./scripts/MIA_OBS_WATCHDOG_HOST", {});
const obsOverlaySyncHostModule = safeRequire("./scripts/MIA_OBS_OVERLAY_SYNC_HOST", {});
const platformBridgesHostModule = safeRequire("./scripts/MIA_PLATFORM_BRIDGES_HOST", {});
const runtimeLoopsHostModule = safeRequire("./scripts/MIA_RUNTIME_LOOPS_HOST", {});
const serverBootstrapHostModule = safeRequire("./scripts/MIA_SERVER_BOOTSTRAP_HOST", {});
const healthHostModule = safeRequire("./scripts/MIA_HEALTH_HOST", {});
const startupOverlayHostModule = safeRequire("./scripts/MIA_STARTUP_OVERLAY_HOST", {});
const spamSessionHostModule = safeRequire("./scripts/MIA_SPAM_SESSION_HOST", {});
const runtimeSecurityHostModule = safeRequire("./scripts/MIA_RUNTIME_SECURITY_HOST", {});
const runtimeStateSeedHostModule = safeRequire("./scripts/MIA_RUNTIME_STATE_SEED_HOST", {});
const videoEngineHostModule = safeRequire("./scripts/MIA_VIDEO_ENGINE_HOST", {});
const miaEyesHostModule = safeRequire("./scripts/MIA_MIA_EYES_HOST", {});
const ttsEngineHostModule = safeRequire("./scripts/MIA_TTS_ENGINE_HOST", {});
const interpreterHostModule = safeRequire("./scripts/MIA_INTERPRETER_HOST", {});
const overlayStateCacheHostModule = safeRequire("./scripts/MIA_OVERLAY_STATE_CACHE_HOST", {});
const outputPolicyHostModule = safeRequire("./scripts/MIA_OUTPUT_POLICY_HOST", {});
const arenaBattleDemoHostModule = safeRequire("./scripts/MIA_ARENA_BATTLE_DEMO_HOST", {});
const overlayTimingHostModule = safeRequire("./scripts/MIA_OVERLAY_TIMING_HOST", {});
const voicePriorityHostModule = safeRequire("./scripts/MIA_VOICE_PRIORITY_HOST", {});
const overlayQueueHostModule = safeRequire("./scripts/MIA_OVERLAY_QUEUE_HOST", {});
const obsOverlayRendererHostModule = safeRequire("./scripts/MIA_OBS_OVERLAY_RENDERER_HOST", {});
const obsOverlaySyncWrappersHostModule = safeRequire("./scripts/MIA_OBS_OVERLAY_SYNC_WRAPPERS_HOST", {});
const bossMissionHostModule = safeRequire("./scripts/MIA_BOSS_MISSION_HOST", {});
const ingestDeduperHostModule = safeRequire("./scripts/MIA_INGEST_DEDUPER_HOST", {});
const voiceTimingHostModule = safeRequire("./scripts/MIA_VOICE_TIMING_HOST", {});
const mattingIngestBridgeHostModule = safeRequire("./scripts/MIA_MATTING_INGEST_BRIDGE_HOST", {});
const visionContextHostModule = safeRequire("./scripts/MIA_VISION_CONTEXT_HOST", {});
const obsVisionHostModule = safeRequire("./scripts/MIA_OBS_VISION_HOST", {});
const voiceLayerHostModule = safeRequire("./scripts/MIA_VOICE_LAYER_HOST", {});
const routeContextHostModule = safeRequire("./scripts/MIA_ROUTE_CONTEXT_HOST", {});
const runtimeLoopsCtxModule = safeRequire("./scripts/MIA_RUNTIME_LOOPS_CTX", {});
const translationCtxModule = safeRequire("./scripts/MIA_TRANSLATION_CTX", {});
const giftRuntimeCtxModule = safeRequire("./scripts/MIA_GIFT_RUNTIME_CTX", {});
const kojMomentsCtxModule = safeRequire("./scripts/MIA_KOJ_MOMENTS_CTX", {});
const healthCtxModule = safeRequire("./scripts/MIA_HEALTH_CTX", {});
const showcaseCtxModule = safeRequire("./scripts/MIA_SHOWCASE_CTX", {});
const capybaraFlowCtxModule = safeRequire("./scripts/MIA_CAPYBARA_FLOW_CTX", {});
const soloStreamCtxModule = safeRequire("./scripts/MIA_SOLO_STREAM_CTX", {});
const worldLayerCtxModule = safeRequire("./scripts/MIA_WORLD_LAYER_CTX", {});
const bossMissionCtxModule = safeRequire("./scripts/MIA_BOSS_MISSION_CTX", {});
const worldModeCtxModule = safeRequire("./scripts/MIA_WORLD_MODE_CTX", {});
const showcaseCommandCtxModule = safeRequire("./scripts/MIA_SHOWCASE_COMMAND_CTX", {});
const streamerMediaCtxModule = safeRequire("./scripts/MIA_STREAMER_MEDIA_CTX", {});
const runtimeStateCtxModule = safeRequire("./scripts/MIA_RUNTIME_STATE_CTX", {});
const actionBuilderCtxModule = safeRequire("./scripts/MIA_ACTION_BUILDER_CTX", {});
const ingestUtilsCtxModule = safeRequire("./scripts/MIA_INGEST_UTILS_CTX", {});
const pipelineSummaryCtxModule = safeRequire("./scripts/MIA_PIPELINE_SUMMARY_CTX", {});
const startupOverlayCtxModule = safeRequire("./scripts/MIA_STARTUP_OVERLAY_CTX", {});
const obsPostConnectCtxModule = safeRequire("./scripts/MIA_OBS_POST_CONNECT_CTX", {});
const obsBootstrapCtxModule = safeRequire("./scripts/MIA_OBS_BOOTSTRAP_CTX", {});
const obsSafeCallCtxModule = safeRequire("./scripts/MIA_OBS_SAFE_CALL_CTX", {});
const voiceTimingCtxModule = safeRequire("./scripts/MIA_VOICE_TIMING_CTX", {});
const storyFeedCtxModule = safeRequire("./scripts/MIA_STORY_FEED_CTX", {});
const giftMediaCtxModule = safeRequire("./scripts/MIA_GIFT_MEDIA_CTX", {});
const participantCtxModule = safeRequire("./scripts/MIA_PARTICIPANT_CTX", {});
const visionContextCtxModule = safeRequire("./scripts/MIA_VISION_CONTEXT_CTX", {});
const overlayStateCtxModule = safeRequire("./scripts/MIA_OVERLAY_STATE_CTX", {});
const ingestHttpCtxModule = safeRequire("./scripts/MIA_INGEST_HTTP_CTX", {});
const debugRoutesCtxModule = safeRequire("./scripts/MIA_DEBUG_ROUTES_CTX", {});
const streamStateCtxModule = safeRequire("./scripts/MIA_STREAM_STATE_CTX", {});
const serverBootstrapCtxModule = safeRequire("./scripts/MIA_SERVER_BOOTSTRAP_CTX", {});
const videoEngineCtxModule = safeRequire("./scripts/MIA_VIDEO_ENGINE_CTX", {});
const miaEyesCtxModule = safeRequire("./scripts/MIA_MIA_EYES_CTX", {});
const overlayStateCacheCtxModule = safeRequire("./scripts/MIA_OVERLAY_STATE_CACHE_CTX", {});
const ingestDeduperCtxModule = safeRequire("./scripts/MIA_INGEST_DEDUPER_CTX", {});
const obsVisionCtxModule = safeRequire("./scripts/MIA_OBS_VISION_CTX", {});
const overlayTimingCtxModule = safeRequire("./scripts/MIA_OVERLAY_TIMING_CTX", {});
const overlayQueueCtxModule = safeRequire("./scripts/MIA_OVERLAY_QUEUE_CTX", {});
const voicePriorityCtxModule = safeRequire("./scripts/MIA_VOICE_PRIORITY_CTX", {});
const ttsEngineCtxModule = safeRequire("./scripts/MIA_TTS_ENGINE_CTX", {});
const voiceControlLayerCtxModule = safeRequire("./scripts/MIA_VOICE_CONTROL_LAYER_CTX", {});
const interpreterCtxModule = safeRequire("./scripts/MIA_INTERPRETER_CTX", {});
const mattingIngestBridgeCtxModule = safeRequire("./scripts/MIA_MATTING_INGEST_BRIDGE_CTX", {});
const obsOverlayRendererCtxModule = safeRequire("./scripts/MIA_OBS_OVERLAY_RENDERER_CTX", {});
const obsOverlaySyncWrappersCtxModule = safeRequire("./scripts/MIA_OBS_OVERLAY_SYNC_WRAPPERS_CTX", {});
const runtimeStateSeedCtxModule = safeRequire("./scripts/MIA_RUNTIME_STATE_SEED_CTX", {});
const outputPolicyCtxModule = safeRequire("./scripts/MIA_OUTPUT_POLICY_CTX", {});
const obsWatchdogCtxModule = safeRequire("./scripts/MIA_OBS_WATCHDOG_CTX", {});
const arenaBattleDemoCtxModule = safeRequire("./scripts/MIA_ARENA_BATTLE_DEMO_CTX", {});
const runtimeSecurityCtxModule = safeRequire("./scripts/MIA_RUNTIME_SECURITY_CTX", {});
const spamSessionCtxModule = safeRequire("./scripts/MIA_SPAM_SESSION_CTX", {});
const actionBuilderRuntimeModule = safeRequire("./scripts/MIA_ACTION_BUILDER_RUNTIME", {});
const kojMomentsRuntimeModule = safeRequire("./scripts/MIA_KOJ_MOMENTS_RUNTIME", {});
const ingestUtilsRuntimeModule = safeRequire("./scripts/MIA_INGEST_UTILS_RUNTIME", {});
const overlayPublicWiringModule = safeRequire("./scripts/MIA_OVERLAY_PUBLIC_WIRING", {});
const careCommandsWiringModule = safeRequire("./scripts/MIA_CARE_COMMANDS_WIRING", {});
const obsBootstrapModule = safeRequire("./scripts/MIA_OBS_BOOTSTRAP", {});
const obsSafeCallModule = safeRequire("./scripts/MIA_OBS_SAFE_CALL", {});
const obsOverlaySyncModule = safeRequire("./scripts/MIA_OBS_OVERLAY_SYNC", {});
const serverBootstrapModule = safeRequire("./scripts/MIA_SERVER_BOOTSTRAP", {});
const runtimeLoopsModule = safeRequire("./scripts/MIA_RUNTIME_LOOPS", {});
const deliveryRuntimeModule = safeRequire("./scripts/MIA_DELIVERY_RUNTIME", {});
const platformBridgesModule = safeRequire("./scripts/MIA_PLATFORM_BRIDGES", {});
const giftRuntimeModule = safeRequire("./scripts/MIA_GIFT_RUNTIME", {});
const giftMediaRuntimeModule = safeRequire("./scripts/MIA_GIFT_MEDIA_RUNTIME", {});
const storyFeedRuntimeModule = safeRequire("./scripts/MIA_STORY_FEED_RUNTIME", {});
const participantRuntimeModule = safeRequire("./scripts/MIA_PARTICIPANT_RUNTIME", {});
const worldModeRuntimeModule = safeRequire("./scripts/MIA_WORLD_MODE_RUNTIME", {});
const startupOverlayRuntimeModule = safeRequire("./scripts/MIA_STARTUP_OVERLAY_RUNTIME", {});
const healthRuntimeModule = safeRequire("./scripts/MIA_HEALTH_RUNTIME", {});
const obsPostConnectRuntimeModule = safeRequire("./scripts/MIA_OBS_POST_CONNECT_RUNTIME", {});
const routeContextModule = safeRequire("./scripts/MIA_ROUTE_CONTEXT", {});
const routeContextDepsModule = safeRequire("./scripts/MIA_ROUTE_CONTEXT_DEPS", {});
const routeContextCtxModule = safeRequire("./scripts/MIA_ROUTE_CONTEXT_CTX", {});
const { createRouteContextBoot } = require("./scripts/MIA_ROUTE_CONTEXT_BOOT");
const pipelineSummaryRuntimeModule = safeRequire("./scripts/MIA_PIPELINE_SUMMARY_RUNTIME", {});
const overlayStateRuntimeModule = safeRequire("./scripts/MIA_OVERLAY_STATE_RUNTIME", {});
const visionContextRuntimeModule = safeRequire("./scripts/MIA_VISION_CONTEXT_RUNTIME", {});
const statusRuntimeModule = safeRequire("./scripts/MIA_STATUS_RUNTIME", {});
const translationDeliveryRuntimeModule = safeRequire("./scripts/MIA_TRANSLATION_RUNTIME", {});
const showcaseRuntimeModule = safeRequire("./scripts/MIA_SHOWCASE_RUNTIME", {});
const bossMissionRuntimeModule = safeRequire("./scripts/MIA_BOSS_MISSION_RUNTIME", {});
const voiceTimingModule = safeRequire("./scripts/MIA_VOICE_TIMING", {});
const showcaseCommandRuntimeModule = safeRequire("./scripts/MIA_SHOWCASE_COMMAND_RUNTIME", {});
const streamerMediaRuntimeModule = safeRequire("./scripts/MIA_STREAMER_MEDIA_RUNTIME", {});
const streamerAccessModule = safeRequire("./scripts/MIA_STREAMER_ACCESS", {});
const capybaraFlowRuntimeModule = safeRequire("./scripts/MIA_CAPYBARA_FLOW_RUNTIME", {});
const soloStreamRuntimeModule = safeRequire("./scripts/MIA_SOLO_STREAM_RUNTIME", {});
const worldLayerRuntimeModule = safeRequire("./scripts/MIA_WORLD_LAYER_RUNTIME", {});
const runtimeStateRuntimeModule = safeRequire("./scripts/MIA_RUNTIME_STATE_RUNTIME", {});
const { detectObsProcessRunning: detectObsProcessRunningExported } = obsBootstrapModule;

const buildRuntimeConfig =
  typeof configModule.buildRuntimeConfig === "function"
    ? configModule.buildRuntimeConfig
    : () => ({
        server: { port: Number(process.env.PORT || 3000) },
        obs: {
          url: process.env.OBS_WS_URL || "ws://127.0.0.1:4455",
          password: process.env.OBS_WS_PASSWORD || "",
          reconnect: { enabled: false, retryMs: 5000 }
        },
        overlay: {
          enabled: true,
          obsControlEnabled: false,
          maxChatFeedItems: 6,
          chatFeedMaxAgeMs: 15000
        },
        miaNext: { enabled: true, activeRuntime: "MIA_NEXT" },
        kick: { enabled: true }
      });

const runtimeConfig = buildRuntimeConfig(process.env);

let spamSessionRuntimeApi = null;

function collectSpamSessionBindingsHost() {
  return {
    spamConfig: runtimeConfig?.miaNext?.spam || {}
  };
}

function collectSpamSessionHost() {
  const buildHost =
    typeof spamSessionHostModule.buildSpamSessionHost === "function"
      ? spamSessionHostModule.buildSpamSessionHost
      : (bindings) => bindings;
  return buildHost(collectSpamSessionBindingsHost());
}

function initSpamSessionRuntime() {
  if (spamSessionRuntimeApi) return spamSessionRuntimeApi;
  if (typeof spamSessionEngine.configureSpamSession !== "function") {
    spamSessionRuntimeApi = spamSessionEngine;
    return spamSessionRuntimeApi;
  }

  const buildCtx =
    typeof spamSessionCtxModule.buildSpamSessionCtx === "function"
      ? spamSessionCtxModule.buildSpamSessionCtx
      : (host) => host;

  spamSessionEngine.configureSpamSession(buildCtx(collectSpamSessionHost()));
  spamSessionRuntimeApi = spamSessionEngine;
  return spamSessionRuntimeApi;
}

function spamSessionRuntime() {
  return initSpamSessionRuntime();
}

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-MIA-Ingest-Secret, X-Ingest-Secret");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

let debugRouteGuard = null;
let ingestAuthGuard = null;
let localAdminGuard = null;

let runtimeSecurityRuntimeApi = null;

function collectRuntimeSecurityBindingsHost() {
  return {};
}

function collectRuntimeSecurityHost() {
  const buildHost =
    typeof runtimeSecurityHostModule.buildRuntimeSecurityHost === "function"
      ? runtimeSecurityHostModule.buildRuntimeSecurityHost
      : (bindings) => bindings;
  return buildHost(collectRuntimeSecurityBindingsHost());
}

function initRuntimeSecurityRuntime() {
  if (runtimeSecurityRuntimeApi) return runtimeSecurityRuntimeApi;

  const buildCtx =
    typeof runtimeSecurityCtxModule.buildRuntimeSecurityCtx === "function"
      ? runtimeSecurityCtxModule.buildRuntimeSecurityCtx
      : (host) => host;

  buildCtx(collectRuntimeSecurityHost());

  debugRouteGuard =
    typeof runtimeSecurityModule.createDebugRouteGuard === "function"
      ? runtimeSecurityModule.createDebugRouteGuard()
      : (_req, _res, next) => next();
  ingestAuthGuard =
    typeof runtimeSecurityModule.createIngestAuthGuard === "function"
      ? runtimeSecurityModule.createIngestAuthGuard()
      : (_req, _res, next) => next();
  localAdminGuard =
    typeof runtimeSecurityModule.createLocalAdminGuard === "function"
      ? runtimeSecurityModule.createLocalAdminGuard()
      : (_req, _res, next) => next();

  runtimeSecurityRuntimeApi = { debugRouteGuard, ingestAuthGuard, localAdminGuard };
  return runtimeSecurityRuntimeApi;
}

function runtimeSecurityRuntime() {
  return initRuntimeSecurityRuntime();
}

initRuntimeSecurityRuntime();
const BIND_HOST =
  typeof runtimeSecurityModule.resolveBindHost === "function"
    ? runtimeSecurityModule.resolveBindHost()
    : "127.0.0.1";

const PORT = Number(
  process.env.PORT ||
  runtimeConfig?.server?.port ||
  runtimeConfig?.port ||
  3000
);

const logsDir = path.join(__dirname, "logs");
fs.mkdirSync(logsDir, { recursive: true });

if (typeof logRotationModule.cleanupOldLogs === "function") {
  logRotationModule.cleanupOldLogs(logsDir);
}

function cloneJson(value, fallback = null) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_err) {
    return fallback;
  }
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function upper(value) {
  return safeString(value).toUpperCase();
}

function nowIso() {
  return new Date().toISOString();
}

function writeLog(prefix, payload) {
  try {
    enqueueLogLine(prefix, { ts: nowIso(), ...payload });
  } catch (err) {
    console.error("[LOG_FAILED]", err.message);
  }
}

const logWriteBatch = [];
let logWriteFlushScheduled = false;

function enqueueLogLine(prefix, payload) {
  logWriteBatch.push({
    prefix: safeString(prefix, "mia-events"),
    line: JSON.stringify(payload)
  });

  if (logWriteBatch.length >= 32) {
    flushLogWriteBatch();
    return;
  }

  if (!logWriteFlushScheduled) {
    logWriteFlushScheduled = true;
    setImmediate(flushLogWriteBatch);
  }
}

function flushLogWriteBatch() {
  logWriteFlushScheduled = false;
  if (!logWriteBatch.length) return;

  const items = logWriteBatch.splice(0, logWriteBatch.length);
  const grouped = new Map();

  for (const item of items) {
    const day = new Date().toISOString().slice(0, 10);
    const filePath = path.join(logsDir, `${item.prefix}-${day}.jsonl`);
    if (!grouped.has(filePath)) grouped.set(filePath, []);
    grouped.get(filePath).push(item.line);
  }

  for (const [filePath, lines] of grouped.entries()) {
    try {
      if (typeof logRotationModule.prepareLogFile === "function") {
        logRotationModule.prepareLogFile(filePath);
      }
      fs.appendFile(filePath, `${lines.join("\n")}\n`, "utf8", () => {});
    } catch (err) {
      console.error("[LOG_FAILED]", err.message);
    }
  }
}

let outputState = {};
let overlayState = { miaOverlay: null, kojnozoutOverlay: null, chatFeed: [] };
let hostTeamScoreState = {};
let kojnozoutState = {};
let kojnozoutBackpackState = { users: {}, totalItems: 0 };
let platformArenaState = null;
let kojnozoutDuelState = { active: false, phase: "idle" };
let ecosystemState = { orchestratorId: "core", turnHistory: [] };
let itemDisplayState = { queue: [], current: null };
let arenaBattleDemo = null;
let runtimeStateSeedsReady = false;

function collectRuntimeStateSeedBindingsHost() {
  return {
    runtimeConfig,
    outputStateModule,
    overlayStateModule,
    hostTeamPointsModule,
    kojnozoutModule,
    kojnozoutPersistenceModule,
    kojnozoutWorldPersistenceModule,
    kojnozoutBackpackModule,
    platformArenaModule,
    kojnozoutDuelModule,
    ecosystemOrchestratorModule,
    kojnozoutItemCommandModule
  };
}

function collectRuntimeStateSeedHost() {
  const buildHost =
    typeof runtimeStateSeedHostModule.buildRuntimeStateSeedHost === "function"
      ? runtimeStateSeedHostModule.buildRuntimeStateSeedHost
      : (bindings) => bindings;
  return buildHost(collectRuntimeStateSeedBindingsHost());
}

function initRuntimeStateSeedRuntime() {
  if (runtimeStateSeedsReady) {
    return {
      outputState,
      overlayState,
      hostTeamScoreState,
      kojnozoutState,
      kojnozoutBackpackState,
      platformArenaState,
      kojnozoutDuelState,
      ecosystemState,
      itemDisplayState
    };
  }

  const buildCtx =
    typeof runtimeStateSeedCtxModule.buildRuntimeStateSeedCtx === "function"
      ? runtimeStateSeedCtxModule.buildRuntimeStateSeedCtx
      : (host) => host;

  const ctx = buildCtx(collectRuntimeStateSeedHost());

  outputState =
    typeof ctx.outputStateModule?.createOutputState === "function"
      ? ctx.outputStateModule.createOutputState()
      : {};

  overlayState =
    typeof ctx.overlayStateModule?.createOverlayState === "function"
      ? ctx.overlayStateModule.createOverlayState()
      : { miaOverlay: null, kojnozoutOverlay: null, chatFeed: [] };

  hostTeamScoreState =
    typeof ctx.hostTeamPointsModule?.createHostTeamScoreState === "function"
      ? ctx.hostTeamPointsModule.createHostTeamScoreState()
      : {};

  kojnozoutState =
    typeof ctx.kojnozoutModule?.createKojnozoutState === "function"
      ? ctx.kojnozoutModule.createKojnozoutState(ctx.kojnozoutPersistedSeed || {})
      : {};

  kojnozoutBackpackState =
    typeof ctx.kojnozoutBackpackModule?.createBackpackState === "function"
      ? ctx.kojnozoutBackpackModule.createBackpackState(ctx.worldSeed?.backpack || {})
      : { users: {}, totalItems: 0 };

  platformArenaState =
    typeof ctx.platformArenaModule?.loadArenaState === "function"
      ? ctx.platformArenaModule.loadArenaState()
      : typeof ctx.platformArenaModule?.createArenaState === "function"
        ? ctx.platformArenaModule.createArenaState()
        : null;

  kojnozoutDuelState =
    typeof ctx.kojnozoutDuelModule?.createDuelState === "function"
      ? ctx.kojnozoutDuelModule.createDuelState(ctx.worldSeed?.duel || {})
      : { active: false, phase: "idle" };

  ecosystemState =
    typeof ctx.ecosystemOrchestratorModule?.createEcosystemState === "function"
      ? ctx.ecosystemOrchestratorModule.createEcosystemState({
          worldMode: ctx.runtimeConfig?.ecosystem?.worldMode || "default"
        })
      : { orchestratorId: "core", turnHistory: [] };

  itemDisplayState =
    typeof ctx.kojnozoutItemCommandModule?.createItemDisplayState === "function"
      ? ctx.kojnozoutItemCommandModule.createItemDisplayState()
      : { queue: [], current: null };

  runtimeStateSeedsReady = true;

  return {
    outputState,
    overlayState,
    hostTeamScoreState,
    kojnozoutState,
    kojnozoutBackpackState,
    platformArenaState,
    kojnozoutDuelState,
    ecosystemState,
    itemDisplayState
  };
}

function runtimeStateSeedRuntime() {
  return initRuntimeStateSeedRuntime();
}

initRuntimeStateSeedRuntime();

let outputPolicy = null;

function collectOutputPolicyBindingsHost() {
  return {
    policyInput: runtimeConfig?.outputPolicy || {}
  };
}

function collectOutputPolicyHost() {
  const buildHost =
    typeof outputPolicyHostModule.buildOutputPolicyHost === "function"
      ? outputPolicyHostModule.buildOutputPolicyHost
      : (bindings) => bindings;
  return buildHost(collectOutputPolicyBindingsHost());
}

function initOutputPolicyRuntime() {
  if (outputPolicy) return outputPolicy;
  if (typeof outputPolicyModule.createOutputPolicy !== "function") {
    outputPolicy = {};
    return outputPolicy;
  }

  const buildCtx =
    typeof outputPolicyCtxModule.buildOutputPolicyCtx === "function"
      ? outputPolicyCtxModule.buildOutputPolicyCtx
      : (host) => host;

  outputPolicy = outputPolicyModule.createOutputPolicy(buildCtx(collectOutputPolicyHost()));
  return outputPolicy;
}

function outputPolicyRuntime() {
  return initOutputPolicyRuntime();
}

function collectArenaBattleDemoBindingsHost() {
  return {
    platformArenaModule
  };
}

function collectArenaBattleDemoHost() {
  const buildHost =
    typeof arenaBattleDemoHostModule.buildArenaBattleDemoHost === "function"
      ? arenaBattleDemoHostModule.buildArenaBattleDemoHost
      : (bindings) => bindings;
  return buildHost(collectArenaBattleDemoBindingsHost());
}

function initArenaBattleDemoRuntime() {
  if (arenaBattleDemo) return arenaBattleDemo;
  if (typeof arenaBattleDemoModule.createArenaBattleDemo !== "function") {
    arenaBattleDemo = null;
    return arenaBattleDemo;
  }

  const buildCtx =
    typeof arenaBattleDemoCtxModule.buildArenaBattleDemoCtx === "function"
      ? arenaBattleDemoCtxModule.buildArenaBattleDemoCtx
      : (host) => host;

  const ctx = buildCtx(collectArenaBattleDemoHost());
  arenaBattleDemo = arenaBattleDemoModule.createArenaBattleDemo(ctx.platformArenaModule);
  return arenaBattleDemo;
}

function arenaBattleDemoRuntime() {
  return initArenaBattleDemoRuntime();
}

let overlayTiming = null;
let voicePriorityLayer = null;
let overlayQueue = null;

function collectOverlayTimingBindingsHost() {
  return {
    baseDelayMs: 650
  };
}

function collectOverlayTimingHost() {
  const buildHost =
    typeof overlayTimingHostModule.buildOverlayTimingHost === "function"
      ? overlayTimingHostModule.buildOverlayTimingHost
      : (bindings) => bindings;
  return buildHost(collectOverlayTimingBindingsHost());
}

function initOverlayTimingRuntime() {
  if (overlayTiming) return overlayTiming;
  if (typeof overlayTimingModule.createOverlayTiming !== "function") {
    overlayTiming = null;
    return overlayTiming;
  }

  const buildCtx =
    typeof overlayTimingCtxModule.buildOverlayTimingCtx === "function"
      ? overlayTimingCtxModule.buildOverlayTimingCtx
      : (host) => host;

  overlayTiming = overlayTimingModule.createOverlayTiming(buildCtx(collectOverlayTimingHost()));
  return overlayTiming;
}

function overlayTimingRuntime() {
  return initOverlayTimingRuntime();
}

function collectVoicePriorityBindingsHost() {
  return {
    writeLog
  };
}

function collectVoicePriorityHost() {
  const buildHost =
    typeof voicePriorityHostModule.buildVoicePriorityHost === "function"
      ? voicePriorityHostModule.buildVoicePriorityHost
      : (bindings) => bindings;
  return buildHost(collectVoicePriorityBindingsHost());
}

function initVoicePriorityLayerRuntime() {
  if (voicePriorityLayer) return voicePriorityLayer;
  if (typeof voicePriorityModule.createVoicePriorityLayer !== "function") {
    voicePriorityLayer = null;
    return voicePriorityLayer;
  }

  const buildCtx =
    typeof voicePriorityCtxModule.buildVoicePriorityCtx === "function"
      ? voicePriorityCtxModule.buildVoicePriorityCtx
      : (host) => host;

  voicePriorityLayer = voicePriorityModule.createVoicePriorityLayer(
    buildCtx(collectVoicePriorityHost())
  );
  return voicePriorityLayer;
}

function voicePriorityLayerRuntime() {
  return initVoicePriorityLayerRuntime();
}

function collectOverlayQueueBindingsHost() {
  return {
    writeLog
  };
}

function collectOverlayQueueHost() {
  const buildHost =
    typeof overlayQueueHostModule.buildOverlayQueueHost === "function"
      ? overlayQueueHostModule.buildOverlayQueueHost
      : (bindings) => bindings;
  return buildHost(collectOverlayQueueBindingsHost());
}

function initOverlayQueueRuntime() {
  if (overlayQueue) return overlayQueue;
  if (typeof overlayQueueModule.createOverlayQueue !== "function") {
    overlayQueue = null;
    return overlayQueue;
  }

  const buildCtx =
    typeof overlayQueueCtxModule.buildOverlayQueueCtx === "function"
      ? overlayQueueCtxModule.buildOverlayQueueCtx
      : (host) => host;

  overlayQueue = overlayQueueModule.createOverlayQueue(buildCtx(collectOverlayQueueHost()));
  return overlayQueue;
}

function overlayQueueRuntime() {
  return initOverlayQueueRuntime();
}

let obs = null;
let obsConnected = false;
let startupSlideActiveUntil = 0;
let obsConnectingPromise = null;
let obsReconnectTimer = null;
let obsLastFailLogAt = 0;

const obsSharedState = {};
Object.defineProperty(obsSharedState, "obs", {
  get: () => obs,
  set: (value) => {
    obs = value;
  }
});
Object.defineProperty(obsSharedState, "obsConnected", {
  get: () => obsConnected,
  set: (value) => {
    obsConnected = value;
  }
});
Object.defineProperty(obsSharedState, "connectingPromise", {
  get: () => obsConnectingPromise,
  set: (value) => {
    obsConnectingPromise = value;
  }
});
Object.defineProperty(obsSharedState, "reconnectTimer", {
  get: () => obsReconnectTimer,
  set: (value) => {
    obsReconnectTimer = value;
  }
});
Object.defineProperty(obsSharedState, "lastFailLogAt", {
  get: () => obsLastFailLogAt,
  set: (value) => {
    obsLastFailLogAt = value;
  }
});

let obsBootstrapRuntimeApi = null;
const OBS_RECONNECT_MS = 5000;

let obsWatchdog = null;

function collectObsWatchdogBindingsHost() {
  return {
    config: runtimeConfig?.obs?.autoLaunch || {},
    isProcessRunning: () =>
      typeof detectObsProcessRunningExported === "function"
        ? detectObsProcessRunningExported()
        : detectObsProcessRunning(),
    log: (msg) => console.warn(msg),
    now: () => Date.now()
  };
}

function collectObsWatchdogHost() {
  const buildHost =
    typeof obsWatchdogHostModule.buildObsWatchdogHost === "function"
      ? obsWatchdogHostModule.buildObsWatchdogHost
      : (bindings) => bindings;
  return buildHost(collectObsWatchdogBindingsHost());
}

function initObsWatchdogRuntime() {
  if (obsWatchdog) return obsWatchdog;
  if (typeof obsWatchdogModule.createObsWatchdog !== "function") return null;

  const buildCtx =
    typeof obsWatchdogCtxModule.buildObsWatchdogCtx === "function"
      ? obsWatchdogCtxModule.buildObsWatchdogCtx
      : (host) => host;

  obsWatchdog = obsWatchdogModule.createObsWatchdog(buildCtx(collectObsWatchdogHost()));
  return obsWatchdog;
}

function obsWatchdogRuntime() {
  return initObsWatchdogRuntime();
}

function detectObsProcessRunning() {
  return typeof detectObsProcessRunningExported === "function"
    ? detectObsProcessRunningExported()
    : false;
}

const MIA_LIVE_HUB_URL = () => `http://127.0.0.1:${PORT}/mia-live-hub.html`;
const MIA_OVERLAY_BASE = () => `http://127.0.0.1:${PORT}`;
const MIA_SPLIT_OVERLAYS = () => ({
  speech: `${MIA_OVERLAY_BASE()}/speech-overlay.html?v=36-koj-unify`,
  bowl: `${MIA_OVERLAY_BASE()}/kojnozrout-bowl-overlay.html?v=36-koj-unify`,
  runtime: `${MIA_OVERLAY_BASE()}/kojnozrout-runtime.html?v=36-koj-unify`,
  voice: `${MIA_OVERLAY_BASE()}/mia-voice-overlay.html`,
  status: `${MIA_OVERLAY_BASE()}/entity-overlay.html`,
  evolutionToast: `${MIA_OVERLAY_BASE()}/evolution-toast-overlay.html`,
  backpack: `${MIA_OVERLAY_BASE()}/kojnozrout-backpack-overlay.html`,
  giftMoment: `${MIA_OVERLAY_BASE()}/gift-moment-overlay.html`,
  giftAnimation: `${MIA_OVERLAY_BASE()}/gift-animation-overlay.html?v=37-stream-polish`,
  combo: `${MIA_OVERLAY_BASE()}/combo-overlay.html`,
  hostMode: `${MIA_OVERLAY_BASE()}/host-mode-overlay.html`,
  viewerStrip: `${MIA_OVERLAY_BASE()}/viewer-strip-overlay.html`,
  t0Flyby: `${MIA_OVERLAY_BASE()}/t0-flyby-overlay.html`,
  duel: `${MIA_OVERLAY_BASE()}/kojnozrout-duel-overlay.html`,
  arena: `${MIA_OVERLAY_BASE()}/arena-overlay.html`,
  arenaBattle: `${MIA_OVERLAY_BASE()}/arena-battle-overlay.html`,
  arenaBattleTest: `${MIA_OVERLAY_BASE()}/arena-battle-test-overlay.html`,
  storyMoment: `${MIA_OVERLAY_BASE()}/story-moment-overlay.html`,
  startupCheck: `${MIA_OVERLAY_BASE()}/startup-check.html`,
  dashboard: `${MIA_OVERLAY_BASE()}/mia-streamer-dashboard.html`,
  gfxRoster: `${MIA_OVERLAY_BASE()}/koj-roster-gallery.html`,
  gfxForms: `${MIA_OVERLAY_BASE()}/koj-forms-gallery.html`,
  gfxItems: `${MIA_OVERLAY_BASE()}/koj-items-gallery.html`,
  gfxEvolution: `${MIA_OVERLAY_BASE()}/koj-evolution-gallery.html`,
  gfxScenes: `${MIA_OVERLAY_BASE()}/koj-scenes-gallery.html`,
  gfxProps: `${MIA_OVERLAY_BASE()}/koj-props-gallery.html`,
  hub: MIA_LIVE_HUB_URL()
});

let obsOverlaySyncCoreRuntimeApi = null;

function collectObsOverlaySyncBindingsHost() {
  return {
    getObs: () => obs,
    getObsConnected: () => obsConnected,
    getSplitOverlays: MIA_SPLIT_OVERLAYS,
    getOverlayBase: MIA_OVERLAY_BASE,
    runtimeConfig,
    safeString,
    writeLog,
    obsFixLayoutModule,
    obsHandsModule,
    obsAwaySceneModule,
    obsStreamerCamerasModule,
    selfRestartModule,
    buildVisionContext,
    getVoicePlaybackSnapshot,
    getMiaEyes: miaEyesRuntime,
    setStartupSlideActiveUntil: (value) => {
      startupSlideActiveUntil = value;
    }
  };
}

function collectObsOverlaySyncHost() {
  const buildHost =
    typeof obsOverlaySyncHostModule.buildObsOverlaySyncHost === "function"
      ? obsOverlaySyncHostModule.buildObsOverlaySyncHost
      : (bindings) => bindings;
  return buildHost(collectObsOverlaySyncBindingsHost());
}

function initObsOverlaySyncCoreRuntime() {
  if (obsOverlaySyncCoreRuntimeApi) return obsOverlaySyncCoreRuntimeApi;
  if (typeof obsOverlaySyncModule.createObsOverlaySync !== "function") {
    obsOverlaySyncCoreRuntimeApi = {
      resolveObsOverlayMode: () => "split",
      auditObsMiaBrowserSources: async () => ({ ok: false, reason: "overlay_sync_missing" }),
      applyObsBrowserSourceProfile: async () => ({ ok: false }),
      ensureObsVoiceBrowserReady: async () => ({ ok: false }),
      fixObsOverlayBrowserLayouts: async () => ({ ok: false }),
      fixObsOverlaySceneTransforms: async () => ({ ok: false }),
      ensureObsHands: async () => ({ ok: false }),
      ensureObsStreamerCameras: async () => ({ ok: false }),
      flashStartupCheckBrowserSource: async () => ({ ok: false }),
      configureObsMiaLiveHub: async () => ({ ok: false }),
      ensureObsMiaSourceVisibleInProgramScene: async () => ({ ok: false }),
      refreshObsMiaBrowserSources: async () => ({ ok: false, refreshed: [] }),
      scheduleObsBrowserRefresh: async () => {},
      obsBrowserRefreshOnConnectEnabled: () => false,
      obsBrowserRefreshOnOverlayEnabled: () => false
    };
    return obsOverlaySyncCoreRuntimeApi;
  }

  const buildCtx =
    typeof obsOverlaySyncCtxModule.buildObsOverlaySyncCtx === "function"
      ? obsOverlaySyncCtxModule.buildObsOverlaySyncCtx
      : (host) => host;

  obsOverlaySyncCoreRuntimeApi = obsOverlaySyncModule.createObsOverlaySync(
    buildCtx(collectObsOverlaySyncHost())
  );
  return obsOverlaySyncCoreRuntimeApi;
}

function obsOverlaySyncCoreRuntime() {
  return initObsOverlaySyncCoreRuntime();
}

let obsOverlaySyncRuntimeApi = null;

function collectObsOverlaySyncWrappersBindingsHost() {
  return {
    getApi: obsOverlaySyncCoreRuntime
  };
}

function collectObsOverlaySyncWrappersHost() {
  const buildHost =
    typeof obsOverlaySyncWrappersHostModule.buildObsOverlaySyncWrappersHost === "function"
      ? obsOverlaySyncWrappersHostModule.buildObsOverlaySyncWrappersHost
      : (bindings) => bindings;
  return buildHost(collectObsOverlaySyncWrappersBindingsHost());
}

function initObsOverlaySyncRuntime() {
  if (obsOverlaySyncRuntimeApi) return obsOverlaySyncRuntimeApi;
  const createWrappers =
    typeof obsOverlaySyncRuntimeModule.createObsOverlaySyncWrappers === "function"
      ? obsOverlaySyncRuntimeModule.createObsOverlaySyncWrappers
      : (getApi) => (typeof getApi === "function" ? getApi() : getApi);

  const buildCtx =
    typeof obsOverlaySyncWrappersCtxModule.buildObsOverlaySyncWrappersCtx === "function"
      ? obsOverlaySyncWrappersCtxModule.buildObsOverlaySyncWrappersCtx
      : (host) => host;

  const ctx = buildCtx(collectObsOverlaySyncWrappersHost());
  obsOverlaySyncRuntimeApi = createWrappers(ctx.getApi);
  return obsOverlaySyncRuntimeApi;
}

function obsOverlaySyncRuntime() {
  return initObsOverlaySyncRuntime();
}

function resolveObsOverlayMode() {
  return obsOverlaySyncRuntime().resolveObsOverlayMode();
}

async function auditObsMiaBrowserSources() {
  return obsOverlaySyncRuntime().auditObsMiaBrowserSources();
}

async function applyObsBrowserSourceProfile(inputName, currentUrl = "", options = {}) {
  return obsOverlaySyncRuntime().applyObsBrowserSourceProfile(inputName, currentUrl, options);
}

async function ensureObsVoiceBrowserReady(options = {}) {
  return obsOverlaySyncRuntime().ensureObsVoiceBrowserReady(options);
}

async function fixObsOverlayBrowserLayouts() {
  return obsOverlaySyncRuntime().fixObsOverlayBrowserLayouts();
}

async function fixObsOverlaySceneTransforms(sceneName = "") {
  return obsOverlaySyncRuntime().fixObsOverlaySceneTransforms(sceneName);
}

async function ensureObsHands(options = {}) {
  return obsOverlaySyncRuntime().ensureObsHands(options);
}

async function ensureObsStreamerCameras(options = {}) {
  return obsOverlaySyncRuntime().ensureObsStreamerCameras(options);
}

async function flashStartupCheckBrowserSource(durationMs = 25000) {
  return obsOverlaySyncRuntime().flashStartupCheckBrowserSource(durationMs);
}

async function configureObsMiaLiveHub() {
  return obsOverlaySyncRuntime().configureObsMiaLiveHub();
}

async function ensureObsMiaSourceVisibleInProgramScene(preferredNames = []) {
  return obsOverlaySyncRuntime().ensureObsMiaSourceVisibleInProgramScene(preferredNames);
}

async function refreshObsMiaBrowserSources() {
  return obsOverlaySyncRuntime().refreshObsMiaBrowserSources();
}

async function scheduleObsBrowserRefresh(force = false) {
  return obsOverlaySyncRuntime().scheduleObsBrowserRefresh(force);
}

function obsBrowserRefreshOnOverlayEnabled() {
  return obsOverlaySyncRuntime().obsBrowserRefreshOnOverlayEnabled();
}

function obsBrowserRefreshOnConnectEnabled() {
  return obsOverlaySyncRuntime().obsBrowserRefreshOnConnectEnabled();
}

const serverStartedAt = Date.now();

let streamStateRuntimeApi = null;

function collectStreamStateBindingsHost() {
  return {
    streamSessionModule,
    giftUserLedgerModule,
    giftSupporterProfileModule,
    streamStateModule,
    mediaCatalogModule,
    writeLog,
    serverStartedAt
  };
}

function collectStreamStateHost() {
  const buildHost =
    typeof streamStateHostModule.buildStreamStateHost === "function"
      ? streamStateHostModule.buildStreamStateHost
      : (bindings) => bindings;
  return buildHost(collectStreamStateBindingsHost());
}

function initStreamStateRuntime() {
  if (streamStateRuntimeApi) return streamStateRuntimeApi;

  if (typeof streamStateRuntimeModule.createStreamStateRuntime !== "function") {
    streamStateRuntimeApi = {
      getServerStartedAt: () => serverStartedAt,
      getStreamSession: () => ({ phase: "PRELIVE", startedAt: serverStartedAt }),
      setStreamSession: (next) => next,
      markStreamSessionEnded: () => ({ phase: "ENDED" }),
      getGiftSupporterProfile: () => ({}),
      setGiftSupporterProfile: (next) => next,
      getGiftUserLedger: () => ({ entries: [] }),
      setGiftUserLedger: (next) => next,
      getLastGiftMapping: () => null,
      setLastGiftMapping: (next) => next,
      getStreamState: () => ({}),
      setStreamState: (next) => next,
      getObsSourceAudioMap: () => ({})
    };
    return streamStateRuntimeApi;
  }

  const buildCtx =
    typeof streamStateCtxModule.buildStreamStateCtx === "function"
      ? streamStateCtxModule.buildStreamStateCtx
      : (host) => host;

  streamStateRuntimeApi = streamStateRuntimeModule.createStreamStateRuntime(
    buildCtx(collectStreamStateHost())
  );
  return streamStateRuntimeApi;
}

function streamStateRuntime() {
  return initStreamStateRuntime();
}

function getStreamSession() {
  return streamStateRuntime().getStreamSession();
}

function setStreamSession(next) {
  return streamStateRuntime().setStreamSession(next);
}

function markStreamSessionEnded(reason = "shutdown") {
  return streamStateRuntime().markStreamSessionEnded(reason);
}

function getGiftSupporterProfile() {
  return streamStateRuntime().getGiftSupporterProfile();
}

function setGiftSupporterProfile(next) {
  return streamStateRuntime().setGiftSupporterProfile(next);
}

function getGiftUserLedger() {
  return streamStateRuntime().getGiftUserLedger();
}

function setGiftUserLedger(next) {
  return streamStateRuntime().setGiftUserLedger(next);
}

function getLastGiftMapping() {
  return streamStateRuntime().getLastGiftMapping();
}

function setLastGiftMapping(next) {
  return streamStateRuntime().setLastGiftMapping(next);
}

function getStreamState() {
  return streamStateRuntime().getStreamState();
}

function setStreamState(next) {
  return streamStateRuntime().setStreamState(next);
}

function getObsSourceAudioMap() {
  return streamStateRuntime().getObsSourceAudioMap();
}

let lastIngestSummary = null;
let lastDuelSyncSummary = null;
let lastShadowPipelineSummary = null;

let startupOverlayRuntimeApi = null;

function collectStartupOverlayBindingsHost() {
  return {
    writeLog,
    runtimeConfig,
    getPort: () => PORT,
    getBindHost: () => BIND_HOST,
    voiceHoldUntilTs,
    projectRoot: __dirname,
    startupCheckModule,
    mediaCatalogModule,
    getTtsEngine: ttsEngineRuntime,
    kickBridgeModule,
    runtimeSecurityModule,
    preflightTestsModule,
    getObsConnected: () => obsConnected,
    getObs: () => obs,
    getVideoEngine: videoEngineRuntime,
    MIA_SPLIT_OVERLAYS,
    flashStartupCheckBrowserSource,
    obsBrowserRefreshOnConnectEnabled,
    refreshObsMiaBrowserSources,
    executeOverlay,
    deliveryRuntime,
    mirrorSpeechOverlayFromVoice,
    invalidateOverlayStateCache
  };
}

function collectStartupOverlayHost() {
  const buildHost =
    typeof startupOverlayHostModule.buildStartupOverlayHost === "function"
      ? startupOverlayHostModule.buildStartupOverlayHost
      : (bindings) => bindings;
  return buildHost(collectStartupOverlayBindingsHost());
}

function initStartupOverlayRuntime() {
  if (startupOverlayRuntimeApi) return startupOverlayRuntimeApi;
  if (typeof startupOverlayRuntimeModule.createStartupOverlayRuntime !== "function") {
    startupOverlayRuntimeApi = {
      buildStartupCheckPayload: () => ({ ok: false, checks: [], warnings: ["startup_overlay_runtime_missing"] }),
      emitStartupCheckSlide: async () => {},
      emitStartupOverlay: async () => {},
      runPreflightTestsAsync: async () => null,
      runPreflightTestsBackground: () => {}
    };
    return startupOverlayRuntimeApi;
  }

  const buildCtx =
    typeof startupOverlayCtxModule.buildStartupOverlayCtx === "function"
      ? startupOverlayCtxModule.buildStartupOverlayCtx
      : (host) => host;

  startupOverlayRuntimeApi = startupOverlayRuntimeModule.createStartupOverlayRuntime(
    buildCtx(collectStartupOverlayHost())
  );
  return startupOverlayRuntimeApi;
}

function startupOverlayRuntime() {
  return initStartupOverlayRuntime();
}

function buildStartupCheckPayload() {
  return startupOverlayRuntime().buildStartupCheckPayload();
}

async function emitStartupCheckSlide() {
  return startupOverlayRuntime().emitStartupCheckSlide();
}

async function emitStartupOverlay() {
  return startupOverlayRuntime().emitStartupOverlay();
}

function runPreflightTestsAsync() {
  return startupOverlayRuntime().runPreflightTestsAsync();
}

function runPreflightTestsBackground() {
  return startupOverlayRuntime().runPreflightTestsBackground();
}

let healthRuntimeApi = null;

function collectHealthBindingsHost() {
  return {
    kojnozoutModule,
    kickBridgeModule,
    twitchBridgeModule,
    telegramBridgeModule,
    overlayStateModule,
    getTtsEngine: ttsEngineRuntime,
    llmAdapterModule,
    getVideoEngine: videoEngineRuntime,
    getPort: () => PORT,
    nowIso,
    runtimeConfig,
    MIA_SPLIT_OVERLAYS,
    getKojnozoutState: () => kojnozoutState,
    getStreamState,
    getObsConnected: () => obsConnected,
    getLastIngestSummary: () => lastIngestSummary,
    getOverlayState: () => overlayState,
    resolveObsOverlayMode,
    buildObsHealthSnapshot,
    getVoicePlaybackSnapshot,
    getOverlayTiming: overlayTimingRuntime,
    getVoicePriorityLayer: voicePriorityLayerRuntime,
    getOverlayQueue: overlayQueueRuntime
  };
}

function collectHealthHost() {
  const buildHost =
    typeof healthHostModule.buildHealthHost === "function"
      ? healthHostModule.buildHealthHost
      : (bindings) => bindings;
  return buildHost(collectHealthBindingsHost());
}

function initHealthRuntime() {
  if (healthRuntimeApi) return healthRuntimeApi;
  if (typeof healthRuntimeModule.createHealthRuntime !== "function") {
    healthRuntimeApi = {
      buildHealthPayload: () => ({ ok: false, service: "MIA" }),
      buildDiagnosePayload: async () => ({ ok: false, server: "unknown" })
    };
    return healthRuntimeApi;
  }

  const buildCtx =
    typeof healthCtxModule.buildHealthCtx === "function"
      ? healthCtxModule.buildHealthCtx
      : (host) => host;

  healthRuntimeApi = healthRuntimeModule.createHealthRuntime(buildCtx(collectHealthHost()));
  return healthRuntimeApi;
}

function healthRuntime() {
  return initHealthRuntime();
}

function buildHealthPayload() {
  return healthRuntime().buildHealthPayload();
}

async function buildDiagnosePayload() {
  return healthRuntime().buildDiagnosePayload();
}

function collectRouteContextBindingsHost() {
  return {
    overlayStateModule,
    platformArenaModule,
    getOverlayStateCache: overlayStateCacheRuntime,
    mediaCatalogModule,
    mediaOrchestratorModule,
    mediaApplyObsModule,
    mediaTemplateRendererModule,
    selfRestartModule,
    speakerRoutingModule,
    obsFixLayoutModule,
    immersiveSceneModule,
    streamerMattingModule,
    obsStreamerCamerasModule,
    bossMissionModule,
    getMattingIngestBridge: mattingIngestBridgeRuntime,
    streamerIdentityModule,
    kojnozoutDuelModule,
    kojnozoutBackpackModule,
    kojRosterModule,
    getArenaBattleDemo: arenaBattleDemoRuntime,
    remoteDevModule,
    giftMapEnterprise,
    miaPaintBridge,
    miaPaintWs,
    languageModule,
    translateModule,
    getInterpreterRuntime: interpreterRuntime,
    runtimeSecurityModule,
    capybaraFlowModule,
    giftVisualComposerModule,
    viewerStoryModule,
    storyAnimationEngineModule,
    storyVideoEngineModule,
    soloStreamModule,
    proactiveHostModule,
    getVoiceLayer: voiceLayerRuntime,
    miaEyesModule,
    displayVisionModule,
    getObsVision: obsVisionRuntime,
    obsVisionModule,
    animationEngineModule,
    kojTestModeModule,
    kojnozoutVitalsModule,
    kojnozoutPersistenceModule,
    kojnozoutModule,
    streamerShowcaseModule,
    getOverlayState: () => overlayState,
    setOverlayState: (next) => {
      overlayState = next;
    },
    getPort: () => PORT,
    getObsConnected: () => obsConnected,
    getObs: () => obs,
    getDuelState: () => kojnozoutDuelState,
    setDuelState: (next) => {
      kojnozoutDuelState = next;
    },
    getBackpackState: () => kojnozoutBackpackState,
    getArenaState: () => platformArenaState,
    setArenaState: (next) => {
      platformArenaState = next;
    },
    getLastGiftMapping,
    getOutputState: () => outputState,
    getKojnozoutState: () => kojnozoutState,
    setKojnozoutState: (next) => {
      kojnozoutState = next;
    },
    buildStartupCheckPayload,
    buildHealthPayload,
    buildDiagnosePayload,
    ingestAuthGuard,
    handleIngest,
    handleAudienceIngest,
    localAdminGuard,
    debugRouteGuard,
    buildPublicOverlayStateResponse,
    buildOverlayStateCacheKey,
    setOverlay,
    executeOverlay,
    deliverActionVoice,
    getVoicePlaybackSnapshot,
    buildVisionContext,
    buildMiaStatusResponse,
    mirrorSpeechOverlayFromVoice,
    invalidateOverlayStateCache,
    handleDebugComment,
    handleDebugGift,
    processEvent,
    applyWorldModeChange,
    activateComboMoment,
    activateBossCinematic,
    buildSoloStreamSceneCtx,
    maybeDeliverMiaVoice,
    deliverMicTranslation,
    speakMiaShowcaseLine,
    refreshObsMiaBrowserSources,
    ensureObsConnectedWithRetry,
    safeObsCall,
    fixObsOverlayBrowserLayouts,
    fixObsOverlaySceneTransforms,
    ensureObsVoiceBrowserReady,
    auditObsMiaBrowserSources,
    ensureObsStreamerCameras,
    buildObsHealthSnapshot,
    forceReconnectObs,
    runObsMaintenanceScript,
    ensureObsHands,
    getVideoEngine: videoEngineRuntime,
    bowlFullVideoModule,
    getMiaEyes: miaEyesRuntime,
    scheduleWorldSave,
    safeRequire,
    getServerStartedAt: () => serverStartedAt,
    getStreamSession,
    setStreamSession,
    deliveryRuntime,
    runtimeConfig,
    writeLog,
    safeString,
    lastDuelSyncSummary,
    MIA_SPLIT_OVERLAYS,
    overlayStaticDir,
    streamSessionModule,
    getSpamSessionEngine: spamSessionRuntime,
    getStreamState,
    serverStartedAt,
    ecosystemState,
    getTtsEngine: ttsEngineRuntime,
    MIA_OVERLAY_BASE,
    voiceHoldUntilTs
  };
}

const routeContextBoot = createRouteContextBoot({
  routeContextModule,
  routeContextHostModule,
  routeContextCtxModule,
  routeContextDepsModule,
  collectBindings: collectRouteContextBindingsHost
});

function resetOverlayState() {
  return routeContextBoot.resetOverlayState();
}

function buildMiaRouteContext() {
  return routeContextBoot.buildMiaRouteContext();
}

let obsPostConnectRuntimeApi = null;

function collectObsPostConnectBindingsHost() {
  return {
    writeLog,
    safeString,
    runtimeConfig,
    ensureObsHands,
    configureObsMiaLiveHub,
    fixObsOverlayBrowserLayouts,
    fixObsOverlaySceneTransforms,
    ensureObsMiaSourceVisibleInProgramScene,
    ensureObsVoiceBrowserReady,
    obsBrowserRefreshOnConnectEnabled,
    refreshObsMiaBrowserSources,
    getVideoEngine: videoEngineRuntime,
    getObsVision: obsVisionRuntime,
    getMiaEyes: miaEyesRuntime
  };
}

function collectObsPostConnectHost() {
  const buildHost =
    typeof obsPostConnectHostModule.buildObsPostConnectHost === "function"
      ? obsPostConnectHostModule.buildObsPostConnectHost
      : (bindings) => bindings;
  return buildHost(collectObsPostConnectBindingsHost());
}

function initObsPostConnectRuntime() {
  if (obsPostConnectRuntimeApi) return obsPostConnectRuntimeApi;
  if (typeof obsPostConnectRuntimeModule.createObsPostConnectRuntime !== "function") {
    obsPostConnectRuntimeApi = {
      bootstrapObsAfterConnect: async () => ({ handsResult: null })
    };
    return obsPostConnectRuntimeApi;
  }

  const buildCtx =
    typeof obsPostConnectCtxModule.buildObsPostConnectCtx === "function"
      ? obsPostConnectCtxModule.buildObsPostConnectCtx
      : (host) => host;

  obsPostConnectRuntimeApi = obsPostConnectRuntimeModule.createObsPostConnectRuntime(
    buildCtx(collectObsPostConnectHost())
  );
  return obsPostConnectRuntimeApi;
}

function obsPostConnectRuntime() {
  return initObsPostConnectRuntime();
}

async function bootstrapObsAfterConnect() {
  return obsPostConnectRuntime().bootstrapObsAfterConnect();
}

function collectObsBootstrapBindingsHost() {
  return {
    obsSharedState,
    runtimeConfig,
    writeLog,
    getPort: () => PORT,
    reconnectMs: OBS_RECONNECT_MS,
    OBSWebSocket,
    obsSceneGuardModule,
    getObsWatchdog: obsWatchdogRuntime,
    onAfterConnect: bootstrapObsAfterConnect,
    onConnectionClosed: () => {
      const vision = obsVisionRuntime();
      if (vision && typeof vision.stopWatch === "function") {
        vision.stopWatch();
      }
    },
    onMediaPlaybackEnded: (event) => {
      const engine = videoEngineRuntime();
      if (engine && typeof engine.handleMediaPlaybackEnded === "function") {
        engine.handleMediaPlaybackEnded(event);
      }
    }
  };
}

function collectObsBootstrapHost() {
  const buildHost =
    typeof obsBootstrapHostModule.buildObsBootstrapHost === "function"
      ? obsBootstrapHostModule.buildObsBootstrapHost
      : (bindings) => bindings;
  return buildHost(collectObsBootstrapBindingsHost());
}

function initObsBootstrapRuntime() {
  if (obsBootstrapRuntimeApi) return obsBootstrapRuntimeApi;

  if (typeof obsBootstrapModule.createObsBootstrap !== "function") {
    obsBootstrapRuntimeApi = {
      connectObs: async () => {},
      ensureObsConnected: async () => ({ ok: false, obsConnected: false }),
      ensureObsConnectedWithRetry: async () => ({ ok: false, obsConnected: false }),
      forceReconnectObs: async () => ({ ok: false, obsConnected: false }),
      buildObsHealthSnapshot: async () => ({ connected: false, status: "module_missing" }),
      warnOnDeadObsSceneFiles: () => {},
      runObsMaintenanceScript: () => ({ status: 1, stdout: "", stderr: "missing" })
    };
    return obsBootstrapRuntimeApi;
  }

  const buildCtx =
    typeof obsBootstrapCtxModule.buildObsBootstrapCtx === "function"
      ? obsBootstrapCtxModule.buildObsBootstrapCtx
      : (host) => host;

  obsBootstrapRuntimeApi = obsBootstrapModule.createObsBootstrap(
    buildCtx(collectObsBootstrapHost())
  );

  return obsBootstrapRuntimeApi;
}

function obsBootstrapRuntime() {
  return initObsBootstrapRuntime();
}

async function connectObs() {
  return obsBootstrapRuntime().connectObs();
}

async function buildObsHealthSnapshot() {
  return obsBootstrapRuntime().buildObsHealthSnapshot();
}

function warnOnDeadObsSceneFiles() {
  return obsBootstrapRuntime().warnOnDeadObsSceneFiles();
}

async function forceReconnectObs(trigger = "manual") {
  return obsBootstrapRuntime().forceReconnectObs(trigger);
}

let voiceTimingRuntimeApi = null;

function collectVoiceTimingBindingsHost() {
  return {
    getEnv: () => process.env,
    runtimePerfModule
  };
}

function collectVoiceTimingHost() {
  const buildHost =
    typeof voiceTimingHostModule.buildVoiceTimingHost === "function"
      ? voiceTimingHostModule.buildVoiceTimingHost
      : (bindings) => bindings;
  return buildHost(collectVoiceTimingBindingsHost());
}

function initVoiceTimingRuntime() {
  if (voiceTimingRuntimeApi) return voiceTimingRuntimeApi;
  if (typeof voiceTimingModule.createVoiceTiming !== "function") {
    voiceTimingRuntimeApi = {
      voiceHoldUntilTs: (now, durationMs) => {
        const estimate = Number(durationMs || 0);
        return now + (estimate > 0 ? Math.max(estimate + 1200, 3500) : 8500);
      }
    };
    return voiceTimingRuntimeApi;
  }

  const buildCtx =
    typeof voiceTimingCtxModule.buildVoiceTimingCtx === "function"
      ? voiceTimingCtxModule.buildVoiceTimingCtx
      : (host) => host;

  voiceTimingRuntimeApi = voiceTimingModule.createVoiceTiming(
    buildCtx(collectVoiceTimingHost())
  );
  return voiceTimingRuntimeApi;
}

function voiceTimingRuntime() {
  return initVoiceTimingRuntime();
}

function voiceHoldUntilTs(now, durationMs) {
  return voiceTimingRuntime().voiceHoldUntilTs(now, durationMs);
}

async function ensureObsConnected(trigger = "obs") {
  return obsBootstrapRuntime().ensureObsConnected(trigger);
}

async function ensureObsConnectedWithRetry(
  trigger = "obs",
  maxWaitMs = 15000,
  pollMs = 2500
) {
  return obsBootstrapRuntime().ensureObsConnectedWithRetry(trigger, maxWaitMs, pollMs);
}

let obsSafeCallRuntimeApi = null;

function collectObsSafeCallBindingsHost() {
  return {
    safeString,
    writeLog,
    ensureObsConnected,
    getObs: () => obs
  };
}

function collectObsSafeCallHost() {
  const buildHost =
    typeof obsSafeCallHostModule.buildObsSafeCallHost === "function"
      ? obsSafeCallHostModule.buildObsSafeCallHost
      : (bindings) => bindings;
  return buildHost(collectObsSafeCallBindingsHost());
}

function initObsSafeCallRuntime() {
  if (obsSafeCallRuntimeApi) return obsSafeCallRuntimeApi;
  if (typeof obsSafeCallModule.createObsSafeCall !== "function") {
    obsSafeCallRuntimeApi = {
      safeObsCall: async () => ({ ok: false, reason: "obs_safe_call_missing" })
    };
    return obsSafeCallRuntimeApi;
  }

  const buildCtx =
    typeof obsSafeCallCtxModule.buildObsSafeCallCtx === "function"
      ? obsSafeCallCtxModule.buildObsSafeCallCtx
      : (host) => host;

  obsSafeCallRuntimeApi = obsSafeCallModule.createObsSafeCall(
    buildCtx(collectObsSafeCallHost())
  );
  return obsSafeCallRuntimeApi;
}

function obsSafeCallRuntime() {
  return initObsSafeCallRuntime();
}

async function safeObsCall(requestType, requestData = {}) {
  return obsSafeCallRuntime().safeObsCall(requestType, requestData);
}

let videoEngine = null;

function collectVideoEngineBindingsHost() {
  return {
    runtimeConfig,
    writeLog,
    outputState,
    safeObsCall,
    isVoicePlaybackActive,
    pickNextMediaForTier: (tier, rotationIndex) => {
      if (typeof mediaCatalogModule.pickNextMediaForTier !== "function") {
        return null;
      }
      const catalog =
        typeof mediaCatalogModule.loadCatalog === "function"
          ? mediaCatalogModule.loadCatalog()
          : null;
      if (!catalog) {
        return null;
      }
      return mediaCatalogModule.pickNextMediaForTier(catalog, tier, rotationIndex);
    }
  };
}

function collectVideoEngineHost() {
  const buildHost =
    typeof videoEngineHostModule.buildVideoEngineHost === "function"
      ? videoEngineHostModule.buildVideoEngineHost
      : (bindings) => bindings;
  return buildHost(collectVideoEngineBindingsHost());
}

function initVideoEngineRuntime() {
  if (videoEngine) return videoEngine;
  if (typeof videoEngineModule.createVideoEngine !== "function") {
    videoEngine = {
      async enqueueGiftPlayback() {
        return { ok: true, skipped: true, reason: "video_engine_missing" };
      },
      handleMediaPlaybackEnded() {},
      getSnapshot() {
        return {};
      }
    };
    return videoEngine;
  }

  const buildCtx =
    typeof videoEngineCtxModule.buildVideoEngineCtx === "function"
      ? videoEngineCtxModule.buildVideoEngineCtx
      : (host) => host;

  videoEngine = videoEngineModule.createVideoEngine(buildCtx(collectVideoEngineHost()));
  return videoEngine;
}

function videoEngineRuntime() {
  return initVideoEngineRuntime();
}

let miaEyes = null;

function collectMiaEyesBindingsHost() {
  return {
    runtimeConfig,
    writeLog,
    safeObsCall
  };
}

function collectMiaEyesHost() {
  const buildHost =
    typeof miaEyesHostModule.buildMiaEyesHost === "function"
      ? miaEyesHostModule.buildMiaEyesHost
      : (bindings) => bindings;
  return buildHost(collectMiaEyesBindingsHost());
}

function initMiaEyesRuntime() {
  if (miaEyes) return miaEyes;
  if (typeof miaEyesModule.createMiaEyes !== "function") {
    miaEyes = null;
    return miaEyes;
  }

  const buildCtx =
    typeof miaEyesCtxModule.buildMiaEyesCtx === "function"
      ? miaEyesCtxModule.buildMiaEyesCtx
      : (host) => host;

  miaEyes = miaEyesModule.createMiaEyes(buildCtx(collectMiaEyesHost()));
  return miaEyes;
}

function miaEyesRuntime() {
  return initMiaEyesRuntime();
}

let mattingIngestBridge = null;

function collectMattingIngestBridgeBindingsHost() {
  return {
    runtimeConfig,
    writeLog,
    safeObsCall,
    streamerMattingModule,
    getImmersiveSceneSnapshot: () =>
      typeof overlayStateModule.getImmersiveSceneSnapshot === "function"
        ? overlayStateModule.getImmersiveSceneSnapshot(overlayState)
        : null
  };
}

function collectMattingIngestBridgeHost() {
  const buildHost =
    typeof mattingIngestBridgeHostModule.buildMattingIngestBridgeHost === "function"
      ? mattingIngestBridgeHostModule.buildMattingIngestBridgeHost
      : (bindings) => bindings;
  return buildHost(collectMattingIngestBridgeBindingsHost());
}

function initMattingIngestBridgeRuntime() {
  if (mattingIngestBridge) return mattingIngestBridge;
  if (typeof mattingIngestBridgeModule.createMattingIngestBridge !== "function") {
    mattingIngestBridge = null;
    return mattingIngestBridge;
  }

  const buildCtx =
    typeof mattingIngestBridgeCtxModule.buildMattingIngestBridgeCtx === "function"
      ? mattingIngestBridgeCtxModule.buildMattingIngestBridgeCtx
      : (host) => host;

  mattingIngestBridge = mattingIngestBridgeModule.createMattingIngestBridge(
    buildCtx(collectMattingIngestBridgeHost())
  );
  return mattingIngestBridge;
}

function mattingIngestBridgeRuntime() {
  return initMattingIngestBridgeRuntime();
}

let visionContextRuntimeApi = null;

function collectVisionContextBindingsHost() {
  return {
    overlayStateModule,
    kojnozoutDuelModule,
    kickBridgeModule,
    runtimeConfig,
    getOverlayState: () => overlayState,
    getDuelState: () => kojnozoutDuelState,
    getMiaEyes: miaEyesRuntime,
    isStartupSlideActive: () => Date.now() < startupSlideActiveUntil
  };
}

function collectVisionContextHost() {
  const buildHost =
    typeof visionContextHostModule.buildVisionContextHost === "function"
      ? visionContextHostModule.buildVisionContextHost
      : (bindings) => bindings;
  return buildHost(collectVisionContextBindingsHost());
}

function initVisionContextRuntime() {
  if (visionContextRuntimeApi) return visionContextRuntimeApi;
  if (typeof visionContextRuntimeModule.createVisionContextRuntime !== "function") {
    visionContextRuntimeApi = { buildVisionContext: () => ({}) };
    return visionContextRuntimeApi;
  }

  const buildCtx =
    typeof visionContextCtxModule.buildVisionContextCtx === "function"
      ? visionContextCtxModule.buildVisionContextCtx
      : (host) => host;

  visionContextRuntimeApi = visionContextRuntimeModule.createVisionContextRuntime(
    buildCtx(collectVisionContextHost())
  );
  return visionContextRuntimeApi;
}

function visionContextRuntime() {
  return initVisionContextRuntime();
}

function buildVisionContext() {
  return visionContextRuntime().buildVisionContext();
}

let obsVision = null;

function collectObsVisionBindingsHost() {
  return {
    runtimeConfig,
    writeLog,
    safeObsCall,
    getMiaEyes: miaEyesRuntime,
    buildVisionContext
  };
}

function collectObsVisionHost() {
  const buildHost =
    typeof obsVisionHostModule.buildObsVisionHost === "function"
      ? obsVisionHostModule.buildObsVisionHost
      : (bindings) => bindings;
  return buildHost(collectObsVisionBindingsHost());
}

function initObsVisionRuntime() {
  if (obsVision) return obsVision;
  if (typeof obsVisionModule.createObsVision !== "function") {
    obsVision = null;
    return obsVision;
  }

  const buildCtx =
    typeof obsVisionCtxModule.buildObsVisionCtx === "function"
      ? obsVisionCtxModule.buildObsVisionCtx
      : (host) => host;

  obsVision = obsVisionModule.createObsVision(buildCtx(collectObsVisionHost()));
  return obsVision;
}

function obsVisionRuntime() {
  return initObsVisionRuntime();
}

let obsOverlayRenderer = null;

function collectObsOverlayRendererBindingsHost() {
  return {
    runtimeConfig,
    getObs: () => obs,
    isObsConnected: () => obsConnected,
    safeObsCall
  };
}

function collectObsOverlayRendererHost() {
  const buildHost =
    typeof obsOverlayRendererHostModule.buildObsOverlayRendererHost === "function"
      ? obsOverlayRendererHostModule.buildObsOverlayRendererHost
      : (bindings) => bindings;
  return buildHost(collectObsOverlayRendererBindingsHost());
}

function initObsOverlayRendererRuntime() {
  if (obsOverlayRenderer) return obsOverlayRenderer;
  if (typeof obsRendererModule.createObsOverlayRenderer !== "function") {
    obsOverlayRenderer = {
      async render() {
        return { ok: true, emitted: false, reason: "renderer_missing" };
      }
    };
    return obsOverlayRenderer;
  }

  const buildCtx =
    typeof obsOverlayRendererCtxModule.buildObsOverlayRendererCtx === "function"
      ? obsOverlayRendererCtxModule.buildObsOverlayRendererCtx
      : (host) => host;

  obsOverlayRenderer = obsRendererModule.createObsOverlayRenderer(
    buildCtx(collectObsOverlayRendererHost())
  );
  return obsOverlayRenderer;
}

function obsOverlayRendererRuntime() {
  return initObsOverlayRendererRuntime();
}

let voiceLayer = null;

function collectVoiceLayerBindingsHost() {
  return {
    writeLog
  };
}

function collectVoiceLayerHost() {
  const buildHost =
    typeof voiceLayerHostModule.buildVoiceLayerHost === "function"
      ? voiceLayerHostModule.buildVoiceLayerHost
      : (bindings) => bindings;
  return buildHost(collectVoiceLayerBindingsHost());
}

function initVoiceLayerRuntime() {
  if (voiceLayer) return voiceLayer;
  if (typeof voiceLayerModule.createVoiceControlLayer !== "function") {
    voiceLayer = null;
    return voiceLayer;
  }

  const buildCtx =
    typeof voiceControlLayerCtxModule.buildVoiceControlLayerCtx === "function"
      ? voiceControlLayerCtxModule.buildVoiceControlLayerCtx
      : (host) => host;

  voiceLayer = voiceLayerModule.createVoiceControlLayer(buildCtx(collectVoiceLayerHost()));
  return voiceLayer;
}

function voiceLayerRuntime() {
  return initVoiceLayerRuntime();
}

const overlayStaticDir = path.join(__dirname, "mia-output-overlay");
const audioCacheDir = path.join(overlayStaticDir, "audio-cache");
if (!fs.existsSync(audioCacheDir)) {
  fs.mkdirSync(audioCacheDir, { recursive: true });
}

let ttsEngine = null;

function collectTtsEngineBindingsHost() {
  return {
    writeLog,
    cacheDir: audioCacheDir
  };
}

function collectTtsEngineHost() {
  const buildHost =
    typeof ttsEngineHostModule.buildTtsEngineHost === "function"
      ? ttsEngineHostModule.buildTtsEngineHost
      : (bindings) => bindings;
  return buildHost(collectTtsEngineBindingsHost());
}

function initTtsEngineRuntime() {
  if (ttsEngine) return ttsEngine;
  if (typeof ttsEngineModule.createTtsEngine !== "function") {
    ttsEngine = null;
    return ttsEngine;
  }

  const buildCtx =
    typeof ttsEngineCtxModule.buildTtsEngineCtx === "function"
      ? ttsEngineCtxModule.buildTtsEngineCtx
      : (host) => host;

  ttsEngine = ttsEngineModule.createTtsEngine(buildCtx(collectTtsEngineHost()));
  return ttsEngine;
}

function ttsEngineRuntime() {
  return initTtsEngineRuntime();
}

let interpreterRuntimeApi = null;

function collectInterpreterBindingsHost() {
  return {};
}

function collectInterpreterHost() {
  const buildHost =
    typeof interpreterHostModule.buildInterpreterHost === "function"
      ? interpreterHostModule.buildInterpreterHost
      : (bindings) => bindings;
  return buildHost(collectInterpreterBindingsHost());
}

function initInterpreterRuntime() {
  if (interpreterRuntimeApi) return interpreterRuntimeApi;
  if (typeof translateModule.createTranslationRuntime !== "function") {
    interpreterRuntimeApi = {
      noteForeignLanguage: () => "en",
      getReplyLanguage: (explicit) => explicit || "en",
      getState: () => ({}),
      setLastChatTranslation: () => {},
      setLastMicTranslation: () => {}
    };
    return interpreterRuntimeApi;
  }

  const buildCtx =
    typeof interpreterCtxModule.buildInterpreterCtx === "function"
      ? interpreterCtxModule.buildInterpreterCtx
      : (host) => host;

  interpreterRuntimeApi = translateModule.createTranslationRuntime(
    buildCtx(collectInterpreterHost())
  );
  return interpreterRuntimeApi;
}

function interpreterRuntime() {
  return initInterpreterRuntime();
}

let overlayStateCache = null;

function collectOverlayStateCacheBindingsHost() {
  return {
    ttlMs: Number(process.env.MIA_OVERLAY_STATE_CACHE_MS || 450)
  };
}

function collectOverlayStateCacheHost() {
  const buildHost =
    typeof overlayStateCacheHostModule.buildOverlayStateCacheHost === "function"
      ? overlayStateCacheHostModule.buildOverlayStateCacheHost
      : (bindings) => bindings;
  return buildHost(collectOverlayStateCacheBindingsHost());
}

function initOverlayStateCacheRuntime() {
  if (overlayStateCache) return overlayStateCache;
  if (typeof runtimePerfModule.createOverlayStateCache !== "function") {
    overlayStateCache = null;
    return overlayStateCache;
  }

  const buildCtx =
    typeof overlayStateCacheCtxModule.buildOverlayStateCacheCtx === "function"
      ? overlayStateCacheCtxModule.buildOverlayStateCacheCtx
      : (host) => host;

  overlayStateCache = runtimePerfModule.createOverlayStateCache(
    buildCtx(collectOverlayStateCacheHost())
  );
  return overlayStateCache;
}

function overlayStateCacheRuntime() {
  return initOverlayStateCacheRuntime();
}

let deliveryRuntimeApi = null;

let bossMissionRuntimeApi = null;

function collectBossMissionBindingsHost() {
  return {
    runtimeConfig,
    safeString,
    getUserLabel,
    writeLog,
    bossMissionModule,
    getOverlayState: () => overlayState,
    getVideoEngine: videoEngineRuntime
  };
}

function collectBossMissionHost() {
  const buildHost =
    typeof bossMissionHostModule.buildBossMissionHost === "function"
      ? bossMissionHostModule.buildBossMissionHost
      : (bindings) => bindings;
  return buildHost(collectBossMissionBindingsHost());
}

function initBossMissionRuntime() {
  if (bossMissionRuntimeApi) return bossMissionRuntimeApi;
  if (typeof bossMissionRuntimeModule.createBossMissionRuntime !== "function") {
    bossMissionRuntimeApi = {
      tryAutoBossMissionFromGift: async () => null
    };
    return bossMissionRuntimeApi;
  }

  const buildCtx =
    typeof bossMissionCtxModule.buildBossMissionCtx === "function"
      ? bossMissionCtxModule.buildBossMissionCtx
      : (host) => host;

  bossMissionRuntimeApi = bossMissionRuntimeModule.createBossMissionRuntime(
    buildCtx(collectBossMissionHost())
  );
  return bossMissionRuntimeApi;
}

function bossMissionRuntime() {
  return initBossMissionRuntime();
}

async function tryAutoBossMissionFromGift(normalized = {}) {
  return bossMissionRuntime().tryAutoBossMissionFromGift(normalized);
}

function collectDeliveryBindingsHost() {
  return {
    runtimeConfig,
    writeLog,
    safeString,
    cloneJson,
    voiceHoldUntilTs,
    setOverlay,
    getOverlayState: () => overlayState,
    overlayStateModule,
    getOverlayStateCache: overlayStateCacheRuntime,
    invalidateOverlayStateCache,
    getOverlayTiming: overlayTimingRuntime,
    getOverlayQueue: overlayQueueRuntime,
    getVoicePriorityLayer: voicePriorityLayerRuntime,
    getObsOverlayRenderer: obsOverlayRendererRuntime,
    overlayEmitResultModule,
    obsBrowserRefreshOnOverlayEnabled,
    scheduleObsBrowserRefresh,
    getVideoEngine: videoEngineRuntime,
    videoEngineModule,
    bowlFullVideoModule,
    getOutputState: () => outputState,
    getKojnozoutState: () => kojnozoutState,
    getObsConnected: () => obsConnected,
    forceReconnectObs,
    ensureObsConnectedWithRetry,
    getUserLabel,
    tryAutoBossMissionFromGift,
    speakerRoutingModule,
    getTtsEngine: ttsEngineRuntime,
    languageModule,
    sessionMemoryModule
  };
}

function collectDeliveryHost() {
  const buildHost =
    typeof deliveryHostModule.buildDeliveryHost === "function"
      ? deliveryHostModule.buildDeliveryHost
      : (bindings) => bindings;
  return buildHost(collectDeliveryBindingsHost());
}

function initDeliveryRuntime() {
  if (deliveryRuntimeApi) return deliveryRuntimeApi;
  if (typeof deliveryRuntimeModule.createDeliveryRuntime !== "function") {
    deliveryRuntimeApi = {
      executeOverlay: async () => ({ ok: false, reason: "delivery_missing" }),
      deliverActionVoice: async (r) => r,
      getVoicePlaybackSnapshot: () => null,
      isVoicePlaybackActive: () => false,
      bumpVoicePlaybackSeq: () => 0,
      setVoicePlaybackState: () => {},
      mirrorSpeechOverlayFromVoice: () => null
    };
    return deliveryRuntimeApi;
  }

  const buildCtx =
    typeof deliveryCtxModule.buildDeliveryCtx === "function"
      ? deliveryCtxModule.buildDeliveryCtx
      : (host) => host;

  deliveryRuntimeApi = deliveryRuntimeModule.createDeliveryRuntime(
    buildCtx(collectDeliveryHost())
  );
  return deliveryRuntimeApi;
}

function deliveryRuntime() {
  return initDeliveryRuntime();
}

function isVoicePlaybackActive(now = Date.now()) {
  return deliveryRuntime().isVoicePlaybackActive(now);
}

function mirrorSpeechOverlayFromVoice(opts = {}) {
  return deliveryRuntime().mirrorSpeechOverlayFromVoice(opts);
}

async function executeOverlay(payload, context = {}) {
  return deliveryRuntime().executeOverlay(payload, context);
}

async function executeGiftPresentationOverlays(normalized = {}, plan = null) {
  return deliveryRuntime().executeGiftPresentationOverlays(normalized, plan);
}

function activateComboMoment(momentPayload = null) {
  return deliveryRuntime().activateComboMoment(momentPayload);
}

function activateBossCinematic(cinematicPayload = null) {
  return deliveryRuntime().activateBossCinematic(cinematicPayload);
}

function activateT0Flyby(flybyPayload = null) {
  return deliveryRuntime().activateT0Flyby(flybyPayload);
}

async function attachGiftVideoPlan(actionResult = {}) {
  return deliveryRuntime().attachGiftVideoPlan(actionResult);
}

async function executeVideo(actionResult, normalizedEvent, eventId, options = {}) {
  return deliveryRuntime().executeVideo(actionResult, normalizedEvent, eventId, options);
}

async function deliverActionVoice(actionResult = {}) {
  return deliveryRuntime().deliverActionVoice(actionResult);
}

async function maybeDeliverMiaVoice(actionResult = {}, voicePlanOverride = null) {
  return deliveryRuntime().maybeDeliverMiaVoice(actionResult, voicePlanOverride);
}

function scheduleDeferredMiaVoice(actionResult = {}, delayMs = 0) {
  return deliveryRuntime().scheduleDeferredMiaVoice(actionResult, delayMs);
}

function getVoicePlaybackSnapshot() {
  return deliveryRuntime().getVoicePlaybackSnapshot();
}

let overlayStateRuntimeApi = null;

function collectOverlayStateBindingsHost() {
  return {
    safeString,
    overlayStateModule,
    outputStateModule,
    getOverlayState: () => overlayState,
    getOutputState: () => outputState,
    getOverlayStateCache: overlayStateCacheRuntime
  };
}

function collectOverlayStateHost() {
  const buildHost =
    typeof overlayStateHostModule.buildOverlayStateHost === "function"
      ? overlayStateHostModule.buildOverlayStateHost
      : (bindings) => bindings;
  return buildHost(collectOverlayStateBindingsHost());
}

function initOverlayStateRuntime() {
  if (overlayStateRuntimeApi) return overlayStateRuntimeApi;
  if (typeof overlayStateRuntimeModule.createOverlayStateRuntime !== "function") {
    overlayStateRuntimeApi = {
      setOverlay: () => null,
      invalidateOverlayStateCache: () => {}
    };
    return overlayStateRuntimeApi;
  }

  const buildCtx =
    typeof overlayStateCtxModule.buildOverlayStateCtx === "function"
      ? overlayStateCtxModule.buildOverlayStateCtx
      : (host) => host;

  overlayStateRuntimeApi = overlayStateRuntimeModule.createOverlayStateRuntime(
    buildCtx(collectOverlayStateHost())
  );
  return overlayStateRuntimeApi;
}

function overlayStateRuntime() {
  return initOverlayStateRuntime();
}

function invalidateOverlayStateCache() {
  return overlayStateRuntime().invalidateOverlayStateCache();
}

function setOverlay(payload, options = {}) {
  return overlayStateRuntime().setOverlay(payload, options);
}

let ingestDeduper = null;

function collectIngestDeduperBindingsHost() {
  return {
    windowMs: 4500,
    writeLog
  };
}

function collectIngestDeduperHost() {
  const buildHost =
    typeof ingestDeduperHostModule.buildIngestDeduperHost === "function"
      ? ingestDeduperHostModule.buildIngestDeduperHost
      : (bindings) => bindings;
  return buildHost(collectIngestDeduperBindingsHost());
}

function initIngestDeduperRuntime() {
  if (ingestDeduper) return ingestDeduper;
  if (typeof ingestGuardModule.createIngestDeduper !== "function") {
    ingestDeduper = null;
    return ingestDeduper;
  }

  const buildCtx =
    typeof ingestDeduperCtxModule.buildIngestDeduperCtx === "function"
      ? ingestDeduperCtxModule.buildIngestDeduperCtx
      : (host) => host;

  ingestDeduper = ingestGuardModule.createIngestDeduper(buildCtx(collectIngestDeduperHost()));
  return ingestDeduper;
}

function ingestDeduperRuntime() {
  return initIngestDeduperRuntime();
}

let mediaSingletonsRuntimeApi = null;

function initMediaSingletonsRuntime() {
  if (mediaSingletonsRuntimeApi) return mediaSingletonsRuntimeApi;
  initStreamStateRuntime();
  initSpamSessionRuntime();
  initOutputPolicyRuntime();
  initArenaBattleDemoRuntime();
  initOverlayTimingRuntime();
  initVoicePriorityLayerRuntime();
  initOverlayQueueRuntime();
  initVoiceLayerRuntime();
  initTtsEngineRuntime();
  initInterpreterRuntime();
  initVideoEngineRuntime();
  initMiaEyesRuntime();
  initOverlayStateCacheRuntime();
  initOverlayStateRuntime();
  initIngestDeduperRuntime();
  initMattingIngestBridgeRuntime();
  initObsVisionRuntime();
  initObsOverlayRendererRuntime();
  mediaSingletonsRuntimeApi = { ready: true };
  return mediaSingletonsRuntimeApi;
}

function mediaSingletonsRuntime() {
  return initMediaSingletonsRuntime();
}

initMediaSingletonsRuntime();
initDeliveryRuntime();

app.use(express.static(overlayStaticDir));
app.use("/audio-cache", express.static(audioCacheDir));

[
  "mia-overlay.html",
  "mia-voice-overlay.html",
  "kojnozrout-overlay.html",
  "entity-overlay.html",
  "speech-overlay.html",
  "mia-live-hub.html",
  "chat-overlay.html",
  "kojnozrout-bowl-overlay.html",
  "kojnozrout-runtime.html",
  "evolution-toast-overlay.html",
  "kojnozrout-backpack-overlay.html",
  "combo-overlay.html",
  "viewer-strip-overlay.html",
  "gift-moment-overlay.html",
  "story-moment-overlay.html"
].forEach((file) => {
  app.get(`/${file}`, (_req, res) => {
    res.sendFile(path.join(overlayStaticDir, file));
  });
});

function normalizeIncomingEvent(rawEvent = {}) {
  if (typeof ingestHttpModule.normalizeIncomingEvent === "function") {
    return ingestHttpModule.normalizeIncomingEvent(
      { normalizer, runtimeConfig, languageModule, safeString, upper },
      rawEvent
    );
  }
  return rawEvent;
}

function getUserLabel(event = {}) {
  return safeString(
    event?.user?.nickname ||
    event?.user?.displayName ||
    event?.nickname ||
    event?.displayName ||
    event?.username ||
    event?.user?.username,
    "divák"
  );
}

function getAvatarUrl(event = {}) {
  return safeString(
    event?.user?.avatarUrl ||
    event?.user?.avatar ||
    event?.user?.profilePictureUrl ||
    event?.avatarUrl ||
    event?.avatar ||
    event?.profilePictureUrl
  );
}

function getKojnozoutStateForSnapshot() {
  if (typeof kojWalkModule.tickWalkState === "function") {
    kojnozoutState = kojWalkModule.tickWalkState(kojnozoutState, process.env);
  }
  return kojnozoutState;
}

let ingestUtilsRuntimeApi = null;

function collectIngestUtilsBindingsHost() {
  return {
    safeString,
    runtimeConfig,
    overlayStateModule,
    getOverlayState: () => overlayState,
    getUserLabel,
    getAvatarUrl
  };
}

function collectIngestUtilsHost() {
  const buildHost =
    typeof ingestUtilsHostModule.buildIngestUtilsHost === "function"
      ? ingestUtilsHostModule.buildIngestUtilsHost
      : (bindings) => bindings;
  return buildHost(collectIngestUtilsBindingsHost());
}

function initIngestUtilsRuntime() {
  if (ingestUtilsRuntimeApi) return ingestUtilsRuntimeApi;
  if (typeof ingestUtilsRuntimeModule.createIngestUtilsRuntime !== "function") {
    ingestUtilsRuntimeApi = {
      pushChatFeed: () => {},
      extractSupportPayload: (n) => n,
      extractCommunityImpact: () => ({})
    };
    return ingestUtilsRuntimeApi;
  }

  const buildCtx =
    typeof ingestUtilsCtxModule.buildIngestUtilsCtx === "function"
      ? ingestUtilsCtxModule.buildIngestUtilsCtx
      : (host) => host;

  ingestUtilsRuntimeApi = ingestUtilsRuntimeModule.createIngestUtilsRuntime(
    buildCtx(collectIngestUtilsHost())
  );
  return ingestUtilsRuntimeApi;
}

function ingestUtilsRuntime() {
  return initIngestUtilsRuntime();
}

function pushChatFeed(normalized = {}) {
  return ingestUtilsRuntime().pushChatFeed(normalized);
}

function extractSupportPayload(normalized = {}) {
  return ingestUtilsRuntime().extractSupportPayload(normalized);
}

function extractCommunityImpact(normalized = {}) {
  return ingestUtilsRuntime().extractCommunityImpact(normalized);
}

let storyFeedRuntimeApi = null;

function collectStoryFeedBindingsHost() {
  return {
    writeLog,
    safeString,
    runtimeConfig,
    storyAnimationEngineModule,
    storyVideoEngineModule,
    overlayStateModule,
    getOverlayState: () => overlayState,
    getUserLabel,
    getAvatarUrl,
    executeOverlay,
    getVideoEngine: videoEngineRuntime,
    getMiaEyes: miaEyesRuntime
  };
}

function collectStoryFeedHost() {
  const buildHost =
    typeof storyFeedHostModule.buildStoryFeedHost === "function"
      ? storyFeedHostModule.buildStoryFeedHost
      : (bindings) => bindings;
  return buildHost(collectStoryFeedBindingsHost());
}

function initStoryFeedRuntime() {
  if (storyFeedRuntimeApi) return storyFeedRuntimeApi;
  if (typeof storyFeedRuntimeModule.createStoryFeedRuntime !== "function") {
    storyFeedRuntimeApi = {
      scheduleStoryAnimationAfterFeed: async () => {}
    };
    return storyFeedRuntimeApi;
  }

  const buildCtx =
    typeof storyFeedCtxModule.buildStoryFeedCtx === "function"
      ? storyFeedCtxModule.buildStoryFeedCtx
      : (host) => host;

  storyFeedRuntimeApi = storyFeedRuntimeModule.createStoryFeedRuntime(
    buildCtx(collectStoryFeedHost())
  );
  return storyFeedRuntimeApi;
}

function storyFeedRuntime() {
  return initStoryFeedRuntime();
}

async function scheduleStoryAnimationAfterFeed(normalized = {}, options = {}) {
  return storyFeedRuntime().scheduleStoryAnimationAfterFeed(normalized, options);
}

let giftMediaRuntimeApi = null;

function collectGiftMediaBindingsHost() {
  return {
    writeLog,
    safeString,
    giftPresentationModule,
    animationReactionModule,
    overlayStateModule,
    giftAnimationContextModule,
    mediaOrchestratorModule,
    giftMapModule,
    giftVisualComposerModule,
    mediaCatalogModule,
    viewerStoryModule,
    storyAnimationEngineModule,
    getOverlayState: () => overlayState,
    getKojnozoutState: () => kojnozoutState,
    getStreamState,
    getUserLabel,
    getAvatarUrl,
    getScheduleStoryAnimationAfterFeed: () => scheduleStoryAnimationAfterFeed,
    invalidateOverlayStateCache,
    getOverlayStateCache: overlayStateCacheRuntime
  };
}

function collectGiftMediaHost() {
  const buildHost =
    typeof giftMediaHostModule.buildGiftMediaHost === "function"
      ? giftMediaHostModule.buildGiftMediaHost
      : (bindings) => bindings;
  return buildHost(collectGiftMediaBindingsHost());
}

function initGiftMediaRuntime() {
  if (giftMediaRuntimeApi) return giftMediaRuntimeApi;
  if (typeof giftMediaRuntimeModule.createGiftMediaRuntime !== "function") {
    giftMediaRuntimeApi = {
      applyGiftAnimationReaction: () => null,
      scheduleGiftVisualCompose: async () => null,
      schedulePostGiftMediaExperiences: async () => {}
    };
    return giftMediaRuntimeApi;
  }

  const buildCtx =
    typeof giftMediaCtxModule.buildGiftMediaCtx === "function"
      ? giftMediaCtxModule.buildGiftMediaCtx
      : (host) => host;

  giftMediaRuntimeApi = giftMediaRuntimeModule.createGiftMediaRuntime(
    buildCtx(collectGiftMediaHost())
  );
  return giftMediaRuntimeApi;
}

function giftMediaRuntime() {
  return initGiftMediaRuntime();
}

function applyGiftAnimationReaction(
  normalized = {},
  actionResult = {},
  giftProfile = {},
  giftAnimation = {},
  kojMood = ""
) {
  return giftMediaRuntime().applyGiftAnimationReaction(
    normalized,
    actionResult,
    giftProfile,
    giftAnimation,
    kojMood
  );
}

async function scheduleGiftVisualCompose(normalized = {}, actionResult = {}) {
  return giftMediaRuntime().scheduleGiftVisualCompose(normalized, actionResult);
}

async function schedulePostGiftMediaExperiences(normalized = {}, actionResult = {}) {
  return giftMediaRuntime().schedulePostGiftMediaExperiences(normalized, actionResult);
}

let participantRuntimeApi = null;

function collectParticipantBindingsHost() {
  return {
    safeString,
    runtimeConfig,
    overlayStateModule,
    getOverlayState: () => overlayState,
    getUserLabel,
    getAvatarUrl
  };
}

function collectParticipantHost() {
  const buildHost =
    typeof participantHostModule.buildParticipantHost === "function"
      ? participantHostModule.buildParticipantHost
      : (bindings) => bindings;
  return buildHost(collectParticipantBindingsHost());
}

function initParticipantRuntime() {
  if (participantRuntimeApi) return participantRuntimeApi;
  if (typeof participantRuntimeModule.createParticipantRuntime !== "function") {
    participantRuntimeApi = { pushRecentParticipant: () => {} };
    return participantRuntimeApi;
  }

  const buildCtx =
    typeof participantCtxModule.buildParticipantCtx === "function"
      ? participantCtxModule.buildParticipantCtx
      : (host) => host;

  participantRuntimeApi = participantRuntimeModule.createParticipantRuntime(
    buildCtx(collectParticipantHost())
  );
  return participantRuntimeApi;
}

function participantRuntime() {
  return initParticipantRuntime();
}

function pushRecentParticipant(normalized = {}, type = "chat") {
  return participantRuntime().pushRecentParticipant(normalized, type);
}

let giftRuntimeApi = null;

function collectGiftRuntimeBindingsHost() {
  return {
    runtimeConfig,
    writeLog,
    giftSupporterProfileModule,
    giftEconomyModule,
    awayModeModule,
    hostTeamPointsModule,
    giftMapEnterprise,
    giftPresentationModule,
    getGiftSupporterProfile,
    setGiftSupporterProfile,
    getLastGiftMapping,
    setLastGiftMapping,
    getHostTeamScoreState: () => hostTeamScoreState,
    setHostTeamScoreState: (next) => {
      if (next) hostTeamScoreState = next;
    },
    getOutputState: () => outputState,
    getEcosystemState: () => ecosystemState
  };
}

function collectGiftRuntimeHost() {
  const buildHost =
    typeof giftRuntimeHostModule.buildGiftRuntimeHost === "function"
      ? giftRuntimeHostModule.buildGiftRuntimeHost
      : (bindings) => bindings;
  return buildHost(collectGiftRuntimeBindingsHost());
}

function initGiftRuntime() {
  if (giftRuntimeApi) return giftRuntimeApi;
  if (typeof giftRuntimeModule.createGiftRuntime !== "function") {
    giftRuntimeApi = {
      enrichGiftEconomyContext: () => {},
      recordGiftMapRuntime: () => null,
      prepareGiftEconomyPresentation: (_n, actionResult) => ({
        actionResult,
        plan: null
      }),
      applyGiftEconomyPresentationLegacy: (_n, actionResult) => actionResult
    };
    return giftRuntimeApi;
  }

  const buildCtx =
    typeof giftRuntimeCtxModule.buildGiftRuntimeCtx === "function"
      ? giftRuntimeCtxModule.buildGiftRuntimeCtx
      : (host) => host;

  giftRuntimeApi = giftRuntimeModule.createGiftRuntime(buildCtx(collectGiftRuntimeHost()));
  return giftRuntimeApi;
}

function giftRuntime() {
  return initGiftRuntime();
}

function enrichGiftEconomyContext(normalized = {}) {
  return giftRuntime().enrichGiftEconomyContext(normalized);
}

function recordGiftMapRuntime(normalized = {}) {
  return giftRuntime().recordGiftMapRuntime(normalized);
}

function prepareGiftEconomyPresentation(normalized = {}, actionResult = {}, shadowResult = null) {
  return giftRuntime().prepareGiftEconomyPresentation(normalized, actionResult, shadowResult);
}

function applyGiftEconomyPresentationLegacy(normalized = {}, actionResult = {}) {
  return giftRuntime().applyGiftEconomyPresentationLegacy(normalized, actionResult);
}

let worldModeRuntimeApi = null;

function collectWorldModeBindingsHost() {
  return {
    safeString,
    writeLog,
    runtimeConfig,
    awayModeModule,
    getOutputState: () => outputState,
    getEcosystemState: () => ecosystemState,
    safeObsCall,
    getOverlayStateCache: overlayStateCacheRuntime
  };
}

function collectWorldModeHost() {
  const buildHost =
    typeof worldModeHostModule.buildWorldModeHost === "function"
      ? worldModeHostModule.buildWorldModeHost
      : (bindings) => bindings;
  return buildHost(collectWorldModeBindingsHost());
}

function initWorldModeRuntime() {
  if (worldModeRuntimeApi) return worldModeRuntimeApi;
  if (typeof worldModeRuntimeModule.createWorldModeRuntime !== "function") {
    worldModeRuntimeApi = {
      applyWorldModeChange: async (worldMode) => ({ ok: true, worldMode })
    };
    return worldModeRuntimeApi;
  }

  const buildCtx =
    typeof worldModeCtxModule.buildWorldModeCtx === "function"
      ? worldModeCtxModule.buildWorldModeCtx
      : (host) => host;

  worldModeRuntimeApi = worldModeRuntimeModule.createWorldModeRuntime(
    buildCtx(collectWorldModeHost())
  );
  return worldModeRuntimeApi;
}

function worldModeRuntime() {
  return initWorldModeRuntime();
}

async function applyWorldModeChange(worldMode, source = "runtime") {
  return worldModeRuntime().applyWorldModeChange(worldMode, source);
}

let capybaraFlowRuntimeApi = null;

function collectCapybaraFlowBindingsHost() {
  return {
    capybaraFlowModule,
    responseEngine,
    runtimeConfig,
    writeLog,
    safeString,
    getOutputState: () => outputState,
    getKojnozoutState: () => kojnozoutState,
    getEcosystemState: () => ecosystemState,
    deliverActionVoice,
    executeOverlay,
    getUserLabel,
    maybeDeliverMiaVoice
  };
}

function collectCapybaraFlowHost() {
  const buildHost =
    typeof capybaraFlowHostModule.buildCapybaraFlowHost === "function"
      ? capybaraFlowHostModule.buildCapybaraFlowHost
      : (bindings) => bindings;
  return buildHost(collectCapybaraFlowBindingsHost());
}

function initCapybaraFlowRuntime() {
  if (capybaraFlowRuntimeApi) return capybaraFlowRuntimeApi;
  if (typeof capybaraFlowRuntimeModule.createCapybaraFlowRuntime !== "function") {
    capybaraFlowRuntimeApi = {
      deliverCapybaraWaitPrompt: async () => {},
      tryHandleCapybaraWaitingComment: async () => ({ handled: false })
    };
    return capybaraFlowRuntimeApi;
  }

  const buildCtx =
    typeof capybaraFlowCtxModule.buildCapybaraFlowCtx === "function"
      ? capybaraFlowCtxModule.buildCapybaraFlowCtx
      : (host) => host;

  capybaraFlowRuntimeApi = capybaraFlowRuntimeModule.createCapybaraFlowRuntime(
    buildCtx(collectCapybaraFlowHost())
  );
  return capybaraFlowRuntimeApi;
}

function capybaraFlowRuntime() {
  return initCapybaraFlowRuntime();
}

async function deliverCapybaraWaitPrompt(payload = {}) {
  return capybaraFlowRuntime().deliverCapybaraWaitPrompt(payload);
}

let showcaseCommandRuntimeApi = null;

function collectShowcaseCommandBindingsHost() {
  return {
    streamerShowcaseModule,
    streamerIdentityModule,
    overlayStateModule,
    kojTestModeModule,
    kojnozoutVitalsModule,
    kojnozoutDuelModule,
    runtimeConfig,
    safeString,
    getUserLabel,
    writeLog,
    getEnv: () => process.env,
    getOverlayState: () => overlayState,
    getKojnozoutState: () => kojnozoutState,
    setKojnozoutState: (next) => {
      kojnozoutState = next;
    },
    getDuelState: () => kojnozoutDuelState,
    setDuelState: (next) => {
      kojnozoutDuelState = next;
    },
    executeOverlay,
    speakMiaShowcaseLine,
    getVideoEngine: videoEngineRuntime,
    scheduleWorldSave
  };
}

function collectShowcaseCommandHost() {
  const buildHost =
    typeof showcaseCommandHostModule.buildShowcaseCommandHost === "function"
      ? showcaseCommandHostModule.buildShowcaseCommandHost
      : (bindings) => bindings;
  return buildHost(collectShowcaseCommandBindingsHost());
}

function initShowcaseCommandRuntime() {
  if (showcaseCommandRuntimeApi) return showcaseCommandRuntimeApi;
  if (typeof showcaseCommandRuntimeModule.createShowcaseCommandRuntime !== "function") {
    showcaseCommandRuntimeApi = {
      tryHandleKojStateShowcaseCommand: async () => null,
      tryHandleStreamerShowcaseCommand: async () => null
    };
    return showcaseCommandRuntimeApi;
  }

  const buildCtx =
    typeof showcaseCommandCtxModule.buildShowcaseCommandCtx === "function"
      ? showcaseCommandCtxModule.buildShowcaseCommandCtx
      : (host) => host;

  showcaseCommandRuntimeApi = showcaseCommandRuntimeModule.createShowcaseCommandRuntime(
    buildCtx(collectShowcaseCommandHost())
  );
  return showcaseCommandRuntimeApi;
}

function showcaseCommandRuntime() {
  return initShowcaseCommandRuntime();
}

async function tryHandleKojStateShowcaseCommand(normalized = {}) {
  return showcaseCommandRuntime().tryHandleKojStateShowcaseCommand(normalized);
}

async function tryHandleStreamerShowcaseCommand(normalized = {}) {
  return showcaseCommandRuntime().tryHandleStreamerShowcaseCommand(normalized);
}

let streamerMediaRuntimeApi = null;

function collectStreamerMediaBindingsHost() {
  return {
    streamerMediaCommandModule,
    streamerAccessModule,
    mediaCatalogModule,
    soloStreamModule,
    safeString,
    getUserLabel,
    runtimeConfig,
    writeLog,
    getOutputState: () => outputState,
    getEcosystemState: () => ecosystemState,
    getStreamState,
    executeOverlay,
    maybeDeliverMiaVoice,
    getVideoEngine: videoEngineRuntime
  };
}

function collectStreamerMediaHost() {
  const buildHost =
    typeof streamerMediaHostModule.buildStreamerMediaHost === "function"
      ? streamerMediaHostModule.buildStreamerMediaHost
      : (bindings) => bindings;
  return buildHost(collectStreamerMediaBindingsHost());
}

function initStreamerMediaRuntime() {
  if (streamerMediaRuntimeApi) return streamerMediaRuntimeApi;
  if (typeof streamerMediaRuntimeModule.createStreamerMediaRuntime !== "function") {
    streamerMediaRuntimeApi = {
      tryHandleStreamerMediaCommand: async () => null
    };
    return streamerMediaRuntimeApi;
  }

  const buildCtx =
    typeof streamerMediaCtxModule.buildStreamerMediaCtx === "function"
      ? streamerMediaCtxModule.buildStreamerMediaCtx
      : (host) => host;

  streamerMediaRuntimeApi = streamerMediaRuntimeModule.createStreamerMediaRuntime(
    buildCtx(collectStreamerMediaHost())
  );
  return streamerMediaRuntimeApi;
}

function streamerMediaRuntime() {
  return initStreamerMediaRuntime();
}

async function tryHandleStreamerMediaCommand(normalized = {}) {
  return streamerMediaRuntime().tryHandleStreamerMediaCommand(normalized);
}

let soloStreamRuntimeApi = null;

function collectSoloStreamBindingsHost() {
  return {
    soloStreamModule,
    getVideoEngine: videoEngineRuntime,
    runtimeConfig,
    serverStartedAt,
    writeLog,
    safeString,
    getStreamState,
    getOutputState: () => outputState,
    getOverlayState: () => overlayState,
    getKojnozoutState: () => kojnozoutState,
    getObsConnected: () => obsConnected,
    isVoicePlaybackActive,
    executeOverlay,
    maybeDeliverMiaVoice,
    safeObsCall
  };
}

function collectSoloStreamHost() {
  const buildHost =
    typeof soloStreamHostModule.buildSoloStreamHost === "function"
      ? soloStreamHostModule.buildSoloStreamHost
      : (bindings) => bindings;
  return buildHost(collectSoloStreamBindingsHost());
}

function initSoloStreamRuntime() {
  if (soloStreamRuntimeApi) return soloStreamRuntimeApi;
  if (typeof soloStreamRuntimeModule.createSoloStreamRuntime !== "function") {
    soloStreamRuntimeApi = {
      buildSoloStreamSceneCtx: () => ({}),
      syncSoloStreamObsScene: async () => null,
      handleSoloStreamChatActivity: async () => {},
      deliverProactiveHostMoment: async () => {}
    };
    return soloStreamRuntimeApi;
  }

  const buildCtx =
    typeof soloStreamCtxModule.buildSoloStreamCtx === "function"
      ? soloStreamCtxModule.buildSoloStreamCtx
      : (host) => host;

  soloStreamRuntimeApi = soloStreamRuntimeModule.createSoloStreamRuntime(
    buildCtx(collectSoloStreamHost())
  );
  return soloStreamRuntimeApi;
}

function soloStreamRuntime() {
  return initSoloStreamRuntime();
}

function buildSoloStreamSceneCtx(tick = null) {
  return soloStreamRuntime().buildSoloStreamSceneCtx(tick);
}

async function syncSoloStreamObsScene(tick = null) {
  return soloStreamRuntime().syncSoloStreamObsScene(tick);
}

async function handleSoloStreamChatActivity() {
  return soloStreamRuntime().handleSoloStreamChatActivity();
}

async function deliverProactiveHostMoment(payload = {}) {
  return soloStreamRuntime().deliverProactiveHostMoment(payload);
}

async function tryHandleCapybaraWaitingComment(normalized = {}) {
  return capybaraFlowRuntime().tryHandleCapybaraWaitingComment(normalized);
}

let runtimeStateRuntimeApi = null;

function collectRuntimeStateBindingsHost() {
  return {
    upper,
    extractSupportPayload,
    extractCommunityImpact,
    runtimeConfig,
    gameConfig: GAME_CONFIG,
    writeLog,
    streamStateModule,
    kojnozoutModule,
    kojnozoutPersistenceModule,
    kojnozoutWorldPersistenceModule,
    getStreamState,
    setStreamState,
    getKojnozoutState: () => kojnozoutState,
    setKojnozoutState: (next) => {
      kojnozoutState = next;
    },
    getKojnozoutBackpackState: () => kojnozoutBackpackState,
    getDuelState: () => kojnozoutDuelState
  };
}

function collectRuntimeStateHost() {
  const buildHost =
    typeof runtimeStateHostModule.buildRuntimeStateHost === "function"
      ? runtimeStateHostModule.buildRuntimeStateHost
      : (bindings) => bindings;
  return buildHost(collectRuntimeStateBindingsHost());
}

function initRuntimeStateRuntime() {
  if (runtimeStateRuntimeApi) return runtimeStateRuntimeApi;
  if (typeof runtimeStateRuntimeModule.createRuntimeStateRuntime !== "function") {
    runtimeStateRuntimeApi = {
      applyRuntimeStateImpact: () => ({ evolutionLevelUp: null, eventType: "" }),
      scheduleWorldSave: () => {}
    };
    return runtimeStateRuntimeApi;
  }

  const buildCtx =
    typeof runtimeStateCtxModule.buildRuntimeStateCtx === "function"
      ? runtimeStateCtxModule.buildRuntimeStateCtx
      : (host) => host;

  runtimeStateRuntimeApi = runtimeStateRuntimeModule.createRuntimeStateRuntime(
    buildCtx(collectRuntimeStateHost())
  );
  return runtimeStateRuntimeApi;
}

function runtimeStateRuntime() {
  return initRuntimeStateRuntime();
}

function applyRuntimeStateImpact(normalized = {}) {
  return runtimeStateRuntime().applyRuntimeStateImpact(normalized);
}

function scheduleWorldSave() {
  return runtimeStateRuntime().scheduleWorldSave();
}

let worldLayerRuntimeApi = null;

function collectWorldLayerBindingsHost() {
  return {
    upper,
    safeString,
    writeLog,
    kojnozoutModule,
    kojnozoutBackpackModule,
    kojnozoutDuelModule,
    platformArenaModule,
    chatRewardModule,
    kojRosterModule,
    getKojnozoutBackpackState: () => kojnozoutBackpackState,
    setKojnozoutBackpackState: (next) => {
      kojnozoutBackpackState = next;
    },
    getDuelState: () => kojnozoutDuelState,
    setDuelState: (next) => {
      kojnozoutDuelState = next;
    },
    getArenaState: () => platformArenaState,
    setArenaState: (next) => {
      platformArenaState = next;
    },
    getUserLabel,
    extractSupportPayload,
    setOverlay,
    invalidateOverlayStateCache,
    scheduleWorldSave
  };
}

function collectWorldLayerHost() {
  const buildHost =
    typeof worldLayerHostModule.buildWorldLayerHost === "function"
      ? worldLayerHostModule.buildWorldLayerHost
      : (bindings) => bindings;
  return buildHost(collectWorldLayerBindingsHost());
}

function initWorldLayerRuntime() {
  if (worldLayerRuntimeApi) return worldLayerRuntimeApi;
  if (typeof worldLayerRuntimeModule.createWorldLayerRuntime !== "function") {
    worldLayerRuntimeApi = {
      applyWorldLayer: () => {}
    };
    return worldLayerRuntimeApi;
  }

  const buildCtx =
    typeof worldLayerCtxModule.buildWorldLayerCtx === "function"
      ? worldLayerCtxModule.buildWorldLayerCtx
      : (host) => host;

  worldLayerRuntimeApi = worldLayerRuntimeModule.createWorldLayerRuntime(
    buildCtx(collectWorldLayerHost())
  );
  return worldLayerRuntimeApi;
}

function worldLayerRuntime() {
  return initWorldLayerRuntime();
}

function applyWorldLayer(normalized = {}) {
  return worldLayerRuntime().applyWorldLayer(normalized);
}

let kojMomentsRuntimeApi = null;

function collectKojMomentsBindingsHost() {
  return {
    upper,
    safeString,
    runtimeConfig,
    writeLog,
    careQuestModule,
    careOpportunitiesModule,
    kojnozoutPersistenceModule,
    kojnozoutDuelBridgeModule,
    kojnozoutDuelModule,
    kojnozoutEvolutionModule,
    getKojnozoutState: () => kojnozoutState,
    setKojnozoutState: (next) => {
      kojnozoutState = next;
    },
    getDuelState: () => kojnozoutDuelState,
    setDuelState: (next) => {
      kojnozoutDuelState = next;
    },
    setLastDuelSyncSummary: (summary) => {
      lastDuelSyncSummary = summary;
    },
    getOutputState: () => outputState,
    getUserLabel,
    executeOverlay,
    scheduleWorldSave
  };
}

function collectKojMomentsHost() {
  const buildHost =
    typeof kojMomentsHostModule.buildKojMomentsHost === "function"
      ? kojMomentsHostModule.buildKojMomentsHost
      : (bindings) => bindings;
  return buildHost(collectKojMomentsBindingsHost());
}

function initKojMomentsRuntime() {
  if (kojMomentsRuntimeApi) return kojMomentsRuntimeApi;
  if (typeof kojMomentsRuntimeModule.createKojMomentsRuntime !== "function") {
    kojMomentsRuntimeApi = {
      applyCareQuestProgress: () => ({ questCompleted: false }),
      deliverQuestCompleteMoment: async () => {},
      runDuelPeerSync: async () => null,
      deliverEvolutionMoment: async () => null
    };
    return kojMomentsRuntimeApi;
  }

  const buildCtx =
    typeof kojMomentsCtxModule.buildKojMomentsCtx === "function"
      ? kojMomentsCtxModule.buildKojMomentsCtx
      : (host) => host;

  kojMomentsRuntimeApi = kojMomentsRuntimeModule.createKojMomentsRuntime(
    buildCtx(collectKojMomentsHost())
  );
  return kojMomentsRuntimeApi;
}

function kojMomentsRuntime() {
  return initKojMomentsRuntime();
}

function applyCareQuestProgress(normalized = {}) {
  return kojMomentsRuntime().applyCareQuestProgress(normalized);
}

async function deliverQuestCompleteMoment(questDef = {}) {
  return kojMomentsRuntime().deliverQuestCompleteMoment(questDef);
}

async function runDuelPeerSync() {
  return kojMomentsRuntime().runDuelPeerSync();
}

async function deliverEvolutionMoment(evolutionLevelUp, normalized = {}, eventType = "") {
  return kojMomentsRuntime().deliverEvolutionMoment(evolutionLevelUp, normalized, eventType);
}

function collectOverlayPublicBindingsHost() {
  return {
    cloneJson,
    runtimeConfig,
    obsConnected,
    overlayStateModule,
    kojnozoutModule,
    kojnozoutDuelModule,
    kojnozoutBackpackModule,
    kojnozoutItemCommandModule,
    getVideoEngine: videoEngineRuntime,
    getSpamSessionEngine: spamSessionRuntime,
    careOpportunitiesModule,
    kojnozoutBondModule,
    platformArenaModule,
    kojDisplayModule,
    giftUserLedgerModule,
    capybaraFlowModule,
    giftSupporterProfileModule,
    kojnozoutVitalsModule,
    ecosystemOrchestratorModule,
    getInterpreterRuntime: interpreterRuntime,
    getOverlayState: () => overlayState,
    getKojnozoutStateForSnapshot,
    getKojnozoutState: () => kojnozoutState,
    getStreamState,
    getDuelState: () => kojnozoutDuelState,
    getBackpackState: () => kojnozoutBackpackState,
    getItemDisplayState: () => itemDisplayState,
    setItemDisplayState: (next) => {
      itemDisplayState = next;
    },
    getArenaState: () => platformArenaState,
    getGiftUserLedger,
    getGiftSupporterProfile,
    getOutputState: () => outputState,
    getEcosystemState: () => ecosystemState,
    getOverlayLastAcceptedAt: () => overlayState.lastAcceptedAt || 0,
    getOutputLastStreamerMediaAt: () => outputState.lastStreamerMediaAt || 0,
    getVoicePlaybackSnapshot,
    getVoicePlaybackSeq: () => deliveryRuntime().getVoicePlaybackSeq(),
    getVoiceSpeakQueueLength: () => deliveryRuntime().getVoiceSpeakQueueLength()
  };
}

function collectOverlayPublicHost() {
  const buildHost =
    typeof overlayPublicHostModule.buildOverlayPublicHost === "function"
      ? overlayPublicHostModule.buildOverlayPublicHost
      : (bindings) => bindings;
  return buildHost(collectOverlayPublicBindingsHost());
}

let overlayPublicRuntimeApi = null;

function initOverlayPublicRuntime() {
  if (overlayPublicRuntimeApi) return overlayPublicRuntimeApi;
  const createApi =
    typeof overlayPublicWiringModule.createOverlayPublicApi === "function"
      ? overlayPublicWiringModule.createOverlayPublicApi
      : (_mod, _ctx) => ({
          buildOverlayStateCacheKey: () => "",
          buildPublicOverlayStateResponse: () => ({
            ok: false,
            error: "overlay_public_missing"
          })
        });

  const buildCtx =
    typeof overlayPublicCtxModule.buildOverlayPublicCtx === "function"
      ? overlayPublicCtxModule.buildOverlayPublicCtx
      : (host) => host;

  overlayPublicRuntimeApi = createApi(
    overlayPublicResponseModule,
    buildCtx(collectOverlayPublicHost())
  );
  return overlayPublicRuntimeApi;
}

function overlayPublicRuntime() {
  return initOverlayPublicRuntime();
}

function buildOverlayStateCacheKey(...args) {
  return overlayPublicRuntime().buildOverlayStateCacheKey(...args);
}

function buildPublicOverlayStateResponse(...args) {
  return overlayPublicRuntime().buildPublicOverlayStateResponse(...args);
}

function collectCareCommandsBindingsHost() {
  return {
    safeString,
    upper,
    writeLog,
    getRuntimeConfig: () => runtimeConfig,
    getStreamPlatformKey: () =>
      safeString(
        process.env.MIA_STREAM_PLATFORM || runtimeConfig?.stream?.platform || "tiktok",
        "tiktok"
      ).toLowerCase(),
    getStreamState,
    getOutputState: () => outputState,
    setOutputState: (next) => {
      outputState = next;
    },
    getKojnozoutState: () => kojnozoutState,
    setKojnozoutState: (next) => {
      kojnozoutState = next;
    },
    getKojnozoutBackpackState: () => kojnozoutBackpackState,
    setKojnozoutBackpackState: (next) => {
      kojnozoutBackpackState = next;
    },
    getItemDisplayState: () => itemDisplayState,
    setItemDisplayState: (next) => {
      itemDisplayState = next;
    },
    getKojnozoutDuelState: () => kojnozoutDuelState,
    setKojnozoutDuelState: (next) => {
      kojnozoutDuelState = next;
    },
    getPlatformArenaState: () => platformArenaState,
    setPlatformArenaState: (next) => {
      platformArenaState = next;
    },
    getUserLabel,
    executeOverlay,
    deliverQuestCompleteMoment,
    scheduleWorldSave,
    scheduleStoryAnimationAfterFeed,
    giftMapEnterprise,
    kojTestModeModule,
    kojnozoutVitalsModule,
    kojnozoutPersistenceModule,
    kojnozoutDuelModule,
    kojnozoutItemCommandModule,
    careOpportunitiesModule,
    careQuestModule,
    kojnozoutCareModule,
    kojnozoutCareValidationModule,
    careRewardModule,
    responseEngine,
    kojWalkModule,
    platformArenaModule
  };
}

function collectCareCommandsHost() {
  const buildHost =
    typeof careCommandsHostModule.buildCareCommandsHost === "function"
      ? careCommandsHostModule.buildCareCommandsHost
      : (bindings) => bindings;
  return buildHost(collectCareCommandsBindingsHost());
}

let careCommandsRuntimeApi = null;

function initCareCommandsRuntime() {
  if (careCommandsRuntimeApi) return careCommandsRuntimeApi;
  const createHandler =
    typeof careCommandsWiringModule.createCareCommandHandler === "function"
      ? careCommandsWiringModule.createCareCommandHandler
      : () => async () => null;

  const buildCtx =
    typeof careCommandsCtxModule.buildCareCommandsCtx === "function"
      ? careCommandsCtxModule.buildCareCommandsCtx
      : (host) => host;

  careCommandsRuntimeApi = createHandler(
    careCommandsRoutes,
    buildCtx(collectCareCommandsHost())
  );
  return careCommandsRuntimeApi;
}

function careCommandsRuntime() {
  return initCareCommandsRuntime();
}

const tryHandleKojnozoutCommands = (...args) => careCommandsRuntime()(...args);

let actionBuilderRuntimeApi = null;

function collectActionBuilderBindingsHost() {
  return {
    safeString,
    getUserLabel,
    runtimeConfig,
    chatBrain,
    responseEngine,
    getKojnozoutState: () => kojnozoutState,
    getOutputState: () => outputState
  };
}

function collectActionBuilderHost() {
  const buildHost =
    typeof actionBuilderHostModule.buildActionBuilderHost === "function"
      ? actionBuilderHostModule.buildActionBuilderHost
      : (bindings) => bindings;
  return buildHost(collectActionBuilderBindingsHost());
}

function initActionBuilderRuntime() {
  if (actionBuilderRuntimeApi) return actionBuilderRuntimeApi;
  if (typeof actionBuilderRuntimeModule.createActionBuilderRuntime !== "function") {
    actionBuilderRuntimeApi = {
      buildDirectChatAction: async () => ({ ok: false }),
      buildSupportAction: () => ({ ok: false }),
      normalizeActionResult: (_r, fallback) => fallback || {}
    };
    return actionBuilderRuntimeApi;
  }

  const buildCtx =
    typeof actionBuilderCtxModule.buildActionBuilderCtx === "function"
      ? actionBuilderCtxModule.buildActionBuilderCtx
      : (host) => host;

  actionBuilderRuntimeApi = actionBuilderRuntimeModule.createActionBuilderRuntime(
    buildCtx(collectActionBuilderHost())
  );
  return actionBuilderRuntimeApi;
}

function actionBuilderRuntime() {
  return initActionBuilderRuntime();
}

async function buildDirectChatAction(normalized) {
  return actionBuilderRuntime().buildDirectChatAction(normalized);
}

function buildSupportAction(normalized) {
  return actionBuilderRuntime().buildSupportAction(normalized);
}

function normalizeActionResult(result, fallbackAction) {
  return actionBuilderRuntime().normalizeActionResult(result, fallbackAction);
}

let pipelineSummaryRuntimeApi = null;

function collectPipelineSummaryBindingsHost() {
  return {
    nowIso,
    statusSnapshotModule,
    setLastShadowPipelineSummary: (summary) => {
      lastShadowPipelineSummary = summary;
    },
    setLastIngestSummary: (summary) => {
      lastIngestSummary = summary;
    }
  };
}

function collectPipelineSummaryHost() {
  const buildHost =
    typeof pipelineSummaryHostModule.buildPipelineSummaryHost === "function"
      ? pipelineSummaryHostModule.buildPipelineSummaryHost
      : (bindings) => bindings;
  return buildHost(collectPipelineSummaryBindingsHost());
}

function initPipelineSummaryRuntime() {
  if (pipelineSummaryRuntimeApi) return pipelineSummaryRuntimeApi;
  if (typeof pipelineSummaryRuntimeModule.createPipelineSummaryRuntime !== "function") {
    pipelineSummaryRuntimeApi = {
      recordShadowPipelineSummary: () => {},
      recordIngestSummary: () => {}
    };
    return pipelineSummaryRuntimeApi;
  }

  const buildCtx =
    typeof pipelineSummaryCtxModule.buildPipelineSummaryCtx === "function"
      ? pipelineSummaryCtxModule.buildPipelineSummaryCtx
      : (host) => host;

  pipelineSummaryRuntimeApi = pipelineSummaryRuntimeModule.createPipelineSummaryRuntime(
    buildCtx(collectPipelineSummaryHost())
  );
  return pipelineSummaryRuntimeApi;
}

function pipelineSummaryRuntime() {
  return initPipelineSummaryRuntime();
}

function recordShadowPipelineSummary(shadowResult = null) {
  return pipelineSummaryRuntime().recordShadowPipelineSummary(shadowResult);
}

function recordIngestSummary(summary = {}) {
  return pipelineSummaryRuntime().recordIngestSummary(summary);
}

let statusRuntimeApi = null;

function collectStatusBindingsHost() {
  return {
    getVideoEngine: videoEngineRuntime,
    getSpamSessionEngine: spamSessionRuntime,
    kojnozoutModule,
    overlayStateModule,
    kickBridgeModule,
    streamSessionModule,
    streamEconomyConfig,
    giftMapEnterprise,
    awayModeModule,
    kojnozoutVitalsModule,
    kojnozoutDuelModule,
    kojnozoutBackpackModule,
    kojnozoutAssetsModule,
    ecosystemOrchestratorModule,
    chatLexiconModule,
    sessionMemoryModule,
    llmAdapterModule,
    statusSnapshotModule,
    proactiveHostModule,
    supportPolicyModule,
    soloStreamModule,
    logRotationModule,
    cloneJson,
    runtimeConfig,
    nowIso,
    getPort: () => PORT,
    getKojnozoutStateForSnapshot,
    getKojnozoutState: () => kojnozoutState,
    getStreamState,
    getOverlayState: () => overlayState,
    getServerStartedAt: () => serverStartedAt,
    getStreamSession,
    getObsConnected: () => obsConnected,
    getLastGiftMapping,
    getOutputState: () => outputState,
    getHostTeamScoreState: () => hostTeamScoreState,
    getEcosystemState: () => ecosystemState,
    getDuelState: () => kojnozoutDuelState,
    getLastDuelSyncSummary: () => lastDuelSyncSummary,
    getBackpackState: () => kojnozoutBackpackState,
    getLastIngestSummary: () => lastIngestSummary,
    getLastShadowPipelineSummary: () => lastShadowPipelineSummary
  };
}

function collectStatusHost() {
  const buildHost =
    typeof statusHostModule.buildStatusHost === "function"
      ? statusHostModule.buildStatusHost
      : (bindings) => bindings;
  return buildHost(collectStatusBindingsHost());
}

function initStatusRuntime() {
  if (statusRuntimeApi) return statusRuntimeApi;
  if (typeof statusRuntimeModule.createStatusRuntime !== "function") {
    statusRuntimeApi = {
      buildMiaStatusResponse: () => ({ ok: false, service: "MIA" })
    };
    return statusRuntimeApi;
  }

  const buildCtx =
    typeof statusCtxModule.buildStatusCtx === "function"
      ? statusCtxModule.buildStatusCtx
      : (host) => host;

  statusRuntimeApi = statusRuntimeModule.createStatusRuntime(buildCtx(collectStatusHost()));
  return statusRuntimeApi;
}

function statusRuntime() {
  return initStatusRuntime();
}

function buildMiaStatusResponse() {
  return statusRuntime().buildMiaStatusResponse();
}

let translationDeliveryRuntimeApi = null;

function collectTranslationBindingsHost() {
  return {
    writeLog,
    safeString,
    runtimeConfig,
    voiceHoldUntilTs,
    getTtsEngine: ttsEngineRuntime,
    getInterpreterRuntime: interpreterRuntime,
    translateModule,
    languageModule,
    setOverlay,
    invalidateOverlayStateCache,
    getUserLabel,
    deliveryRuntime
  };
}

function collectTranslationHost() {
  const buildHost =
    typeof translationHostModule.buildTranslationHost === "function"
      ? translationHostModule.buildTranslationHost
      : (bindings) => bindings;
  return buildHost(collectTranslationBindingsHost());
}

function initTranslationDeliveryRuntime() {
  if (translationDeliveryRuntimeApi) return translationDeliveryRuntimeApi;
  if (typeof translationDeliveryRuntimeModule.createTranslationRuntime !== "function") {
    translationDeliveryRuntimeApi = {
      speakTranslatedLine: async () => ({ ok: false, reason: "missing" }),
      deliverChatTranslation: async () => ({ ok: false, reason: "missing" }),
      deliverMicTranslation: async () => ({ ok: false, reason: "missing" })
    };
    return translationDeliveryRuntimeApi;
  }

  const buildCtx =
    typeof translationCtxModule.buildTranslationCtx === "function"
      ? translationCtxModule.buildTranslationCtx
      : (host) => host;

  translationDeliveryRuntimeApi = translationDeliveryRuntimeModule.createTranslationRuntime(
    buildCtx(collectTranslationHost())
  );
  return translationDeliveryRuntimeApi;
}

function translationDeliveryRuntime() {
  return initTranslationDeliveryRuntime();
}

async function speakTranslatedLine(opts = {}) {
  return translationDeliveryRuntime().speakTranslatedLine(opts);
}

async function deliverChatTranslation(normalized = {}) {
  return translationDeliveryRuntime().deliverChatTranslation(normalized);
}

async function deliverMicTranslation(opts = {}) {
  return translationDeliveryRuntime().deliverMicTranslation(opts);
}

let showcaseRuntimeApi = null;

function collectShowcaseBindingsHost() {
  return {
    safeString,
    runtimeConfig,
    voiceHoldUntilTs,
    getTtsEngine: ttsEngineRuntime,
    deliveryRuntime,
    mirrorSpeechOverlayFromVoice,
    invalidateOverlayStateCache
  };
}

function collectShowcaseHost() {
  const buildHost =
    typeof showcaseHostModule.buildShowcaseHost === "function"
      ? showcaseHostModule.buildShowcaseHost
      : (bindings) => bindings;
  return buildHost(collectShowcaseBindingsHost());
}

function initShowcaseRuntime() {
  if (showcaseRuntimeApi) return showcaseRuntimeApi;
  if (typeof showcaseRuntimeModule.createShowcaseRuntime !== "function") {
    showcaseRuntimeApi = {
      speakMiaShowcaseLine: async () => ({ ok: false, reason: "missing" })
    };
    return showcaseRuntimeApi;
  }

  const buildCtx =
    typeof showcaseCtxModule.buildShowcaseCtx === "function"
      ? showcaseCtxModule.buildShowcaseCtx
      : (host) => host;

  showcaseRuntimeApi = showcaseRuntimeModule.createShowcaseRuntime(
    buildCtx(collectShowcaseHost())
  );
  return showcaseRuntimeApi;
}

function showcaseRuntime() {
  return initShowcaseRuntime();
}

async function speakMiaShowcaseLine(text, speaker = "mia") {
  return showcaseRuntime().speakMiaShowcaseLine(text, speaker);
}

function collectEventPipelineBindingsHost() {
  return {
    normalizeIncomingEvent,
    upper,
    writeLog,
    safeString,
    nowIso,
    runtimeConfig,
    recordIngestSummary,
    recordShadowPipelineSummary,
    streamSessionModule,
    getIngestDeduper: ingestDeduperRuntime,
    t0EngagementModule,
    proactiveHostModule,
    chatLexiconModule,
    sessionMemoryModule,
    chatBrain,
    immersiveSceneModule,
    supportResolver,
    giftUserLedgerModule,
    streamAudienceModule,
    shadowRuntime,
    kojnozoutVitalsModule,
    kojnozoutPersistenceModule,
    responseEngine,
    llmAdapterModule,
    speakerRoutingModule,
    animationTraceModule,
    runtimeExecution,
    capybaraFlowModule,
    giftMapModule,
    giftAnimationContextModule,
    executeOverlay,
    activateT0Flyby,
    getUserLabel,
    pushRecentParticipant,
    pushChatFeed,
    handleSoloStreamChatActivity,
    applyCareQuestProgress,
    deliverQuestCompleteMoment,
    tryHandleKojnozoutCommands,
    tryHandleKojStateShowcaseCommand,
    tryHandleStreamerShowcaseCommand,
    tryHandleStreamerMediaCommand,
    tryHandleCapybaraWaitingComment,
    enrichGiftEconomyContext,
    applyRuntimeStateImpact,
    applyWorldLayer,
    buildSupportAction,
    buildDirectChatAction,
    normalizeActionResult,
    prepareGiftEconomyPresentation,
    deliverChatTranslation,
    attachGiftVideoPlan,
    executeGiftPresentationOverlays,
    deliverActionVoice,
    executeVideo,
    schedulePostGiftMediaExperiences,
    scheduleDeferredMiaVoice,
    maybeDeliverMiaVoice,
    deliverEvolutionMoment,
    getVideoEngine: videoEngineRuntime,
    getObsSourceAudioMap,
    getStreamSession,
    setStreamSession,
    getGiftSupporterProfile,
    setGiftSupporterProfile,
    getGiftUserLedger,
    setGiftUserLedger,
    getLastGiftMapping,
    setLastGiftMapping,
    getStreamState,
    setStreamState,
    getOutputState: () => outputState,
    getOverlayState: () => overlayState,
    getKojnozoutState: () => kojnozoutState,
    getEcosystemState: () => ecosystemState
  };
}

function collectEventPipelineHost() {
  const buildHost =
    typeof eventPipelineHostModule.buildEventPipelineHost === "function"
      ? eventPipelineHostModule.buildEventPipelineHost
      : (bindings) => bindings;
  return buildHost(collectEventPipelineBindingsHost());
}

let eventPipelineRuntimeApi = null;

function initEventPipelineRuntime() {
  if (eventPipelineRuntimeApi) return eventPipelineRuntimeApi;
  const createApi =
    typeof eventPipelineWiringModule.createEventPipelineApi === "function"
      ? eventPipelineWiringModule.createEventPipelineApi
      : () => ({
          processEvent: async () => ({
            status: 503,
            body: { ok: false, error: "event_pipeline_wiring_missing" }
          })
        });

  const buildCtx =
    typeof eventPipelineCtxModule.buildEventPipelineCtx === "function"
      ? eventPipelineCtxModule.buildEventPipelineCtx
      : (host) => host;

  eventPipelineRuntimeApi = createApi(
    eventPipelineModule,
    buildCtx(collectEventPipelineHost())
  );
  return eventPipelineRuntimeApi;
}

function eventPipelineRuntime() {
  return initEventPipelineRuntime();
}

const processEvent = (...args) => eventPipelineRuntime().processEvent(...args);

function collectIngestHttpBindingsHost() {
  return {
    normalizer,
    languageModule,
    ingestGuardModule,
    streamAudienceModule,
    getSpamSessionEngine: spamSessionRuntime,
    runtimeConfig,
    safeString,
    upper,
    writeLog,
    getStreamState,
    setStreamState,
    recordIngestSummary,
    processEvent
  };
}

function collectIngestHttpHost() {
  const buildHost =
    typeof ingestHttpHostModule.buildIngestHttpHost === "function"
      ? ingestHttpHostModule.buildIngestHttpHost
      : (bindings) => bindings;
  return buildHost(collectIngestHttpBindingsHost());
}

let ingestHttpRuntimeApi = null;

function initIngestHttpRuntime() {
  if (ingestHttpRuntimeApi) return ingestHttpRuntimeApi;

  const createRuntime =
    typeof ingestHttpWiringModule.createIngestHttpRuntime === "function"
      ? ingestHttpWiringModule.createIngestHttpRuntime
      : (mod, ctx) =>
          typeof ingestHttpWiringModule.createIngestHttpApi === "function"
            ? ingestHttpWiringModule.createIngestHttpApi(mod, ctx) ||
              (typeof ingestHttpWiringModule.createIngestHttpFallback === "function"
                ? ingestHttpWiringModule.createIngestHttpFallback()
                : {
                    handleIngest: async (_req, res) => {
                      res.status(503).json({ ok: false, error: "ingest_http_missing" });
                    },
                    handleAudienceIngest: async (_req, res) => {
                      res.status(503).json({ ok: false, error: "ingest_http_missing" });
                    }
                  })
            : null;

  const buildCtx =
    typeof ingestHttpCtxModule.buildIngestHttpCtx === "function"
      ? ingestHttpCtxModule.buildIngestHttpCtx
      : (host) => host;

  ingestHttpRuntimeApi = createRuntime(ingestHttpModule, buildCtx(collectIngestHttpHost()));
  return ingestHttpRuntimeApi;
}

function ingestHttpRuntime() {
  return initIngestHttpRuntime();
}

let pipelineRuntimesApi = null;

function initPipelineRuntimesRuntime() {
  if (pipelineRuntimesApi) return pipelineRuntimesApi;
  initOverlayPublicRuntime();
  initCareCommandsRuntime();
  initKojMomentsRuntime();
  initActionBuilderRuntime();
  initStatusRuntime();
  initTranslationDeliveryRuntime();
  initShowcaseRuntime();
  initShowcaseCommandRuntime();
  initPipelineSummaryRuntime();
  initStoryFeedRuntime();
  initGiftMediaRuntime();
  initGiftRuntime();
  initParticipantRuntime();
  initWorldModeRuntime();
  initCapybaraFlowRuntime();
  initStreamerMediaRuntime();
  initSoloStreamRuntime();
  initEventPipelineRuntime();
  initIngestHttpRuntime();
  initDebugRoutesRuntime();
  pipelineRuntimesApi = { ready: true };
  return pipelineRuntimesApi;
}

function pipelineRuntimesRuntime() {
  return initPipelineRuntimesRuntime();
}

async function handleIngest(req, res) {
  return ingestHttpRuntime().handleIngest(req, res);
}

async function handleAudienceIngest(req, res) {
  return ingestHttpRuntime().handleAudienceIngest(req, res);
}

let debugRoutesRuntimeApi = null;

function collectDebugRoutesBindingsHost() {
  return {
    getProcessEvent: () => processEvent
  };
}

function collectDebugRoutesHost() {
  const buildHost =
    typeof debugRoutesHostModule.buildDebugRoutesHost === "function"
      ? debugRoutesHostModule.buildDebugRoutesHost
      : (bindings) => bindings;
  return buildHost(collectDebugRoutesBindingsHost());
}

function initDebugRoutesRuntime() {
  if (debugRoutesRuntimeApi) return debugRoutesRuntimeApi;

  if (typeof debugRoutesRuntimeModule.createDebugRoutesRuntime !== "function") {
    debugRoutesRuntimeApi = {
      handleDebugComment: async (_req, res) => {
        res.status(503).json({ ok: false, error: "debug_routes_missing" });
      },
      handleDebugGift: async (_req, res) => {
        res.status(503).json({ ok: false, error: "debug_routes_missing" });
      }
    };
    return debugRoutesRuntimeApi;
  }

  const buildCtx =
    typeof debugRoutesCtxModule.buildDebugRoutesCtx === "function"
      ? debugRoutesCtxModule.buildDebugRoutesCtx
      : (host) => host;

  debugRoutesRuntimeApi = debugRoutesRuntimeModule.createDebugRoutesRuntime(
    buildCtx(collectDebugRoutesHost())
  );
  return debugRoutesRuntimeApi;
}

function debugRoutesRuntime() {
  return initDebugRoutesRuntime();
}

async function handleDebugComment(req, res) {
  return debugRoutesRuntime().handleDebugComment(req, res);
}

async function handleDebugGift(req, res) {
  return debugRoutesRuntime().handleDebugGift(req, res);
}

initPipelineRuntimesRuntime();

let platformBridgesRuntimeApi = null;

function collectPlatformBridgesBindingsHost() {
  return {
    app,
    runtimeConfig,
    writeLog,
    cloneJson,
    safeString,
    getProcessEvent: () => processEvent,
    kickBridgeModule,
    twitchBridgeModule,
    telegramBridgeModule,
    responseEngine,
    getOutputState: () => outputState,
    getKojnozoutState: () => kojnozoutState
  };
}

function collectPlatformBridgesHost() {
  const buildHost =
    typeof platformBridgesHostModule.buildPlatformBridgesHost === "function"
      ? platformBridgesHostModule.buildPlatformBridgesHost
      : (bindings) => bindings;
  return buildHost(collectPlatformBridgesBindingsHost());
}

function initPlatformBridgesRuntime() {
  if (platformBridgesRuntimeApi) return platformBridgesRuntimeApi;
  if (typeof platformBridgesModule.createPlatformBridges !== "function") {
    platformBridgesRuntimeApi = {
      startKickBridge: () => {},
      startTwitchBridge: () => {},
      startTelegramBridge: () => {},
      bootstrapPlatformBridges: () => {}
    };
    return platformBridgesRuntimeApi;
  }

  const buildCtx =
    typeof platformBridgesCtxModule.buildPlatformBridgesCtx === "function"
      ? platformBridgesCtxModule.buildPlatformBridgesCtx
      : (host) => host;

  platformBridgesRuntimeApi = platformBridgesModule.createPlatformBridges(
    buildCtx(collectPlatformBridgesHost())
  );
  return platformBridgesRuntimeApi;
}

function platformBridgesRuntime() {
  return initPlatformBridgesRuntime();
}

function startKickBridge() {
  return platformBridgesRuntime().startKickBridge();
}

function startTwitchBridge() {
  return platformBridgesRuntime().startTwitchBridge();
}

function startTelegramBridge() {
  return platformBridgesRuntime().startTelegramBridge();
}

function bootstrapPlatformBridges() {
  return platformBridgesRuntime().bootstrapPlatformBridges();
}

let runtimeLoopsRuntimeApi = null;

function collectRuntimeLoopsBindingsHost() {
  return {
    runtimeConfig,
    writeLog,
    serverStartedAt,
    bowlEngine,
    getVideoEngine: videoEngineRuntime,
    bowlFullVideoModule,
    capybaraFlowModule,
    proactiveHostModule,
    getKojnozoutState: () => kojnozoutState,
    setKojnozoutState: (next) => {
      if (next) kojnozoutState = next;
    },
    getStreamState,
    getOutputState: () => outputState,
    getEcosystemState: () => ecosystemState,
    getOverlayState: () => overlayState,
    getObsConnected: () => obsConnected,
    getLastIngestSummary: () => lastIngestSummary,
    getMiaEyes: miaEyesRuntime,
    getMattingIngestBridge: mattingIngestBridgeRuntime,
    executeOverlay,
    deliverCapybaraWaitPrompt,
    syncSoloStreamObsScene,
    deliverProactiveHostMoment,
    runDuelPeerSync,
    ensureObsConnected,
    forceReconnectObs
  };
}

function collectRuntimeLoopsHost() {
  const buildHost =
    typeof runtimeLoopsHostModule.buildRuntimeLoopsHost === "function"
      ? runtimeLoopsHostModule.buildRuntimeLoopsHost
      : (bindings) => bindings;
  return buildHost(collectRuntimeLoopsBindingsHost());
}

function initRuntimeLoopsRuntime() {
  if (runtimeLoopsRuntimeApi) return runtimeLoopsRuntimeApi;
  if (typeof runtimeLoopsModule.createRuntimeLoops !== "function") {
    runtimeLoopsRuntimeApi = { stop: () => {}, timerCount: () => 0 };
    return runtimeLoopsRuntimeApi;
  }

  const buildCtx =
    typeof runtimeLoopsCtxModule.buildRuntimeLoopsCtx === "function"
      ? runtimeLoopsCtxModule.buildRuntimeLoopsCtx
      : (host) => host;

  runtimeLoopsRuntimeApi = runtimeLoopsModule.createRuntimeLoops(
    buildCtx(collectRuntimeLoopsHost())
  );
  return runtimeLoopsRuntimeApi;
}

function runtimeLoopsRuntime() {
  return initRuntimeLoopsRuntime();
}

function runObsMaintenanceScript(scriptName) {
  return obsBootstrapRuntime().runObsMaintenanceScript(scriptName, __dirname);
}

const miaRouteRegistration =
  typeof miaRoutes.registerAllRoutes === "function"
    ? miaRoutes.registerAllRoutes(app, buildMiaRouteContext())
    : { ok: false, error: "routes_index_missing" };

if (!miaRouteRegistration.ok) {
  console.warn(
    "[MIA_ROUTES] registration incomplete:",
    miaRouteRegistration.errors || miaRouteRegistration.error || "unknown"
  );
} else {
  console.log(
    `[MIA_ROUTES] ${miaRouteRegistration.routeCount} routes via ${miaRouteRegistration.packageCount} packages`
  );
}

let serverBootstrapRuntimeApi = null;

function collectServerBootstrapBindingsHost() {
  return {
    app,
    PORT,
    BIND_HOST,
    overlayStaticDir,
    MIA_SPLIT_OVERLAYS,
    portGuardModule,
    runtimeSecurityModule,
    selfRestartModule,
    miaPaintWs,
    miaPaintBridge,
    emitStartupOverlay,
    markStreamSessionEnded,
    warnOnDeadObsSceneFiles,
    connectObs
  };
}

function collectServerBootstrapHost() {
  const buildHost =
    typeof serverBootstrapHostModule.buildServerBootstrapHost === "function"
      ? serverBootstrapHostModule.buildServerBootstrapHost
      : (bindings) => bindings;
  return buildHost(collectServerBootstrapBindingsHost());
}

function initServerBootstrapRuntime() {
  if (serverBootstrapRuntimeApi) return serverBootstrapRuntimeApi;
  if (typeof serverBootstrapModule.createMiaServerStarter !== "function") {
    serverBootstrapRuntimeApi = {
      startMiaServer: async () => {
        throw new Error("server_bootstrap_missing");
      }
    };
    return serverBootstrapRuntimeApi;
  }

  const buildCtx =
    typeof serverBootstrapCtxModule.buildServerBootstrapCtx === "function"
      ? serverBootstrapCtxModule.buildServerBootstrapCtx
      : (host) => host;

  serverBootstrapRuntimeApi = serverBootstrapModule.createMiaServerStarter(
    buildCtx(collectServerBootstrapHost())
  );
  return serverBootstrapRuntimeApi;
}

function serverBootstrapRuntime() {
  return initServerBootstrapRuntime();
}

let appRuntimesApi = null;

function initAppRuntimesRuntime() {
  if (appRuntimesApi) return appRuntimesApi;
  initPlatformBridgesRuntime();
  bootstrapPlatformBridges();
  initRuntimeLoopsRuntime();
  initServerBootstrapRuntime();
  appRuntimesApi = { ready: true };
  return appRuntimesApi;
}

function appRuntimesRuntime() {
  return initAppRuntimesRuntime();
}

initAppRuntimesRuntime();

async function startMiaServer() {
  return serverBootstrapRuntime().startMiaServer();
}

if (require.main === module) {
  startMiaServer().catch((err) => {
    console.error("[MIA][BOOT_FAILED]", err && err.message ? err.message : err);
    process.exit(1);
  });
}

module.exports = {
  app,
  processEvent,
  normalizeIncomingEvent,
  safeObsCall,
  startMiaServer
};
