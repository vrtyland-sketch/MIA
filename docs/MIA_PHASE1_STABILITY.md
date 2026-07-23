# MIA Phase 1 — Stabilita (checklist)

**Stav:** Phase 1 stability **slice 2 shipped** (2026-07-20) — viz [`MIA_PHASE1_PROGRESS.md`](./MIA_PHASE1_PROGRESS.md)  
**Nadřazený dokument:** [`MIA_RUNTIME_ROADMAP.md`](./MIA_RUNTIME_ROADMAP.md)  
**Datum:** 2026-07-20

Cíl Fáze 1: stabilní páteř streamu (event → fronta → stav → recovery → replay).  
**Ne:** big-bang split `index.js`, nové herní featury, grafický bust.

**Pravidla:** overlay jen `miaPoints` · TikFinity → MIA → OBS · dual voice default OFF.

---

## Checklist (body 1–6)

- [x] **1. Jednotný event formát**  
      `core/event-normalizer.js` — TikFinity / Kick / test / legacy → `{ id, platform, type, user, gift?, text?, timestamp, miaPoints }`.  
      Live: gift enrich path připojuje `normalized.miaRuntimeEvent`. Interně smí být `coins`; overlay helper `toOverlaySafe` coins stripuje.

- [x] **2. Rozdělení `index.js` (inkrementálně)**  
      Skeleton `core/` · `ingest/` · `output/` · `config/runtime.json`. Přesunuty jen normalizer + queue + runtime-state + event-log + watchdog. Battle/chat zůstávají. Žádný big-bang.

- [x] **3. Action Queue**  
      `core/action-queue.js` — priority dle roadmapy, coalesce spam gifts, interrupt API, **single runner** (speak + overlay).  
      Wired: TTS `enqueueVoiceSpeak` (opt-in). Default OFF — `MIA_ACTION_QUEUE=1`.

- [x] **4. Runtime state**  
      `core/runtime-state.js` → `data/runtime-state.json` (bowl + Koj critical + queue snapshot + watchdog).  
      Load na boot (compose přes seed ctx). `kojnozout-state.json` se nemáže (`kojRef`).

- [x] **5. Watchdog / recovery**  
      `core/stream-watchdog.js` — periodická health OBS WS + ingest freshness; safe reconnect hooks; log + runtime-state.  
      Wired v `MIA_RUNTIME_LOOPS`. Default ON; vypnout `MIA_STREAM_WATCHDOG=0`. Bez aggressive kill.

- [x] **6. Replay log**  
      JSONL append na gift/chat (`core/event-log.js`).  
      `npm run replay -- <file.jsonl>` dry-run; `--apply` = normalize → enqueue → dry drain (bez OBS/TTS).

---

## Definition of done (Fáze 1)

- [ ] Live stream přežije výpadek jedné větve (gift / chat / TTS) bez totálního pádu  
- [x] Spam malých giftů se sloučí / nezahlít TTS *(když `MIA_ACTION_QUEUE=1`)*  
- [x] Po restartu procesu se načte smysluplný stav (ne „novorozeně“) *(runtime-state + koj seed)*  
- [x] Stejný JSONL jde přehrát replayem *(dry-run + `--apply` dry queue drain)*  
- [x] Preflight / `node --check` zelené po změnách  

---

## Po „go“

Verdikt roadmapy: ve Fázi 1 Queue + Watchdog + Replay log. **MIA Director** = první úkol Fáze 2.

*Fáze 1 go přijato 2026-07-20 — slice 1+2 hotové.*
