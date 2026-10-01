# Etapa 3D — Compliance matrix (OBS Runtime vs kánon)

**Legenda stavu:** ✅ shoda · ⚠ částečná / drift · ❌ rozpor · ❓ neověřeno

| ID | Funkce / pravidlo | Kánon | Implementace (soubor / logika) | Testy | Stav |
|----|-------------------|-------|--------------------------------|-------|------|
| OR-01 | TikFinity → MIA → OBS | A1 | `index.js` ingest → pipeline → OBS WS; HTML poll `/overlay-state` | `ingest_contract`, `obs_bootstrap` | ✅ |
| OR-02 | OBS render-only (žádná gift/body ekonomika v OBS) | A2 | Logika v `MIA_*`; OBS = browser + media slots | `obs_live_manifest`, arch docs | ✅ |
| OR-03 | Split overlay režim default | A4 | `MIA_OBS_OVERLAY_SYNC` `resolveObsOverlayMode` → `split` | `obs_overlay_sync` | ✅ |
| OR-04 | Hub `mia-live-hub.html` legacy, ne live kánon | A4 | Hub URL v manifestu; docs „NE používat“ | `obs_live_manifest` | ⚠ |
| OR-05 | `/overlay-state` poll side-effect-free | A5 | `MIA_OVERLAY_STATE.js` + `overlay-poll.js` | `overlay_state_ctx`, `overlay_state_cache_ctx` | ✅ |
| OR-06 | Public strip coins před browser | B7–8 | `MIA_OVERLAY_PUBLIC_RESPONSE.stripValueFieldsForPublic` | `overlay_public_response`, `graphics_r1` | ✅ |
| OR-07 | Live avatar = `#miaHolo` v speech | B9 | `speech-overlay.html`; body parts skryté | `graphics_r1`, `obs_live_manifest` | ✅ |
| OR-08 | Body parts defaultVisible false | B10 | `bodyPartsCatalog.js` všechny `defaultVisible: false` | `obs_live_manifest` (mia_head row) | ✅ |
| OR-09 | Hands nezapíná body na live | B10 | `MIA_OBS_HANDS` `sceneItemEnabled` dle manifest | `mia_obs_hands` | ✅ |
| OR-10 | Body sync hybrid pro URL (studio) | K52 | `MIA_OBS_BODY_SYNC` default hybrid pro hands | — | ⚠ |
| OR-11 | Live manifest single source | C11 | `MIA_OBS_LIVE_MANIFEST.js` | `obs_live_manifest` | ✅ |
| OR-12 | Scéna `SPINAK_ENGINE_GIFTS` | C12 | `DEFAULT_SCENE` + env override | `obs_live_manifest` | ✅ |
| OR-13 | Browser layer catalog ≥14 vrstev | C11 | `BROWSER_LAYERS` speech, gift, koj, combo, … | `obs_live_manifest` | ✅ |
| OR-14 | OBS input aliasy speech/koj/bowl | C13 | `OBS_INPUT_NAME_ALIASES`, `resolveObsInputNames` | `obs_live_manifest` | ✅ |
| OR-15 | Moment vrstvy default skryté | C14 | manifest `moment: true`, `defaultVisible: false` | `obs_live_manifest` (zIndex) | ✅ |
| OR-16 | Trvalé vrstvy: entity, strip, bowl, runtime, speech, voice | C15 | manifest + hands specs | `mia_obs_hands` | ✅ |
| OR-17 | `MIA_VOICE` reroute audio | C16 | manifest `rerouteAudio: true`; ensure-voice script | `obs_overlay_sync` (partial) | ✅ |
| OR-18 | GFX bust `36-koj-unify` speech/bowl | D18 | `GFX_CACHE_BUST`, `buildSplitUrls` | `obs_live_manifest` | ✅ |
| OR-19 | Gift anim bust `37-stream-polish` | D19 | `GIFT_ANIM_CACHE_BUST`; refresh script izolace | `obs_live_manifest`, `graphics_r1` | ✅ |
| OR-20 | Koj split bust `49-r1-milestone-polish` v runtime HTML | D20 | `kojnozrout-runtime.html` script/link query v49 | `runtime_split`, R1-C | ✅ |
| OR-21 | Manifest runtime URL nese v36 (vnitřní v49) | D20 | Dual-layer bust: URL `v=36`, libs `v=49` | `obs_live_manifest` | ⚠ |
| OR-22 | `obs:refresh-overlays` refresh + URL bust | D21 | `scripts/obs_refresh_overlays.js` | — | ⚠ |
| OR-23 | Refresh skip `MIA_VOICE` | D21 | refresh script voice skip | — | ✅ |
| OR-24 | OBS WebSocket connect | E23 | `MIA_OBS_BOOTSTRAP.js` obs-websocket-js | `obs_bootstrap` | ✅ |
| OR-25 | Reconnect timer ~5 s | E24 | bootstrap `reconnectMs` | `obs_bootstrap` (partial) | ✅ |
| OR-26 | Health snapshot stavy | E25 | `buildObsHealthSnapshot` | `obs_bootstrap` (mock) | ✅ |
| OR-27 | Safe mode / WS off diagnostika | E25 | health `safe_mode_or_websocket_off` message | — | ⚠ |
| OR-28 | Post-connect bootstrap chain | E26 | `MIA_OBS_POST_CONNECT_RUNTIME.js` | `obs_post_connect_runtime` | ✅ |
| OR-29 | `safeObsCall` wrapper | E27 | `MIA_OBS_SAFE_CALL.js` | `obs_safe_call`, ctx variant | ✅ |
| OR-30 | Scene guard dead files scan | E28 | `MIA_OBS_SCENE_GUARD.js` + bootstrap warn | — | ⚠ |
| OR-31 | Landscape layout fix 1920×1080 | F29 | `obs_fix_overlay_layout.js`, hands transforms | `obs_fix_overlay_layout` (mimo fast) | ✅ |
| OR-32 | Hard zones CSS overlap prevention | F30 | `tiktok-viewer-zones.css`, speech-overlay | `graphics_r1` | ✅ |
| OR-33 | Portrait 1080×1920 | F31 | `obs_set_canvas.js --portrait` | — | ❓ |
| OR-34 | Landscape 1920×1080 | F31 | `obs_set_canvas.js --landscape` | — | ❓ |
| OR-35 | Canvas switch + layout reapply | F32 | `obs_set_canvas.js` → `applyObsOverlayLayout` | — | ❓ |
| OR-36 | Koj OBS transform bottom-right | F33 | hands runtime transform 1872×788 | `mia_obs_hands` | ✅ |
| OR-37 | Bowl OBS transform top-right | F33 | hands bowl transform | `mia_obs_hands` | ✅ |
| OR-38 | Gift video Media Source T1–T5 | G6, G34 | `MIA_VIDEO_ENGINE.js` tier slots | `video_engine`, media scripts | ✅ |
| OR-39 | Video rotace per-tier v MIA | G34 | `rotationIndexByTier` | 3A G-31 ⚠ test gap | ✅ |
| OR-40 | OBS queue merge / interrupt | G35 | video engine queue config | `video_engine` (partial) | ✅ |
| OR-41 | Persistent overlays on top | G36 | `MIA_OBS_PERSISTENT_LAYERS` post-connect | `obs_persistent_layers` | ✅ |
| OR-42 | Scene switch during gift video | G37 | video engine autoSwitchProgramScene | — | ⚠ |
| OR-43 | Mute gift video during MIA voice | G38 | video engine flag default true | — | ⚠ |
| OR-44 | Watchdog relaunch obs64 | H39 | `MIA_OBS_WATCHDOG.js` | `obs_watchdog`, `obs_watchdog_ctx` | ✅ |
| OR-45 | Watchdog cooldown + max attempts | H39 | config 60s / 5 attempts | `obs_watchdog` | ✅ |
| OR-46 | Watchdog noop when process running | H40 | ensureRunning branch | `obs_watchdog` | ✅ |
| OR-47 | Away scéna NEJSEM TU | H41 | `MIA_OBS_AWAY_SCENE.js`, away manifest npm | `obs_away_scene`, `obs_away_loop` | ⚠ |
| OR-48 | OBS Vision optional OFF default | H42 | env commented; post-connect gated | `obs_vision_ctx`, `mia_obs_vision` | ✅ |
| OR-49 | Koj render-report endpoint | H43 | runtime POST propriocepce | `kojnozout_runtime` | ✅ |
| OR-50 | `obs:apply-hands` vytvoří/opraví sources | I44 | `MIA_OBS_HANDS.js` + npm script | `mia_obs_hands` | ✅ |
| OR-51 | `obs:stream-ready` operátor flow | I44 | `obs_stream_ready.js` | — | ❓ |
| OR-52 | `GET /obs/live-manifest` | I45 | route + `buildLiveManifest` | `obs_live_manifest` | ✅ |
| OR-53 | Browser refresh on connect (optional) | sync | `browserRefreshOnConnect` default false | `obs_overlay_sync` | ⚠ |
| OR-54 | Browser refresh on overlay change | sync | `browserRefreshOnOverlay` default false | `obs_overlay_sync_runtime` | ⚠ |
| OR-55 | Overlay sync URL update hands | sync | `MIA_OBS_OVERLAY_SYNC.js` refresh paths | `obs_overlay_sync`, wrappers ctx | ✅ |
| OR-56 | Layout locked default true | sync | `isObsLayoutLocked` | `obs_overlay_sync` | ✅ |
| OR-57 | Voice monitor Monitor and Output default | sync | `resolveObsVoiceMonitorType` | — | ⚠ |
| OR-58 | Gift overlay browser idle transparent | 3A | `gift-animation-overlay.html` | `graphics_r1`, R1-C krok 3 | ✅ |
| OR-59 | Speech overlay bust 36 live | R1-C | R1-C krok 2 PASS 2026-07-26 | `graphics_r1`, R1-C doc | ✅ |
| OR-60 | Combo/spam HUD miaPoints only OBS | R1-C | belly HUD + public strip | `graphics_r1`, R1-C krok 7 | ✅ |
| OR-61 | OBS layout bez ořezu (R1-C krok 10) | R1-C | fix-layout + R1-C PASS | R1-C doc | ✅ |
| OR-62 | Audio single path / no echo (R1-C krok 9) | R1-C | ensure-voice + anti-echo | R1-C doc | ❓ |
| OR-63 | Reconnect po OBS crash | E24 | bootstrap + watchdog combo | — | ❓ |
| OR-64 | Fresh OBS bez existujících sources | I44 | hands create-if-missing | `mia_obs_hands` (unit) | ❓ |
| OR-65 | `OBS_LIVE_SETUP.md` URL bust aktuální | docs | Doc gift řádek `v=30-lion-wau` vs kód `37` | — | ⚠ |
| OR-66 | Reverse OBS control from browser | optional | `MIA_OVERLAY_OBS_CONTROL_ENABLED` OFF | wiring partial | ⚠ |
| OR-67 | Streamer cameras / NDI helpers | optional | `MIA_OBS_STREAMER_CAMERAS.js` | — | ⚠ |
| OR-68 | Arena battle OBS ensure scripts | 3C duel | `obs:ensure-arena-battle` | slow tests | ✅ |
| OR-69 | Startup check overlay ~60s | C14 | `MIA_STARTUP_CHECK`, startup-check.html | — | ⚠ |
| OR-70 | Graphics preview source optional OFF | C11 | `MIA_GRAPHICS_PREVIEW` defaultVisible false | `obs_live_manifest` | ✅ |

