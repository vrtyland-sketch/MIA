# Etapa 3 — Engine2 + Lab Flags

**Datum:** 2026-07-27  
**Oblast:** Engine2 stub, Action Queue, dual voice, theme manager, MIA NEXT vs Engine2

**Klíčové rozlišení:** Produkční decision path = **MIA NEXT shadow runtime** (default ON). **Engine2 stub** = separátní lab vrstva (default OFF).

---

## 1. MIA NEXT shadow runtime (produkce)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `MIA_NEXT/engine_shadow_runtime.js` — phase_decide, action_builder, spam session, gift presentation |
| **Co neumí** | — |
| **Vstup** | Normalized event po enrich |
| **Výstup** | `actionResult` → present/execute |
| **Testy** | `shadow_pipeline`, `event_pipeline`, `action_builder_runtime`, většina fast suites |
| **NEOVĚŘENO** | Fallback když NEXT explicitně OFF |

**Flag:** implicit default (`deriveRuntimeMode()`); `MIA_NEXT_RUNTIME_ENABLED` true

---

## 2. Engine2 stub (`MIA_ENGINE2_STUB`)

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Default** | **OFF** (`0` nebo unset) |
| **Co umí když ON** | Admin snapshot; overlay profile bypass; E1 modules (GameState, VisibilityEngine, PlatformProjection, PlatformRenderer); E2 applicator/bus/OBS router |
| **Co neumí** | **Neřídí live stream pipeline** — pouze admin preview + contract wiring |
| **Vstup** | `MIA_ENGINE2_STUB=1` |
| **Výstup** | Admin engine2 endpoints; optional overlay profile |
| **Testy** | `engine2_roadmap`, `engine2_first_slice`, `engine2_e2`, `engine2_e3`, `engine2_e4`, `engine2_e5` |
| **NEOVĚŘENO** | Live stream s Engine2 ON — záměrně mimo RC |

**Když OFF:** `isEngine2StubEnabled()` → false; admin snapshot undefined; overlay profiles null

---

## 3. Action Queue (`MIA_ACTION_QUEUE`)

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Default** | **OFF** |
| **Co umí když ON** | Advisory enqueue akcí; admin ON/OFF/Flush; persist queue JSON |
| **Co neumí když OFF** | Stream běží přímo — žádné queue delay |
| **Co umí když FULL** | `MIA_ACTION_QUEUE_FULL=1` — full routing místo advisory |
| **Vstup** | Pipeline actions |
| **Výstup** | Queued/deferred execution |
| **Testy** | `phase1_action_queue` |
| **NEOVĚŘENO** | Production AQ soak (DoD historicky green) |

**Kill switch:** `MIA_ACTION_QUEUE=0` vždy wins nad admin/disk

---

## 4. Dual voice (`MIA_DUAL_VOICE`)

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Default** | **OFF** (unset nebo `0`) |
| **Co umí když ON** | Druhý Edge TTS hlas pro Koj companion (`cs-CZ-AntoninNeural`); deferred delivery |
| **Co neumí když OFF** | Jen MIA single voice |
| **Vstup** | Flag + actionResult s Koj speaker |
| **Výstup** | Dual audio sequence |
| **Testy** | `speaker_routing`, `runtime_smoke` |
| **NEOVĚŘENO** | R1-C audio s dual ON — PASS 2026-07-26 (historicky) |

---

## 5. Theme manager (`MIA_THEME_MANAGER`)

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Default** | **OFF** (`phase2.themeManager.enabled: false`) |
| **Co umí když ON** | CSS theme vars v overlay-state; persist `data/mia-theme.json`; thin MVP |
| **Co neumí když OFF** | Default stream vzhled bez theme vars |
| **Vstup** | Admin theme select + flag |
| **Výstup** | Theme CSS variables v snapshot |
| **Testy** | `theme_manager` |
| **NEOVĚŘENO** | Live OBS s custom theme |

---

## 6. Tech forms (`MIA_TECH_FORMS`)

