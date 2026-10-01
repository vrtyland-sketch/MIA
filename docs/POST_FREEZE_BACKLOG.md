# POST-FREEZE BACKLOG

**Status:** zápis pouze — **neimplementovat** během CONTENT FREEZE  
**Otevřeno:** 2026-08-08

---

## THAW CHECKPOINT — pořadí zamčeno (2026-08-08)

**První krok po unfreeze:** full preflight **před** jakoukoli runtime nebo test fix.  
Fast preflight (`165/165`) nestačí — neběží slow sady (`media_catalog`, `video_rotation`, `master_canon_*`, sprint 3–6, …).

| Krok | Akce | Poznámka |
|------|------|----------|
| **TC-01** | `node --check index.js` | syntax gate |
| **TC-02** | `npm run test:preflight` **full** | **žádné runtime změny před výsledkem** |
| **TC-03** | Sepsat všechny FAIL / WARN | triáž do tří košů (viz níže) |
| **TC-04** | Opravit `tests/ingest_contract_smoke.js` | až po TC-02/03 — testovací dluh, ne runtime bug |
| **TC-05** | Znovu `npm run test:preflight` full | po test fix |
| **TC-06** | Označit **thaw checkpoint CLEAN** | jen pokud TC-05 projde bez skutečných FAIL |

### Triáž TC-03 (povinná)

| Koš | Příklad |
|-----|---------|
| **Runtime regrese** | nový FAIL v produkční cestě, broken contract mimo zastaralý stub |
| **Flaky / zastaralé testy** | `ingest_contract_smoke` — očekává Kick `onEvent` callback; produkce jede unified `/ingest` s `onEvent: null` (správně testuje `platform_bridges_contract`) |
| **Environmentální** | OBS WS nedostupný, chybějící media soubory, timeout na pomalém disku |

### TC-04 — `ingest_contract_smoke` (schválený scope)

1. Odstranit nebo přepsat test „bootstrap wires kick onEvent callback“ tak, aby odpovídal unified `/ingest` architektuře (viz `tests/platform_bridges_contract.js`).
2. **Opravit false-green:** assertion failure musí vždy skončit **non-zero exit code** — dnes test zaloguje `❌`, ale proces může skončit dřív (např. `obs_hands_bootstrap` restart) a preflight hlásí `ok: true`.
3. Stub pro `scheduleInProcessRestart` / restart hook v smoke loaderu, aby runner vždy dojel k summary + `process.exit(failed ? 1 : 0)`.

**Známý stav před thaw (fast audit 2026-08-08):** `ingest_contract` = false green; `platform_bridges_contract` = správný model.

---

## PRE-MIGRATION BASELINE — **CLOSED** (2026-08-08)

**Výsledek:** **PARTIAL / MIGRATION JUSTIFIED** — viz [`PRE_MIGRATION_BASELINE_EVIDENCE.md`](./PRE_MIGRATION_BASELINE_EVIDENCE.md).

| Zjištění | Detail |
|----------|--------|
| Pipeline | TikFinity → ingest → MIA → TTS → **audio ve streamu ~10 s** (operátor) |
| Pád | TikFinity spadlo → live eventy stop |
| Root cause | Nestabilita **TikFinity + OBS + RAM** (~0,15 GB volné / 5,74 GB), ne „MIA neumí mluvit“ |
| Akce | Multi-PC migrace **opodstatněná**; další notebook live **nedoporučeno** |

*(Historický popis procedury — test proveden 2026-08-08.)*

**Typ:** kontrolní live test na **jednom PC** před multi-PC migrací — **ne** nový ostrý start, **ne** důvod k porušení freeze.

| Pravidlo | Detail |
|----------|--------|
| **Povoleno** | Spustit MIA + TikFinity + TikTok LIVE Studio + OBS; 5–10 min test live; evidence (logy, RAM/GPU) |
| **Zakázáno** | RET-01 cleanup, `save:false`, runtime změny, ref rewrite — **nespouštět 12 GB cleanup kvůli testu** |
| **Disk ≠ RAM** | ~12 GB v `generated/eyes/` = **místo na disku**, ne RAM. Uvolnění (až post-freeze) pomůže disku/cache/Windows, **ne automaticky** TikTok Studio RAM/GPU přetížení |
| **Stav disku** | Retention = **dry-run plán** — pokud nebyl mezitím apply, **fyzicky jsme ~12 GB nezískali** |

### Procedura (PMB-01 … PMB-06)

