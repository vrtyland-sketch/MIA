# ASSET INVENTORY 02 — CLASSIFY

**Režim:** CLASSIFY ONLY — žádné mazání, přesuny ani generování.
**Generováno:** `node scripts/generate_asset_classify.js`

## Executive summary

- **ORPHAN celkem:** 104,716 souborů · 14.00 GB
- **ACTIVE (má code ref):** 690
- **Hlavní sediment:** `generated/eyes/` = 101,279 souborů (12.21 GB)
- **Registry:** `ASSET_REGISTRY.json` stále prázdný — klasifikace je filesystem + code grep
- **Doporučené větve:** A = cache/temp · B = content → registry

## ORPHAN klasifikace

| Skupina | COUNT | SIZE | oldest | newest | referenced-by-code? | generated-by-script? | Větev |
|---------|-------|------|--------|--------|---------------------|----------------------|-------|
| `generated/eyes` | 101,279 | 12.21 GB | 2026-06-23 11:40:43 | 2026-08-07 21:36:08 | ne | **ano** | A — cache/temp (automatický cleanup kandidát) |
| `generated/gifts` | 570 | 60.6 MB | 2026-06-18 16:31:46 | 2026-08-05 17:55:55 | ano (71 ACTIVE v kategorii) | **ano** | A/B — runtime výstupy; část cache, část content |
| `overlay` | 1,508 | 1.27 GB | 2026-06-18 19:57:24 | 2026-08-08 15:55:43 | ano (437 ACTIVE v kategorii) | ne | B — content asset (registry ID) |
| `video` | 31 | 259.7 MB | 2026-03-14 08:37:59 | 2026-07-04 21:56:09 | ano (182 ACTIVE v kategorii) | ne | B — content asset (registry ID) |
| `audio` | 801 | 47.8 MB | 2026-06-14 05:32:12 | 2026-08-06 18:40:02 | ne | **ano** | A — cache/temp (automatický cleanup kandidát) |
| `legacy` | 404 | 37.2 MB | 2026-06-18 20:04:02 | 2026-06-18 20:06:11 | ne | ne | B — content asset (registry ID) |
| `unknown` | 123 | 119.2 MB | 2026-03-14 08:31:53 | 2026-07-04 18:58:45 | ne | ne | TBD |

### Poznámky ke skupinám

- **`generated/eyes`** — OBS screenshot cache z MIA Eyes (`captureScreenshot`, default `save: true`). Každý tick/endpoint = nový PNG s timestampem.
- **`generated/gifts`** — `gift-animations/`, `gift-moments/`, `story-moments/`, `media-templates/` z procedural/story/template rendererů.
- **`audio`** — `mia-output-overlay/audio-cache/` (TTS MP3 z `MIA_TTS_ENGINE.js`); ORPHAN = staré hlasy bez aktuální reference.
- **`overlay`** — `mia-output-overlay/assets/` a root HTML overlaye bez přímé code cesty.
- **`video`** — `incoming-images/videos*` + root video soubory.
- **`legacy`** — `archive/deprecated/` — historický obsah.
- **unknown** — 123 souborů mimo pravidla (viz vzorky níže).

### `unknown` — vzorky cest

