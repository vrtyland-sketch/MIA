# MIA Full Audit — 2026-08-04

**Verdikt:** Není four-way live ready. **Kick OK.** Twitch token mrtvý. YouTube OBS stream key poškozený. `platform:status` over-reports READY.

Canvas: `canvases/mia-full-audit.canvas.tsx`

## Runtime snapshot

| Komponenta | Stav |
|------------|------|
| MIA `/health` | OK · `obsConnected: true` |
| Kick bridge | **connected** · lastIngest Kick COMMENT |
| Twitch EventSub | **401 Invalid OAuth token** (všechny suby) |
| YouTube env | key + videoId + liveChatId přítomné |
| YouTube live | video „MIA LIVE TEST“ **není live** · chat „no longer live“ |
| OBS stream | **OFF** · service YouTube-RTMPS · **keyLen=146** (invalid) · `broadcast_id=null` |
| OBS YT OAuth | User is not signed / Failed to get Auth |
| `fourWayReady` (status) | true ← **falešné** (jen env) |

## P0 opravy

1. **OBS:** smazat stream key → vložit krátký key z YouTube Studio (Váša Špíňák) → Start Streaming  
2. **Twitch:** `npm run twitch:login` → restart MIA  
3. **YouTube:** až stream běží, live chat smoke `MIA YOUTUBE LIVE TEST`

Bez commit / bez změny TikTok·Kick adapterů.
