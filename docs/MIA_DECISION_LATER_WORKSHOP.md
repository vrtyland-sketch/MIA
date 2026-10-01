# MIA — Decision Later Workshop

**Datum:** 2026-07-28  
**Vstup:** Etapa 1–2, 3A–3I, Etapa 4 Cross (`docs/MIA_AUDIT_ETAPA_4_CROSS/`)  
**Účel:** U každé položky Decision later rozhodnout směr — **KEEP / CHANGE / REMOVE / POSTPONE** — před R1-D Live a Stream Core Lock.  
**Pravidlo:** Žádné nové funkce. Pouze analýza, dokumentace a doporučení. Finální „razítko“ = operátor / vlastník produktu.

---

## Kontext fáze

| Stav | |
|------|--|
| Audity 1 → 4 | ✅ Uzavřené |
| Stream Core | **Stabilizace před uzamčením** (ne experimentální prototyp) |
| Další kroky | 1) Tento workshop → 2) R1-D Live → 3) Stream Core Lock |

**Významy doporučení**

| Doporučení | Význam |
|------------|--------|
| **KEEP** | Současný stav je záměr Stream Core; uzavřít dluh jako dokumentovaný kompromis |
| **CHANGE** | Chování nebo kánon/docs upravit (před R1-D, před Lock, nebo po Lock — viz priorita) |
| **REMOVE** | Odstranit z očekávání Stream Core (vize / aspirace / stub mimo RC) |
| **POSTPONE** | Směr znám, implementace až po Lock / mimo RC; R1-D nesmí být blokována |

---

## Prioritní tabulka (souhrn)

### Musí být rozhodnuto / uzavřeno **před R1-D Live**

Tyto body mění, *co* R1-D považuje za PASS/FAIL. Bez rozhodnutí je live výsledek nejednoznačný.

| ID | Téma | Riziko | Doporučení | Akce před R1-D |
|----|------|--------|------------|----------------|
| **DL-01** / X01 | Spam T4 HUD vs shadow T3 | **High** | **CHANGE** (docs+policy) nebo **KEEP** s explicitním SoT | Zapsat očekávané chování do R1-D checklistu |
| **DL-02** / X02 | Bowl 95 % viz vs 100 % T4 | **High** | **CHANGE** (sjednotit práh) *nebo* **KEEP** s docs | Stejně — očekávání „plná miska“ |
| **DL-03** / X09 | Trust CARE vs bond-only | **Medium** | **CHANGE** kánon *nebo* **CHANGE** runtime | Co R1-D kontroluje v CARE meta |
| **DL-04** / X10 | Dual battle + dual inventář | **Medium** | **KEEP** dual + **CHANGE** docs SoT | R1-D: který model se testuje |
| **DL-05** / X11 | Away / NEJSEM TU | **Medium** | **POSTPONE** productize; **KEEP** stub mimo RC | R1-D: Away **mimo** povinný scope |
| **DL-06** / X13 | Dual voice v `mia-guardrails.mdc` | **Low** | **CHANGE** (docs-only) | 1 řádek do guardrails před R1-D |
| **DL-07** / X05+X14 | Fresh live + chain tests | **Medium** | **CHANGE** = spustit R1-D | Samotný R1-D je rozhodnutí „ověřit teď“ |
| **DL-08** / X04 | Live 2-stream duel | **High**/❓ | **POSTPONE** mimo R1-D jádro *nebo* **CHANGE** = R1-D extended | Explicitně: jádro 1-host vs extended |

### Mohou počkat **po Stream Core Lock** (nebo po R1-D, mimo lock kritéria)

| ID | Téma | Riziko | Doporučení | Poznámka |
|----|------|--------|------------|----------|
| **DL-09** / X03 | Persist `.bak` / multi-file / mid-write | **High** | **CHANGE** (bak+atomic) *po* R1-D chaos nálezech; interim **KEEP** soft-fail | R1-D provede chaos smoke; implementace ≠ blok startu R1-D |
| **DL-10** / X06 | Flush TTS→overlay do fast | **Medium** | **CHANGE** (zařadit smoke) | Quality gate před Lock |
| **DL-11** / X07 | Cross-tier rotation contract | **Medium** | **CHANGE** (test) | Quality gate před Lock |
| **DL-12** / X08 | Persist `rotationIndexByTier` | **Medium** | **KEEP** ephemeral *nebo* **CHANGE** persist | UX preference; Lock dokumentovat |
| **DL-13** / X12 | Editor standalone / Tauri / live shot | **Medium**/❓ | **POSTPONE** / **REMOVE** z RC očekávání | Editor mimo Stream Core Lock |
| **DL-14** / X15 | Master lab wire | **Low**/INFO | **POSTPONE** / **REMOVE** z RC | Po Lock = roadmap |
| **DL-15** | Streak multi-day (B03/G07) | **Medium** | **POSTPONE** ověření + případně **CHANGE** | Po Lock pokud R1-D neukáže regress |

