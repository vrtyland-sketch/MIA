# STREAM_RECOVERY_01

**Status:** OPEN — **jediná aktivní priorita projektu**  
**Datum otevření:** 2026-08-05  
**Poslední validation pokus:** 2026-08-06 → FINAL GATE **FAIL_B_STABILITY** (invalidated)  
**Večerní live důkaz:** 2026-08-06 **19:50–20:03** lokálně — reálný ingest + TTS + gift video ([`logs/ingest-2026-08-06.jsonl`](../logs/ingest-2026-08-06.jsonl))  
**Findings:** [`docs/MIA_STREAM_2026-08-05_FINDINGS.md`](./MIA_STREAM_2026-08-05_FINDINGS.md)  
**Ověření po opravách:** [`docs/STREAM_VALIDATION_02.md`](./STREAM_VALIDATION_02.md)  
**Závěr prvního streamu:** FIRST LIVE STREAM = NO GO (stabilita spojení, ne rozbitý core)

---

## Diagnóza po večerním streamu 2026-08-06

> **MIA umí live reagovat.** Problém: spojení k ní není stabilní a stroj je pod tlakem.  
> Funkovalo **~13 min z ~60** (19:50–20:03), ne celý večer.

| Pořadí | Příčina | Důkaz |
|--------|---------|--------|
| **1** | **TikFinity stabilita** | Prvních ~50 min live **0 ingest**; po reconnectu 14 reálných eventů |
| **2** | **RAM / výkon** | `/health` timeouty; ~0,1–0,3 GB volné během streamu |
| **3** | **OBS viditelnost outputu** | Logy: `video_playback_started` + TTS; záznam často černý/statický |
| **4** | OBS restart ~19:43 | Krátká WS destabilizace, ne hlavní příčina 50 min výpadku |
| **5** | GENESIS / multi-platform | Sekundární — startup/locky; **ne** „ingest endpoint mrtvý“ |

**Co je PROVEN:** TikFinity webhook, reálný COMMENT (ExampleViewer 19:50), reálný GIFT → video/TTS (ControlViewer, Rose).  
**Co NENÍ PROVEN:** 15 min souvislá stabilita A+B (FINAL GATE).

**Nové zadání (ne hledat rozbitý ingest):** TikFinity stabilita + RAM budget + OBS output viditelnost.

**Cíl (celý zápas):** MIA nepotřebuje být chytřejší. **Potřebuje vydržet připojená a být vidět a slyšet.**

**GENESIS / multi-platform:** ne teď jako hlavní práce. **Nevyhazovat z vyšetřování** — pokud TikFinity po čistém restartu a s dostatkem RAM pořád padá, vrátit se ke startup skriptům / multi-platform změnám (locky, destabilizace runtime).

---

## Feature freeze

**2026-08-08 — TVRDÝ CONTENT FREEZE** (čeká se na síťovou techniku):  
→ [`FEATURE_FREEZE_CONTENT_PASS.md`](./FEATURE_FREEZE_CONTENT_PASS.md)  
Povoleno jen **ASSET PASS + TEXT BANK PASS**. Žádná migrace MIA/SSH/síť, žádný runtime.

---

Dokud `STREAM_VALIDATION_02` neprojde úspěšně (po skončení content freeze + hardware):

- **Nepřidávat** nové funkce, hry, AI vylepšení, nové overlaye ani grafické efekty.
- **Opravovat pouze:**
  1. **TikFinity stabilitu** (room reconnect, crash recovery, filtry),
  2. **RAM budget** před/during live (Cursor, EOS, Studio),
  3. **OBS output viditelnost** (Program scéna, browser sources, vrstvy nad videem),
  4. HTML rozlišení a pozice (P3).

Po úspěšném `STREAM_VALIDATION_02` teprve návrat do režimu vývoje nových funkcí.

---

## Tři vrstvy (oddělené)

| ID | Vrstva | Stav |
|----|--------|------|
| A | Live ingest (TikTok / Kick / Twitch) | **PARTIAL** — endpoint OK; live 19:50–20:03 ✅; TikFinity uptime ❌ |
| B | OBS Program scéna + viditelnost reakcí | **PARTIAL** — pipeline log OK; záznam často neviditelný ❌ |
| C | TikTok LIVE Studio + RAM (watchdog) | **FAIL** |

`TIKTOK LIVE STUDIO STABILITY = FAIL`  
Důkazy: watchdog `timeout` / `recover`; `SYSTEM_MEMORY_USAGE_TOO_HIGH`; `OTHER_APPS_MEMORY_USAGE_TOO_HIGH`.  
**Přímá kauzalita memory → ingest = NOT PROVEN** (destabilizační faktor, ne jediná příčina).

