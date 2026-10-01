# Master Canon 0037 — soulad s projektem

Audit [`0037-visual-rendering-system.md`](./0037-visual-rendering-system.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-render-core/visualRenderingSystem.js`

---

## §1–§4 Účel a princip

| Bod | Stav | Důkaz |
|-----|------|-------|
| Render API | ✅ | `createVisualRenderingSystem` |
| Pouze vykreslování | ✅ | `decides: false`, `mutatesInput: false` |
| Tok data → renderer → OBS | ✅ | `render()` contract |
| Bez AI logiky | ✅ | `executesAi: false` |

---

## §3 Architektura — 12 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Render Manager | ✅ | `manageRender`, `buildRenderPipeline` |
| Scene Manager | ✅ | `resolveScene`, `getSceneConfig` |
| Layer Renderer | ✅ | `renderLayers` |
| Camera Manager | ✅ | `manageCamera` |
| Overlay Renderer | ✅ | `renderOverlays` |
| Effect Renderer | ✅ | `renderEffects` |
| Runtime Renderer | ✅ | `selectRuntimeRenderer` |
| OBS Renderer | ✅ | `planObsRender` |
| GPU Manager | ✅ | `manageGpu` |
| Render Optimizer | ✅ | `optimizeRender` |
| Render Metrics | ✅ | `collectRenderMetrics` |
| Render API | ✅ | `createVisualRenderingSystem` |

---

## §16–§19 Integrace a zákazy

| Oblast | Stav |
|--------|------|
| Animation → Render | ✅ contract pipeline |
| Speech sync ve frame pipeline | ✅ |
| HTML overlay runtime | 🟡 `mia-output-overlay/` |
| OBS WebSocket | 🟡 `MIA_OBS_OVERLAY_SYNC.js`, `MIA_OBS_BOOTSTRAP.js` |
| Centrální live wiring | ❌ |
| Zakázané aktivity | ✅ `VR_FORBIDDEN_ACTIVITIES` |

---

| Dokument | Stav |
|----------|------|
| [0036](./0036-animation-engine.md) | Animation Engine |
| **0037** Visual Rendering System | 🟢 kanon + kotva + contract |
| **0038** OBS Integration Layer | 🟢 kanon + kotva + contract |
| **0040** (plánováno) | Inventory Engine |
