# Etapa 3D — Pokrytí testy (contracts vs kánon)

Mapování OBS runtime pravidel na existující contract/smoke testy.  
Preflight profil: `npm run test:preflight:fast` (`scripts/run_preflight_tests.js --fast`).

---

## Legenda pokrytí

| Symbol | Význam |
|--------|--------|
| 🟢 | Contract v preflight:fast |
| 🟡 | Test existuje, mimo fast preflight nebo partial mock |
| 🔴 | Pravidlo bez dedikovaného contractu |
| ❓ | Pokrytí manuální (R1-C) nebo live-only |

---

## OBS moduly v preflight:fast (18 suites)

| Suite | Soubor | Oblast |
|-------|--------|--------|
| `obs_live_manifest` | `tests/obs_live_manifest_contract.js` | Manifest, bust, aliasy, zIndex |
| `obs_bootstrap` | `tests/obs_bootstrap_contract.js` | Connect lifecycle, health mock |
| `obs_bootstrap_ctx` | `tests/obs_bootstrap_ctx_contract.js` | Ctx wiring |
| `obs_overlay_sync` | `tests/obs_overlay_sync_contract.js` | Sync core, layout lock, voice |
| `obs_overlay_sync_runtime` | `tests/obs_overlay_sync_runtime_contract.js` | Runtime refresh flags |
| `obs_overlay_sync_ctx` | `tests/obs_overlay_sync_ctx_contract.js` | Ctx deps |
| `obs_overlay_sync_wrappers_ctx` | `tests/obs_overlay_sync_wrappers_ctx_contract.js` | Wrapper host/ctx |
| `obs_post_connect_runtime` | `tests/obs_post_connect_runtime_contract.js` | Post-connect chain |
| `obs_post_connect_ctx` | `tests/obs_post_connect_ctx_contract.js` | Ctx wiring |
| `obs_safe_call` | `tests/obs_safe_call_contract.js` | Safe WS wrapper |
| `obs_safe_call_ctx` | `tests/obs_safe_call_ctx_contract.js` | Ctx |
| `obs_persistent_layers` | `tests/obs_persistent_layers_contract.js` | Z-index raise |
| `obs_watchdog_ctx` | `tests/obs_watchdog_ctx_contract.js` | Watchdog ctx |
| `obs_vision_ctx` | `tests/obs_vision_ctx_contract.js` | Vision optional |
| `obs_overlay_renderer_ctx` | `tests/obs_overlay_renderer_ctx_contract.js` | Renderer ctx |
| `mia_obs_hands` | `tests/mia_obs_hands_contract.js` | Hands specs, transforms |
| `mia_obs_vision` | `tests/mia_obs_vision_contract.js` | Vision module |
| `graphics_r1` | `tests/mia_graphics_r1_contract.js` | Bust 36/37, hype CSS, public strip |

**Poznámka:** `obs_watchdog_contract.js` existuje, ale **není** v preflight:fast listu (pouze `obs_watchdog_ctx`).

---

## Guardrails (GR-O*)

| Pravidlo | Test soubor(y) | Preflight:fast | Pokrytí |
|----------|----------------|----------------|---------|
| GR-O01 TikFinity→MIA→OBS | `ingest_contract`, `obs_bootstrap` | 🟢 partial | 🟢 |
| GR-O02 OBS render-only | manifest + arch (no OBS biz logic test) | — | 🟡 indirect |
| GR-O03 miaPoints only | `overlay_public_response`, `graphics_r1` | 🟢 | 🟢 |
| GR-O04 Split mode | `obs_overlay_sync` | 🟢 | 🟢 |
| GR-O05 Body OFF | `obs_live_manifest`, `mia_obs_hands` | 🟢 | 🟢 |
| GR-O06 Per-tier rotation | `video_rotation_smoke` (T1 only) | 🟡 | 🟡 (3A gap) |
| GR-O07 Cache bust 36/37/49 | `obs_live_manifest`, `runtime_split` | 🟢 | 🟢 |
| GR-O08 Single TTS source | — | — | 🔴 |

---

## Bootstrap / connect / health

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| WS connect mock | `obs_bootstrap` | 🟢 | 🟢 |
| Health snapshot states | `obs_bootstrap` (partial) | 🟢 | 🟡 |
| Reconnect after disconnect | — | — | 🔴 |
| Scene guard scan | — | — | 🔴 |
| Safe call on disconnect | `obs_safe_call` | 🟢 | 🟢 |

