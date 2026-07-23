# MIA Paint — 2D grafický editor (architektura a roadmap)

**Codename:** `MIA Paint`  
**Účel:** Vlastní 2D editor v ekosystému MIA — postupně nahradí závislost na externích nástrojích pro Koj asset pipeline, overlaye, FX sheety a budoucí animace.  
**Platforma cíle:** Windows 11 (primární), web shell v MIA runtime (vývoj + agent API), později nativní obal (Tauri/Electron).

---

## Vztah k existujícímu MIA kódu

| Existující modul | Role | Editor |
|------------------|------|--------|
| `mia-2d-fx.js` | Runtime FX (projectile, burst, canvas partikly) | Export anim sheetů → `fx-manifest.json` |
| `MIA_2D_FX_REGISTRY.js` | Kanonické druhy projectile / burst | Validace exportu z editoru |
| `koj_procedural_png.js` | Procedurální generátor PNG | Nahrazení / doplnění ručním kreslením |
| `koj-vector.js` | SVG Koj postava | Sdílený vektorový engine (Phase 4) |
| `generate_koj_2d_factory_gfx.js` | Batch factory | „Export to Koj Factory“ preset |
| `routes/remote_dev.js` | Agent → Cursor fronta | Stejný auth pattern pro Paint API |

**Pravidlo:** Editor **nemaže** existující factory ani runtime kód. Exportuje do známých cest (`mia-output-overlay/assets/kojnozrout/…`).

---

## Cílové schopnosti (shrnutí)

### Jádro (v1)
- Nekonečné plátno (tile-based GPU compositor)
- Vrstvy + masky vrstev
- Undo / Redo (command pattern)
- Nástroje: štětec (tlak), tužka, guma, výplň, tvary, text, ořez, transformace
- Výběry: obdélník, laso, kouzelná hůlka
- Import/export: PNG, JPG, WEBP, PSD (read), vlastní `.miapaint`
- Plugin systém, autosave, klávesové zkratky, tmavý/světlý režim

### MIA rozšíření (v2+)
- AI generování, odstranění pozadí, inpainting, vrstvy přes AI
- 2D animace (timeline + onion skin)
- SVG / vektor + raster v jednom dokumentu
- Grafické tablety (Pointer Events + Wintab/Windows Ink přes native shell)
- **Otevřené HTTP + WebSocket API** — agent MIA ovládá editor (`/mia/paint/…`)

---

## Architektura (modulární)

```
┌─────────────────────────────────────────────────────────────────┐
│  UI Shell (mia-output-overlay/mia-paint/)                       │
│  toolbar · panels · shortcuts · theme · status                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  Application Controller (app.js)                                │
│  tool routing · selection · file IO UI · plugin host            │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────────┐
│ Document Model│   │ Tool Engine   │   │ Render Pipeline   │
│ layers·masks  │   │ brush·fill·   │   │ WebGPU primary    │
│ history       │   │ select·vector │   │ WebGL2 fallback   │
│ .miapaint     │   │ transform     │   │ tile cache        │
└───────┬───────┘   └───────┬───────┘   └─────────┬─────────┘
        │                   │                     │
        └───────────────────┼─────────────────────┘
                            ▼
              ┌─────────────────────────┐
              │ I/O + Codec Layer       │
              │ png·jpg·webp·psd·svg    │
              └────────────┬────────────┘
                           ▼
              ┌─────────────────────────┐
              │ MIA Paint Bridge        │
              │ routes/mia_paint.js     │
              │ scripts/MIA_PAINT_      │
              │   BRIDGE.js             │
              └────────────┬────────────┘
                           ▼
                    MIA Agent / Remote
```

### Balíčky v repozitáři

