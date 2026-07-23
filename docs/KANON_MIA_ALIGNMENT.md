# KÁNON MIA — soulad s codebase

Mapa mezi [`KANON_MIA_AGENT.md`](./KANON_MIA_AGENT.md) a stavem `C:\MIA`.  
**Ústava (nejvyšší priorita):** [`master-canon/0001-project-constitution.md`](./master-canon/0001-project-constitution.md) · **Entity (0002):** [`master-canon/0002-entity-definition.md`](./master-canon/0002-entity-definition.md) · **Event (0003):** [`master-canon/0003-event-definition.md`](./master-canon/0003-event-definition.md) · **Component (0004):** [`master-canon/0004-component-definition.md`](./master-canon/0004-component-definition.md) · **Platforma (0006):** [`master-canon/0006-platform-architecture.md`](./master-canon/0006-platform-architecture.md) · **Core (0007):** [`master-canon/0007-core-system.md`](./master-canon/0007-core-system.md) · **Runtime (0008):** [`master-canon/0008-runtime-manager.md`](./master-canon/0008-runtime-manager.md) · **Lifecycle (0009):** [`master-canon/0009-lifecycle-manager.md`](./master-canon/0009-lifecycle-manager.md) · **Event Bus (0010):** [`master-canon/0010-event-bus.md`](./master-canon/0010-event-bus.md) · **Event Gateway (0011):** [`master-canon/0011-event-gateway.md`](./master-canon/0011-event-gateway.md) · **Event Validator (0012):** [`master-canon/0012-event-validator.md`](./master-canon/0012-event-validator.md) · **Event Registry (0013):** [`master-canon/0013-event-registry.md`](./master-canon/0013-event-registry.md) · **Event Router (0014):** [`master-canon/0014-event-router.md`](./master-canon/0014-event-router.md) · **Priority Manager (0015):** [`master-canon/0015-priority-manager.md`](./master-canon/0015-priority-manager.md) · **Queue Manager (0016):** [`master-canon/0016-queue-manager.md`](./master-canon/0016-queue-manager.md) · **Event Dispatcher (0017):** [`master-canon/0017-event-dispatcher.md`](./master-canon/0017-event-dispatcher.md) · **Monitoring System (0018):** [`master-canon/0018-monitoring-system.md`](./master-canon/0018-monitoring-system.md) · **Memory System (0019):** [`master-canon/0019-memory-system.md`](./master-canon/0019-memory-system.md) · **Working Memory (0020):** [`master-canon/0020-working-memory.md`](./master-canon/0020-working-memory.md) · **Short-Term Memory (0021):** [`master-canon/0021-short-term-memory.md`](./master-canon/0021-short-term-memory.md) · 15 systémů: `shared/mia-architecture-core/platformSystems.js`.  
**Současný přehled (čti první):** [`KANON_SOUCASNY_PREHLED.md`](./KANON_SOUCASNY_PREHLED.md).

Priorita: **nerozbít → pochopit → minimální diff**.

Legenda: 🟢 shodné / implementováno · 🟡 částečně · 🔴 vize / chybí

---

## Rychlé shrnutí

