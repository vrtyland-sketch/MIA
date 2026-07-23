# MIA — současný přehled kánonu (stav runtime)

Aktualizováno: 2026-07-15.  
**Ústava:** [`master-canon/0001-project-constitution.md`](./master-canon/0001-project-constitution.md) · **Entity:** [`0002-entity-definition.md`](./master-canon/0002-entity-definition.md) · **Event:** [`0003-event-definition.md`](./master-canon/0003-event-definition.md) · **Component:** [`0004-component-definition.md`](./master-canon/0004-component-definition.md) · **Architektura (0005):** [`0005-architecture-layers.md`](./master-canon/0005-architecture-layers.md) · **Platforma (0006):** [`0006-platform-architecture.md`](./master-canon/0006-platform-architecture.md) · Mapa souladu: [`KANON_MIA_ALIGNMENT.md`](./KANON_MIA_ALIGNMENT.md) · plný kánon: [`KANON_MIA_AGENT.md`](./KANON_MIA_AGENT.md) · gift ekonomika: [`MIA_GIFT_ECONOMY.md`](./MIA_GIFT_ECONOMY.md).

Tento dokument nahrazuje zastaralé PDF souhrny, které uváděly Streamer.bot jako řídicí vrstvu nebo staré názvy scén.

---

## Co MIA je teď

MIA je **centrální AI mozek Stream Mode** — live reakce, gift ekonomika, Kojnožrout, overlaye, hlas, video, duely/arena.

Backend: **Node.js + Express** (`index.js` = tenký orchestrátor; runtime wiring přes 59× `MIA_*_HOST.js` + `MIA_*_CTX.js`).  
Render: **OBS** (browser sources, media inputs).  
**Streamer.bot se nepoužívá.**

```
TikFinity / Kick / …  →  MIA /ingest  →  normalize → shadow pipeline
                              → gift mapa / support / spam / ack
                              → overlay + TTS + video  →  OBS
```

Overlaye pollují `/overlay-state` (bez coins — jen **MIA body**).

---

## Architektura (platná)

| Vrstva | Role | Nesmí |
|--------|------|--------|
| Platforma (TikFinity…) | eventy na `/ingest` | rozhodovat, renderovat |
| **MIA** | AI, logika, gift mapa, duely, hosté, hlas scén | render |
| **OBS** | videa, overlaye, browser sources | business logika |

Hlavní gift scéna (provoz): **`SPINAK_ENGINE_GIFTS`**.  
AWAY / NEJSEM TU: host režim + `MIA_HOST_MODE` overlay + OBS Ninja embed 🟢 (virtuální svět 🔴).

---

## AI entity (Stream Mode)

| Entita | Role |
|--------|------|
| **MIA** | hlavní speaker, moderátor, režie OBS |
| **Kojnožrout** | pet/komunita — bowl, CARE, nálada, bond; defaultně ne hlavní hlas u běžného chatu |
| Response contract | `speech_text` ≠ `overlay_text`, stejný intent |

Speaker pořadí: intent guard → response contract → Koj avatar → MIA TTS → Koj voice.

---

## Gift mapa (centrální překladač)

Jediné místo sémantiky dárku: **`shared/gifts/`**

```
Gift event → resolveGift → tier, kategorie, priorita, care, bowl,
              video, overlay, hlas, XP, rewards → batoh, achievements
```

- Playback tier = `max(coinTier, katalogový tier)` (Lion může být T4 i za málo coinů).
- Overlay text a voice owner z mapy.
- Priorita ≥ 8 → vždy full ack + video; video fronta řadí podle priority.
- `rewards` → roll do batohu (`itemChanceByTier`, priorita ≥ 8 vždy).
- Public: `/overlay-state` → `giftMap` (bez coins).

Legacy `scripts/MIA_GIFT_MAP.js` = animační `giftProfile` (effectProgram), ne řídicí ekonomika.

---

## Tiering (coiny → stream)

| Tier | Coiny (celkem) | Poznámka |
|------|----------------|----------|
| T1 | 1–99 | běžné |
| T2 | 100–999 | lepší |
| T3 | 1000–4999 | velké |
| T4 | 5000–9999 | boss flash |
| T5 | 10000–24999 | mega boss |
| T6 | 25000+ | legenda (OBS video pool T5) |

