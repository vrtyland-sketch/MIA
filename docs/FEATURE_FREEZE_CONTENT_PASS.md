# FEATURE FREEZE — CONTENT PASS (čeká se na síťovou techniku)

**Status:** **ACTIVE**  
**Od:** 2026-08-08  
**Důvod:** Migrace MIA na více PC čeká na switch/síť — do té doby **žádný Node/OBS/síťový deploy**.

```
FEATURE FREEZE ON — NETWORK MIGRATION WAITING FOR HARDWARE
```

---

## Stav passů (2026-08-08)

| Kolej | Status |
|-------|--------|
| **TEXT PASS** | **STABLE** — coverage, charakterové patche, Voice Bible draft; další editace jen na vyžádání |
| **ASSET PASS** | **ANALYZED / CLEANUP PLAN READY** — inventura, retention policy, registry seed, role, dedup safety, video catalog plán |
| **PRE-MIGRATION BASELINE** | **CLOSED — PARTIAL / MIGRATION JUSTIFIED** — pipeline slyšet ~10 s; TikFinity pád; viz [`PRE_MIGRATION_BASELINE_EVIDENCE.md`](./PRE_MIGRATION_BASELINE_EVIDENCE.md) |
| **RUNTIME CLEANUP** | **POST-FREEZE ONLY** — žádné mazání, ref rewrite ani `save:false` během freeze |

Assetová kolej **zastavena** — analýza hotová; další hloubková práce až po hardware / unfreeze.

### Dokumentace (ASSET PASS)

| Fáze | Dokument |
|------|----------|
| 01 Inventura | [`ASSET_INVENTORY.md`](./ASSET_INVENTORY.md) |
| 02 Klasifikace | [`ASSET_INVENTORY_02_CLASSIFY.md`](./ASSET_INVENTORY_02_CLASSIFY.md) |
| 03A Retention (schváleno) | [`ASSET_PASS_03A_RETENTION_DESIGN.md`](./ASSET_PASS_03A_RETENTION_DESIGN.md) |
| 03B Registry seed | [`ASSET_PASS_03B_REGISTRY_SEED.md`](./ASSET_PASS_03B_REGISTRY_SEED.md) · [`content-pass/ASSET_REGISTRY.json`](../content-pass/ASSET_REGISTRY.json) |
| 04 Role | [`ASSET_PASS_04_ROLE_CLASSIFICATION.md`](./ASSET_PASS_04_ROLE_CLASSIFICATION.md) |
| 05 Dedup safety | [`ASSET_PASS_05_DEDUP_SAFETY.md`](./ASSET_PASS_05_DEDUP_SAFETY.md) |
| 05B Video catalog plán | [`ASSET_PASS_05B_VIDEO_CATALOG_PLAN.md`](./ASSET_PASS_05B_VIDEO_CATALOG_PLAN.md) — **PASS** |

### THAW CHECKPOINT (před jakoukoli runtime prací)

Viz [`POST_FREEZE_BACKLOG.md`](./POST_FREEZE_BACKLOG.md) — sekce **THAW CHECKPOINT**:

1. `npm run test:preflight` **full** — žádné runtime změny před výsledkem  
2. Triáž FAIL/WARN (runtime vs flaky test vs env)  
3. Opravit `ingest_contract_smoke` + false-green exit code  
4. Znovu full preflight → **thaw checkpoint CLEAN**

Asset/runtime cleanup (**RET-02**, dedup, …) až **po** čistém thaw checkpointu.

### POST-FREEZE EXECUTION ORDER

1. **RET-02** — vision tick `save:false` (MIA Eyes kohoutek)
2. **RET-01** — retention cleanup cron (dry-run → apply)
3. **SAFE_DEDUP** — execute (~62 MB prior SAFE + další po ref pass)
4. **Catalog ref rewrite** — 9× CANONICALIZABLE video skupin (~108 MB)
5. **Re-run dedup safety** — REVIEW → SAFE_DEDUP
6. **Semantic / ambiguous manual review** — tier/obsSlot rozhodnutí před zbylým ~340 MB

Backlog detail: [`POST_FREEZE_BACKLOG.md`](./POST_FREEZE_BACKLOG.md) · **Operační SoT:** [`MIA_OPERATIONS_STATUS.md`](./MIA_OPERATIONS_STATUS.md)

---

## Povoleno