| Oblast | Stav |
|--------|------|
| **Master Canon 0001** (ústava projektu) | 🟢 `docs/master-canon/0001-*` |
| **Master Canon 0002** (definice entity, Entity-First) | 🟢 `docs/master-canon/0002-*` · `shared/mia-entity-core/` · runtime adopce 🟡 |
| **Master Canon 0003** (definice události, Event-Driven) | 🟢 `docs/master-canon/0003-*` · `shared/mia-event-core/` · ingest pipeline 🟢 |
| **Master Canon 0004** (definice komponenty, HOST architektura) | 🟢 `docs/master-canon/0004-*` · `shared/mia-component-core/` · 60× HOST 🟢 |
| **Master Canon 0005** (architektonické vrstvy) | 🟢 `docs/master-canon/0005-*` · `shared/mia-architecture-core/` |
| **Master Canon 0006** (platform architecture, 15 systémů) | 🟢 `docs/master-canon/0006-*` · 7 implemented / 8 partial |
| **Master Canon 0007** (Core System, 12 managerů) | 🟢 `docs/master-canon/0007-*` · `shared/mia-core-canon/` · 6 implemented / 6 partial |
| **Master Canon 0008** (Runtime Manager, bootstrap + state machine) | 🟢 `docs/master-canon/0008-*` · `runtimeManager.js` · enum ✅ / runtime adopce 🟡 |
| **Master Canon 0009** (Lifecycle Manager, platform lifecycle) | 🟢 `docs/master-canon/0009-*` · `lifecycleManager.js` · API ✅ / runtime autorita 🟡 |
| **Master Canon 0010** (Event Bus, 12 komponent) | 🟢 `docs/master-canon/0010-*` · `eventBusInfrastructure.js` · ingest pipeline 🟢 · DLQ/retry ❌ |
| **Master Canon 0011** (Event Gateway, 11 komponent) | 🟢 `docs/master-canon/0011-*` · `eventGateway.js` · TikTok/Kick/OBS ✅ · rate limit ❌ |
| **Master Canon 0012** (Event Validator, 11 komponent) | 🟢 `docs/master-canon/0012-*` · `eventValidator.js` · validateEventCanon ✅ · ingest hook 🟡 |
| **Master Canon 0013** (Event Registry, 15 typů) | 🟢 `docs/master-canon/0013-*` · `eventRegistry.js` · publishers/subscribers ✅ |
| **Master Canon 0014** (Event Router, distribution plan) | 🟢 `docs/master-canon/0014-*` · `eventRouter.js` · registry routing ✅ · ingest hook 🟡 |
| **Master Canon 0015** (Priority Manager, P0–P4 queues) | 🟢 `docs/master-canon/0015-*` · `priorityManager.js` · fair scheduler ✅ · ingest hook 🟡 |
| **Master Canon 0016** (Queue Manager, registry + storage) | 🟢 `docs/master-canon/0016-*` · `queueManager.js` · recovery API ✅ · ingest hook 🟡 |
| **Master Canon 0017** (Event Dispatcher, ACK/retry/idempotence) | 🟢 `docs/master-canon/0017-*` · `eventDispatcher.js` · multicast ✅ · ingest hook 🟡 |
| **Master Canon 0018** (Monitoring System, health/alerts/diagnostics) | 🟢 `docs/master-canon/0018-*` · `mia-monitoring-core/` · `/health` 🟡 |
| **Master Canon 0019** (Memory System, 7 types + graph) | 🟢 `docs/master-canon/0019-*` · `mia-memory-core/` · session memory 🟡 |
| **Master Canon 0020** (Working Memory, context/tasks/focus) | 🟢 `docs/master-canon/0020-*` · `workingMemory.js` · runtime hook 🟡 |
| **Master Canon 0021** (Short-Term Memory, gifts/sessions/sync) | 🟢 `docs/master-canon/0021-*` · `shortTermMemory.js` · session memory 🟡 |
| **Master Canon 0022** (Long-Term Memory, users/streams/graph) | 🟢 `docs/master-canon/0022-*` · `longTermMemory.js` · story memory 🟡 |
| **Master Canon 0023** (Episodic Memory, episodes/timeline/replay) | 🟢 `docs/master-canon/0023-*` · `episodicMemory.js` · story memory 🟡 |
| **Master Canon 0024** (Semantic Memory, concepts/rules/search) | 🟢 `docs/master-canon/0024-*` · `semanticMemory.js` |
| **Master Canon 0025** (Procedural Memory, skills/workflows/automation) | 🟢 `docs/master-canon/0025-*` · `proceduralMemory.js` |
| **Master Canon 0026** (Emotional Memory, trust/relationships/mood) | 🟢 `docs/master-canon/0026-*` · `emotionalMemory.js` · mood brain 🟡 |
| **Master Canon 0027** (Knowledge Graph, entities/reasoning/analytics) | 🟢 `docs/master-canon/0027-*` · `knowledgeGraphManager.js` |
| **Master Canon 0028** (Decision Engine, action plans/learning) | 🟢 `docs/master-canon/0028-*` · `mia-decision-core/` · legacy rules 🟡 |
| **Master Canon 0029** (Action Orchestrator, queue/execute/feedback) | 🟢 `docs/master-canon/0029-*` · `mia-action-core/` · delivery runtime 🟡 |
| **Master Canon 0030** (Goal Management System, priorities/conflicts/lifecycle) | 🟢 `docs/master-canon/0030-*` · `mia-goal-core/` |
| **Master Canon 0031** (Planning Engine, scenarios/decompose/optimize) | 🟢 `docs/master-canon/0031-*` · `mia-planning-core/` |
| **Master Canon 0032** (Emotion Engine, mood/intensity/koj state) | 🟢 `docs/master-canon/0032-*` · `mia-emotion-core/` · mood brain 🟡 |
| **Master Canon 0033** (Personality Engine, identity/values/humor) | 🟢 `docs/master-canon/0033-*` · `mia-personality-core/` |
| **Master Canon 0034** (Conversation Engine, dialogue/speakers/threads) | 🟢 `docs/master-canon/0034-*` · `mia-conversation-core/` |
| **Master Canon 0035** (Speech Engine, voice/sync/cache) | 🟢 `docs/master-canon/0035-*` · `mia-speech-core/` · TTS runtime 🟡 |
| **Master Canon 0036** (Animation Engine, states/layers/OBS) | 🟢 `docs/master-canon/0036-*` · `mia-animation-core/` · PNG bank 🟡 |
| **Master Canon 0037** (Visual Rendering System, scenes/GPU/OBS) | 🟢 `docs/master-canon/0037-*` · `mia-render-core/` · overlay runtime 🟡 |
| **Master Canon 0038** (OBS Integration Layer, WS/scenes/media) | 🟢 `docs/master-canon/0038-*` · `mia-obs-core/` · OBS bootstrap 🟡 |
| **Master Canon 0039** (Battle Engine, queue/damage/session) | 🟢 `docs/master-canon/0039-*` · `mia-battle-core/` · arena runtime 🟡 |
| **Master Canon 0040** (Inventory Engine, loot/craft/trade) | 🟢 `docs/master-canon/0040-*` · `mia-inventory-core/` · backpack 🟡 |
| **Master Canon 0041** (Economy Engine, gift/chat/bowl/playlist) | 🟢 `docs/master-canon/0041-*` · `mia-economy-core/` · gift runtime 🟡 |
| **Master Canon 0042** (Quest & Progression Engine, XP/levels/missions) | 🟢 `docs/master-canon/0042-*` · `mia-progression-core/` · care quest 🟡 |
| **Master Canon 0043** (Achievement Engine, titles/badges/trophies) | 🟢 `docs/master-canon/0043-*` · `mia-achievement-core/` · supporter profile 🟡 |
| **Master Canon 0044** (Community Engine, profiles/reputation/guilds) | 🟢 `docs/master-canon/0044-*` · `mia-community-core/` · participant runtime 🟡 |
| **Master Canon 0045** (World Engine, regions/locations/weather) | 🟢 `docs/master-canon/0045-*` · `mia-world-core/` · kojnozout-world 🟡 |
| **Master Canon 0046** (Story Engine, chapters/choices/NPC) | 🟢 `docs/master-canon/0046-*` · `mia-story-core/` · story memory 🟡 |
| **Master Canon 0047** (NPC & Character Engine, registry/routines/AI) | 🟢 `docs/master-canon/0047-*` · `mia-character-core/` · kojnožrout runtime 🟡 |
| **Master Canon 0048** (Creature Evolution, platform Kojnožrouti, game modules) | 🟢 `docs/master-canon/0048-*` · `mia-creature-core/` · multi-platform battle 🟡 |
| **Master Canon 0049** (Plugin & Module Engine, manifest/lifecycle/hot reload) | 🟢 `docs/master-canon/0049-*` · `mia-module-core/` · live plugin reload 🟡 |
| **Master Canon 0050** (MIA Core Kernel Layer 0, boot/runtime/recovery) | 🟢 `docs/master-canon/0050-*` · `mia-kernel-core/` · live index boot 🟡 |
| **Master Canon 0051** (Boot Manager, BOOT-00…08, env/config/registries) | 🟢 `docs/master-canon/0051-*` · `mia-boot-core/` · live handoff 🟡 |
| **Master Canon 0052** (Startup Sequence Manager, layers 0–7, queue/sync) | 🟢 `docs/master-canon/0052-*` · `mia-startup-core/` · live bootstrap 🟡 |
| **Master Canon 0053** (Service Manager, registry/lifecycle/health/audit) | 🟢 `docs/master-canon/0053-*` · `mia-service-core/` · live wiring 🟡 |
| **Master Canon 0054** (Dependency Manager, DAG/topo/conflicts) | 🟢 `docs/master-canon/0054-*` · `mia-dependency-core/` · live wiring 🟡 · docs 0056+ |
| **Master Canon 0055** (Configuration Manager, layers/validation/secrets) | 🟢 `docs/master-canon/0055-*` · `mia-configuration-core/` · live wiring 🟡 · docs 0088+ |
| **Master Canon 0056** (Resource Manager, allocation/limits/watchdog feed) | 🟡 `docs/master-canon/0056-*` · `mia-resource-core/` · live wiring 🟡 · docs 0088+ |
| **Master Canon 0057** (Process Manager, lifecycle/restart/zombie/deadlock) | 🟡 `docs/master-canon/0057-*` · `mia-process-core/` · live wiring 🟡 |
| **Master Canon 0058** (Task Scheduler, priority/queues/retry/overload) | 🟡 `docs/master-canon/0058-*` · `mia-scheduler-core/` · live wiring 🟡 |
| **Master Canon 0062** (Runtime Manager, context/registry/lifecycle/snapshot) | 🟡 `docs/master-canon/0062-*` · `mia-runtime-core/` · live wiring 🟡 · docs 0088+ |
| **Master Canon 0063** (Lifecycle Manager, phases/Battle/Koj/runtime bridge) | 🟡 `docs/master-canon/0063-*` · `mia-lifecycle-core/` · live wiring 🟡 · docs 0088+ |
| **Master Canon 0064** (Health Manager, score/rules/trends/diagnostic feeds) | 🟡 `docs/master-canon/0064-*` · `mia-health-core/` · live wiring 🟡 · docs 0088+ |
| **Master Canon 0065** (Recovery Manager, workflow/levels/escalation/reports) | 🟡 `docs/master-canon/0065-*` · `mia-recovery-core/` · live wiring 🟡 · docs 0088+ |
| **Master Canon 0066** (Watchdog Engine, heartbeat/freeze/deadlock/notify) | 🟡 `docs/master-canon/0066-*` · `mia-watchdog-core/` · live wiring 🟡 · docs 0088+ |
| **Master Canon 0067** (Fault Manager, classify/dedup/route/escalate/audit) | 🟡 `docs/master-canon/0067-*` · `mia-fault-core/` · live wiring 🟡 · docs 0088+ |
| **Master Canon 0068** (Safe Mode Manager, degrade/restrict/recover) | 🟡 `docs/master-canon/0068-*` · `mia-safe-mode-core/` · live wiring 🟡 · docs 0088+ |
| **Master Canon 0069** (Shutdown Manager, workflow/stop-order/report) | 🟡 `docs/master-canon/0069-*` · `mia-shutdown-core/` · live OS exit 🟡 · docs 0088+ |
| **Master Canon 0070** (Diagnostics Manager, snapshot/trend/root-cause/report) | 🟡 `docs/master-canon/0070-*` · `mia-diagnostics-core/` · live source bridges 🟡 · docs 0088+ |
| **Master Canon 0071** (Logging Manager, structured/correlation/rotate/fault feed) | 🟡 `docs/master-canon/0071-*` · `mia-logging-core/` · live file/DB/cloud 🟡 · docs 0088+ |
| **Master Canon 0072** (Metrics Manager, types/series/thresholds/feeds/report) | 🟡 `docs/master-canon/0072-*` · `mia-metrics-core/` · live external storage 🟡 · docs 0088+ |
| **Master Canon 0073** (Alert Manager, rules/dedup/escalate/notify/lifecycle) | 🟡 `docs/master-canon/0073-*` · `mia-alert-core/` · live external notification 🟡 · docs 0088+ |
| **Master Canon 0074** (Audit Manager, immutable history/integrity/archive) | 🟡 `docs/master-canon/0074-*` · `mia-audit-core/` · live durable store 🟡 · docs 0088+ |
| **Master Canon 0075** (Event Store Manager, append-only domain events/replay/snapshot) | 🟡 `docs/master-canon/0075-*` · `mia-event-store-core/` · live durable store 🟡 · docs 0088+ |
| **Master Canon 0076** (Event Bus Manager, topic routing/priority/retry/DLQ) | 🟡 `docs/master-canon/0076-*` · `mia-event-bus-core/` · live async broker 🟡 · docs 0088+ |
| **Master Canon 0077** (Message Queue Manager, FIFO/priority/ACK/NACK/DLQ) | 🟡 `docs/master-canon/0077-*` · `mia-message-queue-core/` · live external broker 🟡 · docs 0088+ |
| **Master Canon 0078** (Command Bus Manager, one-handler routing/pipeline/idempotency) | 🟡 `docs/master-canon/0078-*` · `mia-command-bus-core/` · live handler wiring 🟡 · docs 0088+ |
| **Master Canon 0079** (Query Bus Manager, CQRS read-only/one-handler/pipeline) | 🟡 `docs/master-canon/0079-*` · `mia-query-bus-core/` · live read-model wiring 🟡 · docs 0088+ |
| **Master Canon 0080** (Projection Manager, event→read-model/incremental/rebuild) | 🟡 `docs/master-canon/0080-*` · `mia-projection-core/` · live Event Store subscription 🟡 · docs 0088+ |
| **Master Canon 0081** (Saga Manager, long-running process orchestration/compensation) | 🟡 `docs/master-canon/0081-*` · `mia-saga-core/` · live saga type wiring 🟡 · docs 0088+ |
| **Master Canon 0082** (Workflow Engine, steps/decision/parallel/loop) | 🟡 `docs/master-canon/0082-*` · `mia-workflow-core/` · live workflow wiring 🟡 · docs 0088+ |
| **Master Canon 0083** (Rule Engine, evaluate/sets/priority/operators) | 🟡 `docs/master-canon/0083-*` · `mia-rule-core/` · live rule catalog 🟡 · docs 0088+ |
| **Master Canon 0084** (Policy Engine, scope/effect/inheritance) | 🟡 `docs/master-canon/0084-*` · `mia-policy-core/` · live policy catalog 🟡 · docs 0088+ |
| **Master Canon 0085** (Decision Engine Kernel, unify Rule/Policy/AI) | 🟡 `docs/master-canon/0085-*` · `mia-kernel-decision-core/` · live wiring 🟡 · docs 0088+ |
| **Master Canon 0086** (Orchestrator Engine, service coordination) | 🟡 `docs/master-canon/0086-*` · `mia-orchestrator-core/` · live wiring 🟡 · docs 0088+ |
| **Master Canon 0087** (Coordination Engine, lock/semaphore/barrier) | 🟡 `docs/master-canon/0087-*` · `mia-coordination-core/` · live wiring 🟡 · docs 0088+ |
| **Master Canon 0061** (State Manager, registry/transitions/event publish) | 🟡 `docs/master-canon/0061-*` · `mia-state-core/` · live wiring 🟡 |
| **Master Canon 0060** (Timer Engine, monotonic clock / task handoff) | 🟡 `docs/master-canon/0060-*` · `mia-timer-core/` · live wiring 🟡 |
| **Master Canon 0059** (Thread Manager, pools/sync/deadlock/starvation) | 🟡 `docs/master-canon/0059-*` · `mia-thread-core/` · live wiring 🟡 |
| Stream Engine (TikFinity → MIA → OBS) | 🟢 |
| Streamer.bot mimo tok | 🟢 nepoužívá se |
| Stream Mode runtime (MIA + Koj + OBS) | 🟢 |
| Gift mapa `shared/gifts/` (tier, overlay, voice, bowl, rewards, paměť, achievements + unlock moment, CARE, throttle) | 🟢 |
| Per-tier video rotace bez resetu | 🟢 |
| Speaker routing + response contract | 🟢 |
| Body ≠ coins v overlay | 🟢 |
| Spam session (community wave) + per-user ack throttle (anti-opakování) | 🟢 wave HUD v `combo-overlay.html` |
| Koj vitals, péče, batoh, duely/arena | 🟢 |
| Platform coin-žrouti (Tok/Stack/Bits/Kisstube) + battle choreografie | `MIA_KOJ_ROSTER.js`, `MIA_KOJ_BATTLE_CHOREOGRAPHY.js`, `forms/{platform}/*.png`, `arena-battle-overlay.html`; `npm run generate:platform-forms` | 🟢 |
| 2D grafická továrna Koj (projectile, arena, itemy, evoluce, multi-frame) | `generate_koj_2d_factory_gfx.js`, `koj:2d-audit` — **100 %** | 🟢 |
| **MIA Paint** (2D editor, Koj asset pipeline) | `mia-output-overlay/mia-paint/`, `routes/mia_paint.js`, `MIA_PAINT_BRIDGE.js`, `MIA_PAINT_WS.js` — HTTP + WS agent API | 🟢 mimo live stream tok |
| SHARE doména | 🟢 |
| Gift video T1–T5 + media katalog | 🟢 |
| Gift Economy T0–T6 (plná spec) | 🟢 coin/map/stream tierKinds + spamRewardTier (prahy = coin×7.5) |
| Runtime security (bind / ingest) | 🟢 `MIA_RUNTIME_SECURITY.js` |
| GAME_CONFIG napojen na MIA_GIFT_TIERS | 🟢 coin_to_points |
| TikTok data jen runtime / krátký cache | 🟡 ledger OK; gift-map-stats na disku |
| NEJSEM TU / AWAY režim | 🟢 scéna + host snapshot; virtuální svět 🔴 |
| Přesný gift user výpis (referenční SB) | 🟢 |
| Host systém + OBS Ninja | 🟡 team bar 🟢; Ninja scény 🟡 |
| Kapybara gift flow (20s → chat) | 🟢 |
| Control plane | `/health`, `/status`, `/gift-map/status`, `/startup/check`, `npm run smoke:live`, preflight | 🟢 |
| CARE chat + gift CARE + per-user care throttle + feeder paměť | 🟢 |
| Stream session PRELIVE → LIVE → ENDED + `/stream/session` | 🟢 `MIA_STREAM_SESSION.js` |
| Jednotná konfigurace (GAME_CONFIG vs tiers) | 🟢 `shared/stream_economy_config.json` |
| Routes extrahované z index.js (remote-dev, care, stream-session, status + 20 HTTP balíčků) | `routes/` · `registerAllRoutes()` | 🟢 |
| index.js runtime wiring (59× HOST + CTX, flat bindings → grouped host → flat ctx) | `scripts/MIA_*_HOST.js` · `scripts/MIA_*_CTX.js` · `collect*BindingsHost()` → `build*Host()` → `build*Ctx()` | 🟢 |
| Host team score bar (NEJSEM TU split) | 🟢 `entity-overlay.html` |
| Viewer strip overlay (recentParticipants) | 🟢 `viewer-strip-overlay.html` |
| Remote Dev Mode (telefon → fronta → watcher → Cursor) | 🟢 základ |
| MIA Paint (2D editor, agent API, WS sync) | 🟢 mimo stream tok |
| MIA Paint Tauri shell (Windows Ink, native dialogs) | 🟢 `npm run paint:tauri` · vyžaduje Rust |
| **MIA Graphics Studio** (2D Content Studio, agent pipeline API) | 🟢 Phase 12a–13z — live lip + visible speak faces |
| **MIA Animation Engine** (Animation Bank 2.0, sprite sheets, gift reaction) | `shared/mia-animation-engine/`, `assets/animation-bank/` (seed z **produkčních** `kojnozrout/moods`), `mia-animation-player.js`, `MIA_ANIMATION_REACTION.js` — Phase 13 | 🟢 bank + pack + OBS player + gift pipeline; procedural blob seed odstraněn |
| **Timeline / Keyframe / OBS export** (unified clock, editor UI, motion export, sound cues) | `timelineClock.js`, `timeline-editor.js`, `export_paint_to_animation_bank.js`, `mia-sound-cues.js` — Phase 14 | 🟢 |
| **Bone rig / IK / AI Motion / Lip sync** (bone overlay, 2-bone IK, procedural keyframes, viseme track) | `boneRig.js`, `LipSync.js`, `aiMotionCommands.js`, `cameraPresets.js` C1–C6, Phase 15 editor UI | 🟢 foundation |
| **Multi-angle bank export** (C1–C6 → Animation Bank, `cameraId` v manifestu, gift resolve by shot) | `export_paint_to_animation_bank.js`, `animationBankSchema.js`, Phase 16 | 🟢 |
| **Immersive Scene Engine** (AI director prostředí, combat creature shader, overlay compositor) | `shared/mia-scene-engine/`, `MIA_IMMERSIVE_SCENE.js`, `immersive-scene-overlay.html` — Phase 17 foundation | 🟡 |
| **Multi-cam matting** (6 slotů CAM_01–06, chroma/corner matting, streamer cutout v overlay) | `streamerCameraRig.js`, `mattingPipeline.js`, `MIA_STREAMER_MATTING.js` — Phase 18 | 🟢 foundation |
| **OBS matting ingest bridge** (MIA oči → GetSourceScreenshot → matte ingest, round-robin CAM sloty) | `MIA_MATTING_INGEST_BRIDGE.js`, `/mia/scene/matte/ingest/*` — Phase 19 | 🟢 |
| **OBS streamer camera rig setup** (auto MIA_CAM_02–06 + MIA_IMMERSIVE_SCENE browser overlay) | `MIA_OBS_STREAMER_CAMERAS.js`, `obsCameraLayout.js` — Phase 20 | 🟢 |
| **NDI camera discovery** (auto-map ndi_source → CAM_02..06) | `ndiDiscovery.js`, `obs_discover_ndi_cameras.js` — Phase 21 | 🟢 |
| **Příběhové oblouky videa** (cluster podobných videí → boss mise playback) | `MIA_STORY_ARC_REGISTRY.js`, `/media/narrative-arcs` | 🟢 |
| **Grafické reference Praha** (pouze animovaná pražská videa → avatar + stream grafika vzor) | `MIA_GRAPHIC_REFERENCE.js`, `/media/graphic-references` | 🟢 |
| **Boss mise Kojnožrout** (narrative arc → immersive combat + fáze videí + cinematic) | `MIA_BOSS_MISSION.js`, `/mia/boss-mission/*` — Phase 22 | 🟢 |
| **T2+ audio policy** (od T2 jen videa se zvukem — bublina místo Koj TTS) | `MIA_MEDIA_CATALOG.js` `TIERS_REQUIRING_AUDIO` | 🟢 |
| User Mode / personal assistant | 🔴 |
| STARK (Chrome profil + capture) | 🔴 |
| Třetí entita / plný CORE | 🔴 |
| Combat shader scéna | 🟡 Phase 17–19 — director + matting + OBS ingest bridge; ML depth 🔴 |
| Avatar generování za běhu (Canvas/WebM) | 🔴 |
| Sociální síť / cross-post / postprodukce | 🔴 |
| Tisíce streamerů / multi-tenant | 🔴 |



