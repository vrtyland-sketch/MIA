# Etapa 3D — Extrakt kánonních pravidel (OBS Runtime)

Číslovaný seznam pravidel extrahovaných z kánonu. Každé pravidlo má zdrojový dokument.

---

## A. Architektura a role OBS

1. **TikFinity → MIA → OBS** — platforma ne rozhoduje ani nerenderuje business logiku; OBS jen renderuje výstupy z MIA.  
   *Zdroj:* `.cursor/rules/mia-guardrails.mdc` · `.cursor/rules/mia-canon.mdc` · `docs/KANON_MIA_AGENT.md` · `docs/OBS_LIVE_SETUP.md`

2. **OBS nemá vlastní „inteligenci“** — žádné rozhodování o gifech, bodech, vitals, duels v OBS skriptech/scénách.  
   *Zdroj:* `docs/_export_mia_graphics_system_proposal.md` · `docs/KANON_MIA_ALIGNMENT.md`

3. **Streamer.bot se nepoužívá** v produkčním OBS toku.  
   *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md`

4. **Split overlay režim** — více browser sources (speech, gift, Koj, …), ne monolitický `mia-live-hub.html`.  
   *Zdroj:* `docs/OBS_LIVE_SETUP.md` §2 · `scripts/MIA_OBS_LIVE_MANIFEST.js`

5. **Overlaye pollují `/overlay-state`** — side-effect-free GET; OBS HTML nepočítá ekonomiku.  
   *Zdroj:* `.cursor/rules/mia-canon.mdc` · `docs/KANON_MIA_ALIGNMENT.md`

6. **Gift video = Media Source / VLC sloty** (T1…T5), ne browser — MIA přes WebSocket spouští přehrání.  
   *Zdroj:* `docs/OBS_LIVE_SETUP.md` §3 · `scripts/MIA_VIDEO_ENGINE.js`

---

## B. Overlay a veřejná data (guardrails)

7. **Overlay nikdy neukazuje coins, diamondy, Kč, hodnotu giftu** — jen MIA body (`miaPoints`), profil, nickname.  
   *Zdroj:* `.cursor/rules/mia-guardrails.mdc` · `docs/MIA_GIFT_ECONOMY.md`

8. **Sanitizace na hranici MIA API** (`stripValueFieldsForPublic`) — OBS klient dostává už očištěný JSON.  
   *Zdroj:* `docs/KANON_MIA_ALIGNMENT.md` · Etapa 3A G-06

9. **Live avatar MIA = `#miaHolo` v `MIA_SPEECH` / `MIA_BUBBLE`** — ne samostatné body-party vrstvy na streamu.  
   *Zdroj:* `docs/OBS_LIVE_SETUP.md` § Clean look · `shared/mia-graphics-studio/bodyPartsCatalog.js`

10. **Body parts (`MIA_HEAD`…`MIA_FEET`) defaultně skryté** ve scéně — Graphics Studio / hybrid sync, ne stream feature.  
    *Zdroj:* `docs/OBS_LIVE_SETUP.md` · `bodyPartsCatalog.js` `defaultVisible: false`

---

## C. Live manifest a browser sources

11. **`MIA_OBS_LIVE_MANIFEST.js` = jediný zdroj pravdy** pro OBS browser vrstvy, z-index, aliasy, URL.  
    *Zdroj:* `docs/OBS_LIVE_SETUP.md` §8 · manifest header comment

12. **Scéna programu:** `SPINAK_ENGINE_GIFTS` (override `MIA_OBS_CAMERA_SCENE`).  
    *Zdroj:* manifest `DEFAULT_SCENE` · `docs/OBS_LIVE_SETUP.md`

13. **Aliasy jmen zdrojů** — `MIA_BUBBLE` ↔ `MIA_SPEECH`, `KOJNOZROUT_RUNTIME` ↔ `MIA_KOJ_RUNTIME`, bowl aliasy.  
    *Zdroj:* `OBS_INPUT_NAME_ALIASES` v manifestu · `MIA_OBS_HANDS.js`

14. **Moment vrstvy default OFF** — combo, gift moment, duel, story, startup; MIA zapíná přes overlay state polling.  
    *Zdroj:* `BROWSER_LAYERS` `moment: true, defaultVisible: false` · `docs/OBS_LIVE_SETUP.md`

15. **Trvale viditelné vrstvy:** ENTITY, VIEWER_STRIP, BOWL, RUNTIME, SPEECH, VOICE (split kánon).  
    *Zdroj:* `docs/OBS_LIVE_SETUP.md` § Clean look

16. **`MIA_VOICE` — jediný TTS audio browser** — Control audio ON, Monitor and Output, VB-Cable → TikTok mic.  
    *Zdroj:* `docs/OBS_LIVE_SETUP.md` §4 · `obs:ensure-voice`

