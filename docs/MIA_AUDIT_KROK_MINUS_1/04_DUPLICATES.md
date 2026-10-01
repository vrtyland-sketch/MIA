# MIA AUDIT KROK -1 — Možné duplicity

> Pouze markování — bez návrhů na sloučení.

## Souhrn

| Typ | Počet skupin |
|-----|-------------|
| Stejný basename (JS, first-party) | 15 |
| Stejný basename (vše, top-40 scan) | dominuje `.tmp-audit/` (LOG 543×, LOCK 543×, metadata.json 441×) |
| First-party assety (poster.png) | 57× v `mia-output-overlay/generated/gift-animations/` |
| Paralelní moduly (legacy vs active) | viz sekce 2 |
| Edge profily v .tmp-audit | ano — duplicitní browser cache |

## 1. Duplicitní basename (JS)


### `action_builder.js` (2 výskytů)

- `archive/deprecated/code/MIA_NEXT/action/action_builder.js`
- `shared/platform_runtime/action_builder.js`

### `core_contracts_normalized_event.js` (2 výskytů)

- `archive/deprecated/code/MIA_NEXT/core_contracts_normalized_event.js`
- `shared/platform_runtime_contracts/core_contracts_normalized_event.js`

### `decision_engine.js` (2 výskytů)

- `archive/deprecated/code/MIA_NEXT/decision/decision_engine.js`
- `shared/platform_runtime_rules/decision_engine.js`

### `index.js` (96 výskytů)

- `archive/deprecated/code/shared-aggregate/index.js`
- `core/index.js`
- `engine2/composition/index.js`
- `engine2/event-applicator/index.js`
- `engine2/event-bus-stub/index.js`
- `engine2/game-state/index.js`
- `engine2/gamestate-stub/index.js`
- `engine2/index.js`
- `engine2/obs-router-boundary/index.js`
- `engine2/overlay-profiles/index.js`
- `engine2/platform-projection/index.js`
- `engine2/platform-renderer/index.js`
- `engine2/plugin-loader/index.js`
- `engine2/visibility-engine/index.js`
- `game/hello/index.js`
- `index.js`
- `ingest/index.js`
- `output/index.js`
- `routes/index.js`
- `shared/gifts/index.js`
- `shared/mia-achievement-core/index.js`
- `shared/mia-action-core/index.js`
- `shared/mia-alert-core/index.js`
- `shared/mia-animation-core/index.js`
- `shared/mia-animation-engine/index.js`
- `shared/mia-architecture-core/index.js`
- `shared/mia-audit-core/index.js`
- `shared/mia-battle-core/index.js`
- `shared/mia-boot-core/index.js`
- `shared/mia-character-core/index.js`
- `shared/mia-command-bus-core/index.js`
- `shared/mia-community-core/index.js`
- `shared/mia-component-core/index.js`
- `shared/mia-configuration-core/index.js`
- `shared/mia-conversation-core/index.js`
- `shared/mia-coordination-core/index.js`
- `shared/mia-core-canon/index.js`
- `shared/mia-creature-core/index.js`
- `shared/mia-decision-core/index.js`
- `shared/mia-dependency-core/index.js`
- `shared/mia-diagnostics-core/index.js`
- `shared/mia-economy-core/index.js`
- `shared/mia-emotion-core/index.js`
- `shared/mia-entity-core/index.js`
- `shared/mia-event-bus-core/index.js`
- `shared/mia-event-core/index.js`
- `shared/mia-event-store-core/index.js`
- `shared/mia-fault-core/index.js`
- `shared/mia-gift-animation/index.js`
- `shared/mia-goal-core/index.js`
- `shared/mia-graphics-studio/index.js`
- `shared/mia-health-core/index.js`
- `shared/mia-inventory-core/index.js`
- `shared/mia-kernel-core/index.js`
- `shared/mia-kernel-decision-core/index.js`
- `shared/mia-lifecycle-core/index.js`
- `shared/mia-logging-core/index.js`
- `shared/mia-memory-core/index.js`
- `shared/mia-message-queue-core/index.js`
- `shared/mia-metrics-core/index.js`
- `shared/mia-module-core/index.js`
- `shared/mia-monitoring-core/index.js`
- `shared/mia-obs-core/index.js`
- `shared/mia-orchestrator-core/index.js`
- `shared/mia-paint-ai/index.js`
- `shared/mia-paint-core/index.js`
- `shared/mia-paint-gpu/index.js`
- `shared/mia-paint-io/index.js`
- `shared/mia-personality-core/index.js`
- `shared/mia-planning-core/index.js`
- `shared/mia-policy-core/index.js`
- `shared/mia-process-core/index.js`
- `shared/mia-progression-core/index.js`
- `shared/mia-projection-core/index.js`
- `shared/mia-query-bus-core/index.js`
- `shared/mia-recovery-core/index.js`
- `shared/mia-render-core/index.js`
- `shared/mia-resource-core/index.js`
- `shared/mia-rule-core/index.js`
- `shared/mia-runtime-core/index.js`
- `shared/mia-safe-mode-core/index.js`
- `shared/mia-saga-core/index.js`
- `shared/mia-scene-engine/index.js`
- `shared/mia-scheduler-core/index.js`
- `shared/mia-service-core/index.js`
- `shared/mia-shutdown-core/index.js`
- `shared/mia-speech-core/index.js`
- `shared/mia-startup-core/index.js`
- `shared/mia-state-core/index.js`
- `shared/mia-story-core/index.js`
- `shared/mia-thread-core/index.js`
- `shared/mia-timer-core/index.js`
- `shared/mia-watchdog-core/index.js`
- `shared/mia-workflow-core/index.js`
- `shared/mia-world-core/index.js`
- `shared/runtime_execution/index.js`