**1 coin = 7.5 MIA bodů.** Overlay nikdy neukazuje coins.

Odděleně existuje **spam reward tier** (milestone vlny v MIA bodech, ne totéž co stream T2/T3) — viz audit v alignment.

---

## Spam a kontrola hluku — dva oddělené systémy

| # | Systém | Účel |
|---|--------|------|
| **1** | Community gift-wave (`engine_spam_session`) | vlna dárků → milestone odměna (`spamRewardTier`) — **pozitivní hra** |
| **2** | Per-user ack throttle (`MIA_USER_ACK_THROTTLE`) | stejný člověk nedostane díky / ahoj dokola — **anti-opakování** |

Další vrstvy: support reaction policy (velikost chatu), gift map merge, video priority queue.

**Per-user (2):** gift thanks ~20–90 s; greeting ~1.5–5 min; prázdný ping „mia/koj“ ~45–180 s; follow welcome ~5–15 min. Bypass u giftů: priorita ≥ 8, T3+, spam milestone. Bowl/Koj se krmí i při silent.

**Gift → CARE:** `giftCare` (LOVE/PET/HEAL/…) spouští lehkou CARE akci (podrbat, nakrmit, léčit…) — slabší než chat příkaz `péče`.

**AI paměť dárce:** po ≥3 giftech `getViewerMemory` personalizuje díky; katalogový overlay text ji **nepřepisuje**. Achievement unlock jde do `subtext` bubliny (zlatý styl v speech-overlay). LLM chat dostane jemný hint (favorite gift / feeder), bez coins.

**Diagnostika:** `GET /status` → `giftMap` (top viewři, achievements, lastMapping, userThrottle count) + `spam` (wave session).

**Tři druhy „T2“ (nesmí se plést):**

| Pole | Význam |
|------|--------|
| `coinTier` | jen z coinů eventů |
| `streamTier` / `obsTier` | playback = max(coin, katalog gift mapy) |
| `spamRewardTier` | milestone souční vlny (MIA body v okně 15 s) |

Default spam prahy (MIA body ≈ stream coin tiery × 7.5): T2=750 (~100 coins), T3=7500 (~1000), T4=37500 (~5000).

---

## Herní smyčka (divák)

Gift → miska (Koj) → občas item do batohu → občas hlas/video → při vlně spam milestone.

Koj: hlad, energie, bond, bowl %, care efekty z gift mapy.

Battle/arena: **sjednocené MIA body** napříč platformami (ne coins).

---

## Co je 🟢 / 🟡 / 🔴

| Oblast | Stav |
|--------|------|
| Stream Engine TikFinity → MIA → OBS | 🟢 |
| Bez Streamer.bot | 🟢 |
| Gift mapa enterprise (`shared/gifts/`) | 🟢 hotovo pro Stream Mode |
| Tier, overlay, voice, bowl, batoh, paměť, achievements (+ moment TTS/Koj) | 🟢 |
| Spam wave + per-user throttle (ahoj/ping/gift) | 🟢 |
| Gift → CARE akce + Koj `care_react` behavior | 🟢 |
| `/status` + `/gift-map/status` diagnostika | 🟢 |
| Body ≠ coins v overlay | 🟢 |
| Koj vitals, batoh, duely/arena | 🟢 |
| Per-tier video rotace | 🟢 |
| CARE chat (podrbat/nakrmit/…) + throttle + paměť feeder | 🟢 |
| Jednotná konfigurace (GAME_CONFIG vs tiers) | 🟢 `shared/stream_economy_config.json` |
| Session state machine PRELIVE → LIVE → ENDED | 🟢 `MIA_STREAM_SESSION.js` + `/stream/session` |
| Remote Dev Mode (telefon → fronta → watcher → Cursor) | 🟢 základ + watcher |
| **OBS live setup (přesný manifest)** | 🟢 [`docs/OBS_LIVE_SETUP.md`](OBS_LIVE_SETUP.md) · `npm run obs:manifest` |
| User Mode (osobní asistent) | 🔴 |
| Sociální síť / cross-post | 🔴 |
| Multi-tenant (tisíce streamerů) | 🔴 |
| STARK, combat shader, plný virtuální svět | 🔴 |

