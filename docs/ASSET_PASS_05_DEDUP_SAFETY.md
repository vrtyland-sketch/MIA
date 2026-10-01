# ASSET PASS 05 — DEDUP SAFETY ANALYSIS

**Režim:** analysis only · žádné mazání/přesuny/přejmenování.
**Generováno:** `node scripts/analyze_dedup_safety.js`

## Souhrn

| Metrika | Hodnota |
|---------|---------|
| Duplicate groups celkem | **103** |
| **SAFE_DEDUP** | **25** |
| **KEEP_SEPARATE** | **29** |
| **REVIEW** | **48** |
| **BLOCKED** | **1** |
| Souborů odstranitelných (SAFE) | **31** |
| **Úspora (SAFE only)** | **61.6 MB** |
| REVIEW `video_clip` potenciál (po sjednocení catalog refs) | ~488 MB · 23 skupin |

### Verdikty

- **SAFE_DEDUP** — stejný hash + role; bez konfliktu path-specific runtime refs
- **KEEP_SEPARATE** — stejný obsah, jiná role / jiný význam
- **REVIEW** — různé runtime ref kontexty nebo nejasný owner
- **BLOCKED** — unresolved/manual-hold/missing

## Top 20 SAFE_DEDUP kandidátů (by bytes saved)

| BYTES_SAVED | CANONICAL_ID | CANONICAL_PATH | DUP count |
|-------------|--------------|----------------|-----------|
| 33.4 MB | `VID_VID-20260419-WA0070` | `incoming-images/videos/VID-20260419-WA0070.mp4` | 1 |
| 3.3 MB | `MIA_ASSET_606F73678511` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-full.png` | 2 |
| 2.9 MB | `MIA_ASSET_03B3A5A92A6E` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-excited.png` | 2 |
| 2.8 MB | `MIA_ASSET_F4FEB9000178` | `mia-output-overlay/assets/kojnozrout/moods/kojnozout-sad.png` | 2 |
| 1.7 MB | `MIA_ASSET_65F12C002FA7` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/pre-backups/kojnozout-happy.pre-soft-neon.png` | 2 |
| 1.7 MB | `MIA_ASSET_230E0EA7E557` | `mia-output-overlay/assets/mia/cyber/speak.png` | 1 |
| 1.4 MB | `MIA_ASSET_5C45C7076A53` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/pre-backups/kojnozout-idle.pre-soft-neon.png` | 2 |
| 1.4 MB | `MIA_ASSET_44D19647E2D6` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-eating.png` | 1 |
| 1.4 MB | `MIA_ASSET_CDFC131742FF` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-sick.png` | 1 |
| 1.4 MB | `MIA_ASSET_A1129BFA4CA6` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/pre-backups/kojnozout-warm.pre-soft-neon.png` | 2 |
| 1.3 MB | `MIA_ASSET_8D857C1F5048` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-warm.png` | 1 |
| 936.0 KB | `MIA_ASSET_34C9EEB2436A` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v27-purple-tech/kojnozout-happy.png` | 1 |
| 913.8 KB | `MIA_ASSET_676C78240C8F` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v27-purple-tech/kojnozout-idle.png` | 1 |
| 899.3 KB | `MIA_ASSET_F8E955F7B161` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v27-purple-tech/kojnozout-warm.png` | 1 |
| 834.5 KB | `MIA_ASSET_5FBF7EF5BA3E` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai/kojnozout-happy.png` | 1 |
| 828.3 KB | `MIA_ASSET_6F5EDD750C83` | `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai/kojnozout-warm.png` | 1 |
| 731.7 KB | `MIA_ASSET_4B8121AACD76` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/pre-backups/kojnozout-happy.pre-soft-neon-v17.png` | 1 |
| 679.5 KB | `MIA_ASSET_9EA43A9DC5E7` | `mia-output-overlay/assets/animation-bank/gift/perfume/frames/0001.png` | 1 |
| 580.0 KB | `MIA_ASSET_8BF1932E95E1` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/pre-backups/kojnozout-idle.pre-soft-neon-v17.png` | 1 |
| 558.3 KB | `MIA_ASSET_C4944494925C` | `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/pre-backups/kojnozout-warm.pre-soft-neon-v17.png` | 1 |

## SAFE_DEDUP detail

### `103afa3d5074…` · 33.4 MB saved · `video_clip`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `VID_VID-20260419-WA0070` → `incoming-images/videos/VID-20260419-WA0070.mp4`
- **DUPLICATE_IDS:** `MIA_ASSET_58E3114F1D1E`
- **DUPLICATE_PATHS:**
  - `incoming-images/videos_2/VID-20260419-WA0070.mp4`

### `46cd475b5082…` · 3.3 MB saved · `character_mood`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_606F73678511` → `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-full.png`
- **DUPLICATE_IDS:** `MIA_ASSET_71F537017C66`, `MIA_ASSET_CD39AAF740C6`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-16T18-08-53-355Z/kojnozout-full.png`
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-full.png`

