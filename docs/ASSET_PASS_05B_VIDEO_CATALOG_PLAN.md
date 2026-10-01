# ASSET PASS 05B — VIDEO CATALOG REF CONSOLIDATION PLAN

**Režim:** analysis only · žádné změny refs/runtime.
**Scope:** REVIEW duplicate groups · `role = video_clip`
**Generováno:** `node scripts/analyze_video_catalog_refs.js`

## Souhrn

| Metrika | Hodnota |
|---------|---------|
| REVIEW `video_clip` skupin | **21** |
| **CANONICALIZABLE** | **9** |
| **SEMANTIC_SPLIT** | **9** |
| **AMBIGUOUS** | **3** |
| **BLOCKED** | **0** |
| **Canonicalizable bytes** | **108.4 MB** |
| Semantic-split bytes (needs catalog merge) | 163.8 MB |
| **Refs k přepsání (estimate)** | **371** |
| Po canonicalizaci → SAFE_DEDUP | **9** skupin · 108.4 MB |

### Canonical path pravidlo

Nejkratší název ≠ canonical. Skóre: `media-intake-overrides` > `stream-media-overrides` pinned slot > `stream-media-catalog` > visual-review; penalizace `(1)`/`_211904` kopií.

## Top canonical path návrhy

| Skupina hash | Verdict | Proposed canonical | Score | Bytes saved |
|--------------|---------|-------------------|-------|-------------|
| `f3648bd6e377…` | AMBIGUOUS | `incoming-images/videos/lv_0_20260305202118_210842.mp4` | 75 | 148.0 MB |
| `0f8a09ba0fbd…` | SEMANTIC_SPLIT | `incoming-images/videos_2/VID-20260504-WA0001.mp4` | 192 | 75.3 MB |
| `0a8971942cf7…` | SEMANTIC_SPLIT | `incoming-images/videos/2026-02-01-161429084.mp4` | 83 | 33.1 MB |
| `d8a92e3daca7…` | AMBIGUOUS | `incoming-images/videos/lv_0_20260307180457_211118.mp4` | 75 | 30.8 MB |
| `d4ce3d7e5157…` | CANONICALIZABLE | `incoming-images/videos/lv_0_20260309100507.mp4` | 75 | 24.9 MB |
| `4262300a0ca4…` | CANONICALIZABLE | `incoming-images/videos/VID-20260319-WA0001.mp4` | 83 | 24.3 MB |
| `7c62df3ffddb…` | CANONICALIZABLE | `incoming-images/videos/lv_7505688003600190773_20260130144313.mp4` | 75 | 22.2 MB |
| `6aeb113f737f…` | SEMANTIC_SPLIT | `incoming-images/videos_2/VID-20260318-WA0333.mp4` | 192 | 21.9 MB |
| `712e537d5566…` | CANONICALIZABLE | `incoming-images/videos/lv_7412252754967547152_20260130143639.mp4` | 75 | 21.0 MB |
| `01f89773e3fb…` | SEMANTIC_SPLIT | `incoming-images/videos/2026-02-17-121129193.mp4` | 83 | 20.5 MB |
| `207d2a684b41…` | CANONICALIZABLE | `incoming-images/videos/lv_0_20260129173032.mp4` | 75 | 13.2 MB |
| `aee66c40af2f…` | SEMANTIC_SPLIT | `incoming-images/videos/lv_0_20260131151957.mp4` | 191 | 4.5 MB |
| `f691fcd93e32…` | SEMANTIC_SPLIT | `incoming-images/videos/2026-01-31-202404755.mp4` | 83 | 4.4 MB |
| `3e2ad542cf80…` | AMBIGUOUS | `incoming-images/videos/lv_7351466693492837650_20260302151200_183032.mp4` | 75 | 2.9 MB |
| `b6a2bb47070d…` | SEMANTIC_SPLIT | `incoming-images/videos/hailuo_1769864687.mp4` | 191 | 1.7 MB |

## Skupiny detail

### `f3648bd6e377…` · AMBIGUOUS · 148.0 MB

| Pole | Hodnota |
|------|---------|
| **HASH** | `f3648bd6e37735afc8de4c387f3d5db0` |
| **ALL PATHS** | `incoming-images/videos/lv_0_20260305202118 (1).mp4` · `incoming-images/videos/lv_0_20260305202118 (2).mp4` · `incoming-images/videos/lv_0_20260305202118 (3).mp4` · `incoming-images/videos/lv_0_20260305202118_210842.mp4` · `incoming-images/videos/lv_0_20260305202118.mp4` |
| **Proposed canonical** | `incoming-images/videos/lv_0_20260305202118_210842.mp4` (score 75) |
| **Expected bytes saved** | 148.0 MB |
| **Risk** | medium |
| **Post-canonical** | — |
| **Důvod** | officialness tie 75 vs 75 |

**Officialness ranking:**
- `incoming-images/videos/lv_0_20260305202118_210842.mp4` → 75
- `incoming-images/videos/lv_0_20260305202118.mp4` → 75
- `incoming-images/videos/lv_0_20260305202118 (1).mp4` → 63
- `incoming-images/videos/lv_0_20260305202118 (2).mp4` → 63
- `incoming-images/videos/lv_0_20260305202118 (3).mp4` → 63

**Runtime refs (union):**
- `config/media-intake-overrides.json:623`
- `config/media-visual-review.json:2337`
- `config/media-visual-review.json:2338`
- `config/media-visual-review.json:2341`
- `config/media-visual-review.json:2358`
- `config/stream-media-catalog.json:1013`
- `config/stream-media-catalog.json:1014`
- `config/stream-media-catalog.json:4174`
- … +37

**media-intake-overrides refs:** config/media-intake-overrides.json:623, config/media-intake-overrides.json:631, config/media-intake-overrides.json:639, config/media-intake-overrides.json:647, config/media-intake-overrides.json:655

**Other catalog refs:** config/stream-media-catalog.json:1013, config/stream-media-catalog.json:4174, config/media-visual-review.json:2337, config/stream-media-catalog.json:1027, config/stream-media-catalog.json:4200, config/media-visual-review.json:2366