| Pole | Hodnota |
|------|---------|
| **Stav** | ❌ nefunguje / jen návrh |
| **Default** | **OFF** |
| **Co umí když ON** | Stub runtime hook (phase3) |
| **Co neumí** | Shipped stream feature |
| **Vstup** | Flag ON |
| **Výstup** | Minimal stub |
| **Testy** | `phase3_game_layer` |
| **NEOVĚŘENO** | — |

---

## 7. User mode (`MIA_USER_MODE`)

| Pole | Hodnota |
|------|---------|
| **Stav** | ❌ nefunguje / jen návrh |
| **Default** | **OFF** |
| **Co umí když ON** | Phase 4 boundary stub |
| **Co neumí** | Produkční user-facing mode |
| **Vstup** | Flag ON |
| **Výstup** | Stub responses |
| **Testy** | `phase4_product_boundary` |
| **NEOVĚŘENO** | — |

---

## 8. MIA Director (`MIA_DIRECTOR`)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Default** | **ON** (`runtime.json phase2.director.enabled: true`) |
| **Co umí** | Advisory plan pro chat/gift responses |
| **Co neumí** | — |
| **Vstup** | Event context |
| **Výstup** | Director plan v pipeline |
| **Testy** | `phase2_mia_director` |
| **NEOVĚŘENO** | — |

---

## 9. Combo moments (`MIA_COMBO_MOMENTS`)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Default** | **ON** |
| **Co umí** | Combo moment detector; spam wave integration |
| **Co neumí** | — |
| **Vstup** | Gift sequence |
| **Výstup** | comboMoment flags |
| **Testy** | `phase2_combo_moments`, `combo_wave_ui` |
| **NEOVĚŘENO** | — |

---

## 10. Viewer memory / inventory flags

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ / ⚠ |
| **Default** | **ON** (oba) |
| **Co umí** | Viewer memory persist; inventory grant stubs |
| **Co neumí** | Inventory hloubka ⚠ |
| **Testy** | `phase2_viewer_memory`, `phase3_game_layer` |
| **NEOVĚŘENO** | — |

---

## 11. Battle MVP flag

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Default** | **ON** (`MIA_BATTLE_MVP`) |
| **Co umí** | State machine battle vs instant legacy (`=0`) |
| **Testy** | `phase3_game_layer` |
| **NEOVĚŘENO** | — |

---

## 12. shared/mia-*-core (87 modulů)

| Pole | Hodnota |
|------|---------|
| **Stav** | ❌ nefunguje / jen návrh (pro stream) |
| **Default** | Untracked v git |
| **Co umí** | Canon scaffold pro budoucí import |
| **Co neumí** | **Nepřipojeno k live stream path** |
| **Testy** | `master_canon_*` (mimo fast) |
| **NEOVĚŘENO** | Live wiring vs `MIA_GIFT_ECONOMY.js` |

---

## Tabulka default OFF vs ON

| Flag | Default | Stream impact když OFF | Funguje když ON |
|------|---------|------------------------|-----------------|
| `MIA_ENGINE2_STUB` | OFF | Žádný — stream OK | Admin preview, overlay profiles |
| `MIA_ACTION_QUEUE` | OFF | Přímý pipeline (normální stream) | Queued actions |
| `MIA_DUAL_VOICE` | OFF | Single MIA voice | MIA + Koj dual TTS |
| `MIA_THEME_MANAGER` | OFF | Default CSS | Theme vars v overlay |
| `MIA_KICK_ENABLED` | ON | Bez Kick chat | Kick bridge active |
| `MIA_TWITCH_ENABLED` | OFF | Bez Twitch | Twitch bridge |
| `MIA_TELEGRAM_ENABLED` | OFF | Bez Telegram | Telegram replies |
| `MIA_TECH_FORMS` | OFF | — | Stub only |
| `MIA_USER_MODE` | OFF | — | Stub only |
| MIA NEXT runtime | ON (implicit) | NEOVĚŘENO fallback | **Produkční path** |

---

## Shrnutí oblasti

| ✅ | ⚠ | ❌ |
|----|----|-----|
| 4 | 4 | 3 |

**Stream-ready:** MIA NEXT + default ON flags (director, combo, battle, watchdog). Lab flags default OFF — neblokují RC.

*Etapa 3 — docs only.*