### `e9a5d391074d…` · 2.9 MB saved · `character_mood`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_03B3A5A92A6E` → `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-excited.png`
- **DUPLICATE_IDS:** `MIA_ASSET_483D84E07289`, `MIA_ASSET_57C6B4E9F773`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-16T18-08-53-355Z/kojnozout-excited.png`
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-excited.png`

### `7a301dad798a…` · 2.8 MB saved · `character_mood`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_F4FEB9000178` → `mia-output-overlay/assets/kojnozrout/moods/kojnozout-sad.png`
- **DUPLICATE_IDS:** `MIA_ASSET_AB321A4E7988`, `MIA_ASSET_971474BF8822`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-sad.png`
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-sad.png`

### `7dbd4a9e95e8…` · 1.7 MB saved · `character_mood`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_65F12C002FA7` → `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/pre-backups/kojnozout-happy.pre-soft-neon.png`
- **DUPLICATE_IDS:** `MIA_ASSET_B9825F41D2B9`, `MIA_ASSET_E1074A293C0C`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/kojnozout-happy.pre-soft-neon.png`
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/kojnozout-happy.pre-soft-neon.png`

### `dc4a0daaa7c2…` · 1.7 MB saved · `overlay_ui`

- **Důvod:** single path-specific runtime owner; same role
- **CANONICAL:** `MIA_ASSET_230E0EA7E557` → `mia-output-overlay/assets/mia/cyber/speak.png`
- **DUPLICATE_IDS:** `MIA_ASSET_6E55C7ED1C9C`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/mia/cyber/lip/02.png`

### `77cba589a3f4…` · 1.4 MB saved · `character_mood`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_5C45C7076A53` → `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/pre-backups/kojnozout-idle.pre-soft-neon.png`
- **DUPLICATE_IDS:** `MIA_ASSET_3018194BC72E`, `MIA_ASSET_479429249DE6`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/kojnozout-idle.pre-soft-neon.png`
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/kojnozout-idle.pre-soft-neon.png`

### `85be7dafc59e…` · 1.4 MB saved · `character_mood`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_44D19647E2D6` → `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-eating.png`
- **DUPLICATE_IDS:** `MIA_ASSET_E13212DE2F34`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-eating.png`

### `21d325ff3956…` · 1.4 MB saved · `character_mood`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_CDFC131742FF` → `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-sick.png`
- **DUPLICATE_IDS:** `MIA_ASSET_5B8D2542FE1A`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-sick.png`

### `7c3b809a4a22…` · 1.4 MB saved · `character_mood`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_A1129BFA4CA6` → `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/pre-backups/kojnozout-warm.pre-soft-neon.png`
- **DUPLICATE_IDS:** `MIA_ASSET_AAD66A00CE31`, `MIA_ASSET_B77E896BA14E`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/kojnozout-warm.pre-soft-neon.png`
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/kojnozout-warm.pre-soft-neon.png`

