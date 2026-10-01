# Etapa 4 — Compliance matrix (Cross contracts)

**Datum:** 2026-07-28  
**Pravidla:** XC-01…XC-62 (62)  
**Sloupce:** Contract ↔ Evidence ↔ Tests ↔ Status ↔ Poslední ověření

**Legenda Status:** ✅ shoda · ⚠ drift/částečná · ❌ rozpor · ❓ neověřeno (typicky live)

**Poslední ověření:** fresh code **2026-07-28** = spot-check handoff v tomto běhu; **2026-07-27** = prior 3* (ne re-run dnes); hist. R1-C **2026-07-26**; **nikdy**; **docs-only** = full `preflight:fast` v tomto běhu neběžel.

---

## Počty (musí sedět se SUMMARY)

| Stav | Počet | Podíl |
|------|-------|-------|
| ✅ Shoda | 36 | 58 % |
| ⚠ Drift / částečná | 12 | 19 % |
| ❌ Rozpor | 0 | 0 % |
| ❓ Neověřeno | 14 | 23 % |

*Kontrola: 36+12+0+14 = 62.*

⚠: XC-06,12,14,21,25,29,31,36,53,55,56,61.  
❓: XC-18,19,20,27,38,39,42,44,47,48,49,57,59,62.

---

## A. Architektura

| ID | Contract (zkráceně) | Evidence | Tests | Status | Poslední ověření |
|----|---------------------|----------|-------|--------|------------------|
| XC-01 | TikFinity→MIA→OBS | Etapa 2 map; 3D OR-01; ingest→delivery→OBS | ingest/pipeline + obs suites (hist) | ✅ | fresh code 2026-07-28 (wiring) |
| XC-02 | Business logika v MIA | 3F HTML poll; 3D render-only | overlay_public_*; graphics_r1 | ✅ | fresh 2026-07-28 + 3F 2026-07-27 |
| XC-03 | OBS render/transport | `MIA_OBS_LIVE_MANIFEST`; hands; no ledger | obs_* fast (3D) | ✅ | 3D 2026-07-27; spot 2026-07-28 |
| XC-04 | Public no coins | `stripValueFieldsForPublic` denylist coins | overlay_public_*; koj_public_snapshot | ✅ | fresh 2026-07-28 strip src |
| XC-05 | Dual voice OFF | `MIA_DUAL_VOICE`; speaker_routing | speaker_routing_contract | ✅ | 3E 2026-07-27; env default spot |
| XC-06 | rotationIndexByTier no cross reset | `MIA_VIDEO_ENGINE` per-tier map | video_rotation_smoke (jen T1 seq) ⚠ | ⚠ | fresh code 2026-07-28; cross-tier contract **chybí** (3A GAP-02) |
| XC-07 | Capability≠compliance≠Cross | metodika 3*/4 | — (meta) | ✅ | docs 2026-07-28 |
| XC-08 | 3A–3I SoT internals | SCOPE ownership | — | ✅ | docs 2026-07-28 |

---

## B. Gift → Economy → Overlay (S01)

| ID | Contract | Evidence | Tests | Status | Poslední ověření |
|----|----------|----------|-------|--------|------------------|
| XC-09 | Gift→resolver→miaPoints | 3B SUPPORT_RESOLVER; config 7.5 | support/economy contracts (3B) | ✅ | 3B 2026-07-27 |
| XC-10 | Strip na public API | OVERLAY_PUBLIC_RESPONSE | overlay_public_*; engine2 strip reuse | ✅ | fresh 2026-07-28 |
| XC-11 | Single economy config SoT | stream_economy_config.json; 3A/3B | spam/tier contracts | ✅ | 3A/3B 2026-07-27 |
| XC-12 | Spam T4 HUD ↔ shadow video cap | shadow `T4→T3` cap; wave T4 | spam session vs shadow mismatch | ⚠ | fresh cite 3A GAP-01 / 3B B01 2026-07-28 |
| XC-13 | Ledger/profile miaPoints public | GIFT_SUPPORTER_PROFILE; viewer-memory | phase2_viewer_memory | ✅ | 3B/3G 2026-07-27 |
| XC-14 | Host team split + Away | host panel OK; Away stub | host_mode_overlay; Away thin | ⚠ | 3F/3D 2026-07-27 (Away stub) |
| XC-15 | Viewer-memory no chat text | core/viewer-memory.js | phase2_viewer_memory | ✅ | 3G 2026-07-27 |

