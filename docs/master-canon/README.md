# MIA Master Canon

Ústavní série dokumentů projektu MIA. **Nejvyšší priorita** — žádný jiný dokument ani kód nesmí být v rozporu s Master Canonem.

## Hierarchie dokumentace

| Úroveň | Dokument | Účel |
|--------|----------|------|
| **1 — Ústava** | `docs/master-canon/0001-*.md` | Proč MIA existuje, principy, rozsah, definice hotovo |
| **2 — Operační kánon** | `docs/KANON_MIA_AGENT.md` | Runtime architektura, entity, stream tok |
| **3 — Současný stav** | `docs/KANON_SOUCASNY_PREHLED.md` | Co běží teď (1 stránka) |
| **4 — Soulad s kódem** | `docs/KANON_MIA_ALIGNMENT.md` | 🟢/🟡/🔴 mapa implementace |
| **5 — Doménové kánony** | `docs/KOJNOZROUT_KANON.md`, `docs/MIA_GIFT_ECONOMY.md`, … | Detail jedné oblasti |

Při rozporu platí vyšší úroveň. Rozdíl mezi dokumentací a kódem se zaznamená v alignment mapě a řeší se cíleně (upravit kód nebo dokument).

## Registr dokumentů

| ID | Název | Verze | Stav | Alignment |
|----|-------|-------|------|-----------|
| **0001** | [Prohlášení projektu MIA (Project Constitution)](./0001-project-constitution.md) | 1.0 | Platný | [0001-alignment.md](./0001-alignment.md) |
| **0002** | [Definice entity (Entity Definition)](./0002-entity-definition.md) | 1.0 | Platný | [0002-alignment.md](./0002-alignment.md) |
| **0003** | [Definice události (Event Definition)](./0003-event-definition.md) | 1.0 | Platný | [0003-alignment.md](./0003-alignment.md) |
| **0004** | [Definice komponenty (Component Definition)](./0004-component-definition.md) | 1.0 | Platný | [0004-alignment.md](./0004-alignment.md) |
| **0005** | [Architektonické vrstvy (Module, Service, Engine, System)](./0005-architecture-layers.md) | 1.0 | Platný | [0005-alignment.md](./0005-alignment.md) |
| **0006** | [Architektura platformy MIA (Platform Architecture)](./0006-platform-architecture.md) | 1.0 | Platný | [0006-alignment.md](./0006-alignment.md) |
| **0007** | [Core System – Jádro platformy MIA](./0007-core-system.md) | 1.0 | Platný | [0007-alignment.md](./0007-alignment.md) |
| **0008** | [Runtime Manager – Správce běhu platformy](./0008-runtime-manager.md) | 1.0 | Platný | [0008-alignment.md](./0008-alignment.md) |
| **0009** | [Lifecycle Manager – Správa životního cyklu](./0009-lifecycle-manager.md) | 1.0 | Platný | [0009-alignment.md](./0009-alignment.md) |
| **0010** | [Event Bus – Komunikační páteř platformy](./0010-event-bus.md) | 1.0 | Platný | [0010-alignment.md](./0010-alignment.md) |
| **0011** | [Event Gateway – Vstupní brána událostí](./0011-event-gateway.md) | 1.0 | Platný | [0011-alignment.md](./0011-alignment.md) |
| **0012** | [Event Validator – Validace událostí](./0012-event-validator.md) | 1.0 | Platný | [0012-alignment.md](./0012-alignment.md) |
| **0013** | [Event Registry – Centrální registr událostí](./0013-event-registry.md) | 1.0 | Platný | [0013-alignment.md](./0013-alignment.md) |
| **0014** | [Event Router – Směrování událostí](./0014-event-router.md) | 1.0 | Platný | [0014-alignment.md](./0014-alignment.md) |
| **0015** | [Priority Manager – Řízení priorit událostí](./0015-priority-manager.md) | 1.0 | Platný | [0015-alignment.md](./0015-alignment.md) |
| **0016** | [Queue Manager – Správa front událostí](./0016-queue-manager.md) | 1.0 | Platný | [0016-alignment.md](./0016-alignment.md) |
| **0017** | [Event Dispatcher – Doručování událostí](./0017-event-dispatcher.md) | 1.0 | Platný | [0017-alignment.md](./0017-alignment.md) |
| **0018** | [Monitoring System – Dohled nad platformou MIA](./0018-monitoring-system.md) | 1.0 | Platný | [0018-alignment.md](./0018-alignment.md) |
| **0019** | [Memory System – Architektura paměti MIA](./0019-memory-system.md) | 1.0 | Platný | [0019-alignment.md](./0019-alignment.md) |
| **0020** | [Working Memory – Pracovní paměť MIA](./0020-working-memory.md) | 1.0 | Platný | [0020-alignment.md](./0020-alignment.md) |
| **0021** | [Short-Term Memory – Krátkodobá paměť MIA](./0021-short-term-memory.md) | 1.0 | Platný | [0021-alignment.md](./0021-alignment.md) |
| **0022** | [Long-Term Memory – Dlouhodobá paměť MIA](./0022-long-term-memory.md) | 1.0 | Platný | [0022-alignment.md](./0022-alignment.md) |
| **0023** | [Episodic Memory – Paměť událostí a vzpomínek](./0023-episodic-memory.md) | 1.0 | Platný | [0023-alignment.md](./0023-alignment.md) |
| **0024** | [Semantic Memory – Paměť znalostí a faktů](./0024-semantic-memory.md) | 1.0 | Platný | [0024-alignment.md](./0024-alignment.md) |
| **0025** | [Procedural Memory – Paměť dovedností a postupů](./0025-procedural-memory.md) | 1.0 | Platný | [0025-alignment.md](./0025-alignment.md) |
| **0026** | [Emotional Memory – Emoční paměť MIA](./0026-emotional-memory.md) | 1.0 | Platný | [0026-alignment.md](./0026-alignment.md) |
| **0027** | [Knowledge Graph – Centrální graf znalostí a vztahů MIA](./0027-knowledge-graph.md) | 1.0 | Platný | [0027-alignment.md](./0027-alignment.md) |
| **0028** | [Decision Engine – Rozhodovací mozek MIA](./0028-decision-engine.md) | 1.0 | Platný | [0028-alignment.md](./0028-alignment.md) |
| **0029** | [Action Orchestrator – Orchestrace akcí platformy MIA](./0029-action-orchestrator.md) | 1.0 | Platný | [0029-alignment.md](./0029-alignment.md) |
| **0030** | [Goal Management System – Správa cílů MIA](./0030-goal-management-system.md) | 1.0 | Platný | [0030-alignment.md](./0030-alignment.md) |
| **0031** | [Planning Engine – Strategické plánování MIA](./0031-planning-engine.md) | 1.0 | Platný | [0031-alignment.md](./0031-alignment.md) |
| **0032** | [Emotion Engine – Emoční řídicí systém MIA](./0032-emotion-engine.md) | 1.0 | Platný | [0032-alignment.md](./0032-alignment.md) |
| **0033** | [Personality Engine – Systém osobnosti MIA](./0033-personality-engine.md) | 1.0 | Platný | [0033-alignment.md](./0033-alignment.md) |
| **0034** | [Conversation Engine – Komunikační systém MIA](./0034-conversation-engine.md) | 1.0 | Platný | [0034-alignment.md](./0034-alignment.md) |
| **0035** | [Speech Engine – Hlasový systém MIA](./0035-speech-engine.md) | 1.0 | Platný | [0035-alignment.md](./0035-alignment.md) |
| **0036** | [Animation Engine – Centrální animační systém MIA](./0036-animation-engine.md) | 1.0 | Platný | [0036-alignment.md](./0036-alignment.md) |
| **0037** | [Visual Rendering System – Renderovací systém MIA](./0037-visual-rendering-system.md) | 1.0 | Platný | [0037-alignment.md](./0037-alignment.md) |
| **0038** | [OBS Integration Layer – Integrační vrstva OBS Studio](./0038-obs-integration-layer.md) | 1.0 | Platný | [0038-alignment.md](./0038-alignment.md) |
| **0039** | [Battle Engine – Systém soubojů MIA](./0039-battle-engine.md) | 1.0 | Platný | [0039-alignment.md](./0039-alignment.md) |
| **0040** | [Inventory Engine – Inventář a systém předmětů MIA](./0040-inventory-engine.md) | 1.0 | Platný | [0040-alignment.md](./0040-alignment.md) |
| **0041** | [Economy Engine – Ekonomický systém MIA](./0041-economy-engine.md) | 1.0 | Platný | [0041-alignment.md](./0041-alignment.md) |
| **0042** | [Quest & Progression Engine – Systém úkolů a dlouhodobého postupu MIA](./0042-quest-progression-engine.md) | 1.0 | Platný | [0042-alignment.md](./0042-alignment.md) |
| **0043** | [Achievement Engine – Systém úspěchů, titulů a ocenění MIA](./0043-achievement-engine.md) | 1.0 | Platný | [0043-alignment.md](./0043-alignment.md) |
| **0044** | [Community Engine – Sociální systém komunity MIA](./0044-community-engine.md) | 1.0 | Platný | [0044-alignment.md](./0044-alignment.md) |
| **0045** | [World Engine – Správa světa MIA](./0045-world-engine.md) | 1.0 | Platný | [0045-alignment.md](./0045-alignment.md) |
| **0046** | [Story Engine – Narativní systém MIA](./0046-story-engine.md) | 1.0 | Platný | [0046-alignment.md](./0046-alignment.md) |
| **0047** | [NPC & Character Engine – Systém postav a autonomních bytostí MIA](./0047-npc-character-engine.md) | 1.0 | Platný | [0047-alignment.md](./0047-alignment.md) |
| **0048** | [Creature Evolution Engine – Evoluce Kojnožroutů a modulární herní ekosystém](./0048-creature-evolution-engine.md) | 1.0 | Platný | [0048-alignment.md](./0048-alignment.md) |
| **0049** | [Plugin & Module Engine – Univerzální systém modulů MIA](./0049-plugin-module-engine.md) | 1.0 | Platný | [0049-alignment.md](./0049-alignment.md) |
| **0050** | [MIA Core Kernel – Layer 0](./0050-mia-core-kernel.md) | 1.0.0 | Platný | [0050-alignment.md](./0050-alignment.md) |
| **0051** | [Boot Manager – Kernel Layer 0](./0051-boot-manager.md) | 1.0.0 | Platný | [0051-alignment.md](./0051-alignment.md) |
| **0052** | [Startup Sequence Manager – Kernel Layer 0](./0052-startup-sequence-manager.md) | 1.0.0 | Platný | [0052-alignment.md](./0052-alignment.md) |
| **0053** | [Service Manager – Kernel Layer 0](./0053-service-manager.md) | 1.0.0 | Platný | [0053-alignment.md](./0053-alignment.md) |
| **0054** | [Dependency Manager – Kernel Layer 0](./0054-dependency-manager.md) | 1.0.0 | Platný | [0054-alignment.md](./0054-alignment.md) |
| **0055** | [Configuration Manager – Kernel Layer 0](./0055-configuration-manager.md) | 1.0.0 | Platný | [0055-alignment.md](./0055-alignment.md) |
| **0056** | [Resource Manager – Kernel Layer 0](./0056-resource-manager.md) | 1.0.0 | Platný | [0056-alignment.md](./0056-alignment.md) |
| **0057** | [Process Manager � Kernel Layer 0](./0057-process-manager.md) | 1.0.0 | Platn� | [0057-alignment.md](./0057-alignment.md) |
| **0058** | [Task Scheduler � Kernel Layer 0](./0058-task-scheduler.md) | 1.0.0 | Platn� | [0058-alignment.md](./0058-alignment.md) |
| **0059** | [Thread Manager — Kernel Layer 0](./0059-thread-manager.md) | 1.0.0 | Platný | [0059-alignment.md](./0059-alignment.md) |
| **0060** | [Timer Engine – Kernel Layer 0](./0060-timer-engine.md) | 1.0.0 | Platný | [0060-alignment.md](./0060-alignment.md) |
| **0061** | [State Manager - Kernel Layer 0](./0061-state-manager.md) | 1.0.0 | Platny | [0061-alignment.md](./0061-alignment.md) |
| **0062** | [Runtime Manager – Kernel Layer 0](./0062-runtime-manager.md) | 1.0.0 | Platný | [0062-alignment.md](./0062-alignment.md) |
| **0063** | [Lifecycle Manager – Kernel Layer 0](./0063-lifecycle-manager.md) | 1.0.0 | Platný | [0063-alignment.md](./0063-alignment.md) |
| **0064** | [Health Manager – Kernel Layer 0](./0064-health-manager.md) | 1.0.0 | Platný | [0064-alignment.md](./0064-alignment.md) |
| **0065** | [Recovery Manager – Kernel Layer 0](./0065-recovery-manager.md) | 1.0.0 | Platný | [0065-alignment.md](./0065-alignment.md) |
| **0066** | [Watchdog Engine – Kernel Layer 0](./0066-watchdog-engine.md) | 1.0.0 | Platný | [0066-alignment.md](./0066-alignment.md) |
| **0067** | [Fault Manager – Kernel Layer 0](./0067-fault-manager.md) | 1.0.0 | Platný | [0067-alignment.md](./0067-alignment.md) |
| **0068** | [Safe Mode Manager – Kernel Layer 0](./0068-safe-mode-manager.md) | 1.0.0 | Platný | [0068-alignment.md](./0068-alignment.md) |
| **0069** | [Shutdown Manager – Kernel Layer 0](./0069-shutdown-manager.md) | 1.0.0 | Platný | [0069-alignment.md](./0069-alignment.md) |
| **0070** | [Diagnostics Manager – Kernel Layer 0](./0070-diagnostics-manager.md) | 1.0.0 | Platný | [0070-alignment.md](./0070-alignment.md) |
| **0071** | [Logging Manager – Kernel Layer 0](./0071-logging-manager.md) | 1.0.0 | Platný | [0071-alignment.md](./0071-alignment.md) |
| **0072** | [Metrics Manager – Kernel Layer 0](./0072-metrics-manager.md) | 1.0.0 | Platný | [0072-alignment.md](./0072-alignment.md) |
| **0073** | [Alert Manager – Kernel Layer 0](./0073-alert-manager.md) | 1.0.0 | Platný | [0073-alignment.md](./0073-alignment.md) |
| **0074** | [Audit Manager – Kernel Layer 0](./0074-audit-manager.md) | 1.0.0 | Platný | [0074-alignment.md](./0074-alignment.md) |
| **0075** | [Event Store Manager – Kernel Layer 0](./0075-event-store-manager.md) | 1.0.0 | Platný | [0075-alignment.md](./0075-alignment.md) |
| **0076** | [Event Bus Manager – Kernel Layer 0](./0076-event-bus-manager.md) | 1.0.0 | Platný | [0076-alignment.md](./0076-alignment.md) |
| **0077** | [Message Queue Manager – Kernel Layer 0](./0077-message-queue-manager.md) | 1.0.0 | Platný | [0077-alignment.md](./0077-alignment.md) |
| **0078** | [Command Bus Manager – Kernel Layer 0](./0078-command-bus-manager.md) | 1.0.0 | Platný | [0078-alignment.md](./0078-alignment.md) |
| **0079** | [Query Bus Manager – Kernel Layer 0](./0079-query-bus-manager.md) | 1.0.0 | Platný | [0079-alignment.md](./0079-alignment.md) |
| **0080** | [Projection Manager – Kernel Layer 0](./0080-projection-manager.md) | 1.0.0 | Platný | [0080-alignment.md](./0080-alignment.md) |
| **0081** | [Saga Manager – Kernel Layer 0](./0081-saga-manager.md) | 1.0.0 | Platný | [0081-alignment.md](./0081-alignment.md) |
| **0082** | [Workflow Engine – Kernel Layer 0](./0082-workflow-engine.md) | 1.0.0 | Platný | [0082-alignment.md](./0082-alignment.md) |
| **0083** | [Rule Engine – Kernel Layer 0](./0083-rule-engine.md) | 1.0.0 | Platný | [0083-alignment.md](./0083-alignment.md) |
| **0084** | [Policy Engine – Kernel Layer 0](./0084-policy-engine.md) | 1.0.0 | Platný | [0084-alignment.md](./0084-alignment.md) |
| **0085** | [Decision Engine – Kernel Layer 0](./0085-decision-engine.md) | 1.0.0 | Platný | [0085-alignment.md](./0085-alignment.md) |
| **0086** | [Orchestrator Engine – Kernel Layer 0](./0086-orchestrator-engine.md) | 1.0.0 | Platný | [0086-alignment.md](./0086-alignment.md) |
| **0087** | [Coordination Engine – Kernel Layer 0](./0087-coordination-engine.md) | 1.0.0 | Platný | [0087-alignment.md](./0087-alignment.md) |
| **0088** | Telemetry Manager | — | Plánováno | — |