### Explicitně **mimo** Stream Core Lock (aspirace / foundation)

| ID | Téma | Doporučení |
|----|------|------------|
| Bone/IK/AI Motion (I03) | **KEEP** foundation / **REMOVE** z RC produkčních očekávání |
| Realtime shader combat (H09) | **REMOVE** z Stream Core RC |
| Immersive / multi-cam produkt (I12) | **POSTPONE** |
| Master Recovery/Battle/Speech wire | **POSTPONE** |

---

## Jednoznačné doporučení: co uzavřít před R1-D vs po Lock

```text
PŘED R1-D (povinné rozhodnutí, ne nutně kód):
  DL-01 Spam T4 policy        → KEEP-with-docs NEBO CHANGE-align (zvolit 1)
  DL-02 Bowl 95/100           → KEEP-with-docs NEBO CHANGE-align (zvolit 1)
  DL-03 Trust CARE            → CHANGE kánon NEBO CHANGE runtime (zvolit 1)
  DL-04 Dual battle SoT       → KEEP dual + docs (který model R1-D testuje)
  DL-05 Away                  → mimo R1-D povinný scope (POSTPONE productize)
  DL-06 Guardrails dual voice → CHANGE docs (rychlé)
  DL-07 R1-D samotné          → spustit (CHANGE = ověřit)
  DL-08 2-stream              → mimo jádro R1-D (POSTPONE) NEBO extended track

BĚHEM R1-D (ověření, zápis odchylek):
  Live audio/viz/reconnect/burst (X05)
  Soft chaos persist kill (vstup pro DL-09)
  Single-host battle + gift→economy→overlay řetězce

PŘED STREAM CORE LOCK (po R1-D, dle nálezů):
  DL-09 Persist bak/atomic    → CHANGE pokud R1-D/chaos ukáže riziko; jinak plánovaný CHANGE
  DL-10 Flush do fast         → CHANGE
  DL-11 Cross-tier contract   → CHANGE
  DL-12 Rotace persist        → KEEP ephemeral (dokumentovat) NEBO CHANGE

PO LOCK / MIMO RC:
  DL-13 Editor standalone/Tauri
  DL-14 Master lab wire
  DL-15 Streak multi-day (pokud neblokuje)
  Away productize, bone mocap, shader combat
```

---

## Katalog rozhodnutí (detail)

U každé položky: proč odloženo · současný stav · dopad na runtime · riziko · doporučení.

---

### DL-01 — Spam T4 milestone vs shadow video T3

| Pole | Obsah |
|------|--------|
| **ID / Origin** | GAP-X01 · 3A GAP-01 · 3B GAP-B01 · XC-12 |
| **Proč Decision later** | Architektura drží; nesoulad HUD vs video je **policy**, ne crash. Auto-fix bez rozhodnutí by mohl „opravit“ záměr. |
| **Současný stav** | Wave HUD může hlásit T4 (miaPoints); `engine_shadow_runtime` často capne reward video na T3. |
| **Dopad na runtime** | Divák: „T4“ vizuál/HUD bez T4 videa — důvěra / fairness vjem. |
| **Riziko** | **High** (produktový vjem, ne stabilita procesu) |
| **Doporučení** | **CHANGE** sjednotit shadow s HUD **nebo** **KEEP** a kánon/docs: „T4 wave ≠ T4 video“. *Musí být 1 věta v R1-D PASS kritériích.* |
| **Gate** | **Před R1-D** (rozhodnutí); kód může až po R1-D pokud KEEP-with-docs |

---

### DL-02 — Bowl viz ≥95 % vs T4 trigger 100 %