- `incoming-images/gift-map-screenshots/Screenshot_20260413-190502_TikTok.png`
- `incoming-images/gift-map-screenshots/Screenshot_20260413-190508_TikTok.png`
- `incoming-images/gift-map-screenshots/Screenshot_20260413-190516_TikTok.png`
- `incoming-images/gift-map-screenshots/Screenshot_20260413-190520_TikTok.png`
- `incoming-images/gift-map-screenshots/Screenshot_20260413-190526_TikTok.png`
- `incoming-images/gift-map-screenshots/Screenshot_20260413-190533_TikTok.png`
- `incoming-images/gift-map-screenshots/Screenshot_20260413-190538_TikTok.png`
- `incoming-images/gift-map-screenshots/Screenshot_20260413-190543_TikTok.png`
- `incoming-images/gift-map-screenshots/Screenshot_20260413-190547_TikTok.png`
- `incoming-images/gift-map-screenshots/Screenshot_20260413-190552_TikTok.png`
- `incoming-images/gift-map-screenshots/Screenshot_20260413-190557_TikTok.png`
- `incoming-images/gift-map-screenshots/Screenshot_20260413-190603_TikTok.png`
- `incoming-images/gift-map-screenshots/Screenshot_20260413-190611_TikTok.png`
- `incoming-images/gift-map-screenshots/Screenshot_20260413-190616_TikTok.png`
- `incoming-images/gift-map-screenshots/Screenshot_20260413-190621_TikTok.png`
- `incoming-images/gift-map-screenshots/Screenshot_20260413-190626_TikTok.png`
- `incoming-images/gift-map-screenshots/Screenshot_20260413-190636_TikTok.png`
- `incoming-images/gift-map-screenshots/Screenshot_20260413-190645_TikTok.png`
- `incoming-images/photos/1769702481503.gif`
- `incoming-images/photos/1769702507201.gif`

## A vs B — rozhodovací matice

| Větev | Skupiny | Akce (až po schválení) |
|-------|---------|------------------------|
| **A** cache/temp | `generated/eyes`, `audio-cache`, část `generated/gifts` | retention policy + automatický cleanup |
| **B** content | `overlay`, `video`, `legacy`, unikátní gift outputs | `ASSET_REGISTRY.json` ID + audit ACTIVE |

## Deep dive: `generated/eyes/`

| Otázka | Odpověď |
|--------|---------|
| Který skript vytváří? | `scripts/MIA_EYES.js` |
| Kdo volá (runtime)? | `routes/eyes.js`, `scripts/MIA_OBS_VISION.js`, `scripts/mia_guided_walkthrough.js`, `scripts/obs_apply_away_eyes.js`, `scripts/MIA_MATTING_INGEST_BRIDGE.js` |
| Generuje se za běhu? | **Ano** — OBS `GetSourceScreenshot` → `fs.writeFileSync` |
| Je to cache? | **Ano** — diagnostické screenshoty scény/zdrojů |
| Retention/cleanup? | **none — write-only, no cleanup in codebase** |
| Souborů | **101,279** |
| Objem | **12.21 GB** |
| Nejstarší | 2026-06-23 11:40:43 |
| Nejnovější | 2026-08-07 21:36:08 |
| Unikátních jmen souborů | 101,279 (timestamp v názvu) |
| Size skupin s >1 souborem | 15,561 |
| Binárně duplicitní (partial MD5 při shodné velikosti) | **32,073** souborů |
| Unikátních binárních (partial hash) | **73,402** |
| Basename s code ref | 0 (téměř vždy 0 — refs jsou pattern/template) |

### Top OBS source prefixy (z názvu souboru)

| Source prefix | Počet PNG |
|---------------|-----------|
| `KOJNOZROUT_RUNTIME` | 100,576 |
| `T5_VIDEO_19` | 407 |
| `SPINAK_ENGINE_GIFTS` | 74 |
| `T1_VIDEO_01` | 46 |
| `T1_VIDEO_02` | 34 |
| `T1_VIDEO_03` | 29 |
| `T1_VIDEO_04` | 28 |
| `T1_VIDEO_05` | 21 |
| `T1_VIDEO_06` | 13 |
| `MIA_BUBBLE` | 10 |
| `MIA_COMBO` | 5 |
| `T2_VIDEO_05` | 5 |
| `T5_VIDEO_20` | 5 |
| `T3_VIDEO_09` | 4 |
| `MIA_ENTITY` | 3 |

### Generátory ostatních `generated/*`

| Subdir | Writer script | Runtime |
|--------|---------------|---------|
| `gift-animations/` | `shared/mia-gift-animation/proceduralRenderer.js` | ano |
| `gift-moments/` | `scripts/MIA_GIFT_VISUAL_COMPOSER.js` | ano |
| `story-moments/` | `scripts/MIA_STORY_ANIMATION_ENGINE.js` | ano |
| `media-templates/` | `scripts/MIA_MEDIA_TEMPLATE_RENDERER.js` | ano |

