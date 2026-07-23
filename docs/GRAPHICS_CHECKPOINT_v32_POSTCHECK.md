# Graphics Checkpoint v32 — Post-check

**Datum:** 2026-07-20  
**Baseline:** `v=32-gfx-whole` ([GRAPHICS_CHECKPOINT_v32.md](./GRAPHICS_CHECKPOINT_v32.md), [MIA_GRAPHICS_WHOLE.md](./MIA_GRAPHICS_WHOLE.md))  
**Režim:** audit + report (bez zásahu do freeze). Žádný kódový fix v tomto běhu.  
**Proof JSON:** `.tmp-audit/gfx-v32-POSTCHECK.json`

Legenda: 🟢 OK · 🟡 pozornost / dluh · 🔴 rozbité vs baseline

---

## Shrnutí checklistu

| # | Oblast | Verdikt |
|---|--------|---------|
| 1 | PNG completeness | 🟢 |
| 2 | Animation linkages | 🟢 (🟡 gift stage bez `mia-tech-energy.js`) |
| 3 | Runtime mapping | 🟢 (🟡 dual OBS názvy + staré busty v MIA presence/CSS) |
| 4 | Unused assets | 🟡 (kandidáti — nemazat hromadně) |
| 5 | Duplicates | 🟡 |
| 6 | Bundle / optimalizace | 🟡 |
| — | OBS/URL smoke | 🟡 server + OBS WS vypnuté (neselhalo úkol) |

**Celkový verdikt:** freeze v32 drží. Hot path art (cyber MIA, Koj canon moods, lion/universe/galaxy dual frames) je na disku; centralizovaný bust `32-gfx-whole` sedí v Rig Desk / gift / `CACHE_BUST` / `index.js` gift URL / OBS refresh. Další práce = **v33 incremental**, ne přepis v32.

---

## 1. PNG completeness

### 🟢 Cyber MIA
| Asset | Stav |
|-------|------|
| `assets/mia/cyber/speak.png` | OK (~1.7 MB) |
| `assets/mia/cyber/hero.png` | OK (duplikát velikosti se speak — viz unused) |
| `assets/mia/cyber/lip/01.png` | OK (idle) |
| `assets/mia/cyber/lip/02.png` | OK na disku (runtime carousel už nepoužívá) |
| `assets/mia/hologram.png` | OK (scan/sweep mask) |
| `assets/mia/masters/faces/gift.png` | OK (promptBuilder STAGE_ART) |

### 🟢 Gift-creatures (WAU dual frames)
| Gift | calm / establish | roar / surge / burst |
|------|------------------|----------------------|
| Lion | `lion/majestic.png` | `lion/roar.png` |
| Universe | `universe/calm.png` | `universe/surge.png` |
| Galaxy | `galaxy/calm.png` | `galaxy/burst.png` |

🟡 Universe/Galaxy mají i `*-raw.png` v hot path; Lion **nemá** `majestic-raw` / `roar-raw` — neblokuje runtime (stage bere finální PNG), jen nekonzistence pipeline.

### 🟢 Koj moods (runtime canon)
- `KOJNOZROUT_MOOD_DERIVE`: **13 master + 90 derived = 103** klíčů.
- Všechny canon klíče mají live `kojnozout-{key}.png` → **missingCanonPng: []**.
- Props: `bowl`, `ball`, `mic`, `hand` — OK.
- Anchors JSON: `/anchors/mia.json`, `/anchors/koj.json` — OK (belly + head).

---

## 2. Animation linkages

| Vazba | Stav | Poznámka |
|-------|------|----------|
| Rig Desk → `/anchors/{koj\|mia}.json` → runtime | 🟢 | `MiaRigAnchors.load` + `CACHE_BUST` |
| MIA lip idle↔speak | 🟢 | `MiaLivePresence` + `MiaHoloMotion` + `MiaPartRig` |
| Koj whole-sprite + belly HUD | 🟢 | `koj-live-motion` + anchors + props |
| Tech energy (MIA + Koj) | 🟢 | `mia-tech-energy.js` mount v speech / koj runtime |
| Gift stage dual PNG swap | 🟢 | `creatureSprite` + `creatureRoar`, CSS `.roar-beat` |
| Gift idle hide | 🟢 | idle opacity 0 (docs / stage) |
| `trueAiVideo` | 🟢 | `false` v proof manifeste (procedural_v2) |
| Gift `MiaTechEnergy` modul | 🟡 | overlay používá CSS `.energy` / `tech-energy-lab`, **není** `<script src="/lib/mia-tech-energy.js">` — dokumentace „stejná particle grammar“ je částečně aspirativní |

---

## 3. Runtime mapping

### 🟢 Bust `32-gfx-whole` (centrální)
- `mia-output-overlay/lib/mia-rig-anchors.js` → `CACHE_BUST`
- `index.js` → `giftAnimation: …?v=32-gfx-whole`
- `scripts/obs_refresh_overlays.js` → URL bust
- `scripts/MIA_OBS_LIVE_MANIFEST.js` → `gift_animation.urlQuery`
- Gift overlay / Rig Desk / Gift Desk / Koj runtime CSS+JS query
- `shared/mia-gift-animation/promptBuilder.js` → `STAGE_ART.bust`
- Kotva: `mia-output-overlay/GRAPHICS_BASELINE.txt`

### 🟡 OBS názvy: live vs manifest
| Role | Live (obs_refresh core) | Manifest `inputName` |
|------|-------------------------|----------------------|
| Speech / bubble | `MIA_BUBBLE` | `MIA_SPEECH` |
| Koj runtime | `KOJNOZROUT_RUNTIME` | `MIA_KOJ_RUNTIME` |
| Bowl | `KOJNOZROUT_BOWL_V2` | `MIA_BOWL` |
| Gift anim | `MIA_GIFT_ANIMATION` | `MIA_GIFT_ANIMATION` 🟢 |

