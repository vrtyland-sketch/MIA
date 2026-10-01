# OBS STATIC AUDIT — read-only mapa scén z repa

**Status:** READ-ONLY · 2026-08-13 · Feature freeze ON  
**Účel:** doma porovnat skutečný OBS s tím, co kód/manifest očekává — **nic neopravovat z notebooku**

Související: [`GENESIS_OPS_PRIORITY.md`](./GENESIS_OPS_PRIORITY.md) · [`ASSET_MASTER_AUDIT.md`](./ASSET_MASTER_AUDIT.md)

---

## 1. Executive — tři vrstvy reality

| Vrstva | Scéna | Kdo ji zná | Role |
|--------|-------|------------|------|
| **Program (divák/TikTok)** | `SPINAK_HLAVNI` nebo `MIA_GENESIS` | OBS backup, docs, operátor | Vertikální master 9:16 — kamera + TikFinity widget + vnořený engine |
| **MIA engine (overlaye)** | `SPINAK_ENGINE_GIFTS` | **Celý runtime kód** | Browser vrstvy MIA/Koj/gift/video — kanonický manifest |
| **Genesis izolace** | `MIA_GENESIS` + `MIA_STREAM_TEST` | Genesis skripty + docs | Oddělený show režim — **nesmí** přepsat ENGINE_GIFTS |

**Klíčový mismatch (potvrzeno OBS backup + kód):**

- `SPINAK_HLAVNI` **obsahuje** `SPINAK_ENGINE_GIFTS` jako vnořenou scénu (scene-in-scene).
- MIA kód **nikdy neodkazuje** na `SPINAK_HLAVNI` — všechny OBS WS operace míří na `runtimeConfig.obs.sceneName` → default **`SPINAK_ENGINE_GIFTS`**.
- Při první GENESIS: Program = `MIA_GENESIS`, overlaye = `SPINAK_ENGINE_GIFTS` → **divák nevidí reakce**.

---

## 2. Odkud pochází default `SPINAK_ENGINE_GIFTS`

### Resolution chain (priorita shora dolů)

| # | Zdroj | Soubor:řádek | Klíč / konstanta | Klasifikace |
|---|-------|--------------|------------------|-------------|
| 1 | Live manifest | `scripts/MIA_OBS_LIVE_MANIFEST.js:11` | `const DEFAULT_SCENE = "SPINAK_ENGINE_GIFTS"` | **RUNTIME_DEFAULT** (SoT) |
| 2 | Manifest builder | `scripts/MIA_OBS_LIVE_MANIFEST.js:395-398` | `options.sceneName` → `process.env.MIA_OBS_CAMERA_SCENE` → `DEFAULT_SCENE` | **RUNTIME_DEFAULT** |
| 3 | Runtime config | `scripts/MIA_CONFIG.js:161-164` | `OBS_SCENE_NAME` / `MIA_OBS_SCENE_NAME` / `MIA_ENGINE_SCENE_NAME` → fallback `"SPINAK_ENGINE_GIFTS"` | **RUNTIME_DEFAULT** |
| 4 | Host mode fallback | `scripts/MIA_HOST_MODE_CONFIG.js:11` | `mainScene: "SPINAK_ENGINE_GIFTS"` | **RUNTIME_DEFAULT** |
| 5 | Host mode JSON | `shared/host_mode_config.json:4` | `"mainScene": "SPINAK_ENGINE_GIFTS"` | **RUNTIME_DEFAULT** |
| 6 | Env example | `.env.example:121` | `# MIA_OBS_CAMERA_SCENE=SPINAK_ENGINE_GIFTS` | **FALLBACK** (dokumentace) |
| 7 | Stream PC example | `.env.stream-pc.example:25` | komentář Program scéna | **FALLBACK** |
| 8 | Contract test | `tests/obs_live_manifest_contract.js:10` | `assert.equal(live.scene, "SPINAK_ENGINE_GIFTS")` | **TEST** |
| 9 | Config smoke | `tests/config_contract_smoke.js:80` | `config.obs.sceneName` | **TEST** |

**Env override (doma ověřit v `.env` na MIA PC):**

