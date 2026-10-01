# Genesis Mode — Core Isolation Audit

**Branch:** `feature/mia-genesis-mode`  
**Rule:** žádný zásah do Stream Core (gift economy, video/voice queues, persistence, ingest, `MIA_OBS_LIVE_MANIFEST.js`)

## Phase A — Overlay skeleton

| Check | Result |
|-------|--------|
| New files only under `mia-output-overlay/genesis*`, `assets/genesis/`, `docs/MIA_GENESIS_MODE/` | PASS |
| `index.js` unmodified by Genesis | PASS (not touched) |
| `scripts/MIA_VIDEO_ENGINE.js` | not touched |
| `scripts/MIA_OBS_LIVE_MANIFEST.js` | not touched |
| Gift / economy scripts | not touched |
| Uses `/overlay-state` gift payload | NO — demo JSON only |

**Phase A verdict:** PASS — Core untouched

## Phase B — Panels

| Check | Result |
|-------|--------|
| STATUS / terminal / diagnostics / milestones in genesis-overlay only | PASS |
| Core queues | not touched |

**Phase B verdict:** PASS — Core untouched

## Phase C — Voice bank

| Check | Result |
|-------|--------|
| Packs under `text-bank/packs/genesis/` | PASS |
| Gift voice map / speaker routing Core | not touched |

**Phase C verdict:** PASS — Core untouched

## Phase D — Audio / assets

| Check | Result |
|-------|--------|
| Genesis SFX/BGM under `assets/genesis/` | PASS |
| Live `mia-sound-cues` default / gift audio policy | not modified |

**Phase D verdict:** PASS — Core untouched

## Phase E — Cadence / unlock

| Check | Result |
|-------|--------|
| Cadence in `genesis-runtime.js` only | PASS |
| Unlock is UI/state demo only — no Core gift enable | PASS |

## Phase F — Dual scene + Operator Mode + Module Unlock

| Check | Result |
|-------|--------|
| `genesis-operator.html` + `genesis-bus.js` | PASS |
| Unlock přes BroadcastChannel / localStorage | PASS |
| `index.js` / live manifest / Core queues | not touched |
| Veřejná scéna bez Core gift/chat sources (setup doc) | PASS |

**Phase F verdict:** PASS — Core untouched
