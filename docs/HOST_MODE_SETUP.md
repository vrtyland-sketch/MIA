# HOST / NEJSEM TU — setup

MIA v režimu **NEJSEM TU** (`worldMode: nejsem_tu`) přebírá stream jako host. Overlay vrstva je split — stejně jako zbytek Stream Mode.

**Tok:** TikFinity → MIA → `/overlay-state` → OBS browser sources (render only)

---

## 1. Aktivace režimu

| Způsob | Jak |
|--------|-----|
| Voice / ecosystem | `MIA_ECOSYSTEM_ENABLED=on`, přepnutí na `nejsem_tu` |
| Env | `MIA_WORLD_MODE=nejsem_tu` (start) |
| OBS scéna | `MIA_AWAY_OBS_SCENE_SWITCH=on` → `SPINAK_NEJSEM_TU` |

Konfigurace scén: `shared/host_mode_config.json` · loader `scripts/MIA_HOST_MODE_CONFIG.js`

---

## 2. OBS browser sources pro HOST

| OBS jméno | Soubor | Viditelnost |
|-----------|--------|-------------|
| `MIA_HOST_MODE` | host-mode-overlay.html | **ANO** ve scéně AWAY |
| `MIA_ENTITY` | entity-overlay.html | LIVE / HOST badge + team bar |
| `MIA_VIEWER_STRIP` | viewer-strip-overlay.html | recentParticipants |
| `MIA_SPEECH` | speech-overlay.html | bubliny MIA/Koj |
| `MIA_VOICE` | mia-voice-overlay.html | TTS audio |

Moment vrstvy (`MIA_COMBO`, gift moment, …) jsou ve scéně AWAY taky, ale **skryté** — zapnou se při dárku stejně jako na main scéně.

```powershell
npm run obs:apply-hands          # main SPINAK_ENGINE_GIFTS + away SPINAK_NEJSEM_TU
npm run obs:apply-away-scene     # jen away scéna
npm run obs:away-manifest        # tisk vrstev pro AWAY
```

**Scéna AWAY:** `SPINAK_NEJSEM_TU` (env `MIA_AWAY_SCENE`). MIA scénu vytvoří, pokud v OBS chybí.

### Pozadí — smyčka `MIA_AWAY_LOOP`

| Režim | Popis |
|-------|--------|
| **browser** (default) | CSS animace `away-loop-overlay.html` — funguje hned |
| **video** | MP4 `incoming-images/videos/away/nejsem_tu_loop.mp4` |
| **auto** | MP4 pokud existuje, jinak browser |

```powershell
npm run media:generate-away-loop   # vygeneruje MP4 (ffmpeg)
npm run obs:apply-away-scene       # včetně MIA_AWAY_LOOP
npm run obs:apply-away-eyes        # apply + layout + MIA oči verify
```

API: `GET /mia/eyes/away` — screenshot smyčky + kontrola overlay ve scéně AWAY.

Starý OBS název `nejsem tu smyčka` se rozpozná jako alias. Env: `MIA_AWAY_LOOP_MODE=auto|browser|video`

---

## 3. OBS Ninja (volitelné)

Embed URL streamera do pravého horního panelu během AWAY:

```env
# View link z OBS Ninja / VDO.Ninja (https://)
MIA_OBS_NINJA_URL=https://vdo.ninja/?view=YOUR_ROOM
```

Overlay `host-mode-overlay.html` načte URL z `/overlay-state` → pole `hostPanel.ninjaEmbedUrl` (jen když `awayActive`).

---

## 4. `/overlay-state` pole

| Pole | Popis |
|------|--------|
| `hostMode` | snapshot z `MIA_AWAY_MODE.js` — label, badge, awayActive |
| `hostPanel` | panel pro `MIA_HOST_MODE` — ninja URL, capybara prompt, audience |
| `hostTeamScore` | team bar v entity overlay |
| `capybaraFlow` | gift→chat loop (Kapybara) |

---

## 5. Gift chat loop (AWAY)

Po **pet dárku** z gift mapy (`animal_small`, `chatLoop: true` — Kapybara, Tofu, Creeper, …) v režimu **NEJSEM TU**:

1. 20 s animace (Koj pet react)
2. MIA vyzve chat k komentáři
3. První komentář → MIA odpoví (TTS + bublina)

Default **`MIA_GIFT_CHAT_LOOP=away_only`** — v běžném LIVE se loop nespouští (dřív omylem ano).

Prompt v overlay: `hostPanel.giftWait` · logika: `scripts/MIA_CAPYBARA_FLOW.js` (legacy název souboru)

---

## 6. Smoke test

```powershell
npm run restart
# v prohlížeči:
# http://127.0.0.1:3000/host-mode-overlay.html
# http://127.0.0.1:3000/overlay-state  → hostPanel
node tests/host_mode_overlay_contract.js
```

---

## 7. Roadmap (🔴 mimo současný runtime)

| Oblast | Stav |
|--------|------|
| Dedikovaná scéna per streamer (Špiňák HOST) | 🟡 `SPINAK_NEJSEM_TU` generická |
| Virtuální svět GTA/Fortnite | 🔴 |
| Paralelní duely na dvou streamech | 🟡 duel model OK |

Viz `docs/KANON_MIA_ALIGNMENT.md` §8–§9.
