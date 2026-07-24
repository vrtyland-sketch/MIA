# Engine 2.0 — Scaffold (not wired to production)

**Status:** Design-only folders. Nothing here is imported by `index.js` yet.

| Path | Purpose |
|------|---------|
| [`gamestate-stub/`](./gamestate-stub/) | Read-only GameState facade prototype for Phase E1 |
| [`obs-router-boundary/`](./obs-router-boundary/) | OBS command boundary notes; production OBS lives in `shared/mia-obs-core/` |

**Docs:**

- [`docs/MIA_ENGINE_2_0_ARCHITECTURE.md`](../docs/MIA_ENGINE_2_0_ARCHITECTURE.md)
- [`docs/MIA_ENGINE_2_0_ROADMAP.md`](../docs/MIA_ENGINE_2_0_ROADMAP.md)

**Guardrails (unchanged):** TikFinity ? MIA ? OBS · overlay `miaPoints` only · per-tier video rotation without reset.

**Enable wiring (future):** `MIA_ENGINE2_STUB=1` — default OFF; not implemented in monolith yet.
