# Etapa 3I — Compliance matrix (Editor)

**Datum:** 2026-07-27  
**Pravidla:** ED-01…ED-68 (= 68)  
**Poslední ověření:** *fresh* = code/source review 2026-07-27 (docs-only; contracty **neběžely** znovu); *hist.* = capability/Etapa 3 / R1; *nikdy* = bez důkazu.

| ID | Pravidlo (zkráceně) | Impl | Test | Status | Poslední ověření |
|----|---------------------|------|------|--------|------------------|
| ED-01 | TikFinity→MIA→OBS; editor nepřepisuje ingest | Guardrails + paint mimo pipeline | inventář code | ✅ | fresh |
| ED-02 | Editor ≠ live stream / processEvent | Flow + EVENT_PIPELINE bez paint | Etapa 2 flow · smoke | ✅ | fresh |
| ED-03 | OBS ≠ business logika | Export assetů; skóre v MIA | cross 3D/3F | ✅ | fresh |
| ED-04 | Overlay nikdy coins | Public strip + body API | overlay_state · graphics_body | ✅ | fresh code; live hist. 3F |
| ED-05 | Capability ≠ compliance | Tento pack vs §06 | metodika | ✅ | fresh |
| ED-06 | Stream tooling ≠ Master 0037 plný | Paint/Studio subset | Master 🟡 | ⚠ | fresh — aspirace |
| ED-07 | Body ≠ trvalý avatar | catalog moment + defaultVisible false | graphics_body · 3D | ✅ | fresh |
| ED-08 | Live avatar = #miaHolo | speech-overlay | graphics_r1 · 3D | ✅ | fresh code; viz hist. |
| ED-09 | Paint routes localAdminGuard | `routes/mia_paint.js` | mia_paint_integration | ✅ | fresh |
| ED-10 | Paint WS oddělený od ingest | MIA_PAINT_WS | mia_paint_smoke | ✅ | fresh |
| ED-11 | processEvent nevolá Paint UI | EVENT_PIPELINE | code review | ✅ | fresh |
| ED-12 | Shared LipSync v delivery ≠ editor | DELIVERY_RUNTIME require paintCore | lip/voice contracts 🟡 | ⚠ | fresh — shared coupling |
| ED-13 | Bank consumer live; editor plní | AnimationBank + promote | animation-engine 🟡 | ✅ | fresh |
| ED-14 | Staging ≠ live gift path | staging routes + gate | 13l · 12z | ✅ | fresh |
| ED-15 | Gift animation desk admin | gift_animation routes | gift_animation_* 🟡 | ✅ | fresh |
| ED-16 | Remote Dev volitelný | remote_dev.js | remote_dev 🟡 | ⚠ | fresh — optional deploy |
| ED-17 | Browser editor mia-paint/ | HTML/JS + build:mia-paint | mia_paint_* | ✅ | fresh |
| ED-18 | Bridge session autosave/export | MIA_PAINT_BRIDGE | integration · io | ✅ | fresh |
| ED-19 | Autosave data/mia-paint/ | AUTOSAVE_DIR | io contract | ✅ | fresh |
| ED-20 | Agent HTTP command/sync | routes | integration · smoke | ✅ | fresh |
| ED-21 | Graphics Agent live AI kvalita | MIA_GRAPHICS_AGENT | studio · mia_paint_ai | ❓ | **nikdy** live AI quality |
| ED-22 | Paint AI + trueAlpha + identity | mia-paint-ai | mia_paint_ai · 13a/h | ✅ | fresh |
| ED-23 | Paint IO bundle | mia-paint-io | mia_paint_io | ✅ | fresh |
| ED-24 | GPU tile path | mia-paint-gpu | mia_paint_gpu | ✅ | fresh |
| ED-25 | Plugin host + plugins/mia-paint | plugin-host + loader | mia_paint_plugin | ✅ | fresh |
| ED-26 | Koj bridge | koj plugin + bridge | mia_paint_koj_bridge | ✅ | fresh |
| ED-27 | Tauri scaffold | tools/mia-paint-tauri | mia_paint_tauri | ✅ | fresh (scaffold) |
| ED-28 | Rust required / shell fallback | launch.ps1 README | tauri contract (detect) | ⚠ | fresh — env-dependent |
| ED-29 | Native dialogs + Ink pressure | native-shell + lib.rs | tauri contract | ✅ | fresh code |
| ED-30 | Start = npm start + paint:tauri | README | docs | ✅ | fresh |
| ED-31 | Offline shell degradace | app.js offline notices | code | ⚠ | fresh — partial offline |
| ED-32 | Standalone bez full ingest | UI bez processEvent; API potřebuje MIA | README + code | ⚠ | fresh |
| ED-33 | Tauri installer na operator PC | — | — | ❓ | **nikdy** |
| ED-34 | Body parts catalog | bodyPartsCatalog.js | graphics_body 12g+ | ✅ | fresh |
| ED-35 | defaultVisible false all parts | catalog rows | 12g · obs_live_manifest | ✅ | fresh |
| ED-36 | assets/mia/parts + build | build_mia_body_parts | 12u · 13h | ✅ | fresh |
| ED-37 | Body publish API | bodyPartState + routes | graphics_body | ✅ | fresh |
| ED-38 | sync=graphics/hybrid | mia-body-part-runtime | 12h–12k | ✅ | fresh |
| ED-39 | OBS revive / hero live operator | 13c–13e kód | graphics_body | ❓ | code fresh; **live nikdy** |
| ED-40 | bodyLiveSync z overlay public | bodyLiveSync.js | cross 3F | ✅ | fresh |
| ED-41 | T3+ gift body moment (hranice) | MIA_BODY_GIFT_MOMENT | 12n–12p 🟡 | ⚠ | fresh — live consume / editor art |
| ED-42 | GRAPHICS_PREVIEW OBS alias | MIA_OBS_HANDS | obs hands 🟡 | ✅ | fresh |
| ED-43 | verifyGraphicsBodyLayers live | MIA_OBS_VERIFY | obs verify 🟡 | ❓ | code fresh; **live nikdy** |
| ED-44 | Speak faces / lip parity art | 13w–13z | graphics_body | ✅ | fresh |
| ED-45 | Timeline clock + editor UI | timelineClock + timeline-editor | mia_timeline_editor | ✅ | fresh |
| ED-46 | export_paint_to_animation_bank | script | phase16 | ✅ | fresh |
| ED-47 | Multi-cam C1–C6 cameraId | cameraPresets | phase16 | ✅ | fresh |
| ED-48 | Bank schema validate | animationBankSchema | animation contracts | ✅ | fresh |
| ED-49 | Production gate | productionGate.js | 12z | ✅ | fresh |
| ED-50 | Promote + confirm ops risk | promote scripts | 12w | ⚠ | fresh — ops musí respektovat gate |
| ED-51 | Paint AI ↔ timeline 13i | import_animation_frames | 13i | ✅ | fresh |
| ED-52 | Dashboard staging write-back | 13j–13k | 13j · 13k | ✅ | fresh |
| ED-53 | Sound cues timeline | mia-sound-cues | timeline 🟡 thin | ⚠ | fresh — thin coverage |
| ED-54 | Seed bank z produkčních moods | seed/build scripts | animation production | ✅ | fresh |
| ED-55 | Gift resolve by camera live stream | GiftReactionOrchestrator | phase16 · gift_visual 🟡 | ❓ | unit fresh claim; **live nikdy** |
| ED-56 | Bone rig + 2-bone IK | boneRig.js | phase15 | ⚠ | fresh — foundation |
| ED-57 | AI motion keyframes | aiMotionCommands | phase15 | ⚠ | fresh — foundation |
| ED-58 | Lip viseme track editor | LipSync.js | phase15 · 13u | ✅ | fresh |
| ED-59 | Whisper lip + mesh live | 13v | 13v contract 🟡 | ❓ | code/contract path; **live nikdy** |
| ED-60 | Foundation ≠ prod mocap | alignment wording | phase15 label | ⚠ | fresh |
| ED-61 | Koj 2D factory + audit | generate + koj:2d-audit | koj:2d-audit | ✅ | hist. alignment 100 % |
| ED-62 | koj-factory-export plugin | plugins/mia-paint | plugin + koj bridge | ✅ | fresh |
| ED-63 | grid-overlay plugin | plugins | mia_paint_plugin | ✅ | fresh |
| ED-64 | Stream plugin engine aspirace | design only | capability ❌ | ⚠ | fresh — OUT aspirace |
| ED-65 | Visual identity cyan lock | visualIdentity.js | 13a | ✅ | fresh |
| ED-66 | True alpha body build | trueAlpha + build parts | 13h | ✅ | fresh |
| ED-67 | Fast preflight ⊂ full suites | FAST: smoke+integration+graphics_body | run_preflight | ⚠ | fresh — coverage gap |
| ED-68 | R1 live graphics ≠ Paint editor | capability §1 vs §3 | graphics_r1 vs paint | ✅ | fresh |