---



## §1 Hlavní vize — Stream vs User Mode



| Kánon | Codebase | Stav |

|-------|----------|------|

| **Stream Mode** — OBS, dárky, chat, moderace | `index.js`, shadow pipeline, video, TTS, overlay | 🟢 |

| **User Mode** — osobní asistent, profil, plánování | — | 🔴 mimo tento repozitář |



---



## §2 Identita — tři vrstvy



| Kánon | Codebase | Stav |

|-------|----------|------|

| **B. Stream Runtime** | `index.js`, shadow pipeline, overlaye, video, TTS | 🟢 |

| **C. Internal AI Coordination** | `MIA_ECOSYSTEM_ORCHESTRATOR.js`, `MIA_MULTI_AGENT_ECOSYSTEM.md` | 🟡 slot CORE existuje, není plná třetí entita |

| **A. Personal Assistant** | — | 🔴 mimo tento repozitář |



---



## §3 Tři AI entity



| Kánon | Implementace | Stav |

|-------|--------------|------|

| MIA = moderátor, hlavní hlas | `MIA_RESPONSE_ENGINE`, `MIA_PROACTIVE_HOST`, chat brain | 🟢 |

| MIA v NEJSEM TU = host | `MIA_AWAY_MODE.js`, `worldMode: nejsem_tu`, OBS scene switch | 🟢 virtuální svět GTA/Fortnite 🔴 |

