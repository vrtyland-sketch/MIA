# MIA — Operations Status (SoT)

**Aktualizováno:** 2026-08-08  
**Účel:** jediný vstupní bod — co je hotové, co je rozpracované, co dělat dál  
**Freeze:** **ACTIVE** — viz [`FEATURE_FREEZE_CONTENT_PASS.md`](./FEATURE_FREEZE_CONTENT_PASS.md)

```
STAV: PARKED — čeká hardware (switch/síť) + multi-PC migrace
PIPELINE: PROVEN (PMB ~10 s audio) · STABILITY: NOT PROVEN (notebook RAM/TikFinity)
```

---

## 1. Verdikty (uzavřené)

| Gate | Výsledek | Dokument |
|------|----------|----------|
| TEXT PASS | **STABLE** | 86/86 runtime keys |
| ASSET PASS | **ANALYZED** (execution parked) | `ASSET_PASS_*`, `content-pass/ASSET_REGISTRY.json` |
| PRE-MIGRATION BASELINE | **PARTIAL / MIGRATION JUSTIFIED** | [`PRE_MIGRATION_BASELINE_EVIDENCE.md`](./PRE_MIGRATION_BASELINE_EVIDENCE.md) |
| Stream Core (formální) | **Neuzavřeno** — R1-D / FINAL GATE | [`MIA_R1D_LIVE_CHECKLIST.md`](./MIA_R1D_LIVE_CHECKLIST.md) |
| THAW CHECKPOINT | **Neprovedeno** | [`POST_FREEZE_BACKLOG.md`](./POST_FREEZE_BACKLOG.md) → TC-01…06 |

**Závěr:** MIA **umí** doručit audio do streamu. Další práce = **infra + stabilita**, ne reinvent pipeline.

---

## 2. Co je rozpracované (lokálně)

| Bucket | Stav | Akce po hardware |
|--------|------|------------------|
| Branch `feature/mia-genesis-mode` | Engine2 E5b commit; **velký uncommitted diff** | Split commitů: stream core / genesis / canon import |
| Genesis Mode | Design COMPLETE, kód HOLD | [`MIA_GENESIS_MODE/PRE_LAUNCH_GATE.md`](./MIA_GENESIS_MODE/PRE_LAUNCH_GATE.md) — až po Stream Core PASS |
| Master canon import | `_canon_import/` + 87 contract testů untracked | Rozhodnout: commit vs. archive; full preflight master_canon_* |
| Multi-platform | Kick/Twitch částečně; YouTube quota FAIL | Fáze 2 až po TikTok core PASS |
| Asset registry | 1091 entries, **bez runtime wiring** | POST-FREEZE RET + dedup |
| 4 unresolved asset refs | held | Manuální review post-freeze |

**Notebook live:** **NEDOPORUČENO** — baseline uzavřen.

---

## 3. Profesionální pořadí — co dělat kdy

### Fáze A — Hardware dorazí (Den 0)

| # | Krok | Vlastník | Poznámka |
|---|------|----------|----------|
| A1 | Switch/síť — vše na `192.168.1.x` | Operátor | Konec ICS workaround |
| A2 | [`MIA_MULTI_PC_SETUP.md`](./MIA_MULTI_PC_SETUP.md) — checklist | Operátor | IP tabulka vyplnit |
| A3 | **Žádný** další live na notebooku | — | |

### Fáze B — Multi-PC wiring (Den 1)

| # | Krok | Ověření |
|---|------|---------|
| B1 | STREAM PC: OBS WS :4455, Studio, TikFinity | RustDesk |
| B2 | MIA PC: `node`, repo, `.env` → `OBS_WS_URL=ws://<STREAM>:4455` | SSH |
| B3 | TikFinity webhook → `http://<MIA-IP>:3000/ingest` | ingest log |
| B4 | `curl /health` → `obsConnected: true` | |
| B5 | RAM cíl: **≥2 GB volné** před Go Live | Task Manager |

### Fáze C — THAW CHECKPOINT (Den 1–2, před runtime fixy)

| # | Krok | Příkaz |
|---|------|--------|
| C1 | Syntax | `node --check index.js` |
| C2 | **Full preflight** | `npm run test:preflight` |
| C3 | Triáž FAIL/WARN | runtime / flaky test / env |
| C4 | Fix `ingest_contract_smoke` false-green | až po C2 |
| C5 | Znovu full preflight | |
| C6 | **THAW CLEAN** | vše zelené nebo zdokumentované env FAIL |