| Pole | Obsah |
|------|--------|
| **ID / Origin** | GAP-X02 · 3C GAP-C01 · 3A bowl · XC-29 |
| **Proč Decision later** | Obě strany mají smysl (UX celebrate vs tvrdé full); sjednocení mění player expectation. |
| **Současný stav** | Celebrate/full look od ~95 %; `shouldTriggerFullBowl` až 100 %. Pásmo 95–99 = viz plná, T4 video ne. |
| **Dopad na runtime** | Gift→bowl→video řetězec; frustrace „plná miska bez odměny“. |
| **Riziko** | **High** (E2E očekávání) |
| **Doporučení** | **CHANGE** práh (viz=trigger) **nebo** **KEEP** s explicitní docs/overlay copy. *R1-D musí vědět PASS.* |
| **Gate** | **Před R1-D** (rozhodnutí) |

---

### DL-03 — Trust CARE field chybí (bond-only)

| Pole | Obsah |
|------|--------|
| **ID / Origin** | GAP-X09 · 3C GAP-C02 (KJ-23) · XC-31 |
| **Proč Decision later** | Kánon vs runtime; není stabilitní incident. |
| **Současný stav** | CARE běží na bond; samostatné Trust pole dle kánonu chybí. |
| **Dopad na runtime** | Overlay/CARE metadata incomplete vs kánon; stream hratelnost OK. |
| **Riziko** | **Medium** |
| **Doporučení** | **CHANGE** kánon na bond-only **nebo** **CHANGE** runtime (přidat Trust). Ne **REMOVE** CARE. |
| **Gate** | **Před R1-D** (která meta je SoT); implementace Trust až po Lock OK pokud kánon KEEP→CHANGE |

---

### DL-04 — Dual battle models + dual inventář

| Pole | Obsah |
|------|--------|
| **ID / Origin** | GAP-X10 · 3H H02/H05 · XC-36 |
| **Proč Decision later** | Záměrný dual-path; merge je velký refactor. |
| **Současný stav** | Cross-stream duel ≠ platform arena; batoh vs `viewer-inventory` stub. |
| **Dopad na runtime** | Operátor/confusion; R1-D musí testovat **jeden** model jako jádro. |
| **Riziko** | **Medium** |
| **Doporučení** | **KEEP** dual pro RC; **SoT Stream Core = Platform Arena**; Cross-stream Duel = extended po Lock. Merge = **POSTPONE** po Lock. |
| **Gate** | **Před R1-D** (SoT zapsán: Platform Arena) |

---

### DL-05 — Away / NEJSEM TU ne stream-ready

| Pole | Obsah |
|------|--------|
| **ID / Origin** | GAP-X11 · 3D D06 · 3F F05 · 3B B11 · XC-61 |
| **Proč Decision later** | Vrstvy existují; full host flow je product feature. |
| **Současný stav** | OBS/panel stub; není RC-ready. |
| **Dopad na runtime** | Nízký pokud Away nepoužíváš na ostrém streamu. |
| **Riziko** | **Medium** (jen pokud Away slibuješ divákům) |
| **Doporučení** | **KEEP** stub; **POSTPONE** productize po Lock; **REMOVE** z R1-D povinného scope. |
| **Gate** | **Před R1-D** (vyřadit z PASS) |

---

### DL-06 — Dual voice OFF chybí v `mia-guardrails.mdc`

| Pole | Obsah |
|------|--------|
| **ID / Origin** | GAP-X13 · 3E E05 · XC-05 |
| **Proč Decision later** | Runtime už OFF; jen docs/agent riziko. |
| **Současný stav** | `MIA_DUAL_VOICE` default OFF; guardrails bullet chybí. |
| **Dopad na runtime** | Nulový dnes; budoucí agent může regress. |
| **Riziko** | **Low** |
| **Doporučení** | **CHANGE** (1 bullet do `.cursor/rules/mia-guardrails.mdc`) — docs-only. |
| **Gate** | **Před R1-D** (rychlé, snižuje regresi během live iterací) |

---

### DL-07 — Fresh live audio/visual + chain test strategy (= R1-D)

