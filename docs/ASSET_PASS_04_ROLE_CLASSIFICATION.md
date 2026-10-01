# ASSET PASS 04 — ROLE CLASSIFICATION

**Režim:** registry + docs only · žádné přesuny/mazání/runtime.
**Generováno:** `node scripts/classify_asset_roles.js`

## Souhrn

| Metrika | Hodnota |
|---------|---------|
| Vstup: prázdné `role` (03B) | **421** |
| Null-only: auto / unknown / conflict / manual | **418 / 2 / 0 / 1** |
| (03B missing metadata celkem) | 496 — z toho `role` null bylo 421, zbytek `dimensions` |
| Legacy hyphen roles normalizováno | **670** |
| **auto-classified** (celkem 1091) | **1088** |
| **unknown** | **2** |
| **conflict** | **0** |
| **manual-review** | **1** |
| Hash-neighbor doplnění | 0 |

### Role distribuce (všechny záznamy)

- `character_mood`: 340
- `video_clip`: 277
- `character_form`: 214
- `reference_image`: 112
- `overlay_ui`: 95
- `gift_visual`: 30
- `overlay_background`: 16
- `preview`: 5
- `unknown`: 2

## Řízené kategorie

`gift_visual` · `character_form` · `character_mood` · `overlay_ui` · `overlay_background` · `video_clip` · `reference_image` · `preview` · `logo_brand` · `unknown`

## Unknown / conflict / manual-review

| ID | Path | Role | Status | Důvod |
|----|------|------|--------|-------|
| `MIA_ASSET_F392001E5B40` | `mia-output-overlay/assets/kojnozrout/base/body.png` | unknown | unknown | no matching rules |
| `MIA_ASSET_1E6A74037421` | `mia-output-overlay/assets/mia/masters/idle.png` | reference_image | manual-review | narrow lead over overlay_ui (3 vs 2) |
| `MIA_ASSET_BD06484F8818` | `mia-output-overlay/assets/viewers/default-follower.png` | unknown | unknown | no matching rules |

## Duplicate-content groups (103)

Skupiny se stejným `contentHash` — pro budoucí dedup safety pass.

### `0f8a09ba0fbd…` · 3× · 38534 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_87511EBFCAF5` | `video_clip` | `incoming-images/videos_2/VID-20260504-WA0001.mp4` | config/media-intake-overrides.json:119; config/media-intake-overrides.json:1511 (+10) |
| `VID_VID-20260504-WA0001_211904` | `video_clip` | `incoming-images/videos/VID-20260504-WA0001_211904.mp4` | config/media-intake-overrides.json:1503; config/media-visual-review.json:5535 (+7) |
| `VID_VID-20260504-WA0001` | `video_clip` | `incoming-images/videos/VID-20260504-WA0001.mp4` | config/media-intake-overrides.json:119; config/media-intake-overrides.json:1511 (+10) |

### `f3648bd6e377…` · 5× · 37888 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `VID_LV_0_20260305202118_1` | `video_clip` | `incoming-images/videos/lv_0_20260305202118 (1).mp4` | config/media-intake-overrides.json:623; config/media-visual-review.json:2337 (+7) |
| `VID_LV_0_20260305202118_2` | `video_clip` | `incoming-images/videos/lv_0_20260305202118 (2).mp4` | config/media-intake-overrides.json:631; config/media-visual-review.json:2366 (+7) |
| `VID_LV_0_20260305202118_3` | `video_clip` | `incoming-images/videos/lv_0_20260305202118 (3).mp4` | config/media-intake-overrides.json:639; config/media-visual-review.json:2395 (+7) |
| `VID_LV_0_20260305202118_210842` | `video_clip` | `incoming-images/videos/lv_0_20260305202118_210842.mp4` | config/media-intake-overrides.json:647; config/media-visual-review.json:2424 (+7) |
| `VID_LV_0_20260305202118` | `video_clip` | `incoming-images/videos/lv_0_20260305202118.mp4` | config/media-intake-overrides.json:655; config/media-visual-review.json:2453 (+7) |

### `103afa3d5074…` · 2× · 34178 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_58E3114F1D1E` | `video_clip` | `incoming-images/videos_2/VID-20260419-WA0070.mp4` | config/media-intake-overrides.json:103; config/media-intake-overrides.json:1479 (+10) |
| `VID_VID-20260419-WA0070` | `video_clip` | `incoming-images/videos/VID-20260419-WA0070.mp4` | config/media-intake-overrides.json:103; config/media-intake-overrides.json:1479 (+10) |

### `0a8971942cf7…` · 2× · 33853 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `VID_2026-02-01-161429084_175814` | `video_clip` | `incoming-images/videos/2026-02-01-161429084_175814.mp4` | config/media-intake-overrides.json:239; config/media-visual-review.json:882 (+7) |
| `VID_2026-02-01-161429084` | `video_clip` | `incoming-images/videos/2026-02-01-161429084.mp4` | config/media-intake-overrides.json:247; config/media-visual-review.json:910 (+7) |

### `d8a92e3daca7…` · 2× · 31576 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `VID_LV_0_20260307180457_211118` | `video_clip` | `incoming-images/videos/lv_0_20260307180457_211118.mp4` | config/media-intake-overrides.json:679; config/media-visual-review.json:2540 (+7) |
| `VID_LV_0_20260307180457` | `video_clip` | `incoming-images/videos/lv_0_20260307180457.mp4` | config/media-intake-overrides.json:687; config/media-visual-review.json:2569 (+7) |

### `d4ce3d7e5157…` · 2× · 25543 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `VID_LV_0_20260309100507_1` | `video_clip` | `incoming-images/videos/lv_0_20260309100507 (1).mp4` | config/media-intake-overrides.json:719; config/media-visual-review.json:2687 (+7) |
| `VID_LV_0_20260309100507` | `video_clip` | `incoming-images/videos/lv_0_20260309100507.mp4` | config/media-intake-overrides.json:727; config/media-visual-review.json:2717 (+7) |

### `4262300a0ca4…` · 2× · 24844 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `VID_VID-20260319-WA0001_211251` | `video_clip` | `incoming-images/videos/VID-20260319-WA0001_211251.mp4` | config/media-intake-overrides.json:1143; config/media-visual-review.json:4231 (+7) |
| `VID_VID-20260319-WA0001` | `video_clip` | `incoming-images/videos/VID-20260319-WA0001.mp4` | config/media-intake-overrides.json:1151; config/media-visual-review.json:4260 (+7) |

### `7c62df3ffddb…` · 2× · 22732 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `VID_LV_7505688003600190773_20260130144313_1` | `video_clip` | `incoming-images/videos/lv_7505688003600190773_20260130144313 (1).mp4` | config/media-intake-overrides.json:775; config/media-visual-review.json:2892 (+7) |
| `VID_LV_7505688003600190773_20260130144313` | `video_clip` | `incoming-images/videos/lv_7505688003600190773_20260130144313.mp4` | config/media-intake-overrides.json:783; config/media-visual-review.json:2921 (+7) |

