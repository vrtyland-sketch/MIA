# MIA Graphics Whole (v32)

> **🔒 FREEZE / BASELINE — 2026-07-20**  
> Oficiální grafický checkpoint: **`v=32-gfx-whole`**. Další změny jen inkrementálně (`v33`…), porovnávat proti tomuto stavu.  
> Detaily procesu a checklist: **[`docs/GRAPHICS_CHECKPOINT_v32.md`](./GRAPHICS_CHECKPOINT_v32.md)**  
> Aktivní runtime bust: **`v=36-koj-unify`** — [`GRAPHICS_v36_KOJ_UNIFY.md`](./GRAPHICS_v36_KOJ_UNIFY.md)  
> Gift-only polish: **`v=37-stream-polish`** (gift overlay + desk)

Jeden produkt: **Soft Neon Rig Desk** + **runtime presence** + **Gift Animation stage** + OBS. Ne tři oddělené nástroje.

```text
freeze baseline = 32-gfx-whole
active runtime bust = 36-koj-unify
gift-only polish = 37-stream-polish
```

## Tok (art → stream)

```
Rig Desk (kotvy JSON)
    ↓  POST /api/rig-anchors → /anchors/{koj|mia}.json
Runtime overlays (whole-sprite + MiaPartRig + MiaTechEnergy)
    ↓  speech-overlay · kojnozrout-runtime
Gift Animation Desk (prompt / generate)
    ↓  /api/gift-animation/* → generated/…/manifest.json
Gift overlay (10s purple-tech stage)
    ↓  OBS browser source MIA_GIFT_ANIMATION
OBS scéna SPINAK_ENGINE_GIFTS
```

## Vrstvy

| Vrstva | URL / soubor | Úloha |
|--------|--------------|--------|
| **Rig Desk** | `/mia-paint/rig-desk.html` | Tažení kotvev belly/head/pivots → save JSON |
| **Anchors** | `/anchors/koj.json`, `/anchors/mia.json` | Zdroj pravdy pro pivots + belly HUD |
| **MIA runtime** | `/speech-overlay.html?v=36-koj-unify` | Speech + whole-sprite holo + tech energy |
| **Koj runtime** | `/kojnozrout-runtime.html?v=36-koj-unify` | Whole-sprite + belly HUD sync + tech energy |
| **Gift Desk** | `/mia-paint/gift-animation-desk.html?v=37-stream-polish` | Builder Lion/Universe/Galaxy WAU + auto config |
| **Gift overlay** | `/gift-animation-overlay.html?v=37-stream-polish` | 10s stage; idle opacity 0 |
| **Shared tokens** | `mia-soft-neon-world.css` + `lib/mia-tech-energy.js` | Purple-tech paleta, sparks/electrons/embers |

## Art language (sdílené)

- **Paleta:** violet + electric cyan (ne mint glow pads)
- **FX:** ostré sparks / electrons / ember flecks (`MiaTechEnergy` na MIA+Koj; stejná particle grammar na gift stage)
- **Postavy:** whole-sprite (žádný split head clip / duplicate MIA)
- **Overlay:** jen oslava / `miaPoints` — žádné coins

## Top-tier gifts (WAU)

| Gift | Spectacle | Art |
|------|-----------|-----|
| Lion (T4) | max | `assets/gift-creatures/lion/{majestic,roar}.png` |
| Universe (T6) | max | `…/universe/{calm,surge}.png` |
| Galaxy (T5) | high | `…/galaxy/{calm,burst}.png` |

Detaily: `docs/GIFT_ANIMATION_STREAM.md`

## OBS

```
http://127.0.0.1:3000/gift-animation-overlay.html?v=37-stream-polish
```

- Zdroj: `MIA_GIFT_ANIMATION` · 1920×1080 · transparent · Shutdown when not visible = **OFF**
- Po změně kotvev / bust: `npm run obs:refresh-overlays`
- Apply hands / gift source: `npm run obs:apply-hands`

## Dashboard vstupy

Streamer dashboard → **Soft Neon Rig Desk** · **Gift Animation Desk** · Graphics Studio (širší paint/AI — mimo tento úzký celek).

## Interim (záměrně)

- Head slot = clip / mock — ne part PNG sheets
- Gift stage = HTML/CSS/Canvas procedural, ne true AI video (`trueAiVideo=false`)
- Graphics Studio Phase 13+ / timeline / 3D — mimo v32

## Související

- `docs/GRAPHICS_CHECKPOINT_v32.md` — **freeze / baseline** (proces v33+)
- `docs/MIA_RUNTIME_ROADMAP.md` — **runtime / architektura** (Action Queue, Director, Replay…) — **oddělená osa** od graphics freeze; Fáze 1 checklist: `docs/MIA_PHASE1_STABILITY.md`
- `docs/GRAPHICS_v33_NOTES.md` — harden inkrement
- `docs/GRAPHICS_v34_ASSET_CONTROL.md` — ownership / trigger / control
- `docs/GRAPHICS_v36_KOJ_UNIFY.md` — aktivní runtime bust
- `docs/MIA_PRESTREAM_DOD.md` — předstreamový checklist (dual 32/36/37)
- `docs/SOFT_NEON_RIG_DESK.md` — editor kotvev
- `docs/GIFT_ANIMATION_STREAM.md` — gift OBS setup (`37-stream-polish`)
- `docs/_export_mia_graphics_system_proposal.md` — north star návrh
- `docs/MIA_GRAPHICS_STUDIO.md` — širší studio vize