### `09951fba4186…` · 1.3 MB saved · `character_mood`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_8D857C1F5048` → `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-warm.png`
- **DUPLICATE_IDS:** `MIA_ASSET_BFA7FC6CFC4B`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-warm.png`

### `24fcb2ffe229…` · 936.0 KB saved · `character_mood`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_34C9EEB2436A` → `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v27-purple-tech/kojnozout-happy.png`
- **DUPLICATE_IDS:** `MIA_ASSET_CA39E60E430E`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v27-purple-tech-dim/kojnozout-happy.png`

### `589169357fac…` · 913.8 KB saved · `character_mood`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_676C78240C8F` → `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v27-purple-tech/kojnozout-idle.png`
- **DUPLICATE_IDS:** `MIA_ASSET_6BEB45821A94`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v27-purple-tech-dim/kojnozout-idle.png`

### `c9f8772a0963…` · 899.3 KB saved · `character_mood`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_F8E955F7B161` → `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v27-purple-tech/kojnozout-warm.png`
- **DUPLICATE_IDS:** `MIA_ASSET_9081392C6481`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v27-purple-tech-dim/kojnozout-warm.png`

### `ab3c3225ef63…` · 834.5 KB saved · `character_mood`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_5FBF7EF5BA3E` → `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai/kojnozout-happy.png`
- **DUPLICATE_IDS:** `MIA_ASSET_900A2FD464B8`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-happy.png`

### `3707f476645f…` · 828.3 KB saved · `character_mood`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_6F5EDD750C83` → `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai/kojnozout-warm.png`
- **DUPLICATE_IDS:** `MIA_ASSET_95A4F1384EF9`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-warm.png`

### `a3baa01c10d0…` · 731.7 KB saved · `character_mood`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_4B8121AACD76` → `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/pre-backups/kojnozout-happy.pre-soft-neon-v17.png`
- **DUPLICATE_IDS:** `MIA_ASSET_67DE23B9B81C`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/kojnozout-happy.pre-soft-neon-v17.png`

### `b935aca49a82…` · 679.5 KB saved · `character_form`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_9EA43A9DC5E7` → `mia-output-overlay/assets/animation-bank/gift/perfume/frames/0001.png`
- **DUPLICATE_IDS:** `MIA_ASSET_9D6208044BCC`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/animation-bank/idle/idle_002/frames/0001.png`

### `bcb61754f770…` · 580.0 KB saved · `character_mood`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_8BF1932E95E1` → `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/pre-backups/kojnozout-idle.pre-soft-neon-v17.png`
- **DUPLICATE_IDS:** `MIA_ASSET_B9824160B615`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/kojnozout-idle.pre-soft-neon-v17.png`

### `0dfc2522f8ab…` · 558.3 KB saved · `character_mood`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_C4944494925C` → `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/pre-backups/kojnozout-warm.pre-soft-neon-v17.png`
- **DUPLICATE_IDS:** `MIA_ASSET_7C465E2F777A`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/kojnozout-warm.pre-soft-neon-v17.png`

### `99734eb8f3ff…` · 501.0 KB saved · `character_mood`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_8A5E5D51A6A9` → `mia-output-overlay/assets/kojnozrout/moods/kojnozout-comfort.png`
- **DUPLICATE_IDS:** `MIA_ASSET_37259208E87B`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-comfort.png`

### `7abdd53bd8e6…` · 466.3 KB saved · `character_mood`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_95FAC260C44B` → `mia-output-overlay/assets/kojnozrout/moods/kojnozout-duel-lose.png`
- **DUPLICATE_IDS:** `MIA_ASSET_9D11F2E40E18`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-duel-lose.png`

### `ba818afed8d1…` · 462.8 KB saved · `video_clip`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `VID_VID-20260318-WA0328` → `incoming-images/videos/VID-20260318-WA0328.mp4`
- **DUPLICATE_IDS:** `MIA_ASSET_5281A8A4FC67`
- **DUPLICATE_PATHS:**
  - `incoming-images/videos_2/VID-20260318-WA0328.mp4`

### `560d1b3be933…` · 432.1 KB saved · `character_mood`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_8C332D3F7EBC` → `mia-output-overlay/assets/kojnozrout/moods/kojnozout-neglect-droop.png`
- **DUPLICATE_IDS:** `MIA_ASSET_F6A56C18D1AD`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-neglect-droop.png`

### `6c222027df3b…` · 397.2 KB saved · `character_mood`

- **Důvod:** identical runtimeRefs; same role
- **CANONICAL:** `MIA_ASSET_8DB9BB2A0170` → `mia-output-overlay/assets/kojnozrout/moods/kojnozout-calm-deep.png`
- **DUPLICATE_IDS:** `MIA_ASSET_C15490E6F190`
- **DUPLICATE_PATHS:**
  - `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-calm-deep.png`

## KEEP_SEPARATE

- `e45e07ac3564…` (2×) — roles differ: gift_visual, video_clip
  - `gift_visual` `incoming-images/gift-map-screenshots/Screenshot_20260413-190502_TikTok.png`
  - `video_clip` `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190502_TikTok.png`
- `ad022bbba481…` (2×) — roles differ: gift_visual, video_clip
  - `gift_visual` `incoming-images/gift-map-screenshots/Screenshot_20260413-190508_TikTok.png`
  - `video_clip` `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190508_TikTok.png`
- `f464d1cf8d9f…` (2×) — roles differ: gift_visual, video_clip
  - `gift_visual` `incoming-images/gift-map-screenshots/Screenshot_20260413-190516_TikTok.png`
  - `video_clip` `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190516_TikTok.png`
- `3d9ffbf438b2…` (2×) — roles differ: gift_visual, video_clip
  - `gift_visual` `incoming-images/gift-map-screenshots/Screenshot_20260413-190520_TikTok.png`
  - `video_clip` `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190520_TikTok.png`
- `97d92f34e57d…` (2×) — roles differ: gift_visual, video_clip
  - `gift_visual` `incoming-images/gift-map-screenshots/Screenshot_20260413-190526_TikTok.png`
  - `video_clip` `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190526_TikTok.png`
- `0463b9f2462c…` (2×) — roles differ: gift_visual, video_clip
  - `gift_visual` `incoming-images/gift-map-screenshots/Screenshot_20260413-190533_TikTok.png`
  - `video_clip` `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190533_TikTok.png`
- `00c87c743792…` (2×) — roles differ: gift_visual, video_clip
  - `gift_visual` `incoming-images/gift-map-screenshots/Screenshot_20260413-190538_TikTok.png`
  - `video_clip` `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190538_TikTok.png`
- `bf1035d9ea58…` (2×) — roles differ: gift_visual, video_clip
  - `gift_visual` `incoming-images/gift-map-screenshots/Screenshot_20260413-190543_TikTok.png`
  - `video_clip` `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190543_TikTok.png`
- `b3e7fdcec191…` (2×) — roles differ: gift_visual, video_clip
  - `gift_visual` `incoming-images/gift-map-screenshots/Screenshot_20260413-190547_TikTok.png`
  - `video_clip` `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190547_TikTok.png`
- `d701d5e4b69b…` (2×) — roles differ: gift_visual, video_clip
  - `gift_visual` `incoming-images/gift-map-screenshots/Screenshot_20260413-190552_TikTok.png`
  - `video_clip` `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190552_TikTok.png`
- `af8601e8c294…` (2×) — roles differ: gift_visual, video_clip
  - `gift_visual` `incoming-images/gift-map-screenshots/Screenshot_20260413-190557_TikTok.png`
  - `video_clip` `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190557_TikTok.png`
- `475762c4fe51…` (2×) — roles differ: gift_visual, video_clip
  - `gift_visual` `incoming-images/gift-map-screenshots/Screenshot_20260413-190603_TikTok.png`
  - `video_clip` `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190603_TikTok.png`
- `63e59131fb43…` (2×) — roles differ: gift_visual, video_clip
  - `gift_visual` `incoming-images/gift-map-screenshots/Screenshot_20260413-190611_TikTok.png`
  - `video_clip` `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190611_TikTok.png`
- `557a90bce217…` (2×) — roles differ: gift_visual, video_clip
  - `gift_visual` `incoming-images/gift-map-screenshots/Screenshot_20260413-190616_TikTok.png`
  - `video_clip` `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190616_TikTok.png`
- `6928c64862a0…` (2×) — roles differ: gift_visual, video_clip
  - `gift_visual` `incoming-images/gift-map-screenshots/Screenshot_20260413-190621_TikTok.png`
  - `video_clip` `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190621_TikTok.png`
- `ae9da6e9c828…` (2×) — roles differ: gift_visual, video_clip
  - `gift_visual` `incoming-images/gift-map-screenshots/Screenshot_20260413-190626_TikTok.png`
  - `video_clip` `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190626_TikTok.png`
- `ab10c5ed634f…` (2×) — roles differ: gift_visual, video_clip
  - `gift_visual` `incoming-images/gift-map-screenshots/Screenshot_20260413-190636_TikTok.png`
  - `video_clip` `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190636_TikTok.png`
- `049901414e6e…` (2×) — roles differ: gift_visual, video_clip
  - `gift_visual` `incoming-images/gift-map-screenshots/Screenshot_20260413-190645_TikTok.png`
  - `video_clip` `incoming-images/videos_2/_zip_preview/Screenshot_20260413-190645_TikTok.png`
- `c46c2bdcf8b5…` (3×) — roles differ: character_mood, character_form
  - `character_mood` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/purple-originals/kojnozout-idle-f2.pre-soft-neon.png`
  - `character_mood` `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/pre-backups/kojnozout-idle-f2.pre-soft-neon.png`
  - `character_form` `mia-output-overlay/assets/animation-bank/idle/idle_001/frames/0001.png`
