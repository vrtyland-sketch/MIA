# ASSET MASTER AUDIT — MIA + Kojnožrout

**Status:** READ-ONLY · 2026-08-13  
**Režim:** žádné překreslování, mazání ani přesuny  
**Zdroje:** `content-pass/ASSET_REGISTRY.json`, `docs/GRAPHICS_v34_ASSET_CONTROL.md`, filesystem scan

---

## Executive summary

| Entita | CURRENT (live hot path) | LEGACY (archiv) | TEMP / noise | Hlavní problém |
|--------|-------------------------|-----------------|--------------|----------------|
| **MIA** | 1 vizuální linie (`cyber` + `parts/head`) | `masters/` duplicitní s parts | `body-part` overlay opt-in | 2–3 tváře v hlavě (cyber vs parts vs masters) — runtime používá **cyber + parts** |
| **Kojnožrout** | `moods/kojnozout-*.png` (v36 unify) | 13 archivních stylů offline | 290 PNG, mnoho `-a/-b/-f2` variant | Platform `forms/` + `battle/` existují, ale **runtime = moods only** |
| **Overlaye** | speech, koj runtime, bowl, gift-anim | entity-overlay, arena, galleries | `generated/eyes` 12 GB | Gift vrstvy vs scéna `SPINAK_ENGINE_GIFTS` |

**Verdikt pro GENESIS cut:** držet **MIA cyber hero** + **Koj v36 purple unify moods**; vše ostatní = LEGACY nebo POST-GENESIS.

---

## MIA — vizuální linie

### CURRENT (runtime hot path)

| Asset | Cesta | Používá | Styl | Rozměr |
|-------|-------|---------|------|--------|
| Cyber speak | `assets/mia/cyber/speak.png` | `speech-overlay.html`, `MiaLivePresence` | celá postava, true-alpha | 853×1280 |
| Cyber idle/lip | `assets/mia/cyber/lip/01.png` | `MiaLivePresence.idleFace` | stejná linie jako speak | 853×1280 |
| Hologram mask | `assets/mia/hologram.png` | speech CSS mask FX | scan/holo efekt | 853×1280 |
| Head poses | `assets/mia/parts/head/{idle,happy,gift,duel,combo,think,wave}.png` | `MiaLivePresence.faces`, genesis-runtime map | dílčí hlava — **jiný crop než cyber** | mix |
| Body parts | `assets/mia/parts/{eyes,hands,feet,torso,speak-lip}/` | `?bodyHero=1` opt-in only | studio/experiment | — |

**Cache bust aktivní:** `v=36-koj-unify` (sjednoceno s Koj unify pass)

### TEMP / orphan (ne live default)

| Asset | Cesta | Proč TEMP |
|-------|-------|-----------|
| Cyber lip 02 | `cyber/lip/02.png` | retired z hero carousel (v34 docs) |
| Cyber hero | `cyber/hero.png` | orphan — stejný hash jako hologram/01 |
| Masters celé postavy | `masters/{idle,speak,think,wave,speak-0N}.png` | katalog / AI brief / gallery |
| Masters faces | `masters/faces/*.png` | **duplicitní obsah** s parts/head (stejné hashe) |

### DUPLICATE (binární shoda — ne míchat ve scéně)

| Hash | Soubory | Riziko |
|------|---------|--------|
| `a2b0e243` | `masters/faces/combo.png` = `gift.png` | combo a gift vypadají identicky |
| `51868f6f` | `masters/faces/idle.png` = `masters/idle.png` | master = face duplicate |
| `dc4a0daa` | `cyber/speak.png` = `cyber/lip/02.png` | speak = retired lip frame |
| `2b02ee93` | `hologram.png` = `cyber/lip/01.png` = `cyber/hero.png` | mask a idle sdílí pixel data |

### LEGACY (nepoužívat v GENESIS)

- Celá větev `masters/` pro live — jen reference pro generátory (`build_mia_body_parts.js`, gift promptBuilder)
- `entity-overlay.html` — v OBS manifestu, ale **speech-overlay** je live authority (v34 ownership)