**Refs to rewrite:** 52
- `config/media-intake-overrides.json:623` (path `incoming-images/videos/lv_0_20260305202118 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260305202118_210842.mp4`
- `config/media-visual-review.json:2337` (path `incoming-images/videos/lv_0_20260305202118 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260305202118_210842.mp4`
- `config/media-visual-review.json:2338` (path `incoming-images/videos/lv_0_20260305202118 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260305202118_210842.mp4`
- `config/media-visual-review.json:2341` (path `incoming-images/videos/lv_0_20260305202118 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260305202118_210842.mp4`
- `config/media-visual-review.json:2358` (path `incoming-images/videos/lv_0_20260305202118 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260305202118_210842.mp4`
- `config/stream-media-catalog.json:1013` (path `incoming-images/videos/lv_0_20260305202118 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260305202118_210842.mp4`
- `config/stream-media-catalog.json:1014` (path `incoming-images/videos/lv_0_20260305202118 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260305202118_210842.mp4`
- `config/stream-media-catalog.json:4174` (path `incoming-images/videos/lv_0_20260305202118 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260305202118_210842.mp4`
- `config/stream-media-catalog.json:4176` (path `incoming-images/videos/lv_0_20260305202118 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260305202118_210842.mp4`
- `config/media-intake-overrides.json:623` `videos/lv_0_20260305202118 (1).mp4` → `videos/lv_0_20260305202118_210842.mp4`
- … +42

### `0f8a09ba0fbd…` · SEMANTIC_SPLIT · 75.3 MB

| Pole | Hodnota |
|------|---------|
| **HASH** | `0f8a09ba0fbde3b739ad5b9f25578466` |
| **ALL PATHS** | `incoming-images/videos_2/VID-20260504-WA0001.mp4` · `incoming-images/videos/VID-20260504-WA0001_211904.mp4` · `incoming-images/videos/VID-20260504-WA0001.mp4` |
| **Proposed canonical** | `incoming-images/videos_2/VID-20260504-WA0001.mp4` (score 192) |
| **Expected bytes saved** | 75.3 MB |
| **Risk** | medium — merge catalog semantics first |
| **Post-canonical** | — |
| **Důvod** | distinct intake semantics: T3|story_music|T4_VIDEO_17|pixverse_fairy · T4|story_epic||community_epic |

**Officialness ranking:**
- `incoming-images/videos_2/VID-20260504-WA0001.mp4` → 192
- `incoming-images/videos/VID-20260504-WA0001.mp4` → 83
- `incoming-images/videos/VID-20260504-WA0001_211904.mp4` → 75

**Runtime refs (union):**
- `config/media-intake-overrides.json:119`
- `config/media-intake-overrides.json:1511`
- `config/media-visual-review.json:453`
- `config/media-visual-review.json:454`
- `config/media-visual-review.json:457`
- `config/media-visual-review.json:476`
- `config/media-visual-review.json:5564`
- `config/media-visual-review.json:5565`
- … +13

**media-intake-overrides refs:** config/media-intake-overrides.json:119, config/media-intake-overrides.json:1503, config/media-intake-overrides.json:1511

**Other catalog refs:** config/stream-media-catalog.json:2009, config/stream-media-catalog.json:3299, config/stream-media-catalog.json:8421, config/media-visual-review.json:453, config/videos_2-intake.json:67, config/stream-media-overrides.json:27

**Refs to rewrite:** 29
- `config/media-intake-overrides.json:1503` (path `incoming-images/videos/VID-20260504-WA0001_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260504-WA0001.mp4`
- `config/media-visual-review.json:5535` (path `incoming-images/videos/VID-20260504-WA0001_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260504-WA0001.mp4`
- `config/media-visual-review.json:5536` (path `incoming-images/videos/VID-20260504-WA0001_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260504-WA0001.mp4`
- `config/media-visual-review.json:5539` (path `incoming-images/videos/VID-20260504-WA0001_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260504-WA0001.mp4`
- `config/media-visual-review.json:5556` (path `incoming-images/videos/VID-20260504-WA0001_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260504-WA0001.mp4`
- `config/stream-media-catalog.json:1995` (path `incoming-images/videos/VID-20260504-WA0001_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260504-WA0001.mp4`
- `config/stream-media-catalog.json:1996` (path `incoming-images/videos/VID-20260504-WA0001_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260504-WA0001.mp4`
- `config/stream-media-catalog.json:8395` (path `incoming-images/videos/VID-20260504-WA0001_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260504-WA0001.mp4`
- `config/stream-media-catalog.json:8397` (path `incoming-images/videos/VID-20260504-WA0001_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260504-WA0001.mp4`
- `config/media-intake-overrides.json:1503` `videos/VID-20260504-WA0001_211904.mp4` → `videos_2/VID-20260504-WA0001.mp4`
- … +19

### `0a8971942cf7…` · SEMANTIC_SPLIT · 33.1 MB

| Pole | Hodnota |
|------|---------|
| **HASH** | `0a8971942cf70565b24bdb5a244391d4` |
| **ALL PATHS** | `incoming-images/videos/2026-02-01-161429084_175814.mp4` · `incoming-images/videos/2026-02-01-161429084.mp4` |
| **Proposed canonical** | `incoming-images/videos/2026-02-01-161429084.mp4` (score 83) |
| **Expected bytes saved** | 33.1 MB |
| **Risk** | medium — merge catalog semantics first |
| **Post-canonical** | — |
| **Důvod** | distinct intake semantics: T4|story_epic||other · T4|story_epic||capcut_epic |

**Officialness ranking:**
- `incoming-images/videos/2026-02-01-161429084.mp4` → 83
- `incoming-images/videos/2026-02-01-161429084_175814.mp4` → 75

**Runtime refs (union):**
- `config/media-intake-overrides.json:239`
- `config/media-visual-review.json:882`
- `config/media-visual-review.json:883`
- `config/media-visual-review.json:886`
- `config/media-visual-review.json:902`
- `config/stream-media-catalog.json:2051`
- `config/stream-media-catalog.json:2052`
- `config/stream-media-catalog.json:8733`
- … +10

**media-intake-overrides refs:** config/media-intake-overrides.json:239, config/media-intake-overrides.json:247

**Other catalog refs:** config/stream-media-catalog.json:2051, config/stream-media-catalog.json:8733, config/media-visual-review.json:882, config/stream-media-catalog.json:1603, config/stream-media-catalog.json:3434, config/media-visual-review.json:910

**Refs to rewrite:** 13
- `config/media-intake-overrides.json:239` (path `incoming-images/videos/2026-02-01-161429084_175814.mp4`) → canonical `incoming-images/videos/2026-02-01-161429084.mp4`
- `config/media-visual-review.json:882` (path `incoming-images/videos/2026-02-01-161429084_175814.mp4`) → canonical `incoming-images/videos/2026-02-01-161429084.mp4`
- `config/media-visual-review.json:883` (path `incoming-images/videos/2026-02-01-161429084_175814.mp4`) → canonical `incoming-images/videos/2026-02-01-161429084.mp4`
- `config/media-visual-review.json:886` (path `incoming-images/videos/2026-02-01-161429084_175814.mp4`) → canonical `incoming-images/videos/2026-02-01-161429084.mp4`
- `config/media-visual-review.json:902` (path `incoming-images/videos/2026-02-01-161429084_175814.mp4`) → canonical `incoming-images/videos/2026-02-01-161429084.mp4`
- `config/stream-media-catalog.json:2051` (path `incoming-images/videos/2026-02-01-161429084_175814.mp4`) → canonical `incoming-images/videos/2026-02-01-161429084.mp4`
- `config/stream-media-catalog.json:2052` (path `incoming-images/videos/2026-02-01-161429084_175814.mp4`) → canonical `incoming-images/videos/2026-02-01-161429084.mp4`
- `config/stream-media-catalog.json:8733` (path `incoming-images/videos/2026-02-01-161429084_175814.mp4`) → canonical `incoming-images/videos/2026-02-01-161429084.mp4`
- `config/stream-media-catalog.json:8735` (path `incoming-images/videos/2026-02-01-161429084_175814.mp4`) → canonical `incoming-images/videos/2026-02-01-161429084.mp4`
- `config/media-intake-overrides.json:239` `videos/2026-02-01-161429084_175814.mp4` → `videos/2026-02-01-161429084.mp4`
- … +3

### `d8a92e3daca7…` · AMBIGUOUS · 30.8 MB

| Pole | Hodnota |
|------|---------|
| **HASH** | `d8a92e3daca76b9096e0c74419140632` |
| **ALL PATHS** | `incoming-images/videos/lv_0_20260307180457_211118.mp4` · `incoming-images/videos/lv_0_20260307180457.mp4` |
| **Proposed canonical** | `incoming-images/videos/lv_0_20260307180457_211118.mp4` (score 75) |
| **Expected bytes saved** | 30.8 MB |
| **Risk** | medium |
| **Post-canonical** | — |
| **Důvod** | officialness tie 75 vs 75 |

**Officialness ranking:**
- `incoming-images/videos/lv_0_20260307180457_211118.mp4` → 75
- `incoming-images/videos/lv_0_20260307180457.mp4` → 75

**Runtime refs (union):**
- `config/media-intake-overrides.json:679`
- `config/media-visual-review.json:2540`
- `config/media-visual-review.json:2541`
- `config/media-visual-review.json:2544`
- `config/media-visual-review.json:2561`
- `config/stream-media-catalog.json:3602`
- `config/stream-media-catalog.json:3604`
- `config/stream-media-catalog.json:845`
- … +10

**media-intake-overrides refs:** config/media-intake-overrides.json:679, config/media-intake-overrides.json:687

**Other catalog refs:** config/stream-media-catalog.json:845, config/stream-media-catalog.json:3602, config/media-visual-review.json:2540, config/stream-media-catalog.json:831, config/stream-media-catalog.json:3574, config/media-visual-review.json:2569

**Refs to rewrite:** 13
- `config/media-intake-overrides.json:687` (path `incoming-images/videos/lv_0_20260307180457.mp4`) → canonical `incoming-images/videos/lv_0_20260307180457_211118.mp4`
- `config/media-visual-review.json:2569` (path `incoming-images/videos/lv_0_20260307180457.mp4`) → canonical `incoming-images/videos/lv_0_20260307180457_211118.mp4`
- `config/media-visual-review.json:2570` (path `incoming-images/videos/lv_0_20260307180457.mp4`) → canonical `incoming-images/videos/lv_0_20260307180457_211118.mp4`
- `config/media-visual-review.json:2573` (path `incoming-images/videos/lv_0_20260307180457.mp4`) → canonical `incoming-images/videos/lv_0_20260307180457_211118.mp4`
- `config/media-visual-review.json:2590` (path `incoming-images/videos/lv_0_20260307180457.mp4`) → canonical `incoming-images/videos/lv_0_20260307180457_211118.mp4`
- `config/stream-media-catalog.json:3574` (path `incoming-images/videos/lv_0_20260307180457.mp4`) → canonical `incoming-images/videos/lv_0_20260307180457_211118.mp4`
- `config/stream-media-catalog.json:3576` (path `incoming-images/videos/lv_0_20260307180457.mp4`) → canonical `incoming-images/videos/lv_0_20260307180457_211118.mp4`
- `config/stream-media-catalog.json:831` (path `incoming-images/videos/lv_0_20260307180457.mp4`) → canonical `incoming-images/videos/lv_0_20260307180457_211118.mp4`
- `config/stream-media-catalog.json:832` (path `incoming-images/videos/lv_0_20260307180457.mp4`) → canonical `incoming-images/videos/lv_0_20260307180457_211118.mp4`
- `config/media-intake-overrides.json:687` `videos/lv_0_20260307180457.mp4` → `videos/lv_0_20260307180457_211118.mp4`
- … +3

### `d4ce3d7e5157…` · CANONICALIZABLE · 24.9 MB

| Pole | Hodnota |
|------|---------|
| **HASH** | `d4ce3d7e51574672d29a9a997a78b02d` |
| **ALL PATHS** | `incoming-images/videos/lv_0_20260309100507 (1).mp4` · `incoming-images/videos/lv_0_20260309100507.mp4` |
| **Proposed canonical** | `incoming-images/videos/lv_0_20260309100507.mp4` (score 75) |
| **Expected bytes saved** | 24.9 MB |
| **Risk** | low |
| **Post-canonical** | SAFE_DEDUP |
| **Důvod** | same content; path-only catalog duplication |

**Officialness ranking:**
- `incoming-images/videos/lv_0_20260309100507.mp4` → 75
- `incoming-images/videos/lv_0_20260309100507 (1).mp4` → 63

**Runtime refs (union):**
- `config/media-intake-overrides.json:719`
- `config/media-visual-review.json:2687`
- `config/media-visual-review.json:2688`
- `config/media-visual-review.json:2691`
- `config/media-visual-review.json:2709`
- `config/stream-media-catalog.json:1687`
- `config/stream-media-catalog.json:1688`
- `config/stream-media-catalog.json:4412`
- … +10

**media-intake-overrides refs:** config/media-intake-overrides.json:719, config/media-intake-overrides.json:727

**Other catalog refs:** config/stream-media-catalog.json:1687, config/stream-media-catalog.json:4412, config/media-visual-review.json:2687, config/stream-media-catalog.json:1701, config/stream-media-catalog.json:4438, config/media-visual-review.json:2717

**Refs to rewrite:** 13
- `config/media-intake-overrides.json:719` (path `incoming-images/videos/lv_0_20260309100507 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260309100507.mp4`
- `config/media-visual-review.json:2687` (path `incoming-images/videos/lv_0_20260309100507 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260309100507.mp4`
- `config/media-visual-review.json:2688` (path `incoming-images/videos/lv_0_20260309100507 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260309100507.mp4`
- `config/media-visual-review.json:2691` (path `incoming-images/videos/lv_0_20260309100507 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260309100507.mp4`
- `config/media-visual-review.json:2709` (path `incoming-images/videos/lv_0_20260309100507 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260309100507.mp4`
- `config/stream-media-catalog.json:1687` (path `incoming-images/videos/lv_0_20260309100507 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260309100507.mp4`
- `config/stream-media-catalog.json:1688` (path `incoming-images/videos/lv_0_20260309100507 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260309100507.mp4`
- `config/stream-media-catalog.json:4412` (path `incoming-images/videos/lv_0_20260309100507 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260309100507.mp4`
- `config/stream-media-catalog.json:4414` (path `incoming-images/videos/lv_0_20260309100507 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260309100507.mp4`
- `config/media-intake-overrides.json:719` `videos/lv_0_20260309100507 (1).mp4` → `videos/lv_0_20260309100507.mp4`
- … +3

### `4262300a0ca4…` · CANONICALIZABLE · 24.3 MB

| Pole | Hodnota |
|------|---------|
| **HASH** | `4262300a0ca483772d64cc45cd078217` |
| **ALL PATHS** | `incoming-images/videos/VID-20260319-WA0001_211251.mp4` · `incoming-images/videos/VID-20260319-WA0001.mp4` |
| **Proposed canonical** | `incoming-images/videos/VID-20260319-WA0001.mp4` (score 83) |
| **Expected bytes saved** | 24.3 MB |
| **Risk** | low |
| **Post-canonical** | SAFE_DEDUP |
| **Důvod** | same content; path-only catalog duplication |

**Officialness ranking:**
- `incoming-images/videos/VID-20260319-WA0001.mp4` → 83
- `incoming-images/videos/VID-20260319-WA0001_211251.mp4` → 75

**Runtime refs (union):**
- `config/media-intake-overrides.json:1143`
- `config/media-visual-review.json:4231`
- `config/media-visual-review.json:4232`
- `config/media-visual-review.json:4235`
- `config/media-visual-review.json:4252`
- `config/stream-media-catalog.json:1925`
- `config/stream-media-catalog.json:1926`
- `config/stream-media-catalog.json:8265`
- … +10

**media-intake-overrides refs:** config/media-intake-overrides.json:1143, config/media-intake-overrides.json:1151

**Other catalog refs:** config/stream-media-catalog.json:1925, config/stream-media-catalog.json:8265, config/media-visual-review.json:4231, config/stream-media-catalog.json:1911, config/stream-media-catalog.json:8239, config/media-visual-review.json:4260

**Refs to rewrite:** 13
- `config/media-intake-overrides.json:1143` (path `incoming-images/videos/VID-20260319-WA0001_211251.mp4`) → canonical `incoming-images/videos/VID-20260319-WA0001.mp4`
- `config/media-visual-review.json:4231` (path `incoming-images/videos/VID-20260319-WA0001_211251.mp4`) → canonical `incoming-images/videos/VID-20260319-WA0001.mp4`
- `config/media-visual-review.json:4232` (path `incoming-images/videos/VID-20260319-WA0001_211251.mp4`) → canonical `incoming-images/videos/VID-20260319-WA0001.mp4`
- `config/media-visual-review.json:4235` (path `incoming-images/videos/VID-20260319-WA0001_211251.mp4`) → canonical `incoming-images/videos/VID-20260319-WA0001.mp4`
- `config/media-visual-review.json:4252` (path `incoming-images/videos/VID-20260319-WA0001_211251.mp4`) → canonical `incoming-images/videos/VID-20260319-WA0001.mp4`
- `config/stream-media-catalog.json:1925` (path `incoming-images/videos/VID-20260319-WA0001_211251.mp4`) → canonical `incoming-images/videos/VID-20260319-WA0001.mp4`
- `config/stream-media-catalog.json:1926` (path `incoming-images/videos/VID-20260319-WA0001_211251.mp4`) → canonical `incoming-images/videos/VID-20260319-WA0001.mp4`
- `config/stream-media-catalog.json:8265` (path `incoming-images/videos/VID-20260319-WA0001_211251.mp4`) → canonical `incoming-images/videos/VID-20260319-WA0001.mp4`
- `config/stream-media-catalog.json:8267` (path `incoming-images/videos/VID-20260319-WA0001_211251.mp4`) → canonical `incoming-images/videos/VID-20260319-WA0001.mp4`
- `config/media-intake-overrides.json:1143` `videos/VID-20260319-WA0001_211251.mp4` → `videos/VID-20260319-WA0001.mp4`
- … +3

### `7c62df3ffddb…` · CANONICALIZABLE · 22.2 MB

| Pole | Hodnota |
|------|---------|
| **HASH** | `7c62df3ffddb3069e8be734e4609008e` |
| **ALL PATHS** | `incoming-images/videos/lv_7505688003600190773_20260130144313 (1).mp4` · `incoming-images/videos/lv_7505688003600190773_20260130144313.mp4` |
| **Proposed canonical** | `incoming-images/videos/lv_7505688003600190773_20260130144313.mp4` (score 75) |
| **Expected bytes saved** | 22.2 MB |
| **Risk** | low |
| **Post-canonical** | SAFE_DEDUP |
| **Důvod** | same content; path-only catalog duplication |

**Officialness ranking:**
- `incoming-images/videos/lv_7505688003600190773_20260130144313.mp4` → 75
- `incoming-images/videos/lv_7505688003600190773_20260130144313 (1).mp4` → 63

**Runtime refs (union):**
- `config/media-intake-overrides.json:775`
- `config/media-visual-review.json:2892`
- `config/media-visual-review.json:2893`
- `config/media-visual-review.json:2896`
- `config/media-visual-review.json:2913`
- `config/stream-media-catalog.json:3742`
- `config/stream-media-catalog.json:3744`
- `config/stream-media-catalog.json:395`
- … +10

**media-intake-overrides refs:** config/media-intake-overrides.json:775, config/media-intake-overrides.json:783

**Other catalog refs:** config/stream-media-catalog.json:395, config/stream-media-catalog.json:3742, config/media-visual-review.json:2892, config/stream-media-catalog.json:409, config/stream-media-catalog.json:3770, config/media-visual-review.json:2921

**Refs to rewrite:** 13
- `config/media-intake-overrides.json:775` (path `incoming-images/videos/lv_7505688003600190773_20260130144313 (1).mp4`) → canonical `incoming-images/videos/lv_7505688003600190773_20260130144313.mp4`
- `config/media-visual-review.json:2892` (path `incoming-images/videos/lv_7505688003600190773_20260130144313 (1).mp4`) → canonical `incoming-images/videos/lv_7505688003600190773_20260130144313.mp4`
- `config/media-visual-review.json:2893` (path `incoming-images/videos/lv_7505688003600190773_20260130144313 (1).mp4`) → canonical `incoming-images/videos/lv_7505688003600190773_20260130144313.mp4`
- `config/media-visual-review.json:2896` (path `incoming-images/videos/lv_7505688003600190773_20260130144313 (1).mp4`) → canonical `incoming-images/videos/lv_7505688003600190773_20260130144313.mp4`
- `config/media-visual-review.json:2913` (path `incoming-images/videos/lv_7505688003600190773_20260130144313 (1).mp4`) → canonical `incoming-images/videos/lv_7505688003600190773_20260130144313.mp4`
- `config/stream-media-catalog.json:3742` (path `incoming-images/videos/lv_7505688003600190773_20260130144313 (1).mp4`) → canonical `incoming-images/videos/lv_7505688003600190773_20260130144313.mp4`
- `config/stream-media-catalog.json:3744` (path `incoming-images/videos/lv_7505688003600190773_20260130144313 (1).mp4`) → canonical `incoming-images/videos/lv_7505688003600190773_20260130144313.mp4`
- `config/stream-media-catalog.json:395` (path `incoming-images/videos/lv_7505688003600190773_20260130144313 (1).mp4`) → canonical `incoming-images/videos/lv_7505688003600190773_20260130144313.mp4`
- `config/stream-media-catalog.json:396` (path `incoming-images/videos/lv_7505688003600190773_20260130144313 (1).mp4`) → canonical `incoming-images/videos/lv_7505688003600190773_20260130144313.mp4`
- `config/media-intake-overrides.json:775` `videos/lv_7505688003600190773_20260130144313 (1).mp4` → `videos/lv_7505688003600190773_20260130144313.mp4`
- … +3

### `6aeb113f737f…` · SEMANTIC_SPLIT · 21.9 MB

| Pole | Hodnota |
|------|---------|
| **HASH** | `6aeb113f737fdda934691266369d9cd4` |
| **ALL PATHS** | `incoming-images/videos_2/VID-20260318-WA0333.mp4` · `incoming-images/videos/VID-20260318-WA0333_211904.mp4` · `incoming-images/videos/VID-20260318-WA0333.mp4` |
| **Proposed canonical** | `incoming-images/videos_2/VID-20260318-WA0333.mp4` (score 192) |
| **Expected bytes saved** | 21.9 MB |
| **Risk** | medium — merge catalog semantics first |
| **Post-canonical** | — |
| **Důvod** | distinct intake semantics: T3|story_music|T3_VIDEO_09|prague_pixverse · T3|story_music||community_story |

**Officialness ranking:**
- `incoming-images/videos_2/VID-20260318-WA0333.mp4` → 192
- `incoming-images/videos/VID-20260318-WA0333.mp4` → 83
- `incoming-images/videos/VID-20260318-WA0333_211904.mp4` → 75

**Runtime refs (union):**
- `config/media-intake-overrides.json:1135`
- `config/media-intake-overrides.json:95`
- `config/media-visual-review.json:361`
- `config/media-visual-review.json:362`
- `config/media-visual-review.json:365`
- `config/media-visual-review.json:384`
- `config/media-visual-review.json:4202`
- `config/media-visual-review.json:4203`
- … +13

**media-intake-overrides refs:** config/media-intake-overrides.json:95, config/media-intake-overrides.json:1127, config/media-intake-overrides.json:1135

**Other catalog refs:** config/stream-media-catalog.json:1139, config/stream-media-catalog.json:3150, config/stream-media-catalog.json:4620, config/media-visual-review.json:361, config/videos_2-intake.json:73, config/stream-media-overrides.json:17

**Refs to rewrite:** 29
- `config/media-intake-overrides.json:1127` (path `incoming-images/videos/VID-20260318-WA0333_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260318-WA0333.mp4`
- `config/media-visual-review.json:4173` (path `incoming-images/videos/VID-20260318-WA0333_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260318-WA0333.mp4`
- `config/media-visual-review.json:4174` (path `incoming-images/videos/VID-20260318-WA0333_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260318-WA0333.mp4`
- `config/media-visual-review.json:4177` (path `incoming-images/videos/VID-20260318-WA0333_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260318-WA0333.mp4`
- `config/media-visual-review.json:4194` (path `incoming-images/videos/VID-20260318-WA0333_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260318-WA0333.mp4`
- `config/stream-media-catalog.json:1125` (path `incoming-images/videos/VID-20260318-WA0333_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260318-WA0333.mp4`
- `config/stream-media-catalog.json:1126` (path `incoming-images/videos/VID-20260318-WA0333_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260318-WA0333.mp4`
- `config/stream-media-catalog.json:4568` (path `incoming-images/videos/VID-20260318-WA0333_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260318-WA0333.mp4`
- `config/stream-media-catalog.json:4570` (path `incoming-images/videos/VID-20260318-WA0333_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260318-WA0333.mp4`
- `config/media-intake-overrides.json:1127` `videos/VID-20260318-WA0333_211904.mp4` → `videos_2/VID-20260318-WA0333.mp4`
- … +19

### `712e537d5566…` · CANONICALIZABLE · 21.0 MB

| Pole | Hodnota |
|------|---------|
| **HASH** | `712e537d5566d7b315b293c7ac824488` |
| **ALL PATHS** | `incoming-images/videos/lv_7412252754967547152_20260130143639 (1).mp4` · `incoming-images/videos/lv_7412252754967547152_20260130143639.mp4` |
| **Proposed canonical** | `incoming-images/videos/lv_7412252754967547152_20260130143639.mp4` (score 75) |
| **Expected bytes saved** | 21.0 MB |
| **Risk** | low |
| **Post-canonical** | SAFE_DEDUP |
| **Důvod** | same content; path-only catalog duplication |

**Officialness ranking:**
- `incoming-images/videos/lv_7412252754967547152_20260130143639.mp4` → 75
- `incoming-images/videos/lv_7412252754967547152_20260130143639 (1).mp4` → 63

**Runtime refs (union):**
- `config/media-intake-overrides.json:751`
- `config/media-visual-review.json:2805`
- `config/media-visual-review.json:2806`
- `config/media-visual-review.json:2809`
- `config/media-visual-review.json:2826`
- `config/stream-media-catalog.json:3658`
- `config/stream-media-catalog.json:3660`
- `config/stream-media-catalog.json:367`
- … +10

**media-intake-overrides refs:** config/media-intake-overrides.json:751, config/media-intake-overrides.json:759

**Other catalog refs:** config/stream-media-catalog.json:367, config/stream-media-catalog.json:3658, config/media-visual-review.json:2805, config/stream-media-catalog.json:381, config/stream-media-catalog.json:3686, config/media-visual-review.json:2834

**Refs to rewrite:** 13
- `config/media-intake-overrides.json:751` (path `incoming-images/videos/lv_7412252754967547152_20260130143639 (1).mp4`) → canonical `incoming-images/videos/lv_7412252754967547152_20260130143639.mp4`
- `config/media-visual-review.json:2805` (path `incoming-images/videos/lv_7412252754967547152_20260130143639 (1).mp4`) → canonical `incoming-images/videos/lv_7412252754967547152_20260130143639.mp4`
- `config/media-visual-review.json:2806` (path `incoming-images/videos/lv_7412252754967547152_20260130143639 (1).mp4`) → canonical `incoming-images/videos/lv_7412252754967547152_20260130143639.mp4`
- `config/media-visual-review.json:2809` (path `incoming-images/videos/lv_7412252754967547152_20260130143639 (1).mp4`) → canonical `incoming-images/videos/lv_7412252754967547152_20260130143639.mp4`
- `config/media-visual-review.json:2826` (path `incoming-images/videos/lv_7412252754967547152_20260130143639 (1).mp4`) → canonical `incoming-images/videos/lv_7412252754967547152_20260130143639.mp4`
- `config/stream-media-catalog.json:3658` (path `incoming-images/videos/lv_7412252754967547152_20260130143639 (1).mp4`) → canonical `incoming-images/videos/lv_7412252754967547152_20260130143639.mp4`
- `config/stream-media-catalog.json:3660` (path `incoming-images/videos/lv_7412252754967547152_20260130143639 (1).mp4`) → canonical `incoming-images/videos/lv_7412252754967547152_20260130143639.mp4`
- `config/stream-media-catalog.json:367` (path `incoming-images/videos/lv_7412252754967547152_20260130143639 (1).mp4`) → canonical `incoming-images/videos/lv_7412252754967547152_20260130143639.mp4`
- `config/stream-media-catalog.json:368` (path `incoming-images/videos/lv_7412252754967547152_20260130143639 (1).mp4`) → canonical `incoming-images/videos/lv_7412252754967547152_20260130143639.mp4`
- `config/media-intake-overrides.json:751` `videos/lv_7412252754967547152_20260130143639 (1).mp4` → `videos/lv_7412252754967547152_20260130143639.mp4`
- … +3

### `01f89773e3fb…` · SEMANTIC_SPLIT · 20.5 MB

| Pole | Hodnota |
|------|---------|
| **HASH** | `01f89773e3fb3421db29c3a90fac3c18` |
| **ALL PATHS** | `incoming-images/videos/2026-02-17-121129193_180745.mp4` · `incoming-images/videos/2026-02-17-121129193_181050.mp4` · `incoming-images/videos/2026-02-17-121129193.mp4` |
| **Proposed canonical** | `incoming-images/videos/2026-02-17-121129193.mp4` (score 83) |
| **Expected bytes saved** | 20.5 MB |
| **Risk** | medium — merge catalog semantics first |
| **Post-canonical** | — |
| **Důvod** | distinct intake semantics: T3|story_music||other · T3|story_music||capcut_story |

**Officialness ranking:**
- `incoming-images/videos/2026-02-17-121129193.mp4` → 83
- `incoming-images/videos/2026-02-17-121129193_180745.mp4` → 75
- `incoming-images/videos/2026-02-17-121129193_181050.mp4` → 75

**Runtime refs (union):**
- `config/media-intake-overrides.json:287`
- `config/media-visual-review.json:1057`
- `config/media-visual-review.json:1058`
- `config/media-visual-review.json:1061`
- `config/media-visual-review.json:1077`
- `config/stream-media-catalog.json:1559`
- `config/stream-media-catalog.json:1560`
- `config/stream-media-catalog.json:9160`
- … +19

**media-intake-overrides refs:** config/media-intake-overrides.json:287, config/media-intake-overrides.json:295, config/media-intake-overrides.json:303

**Other catalog refs:** config/stream-media-catalog.json:1559, config/stream-media-catalog.json:9160, config/media-visual-review.json:1057, config/stream-media-catalog.json:1573, config/stream-media-catalog.json:9186, config/media-visual-review.json:1085

**Refs to rewrite:** 26
- `config/media-intake-overrides.json:287` (path `incoming-images/videos/2026-02-17-121129193_180745.mp4`) → canonical `incoming-images/videos/2026-02-17-121129193.mp4`
- `config/media-visual-review.json:1057` (path `incoming-images/videos/2026-02-17-121129193_180745.mp4`) → canonical `incoming-images/videos/2026-02-17-121129193.mp4`
- `config/media-visual-review.json:1058` (path `incoming-images/videos/2026-02-17-121129193_180745.mp4`) → canonical `incoming-images/videos/2026-02-17-121129193.mp4`
- `config/media-visual-review.json:1061` (path `incoming-images/videos/2026-02-17-121129193_180745.mp4`) → canonical `incoming-images/videos/2026-02-17-121129193.mp4`
- `config/media-visual-review.json:1077` (path `incoming-images/videos/2026-02-17-121129193_180745.mp4`) → canonical `incoming-images/videos/2026-02-17-121129193.mp4`
- `config/stream-media-catalog.json:1559` (path `incoming-images/videos/2026-02-17-121129193_180745.mp4`) → canonical `incoming-images/videos/2026-02-17-121129193.mp4`
- `config/stream-media-catalog.json:1560` (path `incoming-images/videos/2026-02-17-121129193_180745.mp4`) → canonical `incoming-images/videos/2026-02-17-121129193.mp4`
- `config/stream-media-catalog.json:9160` (path `incoming-images/videos/2026-02-17-121129193_180745.mp4`) → canonical `incoming-images/videos/2026-02-17-121129193.mp4`
- `config/stream-media-catalog.json:9162` (path `incoming-images/videos/2026-02-17-121129193_180745.mp4`) → canonical `incoming-images/videos/2026-02-17-121129193.mp4`
- `config/media-intake-overrides.json:287` `videos/2026-02-17-121129193_180745.mp4` → `videos/2026-02-17-121129193.mp4`
- … +16

### `207d2a684b41…` · CANONICALIZABLE · 13.2 MB

| Pole | Hodnota |
|------|---------|
| **HASH** | `207d2a684b4191afdc9e8c692f767ca6` |
| **ALL PATHS** | `incoming-images/videos/lv_0_20260129173032 (1).mp4` · `incoming-images/videos/lv_0_20260129173032.mp4` |
| **Proposed canonical** | `incoming-images/videos/lv_0_20260129173032.mp4` (score 75) |
| **Expected bytes saved** | 13.2 MB |
| **Risk** | low |
| **Post-canonical** | SAFE_DEDUP |
| **Důvod** | same content; path-only catalog duplication |

**Officialness ranking:**
- `incoming-images/videos/lv_0_20260129173032.mp4` → 75
- `incoming-images/videos/lv_0_20260129173032 (1).mp4` → 63

**Runtime refs (union):**
- `config/media-intake-overrides.json:487`
- `config/media-visual-review.json:1809`
- `config/media-visual-review.json:1810`
- `config/media-visual-review.json:1813`
- `config/media-visual-review.json:1830`
- `config/stream-media-catalog.json:339`
- `config/stream-media-catalog.json:340`
- `config/stream-media-catalog.json:3490`
- … +10

**media-intake-overrides refs:** config/media-intake-overrides.json:487, config/media-intake-overrides.json:495

**Other catalog refs:** config/stream-media-catalog.json:339, config/stream-media-catalog.json:3490, config/media-visual-review.json:1809, config/stream-media-catalog.json:353, config/stream-media-catalog.json:3518, config/media-visual-review.json:1838

**Refs to rewrite:** 13
- `config/media-intake-overrides.json:487` (path `incoming-images/videos/lv_0_20260129173032 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260129173032.mp4`
- `config/media-visual-review.json:1809` (path `incoming-images/videos/lv_0_20260129173032 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260129173032.mp4`
- `config/media-visual-review.json:1810` (path `incoming-images/videos/lv_0_20260129173032 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260129173032.mp4`
- `config/media-visual-review.json:1813` (path `incoming-images/videos/lv_0_20260129173032 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260129173032.mp4`
- `config/media-visual-review.json:1830` (path `incoming-images/videos/lv_0_20260129173032 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260129173032.mp4`
- `config/stream-media-catalog.json:339` (path `incoming-images/videos/lv_0_20260129173032 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260129173032.mp4`
- `config/stream-media-catalog.json:340` (path `incoming-images/videos/lv_0_20260129173032 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260129173032.mp4`
- `config/stream-media-catalog.json:3490` (path `incoming-images/videos/lv_0_20260129173032 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260129173032.mp4`
- `config/stream-media-catalog.json:3492` (path `incoming-images/videos/lv_0_20260129173032 (1).mp4`) → canonical `incoming-images/videos/lv_0_20260129173032.mp4`
- `config/media-intake-overrides.json:487` `videos/lv_0_20260129173032 (1).mp4` → `videos/lv_0_20260129173032.mp4`
- … +3

### `aee66c40af2f…` · SEMANTIC_SPLIT · 4.5 MB

| Pole | Hodnota |
|------|---------|
| **HASH** | `aee66c40af2fb5016b82a375529d848b` |
| **ALL PATHS** | `incoming-images/videos/lv_0_20260131151957_175058.mp4` · `incoming-images/videos/lv_0_20260131151957.mp4` |
| **Proposed canonical** | `incoming-images/videos/lv_0_20260131151957.mp4` (score 191) |
| **Expected bytes saved** | 4.5 MB |
| **Risk** | medium — merge catalog semantics first |
| **Post-canonical** | — |
| **Důvod** | distinct intake semantics: T2|donator_moment||lv_short · T2|donator_moment|T2_VIDEO_09|action_sport |

**Officialness ranking:**
- `incoming-images/videos/lv_0_20260131151957.mp4` → 191
- `incoming-images/videos/lv_0_20260131151957_175058.mp4` → 75

**Runtime refs (union):**
- `config/media-intake-overrides.json:511`
- `config/media-visual-review.json:1896`
- `config/media-visual-review.json:1897`
- `config/media-visual-review.json:1900`
- `config/media-visual-review.json:1917`
- `config/stream-media-catalog.json:563`
- `config/stream-media-catalog.json:564`
- `config/stream-media-catalog.json:6465`
- … +13

**media-intake-overrides refs:** config/media-intake-overrides.json:511, config/media-intake-overrides.json:519

**Other catalog refs:** config/stream-media-catalog.json:563, config/stream-media-catalog.json:6465, config/media-visual-review.json:1896, config/stream-media-catalog.json:549, config/stream-media-catalog.json:3120, config/stream-media-catalog.json:6439

**Refs to rewrite:** 13
- `config/media-intake-overrides.json:511` (path `incoming-images/videos/lv_0_20260131151957_175058.mp4`) → canonical `incoming-images/videos/lv_0_20260131151957.mp4`
- `config/media-visual-review.json:1896` (path `incoming-images/videos/lv_0_20260131151957_175058.mp4`) → canonical `incoming-images/videos/lv_0_20260131151957.mp4`
- `config/media-visual-review.json:1897` (path `incoming-images/videos/lv_0_20260131151957_175058.mp4`) → canonical `incoming-images/videos/lv_0_20260131151957.mp4`
- `config/media-visual-review.json:1900` (path `incoming-images/videos/lv_0_20260131151957_175058.mp4`) → canonical `incoming-images/videos/lv_0_20260131151957.mp4`
- `config/media-visual-review.json:1917` (path `incoming-images/videos/lv_0_20260131151957_175058.mp4`) → canonical `incoming-images/videos/lv_0_20260131151957.mp4`
- `config/stream-media-catalog.json:563` (path `incoming-images/videos/lv_0_20260131151957_175058.mp4`) → canonical `incoming-images/videos/lv_0_20260131151957.mp4`
- `config/stream-media-catalog.json:564` (path `incoming-images/videos/lv_0_20260131151957_175058.mp4`) → canonical `incoming-images/videos/lv_0_20260131151957.mp4`
- `config/stream-media-catalog.json:6465` (path `incoming-images/videos/lv_0_20260131151957_175058.mp4`) → canonical `incoming-images/videos/lv_0_20260131151957.mp4`
- `config/stream-media-catalog.json:6467` (path `incoming-images/videos/lv_0_20260131151957_175058.mp4`) → canonical `incoming-images/videos/lv_0_20260131151957.mp4`
- `config/media-intake-overrides.json:511` `videos/lv_0_20260131151957_175058.mp4` → `videos/lv_0_20260131151957.mp4`
- … +3

### `f691fcd93e32…` · SEMANTIC_SPLIT · 4.4 MB

| Pole | Hodnota |
|------|---------|
| **HASH** | `f691fcd93e321f1ade63387ecc9c960c` |
| **ALL PATHS** | `incoming-images/videos/2026-01-31-202404755_175510.mp4` · `incoming-images/videos/2026-01-31-202404755.mp4` |
| **Proposed canonical** | `incoming-images/videos/2026-01-31-202404755.mp4` (score 83) |
| **Expected bytes saved** | 4.4 MB |
| **Risk** | medium — merge catalog semantics first |
| **Post-canonical** | — |
| **Důvod** | distinct intake semantics: T3|story_music||other · T3|story_music||capcut_story |

**Officialness ranking:**
- `incoming-images/videos/2026-01-31-202404755.mp4` → 83
- `incoming-images/videos/2026-01-31-202404755_175510.mp4` → 75

**Runtime refs (union):**
- `config/media-intake-overrides.json:183`
- `config/media-visual-review.json:680`
- `config/media-visual-review.json:681`
- `config/media-visual-review.json:684`
- `config/media-visual-review.json:700`
- `config/stream-media-catalog.json:1545`
- `config/stream-media-catalog.json:1546`
- `config/stream-media-catalog.json:9134`
- … +10

**media-intake-overrides refs:** config/media-intake-overrides.json:183, config/media-intake-overrides.json:191

**Other catalog refs:** config/stream-media-catalog.json:1545, config/stream-media-catalog.json:9134, config/media-visual-review.json:680, config/stream-media-catalog.json:1447, config/stream-media-catalog.json:8603, config/media-visual-review.json:708

**Refs to rewrite:** 13
- `config/media-intake-overrides.json:183` (path `incoming-images/videos/2026-01-31-202404755_175510.mp4`) → canonical `incoming-images/videos/2026-01-31-202404755.mp4`
- `config/media-visual-review.json:680` (path `incoming-images/videos/2026-01-31-202404755_175510.mp4`) → canonical `incoming-images/videos/2026-01-31-202404755.mp4`
- `config/media-visual-review.json:681` (path `incoming-images/videos/2026-01-31-202404755_175510.mp4`) → canonical `incoming-images/videos/2026-01-31-202404755.mp4`
- `config/media-visual-review.json:684` (path `incoming-images/videos/2026-01-31-202404755_175510.mp4`) → canonical `incoming-images/videos/2026-01-31-202404755.mp4`
- `config/media-visual-review.json:700` (path `incoming-images/videos/2026-01-31-202404755_175510.mp4`) → canonical `incoming-images/videos/2026-01-31-202404755.mp4`
- `config/stream-media-catalog.json:1545` (path `incoming-images/videos/2026-01-31-202404755_175510.mp4`) → canonical `incoming-images/videos/2026-01-31-202404755.mp4`
- `config/stream-media-catalog.json:1546` (path `incoming-images/videos/2026-01-31-202404755_175510.mp4`) → canonical `incoming-images/videos/2026-01-31-202404755.mp4`
- `config/stream-media-catalog.json:9134` (path `incoming-images/videos/2026-01-31-202404755_175510.mp4`) → canonical `incoming-images/videos/2026-01-31-202404755.mp4`
- `config/stream-media-catalog.json:9136` (path `incoming-images/videos/2026-01-31-202404755_175510.mp4`) → canonical `incoming-images/videos/2026-01-31-202404755.mp4`
- `config/media-intake-overrides.json:183` `videos/2026-01-31-202404755_175510.mp4` → `videos/2026-01-31-202404755.mp4`
- … +3

### `3e2ad542cf80…` · AMBIGUOUS · 2.9 MB

| Pole | Hodnota |
|------|---------|
| **HASH** | `3e2ad542cf8049e9ae954e41654764b5` |
| **ALL PATHS** | `incoming-images/videos/lv_7351466693492837650_20260302151200_183032.mp4` · `incoming-images/videos/lv_7351466693492837650_20260302151200.mp4` |
| **Proposed canonical** | `incoming-images/videos/lv_7351466693492837650_20260302151200_183032.mp4` (score 75) |
| **Expected bytes saved** | 2.9 MB |
| **Risk** | medium |
| **Post-canonical** | — |
| **Důvod** | officialness tie 75 vs 75 |

**Officialness ranking:**
- `incoming-images/videos/lv_7351466693492837650_20260302151200_183032.mp4` → 75
- `incoming-images/videos/lv_7351466693492837650_20260302151200.mp4` → 75

**Runtime refs (union):**
- `config/media-intake-overrides.json:735`
- `config/media-visual-review.json:2747`
- `config/media-visual-review.json:2748`
- `config/media-visual-review.json:2751`
- `config/media-visual-review.json:2768`
- `config/stream-media-catalog.json:633`
- `config/stream-media-catalog.json:634`
- `config/stream-media-catalog.json:8083`
- … +10

**media-intake-overrides refs:** config/media-intake-overrides.json:735, config/media-intake-overrides.json:743

**Other catalog refs:** config/stream-media-catalog.json:633, config/stream-media-catalog.json:8083, config/media-visual-review.json:2747, config/stream-media-catalog.json:619, config/stream-media-catalog.json:8057, config/media-visual-review.json:2776

**Refs to rewrite:** 13
- `config/media-intake-overrides.json:743` (path `incoming-images/videos/lv_7351466693492837650_20260302151200.mp4`) → canonical `incoming-images/videos/lv_7351466693492837650_20260302151200_183032.mp4`
- `config/media-visual-review.json:2776` (path `incoming-images/videos/lv_7351466693492837650_20260302151200.mp4`) → canonical `incoming-images/videos/lv_7351466693492837650_20260302151200_183032.mp4`
- `config/media-visual-review.json:2777` (path `incoming-images/videos/lv_7351466693492837650_20260302151200.mp4`) → canonical `incoming-images/videos/lv_7351466693492837650_20260302151200_183032.mp4`
- `config/media-visual-review.json:2780` (path `incoming-images/videos/lv_7351466693492837650_20260302151200.mp4`) → canonical `incoming-images/videos/lv_7351466693492837650_20260302151200_183032.mp4`
- `config/media-visual-review.json:2797` (path `incoming-images/videos/lv_7351466693492837650_20260302151200.mp4`) → canonical `incoming-images/videos/lv_7351466693492837650_20260302151200_183032.mp4`
- `config/stream-media-catalog.json:619` (path `incoming-images/videos/lv_7351466693492837650_20260302151200.mp4`) → canonical `incoming-images/videos/lv_7351466693492837650_20260302151200_183032.mp4`
- `config/stream-media-catalog.json:620` (path `incoming-images/videos/lv_7351466693492837650_20260302151200.mp4`) → canonical `incoming-images/videos/lv_7351466693492837650_20260302151200_183032.mp4`
- `config/stream-media-catalog.json:8057` (path `incoming-images/videos/lv_7351466693492837650_20260302151200.mp4`) → canonical `incoming-images/videos/lv_7351466693492837650_20260302151200_183032.mp4`
- `config/stream-media-catalog.json:8059` (path `incoming-images/videos/lv_7351466693492837650_20260302151200.mp4`) → canonical `incoming-images/videos/lv_7351466693492837650_20260302151200_183032.mp4`
- `config/media-intake-overrides.json:743` `videos/lv_7351466693492837650_20260302151200.mp4` → `videos/lv_7351466693492837650_20260302151200_183032.mp4`
- … +3

### `b6a2bb47070d…` · SEMANTIC_SPLIT · 1.7 MB

| Pole | Hodnota |
|------|---------|
| **HASH** | `b6a2bb47070da2920118526393027759` |
| **ALL PATHS** | `incoming-images/videos/hailuo_1769864687 (1).mp4` · `incoming-images/videos/hailuo_1769864687.mp4` |
| **Proposed canonical** | `incoming-images/videos/hailuo_1769864687.mp4` (score 191) |
| **Expected bytes saved** | 1.7 MB |
| **Risk** | medium — merge catalog semantics first |
| **Post-canonical** | — |
| **Důvod** | distinct intake semantics: T1|short_animation|T1_VIDEO_02|cute_ai · T1|short_animation|T1_VIDEO_03|cute_ai |

**Officialness ranking:**
- `incoming-images/videos/hailuo_1769864687.mp4` → 191
- `incoming-images/videos/hailuo_1769864687 (1).mp4` → 179

**Runtime refs (union):**
- `config/media-intake-overrides.json:447`
- `config/media-visual-review.json:1655`
- `config/media-visual-review.json:1656`
- `config/media-visual-review.json:1659`
- `config/media-visual-review.json:1678`
- `config/stream-media-catalog.json:267`
- `config/stream-media-catalog.json:268`
- `config/stream-media-catalog.json:2985`
- … +16

**media-intake-overrides refs:** config/media-intake-overrides.json:447, config/media-intake-overrides.json:455

**Other catalog refs:** config/stream-media-catalog.json:267, config/stream-media-catalog.json:2985, config/stream-media-catalog.json:5742, config/media-visual-review.json:1655, config/stream-media-overrides.json:6, config/stream-media-overrides.json:?

**Refs to rewrite:** 19
- `config/media-intake-overrides.json:447` (path `incoming-images/videos/hailuo_1769864687 (1).mp4`) → canonical `incoming-images/videos/hailuo_1769864687.mp4`
- `config/media-visual-review.json:1655` (path `incoming-images/videos/hailuo_1769864687 (1).mp4`) → canonical `incoming-images/videos/hailuo_1769864687.mp4`
- `config/media-visual-review.json:1656` (path `incoming-images/videos/hailuo_1769864687 (1).mp4`) → canonical `incoming-images/videos/hailuo_1769864687.mp4`
- `config/media-visual-review.json:1659` (path `incoming-images/videos/hailuo_1769864687 (1).mp4`) → canonical `incoming-images/videos/hailuo_1769864687.mp4`
- `config/media-visual-review.json:1678` (path `incoming-images/videos/hailuo_1769864687 (1).mp4`) → canonical `incoming-images/videos/hailuo_1769864687.mp4`
- `config/stream-media-catalog.json:267` (path `incoming-images/videos/hailuo_1769864687 (1).mp4`) → canonical `incoming-images/videos/hailuo_1769864687.mp4`
- `config/stream-media-catalog.json:268` (path `incoming-images/videos/hailuo_1769864687 (1).mp4`) → canonical `incoming-images/videos/hailuo_1769864687.mp4`
- `config/stream-media-catalog.json:2985` (path `incoming-images/videos/hailuo_1769864687 (1).mp4`) → canonical `incoming-images/videos/hailuo_1769864687.mp4`
- `config/stream-media-catalog.json:2986` (path `incoming-images/videos/hailuo_1769864687 (1).mp4`) → canonical `incoming-images/videos/hailuo_1769864687.mp4`
- `config/stream-media-catalog.json:5742` (path `incoming-images/videos/hailuo_1769864687 (1).mp4`) → canonical `incoming-images/videos/hailuo_1769864687.mp4`
- … +9

### `93448472998b…` · CANONICALIZABLE · 1.6 MB

| Pole | Hodnota |
|------|---------|
| **HASH** | `93448472998b7ed657e8c905c5473dc1` |
| **ALL PATHS** | `incoming-images/videos/VID-20260419-WA0028 (1).mp4` · `incoming-images/videos/VID-20260419-WA0028_211222.mp4` · `incoming-images/videos/VID-20260419-WA0028.mp4` |
| **Proposed canonical** | `incoming-images/videos/VID-20260419-WA0028.mp4` (score 83) |
| **Expected bytes saved** | 1.6 MB |
| **Risk** | low |
| **Post-canonical** | SAFE_DEDUP |
| **Důvod** | same content; path-only catalog duplication |

**Officialness ranking:**
- `incoming-images/videos/VID-20260419-WA0028.mp4` → 83
- `incoming-images/videos/VID-20260419-WA0028_211222.mp4` → 75
- `incoming-images/videos/VID-20260419-WA0028 (1).mp4` → 71

**Runtime refs (union):**
- `config/media-intake-overrides.json:1303`
- `config/media-visual-review.json:4810`
- `config/media-visual-review.json:4811`
- `config/media-visual-review.json:4814`
- `config/media-visual-review.json:4831`
- `config/stream-media-catalog.json:2587`
- `config/stream-media-catalog.json:2588`
- `config/stream-media-catalog.json:7355`
- … +19

**media-intake-overrides refs:** config/media-intake-overrides.json:1303, config/media-intake-overrides.json:1311, config/media-intake-overrides.json:1319

**Other catalog refs:** config/stream-media-catalog.json:2587, config/stream-media-catalog.json:7355, config/media-visual-review.json:4810, config/stream-media-catalog.json:2615, config/stream-media-catalog.json:7407, config/media-visual-review.json:4839

**Refs to rewrite:** 26
- `config/media-intake-overrides.json:1303` (path `incoming-images/videos/VID-20260419-WA0028 (1).mp4`) → canonical `incoming-images/videos/VID-20260419-WA0028.mp4`
- `config/media-visual-review.json:4810` (path `incoming-images/videos/VID-20260419-WA0028 (1).mp4`) → canonical `incoming-images/videos/VID-20260419-WA0028.mp4`
- `config/media-visual-review.json:4811` (path `incoming-images/videos/VID-20260419-WA0028 (1).mp4`) → canonical `incoming-images/videos/VID-20260419-WA0028.mp4`
- `config/media-visual-review.json:4814` (path `incoming-images/videos/VID-20260419-WA0028 (1).mp4`) → canonical `incoming-images/videos/VID-20260419-WA0028.mp4`
- `config/media-visual-review.json:4831` (path `incoming-images/videos/VID-20260419-WA0028 (1).mp4`) → canonical `incoming-images/videos/VID-20260419-WA0028.mp4`
- `config/stream-media-catalog.json:2587` (path `incoming-images/videos/VID-20260419-WA0028 (1).mp4`) → canonical `incoming-images/videos/VID-20260419-WA0028.mp4`
- `config/stream-media-catalog.json:2588` (path `incoming-images/videos/VID-20260419-WA0028 (1).mp4`) → canonical `incoming-images/videos/VID-20260419-WA0028.mp4`
- `config/stream-media-catalog.json:7355` (path `incoming-images/videos/VID-20260419-WA0028 (1).mp4`) → canonical `incoming-images/videos/VID-20260419-WA0028.mp4`
- `config/stream-media-catalog.json:7357` (path `incoming-images/videos/VID-20260419-WA0028 (1).mp4`) → canonical `incoming-images/videos/VID-20260419-WA0028.mp4`
- `config/media-intake-overrides.json:1303` `videos/VID-20260419-WA0028 (1).mp4` → `videos/VID-20260419-WA0028.mp4`
- … +16

### `c25d05bb0251…` · SEMANTIC_SPLIT · 1.5 MB

| Pole | Hodnota |
|------|---------|
| **HASH** | `c25d05bb025174636a54818cb7573e31` |
| **ALL PATHS** | `incoming-images/videos_2/VID-20260419-WA0095.mp4` · `incoming-images/videos/VID-20260419-WA0095_211904.mp4` · `incoming-images/videos/VID-20260419-WA0095.mp4` |
| **Proposed canonical** | `incoming-images/videos_2/VID-20260419-WA0095.mp4` (score 192) |
| **Expected bytes saved** | 1.5 MB |
| **Risk** | medium — merge catalog semantics first |
| **Post-canonical** | — |
| **Důvod** | distinct intake semantics: PROFILE|profile_reel|PROFILE_VIDEO_02|cute_profile · PROFILE|profile_reel||community_profile |

**Officialness ranking:**
- `incoming-images/videos_2/VID-20260419-WA0095.mp4` → 192
- `incoming-images/videos/VID-20260419-WA0095.mp4` → 83
- `incoming-images/videos/VID-20260419-WA0095_211904.mp4` → 75

**Runtime refs (union):**
- `config/media-intake-overrides.json:111`
- `config/media-intake-overrides.json:1495`
- `config/media-visual-review.json:422`
- `config/media-visual-review.json:423`
- `config/media-visual-review.json:426`
- `config/media-visual-review.json:445`
- `config/media-visual-review.json:5506`
- `config/media-visual-review.json:5507`
- … +13

**media-intake-overrides refs:** config/media-intake-overrides.json:111, config/media-intake-overrides.json:1487, config/media-intake-overrides.json:1495

**Other catalog refs:** config/stream-media-catalog.json:2923, config/stream-media-catalog.json:3389, config/stream-media-catalog.json:7979, config/media-visual-review.json:422, config/videos_2-intake.json:97, config/stream-media-overrides.json:33

**Refs to rewrite:** 29
- `config/media-intake-overrides.json:1487` (path `incoming-images/videos/VID-20260419-WA0095_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260419-WA0095.mp4`
- `config/media-visual-review.json:5477` (path `incoming-images/videos/VID-20260419-WA0095_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260419-WA0095.mp4`
- `config/media-visual-review.json:5478` (path `incoming-images/videos/VID-20260419-WA0095_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260419-WA0095.mp4`
- `config/media-visual-review.json:5481` (path `incoming-images/videos/VID-20260419-WA0095_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260419-WA0095.mp4`
- `config/media-visual-review.json:5498` (path `incoming-images/videos/VID-20260419-WA0095_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260419-WA0095.mp4`
- `config/stream-media-catalog.json:2895` (path `incoming-images/videos/VID-20260419-WA0095_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260419-WA0095.mp4`
- `config/stream-media-catalog.json:2896` (path `incoming-images/videos/VID-20260419-WA0095_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260419-WA0095.mp4`
- `config/stream-media-catalog.json:7927` (path `incoming-images/videos/VID-20260419-WA0095_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260419-WA0095.mp4`
- `config/stream-media-catalog.json:7929` (path `incoming-images/videos/VID-20260419-WA0095_211904.mp4`) → canonical `incoming-images/videos_2/VID-20260419-WA0095.mp4`
- `config/media-intake-overrides.json:1487` `videos/VID-20260419-WA0095_211904.mp4` → `videos_2/VID-20260419-WA0095.mp4`
- … +19

### `87a053e930b4…` · SEMANTIC_SPLIT · 999.7 KB

| Pole | Hodnota |
|------|---------|
| **HASH** | `87a053e930b42159fda5096a5f4bd205` |
| **ALL PATHS** | `incoming-images/videos/2026-03-05-184341058 (1).mp4` · `incoming-images/videos/2026-03-05-184341058.mp4` |
| **Proposed canonical** | `incoming-images/videos/2026-03-05-184341058.mp4` (score 83) |
| **Expected bytes saved** | 999.7 KB |
| **Risk** | medium — merge catalog semantics first |
| **Post-canonical** | — |
| **Důvod** | distinct intake semantics: T2|quote_clip||other · T2|donator_moment||capcut_short |

**Officialness ranking:**
- `incoming-images/videos/2026-03-05-184341058.mp4` → 83
- `incoming-images/videos/2026-03-05-184341058 (1).mp4` → 71

**Runtime refs (union):**
- `config/media-intake-overrides.json:383`
- `config/media-visual-review.json:1432`
- `config/media-visual-review.json:1433`
- `config/media-visual-review.json:1436`
- `config/media-visual-review.json:1452`
- `config/stream-media-catalog.json:787`
- `config/stream-media-catalog.json:788`
- `config/stream-media-catalog.json:9212`
- … +10

**media-intake-overrides refs:** config/media-intake-overrides.json:383, config/media-intake-overrides.json:391

**Other catalog refs:** config/stream-media-catalog.json:787, config/stream-media-catalog.json:9212, config/media-visual-review.json:1432, config/stream-media-catalog.json:745, config/stream-media-catalog.json:8863, config/media-visual-review.json:1460

**Refs to rewrite:** 13
- `config/media-intake-overrides.json:383` (path `incoming-images/videos/2026-03-05-184341058 (1).mp4`) → canonical `incoming-images/videos/2026-03-05-184341058.mp4`
- `config/media-visual-review.json:1432` (path `incoming-images/videos/2026-03-05-184341058 (1).mp4`) → canonical `incoming-images/videos/2026-03-05-184341058.mp4`
- `config/media-visual-review.json:1433` (path `incoming-images/videos/2026-03-05-184341058 (1).mp4`) → canonical `incoming-images/videos/2026-03-05-184341058.mp4`
- `config/media-visual-review.json:1436` (path `incoming-images/videos/2026-03-05-184341058 (1).mp4`) → canonical `incoming-images/videos/2026-03-05-184341058.mp4`
- `config/media-visual-review.json:1452` (path `incoming-images/videos/2026-03-05-184341058 (1).mp4`) → canonical `incoming-images/videos/2026-03-05-184341058.mp4`
- `config/stream-media-catalog.json:787` (path `incoming-images/videos/2026-03-05-184341058 (1).mp4`) → canonical `incoming-images/videos/2026-03-05-184341058.mp4`
- `config/stream-media-catalog.json:788` (path `incoming-images/videos/2026-03-05-184341058 (1).mp4`) → canonical `incoming-images/videos/2026-03-05-184341058.mp4`
- `config/stream-media-catalog.json:9212` (path `incoming-images/videos/2026-03-05-184341058 (1).mp4`) → canonical `incoming-images/videos/2026-03-05-184341058.mp4`
- `config/stream-media-catalog.json:9214` (path `incoming-images/videos/2026-03-05-184341058 (1).mp4`) → canonical `incoming-images/videos/2026-03-05-184341058.mp4`
- `config/media-intake-overrides.json:383` `videos/2026-03-05-184341058 (1).mp4` → `videos/2026-03-05-184341058.mp4`
- … +3

### `b05fff488875…` · CANONICALIZABLE · 865.3 KB

| Pole | Hodnota |
|------|---------|
| **HASH** | `b05fff488875b3ac6aaa2031dd44de07` |
| **ALL PATHS** | `incoming-images/videos/VID-20260419-WA0065_205035.mp4` · `incoming-images/videos/VID-20260419-WA0065.mp4` |
| **Proposed canonical** | `incoming-images/videos/VID-20260419-WA0065.mp4` (score 83) |
| **Expected bytes saved** | 865.3 KB |
| **Risk** | low |
| **Post-canonical** | SAFE_DEDUP |
| **Důvod** | same content; path-only catalog duplication |

**Officialness ranking:**
- `incoming-images/videos/VID-20260419-WA0065.mp4` → 83
- `incoming-images/videos/VID-20260419-WA0065_205035.mp4` → 75

**Runtime refs (union):**
- `config/media-intake-overrides.json:1439`
- `config/media-visual-review.json:5303`
- `config/media-visual-review.json:5304`
- `config/media-visual-review.json:5307`
- `config/media-visual-review.json:5324`
- `config/stream-media-catalog.json:2839`
- `config/stream-media-catalog.json:2840`
- `config/stream-media-catalog.json:7823`
- … +10

**media-intake-overrides refs:** config/media-intake-overrides.json:1439, config/media-intake-overrides.json:1447

**Other catalog refs:** config/stream-media-catalog.json:2839, config/stream-media-catalog.json:7823, config/media-visual-review.json:5303, config/stream-media-catalog.json:2825, config/stream-media-catalog.json:7797, config/media-visual-review.json:5332

**Refs to rewrite:** 13
- `config/media-intake-overrides.json:1439` (path `incoming-images/videos/VID-20260419-WA0065_205035.mp4`) → canonical `incoming-images/videos/VID-20260419-WA0065.mp4`
- `config/media-visual-review.json:5303` (path `incoming-images/videos/VID-20260419-WA0065_205035.mp4`) → canonical `incoming-images/videos/VID-20260419-WA0065.mp4`
- `config/media-visual-review.json:5304` (path `incoming-images/videos/VID-20260419-WA0065_205035.mp4`) → canonical `incoming-images/videos/VID-20260419-WA0065.mp4`
- `config/media-visual-review.json:5307` (path `incoming-images/videos/VID-20260419-WA0065_205035.mp4`) → canonical `incoming-images/videos/VID-20260419-WA0065.mp4`
- `config/media-visual-review.json:5324` (path `incoming-images/videos/VID-20260419-WA0065_205035.mp4`) → canonical `incoming-images/videos/VID-20260419-WA0065.mp4`
- `config/stream-media-catalog.json:2839` (path `incoming-images/videos/VID-20260419-WA0065_205035.mp4`) → canonical `incoming-images/videos/VID-20260419-WA0065.mp4`
- `config/stream-media-catalog.json:2840` (path `incoming-images/videos/VID-20260419-WA0065_205035.mp4`) → canonical `incoming-images/videos/VID-20260419-WA0065.mp4`
- `config/stream-media-catalog.json:7823` (path `incoming-images/videos/VID-20260419-WA0065_205035.mp4`) → canonical `incoming-images/videos/VID-20260419-WA0065.mp4`
- `config/stream-media-catalog.json:7825` (path `incoming-images/videos/VID-20260419-WA0065_205035.mp4`) → canonical `incoming-images/videos/VID-20260419-WA0065.mp4`
- `config/media-intake-overrides.json:1439` `videos/VID-20260419-WA0065_205035.mp4` → `videos/VID-20260419-WA0065.mp4`
- … +3

### `41e8dfa779de…` · CANONICALIZABLE · 200.3 KB

| Pole | Hodnota |
|------|---------|
| **HASH** | `41e8dfa779de49920c26f4c66ca1d32c` |
| **ALL PATHS** | `incoming-images/photos/IMG-20251222-WA0017_181044.jpg` · `incoming-images/photos/IMG-20251222-WA0017.jpg` |
| **Proposed canonical** | `incoming-images/photos/IMG-20251222-WA0017.jpg` (score 0) |
| **Expected bytes saved** | 200.3 KB |
| **Risk** | low |
| **Post-canonical** | SAFE_DEDUP |
| **Důvod** | same content; path-only catalog duplication |

**Officialness ranking:**
- `incoming-images/photos/IMG-20251222-WA0017.jpg` → 0
- `incoming-images/photos/IMG-20251222-WA0017_181044.jpg` → -8

**Runtime refs (union):**
- `config/stream-media-catalog.json:139`
- `config/stream-media-catalog.json:5893`
- `config/stream-media-catalog.json:5895`
- `config/stream-media-catalog.json:133`
- `config/stream-media-catalog.json:5880`
- `config/stream-media-catalog.json:5882`

**media-intake-overrides refs:** —

**Other catalog refs:** —

**Refs to rewrite:** 3
- `config/stream-media-catalog.json:139` (path `incoming-images/photos/IMG-20251222-WA0017_181044.jpg`) → canonical `incoming-images/photos/IMG-20251222-WA0017.jpg`
- `config/stream-media-catalog.json:5893` (path `incoming-images/photos/IMG-20251222-WA0017_181044.jpg`) → canonical `incoming-images/photos/IMG-20251222-WA0017.jpg`
- `config/stream-media-catalog.json:5895` (path `incoming-images/photos/IMG-20251222-WA0017_181044.jpg`) → canonical `incoming-images/photos/IMG-20251222-WA0017.jpg`

### `bdf44d4af362…` · CANONICALIZABLE · 62.4 KB

| Pole | Hodnota |
|------|---------|
| **HASH** | `bdf44d4af362f96fcdd02da094702788` |
| **ALL PATHS** | `incoming-images/photos/IMG-20260214-WA0086 (1).jpg` · `incoming-images/photos/IMG-20260214-WA0086.jpg` |
| **Proposed canonical** | `incoming-images/photos/IMG-20260214-WA0086.jpg` (score 0) |
| **Expected bytes saved** | 62.4 KB |
| **Risk** | low |
| **Post-canonical** | SAFE_DEDUP |
| **Důvod** | same content; path-only catalog duplication |

**Officialness ranking:**
- `incoming-images/photos/IMG-20260214-WA0086.jpg` → 0
- `incoming-images/photos/IMG-20260214-WA0086 (1).jpg` → -12

**Runtime refs (union):**
- `config/stream-media-catalog.json:6127`
- `config/stream-media-catalog.json:6129`
- `config/stream-media-catalog.json:6140`
- `config/stream-media-catalog.json:6142`

**media-intake-overrides refs:** —

**Other catalog refs:** —

**Refs to rewrite:** 2
- `config/stream-media-catalog.json:6127` (path `incoming-images/photos/IMG-20260214-WA0086 (1).jpg`) → canonical `incoming-images/photos/IMG-20260214-WA0086.jpg`
- `config/stream-media-catalog.json:6129` (path `incoming-images/photos/IMG-20260214-WA0086 (1).jpg`) → canonical `incoming-images/photos/IMG-20260214-WA0086.jpg`

## Post-freeze execution order

1. Přepsat **CANONICALIZABLE** catalog refs na proposed canonical paths
2. Re-run ASSET PASS 05 → REVIEW → SAFE_DEDUP
3. Execute SAFE dedup (soubory, ne refs)
4. **SEMANTIC_SPLIT** — ruční rozhodnutí tier/obsSlot před jakýmkoli mazáním
