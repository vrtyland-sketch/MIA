# MIA — Evidence Layer Design

**Typ:** Architektonický návrh · **read-only** · **bez implementace**  
**Datum:** 2026-07-29  
**Owner:** Váša Špíňák — Project Owner / Operator  
**Stav:** ```EVIDENCE DESIGN: COMPLETE · IMPLEMENTATION: FROZEN · NEXT GATE: R1-D RESULT```  
**Vazba:** `MIA_STABILIZATION_CHECKPOINT.md` · `MIA_LIVE_BUG_TRACKER.md` · `MIA_R1D_LIVE_CHECKLIST.md` · `MIA_R1D_OBSERVABILITY_CHEATSHEET.md`

---

## 1. Účel — tři vrstvy diagnostického systému

Nejde o „složku s logy“. Evidence Layer je prostřední vrstva **diagnostického systému**:

| Vrstva | Účel | Otázka | Není |
|--------|------|--------|------|
| **1. Logs** (`logs/`) | Telemetrie | Co systém udělal? | Verdikt, screenshot, bug |
| **2. Evidence** (`evidence/`) | Tělo důkazu | Proč jsme rozhodli, že je to bug / PASS? | Seznam práce |
| **3. Bug Tracker** (`docs/MIA_LIVE_BUG_TRACKER.md`) | Index práce | Co je potřeba opravit? | Dump logů / media |

```text
logs/            →  „stalo se“
     ↓ pack
evidence/        →  „stalo se + důkaz + čas + scénář + verdikt“
     ↓ odkaz
bug-tracker/     →  „oprav tohle“ (BUG → EVT-…, EVT-…)
```

**Architektonické pravidlo:** Evidence = tělo důkazu. Bug Tracker = index.  
Tracker neobsahuje screenshoty, videa ani logy — jen ID a odkazy na `EVT-XXXX`.

---

## 2. Dvě stromy na disku: Raw vs Evidence

### 2.1 Raw logs (surový proud)

Zachovat / sjednotit pod `logs/` (už v `.gitignore`, rotace existuje):

```text
logs/
├── mia-events/          # nebo mia-events*.jsonl (dle dnešního writeLog)
├── mia-errors/
├── obs/                 # OBS websocket / bootstrap / reconnect excerpts
├── ingest/              # ingest-*.jsonl, dedup
├── runtime/             # boot, hydrate, kill/restart, voice revive
└── archive/             # po rotaci / po exportu do evidence (volitelně)
```

**Pravidlo:** `logs/` = append-only provoz. Operátor sem **ručně neukládá** screenshoty ani verdikty.

### 2.2 Evidence Layer (důkazové case files)

```text
evidence/
├── README.md                 # jak packovat (operátor + budoucí tool)
├── sessions/                 # volitelný index session → EVT/BUG/R1D
│   └── R1-D-YYYYMMDD.md
├── R1-D/
│   ├── R1D-01/
│   ├── R1D-02/
│   ├── … R1D-09/
│   └── RESULT.md             # verdikt session (PASS / GWL / NO GO)
├── bugs/
│   ├── BUG-001/
│   └── …
├── events/                   # atomické EVT-XXXX (ne vždy vázané na bug)
│   └── EVT-0001/
├── screenshots/              # inbox před přiřazením (nebo jen uvnitř case)
├── obs-recordings/           # inbox / velké media
└── exports/                  # zip/json dump pro sdílení
```

**Název vrstvy:** **Evidence Layer** (`evidence/` na disku).  
Alternativy (`runtime-evidence/`, `diagnostics/`) = synonyma; kanonický název zůstává **Evidence Layer**.

---

## 3. Jednotné ID

| Prefixe | Význam | Příklad | Kde žije |
|---------|--------|---------|----------|
| **SID-** / **R1-D-** | Live session | `R1-D-20260729-A` | checklist meta, Bug Tracker session |
| **R1D-0X** | Testovací scénář | `R1D-04` | checklist + `evidence/R1-D/R1D-04/` |
| **EVT-XXXX** | Atomický důkazový případ | `EVT-0042` | `evidence/events/EVT-0042/` |
| **BUG-XXX** | Potvrzený FAIL | `BUG-004` | Bug Tracker + `evidence/bugs/BUG-004/` |
| **DEV-0X** | Deviation (ne nutně bug) | `DEV-02` | Deviation Log → může odkazovat EVT |
| **CORR-** | Runtime correlation (budoucí) | `CORR-<uuid>` | pole ve všech related log řádcích |

### Vztahy

