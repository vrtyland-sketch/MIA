# MIA — Stav schopností a audit

**Datum auditu:** 2026-07-24 (ve?erní b?h ~21:15 CEST)  
**Repo:** `C:\MIA`  
**Mega audit:** [`MIA_MEGA_AUDIT_2026-07-24.md`](./MIA_MEGA_AUDIT_2026-07-24.md)  
**HEAD:** `f5b4eddc` — `fix(koj): suppress wave + hide avatar chips at milestone speech`

---

## 1. Výsledky audit test?

| P?íkaz | Exit | Výsledek |
|--------|------|----------|
| `node --check index.js` | **0** | **PASS** |
| `npm run test:preflight:fast` | **0** | **PASS — 157 / 157** (0 failed) |

**Dokon?eno (UTC):** `2026-07-24T19:15:00.653Z` · runtime ~4 min

### Delší testové sady (existují, neblokují tento audit)

| Skript | Popis |
|--------|--------|
| `npm run test:preflight` | Full preflight — zahrnuje slow testy (video rotace, media catalog, sprint3–6, …) |
| `npm run test:smoke` | Velký smoke ?et?zec (ingest, overlay, TTS, Koj, LLM hybrid, …) |
| `npm run test:canon` / `test:master-canon` | 87 master-canon contract? — v `--fast` p?esko?eno |
| `npm run test:graphics-body` | Graphics studio body testy (~2 min, v fast b?hu zahrnuto) |
| `npm run test:animation-engine` | Animation bank + timeline fáze 15–22 |
| `npm run test:mia-paint` | MIA Paint + graphics studio contracty |

V `--fast` režimu jsou p?esko?eny mj.: `media_catalog`, `video_rotation`, `video_timing`, `gift_visual`, `obs_persistent_layers`, `away_host_mode`, `master_canon_0001`–`0087`, sprint3–6.

---

## 2. Co MIA MÁ (infrastruktura)

| Položka | Stav |
|---------|------|
| **GitHub repo** | Private (operátor potvrdil 2026-07-24) |
| **Remote** | `git@github.com:vrtyland-sketch/MIA.git` (SSH) |
| **V?tev** | `master` — sync s `origin/master` |
| **Tag `v0.1-stream-core`** | `70b3e859` — rollback checkpoint p?ed Engine 2.0 wiring |
| **Backup v?tev** | `backup/pre-github-full` — **jen lokáln?**, nepushovat |
| **Dokumentace** | Mega audit, R1 status, DoD checklisty, Engine 2.0 roadmap, kánon alignment |
| **Cursor guardrails** | `.cursor/rules/mia-guardrails.mdc`, `mia-canon.mdc` |
| **Test harness** | `scripts/run_preflight_tests.js` (fast/full), 150+ contract soubor? |
| **OBS tooling** | `obs:refresh-overlays`, `obs:stream-ready`, `obs:prep-stream`, hands/arena skripty |
| **Runtime data** | `data/*.json` — live stav, **necommitovat** |

### Dirty tree (zám?rn? mimo git)

- Modifikované: `data/*.json` (gift-map, koj state, session memory, …)
- Untracked: `_canon_import/`, `shared/mia-*-core/` (87 modul?), `docs/master-canon/`, export docs
- **Pravidlo:** live data a secrets do commit? nepat?í

---

## 3. Co MIA UMÍ — schopnosti podle oblastí

Legenda: **ON** = aktivní ve výchozím stream režimu · **OFF** = vypnuto / stub · **?áste?n?** = kód existuje, gate otev?ený

### 3.1 Stream ingest

| Schopnost | Stav | Poznámka |
|-----------|------|----------|
| TikFinity ? MIA ingest | **ON** | Hlavní platforma; architektura TikFinity ? MIA ? OBS |
| Kick bridge | **ON** | Platform bridges v preflight |
| Twitch bridge | **?áste?n?** | Skripty `twitch:login/probe/status` — volitelný |
| Telegram bridge | **?áste?n?** | Contract testy; setup hint |
| Event normalizer (F1) | **ON** | Phase 1 contracty green |
| Runtime watchdog / replay | **ON** | `npm run replay`, phase1 contracts |
| Remote dev (Tailscale) | **?áste?n?** | Skripty + contracty; volitelné nasazení |

### 3.2 OBS overlaye

| Schopnost | Stav | Poznámka |
|-----------|------|----------|
| Speech hologram + bublina | **ON** | `speech-overlay.html?v=36-koj-unify` |
| Koj runtime (split) | **ON** | `kojnozrout-runtime.html` + split libs `49-r1-milestone-polish` |
| Bowl overlay | **ON** | `36-koj-unify` |
| Gift animation overlay | **ON** | `37-stream-polish` — idle pr?hledný, T4 stage |
| Viewer strip / avatar chips | **ON** | Skrytí p?i milestone speech (fix `f5b4eddc`) |
| OBS WebSocket sync | **ON** | obs-websocket-js, bootstrap/sync contracty |
| Body-parts (MIA_HEAD…FEET) | **OFF** | Zám?rn? skryté — audit v refresh JSON |
| Away host mode | **OFF/stub** | Slow test p?esko?en v fast |
| `obs:refresh-overlays` | **ON** | Manifest-driven cache bust |