### `712e537d5566…` · 2× · 21507 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `VID_LV_7412252754967547152_20260130143639_1` | `video_clip` | `incoming-images/videos/lv_7412252754967547152_20260130143639 (1).mp4` | config/media-intake-overrides.json:751; config/media-visual-review.json:2805 (+7) |
| `VID_LV_7412252754967547152_20260130143639` | `video_clip` | `incoming-images/videos/lv_7412252754967547152_20260130143639.mp4` | config/media-intake-overrides.json:759; config/media-visual-review.json:2834 (+7) |

### `207d2a684b41…` · 2× · 13554 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `VID_LV_0_20260129173032_1` | `video_clip` | `incoming-images/videos/lv_0_20260129173032 (1).mp4` | config/media-intake-overrides.json:487; config/media-visual-review.json:1809 (+7) |
| `VID_LV_0_20260129173032` | `video_clip` | `incoming-images/videos/lv_0_20260129173032.mp4` | config/media-intake-overrides.json:495; config/media-visual-review.json:1838 (+7) |

### `6aeb113f737f…` · 3× · 11225 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_12AC1BC6979A` | `video_clip` | `incoming-images/videos_2/VID-20260318-WA0333.mp4` | config/media-intake-overrides.json:1135; config/media-intake-overrides.json:95 (+10) |
| `VID_VID-20260318-WA0333_211904` | `video_clip` | `incoming-images/videos/VID-20260318-WA0333_211904.mp4` | config/media-intake-overrides.json:1127; config/media-visual-review.json:4173 (+7) |
| `VID_VID-20260318-WA0333` | `video_clip` | `incoming-images/videos/VID-20260318-WA0333.mp4` | config/media-intake-overrides.json:1135; config/media-intake-overrides.json:95 (+10) |

### `01f89773e3fb…` · 3× · 10473 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `VID_2026-02-17-121129193_180745` | `video_clip` | `incoming-images/videos/2026-02-17-121129193_180745.mp4` | config/media-intake-overrides.json:287; config/media-visual-review.json:1057 (+7) |
| `VID_2026-02-17-121129193_181050` | `video_clip` | `incoming-images/videos/2026-02-17-121129193_181050.mp4` | config/media-intake-overrides.json:295; config/media-visual-review.json:1085 (+7) |
| `VID_2026-02-17-121129193` | `video_clip` | `incoming-images/videos/2026-02-17-121129193.mp4` | config/media-intake-overrides.json:303; config/media-visual-review.json:1113 (+7) |

### `aee66c40af2f…` · 2× · 4595 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `VID_LV_0_20260131151957_175058` | `video_clip` | `incoming-images/videos/lv_0_20260131151957_175058.mp4` | config/media-intake-overrides.json:511; config/media-visual-review.json:1896 (+7) |
| `VID_LV_0_20260131151957` | `video_clip` | `incoming-images/videos/lv_0_20260131151957.mp4` | config/media-intake-overrides.json:519; config/media-visual-review.json:1925 (+10) |

### `f691fcd93e32…` · 2× · 4473 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `VID_2026-01-31-202404755_175510` | `video_clip` | `incoming-images/videos/2026-01-31-202404755_175510.mp4` | config/media-intake-overrides.json:183; config/media-visual-review.json:680 (+7) |
| `VID_2026-01-31-202404755` | `video_clip` | `incoming-images/videos/2026-01-31-202404755.mp4` | config/media-intake-overrides.json:191; config/media-visual-review.json:708 (+7) |

### `3e2ad542cf80…` · 2× · 2947 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `VID_LV_7351466693492837650_20260302151200_183032` | `video_clip` | `incoming-images/videos/lv_7351466693492837650_20260302151200_183032.mp4` | config/media-intake-overrides.json:735; config/media-visual-review.json:2747 (+7) |
| `VID_LV_7351466693492837650_20260302151200` | `video_clip` | `incoming-images/videos/lv_7351466693492837650_20260302151200.mp4` | config/media-intake-overrides.json:743; config/media-visual-review.json:2776 (+7) |

### `51868f6f4126…` · 2× · 1897 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_1FC6BA4723BF` | `reference_image` | `mia-output-overlay/assets/mia/masters/faces/idle.png` | mia-output-overlay/koj-masters-gallery.html:60 |
| `MIA_ASSET_1E6A74037421` | `reference_image` | `mia-output-overlay/assets/mia/masters/idle.png` | mia-output-overlay/anchors/koj.json:5; mia-output-overlay/arena-battle-test-overlay.html:126 (+10) |

### `b6a2bb47070d…` · 2× · 1788 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `VID_HAILUO_1769864687_1` | `video_clip` | `incoming-images/videos/hailuo_1769864687 (1).mp4` | config/media-intake-overrides.json:447; config/media-visual-review.json:1655 (+10) |
| `VID_HAILUO_1769864687` | `video_clip` | `incoming-images/videos/hailuo_1769864687.mp4` | config/media-intake-overrides.json:455; config/media-visual-review.json:1686 (+10) |

### `a2b0e2437c2a…` · 2× · 1773 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_3C22F1F6C0A9` | `reference_image` | `mia-output-overlay/assets/mia/masters/faces/combo.png` | mia-output-overlay/assets/genesis/genesis-runtime.js:48; mia-output-overlay/koj-gallery.html:176 (+10) |
| `MIA_ASSET_70E7F097149B` | `reference_image` | `mia-output-overlay/assets/mia/masters/faces/gift.png` | mia-output-overlay/generated/gift-animations/1784487704024-c957ad9b3fd4/manifest.json:28; mia-output-overlay/generated/gift-animations/1784487705056-b5f1b84d502e/manifest.json:28 (+46) |

### `46cd475b5082…` · 3× · 1703 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_71F537017C66` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-16T18-08-53-355Z/kojnozout-full.png` | mia-output-overlay/koj-gallery.html:188; mia-output-overlay/koj-gallery.html:56 |
| `MIA_ASSET_CD39AAF740C6` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-full.png` | mia-output-overlay/koj-gallery.html:188; mia-output-overlay/koj-gallery.html:56 |
| `MIA_ASSET_606F73678511` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-full.png` | mia-output-overlay/koj-gallery.html:188; mia-output-overlay/koj-gallery.html:56 |