17. **NE duplicitní speech/hub/legacy overlay** — hub a starý `mia-overlay.html` nepatří do live scény.  
    *Zdroj:* `docs/OBS_LIVE_SETUP.md` §5

---

## D. Cache bust a refresh

18. **GFX cache bust `36-koj-unify`** — speech, bowl, manifest browser URL query `v=36-koj-unify`.  
    *Zdroj:* `MIA_OBS_LIVE_MANIFEST.js` `GFX_CACHE_BUST` · `docs/MIA_GRAPHICS_R1_STATUS.md`

19. **Gift animation bust `37-stream-polish`** — oddělený od speech/Koj v36.  
    *Zdroj:* `GIFT_ANIM_CACHE_BUST` · R1-C krok 3

20. **Koj split libs bust `49-r1-milestone-polish`** — uvnitř `kojnozrout-runtime.html` a split JS/CSS; manifest URL runtime může nést v36, vnitřní assety v49.  
    *Zdroj:* `KOJ_SPLIT_CACHE_BUST` · `kojnozrout-runtime.html` · R1-C krok 4

21. **`npm run obs:refresh-overlays`** — refresh cache tlačítko + vynucený URL bust (refreshnocache samo nestačí).  
    *Zdroj:* `scripts/obs_refresh_overlays.js` · `package.json`

22. **Gift anim refresh nesmí dostat GFX v36** — refresh script rozlišuje `gift-animation-overlay` vs ostatní.  
    *Zdroj:* `obs_refresh_overlays.js` `isGiftAnim` větev

---

## E. Connect, bootstrap, health

23. **OBS WebSocket** — default `ws://127.0.0.1:4455`, heslo z `.env` (`OBS_WS_PASSWORD`).  
    *Zdroj:* `MIA_OBS_BOOTSTRAP.js` · `docs/MIA_AUDIT_ETAPA_2/07_STATE_AND_FLAGS.md`

24. **Reconnect smyčka** — periodický reconnect (~5 s) když port otevřený ale WS disconnected.  
    *Zdroj:* `createObsBootstrap` `reconnectMs`

25. **Health snapshot** — rozlišuje: connected, safe_mode_or_websocket_off, obs_not_running, port_open_not_connected.  
    *Zdroj:* `buildObsHealthSnapshot` v bootstrap

26. **Post-connect bootstrap pořadí:** hands → hub config (legacy) → layout fix → transforms → voice ready → optional vision → browser refresh → mia eyes webcam.  
    *Zdroj:* `MIA_OBS_POST_CONNECT_RUNTIME.js`

27. **`safeObsCall` wrapper** — všechny OBS WS volání přes bezpečný obal (disconnect tolerance).  
    *Zdroj:* `MIA_OBS_SAFE_CALL.js` · contract `obs_safe_call`

28. **Scene guard při bootu** — scan mrtvých media cest ve scénách → varování (ne auto-delete).  
    *Zdroj:* `MIA_OBS_SCENE_GUARD.js` · bootstrap `warnOnDeadObsSceneFiles`

---

## F. Layout, portrait/landscape, zóny

29. **1080p landscape layout po `obs:fix-layout`** — ENTITY L-top, VIEWER_STRIP L-bottom, BOWL R-top, KOJ R-bottom, SPEECH fullscreen.  
    *Zdroj:* `docs/OBS_LIVE_SETUP.md` § Pozice · `obs_fix_overlay_layout.js`

30. **Hard layout zones — nulový overlap** MIA holo / bublina / Koj dock (`tiktok-viewer-zones.css`).  
    *Zdroj:* `docs/OBS_LIVE_SETUP.md` § Hard layout zones

31. **Portrait canvas 1080×1920 pro TikTok na výšku** — `npm run obs:portrait`; landscape 1920×1080 — `npm run obs:landscape`.  
    *Zdroj:* `scripts/obs_set_canvas.js`

32. **Po změně canvasu přerovnat overlaye** — `obs_set_canvas.js` volá `applyObsOverlayLayout`.  
    *Zdroj:* `obs_set_canvas.js` import layout fix

33. **Koj pravý dolní roh** — OBS transform + runtime dock (~300 px, wander rules v HTML).  
    *Zdroj:* `docs/OBS_LIVE_SETUP.md` · 3C KJ-02 · `MIA_OBS_HANDS` runtime transform

---

## G. Video engine a OBS playback

34. **Per-tier video rotace v MIA** (`rotationIndexByTier`) — OBS jen přehrává vybraný slot; index se neresetuje mezi tiery.  
    *Zdroj:* `.cursor/rules/mia-guardrails.mdc` · `MIA_VIDEO_ENGINE.js` · 3A G-31

