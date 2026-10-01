# MIA Audit — Etapa 3I: Editor (shoda s kánonem)

**Datum:** 2026-07-27  
**Typ auditu:** Behavior correctness — **Editor / Graphics Studio / MIA Paint** (obsahová továrna, export, assety, overlay/OBS vazby, standalone) proti Stream Core kánonu.  
**Metodika:** Canon ↔ Implementation ↔ Tests ↔ Status + **Poslední ověření** (fresh vs hist. vs nikdy). Stejný bar jako **Etapa 3F / 3G / 3H**.

---

## Stream Core vs Master Canon (povinné rozlišení)

| Vrstva | Co to je | Status v tomto auditu |
|--------|----------|------------------------|
| **Stream Core editor tooling** | MIA Paint (browser + bridge + WS), Graphics Studio body/preview API, timeline→Animation Bank export, production gate, body parts **default OFF**, Koj 2D factory export plugin | Primární měřítko shody |
| **Live stream path** | `processEvent` / gift→overlay→OBS — editor UI **není** součástí | Boundary IN (musí platit oddělení) |
| **Shared knihovny** | `mia-paint-core` LipSync helper volaný z `MIA_DELIVERY_RUNTIME` | **Sdílený modul ≠ editor runtime** — dokumentovat, ne míchat s Paint UI |
| **Master Canon 0037 / 0038** | Visual Rendering / OBS Integration Layer (vize) | **Aspirace** — Stream Core má Paint+Studio+Bank subset |
| **Bone / IK / AI Motion** | Phase 15 foundation | **Foundation** ⚠ — ne „produkční mocap“ |

> Capability inventář (`docs/MIA_AUDIT_ETAPA_3/06_EDITOR_GRAPHICS.md`) = **schopnosti**, ne compliance. Tento pack = **shoda s kánonem**.

---

## Co Etapa 3I pokrývá (IN)

| Oblast | Rozsah |
|--------|--------|
| **MIA Paint** | `mia-output-overlay/mia-paint/`, `routes/mia_paint.js`, `MIA_PAINT_BRIDGE.js`, `MIA_PAINT_WS.js`, agent HTTP+WS |
| **Tauri shell** | `npm run paint:tauri`, native dialogs, Windows Ink — env/Rust požadavky |
| **MIA Graphics Studio** | Phase 12–13 content studio, agent pipeline, lip/speak faces (editor + body publish) |
| **Timeline / Keyframe / export** | `timelineClock.js`, `timeline-editor.js`, `export_paint_to_animation_bank.js`, sound cues, C1–C6 bank |
| **Bone / IK / AI Motion / Lip** | Phase 15 editor foundation vs production readiness |
| **Asset management** | `assets/mia/parts/`, Koj 2D factory plugin, animation bank schema + production gate |
| **Overlay bindings** | Body part overlays default OFF; preview sources; jak export vstupuje do stream overlayů (hranice 3F/3D) |
| **OBS kompatibilita** | Preview browser, body catalog sync, export který OBS konzumuje — **ne** full OBS bootstrap (3D) |
| **Standalone** | Běh editoru bez full stream ingest — skutečná hranice |
| **Uživatelská témata (6)** | (1) oddělení od runtime (2) export pipeline (3) assety (4) overlay vazby (5) OBS (6) standalone |

**Mimo rozsah 3I (OUT):**

| Oblast | Kde |
|--------|-----|
| Live gift / economy / Koj CARE / Voice TTS engines | **3A–3E** |
| Overlay pick/pin runtime UX | **3F** |
| Persist bak / quarantine | **3G** |
| Battle scoring / choreografie | **3H** |
| Full OBS bootstrap / watchdog | **3D** |
| Live gift video rotace | **3A** |
| Immersive scene / multi-cam jako live produkt | cross-link; deep-dive jen pokud editor-owned (většinou OUT) |

---

## Vztah k ostatním etapám (handoffs)

