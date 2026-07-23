# Graphics v35 — Asset polish

**Datum:** 2026-07-20  
**Baseline freeze:** `v=32-gfx-whole` ([GRAPHICS_CHECKPOINT_v32.md](./GRAPHICS_CHECKPOINT_v32.md))  
**Prior increment:** `v=34-asset-control` ([GRAPHICS_v34_ASSET_CONTROL.md](./GRAPHICS_v34_ASSET_CONTROL.md))  
**Active bust:** `v=35-asset-polish`

```text
## Graphics delta v35
- baseline: v32-gfx-whole (docs/GRAPHICS_CHECKPOINT_v32.md)
- added: docs/GRAPHICS_v35_ASSET_POLISH.md; scripts/kojnozrout_install_v35_asset_polish.js; archive v35-asset-polish
- changed: Koj happy(+a/b/f2) + warm-b PNGs; overlay/lib/index/manifest/promptBuilder bust → 35-asset-polish
- removed: (none — offline backups kept)
- deps-runtime: speech / koj / bowl / gift / desks / GFX_CACHE_BUST
```

---

## 0. Sequence checklist (pass order)

| # | Step | Result |
|---|------|--------|
| 1 | List live moods + runtime aliases (idle/warm/happy + rest→CYBORG_REST) | PASS |
| 2 | Visual QA Koj core: idle / warm / happy (+ a/b/f2) | PASS (after fix) |
| 3 | Visual QA MIA cyber: speak / lip/01 (+ orphan hero) | PASS |
| 4 | Visual QA gift creatures: lion / universe / galaxy dual frames | PASS |
| 5 | Alpha audit (RGBA corners transparent) | PASS |
| 6 | Regenerate worst offenders + install via true-alpha | PASS |
| 7 | Bust `35-asset-polish` + OBS refresh | PASS |

---

## 1. Runtime mood usage (live path only)

Hot path: `mia-output-overlay/assets/kojnozrout/moods/kojnozout-*.png`  
Resolver: `moodAsset(key)` → `kojnozout-${key}.png`  
Rest / cozy / yawn / calm-deep / egg-rest cycles forced to frames **`idle → warm → happy`** (`forceCyborgRestFrames` in `kojnozrout-runtime.html`).

| Role | Keys / notes |
|------|----------------|
| **Core live** | `idle`, `warm`, `happy` (+ `idle-f2`, `warm-a/b`, `happy-a/b/f2`) |
| **Rest aliases** | sleepy/curl/rest/yawn/cozy/… map to idle/warm/happy frames |
| **Gift stage** | happy (primary), warm, idle in `STAGE_ART` |
| **Preload bank** | large `PRELOAD_MOOD_KEYS` still on disk; not all re-polished this pass |

`_offline_backup` / `*.pre-*` are **not** loaded by HOT runtime.

---

## 2. Pass/fail per asset

### Koj — core family

| Asset | Hands (2?) | Arms attached | Extra/missing | Belly | Half-robot | Alpha | Framing vs idle | Verdict |
|-------|------------|---------------|---------------|-------|------------|-------|-----------------|---------|
| `kojnozout-idle.png` | PASS | PASS | PASS | PASS | PASS | PASS RGBA | baseline arms-down | **PASS** |
| `kojnozout-idle-f2.png` | PASS | PASS | PASS | PASS | PASS | PASS | arms-down | **PASS** |
| `kojnozout-warm.png` | PASS | PASS | PASS | PASS | PASS | PASS | arms-down | **PASS** |
| `kojnozout-warm-a.png` | PASS | PASS | PASS | PASS | PASS | PASS | arms-down | **PASS** |
| `kojnozout-warm-b.png` | was FAIL (3 vs 4 claws) → fixed | PASS | PASS | PASS | PASS | PASS | arms-down | **PASS (fixed)** |
| `kojnozout-happy.png` | was raised-arms jump → fixed | PASS | PASS | PASS | PASS | PASS | **now arms-down** | **PASS (fixed)** |
| `kojnozout-happy-a.png` | same | PASS | PASS | PASS | PASS | PASS | arms-down | **PASS (fixed)** |
| `kojnozout-happy-b.png` | was 3 vs 4 + raised → fixed | PASS | PASS | PASS | PASS | PASS | arms-down | **PASS (fixed)** |
| `kojnozout-happy-f2.png` | was raised → fixed | PASS | PASS | PASS | PASS | PASS | arms-down | **PASS (fixed)** |

