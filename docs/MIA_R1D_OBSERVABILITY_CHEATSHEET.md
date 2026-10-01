# R1-D Observability Cheatsheet

**Pro:** operátor během živého R1-D · **read-only** · žádné opravy během session  
**Checklist:** `docs/MIA_R1D_LIVE_CHECKLIST.md` · **Bugy:** až po RESULT → `MIA_LIVE_BUG_TRACKER.md`

**Logy (typicky):** `mia-events`, `mia-errors`, `ingest-deduped`  
**Data:** `data/kojnozout-state.json`, `data/kojnozout-world.json`, `data/viewer-memory.json`, `data/runtime-state.json`

---

## R1D-01 — Gift → Economy → Public strip

| | |
|--|--|
| **Stream** | Strip/HUD: **miaPoints**; žádné coins / gift value |
| **Logy** | gift/support stages; případně economy enrich |
| **Soubory** | — (volitelně viewer-memory po delší session) |
| **Metriky** | Veřejný overlay text = body, ne mince |
| **PASS** | miaPoints OK · coins nevidět |
| **FAIL** | coins / gift value ve veřejném overlay |
| **INCONCLUSIVE** | Overlay nenačten / špatný browser URL |
| **Hypotéza** | — |

## R1D-02 — Gift → Video / OBS + Combo/Spam HUD

| | |
|--|--|
| **Stream** | Media slot hraje; combo/spam HUD; tier konzistence (DL-01) |
| **Logy** | `video_job_enqueued` → `video_playback_started` → `video_playback_finished` (nebo failed); `queueLength`; merge |
| **Soubory** | — |
| **Metriky** | Párování enqueued↔started; HUD tier vs video tier |
| **PASS** | Video hraje · HUD bez coins · tiery sedí |
| **FAIL** | Žádné video; orphan `enqueued`; HUD T4 vs video T3 (nesoulad) |
| **INCONCLUSIVE** | OBS media source chybí / silent mute |
| **Hypotéza** | Orphan enqueued → **drainQueue race**; stale HUD → ne SF; mute/refresh → **SF-01** |

## R1D-03 — Music gift → bubble, TTS off

| | |
|--|--|
| **Stream** | Bublina ano; TTS ne; dual voice ne |
| **Logy** | speaker / suppress gift voice (pokud logováno); žádný dlouhý TTS play |
| **Soubory** | — |
| **Metriky** | Audio: ticho TTS při music gift |
| **PASS** | Bubble only · bez TTS |
| **FAIL** | TTS hraje přes music gift |
| **INCONCLUSIVE** | Gift nemá music flag / špatný gift |
| **Hypotéza** | — |

## R1D-04 — Chat → TTS → bubble hide → MIA_VOICE

| | |
|--|--|
| **Stream** | Hlas z MIA_VOICE; bubble hide; **bez echo** |
| **Logy** | `voice_speak_*` / drop; `overlay_queued` **`size`**; žádný druhý voice sink |
| **Soubory** | — |
| **Metriky** | Echo ano/ne; `overlay_queued.size` peak během TTS |
| **PASS** | Slyšet MIA_VOICE · bubble skrytá · 1 hlas |
| **FAIL** | Ticho; **dvojitý hlas**; bubble zůstane |
| **INCONCLUSIVE** | Edge TTS outage / VB-Cable |
| **Hypotéza** | Echo → **SF-02/SF-04**; ticho → **SF-03**; size↑ → overlay **NO CAP** (hyp., ne bug) |

## R1D-05 — Bowl / Koj

| | |
|--|--|
| **Stream** | Bowl viz + Koj reakce; plná miska ↔ T4 současně (DL-02) |
| **Logy** | gift/support → koj; bowl stages pokud jsou |
| **Soubory** | `kojnozout-state.json` — `bowlPercent`, `totalFeedEvents` (po ≥3 s od giftů) |
| **Metriky** | Viz vs trigger; JSON vs live |
| **PASS** | Viz+trigger sedí · Koj reaguje · bond-only OK |
| **FAIL** | Viz plná, T4 ne (nebo naopak); Koj mrtvý |
| **INCONCLUSIVE** | Gift bez bowl gain |
| **Hypotéza** | Double-gift &lt;2,5 s · disk = jen 1. gift → **stale persistence flush** |

