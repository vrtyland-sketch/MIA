# ASSET PASS 03B — REGISTRY SEED

**Režim:** READ/WRITE pouze `content-pass/ASSET_REGISTRY.json` + docs · paths beze změny.
**Generováno:** `node scripts/seed_asset_registry.js`

## Souhrn

| Metrika | Hodnota |
|---------|---------|
| **Registry entries** | **1091** |
| ACTIVE pokrytí (branch B + runtime ref) | **100%** (1091/1091) |
| Baseline inventura 01 (ACTIVE primary) | 819 — seed zachytí víc díky basename corpus match |
| Vyloučeno (cache) | `generated/eyes`, `audio-cache`, `gift-animations/*` |
| Unresolved paths (konkrétní) | **4** |
| Unresolved paths (template) | 35 |
| Duplicate-content groups (MD5) | **103** |
| Missing metadata | **496** |

### Branch breakdown

- `overlay`: 756
- `video`: 335

## Retention policy (schváleno, neimplementováno)

**RETENTION POLICY = APPROVED AS DESIGNED** (viz `docs/ASSET_PASS_03A_RETENTION_DESIGN.md`). RET-01…RET-05 = post-freeze backlog.

## Duplicate-content groups (top 15 by size)

- **3×** 37.6 MB — `incoming-images/videos/VID-20260504-WA0001.mp4`
  - dup: `incoming-images/videos/VID-20260504-WA0001_211904.mp4` (VID_VID-20260504-WA0001_211904)
  - dup: `incoming-images/videos_2/VID-20260504-WA0001.mp4` (MIA_ASSET_87511EBFCAF5)
- **5×** 37.0 MB — `incoming-images/videos/lv_0_20260305202118 (1).mp4`
  - dup: `incoming-images/videos/lv_0_20260305202118 (2).mp4` (VID_LV_0_20260305202118_2)
  - dup: `incoming-images/videos/lv_0_20260305202118 (3).mp4` (VID_LV_0_20260305202118_3)
  - dup: `incoming-images/videos/lv_0_20260305202118.mp4` (VID_LV_0_20260305202118)
  - … +1 další
- **2×** 33.4 MB — `incoming-images/videos/VID-20260419-WA0070.mp4`
  - dup: `incoming-images/videos_2/VID-20260419-WA0070.mp4` (MIA_ASSET_58E3114F1D1E)
- **2×** 33.1 MB — `incoming-images/videos/2026-02-01-161429084.mp4`
  - dup: `incoming-images/videos/2026-02-01-161429084_175814.mp4` (VID_2026-02-01-161429084_175814)
- **2×** 30.8 MB — `incoming-images/videos/lv_0_20260307180457.mp4`
  - dup: `incoming-images/videos/lv_0_20260307180457_211118.mp4` (VID_LV_0_20260307180457_211118)
- **2×** 24.9 MB — `incoming-images/videos/lv_0_20260309100507 (1).mp4`
  - dup: `incoming-images/videos/lv_0_20260309100507.mp4` (VID_LV_0_20260309100507)
- **2×** 24.3 MB — `incoming-images/videos/VID-20260319-WA0001.mp4`
  - dup: `incoming-images/videos/VID-20260319-WA0001_211251.mp4` (VID_VID-20260319-WA0001_211251)
- **2×** 22.2 MB — `incoming-images/videos/lv_7505688003600190773_20260130144313 (1).mp4`
  - dup: `incoming-images/videos/lv_7505688003600190773_20260130144313.mp4` (VID_LV_7505688003600190773_20260130144313)
- **2×** 21.0 MB — `incoming-images/videos/lv_7412252754967547152_20260130143639 (1).mp4`
  - dup: `incoming-images/videos/lv_7412252754967547152_20260130143639.mp4` (VID_LV_7412252754967547152_20260130143639)
- **2×** 13.2 MB — `incoming-images/videos/lv_0_20260129173032 (1).mp4`
  - dup: `incoming-images/videos/lv_0_20260129173032.mp4` (VID_LV_0_20260129173032)
- **3×** 11.0 MB — `incoming-images/videos/VID-20260318-WA0333.mp4`
  - dup: `incoming-images/videos/VID-20260318-WA0333_211904.mp4` (VID_VID-20260318-WA0333_211904)
  - dup: `incoming-images/videos_2/VID-20260318-WA0333.mp4` (MIA_ASSET_12AC1BC6979A)
- **3×** 10.2 MB — `incoming-images/videos/2026-02-17-121129193.mp4`
  - dup: `incoming-images/videos/2026-02-17-121129193_180745.mp4` (VID_2026-02-17-121129193_180745)
  - dup: `incoming-images/videos/2026-02-17-121129193_181050.mp4` (VID_2026-02-17-121129193_181050)
- **2×** 4.5 MB — `incoming-images/videos/lv_0_20260131151957.mp4`
  - dup: `incoming-images/videos/lv_0_20260131151957_175058.mp4` (VID_LV_0_20260131151957_175058)
- **2×** 4.4 MB — `incoming-images/videos/2026-01-31-202404755.mp4`
  - dup: `incoming-images/videos/2026-01-31-202404755_175510.mp4` (VID_2026-01-31-202404755_175510)
