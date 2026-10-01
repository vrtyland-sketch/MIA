# MIA — aktuální inventář (snapshot 2026-07-18)

> Zdroj: repo `C:\MIA` (package.json, `docs/KANON_SOUCASNY_PREHLED.md`, `docs/KANON_MIA_ALIGNMENT.md`, `docs/master-canon/`, strom složek, testy).  
> Tři vrstvy reality: **(A) live runtime**, **(B) docs + `shared/mia-*-core` kotvy**, **(C) `_canon_import/` ZIP staging**.  
> Toto je inventář repa, ne claim 100% hotového produktu.

---

## 1. Co MIA je (1 odstavec)

**MIA** (local Node.js runtime, `package.json` name `"mia"`) je centrální **AI mozek Stream Mode** pro live stream: přijímá eventy z platforem (hlavně TikFinity / TikTok, plus Kick / Twitch / Telegram bridge), rozhoduje o gift ekonomice, chatu, Kojnožroutovi, overlayi, TTS a videu, a řídí **OBS** jako čistý render. Podle ústavy Master Canon 0001 je dlouhodobě „platforma inteligentních digitálních entit“ — v praxi dnes běží hlavně **Stream Mode** (live reakce + pet/komunita + OBS). **Streamer.bot se nepoužívá.** Overlay veřejně ukazuje **MIA body (`miaPoints`)**, nikoli coins.

---

## 2. Jak se spouští

| Položka | Fakt |
|---------|------|
| Entry | `package.json` → `"main": "index.js"` |
| Start | `npm start` → `node server.js` → `startMiaServer()` z `index.js` |
| Stop / restart | `npm run stop` / `npm run restart` (`scripts/mia_stop.js`, `mia_restart.js`) |
| Port | `process.env.PORT` nebo config, default **3000**, bind typicky `127.0.0.1` |
| Live hub | `http://127.0.0.1:3000/mia-live-hub.html` |
| Env / secrets | `scripts/MIA_ENV.js`; `npm run setup:secrets` / `setup:vault` |
| Orchestrátor | `index.js` — bootstrap, `safeRequire` modulů, HOST/CTX wiring, Express |
| HTTP routes | `routes/` přes `registerAllRoutes()` (`routes/index.js`) |

Klíčové smoke/diagnostika po startu:

- `GET /health`, `/status`, `/gift-map/status`, `/stream/session`
- `npm run smoke:live` / `audit:live`
- `npm run test:preflight:fast` (po větších změnách stream/OBS/ingest)
- TTS/video test: `/tts/test`, `/video/test?tier=T1`

---

## 3. Architektura toku

```
TikFinity / Kick / Twitch / …  →  MIA POST /ingest
                                      → normalize (shared/platform_normalizers)
                                      → shadow pipeline (MIA_NEXT/engine_shadow_runtime)
                                      → gift mapa / support / spam / ack / CARE
                                      → overlay state + TTS + video engine
                                      → OBS (browser sources, media inputs)
```

| Vrstva | Role | Nesmí |
|--------|------|--------|
| Platforma (TikFinity…) | posílá eventy | rozhodovat, renderovat |
| **MIA** | AI, gift mapa, duely, hosté, hlas, scény | být „hloupý proxy“ |
| **OBS** | videa, overlaye, browser sources | business logika |

**AI entity (Stream Mode):**

- **MIA** — hlavní speaker, moderátor, režie
- **Kojnožrout** — pet/komunita (bowl, CARE, nálada, bond); defaultně ne hlavní hlas u běžného chatu
- Response contract: `speech_text` ≠ `overlay_text`, stejný intent
- Speaker pořadí: intent guard → response contract → Koj avatar → MIA TTS → Koj voice

Hlavní gift scéna (provoz): **`SPINAK_ENGINE_GIFTS`**.  
AWAY / „NEJSEM TU“: host režim + overlay + OBS Ninja (virtuální svět stále 🔴).

Runtime wiring: ~**60×** `scripts/MIA_*_HOST.js` + ~**59×** `scripts/MIA_*_CTX.js` (`collect*BindingsHost` → `build*Host` → `build*Ctx`).

---