- `MIA_OBS_CAMERA_SCENE` — používají layout/refresh skripty
- `OBS_SCENE_NAME` / `MIA_OBS_SCENE_NAME` / `MIA_ENGINE_SCENE_NAME` — runtime config
- `MIA_SOLO_STREAM_MAIN_SCENE` — solo stream (v `.env` repo: `SPINAK_ENGINE_GIFTS`)

### Co by změna defaultu ovlivnila

Změna `SPINAK_ENGINE_GIFTS` → jiný název **bez** env override by rozbila:

| Oblast | Soubory (hardcoded fallback) |
|--------|------------------------------|
| Overlay layout/sync | `MIA_OBS_OVERLAY_SYNC.js`, `obs_fix_overlay_layout.js`, `obs_refresh_overlays.js` |
| Video engine | `MIA_VIDEO_ENGINE.js` (scene switch, tier slots, persistent layers) |
| Vision / Eyes | `MIA_OBS_VISION.js`, `MIA_EYES.js`, `routes/eyes.js` |
| Verify / audit | `MIA_OBS_VERIFY.js`, `obs_verify_stream_ready.js`, `mia_live_audit.js` |
| Hands / cameras | `MIA_OBS_HANDS.js`, `MIA_OBS_STREAMER_CAMERAS.js`, `obs_apply_hands.js` |
| Away mode | `MIA_AWAY_MODE.js`, `MIA_OBS_AWAY_SCENE.js` (návrat na main) |
| API routes | `routes/obs.js`, `routes/video.js`, `routes/gift_animation.js` |
| Health/status | `MIA_HEALTH_RUNTIME.js`, `MIA_STATUS_RUNTIME.js` |
| Arena ensure | `obs_ensure_arena.js` |
| Guided walkthrough | `mia_guided_walkthrough.js` |
| Matting bridge | `MIA_MATTING_INGEST_BRIDGE.js` |
| Post-connect bootstrap | `MIA_OBS_POST_CONNECT_RUNTIME.js` |

**Doporučená cesta změny:** env `MIA_OBS_CAMERA_SCENE` + `OBS_SCENE_NAME` na MIA PC — **ne** přejmenování konstanty v 30+ souborech.

---

## 3. Inventář scén — všechny výskyty v repu

### 3.1 `SPINAK_ENGINE_GIFTS` — MIA overlay engine