### `2b02ee93f33d…` · 3× · 1702 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_D3E765395F43` | `overlay_ui` | `mia-output-overlay/assets/mia/cyber/hero.png` | scripts/mia_build_cyber_alpha.js:193; scripts/mia_build_cyber_alpha.js:31 |
| `MIA_ASSET_F94DDD7C54FB` | `overlay_ui` | `mia-output-overlay/assets/mia/cyber/lip/01.png` | mia-output-overlay/generated/gift-animations/1784487704024-c957ad9b3fd4/manifest.json:27; mia-output-overlay/generated/gift-animations/1784487705056-b5f1b84d502e/manifest.json:27 (+47) |
| `MIA_ASSET_17E6652FFCB1` | `overlay_ui` | `mia-output-overlay/assets/mia/hologram.png` | mia-output-overlay/speech-overlay.html:556; mia-output-overlay/speech-overlay.html:557 (+2) |

### `dc4a0daaa7c2…` · 2× · 1692 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_6E55C7ED1C9C` | `overlay_ui` | `mia-output-overlay/assets/mia/cyber/lip/02.png` | mia-output-overlay/assets/kojnozrout/animation-bank-manifest.json:18; mia-output-overlay/koj-gallery.html:65 (+10) |
| `MIA_ASSET_230E0EA7E557` | `overlay_ui` | `mia-output-overlay/assets/mia/cyber/speak.png` | mia-output-overlay/assets/genesis/genesis-runtime.js:44; mia-output-overlay/generated/gift-animations/1784487704024-c957ad9b3fd4/manifest.json:26 (+49) |

### `787be6b15680…` · 2× · 1619 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_E239D205F03C` | `reference_image` | `mia-output-overlay/assets/mia/masters/speak.png` | mia-output-overlay/assets/genesis/genesis-runtime.js:44; mia-output-overlay/generated/gift-animations/1784487704024-c957ad9b3fd4/manifest.json:26 (+10) |
| `MIA_ASSET_1F6A6C2FC527` | `reference_image` | `mia-output-overlay/assets/mia/masters/speak/02.png` | mia-output-overlay/koj-masters-gallery.html:71 |

### `bf1035d9ea58…` · 2× · 1595 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_1B5399B8A8E7` | `gift_visual` | `incoming-images/gift-map-screenshots/Screenshot_20260413-190543_TikTok.png` | config/tiktok-gift-panel-intake.json:15 |
| `MIA_ASSET_861BC5B55662` | `video_clip` | `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190543_TikTok.png` | config/tiktok-gift-panel-intake.json:15 |

### `ad022bbba481…` · 2× · 1576 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_83581BAC26DC` | `gift_visual` | `incoming-images/gift-map-screenshots/Screenshot_20260413-190508_TikTok.png` | config/tiktok-gift-panel-intake.json:9 |
| `MIA_ASSET_9DC03B050398` | `video_clip` | `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190508_TikTok.png` | config/tiktok-gift-panel-intake.json:9 |

### `95d04b9e8895…` · 2× · 1574 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_21D59BF88D27` | `reference_image` | `mia-output-overlay/assets/mia/masters/faces/wave.png` | mia-output-overlay/koj-masters-gallery.html:65 |
| `MIA_ASSET_A5AFAA7455F4` | `reference_image` | `mia-output-overlay/assets/mia/masters/wave.png` | mia-output-overlay/assets/genesis/genesis-runtime.js:45; mia-output-overlay/koj-gallery.html:158 (+10) |

### `ae9da6e9c828…` · 2× · 1548 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_7A611E7417FE` | `gift_visual` | `incoming-images/gift-map-screenshots/Screenshot_20260413-190626_TikTok.png` | config/tiktok-gift-panel-intake.json:23 |
| `MIA_ASSET_6604B1D7402F` | `video_clip` | `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190626_TikTok.png` | config/tiktok-gift-panel-intake.json:23 |

### `557a90bce217…` · 2× · 1546 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_4BDF45DDF19E` | `gift_visual` | `incoming-images/gift-map-screenshots/Screenshot_20260413-190616_TikTok.png` | config/tiktok-gift-panel-intake.json:21 |
| `MIA_ASSET_38F67C47DB88` | `video_clip` | `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190616_TikTok.png` | config/tiktok-gift-panel-intake.json:21 |

### `f464d1cf8d9f…` · 2× · 1543 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_7BDE2FF5EF0B` | `gift_visual` | `incoming-images/gift-map-screenshots/Screenshot_20260413-190516_TikTok.png` | config/tiktok-gift-panel-intake.json:10 |
| `MIA_ASSET_D49959B9B03D` | `video_clip` | `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190516_TikTok.png` | config/tiktok-gift-panel-intake.json:10 |

### `d701d5e4b69b…` · 2× · 1541 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_BF591DE87824` | `gift_visual` | `incoming-images/gift-map-screenshots/Screenshot_20260413-190552_TikTok.png` | config/tiktok-gift-panel-intake.json:17 |
| `MIA_ASSET_DB2BF243DCB5` | `video_clip` | `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190552_TikTok.png` | config/tiktok-gift-panel-intake.json:17 |

### `b3e7fdcec191…` · 2× · 1539 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_ADF886F5658A` | `gift_visual` | `incoming-images/gift-map-screenshots/Screenshot_20260413-190547_TikTok.png` | config/tiktok-gift-panel-intake.json:16 |
| `MIA_ASSET_55317677E76F` | `video_clip` | `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190547_TikTok.png` | config/tiktok-gift-panel-intake.json:16 |

### `6928c64862a0…` · 2× · 1538 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_B2EEFF27BA4F` | `gift_visual` | `incoming-images/gift-map-screenshots/Screenshot_20260413-190621_TikTok.png` | config/tiktok-gift-panel-intake.json:22 |
| `MIA_ASSET_CC4D6F2B948A` | `video_clip` | `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190621_TikTok.png` | config/tiktok-gift-panel-intake.json:22 |

### `af8601e8c294…` · 2× · 1511 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_223194FFFFEA` | `gift_visual` | `incoming-images/gift-map-screenshots/Screenshot_20260413-190557_TikTok.png` | config/tiktok-gift-panel-intake.json:18 |
| `MIA_ASSET_B399DB9228E8` | `video_clip` | `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190557_TikTok.png` | config/tiktok-gift-panel-intake.json:18 |

### `3d9ffbf438b2…` · 2× · 1509 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_22D724366605` | `gift_visual` | `incoming-images/gift-map-screenshots/Screenshot_20260413-190520_TikTok.png` | config/tiktok-gift-panel-intake.json:11 |
| `MIA_ASSET_787E6E31DB58` | `video_clip` | `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190520_TikTok.png` | config/tiktok-gift-panel-intake.json:11 |

### `ab10c5ed634f…` · 2× · 1506 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_5EC7332E7C6B` | `gift_visual` | `incoming-images/gift-map-screenshots/Screenshot_20260413-190636_TikTok.png` | config/tiktok-gift-panel-intake.json:24 |
| `MIA_ASSET_7121B0768AE0` | `video_clip` | `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190636_TikTok.png` | config/tiktok-gift-panel-intake.json:24 |