| Pole | Obsah |
|------|--------|
| **ID / Origin** | GAP-X05 · X14 · 3D/3E/3F live ❓ |
| **Proč Decision later** | Hist. R1-C ≠ fresh; unit ≠ E2E. |
| **Současný stav** | R1-C PASS 2026-07-26; reconnect/burst/anti-echo fresh **nikdy** v sérii. |
| **Dopad na runtime** | Bez R1-D nelze uzamknout s jistotou provozu. |
| **Riziko** | **Medium** (provoz); vysoký dopad na **důvěru v Lock** |
| **Doporučení** | **CHANGE** = provést **R1-D Live** (to je další krok série). |
| **Gate** | **Je** R1-D |

---

### DL-08 — Live 2-stream duel

| Pole | Obsah |
|------|--------|
| **ID / Origin** | GAP-X04 · 3H H01 · XC-38/62 |
| **Proč Decision later** | Unit sync ✅; produkční 2× host **nikdy**. |
| **Současný stav** | HTTP/unit peer sync; live dual-OBS neověřeno. |
| **Dopad na runtime** | Kritické jen pro multi-host produkt; single-host stream OK. |
| **Riziko** | **High** *pro multi-host*; **Low** pro single-host RC |
| **Doporučení** | **POSTPONE** mimo jádro R1-D (single-host Lock). Extended track = **CHANGE** ověřit později. Ne **REMOVE** duel modelu. |
| **Gate** | Rozhodnout scope **před R1-D**; provedení 2-stream **po** jádře / po Lock OK |

---

### DL-09 — Persist durability (`.bak` / multi-file / mid-write)

| Pole | Obsah |
|------|--------|
| **ID / Origin** | GAP-X03 · 3G G01–G04 · XC-53…57 |
| **Proč Decision later** | Soft-fail funguje; last-good je investice do durability. |
| **Současný stav** | Soft-fail empty; část store atomic; Koj/economy direct write; kill e2e **nikdy**. |
| **Dopad na runtime** | Při corrupt/kill: ztráta stavu (Koj/economy). Běžný happy-path OK. |
| **Riziko** | **High** (data) — největší technický dluh série |
| **Doporučení** | **CHANGE** (bak + quarantine + sjednocení atomic) jako **priorita po R1-D chaos**. Interim: **KEEP** soft-fail. Chaos smoke **během** R1-D. |
| **Gate** | Chaos smoke = R1-D; implementace **před Lock** pokud chaos FAIL, jinak plán **těsně před/po Lock** (vlastník volí) |

---

### DL-10 — `flushOverlayQueue` mimo `preflight:fast`

| Pole | Obsah |
|------|--------|
| **ID / Origin** | GAP-X06 · 3E E03 · 3F F02 · XC-25 |
| **Proč Decision later** | Kód OK; regrese mimo fast. |
| **Současný stav** | Flush existuje; suite mimo fast. |
| **Dopad na runtime** | Nízký; riziko tiché regrese voice↔overlay. |
| **Riziko** | **Medium** (kvalita brány) |
| **Doporučení** | **CHANGE** — zařadit smoke do `preflight:fast` před Lock. |
| **Gate** | **Před Stream Core Lock** (ne blok R1-D start) |

---

### DL-11 — Cross-tier rotation contract chybí

| Pole | Obsah |
|------|--------|
| **ID / Origin** | GAP-X07 · 3A GAP-02 · XC-06/17 |
| **Proč Decision later** | Guardrail #2 v kódu; test thin. |
| **Současný stav** | Per-tier index OK; T1↔T3 independence necontractována. |
| **Dopad na runtime** | Nízký pokud kód drží; riziko budoucí regrese. |
| **Riziko** | **Medium** |
| **Doporučení** | **CHANGE** — contract test před Lock. |
| **Gate** | **Před Stream Core Lock** |

---

### DL-12 — `rotationIndexByTier` ztráta po restartu

| Pole | Obsah |
|------|--------|
| **ID / Origin** | GAP-X08 · 3G G06 · XC-21 |
| **Proč Decision later** | Ephemeral vs persist je UX preference. |
| **Současný stav** | Za běhu OK; po restartu od nuly. |
| **Dopad na runtime** | Možný skok ve video poolu po reboot MIA. |
| **Riziko** | **Medium** (UX) |
| **Doporučení** | Default **KEEP** ephemeral + dokumentovat v Lock notes; **CHANGE** persist jen pokud R1-D/ops vyžaduje kontinuitu. |
| **Gate** | Rozhodnutí **před Lock**; implementace volitelná |

