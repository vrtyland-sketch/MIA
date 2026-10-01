# Etapa 3B — Pokrytí testy (contracts vs kánon)

Mapování kánonních pravidel MIA body & ekonomiky na existující contract/smoke testy.  
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

## Core guardrails (tvrdá pravidla)

| Pravidlo | Test soubor(y) | Preflight:fast | Pokrytí |
|----------|----------------|----------------|---------|
| Overlay strip coins (`stripValueFieldsForPublic`) | `tests/overlay_public_response_contract.js` | 🟢 | 🟢 |
| Public response wiring | `overlay_public_wiring`, `overlay_public_ctx` | 🟢 | 🟢 |
| Koj snapshot coin strip | `overlay_public_response` | 🟢 | 🟢 |
| recentGifts ledger strip | `overlay_public_response`, `gift_user_metadata` | 🟢 / full | 🟢 |
| Graphics R1 overlay no coins | `tests/mia_graphics_r1_contract.js` | 🟢 | 🟢 |
| Live audit overlay_state_no_coins | `bodyLiveAudit` via `audit:live` | — | ❓ |

---

## Konverze & tier ekonomika

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| 7.5 miaPoints per coin | `gift_economy_contract.js` | 🟢 | 🟢 |
| Coin tier T1–T6 ranges | `gift_economy` | 🟢 | 🟢 |
| Default coins tier mode | `gift_economy` | 🟢 | 🟢 |
| Legacy miaPoints tier mode | — (env branch) | — | 🔴 |
| tierKinds coin/stream/map | `gift_economy` Galaxy test | 🟢 | 🟢 |
| Playback max(coin, catalog) | `gift_economy`, `gift_map` | 🟢 | 🟢 |
| T6 → T5 obsTier | `gift_economy` | 🟢 | 🟢 |
| XP base = totalCoins | `gift_economy` | 🟢 | 🟢 |
| giftXp.viewer multiplier | `gift_map` | 🟢 | 🟢 |
| `core/event-normalizer` overlay projection | — | — | 🔴 |

---

## XP, combo, streak, supporter

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| Gift level Lv1–8 | `gift_economy` | 🟢 | 🟢 |
| Combo ×10/50/100 | `gift_economy`, `combo_overlay`, `phase2_combo_moments` | 🟢 | 🟢 |
| Streak bonus % | `gift_economy` | 🟢 | 🟢 |
| Streak days increment (unit) | `gift_economy` supporter block | 🟢 | 🟡 |
| Streak multi-day / restart | — | — | 🔴 |
| Supporter achievements store | `gift_map` | 🟢 | 🟢 |
| Gift runtime enrich supporter | `gift_runtime` | 🟢 | 🟢 |
| T0 engagement aggregate | `sprint5_contract.js` | 🟡 npm sprint | 🟡 |
| Resolved ctx internal giftValue shape | `gift_economy` (partial) | 🟢 | 🟡 |

---

## Spam reward tiers (miaPoints)

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| Spam milestones T2–T4 prahy | `spam_session_contract.js` | 🟡 smoke | 🟡 |
| spamRewardTier alias | `spam_session_contract` | 🟡 | 🟡 |
| Wave HUD miaPoints only | `combo_wave_ui`, `graphics_r1` | 🟢 | 🟢 |
| Belly spam HUD miaPoints | `kojnozout_runtime_split` | 🟢 | 🟢 |
| **Shadow cap T4→T3** | — | — | 🔴 |

---

## Ledger, host team, arena

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| Gift user ledger record/prune | `gift_user_metadata` | full preflight | 🟢 |
| Host team split math | `sprint5`, `sprint_d` | 🟡 | 🟡 |
| Host team UI visibility | `host_team_ui_contract.js` | 🟡 | 🟡 |
| Host team score accumulate | `sprint5` | 🟡 | 🟡 |
| Platform arena miaPoints | `phase3_game_layer` | 🟡 | 🟡 |
| Duel snapshot miaPoints | `arena_battle_demo_ctx` | 🟡 | 🟡 |
| Viewer memory miaPoints/level | `phase2_viewer_memory` | 🟡 | 🟡 |
| Viewer memory personalize thanks | `gift_map` | 🟢 | 🟢 |

---

## Achievement & rewards

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| Achievement public moment | `achievement_moment_contract.js` | 🟡 gift-map npm | 🟡 |
| Private achievement suppressed | `achievement_moment` | 🟡 | 🟡 |
| Achievement in presentation plan | `achievement_moment` | 🟡 | 🟡 |
| Rewards schema teamPoints | `sprint5`, `gift_map` | 🟡 / 🟢 | 🟢 |

---

## npm scripts (rychlá reference)

| Script | Relevantní pro 3B |
|--------|-------------------|
| `npm run test:preflight:fast` | overlay_public, gift_economy, gift_map, graphics_r1 |
| `npm run test:gift-map` | achievement_moment, user_ack (mimo body core) |
| `npm run test:smoke` | spam_session (partial) |
| `node tests/sprint5_contract.js` | host team, audit, teamPoints |
| `node tests/phase2_viewer_memory_contract.js` | viewer levels |
| `node tests/phase3_game_layer_contract.js` | arena miaPoints |

---

## Chybějící testy (doporučení — bez implementace v tomto auditu)

| # | Mezera | Navrhovaný contract |
|---|--------|---------------------|
| T-B01 | Shadow spam T4→T3 cap vs engine T4 | `spam_shadow_reward_cap_contract.js` |
| T-B02 | Cross-day streak po simulovaném restartu | `supporter_streak_persistence_contract.js` |
| T-B03 | Legacy `MIA_GIFT_ECONOMY_TIERS=legacy` tier prahy | extend `gift_economy_contract.js` |
| T-B04 | `projectEventForOverlay` nikdy nevrátí coins | `event_normalizer_overlay_contract.js` |
| T-B05 | Public naming — žádný subtext s raw „coins“/„Kč“ | extend `overlay_public_response` fixtures |
| T-B06 | Host team end-to-end enrich → score state | `host_team_economy_wiring_contract.js` |
| T-B07 | Internal giftContext leak guard delivery path | `gift_delivery_public_shape_contract.js` |

**7 chybějících testů** identifikováno (5 🔴 + 2 🟡 partial).

---

## Pokrytí vs matrix (souhrn)

| Kategorie | Počet pravidel (matrix) | S 🟢 testem | S 🟡/❓ | Bez testu 🔴 |
|-----------|-------------------------|-------------|---------|--------------|
| Guardrails | 8 | 7 | 1 (live audit ❓) | 0 |
| Ekonomika core | 20 | 17 | 1 | 2 |
| Profily/ledger | 10 | 8 | 2 | 0 |
| Spam/combo | 6 | 4 | 0 | 2 |
| Arena/duel/viewer | 8 | 6 | 2 | 0 |
| Achievement/rewards | 4 | 3 | 1 | 0 |
| Admin/disk | 4 | 1 | 2 | 1 |
| **Celkem** | **60** | **46** | **9** | **5** |

> **Poznámka:** Pravidlo může být ✅ shoda i s 🔴 test mezerou — compliance ≠ test coverage.