| # | Krok |
|---|------|
| 1 | Nechat **stejný notebook/PC** jako minule (žádná optimalizace před testem) |
| 2 | Spustit **MIA → TikFinity → TikTok LIVE Studio → OBS** (stejné pořadí jako dřív) |
| 3 | **5–10 min** testovací live |
| 4 | Z druhého účtu **`ControlViewer`**: 1× komentář + **1× Rose** |
| 5 | Ověřit řetězec: `COMMENT/GIFT → INGEST → DECISION → OVERLAY → MIA/Koj TTS → **slyšet ve streamu**` |
| 6 | Paralelně: **RAM/GPU** + watchdog TikTok Studia (Task Manager / existující evidence skripty) |

### Výsledek

| Outcome | Akce |
|---------|------|
| **PASS** | Baseline zapsat (datum, commit, logy) — referenční bod pro 3-PC migraci |
| **FAIL / zadusí se** | **Před/po srovnání** s multi-PC setupem; neinterpretovat jako regresi z neprovedeného cleanupu |

Evidence šablona: [`PRE_MIGRATION_BASELINE_EVIDENCE.md`](./PRE_MIGRATION_BASELINE_EVIDENCE.md) · prior běh: [`STREAM_VALIDATION_02.md`](./STREAM_VALIDATION_02.md)

---

## Runtime / voice (zjištěno auditem 2026-08-08)

| ID | Položka | Kontext | Priorita |
|----|---------|---------|----------|
| PF-01 | **Koj gift announce template ≠ character bank** | Gift TTS bere text z `gift_map` overlay template (`{user} poslal Rose`), ne z `support_small_kojnozout` / text bank. Provenance: event `tiktok_gift_843a299803c3f4cc` 2026-08-06. | P1 |
| PF-02 | **Gift → Koj → TTS E2E preflight** | Preflight dnes ověřuje routing/policy; chybí test: GIFT T1 → `speaker=kojnozout` → `tts_speak` + `audioUrl`. | P1 |
| PF-03 | **Final-output playback evidence** | PMB 2026-08-08: MIA **~10 s slyšet ve streamu**; Koj ve streamu neověřeno operátorem. Post-migrace: opakovat FINAL GATE na stabilním HW. | P1 |

---

## Content / voice quality (navazuje na TEXT BANK PASS)

| ID | Položka | Kontext |
|----|---------|---------|
| PF-04 | **Community / milestone character cut** | Audit 02: `community_*`, `milestone_*` — vyřezat „komunita drží tempo“ a moderátorský jazyk. |
| PF-05 | **MIA vitals_*_status 3. osoba** | Vitals statusy mluví *o* Kojovi místo MIA host hlasem. |
| PF-06 | **Gift voice: bank vs template routing** | Rozhodnout: Koj gift TTS vždy z text bank tier keys, overlay template jen pro bubble (ne TTS). |

---

## Asset pass (schváleno 2026-08-08, neimplementovat během freeze)

| ID | Položka | Status |
|----|---------|--------|
| RET-01 | Cron/trigger cleanup dry-run → apply (`MIA_ASSET_RETENTION.js`) | **APPROVED** — post-freeze |
| RET-02 | Vision tick `save: false`; save jen explicit endpoint | **APPROVED** — post-freeze |
| RET-03 | Env knobs `MIA_EYES_RETENTION_*`, `MIA_AUDIO_CACHE_*` | **APPROVED** — post-freeze |
| RET-04 | In-memory protect `voicePlayback.audioUrl` during cleanup | **APPROVED** — post-freeze |
| RET-05 | Evidence manifest `content-pass/evidence-manifest.json` | **APPROVED** — post-freeze |

**RETENTION POLICY = APPROVED AS DESIGNED** — viz `docs/ASSET_PASS_03A_RETENTION_DESIGN.md`.  
**Registry seed 03B** — viz `docs/ASSET_PASS_03B_REGISTRY_SEED.md`, `content-pass/ASSET_REGISTRY.json`.

| ID | Položka | Kontext |
|----|---------|---------|
| PF-07 | **userId vs nickname v TTS/overlay** | TikFinity dodává `userId` + `username` + `nickname`. Overlay/TTS dnes používá **nickname** (`displayName`). Paměť drží `userId` — ověřit konzistenci napříč session memory. |
| PF-08 | **VOICE BIBLE — MIA + Kojnožrout** | 5–10 pravidel/postava; MIA vede dění, Koj v něm žije. Prevence „komunita drží tempo“ regressu při dalších text pass dávkách. |
