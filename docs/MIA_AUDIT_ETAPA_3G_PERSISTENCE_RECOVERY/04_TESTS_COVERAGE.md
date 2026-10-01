# Etapa 3G — Pokrytí testy (Persistence & Recovery)

Mapování Persistence & Recovery pravidel na existující contract/smoke testy.  
Preflight profil: `npm run test:preflight:fast` (`scripts/run_preflight_tests.js --fast`).

**Datum:** 2026-07-27

---

## Legenda pokrytí

| Symbol | Význam |
|--------|--------|
| 🟢 | Contract v preflight:fast |
| 🟡 | Test existuje, mimo fast preflight nebo partial |
| 🔴 | Pravidlo bez dedikovaného contractu |
| ❓ | Manuální / live-only (crash mid-write, OBS kill) |

---

## Persistence suites v preflight:fast

| Suite | Soubor | Oblast |
|-------|--------|--------|
| `phase1_runtime_state` | `tests/phase1_runtime_state_contract.js` | save/load, composeKojSeed, flush |
| `runtime_state_runtime` | `tests/runtime_state_runtime_contract.js` | runtime wiring |
| `runtime_state_ctx` | `tests/runtime_state_ctx_contract.js` | ctx deps |
| `runtime_state_seed_ctx` | `tests/runtime_state_seed_ctx_contract.js` | boot compose seed |
| `phase1_stream_watchdog` | `tests/phase1_stream_watchdog_contract.js` | WD enable, no invent RS |
| `phase1_action_queue` | `tests/phase1_action_queue_contract.js` | AQ flag / queue behavior |
| `phase1_replay` | `tests/phase1_replay_contract.js` | event replay |
| `phase2_viewer_memory` | `tests/phase2_viewer_memory_contract.js` | miaPoints persist, no coins/text |
| `phase3_game_layer` | `tests/phase3_game_layer_contract.js` | inventory (+ arena slice) |
| `theme_manager` | `tests/theme_manager_contract.js` | theme disk |
| `status_snapshot` | `tests/status_snapshot_contract.js` | diagnostics snapshot |
| `obs_watchdog_ctx` | `tests/obs_watchdog_ctx_contract.js` | OBS WD ctx wiring |
| `obs_persistent_layers` | `tests/obs_persistent_layers_contract.js` | OBS layers ≠ app JSON |
| `gift_map` | `tests/gift_map_contract.js` | gift-map-stats path (cross 3A) |
| `overlay_state_ctx` / public | `tests/overlay_*` | ephemeral overlay (cross 3F) |
| `koj_public_snapshot` | `tests/koj_public_snapshot_contract.js` | public koj view (cross 3C) |
| `arena_battle_demo_ctx` | `tests/arena_battle_demo_ctx_contract.js` | arena ctx (cross 3H thin) |
| `phase4_product_boundary` | `tests/phase4_product_boundary_contract.js` | profiles atomic partial |

---

## Testy mimo preflight:fast (existují)

| Soubor | Oblast | Pokrytí |
|--------|--------|---------|
| `tests/obs_watchdog_contract.js` | OBS relaunch unit | 🟡 **GAP-G14** — není ve FAST listu |
| `tests/kojnozout_evolution_milestone_contract.js` | loadPersistedSeed round-trip | 🟡 |
| `tests/chat_lexicon_smoke.js` | lexicon disk | 🟡 |
| `tests/session_memory_response_contract.js` | session store | 🟡 |
| `tests/log_rotation_smoke.js` | log rotate ≠ state bak | 🟡 |
| `tests/mia_master_canon_0065_contract.js` | Recovery Manager lab | 🟡 Master |
| `tests/mia_master_canon_0066_contract.js` | Watchdog Engine lab | 🟡 Master |
| `tests/mia_master_canon_0075_contract.js` | Event Store lab | 🟡 Master |
| `tests/away_host_mode_contract.js` | host snapshot modes | 🟡 (slow/stub) |
| `tests/video_rotation` (slow suite) | rotationIndexByTier | 🟡 slow — ne persist |

---

## Mapování PR-* → pokrytí (zkráceně)

| Skupina | PR IDs | Pokrytí | Poznámka |
|---------|--------|---------|----------|
| Governance | PR-01…08 | 🔴/🟡/❓ | inventář code review; PR-08 ❓ |
| Atomic | PR-09…14 | 🟢/🔴 | RS 🟢; koj/world/viewer 🔴 atomic |
| Koj state | PR-15…22 | 🟢/🟡 | seed/evolution 🟡; corrupt 🔴 |
| World | PR-23…27 | 🟡/🔴 | thin |
| Runtime compose | PR-28…35 | 🟢 | silné |
| Economy | PR-36…44 | 🟢/⚠ | viewer-memory 🟢; streak 🔴 |
| Session/theme/AQ | PR-45…52 | 🟢/🟡 | AQ/theme/status 🟢 |
| Version/migrate | PR-53…57 | 🟢/🔴/🟡 | version implicit; migrate 🔴; 0075 🟡 |
| Corrupt bak | PR-58…61 | 🔴 | soft-fail code-only |
| Crash/WD/Master | PR-62…72 | 🟢/🟡/❓ | seed+stream WD 🟢; live ❓; Master 🟡 |

---

## Odhad pokrytí vůči 72 pravidlům

| Kategorie | Počet (approx) |
|-----------|----------------|
| 🟢 Silně v fast | ~38 |
| 🟡 Mimo fast / partial | ~18 |
| 🔴 Bez dedikovaného testu | ~12 |
| ❓ Live-only | ~4 |

**Testováno (🟢 + relevantní 🟡 s důkazem):** ~48  
**Chybí test / slabé:** ~24 (včetně navržených T-G* + live ❓)

---

## Navržené testy (DECISION later — neimplementovat v tomto auditu)

| ID | Název | Cíl | Gap |
|----|-------|-----|-----|
| T-G01 | `persist_corrupt_json_contract.js` | Záměrně poškozené koj/world/viewer → soft empty, proces OK | GAP-G13 |
| T-G02 | `persist_atomic_write_contract.js` | Kill mid-write simulace / partial file → atomic stores přežijí | GAP-G04 |
| T-G03 | `persist_cross_file_consistency_contract.js` | Po flush Koj+RS+viewer-memory shoda bowl/miaPoints fixture | GAP-G02 |
| T-G04 | `persist_backup_policy_contract.js` | Pokud DECISION zavede `.bak` — assert existence | GAP-G01 |
| T-G05 | `persist_schema_migrate_contract.js` | v1→v2 fixture migrace | GAP-G05 |
| T-G06 | `rotation_index_persist_contract.js` | Round-trip rotationIndexByTier přes restart mock | GAP-G06 |
| T-G07 | Zařadit `obs_watchdog_contract` do fast | Unit relaunch ve fast | GAP-G14 |
| T-G08 | Live checklist kill Node mid gift storm | Manuální e2e | GAP-G03 |

---

## Live-only checklist (❓)

1. Kill `node index.js` během gift/CARE mutací → restart → spočítat bowl + viewer miaPoints.  
2. Truncate `kojnozout-state.json` mid-write (simulace) → boot soft-fail + (po DECISION) bak.  
3. OBS process kill → relaunch (ownership **3D**, cross PR-67).  
4. Multi-hour streak přes restart (ownership **3B**, cross PR-42).

---

*Etapa 3G — docs only. Žádné nové testy nebyly přidány do repa.*
