# Etapa 3C — Compliance matrix (Kojnožrout vs kánon)

**Legenda stavu:** ✅ shoda · ⚠ částečná / drift · ❌ rozpor · ❓ neověřeno

| ID | Funkce / pravidlo | Kánon | Implementace (soubor / logika) | Testy | Stav |
|----|-------------------|-------|--------------------------------|-------|------|
| KJ-01 | Samostatná entita (ne dekorace) | A1 | `MIA_KOJNOZROUT_ENGINE.js` state machine + vitals | `kojnozout_canon_contract` | ✅ |
| KJ-02 | Pravý dolní roh OBS | A2 | `kojnozrout-runtime.html`, `anchors/koj.json` | `kojnozout_runtime_contract` | ✅ |
| KJ-03 | Priorita Streamer → Koj → MIA | A3 | Vision anchors + overlay z-index | `obs_live_manifest` (partial) | ⚠ |
| KJ-04 | OBS runtime + bowl overlay | A4 | `kojnozrout-runtime.html`, `kojnozrout-bowl-overlay.html` | `kojnozout_runtime`, `runtime_split` | ✅ |
| KJ-05 | TikFinity → MIA → OBS (Koj logika v MIA) | A5 | `index.js` pipeline → `buildKojDisplaySnapshot` | `ingest_contract`, `runtime_split` | ✅ |
| KJ-06 | Default spí/pozoruje (calm/cozy/sleepy) | B6 | `MIA_KOJNOZROUT_VITALS` sleepDepth + DISPLAY ambient | `kojnozout_vitals_duel`, `canon_flow` | ✅ |
| KJ-07 | Nereaguje na všechno | B7 | Throttle + selective activation lanes | `user_ack_throttle`, `support_koj_reaction` | ✅ |
| KJ-08 | Aktivace gift/care/T4/duel/combo | B8 | ENGINE + DISPLAY context pulses | `display_mood`, `support_koj_reaction` | ✅ |
| KJ-09 | `/overlay-state` GET bez side-effect | B9 | `MIA_OVERLAY_STATE.js` peek-only | `overlay_state_runtime` | ✅ |
| KJ-10 | Chat → community ping / vibe | C10 | `applyCommunityPing`, `resolveStreamCommunityVibe` | `vitals_duel` | ✅ |
| KJ-11 | CARE jako zdroj energie | C11 | `MIA_KOJNOZROUT_CARE.applyCareAction` | `canon_contract`, `item_care` | ✅ |
| KJ-12 | Support → vitals + bowl | C12 | `applySupportToKojnozout`, `computeSupportBowlGain` | `vitals_duel`, `evolution` | ✅ |
| KJ-13 | Nálada komunity (wellbeing/vibe) | C13 | VITALS sync + socialState | `vitals_duel` | ✅ |
| KJ-14 | Přítomnost diváků jako energie | C14 | Jen `engagementState` + chat recency proxy | — | ⚠ |
| KJ-15 | Hierarchie Community→CARE→SUPPORT→Events | D15 | Lanes v orchestrátoru, ne jeden modul | `ecosystem_orchestrator` (partial) | ⚠ |
| KJ-16 | CARE silnější než chat | D16 | BOND impact + VALIDATION vs community ping | `canon_flow`, `care_reward` | ✅ |
| KJ-17 | 6 CARE typů (vč. venčení) | D17 | `CARE_ACTIONS` + WALK | `canon_contract`, `walk_unify` | ✅ |
| KJ-18 | Menu `pece` | D18 | `CARE_OPPORTUNITIES` + `routes/care_commands.js` | `care_opportunities` | ✅ |
| KJ-19 | CARE validace (kdo/často/kontext) | D19 | `MIA_KOJNOZROUT_CARE_VALIDATION.js` | `canon_flow`, `user_ack` | ✅ |
| KJ-20 | Soft heal když není nemocný | D19 | `validateCareContext` → soft péče | `canon_flow` | ✅ |
| KJ-21 | CARE výstup Mood | D20 | vitals + DISPLAY mood | `display_mood` | ✅ |
| KJ-22 | CARE výstup Bond | D20 | `MIA_KOJNOZROUT_BOND.js` | `canon_contract`, `care_reward` | ✅ |
| KJ-23 | CARE výstup **Trust** | D20 | **Pole trust v bond/care chybí** | — | ❌ |
| KJ-24 | CARE výstup Activity | D20 | Via energy/behavior, ne named field | partial | ⚠ |
| KJ-25 | CARE výstup Neglect | D20 | `resolveNeglectLevel`, bond decay | `care_reward` | ✅ |
| KJ-26 | Gift → CARE akce | D21 | Care map v gift pipeline | `item_care` (slow) | ✅ |
| KJ-27 | CARE rewards → batoh | D22 | `MIA_KOJNOZROUT_CARE_REWARD.js` | `care_reward` | ✅ |
| KJ-28 | Neglect → smutek/únava/spánek | E23 | vitals + bond tiers | `vitals_duel`, `care_reward` | ✅ |
| KJ-29 | Bond neglect levels | E24 | `MIA_KOJNOZROUT_BOND.js` | `canon_contract` | ✅ |
| KJ-30 | Neglect hints bowl + describeBehavior | E25 | `CARE_OPPORTUNITIES` | `care_reward` "neglect hints" | ✅ |
| KJ-31 | Pasivní bond decay | E26 | `applyPassiveBondDecay` | `canon_contract` (implicit) | ✅ |
| KJ-32 | Bowl prázdná 0–30 % | F27 | `resolveBowlVisualLevel` low `<30` | — | ✅ |
| KJ-33 | Bowl částečná 31–94 % | F27 | **4 pásma:** mid 30–59, high 60–94 | — | ⚠ |
| KJ-34 | Bowl plná ≥95 % visual | F27 | `visualLevel` full at ≥95 | `display_mood` celebrate | ✅ |
| KJ-35 | Bowl fill: gift/support/CARE | F28 | ENGINE + gift map (3A) + CARE feed | `vitals_duel`, 3A G-47 | ✅ |
| KJ-36 | Celebrate sprite při plné misce | F29 | DISPLAY `FULL_BOWL_TRIGGER` → celebrate | `display_mood` | ✅ |
| KJ-37 | T4 event při plné misce | F29 | `KOJNOZROUT_BOWL_ENGINE` + `MIA_BOWL_FULL_VIDEO` | `canon_flow` T4 playback | ⚠ |
| KJ-38 | **T4 trigger threshold** | F29 | Mood/visual ≥95 %; **`shouldTriggerFullBowl` vyžaduje 100 %** | — | ⚠ |
| KJ-39 | Bowl cycle ~750 ms | F30 | `MIA_RUNTIME_LOOPS.js` `every(750, processBowlCycle)` | `runtime_loops_ctx` (indirect) | ✅ |
| KJ-40 | Reset po full hold ~3 s | F31 | `FULL_BOWL_HOLD_MS = 3000` | — | ✅ |
| KJ-41 | Support bowl gain (MIA pt → %) | F32 | `computeSupportBowlGain` 1 pt = 0.01 % | `vitals_duel` | ✅ |
| KJ-42 | kojDisplay public bez coins | F33 | `getPublicKojSnapshot` + strip | `koj_public_snapshot`, `runtime_split` | ✅ |
| KJ-43 | T4 aktivace plnou miskou | G34 | Bowl cycle special playback | `canon_flow`, `bowl_full_video` | ✅ |
| KJ-44 | MIA první, Koj druhý | G35 | `MIA_KOJNOZROUT_REACTION_ORDER.js` | `canon_flow` | ✅ |
| KJ-45 | Deferred Koj ~3 s | G36 | `DEFAULT_KOJ_DELAY_MS = 3200` | `canon_flow` | ✅ |
| KJ-46 | Emoční intenty → companion | G36 | `EMOTIONAL_INTENTS` Set | `canon_flow` | ✅ |
| KJ-47 | Rutinní chat → MIA TTS primary | G37 | `describeEventResponder` default `speaker: "mia"` | speaker test jen gifts | ⚠ |
| KJ-48 | Vitals → expressive mood | H38 | `resolveExpressiveMood` | `display_mood`, `vitals_duel` | ✅ |
| KJ-49 | Kontext combo/duel/gift sprites | H39 | DISPLAY context pulses | `display_mood` | ✅ |
| KJ-50 | Eating rotace eating-01..12 | H40 | Kánon 12; kód **16** variant | `full_sprite_set` (01–16) | ⚠ |
| KJ-51 | Video watch→groove→dance→hype | H41 | `buildKojVideoReactionPhase` | `display_mood` | ✅ |
| KJ-52 | Pose catalog single source | H42 | `pose_frames.js` → `pose-catalog.js` | `pose_resolve`, `runtime` | ✅ |
| KJ-53 | Wander CALM_WANDER_MOODS only | H43 | `koj-runtime-stage.js`, pose rules | `runtime_split` | ✅ |
| KJ-54 | Walk-a/b sync krok | H43 | `--koj-step-dur`, `pose-walk-frames` | `walk_unify`, `runtime_split` | ✅ |
| KJ-55 | Propriocepce render-report | H44 | POST `/mia/koj/render-report` | `runtime_contract` | ✅ |
| KJ-56 | PNG asset set (kánon 290) | H45 | Expanded set; canon number drift | `full_sprite_set`, `sprite_alpha` | ⚠ |
| KJ-57 | Venčení CARE walk | I46 | `MIA_KOJNOZROUT_WALK.js` applyWalkCare | `walk_unify` | ✅ |
| KJ-58 | Jednotná walk visual path | I47 | `resolveWalkVisual` | `walk_unify` | ✅ |
| KJ-59 | Evoluce tiery egg→legend | I48 | `MIA_KOJNOZROUT_EVOLUTION.js` | `evolution`, `evolution_milestone` | ✅ |
| KJ-60 | Celebrate pulse ~6,5 s | I49 | `CONTEXT_PULSE_MS.celebrate` | `display_mood` | ✅ |
| KJ-61 | Batoh per user | J50 | `MIA_KOJNOZROUT_BACKPACK.js` | `canon_contract`, `item_care` | ✅ |
| KJ-62 | Item commands item/batoh/použij | J50 | `MIA_KOJNOZROUT_ITEM_COMMAND.js` | `canon_contract` | ✅ |
| KJ-63 | Duel 5 min MIA points race | J51 | `durationMs: 300000` | `vitals_duel`, `duel_cross_stream` | ✅ |
| KJ-64 | Platform arena 4 žrouti | J52 | `MIA_PLATFORM_ARENA.js`, `MIA_KOJ_ROSTER.js` | `platform_arena`, `phase3_game_layer` | ✅ |
| KJ-65 | Battle choreografie + poses | J53 | `MIA_KOJ_BATTLE_CHOREOGRAPHY.js` | `koj_battle_choreography` | ✅ |
| KJ-66 | Duel power miaPoints (ne coins) | J54 | DUEL scoring | 3B + `vitals_duel` | ✅ |
| KJ-67 | Koj NOT default chat speaker | K55 | `MIA_SPEAKER_ROUTING` default mia | `speaker_routing` (gifts) | ⚠ |
| KJ-68 | Gift → Koj voice primary | K56 | `resolveVoiceDeliveryPlan` | `speaker_routing` | ✅ |
| KJ-69 | MIA primary + deferred companion | K57 | `applyVoiceOverlayPolicy` | `speaker_routing` | ✅ |
| KJ-70 | Dual voice OFF default | K58 | env `MIA_DUAL_VOICE=1` opt-in | `speaker_routing` | ✅ |
| KJ-71 | Persist `kojnozout-state.json` | L59 | `MIA_KOJNOZROUT_PERSISTENCE.js` PERSISTED_FIELDS | `evolution_milestone` round-trip | ✅ |
| KJ-72 | Persist world (backpack/duel) | L60 | `MIA_KOJNOZROUT_WORLD_PERSISTENCE.js` | `world_layer_runtime` (partial) | ✅ |
| KJ-73 | Walk state persistence | L59 | `walkUntilTs` **není** v PERSISTED_FIELDS | — | ⚠ |
| KJ-74 | Test mode MIA_KOJ_TEST_MODE | L61 | `MIA_KOJNOZROUT_TEST_MODE.js` | `test_mode_contract` | ✅ |
| KJ-75 | Streamer probud/duel commands | L61 | `parseKojStreamerCommand` | `test_mode_contract` | ✅ |
| KJ-76 | Koj moments (quest/evolution/duel) | — | `MIA_KOJ_MOMENTS_RUNTIME.js` | `koj_moments_runtime`, `koj_moments_ctx` | ✅ |
| KJ-77 | Robot pet modes | — | `MIA_KOJ_ROBOT_MODES.js` | `koj_robot_modes` | ✅ |
| KJ-78 | 2D factory gfx (arena/item/evol) | alignment | `generate_koj_2d_factory_gfx.js` | `koj_2d_factory` | ✅ |
| KJ-79 | Live OBS duel cross-host | J51 | Model OK | — | ❓ |
| KJ-80 | Avatar viewer interakce | M62 | — | — | ⬜ N/A |
| KJ-81 | Playlist queue | M63 | — | — | ⬜ N/A |
| KJ-82 | NEJSEM TU režim | M64 | — | — | ⬜ N/A |