## 4. Strom produktu (složky)

| Složka | Role (1 řádek) |
|--------|----------------|
| `index.js` / `server.js` | Hlavní orchestrátor / tenký boot |
| `scripts/` | Doménové enginy (`MIA_*.js`), HOST/CTX, OBS tooling, asset pipeline |
| `routes/` | Express HTTP balíčky (ingest, overlay, TTS, care, arena, paint, …) |
| `shared/` | Gift mapa, economy config, `mia-*-core` kotvy, platform normalizers, animation/scene engines |
| `mia-output-overlay/` | OBS browser overlays, dashboards, Koj assety, Paint UI |
| `data/` | Persistovaný JSON stav (Koj, session memory, arena, …) |
| `docs/` | Operační kánon, alignment, Master Canon 0001–0087, setup |
| `docs/master-canon/` | Ústavní série + alignment páry |
| `tests/` | ~399 contract/smoke testů |
| `config/` | Runtime/media JSON katalogy |
| `text-bank/` | Textové banky pro odpovědi / emoce |
| `MIA_NEXT/` | Shadow runtime + spam session engine |
| `renderers/` | Overlay render helper (`obs_overlay_render`) |
| `tools/` | MIA Paint Tauri / shell launchery |
| `plugins/` | Pluginy pro Paint |
| `secrets/` | Lokální vault (ne commitovat) |
| `logs/` | Runtime logy |
| `_canon_import/` | **Staging** importovaných ZIP Master Canon packů (ne live katalog) |
| `imports/` | ChatGPT → kanon import staging |
| `archive/` / `legacy/` | Deprecated / legacy holdovers |
| `generated/` / `downloads/` / `incoming-images/` | Artefakty / intake |
| `_obs_scene_backups/` | Zálohy OBS scén |
| `.cursor/` | Cursor rules (guardrails, kánon) |

**Není** root `README.md` — vstupní narativ je v `docs/KANON_SOUCASNY_PREHLED.md`.

---

## 5. Live funkce / domény (checklist co reálně běží)

Legenda dle `KANON_SOUCASNY_PREHLED` / alignment: 🟢 běží · 🟡 částečně · 🔴 vize/chybí.

### 5.1 Ingest & platformy
- [x] 🟢 TikFinity → `/ingest` → normalize → pipeline
- [x] 🟢 Kick / Twitch / Telegram bridges (`MIA_KICK_BRIDGE`, `MIA_TWITCH_BRIDGE`, `MIA_TELEGRAM_BRIDGE`)
- [x] 🟢 Runtime security bind/ingest (`MIA_RUNTIME_SECURITY`)
- [x] 🟢 Stream session PRELIVE → LIVE → ENDED (`MIA_STREAM_SESSION`, `/stream/session`)
- [x] 🟢 Solo stream režim (`MIA_SOLO_STREAM`)

### 5.2 Gift / ekonomika
- [x] 🟢 Centrální gift mapa `shared/gifts/` (`resolveGift` → tier, care, bowl, video, overlay, hlas, XP, rewards)
- [x] 🟢 Tiering T1–T6 z coinů; playback tier = `max(coinTier, katalogový tier)`
- [x] 🟢 **1 coin = 7.5 MIA bodů**; overlay bez coins
- [x] 🟢 Gift economy / ledger / presentation (`MIA_GIFT_ECONOMY`, `MIA_GIFT_USER_LEDGER`, `MIA_GIFT_PRESENTATION`)
- [x] 🟢 Jednotná ekonomika `shared/stream_economy_config.json`
- [x] 🟢 Per-tier video rotace (`rotationIndexByTier`) — bez resetu tier indexu
- [x] 🟢 Media katalog gift videí T1–T5+ (`MIA_MEDIA_CATALOG`, `npm run media:*`)
- [x] 🟢 Spam community wave (`MIA_NEXT/engine_spam_session`) + per-user ack throttle (`MIA_USER_ACK_THROTTLE`)
- [x] 🟢 Achievements / supporter profile + unlock moment
- [x] 🟢 SHARE doména
- [x] 🟢 Kapybara gift flow