---

## C. Gift → Video/OBS + HUD (S02)

| ID | Contract | Evidence | Tests | Status | Poslední ověření |
|----|----------|----------|-------|--------|------------------|
| XC-16 | Gift→Video Engine tier | MIA_VIDEO_ENGINE; 3A | video_* / gift presentation | ✅ | 3A 2026-07-27 |
| XC-17 | In-tier rotation advances | rotationIndexByTier++ | video_rotation_smoke | ✅ | 3A 2026-07-27 |
| XC-18 | OBS media slots T1–T5 | 3D OR-38/58; manifest media | obs media unit; live ❓ | ❓ | hist. R1-C Gift 2026-07-26 (ne fresh) |
| XC-19 | Gift overlay v37 poll | 3F gift-animation; bust 37 | graphics_r1; live viz ❓ | ❓ | hist. R1-C 2026-07-26 |
| XC-20 | Combo/spam HUD ↔ engine | combo-overlay; spam session | combo_* contracts; live ❓ | ❓ | hist. R1-C krok 7 2026-07-26 |
| XC-21 | rotationIndex ephemeral restart | 3G PR-65 / GAP-G06 | žádný restart e2e rotace | ⚠ | fresh 3G cite 2026-07-28 |

---

## D. Gift → Voice (S03)

| ID | Contract | Evidence | Tests | Status | Poslední ověření |
|----|----------|----------|-------|--------|------------------|
| XC-22 | Music→bubble + suppress TTS | SPEAKER_ROUTING meta; GIFT_PRESENTATION | speaker_routing_contract | ✅ | 3E 2026-07-27 |
| XC-23 | Voice-first hide bubble | delivery + speech-overlay | speaker_routing; layout (mimo fast) | ✅ | 3E/3F 2026-07-27 |
| XC-24 | Speak queue + holdUntil | DELIVERY_RUNTIME | voice_*_ctx / speaker | ✅ | 3E 2026-07-27 |
| XC-25 | Flush overlay po TTS | flushOverlayQueue code | overlay_voice_queue_smoke **mimo fast** | ⚠ | code 2026-07-28; 3E/3F GAP |
| XC-26 | Dual OFF single path | MIA_DUAL_VOICE default | speaker_routing dual ON opt-in | ✅ | 3E 2026-07-27 |
| XC-27 | MIA_VOICE + anti-echo | ensure/revive; Desktop mute | unit revive; live echo ❓ | ❓ | hist. R1-C Audio 2026-07-26 |

---

## E. Koj / Bowl (S04)

| ID | Contract | Evidence | Tests | Status | Poslední ověření |
|----|----------|----------|-------|--------|------------------|
| XC-28 | Gift→bowl→kojDisplay | bowl engine; kojDisplay | kojnozout_* / bowl wiring | ✅ | 3A/3C 2026-07-27 |
| XC-29 | 95% viz vs 100% T4 trigger | shouldTriggerFullBowl; mood≥95 | T-C01 chybí | ⚠ | 3C GAP-C01 2026-07-27 |
| XC-30 | CARE→kojDisplay→OBS Koj | CARE*; OBS MIA_KOJ_RUNTIME | koj_* ; obs koj | ✅ | 3C/3D 2026-07-27 |
| XC-31 | Trust vs bond-only | KJ-23 ❌ v 3C; CARE outputs | — | ⚠ | 3C 2026-07-27 (❌ modul; cross = Decision) |
| XC-32 | Reaction order MIA→Koj | REACTION_ORDER ~3.2s | koj reaction contracts | ✅ | 3C 2026-07-27 |
| XC-33 | kojDisplay no coins | getPublicKojSnapshot | koj_public_snapshot_contract | ✅ | 3C 2026-07-27 |

