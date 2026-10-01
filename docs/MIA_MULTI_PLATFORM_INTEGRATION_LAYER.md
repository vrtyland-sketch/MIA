# Multi-Platform Integration Layer

**Cíl:** Jednotná vrstva nad TikTok / Kick / Twitch / YouTube (adaptéry), aby MIA po jednorázovém přihlášení operátora obsluhovala všechny platformy z jednoho místa.  
**Hranice:** **Stream Core FROZEN** · Genesis beze změny · chat-only u Twitch/YouTube (monetizace OFF).

```text
External platforms
      ↓
PlatformAdapter (bridge)  ← OAuth / API key / TikFinity / Pusher
      ↓
POST /ingest
      ↓
normalize_event.js  →  processEvent  →  MIA / OBS
```

---

## 1. Oficiální API (stručný průzkum)

| Platforma | Oficiální vstup | Co MIA používá teď | Auth |
|-----------|-----------------|--------------------|------|
| **TikTok** | TikTok Open API omezené pro live chat | **TikFinity → HTTP /ingest** | TikFinity účet |
| **Kick** | Chat přes Pusher-like WS; tips webhook | `MIA_KICK_BRIDGE` | channel / chatroom |
| **Twitch** | Helix + EventSub | `MIA_TWITCH_BRIDGE` (EventSub WS) | OAuth (`npm run twitch:login`) · **LIVE READY 2026-07-31** |
| **YouTube** | Data API v3 `liveChatMessages` | `MIA_YOUTUBE_BRIDGE` (poll) | API key (+ liveChatId) |

---

## 2. PlatformAdapter kontrakt

Implementace: `shared/platform_integration/`

Povinné metody (canon 0021 + runtime facade):

```text
initialize()
validate(input)
start(options)
getStatus()
getSnapshot()
shutdown()
```

Legacy bridge (`start`/`stop`) se obalí přes `wrapLegacyBridge()` — **bez přepisu Stream Core**.

Stavy: `CREATED → INITIALIZING → READY → RUNNING → DEGRADED|FAILED → STOPPING → STOPPED`.

---

## 3. OAuth / token management

| Platforma | Skript / postup | Úložiště |
|-----------|-----------------|----------|
| Twitch | `npm run twitch:login` | `secrets/local/twitch_oauth.json` + `.env` |
| YouTube | API key v Google Cloud (operátor) | `.env` (`YOUTUBE_API_KEY`); volitelně `youtube_oauth.json` |
| Kick | channel env | `.env` |
| TikTok | TikFinity | externí |

API: `shared/platform_integration/tokenStore.js` — load/save/status s maskováním tokenů.

---

## 4. Normalizace událostí

Společný formát přes stávající `shared/platform_normalizers/normalize_event.js` + kinds v `eventKinds.js`:

| Kind | MIA `eventType` | Chat-only freeze |
|------|-----------------|------------------|
| chat | COMMENT | ✅ |
| follow | FOLLOW | ✅ |
| like | LIKE | ✅ |
| share | SHARE | ✅ |
| gift / subscribe | GIFT | ❌ default OFF (Twitch/YT) |

---

## 5. Reconnect · logování · test mode

| Funkce | Kde |
|--------|-----|
| Twitch reconnect | `session_reconnect` + timer v bridge |
| Kick reconnect | WS timer v `MIA_KICK_BRIDGE` |
| YouTube | poll loop |
| Status agregace | `npm run platform:status` |
| Test harness | `npm run platform:test` / `platform:test:post` |

---

## 6. Operátor checklist

→ [MIA_MULTI_PLATFORM_OPERATOR_CHECKLIST.md](./MIA_MULTI_PLATFORM_OPERATOR_CHECKLIST.md)  
→ Live validace: [MIA_MULTI_PLATFORM_ADAPTER_VALIDATION.md](./MIA_MULTI_PLATFORM_ADAPTER_VALIDATION.md)

---

## Zakázáno v této vrstvě

- Zásah do gift economy / video front / overlayů / Genesis workflow  
- Zapnutí bits/subs/Super Chat bez explicitního Core unlock  
- Business logika v overlay HTML  

---

## Soubory

```text
shared/platform_integration/
  adapterContract.js
  adapterStates.js
  eventKinds.js
  registry.js
  readiness.js
  tokenStore.js
  testHarness.js
  index.js
scripts/mia_platform_status.js
scripts/mia_platform_test_inject.js
tests/platform_integration_layer_contract.js
```
