# Etapa 3F — Pokrytí testy (Overlay Runtime)

Mapování Overlay Runtime pravidel na existující contract/smoke testy.  
Preflight profil: `npm run test:preflight:fast` (`scripts/run_preflight_tests.js --fast`).

**Datum:** 2026-07-27

---

## Legenda pokrytí

| Symbol | Význam |
|--------|--------|
| 🟢 | Contract v preflight:fast |
| 🟡 | Test existuje, mimo fast preflight nebo partial |
| 🔴 | Pravidlo bez dedikovaného contractu |
| ❓ | Manuální / live-only (R1-C historický) |

---

## Overlay suites v preflight:fast

| Suite | Soubor | Oblast |
|-------|--------|--------|
| `overlay_public_response` | `tests/overlay_public_response_contract.js` | Strip coins → miaPoints, cache key |
| `overlay_public_wiring` | `tests/overlay_public_wiring_contract.js` | Route/public factory wiring |
| `overlay_public_ctx` | `tests/overlay_public_ctx_contract.js` | Public ctx deps |
| `overlay_state_ctx` | `tests/overlay_state_ctx_contract.js` | Overlay state host/ctx |
| `overlay_state_cache_ctx` | `tests/overlay_state_cache_ctx_contract.js` | Cache TTL/key |
| `overlay_timing_ctx` | `tests/overlay_timing_ctx_contract.js` | Timing host/ctx |
| `overlay_queue_ctx` | `tests/overlay_queue_ctx_contract.js` | Queue host/ctx |
| `combo_overlay` | `tests/combo_overlay_contract.js` | Combo/spam/boss moments |
| `combo_wave_ui` | `tests/combo_wave_ui_contract.js` | Wave HUD model |
| `graphics_r1` | `tests/mia_graphics_r1_contract.js` | Strip + scene + spam public |
| `gift_runtime` | `tests/gift_runtime_contract.js` | Gift presentation wiring (cross 3A) |
| `gift_runtime_ctx` | `tests/gift_runtime_ctx_contract.js` | Gift runtime ctx |
| `startup_overlay_runtime` | `tests/startup_overlay_runtime_contract.js` | Boot overlay |
| `startup_overlay_ctx` | `tests/startup_overlay_ctx_contract.js` | Startup ctx |
| `status_overlay_vision_runtime` | `tests/status_overlay_vision_runtime_contract.js` | Display vision |
| `speaker_routing` | `tests/speaker_routing_contract.js` | Voice-first / music bubble (3E overlap) |
| `obs_overlay_sync*` | několik OBS overlay sync suites | URL sync — ownership 3D |
| `engine2_e3` | `tests/mia_engine2_e3_contract.js` | Overlay profiles stub |

**Pozn.:** OBS sync suites jsou v fast kvůli URL/bust; **compliance ownership** zůstává v Etapa 3D.

---

## Testy mimo preflight:fast (existují)

| Soubor | Oblast | Pokrytí |
|--------|--------|---------|
| `tests/overlay_layout_contract.js` | pickActiveOverlay / pin / z-index | 🟡 **GAP-F03** |
| `tests/overlay_queue_smoke.js` | queue priority enqueue | 🟡 (v `test:smoke`) |
| `tests/overlay_voice_queue_integration_smoke.js` | flush po TTS | 🟡 **GAP-F02** / 3E-E03 |
| `tests/tts_overlay_integration_smoke.js` | TTS↔overlay | 🟡 |
| `tests/overlay_emit_smoke.js` | emit path | 🟡 |
| `tests/overlay_timing_smoke.js` | timing smoke | 🟡 |
| `tests/overlay_participants_contract.js` | viewer participants | 🟡 (`test:participants`) |
| `tests/host_mode_overlay_contract.js` | host panel / ninja | 🟡 (node:test) |
| `tests/away_host_mode_contract.js` | away (slow/full) | 🟡 stub |
| `tests/obs_fix_overlay_layout_contract.js` | OBS transform layout | 🟡 → 3D |

---

## Mapování OV-* → pokrytí (zkráceně)

