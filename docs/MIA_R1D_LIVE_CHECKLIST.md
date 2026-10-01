# MIA — R1-D Live Checklist

**Datum šablony:** 2026-07-28  
**Typ:** Operační release gate (live E2E) — **žádné nové funkce**  
**Navazuje na:** [`MIA_DECISION_LATER_WORKSHOP.md`](./MIA_DECISION_LATER_WORKSHOP.md) → kapitola **Exit Criteria**  
**Předchůdce (historický):** `MIA_R1C_OBS_RESULT.md` (PASS 2026-07-26) — **neplatí jako fresh důkaz pro R1-D**  
**Prep stav:** [`MIA_STABILIZATION_CHECKPOINT.md`](./MIA_STABILIZATION_CHECKPOINT.md) — **FROZEN — awaiting R1-D RESULT** (žádné další audity)

---

## 0. Meta session

| Pole | Hodnota |
|------|---------|
| Session ID | R1-D-________ |
| Datum / čas start | |
| Datum / čas konec | |
| Operátor | |
| Host / platforma | ☐ **TikTok (Fáze 1 — jádro PASS)** · ☐ Kick · ☐ TikTok+Kick (Fáze 2 follow-on) |
| Orientace | ☐ Landscape (jádro) · ☐ Portrait (mimo jádro) |
| MIA verze / commit | |
| OBS verze | |
| Dual voice | ☐ OFF (povinné) · ☐ ON (FAIL guardrail pokud omylem) |
| Engine2 stub | ☐ OFF (očekáváno) |

---

## 1. Preconditions

R1-D Live jako **oficiální gate** se spouští **až** po uzavření Decision Later Workshopu.

### 1.1 Exit Criteria workshopu

Zdroj: `MIA_DECISION_LATER_WORKSHOP.md` → **Exit Criteria**.

| # | Podmínka | Stav |
|---|----------|------|
| 1 | DL-01…DL-08 mají finální KEEP / CHANGE / REMOVE / POSTPONE | ☑ SoT = Platform Arena |
| 2 | R1-D checklist schválen (tento dokument) | ☑ **APPROVED** |
| 3 | High priority mají vlastníka (DL-01, DL-02, DL-08, DL-09) | ☑ **ASSIGNED** |
| 4 | Každý CHANGE má termín (Před R1-D / Před Lock / Po Lock) | ☑ |
| 5 | Lock potvrzen jako přípustný cíl po R1-D (single-host) | ☑ **CONFIRMED** |
| — | Workshop uzavřen (datum + vlastník v workshop doc) | ☑ **CLOSED 2026-07-28** |

**Gate:** všech 6 řádků ☑ → **R1-D LIVE: GO**. Runtime session spouští operátor.

### 1.2 Vlastníci High priorit

| ID | Téma | Vlastník (jméno) | Potvrzeno |
|----|------|------------------|-----------|
| DL-01 | Spam T4 HUD vs shadow T3 | **Váša Špíňák — Project Owner / Operator** | ☑ |
| DL-02 | Bowl 95 % vs 100 % T4 | **Váša Špíňák — Project Owner / Operator** | ☑ |
| DL-08 | Live 2-stream (scope) | **Váša Špíňák — Project Owner / Operator** | ☑ |
| DL-09 | Persist bak / mid-write (chaos vstup) | **Váša Špíňák — Project Owner / Operator** | ☑ |

### 1.3 Finální PASS/FAIL očekávání DL-01 … DL-08

Zapsáno z workshopu 2026-07-28. Expected Result v Test Matrix musí sedět.

| ID | Finální rozhodnutí | Termín CHANGE | PASS očekávání pro R1-D (1 věta) | Zapsáno |
|----|--------------------|---------------|----------------------------------|---------|
| DL-01 | **CHANGE-align** | Implementace **Před Lock** | HUD T4 ↔ video reward tier konzistentní | ☑ |
| DL-02 | **CHANGE-align** | Implementace **Před Lock** | Vizuál plná miska ↔ T4 trigger současně | ☑ |
| DL-03 | **CHANGE kánon** | Docs **Před Lock** | Bond-only CARE; Trust ≠ povinné | ☑ |
| DL-04 | **KEEP dual + SoT** | Merge **Po Lock** | **SoT = Platform Arena**; duel = extended po Lock | ☑ |
| DL-05 | **KEEP stub + POSTPONE productize** | Productize **Po Lock** | Away **mimo** povinné jádro | ☑ |
| DL-06 | **CHANGE docs** hotovo | **Před R1-D** ✅ | Dual voice OFF v runtime + `mia-guardrails.mdc` | ☑ |
| DL-07 | **CHANGE = provést R1-D** | — | Fresh live evidence v této session | ☑ |
| DL-08 | **POSTPONE mimo jádro** | 2-stream **Po Lock** | Multi-host neblokuje jádro · 2-stream: ☑ mimo | ☑ |

