# MIA Audit — Etapa 4: Cross Audit (Module Collaboration)

**Datum:** 2026-07-28  
**Typ auditu:** **Cross Audit** — spolupráce Stream Core modulů na end-to-end scénářích (ne izolovaný inventory 7. modulu).  
**Metodika:** Canon/Contract ↔ Evidence ↔ Tests ↔ Status + **Poslední ověření** (fresh 2026-07-28 vs hist. R1-C 2026-07-26 vs nikdy). Symboly ✅ ⚠ ❌ ❓. Quality bar = **≥ 3G / 3I**.  
**Pravidlo:** Gaps = **Decision later** — žádný auto-fix, žádné změny aplikačního kódu, žádné commity v tomto tasku.

---

## Co Cross Audit JE

| | |
|--|--|
| **Otázka** | Spolupracují Stream Core subsystémy správně podél kritických E2E cest **bez porušení guardrails**? |
| **Jednotka měření** | **Cross-module contract** `XC-01…` — ověřitelné **interakční** pravidlo (handoff A→B), ne vnitřnosti jednoho modulu |
| **Scénáře** | gift → economy → battle → voice → overlay → OBS → persistence → restart → recovery (+ editor asset chain) |
| **Zdroje** | Prior audity **1 / 2 / 3A–3I** + spot-check kódu 2026-07-28 (handoffy) |
| **Výstup** | Přesně **6 souborů** v této složce (ZIP ritual) |

## Co Cross Audit NENÍ

| Není | Kde je místo toho |
|------|-------------------|
| Opakovaný module inventory (3A–3I depth) | `docs/MIA_AUDIT_ETAPA_3A_…` … `3I_EDITOR/` — **source of truth** pro internály |
| Auto-fix gapů / refactor | Decision later board v `03_GAPS.md` |
| Plný Master Canon build (0035–0075 wire) | Stream Core vs Master tabulky v 3A–3I |
| Live R1-D session | Navrženo jako **volitelný next** po verdiktu uživatele |
| Etapa 5 / větší development phase | **Nezačínat** v tomto tasku |
| Capability „funguje“ checklist | Etapa 3 Capability + Etapa 2 flow mapy |

---

## Stream Core vs Master Canon (povinné)

| Vrstva | Role v Etapa 4 |
|--------|----------------|
| **Stream Core** | Produkční E2E řetězec TikFinity→MIA→OBS + economy/Koj/battle/voice/overlay/persist subset |
| **Master Canon** | Lab / aspirace (Recovery 0065, Battle Engine 0039, Speech 0035, Visual 0037…) — **ne** měřítko „❌ chybí“ pokud Stream Core handoff drží |
| **Cross Audit** | Měří **spolupráci** Stream Core modulů; Master gaps jen jako consolidated Decision later (citace 3*) |

---

## E2E scénáře (povinný scorecard v `05_SUMMARY.md`)

| ID | Scénář |
|----|--------|
| S01 | Gift → Economy (miaPoints) → Overlay public strip |
| S02 | Gift → Video/OBS media + Overlay HUD |
| S03 | Gift → Voice suppress / bubble (music) vs TTS path |
| S04 | Gift/Support → Koj / Bowl reaction → Overlay/OBS |
| S05 | Gift → Battle (duel/arena power) → Overlay |
| S06 | Chat/Speaker → Voice → Overlay bubble hide → OBS `MIA_VOICE` |
| S07 | Overlay poll ← MIA state (no coins) |
| S08 | OBS reconnect / voice revive (cross 3D+3E) |
| S09 | Persistence → restart → hydrate (Koj/economy/runtime) |
| S10 | Crash/kill mid-write → recovery (honest ❓) |
| S11 | Editor export → Animation Bank → runtime gift resolve (3I→3A) |
| S12 | Host/Away / dual stream (honest) |

---

## Zdroje důkazů (prior audity)

| Etapa | Složka | Role pro Cross |
|-------|--------|----------------|
| **Krok −1 / 1** | `docs/MIA_AUDIT_KROK_MINUS_1/` (+ Etapa 1 pokud existuje) | Inventář / struktura — jen kontext |
| **2** | `docs/MIA_AUDIT_ETAPA_2/` | Flow mapy (ingest→gift→body→koj→battle→editor) |
| **3A** | `…_3A_GIFTS/` | Gift tier, rotace, spam, bowl wiring |
| **3B** | `…_3B_MIA_BODY_ECONOMY/` | miaPoints, strip, ledger |
| **3C** | `…_3C_KOJNOZROUT/` | CARE, bowl viz, Trust ❌ |
| **3D** | `…_3D_OBS_RUNTIME/` | Manifest, bootstrap, reconnect |
| **3E** | `…_3E_VOICE_TTS/` | Dual OFF, music suppress, queue |
| **3F** | `…_3F_OVERLAY_RUNTIME/` | Public strip, pick/pin, HUD |
| **3G** | `…_3G_PERSISTENCE_RECOVERY/` | Hydrate, bak, multi-file |
| **3H** | `…_3H_BATTLE/` | Duel/arena, 2-stream |
| **3I** | `…_3I_EDITOR/` | Export bank, body OFF, standalone |

**Ownership:** Cross Audit **nevlastní** moduly — při konfliktu detailů platí příslušná 3A–3I matrix.

---

## Guardrails napříč řetězci (povinná kontrola)

1. **TikFinity → MIA → OBS** — OBS jen renderuje  
2. **Business logika v MIA** — ne v browser HTML / OBS skriptech  
3. **Overlay public** — jen `miaPoints`, nikdy coins/gift value  
4. **Dual voice** — default OFF (`MIA_DUAL_VOICE`)  
5. **Video rotace** — `rotationIndexByTier` bez resetu indexu jiného tieru  
6. Po větší změně stream/OBS/ingest: `node --check index.js` + `npm run test:preflight:fast` (ops — tento audit docs-only **neběžel** full suite)

---

## OUT (explicitně)

- Auto-fix jakéhokoli GAP  
- Master full wire / Safe Mode produkce  
- Live R1-D provedení v tomto tasku  
- Etapa 5  
- Re-audit vnitřností modulů (jen cite)  
- `README.md` v této složce (6 souborů only)

---

## Artefakty Etapa 4

| Soubor | Účel |
|--------|------|
| `00_SCOPE.md` | Tento dokument |
| `01_CROSS_CONTRACTS.md` | XC-01… cross pravidla |
| `02_COMPLIANCE_MATRIX.md` | XC ↔ evidence ↔ status ↔ Poslední ověření |
| `03_GAPS.md` | Cross gaps + consolidated Decision later board |
| `04_TESTS_COVERAGE.md` | Pokrytí **řetězců** (ne jen unit modulů) |
| `05_SUMMARY.md` | Capstone verdikt + scorecard + tabulky |

---

## Metodika Poslední ověření

| Značka | Význam |
|--------|--------|
| **fresh code 2026-07-28** | Spot-check handoffu v tomto Cross Audit běhu |
| **fresh contract 2026-07-27** | Prior 3* audit / PASS z předchozího dne (ne re-run dnes) |
| **hist. R1-C 2026-07-26** | Historický live PASS — **ne** fresh |
| **nikdy** | Bez důkazu v repu / session |
| **docs-only** | Tento běh nespouštěl `preflight:fast` celý |

> Capability PASS ≠ fresh cross-chain ověření. Hist. R1-C ≠ fresh 2026-07-28.
