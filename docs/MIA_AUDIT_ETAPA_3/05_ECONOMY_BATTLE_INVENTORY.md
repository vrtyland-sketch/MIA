# Etapa 3 — Economy + Battle + Inventory + Playlist

**Datum:** 2026-07-27  
**Oblast:** ekonomika (miaPoints), arena, battle, inventář, playlist

**Pravidlo:** Veřejný overlay a leaderboard expose **jen miaPoints** — ne coins.

---

## 1. Gift economy (XP, combo, streak, boss)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | XP/gift levels; combo thresholds; streak bonus; boss event metadata by tier |
| **Co neumí** | Boss live frequency nekalibrována |
| **Vstup** | Gift support events + viewer history |
| **Výstup** | Economy context v enrich + presentation plan |
| **Testy** | `gift_economy`, `phase2_combo_moments`, `gift_map` |
| **NEOVĚŘENO** | Multi-day streak v produkci |

---

## 2. miaPoints tier thresholds

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `MIA_GIFT_ECONOMY_TIERS=coins` (default) nebo `legacy`; coin→tier mapping |
| **Co neumí** | — |
| **Vstup** | Coin count |
| **Výstup** | Tier T1–T4 |
| **Testy** | `gift_economy`, `gift_runtime` |
| **NEOVĚŘENO** | — |

---

## 3. Viewer memory + levels

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `levelFromMiaPoints`; record gift/chat; persist `data/viewer-memory.json` |
| **Co neumí** | — |
| **Vstup** | Viewer id + miaPoints events |
| **Výstup** | Viewer level v overlay/admin |
| **Testy** | `phase2_viewer_memory` |
| **NEOVĚŘENO** | — |

---

## 4. Platform arena leaderboard

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Activity points weighted by event type; persist `data/platform-arena.json`; battle steal |
| **Co neumí** | — |
| **Vstup** | Gift/chat/like events |
| **Výstup** | Arena rows + battle triggers |
| **Testy** | `phase3_game_layer`, `arena_battle_demo_ctx` |
| **NEOVĚŘENO** | — |

---

## 5. Battle MVP state machine

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | announce → countdown → active; `MIA_BATTLE_MVP` default ON; legacy instant při `=0` |
| **Co neumí** | — |
| **Vstup** | Arena battle action |
| **Výstup** | Battle overlay announcements + state |
| **Testy** | `phase3_game_layer`, `arena_battle_demo_ctx`, admin battle routes |
| **NEOVĚŘENO** | R1-C krok 8 battle viz — PASS 2026-07-26 |

---

## 6. Battle choreography 2D + FX

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Factory + FX contracts; duel/battle/walk CSS polish (Soft Neon) |
| **Co neumí** | Art pass LOW backlog |
| **Vstup** | Battle state transitions |
| **Výstup** | 2D battle animation v overlay |
| **Testy** | Sprint contracts, `graphics_r1`, demo skripty |
| **NEOVĚŘENO** | — |

---

## 7. Battle OBS demo

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `battle:demo` npm skripty; admin inject |
| **Co neumí** | Demo ≠ live stream battle |
| **Vstup** | Admin/demo command |
| **Výstup** | OBS battle overlay sequence |
| **Testy** | `arena_battle_demo_ctx` |
| **NEOVĚŘENO** | Live stream battle s reálnými viewery |

---

## 8. Duel cross-stream sync

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `POST /duel/start`, `/duel/opponent-sync`, export/import; world persist |
| **Co neumí** | Design/test level — vyžaduje druhý peer stream |
| **Vstup** | Admin duel API + opponent POST |
| **Výstup** | Synced duel state |
| **Testy** | Arena routes contracts |
| **NEOVĚŘENO** | Live cross-stream duel |

---

## 9. Viewer inventory

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Co umí** | `core/viewer-inventory.js`; grant item z enrich; persist `data/viewer-inventory.json`; `MIA_VIEWER_INVENTORY` default ON |
| **Co neumí** | Data soubor untracked; hloubka item loop v streamu omezená |
| **Vstup** | Gift milestones / admin grant |
| **Výstup** | Inventory snapshot v overlay |
| **Testy** | `phase3_game_layer` |
| **NEOVĚŘENO** | R1-C krok 8 inventář viz — PASS 2026-07-26 |

---

## 10. Ecosystem orchestrator

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Koordinace world layer, capybara flow, away/solo hooks |
| **Co neumí** | Away mode stub |
| **Vstup** | Pipeline enrich world layer |
| **Výstup** | Ecosystem state mutations |
| **Testy** | `phase3_game_layer`, `world_layer_runtime`, `capybara_flow_runtime` |
| **NEOVĚŘENO** | — |

---

## 11. Playlist economy

| Pole | Hodnota |
|------|---------|
| **Stav** | ❌ nefunguje / jen návrh |
| **Co umí** | Canon stub v `shared/mia-economy-core`; master-canon testy |
| **Co neumí** | **Žádná live pipeline integrace** — ne v `index.js`, `MIA_NEXT`, ani `scripts/` stream path |
| **Vstup** | — |
| **Výstup** | — |
| **Testy** | `mia_master_canon_0041` (canon only, mimo fast) |
| **NEOVĚŘENO** | — |

---

## 12. Poker / Monopoly

| Pole | Hodnota |
|------|---------|
| **Stav** | ❌ nefunguje / jen návrh |
| **Co umí** | Design v Engine 2.0 roadmap |
| **Co neumí** | Shipped kód |
| **Vstup** | — |
| **Výstup** | — |
| **Testy** | — |
| **NEOVĚŘENO** | — |

---

## Shrnutí oblasti

| ✅ | ⚠ | ❌ |
|----|----|-----|
| 8 | 1 | 2 |

**Stream-ready:** Economy + arena + battle MVP jsou stream core. Playlist a hry = design only.

*Etapa 3 — docs only.*