### `63e59131fb43…` · 2× · 1498 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_CDC9C9DF74D4` | `gift_visual` | `incoming-images/gift-map-screenshots/Screenshot_20260413-190611_TikTok.png` | config/tiktok-gift-panel-intake.json:20 |
| `MIA_ASSET_AEDFDCF66387` | `video_clip` | `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190611_TikTok.png` | config/tiktok-gift-panel-intake.json:20 |

### `00c87c743792…` · 2× · 1490 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_5F389FEBC4E6` | `gift_visual` | `incoming-images/gift-map-screenshots/Screenshot_20260413-190538_TikTok.png` | config/tiktok-gift-panel-intake.json:14 |
| `MIA_ASSET_F10B036F28E2` | `video_clip` | `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190538_TikTok.png` | config/tiktok-gift-panel-intake.json:14 |

### `a48972f8025c…` · 4× · 1485 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_461AB2A78DD3` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-16T18-08-53-355Z/kojnozout-happy.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:11; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:13 (+10) |
| `MIA_ASSET_EFC1036CF4A1` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-happy.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:11; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:13 (+10) |
| `MIA_ASSET_D33E2656D339` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-happy.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:11; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:13 (+10) |
| `MIA_ASSET_1F9623B59301` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-laugh.png` | mia-output-overlay/koj-gallery.html:223 |

### `e9a5d391074d…` · 3× · 1484 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_483D84E07289` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-16T18-08-53-355Z/kojnozout-excited.png` | mia-output-overlay/koj-gallery.html:168 |
| `MIA_ASSET_57C6B4E9F773` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-excited.png` | mia-output-overlay/koj-gallery.html:168 |
| `MIA_ASSET_03B3A5A92A6E` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-excited.png` | mia-output-overlay/koj-gallery.html:168 |

### `6ffe1cc9816b…` · 5× · 1459 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_1C3443AB0A05` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-16T18-08-53-355Z/kojnozout-annoyed.png` | mia-output-overlay/koj-gallery.html:217; mia-output-overlay/koj-gallery.html:54 |
| `MIA_ASSET_1198E5D21AC8` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-16T18-08-53-355Z/kojnozout-hungry.png` | mia-output-overlay/koj-gallery.html:180; mia-output-overlay/koj-gallery.html:55 |
| `MIA_ASSET_39C9DE4BCF67` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-16T18-08-53-355Z/kojnozout-sick.png` | mia-output-overlay/koj-gallery.html:203; mia-output-overlay/koj-gallery.html:51 |
| `MIA_ASSET_20838953DE8C` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-hungry.png` | mia-output-overlay/koj-gallery.html:180; mia-output-overlay/koj-gallery.html:55 |
| `MIA_ASSET_D9F7363985C6` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-hungry.png` | mia-output-overlay/koj-gallery.html:180; mia-output-overlay/koj-gallery.html:55 |

### `7a301dad798a…` · 3× · 1449 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_AB321A4E7988` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-sad.png` | mia-output-overlay/koj-gallery.html:209; mia-output-overlay/koj-gallery.html:52 |
| `MIA_ASSET_971474BF8822` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-sad.png` | mia-output-overlay/koj-gallery.html:209; mia-output-overlay/koj-gallery.html:52 |
| `MIA_ASSET_F4FEB9000178` | `character_mood` | `mia-output-overlay/assets/kojnozrout/moods/kojnozout-sad.png` | mia-output-overlay/koj-gallery.html:209; mia-output-overlay/koj-gallery.html:52 |

### `475762c4fe51…` · 2× · 1446 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_799FB5F82F23` | `gift_visual` | `incoming-images/gift-map-screenshots/Screenshot_20260413-190603_TikTok.png` | config/tiktok-gift-panel-intake.json:19 |
| `MIA_ASSET_17A6F96207A3` | `video_clip` | `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190603_TikTok.png` | config/tiktok-gift-panel-intake.json:19 |

### `e45e07ac3564…` · 2× · 1442 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_3383493CA076` | `gift_visual` | `incoming-images/gift-map-screenshots/Screenshot_20260413-190502_TikTok.png` | config/tiktok-gift-panel-intake.json:8 |
| `MIA_ASSET_EC7A1314575E` | `video_clip` | `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190502_TikTok.png` | config/tiktok-gift-panel-intake.json:8 |

### `28358ab3db78…` · 3× · 1421 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_2543F7FD66F3` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-annoyed.png` | mia-output-overlay/koj-gallery.html:217; mia-output-overlay/koj-gallery.html:54 |
| `MIA_ASSET_7EBC35DEEF39` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-annoyed.png` | mia-output-overlay/koj-gallery.html:217; mia-output-overlay/koj-gallery.html:54 |
| `MIA_ASSET_30BDFCAF7C0F` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-stressed.png` | mia-output-overlay/koj-gallery.html:229; mia-output-overlay/koj-gallery.html:53 |

### `97d92f34e57d…` · 2× · 1418 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_8DB38307F44D` | `gift_visual` | `incoming-images/gift-map-screenshots/Screenshot_20260413-190526_TikTok.png` | config/tiktok-gift-panel-intake.json:12 |
| `MIA_ASSET_7C44F40D010D` | `video_clip` | `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190526_TikTok.png` | config/tiktok-gift-panel-intake.json:12 |

### `85be7dafc59e…` · 2× · 1417 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_E13212DE2F34` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-eating.png` | mia-output-overlay/koj-gallery.html:63; scripts/kojnozrout_restore_canon_sprites.js:129 |
| `MIA_ASSET_44D19647E2D6` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-eating.png` | mia-output-overlay/koj-gallery.html:63; scripts/kojnozrout_restore_canon_sprites.js:129 |

### `21d325ff3956…` · 2× · 1405 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_5B8D2542FE1A` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-sick.png` | mia-output-overlay/koj-gallery.html:203; mia-output-overlay/koj-gallery.html:51 |
| `MIA_ASSET_CDFC131742FF` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-sick.png` | mia-output-overlay/koj-gallery.html:203; mia-output-overlay/koj-gallery.html:51 |

### `0463b9f2462c…` · 2× · 1405 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_937B00087F21` | `gift_visual` | `incoming-images/gift-map-screenshots/Screenshot_20260413-190533_TikTok.png` | config/tiktok-gift-panel-intake.json:13 |
| `MIA_ASSET_044216620AF8` | `video_clip` | `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190533_TikTok.png` | config/tiktok-gift-panel-intake.json:13 |

### `9accfdc3177c…` · 3× · 1370 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `KOJ_FORM_KICK_IDLE` | `character_form` | `mia-output-overlay/assets/kojnozrout/forms/kick/idle.png` | mia-output-overlay/koj-masters-gallery.html:45 |
| `MIA_ASSET_29B0D08303F3` | `reference_image` | `mia-output-overlay/assets/kojnozrout/masters/stackzrout-master.png` | scripts/generate_platform_form_anims.js:18 |
| `MIA_ASSET_1ECB6E6C1461` | `preview` | `mia-output-overlay/assets/kojnozrout/roster/stackzrout-preview.png` | mia-output-overlay/arena-overlay.html:130; mia-output-overlay/koj-roster-gallery.html:33 (+1) |

