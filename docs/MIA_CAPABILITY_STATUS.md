# MIA ù Stav schopnostù a audit

**Datum auditu:** 2026-07-24 (ve?ernù b?h ~21:15 CEST)  
**Repo:** `C:\MIA`  
**Mega audit:** [`MIA_MEGA_AUDIT_2026-07-24.md`](./MIA_MEGA_AUDIT_2026-07-24.md)  
**HEAD:** `148721df` ù `docs: add MIA capability status inventory (2026-07-24 audit)`

---

## RC freeze ù stream release candidate (2026-07-24)

**Verdikt:** MIA je prvnù skute?nù **stream release candidate**. Technicky uloùenù (GitHub Private + SSH), tag `v0.1-stream-core`, testy **157/157**.

**Pravidlo:** **ùùdnù velkù featury** dokud neprojde **R1-C v OBS** (10-krokovù checklist v [`MIA_GRAPHICS_R1_STATUS.md`](./MIA_GRAPHICS_R1_STATUS.md) ù R1-C).

| Blokovùno do R1-C | Po R1-C PASS |
|-------------------|--------------|
| Tag `v0.1.1-graphics` | Commit + tag + push |
| Engine 2.0 wiring | Prvnù blok: GameState, VisibilityEngine, PlatformProjection, PlatformRenderer |
| Poker / pluginy / big-bang split | Stùle mimo scope |

Plùn krok?: [`MIA_RC_NEXT_STEPS.md`](./MIA_RC_NEXT_STEPS.md) ù vùsledek OBS: [`MIA_R1C_OBS_RESULT.md`](./MIA_R1C_OBS_RESULT.md).

---

## 1. Vùsledky audit test?

| P?ùkaz | Exit | Vùsledek |
|--------|------|----------|
| `node --check index.js` | **0** | **PASS** |
| `npm run test:preflight:fast` | **0** | **PASS ù 157 / 157** (0 failed) |

**Dokon?eno (UTC):** `2026-07-24T19:15:00.653Z` ù runtime ~4 min

### Delùù testovù sady (existujù, neblokujù tento audit)

| Skript | Popis |
|--------|--------|
| `npm run test:preflight` | Full preflight ù zahrnuje slow testy (video rotace, media catalog, sprint3ù6, ù) |
| `npm run test:smoke` | Velkù smoke ?et?zec (ingest, overlay, TTS, Koj, LLM hybrid, ù) |
| `npm run test:canon` / `test:master-canon` | 87 master-canon contract? ù v `--fast` p?esko?eno |
| `npm run test:graphics-body` | Graphics studio body testy (~2 min, v fast b?hu zahrnuto) |
| `npm run test:animation-engine` | Animation bank + timeline fùze 15ù22 |
| `npm run test:mia-paint` | MIA Paint + graphics studio contracty |

V `--fast` reùimu jsou p?esko?eny mj.: `media_catalog`, `video_rotation`, `video_timing`, `gift_visual`, `obs_persistent_layers`, `away_host_mode`, `master_canon_0001`ù`0087`, sprint3ù6.

---

## 2. Co MIA Mù (infrastruktura)

| Poloùka | Stav |
|---------|------|
| **GitHub repo** | Private (operùtor potvrdil 2026-07-24) |
| **Remote** | `git@github.com:vrtyland-sketch/MIA.git` (SSH) |
| **V?tev** | `master` ù sync s `origin/master` |
| **Tag `v0.1-stream-core`** | `70b3e859` ù rollback checkpoint p?ed Engine 2.0 wiring |
| **Backup v?tev** | `backup/pre-github-full` ù **jen lokùln?**, nepushovat |
| **Dokumentace** | Mega audit, R1 status, DoD checklisty, Engine 2.0 roadmap, kùnon alignment |
| **Cursor guardrails** | `.cursor/rules/mia-guardrails.mdc`, `mia-canon.mdc` |
| **Test harness** | `scripts/run_preflight_tests.js` (fast/full), 150+ contract soubor? |
| **OBS tooling** | `obs:refresh-overlays`, `obs:stream-ready`, `obs:prep-stream`, hands/arena skripty |
| **Runtime data** | `data/*.json` ù live stav, **necommitovat** |

### Dirty tree (zùm?rn? mimo git)

