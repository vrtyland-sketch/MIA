# MIA Board Closeout — 2026-07-27

**Status:** CLOSED  
**Branch:** `master`  
**Scope:** Stream core, Engine 2.0 E1–E5b, graphics sprint, GitHub migration audits

---

## Done (shipped on this board)

| Area | Deliverable |
|------|-------------|
| **Kick** | Kick adapter / ingest fix (platform parity) |
| **R1-C + graphics** | Koj runtime split contracts; tag `v0.1.1-graphics` gate |
| **Engine 2.0 E1** | GameState stub + OBS Router boundary (flag OFF default) |
| **Engine 2.0 E2** | Event bus stub, visibility, OBS render route adapter |
| **Engine 2.0 E3** | Multi-profile overlay (main/clean/host/game) |
| **Engine 2.0 E4** | Plugin loader stub + `game/hello` demo |
| **Engine 2.0 E5a** | Composition inventory + `MIA_SAFE_REQUIRE` extract |
| **Engine 2.0 E5b** | Route-context boot (`MIA_ROUTE_CONTEXT_BOOT.js`) |
| **GitHub** | Private repo migration + audit docs |
| **Audits** | Migration / alignment audits documented |

---

## Deferred (explicitly closed for this board — not open bugs)

These items are **intentionally out of scope** for this session. Resume from [`MIA_ENGINE_2_0_E5_COMPOSITION.md`](./MIA_ENGINE_2_0_E5_COMPOSITION.md) next candidates.

| Item | Notes |
|------|-------|
| **`index.js` < 500 lines** | Multi-session E5c+ thin slices; E5b is one vertical only |
| **Canon import** | `_canon_import/` + `shared/mia-*-core` not committed to git history |
| **Poker / game plugins** | E4 hello stub only; no poker/monopoly code |
| **Remaining E5 extracts** | Health, OBS bootstrap, delivery, stream-state boot modules |
| **E2 live ingest shadow** | Parity tests for full Event Bus wiring deferred |
| **Full `shared/mia-event-core/` surface** | Partial stub only |

---

## Stream defaults (unchanged — safe for production)

| Flag / setting | Default |
|----------------|---------|
| `MIA_ENGINE2_STUB` | **OFF** |
| Action queue (AQ) | **OFF** |
| Dual voice | **OFF** |

Guardrails remain: **TikFinity → MIA → OBS**; overlay exposes **`miaPoints` only**; per-tier `rotationIndexByTier` without reset.

---

## How to continue later

1. Read [`docs/MIA_ENGINE_2_0_E5_COMPOSITION.md`](./MIA_ENGINE_2_0_E5_COMPOSITION.md) — `nextCandidates` list (health boot first).
2. One vertical slice per session; run `node --check index.js` + `npm run test:preflight:fast` after each.
3. Keep `MIA_ENGINE2_STUB=0` until a slice is contract-tested and reviewed.
4. Do not big-bang rewrite `index.js`; follow existing collect/init/runtime boot pattern from E5b.

---

## Verification checklist (closeout)

- [x] `node --check index.js`
- [x] `npm run test:preflight:fast` PASS
- [x] No `data/` or live secrets committed
- [x] Engine2 stub remains OFF by default

**Board:** CLOSED