| Soubor | Řádek/klíč | Komponenta | Účel | Klasifikace |
|--------|------------|------------|------|-------------|
| `MIA_OBS_LIVE_MANIFEST.js` | 11, 398 | Manifest | DEFAULT_SCENE, browser layer catalog | **RUNTIME_DEFAULT** |
| `MIA_CONFIG.js` | 164 | Config | `obs.sceneName` fallback | **RUNTIME_DEFAULT** |
| `MIA_OBS_OVERLAY_SYNC.js` | 979, 1034, 1151, 1275 | Overlay sync | Layout transforms pro bowl/runtime/voice | **RUNTIME_ACTION** |
| `MIA_OBS_POST_CONNECT_RUNTIME.js` | 37 | Bootstrap | Post-connect overlay top + vision | **RUNTIME_ACTION** |
| `MIA_VIDEO_ENGINE.js` | 168, 655 | Gift video | Scene pro tier playback + program switch | **RUNTIME_ACTION** |
| `MIA_OBS_VISION.js` | 567 | Vision | Screenshot / layout scan target | **RUNTIME_ACTION** |
| `MIA_EYES.js` | 203 | Eyes | giftSceneName pro scan | **RUNTIME_ACTION** |
| `MIA_OBS_HANDS.js` | 493 | Hands | Prop placement scene | **RUNTIME_ACTION** |
| `MIA_OBS_VERIFY.js` | 169, 251, 530, 620, 636 | Verify | Stream-ready checklist | **RUNTIME_ACTION** |
| `MIA_HEALTH_RUNTIME.js` | 179 | Health | `/health` giftScene field | **RUNTIME_ACTION** |
| `MIA_STATUS_RUNTIME.js` | 142 | Status | giftScene v status snapshot | **RUNTIME_ACTION** |
| `MIA_AWAY_MODE.js` | 59 | Away | Návrat z away na main scene | **RUNTIME_ACTION** |
| `MIA_HOST_MODE_CONFIG.js` | 11 | Host | mainScene | **RUNTIME_DEFAULT** |
| `MIA_SOLO_STREAM.js` | 87 | Solo stream | resolveMainSceneName fallback | **RUNTIME_ACTION** |
| `obs_refresh_overlays.js` | 91 | CLI | Refresh browser sources | **RUNTIME_ACTION** |
| `obs_fix_overlay_layout.js` | 161 | CLI | Vision layout apply | **RUNTIME_ACTION** |
| `obs_set_canvas.js` | 119 | CLI | Canvas setup target | **RUNTIME_ACTION** |
| `obs_apply_hands.js` | 73 | CLI | Hands apply | **RUNTIME_ACTION** |
| `obs_verify_stream_ready.js` | 56 | CLI | Pre-stream verify | **RUNTIME_ACTION** |
| `obs_ensure_arena.js` | 11 | CLI | Arena overlay ensure | **RUNTIME_ACTION** |
| `obs_add_gift_video_slots.js` | 171 | CLI | T1–T5 video slots | **RUNTIME_ACTION** |
| `obs_fix_camera_visible.js` | 37 | CLI | Camera visibility | **RUNTIME_ACTION** |
| `obs_revive_voice.js` | 136 | CLI | TTS browser revive | **RUNTIME_ACTION** |
| `mia_guided_walkthrough.js` | 31 | CLI | Walkthrough screenshots | **TEST** |
| `mia_live_audit.js` | 251 | CLI | Live audit main scene | **RUNTIME_ACTION** |
| `routes/obs.js` | 182 | HTTP | `/obs/*` scene param | **RUNTIME_ACTION** |
| `routes/video.js` | 40, 79, 110, 202 | HTTP | giftScene in API | **RUNTIME_ACTION** |
| `routes/gift_animation.js` | 37 | HTTP | Gift anim scene | **RUNTIME_ACTION** |
| `routes/eyes.js` | 466 | HTTP | Eyes scan scene | **RUNTIME_ACTION** |
| `_obs_scene_backups/SPINAK.backup-*.json` | 3207+ | OBS backup | Skutečná scéna v OBS — MIA_BUBBLE, KOJNOZROUT_*, T*_VIDEO_* | **LEGACY snapshot** |
| `docs/*` (15+ souborů) | — | Docs | Operator guidance | **FALLBACK** |

**OBS backup obsah `SPINAK_ENGINE_GIFTS` (2026-06):**  
MIA_STORY, NOTEBOOK_CAMERA, KOJNOZROUT_RUNTIME, KOJNOZROUT_BOWL_V2, MIA_BUBBLE, MIA_VOICE, MIA_ENTITY, MIA_COMBO, MIA_GIFT_MOMENT, MIA_EVOLUTION, MIA_BACKPACK, MIA_T0_FLYBY, MIA_DUEL, MIA_STARTUP_CHECK, tier video sloty T1–T5.

**Manifest browser layers (kód SoT, nemusí = OBS realita):**  
speech, entity, viewer_strip, runtime, bowl, voice, gift_animation, combo, boss_cinematic, duel, story, evolution, host_mode, startup, body parts, graphics_preview — viz `MIA_OBS_LIVE_MANIFEST.js` BROWSER_LAYERS.

---

### 3.2 `SPINAK_HLAVNI` — vertikální program master

| Soubor | Řádek | Komponenta | Účel | Klasifikace |
|--------|-------|------------|------|-------------|
| `_obs_scene_backups/SPINAK.backup-*.json` | 2185, 5923 | OBS backup | Scéna existuje v OBS | **LEGACY snapshot** |
| `docs/FIRST_LIVE_OBSERVATION_SESSION.md` | 6 | Docs | TikTok ← OBS VCam ← **SPINAK_HLAVNI** | **FALLBACK** |
| `docs/MIA_STREAM_2026-08-05_FINDINGS.md` | 58, 202 | Docs | Program často HLAVNI; MIA vrstvy na ENGINE_GIFTS | **FALLBACK** |
| `docs/STREAM_RECOVERY_01.md` | 133 | Docs | Porovnat tři scény | **FALLBACK** |
| `scripts/mia_pc_optimize.ps1` | 76 | Hint | „Scene pro live reakce: SPINAK_HLAVNI“ | **UNKNOWN** (operátor tip) |

