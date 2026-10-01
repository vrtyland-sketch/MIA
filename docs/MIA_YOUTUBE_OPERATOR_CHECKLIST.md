# YouTube — ruční checklist operátora (aktuální implementace)

**Verdikt teď:** **YOUTUBE BLOCKED** — chybí `YOUTUBE_API_KEY` + aktivní `YOUTUBE_LIVE_CHAT_ID` / `YOUTUBE_VIDEO_ID`  
**fourWayReady:** `false` (správně)  
**Auth v kódu:** **pouze API key** (`authModes: ["api_key"]`). OAuth / `youtube_oauth.json` **nepoužívat** — bridge ho nečte.

```text
TikTok ✅  Kick ✅  Twitch ✅  YouTube ⏳ BLOCKED
```

Adapter **neměnit**. Hodnoty jen do lokálního `.env` (je v `.gitignore`).

---

## A) Google Cloud projekt

1. Otevři [Google Cloud Console](https://console.cloud.google.com/)
2. Vytvoř nový projekt **nebo** vyber existující (např. `MIA-Spinak`)
3. Zapamatuj si název projektu (API key bude vázaný na něj)

---

## B) YouTube Data API v3

1. **APIs & Services → Library**
2. Najdi **YouTube Data API v3** → **Enable**
3. Počkej, až je stav *Enabled*

---

## C) API key (povinné — tohle MIA používá)

1. **APIs & Services → Credentials → Create credentials → API key**
2. (Doporučeno) **Edit API key**:
   - Application restrictions: dle potřeby (pro lokální MIA často *None* / IP, pokud máš pevnou IP)
   - API restrictions: **Restrict key** → jen **YouTube Data API v3**
3. Zkopíruj klíč (ukáže se jednou / ulož bezpečně)

**Nepotřebuješ:** OAuth client, refresh token, `youtube_oauth.json` — současný `MIA_YOUTUBE_BRIDGE` volá `liveChat/messages` s `key=`.

---

## D) Live stream musí existovat

Bez **živého** (nebo alespoň naplánovaného se chatem) streamu často **není** `activeLiveChatId`.

1. V [YouTube Studio](https://studio.youtube.com/) vytvoř / spusť **Live**
2. Z URL streamu získej **Video ID**:
   - `https://www.youtube.com/watch?v=XXXXXXXXXXX` → `XXXXXXXXXXX`
   - nebo z Studio → Go live → odkaz na video

---

## E) Live Chat ID (jedna z cest)

### Varianta 1 — jen Video ID (doporučeno)

Bridge sám zavolá:

`GET /youtube/v3/videos?part=liveStreamingDetails&id=VIDEO_ID&key=API_KEY`  
→ vezme `liveStreamingDetails.activeLiveChatId`.

Do `.env` stačí `YOUTUBE_VIDEO_ID=...` (když je stream live / chat aktivní).

### Varianta 2 — explicitní Live Chat ID

Ověření v PowerShell (nahraď hodnoty):

```powershell
$KEY = "TVUJ_API_KEY"
$VID = "TVUJ_VIDEO_ID"
Invoke-RestMethod "https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=$VID&key=$KEY" |
  ConvertTo-Json -Depth 6
```

Z odpovědi zkopíruj `activeLiveChatId` → `YOUTUBE_LIVE_CHAT_ID=...`.

Pokud je pole prázdné → stream ještě nemá aktivní chat (není live / chat vypnutý) → **zůstaň BLOCKED**.

---

## F) Vlož jen do lokálního `.env`

Na konec `C:\MIA\.env` (soubor **necommituj**):

```env
MIA_YOUTUBE_ENABLED=1
YOUTUBE_API_KEY=sem_vloz_api_key
YOUTUBE_VIDEO_ID=sem_vloz_video_id
# volitelně místo / vedle VIDEO_ID:
# YOUTUBE_LIVE_CHAT_ID=sem_vloz_live_chat_id
# MIA_YOUTUBE_POLL_MS=4000
```

Aliasy, které kód taky bere: `MIA_YOUTUBE_API_KEY`, `MIA_YOUTUBE_VIDEO_ID`, `MIA_YOUTUBE_LIVE_CHAT_ID`.

---

## G) Až doplníš — napiš Cursoru „YouTube env hotovo“

Cursor pak (bez commitu / bez změny TikTok·Kick·Twitch):

1. `npm run restart`
2. `npm run platform:status` → YouTube `ready` / missing?
3. `npm run platform:test` (dry) / případně `platform:test:post` (syntetický COMMENT)
4. Live smoke: do YouTube chatu napiš `MIA YOUTUBE LIVE TEST`
5. Evidence: `platform=youtube`, username, message, messageId/eventId, poll běží, **žádný API key v logu**
6. Verdikt: **YOUTUBE LIVE READY / PARTIAL / BLOCKED / FAILED**
7. `fourWayReady=true` **až** po skutečném live chatu

---

## Co Cursor neudělá za tebe

| Krok | Proč |
|------|------|
| Google login / 2FA | Lidské ověření |
| Zapnutí API + vytvoření key | Tvůj Cloud účet |
| Spuštění YouTube Live | Musí běžet stream / chat |
| Vložení secretů do `.env` | Ty vložíš hodnoty |

---

## Env mapa (zdroj pravdy = kód)

| Env | Povinné? | Kde |
|-----|----------|-----|
| `MIA_YOUTUBE_ENABLED=1` | ano | `MIA_CONFIG` → start bridge |
| `YOUTUBE_API_KEY` | ano | poll + resolve |
| `YOUTUBE_VIDEO_ID` **nebo** `YOUTUBE_LIVE_CHAT_ID` | ano (jedno) | resolve / poll |
| `MIA_YOUTUBE_POLL_MS` | ne (default 4000) | interval pollu |

Modul: `scripts/MIA_YOUTUBE_BRIDGE.js` · bootstrap: `scripts/MIA_PLATFORM_BRIDGES.js` · chat-only (Super Chat skip).