### 3.3 Graphics / Koj / MIA vizuál

| Schopnost | Stav | Poznámka |
|-----------|------|----------|
| Koj mood / scene / pose engine | **ON** | Split runtime: scene, pose, stage, belly, fx |
| Combo moment + spam wave HUD | **ON** | Belly progress, stage t?ídy combo/spam-wave/pulse |
| Party scene fallback | **ON** | P?i combo/wave |
| Tech-energy hype (Koj + speech + gift) | **ON** | R1 slice 6–10 |
| Duel / battle / walk CSS polish | **ON** | Soft Neon purple rim, walk shadow |
| Milestone speech gesture | **ON** | Krátké hand gesture, bez wave flop (`f5b4eddc`) |
| MIA Paint / Graphics Studio | **?áste?n?** | Browser + Tauri shell; contracty green, ne stream core |
| Animation bank / timeline editor | **?áste?n?** | Production gate testy; mimo live stream path |
| Battle/duel/walk art pass | **LOW backlog** | CSS/runtime hotovo; art gap otev?ený |
| Freeze baseline | **32-gfx-whole** | Nem?nit — referen?ní checkpoint |

### 3.4 Gifts

| Schopnost | Stav | Poznámka |
|-----------|------|----------|
| Gift map + tier routing | **ON** | Gift map contracty |
| Per-tier video rotace | **ON** | `rotationIndexByTier` — bez resetu tier indexu |
| Gift present / thanks (miaPoints) | **ON** | Bez coin/value na overlayi |
| Achievement moments | **ON** | Contract green |
| User ack throttle | **ON** | Anti-spam |
| Gift animation bank override | **?áste?n?** | Slow test `gift_visual` mimo fast |
| Storyboard (Universe/Galaxy/Rose) | **ON** | Post-DoD slice |

### 3.5 Chat / Speech

| Schopnost | Stav | Poznámka |
|-----------|------|----------|
| Direct chat intelligence | **ON** | Contract + smoke |
| TTS (edge-tts) + overlay queue | **ON** | Voice priority, speaker routing |
| Single voice (výchozí) | **ON** | `MIA_DUAL_VOICE` unset / `0` |
| Dual voice (Koj companion TTS) | **OFF** | Zapnutí: `MIA_DUAL_VOICE=1` |
| LLM hybrid responses | **ON** | Smoke test |
| Session memory | **ON** | Contract green |
| Emotion / grief text banks | **ON** | Coverage contracty |
| Ucho (manuální poslech) | **? OPEN** | Prestream DoD backlog |

### 3.6 Memory / Viewer

| Schopnost | Stav | Poznámka |
|-----------|------|----------|
| Viewer memory (phase 2) | **ON** | Contract |
| Viewer inventory | **?áste?n?** | Data soubor untracked; logika v runtime |
| Story memory | **ON** | Persist v `data/story-memory.json` |
| Chat lexicon | **ON** | `data/mia-chat-lexicon.json` |

### 3.7 Battle / Economy / Inventory

| Schopnost | Stav | Poznámka |
|-----------|------|----------|
| Platform arena | **ON** | Contract + demo skripty |
| Koj vitals / duel | **ON** | Vitals-duel contracty |
| Battle choreography (2D) | **ON** | Factory + FX contracty |
| Battle OBS demo | **ON** | `battle:demo` skripty |
| Duel cross-stream sync | **ON** | Contract (design/test level) |
| Gift economy (miaPoints) | **ON** | Bez expozice coin? |
| Ecosystem orchestrator | **ON** | Contract |
| Poker / Monopoly hry | **OFF — design only** | Engine 2.0 roadmap; žádný shipped kód |
| Cross-platform publishing | **OFF — design only** | Kánon agent doc; neimplementováno |

### 3.8 Admin

| Schopnost | Stav | Poznámka |
|-----------|------|----------|
| `/mia-admin` dashboard | **ON** | Fáze 4 status |
| Admin test T1–T4 / bowl / battle | **ON** | API smoke |
| Action Queue toggle | **ON** | Admin ON/OFF/Flush |
| Theme Manager | **OFF default** | Thin MVP; CSS vars jen p?i flag ON |
| Storyboard admin | **ON** | Phase 2 contract |
| Spam hype operator row | **ON** | Dashboard wave/pulse/urgent % |

### 3.9 Engine 2.0

| Schopnost | Stav | Poznámka |
|-----------|------|----------|
| Architektura + roadmap | **DONE (docs)** | `MIA_ENGINE_2_0_*.md` |
| Scaffold `engine2/` | **STUB OFF** | GameState stub + OBS boundary README |
| `MIA_ENGINE2_STUB` | **OFF** | Nep?ipojeno v `index.js` |
| `shared/mia-*-core/` (87 modul?) | **Untracked** | P?ipraveno k budoucímu importu |
| E1 wiring (GameState + OBS) | **? BLOCKED** | Po R1-C gate |