| Cesta | Obsah |
|-------|--------|
| `shared/mia-paint-core/` | Čisté JS jádro — testovatelné v Node (document, history, viewport math, event bus) |
| `shared/mia-graphics-studio/` | (Phase 12+) Katalog MIA.* API, šablony platform, pipeline orchestrátor |
| `mia-output-overlay/mia-paint/` | Browser UI + render glue |
| `shared/mia-paint-gpu/` | (Phase 1+) WebGPU/WebGL2 compositor, tile store |
| `shared/mia-paint-io/` | (Phase 6+) kodéky a `.miapaint` serializer |
| `shared/mia-paint-ai/` | (Phase 8+) most na MIA LLM / image API |
| `plugins/mia-paint/` | (Phase 7+) oficiální pluginy |
| `routes/mia_paint.js` | REST + WS pro agenta |
| `scripts/MIA_PAINT_BRIDGE.js` | Server-side session, autosave cesty |
| `tests/mia_paint_*_contract.js` | Contract testy po každé fázi |

---

## Datový model

### Document
```javascript
{
  id, name, version: 1,
  width, height,           // výchozí tile origin (nekonečné plátno = sparse tiles)
  dpi: 72,
  background: "#ffffff" | null,
  layers: Layer[],
  activeLayerId,
  selection: Selection | null,
  meta: { author, createdAt, modifiedAt }
}
```

### Layer
```javascript
{
  id, name, visible, locked, opacity: 0..1,
  blendMode: "normal" | "multiply" | ...,
  kind: "raster" | "vector" | "group",
  tiles: Map<"tx,ty", TileRef>,   // sparse infinite canvas
  mask: LayerMask | null,
  transform: { x, y, scale, rotation }
}
```

### Tile (GPU)
- Velikost: **512×512 px** (konfigurovatelné)
- Formát: `RGBA8` texture v GPU cache; na disk gzip PNG v `.miapaint` zip

### Příkaz (Undo)
Každá editace = immutable command:
`PaintStroke`, `EraseStroke`, `FillRegion`, `MoveLayer`, `TransformSelection`, …  
`HistoryStack` drží undo/redo stacky (max 100 default).

### Vlastní formát `.miapaint`
ZIP obsahující:
- `manifest.json` — document metadata + layer tree
- `tiles/{layerId}/{tx}_{ty}.png` — sparse tiles
- `vectors/{layerId}.svg` — volitelně vektorová vrstva
- `history.snapshot` — volitelný compressed checkpoint (autosave)
- `plugins/` — per-project plugin state

---

## Render pipeline (GPU)

1. **Viewport** — pan/zoom transform (world ↔ screen), pixel snapping volitelné
2. **TileManager** — načte viditelné tiles ± 1 margin, LRU cache (512 MB default)
3. **Compositor (WebGPU)** — blend vrstvy dle pořadí + masky; jeden fullscreen pass + tile blity
4. **Overlay pass** — selection marquee, transform handles, brush cursor (Canvas2D nebo second pass)
5. **Fallback WebGL2** — stejné API, jednodušší shadery

Tablet tlak: `PointerEvent.pressure`, `tiltX/Y`; native shell doplní Wintab.

---

## Tool engine

| Nástroj | Modul | Poznámka |
|---------|-------|----------|
| Brush | `tools/BrushTool.js` | spacing, flow, hardness, pressure curve |
| Pencil | `tools/PencilTool.js` | 1px, bez antialiasingu volitelně |
| Eraser | `tools/EraserTool.js` | alpha composite |
| Fill | `tools/FillTool.js` | scanline + tolerance |
| Shapes | `tools/ShapeTool.js` | rect/ellipse/line |
| Text | `tools/TextTool.js` | HarfBuzz později; zatím system fonts |
| Crop | `tools/CropTool.js` | crop = resize document bounds |
| Transform | `tools/TransformTool.js` | free transform selection |
| Select | `tools/SelectTool.js` | rect/lasso/wand |

Každý tool implementuje: `onPointerDown/Move/Up`, `cursor`, `preview`, `commit() → Command`.

---

## Plugin systém (Phase 7)

```javascript
// plugins/my-plugin/manifest.json
{
  "id": "com.mia.export-koj-sheet",
  "name": "Koj Sprite Sheet Export",
  "apiVersion": 1,
  "entry": "index.js"
}
```

