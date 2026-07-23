# MIA Phase 1 — Progress



**Datum:** 2026-07-20  

**Stav:** Phase 1 stability slice 2 shipped (bez commit)  

**Checklist:** [`MIA_PHASE1_STABILITY.md`](./MIA_PHASE1_STABILITY.md)



## Co přibylo



| Modul | Cesta |

|-------|--------|

| Event normalizer | `core/event-normalizer.js` |

| Action Queue + runner | `core/action-queue.js` |

| Stream watchdog | `core/stream-watchdog.js` |

| Runtime state | `core/runtime-state.js` → `data/runtime-state.json` |

| Event log (replay) | `core/event-log.js` → `logs/mia-runtime-events-YYYY-MM-DD.jsonl` |

| Skeleton | `ingest/`, `output/`, `config/runtime.json`, `core/index.js` |

| Replay | `scripts/mia_replay.js` (`npm run replay -- <file.jsonl> [--apply]`) |



## Wiring (minimální, bez big-bang)



1. **Gift / chat ingest** (`scripts/pipeline/phase_enrich.js`)  

   Po enrich připojí `normalized.miaRuntimeEvent` (jednotný tvar) a appendne JSONL log.

2. **TTS thank-you path** (`scripts/MIA_DELIVERY_RUNTIME.js` → `enqueueVoiceSpeak`)  

   Když je Action Queue zapnutá: enqueue → coalesce → **single runner** drain (speak + optional overlay). Default OFF.

3. **Boot** (`scripts/MIA_RUNTIME_STATE_SEED_CTX.js`)  

   Načte `runtime-state.json` a **složí** critical bowl/Koj do seedu — `kojnozout-state.json` se nemáže.

4. **Watchdog** (`scripts/MIA_RUNTIME_LOOPS.js`)  

   Light health OBS WS + ingest freshness; safe `ensureObsConnected` / `forceReconnectObs` (cooldown); stav do `runtime-state.watchdog`. Bez kill procesů.



## Jak zapnout



```bash

# Action Queue (default OFF)

set MIA_ACTION_QUEUE=1



# Watchdog (default ON po startu loops; vypnout:)

set MIA_STREAM_WATCHDOG=0



# Replay

npm run replay -- logs/mia-runtime-events-YYYY-MM-DD.jsonl

npm run replay -- logs/mia-runtime-events-YYYY-MM-DD.jsonl --apply

```



`--apply` = guarded dry drain přes Action Queue (žádný OBS / TikTok / live TTS).



Plné routování všech akcí: `MIA_ACTION_QUEUE_FULL=1` (flag; Director = Phase 2).



## Testy



```bash

npm run test:phase1

node --check index.js

npm run test:preflight:fast

```



## Co dál (Phase 2 — Director)

- [x] **MIA Director** — viz [`MIA_PHASE2_PROGRESS.md`](./MIA_PHASE2_PROGRESS.md)
- [ ] Další extrakce z `index.js` do `ingest/` / `output/` (inkrementálně)
- [ ] Live-branch resilience DoD (výpadek gift/chat/TTS bez totálního pádu) — měřit na streamu