### 5.3 Chat / AI / TTS
- [x] 🟢 Chat brain + lexicon (`MIA_CHAT_BRAIN`, `MIA_CHAT_LEXICON`)
- [x] 🟢 Response engine + support resolver / reaction policy
- [x] 🟢 Speaker routing + voice priority + overlay voice queue
- [x] 🟢 TTS engine (`MIA_TTS_ENGINE`, edge-tts)
- [x] 🟢 LLM adapter hybrid (`MIA_LLM_ADAPTER`) — partial dle scénáře
- [x] 🟢 Session memory (`MIA_SESSION_MEMORY` → `data/mia-session-memory.json`)
- [x] 🟢 Language / translate
- [x] 🟢 Proactive host / T0 engagement
- [x] 🟢 Text banks (`text-bank/`)

### 5.4 Bowl / Kojnožrout
- [x] 🟢 Bowl engine + full video (`KOJNOZROUT_BOWL_ENGINE`, `MIA_BOWL_FULL_VIDEO`)
- [x] 🟢 Koj engine, vitals, persistence, evolution, backpack, bond, CARE
- [x] 🟢 Care commands chat + gift CARE + quests + rewards
- [x] 🟢 Display moods / sprites / stages / animation bank
- [x] 🟢 Platform forms (Tok/Stack/Bits/Kisstube) + roster
- [x] 🟢 Walk / world persistence (`kojnozout-world.json`)
- [ ] 🔴 Plný virtuální svět / STARK / combat shader (vize)

### 5.5 Battle / arena
- [x] 🟢 Platform arena + duel bridge (`MIA_PLATFORM_ARENA`, `MIA_KOJNOZROUT_DUEL*`)
- [x] 🟢 Battle choreography + arena battle demo / OBS ensure
- [x] 🟢 Sjednocené MIA body napříč platformami (ne coins)
- [x] 🟢 Boss mission + immersive scene foundation (Phase 17–22) — immersive 🟡

### 5.6 Overlay / OBS tooling
- [x] 🟢 `/overlay-state` polling (public, bez coins)
- [x] 🟢 Overlay queue / timing / emit
- [x] 🟢 OBS websocket (`obs-websocket-js`), watchdog, scene guard
- [x] 🟢 Skripty `obs:*`, `live:prep`, `obs:stream-ready`, gift video layers, arena, voice, cameras/NDI
- [x] 🟢 AWAY / host mode overlays
- [x] 🟢 Dokumentovaný live setup: `docs/OBS_LIVE_SETUP.md`

### 5.7 Dashboards / remote / control plane
- [x] 🟢 `mia-streamer-dashboard.html`, `mia-vision-dashboard.html`, `mia-live-hub.html`
- [x] 🟢 Remote Dev Mode (telefon → fronta → watcher → Cursor)
- [x] 🟢 Remote Fold / Tailscale setup skripty
- [x] 🟢 `/health`, `/status`, startup-check overlay

### 5.8 Graphics / Paint (mimo kritický live gift tok, ale v runtime)
- [x] 🟢 MIA Paint HTTP+WS agent API (`routes/mia_paint.js`)
- [x] 🟢 Graphics Studio Phase 12+ (`docs/MIA_GRAPHICS_STUDIO.md`)
- [x] 🟢 Animation Engine / Animation Bank / timeline / bone+lip foundation
- [x] 🟢 Multi-cam matting / NDI discovery / streamer cameras
- [x] 🟢 Tauri / shell launchery (`npm run paint:tauri`, `paint:shell`)

### 5.9 Co záměrně NEběží jako produkt
- [ ] 🔴 User Mode (osobní asistent)
- [ ] 🔴 Sociální síť / cross-post
- [ ] 🔴 Multi-tenant (tisíce streamerů)
- [ ] 🔴 Streamer.bot v toku (odstraněno / nepoužívá se)

**Důležité cesty (příklady):**

