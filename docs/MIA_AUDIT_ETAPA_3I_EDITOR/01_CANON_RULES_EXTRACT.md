# Etapa 3I — Extrakt kánonních pravidel (Editor)

Číslovaný seznam pravidel extrahovaných z kánonu / guardrails / Stream Core implementace.  
**Datum extraktu:** 2026-07-27  
**Prefix matrix:** ED-01…ED-68

---

## A. Governance, oddělení runtime, guardrails

1. **TikFinity → MIA → OBS** — editor nepřepisuje ingest business logiku; OBS jen renderuje.  
   *Zdroj:* `.cursor/rules/mia-guardrails.mdc`

2. **Editor ≠ live stream path** — Paint/Studio mimo `processEvent` / gift ingest.  
   *Zdroj:* alignment „mimo live stream tok“ · Etapa 2 flow · capability §3

3. **OBS nerovná se business logika** — editor exportuje assety; skóre/economy nerozhoduje browser source.  
   *Zdroj:* guardrails

4. **Veřejný overlay nikdy coins** — editor preview / body / bank nesmí leakovat coins do public overlay.  
   *Zdroj:* guardrails · 3B/3F

5. **Capability ≠ compliance** — Etapa 3 §06 inventarizuje schopnosti; 3I měří shodu.  
   *Zdroj:* metodika 3E+

6. **Stream Core editor tooling ≠ Master Canon 0037 plný Visual Rendering.**  
   *Zdroj:* Master 0037 🟡 / aspirace

7. **Body vrstvy na live nejsou trvalý avatar** — efemérní WOW; default skryté.  
   *Zdroj:* alignment §22 tvrdá pravidla

8. **Live avatar MIA = `#miaHolo` v speech** — ne permanentní `MIA_HEAD…FEET`.  
   *Zdroj:* alignment · 3D OR-07

---

## B. Oddělení editor ↔ stream (téma 1)

9. **Paint routes pod localAdminGuard** — `/mia/paint/*` admin/local, ne public ingest.  
   *Zdroj:* `routes/mia_paint.js`

10. **WS paint sync** — `MIA_PAINT_WS` / `/mia/paint/ws` oddělený od TikFinity ingest WS.  
    *Zdroj:* paint routes · smoke

11. **`processEvent` nevolá Paint UI** — event pipeline bez editor session.  
    *Zdroj:* `MIA_EVENT_PIPELINE.js` · flow diagram

12. **Shared `mia-paint-core` LipSync v delivery** — reuse knihovny pro live lipTrack; **není** otevření editoru.  
    *Zdroj:* `MIA_DELIVERY_RUNTIME.js` require paintCore

13. **Animation Bank consumer (gift reaction)** — live čte banku; editor jen plní staging→promote.  
    *Zdroj:* alignment Animation Engine · `MIA_ANIMATION_REACTION`

14. **Staging preview ≠ live gift path** — `/assets/mia-ai-staging/`, studioPreview; live až po promote + gate.  
    *Zdroj:* Phase 13l · productionGate

15. **Gift animation desk = admin/dev** — `routes/gift_animation.js` mimo ingest.  
    *Zdroj:* capability §7

16. **Remote Dev graphics** — `routes/remote_dev.js` volitelné; ne stream dependency.  
    *Zdroj:* capability §9

---

## C. MIA Paint jádro (browser + bridge)

17. **Browser editor** — `mia-output-overlay/mia-paint/` (`index.html`, `app.js`, lib bundle).  
    *Zdroj:* alignment · `build:mia-paint`

18. **Bridge session** — `MIA_PAINT_BRIDGE` document/viewport/autosave/export SVG.  
    *Zdroj:* `scripts/MIA_PAINT_BRIDGE.js`

19. **Autosave disk** — `data/mia-paint/autosave/` (+ projects).  
    *Zdroj:* bridge AUTOSAVE_DIR

20. **Agent API HTTP** — `/mia/paint/command`, connect, sync, status.  
    *Zdroj:* routes

21. **Graphics Agent** — `MIA_GRAPHICS_AGENT` přes paint routes.  
    *Zdroj:* capability §8 · scripts

