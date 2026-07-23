# OBS — přesný setup pro MIA live (Stream Mode)

**Scéna:** `SPINAK_ENGINE_GIFTS` (nebo `MIA_OBS_CAMERA_SCENE` v `.env`)  
**Tok:** TikFinity → `http://127.0.0.1:3000/ingest` → MIA → OBS (render only)

> Automatické vytvoření/oprava zdrojů: **`npm run obs:apply-hands`**  
> MIA body vrstvy (`MIA_HEAD`…`MIA_TORSO`) dostanou URL s **`?sync=hybrid`** (live mirror + graphics parts).
> Kontrola před live: **`npm run obs:verify-stream-ready`**  
> Tisk manifestu do konzole: **`npm run obs:manifest`**

---

## 1. Co musí běžet před streamem

| Krok | Příkaz / URL |
|------|----------------|
| MIA server | `npm run restart` |
| OBS WebSocket | OBS běží, port 4455, heslo v `.env` |
| Startup slide | `http://127.0.0.1:3000/startup-check.html` (~60 s po startu) |
| TikFinity webhook | `POST http://127.0.0.1:3000/ingest` |
| TTS test | `http://127.0.0.1:3000/tts/test` |
| Gift video test | `http://127.0.0.1:3000/video/test?tier=T1` |

---

## 2. Browser sources — přesný seznam

**Režim:** split (NE `mia-live-hub.html` — ten je legacy all-in-one).

V OBS: **Browser Source**, FPS 30, shutdown OFF.  
**Pořadí vrstev:** čím výš v seznamu scény, tím víc vpředu (viz sloupec z).

| z | Viditelný | Moment | OBS jméno | Soubor | Rozměr |
|---|-----------|--------|-----------|--------|--------|
| 100 | ne | ano | `MIA_STARTUP_CHECK` | startup-check.html | 1920×1080 |
| 90 | ne | ano | `MIA_COMBO` | combo-overlay.html | 1920×1080 |
| 88 | ne | ano | `MIA_T0_FLYBY` | t0-flyby-overlay.html | 1920×1080 |
| 86 | ne | ano | `MIA_DUEL` | kojnozrout-duel-overlay.html | 1920×1080 |
| 84 | ne | ano | `MIA_STORY` | story-moment-overlay.html | 960×540 |
| 82 | ne | ano | `MIA_GIFT_MOMENT` | gift-moment-overlay.html | 960×540 |
| 83 | **ano** | ano | `MIA_GIFT_ANIMATION` | gift-animation-overlay.html?v=30-lion-wau | 1920×1080 |
| 80 | ne | ano | `MIA_EVOLUTION` | evolution-toast-overlay.html | 420×140 |
| 75 | ne | ano | `MIA_HOST_MODE` | host-mode-overlay.html | 1920×1080 |
| 70 | **ano** | ne | `MIA_ENTITY` | entity-overlay.html | 300×130 |
| 65 | **ano** | ne | `MIA_VIEWER_STRIP` | viewer-strip-overlay.html | 720×120 |
| 60 | ne | ano | `MIA_BACKPACK` | kojnozrout-backpack-overlay.html | 320×240 |
| 55 | **ano** | ne | `MIA_BOWL` | kojnozrout-bowl-overlay.html | 320×240 |
| 50 | **ano** | ne | `MIA_KOJ_RUNTIME` | kojnozrout-runtime.html | 400×400 |
| 40 | **ano** | ne | `MIA_SPEECH` | speech-overlay.html | 1920×1080 |
| 30 | **ano** | ne | `MIA_VOICE` | mia-voice-overlay.html | 200×80 |

**Aliasy jmen** (ruce najdou existující zdroj): `MIA_BUBBLE` = speech, `KOJNOZROUT_RUNTIME` = runtime, atd.

### Scéna AWAY: `SPINAK_NEJSEM_TU`

Pro režim NEJSEM TU MIA přepne program scénu sem (`MIA_AWAY_OBS_SCENE_SWITCH=on`).

| Ve scéně AWAY | Viditelný default |
|---------------|-------------------|
| `MIA_HOST_MODE` | **ano** |
| `MIA_ENTITY`, `MIA_VIEWER_STRIP`, `MIA_SPEECH`, `MIA_VOICE` | **ano** |
| `MIA_COMBO`, gift moment, Koj bowl/runtime, … | ne (moment vrstvy) |