- Orchestrátor: `index.js`, `server.js`
- Gift: `shared/gifts/`, `scripts/MIA_SUPPORT_RESOLVER.js`, `MIA_GIFT_TIERS.js`, `MIA_VIDEO_ENGINE.js`
- Spam: `MIA_NEXT/engine_spam_session.js`
- Koj: `scripts/MIA_KOJNOZROUT_ENGINE.js`, `MIA_KOJNOZROUT_CARE.js`, `MIA_KOJNOZROUT_BACKPACK.js`
- Overlay state: `scripts/MIA_OVERLAY_STATE*.js`
- Routes: `routes/ingest.js`, `overlay.js`, `tts.js`, `care_commands.js`, `arena.js`, `status.js`

---

## 6. Overlay / frontend / OBS

**Kořen overlayů:** `mia-output-overlay/` (~**41** HTML).

### Live / stream overlays (výběr)
| Soubor | Účel |
|--------|------|
| `mia-overlay.html` | Hlavní MIA overlay |
| `speech-overlay.html` | Řeč / bubliny |
| `chat-overlay.html` | Chat |
| `combo-overlay.html` | Combo / spam wave HUD |
| `gift-moment-overlay.html` | Gift moment |
| `entity-overlay.html` | Entity / host team bar |
| `viewer-strip-overlay.html` | Recent participants |
| `kojnozrout-overlay.html` / `kojnozrout-runtime.html` | Koj vizuál |
| `kojnozrout-bowl-overlay.html` | Miska |
| `kojnozrout-backpack-overlay.html` | Batoh |
| `kojnozrout-duel-overlay.html` | Duel |
| `arena-overlay.html` / `arena-battle-overlay.html` | Arena |
| `host-mode-overlay.html` / `away-loop-overlay.html` | Host / AWAY |
| `immersive-scene-overlay.html` | Immersive scene |
| `boss-cinematic-overlay.html` | Boss cinematic |
| `mia-voice-overlay.html` / `mia-mic.html` | Hlas |
| `t0-flyby-overlay.html` / `story-moment-overlay.html` | Engagement / story |
| `mia-body-part-overlay.html` | Body parts / lip |

### Ops / dashboards / galleries
`mia-live-hub.html`, `mia-streamer-dashboard.html`, `mia-vision-dashboard.html`, `mia-remote.html`, `mia-remote-dev.html`, `startup-check.html`, `koj-*-gallery.html`, `mia-paint/`, graphics preview.

### Assety
`mia-output-overlay/assets/kojnozrout/` (moods, props, items, evolution, forms, fx…), animation-bank, media sloty řízené katalogy.

**Pravidlo:** public overlay state = **miaPoints / MIA body**, ne coins/hodnota giftů.

---

## 7. Data & stav

Persistované JSON v `data/` (runtime paměť / stav):

| Soubor | Doména |
|--------|--------|
| `kojnozout-state.json` | Stav Kojnožrouta |
| `kojnozout-world.json` | World persistence |
| `mia-session-memory.json` | Session paměť |
| `story-memory.json` | Story paměť |
| `mia-chat-lexicon.json` | Chat lexicon |
| `platform-arena.json` | Arena stav |
| `gift-map-stats.json` | Gift map statistiky (disk) |
| `streamer-identity.json` | Identita streamera |
| `obs-streamer-camera-rig.json` | Camera rig |
| `koj-2d-factory-audit.json` / `koj-obs-visual-audit.json` | Audity |

Další config: `shared/stream_economy_config.json`, `shared/host_mode_config.json`, `config/*`, `secrets/`, `logs/`.

TikTok data: ledger OK; dlouhodobé stats na disku 🟡 (dle alignment).

---

## 8. Master Canon (docs + kotvy) — co je hotové na papíře

### 8.1 Hierarchie dokumentace
1. **Ústava:** `docs/master-canon/0001-*.md` … **0087** (+ párové `*-alignment.md`)
2. **Operační kánon:** `docs/KANON_MIA_AGENT.md`
3. **Současný stav:** `docs/KANON_SOUCASNY_PREHLED.md` (číst první pro runtime)
4. **Soulad s kódem:** `docs/KANON_MIA_ALIGNMENT.md` (🟢/🟡/🔴)
5. **Doménové kánony:** `KOJNOZROUT_KANON.md`, `MIA_GIFT_ECONOMY.md`, `OBS_LIVE_SETUP.md`, …

