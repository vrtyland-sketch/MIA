# MIA Engine 2.0 — Implementation Roadmap

**Status:** Design + scaffold only (no production wiring)  
**Checkpoint:** `v0.1-stream-core` (`903c1d88`)  
**Architecture:** [`MIA_ENGINE_2_0_ARCHITECTURE.md`](./MIA_ENGINE_2_0_ARCHITECTURE.md)  
**Date:** 2026-07-24

---

## 1. Guiding principles

| Rule | Detail |
|------|--------|
| **Graphics first** | Koj runtime, overlay quality, and studio work stay the active product sprint until Phase R1 completes. |
| **Thin vertical slices** | Each milestone moves one boundary — not 100 features, not poker yet. |
| **No big-bang** | `index.js` remains composition root until Phase R4. |
| **Preflight green** | `node --check index.js` + `npm run test:preflight:fast` after every slice. |
| **Stream guardrails** | TikFinity ? MIA ? OBS; overlay **`miaPoints` only**; per-tier `rotationIndexByTier` without reset. |

Engine 2.0 scaffolds align with existing `shared/mia-*-core/` canon modules and `docs/master-canon/` contracts — **without requiring full canon import** into git history yet.

---

## 2. Phase overview

```
Phase R0  Design + roadmap + stub folders          ? this session
Phase R1  Graphics / Koj product sprint            ? parallel priority
Phase E1  First vertical slice (GameState + OBS)   ? first Engine code wiring
Phase E2  Event Bus + Visibility extraction
Phase E3  Platform Renderer + multi-profile overlay
Phase E4  Plugin loader stub (no games)
Phase E5  Composition shrink (`index.js` < 500 lines)
```

**Not in v0.1 scope:** poker/monopoly plugins, SQL persistence, cloud multi-tenant, full `shared/mia-*-core/` commit.

---

## 3. Phase R0 — Design checkpoint (DONE / IN PROGRESS)

**Goal:** Blueprint + safe scaffold; zero runtime behavior change.

| Deliverable | Status |
|-------------|--------|
| [`MIA_ENGINE_2_0_ARCHITECTURE.md`](./MIA_ENGINE_2_0_ARCHITECTURE.md) | Done |
| [`MIA_ENGINE_2_0_ROADMAP.md`](./MIA_ENGINE_2_0_ROADMAP.md) | This document |
| `engine2/` stub folders | Scaffold only |
| `tests/mia_engine2_roadmap_contract.js` | Doc + scaffold contract |

### Acceptance criteria (R0)

- [x] Architecture doc describes all eight module boundaries.
- [x] Roadmap defines phased milestones with acceptance criteria.
- [x] Stub folders exist under `engine2/` — **not imported by `index.js`**.
- [x] No experimental flags enabled by default.
- [x] Preflight fast suite passes.

---

## 4. Phase R1 — Graphics / Koj product sprint (parallel priority)

**Goal:** Ship visible product quality before Engine wiring.

| Work stream | Examples | Owner |
|-------------|----------|-------|
| Koj runtime | Mood, walk, FX, split runtime contracts | Product |
| Overlay | Public snapshot, combo wave, timing | Product |
| Graphics studio | Body rig, paint integration, studio routes | Product |

### Acceptance criteria (R1)

- [ ] Koj runtime contract tests green (`koj_runtime_split`, `koj_public_snapshot`).
- [ ] Overlay exposes **`miaPoints` only** — verified by `overlay_public_response` + manual spot check.
- [ ] No regression in gift video rotation per tier.
- [ ] Documented “graphics freeze window” before E1 wiring begins.

**Gate to E1:** R1 lead confirms one stable stream session with current monolith; tag optional `v0.1.1-graphics`.

---

## 5. Phase E1 — First vertical slice: GameState stub + OBS Router boundary

**Goal:** Introduce **read-only GameState facade** and **OBS command boundary** without moving business logic yet.

### E1.1 GameState stub facade

| From (today) | To (E1) |
|--------------|---------|
| `data/kojnozout-state.json`, `data/kojnozout-world.json` | `engine2/gamestate-stub/` ? later `shared/mia-state-core/` |
| Direct reads in overlay builders | `getSnapshot()` API |

**Stub API (design):**

```js
createGameStateStub({ loaders }) ? {
  getSnapshot(): { koj, arena, economy, version, readOnly: true }
}
```

**Rules:**

- Single writer principle documented; stub is **read-only** until E2 action wiring.
- No persistence format change in E1.

### E1.2 OBS Router boundary

| From (today) | To (E1) |
|--------------|---------|
| `MIA_VIDEO_ENGINE.js`, scattered OBS calls | Commands via `shared/mia-obs-core/` facade |
| Direct WebSocket in multiple modules | `enqueueObsCommand(intent)` queue |

**Boundary rules:**

- OBS Router accepts **render intents** only — no gift tier math, no Koj mood logic.
- Aligns with canon `0038` OBS Integration Layer (`shared/mia-obs-core/obsIntegrationLayer.js`).

### E1 deliverables

1. Wire stub into **one** read path (e.g. `/overlay-state` debug field or admin snapshot) behind `MIA_ENGINE2_STUB=0` default OFF.
2. Extract OBS command envelope type; route one smoke command through boundary.
3. Contract tests: `mia_engine2_vertical_slice_contract.js` (future).

### Acceptance criteria (E1)