### `c644cea98e64…` · 2× · 1344 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_17606A85963B` | `reference_image` | `mia-output-overlay/assets/mia/masters/faces/think.png` | mia-output-overlay/koj-masters-gallery.html:64 |
| `MIA_ASSET_1A35DF4C3577` | `reference_image` | `mia-output-overlay/assets/mia/masters/think.png` | mia-output-overlay/assets/genesis/genesis-runtime.js:43; mia-output-overlay/assets/genesis/genesis-runtime.js:46 (+5) |

### `79c22f161e65…` · 5× · 1332 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_7C79D3EB2A9F` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-16T18-08-53-355Z/kojnozout-idle.png` | mia-output-overlay/anchors/koj.json:5; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:5 (+10) |
| `MIA_ASSET_504397F55034` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-16T18-08-53-355Z/kojnozout-sad.png` | mia-output-overlay/koj-gallery.html:209; mia-output-overlay/koj-gallery.html:52 |
| `MIA_ASSET_B2078181918C` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-16T18-08-53-355Z/kojnozout-sleepy.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/ARCHIVE.json:11; mia-output-overlay/koj-gallery.html:195 (+1) |
| `MIA_ASSET_A3132C96EBD7` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-idle.png` | mia-output-overlay/anchors/koj.json:5; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:5 (+10) |
| `MIA_ASSET_CF58326DDF9D` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-idle.png` | mia-output-overlay/anchors/koj.json:5; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:5 (+10) |

### `acd263797671…` · 3× · 1330 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `KOJ_FORM_TWITCH_IDLE` | `character_form` | `mia-output-overlay/assets/kojnozrout/forms/twitch/idle.png` | mia-output-overlay/koj-masters-gallery.html:49 |
| `MIA_ASSET_8518DA7963F8` | `reference_image` | `mia-output-overlay/assets/kojnozrout/masters/bitszrout-master.png` | scripts/generate_platform_form_anims.js:19 |
| `MIA_ASSET_323F1DBE7C60` | `preview` | `mia-output-overlay/assets/kojnozrout/roster/bitszrout-preview.png` | mia-output-overlay/arena-overlay.html:131; mia-output-overlay/koj-roster-gallery.html:35 (+1) |

### `049901414e6e…` · 2× · 1325 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_A0093B3C595A` | `gift_visual` | `incoming-images/gift-map-screenshots/Screenshot_20260413-190645_TikTok.png` | config/tiktok-gift-panel-intake.json:25 |
| `MIA_ASSET_6F740C2DFF20` | `video_clip` | `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190645_TikTok.png` | config/tiktok-gift-panel-intake.json:25 |

### `e4c07219f6ca…` · 3× · 1324 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `KOJ_FORM_TIKTOK_IDLE` | `character_form` | `mia-output-overlay/assets/kojnozrout/forms/tiktok/idle.png` | mia-output-overlay/koj-masters-gallery.html:41 |
| `MIA_ASSET_380CD56F2C6E` | `reference_image` | `mia-output-overlay/assets/kojnozrout/masters/tokzrout-master.png` | scripts/generate_platform_form_anims.js:17 |
| `MIA_ASSET_78E77C32FB94` | `preview` | `mia-output-overlay/assets/kojnozrout/roster/tokzrout-preview.png` | mia-output-overlay/arena-overlay.html:129; mia-output-overlay/koj-roster-gallery.html:31 (+1) |

### `5bc52d23ae98…` · 3× · 1312 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_E924A0AA5551` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-sleepy.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/ARCHIVE.json:11; mia-output-overlay/koj-gallery.html:195 (+1) |
| `MIA_ASSET_64751D5A165D` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-sleepy.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/ARCHIVE.json:11; mia-output-overlay/koj-gallery.html:195 (+1) |
| `MIA_ASSET_D6D8844662C5` | `character_mood` | `mia-output-overlay/assets/kojnozrout/moods/kojnozout-sleepy.png` | mia-output-overlay/koj-gallery.html:195; mia-output-overlay/koj-gallery.html:50 |

### `09951fba4186…` · 2× · 1300 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_BFA7FC6CFC4B` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-warm.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:8; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:9 (+10) |
| `MIA_ASSET_8D857C1F5048` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-warm.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:8; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:9 (+10) |

### `65c95e894578…` · 2× · 1259 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_6EC2445D7771` | `reference_image` | `incoming-images/photos/Screenshot_2026-02-21-04-51-02-056_com.miui.gallery_181812.jpg` | config/stream-media-catalog.json:9511; config/stream-media-catalog.json:9513 |
| `MIA_ASSET_0890EE9453DE` | `reference_image` | `incoming-images/photos/Screenshot_2026-02-21-04-51-02-056_com.miui.gallery.jpg` | config/stream-media-catalog.json:9498; config/stream-media-catalog.json:9500 |

### `08eeb4e3e1a2…` · 2× · 1242 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_37DACA8D0EBF` | `character_mood` | `mia-output-overlay/assets/kojnozrout/moods/kojnozout-annoyed.png` | mia-output-overlay/koj-gallery.html:217; mia-output-overlay/koj-gallery.html:54 |
| `MIA_ASSET_80D0AD82B1C8` | `character_mood` | `mia-output-overlay/assets/kojnozrout/moods/kojnozout-stressed.png` | mia-output-overlay/koj-gallery.html:229; mia-output-overlay/koj-gallery.html:53 |

### `60a1eef98fe0…` · 2× · 1177 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_CA9F3FDD1ABA` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/koj-robot-idle-alpha.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/ARCHIVE.json:7 |
| `MIA_ASSET_F2B4F1471C14` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/kojnozout-idle.png` | mia-output-overlay/anchors/koj.json:5; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:5 (+10) |

### `fc4c6d05a303…` · 2× · 1164 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_717A1E5CC379` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/cursor-koj-robot-idle-raw.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/ARCHIVE.json:8 |
| `MIA_ASSET_BCF5FB427F1E` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/koj-robot-idle-raw.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/ARCHIVE.json:6; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/ARCHIVE.json:8 (+3) |

### `fd59fcd650ad…` · 3× · 1149 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `KOJ_FORM_YOUTUBE_IDLE` | `character_form` | `mia-output-overlay/assets/kojnozrout/forms/youtube/idle.png` | mia-output-overlay/koj-masters-gallery.html:53 |
| `MIA_ASSET_669369C8C1DC` | `preview` | `mia-output-overlay/assets/kojnozrout/kisstube/koj-kisstube-preview.png` | mia-output-overlay/kisstube-preview.html:38; routes/arena.js:191 (+2) |
| `MIA_ASSET_47A8114D5737` | `reference_image` | `mia-output-overlay/assets/kojnozrout/masters/kisstube-master.png` | scripts/generate_platform_form_anims.js:20 |