**⚠️ V runtime JS/TS kódu `SPINAK_HLAVNI` neexistuje.**  
Pouze OBS + operátorská dokumentace.

**OBS backup struktura `SPINAK_HLAVNI`:**

```
SPINAK_HLAVNI (portrait program)
├── Browser (kamera, mirrored, bounds ~410×720)
├── TikFinity widget (tikfinity.zerody.one/widget/myactions)
├── SPINAK_ENGINE_GIFTS (vnořená scéna, 1280×720 bounds)  ← MIA overlaye
└── Obrázek (statický overlay)
```

**Interpretace:** Správný provoz = Program `SPINAK_HLAVNI` **s vnořeným** `SPINAK_ENGINE_GIFTS`. MIA manipuluje vnořenou scénu — funguje, pokud nested scene zůstane visible.

---

### 3.3 `MIA_GENESIS` — Genesis show scéna

| Soubor | Řádek | Komponenta | Účel | Klasifikace |
|--------|-------|------------|------|-------------|
| `scripts/mia_genesis_obs_setup.js` | 21, 206 | CLI | Create scene + SetCurrentProgramScene | **RUNTIME_ACTION** (Genesis only) |
| `scripts/mia_genesis_birth_prepare.js` | 18, 208 | CLI | Birth show prep + program switch | **RUNTIME_ACTION** |
| `scripts/mia_genesis_portrait_fix.js` | 10, 94 | CLI | Portrait 9:16 fix + program switch | **RUNTIME_ACTION** |
| `genesis-runtime.js` | 98 | Client | Status text „OBS layer MIA_GENESIS healthy“ | **TEST** (UI copy) |
| `docs/MIA_GENESIS_MODE/*` | many | Docs | Design — **nesmí** sdílet ENGINE_GIFTS manifest | **FALLBACK** |
| `docs/MIA_STREAM_2026-08-05_FINDINGS.md` | 58, 201 | Findings | Program často GENESIS, 0 MIA vrstev | **FALLBACK** |

**Genesis browser sources (setup skript):**  
GENESIS_FX, GENESIS_OVERLAY, GENESIS_COMMUNITY, GENESIS_VOICE — **ne** speech/koj/gift Core overlaye.

**Charter pravidlo** (`00_PROJECT_CHARTER.md:61`):  
Nová scéna `MIA_GENESIS` — **ne** `SPINAK_ENGINE_GIFTS`. Core overlaye patří do `MIA_STREAM_TEST` (interní test), ne do Genesis programu.

---

### 3.4 `MIA_STREAM_TEST` — interní Core test scéna

| Soubor | Řádek | Komponenta | Účel | Klasifikace |
|--------|-------|------------|------|-------------|
| `scripts/mia_genesis_obs_setup.js` | 22 | CLI | TEST_SCENE — Core overlays, never stream | **RUNTIME_ACTION** |
| `docs/MIA_GENESIS_MODE/OBS_SCENE_SETUP.md` | 10, 51 | Docs | Dual-scene architecture | **FALLBACK** |
| `docs/MIA_GENESIS_MODE/OBS_DUAL_SCENE_VERIFICATION.md` | 56–83 | Docs | Manual verification checklist | **TEST** |
| `genesis-operator.html` | 70, 116 | UI | Operator panel copy | **FALLBACK** |

---

### 3.5 `SPINAK_NEJSEM_TU` — away / host scéna

| Soubor | Řádek | Komponenta | Účel | Klasifikace |
|--------|-------|------------|------|-------------|
| `MIA_OBS_AWAY_SCENE.js` | 35 | Away | resolveAwaySceneName default | **RUNTIME_DEFAULT** |
| `MIA_AWAY_MODE.js` | 52 | Away | SetCurrentProgramScene target | **RUNTIME_ACTION** |
| `MIA_HOST_MODE_CONFIG.js` | 10 | Host | awayScene | **RUNTIME_DEFAULT** |
| `MIA_OBS_OVERLAY_SYNC.js` | 1184, 1232 | Overlay | Away layout branch | **RUNTIME_ACTION** |
| `MIA_OBS_VISION.js` | 454 | Vision | Away scene layout comment | **FALLBACK** |
| `.env.example` | 50 | Env | `MIA_AWAY_SCENE=SPINAK_NEJSEM_TU` | **FALLBACK** |
| `tests/away_host_mode_contract.js` | 53, 86 | Test | Contract | **TEST** |
| `_obs_scene_backups/*` | 2705 | OBS backup | Scéna v OBS | **LEGACY snapshot** |

