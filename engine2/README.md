# Engine 2.0 — E1 first slice (flag OFF by default)

**Status:** Four core modules implemented; wired to admin status only when `MIA_ENGINE2_STUB=1`.

| Path | Module |
|------|--------|
| [`game-state/`](./game-state/) | GameState — read-only snapshot facade |
| [`visibility-engine/`](./visibility-engine/) | VisibilityEngine — platform channel filters + miaPoints sanitization |
| [`platform-projection/`](./platform-projection/) | PlatformProjection — tiktok/kick/obs/admin shapes |
| [`platform-renderer/`](./platform-renderer/) | PlatformRenderer — snapshot ? visibility ? projection |
| [`gamestate-stub/`](./gamestate-stub/) | Backward-compatible re-export of game-state |
| [`obs-router-boundary/`](./obs-router-boundary/) | OBS command boundary notes (future) |
| [`wiring.js`](./wiring.js) | Optional admin snapshot hook |

**Enable (dev only):** `MIA_ENGINE2_STUB=1` — exposes `engine2` field on `GET /api/mia-admin/status`.

**Default:** OFF — no stream/overlay behavior change.

**Tests:** `tests/mia_engine2_first_slice_contract.js` (preflight fast)

**Docs:**

- [`docs/MIA_ENGINE_2_0_ARCHITECTURE.md`](../docs/MIA_ENGINE_2_0_ARCHITECTURE.md)
- [`docs/MIA_ENGINE_2_0_ROADMAP.md`](../docs/MIA_ENGINE_2_0_ROADMAP.md)

**Guardrails (unchanged):** TikFinity ? MIA ? OBS · overlay `miaPoints` only · per-tier video rotation without reset.