### `187ed36532fe…` · 2× · 1102 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_4229E0B028E6` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/koj-robot-happy-alpha.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/ARCHIVE.json:15 |
| `MIA_ASSET_E868018B6183` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/kojnozout-happy.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:11; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:13 (+10) |

### `6e997fa17881…` · 2× · 1084 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_89B0C779813B` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/cursor-koj-robot-happy-raw.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/ARCHIVE.json:16 |
| `MIA_ASSET_3F157660A9F1` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/koj-robot-happy-raw.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/ARCHIVE.json:14; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/ARCHIVE.json:16 (+3) |

### `87a053e930b4…` · 2× · 1000 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `VID_2026-03-05-184341058_1` | `video_clip` | `incoming-images/videos/2026-03-05-184341058 (1).mp4` | config/media-intake-overrides.json:383; config/media-visual-review.json:1432 (+7) |
| `VID_2026-03-05-184341058` | `video_clip` | `incoming-images/videos/2026-03-05-184341058.mp4` | config/media-intake-overrides.json:391; config/media-visual-review.json:1460 (+7) |

### `24fcb2ffe229…` · 2× · 936 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_CA39E60E430E` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v27-purple-tech-dim/kojnozout-happy.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:11; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:13 (+10) |
| `MIA_ASSET_34C9EEB2436A` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v27-purple-tech/kojnozout-happy.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:11; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:13 (+10) |

### `589169357fac…` · 2× · 914 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_6BEB45821A94` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v27-purple-tech-dim/kojnozout-idle.png` | mia-output-overlay/anchors/koj.json:5; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:5 (+10) |
| `MIA_ASSET_676C78240C8F` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v27-purple-tech/kojnozout-idle.png` | mia-output-overlay/anchors/koj.json:5; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:5 (+10) |

### `c9f8772a0963…` · 2× · 899 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_9081392C6481` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v27-purple-tech-dim/kojnozout-warm.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:8; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:9 (+10) |
| `MIA_ASSET_F8E955F7B161` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v27-purple-tech/kojnozout-warm.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:8; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:9 (+10) |

### `7dbd4a9e95e8…` · 3× · 891 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_B9825F41D2B9` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/kojnozout-happy.pre-soft-neon.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/ARCHIVE.json:11; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/ARCHIVE.json:5 (+1) |
| `MIA_ASSET_E1074A293C0C` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/kojnozout-happy.pre-soft-neon.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/ARCHIVE.json:11; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/ARCHIVE.json:5 (+1) |
| `MIA_ASSET_65F12C002FA7` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/pre-backups/kojnozout-happy.pre-soft-neon.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/ARCHIVE.json:11; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/ARCHIVE.json:5 (+1) |

### `b05fff488875…` · 2× · 865 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `VID_VID-20260419-WA0065_205035` | `video_clip` | `incoming-images/videos/VID-20260419-WA0065_205035.mp4` | config/media-intake-overrides.json:1439; config/media-visual-review.json:5303 (+7) |
| `VID_VID-20260419-WA0065` | `video_clip` | `incoming-images/videos/VID-20260419-WA0065.mp4` | config/media-intake-overrides.json:1447; config/media-visual-review.json:5332 (+7) |

### `c384036c8dde…` · 12× · 865 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_C884151DAA6F` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-calm-deep.png` | mia-output-overlay/koj-gallery.html:57 |
| `MIA_ASSET_70FB3BA751A1` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-calm.png` | mia-output-overlay/koj-gallery.html:148 |
| `MIA_ASSET_D6273B8F4F58` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-cozy-blanket.png` | mia-output-overlay/koj-gallery.html:149; mia-output-overlay/koj-gallery.html:58 |
| `MIA_ASSET_021637504256` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-cozy.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/ARCHIVE.json:12; mia-output-overlay/koj-gallery.html:199 |
| `MIA_ASSET_02C25D53A06B` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-curl.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/ARCHIVE.json:10; mia-output-overlay/koj-gallery.html:197 |
| `MIA_ASSET_204371519B95` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-egg-rest.png` | mia-output-overlay/koj-gallery.html:117 |
| `MIA_ASSET_762B68DBBB13` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-idle.png` | mia-output-overlay/anchors/koj.json:5; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:5 (+10) |
| `MIA_ASSET_9368F715AD41` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-rest.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/ARCHIVE.json:9; mia-output-overlay/koj-gallery.html:196 (+1) |
| `MIA_ASSET_3A898B031C38` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-sit.png` | mia-output-overlay/koj-gallery.html:150 |
| `MIA_ASSET_690802F5E46F` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-sleepy.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/ARCHIVE.json:11; mia-output-overlay/koj-gallery.html:195 (+1) |
| `MIA_ASSET_3CA4EEA1ACA2` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-yawn.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/ARCHIVE.json:13; mia-output-overlay/koj-gallery.html:198 |
| `MIA_ASSET_CA511CEFB41D` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai/kojnozout-idle.png` | mia-output-overlay/anchors/koj.json:5; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:5 (+10) |

### `93448472998b…` · 3× · 844 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `VID_VID-20260419-WA0028_1` | `video_clip` | `incoming-images/videos/VID-20260419-WA0028 (1).mp4` | config/media-intake-overrides.json:1303; config/media-visual-review.json:4810 (+7) |
| `VID_VID-20260419-WA0028_211222` | `video_clip` | `incoming-images/videos/VID-20260419-WA0028_211222.mp4` | config/media-intake-overrides.json:1311; config/media-visual-review.json:4839 (+7) |
| `VID_VID-20260419-WA0028` | `video_clip` | `incoming-images/videos/VID-20260419-WA0028.mp4` | config/media-intake-overrides.json:1319; config/media-visual-review.json:4868 (+7) |

### `ab3c3225ef63…` · 2× · 835 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_900A2FD464B8` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-happy.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:11; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:13 (+10) |
| `MIA_ASSET_5FBF7EF5BA3E` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai/kojnozout-happy.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:11; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:13 (+10) |

### `3707f476645f…` · 2× · 828 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_95A4F1384EF9` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-warm.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:8; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:9 (+10) |
| `MIA_ASSET_6F5EDD750C83` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai/kojnozout-warm.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:8; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:9 (+10) |

### `64cbecde12d9…` · 3× · 821 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_6320F26B89FB` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/koj-cyborg-happy-alpha.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:15 |
| `MIA_ASSET_E31E6DD1CC47` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/kojnozout-happy.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:11; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:13 (+10) |
| `MIA_ASSET_05BCC314D2D4` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v26-mint-cyborg/kojnozout-happy.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:11; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:13 (+10) |