| Kolej | Scope |
|-------|--------|
| **ASSET PASS** | **Jen docs/registry analýza — hotovo.** Úpravy souborů a runtime až post-freeze |
| **TEXT BANK PASS** | **STABLE** — další editace packů jen na vyžádání |
| **PRE-MIGRATION BASELINE** | Krátký live test (5–10 min) na **jednom PC** — šablona [`PRE_MIGRATION_BASELINE_EVIDENCE.md`](./PRE_MIGRATION_BASELINE_EVIDENCE.md); bez runtime/cleanup změn |
| **GOLDEN PATHS (docs lock)** | [`MIA_GOLDEN_PATHS.md`](./MIA_GOLDEN_PATHS.md) + scorecards GP-S/GP-C — produktový gate po thaw |

## Zakázáno

- Nové runtime funkce, ingest, decision engine, OBS integrace
- SSH migrace, stěhování MIA, síťové změny
- Změny `index.js`, pipeline, gift runtime logiky (kromě čistě datových JSON v `text-bank/`)
- GENESIS / multi-platform refactors
- FINAL GATE / plný R1-D live gate (až po hardware) — **výjimka:** PRE-MIGRATION BASELINE (PMB) výše
- **RET-01 / 12 GB cleanup** kvůli live testu — až post-freeze po thaw checkpointu

**Výjimka:** úpravy `text-bank/packs/*.json` a content registry/manifesty — **bez** změny loaderu nebo runtime voleb klíčů.

---

## Princip: každý asset a text má ID + účel

Logika později nepracuje s „nějakým obrázkem růže“, ale s **`GIFT_ROSE_VIS_01`**.  
Texty: **`THANK_SMALL_MIA_01` … `20`** (ne jen jedna věta).

Registry (obsahová vrstva, zatím bez napojení na runtime):

- `content-pass/ASSET_REGISTRY.json` — vizuály
- `content-pass/TEXT_VARIANT_REGISTRY.json` — mapování ID → pack key → text

---

# ASSET PASS

**Status: ANALYZED / CLEANUP PLAN READY** (2026-08-08) — **05B = PASS.**  
Během freeze **negenerovat, nemazat, nepřepisovat refs.**

## Shrnutí analýzy

| Metrika | Hodnota |
|---------|---------|
| Registry entries (content branch B) | 1 091 |
| Post-freeze jistá úspora (SAFE + canonicalizable video) | **~170 MB** |
| Semantic split + ambiguous (ruční review) | **~340 MB** |
| Retention policy | **APPROVED** — implementace RET-01…RET-05 post-freeze |

## Cíl (původní — fáze execution až po unfreeze)

Projít existující assety, sjednotit **digitální vizuální styl MIA**, rozměry, průhlednost, názvy, odstranit duplicity.

## Gift assety — vázat na gift mapu

Zdroj pravdy: [`shared/gifts/gift_map/`](../shared/gifts/gift_map/)

| Pole gift mapy | Asset rozhodnutí |
|----------------|------------------|
| `key` (ROSE, LION…) | prefix ID `GIFT_<KEY>_` |
| `category` (FLOWER, ANIMAL…) | série / složka |
| `defaultTier` (T1–T6) | video pool tier |
| coins / tier | kontrola správného tier videa |

### Kategorie (série)

| Kategorie | ID prefix | Poznámka |
|-----------|-----------|----------|
| FLOWER | `GIFT_*_FLOWER_` | růže, kytice |
| ANIMAL | `GIFT_*_ANIMAL_` | zvířata |
| LOVE | `GIFT_*_LOVE_` | srdce, láska |
| FOOD | `GIFT_*_FOOD_` | miska / care |
| LEGENDARY | `GIFT_*_LEG_` | T4+ |
| … | dle `gift_categories.json` | |

### ID konvence (vizuál)

```text
GIFT_<GIFTKEY>_VIS_<NN>     # video/animace (T1_VIDEO_01 → mapovat sem)
GIFT_<GIFTKEY>_OVL_<NN>     # overlay PNG/HTML asset
GIFT_<CATEGORY>_SHARED_<NN> # sdílená série (květiny generic)
MIA_OVERLAY_<NAME>_<NN>     # speech, bowl, bubble, koj runtime
```

### Kde hledat assety (repo)

| Cesta | Typ |
|-------|-----|
| `incoming-images/videos/` | gift videa (tier rotace) |
| `incoming-images/videos_2/` | nový intake |
| `incoming-images/other/` | PNG, manifesty |
| OBS browser sources | URL v OBS scénách → `speech-overlay.html`, `koj-*`, bowl |
| `public/` / overlay HTML | statické overlaye |

### Checklist ASSET PASS (analýza — hotovo)

