# Graphics v36 — Kojnozrout unify

**Datum:** 2026-07-20  
**Baseline freeze:** `v=32-gfx-whole` ([GRAPHICS_CHECKPOINT_v32.md](./GRAPHICS_CHECKPOINT_v32.md))  
**Prior increment:** `v=35-asset-polish` ([GRAPHICS_v35_ASSET_POLISH.md](./GRAPHICS_v35_ASSET_POLISH.md))  
**Active bust:** `v=36-koj-unify`

```text
## Graphics delta v36
- baseline: v32-gfx-whole (docs/GRAPHICS_CHECKPOINT_v32.md)
- prior: v35-asset-polish (happy/warm framing polish)
- added: docs/GRAPHICS_v36_KOJ_UNIFY.md; scripts/kojnozrout_install_v36_koj_unify.js; archive v36-koj-unify
- changed: Koj master moods + wide alias bank → Soft Neon purple half-robot; overlay/lib/index/manifest/promptBuilder bust → 36-koj-unify
- removed: (none — offline backups kept)
- deps-runtime: speech / koj / bowl / gift / desks / GFX_CACHE_BUST
```

---

## 0. Master look (horns policy)

**Policy: ALWAYS small cream/tan horns + purple 3-spike crest.**

| Rule | Spec |
|------|------|
| Split | Vertical: viewer-left organic Soft Neon purple; viewer-right gunmetal chrome |
| Eyes | Organic purple iris (left) + glowing purple concentric cyber-eye (right) |
| Belly | Pale lavender glowing panel + faint circuits — **never lime-green organic belly** |
| Limbs | 2 arms, 2 legs; ~3 claws per hand/foot |
| Idle/rest pose | Arms down |
| Action poses | Wave / eating / dance / excited may raise arms or hold props — **same character design** |
| Alpha | True RGBA via `kojnozrout_prepare_sprite` |

---

## 1. Runtime moods referenced

Hot path: `mia-output-overlay/assets/kojnozrout/moods/kojnozout-*.png`  
Resolver: `moodAsset(key)` → `kojnozout-${key}.png`

| Source | Keys |
|--------|------|
| **CORE** (`kojnozrout-runtime.html`) | `idle`, `warm`, `happy`, `hungry`, `excited`, `eating`, `full` |
| **Rest cycles** (`forceCyborgRestFrames`) | `sleepy`, `curl`, `rest`, `yawn`, `cozy`, `cozy-blanket`, `calm-deep`, `egg-rest` → frames `idle → warm → happy` |
| **PRELOAD_MOOD_KEYS** | Large bank (walk/hop/dance/wave/munch/… + a/b variants) |
| **CARE vitals** | `sick`, `sad`, `annoyed`, `sleepy`, `hungry`, `full`, `excited` |
| **Props / stage classes** | `wave`, `eating`/`feeding`/`munch`/`snack`, celebrate/party/duel families |

`_offline_backup` / `*.pre-*` are **not** loaded by HOT runtime.

---

## 2. Before → after (v35 gaps)

| Asset / family | Before (v35 leftover) | After (v36) |
|----------------|----------------------|-------------|
| `wave` (+ a/left) | Teal fully organic, no chrome | Purple+chrome half-robot wave |
| `wave-b` / `wave-right` | Teal organic | Half-robot wave (robot arm up) |
| `eating` (+ feeding/munch/snack/sip/eating-01…16) | Purple organic, no robot half | Half-robot with bowl |
| `idle` | Half-robot but often **hornless** vs warm/happy | Idle with **always horns** + crest |
| Rest aliases (`sleepy`/`curl`/…) | Mixed; runtime already remapped | Re-seeded from horned idle / warm |
| `hungry` / `sad` / `sick` / `full` | Organic or green-belly leftovers | Half-robot CARE set |
| `excited` / `dance` / `celebrate` / `curious` / `proud` / `annoyed` / `laugh` / `love` (+ aliases) | Teal or organic drift | Half-robot action/social set |
| `hop` / `bounce` / `play` / `guard` / `alert` / `shy` / `stretch` | Teal / organic leftovers | Half-robot motion/defense set |
| `happy-b` | Slight brown organic eye risk | Kept v35 polish (PASS purple iris) |

Install: `node scripts/kojnozrout_install_v36_koj_unify.js`  
Archive: `_offline_backup/kojnozrout/_archive/v36-koj-unify/` (`*.pre-v36.png` + raw masters)

**Installed this pass:** 21 masters → **~252** live mood files (masters + aliases), including hop/play/guard/shy/stretch pass.

---

## 3. MIA cyber + gift creatures (light pass)

| Asset | Verdict |
|-------|---------|
| `cyber/speak.png` | PASS — intentional cyan MIA cyborg; not Koj palette |
| `cyber/lip/01.png` | PASS — minor dark-suit opaque residue (unchanged) |
| Gift lion / universe / galaxy dual frames | PASS from v35 — no clear mismatch requiring regen this pass |

Focus of v36 = **Koj bank**.

---

## 4. Remaining gaps (non-blocking)

| Gap | Severity | Note |
|-----|----------|------|
| Battle / duel / walk / hatch / perch / lean / chaos families | LOW | Palette pass as HALF after bank unify; unique battle poses not fully re-arted — acceptable for v36 |
| Claw digit count 3 vs 4 on some new masters | LOW | Wave sometimes 4 finger tips; feet stay ~3 |
| Alias copies share identical pixels (a/b) | LOW | Motion variety is pose-cycle / FX, not unique art per letter |
| MIA lip opaque-black ~6% | LOW | From v35; rare on stream bg |

---

## 5. deps-runtime

| Layer | URL / note |
|-------|------------|
| Speech | `/speech-overlay.html?v=36-koj-unify` |
| Koj runtime | `/kojnozrout-runtime.html?v=36-koj-unify` |
| Bowl | `/kojnozrout-bowl-overlay.html?v=36-koj-unify` |
| Gift anim | `/gift-animation-overlay.html?v=37-stream-polish` (gift-only; ne v36) |
| Manifest | `GFX_CACHE_BUST = "36-koj-unify"` |
| PromptBuilder | `STAGE_ART.bust = "36-koj-unify"` |

```text
freeze baseline = 32-gfx-whole
active runtime bust = 36-koj-unify
gift-only polish = 37-stream-polish
```

Refresh: `npm run obs:refresh-overlays`

---

*v32 freeze zůstává oficiální baseline; v36 = Koj half-robot unify + action/CARE expansion.*
