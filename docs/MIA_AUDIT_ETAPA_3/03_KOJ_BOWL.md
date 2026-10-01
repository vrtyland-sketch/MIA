# Etapa 3 — Kojnožrout + Bowl

**Datum:** 2026-07-27  
**Oblast:** Koj creature, bowl, vitals, display runtime, care

**Cache bust:** Koj split runtime `49-r1-milestone-polish`; speech/bowl manifest `36-koj-unify`

---

## 1. Koj engine (hlavní stav)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Centrální Koj stav; snapshot builder pro overlay-state; gift/chat impact |
| **Co neumí** | — |
| **Vstup** | Gift/chat/care events → `applyRuntimeStateImpact` |
| **Výstup** | `overlayState.kojnozoutOverlay` |
| **Testy** | `koj_public_snapshot`, `koj_moments_runtime`, `koj_moments_ctx` |
| **NEOVĚŘENO** | — |

---

## 2. Bowl fill / full trigger

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `bowlPercent` 0–100; `shouldTriggerFullBowl`; cooldown guard; full bowl → video trigger |
| **Co neumí** | — |
| **Vstup** | Gift support impact (miaPoints) |
| **Výstup** | Bowl state + full trigger event |
| **Testy** | `koj_public_snapshot`, admin bowl test routes |
| **NEOVĚŘENO** | R1-C krok 8 bowl viz — PASS 2026-07-26 (historicky) |

---

## 3. Bowl overlay (browser)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Bowl visual v OBS browser source; manifest URL bust `36` |
| **Co neumí** | — |
| **Vstup** | Poll `/overlay-state` → kojnozout.bowl |
| **Výstup** | Rendered bowl UI v OBS |
| **Testy** | `obs_live_manifest`, `overlay_public_wiring`, `graphics_r1` |
| **NEOVĚŘENO** | — |

---

## 4. Vitals (hunger, energy, mood)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Hunger, energy, sleep, illness sync; decay tick via runtime loops |
| **Co neumí** | Decay interval detail — Etapa 2 NEOVĚŘENO |
| **Vstup** | Time + care/gift events |
| **Výstup** | Vitals v snapshot + mood shift |
| **Testy** | `koj_moments_runtime`, vitals-duel contracts (via arena) |
| **NEOVĚŘENO** | Long-session decay balance |

---

## 5. Mood / scene / pose runtime

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Split libs: scene, stage, pose, sprite, belly, fx; combo/spam stage classes; party scene fallback |
| **Co neumí** | Battle/duel/walk art pass = LOW backlog (CSS hotovo) |
| **Vstup** | Overlay snapshot + poll tick |
| **Výstup** | Animated Koj v `kojnozrout-runtime.html` |
| **Testy** | `koj_runtime_split`, `koj_walk_unify`, `graphics_r1`, `mia_graphics_r1_contract` |
| **NEOVĚŘENO** | R1-C krok 4 Koj 49 — PASS 2026-07-26 |

---

## 6. Combo/spam belly HUD

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Belly progress bar + countdown; combo moment belly content; jen miaPoints |
| **Co neumí** | — |
| **Vstup** | `comboMoment`, `spamSession` v snapshot |
| **Výstup** | Belly HUD overlay on Koj stage |
| **Testy** | `graphics_r1`, `combo_wave_ui` |
| **NEOVĚŘENO** | — |

---

## 7. Walk moment

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Viewer walk animation; duration `MIA_KOJ_WALK_DURATION_MS` |
| **Co neumí** | — |
| **Vstup** | Walk trigger z pipeline |
| **Výstup** | Walk frame animation + shadow CSS |
| **Testy** | `koj_walk_unify`, `koj_runtime_split` |
| **NEOVĚŘENO** | — |

---

## 8. Evolution tier

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Stage transitions; evolution assets; sprite tier |
| **Co neumí** | — |
| **Vstup** | Cumulative Koj progress |
| **Výstup** | Evolution tier v snapshot + assets |
| **Testy** | `koj_moments_runtime` |
| **NEOVĚŘENO** | Live evolution trigger v streamu |

---

## 9. Care quest / bond

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Co umí** | `MIA_KOJNOZROUT_CARE.js`, care quest modul; item care commands |
| **Co neumí** | Hloubka quest loop v live streamu neověřena |
| **Vstup** | Care commands, chat care |
| **Výstup** | Care state + quest progress |
| **Testy** | `item_care` (mimo fast), `care_commands_wiring` |
| **NEOVĚŘENO** | Full care quest flow v OBS session |

---

## 10. Koj persistence

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `scheduleSaveKojnozoutState` → `data/kojnozout-state.json`; seed při restartu |
| **Co neumí** | Live data necommitovat |
| **Vstup** | State mutations |
| **Výstup** | Disk JSON |
| **Testy** | `phase1_runtime_state`, runtime state contracts |
| **NEOVĚŘENO** | Corrupt file recovery |

---

## 11. Duel (Koj peer)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Local duel state; opponent sync; world persist |
| **Co neumí** | Vyžaduje druhý stream pro full peer test |
| **Vstup** | Admin duel routes, opponent sync POST |
| **Výstup** | Duel overlay + world json |
| **Testy** | Arena/duel contracts, `arena_battle_demo_ctx` |
| **NEOVĚŘENO** | Cross-stream live duel |

---

## Shrnutí oblasti

| ✅ | ⚠ | ❌ |
|----|----|-----|
| 9 | 1 | 0 |

**Stream-ready:** Koj + bowl jsou stream core; R1-C PASS potvrzuje combo/bowl/battle viz.

*Etapa 3 — docs only.*