### 8.2 Registr Master Canon v repo (živý katalog)
- **0001–0087:** platné spec dokumenty + alignment páry (~**175** md v `docs/master-canon/` včetně README)
- **0088:** Telemetry Manager — **plánováno** (ještě není)
- Každý dokument má contract test: `tests/mia_master_canon_XXXX_contract.js` (**87** souborů)
- Ověření: `npm run test:master-canon`

### 8.3 Tematické bloky 0001–0087 (zkráceně)
| Rozsah | Téma |
|--------|------|
| 0001–0006 | Ústava, entity, event, component, vrstvy, platform architecture |
| 0007–0018 | Core/runtime/lifecycle + event bus/gateway/validator/router/priority/queue/dispatcher + monitoring |
| 0019–0027 | Memory systém (working → emotional) + knowledge graph |
| 0028–0035 | Decision, action, goals, planning, emotion, personality, conversation, speech |
| 0036–0038 | Animation, visual render, OBS integration |
| 0039–0049 | Battle, inventory, economy, quest, achievement, community, world, story, NPC, creature evolution, plugins |
| 0050–0087 | **Kernel Layer 0** — boot, startup, service, dependency, config, resource, process, scheduler, thread, timer, state, runtime, lifecycle, health, recovery, watchdog, fault, safe-mode, shutdown, diagnostics, logging, metrics, alert, audit, event-store, buses, projection, saga, workflow, rule, policy, kernel decision, orchestrator, coordination |

### 8.4 Kotvy v kódu: `shared/mia-*-core/` (~**67** balíčků)
API/kotvy existují (dokument + core modul + contract). **Live wiring do `index.js` ingest/OBS toku je u většiny 🟡** — tj. kánon „na papíře + kotva“, ne plně autoritativní runtime.

Příklady: `mia-entity-core`, `mia-event-core`, `mia-economy-core`, `mia-battle-core`, `mia-kernel-core`, `mia-obs-core`, … až po `mia-coordination-core`.  
Navíc (mimo přesný glob `mia-*-core`): `shared/mia-core-canon/`, `mia-animation-engine/`, `mia-scene-engine/`, `mia-graphics-studio/`, `mia-paint-*`.

### 8.5 Typický stav souladu (shrnutí alignment)
- **Stream Mode runtime** (gift, Koj, overlay, OBS, spam, CARE): převážně 🟢
- **Master Canon docs 0001–0055:** dokumenty 🟢; runtime adopce často 🟡
- **Kernel 0056–0087:** dokumenty + core 🟡; live wiring 🟡; často „durable store / external broker“ ještě ne
- HOST architektura (0004): ~60 HOST 🟢
- Event pipeline části: ingest 🟢, ale DLQ/retry/rate-limit často ❌/🟡

---

## 9. Importované ZIP packy (staging, ne runtime)

Umístění: `_canon_import/` — **neslouží jako živý katalog** Stream Mode; staging / audit materiál.

| Pack | Obsah | Stav |
|------|--------|------|
| `MIA_MASTER_CANON/` | Meta (INDEX, MANIFEST, IMPLEMENTATION_MATRIX, CURSOR_AUDIT_PROMPT) | Meta; historicky „migrováno 0001–0049“, plán až 5000 |
| `MIA_MASTER_CANON_0001-0100/` | ~102 md — **plné** regenerované dokumenty | Full pack |
| `MIA_MASTER_CANON_0101-0200/` | ~101 md — pojmenované short stuby + reserved | **Stub pack** |
| `MIA_MASTER_CANON_0201-0300/` | ~101 md — pojmenované short stuby + reserved | **Stub pack** |

Živý Master Canon pro práci v Cursoru = **`docs/master-canon/0001–0087`**, ne ZIP import.

---

## 10. Testy & kvalita