## MISSING refs — code path → asset

**54** řádků (nic neopraveno).

| Code path | Missing asset path | Template? |
|-----------|-------------------|-----------|
| `mia-output-overlay/arena-battle-overlay.html:251` | `assets/kojnozrout/items/${itemId}.png` | ano |
| `mia-output-overlay/arena-battle-test-overlay.html:126` | `assets/kojnozrout/forms/${id}/idle.png` | ano |
| `mia-output-overlay/arena-overlay.html:178` | `assets/kojnozrout/forms/${p.id}/idle.png` | ano |
| `mia-output-overlay/away-loop-overlay.html:395` | `assets/kojnozrout/scenes/scene-${id}.png` | ano |
| `mia-output-overlay/koj-evolution-gallery.html:28` | `assets/kojnozrout/evolution/${t.id}.png` | ano |
| `mia-output-overlay/koj-forms-gallery.html:39` | `assets/kojnozrout/forms/${f}/${a}.png` | ano |
| `mia-output-overlay/koj-items-gallery.html:30` | `assets/kojnozrout/items/${id}.png` | ano |
| `mia-output-overlay/koj-props-gallery.html:31` | `assets/kojnozrout/props/${p.id}.png` | ano |
| `mia-output-overlay/koj-scenes-gallery.html:37` | `assets/kojnozrout/scenes/scene-${s.id}.png` | ano |
| `mia-output-overlay/kojnozrout-backpack-overlay.html:137` | `assets/kojnozrout/items/${id}.png` | ano |
| `mia-output-overlay/kojnozrout-duel-overlay.html:109` | `assets/kojnozrout/items/${use.itemId}.png` | ano |
| `mia-output-overlay/viewer-strip-overlay.html:179` | `assets/kojnozrout/viewers/default-follower.png` | ne |
| `scripts/build_animation_bank.js:58` | `assets/animation-bank/${p.clipId}/built/sprite_sheet.png` | ano |
| `scripts/export_paint_to_animation_bank.js:114` | `assets/animation-bank/${clipId}/built/sprite_sheet.png` | ano |
| `scripts/generate_away_loop_video.js:6` | `incoming-images/videos/away/nejsem_tu_loop.mp4` | ne |
| `scripts/MIA_BOSS_CINEMATIC.js:53` | `assets/boss-cinematic/hero-${normalized.toLowerCase()}.png` | ano |
| `scripts/MIA_KOJ_ROSTER.js:260` | `assets/kojnozrout/battle/${row.id}-battle.png` | ano |
| `scripts/MIA_KOJNOZROUT_ASSETS.js:273` | `assets/kojnozrout/evolution/${key}.png` | ano |
| `scripts/MIA_KOJNOZROUT_ASSETS.js:302` | `assets/kojnozrout/stages/${hit.tier}/kojnozout-${hit.moodKey}.png` | ano |
| `scripts/MIA_KOJNOZROUT_ASSETS.js:310` | `assets/kojnozrout/items/${key}.png` | ano |
| `scripts/MIA_KOJNOZROUT_DISPLAY.js:633` | `assets/kojnozrout/moods/kojnozout-${spriteAsset}.png` | ano |
| `scripts/MIA_OBS_AWAY_LOOP.js:19` | `incoming-images/videos/away/nejsem_tu_loop.mp4` | ne |
| `scripts/MIA_PAINT_AI.js:153` | `mia-output-overlay/assets/kojnozrout/custom/${name}.png` | ano |
| `shared/host_mode_config.json:16` | `incoming-images/videos/away/nejsem_tu_loop.mp4` | ne |
| `shared/mia-animation-engine/AnimationBank.js:74` | `assets/animation-bank/${clip.id}/built/sprite_sheet.png` | ano |
| `shared/mia-animation-engine/promoteAiAnimation.js:139` | `assets/mia-ai-staging/${encodeURIComponent(stagingId)}/built/sprite_sheet.png` | ano |
| `shared/mia-animation-engine/promoteAiAnimation.js:316` | `assets/mia-ai-staging/${encodeURIComponent(stagingId)}/built/sprite_sheet.png` | ano |
| `shared/mia-animation-engine/promoteAiAnimation.js:454` | `assets/animation-bank/${clipId}/built/sprite_sheet.png` | ano |
| `shared/mia-animation-engine/promoteAiAnimation.js:525` | `assets/animation-bank/${clipId}/built/sprite_sheet.png` | ano |
| `shared/mia-animation-engine/promoteAiAnimation.js:623` | `assets/animation-bank/${clipId}/built/sprite_sheet.png` | ano |
| `shared/mia-animation-engine/stagingPreview.js:19` | `assets/mia-ai-staging/${encodeURIComponent(stagingId)}/built/sprite_sheet.png` | ano |
| `shared/mia-animation-engine/stagingPreview.js:240` | `assets/mia-ai-staging/${encodeURIComponent(stagingId)}/built/preview.gif` | ano |
| `shared/mia-animation-engine/stagingPreview.js:287` | `assets/mia-ai-staging/${encodeURIComponent(id)}/built/sprite_sheet.png` | ano |
| `shared/mia-animation-engine/stagingPreview.js:290` | `assets/mia-ai-staging/${encodeURIComponent(id)}/built/preview.gif` | ano |
| `shared/mia-animation-engine/stagingPreview.js:293` | `assets/mia-ai-staging/${encodeURIComponent(id)}/built/preview.webm` | ano |
| `shared/mia-animation-engine/stagingPreview.js:296` | `assets/mia-ai-staging/${encodeURIComponent(id)}/built/preview.mp4` | ano |
| `shared/mia-animation-engine/stagingPreview.js:476` | `assets/mia-ai-staging/${encodeURIComponent(outId)}/built/preview.gif` | ano |
| `shared/mia-graphics-studio/avatarCommands.js:50` | `mia-output-overlay/assets/kojnozrout/custom/${safe}.png` | ano |
| `shared/mia-graphics-studio/avatarCommands.js:51` | `assets/kojnozrout/custom/${safe}.png` | ano |
| `shared/mia-speech-core/speechEngine.js:430` | `audio-cache/${cacheLookup.key}.mp3` | ano |
| `tests/capybara_flow_runtime_contract.js:142` | `audio-cache/x.mp3` | ne |
| `tests/capybara_flow_runtime_contract.js:79` | `audio-cache/x.mp3` | ne |
| `tests/kojnozout_runtime_split_contract.js:179` | `assets/x.png` | ne |
| `tests/kojnozout_runtime_split_contract.js:180` | `assets/x.png` | ne |
| `tests/kojnozout_runtime_split_contract.js:191` | `assets/gifts/rose.png` | ne |
| `tests/kojnozout_runtime_split_contract.js:200` | `assets/gifts/rose.png` | ne |
| `tests/kojnozout_runtime_split_contract.js:238` | `assets/gifts/rose.png` | ne |
| `tests/mia_animation_bank_12w_promote_contract.js:61` | `assets/animation-bank/ai/fake_rose/built/sprite_sheet.png` | ne |
| `tests/mia_animation_bank_12x_preview_contract.js:67` | `assets/animation-bank/ai/studio_only/built/sprite_sheet.png` | ne |
| `tests/mia_master_canon_0035_contract.js:87` | `audio-cache/test.mp3` | ne |
| `tests/sprint3_contract.js:37` | `generated/gift-moments/test.png` | ne |
| `tests/story_feed_runtime_contract.js:116` | `generated/story-moments/x.png` | ne |
| `tests/tts_overlay_integration_smoke.js:39` | `audio-cache/test.mp3` | ne |
| `tests/video_timing_contract.js:107` | `incoming-images/videos/story.mp4` | ne |