- **2×** 2.9 MB — `incoming-images/videos/lv_7351466693492837650_20260302151200.mp4`
  - dup: `incoming-images/videos/lv_7351466693492837650_20260302151200_183032.mp4` (VID_LV_7351466693492837650_20260302151200_183032)

## Unresolved paths (konkrétní, ne-template)

| Code path | Missing asset |
|-----------|---------------|
| `scripts/generate_away_loop_video.js:6` | `incoming-images/videos/away/nejsem_tu_loop.mp4` |
| `scripts/MIA_OBS_AWAY_LOOP.js:19` | `incoming-images/videos/away/nejsem_tu_loop.mp4` |
| `shared/host_mode_config.json:16` | `incoming-images/videos/away/nejsem_tu_loop.mp4` |
| `mia-output-overlay/viewer-strip-overlay.html:179` | `/assets/kojnozrout/viewers/default-follower.png` |

## Missing metadata (vzorek)

- `MIA_ASSET_9A64C4E73BF6` · `incoming-images/photos/1769702481503.gif` · chybí `role`
- `MIA_ASSET_9E98B79494AF` · `incoming-images/photos/1769702507201.gif` · chybí `role`
- `MIA_ASSET_62DDC90C2161` · `incoming-images/photos/1769702690394.gif` · chybí `role`
- `MIA_ASSET_ED5514D3BF7C` · `incoming-images/photos/file_0000000006f87243a46756084d9f0b9f.png` · chybí `role`
- `MIA_ASSET_FC20CCD5063D` · `incoming-images/photos/file_00000000155c720a93a3e5cb376e7669.png` · chybí `role`
- `MIA_ASSET_B477F11BEE71` · `incoming-images/photos/file_00000000218071f48094678d69dd6f34.png` · chybí `role`
- `MIA_ASSET_CC546D410E96` · `incoming-images/photos/file_000000002404720ab700ba57ec52dc9d.png` · chybí `role`
- `MIA_ASSET_0C6B65E7D751` · `incoming-images/photos/file_00000000282c71f4abebf73d9b875340.png` · chybí `role`
- `MIA_ASSET_14ACA91DBA4B` · `incoming-images/photos/file_000000003dac720ab467d873ab10b2e2.png` · chybí `role`
- `MIA_ASSET_EA21308EBDE6` · `incoming-images/photos/file_0000000042ac71f4b94b58016ea65c39~3.jpg` · chybí `role`
- `MIA_ASSET_EA21308EBDE6` · `incoming-images/photos/file_0000000042ac71f4b94b58016ea65c39~3.jpg` · chybí `dimensions`
- `MIA_ASSET_A7E63829B7F6` · `incoming-images/photos/file_000000004e4471f4b1d0d05c74c67a0d.png` · chybí `role`
- `MIA_ASSET_2BA0D65F8520` · `incoming-images/photos/file_000000006c2871f48cbe3bc373a70b4d.png` · chybí `role`
- `MIA_ASSET_C7AA1E749C48` · `incoming-images/photos/file_000000007e4471f48d3ec5455a20cdc7.png` · chybí `role`
- `MIA_ASSET_A2A9F37F7EE7` · `incoming-images/photos/file_000000007e5071f4a9b0eb1a158e7b5f.png` · chybí `role`
- `MIA_ASSET_63B50BFFBB20` · `incoming-images/photos/file_000000008d7471f488a816197404d070~3.jpg` · chybí `role`
- `MIA_ASSET_63B50BFFBB20` · `incoming-images/photos/file_000000008d7471f488a816197404d070~3.jpg` · chybí `dimensions`
- `MIA_ASSET_65F37000B12E` · `incoming-images/photos/file_00000000abd471f4b8e4c844b214ee48.png` · chybí `role`
- `MIA_ASSET_AB609801A70C` · `incoming-images/photos/file_00000000b94c72468208a4b421bac9ff.png` · chybí `role`
- `MIA_ASSET_9652132343CD` · `incoming-images/photos/file_00000000c61c720abb5470df6be42522.png` · chybí `role`
- `MIA_ASSET_7433FB51C3A5` · `incoming-images/photos/file_00000000d8f471f497cca69369a8b659.png` · chybí `role`
- `MIA_ASSET_EDC3C31004D2` · `incoming-images/photos/file_00000000d8fc72439e9f1bbe7bcf449d.png` · chybí `role`
- `MIA_ASSET_CDA8A4DE5857` · `incoming-images/photos/IMG-20251222-WA0017.jpg` · chybí `role`
- `MIA_ASSET_CDA8A4DE5857` · `incoming-images/photos/IMG-20251222-WA0017.jpg` · chybí `dimensions`
- `MIA_ASSET_F420EAF7CB67` · `incoming-images/photos/IMG-20251222-WA0017_181044.jpg` · chybí `role`
- … +471 dalších

## Mapa

Poprvé v jednom místě: **filesystem path** + **registry ID** + **runtimeRefs** (code path:line).
Další krok: asset cleanup s referencí na registry, ne na raw paths.