### `9461f9338b38…` · 2× · 809 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_8D2DEC0DBD75` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/cursor-koj-robot-warm-raw.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/ARCHIVE.json:12 |
| `MIA_ASSET_B18D9C73054D` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/koj-robot-warm-raw.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/ARCHIVE.json:10; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/ARCHIVE.json:12 (+3) |

### `669078971e15…` · 2× · 808 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_41EF87DEAD8F` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/cursor-koj-cyborg-happy-raw.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:16 |
| `MIA_ASSET_5FD993181D95` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/koj-cyborg-happy-raw.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:14; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:16 (+3) |

### `f79a23695cad…` · 2× · 786 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_431E151252A2` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/koj-robot-warm-alpha.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/ARCHIVE.json:11 |
| `MIA_ASSET_D7D0BD1BF027` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/kojnozout-warm.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:8; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:9 (+10) |

### `d135e3223700…` · 2× · 780 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_93D624426DB7` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/cursor-koj-cyborg-warm-v2-raw.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:17; scripts/kojnozrout_archive_art_sets.js:126 (+1) |
| `MIA_ASSET_EE61A55EEE17` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/koj-cyborg-warm-raw.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:10; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:12 (+3) |

### `57b13e415b46…` · 2× · 776 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_13D456893E91` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/cursor-koj-cyborg-idle-raw.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:8 |
| `MIA_ASSET_F6A339DDD2A0` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/koj-cyborg-idle-raw.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:6; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:8 (+3) |

### `6417571e0d9f…` · 3× · 773 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_8A4629C589B7` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/koj-cyborg-idle-alpha.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:7 |
| `MIA_ASSET_04D69BD617BE` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/kojnozout-idle.png` | mia-output-overlay/anchors/koj.json:5; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:5 (+10) |
| `MIA_ASSET_A790C6039DA4` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v26-mint-cyborg/kojnozout-idle.png` | mia-output-overlay/anchors/koj.json:5; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:5 (+10) |

### `ff66550add4b…` · 3× · 768 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_F049FBB912F4` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/koj-cyborg-warm-alpha.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:11 |
| `MIA_ASSET_70CCCFA83ED7` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/kojnozout-warm.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:8; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:9 (+10) |
| `MIA_ASSET_EE0DAF84BBF0` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v26-mint-cyborg/kojnozout-warm.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:8; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:9 (+10) |

### `c25d05bb0251…` · 3× · 766 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_2B140580DAA1` | `video_clip` | `incoming-images/videos_2/VID-20260419-WA0095.mp4` | config/media-intake-overrides.json:111; config/media-intake-overrides.json:1495 (+10) |
| `VID_VID-20260419-WA0095_211904` | `video_clip` | `incoming-images/videos/VID-20260419-WA0095_211904.mp4` | config/media-intake-overrides.json:1487; config/media-visual-review.json:5477 (+7) |
| `VID_VID-20260419-WA0095` | `video_clip` | `incoming-images/videos/VID-20260419-WA0095.mp4` | config/media-intake-overrides.json:111; config/media-intake-overrides.json:1495 (+10) |

### `1a848dac2ffc…` · 6× · 735 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_360C8D33D81E` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/kojnozout-cozy.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/ARCHIVE.json:12; mia-output-overlay/koj-gallery.html:199 |
| `MIA_ASSET_5C3FB35E5A0A` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/kojnozout-curl.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/ARCHIVE.json:10; mia-output-overlay/koj-gallery.html:197 |
| `MIA_ASSET_84F9827C5BDF` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/kojnozout-idle.png` | mia-output-overlay/anchors/koj.json:5; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:5 (+10) |
| `MIA_ASSET_CC8CFC2B7725` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/kojnozout-rest.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/ARCHIVE.json:9; mia-output-overlay/koj-gallery.html:196 (+1) |
| `MIA_ASSET_74D0BD689ABB` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/kojnozout-sleepy.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/ARCHIVE.json:11; mia-output-overlay/koj-gallery.html:195 (+1) |
| `MIA_ASSET_7B3DBB553288` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/kojnozout-yawn.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/ARCHIVE.json:13; mia-output-overlay/koj-gallery.html:198 |

### `a3baa01c10d0…` · 2× · 732 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_67DE23B9B81C` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/kojnozout-happy.pre-soft-neon-v17.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:12 |
| `MIA_ASSET_4B8121AACD76` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/pre-backups/kojnozout-happy.pre-soft-neon-v17.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:12 |

### `77cba589a3f4…` · 3× · 713 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_3018194BC72E` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/kojnozout-idle.pre-soft-neon.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/ARCHIVE.json:7; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/ARCHIVE.json:9 (+2) |
| `MIA_ASSET_479429249DE6` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/kojnozout-idle.pre-soft-neon.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/ARCHIVE.json:7; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/ARCHIVE.json:9 (+2) |
| `MIA_ASSET_5C45C7076A53` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/pre-backups/kojnozout-idle.pre-soft-neon.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/ARCHIVE.json:7; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/ARCHIVE.json:9 (+2) |

### `7c3b809a4a22…` · 3× · 695 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_AAD66A00CE31` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/kojnozout-warm.pre-soft-neon.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/ARCHIVE.json:10; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/ARCHIVE.json:8 (+1) |
| `MIA_ASSET_B77E896BA14E` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/kojnozout-warm.pre-soft-neon.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/ARCHIVE.json:10; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/ARCHIVE.json:8 (+1) |
| `MIA_ASSET_A1129BFA4CA6` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/pre-backups/kojnozout-warm.pre-soft-neon.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/ARCHIVE.json:10; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/ARCHIVE.json:8 (+1) |

### `b935aca49a82…` · 2× · 680 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_9EA43A9DC5E7` | `character_form` | `mia-output-overlay/assets/animation-bank/gift/perfume/frames/0001.png` | shared/mia-animation-engine/promoteAiAnimation.js:338 |
| `MIA_ASSET_9D6208044BCC` | `character_form` | `mia-output-overlay/assets/animation-bank/idle/idle_002/frames/0001.png` | shared/mia-animation-engine/promoteAiAnimation.js:338 |

### `18efeeec8720…` · 2× · 668 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_3401B33F4394` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/cursor-koj-soft-neon-happy-raw.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:15; scripts/kojnozrout_archive_art_sets.js:159 (+1) |
| `MIA_ASSET_954D235667F1` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/koj-soft-neon-happy-raw.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:15; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:18 (+8) |

### `c46c2bdcf8b5…` · 3× · 657 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_104BCAF5081C` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/kojnozout-idle-f2.pre-soft-neon.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/ARCHIVE.json:6 |
| `MIA_ASSET_40824B51E180` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/pre-backups/kojnozout-idle-f2.pre-soft-neon.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/ARCHIVE.json:6 |
| `MIA_ASSET_AD8FFCB41AB1` | `character_form` | `mia-output-overlay/assets/animation-bank/idle/idle_001/frames/0001.png` | shared/mia-animation-engine/promoteAiAnimation.js:338 |

