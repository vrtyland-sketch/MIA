# ASSET PASS 03A — RETENTION DESIGN

**Režim:** DESIGN + DRY-RUN simulace · **feature freeze** · žádné mazání, žádné runtime změny.
**Simulace:** `node scripts/simulate_asset_retention.js`

## Proč nejdřív větev A

`generated/eyes/` roste bez retention (~12 GB / 101k souborů). Registry seed by do `ASSET_REGISTRY.json` nasával cache sediment. Nejdřív kohoutek, pak inventura contentu.

---

## 1. `generated/eyes/`

| Pole | Návrh policy |
|------|----------------|
| **WHAT TO KEEP** | (1) Soubory s **explicitní code/walkthrough referencí** (basename v kódu mimo `tests/` nebo v `generated/walkthrough/*.json`). (2) **Hot window** — vše mladší než 48 h (debug po streamu). (3) **Keep-last-N** per OBS source prefix: routine zdroje (`KOJNOZROUT_RUNTIME`, `SPINAK_ENGINE_GIFTS`, `T*_VIDEO_*`) → **2** nejnovější; diagnostické (`MIA_*`, ostatní) → **5** nejnovější. (4) Po dedupe vždy min. 1 vzorek per prefix, pokud existuje. |
| **HOW LONG** | Routine: max **24 h** mimo keep-last-N. Diagnostické: max **7 dní**. Hot: **48 h** bez ohledu na N. |
| **MAX SIZE** | **256 MB** celý adresář (soft cap po ostatních pravidlech). |
| **DELETE ORDER** | 1) **Binární duplicity** (stejná velikost + partial MD5 512 KB) — ponechat nejnovější timestamp. 2) **Věk** mimo keep-last-N. 3) **LRU** dokud není pod MAX SIZE (nikdy protected/hot). |
| **EXCEPTIONS** | Walkthrough evidence, code refs, hot window, keep-last-N sloty. Budoucí konvence: sidecar `*.keep` nebo `content-pass/evidence-manifest.json`. |
| **SAFETY CHECK** | Default **dry-run**; log `would_delete` + důvod; implementační fáze až po schválení; preflight: `npm run test:preflight:fast` po zapnutí cronu. |

**Writer:** `scripts/MIA_EYES.js` (`captureScreenshot`, default `save: true`). **Retention dnes:** žádná.

---

## 2. `audio-cache/` (TTS)

| Pole | Návrh policy |
|------|----------------|
| **WHAT TO KEEP** | SHA1-hashed MP3 z `MIA_TTS_ENGINE.js` — **content-addressable cache**. Držet: (1) basename v **non-test** kódu, (2) **hot 24 h**, (3) min **50** nejnovějších souborů (fallback pro často opakované fráze). |
| **HOW LONG** | **14 dní** max age pro ostatní. |
| **MAX SIZE** | **128 MB** (LRU po age pravidlech). |
| **DELETE ORDER** | 1) Protected refs. 2) Hot + min-keep. 3) Nejstarší mtime (LRU/age). 4) Max-size trim. |
| **EXCEPTIONS** | Soubor právě referencovaný v `voicePlayback.audioUrl` — v implementaci chránit **in-memory** posledních N URL (simulace používá mtime hot window). |
| **SAFETY CHECK** | Nikdy mazat, pokud basename = aktuální playback queue; dry-run report; TTS cache miss = re-synth (bezpečné). |

---

## 3. `generated/gifts/` — pouze cache část

| Subdir | Cache? | Policy |
|--------|--------|--------|
| `gift-animations/<jobId>/` | **Ano** — procedural job output | Celý job smazat po **3 dnech**, pokud `jobId` není v non-test kódu. Hot **72 h** vždy. |
| `gift-moments/` | **Částečně** | Orphan PNG (bez code ref) po **14 dnech**. Referenced = content → **nemazat**. |
| `story-moments/` | **Částečně** | Stejně jako gift-moments. |
| `media-templates/` | **Částečně** | Stejně; template renderer output. |

| Pole | Návrh |
|------|--------|
| **WHAT TO KEEP** | Job/output s **literal code ref**; vše v hot window **72 h**. |
| **HOW LONG** | Jobs **3 d** · orphan outputs **14 d**. |
| **MAX SIZE** | *(fáze 2)* — zatím age-only; objem ~61 MB orphan. |
| **DELETE ORDER** | 1) Unreferenced jobs. 2) Orphan outputs by age. |
| **EXCEPTIONS** | Jakýkoli URL v overlay state / DB — mimo scope simulace; chránit code refs. |
| **SAFETY CHECK** | Mazat celé job složky atomicky; manifest URL grep před delete. |

---

## 4. Simulace — *if policy applied now*

**Datum simulace:** 2026-08-08T17:37:07 UTC
**Chráněných basename (code + walkthrough, bez tests):** 65

| Skupina | Would remove | Would keep | GB freed | GB kept |
|---------|--------------|------------|----------|---------|
| `generated/eyes` | **99,369** | 1,910 | **11.96 GB** | 256.0 MB |
| `audio-cache` | 613 | 188 | 30.2 MB | 17.6 MB |
| `generated/gifts` cache | 548 | 79 | 54.9 MB | 36.3 MB |
| **CELKEM** | **100,530** | 2,177 | **12.04 GB** | 309.9 MB |

> **12.04 GB** uvolněno při aplikaci návrhu **bez dotyku** `mia-output-overlay/assets/`, `incoming-images/` ani registry contentu.

### Důvody mazání (eyes)

- `age-exceeded`: 67,961
- `duplicate`: 27,872
- `max-size-lru`: 3,536

### Důvody mazání (audio-cache)

- `age-exceeded`: 613

### Důvody mazání (gifts cache)

- `orphan-age`: 547
- `job-age`: 1

---

## 5. Implementační backlog (až po schválení, mimo freeze)

| ID | Úkol | Soubor |
|----|------|--------|
| RET-01 | Cron/trigger cleanup dry-run → apply | `scripts/MIA_ASSET_RETENTION.js` (nový) |
| RET-02 | `MIA_EYES`: opt-in `save: false` pro vision tick; save jen na explicit endpoint | `scripts/MIA_EYES.js`, `MIA_OBS_VISION.js` |
| RET-03 | Env knobs: `MIA_EYES_RETENTION_*`, `MIA_AUDIO_CACHE_*` | `.env.example` |
| RET-04 | In-memory protect `voicePlayback.audioUrl` during cleanup | `scripts/MIA_ASSET_RETENTION.js` |
| RET-05 | Evidence manifest pro walkthrough snímky | `content-pass/evidence-manifest.json` |

---

## 6. Verdikt

**RETENTION POLICY = APPROVED AS DESIGNED** (2026-08-08) — hot window 48 h, keep-last 2 routine / 5 diagnostic, max 256 MB eyes. **Implementace RET-01…RET-05 až po feature freeze.**

**ANO** — simulace ukazuje ≥10 GB volného místa bez dotyku content assetů. Registry seed (**03B**) až po schválení a implementaci retention cronu.
