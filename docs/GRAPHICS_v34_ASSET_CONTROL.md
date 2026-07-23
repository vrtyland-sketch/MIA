# Graphics v34 — Asset control

**Datum:** 2026-07-20  
**Baseline freeze:** `v=32-gfx-whole` ([GRAPHICS_CHECKPOINT_v32.md](./GRAPHICS_CHECKPOINT_v32.md))  
**Prior increment:** `v=33-gfx-harden` ([GRAPHICS_v33_NOTES.md](./GRAPHICS_v33_NOTES.md))  
**Active bust:** `v=34-asset-control`

```text
## Graphics delta v34
- baseline: v32-gfx-whole (docs/GRAPHICS_CHECKPOINT_v32.md)
- added: ownership + trigger tables; bodyHero opt-in gate
- changed: central bust → 34-asset-control; desks + body-part presence bust; BALL_KEYS
- removed: (none — art freeze untouched)
- deps-runtime: speech / koj / bowl / gift / desks / GFX_CACHE_BUST
```

---

## 1. Live asset inventory

| Family | Live paths | Notes |
|--------|------------|--------|
| **MIA cyber** | `assets/mia/cyber/speak.png`, `cyber/lip/01.png`, `mia/hologram.png` | Whole-sprite + mask FX |
| **MIA masters** | `assets/mia/masters/faces/gift.png` | Catalog / AI brief only (`miaGiftFace`) — **not** gift-stage HTML |
| **Koj moods** | `assets/kojnozrout/moods/kojnozout-*.png` | No `.pre-*` in hot path (v33 offline) |
| **Koj props** | `props/{bowl,ball,mic,hand}.png` | Runtime + gift hand |
| **Gift creatures** | `gift-creatures/{lion,universe,galaxy}/*` dual frames | Stage swap via job `art` |
| **Energy FX** | `lib/mia-tech-energy.js` | Speech `#miaHolo`, Koj runtime, gift `#giftTechFx` |
| **Anchors** | `/anchors/{mia,koj}.json` | Rig Desk → runtime belly/head |
| **Body parts** | `assets/mia/parts/*` + `mia-body-part-overlay` | Studio / optional OBS; default **OFF** |

Orphans (not deleted): `cyber/lip/02.png`, `cyber/hero.png`, `*-raw.png` under gift-creatures.

---

## 2. Ownership map

| Asset / layer | Owns control | Must not own |
|---------------|--------------|--------------|
| MIA whole-sprite + TTS aura | **speech-overlay** + `MiaLivePresence` + `MiaHoloMotion` + `MiaPartRig` | Body-part studio preview (unless `?bodyHero=1`) |
| Koj whole-sprite + props + belly HUD | **kojnozrout-runtime** + `koj-live-motion` | Bowl overlay (HUD % only) |
| Bowl fill % | **kojnozrout-bowl-overlay** ← overlay-state / gift_bowl_map | Mood PNGs |
| Gift 10s stage | **gift-animation-overlay** ← `promptBuilder` / gift map / generate jobs | Gift-moment composer (parallel, default OFF) |
| Per-tier gift video | **MIA_VIDEO_ENGINE** `rotationIndexByTier` | Browser gift stage |
| OBS catalog + bust | **MIA_OBS_LIVE_MANIFEST** `GFX_CACHE_BUST` | — |
| Body-part OBS layers | **bodyPartsCatalog** + body sync / hands | Live whole-sprite (default) |
| Battle / arena | arena-battle overlays | Graphics Whole hot path |
| Offline backups | install / move scripts only | HOT overlay loaders |

---

## 3. Trigger map

| Trigger | Controllers fire |
|---------|------------------|
| **TTS / voicePlayback (MIA)** | Speech: idle↔speak crossfade, `.speaking`, holo motion, tech-energy boost |
| **TTS (Koj)** | Runtime: mic prop priority; optional `?vector=1` glow |
| **Gift tier / mapped gift** | Video engine slot (`rotationIndexByTier`); optional gift-anim auto-queue (`MIA_GIFT_ANIM_AUTO`, minTier ~T3) |
| **LION / GALAXY / UNIVERSE** | Dual-frame creature stage + belly-flash / hand pet (spectacle max/high) |
| **CARE chat / CARE gift** | `behavior=care_react` + `lastCareAt` → hand prop ~4.5s |
| **CARE / pose keys** | `HAND_KEYS` / `BALL_KEYS` / `MIC_KEYS` / `BOWL_KEYS` → props |
| **Idle belly clock** | After ~20s no project media → clock↔date↔weather every ~4s |
| **Gift anim generate** | Desk/API → `generated/gift-animations/` → overlay polls moment / job |
| **Robot / vector** | Opt-in `kojnozrout-runtime.html?vector=1` only |
| **Body-hero hide speech** | **Opt-in** `speech-overlay.html?bodyHero=1` + `parts.head===true` |

---

## 4. Fixed in v34 (high-value mismatches)

| Issue | Fix |
|-------|-----|
| Body-part overlay still loaded presence as `14e-live-robot` | → `?v=34-asset-control` |
| Studio head preview + OBS body-parts OFF → **blank MIA** | `syncBodyHeroPresence` requires `?bodyHero=1` |
| Rig Desk / Gift Desk stuck on `32-gfx-whole` | → `34-asset-control` (aligned with live) |
| `happy*` in `BALL_KEYS` fought common moods / CARE clarity | Removed `happy` / `happy-a` / `happy-b` from ball keys |
| Stale bust across hot overlays | Central bump: manifest, presence, anchors, index URLs, promptBuilder, speech/runtime/bowl/gift |
| Docs operator URLs still on v32 | Product docs point at active `34-asset-control` |

---

## 5. Remaining gaps (not blocking)

| Gap | Severity | Note |
|-----|----------|------|
| `miaGiftFace` not drawn by gift HTML | LOW | Documented as brief-only; stage uses speak/lip |
| Head body-part ignores `parts/head/*` (uses cyber lip via Presence) | MED | Interim whole-sprite / freeze |
| Gift-moment + gift-animation both queueable | MED | Moment default OFF; keep both OBS sources off dual UI |
| Hands `resolveHandsBodySyncMode` defaults **hybrid** | LOW | Injects URLs; visibility still false |
| Battle overlays on old `v=1`/`v=2` busts | LOW | Outside Graphics Whole |
| Generated gift jobs with old `art.bust` | LOW | New jobs get `34-asset-control`; old manifests unchanged |
| `cyber/lip/02`, `hero.png` unused | LOW | Orphans — do not delete in this pass |

`offline_backup` is **not** referenced from HOT runtime loaders (v33 cold path OK).

---

## 6. deps-runtime

| Layer | URL / note |
|-------|------------|
| Speech | `/speech-overlay.html?v=34-asset-control` |
| Koj runtime | `/kojnozrout-runtime.html?v=34-asset-control` |
| Bowl | `/kojnozrout-bowl-overlay.html?v=34-asset-control` |
| Gift anim | `/gift-animation-overlay.html?v=34-asset-control` + `mia-tech-energy.js` |
| Body-part | `/mia-body-part-overlay.html?part=*` + presence `34-asset-control` |
| Rig / Gift desks | `mia-paint/*-desk.html` bust `34-asset-control` |
| Manifest | `GFX_CACHE_BUST = "34-asset-control"` |
| Body-hero (optional) | Speech `?bodyHero=1` when intentionally using MIA_HEAD as live hero |

Refresh: `npm run obs:refresh-overlays` (server + OBS WS).

---

*v32 freeze zůstává oficiální baseline; v34 = asset ownership / trigger harden.*