22. **Paint AI modul** — `shared/mia-paint-ai`, trueAlpha, visual identity cyan.  
    *Zdroj:* alignment 13a/13h · `MIA_PAINT_AI.js`

23. **IO bundle** — `mia-paint-io` manifest / raster / miapaint bundle.  
    *Zdroj:* shared + paint io contract

24. **GPU tile path** — `mia-paint-gpu` (WebGPU kde dostupné).  
    *Zdroj:* paint gpu contract

25. **Plugin host** — `mia-paint-plugin-host` + `plugins/mia-paint/*`.  
    *Zdroj:* plugin loader · contract

26. **Koj bridge v Paint** — export hint / bridge contract k Koj assetům.  
    *Zdroj:* `mia_paint_koj_bridge_contract`

---

## D. Tauri / shell / standalone (téma 6)

27. **Tauri 2 shell** — `tools/mia-paint-tauri`, `npm run paint:tauri`.  
    *Zdroj:* README · package.json

28. **Vyžaduje Rust + WebView2** pro nativní okno; bez Rust → fallback `paint:shell`.  
    *Zdroj:* Tauri README

29. **Native dialogs + Windows Ink / pressure** — `mia-paint-native-shell.js` + Rust pick_open/save.  
    *Zdroj:* tauri contract · lib.rs

30. **Dokumentovaný start** — typicky `npm start` + `paint:tauri` (MIA HTTP server).  
    *Zdroj:* Tauri README „Požadavky“

31. **Offline shell flag** — `offline: true` v shell bridge; AI/export degradují bez serveru.  
    *Zdroj:* `shell.html` · `app.js` „offline“ notices

32. **Standalone ≠ full product bez MIA** — editor UI může částečně běžet; agent/bank/export potřebují server.  
    *Zdroj:* README + app.js offline paths

33. **Produkční Tauri installer na operator stroji** — alignment/capability NEOVĚŘENO.  
    *Zdroj:* capability §4 NEOVĚŘENO

---

## E. Graphics Studio + body + OBS vazby (témata 4–5)

34. **Body parts catalog** — `MIA_HEAD…MIA_FEET` v `bodyPartsCatalog.js`.  
    *Zdroj:* shared/mia-graphics-studio

35. **`defaultVisible: false` na všech body parts** — moment vrstvy.  
    *Zdroj:* catalog · 3D OR-10

36. **Dedicated assets** — `assets/mia/parts/{head,eyes,hands,torso,feet}` + `build:mia-body-parts`.  
    *Zdroj:* alignment 12u

37. **Body publish API** — `GET/POST /mia/graphics/body/*`, `bodyPartState.js`.  
    *Zdroj:* alignment

38. **Client sync** — `?sync=graphics` / `?sync=hybrid` v `mia-body-part-runtime.js`.  
    *Zdroj:* alignment

39. **OBS preview / revive** — body revive, hero portrait, composed layout (13c–13e).  
    *Zdroj:* graphics studio contracts

40. **Live mirror body** — `bodyLiveSync` ← public overlay response (stream *spotřeba*, ne editor UI).  
    *Zdroj:* alignment · cross 3F

41. **T3+ gift body moment** — `MIA_BODY_GIFT_MOMENT` efemérní (live; editor dodává art).  
    *Zdroj:* alignment

42. **Graphics preview source** — `MIA_GRAPHICS_PREVIEW` / paint preview v OBS hands aliases.  
    *Zdroj:* `MIA_OBS_HANDS.js` nameAliases

43. **Verify body layers** — `verifyGraphicsBodyLayers` v OBS verify / stream-ready.  
    *Zdroj:* alignment · cross 3D

44. **Visible speak faces / lip parity** — 13w–13z editor-owned art + live consume.  
    *Zdroj:* alignment · contracts

---

## F. Timeline / export / Animation Bank (téma 2–3)

45. **Unified timeline clock** — `timelineClock.js` + editor UI `timeline-editor.js`.  
    *Zdroj:* Phase 14 · alignment

46. **Export paint → bank** — `export_paint_to_animation_bank.js` frames → clip + sheet.  
    *Zdroj:* script header Phase 16

