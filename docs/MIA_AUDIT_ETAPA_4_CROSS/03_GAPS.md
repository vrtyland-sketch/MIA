# Etapa 4 — Gaps & consolidated Decision later board

**Datum:** 2026-07-28  
**Pravidlo:** Všechny gaps = **Decision later** — žádný auto-fix v tomto auditu.  
**Charakter:** Cross-cutting mezery + **konsolidace** strategických dluhů z 3A–3I (citace originating stage). Cross Audit **nevlastní** modul — detailní SoT = prior GAP ID.

Severity: **VYSOKÁ** / **STŘEDNÍ** / **NÍZKÁ** / **INFO**

---

## Cross-cutting gaps (nové XC pohled)

### GAP-X01 — Spam T4 milestone vs shadow video T3 (cross economy↔HUD↔video)

| Pole | Hodnota |
|------|---------|
| **Severity** | ⚠ **VYSOKÁ** |
| **XC** | XC-12 |
| **Origin** | 3A GAP-01 · 3B GAP-B01 |
| **Problém** | Wave HUD dosáhne T4 v miaPoints; `engine_shadow_runtime` capne reward video na T3 — divák vidí nesoulad napříč řetězcem |
| **Decision later** | Ano — sjednotit shadow s kánonem **nebo** záměrně dokumentovat „T4 wave bez T4 video“ |
| **Poslední ověření** | cite prior + spot 2026-07-28 |

### GAP-X02 — Bowl viz ≥95 % vs T4 trigger až 100 % (cross Koj↔gift video)

| Pole | Hodnota |
|------|---------|
| **Severity** | ⚠ **VYSOKÁ** |
| **XC** | XC-29 |
| **Origin** | 3C GAP-C01 · 3A bowl GAP-03 |
| **Problém** | Celebrate/full look od 95 %; `shouldTriggerFullBowl` až 100 % — E2E „plná miska → T4“ může selhat v pásmu 95–99 |
| **Decision later** | Ano — práh viz vs trigger |
| **Poslední ověření** | 3C 2026-07-27 |

### GAP-X03 — Persist durability: no `.bak` + multi-file + mid-write (cross restart/recovery)

| Pole | Hodnota |
|------|---------|
| **Severity** | ⚠/❓ **VYSOKÁ** |
| **XC** | XC-53, XC-55, XC-56, XC-57 |
| **Origin** | 3G GAP-G01, G02, G03, G04 |
| **Problém** | Soft-fail OK; chybí last-good; Koj/economy non-atomic; kill mid-write **nikdy** e2e — Capstone rizika dat |
| **Decision later** | Ano — bak/quarantine / atomic unify / chaos test |
| **Poslední ověření** | 3G 2026-07-27; live kill **nikdy** |

### GAP-X04 — Live 2-stream duel / dual-host (cross battle↔OBS↔persist)

| Pole | Hodnota |
|------|---------|
| **Severity** | ❓ **VYSOKÁ** (uživatelské sync téma) |
| **XC** | XC-38, XC-62 |
| **Origin** | 3H GAP-H01 · 3C GAP-C08 |
| **Problém** | Unit peer sync ✅; produkční 2× Node / 2× OBS **nikdy** |
| **Decision later** | Ano — live smoke plán |
| **Poslední ověření** | **nikdy** |

### GAP-X05 — Fresh live audio/visual chain (cross voice↔overlay↔OBS)

| Pole | Hodnota |
|------|---------|
| **Severity** | ❓ **STŘEDNÍ** |
| **XC** | XC-18…20, XC-27, XC-42, XC-44, XC-48, XC-49 |
| **Origin** | 3D D01/D13 · 3E E01/E02 · 3F F01/F04 |
| **Problém** | Hist. R1-C 2026-07-26 PASS; **fresh** anti-echo / gift HUD / reconnect / burst **ne** v audit sérii 3* ani 4 |
| **Decision later** | Ano — doporučený **live R1-D** po Decision board |
| **Poslední ověření** | hist. R1-C 2026-07-26 |

### GAP-X06 — Flush overlay po TTS mimo preflight:fast (cross voice↔overlay)

| Pole | Hodnota |
|------|---------|
| **Severity** | ⚠ **STŘEDNÍ** |
| **XC** | XC-25 |
| **Origin** | 3E GAP-E03 · 3F GAP-F02 |
| **Problém** | Kód `flushOverlayQueue` ✅; regrese mimo fast |
| **Decision later** | Ano — zařadit smoke do fast vs nechat full |
| **Poslední ověření** | code 2026-07-28 |

