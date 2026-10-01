# Etapa 3C — Pokrytí testy (contracts vs kánon)

Mapování kánonních pravidel Kojnožrout na existující contract/smoke testy.  
Preflight profil: `npm run test:preflight:fast` (`scripts/run_preflight_tests.js --fast`).

---

## Legenda pokrytí

| Symbol | Význam |
|--------|--------|
| 🟢 | Contract v preflight:fast nebo dedicated npm suite |
| 🟡 | Test existuje, ale **slow** / mimo fast preflight |
| 🔴 | Pravidlo bez dedikovaného contractu |
| ❓ | Pokrytí nepřímo / smoke / manuální |

---

## Core guardrails (Koj public API)

| Pravidlo | Test soubor(y) | Preflight:fast | Pokrytí |
|----------|----------------|----------------|---------|
| kojDisplay strip coins | `tests/koj_public_snapshot_contract.js` | 🟢 | 🟢 |
| Runtime split no coins in overlay | `tests/kojnozout_runtime_split_contract.js` | 🟢 | 🟢 |
| Overlay public strip (shared) | `tests/overlay_public_response_contract.js` | 🟢 | 🟢 |
| Graphics R1 Koj corner | `tests/mia_graphics_r1_contract.js` | 🟢 | 🟢 |

---

## Vitals / mood / display

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| Sleep / hunger / quiet stream | `kojnozout_vitals_duel_contract.js` | 🟡 slow suite | 🟡 |
| Support wake + bowl fill | `vitals_duel`, `support_koj_reaction_policy_smoke.js` | 🟡 | 🟡 |
| Expressive mood → sprite | `kojnozout_display_mood_contract.js` | 🟡 | 🟡 |
| Celebrate / combo / duel / gift moods | `display_mood` | 🟡 | 🟡 |
| Video watch chain | `display_mood` | 🟡 | 🟡 |
| Mood derive map | `kojnozout_mood_derive_contract.js` | 🟡 | 🟡 |
| Full sprite set / eating variants | `kojnozout_full_sprite_set_contract.js` | 🟡 | 🟡 |
| Sprite alpha key | `kojnozout_sprite_alpha_contract.js` | 🟡 | 🟡 |
| Stage moods per tier | `koj_stage_moods_contract.js` | 🟡 | 🟡 |
| Viewer presence vitals | — | — | 🔴 |

---

## CARE / bond / validation

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| CARE verbs + bond tiers | `kojnozout_canon_contract.js` | 🟡 | 🟡 |
| CARE validation + reaction order | `kojnozout_canon_flow_contract.js` | 🟡 | 🟡 |
| CARE rewards + neglect hints | `kojnozout_care_reward_contract.js` | 🟡 | 🟡 |
| Item + care + duel items | `kojnozout_item_care_contract.js` | 🟡 npm item_care | 🟡 |
| Care opportunities menu | `care_opportunities_contract.js` | 🟡 | 🟡 |
| User ack throttle (care spam) | `user_ack_throttle_contract.js` | 🟡 gift-map npm | 🟡 |
| Trust field | — | — | 🔴 |
| Care commands wiring | `MIA_CARE_COMMANDS_WIRING` via item_care | 🟡 | 🟡 |

---

## Bowl (Koj strana)

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| Public bowl snapshot | `koj_public_snapshot` | 🟢 | 🟢 |
| Celebrate on full bowl | `display_mood` | 🟡 | 🟡 |
| Bowl T4 special playback | `canon_flow`, `bowl_full_video_contract.js` | 🟡 | 🟡 |
| **Bowl bands 30/60/95** | — | — | 🔴 |
| **95 vs 100 % T4 trigger** | — | — | 🔴 |
| processBowlCycle 750 ms | `runtime_loops_ctx` (indirect) | 🟡 | 🟡 |
| Full hold reset 3 s | — | — | 🔴 |
| Belly spam HUD miaPoints | `runtime_split`, `graphics_r1` | 🟢 | 🟢 |

---

## Runtime / pose / walk

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| Runtime HTML wiring | `kojnozout_runtime_contract.js` | 🟡 | 🟡 |
| Split libs (sprite/belly/scene/pose) | `kojnozout_runtime_split_contract.js` | 🟢 | 🟢 |
| Pose cycle resolve | `kojnozout_pose_resolve_contract.js` | 🟡 | 🟡 |
| Walk unify single path | `kojnozout_walk_unify_contract.js` | 🟢 | 🟢 |
| Walk persistence | — | — | 🔴 |
| 2D factory gfx | `koj_2d_factory_contract.js` | 🟡 | 🟡 |
| OBS visual self-check | `mia_obs_vision`, `mia_display_vision` | 🟡 | 🟡 |

