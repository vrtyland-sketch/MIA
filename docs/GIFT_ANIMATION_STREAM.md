# Gift Animation Desk (stream — dual bust 36/37)

Procedurální ~10s **MIA-world** animace z gift mapy + profilovky (volitelně slova z chatu). OBS browser source `MIA_GIFT_ANIMATION`.

## Quality tier (honest)

| Tier | Co je to | Co to není |
|------|----------|------------|
| **mia_soft_neon_v3_lion_wau** (Lion / max) | HTML/CSS/Canvas stage + **true-alpha lion PNGs** (majestic → roar) | Tom & Jerry / AI video |
| **mia_soft_neon_v3_universe_wau** (Universe / max) | true-alpha universe PNGs (calm → surge) + max spectacle | — |
| **mia_soft_neon_v3_galaxy_wau** (Galaxy / high) | true-alpha galaxy PNGs (calm → burst) + high spectacle | — |
| **mia_soft_neon_v2** (levnější gifty) | Stejný stage, jednodušší SVG creature | — |

## Spectacle levels

| Gift | spectacle | FX |
|------|-----------|-----|
| **UNIVERSE** (T6) | `max` | dual PNG universe, beam, surge swap, shake |
| **GALAXY** (T5) | `high` | dual PNG galaxy, beam, burst swap |
| **LION** (T4) | `max` | dual PNG lion, beam, roar, shake |
| ROSE / HEART | `mid` | standard soft neon |
| ostatní | `simple` | lehčí stage |

Overlay **neexpozuje coins** — jen oslava / caption.

## OBS setup

**Scéna:** `SPINAK_ENGINE_GIFTS` (nebo `MIA_OBS_CAMERA_SCENE`)

**Zdroj:** Browser Source `MIA_GIFT_ANIMATION`

```
http://127.0.0.1:3000/gift-animation-overlay.html?v=37-stream-polish
```

| Nastavení | Hodnota |
|-----------|---------|
| Width × Height | 1920 × 1080 |
| Transparent | ON |
| FPS | 30 |
| Shutdown source when not visible | **OFF** |
| Default visible | **ON** — idle = CSS opacity 0; Generate zapne scene item |

```bash
npm run obs:apply-hands
```

```text
freeze baseline = 32-gfx-whole
active runtime bust = 36-koj-unify
gift-only polish = 37-stream-polish
```

Cache gift: `?v=37-stream-polish` · celek: `docs/MIA_GRAPHICS_WHOLE.md` · předstream: `docs/MIA_PRESTREAM_DOD.md`

## Assety

- Lion: `mia-output-overlay/assets/gift-creatures/lion/{majestic,roar}.png`
- Universe: `…/universe/{calm,surge}.png`
- Galaxy: `…/galaxy/{calm,burst}.png`

Install / rematte: `node .tmp-audit/install_gift_creatures_v31.js`
