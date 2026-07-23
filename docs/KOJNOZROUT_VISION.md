# Kojnožrout — vize a runtime model

## Kdo je Kojnožrout

Tamagotchi × Pokémon companion na streamu Spinák/MIA. **Většinu času má hlad**, reaguje i ve spánku, a jeho nálada odráží komunitu.

## Vitals (živý stav)

| Signál | Zdroj | Projev |
|--------|-------|--------|
| **Hlad** | default ~68 %, růst v čase, klesá krmením | mood `hungry`, sprite hungry |
| **Spánek** | nízká energie + ticho chatu 2–4 min | `sleepy`, reaguje na gift/chat (`sleepy_feed`, `sleepy_chat`) |
| **Nemoc** | dlouhý hlad + nízká pohoda + prázdná miska | `sick` |
| **Smutek** | negativní socialState / stream moodState | `sad` |
| **Znechucení** | chat bez krmení, vysoký hlad | `annoyed` |

Modul: `scripts/MIA_KOJNOZROUT_VITALS.js`

## Batoh diváka

Diváci plní **batoh** akcemi:

| Akce | Item | Power |
|------|------|-------|
| Gift T1 | Svačina / Boost / Štít | 6–18 |
| Gift T2+ | Hostina / Boost | 12–18 |
| Chat | Povzbuzovačka | 4 |
| Like | Jiskra | 2 |

Max 5 itemů na uživatele. Snapshot: `/overlay-state` → `backpack`.

Modul: `scripts/MIA_KOJNOZROUT_BACKPACK.js`

## TikTok duel (2+ streamerů)

**Ne deathmatch** — závod **kdo nahraje víc MIA bodů** v časovém limitu (default 3 min).

```
Diváci → gift / chat / like → batoh + body týmu
         ↓
Local Kojnožrout vs Opponent Kojnožrout
         ↓
Vítěz = vyšší součet MIA bodů (gifts + chat + likes + item bonus)
```

### API

| Endpoint | Účel |
|----------|------|
| `POST /duel/start` | `{ opponentLabel, durationSec, opponentStreamId? }` |
| `POST /duel/opponent-points` | `{ points }` — body soupeře z druhého streamu |
| `POST /duel/finish` | Ukončit duel |
| `GET /duel/status` | Stav duel + batoh |

OBS overlay: `http://127.0.0.1:3000/kojnozrout-duel-overlay.html`

Modul: `scripts/MIA_KOJNOZROUT_DUEL.js`

## Perzistence

- `data/kojnozout-state.json` — miska, hlad, vitals, evoluce
- `data/kojnozout-world.json` — batoh + aktivní duel

Env:
```env
MIA_DUEL_SYNC_ENABLED=true
MIA_DUEL_PEER_URL=http://DRUHY-STREAM:3000
MIA_DUEL_LOCAL_STREAM_ID=spinak
```

API: `GET /duel/export`, `POST /duel/opponent-sync`, auto sync loop when enabled.

## Inventář / batoh (§12)

- Batoh per viewer: `backpack.leaders` v `/overlay-state`
- Chat: **`item`**, **`batoh`**, **`item use`**, **`item use boost`**
- Fronta více uživatelů: `backpack.display.queueLength`
- OBS overlay: `kojnozrout-backpack-overlay.html`
- Spotřeba itemu v duelu: `item use` → `ingestDuelContribution` s `itemPower`

Modul: `scripts/MIA_KOJNOZROUT_ITEM_COMMAND.js`

## CARE doména (§14)

Chat péče: `podrbi koj`, `venc koj`, `uklidni koj`, `leč koj`, `nakrm koj`

Modul: `scripts/MIA_KOJNOZROUT_CARE.js`  
Text banka: `text-bank/packs/koj/vitals-care.json`

## Vitals assety

| Mood | Sprite |
|------|--------|
| sleepy, sad, sick, annoyed | `moods/kojnozout-{mood}.png` |

Seed z base moods: `npm run seed:vital-moods`

## Další fáze (roadmap)

1. ~~Cross-stream sync~~ ✅
2. ~~Spotřeba itemů z batohu v duelu~~ ✅ (`item use`)
3. ~~Dedikované sprites: sleepy, sick, sad, annoyed~~ ✅ seed script + runtime fallback

## Péče podle stavu (CARE opportunities)

| Potřeba | Co funguje | Chat příkazy |
|---------|------------|--------------|
| **Hlad** | gift · batoh · úkol | `item feed snack` · `nakrm koj` · `pece` |
| **Smutek** | péče · povzbuzovačka | `podrbi koj` · `pozornost koj` |
| **Nemoc** | léčba · T2+ gift · štít | `leč koj` · `item feed shield` |
| **Naštvaný** | rychlé jídlo | gift · `item feed` |

### Komunitní úkoly (bez batohu)
- **Hlad:** 3 různí lidé napíšou `ahoj koj` / `nakrm koj`
- **Smutek:** 2 lidé provedou péči (`podrbi koj`, …)
- **Nemoc:** T2+ gift nebo `leč koj`
- **Naštvaný:** jakýkoli gift do misky

Overlay: bowl panel „Péče“ + příkaz **`pece`** pro menu.
4. ~~MIA komentář k vitals („Koj spí, ale slyší Rose od…“)~~ ✅
