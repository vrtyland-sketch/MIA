# Twitch Live Status — CLOSED READY

**Verdikt:** **TWITCH LIVE READY** · uzavřeno 2026-07-31  
**fourWayReady:** `false` (čeká YouTube)  
**Freeze:** Twitch adapter / OAuth **neměnit** bez nové chyby.

```text
TikTok   …… ready / provoz
Kick     …… CLOSED · LIVE READY ✅
Twitch   …… LIVE READY ✅
YouTube  …… disabled / pending
```


---

## Evidence (live)

| Check | Result |
|-------|--------|
| EventSub `channel.chat.message` | OK (subscription enabled) |
| `platform` | `twitch` |
| user | `vasaspinak` (`1517414114`) |
| channel | `vasaspinak` |
| message (sample) | `mia twitch live test` |
| messageId | `e0f69d97-ceb0-4cb7-8d8d-a4650bd6158e` |
| eventId | `twitch_comment_e0f69d97-ceb0-4cb7-8d8d-a4650bd6158e` |
| normalize → MIA | OK (`COMMENT`, route `community`) |
| translation meta | OK (`MIA živý test twitch`) |
| overlay/speech COMMENT | fallback only (`EXECUTION_BRIDGE_NO_WORK`) — očekávané u chat-only |
| secret leak in logs | **none** |
| monetizace bits/sub → gift | OFF (`MIA_TWITCH_CHAT_ONLY=1`) |

**Log:** `logs/twitch-events-2026-07-31.jsonl`  
**Health:** `GET /health` → `twitchBridge.connected=true`, subs chat/follow/online/offline OK

---

## Operátor (hotovo)

- [x] App `MIA-Spinak-Stream` + Redirect `http://localhost:3099/twitch/callback`
- [x] OAuth scopes (`user:read:chat` …) — bez neplatného `channel:read:chat`
- [x] Token v `secrets/local/twitch_oauth.json` + `.env`
- [x] Live EventSub chat ověřen

---

## Next platform recommendation

**YouTube** — API key + live chat ID, chat-only poll (`MIA_YOUTUBE_BRIDGE`).  
Kick je uzavřené: [MIA_KICK_LIVE_READY.md](./MIA_KICK_LIVE_READY.md).

Pak: `npm run platform:status` → cíl `fourWayReady: true` → veřejný Genesis se 4 vstupy.