- Modifikovanù: `data/*.json` (gift-map, koj state, session memory, ù)
- Untracked: `_canon_import/`, `shared/mia-*-core/` (87 modul?), `docs/master-canon/`, export docs
- **Pravidlo:** live data a secrets do commit? nepat?ù

---

## 3. Co MIA UMù ù schopnosti podle oblastù

Legenda: **ON** = aktivnù ve vùchozùm stream reùimu ù **OFF** = vypnuto / stub ù **?ùste?n?** = kùd existuje, gate otev?enù

### 3.1 Stream ingest

| Schopnost | Stav | Poznùmka |
|-----------|------|----------|
| TikFinity ? MIA ingest | **ON** | Hlavnù platforma; architektura TikFinity ? MIA ? OBS |
| Kick bridge | **ON** | Platform bridges v preflight |
| Twitch bridge | **?ùste?n?** | Skripty `twitch:login/probe/status` ù volitelnù |
| Telegram bridge | **?ùste?n?** | Contract testy; setup hint |
| Event normalizer (F1) | **ON** | Phase 1 contracty green |
| Runtime watchdog / replay | **ON** | `npm run replay`, phase1 contracts |
| Remote dev (Tailscale) | **?ùste?n?** | Skripty + contracty; volitelnù nasazenù |

### 3.2 OBS overlaye

| Schopnost | Stav | Poznùmka |
|-----------|------|----------|
| Speech hologram + bublina | **ON** | `speech-overlay.html?v=36-koj-unify` |
| Koj runtime (split) | **ON** | `kojnozrout-runtime.html` + split libs `49-r1-milestone-polish` |
| Bowl overlay | **ON** | `36-koj-unify` |
| Gift animation overlay | **ON** | `37-stream-polish` ù idle pr?hlednù, T4 stage |
| Viewer strip / avatar chips | **ON** | Skrytù p?i milestone speech (fix `f5b4eddc`) |
| OBS WebSocket sync | **ON** | obs-websocket-js, bootstrap/sync contracty |
| Body-parts (MIA_HEADùFEET) | **OFF** | Zùm?rn? skrytù ù audit v refresh JSON |
| Away host mode | **OFF/stub** | Slow test p?esko?en v fast |
| `obs:refresh-overlays` | **ON** | Manifest-driven cache bust |

### 3.3 Graphics / Koj / MIA vizuùl

| Schopnost | Stav | Poznùmka |
|-----------|------|----------|
| Koj mood / scene / pose engine | **ON** | Split runtime: scene, pose, stage, belly, fx |
| Combo moment + spam wave HUD | **ON** | Belly progress, stage t?ùdy combo/spam-wave/pulse |
| Party scene fallback | **ON** | P?i combo/wave |
| Tech-energy hype (Koj + speech + gift) | **ON** | R1 slice 6ù10 |
| Duel / battle / walk CSS polish | **ON** | Soft Neon purple rim, walk shadow |
| Milestone speech gesture | **ON** | Krùtkù hand gesture, bez wave flop (`f5b4eddc`) |
| MIA Paint / Graphics Studio | **?ùste?n?** | Browser + Tauri shell; contracty green, ne stream core |
| Animation bank / timeline editor | **?ùste?n?** | Production gate testy; mimo live stream path |
| Battle/duel/walk art pass | **LOW backlog** | CSS/runtime hotovo; art gap otev?enù |
| Freeze baseline | **32-gfx-whole** | Nem?nit ù referen?nù checkpoint |

### 3.4 Gifts

| Schopnost | Stav | Poznùmka |
|-----------|------|----------|
| Gift map + tier routing | **ON** | Gift map contracty |
| Per-tier video rotace | **ON** | `rotationIndexByTier` ù bez resetu tier indexu |
| Gift present / thanks (miaPoints) | **ON** | Bez coin/value na overlayi |
| Achievement moments | **ON** | Contract green |
| User ack throttle | **ON** | Anti-spam |
| Gift animation bank override | **?ùste?n?** | Slow test `gift_visual` mimo fast |
| Storyboard (Universe/Galaxy/Rose) | **ON** | Post-DoD slice |

### 3.5 Chat / Speech