### `ingestroute.js` (2 výskytů)

- `archive/deprecated/code/src/routes/ingestroute.js`
- `src/routes/ingestroute.js`

### `MIA_SUPPORT_RESOLVER.js` (2 výskytů)

- `legacy/MIA_SUPPORT_RESOLVER.js`
- `scripts/MIA_SUPPORT_RESOLVER.js`

### `mia-svg-primitives.js` (3 výskytů)

- `mia-output-overlay/mia-paint/lib/mia-svg-primitives.js`
- `mia-output-overlay/mia-svg-primitives.js`
- `shared/mia-svg-primitives.js`

### `plugin.js` (2 výskytů)

- `plugins/mia-paint/grid-overlay/plugin.js`
- `plugins/mia-paint/koj-factory-export/plugin.js`

### `lifecycleManager.js` (2 výskytů)

- `shared/mia-core-canon/lifecycleManager.js`
- `shared/mia-lifecycle-core/lifecycleManager.js`

### `runtimeManager.js` (2 výskytů)

- `shared/mia-core-canon/runtimeManager.js`
- `shared/mia-runtime-core/runtimeManager.js`

### `decisionEngine.js` (2 výskytů)

- `shared/mia-decision-core/decisionEngine.js`
- `shared/mia-kernel-decision-core/decisionEngine.js`

### `particlePresets.js` (2 výskytů)

- `shared/mia-graphics-studio/particlePresets.js`
- `shared/mia-paint-core/particlePresets.js`

### `constants.js` (2 výskytů)

- `shared/mia-paint-ai/constants.js`
- `shared/mia-paint-core/constants.js`

### `overlay_executor.js` (2 výskytů)

- `shared/runtime_execution/executors/overlay_executor.js`
- `shared/runtime_execution/overlay_executor.js`

## 2. Paralelní moduly (legacy / archive vs active)

