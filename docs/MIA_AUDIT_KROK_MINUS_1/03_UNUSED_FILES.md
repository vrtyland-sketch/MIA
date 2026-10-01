# MIA AUDIT KROK -1 — Potenciálně nepoužívané soubory

> Detekce: statický require/import/safeRequire scan. **NEOVĚŘENO** kde platí dynamické načítání.

## Metodologie

1. Pro každý JS v first-party složkách sestaven graf `require()` / `safeRequire()` / `import`.
2. Soubor bez příchozí hrany = **pravděpodobně_ne**.
3. Výjimky: entrypointy (`index.js`, `server.js`), testy spouštěné přímo z npm scripts.
4. Browser overlay soubory načítané přes `<script src>` v HTML — **NEOVĚŘENO** (statická analýza JS require je nevidí).

## Souhrn

| Stav | Počet |
|------|-------|
| Pravděpodobně nepoužívané (JS require graf) | 117 |
| NEOVĚŘENO (overlay HTML script tags, safeRequire dynamika) | viz sekce níže |

## Pravděpodobně nepoužívané — JS moduly

| Cesta | Kat. | Řádky | Poznámka |
|-------|------|-------|----------|
| `core/index.js` | CORE | 25 | žádný require/import v grafu |
| `game/hello/index.js` | GAME | 35 | žádný require/import v grafu |
| `ingest/index.js` | INGEST | 13 | žádný require/import v grafu |
| `mia-output-overlay/assets/boss-cinematic-fx.js` | OVERLAY | 201 | žádný require/import v grafu |
| `mia-output-overlay/assets/host-team-ui.js` | OVERLAY | 59 | žádný require/import v grafu |
| `mia-output-overlay/assets/koj-battle-fx.js` | OVERLAY | 9 | žádný require/import v grafu |
| `mia-output-overlay/assets/kojnozrout/mood-emoji.js` | OVERLAY | 4 | žádný require/import v grafu |
| `mia-output-overlay/assets/kojnozrout/pose-catalog.js` | OVERLAY | 918 | žádný require/import v grafu |
| `mia-output-overlay/assets/mia-2d-fx.js` | OVERLAY | 765 | žádný require/import v grafu |
| `mia-output-overlay/assets/mia-animation-player.js` | OVERLAY | 238 | žádný require/import v grafu |
| `mia-output-overlay/assets/mia-immersive-scene.js` | OVERLAY | 247 | žádný require/import v grafu |
| `mia-output-overlay/assets/mia-sound-cues.js` | OVERLAY | 104 | žádný require/import v grafu |
| `mia-output-overlay/koj-vector.js` | OVERLAY | 396 | žádný require/import v grafu |
| `mia-output-overlay/lib/koj-body-anchors.js` | OVERLAY | 111 | žádný require/import v grafu |
| `mia-output-overlay/lib/koj-live-motion.js` | OVERLAY | 272 | žádný require/import v grafu |
| `mia-output-overlay/lib/mia-body-part-runtime.js` | OVERLAY | 463 | žádný require/import v grafu |
| `mia-output-overlay/lib/mia-holo-motion.js` | OVERLAY | 308 | žádný require/import v grafu |
| `mia-output-overlay/lib/mia-part-rig.js` | OVERLAY | 256 | žádný require/import v grafu |
| `mia-output-overlay/lib/mia-rig-anchors.js` | OVERLAY | 255 | žádný require/import v grafu |
| `mia-output-overlay/lib/mia-tech-energy.js` | OVERLAY | 288 | žádný require/import v grafu |
| `mia-output-overlay/mia-graphics-preview.js` | OVERLAY | 43 | žádný require/import v grafu |
| `mia-output-overlay/mia-paint/app.js` | OVERLAY | 2485 | žádný require/import v grafu |
| `mia-output-overlay/mia-paint/lib/mia-graphics-client.js` | OVERLAY | 626 | žádný require/import v grafu |
| `mia-output-overlay/mia-paint/lib/mia-paint-core.js` | OVERLAY | 3033 | žádný require/import v grafu |
| `mia-output-overlay/mia-paint/lib/mia-paint-gpu.js` | OVERLAY | 2037 | žádný require/import v grafu |
| `mia-output-overlay/mia-paint/lib/mia-paint-io-browser.js` | OVERLAY | 74 | žádný require/import v grafu |
| `mia-output-overlay/mia-paint/lib/mia-paint-native-shell.js` | OVERLAY | 145 | žádný require/import v grafu |
| `mia-output-overlay/mia-paint/lib/mia-paint-plugin-host.js` | OVERLAY | 82 | žádný require/import v grafu |
| `mia-output-overlay/mia-paint/lib/mia-svg-primitives.js` | OVERLAY | 119 | žádný require/import v grafu |
| `mia-output-overlay/mia-paint/lib/timeline-editor.js` | OVERLAY | 354 | žádný require/import v grafu |
| `mia-output-overlay/mia-svg-primitives.js` | OVERLAY | 119 | žádný require/import v grafu |
| `mia-output-overlay/vendor/pixi.min.js` | OVERLAY | 1163 | žádný require/import v grafu |
| `plugins/mia-paint/grid-overlay/plugin.js` | EDITOR | 47 | žádný require/import v grafu |
| `plugins/mia-paint/koj-factory-export/plugin.js` | EDITOR | 25 | žádný require/import v grafu |
| `scripts/battle_obs_demo.js` | OBS | 95 | žádný require/import v grafu |
| `scripts/build_mia_body_parts.js` | MIA | 357 | žádný require/import v grafu |
| `scripts/build_mia_paint_browser_bundle.js` | EDITOR | 113 | žádný require/import v grafu |
| `scripts/build_mia_speak_lip_faces.js` | MIA | 173 | žádný require/import v grafu |
| `scripts/chatgpt_import_to_kanon.js` | MIA | 193 | žádný require/import v grafu |
| `scripts/fold_sort.js` | MIA | 176 | žádný require/import v grafu |
| `scripts/generate_away_loop_video.js` | MIA | 122 | žádný require/import v grafu |
| `scripts/generate_koj_stage_moods.js` | KOJNOZROUT | 116 | žádný require/import v grafu |
| `scripts/generate_mia_paint_tauri_icons.js` | EDITOR | 51 | žádný require/import v grafu |
| `scripts/gift_map_panel_apply.js` | ECONOMY | 119 | žádný require/import v grafu |
| `scripts/gift_map_screenshot_intake.js` | ECONOMY | 135 | žádný require/import v grafu |
| `scripts/kojnozrout_archive_art_sets.js` | KOJNOZROUT | 228 | žádný require/import v grafu |
| `scripts/kojnozrout_generate_pose_frames.js` | KOJNOZROUT | 195 | žádný require/import v grafu |
| `scripts/kojnozrout_generate_story_assets.js` | KOJNOZROUT | 37 | žádný require/import v grafu |
| `scripts/kojnozrout_install_ai_art.js` | KOJNOZROUT | 308 | žádný require/import v grafu |
| `scripts/kojnozrout_install_cyborg_art.js` | KOJNOZROUT | 293 | žádný require/import v grafu |
| `scripts/kojnozrout_install_robot_projector_art.js` | KOJNOZROUT | 279 | žádný require/import v grafu |
| `scripts/kojnozrout_install_soft_neon_art.js` | KOJNOZROUT | 96 | žádný require/import v grafu |
| `scripts/kojnozrout_install_v35_asset_polish.js` | KOJNOZROUT | 76 | žádný require/import v grafu |
| `scripts/kojnozrout_install_v36_koj_unify.js` | KOJNOZROUT | 350 | žádný require/import v grafu |
| `scripts/kojnozrout_move_offline_backup.js` | KOJNOZROUT | 134 | žádný require/import v grafu |
| `scripts/kojnozrout_normalize_frames.js` | KOJNOZROUT | 190 | žádný require/import v grafu |
| `scripts/kojnozrout_prepare_stages.js` | KOJNOZROUT | 55 | žádný require/import v grafu |
| `scripts/kojnozrout_scene_composer.js` | KOJNOZROUT | 142 | žádný require/import v grafu |
| `scripts/kojnozrout_seed_vital_moods.js` | KOJNOZROUT | 71 | žádný require/import v grafu |
| `scripts/kojnozrout_soft_neon_tint.js` | KOJNOZROUT | 92 | žádný require/import v grafu |
| `scripts/koj_gallery_build.js` | KOJNOZROUT | 268 | žádný require/import v grafu |
| `scripts/koj_obs_visual_audit.js` | OBS | 323 | žádný require/import v grafu |
| `scripts/koj_scene_backgrounds_build.js` | KOJNOZROUT | 35 | žádný require/import v grafu |
| `scripts/koj_status.js` | KOJNOZROUT | 79 | žádný require/import v grafu |
| `scripts/media_catalog_scan.js` | MIA | 89 | žádný require/import v grafu |
| `scripts/media_intelligence_report.js` | MIA | 132 | žádný require/import v grafu |
| `scripts/media_slots_summary.js` | MIA | 77 | žádný require/import v grafu |
| `scripts/media_videos_2_intake.js` | MIA | 135 | žádný require/import v grafu |
| `scripts/media_visual_review_apply.js` | MIA | 539 | žádný require/import v grafu |
| `scripts/mia_apply_master_vault.js` | MIA | 181 | žádný require/import v grafu |
| `scripts/mia_build_cyber_alpha.js` | MIA | 209 | žádný require/import v grafu |
| `scripts/mia_canon_audit.js` | MIA | 287 | žádný require/import v grafu |
| `scripts/mia_display_self_check.js` | MIA | 129 | žádný require/import v grafu |
| `scripts/mia_guided_walkthrough.js` | MIA | 408 | žádný require/import v grafu |
| `scripts/mia_repair_obs_gift_videos.js` | OBS | 197 | žádný require/import v grafu |
| `scripts/mia_setup_secrets_folder.js` | MIA | 171 | žádný require/import v grafu |
| `scripts/MIA_TEXT_BANK_COVERAGE.js` | MIA | 334 | žádný require/import v grafu |
| `scripts/MIA_TEXT_BANK_LEGACY_INLINE.js` | MIA | 927 | žádný require/import v grafu |
| `scripts/MIA_VAULT.js` | MIA | 46 | žádný require/import v grafu |
| `scripts/mia_visual_self_check.js` | MIA | 155 | žádný require/import v grafu |
| `scripts/obs_apply_away_eyes.js` | OBS | 150 | žádný require/import v grafu |
| `scripts/obs_apply_away_scene.js` | OBS | 30 | žádný require/import v grafu |
| `scripts/obs_discover_ndi_cameras.js` | OBS | 35 | žádný require/import v grafu |
| `scripts/obs_ensure_arena.js` | OBS | 116 | žádný require/import v grafu |
| `scripts/obs_ensure_arena_battle.js` | OBS | 126 | žádný require/import v grafu |
| `scripts/obs_ensure_arena_battle_test.js` | OBS | 105 | žádný require/import v grafu |
| `scripts/obs_ensure_streamer_cameras.js` | OBS | 102 | žádný require/import v grafu |
| `scripts/obs_ensure_voice.js` | OBS | 73 | žádný require/import v grafu |
| `scripts/obs_fix_camera_visible.js` | OBS | 123 | žádný require/import v grafu |
| `scripts/obs_fix_gift_video_layers.js` | OBS | 58 | žádný require/import v grafu |
| `scripts/obs_move_koj_visible.js` | OBS | 74 | žádný require/import v grafu |
| `scripts/obs_prepare_tiktok_live.js` | OBS | 144 | žádný require/import v grafu |
| `scripts/obs_print_away_manifest.js` | OBS | 8 | žádný require/import v grafu |
| `scripts/obs_print_manifest.js` | OBS | 11 | žádný require/import v grafu |
| `scripts/obs_refresh_overlays.js` | OBS | 214 | žádný require/import v grafu |
| `scripts/obs_register_streamer_cameras.js` | OBS | 34 | žádný require/import v grafu |
| `scripts/obs_setup_notebook_camera.js` | OBS | 176 | žádný require/import v grafu |
| `scripts/obs_set_canvas.js` | OBS | 146 | žádný require/import v grafu |
| `scripts/obs_stream_prep.js` | OBS | 62 | žádný require/import v grafu |
| `scripts/obs_verify_camera.js` | OBS | 90 | žádný require/import v grafu |
| `scripts/obs_visibility_diag.js` | OBS | 119 | žádný require/import v grafu |
| `scripts/promote_ai_animation_to_bank.js` | MIA | 82 | žádný require/import v grafu |
| `scripts/remote_connectivity_check.js` | MIA | 107 | žádný require/import v grafu |
| `scripts/remote_setup_all.js` | MIA | 176 | žádný require/import v grafu |
| `scripts/telegram_setup_hint.js` | MIA | 26 | žádný require/import v grafu |
| `scripts/twitch_eventsub_probe.js` | MIA | 51 | žádný require/import v grafu |
| `scripts/twitch_oauth_login.js` | MIA | 206 | žádný require/import v grafu |
| `shared/next/share_runtime_share_debug_route.js` | MIA | 275 | žádný require/import v grafu |
| `shared/runtime_execution/executors/bowl_executor.js` | MIA | 20 | žádný require/import v grafu |
| `shared/runtime_execution/executors/overlay_executor.js` | MIA | 20 | žádný require/import v grafu |
| `shared/runtime_execution/executors/video_executor.js` | MIA | 22 | žádný require/import v grafu |
| `shared/runtime_execution/intent_resolver.js` | MIA | 48 | žádný require/import v grafu |
| `shared/runtime_execution/utils/execution_result.js` | MIA | 96 | žádný require/import v grafu |
| `src/routes/ingestroute.js` | UNKNOWN | 8 | žádný require/import v grafu |
| `tests/process_event_fallback_regression.js` | TEST | 171 | žádný require/import v grafu |
| `tests/shadow_pipeline_integration.js` | TEST | 308 | žádný require/import v grafu |
| `tools/mia-paint-tauri/ui/bridge.js` | EDITOR | 68 | žádný require/import v grafu |

