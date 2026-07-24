# MIA Mega Audit — 2026-07-24

**Single entry point** for human mega audit after private GitHub migration + graphics day completion.

**Local repo:** `C:\MIA`  
**Audit run:** 2026-07-24 ~15:50 CEST  
**Operator brief:** repo set Private; SSH remote active; Engine 2.0 stub OFF.

---

## 1. GitHub & git state

| Item | Value |
|------|-------|
| **Private repo** | **YES** (operator confirmed 2026-07-24) |
| **Remote (active)** | `git@github.com:vrtyland-sketch/MIA.git` (SSH) |
| **Default branch** | `master` |
| **Local HEAD** | `ddab7eb0b80fc41eee4eae2c8788c746111f7ba0` — `docs: mark graphics day slice 11 pushed.` |
| **Sync** | `master...origin/master` — **in sync** (no ahead/behind after `git fetch`) |
| **Tag `v0.1-stream-core`** | `70b3e859` ? commit `903c1d882bc95ca43f5b34417fe2b346d660dc04` (`chore: slim tree for GitHub push`) — present on `origin` |
| **Backup branch** | `backup/pre-github-full` @ `cdfa42a5` — **local only**, not pushed (intentional) |

### Verification notes

- **SSH:** `git fetch origin` OK via `git@github.com:vrtyland-sketch/MIA.git`.
- **Unauthenticated API** (audit run): `GET api.github.com/repos/vrtyland-sketch/MIA` returned `"private": false`. If Settings already show Private, treat as API/cache lag and spot-check logged-out 404 on repo URL.
- **`gh` CLI:** not on PATH — visibility confirmed via operator + SSH sync, not `gh repo view`.

**Prior migration doc:** [`MIA_GITHUB_MIGRATION_AUDIT.md`](./MIA_GITHUB_MIGRATION_AUDIT.md)

---

## 2. Graphics day (R1 sprint)

**Daylog:** [`MIA_GRAPHICS_DAYLOG.md`](./MIA_GRAPHICS_DAYLOG.md)  
**R1 status:** [`MIA_GRAPHICS_R1_STATUS.md`](./MIA_GRAPHICS_R1_STATUS.md)

| Metric | Value |
|--------|-------|
| Slices pushed | **11** (commits `1f52ff98` … `5dd36829`, baseline `0b6fdc65`) |
| Speech / bowl / manifest bust | `v=36-koj-unify` |
| Gift overlay bust | `v=37-stream-polish` |
| Koj split runtime bust | `v=48-r1-duel-walk-polish` |
| R1-A / R1-B (automated) | **PASS** — contract suites in preflight fast |
| R1-C (manual OBS) | **OPEN** — see §6 |

**Tag recommendation:** **`v0.1.1-graphics` — wait for R1-C** (one stable OBS stream sign-off). `v0.1-stream-core` remains rollback checkpoint before Engine 2.0 wiring.

---

## 3. Runtime / DoD pointers

| Doc | Purpose |
|-----|---------|
| [`MIA_PRESTREAM_DOD.md`](./MIA_PRESTREAM_DOD.md) | Pre-stream operator checklist (~94 % automation) |
| [`MIA_LIVE_DOD.md`](./MIA_LIVE_DOD.md) | Live stream-ready checklist |
| [`MIA_LIVE_DOD_RESULTS.md`](./MIA_LIVE_DOD_RESULTS.md) | Last recorded live DoD run (~91 %) |
| [`MIA_AUDIT_2026-07-22.md`](./MIA_AUDIT_2026-07-22.md) | Pre-push audit (auth blocked) |
| [`MIA_AUDIT_2026-07-21_EVENING.md`](./MIA_AUDIT_2026-07-21_EVENING.md) | Evening baseline (~94 %) |
| [`MIA_GITHUB_MIGRATION_AUDIT.md`](./MIA_GITHUB_MIGRATION_AUDIT.md) | Slim history + first push |
| [`KANON_MIA_ALIGNMENT.md`](./KANON_MIA_ALIGNMENT.md) | Code ? canon alignment map |

---

## 4. Engine 2.0 (design-only, stub OFF)

| Item | Status |
|------|--------|
| Architecture | [`MIA_ENGINE_2_0_ARCHITECTURE.md`](./MIA_ENGINE_2_0_ARCHITECTURE.md) |
| Roadmap | [`MIA_ENGINE_2_0_ROADMAP.md`](./MIA_ENGINE_2_0_ROADMAP.md) |
| Scaffold | `engine2/` — GameState stub + OBS boundary README |
| **`MIA_ENGINE2_STUB`** | **Default OFF** — not wired in `index.js` |
| Contract | `tests/mia_engine2_roadmap_contract.js` — in preflight fast |

**Rule:** No big-bang `index.js` split. E1 wiring only after R1-C gate.

---

## 5. Automated test record (this audit run)

| Command | Exit | Result |
|---------|------|--------|
| `node --check index.js` | **0** | **PASS** |
| `npm run test:preflight:fast` | **0** | **PASS — 157 passed, 0 failed** |

Re-run anytime:

