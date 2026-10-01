# ASSET GENESIS CUT — zamčený seznam pro první show

**Status:** LOCK · 2026-08-13 · FREEZE-safe  
**Zdroj:** [`ASSET_MASTER_AUDIT.md`](./ASSET_MASTER_AUDIT.md)  
**Pravidlo:** nic nemazat z disku — jen **IN / OUT / MAYBE** pro GENESIS. Runtime se nemění.

---

## Verdikt jednou větou

**GENESIS vizuál = MIA cyber (speak) + parts/head nálady + Koj v36 unify moods + 4 overlaye ve scéně `SPINAK_ENGINE_GIFTS`.** Vše ostatní existuje, ale **nepatří do první show**.

---

## 1. MIA — co jde do GENESIS

### IN (používat)

| Asset | Cesta | Role v show |
|-------|-------|-------------|
| Cyber speak | `assets/mia/cyber/speak.png` | hlavní postava při TTS |
| Cyber idle lip | `assets/mia/cyber/lip/01.png` | idle / mezi větami |
| Hologram mask | `assets/mia/hologram.png` | FX v speech-overlay |
| Head moods | `assets/mia/parts/head/{idle,happy,gift,duel,combo,think,wave}.png` | nálady mimo full speak |

**Pravidlo mixu (dočasně akceptovat):** `speaking` → cyber celá postava; ostatní nálady → parts/head. POST-GENESIS: sjednotit scale.

### OUT (nepoužívat v GENESIS)

| Asset | Cesta | Důvod |
|-------|-------|-------|
| Masters celé postavy | `assets/mia/masters/*.png` | LEGACY / gallery / generátory |
| Masters faces | `assets/mia/masters/faces/*.png` | duplicitní hash s parts/head |
| Body parts hero | `assets/mia/parts/{eyes,hands,...}` + `?bodyHero=1` | experiment, ne live |
| Cyber lip 02 / hero orphan | `cyber/lip/02.png`, `cyber/hero.png` | retired / duplicate hash |

### DUPLICATE (ne míchat ve scéně)

| Problém | Soubory |
|---------|---------|
| combo = gift face | `masters/faces/combo.png` = `gift.png` |
| speak = lip02 | `cyber/speak.png` = `cyber/lip/02.png` |
| hologram = lip01 = hero | stejný hash |

---

## 2. Kojnožrout — co jde do GENESIS

### IN (používat)

| Sada | Cesta | Počet | Poznámka |
|------|-------|-------|----------|
| **Moods canon v36** | `assets/kojnozrout/moods/kojnozout-*.png` | 290 | boot: `kojnozout-idle.png` |
| Props | `props/{bowl,ball,mic,hand}.png` | 4 | bowl HUD, gift hand |
| Evolution HUD | `evolution/*.png` | 5 | volitelné — MAYBE viz níže |

**Styl:** v36-koj-unify — fialový kanon, krémové rohy (`v=36-koj-unify` cache bust).

**Moods pro GP (minimum ověřit doma):**

| Mood | Soubor | Kdy |
|------|--------|-----|
| idle | `kojnozout-idle.png` | default |
| react-gift | `kojnozout-react-gift*.png` | Rose / T1 |
| thanks | `kojnozout-thanks*.png` | po gift voice |
| eating | `kojnozout-eating*.png` | bowl / feed |
| happy / proud | `kojnozout-happy*`, `proud*` | combo / spam success |

### OUT (nepoužívat v GENESIS)

| Sada | Cesta |
|------|-------|
| 13 archivních stylů | `assets/_offline_backup/kojnozrout/_archive/*` |
| Platform forms | `forms/{tiktok,kick,twitch,youtube}/` (140 PNG) |
| Battle frames | `battle/` + factory-manifest |
| Animation bank | `animation-bank/` (dev fallback) |
| Galleries | `koj-*-gallery.html` assety |
| Variants A/B | `variants/` — dedup až POST-GENESIS |

### MAYBE (jen čas po Rose PASS)

- Evolution toast overlay
- Backpack / viewer-strip
- Dedup `-a/-b/-f2` mood suffixů (290 → menší canon set)

---

## 3. Overlaye — co jde do GENESIS

### IN (produkční stack — scéna `SPINAK_ENGINE_GIFTS`)

| Overlay | HTML | OBS source (typ) | REQ |
|---------|------|------------------|-----|
| MIA speech | `speech-overlay.html?v=36-koj-unify` | MIA_SPEECH / MIA_BUBBLE | **YES** |
| MIA voice audio | `mia-voice-overlay.html` | MIA_VOICE (1×!) | **YES** |
| Koj mascot | `kojnozrout-runtime.html?v=36-koj-unify` | KOJNOZROUT_RUNTIME | **YES** |
| Bowl HUD | `kojnozrout-bowl-overlay.html?v=36-koj-unify` | KOJNOZROUT_BOWL_V2 | **YES** |
| Gift stage | `gift-animation-overlay.html?v=37-stream-polish` | MIA_GIFT_ANIMATION | **YES** (Rose) |