### 3.10 Pluginy

| Schopnost | Stav | Poznámka |
|-----------|------|----------|
| Plugin loader | **OFF — design only** | Phase E4 v roadmap? |
| Poker plugin | **OFF — design only** | Adresá?ová struktura v arch doc |
| Monopoly plugin | **OFF — design only** | Adresá?ová struktura v arch doc |
| MIA Paint plugin surface | **?áste?n?** | Paint contracty; ne live stream plugin |

---

## 4. Guardrails (tvrdá pravidla)

| Pravidlo | Ov??ení |
|----------|---------|
| TikFinity ? MIA ? OBS (OBS jen renderuje) | Architektura + contracty |
| Overlay public API: **jen `miaPoints`** — žádné coins/gift value | `overlay_public_response_contract`, `mia_graphics_r1_contract` |
| Dual voice **default OFF** | `MIA_DUAL_VOICE.js`, Live DoD |
| Gift video rotace per-tier (`rotationIndexByTier`, bez resetu) | R1 contracty + R1-C manuál |
| Action Queue **default OFF** | Kill switch `MIA_ACTION_QUEUE=0` |
| Engine 2.0 stub **default OFF** | `mia_engine2_roadmap_contract` |
| Žádný big-bang split `index.js` | Roadmap Phase E5 |
| Žádný force-push na `master` | Migration audit |
| Live `data/` a secrets mimo git | Dirty tree policy |

---

## 5. Graphics cache bust — aktuální vrstvy

| Vrstva | Bust | Soubory |
|--------|------|---------|
| Freeze baseline | `32-gfx-whole` | Referen?ní checkpoint — nem?nit |
| Speech / bowl / manifest OBS URL | `36-koj-unify` | `GFX_CACHE_BUST` v manifestu |
| Gift overlay / desk | `37-stream-polish` | `GIFT_ANIM_CACHE_BUST` |
| Koj runtime HTML + split libs | `49-r1-milestone-polish` | `KOJ_SPLIT_CACHE_BUST` |

**Dual-bust invariant:** manifest OBS URL pro speech/bowl z?stávají na `36`; split runtime libs na `49`. Po deploy: `npm run obs:refresh-overlays`.

---

## 6. Otev?ené brány (human gates)

| Gate | Stav | Akce |
|------|------|------|
| **R1-C OBS manual** | **? OPEN** | Jedna plná OBS session — checklist v [`MIA_GRAPHICS_R1_STATUS.md`](./MIA_GRAPHICS_R1_STATUS.md) § R1-C |
| **Tag `v0.1.1-graphics`** | **?eká na R1-C** | Nepushovat p?ed stream sign-off |
| **Ucho (poslech)** | **? OPEN** | Manuální prestream check |
| **Private API spot-check** | Volitelné | Pokud API stále ukazuje public, ov??it Settings |
| **Canon import commit** | Plánováno | `_canon_import/`, `shared/mia-*-core/` — samostatný commit |
| **E1 Engine 2.0 wiring** | Blocked | Až po R1-C |

### R1-C checklist (zkráceno)

1. Start server — `node index.js` / `npm start`
2. Na?íst overlaye v OBS (Koj runtime 49, speech/bowl 36, gift 37)
3. Trigger combo/wave (gifts / spam session)
4. Belly HUD — progress, countdown, **bez** coin/value
5. **PASS:** party scene, mood/FX b?hem gift anim, rotace per-tier beze zm?ny

---

## 7. Nedávné opravy

### `f5b4eddc` — milestone speech + avatary (2026-07-24)

- Potla?ení wave flop animace b?hem milestone speech
- Skrytí avatar chips ve viewer strip overlay p?i milestone speech
- Krátké hand gesture místo dlouhé wave
- Rozší?ení `koj-runtime-scene.js`, `koj-runtime-pose.js`, `viewer-strip-overlay.html`
- Nové/rozší?ené contracty: `kojnozout_display_mood`, runtime split, graphics R1

### Graphics day R1 (11 slices)

- Combo/spam wave belly HUD, tech-energy hype, speech holo parity
- Gift overlay tech sparks, dashboard spam hype row
- Duel/battle/walk CSS polish (slice 11)
- Detail: [`MIA_GRAPHICS_DAYLOG.md`](./MIA_GRAPHICS_DAYLOG.md)

---

## 8. DoD skóre (poslední záznamy)

| Checklist | Skóre | Datum |
|-----------|-------|-------|
| Prestream DoD | ~94 % | 2026-07-21 |
| Live DoD | ~91 % ? ~94 % | 2026-07-20/21 |
| Preflight fast (tento audit) | **100 %** (157/157) | 2026-07-24 |

Otev?ené položky: ucho, R1-C OBS, zbývající dirty tree dávky.

---

## 9. Rychlé p?íkazy

```powershell
cd C:\MIA
node --check index.js
npm run test:preflight:fast
npm run obs:refresh-overlays
npm start
```

---

*Generováno pro capability audit — docs-only; bez zm?n runtime nebo live dat.*