| Koj = pet, ne hlavní řečník | `MIA_KOJNOZROUT_ENGINE`, speaker routing (Koj primary u giftu, MIA companion) | 🟢 |

| Koj vitals (hlad, nálada, miska) | `MIA_KOJNOZROUT_VITALS.js`, bowl overlay | 🟢 |

| Třetí entita | orchestrátor label `CORE`, bez vlastní UI/voice | 🔴 |



Detail Koj: [`KOJNOZROUT_KANON.md`](./KOJNOZROUT_KANON.md)



---



## §4 Stream Engine architektura



| Kánon | Implementace | Stav |

|-------|----------|------|

| TikFinity → MIA přímo | TikFinity webhook / `POST /ingest` | 🟢 |

| Streamer.bot mimo tok | nepoužíváme; dříve hlas scény + gift user výpis | 🟢 mimo provoz |

| MIA = mozek + hlas scény | `index.js`, `MIA_VOICE_CONTROL_LAYER`, `/voice/command` | 🟢 |

| OBS = render only | Browser sources, `MIA_VIDEO_ENGINE` bindMedia; logika v Node | 🟢 |

| OBS WebSocket scény | `MIA_VIDEO_ENGINE`, OBS scripts | 🟢 |

| OBS resilience (pád → auto-recovery) | `MIA_OBS_WATCHDOG.js` (relaunch po pádu procesu), `MIA_OBS_SCENE_GUARD.js` (boot varování na mrtvé cesty), `BrowserHWAccel=false` proti CEF pádům na slabém APU | 🟢 |

| Control plane | `/health`, `/status`, `/startup/check`, 30 preflight suites | 🟢 diagnostika; licence/update 🔴 |

| Gift metadata jako dříve SB | `normalize_event.js`, `MIA_GIFT_USER_LEDGER.js`, `/overlay-state` → `recentGifts` | 🟢 |



**Aktuální tok:**

```

TikFinity / Kick → /ingest (localhost nebo `MIA_INGEST_SECRET`) → normalize → shadow pipeline → gift presentation orchestrator → action → overlay/TTS/video → OBS

Overlays ← polling `/overlay-state`

```

**Poznámka:** Streamer.bot nebyl hlavní router — data jdou rovnou do MIA. SB sloužil jen hlasovému přepínání scén a měl kvalitní výpis gift uživatelů z TikToku.



---



## §5 Data z TikToku



| Kánon | Implementace | Stav |

|-------|----------|------|

| Povolená pole (userId, nick, avatar, gift…) | `normalize_event.js`, ingest payload | 🟢 |

| Jen runtime + krátký cache | session memory, chat lexicon, backpack runtime | 🟡 perzistence Koj světa v JSON |

| Žádné dlouhodobé DB | žádná SQL/NoSQL vrstva | 🟢 pro TikTok eventy |

| Gift value ne v overlay | `scripts/MIA_SUPPORT_RESOLVER.js`, `MIA_GIFT_TIERS.js`, overlay bez cen | 🟢 |



---



## §6 Video rotace a tiery



| Kánon | Implementace | Stav |

|-------|----------|------|

| Rotace T1_01→02→03→04 | `MIA_VIDEO_ENGINE`, OBS source pool | 🟢 |

| Vlastní index per tier | `rotationIndexByTier` | 🟢 |

| Bez resetu při T1→T3→T1 | index per tier, ne globální | 🟢 |

| T4, T5, PROFILE sloty | `MIA_CONFIG`, media katalog | 🟢 rozšíření nad kánon T1–T3 |

| Dlouhé audio >60s hraje celé | `resolveGiftVideoTiming`, `waitForMediaEnd` | 🟢 |



Soubory: `MIA_VIDEO_ENGINE.js`, `MIA_MEDIA_CATALOG.js`, `tests/video_timing_contract.js`



---



## §7 Avatar Engine



| Kánon | Implementace | Stav |

|-------|--------------|------|

| Browser Source + Canvas | Koj runtime HTML, overlay browser sources | 🟡 Koj sprite, ne generativní avatar |

| WebM VP9 Alpha | gift videa, některé overlay assety | 🟡 |

| Dynamicky z avatarUrl/nick/gift | `pickProfileForUser`, donator spotlight | 🟡 statické fotky |

| Bez databáze | runtime pick z poolu | 🟢 |



---



## §8 Hostitelský systém



| Kánon | Implementace | Stav |

|-------|----------|------|

| HOST scéna per streamer | `SPINAK_NEJSEM_TU`, `MIA_OBS_AWAY_SCENE.js`, `obs:apply-away-scene` | 🟢 auto vytvoření scény + overlay vrstvy; video smyčka ručně |

| OBS Ninja připojení | `MIA_OBS_NINJA_URL`, `hostPanel.ninjaEmbedUrl` | 🟢 embed v overlay; manuální Ninja room setup |

| Připojit/odpojit hosta | voice `/voice/command`, ecosystem orchestrátor | 🟡 |

| Paralelní duely (2 streamy) | `MIA_KOJNOZROUT_DUEL.js` cross-stream sync | 🟡 duel model OK, host scéna na obou streamech ne ověřeno v repu |

| Aktivace hlasem/botem | `MIA_VOICE_CONTROL_LAYER`, ingest commands | 🟢 |



---



## §9 AWAY / NEJSEM TU



| Kánon | Implementace | Stav |

|-------|----------|------|

| Speciální scéna + video smyčka | `MIA_OBS_AWAY_LOOP.js`, `away-loop-overlay.html`, `media:generate-away-loop` | 🟢 |

| Overlay statistiky | community status, viewer strip, host panel | 🟢 entity + viewer-strip + host-mode-overlay |

| Po dárku: číst komentář + odpovědět | proactive host, chat brain | 🟡 částečně, ne vázané na konkrétní gift tier |

| Virtuální svět GTA/Fortnite | — | 🔴 |



Env / voice: `MIA_ECOSYSTEM_ENABLED`, `MIA_VOICE_CONTROL_LAYER`.



---



## §10 Gift animace a Kapybara

| Kánon | Implementace | Stav |
|-------|--------------|------|
| Gift Map metadata per gift | `shared/gifts/` → tier, overlay, bowl/care, voice, priority video, XP, achievements, **rewards → batoh**; legacy profile pro animace | 🟢 |
| Varianty podle Koj nálady | `resolveVariantIndex` + 100 sprite variant + `MIA_GIFT_ANIMATION_CONTEXT` | 🟢 mood + care/neglect/bowl/primaryNeed |
| Varianty podle péče komunity | — | 🔴 |
| Kapybara → pet_react animace | `animal_small`, `pet_react` | 🟢 |
| Kapybara 20s → wait chat → AI | `MIA_CAPYBARA_FLOW.js` — gift chat loop, default **jen AWAY** (`MIA_GIFT_CHAT_LOOP=away_only`) | 🟢 |
| Gift visual compose | `MIA_GIFT_PRESENTATION` + visual/story post-gift | 🟢 |

**Cíl:** každý gift × (Koj mood × care stav) → jiná animace/scéna; Kapybara navíc chat loop v AWAY.

---



## §11 STARK + bezpečnost runtime



| Kánon | Implementace | Stav |

|-------|----------|------|

| Chrome profil MIA_STARK + Window Capture | — | 🔴 |

| Bind localhost, ingest secret | `MIA_RUNTIME_SECURITY.js`, `MIA_BIND_HOST` | 🟢 |

| Debug routes jen localhost | `MIA_DEBUG_ROUTES=off` | 🟢 |

| Media catalog mutace jen localhost | `localAdminGuard` na `/media/catalog/*` | 🟢 |

| MIA neukládá hesla | žádné credential store v agentovi | 🟢 |

| Login mimo stream | provozní pravidlo | 🟢 |



---



## §12 User Mode a sociální vrstva



| Kánon | Implementace | Stav |

|-------|----------|------|

| Účet, profil, kontext per user | session memory, backpack per nick | 🟡 stream-scope, ne plný User Mode |

| Feed, příspěvky, interakce | — | 🔴 |

| Cross-post MIA→TikTok→IG→FB | — | 🔴 |

| AI postprodukce (highlighty, titulky) | — | 🔴 |



---



## §14 Speaker routing



| Pořadí kánonu | Implementace | Stav |

|---------------|--------------|------|

| 1 Intent + anti-fallback | `MIA_CHAT_BRAIN.js`, `isGenericResponse`, text banky, LLM guard | 🟢 |

| 2 Response contract | `speech_text` / `overlay_text` v `MIA_RESPONSE_ENGINE` | 🟢 |

| 3 Koj avatar | `kojnozrout-runtime.html`, vitals sprite | 🟢 |

| 4 MIA TTS | Edge TTS, `MIA_VOICE` OBS source | 🟢 |

| 5 Koj voice | `MIA_SPEAKER_ROUTING`, Antonín neural | 🟢 |



Voice-first: bublina se skrývá při TTS (`MIA_SPEAKER_ROUTING`, voice priority lock).

Výběr bubliny: `speech-overlay.html` `pickActiveOverlay` řadí kandidáty (`miaOverlay`/`kojnozoutOverlay`) podle **priority desc → updatedAt desc**, takže support overlay (priorita 5–6) nepřebije novější nízkoprioritní chatter (3); vyšší priorita rovněž prolomí zapíchnutý pin. Regrese hlídá `tests/overlay_layout_contract.js`.