---

## Souhrn matrix (78 implementačně relevantních řádků KJ-01…KJ-79)

| Stav | Počet | Podíl |
|------|-------|-------|
| ✅ Shoda | 58 | 74 % |
| ⚠ Drift / částečná | 12 | 15 % |
| ❌ Rozpor | 1 | 1 % |
| ❓ Neověřeno | 1 | 1 % |
| ⬜ Budoucí (N/A) | 3 | 4 % |
| **Celkem KJ** | **78** | |

*(⬜ KJ-80…82 nejsou součástí compliance skóre — plánované funkce.)*

---

## Guardrails subset (tvrdá pravidla KJ)

| ID | Guardrail | Stav |
|----|-----------|------|
| GR-K01 | kojDisplay public bez coins/giftValue | ✅ KJ-42 |
| GR-K02 | Koj není default chat TTS speaker | ⚠ KJ-47/67 (kód ✅, test mezera) |
| GR-K03 | MIA první, Koj deferred u emocí | ✅ KJ-44–46 |
| GR-K04 | OBS jen renderuje Koj HTML | ✅ KJ-05 |
| GR-K05 | Bowl T4 vázán na full cycle (ne arbitrary) | ⚠ KJ-37/38 (95 vs 100 %) |
| GR-K06 | Duel/arena body v miaPoints | ✅ KJ-66 |
| GR-K07 | `/overlay-state` side-effect free | ✅ KJ-09 |

**Guardrails: 7 pravidel** — 5 plně ✅, 2 ⚠ (speaker test gap, bowl threshold drift).

---

## Cross-reference Etapa 3A / 3B

| 3C ID | Související 3A/3B | Poznámka |
|-------|-------------------|----------|
| KJ-35, KJ-41 | 3A G-47, G-48 | Gift fill wiring v shared/gifts; Koj applySupport |
| KJ-37, KJ-43 | 3A G-50, G-52 | T4 video resolver; zde Koj celebrate + cycle |
| KJ-33, KJ-38 | 3A G-49 | Bowl pásma — sdílený drift 4-tier + 95/100 |
| KJ-66 | 3B BE-arena | miaPoints duel power |
| KJ-42 | 3B guardrails | Public strip |