35. **Queue merge / interrupt policy** v MIA — OBS nedrží frontu gift videí.  
    *Zdroj:* `MIA_VIDEO_ENGINE.js` queue config

36. **Persistent stream overlays on top** po connect — speech/Koj/voice vrstvy nad gift video během přehrání.  
    *Zdroj:* `MIA_OBS_PERSISTENT_LAYERS.js` · post-connect hook

37. **Scene switch optional** — auto switch na gift scénu a restore po playback (configurable).  
    *Zdroj:* `MIA_VIDEO_ENGINE.js` sceneSwitch config

38. **Mute gift video během MIA voice** (anti-echo) — default ON v runtime config.  
    *Zdroj:* `MIA_VIDEO_ENGINE.js` `muteGiftVideoDuringMiaVoice`

---

## H. Watchdog, away, vision

39. **OBS Watchdog** — když proces `obs64.exe` neběží, MIA může spustit OBS (cooldown, max attempts); když proces běží, reconnect řeší bootstrap.  
    *Zdroj:* `MIA_OBS_WATCHDOG.js`

40. **Watchdog nespouští OBS pokud proces už běží** (safe mode / WS off = jiná větev).  
    *Zdroj:* watchdog `ensureRunning` noop branch

41. **Away scéna `SPINAK_NEJSEM_TU`** — host mode overlay + away loop; přepnutí scény volitelné (`MIA_AWAY_OBS_SCENE_SWITCH`).  
    *Zdroj:* `docs/OBS_LIVE_SETUP.md` § AWAY · `MIA_OBS_AWAY_SCENE.js`

42. **OBS Vision volitelný** — screenshot/propriocepce scény; default OFF (`MIA_OBS_VISION` commented).  
    *Zdroj:* Etapa 2 flags · `MIA_OBS_VISION.js`

43. **Koj render-report** — browser POST `/mia/koj/render-report` pro propriocepci (MIA side, ne OBS logika).  
    *Zdroj:* 3C KJ-55 · runtime HTML

---

## I. Operátor a stream-ready

44. **Pre-stream checklist:** `npm run obs:stream-ready`, `obs:verify-stream-ready`, `obs:apply-hands`.  
    *Zdroj:* `docs/OBS_LIVE_SETUP.md` §1, §6

45. **API manifest:** `GET /obs/live-manifest` — JSON pro operátora a skripty.  
    *Zdroj:* manifest `buildLiveManifest` · `OBS_LIVE_SETUP.md`

46. **Overlay audit endpoint:** `GET /obs/overlay-audit` — diagnostika duplicitního hlasu / vrstev.  
    *Zdroj:* `docs/OBS_LIVE_SETUP.md` § Clean look

47. **R1-C manuální gate** — 10-krokový OBS checklist před graphics tagem; historicky PASS 2026-07-26.  
    *Zdroj:* `docs/MIA_GRAPHICS_R1_STATUS.md` · `docs/MIA_R1C_OBS_RESULT.md`

48. **Po větší změně stream/OBS logiky:** `node --check index.js` + `npm run test:preflight:fast`.  
    *Zdroj:* `.cursor/rules/mia-guardrails.mdc`

---

## J. Cross-module (jen OBS transport)

49. **Gift overlay browser** — zobrazuje animaci z MIA payloadu; tier video jde paralelně přes media sloty (3A).  
    *Zdroj:* 3A G-07 · `gift-animation-overlay.html`

50. **Speech overlay** — holo + bublina; combo/spam CSS reaguje na `comboMoment`/`spamSession` (miaPoints only).  
    *Zdroj:* R1-C krok 2 · `graphics_r1` contract

51. **Duel / arena OBS vrstvy** — `MIA_DUEL`, `obs:ensure-arena-battle` — vizuální bar, body z MIA (3B miaPoints).  
    *Zdroj:* `package.json` obs:ensure-arena* · 3B BE-*

52. **Body sync hybrid default pro hands** — URL s `?sync=hybrid` pro studio mirror; live stále skryté.  
    *Zdroj:* `MIA_OBS_BODY_SYNC.js` · `OBS_LIVE_SETUP.md` header

---

## K. Guardrails subset (Etapa 3D)

| ID | Pravidlo |
|----|----------|
| GR-O01 | TikFinity → MIA → OBS |
| GR-O02 | OBS render-only (žádná business logika) |
| GR-O03 | Overlay public = miaPoints only (MIA strip, OBS poll) |
| GR-O04 | Split overlays, ne hub monolith |
| GR-O05 | Body parts OFF on live |
| GR-O06 | Per-tier video rotation bez resetu (MIA engine) |
| GR-O07 | Cache bust vrstvy 36 / 37 / 49 |
| GR-O08 | Single TTS audio source (`MIA_VOICE`) |
