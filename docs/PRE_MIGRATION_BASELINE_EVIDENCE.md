# PRE-MIGRATION BASELINE — evidence (PMB)

**Status:** **CLOSED — PARTIAL / MIGRATION JUSTIFIED** (2026-08-08)  
**Typ:** kontrolní live test na jednom notebooku před multi-PC migrací  
**Freeze:** runtime neměnit během freeze · RET-01 / 12 GB cleanup **nespuštěno** (správně)

---

## Závěr (1 odstavec)

Řetězec **TikFinity → ingest → MIA → TTS → audio ve streamu** byl **fyzicky slyšet** (~10 s MIA). Poté **spadlo TikFinity** a přestal přísun live eventů. Hlavní problém není „MIA neumí mluvit“, ale **nestabilita live technické vrstvy** (TikFinity + OBS + kriticky plná RAM). Pipeline nemusíme vymýšlet znovu — **musíme jí dát stabilní železo/prostor**. Multi-PC migrace je **opodstatněná**.

---

## 0. Meta session

| Pole | Hodnota |
|------|---------|
| Datum | 2026-08-08 |
| Start / konec (CET) | ~19:58 / ~20:30 (logy); TikFinity pád během live |
| MIA commit / branch | `593db881` · `feature/mia-genesis-mode` |
| PC | stejný notebook jako minule ☑ |
| Dual voice | OFF ☑ |
| Pořadí startu | MIA → TikFinity → TikTok LIVE Studio → OBS ☑ |
| Délka live | cíl 5–10 min (přerušeno pádem TikFinity) |
| Kontrolní účet | `Chyť si dron 1` (v ingestu maskováno jako `Test User 123` / TikFinity test text) |

---

## 1. Performance snapshoty (3×)

Snapshoty A/B/C **nebyly ručně zapsány** během testu. Post-hoc z logů / systému:

| Snapshot | Čas (CET) | RAM volná | Node / OBS | Studio / TikFinity | Poznámka |
|----------|-----------|-----------|------------|-------------------|----------|
| **A — před live** | ~19:58 | nezměřeno | — | — | OBS watchdog 4× launch |
| **B — ~3. min** | ~20:01–20:08 | nezměřeno | — | — | OBS crash / unclean shutdown v logu |
| **C — po testu** | ~20:34 | **~0,15 GB / 5,74 GB** | node ~118 MB · obs ~146 MB | TikFinity **spadlo** | RAM kriticky plná |

Prior srovnání: [`STREAM_VALIDATION_02.md`](./STREAM_VALIDATION_02.md) (2026-08-06 — RAM timeout, ingest neprokázán end-to-end ve streamu).

---

## 2. Řetězec událostí (log + operátor)

| Čas (CET) | Event | Ingest | Decision | TTS (log) | Slyšet ve streamu | Studio / TikFinity |
|-----------|-------|--------|----------|-----------|-------------------|---------------------|
| **20:25:57** | **COMMENT** | ano | překlad EN→CS + MIA | MIA (`en-US-JennyNeural`) | nepotvrzeno samostatně | OK → pak pád |
| **20:26:03** | **Rose** | ano | Koj support | Koj Antonín ~20:26:14 | nepotvrzeno samostatně | OK → pak pád |
| **(live)** | **MIA audio** | — | — | `tts_speak` v logu | **ano ~10 s** (operátor) | TikFinity pád → eventy stop |

### Log-only doplňky (celá session 19:58–20:30)

- **10 ingest eventů** — 4× COMMENT, 6× Rose (`logs/ingest-2026-08-08.jsonl`)
- **Koj TTS** — 5× Antonín; bank lines („Miska citi pulz.", „Prijato. Do misky.", …)
- **Gift video** — **1×** T1 playback (20:15:33); baseline Rose 20:26 **bez** `video_job_enqueued`
- **OBS** — 34/60 watchdog ticků `obsConnected:false`; max 30 consecutive down; CEF OK po 20:08 restartu

### Poznámky

```
COMMENT: TikFinity test text "This is a Test" — chat_translation_public, TTS anglicky (Jenny), ne cs-CZ-Vlasta.
Rose: gift-map overlay template "Test User 123 poslal Rose" (PF-01 dluh); Koj bank line v TTS.
Operátor: MIA slyšitelná ~10 s ve streamu; poté TikFinity crash → žádné další live eventy.
```

---

## 3. Verdikty

| Verdikt | Výsledek | Poznámka |
|---------|----------|----------|
| **COMMENT CHAIN** | **PARTIAL PASS** | ingest + decision + MIA TTS v logu; hlas EN ne CS host |
| **GIFT CHAIN** | **PARTIAL PASS** | ingest + Koj + Antonín; video jen 1/6 Rose v session |
| **FINAL AUDIO** | **PARTIAL PASS** | MIA **~10 s slyšet ve streamu**; Koj ve streamu neověřeno operátorem |
| **STABILITY** | **FAIL** | TikFinity pád · OBS crash/reconnect · RAM ~97 % využito |

**Celkový baseline:** ☑ **PARTIAL** · ☐ PASS · ☐ FAIL  
**Rozhodnutí:** ☑ **MIGRATION JUSTIFIED** — pipeline prokázána uchem; stabilita = infra, ne logika MIA.

---

## 4. Logy (2026-08-08)

| Zdroj | Cesta |
|-------|--------|
| Ingest | `logs/ingest-2026-08-08.jsonl` |
| MIA events | `logs/mia-events-2026-08-08.jsonl` |
| Gift map | `logs/gift-mapping-2026-08-08.jsonl` |
| Chyby | `logs/mia-errors-2026-08-08.jsonl` |
| OBS | `%APPDATA%\obs-studio\logs\2026-08-08 20-*.txt` — crash / unclean shutdown |

---

## 5. Interpretace

- **~12 GB `generated/eyes/`** = disk, ne RAM — cleanup nebyl apply; stabilita FAIL **nesouvisí** s chybějícím retention apply.
- **Disk cleanup ≠ RAM fix** — multi-PC / více RAM = správný směr, ne další digging na jednom notebooku.
- Po hardware: **THAW CHECKPOINT** (full preflight) → pak RET/cleanup — viz [`POST_FREEZE_BACKLOG.md`](./POST_FREEZE_BACKLOG.md).
- Baseline **uzavřen** — další live testy na tomto notebooku bez migrace **nedoporučeny** (RAM/TikFinity riziko).