### GAP-X07 — Cross-tier rotation contract chybí (cross gift video guardrail)

| Pole | Hodnota |
|------|---------|
| **Severity** | ⚠ **STŘEDNÍ** |
| **XC** | XC-06, XC-17 |
| **Origin** | 3A GAP-02 |
| **Problém** | Kód per-tier OK; test jen T1 sekvence — guardrail #2 nehlídán |
| **Decision later** | Ano — contract T1↔T3 index independence |
| **Poslední ověření** | fresh code 2026-07-28 |

### GAP-X08 — `rotationIndexByTier` ztráta po restartu (cross gift↔persist)

| Pole | Hodnota |
|------|---------|
| **Severity** | ⚠ **STŘEDNÍ** |
| **XC** | XC-21 |
| **Origin** | 3G GAP-G06 |
| **Problém** | Za běhu OK; po restartu rotace od nuly — UX skok (ne cross-tier bug) |
| **Decision later** | Ano — persist index vs accept ephemeral |
| **Poslední ověření** | 3G 2026-07-27 |

### GAP-X09 — Trust CARE výstup chybí (cross Koj↔overlay očekávání)

| Pole | Hodnota |
|------|---------|
| **Severity** | ❌→⚠ **STŘEDNÍ** (kánonní mezera; ne crash architektury) |
| **XC** | XC-31 |
| **Origin** | 3C GAP-C02 (KJ-23 ❌) |
| **Problém** | Kánon CARE Trust vs bond-only runtime — metadata chain incomplete |
| **Decision later** | Ano — přidat Trust **nebo** upravit kánon |
| **Poslední ověření** | 3C 2026-07-27 |

### GAP-X10 — Dual battle models + dual inventář (cross battle↔economy)

| Pole | Hodnota |
|------|---------|
| **Severity** | ⚠ **STŘEDNÍ** |
| **XC** | XC-36 |
| **Origin** | 3H GAP-H02 · H05 |
| **Problém** | Duel peer vs platform arena + batoh vs viewer-inventory stub — operátorská/arch ambiguity |
| **Decision later** | Ano — keep dual / merge / docs SoT |
| **Poslední ověření** | 3H 2026-07-27 |

### GAP-X11 — Away / NEJSEM TU ne stream-ready (cross host↔OBS↔overlay↔economy)

| Pole | Hodnota |
|------|---------|
| **Severity** | ⚠ **STŘEDNÍ** |
| **XC** | XC-14, XC-61 |
| **Origin** | 3D GAP-D06 · 3F GAP-F05 · 3B GAP-B11 |
| **Problém** | Vrstvy/panel OK; full Away host flow stub |
| **Decision later** | Ano — productize Away vs keep stub |
| **Poslední ověření** | 3D/3F 2026-07-27 |

### GAP-X12 — Editor standalone / live gift shot (cross editor↔bank↔gift)

| Pole | Hodnota |
|------|---------|
| **Severity** | ⚠/❓ **STŘEDNÍ** |
| **XC** | XC-59 |
| **Origin** | 3I GAP-I01, I02, I05 |
| **Problém** | Export unit ✅; standalone offline / Tauri install / live custom shot ❓ |
| **Decision later** | Ano — product scope editor |
| **Poslední ověření** | 3I 2026-07-27 |

### GAP-X13 — Dual voice OFF chybí v `mia-guardrails.mdc` (cross docs↔runtime)

| Pole | Hodnota |
|------|---------|
| **Severity** | ⚠ **NÍZKÁ**/STŘEDNÍ docs |
| **XC** | XC-05 (runtime ✅) |
| **Origin** | 3E GAP-E05 |
| **Problém** | Runtime default OFF; agent guardrail bullet chybí — riziko budoucí regrese agentem |
| **Decision later** | Ano — doplnit guardrails bullet (docs-only změna) |
| **Poslední ověření** | 3E 2026-07-27 |

### GAP-X14 — Chain tests jen unit-sliced (cross test strategy)

| Pole | Hodnota |
|------|---------|
| **Severity** | ⚠ **STŘEDNÍ** |
| **XC** | (meta) S01–S12 coverage |
| **Origin** | 3A–3I test GAPs · tento `04_TESTS_COVERAGE.md` |
| **Problém** | Fast má silné unit/contract řezy; málo skutečných E2E chain suites; live ❓ |
| **Decision later** | Ano — R1-D checklist + selective fast promotions |
| **Poslední ověření** | docs 2026-07-28 |

