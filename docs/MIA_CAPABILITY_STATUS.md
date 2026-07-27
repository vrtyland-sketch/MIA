# MIA � Stav schopnost� a audit

**Datum auditu:** 2026-07-26 (regression follow-up po Kick fix)  
**Repo:** `C:\MIA`  
**Mega audit:** [`MIA_MEGA_AUDIT_2026-07-24.md`](./MIA_MEGA_AUDIT_2026-07-24.md)  
**Gap analysis:** [`MIA_REGRESSION_GAP_ANALYSIS_2026-07-26.md`](./MIA_REGRESSION_GAP_ANALYSIS_2026-07-26.md)  
**HEAD (Kick fix):** `ca80eae7`

---

## RC freeze � stream release candidate (2026-07-24)

**Verdikt:** MIA je prvn� skute?n� **stream release candidate**. Technicky ulo�en� (GitHub Private + SSH), tag `v0.1-stream-core`, testy **157/157**.

**Pravidlo:** **��dn� velk� featury** dokud neprojde **R1-C v OBS** (10-krokov� checklist v [`MIA_GRAPHICS_R1_STATUS.md`](./MIA_GRAPHICS_R1_STATUS.md) � R1-C).

| Blokov�no do R1-C | Po R1-C PASS |
|-------------------|--------------|
| Tag `v0.1.1-graphics` | ✅ 2026-07-26 |
| Engine 2.0 wiring | Prvn� blok: GameState, VisibilityEngine, PlatformProjection, PlatformRenderer |
| Poker / pluginy / big-bang split | St�le mimo scope |

Pl�n krok?: [`MIA_RC_NEXT_STEPS.md`](./MIA_RC_NEXT_STEPS.md) � v�sledek OBS: [`MIA_R1C_OBS_RESULT.md`](./MIA_R1C_OBS_RESULT.md).

---

## 1. V�sledky audit test?

| P?�kaz | Exit | V�sledek |
|--------|------|----------|
| `node --check index.js` | **0** | **PASS** |
| `npm run test:preflight:fast` | **0** | **PASS � 159 / 159** (0 failed) |

**Dokon?eno (UTC):** `2026-07-26` � po Kick fix + env_wiring hardening

### Del�� testov� sady (existuj�, neblokuj� tento audit)

| Skript | Popis |
|--------|--------|
| `npm run test:preflight` | Full preflight � zahrnuje slow testy (video rotace, media catalog, sprint3�6, �) |
| `npm run test:smoke` | Velk� smoke ?et?zec (ingest, overlay, TTS, Koj, LLM hybrid, �) |
| `npm run test:canon` / `test:master-canon` | 87 master-canon contract? � v `--fast` p?esko?eno |
| `npm run test:graphics-body` | Graphics studio body testy (~2 min, v fast b?hu zahrnuto) |
| `npm run test:animation-engine` | Animation bank + timeline f�ze 15�22 |
| `npm run test:mia-paint` | MIA Paint + graphics studio contracty |

V `--fast` re�imu jsou p?esko?eny mj.: `media_catalog`, `video_rotation`, `video_timing`, `gift_visual`, `obs_persistent_layers`, `away_host_mode`, `master_canon_0001`�`0087`, sprint3�6.

---

## 2. Co MIA M� (infrastruktura)

| Polo�ka | Stav |
|---------|------|
| **GitHub repo** | Private (oper�tor potvrdil 2026-07-24) |
| **Remote** | `git@github.com:vrtyland-sketch/MIA.git` (SSH) |
| **V?tev** | `master` � sync s `origin/master` |
| **Tag `v0.1-stream-core`** | `70b3e859` � rollback checkpoint p?ed Engine 2.0 wiring |
| **Backup v?tev** | `backup/pre-github-full` � **jen lok�ln?**, nepushovat |
| **Dokumentace** | Mega audit, R1 status, DoD checklisty, Engine 2.0 roadmap, k�non alignment |
| **Cursor guardrails** | `.cursor/rules/mia-guardrails.mdc`, `mia-canon.mdc` |
| **Test harness** | `scripts/run_preflight_tests.js` (fast/full), 150+ contract soubor? |
| **OBS tooling** | `obs:refresh-overlays`, `obs:stream-ready`, `obs:prep-stream`, hands/arena skripty |
| **Runtime data** | `data/*.json` � live stav, **necommitovat** |