| Schopnost | Stav | Poznùmka |
|-----------|------|----------|
| Direct chat intelligence | **ON** | Contract + smoke |
| TTS (edge-tts) + overlay queue | **ON** | Voice priority, speaker routing |
| Single voice (vùchozù) | **ON** | `MIA_DUAL_VOICE` unset / `0` |
| Dual voice (Koj companion TTS) | **OFF** | Zapnutù: `MIA_DUAL_VOICE=1` |
| LLM hybrid responses | **ON** | Smoke test |
| Session memory | **ON** | Contract green |
| Emotion / grief text banks | **ON** | Coverage contracty |
| Ucho (manuùlnù poslech) | **? OPEN** | Prestream DoD backlog |

### 3.6 Memory / Viewer

| Schopnost | Stav | Poznùmka |
|-----------|------|----------|
| Viewer memory (phase 2) | **ON** | Contract |
| Viewer inventory | **?ùste?n?** | Data soubor untracked; logika v runtime |
| Story memory | **ON** | Persist v `data/story-memory.json` |
| Chat lexicon | **ON** | `data/mia-chat-lexicon.json` |

### 3.7 Battle / Economy / Inventory

| Schopnost | Stav | Poznùmka |
|-----------|------|----------|
| Platform arena | **ON** | Contract + demo skripty |
| Koj vitals / duel | **ON** | Vitals-duel contracty |
| Battle choreography (2D) | **ON** | Factory + FX contracty |
| Battle OBS demo | **ON** | `battle:demo` skripty |
| Duel cross-stream sync | **ON** | Contract (design/test level) |
| Gift economy (miaPoints) | **ON** | Bez expozice coin? |
| Ecosystem orchestrator | **ON** | Contract |
| Poker / Monopoly hry | **OFF ù design only** | Engine 2.0 roadmap; ùùdnù shipped kùd |
| Cross-platform publishing | **OFF ù design only** | Kùnon agent doc; neimplementovùno |

### 3.8 Admin

| Schopnost | Stav | Poznùmka |
|-----------|------|----------|
| `/mia-admin` dashboard | **ON** | Fùze 4 status |
| Admin test T1ùT4 / bowl / battle | **ON** | API smoke |
| Action Queue toggle | **ON** | Admin ON/OFF/Flush |
| Theme Manager | **OFF default** | Thin MVP; CSS vars jen p?i flag ON |
| Storyboard admin | **ON** | Phase 2 contract |
| Spam hype operator row | **ON** | Dashboard wave/pulse/urgent % |

### 3.9 Engine 2.0

| Schopnost | Stav | Poznùmka |
|-----------|------|----------|
| Architektura + roadmap | **DONE (docs)** | `MIA_ENGINE_2_0_*.md` |
| Scaffold `engine2/` | **STUB OFF** | GameState stub + OBS boundary README |
| `MIA_ENGINE2_STUB` | **OFF** | Nep?ipojeno v `index.js` |
| `shared/mia-*-core/` (87 modul?) | **Untracked** | P?ipraveno k budoucùmu importu |
| E1 wiring (GameState + OBS) | **? BLOCKED** | Po R1-C gate |

### 3.10 Pluginy

| Schopnost | Stav | Poznùmka |
|-----------|------|----------|
| Plugin loader | **OFF ù design only** | Phase E4 v roadmap? |
| Poker plugin | **OFF ù design only** | Adresù?ovù struktura v arch doc |
| Monopoly plugin | **OFF ù design only** | Adresù?ovù struktura v arch doc |
| MIA Paint plugin surface | **?ùste?n?** | Paint contracty; ne live stream plugin |

---

## 4. Guardrails (tvrdù pravidla)

| Pravidlo | Ov??enù |
|----------|---------|
| TikFinity ? MIA ? OBS (OBS jen renderuje) | Architektura + contracty |
| Overlay public API: **jen `miaPoints`** ù ùùdnù coins/gift value | `overlay_public_response_contract`, `mia_graphics_r1_contract` |
| Dual voice **default OFF** | `MIA_DUAL_VOICE.js`, Live DoD |
| Gift video rotace per-tier (`rotationIndexByTier`, bez resetu) | R1 contracty + R1-C manuùl |
| Action Queue **default OFF** | Kill switch `MIA_ACTION_QUEUE=0` |
| Engine 2.0 stub **default OFF** | `mia_engine2_roadmap_contract` |
| ùùdnù big-bang split `index.js` | Roadmap Phase E5 |
| ùùdnù force-push na `master` | Migration audit |
| Live `data/` a secrets mimo git | Dirty tree policy |

