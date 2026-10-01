# Master Canon 0038 — soulad s projektem

Audit [`0038-obs-integration-layer.md`](./0038-obs-integration-layer.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-obs-core/obsIntegrationLayer.js`

---

## §1–§4 Účel a princip

| Bod | Stav | Důkaz |
|-----|------|-------|
| OBS API | ✅ | `createObsIntegrationLayer` |
| Jediná brána do OBS | ✅ | `validateObsCommand` |
| Tok Action → OBS Layer → WS | ✅ | `execute()` contract |
| Bez rozhodování | ✅ | `decides: false` |

---

## §3 Architektura — 12 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| OBS Connection Manager | ✅ | `manageConnection`, `buildConnectionLifecycle` |
| WebSocket Client | ✅ | `buildWebSocketMessage` |
| Scene Manager | ✅ | `resolveScene`, `getSceneConfig` |
| Source Manager | ✅ | `manageSource` |
| Media Manager | ✅ | `controlMedia`, `OIL_MEDIA_TIER` |
| Overlay Manager | ✅ | `manageOverlay` |
| Filter Manager | ✅ | `manageFilter` |
| Transform Manager | ✅ | `manageTransform` |
| Event Listener | ✅ | `forwardObsEvent` |
| Recovery Manager | ✅ | `planRecovery` |
| OBS Metrics | ✅ | `collectObsMetrics` |
| OBS API | ✅ | `createObsIntegrationLayer` |

---

## §16–§19 Integrace a zákazy

| Oblast | Stav |
|--------|------|
| Action Orchestrator → OBS | ✅ contract |
| Render → OBS | ✅ contract |
| Battle OBS sekvence | ✅ `planBattleObsSequence` |
| WebSocket runtime | 🟡 `MIA_OBS_BOOTSTRAP.js`, `obs-websocket-js` |
| Event Bus hook | 🟡 anchor only |
| Zakázané aktivity | ✅ `OIL_FORBIDDEN_ACTIVITIES` |

---

| Dokument | Stav |
|----------|------|
| [0037](./0037-visual-rendering-system.md) | Visual Rendering System |
| **0038** OBS Integration Layer | 🟢 kanon + kotva + contract |
| **0039** Battle Engine | 🟢 kanon + kotva + contract |
| **0040** (plánováno) | Inventory Engine |