---



## §15 Overlay pravidla



| Kánon | Implementace | Stav |

|-------|----------|------|

| Overlay ≠ doslovný hlas | Gift s hudbou → bublina, TTS potlačen | 🟢 |

| Stejný intent | Intent v `overlayPayload.meta` | 🟢 |

| Fronta při voice lock | `MIA_OVERLAY_QUEUE`, flush po TTS | 🟢 |

| Gift prezentace jednou cestou | `MIA_GIFT_PRESENTATION.js` — combo / speech / visual / story | 🟢 |

| OBS overlay manifest | 13 kanonických rolí (`MIA_OBS_HANDS`); aliasy OK; extra `CHAT_OVERLAY` mimo manifest | 🟢 |



---



## §16 Hlavní stream scéna



| Kánon | Implementace | Stav |

|-------|----------|------|

| Streamer = hlavní (kamera) | `NOTEBOOK_CAMERA` v OBS | 🟢 |

| Koj trvale v rohu | `kojnozrout-runtime.html` bottom-right | 🟢 |

| MIA doprovází | Proactive host, chat, community status | 🟢 |

| Gift scéna | `SPINAK_ENGINE_GIFTS` — gift sloty | 🟢 |



---



## §17 Battle systém



| Kánon | Implementace | Stav |

|-------|----------|------|

| Fan avatary jen prezentace | `viewer-strip-overlay`, donator spotlight | 🟢 |

| Ne bojové video scény | Gift videa ≠ combat | 🟢 |

| Realtime shader combat | — | 🔴 |

| Duely | `MIA_KOJNOZROUT_DUEL.js` — bodový závod týmů | 🟢 |



---



---

## § Gift Economy (T0–T6)

Plná spec: [`MIA_GIFT_ECONOMY.md`](./MIA_GIFT_ECONOMY.md)

| Kánon | Implementace | Stav |
|-------|--------------|------|
| T0 interakce → XP + overlay + flyby | `MIA_T0_ENGAGEMENT.js`, `t0-flyby-overlay.html` | 🟢 |
| T1–T3 coin rozsah → video tier | `MIA_GIFT_TIERS.js` + resolver + `obsTier` (T6→T5 video) | 🟢 |
| T4 Boss / T5 Mega / T6 Legenda | combo flash + boss speech + T5+ `MIA_BOSS_CINEMATIC` (`boss-cinematic-overlay.html`, hero PNG) | 🟢 signature cinematic overlay; full video cutscéna 🔴 |
| Gift Map = význam + animace | `shared/gifts/` řídí streamTier/obsTier + overlay text; voice/queue consumers 🟡 | 🟢 |
| XP 1 coin = 1 XP (vize) | `support.xp` = coins (+ streak bonus) | 🟢 |
| Gift Level Lv1–8 | `MIA_GIFT_SUPPORTER_PROFILE.js` runtime | 🟢 |
| COMBO ×10/50/100 | `MIA_COMBO_OVERLAY.js` + gift orchestrator | 🟢 |
| Gift streak bonus | supporter profile streak days | 🟢 runtime |
| Team points + duel power | `MIA_KOJNOZROUT_DUEL.js`, animovaný power bar | 🟢 |
| Host team split | `MIA_HOST_TEAM_POINTS.js` (host mod) | 🟢 |
| Coin tier konstanty | `MIA_GIFT_TIERS.js` (single source) | 🟢 |
| Support resolver | `scripts/MIA_SUPPORT_RESOLVER.js` (`legacy/` = shim) | 🟢 |
| Overlay bez coinů | support resolver, overlay policy | 🟢 |
| Resolved gift context JSON | `support.giftContext` | 🟢 |

---

## §18 Body systém



| Kánon | Implementace | Stav |

|-------|----------|------|

| Overlay: profil, nick, body, platforma | Viewer strip, entity overlay | 🟢 |

| Nikdy coins / hodnota giftu | `support.miaPoints`, overlay bez cen | 🟢 |

| Interní body | `MIA_SUPPORT_RESOLVER`, `supportIndex` | 🟢 |



---



## §19 Inventář



| Kánon | Implementace | Stav |

|-------|----------|------|

| Batoh per user | `MIA_KOJNOZROUT_BACKPACK.js`, `/overlay-state` | 🟢 |

| OBS batoh overlay | `kojnozrout-backpack-overlay.html` (polling backpack.display) | 🟢 |

| Otevření: `item`, `batoh`, `položka` | `MIA_KOJNOZROUT_ITEM_COMMAND.js` | 🟢 |

| `batoh use` / `položka use` | stejný parser, prefix aliasy | 🟢 |

| Fronta více uživatelů | Item queue v item command | 🟢 |

| Item v duelu | `item use boost` v duel flow | 🟢 |

| Inventář přímo do chatu | — | 🔴 budoucnost |



---



## §20 SHARE systém



| Kánon | Implementace | Stav |

|-------|----------|------|

| Oddělené `shared/next*` | `shared/next_action/`, `share_runtime_bridge.js` | 🟢 |

| Režimy single/repeat/streak/milestone/wave | `share_text_bank.js`, decision engine | 🟢 |

| Speaker: MIA standard, Koj velká událost | Share action builder, actor roles | 🟢 |



---



## §21 Entity-first (budoucnost)



| Kánon | Implementace | Stav |

|-------|----------|------|

| `runtime_execution_*` | `shared/runtime_execution/` | 🟢 |

| `system_entities_*` / `user_entities_*` | částečně orchestrátor | 🟡 |

| Tisíce streamerů, pluginy, API | single-tenant runtime v repu | 🔴 |



---



## §22 Vizuální styl



| Kánon | Implementace | Stav |

|-------|----------|------|

| Neon / Prstitel Team | Overlay CSS, gift visual, `evolution-toast-overlay.html` | 🟢 směr; centralizovaný design system 🔴 |

| MIA = přiznaná AI (holografická projekce) | `speech-overlay.html` `#miaHolo` (scanline/flicker/glitch/beam), `assets/mia/hologram.png` | 🟢 |
| MIA body vrstvy v OBS (Graphics Studio) | `mia-body-part-overlay.html`, `MIA_HEAD`…`MIA_TORSO` — **defaultně skryté**; assety `assets/mia/parts/` (ne CSS crop masters); live avatar = `#miaHolo` v `MIA_SPEECH` | 🟢 |

### Graphics Body pipeline (Phase 12g–12u) + AI anim (12v)

| Vrstva | Implementace | Stav |
|--------|--------------|------|
| OBS split vrstvy + manifest | `bodyPartsCatalog.js`, `MIA_OBS_LIVE_MANIFEST.js`, `MIA_OBS_HANDS.js` | 🟢 |
| Body publish API | `GET/POST /mia/graphics/body/*`, `bodyPartState.js` | 🟢 |
| Client sync režimy | `mia-body-part-runtime.js` — `?sync=graphics` / `?sync=hybrid` | 🟢 |
| Live mirror | `bodyLiveSync.js` ← `MIA_OVERLAY_PUBLIC_RESPONSE.js` | 🟢 |
| OBS hybrid bootstrap | `npm run obs:apply-hands` → `MIA_OBS_BODY_SYNC.js` | 🟢 |
| Dashboard preview | `mia-streamer-dashboard.html` + `bodyPreviewCommands.js` | 🟢 |
| OBS auto visibility | `MIA_OBS_BODY_PREVIEW.js` (WebSocket) | 🟢 |
| T3+ gift timed moment | `MIA_BODY_GIFT_MOMENT.js` ← `MIA_GIFT_MEDIA_RUNTIME.js` | 🟢 |
| Animation → body mood | `bodyAnimationSync.js` ← `animationReaction` v `/overlay-state` | 🟢 |
| OBS verify body layers | `verifyGraphicsBodyLayers` v `MIA_OBS_VERIFY.js` — `obs:verify-stream-ready` | 🟢 |
| Live audit body API | `bodyLiveAudit.js` + `audit:live` → `graphics_body_state`, `overlay_state_no_coins` | 🟢 |
| Stream-ready auto-fix | `resolveHandsBodySyncMode` → `obs:stream-ready --fix` + `/system/obs-hands` hybrid URL | 🟢 |
| Dedicated body-part assets | `assets/mia/parts/{head,eyes,hands,torso,feet}` + `npm run build:mia-body-parts` | 🟢 |
| AI 2D anim + true alpha | `aiAnimationCommands.js`, `mia-paint-ai/trueAlpha.js` — `/mia/graphics/ai/animation/generate` | 🟢 |
| Promote AI → Animation Bank | `promoteAiAnimation.js` — quality `ai`/`procedural`; live sheets jen po `mark-production` + confirm | 🟢 |
| Operator bank preview | `bankPreview.js` + dashboard Animation Bank — `studioPreview` sheets; live gift path nedotčen | 🟢 |
| Known-gift override (12y) | `giftOverride` + confirm — production clip beats `GIFT_ANIMATION_IDS` (rose/heart/…) | 🟢 |
| Production gate (12z) | `productionGate.js` — blokuje procedural/low-alpha; staging list + dashboard promote | 🟢 |
| Visual identity lock (13a) | `visualIdentity.js` — cyan #00DCFF holo prompt/palette pro AI/procedural; bank preview + body sync | 🟢 |
| Unified studio preview (13b) | bank sheet + body mood + optional OBS; dashboard Preview body+Koj | 🟢 |
| OBS body revive (13c) | portrait transform 1080×1920 + refreshnocache body/speech při preview | 🟢 |
| Composed body layout (13d) | per-part OBS transform + preview head-first (eyes jen při řeči) | 🟢 |
| Hero body portrait (13e) | jedna `MIA_HEAD` nad bublinou; speech `#miaHolo` se ztlumí při hero | 🟢 |
| Voice revive (13f) | `npm run obs:revive-voice` · dashboard Oživit hlas · autoplay unlock v `mia-voice-overlay` | 🟢 |
| Voice anti-echo (13g) | Desktop Audio mute při Monitor+Output — konec dvojitého hlasu | 🟢 |
| Voice single authority | Jen `MIA_VOICE` hraje TTS; hub/legacy muted; client localStorage lock; speech ignoruje `meta.voiceMirror` (žádné druhé bliknutí bubliny) | 🟢 |
| Hero true-alpha (13h) | `build:mia-body-parts --force` — flood matte + soft fringe + 88% padding | 🟢 |
| Paint AI ↔ timeline (13i) | Paint `Generovat animaci` → `import_animation_frames` → → Bank | 🟢 |
| Dashboard AI generate (13j) | Dashboard generate → staging → Paint `?aiStaging=` · `GET /mia/animation/staging/:id` | 🟢 |
| Paint → staging write-back (13k) | Paint `→ Staging` · sheet rebuild · dashboard thumb · promote bere polish | 🟢 |
| Staging studio preview (13l) | Dashboard Preview staging → Koj + body/OBS · `/assets/mia-ai-staging/` · ne live | 🟢 |
| Staging GIF/WEBM (13m) | `POST …/encode` · dashboard GIF/WEBM download · bez cloud video AI | 🟢 |
| Operator polish (13n) | Docs sync · Paint True Alpha/MP4 · production checklist soft gates | 🟢 |
| Character motion + identity (13o) | hair_eyes/blink/breath/nod/sway · `build:mia-body-parts --identity` | 🟢 |
| Timeline + combo maturity (13p) | onion default · scrub snap · ease · `head/combo.png` | 🟢 |
| Timeline pro UX (13q) | onion ghosts + depth · easing inspector · bone IK drag | 🟢 |
| AI / video quality (13r) | staging MP4 + playback · temporal seed/ref/blend | 🟢 |
| Body + assemble (13s) | crop polish · combo master · `POST /mia/animation/assemble` | 🟢 |
| Assemble v2 (13t) | gap/hold · audio mux · ＋ selected UX | 🟢 |
| Lip audio + bone deform (13u) | Lip♪ amplitude visemes · tip deformScale | 🟢 |
| Whisper lip + mesh warp (13v) | Whisper STT → viseme · amplitude fallback · skewX/Y | 🟢 |
| Live viseme speech (13w) | voicePlayback.lipTrack → speak/01–04 na `#miaHolo` | 🟢 |
| Live audio lip (13x) | TTS MP3 amplitude upgrade · client AudioContext fallback | 🟢 |
| Body speak lip parity (13y) | MIA_EYES ← lipTrack · body state publish · hybrid refresh | 🟢 |
| Visible speak faces (13z) | speak-lip face crops · speak-face zoom · soft glitch | 🟢 |
| Test shortcut | `npm run test:graphics-body` (až 13z) + `npm run test:animation-engine` (12w–12z) | 🟢 |

