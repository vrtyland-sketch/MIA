# Kick Live Status — KICK CLOSED · LIVE READY

**Verdikt:** **KICK CLOSED · LIVE READY** · uzavřeno 2026-07-31  
**fourWayReady:** `false` (čeká YouTube)  
**Freeze:** Kick bridge / chatroom / adapter **neměnit** bez nové chyby. Twitch zůstává CLOSED READY.

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
| Kick WS connected | OK (`chatroomId` `95746130`) |
| `platform` | `kick` |
| user | `VasaSpinak` (`97249941`) |
| channel / chatroom | `chatrooms.95746130.v2` / `95746130` |
| live event → MIA | OK (více zpráv, poslední 20:02) |
| messageId | OK (např. `f6a18ac8-b76c-4ece-a621-30abe746e979`) |
| eventId | `kick_comment_<messageId>` |
| normalize → MIA | OK (`COMMENT`, route `community`) |
| `/ingest` | `200` handled |
| secret leak in logs | **none** |

**Samples:**
- `kickAhoj mia pust live test` (`040fc1ef-…`)
- `ahoj mia` (`73819f7c-…`)
- `est 3žij tMia` (`f6a18ac8-…`) — text už poškozený ve vstupu Kick chatu

**Log:** `logs/kick-events-2026-07-31.jsonl`  
**Health:** `GET /health` → `kickBridge.connected=true`  
**Status:** `npm run platform:status` → Kick `ready`

### Text distortion (mimo MIA)

Převrácený / poškozený text vzniká **už při psaní v Kick chatu / prohlížeči**.  
MIA bridge + `normalize_event` jen správně převezmou payload od Kicku — **není to chyba MIA, adapteru ani normalizace**.

---

## Operátor (hotovo)

- [x] `MIA_KICK_ENABLED=1`
- [x] Bridge connected + chatroom `95746130`
- [x] Live chat smoke ověřen (3 zprávy)
- [x] Uzavřeno: **KICK CLOSED · LIVE READY**

---

## Next platform

**YouTube** — API key + live chat ID, chat-only poll (`MIA_YOUTUBE_BRIDGE`).  
Kick + Twitch adapter **neměnit**.

Pak: `npm run platform:status` → cíl `fourWayReady: true`.