---

### 3.6 Ostatní scény ze OBS backup (kód nezná / minimálně)

| Scéna | V kódu? | V OBS backup | Klasifikace | Poznámka |
|-------|---------|--------------|-------------|----------|
| `SPINAK_AFK` | `.env` MIA_SOLO_STREAM_SCENE_IDLE | ne v backup list | **FALLBACK** | Solo stream idle |
| `SPINAK_LOBBY` | `.env` MIA_SOLO_STREAM_SCENE_LOBBY | ne | **FALLBACK** | Solo stream lobby |
| `SPINAK_FILTER` | ne | ano (nested ENGINE_GIFTS) | **LEGACY** | Filtr / přechod |
| `SPINAK_BOJ` | ne | ano | **LEGACY** | Battle — POST-GENESIS |
| `SPINAK_HOST` | ne | ano | **LEGACY** | Host variant |
| `SPINAK_STARK` | ne | ano | **LEGACY** | Brand variant |
| `SPINAK_KOMUNITY` | ne | ano | **LEGACY** | Community variant |
| `MIA_SCENE` / `BATTLE_SCENE` / … | `MIA_CONFIG.js` sceneMap placeholders | ne | **UNKNOWN** | Generic env keys — default stringy ne scény |

---

## 4. Scéna × overlay mapa (manifest SoT)

Všechny tyto browser sources manifest **přiřazuje ke scéně** `manifest.scene` (= default ENGINE_GIFTS):

| OBS input | HTML | defaultVisible | zIndex | GENESIS? |
|-----------|------|----------------|--------|----------|
| MIA_SPEECH / MIA_BUBBLE | speech-overlay.html | true | 40 | IN (TTS hero) |
| MIA_VOICE | mia-voice-overlay.html | true | 30 | IN (audio chain) |
| MIA_KOJ_RUNTIME / KOJNOZROUT_RUNTIME | kojnozrout-runtime.html | true | 50 | IN |
| MIA_BOWL / KOJNOZROUT_BOWL_V2 | kojnozrout-bowl-overlay.html | true | 55 | IN |
| MIA_ENTITY | entity-overlay.html | true | 70 | MAYBE |
| MIA_VIEWER_STRIP | viewer-strip-overlay.html | true | 65 | MAYBE |
| MIA_GIFT_ANIMATION | gift-animation-overlay.html | true | 83 | IN (Rose visual) |
| MIA_COMBO | combo-overlay.html | false | 90 | MAYBE |
| MIA_BOSS_CINEMATIC | boss-cinematic-overlay.html | false | 92 | OUT |
| MIA_DUEL | kojnozrout-duel-overlay.html | false | 86 | OUT |
| MIA_STORY | story-moment-overlay.html | false | 84 | OUT |
| MIA_HOST_MODE | host-mode-overlay.html | false | 75 | OUT (away only) |

---

## 5. FINDINGS

1. **Kód default = `SPINAK_ENGINE_GIFTS`** — jediný SoT v `MIA_OBS_LIVE_MANIFEST.js`; 30+ modulů sdílí stejný fallback.
2. **`SPINAK_HLAVNI` je OBS-only master** — není v runtime kódu; backup potvrzuje vnoření ENGINE_GIFTS + kamera + TikFinity widget.
3. **První GENESIS failure mode vysvětlen:** Program `MIA_GENESIS` bez Core overlayů vs. reakce v `SPINAK_ENGINE_GIFTS`.
4. **Genesis design správně plánuje dual-scene** (GENESIS veřejná + STREAM_TEST interní), ale **Stream Core pořád targetuje ENGINE_GIFTS**.
5. **OBS backup vs manifest drift:** backup používá `MIA_BUBBLE`; manifest aliasuje na `MIA_SPEECH` — aliasy v manifestu to pokrývají.
6. **7 původních scén v backup** (HLAVNI, ENGINE_GIFTS, NEJSEM_TU, BOJ, HOST, STARK, KOMUNITY) — kód zná jen ENGINE_GIFTS + NEJSEM_TU + Genesis dvojici.