### Dirty tree (z�m?rn? mimo git)

- Modifikovan�: `data/*.json` (gift-map, koj state, session memory, �)
- Untracked: `_canon_import/`, `shared/mia-*-core/` (87 modul?), `docs/master-canon/`, export docs
- **Pravidlo:** live data a secrets do commit? nepat?�

---

## 3. Co MIA UM� � schopnosti podle oblast�

Legenda: **ON** = aktivn� ve v�choz�m stream re�imu � **OFF** = vypnuto / stub � **?�ste?n?** = k�d existuje, gate otev?en�

### 3.1 Stream ingest

| Schopnost | Stav | Pozn�mka |
|-----------|------|----------|
| TikFinity ? MIA ingest | **ON** | Hlavn� platforma; architektura TikFinity ? MIA ? OBS |
| Kick bridge | **ON*** | Wiring fixed `ca80eae7`; live verify `/health.kickBridge.connected` � viz ingest audit |
| Twitch bridge | **?�ste?n?** | Skripty `twitch:login/probe/status` � voliteln� |
| Telegram bridge | **?�ste?n?** | Contract testy; setup hint |
| Event normalizer (F1) | **ON** | Phase 1 contracty green |
| Runtime watchdog / replay | **ON** | `npm run replay`, phase1 contracts |
| Remote dev (Tailscale) | **?�ste?n?** | Skripty + contracty; voliteln� nasazen� |

### 3.2 OBS overlaye

| Schopnost | Stav | Pozn�mka |
|-----------|------|----------|
| Speech hologram + bublina | **ON** | `speech-overlay.html?v=36-koj-unify` |
| Koj runtime (split) | **ON** | `kojnozrout-runtime.html` + split libs `49-r1-milestone-polish` |
| Bowl overlay | **ON** | `36-koj-unify` |
| Gift animation overlay | **ON** | `37-stream-polish` � idle pr?hledn�, T4 stage |
| Viewer strip / avatar chips | **ON** | Skryt� p?i milestone speech (fix `f5b4eddc`) |
| OBS WebSocket sync | **ON** | obs-websocket-js, bootstrap/sync contracty |
| Body-parts (MIA_HEAD�FEET) | **OFF** | Z�m?rn? skryt� � audit v refresh JSON |
| Away host mode | **OFF/stub** | Slow test p?esko?en v fast |
| `obs:refresh-overlays` | **ON** | Manifest-driven cache bust |

### 3.3 Graphics / Koj / MIA vizu�l

| Schopnost | Stav | Pozn�mka |
|-----------|------|----------|
| Koj mood / scene / pose engine | **ON** | Split runtime: scene, pose, stage, belly, fx |
| Combo moment + spam wave HUD | **ON** | Belly progress, stage t?�dy combo/spam-wave/pulse |
| Party scene fallback | **ON** | P?i combo/wave |
| Tech-energy hype (Koj + speech + gift) | **ON** | R1 slice 6�10 |
| Duel / battle / walk CSS polish | **ON** | Soft Neon purple rim, walk shadow |
| Milestone speech gesture | **ON** | Kr�tk� hand gesture, bez wave flop (`f5b4eddc`) |
| MIA Paint / Graphics Studio | **?�ste?n?** | Browser + Tauri shell; contracty green, ne stream core |
| Animation bank / timeline editor | **?�ste?n?** | Production gate testy; mimo live stream path |
| Battle/duel/walk art pass | **LOW backlog** | CSS/runtime hotovo; art gap otev?en� |
| Freeze baseline | **32-gfx-whole** | Nem?nit � referen?n� checkpoint |

### 3.4 Gifts

| Schopnost | Stav | Pozn�mka |
|-----------|------|----------|
| Gift map + tier routing | **ON** | Gift map contracty |
| Per-tier video rotace | **ON** | `rotationIndexByTier` � bez resetu tier indexu |
| Gift present / thanks (miaPoints) | **ON** | Bez coin/value na overlayi |
| Achievement moments | **ON** | Contract green |
| User ack throttle | **ON** | Anti-spam |
| Gift animation bank override | **?�ste?n?** | Slow test `gift_visual` mimo fast |
| Storyboard (Universe/Galaxy/Rose) | **ON** | Post-DoD slice |

### 3.5 Chat / Speech

