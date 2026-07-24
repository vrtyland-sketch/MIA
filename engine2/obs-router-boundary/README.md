# OBS Router boundary (Phase E1)

Documents the **sole gateway** from MIA to OBS WebSocket. Game logic must not call OBS directly.

| Layer | Location |
|-------|----------|
| Canon OBS Integration Layer | `shared/mia-obs-core/obsIntegrationLayer.js` |
| Today's production paths | `MIA_VIDEO_ENGINE.js`, OBS bootstrap / watchdog modules |
| Future router queue | Accepts **render intents** from Platform Renderer |

## Boundary rules

1. **No gift tier or Koj mood logic** in OBS Router — only scene/media/browser-source commands.
2. Plugins **never** open OBS WebSocket; they emit actions ? Event Bus ? Renderer ? Router.
3. Overlay coin/gift values **never** pass through OBS layer — public overlay uses `miaPoints` only.

## Phase E1 smoke target

Route one media command (e.g. tier video play intent) through a typed envelope:

```js
{ kind: "obs.renderIntent", target: "media", tier: "T1", rotationIndex: 0 }
```

Implementation wiring is deferred; this folder is documentation + contract anchor only.
