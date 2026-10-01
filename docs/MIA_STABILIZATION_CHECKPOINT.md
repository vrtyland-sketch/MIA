# MIA — Stabilization Checkpoint

**Datum:** 2026-07-29  
**Stav:** **FROZEN — awaiting R1-D RESULT**  
**Operátor / vlastník:** Váša Špíňák  

---

## Verdikt

Přípravná fáze (audity + Evidence Design) je **uzavřená**.  
**Žádný nový úkol** před R1-D RESULT.

```text
PREP: CLOSED
AUDITS: FROZEN
EVIDENCE DESIGN: COMPLETE
IMPLEMENTATION: FROZEN
RUNTIME: FROZEN (po asset expansion)
NEXT GATE: R1-D RESULT
R1-D SCOPE (PASS jádro): Fáze 1 = TikTok-only Stream Core
FIRST POST-R1-D CANDIDATE: manifest.json enforcement
```

**Jediná schválená výjimka (uzavřena 2026-07-29):**  
`mia-live-presence.js` — `PRESENCE.faces` přepojeno na `parts/head/*.png` (7 distinct moods).  
`tests/mia_graphics_studio_14a_live_presence_contract.js` — contract aktualizován.  
`node --check index.js`: OK · `preflight:fast`: **164 / 164 PASS**.

---

## R1-D scope — co znamená PASS

Hlavní neznámá už **není** architektura ani dokumentace, ale **chování v živém provozu**.

### Tři vrstvy vývoje (oddělené cíle)

```text
Stream Core              ← Fáze 1 (R1-D jádro PASS)
        ↓
Multi-Ingest             ← Fáze 2 (po PASS Fáze 1)
        ↓
Platform-specific Features ← Fáze 3 (až po Lock Stream Core)
```

Problém ve Fázi 2 **nezpochybňuje automaticky** stabilitu Stream Core.

### Fáze 1 — R1-D TikTok (Stream Core jako celek)

Cíl: potvrdit hlavní řetězec při živém streamu, ne „otestovat všechno“.

```text
TikTok Event → Normalizer → Decision → Economy → Video → Overlay
  → Voice → Kojnožrout / Bowl → Persistence → OBS Output
```

Architektura (platná):

```text
TikTok ──┐
         ├──► MIA Runtime ──► OBS (jeden obraz) ──► TikTok stream
Kick ────┘                                    └──► Kick stream
```

| Fáze | Co | Součást PASS R1-D jádra? |
|------|-----|---------------------------|
| **1** | Pouze **TikTok** — celý řetězec výše | **Ano** — Gate Stream Core |
| **2** | TikTok + Kick současně — multi-ingest do stejného jádra; platform tag; bez kolizí/ztrát; **stejný** OBS výstup | Po PASS Fáze 1 · **neblokuje** jádro PASS, pokud není výslovně zařazeno |
| **3** | Platform-specific rendering (jiný overlay/kamera/info per platforma) | Mimo R1-D · až po Lock Stream Core |

**Poznámka:** Fáze 2 ≠ **DL-08** (2-stream duel / multi-host). DL-08 zůstává POSTPONE Po Lock. Fáze 2 = multi-platform **ingest** do jednoho runtime + jeden OBS canvas.

**Doporučení:** první oficiální R1-D = Fáze 1. Po PASS → Fáze 2. Fáze 3 až po Lock.  
**Další vstup:** data z R1-D Live — rozhodnutí podle skutečného chování, ne předpokladů.

---

## Co je hotové (prep closed)

| Artefakt | Soubor / místo |
|----------|----------------|
| Architektonické / capability audity | Etapa 3A–3I, Etapa 4 Cross |
| Decision Later Workshop | `MIA_DECISION_LATER_WORKSHOP.md` — CLOSED |
| E2E mapa | `MIA_FULL_SYSTEM_E2E_AUDIT.md` |
| Live Bug Tracker (prázdný do RESULT) | `MIA_LIVE_BUG_TRACKER.md` |
| R1-D checklist | `MIA_R1D_LIVE_CHECKLIST.md` — APPROVED |
| Release Candidate | `MIA_RELEASE_CANDIDATE_R1.md` — R1-D LIVE: GO |
| Observability Cheatsheet | `MIA_R1D_OBSERVABILITY_CHEATSHEET.md` |
| **Evidence Layer Design** | `MIA_EVIDENCE_LAYER_DESIGN.md` — **COMPLETE** |
| Reprodukční checklisty / SF mapa / queue inventura | prior docs (hypotheses ≠ bugs) |

---

## Zakázáno do R1-D RESULT

- Jakýkoli nový úkol / audit / design rozšíření  
- Změny Stream Core / runtime / graphics  
- Implementace Evidence Layer / packer / automatizace  
- Engine 2.0  
- Commit / push bez výslovného příkazu  
- Stream Core Lock bez RESULT + Recommendation + výslovného potvrzení  

---

## Po R1-D RESULT — Cursor playbook

### 1. Vyhodnoť scénář

| Scénář | Kdy |
|--------|-----|
| **PASS** | Kritické R1D bez FAIL; recommendation směrem k GO |
| **GO WITH LIMITATIONS** | High DEVIATION Accept + vlastník; omezení zapsána |
| **NO GO** | Critical/High FAIL bez Accept; nový testovací cyklus |

### 2. Evidence (ruční case — dle designu)

Pro každý potvrzený **DEV** nebo **FAIL**:

1. Vytvoř / připrav `EVT-XXXX` case  
2. Vyplň `manifest.json` **v1** (povinný)  
3. Připoj `timeline.md` + dostupné artefakty  
4. `BUG-XXX` založ **pouze** u potvrzeného problému  

Pravidla:

- EVT může existovat **bez** BUG (PASS / DEV / INCONCLUSIVE)  
- Jeden BUG → 1+ EVT  
- Bug Tracker = **jen index** na EVT (bez dumpů logů / médií)

### 3. Aktualizuj dokumenty

1. `MIA_R1D_LIVE_CHECKLIST.md` — Actual / Result / Evidence / Recommendation  
2. `MIA_LIVE_BUG_TRACKER.md` — jen potvrzené FAIL + odkazy EVT  
3. `MIA_RELEASE_CANDIDATE_R1.md` — Recommendation po RESULT  

### 4. Lock a automatizace

- Stream Core Lock: jen Recommendation GO (nebo GWL dle checklistu) **a** výslovné potvrzení operátora  
- Automatický Evidence Layer / packer: **jen po výslovném schválení**  
- První post-R1-D kandidát (až schváleno): **manifest.json enforcement**

---

## Vstup, který odblokuje Cursor

```text
R1-D RESULT
Session ID: …
Recommendation kandidát: PASS | GO WITH LIMITATIONS | NO GO
R1D-01 … R1D-09: PASS/FAIL/DEVIATION/SKIP + 1 řádek evidence
Deviation Log (pokud něco)
```

Do té doby: **čekání**. Žádný nový úkol.

---

**Checkpoint:** CLOSED · Evidence Design COMPLETE · Implementation FROZEN · awaiting R1-D RESULT.