---

### DL-13 — Editor standalone / Tauri / live custom shot

| Pole | Obsah |
|------|--------|
| **ID / Origin** | GAP-X12 · 3I I01/I02/I05 · XC-59 |
| **Proč Decision later** | Editor ≠ RC stream path. |
| **Současný stav** | Browser editor + MIA HTTP; Tauri scaffold; live shot ❓. |
| **Dopad na runtime** | Žádný na ingest, pokud promote respektuje production gate. |
| **Riziko** | **Medium**/❓ (tooling), **Low** pro stream RC |
| **Doporučení** | **REMOVE** „plný offline desktop“ z RC očekávání; **POSTPONE** Tauri/productize; **KEEP** editor≠`processEvent`. |
| **Gate** | **Po Lock** / mimo Stream Core Lock |

---

### DL-14 — Master Canon lab unwired (Recovery / Battle / Speech / 0037)

| Pole | Obsah |
|------|--------|
| **ID / Origin** | GAP-X15 · 3G G09 · 3H H03 · 3E E06 · 3I |
| **Proč Decision later** | Lab ≠ Stream Core chyba. |
| **Současný stav** | `shared/mia-*-core` existuje; `index.js` stream path je subset. |
| **Dopad na runtime** | Žádný, pokud se newire. |
| **Riziko** | **Low** (INFO) — riziko jen pokud někdo „zapojí Master“ bez auditu |
| **Doporučení** | **POSTPONE** wire; **KEEP** Stream subset; **REMOVE** z RC Definition of Done. |
| **Gate** | **Po Lock** / roadmap |

---

### DL-15 — Streak / supporter multi-day persistence

