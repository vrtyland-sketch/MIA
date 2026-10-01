# Multi-Platform Operator Checklist

**Ty** děláš jen přihlášení a oprávnění. **Cursor/MIA** drží konektory, normalizaci a reconnect.  
Po dokončení: `npm run platform:status` → ideálně `fourWayReady: true`.

```text
Stream Core: FROZEN (gift beze změny)
Twitch/YouTube: CHAT ONLY
```

---

## 0. Společné

- [ ] MIA běží lokálně (`npm run restart` / obvyklý start)
- [ ] `POST http://127.0.0.1:3000/ingest` odpovídá
- [ ] OBS dual-scene / Genesis oddělené od Core testů (dle Gate)

---

## 1. TikTok ✅ (už máte)

- [ ] TikFinity běží a posílá eventy do MIA `/ingest`
- [ ] Ověřen chat (COMMENT)
- [ ] Ověřen gift jen pokud testuješ Core (ne během adapter-only smoke)

**Cursor nemůže:** přihlásit se do TikTok/TikFinity místo tebe.

---

## 2. Kick ✅ **CLOSED · LIVE READY** (uzavřeno 2026-07-31)

**Status:** **KICK CLOSED · LIVE READY** — [MIA_KICK_LIVE_READY.md](./MIA_KICK_LIVE_READY.md)

Evidence:
- bridge connected, chatroom `95746130`
- user `VasaSpinak`, messageId OK, live event → MIA
- text distortion (např. `est 3žij tMia`) = vstup Kick chatu / prohlížeč, **ne** MIA

- [x] `MIA_KICK_ENABLED=1`
- [x] Channel / chatroom ověřen live zprávou
- [x] Po zprávě chat dorazí (`platform=kick`)

**Neměnit** Kick adapter bez nové chyby.

---

## 3. Twitch ✅ **LIVE READY** (uzavřeno 2026-07-31)

**Status:** **TWITCH LIVE READY** — [MIA_TWITCH_LIVE_READY.md](./MIA_TWITCH_LIVE_READY.md)

Evidence:
- EventSub `channel.chat.message` OK
- `platform=twitch`, user/channel `vasaspinak`
- messageId / eventId OK
- normalize + translation meta OK
- secret leak: none
- chat-only (bits/sub → gift OFF)

- [x] Prohlížeč → Twitch OAuth Authorize  
- [x] Token uložen (`secrets/local/twitch_oauth.json` / `.env`)  
- [x] Chat z Twitch → `platform=twitch`  
- [x] Bits/sub **nespouští** gift video (chat-only)  

**Neměnit** Twitch adapter / OAuth bez nové chyby.

---

## 4. YouTube Live ← **PARTIAL** (API key OK · čeká live)

**Status:** **YOUTUBE PARTIAL** — [MIA_YOUTUBE_LIVE_STATUS.md](./MIA_YOUTUBE_LIVE_STATUS.md)  
**Ruční checklist:** [MIA_YOUTUBE_OPERATOR_CHECKLIST.md](./MIA_YOUTUBE_OPERATOR_CHECKLIST.md)

- [x] Google Cloud projekt `mia-youtube-504118` + **API key 2** v `.env` (key 1 smazat v Console)
- [ ] `YOUTUBE_VIDEO_ID` nebo `YOUTUBE_LIVE_CHAT_ID` (aktivní livestream) → pak napiš **YouTube video ID hotovo**

Auth v kódu = **API key only** (OAuth ne). `fourWayReady` false do live chatu.

### A) Google Cloud (jednou)

1. Zapni **YouTube Data API v3**  
2. Vytvoř **API key**

### B) Live Chat ID

Během live streamu:

- z API / Studio získej `activeLiveChatId`, **nebo**
- nastav `YOUTUBE_VIDEO_ID` běžícího live videa (bridge resolve)

### C) `.env`

```env
MIA_YOUTUBE_ENABLED=1
YOUTUBE_API_KEY=...
YOUTUBE_LIVE_CHAT_ID=...
# nebo:
# YOUTUBE_VIDEO_ID=...
```

### D) Ověření

```powershell
npm run restart
npm run platform:status
```

- [ ] Chat → `platform=youtube`  
- [ ] Super Chat se **ne**mapuje na gift

---

## 5. Souběh 4 platforem

```powershell
npm run platform:test          # dry print
npm run platform:test:post     # pošle COMMENT smoke na /ingest (MIA musí běžet)
```

Live checklist: [MIA_MULTI_PLATFORM_ADAPTER_VALIDATION.md](./MIA_MULTI_PLATFORM_ADAPTER_VALIDATION.md)

- [ ] TikTok + Kick + Twitch + YouTube současně 15+ min bez crash  
- [ ] Žádná regrese Core gift na TikTok  

---

## Co Cursor neudělá za tebe

| Krok | Proč |
|------|------|
| Twitch/Google login + 2FA | Lidské ověření |
| Přijetí ToS | Právní subjekt = ty |
| Vytvoření Developer / Cloud projektu | Účet vlastníka |
| Potvrzení live streamu na YT | Musí běžet live |

---

## Po PASS

→ první veřejný Genesis test se **čtyřmi** vstupy (chat), chování MIA beze změny ekonomiky.