| Skupina | OV IDs | Pokrytí | Poznámka |
|---------|--------|---------|----------|
| Public strip | OV-03…08, 10 | 🟢 | silné |
| Poll/cache | OV-11…17, 20 | 🟢 | silné |
| Shared poll lib | OV-18 | 🔴/🟡 | lib bez unit |
| Queue | OV-21,22,24,25,28 | 🟢/🟡 | ctx 🟢; smoke 🟡 |
| Flush | OV-23 | 🟡 | mimo fast |
| Burst live | OV-26 | ❓ | nikdy |
| Gift path | OV-27 | 🟢 | gift_runtime |
| Pick/pin | OV-29…40 | 🟡 | layout mimo fast |
| Voice-first | OV-41,44,45 | 🟢 | speaker_routing |
| Mirror/grace | OV-42,43,46 | 🔴/🟡 | HTML code review |
| Viewer VP | OV-47 | 🟡 | thin |
| Response | OV-49…54 | 🟡 | partial |
| Combo/spam | OV-55…62 | 🟢 | combo + graphics; live ❓ |
| Viewer/entity/host | OV-63…70 | 🟢/🟡 | host_mode 🟡 |
| Zones/Engine2 | OV-71…72 | 🟢/❓ | CSS + e3; portrait ❓ |
| Admin spot | OV-09 | ❓ | nikdy |

---

## Odhad pokrytí vůči 72 pravidlům

| Kategorie | Počet (approx) |
|-----------|----------------|
| 🟢 Silně v fast | ~48 |
| 🟡 Mimo fast / partial | ~16 |
| 🔴 Bez dedikovaného testu | ~4 |
| ❓ Live-only | ~4 |

**Testováno (🟢+relevantní 🟡 s důkazem):** ~52  
**Chybí test / slabé:** ~20 (včetně live ❓)

---

## Navržené testy (T-F*) — DECISION later, ne auto-fix

| ID | Návrh | Severity | Mapuje |
|----|-------|----------|--------|
| T-F01 | Zařadit `overlay_layout_contract` do preflight:fast | STŘEDNÍ | OV-29…39, GAP-F03 |
| T-F02 | Zařadit `overlay_voice_queue_integration_smoke` do fast | STŘEDNÍ | OV-23, GAP-F02 |
| T-F03 | Fixture: voiceMirror filtered + pin break higher prio runtime | NÍZKÁ | OV-32…35 |
| T-F04 | Intent round-trip `responseContract.intent` → overlay meta | NÍZKÁ | OV-51, GAP-F08 |
| T-F05 | Admin vs public JSON coin leak spot-check | NÍZKÁ | OV-09, GAP-F09 |
| T-F06 | Live checklist script: speech/gift/combo (docs only) | STŘEDNÍ | GAP-F01 |
| T-F07 | Portrait zones smoke (CSS vars assert + optional screenshot) | STŘEDNÍ | OV-71, GAP-F06 |
| T-F08 | `MiaOverlayPoll` unit (in-flight + backoff) | NÍZKÁ | OV-18, GAP-F07 |

---

## Vztah k 3E / 3D testům

| Suite | Primární etapa | 3F využití |
|-------|----------------|------------|
| `speaker_routing` | 3E | Voice-first + music bubble |
| `obs_overlay_sync*` | 3D | Bust/URL sync (ne HTML UX) |
| `overlay_public_*` | 3B+3F | Strip — 3F ověřuje runtime hranici |
| `combo_overlay` | 3A+3F | HUD presentation |

---

## Co je silně pokryté

1. Public strip (`overlay_public_*` + `graphics_r1`)  
2. Overlay state/cache/timing/queue **ctx** wiring  
3. Combo / spam wave contracts  
4. Speaker routing voice-first (shared s 3E)  
5. Engine2 profiles stub OFF  

## Co je slabě pokryté

1. `overlay_layout_contract` mimo fast  
2. Flush overlay po TTS mimo fast  
3. Live visual (R1-C hist only)  
4. Intent meta round-trip  
5. Unifikovaný poll scheduler unit  
