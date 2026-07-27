# Engine 2.0 — E4 slice (flag OFF by default)

**Status:** E1–E4 stubs. Multi-profile overlay + plugin loader when `MIA_ENGINE2_STUB=1`.

| Path | Module |
|------|--------|
| [`game/hello/`](../../game/hello/) | E4 demo plugin (no-op) |
| [`plugin-loader/`](./plugin-loader/) | E4 load/unload + sandbox bus |
| [`overlay-profiles/`](./overlay-profiles/) | E3 main/clean/host/game profiles |
| [`obs-router-boundary/`](./obs-router-boundary/) | E2 obs.renderRoute |
| [`event-bus-stub/`](./event-bus-stub/) | E2 normalize ? apply |
| [`platform-renderer/`](./platform-renderer/) | PlatformRenderer |
| [`game-state/`](./game-state/) | GameState |
| [`wiring.js`](./wiring.js) | Admin snapshot hook |

**Enable:** `MIA_ENGINE2_STUB=1`

**Plugin API:**
- `GET /api/mia-admin/engine2/plugins`
- `POST /api/mia-admin/engine2/plugins/hello/load`
- `POST /api/mia-admin/engine2/plugins/hello/unload`

**Tests:** `mia_engine2_*_contract.js`