## NEOVĚŘENO — overlay/browser assety

Tyto soubory nemají Node require hrany, ale mohou být načteny v OBS browser source:

- `mia-output-overlay/assets/boss-cinematic-fx.js`
- `mia-output-overlay/assets/host-team-ui.js`
- `mia-output-overlay/assets/koj-battle-fx.js`
- `mia-output-overlay/assets/kojnozrout/mood-emoji.js`
- `mia-output-overlay/assets/kojnozrout/pose-catalog.js`
- `mia-output-overlay/assets/mia-2d-fx.js`
- `mia-output-overlay/assets/mia-animation-player.js`
- `mia-output-overlay/assets/mia-immersive-scene.js`
- `mia-output-overlay/assets/mia-sound-cues.js`
- `mia-output-overlay/koj-vector.js`
- `mia-output-overlay/lib/koj-body-anchors.js`
- `mia-output-overlay/lib/koj-live-motion.js`
- `mia-output-overlay/lib/mia-body-part-runtime.js`
- `mia-output-overlay/lib/mia-holo-motion.js`
- `mia-output-overlay/lib/mia-part-rig.js`
- `mia-output-overlay/lib/mia-rig-anchors.js`
- `mia-output-overlay/lib/mia-tech-energy.js`
- `mia-output-overlay/mia-graphics-preview.js`
- `mia-output-overlay/mia-paint/app.js`
- `mia-output-overlay/mia-paint/lib/mia-graphics-client.js`
- `mia-output-overlay/mia-paint/lib/mia-paint-core.js`
- `mia-output-overlay/mia-paint/lib/mia-paint-gpu.js`
- `mia-output-overlay/mia-paint/lib/mia-paint-io-browser.js`
- `mia-output-overlay/mia-paint/lib/mia-paint-native-shell.js`
- `mia-output-overlay/mia-paint/lib/mia-paint-plugin-host.js`
- `mia-output-overlay/mia-paint/lib/mia-svg-primitives.js`
- `mia-output-overlay/mia-paint/lib/timeline-editor.js`
- `mia-output-overlay/mia-svg-primitives.js`
- `mia-output-overlay/vendor/pixi.min.js`

