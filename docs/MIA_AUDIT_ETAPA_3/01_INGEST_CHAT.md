# Etapa 3 — Ingest + Chat

**Datum:** 2026-07-27  
**Oblast:** ingest, chat, platform bridges, normalizace

---

## 1. TikFinity HTTP ingest

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Přijímá TikFinity webhook na `POST /ingest` (a `GET` ping); fastAck 200; zařadí do lane queue; spustí `processEvent` → 8-fázový pipeline |
| **Co neumí** | Bez TikFinity push na port MIA nic nepřijde; bez `MIA_INGEST_SECRET` není auth (volitelné) |
| **Vstup** | HTTP JSON: comment, like, follow, share, gift |
| **Výstup** | Normalizovaný event → shadow runtime → overlay/TTS/video |
| **Testy** | `ingest_contract`, `ingest_http_wiring`, `ingest_http_ctx`, `ingest_utils_runtime`, `shadow_pipeline`, `event_pipeline` |
| **NEOVĚŘENO** | Live TikFinity → MIA latence pod zátěží; chování při duplicate webhook burst |

---

## 2. Ingest queue + lane routing

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Rozdělení `support` vs `community` lane; paralelní community; dedupe guard |
| **Co neumí** | Kick bridge obchází HTTP queue (jiná ochrana) |
| **Vstup** | Raw payload + `resolveIngestLane` |
| **Výstup** | Serializované volání `processEvent` per lane |
| **Testy** | `ingest_deduper_ctx`, `ingest_utils_ctx`, `pipeline_summary_runtime` |
| **NEOVĚŘENO** | — |

---

## 3. Event normalizer (F1)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `normalizeEvent(raw)` — platforma, typ, route, miaRuntimeEvent shape; coins→miaPoints |
| **Co neumí** | Finální gift tier neurčuje (deleguje support resolveru) |
| **Vstup** | Raw platform payload |
| **Výstup** | `{ normalized, miaRuntimeEvent }` |
| **Testy** | `phase1_event_normalizer`, `kick_chat_reply` (normalizer větev) |
| **NEOVĚŘENO** | — |

---

## 4. Kick chat bridge (default ON)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Pusher WS → `buildRealtimeIngestPayload` → `kickOnEvent` → `processEvent` (mimo HTTP guard); webhook alternativa |
| **Co neumí** | Vyžaduje live Kick chatroom + správný `KICK_CHANNEL` / `MIA_KICK_CHATROOM_ID` |
| **Vstup** | Kick Pusher event `chat.message.sent` / aliasy |
| **Výstup** | Stejný pipeline jako TikTok chat → MIA/Koj overlay + TTS |
| **Testy** | `kick_chat_reply`, `platform_bridges`, `env_wiring` |
| **NEOVĚŘENO** | Mock-Pusher integrační test neexistuje; live `kickBridge.connected` v této etapě neběželo |

**Config:** `MIA_KICK_ENABLED=1` (default), `MIA_KICK_MODE=realtime|webhook`

---

## 5. Twitch bridge

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Co umí** | EventSub bridge modul; skripty `twitch:login/probe/status`; `/health.twitchBridge` když ON |
| **Co neumí** | Default OFF (`MIA_TWITCH_ENABLED=0`); není stream core; `.env.example` sekce chybí (LOW backlog) |
| **Vstup** | Twitch EventSub (po explicitním enable) |
| **Výstup** | Normalizovaný event → pipeline (teoreticky stejný) |
| **Testy** | `platform_bridges` (částečně) |
| **NEOVĚŘENO** | Produkční Twitch stream path |

---

## 6. Telegram bridge

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Co umí** | User mode direct chat; status na `/diagnose` |
| **Co neumí** | Default OFF; text reply only; ne na `/health` |
| **Vstup** | Telegram user messages |
| **Výstup** | Text odpověď (ne full OBS stack) |
| **Testy** | Contract v platform bridges; `env_wiring` |
| **NEOVĚŘENO** | Live Telegram produkční session |

---

## 7. Debug / simulate ingest

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `MIA_DEBUG_ROUTES=on` → simulate comment/gift přes `routes/debug.js` |
| **Co neumí** | V produkci musí být OFF |
| **Vstup** | Admin/debug HTTP |
| **Výstup** | Plný pipeline jako live |
| **Testy** | `debug_routes_runtime`, `debug_routes_ctx` |
| **NEOVĚŘENO** | — |

---

## 8. Direct chat intelligence

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | COMMENT event → shadow runtime → MIA direct reply; LLM hybrid; session memory kontext |
| **Co neumí** | Kompletní command handler mapa — Etapa 2 NEOVĚŘENO |
| **Vstup** | Normalizovaný COMMENT |
| **Výstup** | `actionResult` s overlay text + voice plan |
| **Testy** | `shadow_pipeline`, `runtime_smoke`, `interpreter_ctx`, `action_builder_runtime` |
| **NEOVĚŘENO** | Live chat spam / moderation edge cases |

---

## 9. Community ack (like/follow/share)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | T0 engagement + community lane ack |
| **Co neumí** | `MIA_T0_OVERLAY` default OFF — overlay T0 volitelný |
| **Vstup** | LIKE, FOLLOW, SHARE events |
| **Výstup** | Community overlay ack (lehčí než direct chat) |
| **Testy** | `ingest_contract`, `event_pipeline` |
| **NEOVĚŘENO** | — |

---

## 10. Session memory + chat lexicon

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Persist session kontext; lexicon enrich z `data/mia-chat-lexicon.json` |
| **Co neumí** | — |
| **Vstup** | Chat history, viewer id |
| **Výstup** | Kontext pro LLM / director |
| **Testy** | `runtime_smoke`, wiring contracts |
| **NEOVĚŘENO** | Dlouhá session bez restartu — memory growth |

---

## 11. Remote dev

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Co umí** | Tailscale skripty + contract testy pro vzdálený dev |
| **Co neumí** | Není součást standardního stream deploy |
| **Vstup** | Remote tunnel config |
| **Výstup** | Dev access k MIA API |
| **Testy** | `remote_dev` |
| **NEOVĚŘENO** | Produkční remote dev nasazení |

---

## Shrnutí oblasti

| ✅ | ⚠ | ❌ |
|----|----|-----|
| 7 | 4 | 0 |

**Stream-ready:** TikFinity + Kick chat jsou produkční jádro. Twitch/Telegram/remote dev = volitelné mosty.

*Etapa 3 — docs only.*
