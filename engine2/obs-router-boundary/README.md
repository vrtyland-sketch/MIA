# OBS Router boundary (Phase E2)

Documents and implements the **gateway envelope** from MIA Platform Renderer to future OBS WebSocket. Game logic must not call OBS directly.

| Layer | Location |
|-------|----------|
| E2 thin adapter | [`index.js`](./index.js) — `routeObsProjection()` ? `obs.renderRoute` |
| Canon OBS Integration Layer | `shared/mia-obs-core/obsIntegrationLayer.js` |
| Today's production paths | `MIA_VIDEO_ENGINE.js`, OBS bootstrap / watchdog modules |

## Boundary rules

1. **No gift tier or Koj mood logic** in OBS Router — only scene/media/browser-source commands.
2. Plugins **never** open OBS WebSocket; they emit actions ? Event Bus ? Renderer ? Router.
3. Overlay coin/gift values **never** pass through OBS layer — public overlay uses `miaPoints` only.

## E2 envelope

```js
{
  kind: "obs.renderRoute",
  version: "engine2/0.1.0-e2",
  target: "obs",
  scene: "main",
  mediaQueue: [],
  kojMood: "calm",
  routedAt: 1234567890
}
```

WebSocket wiring remains deferred; E2 ships the stable JSON shape + admin preview only.