### GENESIS mapa (z `genesis-runtime.js`)

```
idle/listening/thinking → parts/head/think|idle
speaking              → cyber/speak.png   ← hlavní „tvář při TTS“
greeting              → parts/head/wave
happy                 → parts/head/happy
surprised             → parts/head/combo
system_alert          → parts/head/duel
thank_you             → parts/head/gift
```

**Nesoulad:** Genesis může přepínat mezi **celou cyber postavou** (speak) a **oříznutou hlavou** (parts) — vizuálně různé scale/styl. Pro GENESIS cut: **speak = cyber only**, ostatní nálady = parts/head, akceptovat dočasný mix nebo sjednotit POST-GENESIS.

---

## Kojnožrout — vizuální linie

### CURRENT (runtime hot path)

| Sada | Cesta | Počet | Používá |
|------|-------|-------|---------|
| **Moods canon** | `assets/kojnozrout/moods/kojnozout-*.png` | **290** | `kojnozrout-runtime.html` |
| Props | `props/{bowl,ball,mic,hand}.png` | 4 | runtime + gift hand |
| Evolution HUD | `evolution/*.png` | 5 tierů | bowl/evolution toast |
| Stages | `stages/{tier}/kojnozout-*.png` | 50 | fallback z moods |
| FX projectiles | `fx/projectiles/*.png` | hand-painted | arena/battle (opt-in) |

**Aktivní styl:** **v36-koj-unify** — fialový kanon, krémové rohy, purple crest (`INSTALL_SUMMARY.json`, 222 installed PNG)

**Boot path:** `assets/kojnozrout/moods/kojnozout-idle.png`

### LEGACY (13 archivních stylů — cold backup)

Umístění: `assets/_offline_backup/kojnozrout/_archive/`

| Archiv | Styl (popis) | Stav |
|--------|--------------|------|
| `purple-originals` | původní fialová | LEGACY |
| `v17-soft-neon` | soft neon | LEGACY |
| `v19-cyborg` | cyborg | LEGACY |
| `v20-robot-projector` | robot projektor | LEGACY |
| `v21-koj-ai` / `before-dark` | AI generace | LEGACY |
| `v22-dark-big` | tmavý velký | LEGACY |
| `v26-mint-cyborg` | mint cyborg | LEGACY |
| `v27-purple-tech` | **polo-robot fialový** | LEGACY |
| `v27-purple-tech-dim` | dim varianta | LEGACY |
| `v35-asset-polish` | polish pass | LEGACY |
| `v36-koj-unify` | **→ CURRENT source** | INSTALLED do moods |
| `2026-06-16*` / `2026-06-18*` | staré timestamp dumpy | LEGACY |

**Restore:** `npm run restore:koj-sprites` — nepouštět doma bez důvodu.

### TEMP / platform-specific (ne GENESIS default)

| Sada | Cesta | Souborů | Platforma | Runtime? |
|------|-------|---------|-----------|----------|
| Forms | `forms/{tiktok,kick,twitch,youtube}/` | 140 | 4× battle skin | **Ne** — gallery + arena only |
| Variants | `variants/` | 100 | A/B mood varianty | částečně — derived moods |
| Battle frames | `battle/` + factory-manifest | 44 | TikTok/Kick/Twitch/YT | arena overlays only |
| Animation bank | `animation-bank/` | procedural sprites | dev fallback | README: **not hot path** |
| Scenes/items/roster | galleries | — | preview HTML | **Ne** pro GENESIS |

### Mood variant bordel (290 souborů)

- **17×** `eating-*` (jí z misky — OK pro live)
- Desítky `-a`, `-b`, `-f2` suffixů (`react-gift-a`, `proud-stand-b`, `shy-hide-f2`…) — **DUPLICATE kandidáti** pro dedup pass, ne mazat teď
- Mapování: `scripts/KOJNOZROUT_MOOD_DERIVE.js` — 35 odvozených z 13 masterů (README); filesystem má víc kvůli historickým exportům

