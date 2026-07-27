# Engine 2.0 — E5a slice (flag OFF by default)

**Status:** E1–E5a stubs. Composition inventory + plugin loader when `MIA_ENGINE2_STUB=1`.

| Path | Module |
|------|--------|
| [`composition/`](./composition/) | E5a index.js line inventory + shrink progress |
| [`game/hello/`](../../game/hello/) | E4 demo plugin (no-op) |
| [`plugin-loader/`](./plugin-loader/) | E4 load/unload + sandbox bus |
| [`overlay-profiles/`](./overlay-profiles/) | E3 main/clean/host/game profiles |
| [`obs-router-boundary/`](./obs-router-boundary/) | E2 obs.renderRoute |
| [`event-bus-stub/`](./event-bus-stub/) | E2 normalize ? apply |
| [`platform-renderer/`](./platform-renderer/) | PlatformRenderer |
| [`game-state/`](./game-state/) | GameState |
| [`wiring.js`](./wiring.js) | Admin snapshot hook |

**Enable:** `MIA_ENGINE2_STUB=1`

**Admin snapshot (stub ON):** `phase: "E5a"`, `composition` inventory, E4 plugins, E3 profiles, E2 bus/OBS.

**Plugin API:**
- `GET /api/mia-admin/engine2/plugins`
- `POST /api/mia-admin/engine2/plugins/hello/load`
- `POST /api/mia-admin/engine2/plugins/hello/unload`

**Tests:** `mia_engine2_*_contract.js` (incl. `engine2_e5`)

**Related:** [`docs/MIA_ENGINE_2_0_E5_COMPOSITION.md`](../docs/MIA_ENGINE_2_0_E5_COMPOSITION.md)