### 1.4 Environment smoke (před scénáři)

| Check | Expected | Actual | ☐ |
|-------|----------|--------|---|
| MIA běží, ingest dostupný | HTTP OK / bez crash loop | | ☐ |
| OBS připojen (WS / bootstrap) | Connected | | ☐ |
| Browser sources z manifestu | Speech / gift / Koj / voice přítomny | | ☐ |
| `MIA_VOICE` jediný TTS sink | Bez dvojitého hlasu na Desktop | | ☐ |
| Public `/overlay-state` bez coins | Jen miaPoints na public | | ☐ |
| `npm run test:preflight:fast` (volitelně před live) | Green / poznámka | | ☐ |

---

## 2. Test Matrix — povinné jádro (single-host)

**Legenda výsledku:** `PASS` · `FAIL` · `DEVIATION` · `SKIP` (jen s důvodem)

Evidence: cesta k logu / screenshot / video (nebo `—`).

### R1D-01 — Gift → Economy → Public strip

| Pole | Obsah |
|------|--------|
| **Scénář** | Gift (TikFinity/Kick) → resolver → miaPoints → public overlay strip |
| **Expected** | Strip/HUD ukazuje miaPoints; **žádné coins / gift value** ve veřejném overlay |
| **Actual** | |
| **Result** | ☐ PASS · ☐ FAIL · ☐ DEVIATION · ☐ SKIP |
| **Evidence** | |
| **DL vazba** | Guardrail XC-04 / S07 |

### R1D-02 — Gift → Video / OBS + Combo/Spam HUD

| Pole | Obsah |
|------|--------|
| **Scénář** | Gift → video slot OBS + combo/spam wave HUD |
| **Expected** | Dle **DL-01 CHANGE-align**: HUD spam/wave tier a video reward tier **sedí**. Media slot přehrává; HUD bez coins. Nesoulad = DEVIATION/FAIL → Fix Before Lock. |
| **Actual** | |
| **Result** | ☐ PASS · ☐ FAIL · ☐ DEVIATION · ☐ SKIP |
| **Evidence** | |
| **DL vazba** | DL-01 · S02 |

### R1D-03 — Music gift → bubble, TTS off

| Pole | Obsah |
|------|--------|
| **Scénář** | Gift s hudbou / music policy |
| **Expected** | TTS potlačen; textová bublina OK; žádný paralelní dual voice |
| **Actual** | |
| **Result** | ☐ PASS · ☐ FAIL · ☐ DEVIATION · ☐ SKIP |
| **Evidence** | |
| **DL vazba** | S03 · XC-22 |

### R1D-04 — Chat → TTS → bubble hide → MIA_VOICE (anti-echo)

| Pole | Obsah |
|------|--------|
| **Scénář** | Chat → speaker → Edge TTS → `MIA_VOICE`; bublina skrytá během TTS |
| **Expected** | Slyšitelný hlas z MIA_VOICE; bez echo Desktop+Voice; bublina hide během playback |
| **Actual** | |
| **Result** | ☐ PASS · ☐ FAIL · ☐ DEVIATION · ☐ SKIP |
| **Evidence** | |
| **DL vazba** | S06 · DL-07 |

### R1D-05 — Bowl / Koj reakce

| Pole | Obsah |
|------|--------|
| **Scénář** | Support/gift → bowl fill → Koj display / celebrate dle policy |
| **Expected** | Dle **DL-02 CHANGE-align**: vizuál „plná miska“ a T4 trigger **ve stejném okamžiku**. CARE dle **DL-03**: bond-only (Trust ≠ povinné). Nesoulad práhů = DEVIATION/FAIL → Fix Before Lock. |
| **Actual** | |
| **Result** | ☐ PASS · ☐ FAIL · ☐ DEVIATION · ☐ SKIP |
| **Evidence** | |
| **DL vazba** | DL-02 · DL-03 · S04 |