- [x] `MIA_ENGINE2_STUB` defaults OFF; production path unchanged when unset.
- [x] With flag ON: admin can read four platform projections from Engine2 pipeline.
- [ ] At least one OBS media command flows through router boundary in test harness (deferred — obs-router-boundary).
- [x] `npm run test:preflight:fast` — all green.
- [x] No coin/gift value in any overlay payload (VisibilityEngine uses shared sanitizer).

**Rollback:** revert flag + wiring commit; stay on `v0.1-stream-core`.

---

## 6. Phase E2 — Event Bus + Visibility extraction

**Goal:** All ingress ? normalized envelope ? dispatch; overlay sanitization in Visibility Engine.

**E2 slice shipped (2026-07-27):** Event applicator stub, event-bus-stub (normalize?apply), OBS Router adapter (`obs.renderRoute`), admin preview behind flag.

| Step | Extract | Risk |
|------|---------|------|
| E2.0-01 | Event normalizer + ingest route | Low |
| E2.0-02 | Overlay state builder | Low |
| E2.0-05 | Visibility rules (`miaPoints`, channel filters) | Medium |

**Canon alignment:**

- `docs/master-canon/0031-normalized-event-contract.md`
- `docs/master-canon/0033-overlay-payload-contract.md`
- `shared/platform_normalizers/normalize_event.js`

### Acceptance criteria (E2)

- [x] Stub pipeline: normalized gift/comment ? in-memory GameState (flag ON only).
- [x] Visibility layer strips coin/gift value from all public overlay fields (E1 + contract).
- [ ] Shadow pipeline + action queue unchanged behavior (parity tests) — live ingest deferred.
- [x] OBS Router adapter maps obs projection ? stable `obs.renderRoute` envelope.
- [ ] Event Bus module matches `shared/mia-event-core/` surface — partial stub only.

---

## 7. Phase E3 — Platform Renderer + multi-profile overlay

**Goal:** Four logical output channels (design in architecture §4); start with HTTP profile query param.

| Profile | Route (future) | Use |
|---------|----------------|-----|
| main | `/overlay-state?profile=main` | Full sanitized overlay |
| clean | `profile=clean` | Brand-safe restream |
| host | `profile=host` | Producer monitor |
| game | `profile=game` | Plugin channel (empty until E4) |

### Acceptance criteria (E3)

- [ ] Same GameState snapshot feeds all profiles; Visibility assigns per-field channel.
- [ ] Default single-profile path identical to pre-E3 behavior.
- [ ] OBS Router can bind two browser sources to two profiles (smoke test).

---

## 8. Phase E4 — Plugin loader stub (no games)

**Goal:** Directory layout + manifest schema + load/unload lifecycle — **no poker/monopoly code**.

```
game/
  _registry.json
  hello/
    manifest.json
    index.js    # registerHandlers(bus, gameState) — no-op demo
```

Uses `shared/mia-module-core/` when canon import lands.

### Acceptance criteria (E4)

- [ ] `game/hello/` loads and unloads without server restart (dev mode).
- [ ] Plugin cannot write overlay coin values or call OBS directly.
- [ ] Visibility hides plugin channel until plugin active.

---

## 9. Phase E5 — Composition shrink

**Goal:** `index.js` < 500 lines — wiring only.

### Acceptance criteria (E5) — matches architecture §8

- [ ] All ingest ? overlay ? OBS paths via Event Bus + Visibility.
- [ ] Four overlay profiles from one GameState source.
- [ ] Sample plugin load/unload works.
- [ ] Stream guardrails audit green.

---

## 10. Milestone map (architecture cross-reference)

| ID | Milestone | Phase | Depends on |
|----|-----------|-------|------------|
| M0 | Architecture + roadmap docs | R0 | `v0.1-stream-core` |
| M1 | Graphics sprint gate | R1 | M0 |
| M2 | GameState stub wired (flag OFF default) | E1 | M1 |
| M3 | OBS Router boundary (one command) | E1 | M1 |
| M4 | Event normalizer extraction | E2 | M2, M3 |
| M5 | Visibility sanitization module | E2 | M4 |
| M6 | Multi-profile overlay routes | E3 | M5 |
| M7 | Plugin hello stub | E4 | M6 |
| M8 | `index.js` composition shrink | E5 | M7 |

---

## 11. Test strategy per phase

| Phase | Required checks |
|-------|-----------------|
| R0 | `mia_engine2_roadmap_contract`, preflight fast |
| R1 | Existing Koj/overlay/graphics suites |
| E1+ | Above + vertical slice contract + OBS smoke |
| All | `node --check index.js` |

Add new suites to `scripts/run_preflight_tests.js` **only when** the corresponding code ships — avoid empty test inflation.

---

## 12. Related documents

- [`MIA_ENGINE_2_0_ARCHITECTURE.md`](./MIA_ENGINE_2_0_ARCHITECTURE.md)
- [`MIA_GITHUB_MIGRATION_AUDIT.md`](./MIA_GITHUB_MIGRATION_AUDIT.md)
- [`KANON_MIA_ALIGNMENT.md`](./KANON_MIA_ALIGNMENT.md)
- `.cursor/rules/mia-guardrails.mdc`

---

*Next session default: continue **R1 graphics** OR start **E1** stub wiring behind `MIA_ENGINE2_STUB=0` — team choice after R1 gate.*