47. **Multi-camera C1–C6** — `cameraPresets.js`, `cameraId` v manifestu.  
    *Zdroj:* alignment · phase16 contract

48. **Animation bank schema** — `animationBankSchema.js` validateClipMetadata.  
    *Zdroj:* shared

49. **Production gate** — blokuje procedural/low-alpha; force jen explicitně.  
    *Zdroj:* `productionGate.js` · 12z

50. **Promote AI → bank** — staging → mark-production + confirm.  
    *Zdroj:* alignment 12w–12z

51. **Paint AI ↔ timeline** — Generovat animaci → import frames → bank (13i).  
    *Zdroj:* alignment

52. **Dashboard AI → staging → Paint `?aiStaging=`** (13j–13k write-back).  
    *Zdroj:* alignment

53. **Sound cues** — `mia-sound-cues.js` v timeline export path.  
    *Zdroj:* alignment Phase 14

54. **Seed bank z produkčních moods** — ne procedural blob seed.  
    *Zdroj:* alignment Animation Engine

55. **Gift resolve by shot / camera** — bank index + gift orchestrator.  
    *Zdroj:* phase16 · GiftReactionOrchestrator

---

## G. Bone / IK / AI Motion / Lip (foundation)

56. **Bone rig foundation** — `boneRig.js` chain + 2-bone IK.  
    *Zdroj:* alignment „🟢 foundation“ · phase15

57. **AI motion keyframes** — `aiMotionCommands.js` procedural bounce atd.  
    *Zdroj:* phase15 contract

58. **Lip sync viseme track** — `LipSync.js` text→visemes v editoru.  
    *Zdroj:* phase15 · 13u

59. **Whisper lip + mesh** — 13v env/STT závislé.  
    *Zdroj:* alignment · capability NEOVĚŘENO kvalita

60. **Foundation ≠ production mocap** — kánon označuje Phase 15 jako foundation.  
    *Zdroj:* alignment řádek Bone/IK

---

## H. Asset management + Koj factory (téma 3)

61. **Koj 2D factory** — `generate_koj_2d_factory_gfx.js`, `koj:2d-audit` 100 %.  
    *Zdroj:* alignment

62. **Paint plugin koj-factory-export** — menu Export → Koj Factory.  
    *Zdroj:* `plugins/mia-paint/koj-factory-export/`

63. **Grid overlay plugin** — ukázkový paint plugin.  
    *Zdroj:* `plugins/mia-paint/grid-overlay/`

64. **Stream plugin engine (Poker/Monopoly)** — design only; **není** Paint plugin host.  
    *Zdroj:* capability §10 ❌ aspirace

65. **Visual identity lock** — cyan #00DCFF holo palette AI/procedural.  
    *Zdroj:* `visualIdentity.js` · 13a

66. **True alpha pipeline** — flood matte / fringe v body-parts build.  
    *Zdroj:* alignment 13h · `trueAlpha.js`

---

## I. Test / ops hranice

67. **Preflight:fast obsahuje** `mia_paint_integration`, `mia_paint_smoke`, `graphics_body` — ne celý `test:mia-paint` / `test:animation-engine`.  
    *Zdroj:* `run_preflight_tests.js` FAST list

68. **R1 live stream graphics ≠ Paint editor** — combo/HUD R1 je live; Paint je lab/tooling.  
    *Zdroj:* capability §1 vs §3

---

## Guardrails shrnutí (GR-E01…GR-E08)

| ID | Pravidlo |
|----|----------|
| GR-E01 | Editor mimo `processEvent` / live ingest |
| GR-E02 | OBS jen render; žádná economy v editor exportu jako autorita |
| GR-E03 | Public overlay bez coins |
| GR-E04 | Body parts default OFF na live |
| GR-E05 | Live avatar = `#miaHolo`, ne permanent body layers |
| GR-E06 | Staging/preview ≠ auto live promote |
| GR-E07 | Production gate před live bank sheets |
| GR-E08 | Shared lib LipSync ≠ otevření Paint UI |

*Celkem pravidel ED: **68**.*