### R1D-06 — Single-host battle / arena spot

| Pole | Obsah |
|------|--------|
| **Scénář** | Gift/support → world layer → **Platform Arena** (DL-04 Stream Core SoT) |
| **Expected** | Power/HUD v miaPoints; **Platform Arena** reaguje; OBS arena vrstva pokud součástí setupu. Cross-stream duel = mimo jádro (extended / Po Lock). |
| **Actual** | |
| **Result** | ☐ PASS · ☐ FAIL · ☐ DEVIATION · ☐ SKIP |
| **Evidence** | |
| **DL vazba** | DL-04 · S05 |

### R1D-07 — Soft restart hydrate

| Pole | Obsah |
|------|--------|
| **Scénář** | Graceful stop MIA → start → hydrate Koj/runtime/economy ze `data/*.json` |
| **Expected** | Stav Koj/runtime obnoven bez wipe; overlay/voice fronty ephemeral OK |
| **Actual** | |
| **Result** | ☐ PASS · ☐ FAIL · ☐ DEVIATION · ☐ SKIP |
| **Evidence** | |
| **DL vazba** | S09 · DL-09 vstup |

### R1D-08 — Soft chaos: kill Node mid-activity → boot

| Pole | Obsah |
|------|--------|
| **Scénář** | Kill procesu MIA během gift/aktivity → restart |
| **Expected** | Boot bez crash loop; soft-fail corrupt OK; zaznamenat ztrátu stavu (vstup DL-09). **Není** FAIL jen proto, že chybí `.bak` — to je Decision later; FAIL = nebootuje / guardrail leak. |
| **Actual** | |
| **Result** | ☐ PASS · ☐ FAIL · ☐ DEVIATION · ☐ SKIP |
| **Evidence** | |
| **DL vazba** | DL-09 · S10 |

### R1D-09 — OBS reconnect / voice revive

| Pole | Obsah |
|------|--------|
| **Scénář** | Restart OBS nebo `obs:revive-voice` / ensure-voice (dle prostředí) |
| **Expected** | Bootstrap/reconnect path; `MIA_VOICE` opět hraje; post-connect chain OK |
| **Actual** | |
| **Result** | ☐ PASS · ☐ FAIL · ☐ DEVIATION · ☐ SKIP |
| **Evidence** | |
| **DL vazba** | S08 · DL-07 |

### Souhrn jádra

| ID | Result |
|----|--------|
| R1D-01 Economy strip | |
| R1D-02 Gift video/HUD | |
| R1D-03 Music gift | |
| R1D-04 Voice anti-echo | |
| R1D-05 Bowl/Koj | |
| R1D-06 Battle SoT | |
| R1D-07 Restart hydrate | |
| R1D-08 Chaos kill | |
| R1D-09 OBS/voice revive | |

| Metrika jádra | Počet |
|---------------|-------|
| PASS | |
| FAIL | |
| DEVIATION | |
| SKIP | |

---

## 2b. Extended (mimo povinné jádro) — pouze pokud DL-08 / ops schválí

Tyto řádky **neblokují** GO jádra, pokud jsou explicitně mimo scope.

| ID | Scénář | Expected | Actual | Result | Evidence |
|----|--------|----------|--------|--------|----------|
| R1D-X1 | 2-stream duel (DL-08) | Oba hosty sync | | ☐ PASS/FAIL/DEV/SKIP | |
| R1D-X2 | Away / NEJSEM TU full (DL-05) | Product flow | | ☐ | |
| R1D-X3 | Portrait layout | 1080×1920 OK | | ☐ | |
| R1D-X4 | Editor live custom shot | Bank→gift | | ☐ | |
| R1D-X5 | Multi-day streak | Continuita | | ☐ | |
| R1D-X6 | Gift+chat burst fronty | Bez echo/dvojité bubliny | | ☐ | |

---

## 3. Deviation Log

Každá odchylka od Expected = nový řádek. Během R1-D **neopravit tiše** bez rozhodnutí.

| ID | Popis | Severity | Rozhodnutí | Vlastník | Termín |
|----|-------|----------|------------|----------|--------|
| DEV-01 | | ☐ Critical · ☐ High · ☐ Medium · ☐ Low | ☐ Fix Before Lock · ☐ After Lock · ☐ Accept | | |
| DEV-02 | | | | | |
| DEV-03 | | | | | |
| DEV-04 | | | | | |
| DEV-05 | | | | | |