| Schopnost | Stav | Pozn�mka |
|-----------|------|----------|
| Direct chat intelligence | **ON** | Contract + smoke |
| TTS (edge-tts) + overlay queue | **ON** | Voice priority, speaker routing |
| Single voice (v�choz�) | **ON** | `MIA_DUAL_VOICE` unset / `0` |
| Dual voice (Koj companion TTS) | **OFF** | Zapnut�: `MIA_DUAL_VOICE=1` |
| LLM hybrid responses | **ON** | Smoke test |
| Session memory | **ON** | Contract green |
| Emotion / grief text banks | **ON** | Coverage contracty |
| Ucho (manu�ln� poslech) | **? OPEN** | Prestream DoD backlog |

### 3.6 Memory / Viewer

| Schopnost | Stav | Pozn�mka |
|-----------|------|----------|
| Viewer memory (phase 2) | **ON** | Contract |
| Viewer inventory | **?�ste?n?** | Data soubor untracked; logika v runtime |
| Story memory | **ON** | Persist v `data/story-memory.json` |
| Chat lexicon | **ON** | `data/mia-chat-lexicon.json` |

### 3.7 Battle / Economy / Inventory

| Schopnost | Stav | Pozn�mka |
|-----------|------|----------|
| Platform arena | **ON** | Contract + demo skripty |
| Koj vitals / duel | **ON** | Vitals-duel contracty |
| Battle choreography (2D) | **ON** | Factory + FX contracty |
| Battle OBS demo | **ON** | `battle:demo` skripty |
| Duel cross-stream sync | **ON** | Contract (design/test level) |
| Gift economy (miaPoints) | **ON** | Bez expozice coin? |
| Ecosystem orchestrator | **ON** | Contract |
| Poker / Monopoly hry | **OFF � design only** | Engine 2.0 roadmap; ��dn� shipped k�d |
| Cross-platform publishing | **OFF � design only** | K�non agent doc; neimplementov�no |

### 3.8 Admin

| Schopnost | Stav | Pozn�mka |
|-----------|------|----------|
| `/mia-admin` dashboard | **ON** | F�ze 4 status |
| Admin test T1�T4 / bowl / battle | **ON** | API smoke |
| Action Queue toggle | **ON** | Admin ON/OFF/Flush |
| Theme Manager | **OFF default** | Thin MVP; CSS vars jen p?i flag ON |
| Storyboard admin | **ON** | Phase 2 contract |
| Spam hype operator row | **ON** | Dashboard wave/pulse/urgent % |

### 3.9 Engine 2.0

| Schopnost | Stav | Pozn�mka |
|-----------|------|----------|
| Architektura + roadmap | **DONE (docs)** | `MIA_ENGINE_2_0_*.md` |
| Scaffold `engine2/` | **STUB OFF** | E1 four modules + E2 applicator/bus/OBS router |
| `MIA_ENGINE2_STUB` | **OFF** | Admin wiring only (`routes/admin.js`) |
| `shared/mia-*-core/` (87 modul?) | **Untracked** | P?ipraveno k budouc�mu importu |
| E1 wiring (GameState + projections) | **Volitelně** | Hotovo; default OFF |
| E2 stub (event apply + obs.renderRoute) | **Volitelně** | `mia_engine2_e2_contract`; default OFF |

### 3.10 Pluginy

| Schopnost | Stav | Pozn�mka |
|-----------|------|----------|
| Plugin loader | **OFF � design only** | Phase E4 v roadmap? |
| Poker plugin | **OFF � design only** | Adres�?ov� struktura v arch doc |
| Monopoly plugin | **OFF � design only** | Adres�?ov� struktura v arch doc |
| MIA Paint plugin surface | **?�ste?n?** | Paint contracty; ne live stream plugin |

---

## 4. Guardrails (tvrd� pravidla)

| Pravidlo | Ov??en� |
|----------|---------|
| TikFinity ? MIA ? OBS (OBS jen renderuje) | Architektura + contracty |
| Overlay public API: **jen `miaPoints`** � ��dn� coins/gift value | `overlay_public_response_contract`, `mia_graphics_r1_contract` |
| Dual voice **default OFF** | `MIA_DUAL_VOICE.js`, Live DoD |
| Gift video rotace per-tier (`rotationIndexByTier`, bez resetu) | R1 contracty + R1-C manu�l |
| Action Queue **default OFF** | Kill switch `MIA_ACTION_QUEUE=0` |
| Engine 2.0 stub **default OFF** | `mia_engine2_roadmap_contract`, `mia_engine2_e2_contract` |
| ��dn� big-bang split `index.js` | Roadmap Phase E5 |
| ��dn� force-push na `master` | Migration audit |
| Live `data/` a secrets mimo git | Dirty tree policy |