| Pole | Obsah |
|------|--------|
| **ID / Origin** | 3B B03 · 3G G07 (mimo Top X, v Etapa 4 board #13) |
| **Proč Decision later** | Runtime streak je; multi-day file e2e thin. |
| **Současný stav** | Supporter profile / viewer-memory; dlouhý horizont neověřen. |
| **Dopad na runtime** | Denní stream OK; multi-day bonus může driftovat. |
| **Riziko** | **Medium** |
| **Doporučení** | **POSTPONE** dedicated multi-day test po Lock; **KEEP** současný model pokud R1-D single-day OK. |
| **Gate** | **Po Lock** (nebo krátký spot v R1-D pokud čas) |

---

## Doplňkové položky (kratší záznamy)

| ID | Téma | Riziko | Doporučení | Gate |
|----|------|--------|------------|------|
| D-docs-bust | `OBS_LIVE_SETUP` gift bust v30 vs v37 | Low | **CHANGE** docs | Před Lock (docs) |
| D-I04 | Shared LipSync `mia-paint-core` ownership | Low | **KEEP** shared; **POSTPONE** split | Po Lock |
| D-I03 | Bone/IK/AI Motion | Low | **KEEP** foundation; **REMOVE** z RC | Po Lock |
| D-H08 | `Date.now` / `Math.random` v battle | Low | **KEEP**; **POSTPONE** seed pokud replay | Po Lock |
| D-F06 | Portrait E2E | Medium/❓ | **POSTPONE** mimo R1-D landscape jádro | Po Lock / extended |
| D-E-outage | Edge TTS outage → bubble-only | Medium | **POSTPONE** degradační režim; R1-D spot pokud Edge padne | Po Lock |
| D-G10 | `data/*.json` gitignore | Low | **CHANGE** (ops) | Před Lock |
| D-G11 | `gift-map-stats` totalCoins on disk | Low | **KEEP** disk intern; public strip už OK | — |

---

## R1-D Live — doporučený scope (z rozhodnutí výše)

**Povinné jádro (single-host)**

1. Gift → economy → public strip (bez coins)  
2. Gift → video/OBS + combo/spam HUD (*dle DL-01 očekávání*)  
3. Music gift → bubble, TTS off  
4. Chat → TTS → bubble hide → `MIA_VOICE` (anti-echo)  
5. Bowl/Koj reakce (*dle DL-02*)  
6. Single-host **Platform Arena** spot (DL-04 SoT; duel mimo jádro)  
7. Soft restart hydrate (Koj/runtime)  
8. Soft chaos: kill Node během aktivity → boot (vstup pro DL-09)  
9. OBS reconnect / voice revive (pokud prostředí dovolí)

**Mimo povinné jádro (extended / po Lock)**

- 2-stream duel (DL-08)  
- Away full flow (DL-05)  
- Portrait  
- Editor live custom shot  
- Multi-day streak  

Každou odchylku zapsat do výsledkového listu (PASS/FAIL/DEVIATION) — **ne** tiše „opravit“ během R1-D bez rozhodnutí.

---

## Stream Core Lock — co zmrazit (až po R1-D bez zásadních FAIL)

Po úspěšném R1-D jádře doporučený freeze:

| Plocha | Freeze |
|--------|--------|
| Veřejné kontrakty | `/overlay-state` public shape, strip pravidla |
| Event flow | TikFinity/Kick → ingest → normalize → shadow/pipeline |
| Overlay API | public vs admin hranice |
| Behavior router | gift presentation / speaker / world layer handoffy |
| Guardrails | miaPoints-only, dual voice OFF, OBS render-only, per-tier rotace |

Po Lock: **opravy chyb a Decision CHANGE položky s gate „před Lock“**; **ne** architektonické přepisy ani Master wire.

---

## Finální rozhodnutí operátora (DL-01…DL-08)

**Datum zápisu:** 2026-07-28  
**Rozsah Lock:** Single-host Stream Core. Multi-host / extended = po Lock.

| ID | Rozhodnutí | Termín CHANGE | PASS očekávání R1-D | Stav |
|----|------------|---------------|---------------------|------|
| **DL-01** | **CHANGE-align** | Rozhodnutí: Před R1-D · Implementace align: **Před Lock** | HUD T4 a video reward tier konzistentní | ✅ rozhodnuto |
| **DL-02** | **CHANGE-align** | Rozhodnutí: Před R1-D · Implementace práh: **Před Lock** | Vizuál „plná miska“ a T4 trigger ve stejném okamžiku | ✅ rozhodnuto |
| **DL-03** | **CHANGE kánon** | Docs: **Před Lock** | R1-D očekává **bond-only** CARE (Trust ≠ povinné) | ✅ rozhodnuto |
| **DL-04** | **KEEP dual + SoT** | Merge: **Po Lock** | **SoT = Platform Arena** (Stream Core). Cross-stream Duel = extended **Po Lock**. R1-D testuje Platform Arena. | ✅ rozhodnuto |
| **DL-05** | **KEEP stub + POSTPONE productize** | Productize: **Po Lock** | Away **mimo** povinné jádro | ✅ rozhodnuto |
| **DL-06** | **CHANGE (docs)** | **Před R1-D** ✅ | Dual voice default OFF v runtime + guardrails | ✅ docs hotovo |
| **DL-07** | **CHANGE = provést R1-D** | — | Fresh live evidence v R1-D session | ✅ rozhodnuto |
| **DL-08** | **POSTPONE mimo jádro** | 2-stream: **Po Lock** | Multi-host neblokuje single-host Lock | ✅ rozhodnuto |

**Hranice:** Single-host Stream Core = kandidát na Lock po úspěšném R1-D. Multi-host / Away / Portrait / Editor = po Locku.

> **Pozn. k CHANGE-align (DL-01, DL-02):** R1-D může skončit DEVIATION/FAIL, pokud runtime ještě není zarovnaný — to je vstup pro **Fix Before Lock**, ne důvod měnit rozhodnutí.

### High priority — vlastníci

| ID | Téma | Vlastník | Potvrzeno |
|----|------|----------|-----------|
| DL-01 | Spam T4 HUD vs shadow T3 | **Váša Špíňák — Project Owner / Operator** | ☑ |
| DL-02 | Bowl 95 % vs 100 % T4 | **Váša Špíňák — Project Owner / Operator** | ☑ |
| DL-08 | Live 2-stream (scope POSTPONE) | **Váša Špíňák — Project Owner / Operator** | ☑ |
| DL-09 | Persist bak / mid-write (chaos) | **Váša Špíňák — Project Owner / Operator** | ☑ |

> Potvrzeno operátorem 2026-07-28: „Ano všude Váša Špíňák“.

### CHANGE — termíny (kontrola)

| ID | CHANGE | Termín | OK |
|----|--------|--------|-----|
| DL-01 | align HUD↔video | **Před Lock** | ☑ |
| DL-02 | align bowl práh | **Před Lock** | ☑ |
| DL-03 | kánon bond-only docs | **Před Lock** | ☑ |
| DL-06 | guardrails dual voice | **Před R1-D** ✅ hotovo | ☑ |
| DL-07 | provést R1-D | session | ☑ |
| DL-04 merge | (ne CHANGE jádra) | **Po Lock** | ☑ |
| DL-05 productize | | **Po Lock** | ☑ |
| DL-08 2-stream | | **Po Lock** | ☑ |
| DL-09 bak/atomic | | **Před Lock** (po chaos R1-D) | ☑ |
| DL-10 flush fast | | **Před Lock** | ☑ |
| DL-11 rotation contract | | **Před Lock** | ☑ |
| DL-12 rotace persist | KEEP ephemeral *nebo* CHANGE **Před Lock** | ☑ |
| DL-13…15 | | **Po Lock** | ☑ |

*Žádná CHANGE položka bez termínu.*

---

## Checklist uzavření workshopu

- [x] DL-01 Spam T4 — **CHANGE-align**  
- [x] DL-02 Bowl 95/100 — **CHANGE-align**  
- [x] DL-03 Trust — **CHANGE kánon** (bond-only)  
- [x] DL-04 Battle SoT — **KEEP dual**; **Platform Arena = Stream Core SoT**; Cross-stream Duel = extended po Lock  
- [x] DL-05 Away mimo R1-D jádro potvrzeno  
- [x] DL-06 Guardrails bullet — hotovo (`.cursor/rules/mia-guardrails.mdc` bod 5)  
- [x] DL-08 2-stream — **POSTPONE** mimo jádro  
- [x] R1-D checklist odsouhlasen operátorem (povinné + mimo) — **APPROVED 2026-07-28**  
- [x] DL-09…DL-15 přiřazeny gate (před Lock / po Lock)  
- [x] High priority vlastníci — **Váša Špíňák** (ASSIGNED)  

*Workshop CLOSED → R1-D Live gate = GO. Live session spouští operátor.*

---

## Zdroje

| Dokument | Role |
|----------|------|
| `docs/MIA_AUDIT_ETAPA_4_CROSS/03_GAPS.md` | Konsolidovaný Decision board GAP-X01…15 |
| `docs/MIA_AUDIT_ETAPA_4_CROSS/05_SUMMARY.md` | Capstone + scenario scorecard |
| `docs/MIA_AUDIT_ETAPA_4_CROSS/01_CROSS_CONTRACTS.md` | XC + ownership mapa |
| `docs/MIA_AUDIT_ETAPA_3A_GIFTS/` … `3I_EDITOR/` | Origin GAP detaily |

---

## Stav dokumentu

| Pole | Hodnota |
|------|---------|
| Typ | Decision workshop / doporučení |
| Kód změněn | Jen docs + guardrails (DL-06); **žádné runtime features** |
| Finální rozhodnutí DL-01…08 | **Zapsáno 2026-07-28** · DL-04 SoT = **Platform Arena** |
| Další krok | **R1-D LIVE: GO** — spouští operátor dle `MIA_R1D_LIVE_CHECKLIST.md` |

---

## Exit Criteria

Workshop je **uzavřen** — všechny podmínky splněny 2026-07-28.

| Exit check | Stav |
|------------|------|
| DL-01…DL-08 finální KEEP/CHANGE/REMOVE/POSTPONE | ☑ (SoT Platform Arena) |
| R1-D checklist schválen | ☑ **APPROVED** |
| High priority mají vlastníka | ☑ **Váša Špíňák** (4× ASSIGNED) |
| Každý CHANGE má termín (Před R1-D / Před Lock / Po Lock) | ☑ |
| Lock potvrzen jako přípustný cíl po R1-D (single-host) | ☑ **CONFIRMED** |

| Pole | Hodnota |
|------|---------|
| Workshop uzavřen | ☑ **Ano / CLOSED** |
| Datum uzavření | **2026-07-28** |
| Vlastník / Operator | **Váša Špíňák — Project Owner / Operator** |
| Operator signature/approval | **SIGNED 2026-07-28** |
| R1-D Live gate | **GO** (runtime nespouští Cursor bez dalšího pokynu) |