**Pravidla severity → Lock**

| Severity | Dopad na Lock |
|----------|----------------|
| **Critical** | Typicky **NO GO** dokud Fix Before Lock |
| **High** | **GO WITH LIMITATIONS** max, pokud Accept + vlastník; jinak Fix Before Lock |
| **Medium / Low** | Může **GO** s After Lock / Accept |

---

## 4. Release Recommendation

Vyplnit až po dokončení povinného jádra (+ extended pokud běželo).

| Volba | Kritérium (orientační) | Zvoleno |
|-------|------------------------|---------|
| **GO** | Jádro bez Critical/High FAIL; DEVIATION jen Accept/After Lock | ☐ |
| **GO WITH LIMITATIONS** | High DEVIATION Accept s vlastníkem; omezení zapsána níže | ☐ |
| **NO GO** | Critical FAIL nebo neuzavřené High bez Fix/Accept | ☐ |

**Omezení (pokud GO WITH LIMITATIONS):**

```
…
```

**Odůvodnění (2–5 vět):**

```
…
```

| Pole | Hodnota |
|------|---------|
| Doporučení | ☐ GO · ☐ GO WITH LIMITATIONS · ☐ NO GO |
| Datum | |
| Operátor | |

---

## 5. Stream Core Lock Decision

Lock **není** automatický při GO. Vyžaduje doporučení GO / GO WITH LIMITATIONS **a** potvrzení vlastníka.

| Check | Stav |
|-------|------|
| R1-D jádro dokončeno | ☐ |
| Release Recommendation ≠ NO GO | ☐ |
| Critical DEVs uzavřeny (Fix nebo N/A) | ☐ |
| High DEVs: Fix Before Lock hotov **nebo** Accept + vlastník | ☐ |
| Freeze plochy odsouhlaseny (overlay API, event flow, guardrails, behavior router) | ☐ |

| Pole | Hodnota |
|------|---------|
| Stream Core Lock | ☐ Splněno · ☐ Nesplněno |
| Datum | |
| Podpis vlastníka | |
| Commit / tag Lock (volitelně) | |

**Po Lock:** jen bugfixy + CHANGE s termínem Před Lock (dokončit) / Po Lock (plán). **Žádné** architektonické přepisy ani Master wire.

---

## 6. Quick reference — mimo jádro (nepřidávat do PASS jádra)

| Položka | Status v R1-D |
|---------|----------------|
| 2-stream duel | Extended / POSTPONE (DL-08) |
| Away full | Mimo jádro (DL-05) |
| Portrait | Extended |
| Editor Tauri / live shot | Po Lock |
| Master Recovery/Battle wire | Po Lock |
| Persist `.bak` implementace | Po chaos (DL-09) — ne blok startu R1-D |

---

## Zdroje

| Dokument | Role |
|----------|------|
| [`MIA_DECISION_LATER_WORKSHOP.md`](./MIA_DECISION_LATER_WORKSHOP.md) | Exit Criteria, DL-01…08, R1-D scope |
| [`MIA_AUDIT_ETAPA_4_CROSS/05_SUMMARY.md`](./MIA_AUDIT_ETAPA_4_CROSS/05_SUMMARY.md) | Scenario scorecard S01–S12 |
| [`MIA_AUDIT_ETAPA_4_CROSS/01_CROSS_CONTRACTS.md`](./MIA_AUDIT_ETAPA_4_CROSS/01_CROSS_CONTRACTS.md) | XC + ownership |
| `MIA_R1C_OBS_RESULT.md` | Historický PASS — ne fresh |

---

## Stav dokumentu

| Pole | Hodnota |
|------|---------|
| Typ | Operační checklist R1-D Live |
| Kód změněn | **Ne** |
| Schválení checklistu (precondition 1.1 #2) | ☑ **APPROVED** |
| Datum schválení | **2026-07-28** |
| Vlastník schválení | **Váša Špíňák — Project Owner / Operator** |
| DL-01…08 zápis | ☑ 2026-07-28 · SoT = **Platform Arena** |
| DL-06 guardrails | ☑ dual voice OFF v `mia-guardrails.mdc` |
| High owners | ☑ **Váša Špíňák** (4× ASSIGNED) |
| R1-D Live gate | **GO** (session spouští operátor) |
