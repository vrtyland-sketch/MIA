# Etapa 2 — Executive Summary

> **Status:** Etapa 2 HOTOVO, čeká Etapa 3  
> **Datum:** 2026-07-27  
> **Output:** `docs/MIA_AUDIT_ETAPA_2/`

---

## Co bylo zmapováno

Architektonická mapa toku dat MIA od platformy po OBS overlay a TTS, ověřená proti live kódu (`index.js`, `routes/`, `scripts/pipeline/`, `MIA_NEXT/`, `shared/`).

### Potvrzené hlavní pipeline

1. **TikFinity ingest:** `POST /ingest` → queue (fastAck) → `normalize_event.js` → 8-fázový pipeline → shadow runtime → overlay + video + TTS.

2. **Kick chat:** Pusher WS → `MIA_KICK_BRIDGE` → `processEvent` přímo (mimo HTTP ingest guard) → stejný pipeline.

3. **Rozhodování:** produkčně běží **`MIA_NEXT/engine_shadow_runtime.js`** (default runtime mode MIA_NEXT), ne `engine2/`.

4. **Výstup:** `MIA_DELIVERY_RUNTIME` → in-memory `overlayState` → OBS browser poll `/overlay-state` + `MIA_VIDEO_ENGINE` pro tier videa + Edge TTS.

5. **Koj/bowl:** gift impact → `KOJNOZROUT_BOWL_ENGINE` → persist `data/kojnozout-state.json` → client runtime v `mia-output-overlay/lib/koj-runtime-*`.

6. **Economy:** coins mapovány interně, overlay expose **jen miaPoints** (`MIA_OVERLAY_PUBLIC_RESPONSE.js`).

### Default OFF (volitelné)

- Action Queue (`MIA_ACTION_QUEUE`)
- Engine2 stub (`MIA_ENGINE2_STUB`)
- Dual voice (`MIA_DUAL_VOICE`)
- Theme manager, tech forms, user mode, Twitch, Telegram

---

## Dokumentace v této složce

| Soubor | Obsah |
|--------|-------|
| [00_ARCHITECTURE_MAP.md](./00_ARCHITECTURE_MAP.md) | Master mapa + diagramy + reality check |
| [01_FLOW_INGEST_CHAT.md](./01_FLOW_INGEST_CHAT.md) | TikFinity + Kick chat |
| [02_FLOW_GIFTS.md](./02_FLOW_GIFTS.md) | Gifts → economy → video → overlay |
| [03_FLOW_MIA_BODY_SPEECH.md](./03_FLOW_MIA_BODY_SPEECH.md) | MIA speech/body/holo + TTS |
| [04_FLOW_KOJ_BOWL.md](./04_FLOW_KOJ_BOWL.md) | Kojnožrout + miska |
| [05_FLOW_BATTLE_ECONOMY.md](./05_FLOW_BATTLE_ECONOMY.md) | Arena + body |
| [06_FLOW_EDITOR_GRAPHICS.md](./06_FLOW_EDITOR_GRAPHICS.md) | Paint/rig studio (mimo core) |
| [07_STATE_AND_FLAGS.md](./07_STATE_AND_FLAGS.md) | Stav + flags + defaults |

---

## Největší OBSERVED slabá místa

1. **Monolitický `index.js` (~4461 ř.)** — centrální hub pro wiring, state a lazy runtime init.

2. **`safeRequire` fallbacky** — chybějící modul = tichý no-op; obtížná diagnostika.

3. **Dva ingest ingressy (HTTP vs Kick bridge)** — rozdílná auth/queue ochrana, stejný `processEvent`.

4. **Pojmenování Engine2 vs MIA NEXT** — produkční decision path je shadow runtime, ne `engine2/`.

5. **Dvojí normalizační kontrakt** — legacy `normalized` + `miaRuntimeEvent` v enrich fázi.

6. **TTS/overlay/video timing** — defer logika, dual voice, voice queue — křehká synchronizace.

---

## NEOVĚŘENO (přeneseno do Etapy 3)

- Dynamické `safeRequire` větve za specifickými env kombinacemi
- Live wiring `shared/mia-economy-core` vs `MIA_GIFT_ECONOMY.js`
- Twitch/Telegram produkční path
- Kompletní command handler mapa v chat pipeline

---

## Etapa 2 HOTOVO, čeká Etapa 3

Další fáze auditu může navázat: hloubková verifikace NEOVĚŘENO položek, capability matrix vs kánon, nebo targeted runtime trace testy.

**Žádné změny kódu nebyly provedeny.** Dokumentace pouze na disku v `docs/MIA_AUDIT_ETAPA_2/`.