### MIA cyber

| Asset | Hands/arms | Silhouette | Alpha | Verdict |
|-------|------------|------------|-------|---------|
| `cyber/speak.png` | 1 visible pointing hand OK; other arm cropped | speak pose | PASS (minor opaque-black ~1%) | **PASS** |
| `cyber/lip/01.png` | arms cropped mid-forearm (intentional idle portrait) | matches hero family | PASS (opaque-black ~6% in dark suit) | **PASS** |
| `cyber/hero.png` | orphan (not hot) | consistent cyborg | — | orphan OK |
| `cyber/lip/02.png` | orphan | — | — | orphan OK |

### Gift creatures

| Asset | Frames | Limbs | Alpha | Verdict |
|-------|--------|-------|-------|---------|
| `lion/majestic.png` | exists | 4 paws OK | PASS | **PASS** |
| `lion/roar.png` | exists | 4 paws OK | PASS | **PASS** |
| `universe/calm.png` | exists | 2 clawed arms OK | PASS | **PASS** |
| `universe/surge.png` | exists | 8 energy limbs (intentional surge form) | PASS | **PASS** |
| `galaxy/calm.png` | exists | 2 arms OK | PASS | **PASS** |
| `galaxy/burst.png` | exists | vortex (no humanoid limbs) | PASS | **PASS** |

---

## 3. Fixed in this pass

| Issue | Fix |
|-------|-----|
| Happy family raised arms → jump in rest cycle idle↔warm↔happy | Regenerated `happy`, `happy-a`, `happy-b`, `happy-f2` with **arms down**, same framing family as idle/warm |
| `happy-b` / old happy asymmetric claw counts | New art: **3 claws per hand**, symmetric |
| `warm-b` 3 vs 4 claws | Regenerated `warm-b` arms-down, 3+3 claws |
| Cache still on v34 | Bust → **`35-asset-polish`** on live overlays / libs / index / OBS manifest / promptBuilder |
| Pre-overwrite live PNGs | Copied to `_offline_backup/kojnozrout/_archive/v35-asset-polish/*.pre-v35.png` (+ raw proofs) |

Install: `node scripts/kojnozrout_install_v35_asset_polish.js` (true-alpha via `kojnozrout_prepare_sprite`).

---

## 4. Remaining issues (not blocking v35)

| Gap | Severity | Note |
|-----|----------|------|
| Wider mood bank style drift (`wave` teal organic; `eating` fully organic no robot half) | MED | Outside idle/warm/happy family; next polish bank |
| Horns: idle often hornless vs warm/happy with cream horns | LOW | Smaller jump than arms; optional idle horn sync later |
| `happy-b` organic eye slightly brown vs purple | LOW | Acceptable for variant B |
| MIA `lip/01` dark-suit opaque-black residue ~6% | LOW | Rarely visible on stream bg |
| Orphans `cyber/hero`, `lip/02`, `*-raw.png` gift | LOW | Keep; do not delete |
| Older generated gift job manifests still carry `art.bust=34-…` | LOW | New jobs get 35 |

---

## 5. deps-runtime

| Layer | URL / note |
|-------|------------|
| Speech | `/speech-overlay.html?v=35-asset-polish` |
| Koj runtime | `/kojnozrout-runtime.html?v=35-asset-polish` |
| Bowl | `/kojnozrout-bowl-overlay.html?v=35-asset-polish` |
| Gift anim | `/gift-animation-overlay.html?v=35-asset-polish` |
| Manifest | `GFX_CACHE_BUST = "35-asset-polish"` |
| PromptBuilder | `STAGE_ART.bust = "35-asset-polish"` |

Refresh: `npm run obs:refresh-overlays` (done this pass — 26 sources refreshed).

---

*v32 freeze zůstává oficiální baseline; v35 = pure asset polish (Koj framing + claw consistency).*