### GAP-X15 — Master Recovery/Battle/Speech unwired (aspirace, ne Stream ❌)

| Pole | Hodnota |
|------|---------|
| **Severity** | ⚠ **INFO**/STŘEDNÍ aspirace |
| **XC** | — |
| **Origin** | 3G G09 · 3H H03 · 3E E06 · 3I Master 0037 |
| **Problém** | Lab moduly existují; stream path je subset — OK pokud Decision = „ne wire teď“ |
| **Decision later** | Ano — roadmap alignment |
| **Poslední ověření** | prior 3* |

---

## Consolidated Decision later board (TOP 15 — celá série)

Priorita pro workshop po přečtení ZIP (ne auto-start Etapa 5):

| # | ID | Téma | Severity | Origin stage |
|---|-----|------|----------|--------------|
| 1 | **GAP-X03** / G01–G03 | `.bak` / multi-file / kill mid-write | **VYSOKÁ** | **3G** |
| 2 | **GAP-X01** / A01/B01 | Spam T4 HUD vs shadow T3 video | **VYSOKÁ** | **3A+3B** |
| 3 | **GAP-X02** / C01 | Bowl 95 % viz vs 100 % T4 trigger | **VYSOKÁ** | **3C+3A** |
| 4 | **GAP-X04** / H01 | Live 2-stream duel | **VYSOKÁ**/❓ | **3H** |
| 5 | **GAP-X05** | Fresh live R1-D (audio/viz/reconnect/burst) | **STŘEDNÍ**/❓ | **3D+3E+3F** |
| 6 | **GAP-X09** / C02 | Trust CARE field | **STŘEDNÍ** (❌ kánon) | **3C** |
| 7 | **GAP-X10** / H02 | Dual battle models (+ inventář H05) | **STŘEDNÍ** | **3H** |
| 8 | **GAP-X11** | Away / NEJSEM TU productize | **STŘEDNÍ** | **3D+3F+3B** |
| 9 | **GAP-X08** / G06 | Persist `rotationIndexByTier`? | **STŘEDNÍ** | **3G+3A** |
| 10 | **GAP-X07** / A02 | Cross-tier rotation contract | **STŘEDNÍ** | **3A** |
| 11 | **GAP-X06** | Flush TTS→overlay do fast | **STŘEDNÍ** | **3E+3F** |
| 12 | **GAP-X12** / I01 | Editor standalone / live shot | **STŘEDNÍ**/❓ | **3I** |
| 13 | B03/G07 | Streak multi-day persistence | **STŘEDNÍ** | **3B+3G** |
| 14 | **GAP-X13** / E05 | Dual voice do `mia-guardrails.mdc` | **NÍZKÁ**/docs | **3E** |
| 15 | **GAP-X15** | Master lab wire vs Stream subset | **INFO** | **3E/G/H/I** |

*Další známé (mimo top 15, stále Decision later):* dual path Gift Map (3A), care-aware anim depth (3A), portrait E2E (3D/3F), Edge outage fallback (3E), docs bust v30 (3D), Paint LipSync coupling (3I I04), walk nepersist (3C C10).

---

## Co Cross Audit **neřeší** jako „vlastní“ bug

| Oblast | SoT |
|--------|-----|
| Tier math / spam čísla | **3A** |
| Konverze 7.5 / ledger schema | **3B** |
| CARE validace / vitals decay | **3C** |
| Manifest bust / hands | **3D** |
| Edge TTS engine detaily | **3E** |
| pickActiveOverlay UX | **3F** |
| Atomic write implementace | **3G** |
| Scoring pure functions | **3H** |
| Paint UI / Tauri scaffold | **3I** |

Cross pouze říká: **handoff A→B** drží / driftí / neověřen.

---

## Součty gap severity (tento pack)

| Severity | Počet GAP-X* |
|----------|--------------|
| VYSOKÁ | 4 (X01–X04; X03 agregát 3G) |
| STŘEDNÍ | 9 (X05–X12, X14) |
| NÍZKÁ/docs | 1 (X13) |
| INFO | 1 (X15) |
| **Celkem** | **15** |

*Pozn.: VYSOKÉ z prior 3G (3) + spam/bowl/2-stream jsou **konsolidované**, ne nové nezávislé crash bugy.*
