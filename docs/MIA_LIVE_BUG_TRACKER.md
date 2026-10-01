# MIA — Live Bug Tracker

**Účel:** Jediné místo pro chyby nalezené při **živých streamech** (R1-D a další).  
**Pravidla:** Žádné nové funkce v tomto dokumentu · žádný tichý fix bez evidence · každá chyba **jednou** (ID).  

**Vztah:**  
- Scénáře R1-D → `docs/MIA_R1D_LIVE_CHECKLIST.md`  
- Checkpoint → `docs/MIA_STABILIZATION_CHECKPOINT.md` (fill až po R1-D RESULT; hypotézy ≠ bug)  
- Decision dluhy (DL-*) → `docs/MIA_DECISION_LATER_WORKSHOP.md` (ne duplicitně jako bug, pokud nejde o živý FAIL)  
- Po Stream Core Lock: do Core jen **bugfix / stabilizace**; nové funkce → samostatná větev (Engine 2.0+)

---

## Jak používat

1. Po live session vyplň **Session header**.  
2. Každou odchylku z Deviation Log / pozorování zapiš jako řádek **BUG-XXX** (nebo aktualizuj existující ID při retestu).  
3. Během testu **neopravuj tiše** — nejdřív evidence, pak oprava + commit, pak retest.  
4. Uzavři bug až `Retest = PASS` a `Uzavřeno = ANO`.

**Severity**

| Level | Význam |
|-------|--------|
| **Critical** | Stream nepoužitelný / crash / coin leak public / data wipe |
| **High** | Hlavní scénář R1-D FAIL / guardrail / audio echo / overlay rozbitý |
| **Medium** | Scénář částečně OK, UX/drift, nestabilita občas |
| **Low** | Kosmetika, docs, neblokuje Lock |

---

## Session log (nejnovější nahoře)

### Session — šablona

| Pole | Hodnota |
|------|---------|
| **Datum** | YYYY-MM-DD |
| **Commit** | `________` |
| **R1-D Session ID** | R1-D-________ |
| **Operátor** | Váša Špíňák |
| **Release Recommendation** | ☐ GO · ☐ GO WITH LIMITATIONS · ☐ NO GO |
| **Poznámka** | |

---

### Session — R1-D (čeká fill)

| Pole | Hodnota |
|------|---------|
| **Datum** | |
| **Commit** | |
| **R1-D Session ID** | |
| **Operátor** | Váša Špíňák — Project Owner / Operator |
| **Release Recommendation** | |
| **Poznámka** | Session ještě neproběhla — tracker připraven 2026-07-28 |

---

## Bug registry (každá chyba jen jednou)

| ID | Datum | Session | Commit (nález) | Popis | Závažnost | Jak reprodukovat | Příčina | Oprava | Commit opravy | Retest | Uzavřeno |
|----|-------|---------|----------------|-------|-----------|------------------|---------|--------|---------------|--------|----------|
| — | — | — | — | *Zatím žádný live bug — po R1-D doplnit* | — | — | — | — | — | ☐ PASS/FAIL | ☐ ANO/NE |

### Detailní záznam (kopíruj pro každý BUG-XXX)

```markdown
#### BUG-001

| Pole | Obsah |
|------|--------|
| Datum | |
| Commit (nález) | |
| R1-D Session ID | |
| Popis | |
| Závažnost | Critical / High / Medium / Low |
| Jak reprodukovat | 1. … 2. … 3. … |
| Příčina | *(po analýze; jinak TBD)* |
| Oprava | |
| Commit opravy | |
| Retest | PASS / FAIL |
| Uzavřeno | ANO / NE |
| Vazba R1-D | R1D-0X / DEV-0X |
| Vazba DL | DL-XX pokud relevantní |
```

---

## Rychlý index otevřených bugů

| ID | Severity | Popis (1 řádek) | Blokuje Lock? |
|----|----------|-----------------|---------------|
| — | — | *žádné otevřené* | — |

---

## Pravidlo po Stream Core Lock

```text
Stream Core branch / main stream path:
  → pouze bugfix + stabilizace (tento tracker)

Nové funkce / Engine 2.0 / cross-platform:
  → nová git větev
  → ne míchat do hotového Stream Core bez Lock výjimky
```

---

## Stav dokumentu

| Pole | Hodnota |
|------|---------|
| Typ | Live bug tracker (evidence only) |
| Kód změněn | **Ne** |
| První session | ⏳ čeká R1-D Live |
| Owner | Váša Špíňák — Project Owner / Operator |
