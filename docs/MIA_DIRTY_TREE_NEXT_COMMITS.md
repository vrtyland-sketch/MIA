# Dirty tree — další commit dávky (po C5)

**Datum:** 2026-07-21  
**Refresh status:** `git status --short` ≈ **230 paths** — **shoda** s [`MIA_DIRTY_TREE_AFTER_C5.md`](./MIA_DIRTY_TREE_AFTER_C5.md)  
**HEAD (docs):** `fbe33969` · C5 archive: `bc126646`  
**Push C1–C5:** stále **čeká** na explicitní go  
**DoD:** ~94 % — otevřené: ucho (manuál), push (wait), leftover triage (tento doc)

Žádný runtime commit teď — jen plán + ready-to-run `git add`.

---

## Co ignorovat (necommitovat)

| Glob / path | Proč |
|-------------|------|
| `data/**` (modified + untracked live JSON/bin) | živý stav / cache |
| `mia-output-overlay/generated/gift-animations/` | generované |
| `mia-output-overlay/generated/gift-moments/*.png` | generované |
| `mia-output-overlay/generated/media-templates/*.png` | generované |
| `mia-output-overlay/generated/story-moments/*.png` | generované |
| `.tmp-audit/` · `.tmp-audit-inner.json` | audit noise / Edge profile |
| `.tmp-git-status-*.txt` · `.tmp-preflight-out.txt` · `.git-c2-status.txt` | dočasné status dumpy |
| `test-write-tmp.txt` · `tmp_canon_*.txt` · `scripts/_tmp_*.js` | scratch |

`.gitignore` pokrývá `.tmp-audit/` + gift generated noise (viz commit hygiene).

---

## Pořadí dávek

| # | Název | Kdy | Mix? |
|---|--------|-----|------|
| **C6docs** | Triage plán (tento doc + ear appendix) | teď OK | jen docs / gitignore |
| **C6b** | `.env.example` only | kdykoli, drobný | **ne** míchat s runtime |
| **C6a** | Leftover runtime (arena/speaker/…) | po smoke / až bude chuť | **ne** míchat s canon |
| **C6canon** | Master-canon / `mia-*-core` | oddělený track | **nikdy** s C6a/C6b |
| — | Push C1–C5 (+ případně C6docs) | až operátor řekne „push“ | — |

---

## C6b — `.env.example` only (nejmenší / nejbezpečnější)

+4 řádky: Phase 4 User Mode stub komentáře (`MIA_USER_MODE`, default OFF).

```powershell
git add -- .env.example
git status --short
# očekáváno jen: .env.example
git commit -m "docs: note User Mode stub flags in .env.example"
```

---

## C6a — Leftover runtime (arena / speaker / gift-media / tests)

Jeden koherentní „zbylý runtime“ balík z bucketu B.  
**Nespouštět** před manuálním Preview/ucho, pokud chceš jistotu; diff je větší (~30 modified + 2 untracked scripts).

### `git add` (PowerShell / bash)

```powershell
git add -- `
  mia-output-overlay/arena-battle-overlay.html `
  mia-output-overlay/assets/mia-sound-cues.js `
  mia-output-overlay/assets/mia/hologram.png `
  mia-output-overlay/assets/kojnozrout/moods/_OFFLINE_MOVED.md `
  routes/obs.js `
  routes/overlay.js `
  scripts/MIA_ARENA_BATTLE_DEMO.js `
  scripts/MIA_CAPYBARA_FLOW_RUNTIME.js `
  scripts/MIA_ECOSYSTEM_ORCHESTRATOR.js `
  scripts/MIA_GIFT_MEDIA_RUNTIME.js `
  scripts/MIA_GIFT_PRESENTATION.js `
  scripts/MIA_INGEST_UTILS_RUNTIME.js `
  scripts/MIA_KOJNOZROUT_PERSISTENCE.js `
  scripts/MIA_OBS_SAFE_CALL.js `
  scripts/MIA_OVERLAY_STATE.js `
  scripts/MIA_PLATFORM_ARENA.js `
  scripts/MIA_SPEAKER_ROUTING.js `
  scripts/MIA_STARTUP_CHECK.js `
  scripts/MIA_SUPPORT_REACTION_POLICY.js `
  scripts/run_preflight_tests.js `
  scripts/MIA_DUAL_VOICE.js `
  scripts/kojnozrout_offline_paths.js `
  shared/gifts/gift_map/gift_catalog.json `
  shared/gifts/gift_map/gift_voice_map.json `
  shared/next_decision/share_decision_engine.js `
  shared/platform_runtime_rules/decision_engine.js `
  shared/runtime_execution/run_runtime_execution_bridge.js `
  tests/capybara_flow_runtime_contract.js `
  tests/platform_arena_contract.js `
  tests/runtime_smoke.js `
  tests/runtime_state_seed_ctx_contract.js `
  tests/speaker_routing_contract.js `
  tests/vitals_companion_contract.js
