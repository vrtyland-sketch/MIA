# Etapa 4 — Test coverage of **chains** (E2E / integration / preflight)

**Datum:** 2026-07-28  
**Záměr:** Pokrytí **řetězců** (handoff A→B→C), ne inventář všech unit testů modulů (ty = 3A–3I `04_TESTS_COVERAGE.md`).  
**Tento běh:** docs-only — **`npm run test:preflight:fast` neběžel** (viz Poslední ověření).

---

## Legenda

| Symbol | Význam |
|--------|--------|
| 🟢 | V `preflight:fast` (nebo ekvivalent routinely run) — **řez** řetězce |
| 🟡 | Existuje mimo fast / full / manuální npm script |
| ❓ | Jen live OBS/Edge/TikTok — nebo **nikdy** |

---

## Scenario × coverage

| Scénář | Chain (zkráceně) | 🟢 Fast řezy | 🟡 Mimo fast | ❓ Live only / nikdy | Verdikt pokrytí |
|--------|------------------|--------------|--------------|----------------------|-----------------|
| **S01** Gift→Economy→strip | resolver→miaPoints→strip | overlay_public_*; support/economy (3B); graphics_r1 strip | event-normalizer projection thin | admin coin spot-check | **Unit-sliced silný**; full gift→HUD e2e thin |
| **S02** Gift→Video+OBS+HUD | video engine→media→HTML | video_rotation_smoke (T1); gift presentation partial; combo_* | cross-tier rotace contract **chybí** | OBS media+gift viz (hist R1-C) | **Sliced**; live ❓ |
| **S03** Gift→Voice music/TTS | suppress→bubble / TTS | speaker_routing_contract | overlay_voice_queue_smoke | anti-echo live | **Policy ✅**; flush/burst 🟡/❓ |
| **S04** Gift→Koj/Bowl→OBS | bowl→kojDisplay→browser | kojnozout_* / koj_* bohaté | bowl 95/100 band contract chybí | full bowl T4 sync live | **Koj unit silný**; práh ⚠ |
| **S05** Gift→Battle→Overlay | world layer→duel/arena→HUD | phase3_game_layer; world_layer_*; host_team | platform_arena; choreography; duel_cross_stream_sync | 2-stream live; ensure-arena live | **MVP unit**; live dual ❓ |
| **S06** Chat→Voice→bubble→MIA_VOICE | routing→TTS→hide→OBS | speaker_routing; voice_*_ctx | ensure/revive smoke | single sink live; burst | **Routing ✅**; OBS audio ❓ |
| **S07** Overlay poll no coins | /overlay-state strip | overlay_public_*; koj_public_snapshot | layout contract mimo fast | admin≠public live | **Hranice ✅** |
| **S08** OBS reconnect / revive | WD→bootstrap→voice | phase1_stream_watchdog; obs bootstrap subsets | obs:revive-voice ops; scene guard | kill obs64→reconnect | **Kód+unit**; live ❓ |
| **S09** Persist→restart→hydrate | disk→SEED_CTX→runtime | phase1_runtime_state; runtime_state_seed_ctx; viewer_memory | multi-file timing e2e | — | **Hydrate ✅**; multi-file ⚠ |
| **S10** Crash mid-write | kill→corrupt→recover | soft-fail paths partial | corrupt-JSON dedicated thin | kill mid-write **nikdy** | **❓ dominant** |
| **S11** Editor→Bank→gift | export→gate→bank→resolve | mia_paint_* / graphics_body / phase16 (částečně ve fast) | full paint/animation-engine | live custom shot | **Export unit**; live ❓ |
| **S12** Host/Away / dual | Away / 2-host | host_mode_overlay | Away behavior stub | dual-host live | **Panel ✅**; product ⚠/❓ |

---

## Kde jsou řetězce **jen unit-sliced** (důležité)

Typický pattern Stream Core:

```
[ ingest unit ] → [ resolver unit ] → [ delivery unit ] → [ overlay strip unit ]
                         ↘ [ video unit ]     ↘ [ speaker unit ]
```

Chybí často **jeden** test, který projde gift fixture → economy → delivery → public snapshot → (mock) OBS URL v jednom procesu.

| Chain gap | Důsledek |
|-----------|----------|
| Spam T4 HUD + shadow video | GAP-X01 nechycen integračně |
| Bowl 95–99 → no T4 | GAP-X02 |
| TTS end → flush overlay | GAP-X06 mimo fast |
| Cross-tier rotation | GAP-X07 |
| Multi-file save timing | GAP-X03 |
| 2-stream | jen HTTP sync unit |

---

## Navržené chain testy (Decision later — **neimplementovat teď**)

| ID | Název | Scénář | Cíl | Navrh. lane |
|----|-------|--------|-----|-------------|
| T-X01 | `cross_gift_economy_strip_chain` | S01 | gift fixture → miaPoints → strip no coins | 🟢 fast |
| T-X02 | `cross_spam_t4_hud_vs_shadow_video` | S01/S02 | assert shoda nebo explicit skip reason | 🟢 |
| T-X03 | `cross_bowl_95_vs_100_trigger` | S04 | pásmo 95–99 bez T4; 100 s T4 | 🟢 |
| T-X04 | `cross_music_gift_suppress_tts` | S03 | už částečně speaker_routing — rozšířit delivery assert | 🟢 |
| T-X05 | `cross_flush_overlay_after_tts` | S03/S06 | promote smoke do fast | 🟢 |
| T-X06 | `cross_rotation_tiers_independent` | S02 | T1 index nezresetuje T3 | 🟢 |
| T-X07 | `cross_world_layer_gift_to_arena_pts` | S05 | gift→miaPoints→arena | 🟢/🟡 |
| T-X08 | `cross_restart_hydrate_koj_economy` | S09 | write→reboot seed | 🟡 |
| T-X09 | `cross_kill_mid_write_recovery` | S10 | chaos | ❓ lab |
| T-X10 | `cross_live_r1d_checklist` | S02/S06/S08 | manuální R1-D | ❓ live |

---

## Mapování na prior test packs (SoT)

| Oblast | Prior `04_TESTS_COVERAGE` |
|--------|---------------------------|
| Gifts / video | 3A |
| Economy / strip | 3B |
| Koj / bowl | 3C |
| OBS | 3D |
| Voice | 3E |
| Overlay HTML | 3F |
| Persist | 3G |
| Battle | 3H |
| Editor | 3I |

Etapa 4 **nepočítá** znovu všechny unit PASS — jen zda **chain** má alespoň jeden řez.

---

## Odhad „Testováno“ pro povinnou tabulku

| Kategorie | Počet XC | Poznámka |
|-----------|----------|----------|
| XC s relevantním 🟢/🟡 důkazem | **38** | většina ✅ + část ⚠ |
| XC bez plného chain důkazu (vč. ❓ live) | **24** | 62−38 |
| Navržené T-X* | **10** | Decision later |

*Kontrola se SUMMARY: Testováno 38 · Chybí test 24 · XC celkem 62.*

---

## Ops poznámka (guardrail)

Po budoucí změně stream/OBS/ingest logiky (až Decision board schválí kód):

1. `node --check index.js`  
2. `npm run test:preflight:fast`  

Tento Cross Audit **záměrně** nespouštěl — docs-only capstone.