### `87242f6a1e1a…` · 2× · 653 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_BB22469627F4` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/cursor-koj-soft-neon-idle-raw.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:14; scripts/kojnozrout_archive_art_sets.js:155 (+1) |
| `MIA_ASSET_D9D486FFAE62` | `reference_image` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/koj-soft-neon-idle-raw.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:14; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:17 (+8) |

### `9d7c4f293ab3…` · 2× · 652 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_CC28241A4E24` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/kojnozout-idle.png` | mia-output-overlay/anchors/koj.json:5; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:5 (+10) |
| `MIA_ASSET_F2EECEBD028E` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/kojnozout-warm.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:8; mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/ARCHIVE.json:9 (+10) |

### `bcb61754f770…` · 2× · 580 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_B9824160B615` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/kojnozout-idle.pre-soft-neon-v17.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:6 |
| `MIA_ASSET_8BF1932E95E1` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/pre-backups/kojnozout-idle.pre-soft-neon-v17.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:6 |

### `0dfc2522f8ab…` · 2× · 558 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_7C465E2F777A` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/kojnozout-warm.pre-soft-neon-v17.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:9 |
| `MIA_ASSET_C4944494925C` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/pre-backups/kojnozout-warm.pre-soft-neon-v17.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/ARCHIVE.json:9 |

### `99734eb8f3ff…` · 2× · 501 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_37259208E87B` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-comfort.png` | mia-output-overlay/koj-gallery.html:205; mia-output-overlay/koj-gallery.html:211 |
| `MIA_ASSET_8A5E5D51A6A9` | `character_mood` | `mia-output-overlay/assets/kojnozrout/moods/kojnozout-comfort.png` | mia-output-overlay/koj-gallery.html:205; mia-output-overlay/koj-gallery.html:211 |

### `7abdd53bd8e6…` · 2× · 466 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_9D11F2E40E18` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-duel-lose.png` | mia-output-overlay/koj-gallery.html:87 |
| `MIA_ASSET_95FAC260C44B` | `character_mood` | `mia-output-overlay/assets/kojnozrout/moods/kojnozout-duel-lose.png` | mia-output-overlay/koj-gallery.html:87 |

### `ba818afed8d1…` · 2× · 463 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_5281A8A4FC67` | `video_clip` | `incoming-images/videos_2/VID-20260318-WA0328.mp4` | config/media-intake-overrides.json:1119; config/media-intake-overrides.json:87 (+10) |
| `VID_VID-20260318-WA0328` | `video_clip` | `incoming-images/videos/VID-20260318-WA0328.mp4` | config/media-intake-overrides.json:1119; config/media-intake-overrides.json:87 (+10) |

### `560d1b3be933…` · 2× · 432 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_F6A56C18D1AD` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-neglect-droop.png` | mia-output-overlay/koj-gallery.html:210 |
| `MIA_ASSET_8C332D3F7EBC` | `character_mood` | `mia-output-overlay/assets/kojnozrout/moods/kojnozout-neglect-droop.png` | mia-output-overlay/koj-gallery.html:210 |

### `dc3b71d5f127…` · 2× · 403 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_A801710CFD5B` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-curl.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/ARCHIVE.json:10; mia-output-overlay/koj-gallery.html:197 |
| `MIA_ASSET_CAFB19BE8681` | `character_mood` | `mia-output-overlay/assets/kojnozrout/moods/kojnozout-curl.png` | mia-output-overlay/koj-gallery.html:197 |

### `6c222027df3b…` · 2× · 397 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_C15490E6F190` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-calm-deep.png` | mia-output-overlay/koj-gallery.html:57 |
| `MIA_ASSET_8DB9BB2A0170` | `character_mood` | `mia-output-overlay/assets/kojnozrout/moods/kojnozout-calm-deep.png` | mia-output-overlay/koj-gallery.html:57 |

### `0d8b7575d40e…` · 2× · 396 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_9A2EC3E41482` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-cozy.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/ARCHIVE.json:12; mia-output-overlay/koj-gallery.html:199 |
| `MIA_ASSET_3CC8340DA69D` | `character_mood` | `mia-output-overlay/assets/kojnozrout/moods/kojnozout-cozy.png` | mia-output-overlay/koj-gallery.html:199 |

### `2b486657ae7d…` · 2× · 392 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_EB0AB92558F4` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-yawn.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/ARCHIVE.json:13; mia-output-overlay/koj-gallery.html:198 |
| `MIA_ASSET_3EE8A8D22BEB` | `character_mood` | `mia-output-overlay/assets/kojnozrout/moods/kojnozout-yawn.png` | mia-output-overlay/koj-gallery.html:198 |

### `c73340b7665d…` · 2× · 376 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_58B35B769BEB` | `character_mood` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-rest.png` | mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/ARCHIVE.json:9; mia-output-overlay/koj-gallery.html:196 (+1) |
| `MIA_ASSET_52A48790879A` | `character_mood` | `mia-output-overlay/assets/kojnozrout/moods/kojnozout-rest.png` | mia-output-overlay/koj-gallery.html:196; mia-output-overlay/koj-robot-projector-proof.html:37 |

### `41e8dfa779de…` · 2× · 200 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_F420EAF7CB67` | `video_clip` | `incoming-images/photos/IMG-20251222-WA0017_181044.jpg` | config/stream-media-catalog.json:139; config/stream-media-catalog.json:5893 (+1) |
| `MIA_ASSET_CDA8A4DE5857` | `video_clip` | `incoming-images/photos/IMG-20251222-WA0017.jpg` | config/stream-media-catalog.json:133; config/stream-media-catalog.json:5880 (+1) |

### `bdf44d4af362…` · 2× · 62 KB

| Registry ID | Role | Path | Runtime refs |
|-------------|------|------|--------------|
| `MIA_ASSET_E0C30F9BC36E` | `video_clip` | `incoming-images/photos/IMG-20260214-WA0086 (1).jpg` | config/stream-media-catalog.json:6127; config/stream-media-catalog.json:6129 |
| `MIA_ASSET_8E99D3FD7660` | `video_clip` | `incoming-images/photos/IMG-20260214-WA0086.jpg` | config/stream-media-catalog.json:6140; config/stream-media-catalog.json:6142 |

## Unresolved refs (held — freeze)

4 konkrétní MISSING z 03B — **neopravovat** během asset passu. Viz `docs/ASSET_PASS_03B_REGISTRY_SEED.md`.

## Další krok

**Dedup safety pass** — až s role metadata: rozlišit záměrné duplicity (preview vs form) od skutečného bordelu.
