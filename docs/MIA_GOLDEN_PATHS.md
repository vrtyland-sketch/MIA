# MIA — Golden Paths (řídicí dokument)

**Status:** **LOCK** · docs-only · FREEZE-safe  
**Datum:** 2026-08-08  
**Účel:** jediný produktový gate — co smí do thaw kódu a v jakém pořadí

> **GP-S has priority over GP-C. While GP-S != PROD 5/5, runtime changes unrelated to GP-S are prohibited.**

Detailní scorecards (jediný zdroj pravdy pro články řetězce):

| ID | Golden Path | Scorecard | Stav (2026-08-08) |
|----|-------------|-----------|-------------------|
| **GP-S** | Rose → kompletní reakce → divák | [`MIA_GOLDEN_PATH_GP-S_ROSE.md`](./MIA_GOLDEN_PATH_GP-S_ROSE.md) | **FAIL** (0/15 článků PROD 5/5) |
| **GP-C** | PNG → publikovatelný 8s Reel MP4 | [`MIA_GOLDEN_PATH_GP-C_PNG_REEL.md`](./MIA_GOLDEN_PATH_GP-C_PNG_REEL.md) | **FAIL** (2/12 článků PROD 5/5) |

**Operační pořadí (neprorušitelné):**

```text
HW → THAW CLEAN → GP-S Rose → PROD 5/5 → GP-C PNG→Reel → PROD 5/5 → teprve potom rozšiřování Creative Studia
```

Související: [`MIA_OPERATIONS_STATUS.md`](./MIA_OPERATIONS_STATUS.md) · [`FEATURE_FREEZE_CONTENT_PASS.md`](./FEATURE_FREEZE_CONTENT_PASS.md) · [`PRE_MIGRATION_BASELINE_EVIDENCE.md`](./PRE_MIGRATION_BASELINE_EVIDENCE.md)

---

## 1. Proč Golden Paths (ne preflight %)

Unit/contract testy (např. `preflight:fast` 165/165) měří **součástky**. Golden Paths měří **produkty**:

- **GP-S:** divák dostane kompletní Rose reakci
- **GP-C:** operátor dostane publikovatelný Reel MP4

**False-green pasti:** ingest smoke false-green · AI image TEST green + procedural FAIL · „skoro fungovalo“ bez ucha/oka.

---

## 2. PROD 5/5 (lock)

**PROD na článek** = **všech pět** gate (ne 4/5):

| Gate | GP-S (Stream) | GP-C (Creative) |
|------|---------------|-----------------|
| IMPLEMENTED | kód existuje | kód existuje |
| TESTED | contract/preflight | contract/preflight |
| PROOF | **LIVE** — viděl/slyšel ve streamu | **REAL OUTPUT** — soubor existuje |
| QUALITY | divák akceptuje | „dal bych na TikTok“ (≥ ACCEPTABLE) |
| REPEAT | 3/3 (+ burst u GP-S) | 3/3 stejný workflow |

**E2E PROD** = **všechny články** scorecard PROD. **Ne průměr. Nejslabší článek rozhoduje.**

---

## 3. Fáze po migraci

### Fáze 0 — INFRA (žádný feature kód)

- Síť, ping, MIA `:3000`, OBS WS `:4455`, TikFinity → ingest  
- Checklist: [`MIA_MULTI_PC_DAY1_CHECKLIST.md`](./MIA_MULTI_PC_DAY1_CHECKLIST.md)

### Fáze 1 — THAW CLEAN

1. `node --check index.js`  
2. `npm run test:preflight` **full**  
3. Triáž FAIL/WARN  
4. Fix `ingest_contract_smoke` false-green  
5. Znovu full → **THAW CLEAN**

Viz [`POST_FREEZE_BACKLOG.md`](./POST_FREEZE_BACKLOG.md) · [`MIA_OPERATIONS_STATUS.md`](./MIA_OPERATIONS_STATUS.md) fáze C.

### Fáze 2 — GP-S ONLY (dokud GP-S ≠ PROD)

**Golden Rose protocol:**

```text
Rose #1 → 10 s pauza → Rose #2 → 10 s pauza → Rose #3
→ krátká pauza → burst 3× Rose
```