Host poskytuje: `registerTool`, `registerMenu`, `registerExport`, `onDocumentChange`, sandbox iframe volitelně.

---

## MIA Agent API

Autentizace: stejný `localAdminGuard` / `MIA_INGEST_SECRET` jako remote dev.

| Metoda | Endpoint | Popis |
|--------|----------|-------|
| GET | `/mia/paint/status` | otevřený dokument, vrstvy, viewport |
| POST | `/mia/paint/open` | `{ path }` otevřít soubor |
| POST | `/mia/paint/export` | `{ format, path, preset? }` |
| POST | `/mia/paint/command` | `{ action, params }` — undo, newLayer, setTool, … |
| POST | `/mia/paint/ai/generate` | `{ prompt, box }` — Phase 8 |
| WS | `/mia/paint/ws` | live sync pro otevřený editor |

Bridge drží stav posledního připojeného klienta; editor pollne nebo WS pushne změny.

---

## Roadmap

### Phase 0 — Foundation ✅ (aktuální sprint)
- [x] Architektura + tento dokument
- [x] `shared/mia-paint-core` — EventBus, Document, Layer, HistoryStack, Viewport
- [x] Contract test `tests/mia_paint_core_contract.js`
- [x] UI shell `mia-paint/index.html` — theme, pan/zoom, vrstvy stub
- [x] `routes/mia_paint.js` + `MIA_PAINT_BRIDGE.js` — status API
- [ ] Review + merge

### Phase 1 — GPU tile compositor ✅ (aktuální)
- [x] `shared/mia-paint-gpu` — tile math, TileStore, visible culling
- [x] WebGL2 compositor + Canvas2D fallback (`lib/mia-paint-gpu.js`)
- [x] Sparse 512px tiles, kreslení štětcem do aktivní vrstvy
- [x] Dual canvas: GPU + overlay (grid, artboard)
- [x] Test: `tests/mia_paint_gpu_contract.js`
- [ ] WebGPU native compositor (Phase 1b — detekce hotová, render zatím WebGL2)

### Phase 2 — Brush + Eraser + Undo ✅
- [x] `pressureCurve.js` — firm / soft / linear / hard křivky
- [x] `PaintStrokeCommand` — tile snapshot undo/redo
- [x] Guma (`destination-out`) + tlak tabletu
- [x] Ctrl+Z / Ctrl+Y v editoru
- [x] Test: `tests/mia_paint_stroke_contract.js`

### Phase 3 — Výběry + transformace + ořez ✅
- [x] `Selection.js` — rect, laso, mask (wand)
- [x] Obdélníkový výběr (M), laso (L), kouzelná hůlka (W)
- [x] Posun obsahu výběru (T) s undo
- [x] Ořez dokumentu (C) s undo
- [x] Delete — smazat pixely ve výběru
- [x] Marching ants overlay
- [x] Test: `tests/mia_paint_selection_contract.js`

### Phase 4 — Vektor / SVG ✅
- [x] `VectorShape.js` — rect, ellipse, path
- [x] `svgExport.js` — export vektorových vrstev do SVG
- [x] Vektorová vrstva (`addVectorLayer`) + hybrid raster/vector document
- [x] Nástroj vektor obdélník (R) s undo
- [x] Výplň bucket (G) na raster vrstvě s undo
- [x] Export SVG (tlačítko + `/mia/paint/export/svg` + agent `export_svg`)
- [x] Test: `tests/mia_paint_vector_contract.js`
- [x] `shared/mia-svg-primitives.js` — sdílený SVG/canvas renderer
- [x] `koj-vector.js` + runtime načítá `mia-svg-primitives.js`
- [x] Test: `tests/mia_paint_koj_bridge_contract.js`