| Metrika | Číslo / fakt |
|---------|----------------|
| `tests/*.js` | ~**399** |
| Master Canon contracts | **87** (`test:master-canon`) |
| Preflight fast | `npm run test:preflight:fast` — velká sada runtime/wiring/gift/OBS smoke |
| Preflight full | `npm run test:preflight` |
| Stream-ready | `test:stream-ready` = preflight full + media catalog |
| Další balíčky | `test:smoke`, `test:gift-map`, `test:arena`, `test:mia-paint`, `test:animation-engine`, `test:ecosystem`, … |
| Live audit | `npm run smoke:live` / `audit:live` (MIA musí běžet) |
| Syntax check | `node --check index.js` (guardrail po větších změnách) |

Guardrail (`.cursor/rules/mia-guardrails.mdc`): nerozbít; TikFinity→MIA→OBS; overlay jen miaPoints; per-tier rotace; po větší změně stream logiky preflight.

---

## 11. Co MIA NENÍ / mezery

- Není hotová multi-tenant SaaS platforma ani sociální síť.
- Není User Mode osobní asistent (🔴).
- Není plný virtuální svět / STARK (🔴).
- Není „100 % Master Canon live“ — většina kernel/core kotev je 🟡 wiring.
- `_canon_import` 0101–0300 není implementovaný katalog (stuby).
- Není Streamer.bot-centric architektura (legacy docs/PDF mohou lhát — platný přehled je `KANON_SOUCASNY_PREHLED`).
- Root README chybí; narativ je v `docs/`.
- Immersive scene / některé host-Ninja scény stále 🟡.
- Plné durable event-store / external brokers z kernel kánonu zatím ne.

---

## 12. Klíčová tvrdrá pravidla

1. **Nerozbít** — minimální diff, žádné vedlejší refactory bez důvodu.
2. **Architektura:** TikFinity → MIA → OBS. OBS jen renderuje; business logika v MIA.
3. **Overlay** nikdy neexpozuje coins/hodnotu giftů — jen **`miaPoints` / MIA body**.
4. **Video rotace:** per-tier index (`rotationIndexByTier`) — **bez resetu** tier indexu.
5. **Gift sémantika** jen přes `shared/gifts/` (ne legacy animační `MIA_GIFT_MAP` jako ekonomika).
6. **Tři druhy „T2“ se nesmí plést:** `coinTier` ≠ `streamTier`/`obsTier` ≠ `spamRewardTier`.
7. **Master Canon** má prioritu nad nižšími docs; rozpor → alignment mapa.
8. Po větší změně stream/OBS/ingest: `node --check index.js` + `npm run test:preflight:fast`.

---

## 13. Orientační čísla (docs, cores, tests, % live canon)

| Položka | Orientačně |
|---------|------------|
| Master Canon specs v `docs/master-canon` | **87** (0001–0087) + 87 alignments |
| `shared/mia-*-core` | **~67** |
| HOST / CTX | **~60 / ~59** |
| Express route moduly | **23** |
| Overlay HTML | **41** |
| `data/*.json` | **11** |
| Testy `tests/*.js` | **~399** |
| npm scripts | **velmi husté** (start, OBS, media, paint, koj, preflight, master-canon, …) |
| Dependencies | express, ws, axios, cors, obs-websocket-js, sharp, pngjs, edge-tts-universal |
| **Stream Mode „live produkt“** | ~🟢 (gift/Koj/overlay/OBS jádro) |
| **Master Canon → live wiring** | většina **🟡** (docs+kotvy hotové, autorita v runtime částečná) |
| **Hrubý odhad „canon live“** | řádově **~30–40 %** plné ústavní vize v runtime; **~80–90 %+** toho, co Stream Mode dnes potřebuje k vysílání (dle přehledu 🟢 oblastí) — *odhad z alignment, ne změřené KPI* |
| Import ZIP 0001–0100 | full staging |
| Import ZIP 0101–0300 | stubs only |

---

## 14. Jednověté shrnutí pro model

**MIA je lokální Node/Express Stream Mode mozek (TikFinity→MIA→OBS) s hotovou gift mapou, Kojnožroutem, overlayi/TTS/videem a hustými testy; vedle toho drží Master Canon 0001–0087 + ~67 `mia-*-core` kotev převážně s 🟡 live wiring a `_canon_import` ZIP packy jen jako staging — inventář repa, ne claim hotové platformy.**

---

*Toto je inventář repa, ne claim 100% hotového produktu.*
)