## R1D-06 — Platform Arena

| | |
|--|--|
| **Stream** | Arena/power v **miaPoints**; ne duel 2-stream |
| **Logy** | world layer / arena; případně `scheduleWorldSave` jen přes disk |
| **Soubory** | `kojnozout-world.json` mtime (burst CARE/arena = cíleně, ne nutně jádro) |
| **Metriky** | HUD body; arena reaguje |
| **PASS** | Arena OK · miaPoints · bez coins |
| **FAIL** | Arena nereaguje; coins v HUD |
| **INCONCLUSIVE** | Arena source není ve scéně |
| **Hypotéza** | Mnoho write mtime ~2,5 s → **world timer storm** (cílený test) |

## R1D-07 — Soft restart hydrate

| | |
|--|--|
| **Stream** | Po restartu Koj/economy zpět; overlay/voice fronty prázdné OK |
| **Logy** | Boot / seed; žádný crash loop |
| **Soubory** | Před/po: `kojnozout-state.json`, `runtime-state.json`, volitelně viewer-memory |
| **Metriky** | bowl/feed/pts shoda před stop vs po start |
| **PASS** | Hydrate OK · bez wipe |
| **FAIL** | Wipe / nebootuje / coin leak po startu |
| **INCONCLUSIVE** | Stop nebyl graceful |
| **Hypotéza** | Disk &lt; live před stopem → **stale flush** |

## R1D-08 — Kill Node chaos *(odděleně od hlavního běhu)*

| | |
|--|--|
| **Stream** | Po kill+start: boot OK |
| **Logy** | Boot; soft-fail pokud corrupt |
| **Soubory** | Stav JSON před/po; **není FAIL** jen kvůli chybě `.bak` |
| **Metriky** | Boot loop ano/ne; ztráta dat = poznámka DL-09 |
| **PASS** | Boot OK · guardrails drží |
| **FAIL** | Crash loop · coin leak |
| **INCONCLUSIVE** | Kill mimo zápis |
| **Hypotéza** | Ztráta dat → **DL-09** / world·koj persist (ne auto-bug) |

## R1D-09 — OBS reconnect / voice revive

| | |
|--|--|
| **Stream** | Po reconnect/revive: overlayy + MIA_VOICE znovu |
| **Logy** | `[OBS] connected`; post-connect; revive skripty |
| **Soubory** | — |
| **Metriky** | Connect ano/ne; TTS po revive |
| **PASS** | OBS zpět · voice hraje · layout OK |
| **FAIL** | Trvale disconnected · voice mrtvý po revive |
| **INCONCLUSIVE** | Ruční zásah zaměněný za auto |
| **Hypotéza** | Reconnect ticho → **SF-07**; voice mrtvý → **SF-03**; stale overlay → **SF-01** |

---

## Rychlá legenda hypotéz (jen odkaz)

| ID | Téma |
|----|------|
| drainQueue race | Video orphan `enqueued` |
| stale persistence flush | Koj JSON zaostává za 2. giftem &lt;2,5 s |
| world timer storm | Mnoho write `kojnozout-world.json` |
| overlay NO CAP | `overlay_queued.size` bez stropu (hyp.) |
| SF-01 | Browser refresh silent fail |
| SF-02 / SF-04 | Mute duplicate / browser fail → echo |
| SF-03 | Voice refresh fail → ticho |
| SF-07 | Reconnect catch empty |
| DL-01 / DL-02 | Tier / bowl align (Decision) |
| DL-09 | Persist bak (Decision; ne FAIL R1D-08 samotný) |

---

## Pravidla session

1. Nejdřív **evidence**, pak verdikt.  
2. Během R1-D **neopravovat**.  
3. Chaos kill (**R1D-08**) jen pokud je naplánovaný — jinak znehodnotí zbytek.  
4. Hypotéza ≠ BUG — BUG až do Live Bug Tracker po RESULT.

**Stav dokumentu:** tahák pro R1-D Live · kód beze změny.