### Phase 5 — Animace ✅
- [x] `Animation.js` — timeline, snímky, onion skin indexy
- [x] `spriteSheetExport.js` — layout + manifest (`MIA_2D_FX_REGISTRY` rozměry 48×48)
- [x] GPU capture/apply snímků + export manifestu
- [x] Timeline UI (play, +F, capture, Sheet export)
- [x] Test: `tests/mia_paint_animation_contract.js`

### Phase 6 — I/O ✅
- [x] `shared/mia-paint-io/` — manifest, gzip `.miapaint`, raster codec (sharp + pngjs)
- [x] Export PNG / JPG / WEBP (flat composite)
- [x] Import PNG / JPG / WEBP / PSD (PSD = flat composite přes sharp)
- [x] `.miapaint` save/load (gzip JSON bundle + tile PNG payload)
- [x] Server autosave + projects v `data/mia-paint/`
- [x] Editor: Soubor menu, Ctrl+S, Ctrl+Shift+S export PNG
- [x] Test: `tests/mia_paint_io_contract.js`

### Phase 7 — Pluginy + nativní shell ✅
- [x] `PluginHost.js` — manifest, hook whitelist, menu items (bez eval)
- [x] `scripts/MIA_PAINT_PLUGIN_LOADER.js` — whitelist `plugins/mia-paint/`
- [x] Oficiální pluginy: `grid-overlay`, `koj-factory-export`
- [x] Browser `mia-paint-plugin-host.js` + `/mia/paint/plugins` API
- [x] `scripts/MIA_PAINT_NATIVE_BRIDGE.js` — shell capabilities
- [x] `shell.html` + `tools/mia-paint-shell/launch.ps1` (Edge/Chrome app mode)
- [x] Test: `tests/mia_paint_plugin_contract.js`

### Phase 8 — AI + MIA agent ✅
- [x] `shared/mia-paint-ai/` — generate, remove-bg, inpaint (neighbor fill)
- [x] OpenAI DALL-E 2 když je `OPENAI_API_KEY` / `MIA_LLM_API_KEY`, jinak procedurální fallback
- [x] `POST /mia/paint/ai/generate` · `/remove-bg` · `/inpaint`
- [x] `GET /mia/paint/agent/snapshot` — stav pro agenta
- [x] Rozšířené `/mia/paint/command` — rename/remove layer, canvas size, export_koj_factory, …
- [x] Export → Koj Factory jedním klikem → `assets/kojnozrout/custom/`
- [x] Logování do `logs/paint-ai.jsonl`
- [x] Test: `tests/mia_paint_ai_contract.js`

### Phase 9 — Produkční integrace ✅
- [x] `scripts/MIA_PAINT_WS.js` — WebSocket hub `/mia/paint/ws` (localhost only)
- [x] Live sync v editoru (WS + HTTP fallback) · broadcast po HTTP command/sync
- [x] `GET /mia/paint/ws/status` — počet klientů
- [x] Remote Dev: `test:mia-paint`, stav paint, otevři editor
- [x] Preflight fast: `mia_paint_integration` · full: všechny `mia_paint_*` contracty
- [x] Test: `tests/mia_paint_integration_contract.js`
- [x] Kánon: `KANON_MIA_ALIGNMENT.md` · `KANON_SOUCASNY_PREHLED.md`

### Phase 10 — Tauri 2 native shell ✅
- [x] `tools/mia-paint-tauri/` — Tauri 2 scaffold (Rust dialog + fs commands)
- [x] `lib/mia-paint-native-shell.js` — sdílený bridge (tlak pera, postMessage I/O)
- [x] Windows Ink: `touch-action: none`, `readPressure` pro stylus
- [x] Nativní Open/Save přes Tauri invoke (`.miapaint`)
- [x] `npm run paint:tauri` — launcher s fallback na `paint:shell`
- [x] `GET /mia/paint/native/tauri` — info endpoint
- [x] Test: `tests/mia_paint_tauri_contract.js`