Pod overlay vrstvami: **`MIA_AWAY_LOOP`** — browser CSS smyčka (default) nebo MP4 po `npm run media:generate-away-loop`.

```powershell
npm run obs:apply-hands       # main + away scéna najednou
npm run obs:apply-away-scene  # jen SPINAK_NEJSEM_TU
npm run obs:away-manifest
```

### Co je „moment“ overlay

Defaultně **skrytý** ve scéně — MIA ho zapne přes `/overlay-state` polling.  
Trvale viditelné: **ENTITY**, **VIEWER_STRIP**, **BOWL**, **RUNTIME**, **SPEECH**, **VOICE**.

**Avatar MIA na live:** jen uvnitř **`MIA_BUBBLE` / `MIA_SPEECH`** (`#miaHolo` v `speech-overlay.html`).  
Vrstvy **`MIA_HEAD` … `MIA_FEET`** (Graphics Studio) jsou ve scéně **defaultně skryté** — nezapínej je ručně, duplikovaly by hologram a překrývaly bublinu. Po update kódu: `npm run obs:apply-hands`.

### Clean look — checklist (Animation Studio vibe, ne plná app)

**Vždy ON (program scéna):**
1. `MIA_BUBBLE` (nebo `MIA_SPEECH`) — hologram + bublina
2. `MIA_VOICE` — jen audio (malý browser, může být mimo canvas)
3. `KOJNOZROUT_RUNTIME` — jen když chceš Koj ve scéně (pravý dolní)

**Volitelně ON:** `CHAT_OVERLAY`, `KOJNOZROUT_BOWL_V2` / `MIA_BOWL`, `MIA_ENTITY`  
**Moment vrstvy** (combo/gift/story/duel/…): default **OFF** — MIA je zapne jen na moment.

**Vždy OFF (jinak double visual / clutter):**
- `MIA_HEAD` · `MIA_TORSO` · `MIA_EYES` · `MIA_HANDS` · `MIA_FEET`
- `MIA_GRAPHICS_PREVIEW`
- legacy `mia-live-hub` / `mia-overlay.html`
- TikFinity widget = mute (ensure-voice to udělá)

**Pořadí (zdola nahoru = zepředu):** gift video → `KOJNOZROUT_RUNTIME` → `MIA_BUBBLE` → moment overlays → `MIA_VOICE` (audio).

Kontrola: `GET http://127.0.0.1:3000/obs/overlay-audit` · po restartu: `npm run obs:ensure-voice`.

### Pozice (1080p landscape — po `npm run obs:fix-layout`)

| Zdroj | Umístění |
|-------|----------|
| MIA_ENTITY | levý horní (safe zone TikTok) |
| MIA_VIEWER_STRIP | levý dolní |
| MIA_BOWL | pravý horní |
| MIA_KOJ_RUNTIME | pravý dolní |
| MIA_SPEECH / MIA_COMBO / MIA_HOST_MODE | fullscreen |

### Hard layout zones (uvnitř `MIA_BUBBLE` + Koj) — 1920×1080

Cíl: **nulový overlap** MIA / bublina / Koj. CSS lane v `tiktok-viewer-zones.css` + `speech-overlay.html`.

```
┌──────────────────────────────────────────────────────────────┐
│  ENTITY (L-top)                         BOWL (R-top)         │
│                                                              │
│   ┌────────────┐  ┌──────────────────┐                       │
│   │            │  │ SPEECH BUBBLE    │        ┌────────────┐ │
│   │  MIA HOLO  │◄─┤ (u hlavy/hrudníku│        │ KOJ DOCK   │ │
│   │  ~0–28% W  │  │  mimo obličej)   │        │ ~R 32%     │ │
│   │  dolní L   │  └──────────────────┘        │ dolní R    │ │
│   └────────────┘                              └────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

| Zona | Pravidlo |
|------|----------|
| **MIA** | `#miaHolo` — `--mia-zone-w/h`, levý dolní; jediný live avatar |
| **BUBBLE** | `#box` — `left = MIA + gap`, `right ≥ --koj-clear-right` (~32 %), `bottom` u hlavy (~38 % výšky holo) |
| **KOJ** | OBS `MIA_KOJ_RUNTIME` bottom-right; uvnitř dock max ~300 px, úzký wander |

Refresh v OBS: pravý klik na `MIA_BUBBLE` / `KOJNOZROUT_RUNTIME` → **Refresh cache of current page** (nebo `npm run obs:ensure-voice`).