| Etapa | Složka | Handoff |
|-------|--------|---------|
| **3A** | `docs/MIA_AUDIT_ETAPA_3A_GIFTS/` | Animation Bank gift resolve — asset z editoru; live rotace OUT |
| **3B** | `docs/MIA_AUDIT_ETAPA_3B_MIA_BODY_ECONOMY/` | Žádný coins v editor preview / public |
| **3C** | `docs/MIA_AUDIT_ETAPA_3C_KOJNOZROUT/` | Koj 2D factory / moods seed bank |
| **3D** | `docs/MIA_AUDIT_ETAPA_3D_OBS_RUNTIME/` | Body catalog default OFF; OBS ensure OUT |
| **3E** | `docs/MIA_AUDIT_ETAPA_3E_VOICE_TTS/` | Live lipTrack z delivery — shared lib; TTS engine OUT |
| **3F** | `docs/MIA_AUDIT_ETAPA_3F_OVERLAY_RUNTIME/` | Body overlays OFF; pick/pin OUT |
| **3G** | `docs/MIA_AUDIT_ETAPA_3G_PERSISTENCE_RECOVERY/` | Paint autosave `data/mia-paint/` — durability OUT |
| **3H** | `docs/MIA_AUDIT_ETAPA_3H_BATTLE/` | Battle forms / 2D factory assets |
| **3 (Capability)** | `docs/MIA_AUDIT_ETAPA_3/06_EDITOR_GRAPHICS.md` | Inventář schopností |
| **3I (tento)** | `docs/MIA_AUDIT_ETAPA_3I_EDITOR/` | **Editor vs kánon** |
| **Etapa 4** | `docs/MIA_AUDIT_ETAPA_4_CROSS/` | **Cross Audit** — HOTOVO 2026-07-28 (collaboration) |

---

## Zdroje důkazů

- Kánon: `docs/KANON_MIA_ALIGNMENT.md` — Paint, Graphics Studio, timeline, bone foundation, body parts skryté  
- Capability: `docs/MIA_AUDIT_ETAPA_3/06_EDITOR_GRAPHICS.md`  
- Flow: `docs/MIA_AUDIT_ETAPA_2/06_FLOW_EDITOR_GRAPHICS.md`  
- Prior: 3D body OFF, 3F overlay, 3H 2D factory  
- Kód: `mia-paint/**`, `routes/mia_paint.js`, `MIA_PAINT*`, `export_paint_to_animation_bank.js`, `shared/mia-graphics-studio/**`, `shared/mia-paint-core/**`, `shared/mia-animation-engine/**`, `plugins/mia-paint/**`, `tools/mia-paint-tauri/**`  
- Testy: `tests/mia_paint_*`, `mia_graphics_studio_*`, `mia_timeline_*`, `mia_animation_*`, `mia_phase15/16`, `koj:2d-audit`, preflight `mia_paint_*` + `graphics_body`  
- Scripts: `paint:tauri`, `build:mia-paint`, `test:mia-paint`, `test:graphics-body`, `test:animation-engine`, `build:mia-body-parts`

---

## Metodika a statusy

| Symbol | Význam |
|--------|--------|
| ✅ | Shoda — kánon a Stream Core implementace se shodují |
| ⚠ | Částečná shoda / drift — jádro OK, foundation / env / aspirace |
| ❌ | Rozpor — porušení tvrdého pravidla Stream Core |
| ❓ | Neověřeno — chybí důkaz (Tauri install, live AI, live custom timeline) |

**Pravidlo:** Při nejasnosti → **❓ NEOVĚŘENO**, ne domněnka.  
**Gaps = Decision later** — **žádný auto-fix**.

**Poslední ověření:** *fresh* = code/contract **source review** **2026-07-27** (docs-only běh — contract suite **nebyla** znovu spuštěna); *hist.* = Etapa 3 capability / R1 grafika; *nikdy* = bez důkazu. Historický PASS **není** fresh live.

---

## Omezení auditu

- **Žádné změny aplikačního kódu** — pouze dokumentace.
- Contract testy v tomto běhu **neběžely** (docs-only politika).
- Live gift/economy/Koj/TTS/Overlay UX/OBS bootstrap/Battle/persist — **neopravujeme**; cross-link.
- Master Visual Rendering hodnotíme jako **vizi vs Stream subset**, ne jako povinný produkční runtime.
- **Etapa 4 Cross Audit** — dokončeno samostatně 2026-07-28: `docs/MIA_AUDIT_ETAPA_4_CROSS/`.
