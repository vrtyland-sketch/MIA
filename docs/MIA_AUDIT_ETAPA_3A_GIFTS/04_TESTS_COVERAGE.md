# Etapa 3A — Pokrytí testy (contracts vs kánon)

Mapování kánonních pravidel na existující contract/smoke testy.  
Preflight profil: `npm run test:preflight:fast` (`scripts/run_preflight_tests.js --fast`).

---

## Legenda pokrytí

| Symbol | Význam |
|--------|--------|
| 🟢 | Contract v preflight:fast nebo dedicated npm suite |
| 🟡 | Test existuje, ale **slow** / mimo fast preflight |
| 🔴 | Pravidlo bez dedikovaného contractu |
| ❓ | Pokrytí nepřímo / smoke / manuální R1-C |

---

## Core guardrails (tvrdá pravidla)

| Pravidlo | Test soubor(y) | Preflight:fast | Pokrytí |
|----------|----------------|----------------|---------|
| Overlay bez coins (`stripValueFieldsForPublic`) | `tests/overlay_public_response_contract.js` | 🟢 | 🟢 |
| Overlay public wiring | `overlay_public_wiring`, `overlay_public_ctx` | 🟢 | 🟢 |
| miaPoints konverze + coin tiers | `tests/gift_economy_contract.js` | 🟢 | 🟢 |
| Playback max(coin, catalog) | `gift_economy` (Galaxy), `gift_map` (Lion) | 🟢 | 🟢 |
| T6 → T5 obsTier | `gift_economy` | 🟢 | 🟢 |
| Per-tier rotace (single tier) | `tests/video_rotation_smoke.js` | 🟡 slow | 🟡 |
| Cross-tier rotace bez resetu | — | — | 🔴 |
| Video timing >60s | `tests/video_timing_contract.js` | 🟡 slow | 🟡 |
| Speaker routing gift | `tests/speaker_routing_contract.js` | 🟡 smoke suite | 🟡 |

---

## Gift map & resolver

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| Alias Rose/Lion/Galaxy | `tests/gift_map_contract.js` | 🟢 | 🟢 |
| Overlay showCoins false | `gift_map` | 🟢 | 🟢 |
| Bowl fill z mapy | `gift_map` | 🟢 | 🟢 |
| enrichNormalizedSupport fields | `gift_economy`, `gift_map` | 🟢 | 🟢 |
| Gift map audit log | `tests/gift_map_log_audit_contract.js` | 🟢 | 🟢 |
| Runtime gift pipeline | `gift_runtime`, `gift_runtime_ctx` | 🟢 | 🟢 |
| Gift media / video plan | `gift_media_runtime`, `gift_media_ctx` | 🟢 | 🟢 |
| User metadata / ledger | `gift_user_metadata` | 🟢 (full preflight) | 🟢 |

---

## Spam / combo / throttle

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| Spam session milestones T2–T4 | `tests/spam_session_contract.js` | 🟡 smoke | 🟡 |
| spamRewardTier alias | `spam_session_contract` | 🟡 | 🟡 |
| **Shadow cap T4→T3** | — | — | 🔴 |
| Combo ×10/50/100 | `gift_economy`, `combo_overlay`, `phase2_combo_moments` | 🟢 combo in fast | 🟢 |
| Combo wave UI (miaPoints only) | `combo_wave_ui`, `graphics_r1` | 🟢 | 🟢 |
| Per-user ack throttle | `user_ack_throttle` (v `npm run test:gift-map`) | 🟡 gift-map npm | 🟡 |
| Large stream T1 silent policy | — | — | 🔴 |

---

## Bowl / Koj

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| Bowl snapshot public | `koj_public_snapshot` | 🟢 | 🟢 |
| Bowl full trigger wiring | `koj_moments_runtime`, `gift_media_ctx` | 🟢 | 🟡 indirect |
| Bowl visual bands 30/60/95 | — | — | 🔴 |
| processBowlCycle reset | — | — | 🔴 |
| Belly spam HUD miaPoints only | `kojnozout_runtime_split`, `graphics_r1` | 🟢 | 🟢 |

---

## Animace / Kapybara

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| resolveVariantIndex / care | `gift_animation_context` | 🟡 slow | 🟡 |
| Gift visual animation bank | `gift_visual_animation_bank` | 🟡 `test:gift-visual` | 🟡 |
| Capybara AWAY flow | `capybara_flow_ctx` | 🟢 ctx wiring | 🟡 wiring only |
| 20s → wait chat → AI | — | — | 🔴 E2E |

---

## Economy metadata

| Pravidlo | Test | Preflight:fast | Pokrytí |
|----------|------|----------------|---------|
| Gift level Lv1–8 | `gift_economy` | 🟢 | 🟢 |
| Streak bonus % | `gift_economy` | 🟢 | 🟢 |
| Streak days increment | `gift_economy` (supporter profile) | 🟢 | 🟡 unit |
| Boss banner T4 | `gift_economy` | 🟢 | 🟢 |
| Achievement moment | `achievement_moment` (gift-map suite) | 🟡 npm script | 🟡 |
| recentGifts shape | `gift_user_metadata`, `overlay_public_response` | 🟢 / full | 🟢 |

---

## npm scripts (rychlá reference)

```powershell
npm run test:preflight:fast    # core gift suites včetně gift_economy, gift_map, overlay_public
npm run test:gift-map          # + achievement, user_ack_throttle, log audit
node tests/video_rotation_smoke.js   # slow — rotace
node tests/spam_session_contract.js
node tests/gift_animation_context_contract.js
```

---

## Pravidla **bez** contractu (priorita doplnění)

1. **Cross-tier video rotation** — T1→T3→T1 index continuity (G-31)
2. **Shadow spam T4 cap** — očekávané chování milestone vs video tier (GAP-01)
3. **Support reaction policy** — large stream silent T1, T3 bypass (G-46)
4. **Bowl full E2E** — percent 95→100→T4 video→reset (G-50, G-51)
5. **Capybara E2E** — AWAY 20s timer + comment pickup (G-55)
6. **Bowl visual level thresholds** — 30/94 vs 30/60/95 (G-49)
7. **Streak persistence** — restart / next-day (G-78)

---

## Shrnutí pokrytí

| Kategorie | 🟢 Fast | 🟡 Slow/Indirect | 🔴 Chybí |
|-----------|---------|------------------|----------|
| Core guardrails | 5 | 3 | 1 |
| Gift map | 8 | 0 | 0 |
| Spam/combo | 3 | 3 | 2 |
| Bowl/Koj | 2 | 2 | 3 |
| Animace/Kapybara | 0 | 3 | 2 |
| Economy meta | 5 | 2 | 0 |
| **Celkem pravidel v tabulce** | **23** | **13** | **8** |

**Závěr:** Tvrdá guardrail pravidla (overlay, tier, map, combo) mají **silné** contract pokrytí v preflight:fast. Behaviorální edge cases (spam T4 cap, cross-tier rotace, bowl E2E, capybara loop) jsou **slabě** pokryty nebo nepokryty.
