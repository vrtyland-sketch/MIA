# Graphics v33 — incremental harden

**Datum:** 2026-07-20  
**Baseline freeze:** `v=32-gfx-whole` ([GRAPHICS_CHECKPOINT_v32.md](./GRAPHICS_CHECKPOINT_v32.md))  
**Active bust:** `v=33-gfx-harden`  
**Post-check source:** [GRAPHICS_CHECKPOINT_v32_POSTCHECK.md](./GRAPHICS_CHECKPOINT_v32_POSTCHECK.md)

```text
## Graphics delta v33
- baseline: v32-gfx-whole (docs/GRAPHICS_CHECKPOINT_v32.md)
- added:
- changed:
- removed:
- deps-runtime:
```

---

## Added

- `scripts/kojnozrout_offline_paths.js` — cold path resolver for archive / prenorm / pre-backups
- `scripts/kojnozrout_move_offline_backup.js` — one-shot mover (already run for v33)
- `mia-output-overlay/assets/_offline_backup/` — moved `*.pre-*`, `_prenorm_backup`, `_archive` (not deleted)
- Stub READMEs at legacy `_archive` / moods pointing to offline backup
- OBS alias helpers: `OBS_INPUT_NAME_ALIASES` + `resolveObsInputNames` + `GFX_CACHE_BUST` in `MIA_OBS_LIVE_MANIFEST.js`
- Gift stage mounts `/lib/mia-tech-energy.js` (`#giftTechFx`) for particle grammar parity with speech / Koj
- Manifest `urlQuery` on speech / runtime / bowl / gift → `v=33-gfx-harden`
- Contract coverage for OBS dual names + busted split URLs

## Changed

- `MiaLivePresence.BUST` + speech CSS mask/glitch URLs → `33-gfx-harden` (was `14e-live-robot` / `15-world-unify`)
- `MiaRigAnchors.CACHE_BUST` → `33-gfx-harden`
- `index.js` overlay URLs: `speech` / `runtime` / `bowl` / `giftAnimation` get `?v=33-gfx-harden`
- `obs_refresh_overlays.js` bust + core re-enable tries live **and** alias names
- `MIA_OBS_HANDS` / `MIA_OBS_SAFE_CALL` resolve speech↔bubble, koj runtime, bowl V2 aliases
- `promptBuilder` `STAGE_ART.bust` → `33-gfx-harden`
- Install / normalize / restore scripts read archive & prenorm from offline backup (legacy fallback)
- `kojnozrout-bowl-overlay.html` CSS bust → `33-gfx-harden`

## Removed

- Nic smazáno. Archivy a `*.pre-*` jen přesunuty mimo mood hot path.

## deps-runtime

| Layer | URL / note |
|-------|------------|
| Speech | `/speech-overlay.html?v=33-gfx-harden` |
| Koj runtime | `/kojnozrout-runtime.html?v=33-gfx-harden` |
| Bowl | `/kojnozrout-bowl-overlay.html?v=33-gfx-harden` |
| Gift anim | `/gift-animation-overlay.html?v=33-gfx-harden` + `mia-tech-energy.js` |
| OBS live aliases | `MIA_BUBBLE`↔`MIA_SPEECH`, `KOJNOZROUT_RUNTIME`↔`MIA_KOJ_RUNTIME`, `KOJNOZROUT_BOWL_V2`↔`MIA_BOWL` |
| Mood hot path | `assets/kojnozrout/moods/kojnozout-*.png` only (no `.pre-`) |

Refresh: `npm run obs:refresh-overlays` (když běží server + OBS WS).

---

*v32 freeze zůstává oficiální baseline; v33 je inkrementální harden.*