### ALPHA audit poznámky

- Kanon: true-alpha PNG pipeline (`kojnozrout_prepare_sprite.js`)
- Magenta `#FF00FF` fallback stále v runtime
- `.pre-*` moved offline (v33) — OK

---

## Overlaye — co je CURRENT pro GENESIS stream

| Overlay | URL | CURRENT? | Poznámka |
|---------|-----|----------|----------|
| MIA speech | `speech-overlay.html` | **YES** | cyber hero + TTS |
| Koj mascot | `kojnozrout-runtime.html` | **YES** | moods |
| Bowl HUD | `kojnozrout-bowl-overlay.html` | **YES** | % only |
| Gift stage | `gift-animation-overlay.html` | **YES** | tier video + creature |
| Genesis | `genesis-overlay.html` | GENESIS-only | izolovaný runtime |
| Entity | `entity-overlay.html` | LEGACY? | v manifestu — ověřit OBS scénu |
| Arena/duel/battle | `arena-*`, `kojnozrout-duel` | **NO** GENESIS | POST-GENESIS |
| Galleries | `koj-*-gallery.html` | **NO** | dev preview |

**Kritický nález:** default OBS scéna v manifestu = `SPINAK_ENGINE_GIFTS` — gift vrstvy mohou být **mimo** hlavní vertikální master (krok 6 v pořadníku).

---

## GENESIS FUNCTION CUT (navrhovaný scope)

### IN (první show — musí být PROVEN)

- TikFinity → `/ingest` → COMMENT + Rose
- MIA TTS + speech-overlay (cyber)
- Koj runtime + bowl (základní mood switch)
- Gift overlay ve **správné scéně** (ne orphan layer)
- Golden Rose GP-S chain
- Restart PC1+PC2 bez notebooku

### OUT (explicitně ne do první GENESIS)

- Memory v2, Human Motion monster, Pavouk
- Arena / battle / duel overlays
- Platform-specific `forms/` battle skins
- Body-part hero (`?bodyHero=1`)
- Story-moment 5-scénové animace (8×/15× feed)
- Evolution toast / backpack / viewer-strip (nice-to-have)
- Creative Studio / GP-C Reel export
- Nový voice engine

### MAYBE (jen pokud čas po E)

- Safe-zone grid polish (krok 7)
- Voice/behavior polish — opakující se děkování (krok H)
- Alpha cleanup duplicate `-a/-b` moods

---

## Sediment (ne character — ale blokuje disk)

| Kategorie | Počet | Objem | Klasifikace |
|-----------|-------|-------|-------------|
| `generated/eyes/` | 101,279 | 12.21 GB | TEMP cache |
| `audio-cache/` | 801 | 47.8 MB | TEMP |
| Registry duplicate groups | 103 | ~62 MB safe dedup | DUPLICATE (post-freeze) |

---

## Akce — až po thaw (ne teď)

1. Vybrat **jednu** MIA vizuální autoritu (doporučení: cyber pro speak, parts/head pro nálady — dokumentovat v OBS)
2. Dedup `-a/-b/-f2` koj moods po review
3. Přesunout gift overlaye do master scény
4. RET-02 eyes cache `save:false`
5. Sjednotit `combo` vs `gift` master (stejný hash)

---

## Reference

- [`GENESIS_OPS_PRIORITY.md`](./GENESIS_OPS_PRIORITY.md) — pořadník A→H
- [`ASSET_REGISTRY.json`](./ASSET_REGISTRY.json) — 1091 entries, role-classified
- [`docs/GRAPHICS_v34_ASSET_CONTROL.md`](../docs/GRAPHICS_v34_ASSET_CONTROL.md) — ownership map
- [`docs/MIA_GENESIS_MODE/04_AUDIO_AND_ASSETS_SPEC.md`](../docs/MIA_GENESIS_MODE/04_AUDIO_AND_ASSETS_SPEC.md) — Genesis pose bank