**Tvrdá pravidla:** overlay nikdy neexpozuje coins; body vrstvy na live **nejsou** trvalý avatar — efemérní WOW (preview / T3+ gift), default skryté ve scéně.

| Fan/follower avatar (jen prezentace) | viewer strip `default-follower.png` fallback, dynamicky z `avatarUrl` | 🟢 |

| MIA oči — AWAY smyčka + overlay verify | `scanAwayScene`, `/mia/eyes/away`, `obs:apply-away-eyes` | 🟢 |
| MIA oči — webcam bez signálu skrytá | `MIA_EYES.syncWebcamVisibility` (luminance screenshot → hide/show) | 🟢 |
| MIA oči — Koj overlay self-check (záměr + propriocepce + zrak) | `scripts/mia_visual_self_check.js`, `/mia/koj/render-report`, `analyzePngBase64Coverage` | 🟢 |
| MIA oči — celozobrazový self-check (VŠECHNY overlaye: mimo obraz, překryvy, velikost, blank, blikání) | `scripts/MIA_DISPLAY_VISION.js`, `/mia/display/self-check`, `scripts/mia_display_self_check.js`, propriocepce bubliny `/mia/speech/render-report` | 🟢 |
| MIA řízená prohlídka — spustí všechny funkce, MIA se podívá zrakem, uloží učení | `npm run mia:walkthrough` → `generated/walkthrough/MIA_WALKTHROUGH_LEARNED.md` | 🟢 |

