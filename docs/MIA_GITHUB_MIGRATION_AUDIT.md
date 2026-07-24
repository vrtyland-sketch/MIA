# MIA GitHub Migration Audit

**Date/time:** 2026-07-23 21:01 CEST (overnight automation run)  
**Continued at:** 2026-07-24 03:21 CEST ù Engine 2.0 roadmap + scaffold  
**Local repo:** `C:\MIA`  
**Operator:** overnight agent (blanket approval)

---

## 1. Verdict

| Item | Status |
|------|--------|
| **master push** | **OK** |
| **Tag `v0.1-stream-core`** | **OK** |
| **Private repo** | **NO** ù still Public (browser login required; `gh` not installed) |
| **Preflight tests** | **OK** (155/155 fast at overnight; re-run after roadmap commit) |
| **Engine 2.0 doc** | Created ù see ù8 |
| **Engine 2.0 roadmap** | Created ù see ù12 |

---

## 2. Remote & auth

| Field | Value |
|-------|-------|
| Remote URL (active) | `https://github.com/vrtyland-sketch/MIA.git` |
| SSH URL (optional) | `git@github.com:vrtyland-sketch/MIA.git` |
| Auth method used | **HTTPS** (Git Credential Manager) |
| SSH key file | `C:\Users\Lenovo\.ssh\id_ed25519_mia` |
| SSH pubkey (not yet on GitHub) | `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFsN0D/Xun8iz+yaKVi1Vhr6HAkifU1ZY0TYTXaDn6qE mia-push-vrtyland-sketch` |
| SSH test | **FAIL** ù `Permission denied (publickey)` |
| Default branch (GitHub) | `master` |

**Note:** Remote was briefly switched to SSH during the run; reverted to HTTPS for successful tag push.

---

## 3. Push results

| Ref | Local SHA | Remote SHA | Result |
|-----|-----------|------------|--------|
| `master` | `903c1d882bc95ca43f5b34417fe2b346d660dc04` | `903c1d882bc95ca43f5b34417fe2b346d660dc04` | **OK** (first push, no force) |
| `v0.1-stream-core` (annotated) | `903c1d88` ? tag object `70b3e859` | present on origin | **OK** |
| `backup/pre-github-full` | `cdfa42a575679bc27034ce9a7c3d31550eaf5209` | **not pushed** (intentional) | OK |

Upstream: `master` tracks `origin/master`.

GitHub URL: https://github.com/vrtyland-sketch/MIA

---

## 4. History slim strategy

Instead of an in-place `filter-branch` rewrite (prior run was incomplete / `.git-rewrite` cleared), **master** is a **single orphan commit** containing the slim working tree.

| Branch | Role | Commits | Max blob |
|--------|------|---------|----------|
| `master` | GitHub push target | 1 (`903c1d88`) | **2.7 MB** (`gift-creatures/universe/surge.png`) |
| `backup/pre-github-full` | Full local history archive | 33+ (HEAD `cdfa42a5`) | **171 MB** (`incoming-images/videos_2/ù`) |

**No blob >100 MB** in `master` reachable history. Verified.

---

## 5. Pack size before / after

| Metric | Value | Notes |
|--------|-------|-------|
| Local disk pack (all refs) | **5.38 GiB** | Dominated by `backup/pre-github-full` + old objects |
| Local garbage (tmp pack) | ~3.02 GiB | Residual from interrupted pack; safe to `git gc` later |
| `master` bundle estimate | **~115 MB** | What GitHub received |
| GitHub repo size (API) | 0 KB | API lag / fresh push |

Push sends only objects reachable from `master`; backup branch objects stay local.

---

## 6. Purged / gitignored (on disk, not in GitHub history)

Removed from **master tree** (files remain on disk where noted):

| Path | Reason |
|------|--------|
| `incoming-images/videos_2/` | Large video bank (>100 MB files) |
| `mia-output-overlay/generated/eyes/` | Generated assets |
| `mia-output-overlay/generated/gift-*` | Generated assets |
| `mia-output-overlay/generated/media-templates/` | Generated assets |
| `mia-output-overlay/generated/story-moments/` | Generated assets |
| `mia-output-overlay/audio-cache/` | Runtime cache |
| `mia-output-overlay/assets/animation-bank/` | Bulky sprite banks |
| `mia-output-overlay/assets/kojnozrout/` | Large mood/prop banks |

`.gitignore` entries (lines 38ù41) enforce the same for future commits.

**Not committed:** live `data/*.json` state, `.env`, `secrets/local/`, `_canon_import/`, `shared/mia-*-core/` (untracked canon scaffold).

---

## 7. Tests (post-push)

| Suite | Exit | Result |
|-------|------|--------|
| `node --check index.js` | 0 | **PASS** |
| `npm run test:preflight:fast` | 0 | **PASS** ù 155 passed, 0 failed |

Stream guardrails unchanged: TikFinity ? MIA ? OBS; overlay exposes `miaPoints` only (no coin/gift value).

---

## 8. Engine 2.0 (design-only checkpoint)

Because preflight passed, architecture doc added:

- [`docs/MIA_ENGINE_2_0_ARCHITECTURE.md`](./MIA_ENGINE_2_0_ARCHITECTURE.md)

**Explicit:** Graphics / Koj product work remains priority. Engine 2.0 is design-first; no overnight `index.js` split.

---

## 9. Blockers remaining

| # | Blocker | Owner | Action |
|---|---------|-------|--------|
| 1 | Repo still **Public** | Human | GitHub ? Settings ? Danger zone ? Private (2026-07-24: browser needs login; `gh` not on PATH) |
| 2 | SSH key not on GitHub | Human (optional) | Add pubkey at https://github.com/settings/keys ? switch remote to SSH if preferred |
| 3 | Local pack bloat | Optional | After confirming backup, run `git gc --prune=now` (backup branch keeps old objects) |
| 4 | `.gitignore` merge conflict in working tree | Fixed locally | Resolved conflict markers; not yet on GitHub unless committed |

---

## 10. Recommended next steps

1. **Set repo Private** (Settings ? Danger zone) ó manual login required.
2. Optionally add SSH key and `git remote set-url origin git@github.com:vrtyland-sketch/MIA.git`.
3. Continue **graphics / Koj** sprint (Phase R1) ó primary product priority.
4. When R1 gate passes: Phase **E1** ó GameState stub + OBS Router boundary behind `MIA_ENGINE2_STUB=0` (default OFF).
5. When ready for canon import: separate commit for `shared/mia-*-core/` (not mixed with live `data/`).
6. Tag **`v0.1-stream-core`** remains rollback checkpoint before Engine 2.0 wiring.

---

## 12. Continuation session (2026-07-24)

| Item | Result |
|------|--------|
| Git sync | `master` @ `402b8ce3` matches `origin/master` |
| Private repo attempt | **Not done** ó GitHub settings require login; `gh` CLI not installed |
| New docs | [`MIA_ENGINE_2_0_ROADMAP.md`](./MIA_ENGINE_2_0_ROADMAP.md) |
| Scaffold | `engine2/` ó GameState stub + OBS boundary README (not wired to `index.js`) |
| Contract test | `tests/mia_engine2_roadmap_contract.js` added to preflight fast |

---

## 11. Do-not list (verified)

- [x] Did not force-push to unexpected non-empty remote (remote was empty for `master`)
- [x] Did not delete `backup/pre-github-full`
- [x] Did not push backup branch
- [x] Did not commit secrets, `.env`, or live `data/*.json` runtime state