---

## 5. Graphics cache bust ù aktuùlnù vrstvy

| Vrstva | Bust | Soubory |
|--------|------|---------|
| Freeze baseline | `32-gfx-whole` | Referen?nù checkpoint ù nem?nit |
| Speech / bowl / manifest OBS URL | `36-koj-unify` | `GFX_CACHE_BUST` v manifestu |
| Gift overlay / desk | `37-stream-polish` | `GIFT_ANIM_CACHE_BUST` |
| Koj runtime HTML + split libs | `49-r1-milestone-polish` | `KOJ_SPLIT_CACHE_BUST` |

**Dual-bust invariant:** manifest OBS URL pro speech/bowl z?stùvajù na `36`; split runtime libs na `49`. Po deploy: `npm run obs:refresh-overlays`.

---

## 6. Otev?enù brùny (human gates)

| Gate | Stav | Akce |
|------|------|------|
| **R1-C OBS manual** | **? OPEN** | Jedna plnù OBS session ù checklist v [`MIA_GRAPHICS_R1_STATUS.md`](./MIA_GRAPHICS_R1_STATUS.md) ù R1-C |
| **Tag `v0.1.1-graphics`** | **?ekù na R1-C** | Nepushovat p?ed stream sign-off |
| **Ucho (poslech)** | **? OPEN** | Manuùlnù prestream check |
| **Private API spot-check** | Volitelnù | Pokud API stùle ukazuje public, ov??it Settings |
| **Canon import commit** | Plùnovùno | `_canon_import/`, `shared/mia-*-core/` ù samostatnù commit |
| **E1 Engine 2.0 wiring** | Blocked | Aù po R1-C |

### R1-C checklist (10 krok? ó exact)

1. Spustit b?ûn˝ runtime
2. Ov??it speech overlay `36`
3. Ov??it gift overlay `37`
4. Ov??it Kojnoûrout `49-r1-milestone-polish`
5. Poslat testovacÌ chat
6. Poslat mal˝, st?ednÌ a velk˝ gift
7. Ov??it combo/spam HUD
8. Ov??it bowl, invent·? a battle obraz
9. Poslechnout oba hlasy uchem
10. Zkontrolovat, ûe nic nenÌ o?ÌznutÈ, skrytÈ nebo p?es sebe

äablona v˝sledku: [`MIA_R1C_OBS_RESULT.md`](./MIA_R1C_OBS_RESULT.md) ∑ pl·n: [`MIA_RC_NEXT_STEPS.md`](./MIA_RC_NEXT_STEPS.md).

---

## 7. Nedùvnù opravy

### `f5b4eddc` ù milestone speech + avatary (2026-07-24)

- Potla?enù wave flop animace b?hem milestone speech
- Skrytù avatar chips ve viewer strip overlay p?i milestone speech
- Krùtkù hand gesture mùsto dlouhù wave
- Rozùù?enù `koj-runtime-scene.js`, `koj-runtime-pose.js`, `viewer-strip-overlay.html`
- Novù/rozùù?enù contracty: `kojnozout_display_mood`, runtime split, graphics R1

### Graphics day R1 (11 slices)

- Combo/spam wave belly HUD, tech-energy hype, speech holo parity
- Gift overlay tech sparks, dashboard spam hype row
- Duel/battle/walk CSS polish (slice 11)
- Detail: [`MIA_GRAPHICS_DAYLOG.md`](./MIA_GRAPHICS_DAYLOG.md)

---

## 8. DoD skùre (poslednù zùznamy)

| Checklist | Skùre | Datum |
|-----------|-------|-------|
| Prestream DoD | ~94 % | 2026-07-21 |
| Live DoD | ~91 % ? ~94 % | 2026-07-20/21 |
| Preflight fast (tento audit) | **100 %** (157/157) | 2026-07-24 |

Otev?enù poloùky: ucho, R1-C OBS, zbùvajùcù dirty tree dùvky.

---

## 9. Rychlù p?ùkazy

```powershell
cd C:\MIA
node --check index.js
npm run test:preflight:fast
npm run obs:refresh-overlays
npm start
```

---

*Generovùno pro capability audit ù docs-only; bez zm?n runtime nebo live dat.*
