# GameState stub (Phase E1)

Prototype **read-only** facade for Engine 2.0. Maps today's JSON state files to a single snapshot API.

**Not wired** to `index.js` or overlay routes until Phase E1 behind `MIA_ENGINE2_STUB=0` (default OFF).

Future home: `shared/mia-state-core/` + persistence adapters for `data/kojnozout-*.json`.

**Single-writer rule:** Renderers and OBS read snapshots; mutations go through Event Bus actions (later phases).
