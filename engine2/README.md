# Engine 2.0 — E3 slice (flag OFF by default)

**Status:** E1–E3 stubs. Multi-profile overlay routes when `MIA_ENGINE2_STUB=1` + `?profile=`.

| Path | Module |
|------|--------|
| [`game-state/`](./game-state/) | GameState — read-only snapshot facade |
| [`visibility-engine/`](./visibility-engine/) | VisibilityEngine — platform channel filters + miaPoints sanitization |
| [`platform-projection/`](./platform-projection/) | PlatformProjection — tiktok/kick/obs/admin shapes |
| [`platform-renderer/`](./platform-renderer/) | PlatformRenderer — snapshot ? visibility ? projection |
| [`event-applicator/`](./event-applicator/) | E2 — apply normalized gift/comment into stub state |
| [`event-bus-stub/`](./event-bus-stub/) | E2 — normalize ? apply (no live ingest) |
| [`obs-router-boundary/`](./obs-router-boundary/) | E2 — obs projection ? `obs.renderRoute` envelope |
| [`overlay-profiles/`](./overlay-profiles/) | E3 — main/clean/host/game overlay-state profiles |
| [`gamestate-stub/`](./gamestate-stub/) | Backward-compatible re-export of game-state |
| [`wiring.js`](./wiring.js) | Optional admin snapshot hook |

**Enable (dev only):** `MIA_ENGINE2_STUB=1` — admin status + `/overlay-state?profile=main|clean|host|game`.

**Default:** OFF — `/overlay-state` without `?profile=` unchanged.

**Tests:** `mia_engine2_first_slice_contract.js`, `mia_engine2_e2_contract.js`, `mia_engine2_e3_contract.js`

**Docs:**

- [`docs/MIA_ENGINE_2_0_ARCHITECTURE.md`](../docs/MIA_ENGINE_2_0_ARCHITECTURE.md)
- [`docs/MIA_ENGINE_2_0_ROADMAP.md`](../docs/MIA_ENGINE_2_0_ROADMAP.md)

**Guardrails (unchanged):** TikFinity ? MIA ? OBS · overlay `miaPoints` only · per-tier video rotation without reset.
