# Engine 2.0 — E5 Composition shrink (inventory)

**E5a (done):** inventory + `safeRequire` extract. **E5b+:** multi-session host/runtime extractions toward `<500` lines.

## Current inventory (`MIA_ENGINE2_STUB=1`)

Admin snapshot field `composition` (via `GET /api/mia-admin/...` engine2 block):

| Field | Meaning |
|-------|---------|
| `indexLines` | Live line count of `index.js` |
| `targetLines` | 500 (architecture goal) |
| `progressPct` | Reduction vs E5a baseline (~3900 → 500) |
| `modulesRequiredApprox` | `safeRequire("./scripts/...")` count in `index.js` |
| `nextCandidates` | Suggested collect/init host blocks for E5b |

## E5a shipped

- `scripts/MIA_SAFE_REQUIRE.js` — boot-safe require (extracted from `index.js` top)
- `engine2/composition/index.js` — `getCompositionStatus({ indexPath })`
- Admin snapshot `phase: "E5a"` + `composition` object

## Next extraction candidates (E5b — safe slices)

Each follows the existing `collect*Host` / `init*Runtime` pattern already used for route context, OBS, delivery, etc.

1. **Route context** — `collectRouteContextHost` / `initRouteContextRuntime` → `scripts/MIA_ROUTE_CONTEXT_BOOT.js`
2. **Health** — `collectHealthHost` / `initHealthRuntime` → `scripts/MIA_HEALTH_BOOT.js`
3. **OBS bootstrap** — `collectObsBootstrapHost` / `initObsBootstrapRuntime` → `scripts/MIA_OBS_BOOTSTRAP.js`
4. **Delivery** — `collectDeliveryHost` / `initDeliveryRuntime` → `scripts/MIA_DELIVERY_BOOT.js`
5. **Stream state** — `collectStreamStateHost` / `initStreamStateRuntime` → `scripts/MIA_STREAM_STATE_BOOT.js`

**Rule:** one vertical slice per session; run `node --check index.js` + `npm run test:preflight:fast` after each.

## Guardrails (unchanged)

- TikFinity → MIA → OBS; overlay exposes `miaPoints` only
- No big-bang rewrite of `index.js`
- `MIA_ENGINE2_STUB` default OFF