---

## Manifest / browser sources

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| Layer catalog completeness | `obs_live_manifest` | 🟢 | 🟢 |
| Input aliases | `obs_live_manifest` | 🟢 | 🟢 |
| zIndex combo > speech | `obs_live_manifest` | 🟢 | 🟢 |
| Body parts in manifest | `obs_live_manifest` | 🟢 | 🟢 |
| buildLiveManifest API fields | `obs_live_manifest` | 🟢 | 🟢 |
| `obs:refresh-overlays` script | — | — | 🔴 |

---

## Layout / transforms

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| Fix overlay layout | `obs_fix_overlay_layout_contract.js` | 🟡 mimo fast | 🟡 |
| Hands Koj/bowl transforms | `mia_obs_hands` | 🟢 | 🟢 |
| Hard zones CSS | `graphics_r1` | 🟢 | 🟢 |
| Portrait canvas | — | — | 🔴 |
| Landscape canvas | — | — | 🔴 |

---

## Video engine → OBS

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| Tier slot pick | `video_engine` contracts | 🟡 | 🟡 |
| Persistent layers on top | `obs_persistent_layers` | 🟢 | 🟢 |
| Queue merge | video engine (partial) | 🟡 | 🟡 |
| Live gift video playback | — | — | ❓ R1-C krok 6 |

---

## Overlay sync / refresh

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| Split vs hub resolve | `obs_overlay_sync` | 🟢 | 🟢 |
| Layout locked | `obs_overlay_sync` | 🟢 | 🟢 |
| Refresh throttle | `obs_overlay_sync_runtime` | 🟢 | 🟡 |
| Voice monitor type | — | — | 🔴 |

---

## Watchdog / away / vision

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| Watchdog launch/cooldown | `obs_watchdog_contract.js` | 🟡 mimo fast | 🟡 |
| Watchdog ctx | `obs_watchdog_ctx` | 🟢 | 🟢 |
| Away scene | `obs_away_scene_contract.js` | 🟡 slow | 🟡 |
| Away loop | `obs_away_loop_contract.js` | 🟡 slow | 🟡 |
| OBS vision | `mia_obs_vision`, `obs_vision_ctx` | 🟢 | 🟢 |

---

## Cross-module overlay HTML (R1-C důkaz)

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| Speech holo bust 36 | `graphics_r1` | 🟢 | 🟢 + ❓ R1-C |
| Gift overlay bust 37 | `graphics_r1` | 🟢 | 🟢 + ❓ R1-C |
| Koj runtime split | `kojnozout_runtime_split_contract.js` | 🟢 | 🟢 + ❓ R1-C |
| Combo belly miaPoints | `graphics_r1`, `runtime_split` | 🟢 | 🟢 |
| Public koj snapshot | `koj_public_snapshot` | 🟢 | 🟢 |
| Full OBS session layout | — | — | ❓ R1-C PASS |

---

## Navržené chybějící testy (T-D01…T-D08)

| ID | Co testovat | Priorita |
|----|-------------|----------|
| T-D01 | `obs_scene_guard.scanScenes` s mock FS | STŘEDNÍ |
| T-D02 | `obs_refresh_overlays` gift v37 vs speech v36 izolace (extract pure fn) | STŘEDNÍ |
| T-D03 | Portrait layout transforms po `obs_set_canvas` (mock OBS) | STŘEDNÍ |
| T-D04 | Bootstrap reconnect po simulated disconnect | STŘEDNÍ |
| T-D05 | Voice monitor default `MONITOR_AND_OUTPUT` | NÍZKÁ |
| T-D06 | Startup overlay auto-hide hook | NÍZKÁ |
| T-D07 | `obs_watchdog` přidat do preflight:fast | NÍZKÁ |
| T-D08 | GR-O08 single voice — integrace ensure-voice bez live OBS | NÍZKÁ |

---

## Statistiky pokrytí (OR-01…OR-70)

| Metrika | Hodnota |
|---------|---------|
| Řádků matrix | 70 |
| S 🟢/🟡 test důkazem | 48 |
| 🔴 bez testu | 17 |
| ❓ R1-C / live only | 5 |
| Preflight OBS suites | 18 |
| OBS test souborů celkem | 24 |

**Chybí test (matrix − testováno s 🟢):** ~22 pravidel (včetně partial 🟡 bez live důkazu).
