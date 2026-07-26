# MIA — Ingest path audit

**Datum:** 2026-07-26 (follow-up po Kick fix `ca80eae7`)  
**Scope:** RC freeze — opravy broken paths + regression hardening

---

## Path matrix

| Path | Status | Ingress | Handler | Reply (TTS/overlay) | Notes |
|------|--------|---------|---------|---------------------|-------|
| TikFinity gifts | **ON** | HTTP `POST /ingest` | normalizer ? pipeline ? shadow | support overlay + video | Primary live platform |
| TikFinity chat | **ON** | HTTP `POST /ingest` | same | community / direct chat | TikFinity pushes to MIA port |
| TikFinity likes/follow/share | **ON** | HTTP `POST /ingest` | T0 + community lane | community ack | Contract tests green |
| **Kick chat** | **ON** (fixed wiring) | Pusher WS ? `MIA_KICK_BRIDGE` ? `kickOnEvent` ? `processEvent` | same as TikTok chat | MIA/Koj overlay + TTS | Requires `MIA_KICK_ENABLED=1` (default), verify `/health.kickBridge.connected` live |
| Kick webhook | **ON** (optional) | `POST /kick/webhook` | forward ? `kickOnEvent` or `/ingest` | same | `MIA_KICK_MODE=webhook` |
| Admin/debug simulate | **ON** | `routes/debug.js` | `processEvent` | full pipeline | `MIA_DEBUG_ROUTES=on` |
| Twitch | **OFF** | `MIA_TWITCH_ENABLED=0` default | bridge stub | — | Enable explicitly; `/health.twitchBridge` when on |
| Telegram | **OFF/stub** | `MIA_TELEGRAM_ENABLED=0` default | direct chat engine | text reply only | User mode; status in `/diagnose` only |

---

## Kick chat — end-to-end trace

```
Kick Pusher WS (chatrooms.{id}.v2)
  ? MIA_KICK_BRIDGE.handleKickChatEvent
  ? buildRealtimeIngestPayload (platform=kick, type=comment)
  ? MIA_PLATFORM_BRIDGES.kickOnEvent
  ? processEvent (event pipeline)
  ? normalizeEvent ? COMMENT / community
  ? shadow pipeline ? action_builder ? overlay + TTS
  ? OBS speech overlay
```

**Config (`.env`):**

- `MIA_KICK_ENABLED=1` — default ON; set `0` to disable (bridge logs warning, no WS)
- `KICK_CHANNEL=vasaspinak` — resolves `chatroomId` at startup via Kick API
- `MIA_KICK_CHATROOM_ID=` — optional explicit override
- `GET /health` ? `kickBridge.connected: true` when live

**Verify manually:**

1. `npm start` (or `node index.js`)
2. Console: `[KICK_BRIDGE] Realtime bridge starting`
3. `curl http://127.0.0.1:3000/health` ? `kickBridge.connected: true`
4. Write in Kick chat (live): MIA should overlay/TTS within ~1–2 s
5. Or inject: `curl -X POST http://127.0.0.1:3000/ingest -H "Content-Type: application/json" -d "{\"platform\":\"kick\",\"type\":\"comment\",\"content\":\"MIA ahoj\",\"username\":\"test\"}"`

---

## Fixes in this audit

### 2026-07-25 (`ca80eae7`)

1. **`startKickBridge` respects `kick.enabled`** — logs loud warning when disabled
2. **`KICK_CHANNEL` env** — maps to slug resolution (was documented but ignored)
3. **Webhook bridge API** — fixed `createKickWebhookBridge({ app, onEvent })` signature; in-process `onEvent` bypasses HTTP loopback
4. **Extra Pusher event alias** — `chat.message.sent`
5. **Contract test** — `tests/kick_chat_reply_contract.js` (normalizer + shadow + bridge)

### 2026-07-26 (regression hardening)

6. **`isKickBridgeEnabledFromEnv()`** — canonical gate; OBS layout + gift video layout no longer use stale `MIA_KICK_BRIDGE_ENABLED`-only check (Kick default ON in config but layout assumed TikTok)
7. **`tests/env_wiring_contract.js`** — `.env.example` Kick/Telegram keys must map to `buildRuntimeConfig`
8. **Gap analysis doc** — [`MIA_REGRESSION_GAP_ANALYSIS_2026-07-26.md`](./MIA_REGRESSION_GAP_ANALYSIS_2026-07-26.md)

---

## OPEN (non-critical)

| Item | Severity | Notes |
|------|----------|-------|
| Twitch env section missing in `.env.example` | LOW | Bridge exists; default OFF |
| `telegramBridge` not on `/health` | LOW | Available on `/diagnose` |
| No mock-Pusher integration test | LOW | Backlog — would catch WS path without live Kick |

---

## Tests

| Command | Expected |
|---------|----------|
| `node --check index.js` | PASS |
| `npm run test:preflight:fast` | PASS (includes `kick_chat_reply`, `env_wiring`) |
| `node tests/kick_chat_reply_contract.js` | 5 tests PASS |
| `node tests/env_wiring_contract.js` | PASS |

