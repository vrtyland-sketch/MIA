# GENESIS — operační pořadník (2026-08-13)

**Status:** LOCK · docs-only · FREEZE-safe · **audity STOP**  
**Účel:** doma **jen** [`HOME_EXECUTION_PLAN.md`](./HOME_EXECUTION_PLAN.md) — krok po kroku, bez improvizace. Notebook = offline content (assety, texty), **ne** runtime/síť/OBS.

---

## Operativní zámek (2026-08-13)

| Pravidlo | Stav |
|----------|------|
| Audity 1–3 + HOME EXECUTION PLAN | ✅ hotovo — **žádné další audity** |
| Feature freeze | ON — žádný runtime/refactor |
| Doma | výhradně `HOME_EXECUTION_PLAN.md` od kroku 0 |
| Notebook | max. offline drobnosti (asset označení, texty) — **ne** infrastruktura |
| GENESIS | **NO GO** dokud PASS: NETWORK + COMMENT + ROSE + PC3-INDEPENDENCE |

Diagnostická logika (STOP při FAIL, neopravovat vrstvy nad):

```text
SÍŤ → MIA HTTP → OBS WS → OBS OBRAZ → TIKFINITY → COMMENT → ROSE → PC3 PRYČ
```


## Priorita A → H

| Fáze | Co | Kde | Výstup |
|------|-----|-----|--------|
| **A** | Síť + audit reality | doma | OK / CHYBÍ / ŠPATNĚ tabulka (PC1/2/3, IP, health, ingest, OBS WS, scéna, canvas, TikTok Studio zdroj) |
| **B** | TikFinity staré akce + ingest | doma | Inventář COMMENT akcí: co čte TikFinity samo vs `/ingest` vs overlay — **nic nemazat** |
| **C** | OBS master scéna + safe zones + audio | doma | 1080×1920 master, grid test, TTS slyšet na telefonu |
| **D** | Asset inventář + GENESIS CUT | notebook ✅ | [`ASSET_GENESIS_CUT.md`](./ASSET_GENESIS_CUT.md) · [`GENESIS_STREAM_VOICE.md`](./GENESIS_STREAM_VOICE.md) |
| **E** | Golden Rose + COMMENT | doma | GP-S protocol 3/3 + burst |
| **F** | Restart + odpojení notebooku | doma | PC1+PC2 bez PC3 |
| **G** | Neveřejná generálka | doma | GO/NO-GO |
| **H** | Kosmetika + nové schopnosti | později | až po G |

---

## Původní kroky 1–14 (mapování)

| # | Krok | Fáze |
|---|------|------|
| 1 | Read-only audit multi-PC | **A** |
| 2 | Záloha OBS | **A** (hned po auditu, před zásahy) |
| 3 | Hlavní vertikální scéna 1080×1920 | **C** |
| 4 | Safe zones TikToku | **C** |
| 5 | Alpha/transparency audit | **C** + **D** |
| 6 | Gift overlaye do hlavní scény | **C** |
| 7 | Velikosti a pozice | **C** (až po safe zones) |
| 8 | Audio cesta | **C** |
| 9 | TikFinity audit | **B** |
| 10 | Multi-PC linkage test | **A** + **F** |
| 11 | TikFinity stabilita | **E** |
| 12 | Golden Rose E2E | **E** |
| 13 | Restart test | **F** |
| 14 | Krátký neveřejný live | **G** |

---

## Tři nové úkoly

| ID | Úkol | Fáze | Poznámka |
|----|------|------|----------|
| **ASSET MASTER AUDIT** | MIA/Koj inventář CURRENT/TEMP/LEGACY/DUPLICATE | **D** | žádné překreslování |
| **GENESIS FUNCTION CUT** | Jen funkce s šancí být PROVEN | **D** → **E** | viz sekce v ASSET_MASTER_AUDIT |
| **VOICE/BEHAVIOR POLISH** | leštění existující cesty | **H** | žádný nový voice engine před live |

---

## Doma — jet podle plánu

**Jediný runbook:** [`HOME_EXECUTION_PLAN.md`](./HOME_EXECUTION_PLAN.md) — FIRST 15 MINUTES → kroky 0–12 → VERDICT.

*(Starý checklist A→H níže zůstává jako mapování fází; pořadí doma řídí plán.)*

## Notebook — offline pass (hotovo 2026-08-13)

- [`ASSET_GENESIS_CUT.md`](./ASSET_GENESIS_CUT.md) — zamčený IN/OUT pro show
- [`GENESIS_STREAM_VOICE.md`](./GENESIS_STREAM_VOICE.md) — charakter + pack mapa
- `text-bank/packs/` — support_small, idle, spam, returning, first-visit (nový)

**STOP** další notebook práce — doma jen [`HOME_EXECUTION_PLAN.md`](./HOME_EXECUTION_PLAN.md).

## Notebook — kamionová práce (legacy)

- [`ASSET_MASTER_AUDIT.md`](./ASSET_MASTER_AUDIT.md) — read-only inventář (zdroj pro cut)

---

## Notebook audity (read-only)

**⏸️ PAUSE — audity 1–3 hotové. Doma jet [`HOME_EXECUTION_PLAN.md`](./HOME_EXECUTION_PLAN.md).**

| # | Audit | Status | Dokument |
|---|-------|--------|----------|
| 1 | OBS static | ✅ hotovo | [`OBS_STATIC_AUDIT.md`](./OBS_STATIC_AUDIT.md) |
| 2 | TikFinity static | ✅ hotovo | [`TIKFINITY_STATIC_AUDIT.md`](./TIKFINITY_STATIC_AUDIT.md) |
| 3 | Startup / PC3 independence | ✅ hotovo | [`STARTUP_PC3_INDEPENDENCE_AUDIT.md`](./STARTUP_PC3_INDEPENDENCE_AUDIT.md) |
| — | **HOME EXECUTION PLAN** | ✅ hotovo | [`HOME_EXECUTION_PLAN.md`](./HOME_EXECUTION_PLAN.md) |
| 4 | Golden Rose evidence | ⏸️ pause | — (řeší krok 9 plánu doma) |
| 5 | Asset gate GENESIS_IN/OUT | ☐ | `ASSET_MASTER_AUDIT.md` |
| 6 | Canon gap | ☐ | `CANON_GAP_AUDIT.md` |

---

## Blokery (2026-08-13)

| Bloker | Stav |
|--------|------|
| PC1 spí | ping `.1` fail — očekávané |
| PC2 IP neověřeno | `.20` možná stále APIPA |
| GP-S Rose | FAIL 0/15 PROD |
| TikFinity staré COMMENT TTS | audit hotový — doma ověřit Actions (D1 HIGH) | [`TIKFINITY_STATIC_AUDIT.md`](./TIKFINITY_STATIC_AUDIT.md) §12 |
| Program vs overlay scéna | viz OBS audit — HLAVNI nested ENGINE_GIFTS vs MIA_GENESIS |