### Phase 11 — Live smoke + release readiness ✅
- [x] `scripts/MIA_PAINT_SMOKE.js` — statický + live audit (status, WS, plugins, agent, bridge, editor)
- [x] `npm run paint:smoke` · `paint:smoke:static` (bez serveru)
- [x] Integrace do `audit:live` / `smoke:live` (plné paint kontroly místo WARN)
- [x] `scripts/generate_mia_paint_tauri_icons.js` → `npm run paint:tauri:icons`
- [x] Tauri bundle aktivní s ikonami (NSIS installer po `tauri build`)
- [x] Remote Dev: „paint smoke“
- [x] Test: `tests/mia_paint_smoke_contract.js`

### Phase 12 — MIA Graphics Studio (2D Content Studio) 🟡
- [x] Kánon: `docs/MIA_GRAPHICS_STUDIO.md` — vize, 6 stupňů evoluce, AI moduly
- [x] `shared/mia-graphics-studio/` — katalog `MIA.*` příkazů, šablony, pipeline runner
- [x] `POST /mia/graphics/pipeline` — intent nebo `steps[]`, hybrid server + clientSteps
- [x] `GET /mia/graphics/catalog` — stav implemented / partial / planned
- [x] **12d** — Keyframes, bones, kamera (`Motion.js`, `/mia/graphics/motion/*`)
- [x] **12e** — Částice (`mia-2d-fx`), export GIF / WEBM / MP4
- [ ] AI Pose, Animate, Motion, Lip Sync (12d–12e planned AI)
- [x] **12b** — AI Generate / Edit / Remove BG pod `/mia/graphics/ai/*`
- [x] **12c** — AI Upscale / Restore / Recolor pod `/mia/graphics/ai/*`
- [x] Test: `tests/mia_graphics_studio_12b_contract.js`
- [x] Test: `tests/mia_graphics_studio_12c_contract.js`
- [x] Test: `tests/mia_graphics_studio_12d_contract.js`
- [x] Test: `tests/mia_graphics_studio_12e_contract.js`
- [x] **12f** — `createAvatar`, realtime OBS preview (`mia-graphics-preview.html`), OBS hook `MIA_GRAPHICS_PREVIEW`
- [x] Test: `tests/mia_graphics_studio_12f_contract.js`

---

## Tech stack

| Vrstva | Volba | Důvod |
|--------|-------|-------|
| Jádro | Čistý ES2020 + CJS dual export | Node testy + browser script tags |
| UI | Vanilla JS + CSS (bez React) | Konzistence s overlayi, malý bundle |
| GPU | WebGPU → WebGL2 | Rychlé vykreslování, Electron/Tauri compatible |
| Server | Express routes v `index.js` | Stejný origin jako overlaye |
| Native (Tauri 2) | `tools/mia-paint-tauri/` | Windows Ink, nativní dialogy |

---

## Klávesové zkratky (cíl)

| Zkratka | Akce |
|---------|------|
| Ctrl+Z / Ctrl+Y | Undo / Redo |
| Ctrl+S | Uložit |
| Ctrl+Shift+S | Export |
| B / E / G / F | Brush / Eraser / Fill / … |
| V / M | Move / Marquee |
| Space (držet) | Pan |
| Ctrl+0 / Ctrl+1 | Fit / 100% zoom |
| Ctrl+Shift+N | Nová vrstva |
| [ / ] | Brush size |

---

## Kontrola kvality po každém kroku

```powershell
node tests/mia_paint_core_contract.js
node tests/mia_2d_fx_contract.js    # nesmí regresovat runtime FX
npm run test:arena                   # Koj overlay pipeline
```

Smoke: `npm run paint:smoke` (MIA běží) · `npm run paint:smoke:static` (offline assety)

Manuálně: `http://127.0.0.1:3000/mia-paint/` — pan/zoom, toggle theme, vrstva v panelu.

---

## Bezpečnost

- Paint API jen přes `localAdminGuard` (localhost / token)
- AI operace logovat do `logs/paint-ai.jsonl`
- Pluginy: whitelist cest, žádný arbitrary `eval` bez manifest signature (Phase 7+)