---

## Klíčové soubory

| Oblast | Cesta |
|--------|--------|
| Orchestrátor | `index.js` (bootstrap, `collect*BindingsHost` → `build*Host` → `build*Ctx`) |
| Runtime HOST moduly | `scripts/MIA_*_HOST.js` (59 wiring domén) |
| Gift mapa | `shared/gifts/` |
| Support / body | `scripts/MIA_SUPPORT_RESOLVER.js`, `MIA_GIFT_TIERS.js` |
| Spam | `MIA_NEXT/engine_spam_session.js` |
| Ack / hlas giftů | `scripts/MIA_SUPPORT_REACTION_POLICY.js` |
| Video | `scripts/MIA_VIDEO_ENGINE.js` |
| Batoh | `scripts/MIA_KOJNOZROUT_BACKPACK.js` |
| Overlay state | `scripts/MIA_OVERLAY_STATE_RUNTIME.js` · `/overlay-state` |

---

## Stabilizace

```powershell
npm run smoke:live          # live checklist (MIA musí běžet)
npm run audit:live          # alias
npm run test:preflight:fast
npm run test:gift-map
npm run gift-map:audit-logs   # logy → kolik jmen padá do GENERIC
node tests/speaker_routing_contract.js
node tests/video_timing_contract.js
```

**Live smoke checklist** (`smoke:live`) ověří po startu:
- `/health`, `/status`, `/gift-map/status`
- test gift ingest → `lastMapping`
- CARE chat (`podrbi kojnozouta`)
- remote-dev status
- TTS, video T1, OBS vrstvy

Smoke: `http://127.0.0.1:3000/tts/test` · `http://127.0.0.1:3000/video/test?tier=T1`  
Gift mapa: `http://127.0.0.1:3000/gift-map/status` · `http://127.0.0.1:3000/status` → `giftMap` + `streamSession`

Ekonomika (tiery, spam wave, throttle): `shared/stream_economy_config.json`

---

## MIA Graphics Studio (2D Content Studio — Phase 12+)

Vize a agent API: [`MIA_GRAPHICS_STUDIO.md`](./MIA_GRAPHICS_STUDIO.md)

Editor obrázků → animace → video → AI studio řízené MIA. **MIA nekliká** — posílá pipeline příkazy:

```http
POST /mia/graphics/pipeline
GET  /mia/graphics/catalog
GET  /mia/graphics/body/state
POST /mia/graphics/body/preview
```

**Graphics Body (OBS):** split vrstvy `MIA_HEAD`…`MIA_TORSO` — defaultně skryté; dedicated PNG v `assets/mia/parts/`; hybrid sync. Bootstrap: `npm run build:mia-body-parts` · `npm run obs:apply-hands` · go-live: `npm run obs:stream-ready -- --fix --wait` · test: `npm run test:graphics-body`.

---

## MIA Paint (dev nástroj — mimo live tok)

Vlastní 2D editor pro Koj asset pipeline — **neúčastní se** TikFinity → shadow → OBS cesty za běhu streamu.

| Oblast | Cesta |
|--------|--------|
| Editor UI | `http://127.0.0.1:3000/mia-paint/` |
| Agent API | `GET /mia/paint/status` · `POST /mia/paint/command` · `GET /mia/paint/agent/snapshot` |
| Live sync | `ws://127.0.0.1:3000/mia/paint/ws` (localhost) |
| Export Koj | `export_koj_factory` → `mia-output-overlay/assets/kojnozrout/custom/` |
| Testy | `npm run test:mia-paint` · preflight `mia_paint_integration` · live `npm run paint:smoke` |
| Native shell | `npm run paint:tauri` (Tauri 2) · fallback `npm run paint:shell` |
| Architektura | `docs/MIA_2D_EDITOR_ARCHITECTURE.md` (Phases 0–11 ✅) |

Remote Dev z telefonu: „otestuj paint“, „stav paint“, „otevři paint editor“.