| Kojnožrout — vícepozicová animace (skutečný pohyb, ne klouzání) | `scripts/kojnozrout_pose_frames.js` → auto `assets/kojnozrout/pose-catalog.js` (jediný zdroj cyklů); runtime `poseFramePlayer`; wander jen u `CALM_WANDER_MOODS`; walk-a/b jen u `WANDER_WALK_FRAME_MOODS`; **248 snímků** | 🟢 |
| Kojnožrout — normalizace snímků (nohy na baseline, střed na 768) | `scripts/kojnozrout_normalize_frames.js` (sharp/libvips: trim → bottom-center, airborne lift); odstraňuje horizontální klouzání a poskakování nohou mezi framy; záloha `_prenorm_backup`; `npm run normalize:frames` | 🟢 |
| Public `/overlay-state` nikdy neexpozuje coins/hodnotu giftů | `scripts/MIA_OVERLAY_PUBLIC_RESPONSE.js` `stripValueFieldsForPublic()` na hranici API (giftValue/coins/totalCoins/rawValue…), zachová `miaPoints`/`giftCount` | 🟢 |
| HTTP routy v `routes/` (20 balíčků, `registerAllRoutes`) | `routes/index.js` + doménové handlery; `index.js` tenký bootstrap + `init*Runtime()` / `*Runtime()` gettery | 🟢 |
| Ingest orchestrace mimo monolit | `scripts/MIA_EVENT_PIPELINE.js` + fáze v `scripts/pipeline/` · `MIA_EVENT_CONTEXT` · `MIA_COMMAND_REGISTRY` · `MIA_INGEST_QUEUE` (3 lane) | 🟢 |
| OBS connection bootstrap | `scripts/MIA_OBS_BOOTSTRAP.js` — connect/reconnect/health/maintenance; `index.js` `initObsBootstrapRuntime()` / `obsBootstrapRuntime()` | 🟢 |
| OBS overlay sync (browser URL/layout/hands/refresh) | `scripts/MIA_OBS_OVERLAY_SYNC.js` — `initObsOverlaySyncCoreRuntime()`; tenké wrappery přes `initObsOverlaySyncRuntime()` | 🟢 |
| Server entrypoint | `server.js` → `scripts/MIA_SERVER_BOOTSTRAP.js`; `index.js` `initServerBootstrapRuntime()` / `serverBootstrapRuntime()` | 🟢 |
| Runtime periodic loops | `scripts/MIA_RUNTIME_LOOPS.js` — bowl/capybara/proactive host/duel/eyes/matting; `initRuntimeLoopsRuntime()` | 🟢 |
| Delivery runtime (overlay/voice/gift/video) | `scripts/MIA_DELIVERY_RUNTIME.js` — `createDeliveryRuntime()`; overlay queue, TTS, gift presentation | 🟢 |
| Platform bridges (Kick/Twitch/Telegram) | `scripts/MIA_PLATFORM_BRIDGES.js` — `createPlatformBridges()`; `bootstrapPlatformBridges()` po routes | 🟢 |
| Gift economy runtime | `scripts/MIA_GIFT_RUNTIME.js` — enrich context, gift map ingest, presentation plan | 🟢 |
| Gift media experiences | `scripts/MIA_GIFT_MEDIA_RUNTIME.js` — visual compose, animation reaction, post-gift stories | 🟢 |
| Story feed runtime | `scripts/MIA_STORY_FEED_RUNTIME.js` — milestone story delivery after feed events | 🟢 |
| Participant runtime | `scripts/MIA_PARTICIPANT_RUNTIME.js` — viewer strip / recentParticipants | 🟢 |
| World mode runtime | `scripts/MIA_WORLD_MODE_RUNTIME.js` — away/host world mode transitions | 🟢 |
| Startup overlay runtime | `scripts/MIA_STARTUP_OVERLAY_RUNTIME.js` — startup check slide, preflight-on-start, boot overlay | 🟢 |
| Health runtime | `scripts/MIA_HEALTH_RUNTIME.js` — `/health` and `/diagnose` payload builders | 🟢 |
| OBS post-connect runtime | `scripts/MIA_OBS_POST_CONNECT_RUNTIME.js` — `bootstrapObsAfterConnect` chain | 🟢 |
| Route context factory | `scripts/MIA_ROUTE_CONTEXT.js` — `buildMiaRouteContext` + `resetOverlayState` | 🟢 |
| Overlay state runtime | `scripts/MIA_OVERLAY_STATE_RUNTIME.js` — `setOverlay`, cache invalidation | 🟢 |
| Vision context runtime | `scripts/MIA_VISION_CONTEXT_RUNTIME.js` — `buildVisionContext` for OBS vision | 🟢 |
| Status runtime | `scripts/MIA_STATUS_RUNTIME.js` — `buildMiaStatusResponse` | 🟢 |
| Translation delivery runtime | `scripts/MIA_TRANSLATION_RUNTIME.js` — bilingual interpreter (chat/mic) | 🟢 |
| Showcase voice runtime | `scripts/MIA_SHOWCASE_RUNTIME.js` — `speakMiaShowcaseLine` (koj state showcase) | 🟢 |
| OBS safe call | `scripts/MIA_OBS_SAFE_CALL.js` — throttled `safeObsCall` + screenshot aliases; `initObsSafeCallRuntime()` | 🟢 |
| Boss mission runtime | `scripts/MIA_BOSS_MISSION_RUNTIME.js` — `tryAutoBossMissionFromGift` (T5/T6 auto arc) | 🟢 |
| Voice timing | `scripts/MIA_VOICE_TIMING.js` — `voiceHoldUntilTs` (TTS hold window); `initVoiceTimingRuntime()` | 🟢 |
| Showcase command runtime | `scripts/MIA_SHOWCASE_COMMAND_RUNTIME.js` — koj/streamer showcase chat commands | 🟢 |
| Route context deps | `scripts/MIA_ROUTE_CONTEXT_DEPS.js` — `buildRouteContextDeps` (voice/duel bridges) | 🟢 |
| Streamer media runtime | `scripts/MIA_STREAMER_MEDIA_RUNTIME.js` — `tryHandleStreamerMediaCommand` | 🟢 |
| Capybara flow runtime | `scripts/MIA_CAPYBARA_FLOW_RUNTIME.js` — wait prompt + waiting comment handler | 🟢 |
| Solo stream runtime | `scripts/MIA_SOLO_STREAM_RUNTIME.js` — OBS scene sync + proactive host moments | 🟢 |
| World layer runtime | `scripts/MIA_WORLD_LAYER_RUNTIME.js` — `applyWorldLayer` (backpack/duel/arena/rewards) | 🟢 |
| Runtime state runtime | `scripts/MIA_RUNTIME_STATE_RUNTIME.js` — `applyRuntimeStateImpact` + `scheduleWorldSave` | 🟢 |
| Event pipeline wiring | `scripts/MIA_EVENT_PIPELINE_WIRING.js` — `buildEventPipelineDeps` / `createEventPipelineApi` | 🟢 |
| Action builder runtime | `scripts/MIA_ACTION_BUILDER_RUNTIME.js` — chat/support action build + normalize | 🟢 |
| Koj moments runtime | `scripts/MIA_KOJ_MOMENTS_RUNTIME.js` — care quest, evolution, duel peer sync | 🟢 |
| Ingest utils runtime | `scripts/MIA_INGEST_UTILS_RUNTIME.js` — chat feed + support/community extractors | 🟢 |
| Overlay public wiring | `scripts/MIA_OVERLAY_PUBLIC_WIRING.js` — `/overlay-state` public response factory | 🟢 |
| Care commands wiring | `scripts/MIA_CARE_COMMANDS_WIRING.js` — koj care command handler factory | 🟢 |
| Route context ctx | `scripts/MIA_ROUTE_CONTEXT_CTX.js` — grouped host → flat route deps | 🟢 |
| Pipeline summary runtime | `scripts/MIA_PIPELINE_SUMMARY_RUNTIME.js` — ingest/shadow summary recorders | 🟢 |
| Event pipeline ctx | `scripts/MIA_EVENT_PIPELINE_CTX.js` — grouped host → flat pipeline deps | 🟢 |
| Ingest HTTP wiring | `scripts/MIA_INGEST_HTTP_WIRING.js` — lazy `/ingest` handler factory | 🟢 |
| Debug routes runtime | `scripts/MIA_DEBUG_ROUTES_RUNTIME.js` — synthetic comment/gift debug routes | 🟢 |
| Overlay public ctx | `scripts/MIA_OVERLAY_PUBLIC_CTX.js` — grouped host → flat overlay-public deps | 🟢 |
| Care commands ctx | `scripts/MIA_CARE_COMMANDS_CTX.js` — grouped host → flat care-command deps | 🟢 |
| Stream state runtime | `scripts/MIA_STREAM_STATE_RUNTIME.js` — session, ledger, mapping, streamState accessors | 🟢 |
| OBS overlay sync runtime | `scripts/MIA_OBS_OVERLAY_SYNC_RUNTIME.js` — thin delegating wrappers around overlay sync API | 🟢 |
| OBS overlay sync ctx | `scripts/MIA_OBS_OVERLAY_SYNC_CTX.js` — grouped host → flat overlay sync deps | 🟢 |
| Delivery ctx | `scripts/MIA_DELIVERY_CTX.js` — grouped host → flat delivery runtime deps | 🟢 |
| Status ctx | `scripts/MIA_STATUS_CTX.js` — grouped host → flat status runtime deps | 🟢 |
| Platform bridges ctx | `scripts/MIA_PLATFORM_BRIDGES_CTX.js` — grouped host → flat platform bridge deps | 🟢 |
| Route context host | `scripts/MIA_ROUTE_CONTEXT_HOST.js` — flat bindings → grouped route host | 🟢 |
| index.js HOST layer (59 wiring domén, waves 61–70) | `scripts/MIA_*_HOST.js` — každá runtime doména: `collect*BindingsHost()` (flat z `index.js`) → `build*Host()` (grouped) → `build*Ctx()` (flat pro factory); contract: `tests/*_ctx_contract.js` + `tests/media_command_hosts_contract.js`; `MIA_PROACTIVE_HOST.js` = feature modul mimo wiring | 🟢 |
| Output policy host | `scripts/MIA_OUTPUT_POLICY_HOST.js` | 🟢 |
| Arena battle demo host | `scripts/MIA_ARENA_BATTLE_DEMO_HOST.js` | 🟢 |
| Overlay timing host | `scripts/MIA_OVERLAY_TIMING_HOST.js` | 🟢 |
| Voice priority host | `scripts/MIA_VOICE_PRIORITY_HOST.js` | 🟢 |
| Overlay queue host | `scripts/MIA_OVERLAY_QUEUE_HOST.js` | 🟢 |
| OBS overlay renderer host | `scripts/MIA_OBS_OVERLAY_RENDERER_HOST.js` | 🟢 |
| OBS overlay sync wrappers host | `scripts/MIA_OBS_OVERLAY_SYNC_WRAPPERS_HOST.js` | 🟢 |
| Boss mission host | `scripts/MIA_BOSS_MISSION_HOST.js` | 🟢 |
| Ingest deduper host | `scripts/MIA_INGEST_DEDUPER_HOST.js` | 🟢 |
| Voice timing host | `scripts/MIA_VOICE_TIMING_HOST.js` | 🟢 |
| Matting ingest bridge host | `scripts/MIA_MATTING_INGEST_BRIDGE_HOST.js` | 🟢 |
| Vision context host | `scripts/MIA_VISION_CONTEXT_HOST.js` | 🟢 |
| OBS vision host | `scripts/MIA_OBS_VISION_HOST.js` | 🟢 |
| Voice layer host | `scripts/MIA_VOICE_LAYER_HOST.js` | 🟢 |
| Runtime loops ctx | `scripts/MIA_RUNTIME_LOOPS_CTX.js` — grouped host → flat runtime loops deps | 🟢 |
| Translation ctx | `scripts/MIA_TRANSLATION_CTX.js` — grouped host → flat translation runtime deps | 🟢 |
| Gift runtime ctx | `scripts/MIA_GIFT_RUNTIME_CTX.js` — grouped host → flat gift runtime deps | 🟢 |
| Koj moments ctx | `scripts/MIA_KOJ_MOMENTS_CTX.js` — grouped host → flat koj moments deps | 🟢 |
| Health ctx | `scripts/MIA_HEALTH_CTX.js` — grouped host → flat health runtime deps | 🟢 |
| Showcase ctx | `scripts/MIA_SHOWCASE_CTX.js` — grouped host → flat showcase runtime deps | 🟢 |
| Capybara flow ctx | `scripts/MIA_CAPYBARA_FLOW_CTX.js` — grouped host → flat capybara flow deps | 🟢 |
| Solo stream ctx | `scripts/MIA_SOLO_STREAM_CTX.js` — grouped host → flat solo stream deps | 🟢 |
| World layer ctx | `scripts/MIA_WORLD_LAYER_CTX.js` — grouped host → flat world layer deps | 🟢 |
| Boss mission ctx | `scripts/MIA_BOSS_MISSION_CTX.js` — grouped host → flat boss mission deps | 🟢 |
| World mode ctx | `scripts/MIA_WORLD_MODE_CTX.js` — grouped host → flat world mode deps | 🟢 |
| Showcase command ctx | `scripts/MIA_SHOWCASE_COMMAND_CTX.js` — grouped host → flat showcase command deps | 🟢 |
| Streamer media ctx | `scripts/MIA_STREAMER_MEDIA_CTX.js` — grouped host → flat streamer media deps | 🟢 |
| Runtime state ctx | `scripts/MIA_RUNTIME_STATE_CTX.js` — grouped host → flat runtime state deps | 🟢 |
| Action builder ctx | `scripts/MIA_ACTION_BUILDER_CTX.js` — grouped host → flat action builder deps | 🟢 |
| Ingest utils ctx | `scripts/MIA_INGEST_UTILS_CTX.js` — grouped host → flat ingest utils deps | 🟢 |
| Pipeline summary ctx | `scripts/MIA_PIPELINE_SUMMARY_CTX.js` — grouped host → flat pipeline summary deps | 🟢 |
| Startup overlay ctx | `scripts/MIA_STARTUP_OVERLAY_CTX.js` — grouped host → flat startup overlay deps | 🟢 |
| OBS post-connect ctx | `scripts/MIA_OBS_POST_CONNECT_CTX.js` — grouped host → flat OBS post-connect deps | 🟢 |
| OBS bootstrap ctx | `scripts/MIA_OBS_BOOTSTRAP_CTX.js` — grouped host → flat OBS bootstrap deps | 🟢 |
| OBS safe call ctx | `scripts/MIA_OBS_SAFE_CALL_CTX.js` — grouped host → flat OBS safe-call deps | 🟢 |
| Voice timing ctx | `scripts/MIA_VOICE_TIMING_CTX.js` — grouped host → flat voice timing deps | 🟢 |
| Story feed ctx | `scripts/MIA_STORY_FEED_CTX.js` — grouped host → flat story feed deps | 🟢 |
| Gift media ctx | `scripts/MIA_GIFT_MEDIA_CTX.js` — grouped host → flat gift media deps | 🟢 |
| Participant ctx | `scripts/MIA_PARTICIPANT_CTX.js` — grouped host → flat participant deps | 🟢 |
| Vision context ctx | `scripts/MIA_VISION_CONTEXT_CTX.js` — grouped host → flat vision context deps | 🟢 |
| Overlay state ctx | `scripts/MIA_OVERLAY_STATE_CTX.js` — grouped host → flat overlay state deps | 🟢 |
| Ingest HTTP ctx | `scripts/MIA_INGEST_HTTP_CTX.js` — grouped host → flat ingest HTTP deps | 🟢 |
| Debug routes ctx | `scripts/MIA_DEBUG_ROUTES_CTX.js` — grouped host → flat debug routes deps | 🟢 |
| Stream state ctx | `scripts/MIA_STREAM_STATE_CTX.js` — grouped host → flat stream state deps | 🟢 |
| Server bootstrap ctx | `scripts/MIA_SERVER_BOOTSTRAP_CTX.js` — grouped host → flat server bootstrap deps | 🟢 |
| Video engine ctx | `scripts/MIA_VIDEO_ENGINE_CTX.js` — grouped host → flat video engine deps | 🟢 |
| MIA eyes ctx | `scripts/MIA_MIA_EYES_CTX.js` — grouped host → flat MIA eyes deps | 🟢 |
| Overlay state cache ctx | `scripts/MIA_OVERLAY_STATE_CACHE_CTX.js` — grouped host → flat overlay cache deps | 🟢 |
| Ingest deduper ctx | `scripts/MIA_INGEST_DEDUPER_CTX.js` — grouped host → flat ingest deduper deps | 🟢 |
| OBS vision ctx | `scripts/MIA_OBS_VISION_CTX.js` — grouped host → flat OBS vision deps | 🟢 |
| Overlay timing ctx | `scripts/MIA_OVERLAY_TIMING_CTX.js` — grouped host → flat overlay timing deps | 🟢 |
| Overlay queue ctx | `scripts/MIA_OVERLAY_QUEUE_CTX.js` — grouped host → flat overlay queue deps | 🟢 |
| Voice priority ctx | `scripts/MIA_VOICE_PRIORITY_CTX.js` — grouped host → flat voice priority deps | 🟢 |
| TTS engine ctx | `scripts/MIA_TTS_ENGINE_CTX.js` — grouped host → flat TTS engine deps | 🟢 |
| Voice control layer ctx | `scripts/MIA_VOICE_CONTROL_LAYER_CTX.js` — grouped host → flat voice control deps | 🟢 |
| Interpreter ctx | `scripts/MIA_INTERPRETER_CTX.js` — grouped host → flat MIA_TRANSLATE interpreter deps | 🟢 |
| Matting ingest bridge ctx | `scripts/MIA_MATTING_INGEST_BRIDGE_CTX.js` — grouped host → flat matting bridge deps | 🟢 |
| OBS overlay renderer ctx | `scripts/MIA_OBS_OVERLAY_RENDERER_CTX.js` — grouped host → flat OBS renderer deps | 🟢 |
| Runtime state seed ctx | `scripts/MIA_RUNTIME_STATE_SEED_CTX.js` — grouped host → initial world/state seed deps | 🟢 |
| Output policy ctx | `scripts/MIA_OUTPUT_POLICY_CTX.js` — grouped host → flat output policy deps | 🟢 |
| OBS watchdog ctx | `scripts/MIA_OBS_WATCHDOG_CTX.js` — grouped host → flat OBS watchdog deps | 🟢 |
| Arena battle demo ctx | `scripts/MIA_ARENA_BATTLE_DEMO_CTX.js` — grouped host → flat arena demo deps | 🟢 |
| Runtime security ctx | `scripts/MIA_RUNTIME_SECURITY_CTX.js` — grouped host → runtime security guard wiring | 🟢 |
| Spam session ctx | `scripts/MIA_SPAM_SESSION_CTX.js` — grouped host → flat spam session config deps | 🟢 |
| OBS overlay sync wrappers ctx | `scripts/MIA_OBS_OVERLAY_SYNC_WRAPPERS_CTX.js` — grouped host → OBS overlay sync wrapper deps | 🟢 |
| Shadow fallback | `MIA_NEXT/engine_shadow_runtime.js` `resolvePipelineAction()` — volá `phase_decide` | 🟢 |
| Prezentace plán | `scripts/MIA_PRESENTATION_PLAN.js` — strukturovaný overlay/voice/video plán v `phase_present` | 🟢 |
| `/overlay-state` GET je side-effect-free | `MIA_OVERLAY_STATE.js` gettery peek-only, expirace centralizovaná v `pruneExpiredEphemeral()` (žádná mutace při čtení / výpočtu cache klíče) | 🟢 |