**URL pravidlo (multi-PC):** browser sources na PC1 → `http://<PC2-IP>:3000/...` — viz [`HOME_EXECUTION_PLAN.md`](./HOME_EXECUTION_PLAN.md) krok 5.

### OUT (explicitně ne GENESIS)

| Overlay | Důvod |
|---------|-------|
| `genesis-*.html` (izolovaný show) | jiný režim — ne Stream Core GP |
| `entity-overlay.html` | legacy badge — ověřit OBS, ne default |
| Arena / duel / battle | POST-GENESIS |
| `story-moment`, `host-mode`, `combo` (default off) | MAYBE později |
| `mia-live-hub.html` | all-in-one legacy |
| Galleries (`koj-roster-gallery`, …) | dev preview |

### OBS scéna architektura (asset + obraz)

```text
Program = SPINAK_HLAVNI (9:16)
  └─ nested SPINAK_ENGINE_GIFTS (visible)
       └─ IN overlaye výše
```

**OUT jako Program:** `MIA_GENESIS` bez Core overlayů uvnitř.

---

## 4. Text / voice banky — co jde do GENESIS

### IN (hot path — `text-bank/packs/`)

| Pack key | Soubor | Situace |
|----------|--------|---------|
| `support_small_*` | `support/support-mia-koj.json` | Rose / T1 |
| `support_medium_*`, `support_big_*` | stejný | větší dary |
| `support_spam_*`, `support_full_bowl`, `support_combo` | `support/support-spam-bowl.json` | spam / combo |
| `idle_hungry`, `idle_bored` | `idle/idle.json` | ticho |
| `wake_up_chat_*` | `community/wake.json` | probuzení chatu |
| `mia_returning_ack`, `koj_returning_ack` | `mia|koj/returning-viewer.json` | návrat diváka |
| `mia_first_visit_ack`, `koj_first_visit_ack` | `stream-core/first-visit.json` | nový divák (připraveno, wiring POST) |
| `mia_direct_*`, `koj_direct_*` | `mia|koj/direct-core.json` | direct chat |

### OUT (ne Stream Core GP)

| Pack | Důvod |
|------|-------|
| `text-bank/packs/genesis/*.json` (300-line voice) | Genesis izolovaný režim — README: not wired to Stream Core |
| `legacy/direct.json` | LEGACY |
| `expansions/*-bulk.json` | bulk seed, ne kurátorované GP |
| `proactive-host.json` | auto TTS bez chatu — MAYBE OFF doma |

**Voice pravidla:** [`GENESIS_STREAM_VOICE.md`](./GENESIS_STREAM_VOICE.md) · [`docs/MIA_KOJ_VOICE_BIBLE_DRAFT.md`](../docs/MIA_KOJ_VOICE_BIBLE_DRAFT.md)

---

## 5. Funkce / pipeline — GENESIS FUNCTION CUT

### IN (musí projít HOME EXECUTION PLAN)

- TikFinity → `/ingest` → COMMENT + Rose
- MIA TTS + speech-overlay (cyber)
- Koj runtime + bowl (základní mood)
- Gift overlay ve **správné OBS scéně**
- Golden COMMENT + Rose na telefonu
- PC1+PC2 bez PC3

### OUT

- Memory v2, Human Motion, Pavouk
- Arena / battle / duel
- Platform `forms/` skins
- Body-part hero
- Story-moment 5-scénové animace
- Evolution toast / backpack / viewer-strip (default OFF)
- Creative Studio / Reel export
- Nový voice engine
- `MIA_DUAL_VOICE=1` (default OFF)

### MAYBE (až po E)

- Safe-zone grid polish
- Alpha dedup moods `-a/-b`
- Wire `mia_first_visit_ack` do runtime

---

## 6. Sediment (ne character — neřešit před GENESIS)

| Kategorie | Klasifikace |
|-----------|-------------|
| `generated/eyes/` 12 GB | TEMP — post-freeze |
| `audio-cache/` | TEMP |
| Registry duplicate groups | DUPLICATE — post-freeze |

---

## 7. Checklist doma (asset gate — 5 min)

Po PASS kroku 6 v [`HOME_EXECUTION_PLAN.md`](./HOME_EXECUTION_PLAN.md):

- [ ] OBS browser sources = IN overlaye seznam §3
- [ ] URL = PC2 IP, ne localhost
- [ ] 1× MIA_VOICE
- [ ] Koj mood idle viditelný v Program
- [ ] Žádný arena/duel/gallery source visible v Program
- [ ] `giftScene` v `/health` = `SPINAK_ENGINE_GIFTS`

---

## Reference

- [`ASSET_MASTER_AUDIT.md`](./ASSET_MASTER_AUDIT.md) — plný inventář
- [`ASSET_REGISTRY.json`](./ASSET_REGISTRY.json) — 1091 entries
- [`HOME_EXECUTION_PLAN.md`](./HOME_EXECUTION_PLAN.md) — operace doma
- [`GENESIS_STREAM_VOICE.md`](./GENESIS_STREAM_VOICE.md) — texty / charakter

*Konec cutu. Žádné mazání assetů — jen rozhodnutí co jde do první show.*