```text
Session (R1-D-…)
  └── Scenario (R1D-0X)  →  PASS | FAIL | DEVIATION | SKIP
        └── EVT-XXXX     →  jeden „případ“ (gift/chat/reconnect window)
              └── BUG-XXX (jen pokud FAIL potvrzen)
```

- **1 session** → mnoho scénářů.  
- **1 scénář** → 0..N EVT (opakované pokusy).  
- **1 EVT** → 0 nebo 1 BUG (FAIL → otevře BUG; PASS EVT zůstane bez bugu).  
- **1 BUG** → 1+ EVT (reprodukce / retest).

Hypotézy (SF-*, drainQueue, stale flush) **nejsou** ID Evidence Layer — smí být zmíněny ve `verdict.md` až po potvrzení živým FAIL.

---

## 4. Obsah jednoho důkazu (case file)

### 4.1 Minimální sada (povinná)

```text
EVT-0042/   (nebo BUG-004/ — stejný tvar)
├── manifest.json       # povinný strojově čitelný index case (viz §4.3)
├── description.md      # co operátor viděl / čekal
├── timeline.md         # Event Timeline (viz §6)
└── verdict.md          # PASS | FAIL | DEVIATION | INCONCLUSIVE + odkaz hypotéza?
```

### 4.2 Doporučená sada (kompletní)

```text
BUG-004/
├── manifest.json
├── description.md
├── timeline.md
├── verdict.md
├── mia-events.jsonl      # výřez, ne celý den
├── mia-errors.jsonl
├── obs.log               # nebo obs.jsonl excerpt
├── ingest.jsonl          # volitelně
├── screenshot.png        # / .webp
├── recording.mp4         # OBS / stream clip (velké → retention §7)
└── links.md              # volitelně: odkazy na inbox media, commit, DL-*
```

### 4.3 `manifest.json` — povinný, strojově čitelný

Každý `EVT-XXXX` **musí** mít `manifest.json`. Markdown je pro lidi; manifest je **databáze Evidence Layer** (dotazy bez parsování MD).

**Kanonický tvar (v1):**

```json
{
  "eventId": "EVT-0048",
  "session": "R1-D-20260729-A",
  "scenario": "R1D-02",
  "status": "FAIL",
  "severity": "HIGH",
  "relatedBug": "BUG-003",
  "timestamp": "2026-07-30T18:22:15Z",
  "tEnd": "2026-07-30T18:22:20Z",
  "modules": ["VIDEO_ENGINE", "OBS"],
  "correlationIds": [],
  "operator": "Váša Špíňák",
  "commit": "",
  "artifacts": [
    "timeline.md",
    "mia-events.jsonl",
    "obs.log",
    "recording.mp4"
  ],
  "hypothesisRefs": [],
  "trackerPath": "docs/MIA_LIVE_BUG_TRACKER.md#BUG-003"
}
```

| Pole | Povinné | Poznámka |
|------|---------|----------|
| `eventId` | ano | `EVT-XXXX` |
| `session` | ano | session ID |
| `scenario` | ano | např. `R1D-02` |
| `status` | ano | `PASS` \| `FAIL` \| `DEVIATION` \| `INCONCLUSIVE` \| `SKIP` |
| `severity` | při FAIL | `CRITICAL` \| `HIGH` \| `MEDIUM` \| `LOW` |
| `relatedBug` | při FAIL | `BUG-XXX` nebo `null` |
| `timestamp` | ano | start ISO-8601 |
| `modules` | ano | dotazovatelný seznam modulů na hraně selhání |
| `artifacts` | ano | soubory v case složce |

**Dotazy (budoucí tooling — bez implementace teď):**

```text
Všechny FAIL VIDEO_ENGINE     →  modules ⊇ VIDEO_ENGINE ∧ status=FAIL
Všechny FAIL z R1-D           →  session startsWith R1-D ∧ status=FAIL
Všechny BUG vázané na OBS     →  modules ⊇ OBS ∧ relatedBug ≠ null
```

Lidé čtou `timeline.md` / `verdict.md`. Stroje čtou **jen** `manifest.json`.

---

## 5. Co se ukládá kde