---

## Souhrn statusů (musí sedět se SUMMARY)

| Stav | Počet | IDs |
|------|-------|-----|
| ✅ | **48** | ED-01…05,07…11,13…15,17…20,22…27,29,30,34…38,40,42,44…49,51,52,54,58,61…63,65,66,68 |
| ⚠ | **14** | ED-06,12,16,28,31,32,41,50,53,56,57,60,64,67 |
| ❌ | **0** | — |
| ❓ | **6** | ED-21,33,39,43,55,59 |

**Kontrola:** 48 + 14 + 0 + 6 = **68**.

---

## Mapování na 6 uživatelských témat

| # | Téma | Primární ED | Dominantní stav |
|---|------|-------------|-----------------|
| 1 | Oddělení editoru od runtime | ED-02,09…12,68 | ✅ (ED-12 ⚠ shared lib) |
| 2 | Export pipeline | ED-45…55 | ✅ jádro; ED-50/53 ⚠; ED-55 ❓ live |
| 3 | Správa assetů | ED-36,48…50,54,61…66 | ✅ (+ gate ⚠ ops) |
| 4 | Vazby na overlaye | ED-04,07,08,14,34,35,40,41,44 | ✅ (+ ED-41 ⚠) |
| 5 | Kompatibilita s OBS | ED-34…39,42,43 | ✅ katalog; ED-39/43 ❓ live |
| 6 | Standalone mimo MIA | ED-27…33 | ⚠ partial; ED-33 ❓ |

---

## Poznámky k ověření

- **Docs-only:** žádný `node tests/…` v tomto běhu — „fresh“ = source review, ne fresh PASS.
- Contract existence (desítky `mia_paint_*` / `mia_graphics_studio_*` / phase15–16) = důkaz **implementace + test existence**, ne re-run 2026-07-27.
- Live OBS revive / custom timeline / Tauri install / Whisper / AI quality = **nikdy** v tomto auditu.