## Legenda souladu (§8)

| Symbol | Význam |
|--------|--------|
| ✅ | Implementováno a v souladu |
| 🟡 | Částečně implementováno |
| ❌ | Chybí / mimo scope tohoto repa |

## Ověření

```powershell
node tests/mia_master_canon_0001_contract.js
node tests/mia_master_canon_0002_contract.js
node tests/mia_master_canon_0003_contract.js
node tests/mia_master_canon_0006_contract.js
node tests/mia_master_canon_0007_contract.js
node tests/mia_master_canon_0008_contract.js
node tests/mia_master_canon_0009_contract.js
node tests/mia_master_canon_0010_contract.js
node tests/mia_master_canon_0011_contract.js
node tests/mia_master_canon_0012_contract.js
node tests/mia_master_canon_0013_contract.js
node tests/mia_master_canon_0014_contract.js
node tests/mia_master_canon_0015_contract.js
node tests/mia_master_canon_0016_contract.js
node tests/mia_master_canon_0017_contract.js
node tests/mia_master_canon_0018_contract.js
node tests/mia_master_canon_0019_contract.js
node tests/mia_master_canon_0020_contract.js
node tests/mia_master_canon_0021_contract.js
node tests/mia_master_canon_0022_contract.js
node tests/mia_master_canon_0023_contract.js
node tests/mia_master_canon_0024_contract.js
node tests/mia_master_canon_0025_contract.js
node tests/mia_master_canon_0026_contract.js
node tests/mia_master_canon_0027_contract.js
node tests/mia_master_canon_0028_contract.js
node tests/mia_master_canon_0029_contract.js
node tests/mia_master_canon_0030_contract.js
node tests/mia_master_canon_0031_contract.js
node tests/mia_master_canon_0032_contract.js
node tests/mia_master_canon_0033_contract.js
node tests/mia_master_canon_0034_contract.js
node tests/mia_master_canon_0035_contract.js
node tests/mia_master_canon_0036_contract.js
node tests/mia_master_canon_0037_contract.js
node tests/mia_master_canon_0038_contract.js
node tests/mia_master_canon_0039_contract.js
node tests/mia_master_canon_0040_contract.js
node tests/mia_master_canon_0041_contract.js
node tests/mia_master_canon_0042_contract.js
node tests/mia_master_canon_0043_contract.js
node tests/mia_master_canon_0044_contract.js
node tests/mia_master_canon_0045_contract.js
node tests/mia_master_canon_0046_contract.js
node tests/mia_master_canon_0047_contract.js
node tests/mia_master_canon_0048_contract.js
node tests/mia_master_canon_0049_contract.js
node tests/mia_master_canon_0050_contract.js
node tests/mia_master_canon_0051_contract.js
node tests/mia_master_canon_0052_contract.js
node tests/mia_master_canon_0053_contract.js
node tests/mia_master_canon_0054_contract.js
node tests/mia_master_canon_0055_contract.js
node tests/mia_master_canon_0056_contract.js
node tests/mia_master_canon_0057_contract.js
node tests/mia_master_canon_0058_contract.js
node tests/mia_master_canon_0059_contract.js
node tests/mia_master_canon_0060_contract.js
node tests/mia_master_canon_0061_contract.js
node tests/mia_master_canon_0062_contract.js
node tests/mia_master_canon_0063_contract.js
node tests/mia_master_canon_0064_contract.js
node tests/mia_master_canon_0065_contract.js
node tests/mia_master_canon_0066_contract.js
node tests/mia_master_canon_0067_contract.js
node tests/mia_master_canon_0068_contract.js
node tests/mia_master_canon_0069_contract.js
node tests/mia_master_canon_0070_contract.js
node tests/mia_master_canon_0071_contract.js
node tests/mia_master_canon_0072_contract.js
node tests/mia_master_canon_0073_contract.js
node tests/mia_master_canon_0074_contract.js
node tests/mia_master_canon_0075_contract.js
node tests/mia_master_canon_0076_contract.js
node tests/mia_master_canon_0077_contract.js
node tests/mia_master_canon_0078_contract.js
node tests/mia_master_canon_0079_contract.js
node tests/mia_master_canon_0080_contract.js
node tests/mia_master_canon_0081_contract.js
node tests/mia_master_canon_0082_contract.js
node tests/mia_master_canon_0083_contract.js
node tests/mia_master_canon_0084_contract.js
node tests/mia_master_canon_0085_contract.js
node tests/mia_master_canon_0086_contract.js
node tests/mia_master_canon_0087_contract.js
npm run test:preflight:fast
```

