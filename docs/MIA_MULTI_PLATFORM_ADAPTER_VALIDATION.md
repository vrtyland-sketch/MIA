# Multi-Platform Adapter Validation (Twitch + YouTube)

**Cíl:** Připojit Twitch + YouTube **chat-only** bez zásahu do Stream Core economy / gift video / Genesis / overlayů.  
**Režim:** 48h rezervní okno před Public Activation — Varianta B (distribuce, ne nové funkce).

```text
Stream Core: FROZEN (žádná změna gift/video/economy)
Genesis: beze změny
Adapters: Twitch chat-only + YouTube Live chat poll
Monetizace (bits/subs/Super Chat): OFF / skipped
```

---

## Co bylo přidáno (adapter-only)

| Položka | Soubor | Poznámka |
|---------|--------|----------|
| Twitch chat-only (default) | `scripts/MIA_TWITCH_BRIDGE.js` | `MIA_TWITCH_CHAT_ONLY` default **true** — bez cheer/sub → gift |
| Twitch config | `scripts/MIA_CONFIG.js` | `twitch.chatOnly` |
| YouTube bridge | `scripts/MIA_YOUTUBE_BRIDGE.js` | poll Live Chat; Super Chat skip |
| YouTube config | `scripts/MIA_CONFIG.js` | `youtube.*` env |
| Bootstrap | `scripts/MIA_PLATFORM_BRIDGES.js` | start YouTube bez změny `index.js` |
| Platform tag | `shared/platform_normalizers/normalize_event.js` | `detectPlatform` → `youtube` |

**Nezměněno:** `index.js` gift/video queues, economy, Genesis overlaye, OBS dual-scene.

---

## Env (operátor)

### Twitch

```text
MIA_TWITCH_ENABLED=1
MIA_TWITCH_CHAT_ONLY=1
TWITCH_CLIENT_ID=...
TWITCH_ACCESS_TOKEN=...
TWITCH_CHANNEL_LOGIN=...   # nebo TWITCH_BROADCASTER_ID=
```

OAuth: stávající `scripts/twitch_oauth_login.js` (pokud používáte).

### YouTube

```text
MIA_YOUTUBE_ENABLED=1
YOUTUBE_API_KEY=...
YOUTUBE_LIVE_CHAT_ID=...   # nebo YOUTUBE_VIDEO_ID= (resolve activeLiveChatId)
# MIA_YOUTUBE_POLL_MS=4000
```

---

## Validační checklist (souběh 4 platforem)

| # | Test | Result | Evidence |
|---|------|--------|----------|
| 1 | TikTok chat/gift stále OK (regrese) | ☐ PASS · ☐ FAIL · ☐ SKIP | |
| 2 | Kick chat stále OK | ☑ **PASS** (2026-07-31 live `kickAhoj mia pust live test`) · ☐ FAIL · ☐ SKIP | kick-events log |
| 3 | Twitch chat dorazí s `platform=twitch` | ☑ **PASS** (2026-07-31 live `mia twitch live test`) · ☐ FAIL · ☐ BLOCKED | twitch-events log |
| 4 | Twitch bits/sub **ne** spouští gift video (chat-only) | ☑ PASS (chat-only subs) · ☐ FAIL · ☐ SKIP | health subscriptions |
| 5 | YouTube chat dorazí s `platform=youtube` | ☐ PASS · ☐ FAIL · ☐ BLOCKED | |
| 6 | YouTube Super Chat se **ne** mapuje na gift | ☐ PASS · ☐ FAIL · ☐ SKIP | |
| 7 | Souběh TikTok+Kick+Twitch+YouTube 15+ min bez crash | ☐ PASS · ☐ FAIL · ☐ BLOCKED | |
| 8 | Genesis scéna / Core Isolation beze změny | ☐ PASS · ☐ FAIL | |

### Celkový verdikt

```text
☐ PASS — 4 platformy chat-ready → lze jít na veřejný Genesis se 4 vstupy
☐ FAIL — opravit adaptér; Core neměnit
☐ BLOCKED — chybí credentials / live chat id

TWITCH: LIVE READY (2026-07-31) — viz MIA_TWITCH_LIVE_READY.md
KICK: CLOSED · LIVE READY (2026-07-31) — viz MIA_KICK_LIVE_READY.md
  (text distortion = Kick chat input, mimo MIA)
fourWayReady: false — zbývá YouTube
```


### Twitch evidence (closed)

| Položka | Hodnota |
|---------|---------|
| EventSub | `channel.chat.message` OK |
| platform | `twitch` |
| user / channel | `vasaspinak` |
| sample message | `mia twitch live test` |
| messageId | `e0f69d97-ceb0-4cb7-8d8d-a4650bd6158e` |
| eventId | `twitch_comment_e0f69d97-ceb0-4cb7-8d8d-a4650bd6158e` |
| normalize + translation | OK |
| secret leak | none |

---

## Poznámka k procesu

Multi-Ingest jako **Level 2** po Stream Core Lock zůstává strategicky platný.  
Tento krok = **chat/distribution adapters only** v 48h rezervě, ne odemčení gift engine per platform.

Integration Layer (kontrakt, readiness, operator checklist):  
→ [MIA_MULTI_PLATFORM_INTEGRATION_LAYER.md](./MIA_MULTI_PLATFORM_INTEGRATION_LAYER.md)  
→ [MIA_MULTI_PLATFORM_OPERATOR_CHECKLIST.md](./MIA_MULTI_PLATFORM_OPERATOR_CHECKLIST.md)

```powershell
npm run platform:status
npm run platform:test
```

Po vyplnění checklistu → pokračovat Gate (OBS Dual-Scene → First 60s …).