Refresh skript cílí na **live** jména (`KOJNOZROUT_*` / `MIA_BUBBLE`). Manifest slouží spíš jako katalog vrstev — při apply scripts pozor na aliasy.

### 🟡 Staré busty (neblokují load, kazí cache konzistenci)
| Místo | Bust | Dopad |
|-------|------|-------|
| `lib/mia-live-presence.js` `BUST` | `14e-live-robot` | `PRESENCE.bustUrl()` na pose img — jiný cache klíč než v32 |
| `speech-overlay.html` CSS glitch/scan/sweep | `v=15-world-unify` | mask/FX vrstvy |
| `index.js` `speech:` URL | bez `?v=` | spoléhá na OBS refresh bust |

### Smoke (tento běh)
- `127.0.0.1:3000` — **DOWN**
- OBS WS `4455` — **DOWN**  
→ HTTP/OBS smoke přeskočen; disk + mapování ověřeny. Po startu serveru: overlay URL + `npm run obs:refresh-overlays`.

---

## 4. Unused assets (kandidáti — **nemazat hromadně**)

| Kandidát | ~velikost | Proč kandidát |
|----------|-----------|---------------|
| `moods/*.pre-*.png` | ~237 MB / **308** souborů | backupy vedle live |
| `moods/_prenorm_backup/` | ~244 MB | prenorm archiv v hot path |
| `assets/kojnozrout/_archive/` | ~123 MB | historické banky (v17–v21, purple-originals, dated dumps) |
| `generated/gift-animations/` staré joby | 47 dirs / ~28 MB | 18× `31-gfx-next`, 19× other, 9× `32-gfx-whole` |
| `gift-creatures/**/*-raw.png` | ~9 MB | pipeline raw vedle finálních PNG |
| `cyber/lip/02.png`, případně `hero.png` | ~3 MB | retired / duplikát vůči speak |
| `kojnozrout-overlay.html` | — | legacy oproti `kojnozrout-runtime.html` (stále v allowlist `index.js`) |
| Gallery / proof HTML (`koj-*-gallery`, `*-proof.html`) | — | mimo Graphics Whole hot path |
| Body-part overlays (`MIA_HEAD`…) | — | refresh je schovává; interim whole-sprite |

---

## 5. Duplicates / zmatek archive vs live

| Typ | Stav |
|-----|------|
| Live moods vs `_archive` + `*.pre-*` | 🟡 velké riziko „šáhnu do špatné banky“ |
| OBS dual naming (výše) | 🟡 |
| `gift-moment-overlay` vs `gift-animation-overlay` | 🟡 oba v katalogu; WAU = gift-animation |
| Manifest body-parts vs whole-sprite runtime | 🟡 záměrné interim (freeze), ne bug |
| Generated job clutter v31 vs v32 | 🟡 |

---

## 6. Bundle / optimalizace (hrubé)

| Strom | ~MB |
|-------|-----|
| `assets/kojnozrout/moods` **celkem** | **730** |
| ├─ live `kojnozout-*.png` (bez `.pre-`) | ~242 |
| ├─ `*.pre-*.png` | ~237 |
| ├─ `_prenorm_backup` | ~244 |
| └─ `_raw` | ~8 |
| `assets/kojnozrout/_archive` | ~123 |
| `generated/gift-animations` | ~28 (47 jobů) |
| `assets/gift-creatures` | ~19 |
| `assets/mia/cyber` | ~7 |

**Odhad úspory bez změny artu:** přesun `*.pre-*` + `_prenorm_backup` + `_archive` mimo serve root / do cold archive → řádově **~600 MB** méně v hot path (v33 housekeeping).

---

## Doporučené v33 fixy (priorita)

1. **Sjednotit MIA presence bust** — `MiaLivePresence.BUST` → `32-gfx-whole` (nebo číst `MiaRigAnchors.CACHE_BUST`); speech CSS `15-world-unify` → stejný bust.  
   - *changed:* cache klíče pose/mask  
   - *deps-runtime:* speech overlay, OBS refresh  
2. **Dokumentovat / aliasovat OBS názvy** — mapa `MIA_BUBBLE`↔`MIA_SPEECH`, `KOJNOZROUT_RUNTIME`↔`MIA_KOJ_RUNTIME`, bowl V2↔`MIA_BOWL` v manifestu nebo apply skriptu.  
3. **Housekeeping assetů** — přesunout `*.pre-*`, `_prenorm_backup`, `_archive` z hot path (ne delete bez backupu); prune staré gift joby (`31-gfx-next`).  
4. **Gift stage particle parity** — volitelně mount `mia-tech-energy.js` na gift overlay (nebo upravit docs, že stage = CSS-only).  
5. **Centralizovat bust v `index.js` overlay URL** — `speech` / `runtime` / `bowl` stejně jako `giftAnimation` (`?v=33-…`).

Šablona delty při implementaci:

```text
## Graphics delta v33
- baseline: v32-gfx-whole (docs/GRAPHICS_CHECKPOINT_v32.md)
- added:
- changed:
- removed:
- deps-runtime:
```

---

## Co záměrně neřešit „opravou v32“

- Head slot = clip/mock  
- Gift `trueAiVideo=false`  
- Graphics Studio Phase 13+  

---

## Změny kódu v tomto post-checku

**Žádné.** Freeze v32 nedotčen. Žádný `v=33-…` bump.

---

*Post-check dokončen 2026-07-20. Další grafická práce = v33+.*