---

## 5. Graphics cache bust � aktu�ln� vrstvy

| Vrstva | Bust | Soubory |
|--------|------|---------|
| Freeze baseline | `32-gfx-whole` | Referen?n� checkpoint � nem?nit |
| Speech / bowl / manifest OBS URL | `36-koj-unify` | `GFX_CACHE_BUST` v manifestu |
| Gift overlay / desk | `37-stream-polish` | `GIFT_ANIM_CACHE_BUST` |
| Koj runtime HTML + split libs | `49-r1-milestone-polish` | `KOJ_SPLIT_CACHE_BUST` |

**Dual-bust invariant:** manifest OBS URL pro speech/bowl z?st�vaj� na `36`; split runtime libs na `49`. Po deploy: `npm run obs:refresh-overlays`.

---

## 6. Otev?en� br�ny (human gates)

| Gate | Stav | Akce |
|------|------|------|
| **R1-C OBS manual** | **✅ PASS** (2026-07-26) | [`MIA_R1C_OBS_RESULT.md`](./MIA_R1C_OBS_RESULT.md) |
| **Tag `v0.1.1-graphics`** | **✅** | R1-C PASS 2026-07-26 |
| **Ucho (poslech)** | **✅** (R1-C krok 9) | OBS session 2026-07-26 |
| **Private API spot-check** | Voliteln� | Pokud API st�le ukazuje public, ov??it Settings |
| **Canon import commit** | Pl�nov�no | `_canon_import/`, `shared/mia-*-core/` � samostatn� commit |
| **E1 Engine 2.0 wiring** | Volitelně | Po tagu; stub OFF default |

### R1-C checklist (10 krok? � exact)

1. Spustit b?�n� runtime
2. Ov??it speech overlay `36`
3. Ov??it gift overlay `37`
4. Ov??it Kojno�rout `49-r1-milestone-polish`
5. Poslat testovac� chat
6. Poslat mal�, st?edn� a velk� gift
7. Ov??it combo/spam HUD
8. Ov??it bowl, invent�? a battle obraz
9. Poslechnout oba hlasy uchem
10. Zkontrolovat, �e nic nen� o?�znut�, skryt� nebo p?es sebe

�ablona v�sledku: [`MIA_R1C_OBS_RESULT.md`](./MIA_R1C_OBS_RESULT.md) � pl�n: [`MIA_RC_NEXT_STEPS.md`](./MIA_RC_NEXT_STEPS.md).

---

## 7. Ned�vn� opravy

### `f5b4eddc` � milestone speech + avatary (2026-07-24)

- Potla?en� wave flop animace b?hem milestone speech
- Skryt� avatar chips ve viewer strip overlay p?i milestone speech
- Kr�tk� hand gesture m�sto dlouh� wave
- Roz��?en� `koj-runtime-scene.js`, `koj-runtime-pose.js`, `viewer-strip-overlay.html`
- Nov�/roz��?en� contracty: `kojnozout_display_mood`, runtime split, graphics R1

### Graphics day R1 (11 slices)

- Combo/spam wave belly HUD, tech-energy hype, speech holo parity
- Gift overlay tech sparks, dashboard spam hype row
- Duel/battle/walk CSS polish (slice 11)
- Detail: [`MIA_GRAPHICS_DAYLOG.md`](./MIA_GRAPHICS_DAYLOG.md)

---

## 8. DoD sk�re (posledn� z�znamy)

| Checklist | Sk�re | Datum |
|-----------|-------|-------|
| Prestream DoD | ~94 % | 2026-07-21 |
| Live DoD | ~91 % ? ~94 % | 2026-07-20/21 |
| Preflight fast (tento audit) | **100 %** (159/159) | 2026-07-26 |

Otev?en� polo�ky: ucho, R1-C OBS, zb�vaj�c� dirty tree d�vky.

---

## 9. Rychl� p?�kazy

```powershell
cd C:\MIA
node --check index.js
npm run test:preflight:fast
npm run obs:refresh-overlays
npm start
```

---

*Generov�no pro capability audit � docs-only; bez zm?n runtime nebo live dat.*