Dočasné kopie watchdog reportů v git repo byly smazány; originály zůstávají v `%APPDATA%\TikTok LIVE Studio\watch_dog\` a conclusions jsou v findings z původních logů.

---

## Pořadí práce

1. **TikFinity stabilita** — reconnect po Go Live, crash recovery, Test vs live ověření  
2. **RAM budget** (PRIORITA 0) — **ideál 1,5–2 GB+** volné před live; **≥0,8 GB jen nouzové minimum** (po Studiu swap → celý řetězec se táhne); Cursor zavřený během streamu  
3. **OBS output viditelnost** (PRIORITA 2) — nejen log `video_playback_started`, ale divák vidí/slyší  
4. **HTML overlaye** (PRIORITA 3)  
5. **`STREAM_VALIDATION_02` FINAL GATE** — až 1–3 zelené  

---

## PRIORITA 0 — Resource pressure / Studio stability (před ingest testy)

| Úroveň | Volná RAM | Poznámka |
|--------|-----------|----------|
| **Ideál před live** | **≥1,5–2 GB** | Po zapnutí Studia zůstat nad ~0,8 GB; jinak swap |
| **Nouzové minimum** | **≥0,8 GB** | Jen když monitor nehlásí `/health` timeouty — **ne cíl** |
| **Hard STOP** | **&lt;~0,1 GB** | Health timeout, TikFinity/OBS lag — **nestartovat FINAL GATE** |

Předstreamový checklist (ops only):

- [ ] Restart PC  
- [ ] Zavřít nepotřebné appky (Cursor, EOS, prohlížeče)  
- [ ] RAM před OBS — cíl **1,5–2 GB+**  
- [ ] RAM po OBS  
- [ ] RAM po TikTok LIVE Studio — pokud **&lt;0,5 GB**, **FAIL**, ne FINAL GATE  
- [x] **2026-08-06:** před Studio **0,27 GB** → po Studio **&lt;0,5 GB**, Studio ~**1,1 GB** — **FAIL** ([evidence](./STREAM_VALIDATION_02_EVIDENCE.jsonl))  
- [ ] Start MIA  
- [ ] Kontrolní běh bez `timeout`/`recover` ve watchdog  
- [ ] Teprve pak reálný COMMENT/GIFT  

---

## PRIORITA 1 — Live ingest

1. Ověřit TikFinity: webhook URL, metoda, port, payload, COMMENT + GIFT  
2. Cíl: `http://127.0.0.1:3000/ingest`  
3. Diagnostika: `lastIngest`, platform, type, user, timestamp, session count  
4. Lokální test COMMENT + GIFT na stejný endpoint  
5. **Jeden reálný** TikTok COMMENT  
6. Bez reálného COMMENT ≠ TikTok PASS  

**2026-08-06 INGEST GATE:** MIA endpoint ✅ PASS ([evidence](./STREAM_VALIDATION_02_INGEST_GATE.jsonl)).  
**2026-08-06 večer:** reálný COMMENT ✅ (ExampleViewer), reálný GIFT ✅ (ControlViewer, Rose) — **14 live eventů** v okně 19:50–20:03.  
**TikFinity uptime:** ❌ ~50 min bez trafficu před reconnectem.

Platformy:

| Platforma | Stav |
|-----------|------|
| TikTok | **PARTIAL** — pipeline PROVEN; TikFinity stabilita FAIL |
| Twitch | FAIL — 401 OAuth |
| Kick | NOT PROVEN |

---

## PRIORITA 2 — OBS scéna

1. Zapsat Program scénu při streamu  
2. Zapsat scénu s MIA Browser Sources  
3. Porovnat `MIA_GENESIS` / `SPINAK_HLAVNI` / `SPINAK_ENGINE_GIFTS`  
4. Jedna ostrá scéna: kamera, videa, speech, gift, bowl, chat, Koj runtime, nutné vrstvy  
5. Každá vrstva viditelná na Program  

**Videa neměnit. GENESIS neměnit**, dokud neskončí HTML audit.

---

## PRIORITA 3 — HTML rozlišení

Audit každého Browser Source: název, URL, CSS/viewport, OBS W×H, transform, scale, pozice, ořez, target stream resolution.  
Opravit size/resolution/crop/aspect.  
Videa beze změny. GENESIS beze změny do konce auditu.

---

## Handoff → STREAM_VALIDATION_02

Až jsou P0–P3 hotové (nebo dostatečně zelené pro bezpečný krátký test), spustit **pouze** [`STREAM_VALIDATION_02`](./STREAM_VALIDATION_02.md).

**FINAL GATE** (15 min monitor): `node scripts/stream_validation_02_final_gate.js`  
Uzavření **CLOSED** pouze při **tvrdém PASS** — viz FINAL GATE v [`STREAM_VALIDATION_02`](./STREAM_VALIDATION_02.md) (ne jen „15 min nějak běželo“).

Cíl řetězce:  
`COMMENT → INGEST → DECISION → OVERLAY → TTS → LOG`

Dokud validation neprojde: **NO GO**, tento checkpoint zůstává **OPEN**.
