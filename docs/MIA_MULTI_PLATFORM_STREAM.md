# MIA — multi-platform stream (TikTok + Kick + Twitch)

Jeden OBS výstup → více platforem. Všechny platformy končí v **`POST /ingest`** → `normalize_event.js` → shadow pipeline.

```
TikFinity (TikTok) ──HTTP──► /ingest
Kick Pusher WS    ────────► /ingest
Twitch EventSub   ────────► /ingest
                              │
                              ▼
                    normalize → MIA → OBS
```

---

## Mapa eventů (co z každé platformy dostaneme)

| MIA `eventType` | TikTok (TikFinity) | Kick | Twitch (EventSub) |
|-----------------|-------------------|------|-------------------|
| **COMMENT** | chat message | `ChatMessageEvent` | `channel.chat.message` |
| **GIFT** | gifts, coins, diamonds | tips / kicks (webhook) | `channel.cheer`, `channel.subscribe`, `channel.subscription.gift` |
| **FOLLOW** | follow | follow (webhook) | `channel.follow` |
| **LIKE** | like burst | — | — |
| **SHARE** | share | — | raid → community moment |
| **meta** | room user, viewer | stream state | `stream.online` / `stream.offline` |

### Twitch EventSub — doporučené subscription typy (fáze 1)

| EventSub typ | Verze | → MIA | Poznámka |
|--------------|-------|-------|----------|
| `channel.chat.message` | 1 | COMMENT | vyžaduje user token + chat scope |
| `channel.follow` | 2 | FOLLOW | |
| `channel.subscribe` | 1 | GIFT | sub = support tier |
| `channel.subscription.gift` | 1 | GIFT | gift subs |
| `channel.cheer` | 1 | GIFT | bits → coins interně |
| `channel.raid` | 1 | SHARE/FOLLOW | raid incoming |
| `stream.online` | 1 | meta | stream start |
| `stream.offline` | 1 | meta | stream end |
| `channel.channel_points_custom_reward_redemption.add` | 1 | COMMENT | custom reward text |

Fáze 2 (volitelně): ban, hype train, predictions, polls.

---

## Vysílání všude najednou

MIA **nerenderuje** na platformy — to dělá OBS + restream:

| Vrstva | Nástroj | Role |
|--------|---------|------|
| **Encode** | OBS | jeden program stream |
| **Rozdělení** | [Restream.io](https://restream.io), [Owncast](https://owncast.online), nebo OBS plugin | 1 výstup → TikTok + Kick + Twitch + YouTube |
| **Chat/eventy** | MIA bridge per platforma | každá platforma → `/ingest` |
| **AI + overlay** | MIA | jedna logika pro všechny |

Doporučené další platformy:

| Platforma | Eventy | Obtížnost | Poznámka |
|-----------|--------|-----------|----------|
| **YouTube Live** | chat, super chat, members | střední | API + OAuth |
| **Facebook Gaming** | chat, stars | střední | Graph API |
| **Rumble** | omezené API | těžší | spíš webhook třetí strany |
| **Trovo** | chat WS | střední | podobné Kick |
| **DLive** | chat | střední | menší komunita |

Pro český multi-stream: **TikTok + Kick + Twitch + YouTube** stačí.

---

## Twitch — nastavení (jednou)

### 1. Twitch Developer Console

1. https://dev.twitch.tv/console/apps → **Register Your Application**
2. Name: `MIA Stream`
3. OAuth Redirect: `http://localhost:3099/twitch/callback`
4. Category: Broadcasting Suite
5. Zapiš **Client ID** a **Client Secret** do `.env`:

```env
MIA_TWITCH_ENABLED=true
TWITCH_CLIENT_ID=...
TWITCH_CLIENT_SECRET=...
TWITCH_CHANNEL_LOGIN=tvuj_login
```

### 2. Přihlášení (OAuth)

```powershell
npm run twitch:login
```

Otevře prohlížeč → přihlásíš Twitch účet → token se uloží do `secrets/local/twitch_oauth.json` (gitignore).

### 3. Spuštění bridge

```powershell
npm run restart
```

Nebo jen bridge test:

```powershell
npm run twitch:status
```

### 4. Ověření

```powershell
npm run twitch:probe
```

Pošle testovací follow/chat simulaci nebo ukáže stav WS.

---

## Konfigurace `.env`

```env
MIA_TWITCH_ENABLED=true
MIA_TWITCH_MODE=eventsub_ws
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
TWITCH_CHANNEL_LOGIN=
TWITCH_BROADCASTER_ID=
TWITCH_ACCESS_TOKEN=
TWITCH_REFRESH_TOKEN=
```

Tokeny z `npm run twitch:login` se doplní automaticky.

---

## Layout streamu

| Platforma | Divák | OBS canvas |
|-----------|-------|------------|
| TikTok | portrait 9:16 | `npm run obs:portrait` |
| Kick / Twitch | landscape 16:9 | `npm run obs:landscape` |
| **Multi** | Restream | jeden canvas dle primární platformy; overlaye MIA univerzální |

`MIA_STREAM_PLATFORM=tiktok|kick|both` — profil overlay pozic v `MIA_OBS_VISION.js`.

---

## Soubory v repu

| Soubor | Role |
|--------|------|
| `scripts/MIA_TWITCH_BRIDGE.js` | EventSub WS → `/ingest` |
| `scripts/twitch_oauth_login.js` | OAuth přihlášení |
| `scripts/twitch_eventsub_probe.js` | diagnostika |
| `shared/platform_normalizers/normalize_event.js` | `platform: twitch` |
| `scripts/MIA_KICK_BRIDGE.js` | reference Kick |
| TikFinity → `/ingest` | TikTok (existuje) |

---

## Kánon

- TikFinity → MIA `/ingest` (ne rozhodovat na TikFinity)
- MIA neukazuje coins na overlayi — jen **MIA body**
- Streamer.bot se **nepoužívá**