- `64cbecde12d9…` (3×) — roles differ: reference_image, character_mood
  - `reference_image` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/koj-cyborg-happy-alpha.png`
  - `character_mood` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/kojnozout-happy.png`
  - `character_mood` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v26-mint-cyborg/kojnozout-happy.png`
- `6417571e0d9f…` (3×) — roles differ: reference_image, character_mood
  - `reference_image` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/koj-cyborg-idle-alpha.png`
  - `character_mood` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/kojnozout-idle.png`
  - `character_mood` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v26-mint-cyborg/kojnozout-idle.png`
- `ff66550add4b…` (3×) — roles differ: reference_image, character_mood
  - `reference_image` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/koj-cyborg-warm-alpha.png`
  - `character_mood` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/kojnozout-warm.png`
  - `character_mood` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v26-mint-cyborg/kojnozout-warm.png`
- `187ed36532fe…` (2×) — roles differ: reference_image, character_mood
  - `reference_image` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/koj-robot-happy-alpha.png`
  - `character_mood` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/kojnozout-happy.png`
- `60a1eef98fe0…` (2×) — roles differ: reference_image, character_mood
  - `reference_image` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/koj-robot-idle-alpha.png`
  - `character_mood` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/kojnozout-idle.png`
- `f79a23695cad…` (2×) — roles differ: reference_image, character_mood
  - `reference_image` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/koj-robot-warm-alpha.png`
  - `character_mood` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/kojnozout-warm.png`
- `9accfdc3177c…` (3×) — roles differ: character_form, reference_image, preview
  - `character_form` `mia-output-overlay/assets/kojnozrout/forms/kick/idle.png`
  - `reference_image` `mia-output-overlay/assets/kojnozrout/masters/stackzrout-master.png`
  - `preview` `mia-output-overlay/assets/kojnozrout/roster/stackzrout-preview.png`
- `e4c07219f6ca…` (3×) — roles differ: character_form, reference_image, preview
  - `character_form` `mia-output-overlay/assets/kojnozrout/forms/tiktok/idle.png`
  - `reference_image` `mia-output-overlay/assets/kojnozrout/masters/tokzrout-master.png`
  - `preview` `mia-output-overlay/assets/kojnozrout/roster/tokzrout-preview.png`
- `acd263797671…` (3×) — roles differ: character_form, reference_image, preview
  - `character_form` `mia-output-overlay/assets/kojnozrout/forms/twitch/idle.png`
  - `reference_image` `mia-output-overlay/assets/kojnozrout/masters/bitszrout-master.png`
  - `preview` `mia-output-overlay/assets/kojnozrout/roster/bitszrout-preview.png`
- `fd59fcd650ad…` (3×) — roles differ: character_form, preview, reference_image
  - `character_form` `mia-output-overlay/assets/kojnozrout/forms/youtube/idle.png`
  - `preview` `mia-output-overlay/assets/kojnozrout/kisstube/koj-kisstube-preview.png`
  - `reference_image` `mia-output-overlay/assets/kojnozrout/masters/kisstube-master.png`

## REVIEW

- `41e8dfa779de…` (2×, 200.3 KB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_F420EAF7CB67` `incoming-images/photos/IMG-20251222-WA0017_181044.jpg` · specific refs: 3
  - `MIA_ASSET_CDA8A4DE5857` `incoming-images/photos/IMG-20251222-WA0017.jpg` · specific refs: 3
