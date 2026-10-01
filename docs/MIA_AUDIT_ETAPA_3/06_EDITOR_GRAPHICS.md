# Etapa 3 — Editor + Grafika

**Datum:** 2026-07-27  
**Oblast:** MIA Paint, Graphics Studio, rig tools, animation bank, stream graphics

**Důležité:** Editor subsystémy **nejsou** součástí live ingest pipeline (`processEvent`).

---

## 1. Koj R1 stream graphics (live)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Combo/spam HUD, tech-energy hype, duel/battle/walk CSS, milestone gesture, dual bust invariant |
| **Co neumí** | Battle art pass = LOW backlog |
| **Vstup** | Live overlay-state poll |
| **Výstup** | Stream visuals v OBS |
| **Testy** | `graphics_r1`, `koj_runtime_split`, `koj_public_snapshot` |
| **NEOVĚŘENO** | R1-C full session — PASS 2026-07-26 |

---

## 2. Cache bust vrstvy

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Speech/bowl/manifest `36-koj-unify`; gift `37-stream-polish`; Koj split `49-r1-milestone-polish`; freeze baseline `32-gfx-whole` |
| **Co neumí** | Freeze baseline neměnit |
| **Vstup** | Deploy + `obs:refresh-overlays` |
| **Výstup** | Cache-busted OBS URLs |
| **Testy** | `graphics_r1` (dual bust invariant), `obs_live_manifest` |
| **NEOVĚŘENO** | — |

---

## 3. MIA Paint / Graphics Studio

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Co umí** | Browser editor `mia-paint/app.js`; routes `/mia-paint`; WS sync; autosave; agent bridge |
| **Co neumí** | Mimo stream core; nepotřebné pro RC stream |
| **Vstup** | Local dev / admin browser |
| **Výstup** | Editor state; optional overlay hooks |
| **Testy** | `mia_paint_smoke`, `mia_paint_integration`, `mia_graphics_studio` (12a–12f), `graphics_body` |
| **NEOVĚŘENO** | Production Tauri desktop deploy |

---

## 4. MIA Paint Tauri shell

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Co umí** | Native bridge contract; desktop wrapper |
| **Co neumí** | Volitelný; ne stream dependency |
| **Vstup** | Tauri app |
| **Výstup** | Native paint window |
| **Testy** | `mia_paint_tauri` |
| **NEOVĚŘENO** | Installed Tauri build on operator machine |

---

## 5. Animation bank / timeline editor

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Co umí** | Animation bank modul; timeline fáze 15–22; production gate testy |
| **Co neumí** | Ne live stream path; slow suites |
| **Vstup** | Admin/studio config |
| **Výstup** | Animation definitions pro gift/Koj |
| **Testy** | `gift_visual` (slow), `story_animation`, `npm run test:animation-engine` |
| **NEOVĚŘENO** | Live stream s custom timeline |

---

## 6. Rig / body part tools

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Co umí** | `mia-part-rig.js`, `mia-rig-anchors.js`, `mia-body-part-runtime.js` — client tooling |
| **Co neumí** | Většina ne server require; body parts skryté v OBS stream |
| **Vstup** | Editor client |
| **Výstup** | Rig preview |
| **Testy** | `graphics_body`, `mia_graphics_studio` |
| **NEOVĚŘENO** | — |

---

## 7. Gift animation desk

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Co umí** | `routes/gift_animation.js`; bind overlay hooks |
| **Co neumí** | Admin/dev only |
| **Vstup** | HTTP admin routes |
| **Výstup** | Gift animation config |
| **Testy** | `gift_animation_context`, paint integration |
| **NEOVĚŘENO** | — |

---

## 8. MIA Graphics Agent (AI assist)

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Co umí** | `MIA_GRAPHICS_AGENT.js` routes z paint |
| **Co neumí** | Detail AI flow NEOVĚŘENO (Etapa 2) |
| **Vstup** | Paint agent commands |
| **Výstup** | AI-generated graphics suggestions |
| **Testy** | `mia_paint_ai`, studio contracts |
| **NEOVĚŘENO** | Live AI assist quality |

---

## 9. Remote dev graphics access

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Co umí** | `routes/remote_dev.js` pro vzdálený přístup |
| **Co neumí** | Volitelné nasazení |
| **Vstup** | Remote tunnel |
| **Výstup** | Dev API access |
| **Testy** | `remote_dev` |
| **NEOVĚŘENO** | — |

---

## 10. Plugin surface (Paint)

| Pole | Hodnota |
|------|---------|
| **Stav** | ❌ nefunguje / jen návrh |
| **Co umí** | `MIA_PAINT_PLUGIN_LOADER.js` — loader kód |
| **Co neumí** | Stream plugin engine (Poker/Monopoly) = design only |
| **Vstup** | — |
| **Výstup** | — |
| **Testy** | `mia_paint_plugin` |
| **NEOVĚŘENO** | — |

---

## Shrnutí oblasti

| ✅ | ⚠ | ❌ |
|----|----|-----|
| 2 | 7 | 1 |

**Stream-ready:** Pouze live Koj/OBS graphics (R1). Paint/studio = lab/tooling mimo stream core.

*Etapa 3 — docs only.*