---

## 6. RISKS

| Riziko | Důsledek |
|--------|----------|
| Program ≠ scéna s overlayi | Gift/Rose/TTS proběhne v logu, divák nevidí |
| Program = HLAVNI ale nested ENGINE skrytý | Stejný efekt — prázdné reakce |
| `mia_genesis_*` skript spustí SetCurrentProgramScene(MIA_GENESIS) | Přepne Program pryč od HLAVNI/ENGINE |
| Env `OBS_SCENE_NAME` ≠ skutečný název scény v OBS | Layout/vision/hands selžou tiše |
| Solo stream switch na SPINAK_AFK/LOBBY | Odchod z gift scény při chat activity |
| Multi-PC: MIA na PC2, OBS na PC1 | `runtimeConfig.obs.sceneName` musí matchovat OBS na PC1; WS URL musí mířit na stream PC |

---

## 7. HOME_VERIFICATION (checklist — 15 min)

Na **PC1 STREAM** v OBS (bez MIA změn):

- [ ] **Scenes list:** vypsat všechny scény — porovnat s §3.6 tabulkou
- [ ] **Program scéna právě teď:** `GetCurrentProgramScene` nebo Studio Mode — zapsat název
- [ ] **Pokud Program = SPINAK_HLAVNI:** ověřit, že obsahuje **Scene Item** `SPINAK_ENGINE_GIFTS` (visible=true)
- [ ] **Otevřít SPINAK_ENGINE_GIFTS:** checklist sources — MIA_BUBBLE/MIA_SPEECH, MIA_VOICE, KOJNOZROUT_RUNTIME, KOJNOZROUT_BOWL_V2, MIA_GIFT_ANIMATION, T1_VIDEO_01…
- [ ] **MIA_GENESIS:** existuje? co obsahuje? **nesmí** být jediná program scéna pro live reakce
- [ ] **Canvas:** HLAVNI/GENESIS = 1080×1920? ENGINE_GIFTS = 1920×1080 nebo 1280×720?
- [ ] **TikTok LIVE Studio:** Virtual Camera ← která OBS scéna?
- [ ] **TikFinity widget** v HLAVNI — je to ten samý kanál co posílá `/ingest`?
- [ ] **`.env` na PC2:** `OBS_WS_URL`, `OBS_SCENE_NAME` / `MIA_OBS_CAMERA_SCENE` — screenshot hodnot
- [ ] **`curl PC2:3000/health`** → pole `giftScene` — matchuje OBS?

---

## 8. Doporučený minimální fix (NEPROVÁDĚT z notebooku)

**Cíl:** Program = vertikální master, reakce viditelné, bez refactoru 30 souborů.

1. **Doma ověřit nested model:** Program `SPINAK_HLAVNI` + visible `SPINAK_ENGINE_GIFTS` uvnitř — pokud funguje, **neměnit kód**, jen zajistit konzistenci.
2. **Pokud nested nefunguje / chybí:** přesunout browser sources z ENGINE_GIFTS přímo do HLAVNI **nebo** nastavit Program = ENGINE_GIFTS dočasně pro GP-S test (s vědomím 16:9 vs 9:16).
3. **Env only fix (preferovaný):** na PC2 `.env` → `OBS_SCENE_NAME=SPINAK_ENGINE_GIFTS` (match OBS); na PC1 WS povolen.
4. **Genesis show:** buď Program = HLAVNI s nested engine, **nebo** explicitně embed Core do GENESIS — **ne** Program=GENESIS + engine jinde.
5. **Záloha OBS** před jakýmkoli přesunem vrstev (krok A pořadníku).

---

## 9. Další notebook audity (fronta)

| # | Audit | Soubor (plán) |
|---|-------|---------------|
| 2 | TikFinity static | `content-pass/TIKFINITY_STATIC_AUDIT.md` |
| 3 | Startup/restart | `content-pass/STARTUP_AUDIT.md` |
| 4 | Golden Rose evidence | `content-pass/GOLDEN_ROSE_EVIDENCE.md` |
| 5 | Asset gate GENESIS_IN/OUT | doplnit `ASSET_MASTER_AUDIT.md` |
| 6 | Canon gap | `content-pass/CANON_GAP_AUDIT.md` |