| Aktivní | Archiv/legacy | Poznámka |
|---------|---------------|----------|
| `shared/platform_runtime/action_builder.js` | `archive/deprecated/code/MIA_NEXT/action/action_builder.js` | Stejný název, různá cesta |
| `shared/platform_runtime_contracts/core_contracts_normalized_event.js` | `archive/deprecated/code/MIA_NEXT/core_contracts_normalized_event.js` | Normalized event contract |
| `shared/platform_runtime_rules/decision_engine.js` | `archive/deprecated/code/MIA_NEXT/decision/decision_engine.js` | Decision engine |
| `scripts/MIA_SUPPORT_RESOLVER.js` | `legacy/MIA_SUPPORT_RESOLVER.js` | Legacy kopie |
| `src/routes/ingestroute.js` | `archive/deprecated/code/src/routes/ingestroute.js` | Ingest route |
| `shared/mia-lifecycle-core/lifecycleManager.js` | `shared/mia-core-canon/lifecycleManager.js` | Canon vs core implementace |
| `shared/mia-runtime-core/runtimeManager.js` | `shared/mia-core-canon/runtimeManager.js` | Canon vs core implementace |
| `shared/mia-decision-core/decisionEngine.js` | `shared/mia-kernel-decision-core/decisionEngine.js` | Dva decision engine moduly |
| `shared/mia-paint-core/particlePresets.js` | `shared/mia-graphics-studio/particlePresets.js` | Sdílené presets |
| `shared/mia-paint-core/constants.js` | `shared/mia-paint-ai/constants.js` | Paint konstanty |
| `shared/mia-svg-primitives.js` | `mia-output-overlay/mia-svg-primitives.js`, `mia-output-overlay/mia-paint/lib/mia-svg-primitives.js` | 3 kopie SVG utilit |
| `shared/runtime_execution/overlay_executor.js` | `shared/runtime_execution/executors/overlay_executor.js` | Executor duplicita |

## 3. .tmp-audit Edge browser profily

Složka `.tmp-audit/` obsahuje ~20+ duplicitních Edge user-data profilů (`edge-gfx-v31-*`, `edge-ud-*`, `edge-profile-*`). Každý obsahuje identické extension soubory (např. `event_page_binary.js`). **Ne first-party kód** — auditní/cache artefakty.

## 4. index.js proliferace

96 souborů jménem `index.js` — standardní barrel exports v `shared/mia-*-core/`, `engine2/`, `core/`. Ne nutně duplicitní logika, ale riziko záměny při importu.

## 5. Duplicitní videa v incoming-images/

Stejný obsah pod různými cestami (vzorek z >1 MB souborů):

| Velikost | Soubory |
|----------|---------|
| 37,63 MB | `incoming-images/videos/VID-20260504-WA0001.mp4`, `..._211904.mp4`, `incoming-images/videos_2/VID-20260504-WA0001.mp4` |
| 37 MB | `lv_0_20260305202118.mp4` + `(1)` `(2)` `(3)` + `_210842` varianty |
| 33,38 MB | `VID-20260419-WA0070.mp4` v `videos/` i `videos_2/` |
| 33,06 MB | `2026-02-01-161429084.mp4` + `_175814` |
| 30,84 MB | `lv_0_20260307180457.mp4` + `_211118` |
| 24,94 MB | `lv_0_20260309100507.mp4` + `(1)` |
| 22,2 MB | `lv_7505688003600190773_20260130144313.mp4` + `(1)` |

**NEOVĚŘENO:** binární shoda (hash) — detekce pouze podle stejné velikosti a podobných názvů.

## 6. Edge extension soubory v .tmp-audit

`event_page_binary.js` — **8 výskytů** v různých Edge profilech pod `.tmp-audit/`. Identické browser extension artefakty, ne first-party kód.

## 7. Globální duplicitní basenames (celý repo, top 40)

Full-repo scan (101722 souborů) — většina duplicit **není first-party**:

| Basename | Výskyty | Původ |
|----------|---------|-------|
| LOG, LOCK | 543× | `.tmp-audit/` Edge profily |
| metadata.json | 441× | `.tmp-audit/` |
| index (bez přípony) | 384× | `.tmp-audit/` cache |
| asset | 376× | `.tmp-audit/` Edge Sidebar |
| index.js | 96× | barrel exports (viz §4) |
| poster.png | 57× | `mia-output-overlay/generated/gift-animations/*/` |
| manifest.json | 82× | mix `.tmp-audit/` + `game/hello/manifest.json` |