| Zdroj | Raw (`logs/`) | Evidence (výřez / kopie) |
|-------|---------------|---------------------------|
| `mia-events` | kontinuálně | výřez `[tStart−5s, tEnd+5s]` nebo CORR match |
| `mia-errors` | kontinuálně | totéž + všechny error kolem CORR |
| Ingest / dedup | `logs/ingest/` | při R1D-01/02/ingest FAIL |
| OBS connect / revive | `logs/obs/` | R1D-09, SF-07 cesty |
| Runtime boot / kill | `logs/runtime/` | R1D-07 / R1D-08 |
| Screenshoty | — | `evidence/.../screenshot.*` nebo inbox → pack |
| OBS / stream recording | — | `evidence/.../recording.mp4` (ne do `logs/`) |
| Persist snapshot | `data/*.json` (SoT runtime) | **kopie** do case při R1D-07/08 (`state-before.json` / `state-after.json`) — ne přepisovat `data/` |
| Bug Tracker řádek | docs | odkaz `bugId` ↔ složka |

**Nikdy do Evidence Layer:** secrets, `.env`, plné tokeny, coin/gift value ve veřejných exportech (guardrail — v popisu jen miaPoints).

---

## 6. Event Timeline (první třída)

Každý EVT/BUG má `timeline.md` — **chronologický řetěz stages**, ne dump logu.

### 6.1 Forma

```text
18:22:15.102  Gift received                 ✔
18:22:15.108  Normalized                    ✔
18:22:15.115  Economy updated               ✔
18:22:15.120  Video queued                  ✔
18:22:15.122  Overlay queued                ✔
18:22:15.124  Voice queued                  ✔
18:22:15.401  OBS play                      ✖   ← break
18:22:20.511  Video finished                —
```

### 6.2 Stage katalog (návrh — mapuje na dnešní stages)

| Stage | Typické log stopy |
|-------|-------------------|
| Gift / chat received | ingest |
| Normalized | support/gift resolver |
| Economy updated | miaPoints / strip |
| Video queued / started / finished | `video_*` v mia-events |
| Overlay queued / applied | `overlay_queued` / sync |
| Voice queued / speak / drop | voice stages |
| OBS play / connected / revive | obs + video |
| Persist flush / hydrate | runtime + data mtime |
| Bowl / Koj / Arena | koj / world stages |

### 6.3 Diagnostická hodnota

Operátor vidí „Video se nespustilo“ → timeline ukáže poslední ✔ a první ✖ → hranice (např. Video Engine → OBS), bez nové hypotézy v designu.

---

## 7. Retence

Oddělit **raw** a **evidence** (dnes raw: ~7 dní / 5 MB rotace přes `MIA_LOG_ROTATION`).

| Třída | Doporučená retence | Poznámka |
|-------|--------------------|----------|
| Raw `logs/*` | 7 dní (stávající default) | env `MIA_LOG_RETENTION_DAYS` |
| Evidence PASS (R1-D scénář) | 30 dní nebo do Lock+1 release | lehké balíčky |
| Evidence FAIL / BUG otevřený | **dokud BUG otevřený** + 90 dní po uzavření | nesmazat při raw cleanup |
| `recording.mp4` u otevřeného BUG | držet; po uzavření komprese / archive | velké soubory mimo git |
| `exports/` | 14–30 dní | zip pro sdílení |
| Inbox `screenshots/`, `obs-recordings/` | 7 dní pokud nepřiřazeno k EVT | pak smazat / archive |

**Git:** `logs/` už ignore; `evidence/**/*.mp4`, velké binárky a ideálně celý `evidence/` (kromě malých `.md` šablon) **nesmí** do gitu — design počítá s lokálním / diskovým Evidence store + odkazy v docs.

---

## 8. Propojení s Bug Trackerem

Bug Tracker = **seznam práce**, ne úložiště důkazů.

| Bug Tracker | Evidence |
|-------------|----------|
| `BUG-XXX` | indexový řádek |
| Severity / Status Open | práce |
| Evidence | jen seznam `EVT-…` (tělo v `evidence/`) |

Příklad indexu:

```text
BUG-003
Severity: High
Status: Open
Evidence:
  EVT-0048
  EVT-0052
  EVT-0061
```

| Pole v trackeru | Zdroj pravdy |
|-----------------|--------------|
| Session / scénář | `manifest.session` / `manifest.scenario` |
| Jak reprodukovat | `description.md` u EVT |
| Verdikt / příčina | `verdict.md` (+ `hypothesisRefs` až po FAIL) |
| Retest | nový EVT → přidat do Evidence seznamu BUG |

Řádek bez alespoň jednoho `EVT-` = neúplný (po zavedení vrstvy).

---

## 9. Propojení s R1-D