### Fáze D — Live retest na novém HW (Den 2)

| # | Krok | Dokument |
|---|------|----------|
| D1 | Stejný scénář jako PMB | [`PRE_MIGRATION_BASELINE_EVIDENCE.md`](./PRE_MIGRATION_BASELINE_EVIDENCE.md) |
| D2 | 3 RAM snapshoty A/B/C | povinné |
| D3 | COMMENT + Rose z `Chyť si dron 1` | 4 verdikty |
| D4 | Cíl: **FINAL AUDIO PASS** (MIA + Koj slyšet) | PF-03 |

### Fáze E — Post-thaw execution (až po C6 + D PASS)

Pořadí dle [`FEATURE_FREEZE_CONTENT_PASS.md`](./FEATURE_FREEZE_CONTENT_PASS.md):

1. RET-02 (`save:false`) → 2. RET-01 cleanup → 3. SAFE dedup → 4. catalog ref rewrite → 5. dedup re-run → 6. semantic review

Pak backlog **PF-01…PF-08** (voice, gift routing, character).

### Fáze F — Repo hygiene (paralelně s B–C, bez runtime změn)

| # | Akce |
|---|------|
| F1 | Commit split: stream core vs genesis vs docs-only |
| F2 | `_canon_import` — commit nebo přesun mimo repo |
| F3 | Temp soubory — viz `.gitignore` (`_tmp_master.bundle`, …) |

**Env šablony (offline, hotovo):** [`.env.mia-pc.example`](../.env.mia-pc.example) · [`.env.stream-pc.example`](../.env.stream-pc.example)

---

## 4. Co teď **nedělat**

- Runtime / ingest / OBS změny během freeze  
- RET-01 / 12 GB cleanup „pro RAM“  
- Genesis commit do main stream path  
- Další notebook live maraton  
- Force push / migrace sítě bez checklistu  

---

## 5. Rychlé odkazy

| Potřebuji… | Dokument |
|------------|----------|
| **Golden Paths (produktový gate)** | [`MIA_GOLDEN_PATHS.md`](./MIA_GOLDEN_PATHS.md) · GP-S [`Rose`](./MIA_GOLDEN_PATH_GP-S_ROSE.md) · GP-C [`PNG→Reel`](./MIA_GOLDEN_PATH_GP-C_PNG_REEL.md) |
| Backlog položky | [`POST_FREEZE_BACKLOG.md`](./POST_FREEZE_BACKLOG.md) |
| Freeze pravidla | [`FEATURE_FREEZE_CONTENT_PASS.md`](./FEATURE_FREEZE_CONTENT_PASS.md) |
| 3-PC setup | [`MIA_MULTI_PC_SETUP.md`](./MIA_MULTI_PC_SETUP.md) |
| Baseline evidence | [`PRE_MIGRATION_BASELINE_EVIDENCE.md`](./PRE_MIGRATION_BASELINE_EVIDENCE.md) |
| R1-D oficiální gate | [`MIA_R1D_LIVE_CHECKLIST.md`](./MIA_R1D_LIVE_CHECKLIST.md) |
| Live bugy | [`MIA_LIVE_BUG_TRACKER.md`](./MIA_LIVE_BUG_TRACKER.md) |

---

## 6. Git snapshot (2026-08-08)

| Pole | Hodnota |
|------|---------|
| Branch | `feature/mia-genesis-mode` |
| HEAD | `593db881` (Engine2 E5b) |
| Working tree | **špinavý** — modified runtime + stovky untracked |
| Doporučení | Necommitovat mix genesis+cannon+core; split ve Fázi F |

**Další profesionální krok bez hardware:** vyplnit IP tabulku v `MIA_MULTI_PC_SETUP.md` a připravit `.env` z šablon pro MIA PC / STREAM PC (offline).

**Dlouhodobá produktová vize (docs only):** [`MIA_CREATIVE_STUDIO_VISION.md`](./MIA_CREATIVE_STUDIO_VISION.md) — `mia-paint` = engine, Creative Studio = multimediální produkt, Stream = jeden export kanál.