---

## 3. Gift video sloty (FFmpeg/VLC — ne browser)

Ve scéně `SPINAK_ENGINE_GIFTS`:

- **T1** … **T5** sloty (`T1_01`, `T2_01`, …)
- Typ: **Media Source** nebo **VLC** s `local_file` na MP4 z `incoming-images/videos/`

```powershell
npm run media:scan
npm run media:add-obs-slots
npm run media:apply-obs
```

Test: `http://127.0.0.1:3000/video/test?tier=T1`

---

## 4. Audio — TTS do TikTok Studia

| Nastavení | Hodnota |
|-----------|---------|
| Zdroj | `MIA_VOICE` |
| Browser → Control audio | **ZAPNUTO** |
| Browser → Reroute audio | **ZAPNUTO** (MIA to nastaví přes ruce) |
| Monitor typ | **Monitor and Output** |
| OBS Monitoring Device | VB-Cable **Input** |
| TikTok LIVE Studio mikrofon | VB-Cable **Output** |

```powershell
npm run obs:ensure-voice
npm run obs:prepare-tiktok
```

Virtual Camera **neposílá zvuk** — proto VB-Cable.

---

## 5. TikTok / OBS — co NEDĚLAT

- **NE** `mia-live-hub.html` jako jediný zdroj (split je kánon)
- **NE** duplicitní `MIA_SPEECH` + starý `mia-overlay.html` — smaž duplicity
- **NE** zapínat `MIA_HEAD` / `MIA_TORSO` / `MIA_EYES` / `MIA_HANDS` / `MIA_FEET` na live — avatar je v `MIA_SPEECH`
- **NE** OBS „Start Streaming“ pro TikTok Studio (stream jde z TikTok app)
- **NE** zobrazovat coins v overlay — jen MIA body (runtime to hlídá)

### Duplicitní hlas / bublina — rychlá oprava

| Symptom | Příčina | Co udělat |
|---------|---------|-----------|
| TTS hraje 2× | Dva browser sources s audio / TikFinity widget | `npm run obs:ensure-voice` — nech **jen** `MIA_VOICE` unmuted |
| Echo / ozvěna | Monitor+Output + Desktop Audio **nebo** Mic snímá speakers | Desktop Audio MUTE; Monitoring Device = VB-Cable; Mic bez room echo |
| Dvojitá MIA / „messy“ overlay | `MIA_HEAD`/`TORSO`/`EYES`/`HANDS`/`FEET` + `MIA_BUBBLE` | Body-party **vypni** (ensure-voice je skryje); live avatar = `#miaHolo` v `MIA_BUBBLE` |
| Bublina 2× | Hub / starý overlay + `MIA_BUBBLE` | Hub a `mia-overlay.html` skryj/smaž |

Kontrola: `GET http://127.0.0.1:3000/obs/overlay-audit` nebo `npm run obs:ensure-voice`.

**Jedna testovací věta:** `npm run obs:ensure-voice` → slyšíš **jednou** „Ahoj. Jsem MIA…“. Když 2×, zkontroluj Mic feedback a TikFinity.

---

## 6. Jedním příkazem

```powershell
npm run restart
npm run obs:stream-ready -- --fix --wait
npm run smoke:live
```

API manifest (JSON): `GET http://127.0.0.1:3000/obs/live-manifest`

---

## 7. Mimo OBS (pro streamera)

| URL | Účel |
|-----|------|
| `/mia-streamer-dashboard.html` | panel streamera |
| `/status` | diagnostika |
| `/gift-map/status` | gift mapa + spam wave |
| `/stream/session` | PRELIVE / LIVE / ENDED |

---

## 8. Vize → realita (roadmap)

| Oblast | Stav | Další krok |
|--------|------|------------|
| Split overlaye + ruce | 🟢 | `obs:apply-hands` |
| Host team bar | 🟢 | entity-overlay |
| Viewer strip | 🟢 | viewer-strip-overlay |
| HOST panel + OBS Ninja embed | 🟢 | host-mode-overlay + `MIA_OBS_NINJA_URL` |
| Boss cutscéna T6 | 🟢 | combo LEGEND/MEGA_BOSS cinematic (light) |
| Generativní avatar | 🔴 | mimo současný stream |

Kánon manifestu v kódu: `scripts/MIA_OBS_LIVE_MANIFEST.js`  
HOST / NEJSEM TU detail: `docs/HOST_MODE_SETUP.md`