## NEOVĚŘENO — archiv_dead* složky v shared/

Složky `shared/archiv_dead/`, `archiv_dead_legacy/`, `archiv_dead_next/`, `archiv_dead_scripts/`, `archiv_dead_src/` — explicitně archivované mrtvé kopie. **Pravděpodobně nepoužívané**, ale neprověřeno runtime.

## NEOVĚŘENO — archive/deprecated/

Obsah `archive/deprecated/code/` — starší kopie MIA_NEXT modulů. Paralelní s aktivními moduly v `shared/`.

## NEOVĚŘENO — npm script-only skripty

Některé `scripts/*.js` se spouští pouze ručně nebo přes npm script (mimo require graf). Označit jako **NEOVĚŘENO** pokud nejsou v require grafu ale mají npm script v package.json.

String-scan (package.json + index.js + všechny .js) našel **18** script souborů bez jakékoli textové reference — většina z nich ale **má** npm script v `package.json` (např. `obs_set_canvas.js`, `fold_sort.js`). Skutečně bez reference i npm:

- `kojnozrout_canon_transform.js`, `koj_procedural_png.js`, `mia_admin_client.js`
- `MIA_MEDIA_PROBE.js`, `MIA_SOLO_STREAM_CONFIG.js`, `MIA_TEXT_BANK_COVERAGE.js`
- `mia_translate_smoke.js`, `obs_fix_camera_visible.js`, `obs_move_koj_visible.js`
- `obs_setup_notebook_camera.js`, `obs_visibility_diag.js`, `_tmp_bump_0054.js`
- `scripts/pipeline/phase_command_gate.js`, `phase_enrich.js`, `phase_execute.js`, `phase_post.js`, `phase_present.js`, `phase_session.js`

**Poznámka:** pipeline fáze jsou require-ovány dynamicky z `phase_decide.js` / `run.js` — statický scan je nevidí (**NEOVĚŘENO** runtime).
