# YouTube Live Status — PARTIAL / smoke FAILED

**Verdikt:** **YOUTUBE PARTIAL** · smoke 2026-08-01 ~19:40  
**Credentials / adapter env:** READY (`YOUTUBE_API_KEY` + `YOUTUBE_VIDEO_ID` + `YOUTUBE_LIVE_CHAT_ID`)  
**fourWayReady (credentials layer):** `true`  
**Live chat smoke:** **FAILED**

## Proč smoke neprošel

| Check | Result |
|-------|--------|
| OBS vysílá | **NE** (`outputActive: false`, `broadcast_id: null`) |
| YouTube Data API poll | **403 quota exceeded** |
| Zpráva `MIA YOUTUBE LIVE TEST` v logu | **ne** (watcher timeout / aborted) |

## Co udělat

1. Počkat na reset YouTube API quota (typicky denní limit GCP projektu), **nebo** zvýšit quota / nový projekt.
2. OBS → **Start Streaming** (běžící čas + kb/s).
3. Do live chatu poslat `MIA YOUTUBE LIVE TEST` při běžícím watcheru.

TikTok / Kick / Twitch **neměnit**. Nic necommituj bez souhlasu.
