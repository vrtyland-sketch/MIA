"use strict";

/**
 * Master Canon 0006 §3–§18 — fifteen platform systems registry.
 */

const PLATFORM_SYSTEM_ID = Object.freeze({
  CORE: "core",
  AI: "ai",
  MEMORY: "memory",
  STREAM: "stream",
  GRAPHICS: "graphics",
  GAME: "game",
  ECONOMY: "economy",
  USER: "user",
  DATA: "data",
  NETWORK: "network",
  SECURITY: "security",
  ADMINISTRATION: "administration",
  DEVELOPMENT: "development",
  MONITORING: "monitoring",
  INTEGRATION: "integration"
});

const PLATFORM_SYSTEM_ORDER = Object.freeze(Object.values(PLATFORM_SYSTEM_ID));

/** @typedef {'implemented'|'partial'|'planned'} ImplStatus */

function defineSystem(input) {
  return Object.freeze({
    id: input.id,
    name: input.name,
    section: input.section,
    purpose: input.purpose,
    components: Object.freeze(input.components || []),
    runtime: Object.freeze(input.runtime || []),
    docs: Object.freeze(input.docs || []),
    status: input.status || "partial",
    nextDocId: input.nextDocId || null
  });
}

const PLATFORM_SYSTEMS = Object.freeze({
  [PLATFORM_SYSTEM_ID.CORE]: defineSystem({
    id: PLATFORM_SYSTEM_ID.CORE,
    name: "CORE SYSTEM",
    section: 4,
    purpose: "Srdce platformy — runtime, event bus, scheduler, config.",
    components: ["Runtime", "Event Bus", "Scheduler", "Configuration Manager", "Dependency Manager", "Lifecycle Manager", "Error Manager", "Core Kernel", "Boot Manager"],
    runtime: [
      "shared/mia-boot-core/bootManager.js",
      "shared/mia-startup-core/startupSequenceManager.js",
      "shared/mia-service-core/serviceManager.js",
      "shared/mia-dependency-core/dependencyManager.js",
      "shared/mia-configuration-core/configurationManager.js",
      "shared/mia-resource-core/resourceManager.js",
      "shared/mia-process-core/processManager.js",
      "shared/mia-scheduler-core/taskScheduler.js",
      "shared/mia-thread-core/threadManager.js",
      "shared/mia-timer-core/timerEngine.js",
      "shared/mia-state-core/stateManager.js",
      "shared/mia-runtime-core/runtimeManager.js",
      "shared/mia-lifecycle-core/lifecycleManager.js",
      "shared/mia-health-core/healthManager.js",
      "shared/mia-recovery-core/recoveryManager.js",
      "shared/mia-watchdog-core/watchdogEngine.js",
      "shared/mia-fault-core/faultManager.js",
      "shared/mia-safe-mode-core/safeModeManager.js",
      "shared/mia-shutdown-core/shutdownManager.js",
      "shared/mia-diagnostics-core/diagnosticsManager.js",
      "shared/mia-logging-core/loggingManager.js",
      "shared/mia-metrics-core/metricsManager.js",
      "shared/mia-alert-core/alertManager.js",
      "shared/mia-audit-core/auditManager.js",
      "shared/mia-event-store-core/eventStoreManager.js",
      "shared/mia-event-bus-core/eventBusManager.js",
      "shared/mia-message-queue-core/messageQueueManager.js",
      "shared/mia-command-bus-core/commandBusManager.js",
      "shared/mia-query-bus-core/queryBusManager.js",
      "shared/mia-projection-core/projectionManager.js",
      "shared/mia-saga-core/sagaManager.js",
      "shared/mia-workflow-core/workflowEngine.js",
      "shared/mia-rule-core/ruleEngine.js",
      "shared/mia-policy-core/policyEngine.js",
      "shared/mia-kernel-decision-core/decisionEngine.js",
      "shared/mia-orchestrator-core/orchestratorEngine.js",
      "shared/mia-coordination-core/coordinationEngine.js",
      "shared/mia-kernel-core/coreKernel.js",
      "index.js",
      "server.js",
      "scripts/MIA_INGEST_QUEUE.js",
      "scripts/MIA_EVENT_PIPELINE.js",
      "scripts/MIA_CONFIG.js",
      "scripts/MIA_RUNTIME_LOOPS.js"
    ],
    docs: [
      "docs/master-canon/0050-mia-core-kernel.md",
      "docs/master-canon/0051-boot-manager.md",
      "docs/master-canon/0052-startup-sequence-manager.md",
      "docs/master-canon/0053-service-manager.md",
      "docs/master-canon/0054-dependency-manager.md",
      "docs/master-canon/0055-configuration-manager.md",
      "docs/master-canon/0056-resource-manager.md",
      "docs/master-canon/0057-process-manager.md",
      "docs/master-canon/0058-task-scheduler.md",
      "docs/master-canon/0059-thread-manager.md",
      "docs/master-canon/0060-timer-engine.md",
      "docs/master-canon/0061-state-manager.md",
      "docs/master-canon/0062-runtime-manager.md",
      "docs/master-canon/0063-lifecycle-manager.md",
      "docs/master-canon/0064-health-manager.md",
      "docs/master-canon/0065-recovery-manager.md",
      "docs/master-canon/0066-watchdog-engine.md",
      "docs/master-canon/0067-fault-manager.md",
      "docs/master-canon/0068-safe-mode-manager.md",
      "docs/master-canon/0069-shutdown-manager.md",
      "docs/master-canon/0070-diagnostics-manager.md",
      "docs/master-canon/0071-logging-manager.md",
      "docs/master-canon/0072-metrics-manager.md",
      "docs/master-canon/0073-alert-manager.md",
      "docs/master-canon/0074-audit-manager.md",
      "docs/master-canon/0075-event-store-manager.md",
      "docs/master-canon/0076-event-bus-manager.md",
      "docs/master-canon/0077-message-queue-manager.md",
      "docs/master-canon/0078-command-bus-manager.md",
      "docs/master-canon/0079-query-bus-manager.md",
      "docs/master-canon/0080-projection-manager.md",
      "docs/master-canon/0081-saga-manager.md",
      "docs/master-canon/0082-workflow-engine.md",
      "docs/master-canon/0083-rule-engine.md",
      "docs/master-canon/0084-policy-engine.md",
      "docs/master-canon/0085-decision-engine.md",
      "docs/master-canon/0086-orchestrator-engine.md",
      "docs/master-canon/0087-coordination-engine.md"
    ],
    status: "implemented",
    nextDocId: "0088"
  }),
  [PLATFORM_SYSTEM_ID.AI]: defineSystem({
    id: PLATFORM_SYSTEM_ID.AI,
    name: "AI SYSTEM",
    section: 5,
    purpose: "Inteligence platformy — rozhodování, konverzace, emoce.",
    components: ["Decision Engine", "Conversation Engine", "Speech Engine", "Planning Engine", "Emotion Engine", "Learning Engine", "Context Engine", "Personality Engine"],
    runtime: [
      "shared/mia-decision-core/decisionEngine.js",
      "shared/mia-action-core/actionOrchestrator.js",
      "shared/mia-goal-core/goalManagementSystem.js",
      "shared/mia-planning-core/planningEngine.js",
      "shared/mia-emotion-core/emotionEngine.js",
      "shared/mia-personality-core/personalityEngine.js",
      "shared/mia-conversation-core/conversationEngine.js",
      "shared/mia-speech-core/speechEngine.js",
      "shared/mia-story-core/storyEngine.js",
      "shared/mia-character-core/characterEngine.js",
      "shared/mia-module-core/pluginModuleEngine.js",
      "MIA_NEXT/engine_shadow_runtime.js",
      "shared/platform_runtime_rules/decision_engine.js",
      "scripts/MIA_MOOD_BRAIN.js",
      "scripts/MIA_TTS_ENGINE.js"
    ],
    docs: ["docs/KANON_MIA_AGENT.md", "docs/master-canon/0050-mia-core-kernel.md"],
    status: "partial",
    nextDocId: "0088"
  }),
  [PLATFORM_SYSTEM_ID.MEMORY]: defineSystem({
    id: PLATFORM_SYSTEM_ID.MEMORY,
    name: "MEMORY SYSTEM",
    section: 6,
    purpose: "Krátkodobá, dlouhodobá a kontextová paměť.",
    components: ["Short-term Memory", "Long-term Memory", "Working Memory", "Context Memory", "Knowledge Base", "Archive"],
    runtime: [
      "shared/mia-memory-core/memorySystem.js",
      "shared/mia-memory-core/workingMemory.js",
      "shared/mia-memory-core/shortTermMemory.js",
      "shared/mia-memory-core/longTermMemory.js",
      "shared/mia-memory-core/episodicMemory.js",
      "shared/mia-memory-core/semanticMemory.js",
      "shared/mia-memory-core/proceduralMemory.js",
      "shared/mia-memory-core/emotionalMemory.js",
      "shared/mia-memory-core/knowledgeGraphManager.js",
      "scripts/MIA_SESSION_MEMORY.js",
      "scripts/MIA_STORY_MEMORY.js",
      "data/mia-session-memory.json",
      "data/story-memory.json"
    ],
    status: "partial",
    nextDocId: "0028"
  }),
  [PLATFORM_SYSTEM_ID.STREAM]: defineSystem({
    id: PLATFORM_SYSTEM_ID.STREAM,
    name: "STREAM SYSTEM",
    section: 7,
    purpose: "Živé vysílání — ingest, normalizace, adaptéry.",
    components: ["TikTok Adapter", "Kick Adapter", "Twitch Adapter", "YouTube Adapter", "Stream State Engine"],
    runtime: ["routes/ingest", "scripts/MIA_KICK_BRIDGE.js", "scripts/MIA_STREAM_SESSION.js", "shared/platform_normalizers/normalize_event.js", "shared/mia-creature-core/creatureEvolutionEngine.js"],
    docs: ["docs/MIA_MULTI_PLATFORM_STREAM.md", "docs/master-canon/0048-creature-evolution-engine.md"],
    status: "implemented",
    nextDocId: "0088"
  }),
  [PLATFORM_SYSTEM_ID.GRAPHICS]: defineSystem({
    id: PLATFORM_SYSTEM_ID.GRAPHICS,
    name: "GRAPHICS SYSTEM",
    section: 8,
    purpose: "Vizuální výstup — 2D overlay, animace, avatar.",
    components: ["Renderer", "Sprite Manager", "Animation Engine", "Layer Manager", "Camera", "UI Runtime", "Avatar Runtime"],
    runtime: [
      "shared/mia-render-core/visualRenderingSystem.js",
      "shared/mia-animation-core/animationEngine.js",
      "shared/mia-graphics-studio/",
      "shared/mia-animation-engine/",
      "mia-output-overlay/",
      "scripts/MIA_OBS_OVERLAY_SYNC.js"
    ],
    docs: ["docs/MIA_GRAPHICS_STUDIO.md"],
    status: "partial",
    nextDocId: "0088"
  }),
  [PLATFORM_SYSTEM_ID.GAME]: defineSystem({
    id: PLATFORM_SYSTEM_ID.GAME,
    name: "GAME SYSTEM",
    section: 9,
    purpose: "Herní logika — Kojnožrout, inventář, duely.",
    components: ["Kojnožrout Engine", "Battle Engine", "Inventory", "Quests", "Duels", "Crafting", "Stats", "Items", "NPC", "World"],
    runtime: [
      "shared/mia-battle-core/battleEngine.js",
      "shared/mia-inventory-core/inventoryEngine.js",
      "shared/mia-progression-core/progressionEngine.js",
      "shared/mia-achievement-core/achievementEngine.js",
      "shared/mia-world-core/worldEngine.js",
      "shared/mia-character-core/characterEngine.js",
      "shared/mia-creature-core/creatureEvolutionEngine.js",
      "shared/mia-module-core/pluginModuleEngine.js",
      "shared/mia-kernel-core/coreKernel.js",
      "scripts/MIA_KOJNOZROUT_ENGINE.js",
      "scripts/MIA_KOJNOZROUT_CARE_QUEST.js",
      "scripts/MIA_KOJNOZROUT_EVOLUTION.js",
      "scripts/MIA_GIFT_SUPPORTER_PROFILE.js",
      "scripts/MIA_ARENA_BATTLE.js",
      "scripts/MIA_KOJNOZROUT_BACKPACK.js",
      "scripts/MIA_KOJNOZROUT_WORLD_PERSISTENCE.js",
      "data/kojnozout-world.json"
    ],
    docs: [
      "docs/KOJNOZROUT_KANON.md",
      "docs/master-canon/0042-quest-progression-engine.md",
      "docs/master-canon/0043-achievement-engine.md",
      "docs/master-canon/0045-world-engine.md",
      "docs/master-canon/0046-story-engine.md",
      "docs/master-canon/0047-npc-character-engine.md",
      "docs/master-canon/0048-creature-evolution-engine.md",
      "docs/master-canon/0049-plugin-module-engine.md",
      "docs/master-canon/0050-mia-core-kernel.md"
    ],
    status: "partial",
    nextDocId: "0088"
  }),
  [PLATFORM_SYSTEM_ID.ECONOMY]: defineSystem({
    id: PLATFORM_SYSTEM_ID.ECONOMY,
    name: "ECONOMY SYSTEM",
    section: 10,
    purpose: "MIA body, gift mapa, odměny, balancování.",
    components: ["MIA Points", "Currencies", "Rewards", "Gift Mapping", "Marketplace", "Balancing", "Inventory Economy"],
    runtime: [
      "shared/mia-economy-core/economyEngine.js",
      "shared/gifts/",
      "shared/mia-inventory-core/inventoryEngine.js",
      "scripts/MIA_GIFT_ECONOMY.js",
      "scripts/MIA_GIFT_RUNTIME.js",
      "scripts/MIA_CHAT_REWARD_ENGINE.js",
      "scripts/MIA_GIFT_TIERS.js",
      "shared/stream_economy_config.json"
    ],
    docs: ["docs/MIA_GIFT_ECONOMY.md", "docs/master-canon/0041-economy-engine.md"],
    status: "implemented",
    nextDocId: "0088"
  }),
  [PLATFORM_SYSTEM_ID.USER]: defineSystem({
    id: PLATFORM_SYSTEM_ID.USER,
    name: "USER SYSTEM",
    section: 11,
    purpose: "Viewer, streamer, moderátor, oprávnění.",
    components: ["Viewer", "Streamer", "Moderator", "Administrator", "Developer", "AI Entity"],
    runtime: [
      "shared/mia-community-core/communityEngine.js",
      "scripts/MIA_STREAMER_IDENTITY.js",
      "scripts/MIA_PARTICIPANT_RUNTIME.js",
      "scripts/MIA_GIFT_SUPPORTER_PROFILE.js",
      "data/streamer-identity.json"
    ],
    docs: ["docs/master-canon/0044-community-engine.md", "docs/master-canon/0047-npc-character-engine.md"],
    status: "partial",
    nextDocId: "0088"
  }),
  [PLATFORM_SYSTEM_ID.DATA]: defineSystem({
    id: PLATFORM_SYSTEM_ID.DATA,
    name: "DATA SYSTEM",
    section: 12,
    purpose: "Persistence, cache, archiv, migrace.",
    components: ["Database", "Cache", "Archive", "Backup", "Export", "Import", "Migration"],
    runtime: ["data/*.json", "logs/"],
    status: "partial"
  }),
  [PLATFORM_SYSTEM_ID.NETWORK]: defineSystem({
    id: PLATFORM_SYSTEM_ID.NETWORK,
    name: "NETWORK SYSTEM",
    section: 13,
    purpose: "HTTP, WebSocket, OBS WS, interní kanály.",
    components: ["HTTP API", "WebSocket", "OBS WebSocket", "Internal Channels"],
    runtime: ["routes/", "server.js", "scripts/MIA_OBS_BOOTSTRAP.js", "scripts/MIA_PAINT_WS.js"],
    status: "implemented"
  }),
  [PLATFORM_SYSTEM_ID.SECURITY]: defineSystem({
    id: PLATFORM_SYSTEM_ID.SECURITY,
    name: "SECURITY SYSTEM",
    section: 14,
    purpose: "Auth, oprávnění, audit, ochrana ingestu.",
    components: ["Authentication", "Authorization", "Permissions", "Audit", "Encryption", "Secrets", "Abuse Protection"],
    runtime: ["scripts/MIA_RUNTIME_SECURITY.js", "scripts/MIA_INGEST_GUARD.js", "scripts/MIA_STREAMER_ACCESS.js"],
    status: "partial"
  }),
  [PLATFORM_SYSTEM_ID.ADMINISTRATION]: defineSystem({
    id: PLATFORM_SYSTEM_ID.ADMINISTRATION,
    name: "ADMINISTRATION SYSTEM",
    section: 15,
    purpose: "Dashboard, nastavení, diagnostika.",
    components: ["Dashboard", "Settings", "Module Management", "Logs", "Updates", "Diagnostics"],
    runtime: ["mia-output-overlay/mia-streamer-dashboard.html", "routes/status", "/health", "/gift-map/status"],
    docs: ["docs/MIA_REMOTE_DEV_MODE.md"],
    status: "partial"
  }),
  [PLATFORM_SYSTEM_ID.DEVELOPMENT]: defineSystem({
    id: PLATFORM_SYSTEM_ID.DEVELOPMENT,
    name: "DEVELOPMENT SYSTEM",
    section: 16,
    purpose: "Testy, simulace, dokumentace, CI.",
    components: ["Tests", "Simulations", "Benchmarks", "Documentation", "API Generation", "Debugging", "CI/CD"],
    runtime: ["tests/", "scripts/run_preflight_tests.js", "docs/", "npm run test:preflight:fast"],
    status: "implemented"
  }),
  [PLATFORM_SYSTEM_ID.MONITORING]: defineSystem({
    id: PLATFORM_SYSTEM_ID.MONITORING,
    name: "MONITORING SYSTEM",
    section: 17,
    purpose: "Výkon, chyby, fronty, odezva.",
    components: ["Performance", "Memory Usage", "Errors", "Event Queues", "Latency", "Module Load"],
    runtime: [
      "shared/mia-monitoring-core/monitoringSystem.js",
      "scripts/MIA_HEALTH_RUNTIME.js",
      "routes/health",
      "mia-output-overlay/mia-streamer-dashboard.html",
      "logs/"
    ],
    status: "partial",
    nextDocId: "0019"
  }),
  [PLATFORM_SYSTEM_ID.INTEGRATION]: defineSystem({
    id: PLATFORM_SYSTEM_ID.INTEGRATION,
    name: "INTEGRATION SYSTEM",
    section: 18,
    purpose: "OBS, AI API, cloud, externí služby přes adaptéry.",
    components: ["OBS Integration Layer", "AI API", "Cloud Storage", "Social Networks", "Payment Systems"],
    runtime: [
      "shared/mia-obs-core/obsIntegrationLayer.js",
      "shared/mia-module-core/pluginModuleEngine.js",
      "scripts/MIA_OBS_BOOTSTRAP.js",
      "scripts/MIA_OBS_OVERLAY_SYNC.js",
      "scripts/MIA_PLATFORM_BRIDGES.js",
      "TikFinity ingest"
    ],
    docs: ["docs/OBS_LIVE_SETUP.md", "docs/master-canon/0049-plugin-module-engine.md"],
    status: "partial",
    nextDocId: "0088"
  })
});

function listPlatformSystems() {
  return PLATFORM_SYSTEM_ORDER.map((id) => PLATFORM_SYSTEMS[id]);
}

function getPlatformSystem(systemId) {
  return PLATFORM_SYSTEMS[systemId] || null;
}

function countSystemsByStatus(status) {
  return listPlatformSystems().filter((s) => s.status === status).length;
}

module.exports = {
  PLATFORM_SYSTEM_ID,
  PLATFORM_SYSTEM_ORDER,
  PLATFORM_SYSTEMS,
  listPlatformSystems,
  getPlatformSystem,
  countSystemsByStatus
};