```powershell
cd C:\MIA
node --check index.js
npm run test:preflight:fast
```

Finished at (UTC): `2026-07-24T13:48:55.494Z`

---

## 6. Open gates (human / do-not-commit)

| Gate | Owner | Action |
|------|-------|--------|
| **R1-C OBS manual** | Human | One full OBS session — checklist in [`MIA_GRAPHICS_R1_STATUS.md`](./MIA_GRAPHICS_R1_STATUS.md) § R1-C |
| **Live `data/*.json`** | — | Modified/untracked runtime state — **do not commit** |
| **`_canon_import/`, `shared/mia-*-core/`** | Future | Separate canon import commit when planned |
| **`backup/pre-github-full`** | Local | Full history archive — never push |
| **Optional tag `v0.1.1-graphics`** | After R1-C | Wait for stream sign-off |
| **Private API spot-check** | Human | If API still shows public, confirm Settings ? Danger zone ? Private |

### R1-C checklist (exact)

1. Start server — `node index.js` or `npm start`; wait for health / OBS WS connect.
2. Load OBS overlays — Koj runtime (`48-r1-duel-walk-polish`), speech/bowl (`36-koj-unify`), gift anim (`37-stream-polish`); optional `npm run obs:refresh-overlays`.
3. Trigger combo/wave — gifts or spam wave via TikFinity ingest / admin debug until `comboMoment` or active `spamSession`.
4. Belly HUD — spam wave progress (`NN% · T2`), countdown, **no** coin/gift value; stage classes `combo` / `spam-wave` / `combo-pulse` at high progress.
5. **PASS:** party scene on combo/wave, mood/FX during gift anim, per-tier video rotation unchanged (`rotationIndexByTier` no reset). **FAIL:** frozen mood, missing wave HUD, or coin/value on overlay.

---

## 7. Guardrails checklist

| Rule | Verified |
|------|----------|
| TikFinity ? MIA ? OBS (OBS render-only) | Architecture + contracts |
| Overlay public API: **`miaPoints` only** — no coins/gift value | `overlay_public_response_contract`, `mia_graphics_r1_contract` |
| Dual voice default **OFF** | Live DoD + runtime config |
| Gift video rotation per-tier (`rotationIndexByTier`, no tier index reset) | R1 contracts + R1-C manual |
| No big-bang `index.js` refactor | Engine 2.0 roadmap; stub not imported |
| Engine 2.0 stub **OFF** (`MIA_ENGINE2_STUB` unset) | `mia_engine2_roadmap_contract` |
| No force-push to `master` | Migration audit verified |
| No live `data/` or secrets in git | Dirty tree excluded from commits |

---

## 8. Suggested mega audit walk order (18 steps)

1. Read this doc top-to-bottom.
2. Confirm GitHub Settings ? repo **Private** (logged-out 404 test).
3. `git remote -v` ? SSH URL; `git fetch`; `git status -sb` ? clean sync on `master`.
4. Note HEAD `ddab7eb0` and tag `v0.1-stream-core` @ `903c1d88`.
5. Skim [`MIA_GITHUB_MIGRATION_AUDIT.md`](./MIA_GITHUB_MIGRATION_AUDIT.md) — slim history, no backup push.
6. Open [`MIA_GRAPHICS_DAYLOG.md`](./MIA_GRAPHICS_DAYLOG.md) — 11 slices table.
7. Open [`MIA_GRAPHICS_R1_STATUS.md`](./MIA_GRAPHICS_R1_STATUS.md) — bust layers 36/37/48.
8. Run `node --check index.js` ? exit 0.
9. Run `npm run test:preflight:fast` ? 157/157 green.
10. Spot-check `tests/mia_graphics_r1_contract.js` output in preflight log.
11. Confirm `engine2/` exists; grep `index.js` — no `engine2/` import.
12. Read [`MIA_ENGINE_2_0_ROADMAP.md`](./MIA_ENGINE_2_0_ROADMAP.md) Phase R1 vs E1 boundary.
13. Review [`MIA_PRESTREAM_DOD.md`](./MIA_PRESTREAM_DOD.md) open items (ucho, etc.).
14. Review [`MIA_LIVE_DOD.md`](./MIA_LIVE_DOD.md) + [`MIA_LIVE_DOD_RESULTS.md`](./MIA_LIVE_DOD_RESULTS.md).
15. Verify dirty tree: `data/**` modified — **not staged**; `_canon_import/` untracked.
16. Confirm `backup/pre-github-full` local only.
17. Schedule **R1-C** OBS session (§6 checklist).
18. After R1-C PASS ? optional tag `v0.1.1-graphics`; then consider E1 stub behind `MIA_ENGINE2_STUB=0`.

---

## 9. Related commands

```powershell
# OBS overlay refresh after deploy
npm run obs:refresh-overlays

# R1-focused contracts (also in preflight)
node tests/kojnozout_runtime_split_contract.js
node tests/mia_graphics_r1_contract.js
node tests/overlay_public_response_contract.js
node tests/mia_engine2_roadmap_contract.js
```

---

*Generated for mega audit readiness — docs-only commit; no runtime or live data changes.*