---



## §23 Vývojová disciplína



| Pravidlo | V repu |

|----------|--------|

| Audit před změnou | `npm run audit:canon`, `audit:live`, `test:preflight`, `obs:stream-ready` |

| Contract testy | `tests/*_contract.js`, smoke testy |

| Ne rozbit funkční flow | Shadow pipeline + speaker routing testy |



---



## Co je **shodné** (shrnutí pro agenta)



Tyto body kánonu **už platí v kódu** — neměnit bez důvodu:



1. OBS jen renderuje; rozhodování v Node agentovi.  

2. TikFinity → MIA `/ingest` přímo; Streamer.bot se nepoužívá.  

3. MIA + Kojnožrout jako dvě entity se speaker routingem.  

4. Response contract: oddělený speech a overlay text.  

5. Overlay neukazuje coins; body = `miaPoints`.  

6. Video rotace per tier (`rotationIndexByTier`), bez resetu mezi tiery.  

7. Koj vpravo dole, vitals, miska, péče, batoh, `item` / `batoh` / `položka`.  

8. Gift support: Koj primary voice, MIA companion u vyšších tierů/milníků.  

9. SHARE větev oddělená od legacy community.  

10. Duely = body týmů, ne deathmatch video.  

11. Ingest z TikFinity/Kick na `/ingest` (localhost nebo secret header).

12. Gift presentation orchestrator — jedna cesta combo/speech/visual/story.

13. Tier konstanty v `MIA_GIFT_TIERS.js`; resolver v `scripts/MIA_SUPPORT_RESOLVER.js`.



---



## Mezery (priorita dalšího vývoje)



1. ~~**Kapybara flow**~~ — hotovo: `MIA_CAPYBARA_FLOW.js`.  

2. ~~**Sprint A–D stabilizace**~~ — security, gift orchestrator, resolver/tiers, docs + `.env.example`.  

3. **HOST + OBS Ninja** — scény per streamer, připojení hosta, paralelní duely na dvou streamech.  

4. **NEJSEM TU rozšíření** — gift-triggered chat loop vázaný na tier; virtuální svět.  

5. **User Mode + sociální vrstva + cross-post** — nové produkty mimo stream runtime.  

6. **STARK** — Chrome profil + Window Capture integrace.  

7. **Multi-tenant scale** — tisíce streamerů, pluginy, API.  

8. **Virtual Camera / TikTok audio cesta** — 🟡 `obs:prepare-tiktok`, `obs:verify-stream-ready`, `obs:stream-ready`; VB-Cable v `.env.example`.



---



## Provozní nástroje (Sprinty E–I)



| Nástroj | Účel | Stav |

|---------|------|------|

| `npm run obs:verify-stream-ready` | OBS diagnostika: VC, gift sloty, 13 browser rolí, voice | 🟢 |

| `npm run obs:stream-ready` | MIA readiness % + OBS verify jedním příkazem před live | 🟢 |
| `npm run obs:stream-ready -- --human` | Čitelný go-live report pro streamera | 🟢 |
| `npm run live:prep` | Sekvenční příprava: restart → VC → voice → verify | 🟢 |
| OBS Vision (sledování + auto-layout) | `MIA_OBS_VISION`, `/mia/vision`, vision dashboard | 🟢 |
| `npm run restart` | Stop + spawn + čekání na `/health` (`MIA_RESTART_HEALTH_MS`) | 🟢 |

| `npm run obs:apply-hands` | CLI OBS ruce — doplní chybějící browser overlay | 🟢 |

| `MIA_SELF_RESTART` | Auto-restart po rukou / media apply / audit `--fix` | 🟢 |

| Startup slide | `%` připravenosti bez preflight testů (`MIA_PREFLIGHT_ON_START=0`) | 🟢 |

| `POST /system/obs-hands`, `/system/restart` | Localhost admin API | 🟢 |



---



## Stabilizační checklist před větší změnou



```powershell

npm run obs:stream-ready

npm run audit:live

npm run test:preflight

node tests/speaker_routing_contract.js

node tests/video_timing_contract.js

node tests/kojnozout_item_care_contract.js

npm run restart

```



Smoke: `http://127.0.0.1:3000/tts/test`, `http://127.0.0.1:3000/video/test?tier=T1`