---

## F. Battle (S05)

| ID | Contract | Evidence | Tests | Status | Poslední ověření |
|----|----------|----------|-------|--------|------------------|
| XC-34 | Gift→World Layer→battle | WORLD_LAYER_RUNTIME miaPoints | world_layer_*; phase3 | ✅ | 3H 2026-07-27; spot 2026-07-28 |
| XC-35 | Power HUD miaPoints | duel/arena overlay pts | phase3_game_layer; host_team | ✅ | 3H/3B 2026-07-27 |
| XC-36 | Dual battle models | DUEL vs PLATFORM_ARENA | oba unit; žádná unified FSM | ⚠ | 3H GAP-H02 2026-07-27 |
| XC-37 | Item→itemPower | handleItemCommand | item/phase3 | ✅ | 3H 2026-07-27 |
| XC-38 | Live 2-stream duel | unit sync ✅; live ❌ | duel_cross_stream_sync unit | ❓ | **nikdy** live (GAP-H01) |
| XC-39 | Arena overlay + OBS ensure | arena-battle-overlay; ensure script | demo contracts; live ensure ❓ | ❓ | hist. R1-C viz; ensure **nikdy** |

---

## G. Chat → Voice → Overlay → OBS (S06)

| ID | Contract | Evidence | Tests | Status | Poslední ověření |
|----|----------|----------|-------|--------|------------------|
| XC-40 | Chat→routing→TTS | SPEAKER_ROUTING; Edge TTS | speaker_routing; chat→MIA test thin (C05) | ✅ | 3E 2026-07-27 (kód); test gap 3C |
| XC-41 | TTS→bubble hide | voiceMirror / voice-first | speaker + overlay layout | ✅ | 3E/3F 2026-07-27 |
| XC-42 | TTS→MIA_VOICE sink | mia-voice-overlay; ensure-voice | unit; live path ❓ | ❓ | hist. R1-C; ensure E2E thin |
| XC-43 | Queue priority / pin / TTS win | pickActiveOverlay | overlay_layout (mimo fast) | ✅ | 3F 2026-07-27 |
| XC-44 | Gift+chat burst no double echo | queue exists; live overlap | unit only | ❓ | **nikdy** (E02/F04) |

---

## H. Overlay poll (S07)

| ID | Contract | Evidence | Tests | Status | Poslední ověření |
|----|----------|----------|-------|--------|------------------|
| XC-45 | /overlay-state strip | OVERLAY_PUBLIC_RESPONSE body | overlay_public_* | ✅ | fresh 2026-07-28 |
| XC-46 | HTML no economy math | speech/gift/combo HTML poll | graphics_r1; layout | ✅ | 3F 2026-07-27 |
| XC-47 | Admin coins ≠ public leak | admin surfaces; public strip | public ✅; admin spot-check ❓ | ❓ | **nikdy** admin live (F09/B10) |

---

## I. OBS reconnect / voice revive (S08)

| ID | Contract | Evidence | Tests | Status | Poslední ověření |
|----|----------|----------|-------|--------|------------------|
| XC-48 | Watchdog/bootstrap reconnect | OBS_BOOTSTRAP; stream-watchdog | phase1_stream_watchdog; live kill ❓ | ❓ | unit 2026-07-27; live **nikdy** |
| XC-49 | revive/ensure-voice | obs_revive_voice.js; ensure-voice | smoke mimo fast / ops | ❓ | **nikdy** fresh live tento běh |
| XC-50 | Post-connect chain | POST_CONNECT_RUNTIME | obs post-connect contracts (3D) | ✅ | 3D 2026-07-27 |
| XC-51 | Body parts default OFF | catalog defaultVisible false | graphics_body; OR-08 | ✅ | 3I/3D 2026-07-27 |