```

**Globs (ekvivalent):**

```text
mia-output-overlay/arena-battle-overlay.html
mia-output-overlay/assets/mia-sound-cues.js
mia-output-overlay/assets/mia/hologram.png
mia-output-overlay/assets/kojnozrout/moods/_OFFLINE_MOVED.md
routes/{obs,overlay}.js
scripts/MIA_{ARENA_BATTLE_DEMO,CAPYBARA_FLOW_RUNTIME,ECOSYSTEM_ORCHESTRATOR,GIFT_MEDIA_RUNTIME,GIFT_PRESENTATION,INGEST_UTILS_RUNTIME,KOJNOZROUT_PERSISTENCE,OBS_SAFE_CALL,OVERLAY_STATE,PLATFORM_ARENA,SPEAKER_ROUTING,STARTUP_CHECK,SUPPORT_REACTION_POLICY,DUAL_VOICE}.js
scripts/kojnozrout_offline_paths.js
scripts/run_preflight_tests.js
shared/gifts/gift_map/{gift_catalog,gift_voice_map}.json
shared/next_decision/share_decision_engine.js
shared/platform_runtime_rules/decision_engine.js
shared/runtime_execution/run_runtime_execution_bridge.js
tests/{capybara_flow_runtime,platform_arena,runtime_smoke,runtime_state_seed_ctx,speaker_routing,vitals_companion}_contract.js
tests/runtime_smoke.js
```

**Navrhovaný message:**

```text
chore: leftover arena/speaker/gift-media runtime after C5
```

**Před C6a (doporučeno):**

```powershell
node --check index.js
npm run test:preflight:fast
```

**Volitelný split** (když C6a připadá moc velký):

| Sub | Soubory |
|-----|---------|
| C6a1 arena | `*ARENA*`, `arena-battle-overlay.html`, `tests/platform_arena_contract.js` |
| C6a2 speaker/voice | `*SPEAKER*`, `MIA_DUAL_VOICE.js`, `tests/speaker_routing_contract.js`, sound-cues |
| C6a3 gift-media / rest | zbytek B |

---

## C6canon — Master-canon track (odděleně)

**Nemíchat** s C6a/C6b/předstreamem.

```powershell
git add -- `
  docs/master-canon/ `
  docs/_export_koj_robot_pet_game_logic.md `
  docs/_export_mia_2d_part_rig_plan.md `
  docs/_export_mia_graphics_system_proposal.md `
  docs/_export_mia_inventory_for_chatgpt.md `
  docs/_export_mia_koj_world_unification_proposal.md `
  _canon_import/ `
  shared/mia-achievement-core/ `
  shared/mia-action-core/ `
  shared/mia-alert-core/ `
  shared/mia-animation-core/ `
  shared/mia-architecture-core/ `
  shared/mia-audit-core/ `
  shared/mia-battle-core/ `
  shared/mia-boot-core/ `
  shared/mia-character-core/ `
  shared/mia-command-bus-core/ `
  shared/mia-community-core/ `
  shared/mia-component-core/ `
  shared/mia-configuration-core/ `
  shared/mia-conversation-core/ `
  shared/mia-coordination-core/ `
  shared/mia-core-canon/ `
  shared/mia-creature-core/ `
  shared/mia-decision-core/ `
  shared/mia-dependency-core/ `
  shared/mia-diagnostics-core/ `
  shared/mia-economy-core/ `
  shared/mia-emotion-core/ `
  shared/mia-entity-core/ `
  shared/mia-event-bus-core/ `
  shared/mia-event-core/ `
  shared/mia-event-store-core/ `
  shared/mia-fault-core/ `
  shared/mia-goal-core/ `
  shared/mia-health-core/ `
  shared/mia-inventory-core/ `
  shared/mia-kernel-core/ `
  shared/mia-kernel-decision-core/ `
  shared/mia-lifecycle-core/ `
  shared/mia-logging-core/ `
  shared/mia-memory-core/ `
  shared/mia-message-queue-core/ `
  shared/mia-metrics-core/ `
  shared/mia-module-core/ `
  shared/mia-monitoring-core/ `
  shared/mia-obs-core/ `
  shared/mia-orchestrator-core/ `
  shared/mia-personality-core/ `
  shared/mia-planning-core/ `
  shared/mia-policy-core/ `
  shared/mia-process-core/ `
  shared/mia-progression-core/ `
  shared/mia-projection-core/ `
  shared/mia-query-bus-core/ `
  shared/mia-recovery-core/ `
  shared/mia-render-core/ `
  shared/mia-resource-core/ `
  shared/mia-rule-core/ `
  shared/mia-runtime-core/ `
  shared/mia-safe-mode-core/ `
  shared/mia-saga-core/ `
  shared/mia-scheduler-core/ `
  shared/mia-service-core/ `
  shared/mia-shutdown-core/ `
  shared/mia-speech-core/ `
  shared/mia-startup-core/ `
  shared/mia-state-core/ `
  shared/mia-story-core/ `
  shared/mia-thread-core/ `
  shared/mia-timer-core/ `
  shared/mia-watchdog-core/ `
  shared/mia-workflow-core/ `
  shared/mia-world-core/ `
  tests/mia_master_canon_0001_contract.js `
  tests/mia_master_canon_0002_contract.js `
  tests/mia_master_canon_0003_contract.js `
  tests/mia_master_canon_0004_contract.js `
  tests/mia_master_canon_0005_contract.js `
  tests/mia_master_canon_0006_contract.js `
  tests/mia_master_canon_0007_contract.js `
  tests/mia_master_canon_0008_contract.js `
  tests/mia_master_canon_0009_contract.js `
  tests/mia_master_canon_0010_contract.js `
  tests/mia_master_canon_0011_contract.js `
  tests/mia_master_canon_0012_contract.js `
  tests/mia_master_canon_0013_contract.js `
  tests/mia_master_canon_0014_contract.js `
  tests/mia_master_canon_0015_contract.js `
  tests/mia_master_canon_0016_contract.js `
  tests/mia_master_canon_0017_contract.js `
  tests/mia_master_canon_0018_contract.js `
  tests/mia_master_canon_0019_contract.js `
  tests/mia_master_canon_0020_contract.js `
  tests/mia_master_canon_0021_contract.js `
  tests/mia_master_canon_0022_contract.js `
  tests/mia_master_canon_0023_contract.js `
  tests/mia_master_canon_0024_contract.js `
  tests/mia_master_canon_0025_contract.js `
  tests/mia_master_canon_0026_contract.js `
  tests/mia_master_canon_0027_contract.js `
  tests/mia_master_canon_0028_contract.js `
  tests/mia_master_canon_0029_contract.js `
  tests/mia_master_canon_0030_contract.js `
  tests/mia_master_canon_0031_contract.js `
  tests/mia_master_canon_0032_contract.js `
  tests/mia_master_canon_0033_contract.js `
  tests/mia_master_canon_0034_contract.js `
  tests/mia_master_canon_0035_contract.js `
  tests/mia_master_canon_0036_contract.js `
  tests/mia_master_canon_0037_contract.js `
  tests/mia_master_canon_0038_contract.js `
  tests/mia_master_canon_0039_contract.js `
  tests/mia_master_canon_0040_contract.js `
  tests/mia_master_canon_0041_contract.js `
  tests/mia_master_canon_0042_contract.js `
  tests/mia_master_canon_0043_contract.js `
  tests/mia_master_canon_0044_contract.js `
  tests/mia_master_canon_0045_contract.js `
  tests/mia_master_canon_0046_contract.js `
  tests/mia_master_canon_0047_contract.js `
  tests/mia_master_canon_0048_contract.js `
  tests/mia_master_canon_0049_contract.js `
  tests/mia_master_canon_0050_contract.js `
  tests/mia_master_canon_0051_contract.js `
  tests/mia_master_canon_0052_contract.js `
  tests/mia_master_canon_0053_contract.js `
  tests/mia_master_canon_0054_contract.js `
  tests/mia_master_canon_0055_contract.js `
  tests/mia_master_canon_0056_contract.js `
  tests/mia_master_canon_0057_contract.js `
  tests/mia_master_canon_0058_contract.js `
  tests/mia_master_canon_0059_contract.js `
  tests/mia_master_canon_0060_contract.js `
  tests/mia_master_canon_0061_contract.js `
  tests/mia_master_canon_0062_contract.js `
  tests/mia_master_canon_0063_contract.js `
  tests/mia_master_canon_0064_contract.js `
  tests/mia_master_canon_0065_contract.js `
  tests/mia_master_canon_0066_contract.js `
  tests/mia_master_canon_0067_contract.js `
  tests/mia_master_canon_0068_contract.js `
  tests/mia_master_canon_0069_contract.js `
  tests/mia_master_canon_0070_contract.js `
  tests/mia_master_canon_0071_contract.js `
  tests/mia_master_canon_0072_contract.js `
  tests/mia_master_canon_0073_contract.js `
  tests/mia_master_canon_0074_contract.js `
  tests/mia_master_canon_0075_contract.js `
  tests/mia_master_canon_0076_contract.js `
  tests/mia_master_canon_0077_contract.js `
  tests/mia_master_canon_0078_contract.js `
  tests/mia_master_canon_0079_contract.js `
  tests/mia_master_canon_0080_contract.js `
  tests/mia_master_canon_0081_contract.js `
  tests/mia_master_canon_0082_contract.js `
  tests/mia_master_canon_0083_contract.js `
  tests/mia_master_canon_0084_contract.js `
  tests/mia_master_canon_0085_contract.js `
  tests/mia_master_canon_0086_contract.js `
  tests/mia_master_canon_0087_contract.js
```

**Globs:**

```text
docs/master-canon/
docs/_export_*.md
_canon_import/
shared/mia-*-core/
tests/mia_master_canon_*_contract.js
```

**Navrhovaný message:**

```text
feat: import master-canon packages and contract suite
```

(nebo rozdělit na docs-canon + packages + tests — podle chuti; stále mimo předstream.)

---

## C6docs — triage commit (tento balík)

```powershell
git add -- `
  docs/MIA_DIRTY_TREE_NEXT_COMMITS.md `
  docs/MIA_DIRTY_TREE_AFTER_C5.md `
  docs/MIA_PRESTREAM_DOD.md `
  .gitignore
git commit -m "docs: triage leftover dirty tree into next commit batches after C5"
```

---

## Související

- [`MIA_DIRTY_TREE_AFTER_C5.md`](./MIA_DIRTY_TREE_AFTER_C5.md)
- [`MIA_PRESTREAM_DOD.md`](./MIA_PRESTREAM_DOD.md) — appendix ucho 30 s
- [`MIA_COMMIT_PLAN_RUNTIME_1_4.md`](./MIA_COMMIT_PLAN_RUNTIME_1_4.md)