---

## Duel / arena / battle

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| Duel scoring 5 min | `vitals_duel` | 🟡 | 🟡 |
| Cross-stream sync | `duel_cross_stream_sync_contract.js` | 🟡 | 🟡 |
| Platform arena | `platform_arena_contract.js` | 🟡 | 🟡 |
| Phase3 game layer | `phase3_game_layer_contract.js` | 🟡 | 🟡 |
| Battle choreography | `koj_battle_choreography_contract.js` | 🟡 | 🟡 |
| Live dual-host duel | — | — | 🔴 |

---

## Speaker routing

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| Gift T1/T3 → Koj TTS | `speaker_routing_contract.js` | 🟡 smoke | 🟡 |
| MIA deferred companion | `speaker_routing` | 🟡 | 🟡 |
| Dual voice default off | `speaker_routing` | 🟡 | 🟡 |
| **Routine chat → MIA primary** | — | — | 🔴 |
| Direct @Koj chat | `speaker_routing` | 🟡 | 🟡 |
| Vitals companion deferred | `vitals_companion_contract.js` | 🟡 | 🟡 |

---

## Persistence / evolution / test mode

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| Evolution tiers | `kojnozout_evolution_contract.js` | 🟡 | 🟡 |
| Evolution milestone + persist | `kojnozout_evolution_milestone_contract.js` | 🟡 | 🟡 |
| World layer backpack | `world_layer_runtime_contract.js` | 🟡 | 🟡 |
| Test mode env | `kojnozout_test_mode_contract.js` | 🟡 | 🟡 |
| Koj moments runtime | `koj_moments_runtime_contract.js` | 🟢 | 🟢 |
| Koj moments ctx | `koj_moments_ctx_contract.js` | 🟢 | 🟢 |

---

## Robot modes / paint bridge

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| Robot pet modes | `koj_robot_modes_contract.js` | 🟡 | 🟡 |
| MIA Paint Koj bridge | `mia_paint_koj_bridge_contract.js` | 🟡 npm | 🟡 |

---

## Preflight:fast Koj testy (rychlá reference)

| Název v preflight | Soubor |
|-------------------|--------|
| `koj_public_snapshot` | `tests/koj_public_snapshot_contract.js` |
| `koj_walk_unify` | `tests/kojnozout_walk_unify_contract.js` |
| `koj_runtime_split` | `tests/kojnozout_runtime_split_contract.js` |
| `koj_moments_runtime` | `tests/koj_moments_runtime_contract.js` |
| `koj_moments_ctx` | `tests/koj_moments_ctx_contract.js` |
| `item_care` (full preflight) | `tests/kojnozout_item_care_contract.js` |
| `mia_paint_koj_bridge` (full) | `tests/mia_paint_koj_bridge_contract.js` |

---

## Chybějící contracty (navrhované T-C01…T-C08)

| ID | Oblast | Proč |
|----|--------|------|
| T-C01 | Bowl bands + 95/100 trigger | GAP-C01, GAP-C03 — regrese full vs T4 |
| T-C02 | Routine chat → MIA speaker | GAP-C05 — guardrail GR-K02 |
| T-C03 | Trust / bond schema | GAP-C02 — kánonní CARE output |
| T-C04 | processBowlCycle reset timing | GAP-C13 — izolovaný bowl engine test |
| T-C05 | Viewer presence vitals input | GAP-C04 |
| T-C06 | Walk state persistence round-trip | GAP-C10 |
| T-C07 | Domain hierarchy lane priority | GAP-C06 |
| T-C08 | Cross-host duel E2E smoke | GAP-C08 |

---

## Souhrn pokrytí (matrix KJ-01…KJ-79)

| Metrika | Hodnota |
|---------|---------|
| Matrix řádky (bez ⬜) | 79 |
| Řádky s 🟢 nebo 🟡 test důkazem | 58 |
| Řádky 🔴 / bez testu | 21 |
| Navrhované nové contracty | 8 |

**Poznámka:** Mnoho Koj contractů běží v **slow** suite (`npm run test:gift-map`, full preflight), ne v `--fast`. Fast preflight pokrývá **5** přímo Koj-related testů + sdílené overlay strip.

---

## npm scripts (rychlá reference)

```text
npm run test:preflight:fast     # koj_public_snapshot, walk_unify, runtime_split, moments
npm run test:gift-map           # item_care, canon contracts (slow)
npm run koj:self-check          # MIA propriocepce Koj overlay
npm run display:self-check      # celozobrazový OBS layout
npm run generate:koj-poses      # pose catalog rebuild
npm run koj:2d-audit            # 2D factory audit
```