```text
evidence/R1-D/
├── R1D-01/ … R1D-09/     # jeden adresář na scénář checklistu
│   ├── EVT-…/            # pokusy
│   └── scenario.md       # Expected + Actual + Result (zrcadlo checklistu)
└── RESULT.md             # session recommendation + odkazy na FAIL EVT/BUG
```

| Checklist | Evidence |
|-----------|----------|
| Actual / Evidence pole | odkaz na `EVT-` nebo relativní path |
| Result PASS/FAIL/… | `scenario.md` + `verdict.md` u EVT |
| Deviation Log | DEV → EVT (nemusí → BUG) |
| Release Recommendation | `evidence/R1-D/RESULT.md` + update RC doc |
| Observability Cheatsheet | říká *co* sledovat; Evidence říká *kam* to uložit |

Po R1-D Live: Cursor plní checklist + Bug Tracker **z** Evidence packů, ne naopak.

---

## 10. Automatické seskupení (design pipeline — bez kódu)

Cíl: jeden gift/chat/reconnect → jeden EVT balíček.

### 10.1 Klíče seskupení (priorita)

1. **`correlationId` / CORR** — ideál (budoucí povinné pole ve writeLog řetězci gift→video→overlay→voice).  
2. **Časové okno** — `[t0, t0+Δ]` per scénář (např. video Δ=30s, TTS Δ=20s, reconnect Δ=120s).  
3. **Entity keys** — `viewerId`, `giftId`, `jobId`, `overlayRequestId` pokud existují.  
4. **Session + scenario tag** — operátor / runner označí „právě běží R1D-02“.

### 10.2 Packer (logická služba, budoucí)

```text
INPUT:  tStart, tEnd, sessionId, scenarioId, optional CORR
PROCESS:
  1. Filter mia-events / errors / ingest / obs v okně nebo CORR
  2. Build timeline stages (map stage → ✔/✖/—)
  3. Copy artifacts → evidence/events/EVT-XXXX/
  4. Write manifest.json
  5. If result=FAIL → suggest BUG-XXX + sync Bug Tracker row
OUTPUT: evidence path + evidenceId
```

### 10.3 Ruční režim (R1-D teď, před automatem)

1. Operátor označí čas FAIL (cheatsheet).  
2. Po session: výřez logů + screenshot + (volitelně) clip → `evidence/R1-D/R1D-0X/EVT-…/`.  
3. Timeline vyplnit ručně z cheatsheet stages.  
4. Cursor po RESULT jen čte packy a aktualizuje dokumenty.

Automat packer = **až po** R1-D / Lock rozhodnutí — ne součást freeze break.

---

## 11. Hranice a non-goals (tato fáze)

| Ano (design) | Ne (teď) |
|--------------|----------|
| Struktura, ID, retence, vazby | Kód packeru, změna `writeLog` |
| Timeline jako povinný artefakt | Nové hypotézy / bugy |
| Oddělení logs vs evidence | Commit `evidence/` medií do gitu |
| Mapování na R1-D + Bug Tracker | Stream Core Lock |

---

## 12. Doporučený rollout (až bude odblokováno)

1. **Manual Evidence** — case složky + povinný `manifest.json` + `timeline` / `verdict` (R1-D ručně).  
2. **Docs link** — Bug Tracker odkazuje jen `EVT-` seznam.  
3. **Manifest query** — skript „najdi FAIL podle modules/session“ (čte jen JSON).  
4. **CORR v logách** — po Lock / cílený minimální diff.  
5. **Packer** — okno → EVT case včetně auto-manifest.  
6. **Retention job** — evidence ≠ raw cleanup.

**Po R1-D zvážit jako první drobnost:** vynutit / šablonovat strojově čitelný `manifest.json` u každého EVT — most k automatizaci diagnostiky a regresí.

---

## 13. Shrnutí

```text
logs/         = telemetrie          → Co systém udělal?
evidence/     = tělo důkazu         → Proč verdikt?
bug-tracker/  = index práce         → Co opravit? (BUG → EVT…)

EVT-XXXX      = case + povinný manifest.json
modules[]     = dotazovatelná hranice (VIDEO_ENGINE, OBS, …)
timeline.md   = kde se řetěz zlomil (pro lidi)
manifest.json = databáze Evidence Layer (pro stroje)
```

**Stav dokumentu:**

```text
EVIDENCE DESIGN: COMPLETE
IMPLEMENTATION: FROZEN
NEXT GATE: R1-D RESULT
FIRST POST-R1-D CANDIDATE: manifest.json enforcement
```

Bez změny runtime. Automatizace Evidence Layer jen po výslovném schválení.