---

## J. Persistence hydrate (S09)

| ID | Contract | Evidence | Tests | Status | Poslední ověření |
|----|----------|----------|-------|--------|------------------|
| XC-52 | Boot SEED_CTX hydrate | runtime-state composeKojSeed | runtime_state_seed_ctx; phase1_runtime_state | ✅ | 3G 2026-07-27 |
| XC-53 | Multi-file Koj+RS+economy | různé debounce; direct writes | partial unit; e2e consistency ❓ | ⚠ | 3G GAP-G02 |
| XC-54 | Overlay/voice ephemeral | in-memory overlayState; holdUntil | by design docs | ✅ | 3G/3E/3F 2026-07-27 |
| XC-55 | Atomic jen partial stores | RS atomic; Koj direct | phase1_runtime_state | ⚠ | 3G GAP-G04 |

---

## K. Crash recovery (S10)

| ID | Contract | Evidence | Tests | Status | Poslední ověření |
|----|----------|----------|-------|--------|------------------|
| XC-56 | Soft-fail; no .bak | soft-fail load; no quarantine | soft-fail unit paths | ⚠ | 3G GAP-G01 (VYSOKÁ) |
| XC-57 | Kill mid-write multi-file | — | **žádný** live e2e | ❓ | **nikdy** |

---

## L. Editor → Bank → gift (S11)

| ID | Contract | Evidence | Tests | Status | Poslední ověření |
|----|----------|----------|-------|--------|------------------|
| XC-58 | Editor ≠ processEvent | routes/paint mimo ingest | event_pipeline; 3I ED | ✅ | 3I 2026-07-27; spot 2026-07-28 |
| XC-59 | Export→Bank→gift resolve | export_paint_to_animation_bank; C1–C6 | phase16 unit; live shot ❓ | ❓ | unit 3I; live gift camera **nikdy** |
| XC-60 | Staging≠live + gate | productionGate.js | graphics_body / gate tests | ✅ | 3I 2026-07-27 |

---

## M. Host / Away / dual (S12)

| ID | Contract | Evidence | Tests | Status | Poslední ověření |
|----|----------|----------|-------|--------|------------------|
| XC-61 | Away stub cross 3D+3F | panel OK; behavior stub | host_mode_overlay | ⚠ | 3D/3F 2026-07-27 |
| XC-62 | Dual-host live | unit sync only | duel_cross_stream_sync | ❓ | **nikdy** |

---

## Guardrails GR-X (souhrn do povinné tabulky)

| GR | Status souhrn | Poznámka |
|----|---------------|----------|
| GR-X01 | ✅ | XC-01…03 |
| GR-X02 | ✅ | XC-02/46 |
| GR-X03 | ✅ | XC-04/10/45 (admin ❓ odděleně XC-47) |
| GR-X04 | ✅ | XC-05/26 |
| GR-X05 | ⚠ | XC-06 kód OK, cross-tier test thin |
| GR-X06 | ✅ | XC-03/18 (live media ❓ ne porušení) |
| GR-X07 | ⚠ | XC-52 ✅ + XC-53/55/56 durability drift |
| GR-X08 | ✅ | XC-58/60 |

---

## Poznámky k důkazům

1. **Fresh 2026-07-28** = spot-check klíčových handoffů (`stripValueFieldsForPublic`, `rotationIndexByTier`, `MIA_DUAL_VOICE`, `WORLD_LAYER` miaPoints, speaker suppress, export/paint boundary) — **ne** plný re-run všech 3* suites.  
2. **Hist. R1-C 2026-07-26** pokrývá vizuál/audio živě — v matrix jako ❓ kde vyžadujeme fresh live.  
3. **XC-31** — modulový ❌ Trust v 3C; Cross status **⚠** (rozhodnutí CARE modelu), ne nový ❌ architektury TikFinity→OBS.  
4. SUMMARY počty **musí** = 36 ✅ / 12 ⚠ / 0 ❌ / 14 ❓.