- [x] Inventura 01 + klasifikace 02
- [x] Retention design 03A (schváleno)
- [x] Registry seed 03B
- [x] Role classification 04
- [x] Dedup safety 05 + video catalog plán 05B
- [ ] Execution: viz **POST-FREEZE EXECUTION ORDER** výše
- [ ] Gift mapa: runtime vazby — až po unfreeze

---

# TEXT BANK PASS

**Status: STABLE** (2026-08-08) — coverage PASS, Voice Bible draft; další batch jen na vyžádání.

## Cíl

**Žádné nové chování** — jen naplnit existující situace **více variantami**, aby MIA nemlela stejnou větu.

## Zdroj pravdy

| Cesta | Popis |
|-------|--------|
| [`text-bank/packs/`](../text-bank/packs/) | JSON packy `{ key, variants[] }` |
| [`scripts/MIA_TEXT_BANK_COVERAGE.js`](../scripts/MIA_TEXT_BANK_COVERAGE.js) | Povinné klíče z runtime |
| `npm run test:bank-coverage` | Ověření pokrytí (po editaci packů) |

## Situace k doplnění (min. 10–20 variant / klíč kde chybí)

| Skupina | Pack soubory / klíče |
|---------|---------------------|
| Small/medium/big gift | `support/support-mia-koj.json` → `support_small_*`, `support_medium_*`, `support_big_*` |
| Combo / spam 1 user | `support/support-spam-bowl.json` |
| Spam více lidí | `community/social.json`, spam packy |
| Bowl / full bowl | `support/support-spam-bowl.json`, koj feed |
| T4 / velký moment | `support_big_*`, story packy |
| Idle | `idle/idle.json` |
| Návrat po tichu | `mia/returning-viewer.json`, `koj/returning-viewer.json` |
| Pozdravy | `community/wake.json`, `mia/direct-core.json` |
| Koj hlad / nálady | `koj/feed-care.json`, `koj/vitals-care.json`, `emotion/emotion-koj.json` |
| Battle / duel | `mia/vitals-companion.json`, duel packy |
| Proactive / host | `mia/proactive-host.json` |

## ID konvence (text)

```text
<SITUATION>_<SPEAKER>_<NN>

Příklady:
  THANK_SMALL_MIA_01 … THANK_SMALL_MIA_20
  THANK_SMALL_KOJ_01 … THANK_SMALL_KOJ_20
  IDLE_MIA_01 … IDLE_MIA_15
  GREET_RETURN_MIA_01
  BOWL_FULL_KOJ_01
  SPAM_SINGLE_MIA_01
  SPAM_MULTI_MIA_01
  GIFT_T4_MIA_01
```

**Fáze 1 (teď):** ID v `TEXT_VARIANT_REGISTRY.json` + text v `variants[]` v existujících pack keys.  
**Fáze 2 (po unfreeze):** loader meta `variantId` — až se dovolí minimální runtime změna.

### Pravidla editace packů

1. **Nepřidávat nové pack keys** bez záznamu v `MIA_TEXT_BANK_COVERAGE` registry (jinak fail coverage testu).
2. Pouze **rozšiřovat `variants[]`** u existujících klíčů.
3. Po větší dávce: `npm run test:bank-coverage`
4. Žádné LLM-only nové větve — hotové věty do JSON.

### Checklist TEXT BANK PASS

- [ ] Export všech required keys: `node tests/text_bank_coverage_contract.js`
- [ ] Tabulka: key → počet variant → cíl (≥15?)
- [ ] Doplnit varianty per situace (viz tabulka výše)
- [ ] `TEXT_VARIANT_REGISTRY.json` — každá věta má ID
- [ ] Projít duplicity (stejná věta ve dvou pack keys)
- [ ] `npm run test:bank-coverage` — green

---

## Po dodání hardware

1. Feature freeze OFF (síť + migrace dle [`MIA_MULTI_PC_SETUP.md`](./MIA_MULTI_PC_SETUP.md))
2. **POST-FREEZE EXECUTION ORDER** (retention → dedup → catalog refs)
3. Napojit registry ID na runtime (volitelně, plánovaně)
4. STREAM_RECOVERY FINAL GATE

---

## Související

- [`STREAM_RECOVERY_01.md`](./STREAM_RECOVERY_01.md) — stream stabilita (paused)
- [`MIA_MULTI_PC_SETUP.md`](./MIA_MULTI_PC_SETUP.md) — až bude switch
- [`shared/gifts/gift_map/gift_catalog.json`](../shared/gifts/gift_map/gift_catalog.json)