Pořadí ověření:

```text
síť → OBS stabilita → TikFinity stabilita
  → Golden Rose singles 3/3 → burst
  → screenshot (no coins) → log evidence → verdikt
```

**GP-S = PROD 5/5** nebo explicitní seznam blokujících článků ve scorecard.

### Fáze 3 — GP-C (až GP-S PROD)

Blocker stack: [`MIA_GOLDEN_PATH_GP-C_PNG_REEL.md`](./MIA_GOLDEN_PATH_GP-C_PNG_REEL.md) § Blocker stack (CS2-1…6).

### Fáze 4 — Rozšíření Creative Studia

Povoleno **jen** pokud obhajuje posun GP-S nebo GP-C. Blueprint: [`MIA_CREATIVE_STUDIO_2_BLUEPRINT.md`](./MIA_CREATIVE_STUDIO_2_BLUEPRINT.md).

---

## 4. PR Gate — co SMÍ / co NE

### ✅ SMÍ

| Typ | Podmínka |
|-----|----------|
| INFRA | ne mění business logiku gift/decision |
| GP-S článek | mapuje na řádek v GP-S scorecard |
| GP-S proof | Golden Rose evidence |
| GP-C článek | **až GP-S PROD** + mapuje na GP-C scorecard |
| Test fix | odstraňuje false-green |
| CONTENT/docs | text bank, gift-factory JSON, docs |

### ❌ NESMÍ (while GP-S ≠ PROD)

| Typ | Důvod |
|-----|-------|
| Runtime mimo GP-S článek | scope creep |
| GP-C implementace | GP-S priorita |
| OpenAI fallback „jen rychle“ | neléčí weakest link |
| Refactor `index.js` „ při tom “ | freeze risk |
| Genesis / Engine2 default ON | mimo golden path |
| Director obecný / provider router | před GP-C fáze; router až po motion fix |
| 1→N social variants | před GP-C PROD |
| Canon import do runtime | placeholder moduly |
| Live bez Golden protocol | false confidence |

---

## 5. PR checklist (povinné před merge)

```text
[ ] Posouvá GP-S nebo GP-C? (který: ___)
[ ] Který článek scorecard? (#: ___)
[ ] Který gate zvedá? (IMPL / TEST / LIVE|OUTPUT / QUALITY / REPEAT)
[ ] Golden test ovlivněn? (Rose / PNG→Reel / ne)
[ ] Mění runtime/ingest/OBS? → node --check + preflight:fast
[ ] Porušuje guardrails? (no coins, dual voice OFF, rotationIndexByTier, …)
[ ] False-green riziko?
[ ] GP-C PR: GP-S už PROD 5/5? (ne = STOP)
```

**Chybí první řádek → PR neprojde gate.**

---

## 6. Verdiktové stavy

| Stav | Význam |
|------|--------|
| **GP-S PROD** | 15/15 + Golden Rose pass → otevřít GP-C kód |
| **GP-S FAIL** | jakýkoli článek FAIL → jen infra + GP-S |
| **GP-C PROD** | 12/12 + Golden PNG→Reel pass |
| **THAW CLEAN** | full preflight + smoke fix |

---

## 7. Capability mapa (shrnutí)

| Produkt | Stream | Creative | Dnes |
|---------|--------|----------|------|
| Rose E2E | 🟡 | 🟡 | **NOT PROD** |
| PNG→Reel | — | 🔴 | **NOT PROD** (2/12) |
| Ruční PNG export | — | 🟢 | PROD |
| preflight:fast | 🟢 tests | — | ≠ produkt |

Inventura: [`MIA_CAPABILITY_INVENTORY.md`](./MIA_CAPABILITY_INVENTORY.md)

---

## 8. Nástěnka (1 věta)

> **Nejdřív Rose na železe. Pak PNG→Reel po článcích. Vše ostatní STOP, dokud neposune GP-S nebo GP-C.**

---

## Changelog

| Datum | Změna |
|-------|-------|
| 2026-08-08 | Initial lock — GP-S/GP-C scorecards + PR gate |