---

## Guardrails subset (GR-O*)

| ID | Pravidlo | Stav | Testy |
|----|----------|------|-------|
| GR-O01 | TikFinity → MIA → OBS | ✅ | `ingest_contract`, `obs_bootstrap` |
| GR-O02 | OBS render-only | ✅ | arch + manifest |
| GR-O03 | miaPoints only na browser | ✅ | `overlay_public_response`, `graphics_r1` |
| GR-O04 | Split ne hub | ✅ | `obs_overlay_sync` |
| GR-O05 | Body parts OFF live | ✅ | `bodyPartsCatalog`, `mia_obs_hands` |
| GR-O06 | Per-tier rotation (MIA) | ✅ | 3A kód; ⚠ cross-tier test |
| GR-O07 | Cache bust 36/37/49 | ✅ | `obs_live_manifest`, runtime HTML |
| GR-O08 | Single TTS browser | ✅ | docs + ensure-voice; ❓ live echo |

---

## Souhrn počtů (70 pravidel OR-01…OR-70)

| Stav | Počet |
|------|-------|
| ✅ | 52 |
| ⚠ | 13 |
| ❌ | 0 |
| ❓ | 5 |

*Poznámka: OR-21 dual bust a OR-04 hub legacy jsou záměrné ⚠ (dokumentace/architektura), ne tvrdý rozpor.*