- `bdf44d4af362…` (2×, 62.4 KB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_E0C30F9BC36E` `incoming-images/photos/IMG-20260214-WA0086 (1).jpg` · specific refs: 2
  - `MIA_ASSET_8E99D3FD7660` `incoming-images/photos/IMG-20260214-WA0086.jpg` · specific refs: 2
- `65c95e894578…` (2×, 1.2 MB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_6EC2445D7771` `incoming-images/photos/Screenshot_2026-02-21-04-51-02-056_com.miui.gallery_181812.jpg` · specific refs: 2
  - `MIA_ASSET_0890EE9453DE` `incoming-images/photos/Screenshot_2026-02-21-04-51-02-056_com.miui.gallery.jpg` · specific refs: 2
- `6aeb113f737f…` (3×, 11.0 MB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_12AC1BC6979A` `incoming-images/videos_2/VID-20260318-WA0333.mp4` · specific refs: 12
  - `VID_VID-20260318-WA0333_211904` `incoming-images/videos/VID-20260318-WA0333_211904.mp4` · specific refs: 9
  - `VID_VID-20260318-WA0333` `incoming-images/videos/VID-20260318-WA0333.mp4` · specific refs: 12
- `c25d05bb0251…` (3×, 766.1 KB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_2B140580DAA1` `incoming-images/videos_2/VID-20260419-WA0095.mp4` · specific refs: 12
  - `VID_VID-20260419-WA0095_211904` `incoming-images/videos/VID-20260419-WA0095_211904.mp4` · specific refs: 9
  - `VID_VID-20260419-WA0095` `incoming-images/videos/VID-20260419-WA0095.mp4` · specific refs: 12
- `0f8a09ba0fbd…` (3×, 37.6 MB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_87511EBFCAF5` `incoming-images/videos_2/VID-20260504-WA0001.mp4` · specific refs: 12
  - `VID_VID-20260504-WA0001_211904` `incoming-images/videos/VID-20260504-WA0001_211904.mp4` · specific refs: 9
  - `VID_VID-20260504-WA0001` `incoming-images/videos/VID-20260504-WA0001.mp4` · specific refs: 12
- `f691fcd93e32…` (2×, 4.4 MB) — multiple members with distinct path-specific runtime refs
  - `VID_2026-01-31-202404755_175510` `incoming-images/videos/2026-01-31-202404755_175510.mp4` · specific refs: 9
  - `VID_2026-01-31-202404755` `incoming-images/videos/2026-01-31-202404755.mp4` · specific refs: 9
- `0a8971942cf7…` (2×, 33.1 MB) — multiple members with distinct path-specific runtime refs
  - `VID_2026-02-01-161429084_175814` `incoming-images/videos/2026-02-01-161429084_175814.mp4` · specific refs: 9
  - `VID_2026-02-01-161429084` `incoming-images/videos/2026-02-01-161429084.mp4` · specific refs: 9
- `01f89773e3fb…` (3×, 10.2 MB) — multiple members with distinct path-specific runtime refs
  - `VID_2026-02-17-121129193_180745` `incoming-images/videos/2026-02-17-121129193_180745.mp4` · specific refs: 9
  - `VID_2026-02-17-121129193_181050` `incoming-images/videos/2026-02-17-121129193_181050.mp4` · specific refs: 9
  - `VID_2026-02-17-121129193` `incoming-images/videos/2026-02-17-121129193.mp4` · specific refs: 9
- `87a053e930b4…` (2×, 999.7 KB) — multiple members with distinct path-specific runtime refs
  - `VID_2026-03-05-184341058_1` `incoming-images/videos/2026-03-05-184341058 (1).mp4` · specific refs: 9
  - `VID_2026-03-05-184341058` `incoming-images/videos/2026-03-05-184341058.mp4` · specific refs: 9
- `b6a2bb47070d…` (2×, 1.7 MB) — multiple members with distinct path-specific runtime refs
  - `VID_HAILUO_1769864687_1` `incoming-images/videos/hailuo_1769864687 (1).mp4` · specific refs: 12
  - `VID_HAILUO_1769864687` `incoming-images/videos/hailuo_1769864687.mp4` · specific refs: 12
- `207d2a684b41…` (2×, 13.2 MB) — multiple members with distinct path-specific runtime refs
  - `VID_LV_0_20260129173032_1` `incoming-images/videos/lv_0_20260129173032 (1).mp4` · specific refs: 9
  - `VID_LV_0_20260129173032` `incoming-images/videos/lv_0_20260129173032.mp4` · specific refs: 9
- `aee66c40af2f…` (2×, 4.5 MB) — multiple members with distinct path-specific runtime refs
  - `VID_LV_0_20260131151957_175058` `incoming-images/videos/lv_0_20260131151957_175058.mp4` · specific refs: 9
  - `VID_LV_0_20260131151957` `incoming-images/videos/lv_0_20260131151957.mp4` · specific refs: 12
- `f3648bd6e377…` (5×, 37.0 MB) — multiple members with distinct path-specific runtime refs
  - `VID_LV_0_20260305202118_1` `incoming-images/videos/lv_0_20260305202118 (1).mp4` · specific refs: 9
  - `VID_LV_0_20260305202118_2` `incoming-images/videos/lv_0_20260305202118 (2).mp4` · specific refs: 9
  - `VID_LV_0_20260305202118_3` `incoming-images/videos/lv_0_20260305202118 (3).mp4` · specific refs: 9
  - `VID_LV_0_20260305202118_210842` `incoming-images/videos/lv_0_20260305202118_210842.mp4` · specific refs: 9
  - `VID_LV_0_20260305202118` `incoming-images/videos/lv_0_20260305202118.mp4` · specific refs: 9
- `d8a92e3daca7…` (2×, 30.8 MB) — multiple members with distinct path-specific runtime refs
  - `VID_LV_0_20260307180457_211118` `incoming-images/videos/lv_0_20260307180457_211118.mp4` · specific refs: 9
  - `VID_LV_0_20260307180457` `incoming-images/videos/lv_0_20260307180457.mp4` · specific refs: 9
- `d4ce3d7e5157…` (2×, 24.9 MB) — multiple members with distinct path-specific runtime refs
  - `VID_LV_0_20260309100507_1` `incoming-images/videos/lv_0_20260309100507 (1).mp4` · specific refs: 9
  - `VID_LV_0_20260309100507` `incoming-images/videos/lv_0_20260309100507.mp4` · specific refs: 9
- `3e2ad542cf80…` (2×, 2.9 MB) — multiple members with distinct path-specific runtime refs
  - `VID_LV_7351466693492837650_20260302151200_183032` `incoming-images/videos/lv_7351466693492837650_20260302151200_183032.mp4` · specific refs: 9
  - `VID_LV_7351466693492837650_20260302151200` `incoming-images/videos/lv_7351466693492837650_20260302151200.mp4` · specific refs: 9
- `712e537d5566…` (2×, 21.0 MB) — multiple members with distinct path-specific runtime refs
  - `VID_LV_7412252754967547152_20260130143639_1` `incoming-images/videos/lv_7412252754967547152_20260130143639 (1).mp4` · specific refs: 9
  - `VID_LV_7412252754967547152_20260130143639` `incoming-images/videos/lv_7412252754967547152_20260130143639.mp4` · specific refs: 9
- `7c62df3ffddb…` (2×, 22.2 MB) — multiple members with distinct path-specific runtime refs
  - `VID_LV_7505688003600190773_20260130144313_1` `incoming-images/videos/lv_7505688003600190773_20260130144313 (1).mp4` · specific refs: 9
  - `VID_LV_7505688003600190773_20260130144313` `incoming-images/videos/lv_7505688003600190773_20260130144313.mp4` · specific refs: 9
- `4262300a0ca4…` (2×, 24.3 MB) — multiple members with distinct path-specific runtime refs
  - `VID_VID-20260319-WA0001_211251` `incoming-images/videos/VID-20260319-WA0001_211251.mp4` · specific refs: 9
  - `VID_VID-20260319-WA0001` `incoming-images/videos/VID-20260319-WA0001.mp4` · specific refs: 9
- `93448472998b…` (3×, 844.1 KB) — multiple members with distinct path-specific runtime refs
  - `VID_VID-20260419-WA0028_1` `incoming-images/videos/VID-20260419-WA0028 (1).mp4` · specific refs: 9
  - `VID_VID-20260419-WA0028_211222` `incoming-images/videos/VID-20260419-WA0028_211222.mp4` · specific refs: 9
  - `VID_VID-20260419-WA0028` `incoming-images/videos/VID-20260419-WA0028.mp4` · specific refs: 9
- `b05fff488875…` (2×, 865.3 KB) — multiple members with distinct path-specific runtime refs
  - `VID_VID-20260419-WA0065_205035` `incoming-images/videos/VID-20260419-WA0065_205035.mp4` · specific refs: 9
  - `VID_VID-20260419-WA0065` `incoming-images/videos/VID-20260419-WA0065.mp4` · specific refs: 9
- `6ffe1cc9816b…` (5×, 1.4 MB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_1C3443AB0A05` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-16T18-08-53-355Z/kojnozout-annoyed.png` · specific refs: 2
  - `MIA_ASSET_1198E5D21AC8` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-16T18-08-53-355Z/kojnozout-hungry.png` · specific refs: 2
  - `MIA_ASSET_39C9DE4BCF67` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-16T18-08-53-355Z/kojnozout-sick.png` · specific refs: 2
  - `MIA_ASSET_20838953DE8C` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-hungry.png` · specific refs: 2
  - `MIA_ASSET_D9F7363985C6` `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-hungry.png` · specific refs: 2
- `a48972f8025c…` (4×, 1.5 MB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_461AB2A78DD3` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-16T18-08-53-355Z/kojnozout-happy.png` · specific refs: 12
  - `MIA_ASSET_EFC1036CF4A1` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-happy.png` · specific refs: 12
  - `MIA_ASSET_D33E2656D339` `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-happy.png` · specific refs: 12
  - `MIA_ASSET_1F9623B59301` `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-laugh.png` · specific refs: 1
- `79c22f161e65…` (5×, 1.3 MB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_7C79D3EB2A9F` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-16T18-08-53-355Z/kojnozout-idle.png` · specific refs: 12
  - `MIA_ASSET_504397F55034` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-16T18-08-53-355Z/kojnozout-sad.png` · specific refs: 2
  - `MIA_ASSET_B2078181918C` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-16T18-08-53-355Z/kojnozout-sleepy.png` · specific refs: 3
  - `MIA_ASSET_A3132C96EBD7` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-idle.png` · specific refs: 12
  - `MIA_ASSET_CF58326DDF9D` `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-idle.png` · specific refs: 12
- `28358ab3db78…` (3×, 1.4 MB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_2543F7FD66F3` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-annoyed.png` · specific refs: 2
  - `MIA_ASSET_7EBC35DEEF39` `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-annoyed.png` · specific refs: 2
  - `MIA_ASSET_30BDFCAF7C0F` `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-stressed.png` · specific refs: 2
- `5bc52d23ae98…` (3×, 1.3 MB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_E924A0AA5551` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/2026-06-18T19-57-24-338Z/kojnozout-sleepy.png` · specific refs: 3
  - `MIA_ASSET_64751D5A165D` `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-sleepy.png` · specific refs: 3
  - `MIA_ASSET_D6D8844662C5` `mia-output-overlay/assets/kojnozrout/moods/kojnozout-sleepy.png` · specific refs: 2
- `18efeeec8720…` (2×, 668.3 KB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_3401B33F4394` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/cursor-koj-soft-neon-happy-raw.png` · specific refs: 3
  - `MIA_ASSET_954D235667F1` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/koj-soft-neon-happy-raw.png` · specific refs: 10
- `87242f6a1e1a…` (2×, 652.7 KB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_BB22469627F4` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/cursor-koj-soft-neon-idle-raw.png` · specific refs: 3
  - `MIA_ASSET_D9D486FFAE62` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/koj-soft-neon-idle-raw.png` · specific refs: 10
- `9d7c4f293ab3…` (2×, 652.4 KB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_CC28241A4E24` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/kojnozout-idle.png` · specific refs: 12
  - `MIA_ASSET_F2EECEBD028E` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v17-soft-neon/kojnozout-warm.png` · specific refs: 12
- `669078971e15…` (2×, 808.4 KB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_41EF87DEAD8F` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/cursor-koj-cyborg-happy-raw.png` · specific refs: 1
  - `MIA_ASSET_5FD993181D95` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/koj-cyborg-happy-raw.png` · specific refs: 5
- `57b13e415b46…` (2×, 775.8 KB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_13D456893E91` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/cursor-koj-cyborg-idle-raw.png` · specific refs: 1
  - `MIA_ASSET_F6A339DDD2A0` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/koj-cyborg-idle-raw.png` · specific refs: 5
- `d135e3223700…` (2×, 779.8 KB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_93D624426DB7` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/cursor-koj-cyborg-warm-v2-raw.png` · specific refs: 3
  - `MIA_ASSET_EE61A55EEE17` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v19-cyborg/koj-cyborg-warm-raw.png` · specific refs: 5
- `6e997fa17881…` (2×, 1.1 MB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_89B0C779813B` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/cursor-koj-robot-happy-raw.png` · specific refs: 1
  - `MIA_ASSET_3F157660A9F1` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/koj-robot-happy-raw.png` · specific refs: 5
- `fc4c6d05a303…` (2×, 1.1 MB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_717A1E5CC379` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/cursor-koj-robot-idle-raw.png` · specific refs: 1
  - `MIA_ASSET_BCF5FB427F1E` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/koj-robot-idle-raw.png` · specific refs: 5
- `9461f9338b38…` (2×, 808.8 KB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_8D2DEC0DBD75` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/cursor-koj-robot-warm-raw.png` · specific refs: 1
  - `MIA_ASSET_B18D9C73054D` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v20-robot-projector/koj-robot-warm-raw.png` · specific refs: 5
- `c384036c8dde…` (12×, 864.8 KB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_C884151DAA6F` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-calm-deep.png` · specific refs: 1
  - `MIA_ASSET_70FB3BA751A1` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-calm.png` · specific refs: 1
  - `MIA_ASSET_D6273B8F4F58` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-cozy-blanket.png` · specific refs: 2
  - `MIA_ASSET_021637504256` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-cozy.png` · specific refs: 2
  - `MIA_ASSET_02C25D53A06B` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-curl.png` · specific refs: 2
  - `MIA_ASSET_204371519B95` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-egg-rest.png` · specific refs: 1
  - `MIA_ASSET_762B68DBBB13` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-idle.png` · specific refs: 12
  - `MIA_ASSET_9368F715AD41` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-rest.png` · specific refs: 3
  - `MIA_ASSET_3A898B031C38` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-sit.png` · specific refs: 1
  - `MIA_ASSET_690802F5E46F` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-sleepy.png` · specific refs: 3
  - `MIA_ASSET_3CA4EEA1ACA2` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai-before-dark/kojnozout-yawn.png` · specific refs: 2
  - `MIA_ASSET_CA511CEFB41D` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v21-koj-ai/kojnozout-idle.png` · specific refs: 12
- `1a848dac2ffc…` (6×, 735.1 KB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_360C8D33D81E` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/kojnozout-cozy.png` · specific refs: 2
  - `MIA_ASSET_5C3FB35E5A0A` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/kojnozout-curl.png` · specific refs: 2
  - `MIA_ASSET_84F9827C5BDF` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/kojnozout-idle.png` · specific refs: 12
  - `MIA_ASSET_CC8CFC2B7725` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/kojnozout-rest.png` · specific refs: 3
  - `MIA_ASSET_74D0BD689ABB` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/kojnozout-sleepy.png` · specific refs: 3
  - `MIA_ASSET_7B3DBB553288` `mia-output-overlay/assets/_offline_backup/kojnozrout/_archive/v22-dark-big/kojnozout-yawn.png` · specific refs: 2
- `0d8b7575d40e…` (2×, 396.2 KB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_9A2EC3E41482` `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-cozy.png` · specific refs: 2
  - `MIA_ASSET_3CC8340DA69D` `mia-output-overlay/assets/kojnozrout/moods/kojnozout-cozy.png` · specific refs: 1
- `dc3b71d5f127…` (2×, 402.5 KB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_A801710CFD5B` `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-curl.png` · specific refs: 2
  - `MIA_ASSET_CAFB19BE8681` `mia-output-overlay/assets/kojnozrout/moods/kojnozout-curl.png` · specific refs: 1
- `c73340b7665d…` (2×, 376.0 KB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_58B35B769BEB` `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-rest.png` · specific refs: 3
  - `MIA_ASSET_52A48790879A` `mia-output-overlay/assets/kojnozrout/moods/kojnozout-rest.png` · specific refs: 2
- `2b486657ae7d…` (2×, 392.0 KB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_EB0AB92558F4` `mia-output-overlay/assets/_offline_backup/kojnozrout/moods/_prenorm_backup/kojnozout-yawn.png` · specific refs: 2
  - `MIA_ASSET_3EE8A8D22BEB` `mia-output-overlay/assets/kojnozrout/moods/kojnozout-yawn.png` · specific refs: 1
- `08eeb4e3e1a2…` (2×, 1.2 MB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_37DACA8D0EBF` `mia-output-overlay/assets/kojnozrout/moods/kojnozout-annoyed.png` · specific refs: 2
  - `MIA_ASSET_80D0AD82B1C8` `mia-output-overlay/assets/kojnozrout/moods/kojnozout-stressed.png` · specific refs: 2
- `2b02ee93f33d…` (3×, 1.7 MB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_D3E765395F43` `mia-output-overlay/assets/mia/cyber/hero.png` · specific refs: 2
  - `MIA_ASSET_F94DDD7C54FB` `mia-output-overlay/assets/mia/cyber/lip/01.png` · specific refs: 49
  - `MIA_ASSET_17E6652FFCB1` `mia-output-overlay/assets/mia/hologram.png` · specific refs: 4
- `a2b0e2437c2a…` (2×, 1.7 MB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_3C22F1F6C0A9` `mia-output-overlay/assets/mia/masters/faces/combo.png` · specific refs: 12
  - `MIA_ASSET_70E7F097149B` `mia-output-overlay/assets/mia/masters/faces/gift.png` · specific refs: 48
- `c644cea98e64…` (2×, 1.3 MB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_17606A85963B` `mia-output-overlay/assets/mia/masters/faces/think.png` · specific refs: 1
  - `MIA_ASSET_1A35DF4C3577` `mia-output-overlay/assets/mia/masters/think.png` · specific refs: 7
- `95d04b9e8895…` (2×, 1.5 MB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_21D59BF88D27` `mia-output-overlay/assets/mia/masters/faces/wave.png` · specific refs: 1
  - `MIA_ASSET_A5AFAA7455F4` `mia-output-overlay/assets/mia/masters/wave.png` · specific refs: 12
- `787be6b15680…` (2×, 1.6 MB) — multiple members with distinct path-specific runtime refs
  - `MIA_ASSET_E239D205F03C` `mia-output-overlay/assets/mia/masters/speak.png` · specific refs: 12
  - `MIA_ASSET_1F6A6C2FC527` `mia-output-overlay/assets/mia/masters/speak/02.png` · specific refs: 1

## BLOCKED

- `51868f6f4126…` — reference-risk or manual-hold path: mia-output-overlay/assets/mia/masters/idle.png

## Další krok (post-freeze)

**Dedup execution plan** — pouze pro SAFE_DEDUP skupiny; REF/REVIEW ručně před smazáním.