Technická kotva entity: `shared/mia-entity-core/`  
Technická kotva událostí: `shared/mia-event-core/`  
Technická kotva komponent: `shared/mia-component-core/`  
Technická kotva architektury: `shared/mia-architecture-core/`  
Technická kotva Core: `shared/mia-core-canon/`  
Technická kotva monitoringu: `shared/mia-monitoring-core/`  
Technická kotva paměti: `shared/mia-memory-core/`  
Technická kotva rozhodování: `shared/mia-decision-core/`  
Technická kotva orchestrace: `shared/mia-action-core/`  
Technická kotva cílů: `shared/mia-goal-core/`  
Technická kotva plánování: `shared/mia-planning-core/`  
Technická kotva emocí: `shared/mia-emotion-core/`  
Technická kotva osobnosti: `shared/mia-personality-core/`  
Technická kotva konverzace: `shared/mia-conversation-core/`  
Technická kotva řeči: `shared/mia-speech-core/`  
Technická kotva animací: `shared/mia-animation-core/`  
Technická kotva renderingu: `shared/mia-render-core/`  
Technická kotva OBS: `shared/mia-obs-core/`  
Technická kotva Battle: `shared/mia-battle-core/`  
Technická kotva inventáře: `shared/mia-inventory-core/`  
Technická kotva ekonomiky: `shared/mia-economy-core/`  
Technická kotva progrese: `shared/mia-progression-core/`  
Technická kotva achievementů: `shared/mia-achievement-core/`  
Technická kotva komunity: `shared/mia-community-core/`  
Technická kotva světa: `shared/mia-world-core/`  
Technická kotva příběhu: `shared/mia-story-core/`  
Technická kotva postav: `shared/mia-character-core/`  
Technická kotva evoluce: `shared/mia-creature-core/`  
Technická kotva modulů: `shared/mia-module-core/`  
Technická kotva Kernelu: `shared/mia-kernel-core/`  
Technická kotva Boot: `shared/mia-boot-core/`  
Technická kotva Startup: `shared/mia-startup-core/`  
Technická kotva Service: `shared/mia-service-core/`  
Technická kotva Dependency: `shared/mia-dependency-core/`
Technická kotva Configuration: `shared/mia-configuration-core/`
Technická kotva Resource: `shared/mia-resource-core/`
Technická kotva Process: `shared/mia-process-core/`
Technická kotva Scheduler: `shared/mia-scheduler-core/`
Technická kotva Thread: `shared/mia-thread-core/`
Technická kotva Timer: `shared/mia-timer-core/`
Technická kotva State: `shared/mia-state-core/`
Technická kotva Runtime: `shared/mia-runtime-core/`
Technická kotva Lifecycle: `shared/mia-lifecycle-core/`
Technická kotva Health: `shared/mia-health-core/`
Technická kotva Recovery: `shared/mia-recovery-core/`
Technická kotva Watchdog: `shared/mia-watchdog-core/`  
Technická kotva Fault: `shared/mia-fault-core/`  
Technická kotva Safe Mode: `shared/mia-safe-mode-core/`
Technická kotva Shutdown: `shared/mia-shutdown-core/`
Technická kotva Diagnostics: `shared/mia-diagnostics-core/`
Technická kotva Logging: `shared/mia-logging-core/`
Technická kotva Metrics: `shared/mia-metrics-core/`
Technická kotva Alert: `shared/mia-alert-core/`
Technická kotva Audit: `shared/mia-audit-core/`
Technická kotva Event Store: `shared/mia-event-store-core/`
Technická kotva Event Bus: `shared/mia-event-bus-core/`
Technická kotva Message Queue: `shared/mia-message-queue-core/`
Technická kotva Command Bus: `shared/mia-command-bus-core/`
Technická kotva Query Bus: `shared/mia-query-bus-core/`
Technická kotva Projection: `shared/mia-projection-core/`
Technická kotva Saga: `shared/mia-saga-core/`
Technická kotva Workflow: `shared/mia-workflow-core/`
Technická kotva Rule: `shared/mia-rule-core/`
Technická kotva Policy: `shared/mia-policy-core/`
Technická kotva Kernel Decision: `shared/mia-kernel-decision-core/`
Technická kotva Orchestrator: `shared/mia-orchestrator-core/`
Technická kotva Coordination: `shared/mia-coordination-core/`

## Pravidlo dokončení (z 0001 §7)

Funkce je hotová teprve když je **implementována**, **otestována**, **zdokumentována** a **odpovídá Master Canonu**.
