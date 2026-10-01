# MIA AUDIT KROK -1 — Inventura souborů

> Datum: 2026-07-27 | Statická analýza require/import grafu. Dynamické `safeRequire()` cesty označeny **NEOVĚŘENO**.

## Kategorie (souhrn)

| Kategorie | Počet JS modulů |
|-----------|-----------------|
| MIA | 529 |
| TEST | 425 |
| OBS | 64 |
| KOJNOZROUT | 58 |
| EDITOR | 45 |
| OVERLAY | 41 |
| API | 25 |
| CORE | 17 |
| ENGINE | 14 |
| ECONOMY | 14 |
| ROUTER | 8 |
| ACTION | 7 |
| NORMALIZER | 2 |
| BATTLE | 2 |
| GAME | 1 |
| INGEST | 1 |
| LEGACY | 1 |
| UNKNOWN | 1 |

## Legenda sloupců

| Sloupec | Význam |
|---------|--------|
| Cesta | Relativní cesta v repu |
| Kat. | CORE/ENGINE/MIA/OBS/OVERLAY/KOJNOZROUT/… |
| Řádky | Počet řádků (JS) |
| Exporty | Hlavní module.exports (max 5) |
| Použito | ano / pravděpodobně_ne / entrypoint |
| Konzumenti | Kdo require/importuje (max 3) |
| Flags | Core, Legacy, Test, Docs |


## `core/` (16 modulů)

| Cesta | Kat. | Ř. | Exporty | Použito | Konzumenti | Flags |
|-------|------|-----|---------|---------|------------|-------|
| `core/action-queue.js` | CORE | 807 | PRIORITY, DEFAULT_COALESCE_MS, isActionQueueEnabled | ano | core/index.js, routes/admin.js | C |
| `core/combo-moments.js` | CORE | 348 | isComboMomentsEnabled, createComboMomentDetector, getSharedComboMomentDetector | ano | core/index.js, scripts/pipeline/phase_enrich.js | C |
| `core/event-log.js` | CORE | 63 | appendRuntimeEvent, setEventLogEnabled, isEventLogEnabled | ano | core/index.js, scripts/pipeline/phase_enrich.js | C |
| `core/event-normalizer.js` | NORMALIZER | 284 | MIA_POINTS_PER_COIN, coinsToMiaPoints, normalizeToMiaEvent | ano | core/index.js, scripts/mia_replay.js | - |
| `core/index.js` | CORE | 25 | eventNormalizer, actionQueue, runtimeState | pravděpodobně_ne | - | C |
| `core/koj-long-term-needs.js` | CORE | 163 | RATES, createLongTermNeeds, applyLongTermNeedsSeed | ano | core/index.js, routes/admin.js | C |
| `core/mia-director.js` | CORE | 373 | MOODS, SPEAKERS, isDirectorEnabled | ano | core/index.js, routes/admin.js | C |
| `core/runtime-state.js` | CORE | 240 | DEFAULT_PATH, KOJ_REF, KOJ_CRITICAL_FIELDS | ano | core/index.js, core/stream-watchdog.js | C |
| `core/settings-bundle.js` | CORE | 150 | BUNDLE_VERSION, BUNDLE_KIND, buildSettingsBundle | ano | core/index.js, routes/admin.js | C |
| `core/stream-watchdog.js` | CORE | 284 | DEFAULT_INTERVAL_MS, DEFAULT_INGEST_STALE_MS, DEFAULT_RECONNECT_COOLDOWN_MS | ano | core/index.js, scripts/MIA_RUNTIME_LOOPS.js | C |
| `core/streamer-profiles.js` | CORE | 281 | PROFILE_VERSION, DEFAULT_DIR, configureStreamerProfiles | ano | core/index.js, core/settings-bundle.js | C |
| `core/tech-forms-runtime.js` | CORE | 165 | FORM_ALIASES, isTechFormsEnabled, resolveFormId | ano | core/index.js, routes/admin.js | C |
| `core/theme-manager.js` | CORE | 226 | THEMES, DEFAULT_THEME_ID, STATE_PATH | ano | core/index.js, routes/admin.js | C |
| `core/user-mode.js` | CORE | 46 | isUserModeEnabled | ano | core/index.js, routes/admin.js | C |
| `core/viewer-inventory.js` | CORE | 247 | DEFAULT_PATH, STUB_CATALOG, isInventoryEnabled | ano | core/index.js, routes/admin.js | C |
| `core/viewer-memory.js` | CORE | 398 | DEFAULT_PATH, LEVEL_THRESHOLDS, levelFromMiaPoints | ano | core/index.js, routes/admin.js | C |

## `engine2/` (14 modulů)

| Cesta | Kat. | Ř. | Exporty | Použito | Konzumenti | Flags |
|-------|------|-----|---------|---------|------------|-------|
| `engine2/composition/index.js` | ENGINE | 80 | getCompositionStatus, TARGET_LINES | ano | engine2/wiring.js, tests/mia_engine2_e5_contract.js | - |
| `engine2/event-applicator/index.js` | ENGINE | 111 | createStubState, applyNormalizedEvent | ano | engine2/event-bus-stub/index.js, engine2/index.js | - |
| `engine2/event-bus-stub/index.js` | ENGINE | 20 | - | ano | engine2/index.js, engine2/wiring.js | - |
| `engine2/flag.js` | ENGINE | 15 | - | ano | engine2/index.js, engine2/wiring.js | - |
| `engine2/game-state/index.js` | ENGINE | 48 | DEFAULT_VERSION, createGameState | ano | engine2/gamestate-stub/index.js, engine2/index.js | - |
| `engine2/gamestate-stub/index.js` | ENGINE | 9 | require | ano | tests/mia_engine2_roadmap_contract.js | - |
| `engine2/index.js` | ENGINE | 75 | isEngine2StubEnabled, createGameState, createGameStateStub | ano | engine2/wiring.js, tests/mia_engine2_e2_contract.js | - |
| `engine2/obs-router-boundary/index.js` | ENGINE | 42 | ROUTE_VERSION | ano | engine2/index.js, engine2/wiring.js | - |
| `engine2/overlay-profiles/index.js` | ENGINE | 141 | PROFILE_IDS, applyOverlayProfile | ano | engine2/index.js, engine2/wiring.js | - |
| `engine2/platform-projection/index.js` | ENGINE | 79 | PLATFORM_IDS, projectForPlatform, projectTikTok | ano | engine2/index.js, engine2/platform-renderer/index.js | - |
| `engine2/platform-renderer/index.js` | ENGINE | 48 | - | ano | engine2/index.js | - |
| `engine2/plugin-loader/index.js` | ENGINE | 219 | LOADER_VERSION, FORBIDDEN_PERMISSIONS, createPluginLoader | ano | engine2/index.js, engine2/wiring.js | - |
| `engine2/visibility-engine/index.js` | ENGINE | 75 | PLATFORMS | ano | engine2/index.js | - |
| `engine2/wiring.js` | ENGINE | 132 | buildEngine2AdminSnapshot | ano | routes/admin.js, tests/mia_engine2_e2_contract.js | - |

## `game/` (1 modulů)

| Cesta | Kat. | Ř. | Exporty | Použito | Konzumenti | Flags |
|-------|------|-----|---------|---------|------------|-------|
| `game/hello/index.js` | GAME | 35 | registerHandlers, unregisterHandlers | pravděpodobně_ne | - | - |

## `index.js/` (1 modulů)

| Cesta | Kat. | Ř. | Exporty | Použito | Konzumenti | Flags |
|-------|------|-----|---------|---------|------------|-------|
| `index.js` | CORE | 4461 | app, processEvent, normalizeIncomingEvent | ano | server.js | C |

## `ingest/` (1 modulů)

| Cesta | Kat. | Ř. | Exporty | Použito | Konzumenti | Flags |
|-------|------|-----|---------|---------|------------|-------|
| `ingest/index.js` | INGEST | 13 | phase, status, note | pravděpodobně_ne | - | - |

## `legacy/` (1 modulů)

| Cesta | Kat. | Ř. | Exporty | Použito | Konzumenti | Flags |
|-------|------|-----|---------|---------|------------|-------|
| `legacy/MIA_SUPPORT_RESOLVER.js` | LEGACY | 7 | require | ano | tests/sprint_c_contract.js | L |

## `MIA_NEXT/` (2 modulů)

| Cesta | Kat. | Ř. | Exporty | Použito | Konzumenti | Flags |
|-------|------|-----|---------|---------|------------|-------|
| `MIA_NEXT/engine_shadow_runtime.js` | MIA | 658 | runShadowPipeline, shadowProducedAction | ano | index.js, routes/video.js | - |
| `MIA_NEXT/engine_spam_session.js` | MIA | 704 | SpamSessionEngine, createSpamSessionEngine, getCappedTierByPoints | ano | index.js, MIA_NEXT/engine_shadow_runtime.js | - |

## `mia-output-overlay/` (41 modulů)

| Cesta | Kat. | Ř. | Exporty | Použito | Konzumenti | Flags |
|-------|------|-----|---------|---------|------------|-------|
| `mia-output-overlay/assets/boss-cinematic-fx.js` | OVERLAY | 201 | api | pravděpodobně_ne | - | - |
| `mia-output-overlay/assets/boss-cinematic-ui.js` | OVERLAY | 83 | api | ano | tests/boss_cinematic_contract.js | - |
| `mia-output-overlay/assets/combo-wave-ui.js` | OVERLAY | 109 | api | ano | tests/combo_wave_ui_contract.js | - |
| `mia-output-overlay/assets/host-team-ui.js` | OVERLAY | 59 | api | pravděpodobně_ne | - | - |
| `mia-output-overlay/assets/koj-battle-fx.js` | OVERLAY | 9 | - | pravděpodobně_ne | - | - |
| `mia-output-overlay/assets/kojnozrout/mood-emoji.js` | OVERLAY | 4 | - | pravděpodobně_ne | - | - |
| `mia-output-overlay/assets/kojnozrout/pose-catalog.js` | OVERLAY | 918 | - | pravděpodobně_ne | - | - |
| `mia-output-overlay/assets/mia-2d-fx.js` | OVERLAY | 765 | api | pravděpodobně_ne | - | - |
| `mia-output-overlay/assets/mia-animation-player.js` | OVERLAY | 238 | api | pravděpodobně_ne | - | - |
| `mia-output-overlay/assets/mia-immersive-scene.js` | OVERLAY | 247 | - | pravděpodobně_ne | - | - |
| `mia-output-overlay/assets/mia-sound-cues.js` | OVERLAY | 104 | api | pravděpodobně_ne | - | - |
| `mia-output-overlay/koj-vector.js` | OVERLAY | 396 | - | pravděpodobně_ne | - | - |
| `mia-output-overlay/lib/koj-body-anchors.js` | OVERLAY | 111 | api | pravděpodobně_ne | - | - |
| `mia-output-overlay/lib/koj-live-motion.js` | OVERLAY | 272 | api | pravděpodobně_ne | - | - |
| `mia-output-overlay/lib/koj-runtime-belly.js` | OVERLAY | 574 | api | ano | tests/kojnozout_runtime_split_contract.js, tests/mia_graphics_r1_contract.js | - |
| `mia-output-overlay/lib/koj-runtime-fx.js` | OVERLAY | 205 | api | ano | tests/kojnozout_runtime_split_contract.js | - |
| `mia-output-overlay/lib/koj-runtime-pose.js` | OVERLAY | 501 | api | ano | tests/kojnozout_runtime_split_contract.js | - |
| `mia-output-overlay/lib/koj-runtime-scene.js` | OVERLAY | 336 | api | ano | tests/kojnozout_runtime_split_contract.js, tests/mia_graphics_r1_contract.js | - |
| `mia-output-overlay/lib/koj-runtime-sprite.js` | OVERLAY | 371 | api | ano | tests/kojnozout_runtime_split_contract.js | - |
| `mia-output-overlay/lib/koj-runtime-stage.js` | OVERLAY | 338 | api | ano | tests/kojnozout_runtime_split_contract.js, tests/mia_graphics_r1_contract.js | - |
| `mia-output-overlay/lib/koj-runtime-walk.js` | OVERLAY | 52 | api | ano | tests/kojnozout_runtime_split_contract.js | - |
| `mia-output-overlay/lib/mia-body-part-runtime.js` | OVERLAY | 463 | - | pravděpodobně_ne | - | - |
| `mia-output-overlay/lib/mia-holo-motion.js` | OVERLAY | 308 | api | pravděpodobně_ne | - | - |
| `mia-output-overlay/lib/mia-live-lip.js` | OVERLAY | 213 | api | ano | tests/mia_graphics_studio_13w_live_viseme_contract.js, tests/mia_graphics_studio_13x_live_audio_lip_contract.js | - |
| `mia-output-overlay/lib/mia-live-presence.js` | OVERLAY | 45 | cfg | ano | tests/mia_graphics_studio_14a_live_presence_contract.js | - |
| `mia-output-overlay/lib/mia-part-rig.js` | OVERLAY | 256 | api | pravděpodobně_ne | - | - |
| `mia-output-overlay/lib/mia-rig-anchors.js` | OVERLAY | 255 | api | pravděpodobně_ne | - | - |
| `mia-output-overlay/lib/mia-tech-energy.js` | OVERLAY | 288 | - | pravděpodobně_ne | - | - |
| `mia-output-overlay/lib/overlay-poll.js` | OVERLAY | 102 | api | ano | tests/kojnozout_runtime_split_contract.js | - |
| `mia-output-overlay/mia-graphics-preview.js` | OVERLAY | 43 | - | pravděpodobně_ne | - | - |
| `mia-output-overlay/mia-paint/app.js` | OVERLAY | 2485 | - | pravděpodobně_ne | - | - |
| `mia-output-overlay/mia-paint/lib/mia-graphics-client.js` | OVERLAY | 626 | - | pravděpodobně_ne | - | - |
| `mia-output-overlay/mia-paint/lib/mia-paint-core.js` | OVERLAY | 3033 | - | pravděpodobně_ne | - | - |
| `mia-output-overlay/mia-paint/lib/mia-paint-gpu.js` | OVERLAY | 2037 | - | pravděpodobně_ne | - | - |
| `mia-output-overlay/mia-paint/lib/mia-paint-io-browser.js` | OVERLAY | 74 | - | pravděpodobně_ne | - | - |
| `mia-output-overlay/mia-paint/lib/mia-paint-native-shell.js` | OVERLAY | 145 | - | pravděpodobně_ne | - | - |
| `mia-output-overlay/mia-paint/lib/mia-paint-plugin-host.js` | OVERLAY | 82 | - | pravděpodobně_ne | - | - |
| `mia-output-overlay/mia-paint/lib/mia-svg-primitives.js` | OVERLAY | 119 | - | pravděpodobně_ne | - | - |
| `mia-output-overlay/mia-paint/lib/timeline-editor.js` | OVERLAY | 354 | api | pravděpodobně_ne | - | - |
| `mia-output-overlay/mia-svg-primitives.js` | OVERLAY | 119 | - | pravděpodobně_ne | - | - |
| `mia-output-overlay/vendor/pixi.min.js` | OVERLAY | 1163 | default | pravděpodobně_ne | - | - |

## `plugins/` (2 modulů)

| Cesta | Kat. | Ř. | Exporty | Použito | Konzumenti | Flags |
|-------|------|-----|---------|---------|------------|-------|
| `plugins/mia-paint/grid-overlay/plugin.js` | EDITOR | 47 | - | pravděpodobně_ne | - | - |
| `plugins/mia-paint/koj-factory-export/plugin.js` | EDITOR | 25 | activate | pravděpodobně_ne | - | - |

## `renderers/` (1 modulů)

| Cesta | Kat. | Ř. | Exporty | Použito | Konzumenti | Flags |
|-------|------|-----|---------|---------|------------|-------|
| `renderers/obs_overlay_render.js` | OBS | 103 | - | ano | index.js, tests/obs_overlay_renderer_ctx_contract.js | - |

## `routes/` (25 modulů)

| Cesta | Kat. | Ř. | Exporty | Použito | Konzumenti | Flags |
|-------|------|-----|---------|---------|------------|-------|
| `routes/admin.js` | API | 630 | registerAdminRoutes, buildDefaultAdminStatus | ano | routes/index.js, tests/phase2_admin_storyboard_contract.js | - |
| `routes/arena.js` | API | 375 | - | ano | routes/index.js | - |
| `routes/care_commands.js` | API | 470 | - | ano | index.js, tests/p2_architecture_contract.js | - |
| `routes/debug.js` | API | 415 | - | ano | routes/index.js | - |
| `routes/eyes.js` | API | 728 | - | ano | routes/index.js | - |
| `routes/gift_animation.js` | API | 180 | registerGiftAnimationRoutes | ano | routes/index.js, tests/gift_animation_generate_contract.js | - |
| `routes/health.js` | API | 45 | - | ano | routes/index.js | - |
| `routes/index.js` | API | 119 | registerAllRoutes, registerHealthRoutes, registerIngestRoutes | ano | index.js, tests/p2_architecture_contract.js | - |
| `routes/ingest.js` | API | 31 | - | ano | routes/index.js | - |
| `routes/koj.js` | API | 241 | - | ano | routes/index.js | - |
| `routes/media.js` | API | 182 | - | ano | routes/index.js | - |
| `routes/mia_paint.js` | API | 519 | - | ano | index.js, routes/index.js | - |
| `routes/obs.js` | API | 255 | - | ano | routes/index.js | - |
| `routes/overlay.js` | API | 251 | - | ano | routes/index.js | - |
| `routes/remote_dev.js` | API | 101 | - | ano | index.js, routes/index.js | - |
| `routes/remote_fold.js` | API | 173 | - | ano | routes/index.js | - |
| `routes/scene.js` | API | 219 | - | ano | routes/index.js | - |
| `routes/solo_stream.js` | API | 100 | - | ano | routes/index.js | - |
| `routes/status.js` | API | 111 | registerStatusRoutes | ano | index.js, routes/index.js | - |
| `routes/stream_session.js` | API | 93 | - | ano | index.js, routes/index.js | - |
| `routes/system.js` | API | 85 | - | ano | routes/index.js | - |
| `routes/tts.js` | API | 405 | registerTtsRoutes | ano | routes/index.js | - |
| `routes/video.js` | API | 243 | - | ano | routes/index.js | - |
| `routes/voice.js` | API | 131 | - | ano | routes/index.js | - |
| `routes/_helpers.js` | API | 27 | validateApp, safeString | ano | routes/admin.js, routes/arena.js | - |

## `scripts/` (437 modulů)

_Složka obsahuje 437 modulů — tabulka zkrácena na prvních 40 + souhrn._

| Cesta | Kat. | Ř. | Exporty | Použito | Konzumenti | Flags |
|-------|------|-----|---------|---------|------------|-------|
| `scripts/battle_obs_demo.js` | OBS | 95 | - | pravděpodobně_ne | - | - |
| `scripts/build_animation_bank.js` | MIA | 96 | - | ano | routes/eyes.js, scripts/export_paint_to_animation_bank.js | - |
| `scripts/build_mia_body_parts.js` | MIA | 357 | buildAll, detectCharacterBox | pravděpodobně_ne | - | - |
| `scripts/build_mia_paint_browser_bundle.js` | EDITOR | 113 | - | pravděpodobně_ne | - | - |
| `scripts/build_mia_speak_lip_faces.js` | MIA | 173 | - | pravděpodobně_ne | - | - |
| `scripts/chatgpt_import_to_kanon.js` | MIA | 193 | - | pravděpodobně_ne | - | - |
| `scripts/export_paint_to_animation_bank.js` | EDITOR | 178 | exportPaintFramesToBank, exportPaintMultiCameraToBank, normalizeClipId | ano | routes/eyes.js, tests/mia_phase16_contract.js | - |
| `scripts/fold_sort.js` | MIA | 176 | - | pravděpodobně_ne | - | - |
| `scripts/generate_away_loop_video.js` | MIA | 122 | generateAwayLoopVideo, OUT_FILE | pravděpodobně_ne | - | - |
| `scripts/generate_fx_manifest.js` | MIA | 27 | main | ano | scripts/generate_koj_2d_factory_gfx.js | - |
| `scripts/generate_koj_2d_factory_gfx.js` | KOJNOZROUT | 345 | generateKoj2dFactory, EVOLUTION_TIERS, BATTLE_MULTIFRAME | ano | scripts/generate_koj_stage_moods.js, tests/koj_2d_factory_contract.js | - |
| `scripts/generate_koj_stage_moods.js` | KOJNOZROUT | 116 | generateStageMoods, STAGE_MOODS | pravděpodobně_ne | - | - |
| `scripts/generate_mia_paint_tauri_icons.js` | EDITOR | 51 | - | pravděpodobně_ne | - | - |
| `scripts/generate_platform_form_anims.js` | MIA | 130 | generateForPlatform, ANIM_SPECS | ano | scripts/generate_koj_2d_factory_gfx.js, scripts/koj_2d_factory_audit.js | - |
| `scripts/gift_map_log_audit.js` | ECONOMY | 135 | collectNamesFromLogs, auditNames | ano | tests/gift_map_log_audit_contract.js | - |
| `scripts/gift_map_panel_apply.js` | ECONOMY | 119 | - | pravděpodobně_ne | - | - |
| `scripts/gift_map_screenshot_intake.js` | ECONOMY | 135 | GIFTS_FROM_SCREENSHOTS, OUT_PATH | pravděpodobně_ne | - | - |
| `scripts/kojnozrout_archive_art_sets.js` | KOJNOZROUT | 228 | - | pravděpodobně_ne | - | - |
| `scripts/kojnozrout_background_generator.js` | KOJNOZROUT | 161 | WIDTH, HEIGHT, PROGRAM_PALETTES | ano | scripts/kojnozrout_generate_animation_bank.js, scripts/kojnozrout_scene_composer.js | - |
| `scripts/KOJNOZROUT_BOWL_ENGINE.js` | KOJNOZROUT | 214 | processBowlCycle, resetBowl | ano | index.js | - |
| `scripts/kojnozrout_canon_transform.js` | KOJNOZROUT | 219 | normalizeTransformSpec, transformPngData, transformCanonFile | ano | scripts/generate_koj_2d_factory_gfx.js, scripts/generate_koj_stage_moods.js | - |
| `scripts/kojnozrout_generate_animation_bank.js` | KOJNOZROUT | 121 | generateAnimationBank, VARIANT_COUNT, VARIANTS_DIR | ano | tests/gift_visual_animation_bank_contract.js | - |
| `scripts/kojnozrout_generate_mood_assets.js` | KOJNOZROUT | 141 | generateMoodAssets, deriveDerived, FULL_DERIVE_MAP | ano | scripts/kojnozrout_restore_canon_sprites.js | - |
| `scripts/kojnozrout_generate_pose_frames.js` | KOJNOZROUT | 195 | generateF2Frames, auditPoseFrames, collectFrameKeys | pravděpodobně_ne | - | - |
| `scripts/kojnozrout_generate_story_assets.js` | KOJNOZROUT | 37 | - | pravděpodobně_ne | - | - |
| `scripts/kojnozrout_install_ai_art.js` | KOJNOZROUT | 308 | - | pravděpodobně_ne | - | - |
| `scripts/kojnozrout_install_cyborg_art.js` | KOJNOZROUT | 293 | - | pravděpodobně_ne | - | - |
| `scripts/kojnozrout_install_robot_projector_art.js` | KOJNOZROUT | 279 | - | pravděpodobně_ne | - | - |
| `scripts/kojnozrout_install_soft_neon_art.js` | KOJNOZROUT | 96 | - | pravděpodobně_ne | - | - |
| `scripts/kojnozrout_install_v35_asset_polish.js` | KOJNOZROUT | 76 | - | pravděpodobně_ne | - | - |
| `scripts/kojnozrout_install_v36_koj_unify.js` | KOJNOZROUT | 350 | - | pravděpodobně_ne | - | - |
| `scripts/KOJNOZROUT_MOOD_DERIVE.js` | KOJNOZROUT | 163 | MASTER_MOODS, EATING_VARIANT_COUNT, EATING_VARIANT_SPECS | ano | scripts/kojnozrout_generate_mood_assets.js, scripts/kojnozrout_restore_canon_sprites.js | - |
| `scripts/kojnozrout_move_offline_backup.js` | KOJNOZROUT | 134 | - | pravděpodobně_ne | - | - |
| `scripts/kojnozrout_normalize_frames.js` | KOJNOZROUT | 190 | normalizeOne, contentBox, CANVAS_W | pravděpodobně_ne | - | - |
| `scripts/kojnozrout_offline_paths.js` | KOJNOZROUT | 49 | ROOT, ASSETS, KOJ_LIVE | ano | scripts/kojnozrout_archive_art_sets.js, scripts/kojnozrout_install_ai_art.js | - |
| `scripts/kojnozrout_pose_frames.js` | KOJNOZROUT | 699 | MOOD_F2_SPECS, DERIVED_F2_SPECS, WANDER_WALK_MOODS | ano | scripts/kojnozrout_generate_pose_frames.js, scripts/koj_2d_factory_audit.js | - |
| `scripts/kojnozrout_prepare_sprite.js` | KOJNOZROUT | 121 | convertSprite, batchConvert, shouldKeyPixel | ano | scripts/generate_koj_2d_factory_gfx.js, scripts/kojnozrout_install_soft_neon_art.js | - |
| `scripts/kojnozrout_prepare_stages.js` | KOJNOZROUT | 55 | - | pravděpodobně_ne | - | - |
| `scripts/kojnozrout_restore_canon_sprites.js` | KOJNOZROUT | 205 | restoreCanonSprites, isCanonArtFile, findBestArchiveDir | ano | scripts/generate_koj_2d_factory_gfx.js, scripts/generate_koj_stage_moods.js | - |
| `scripts/kojnozrout_scene_composer.js` | KOJNOZROUT | 142 | MOOD_PROGRAM_AFFINITY, resolveProgramForMood, renderKojSpriteBuffer | pravděpodobně_ne | - | - |

_… a dalších 397 souborů ve složce `scripts/`._

<details><summary>Úplný seznam souborů (437)</summary>

- `scripts/battle_obs_demo.js` (OBS, 95 ř.)
- `scripts/build_animation_bank.js` (MIA, 96 ř.)
- `scripts/build_mia_body_parts.js` (MIA, 357 ř.)
- `scripts/build_mia_paint_browser_bundle.js` (EDITOR, 113 ř.)
- `scripts/build_mia_speak_lip_faces.js` (MIA, 173 ř.)
- `scripts/chatgpt_import_to_kanon.js` (MIA, 193 ř.)
- `scripts/export_paint_to_animation_bank.js` (EDITOR, 178 ř.)
- `scripts/fold_sort.js` (MIA, 176 ř.)
- `scripts/generate_away_loop_video.js` (MIA, 122 ř.)
- `scripts/generate_fx_manifest.js` (MIA, 27 ř.)
- `scripts/generate_koj_2d_factory_gfx.js` (KOJNOZROUT, 345 ř.)
- `scripts/generate_koj_stage_moods.js` (KOJNOZROUT, 116 ř.)
- `scripts/generate_mia_paint_tauri_icons.js` (EDITOR, 51 ř.)
- `scripts/generate_platform_form_anims.js` (MIA, 130 ř.)
- `scripts/gift_map_log_audit.js` (ECONOMY, 135 ř.)
- `scripts/gift_map_panel_apply.js` (ECONOMY, 119 ř.)
- `scripts/gift_map_screenshot_intake.js` (ECONOMY, 135 ř.)
- `scripts/kojnozrout_archive_art_sets.js` (KOJNOZROUT, 228 ř.)
- `scripts/kojnozrout_background_generator.js` (KOJNOZROUT, 161 ř.)
- `scripts/KOJNOZROUT_BOWL_ENGINE.js` (KOJNOZROUT, 214 ř.)
- `scripts/kojnozrout_canon_transform.js` (KOJNOZROUT, 219 ř.)
- `scripts/kojnozrout_generate_animation_bank.js` (KOJNOZROUT, 121 ř.)
- `scripts/kojnozrout_generate_mood_assets.js` (KOJNOZROUT, 141 ř.)
- `scripts/kojnozrout_generate_pose_frames.js` (KOJNOZROUT, 195 ř.)
- `scripts/kojnozrout_generate_story_assets.js` (KOJNOZROUT, 37 ř.)
- `scripts/kojnozrout_install_ai_art.js` (KOJNOZROUT, 308 ř.)
- `scripts/kojnozrout_install_cyborg_art.js` (KOJNOZROUT, 293 ř.)
- `scripts/kojnozrout_install_robot_projector_art.js` (KOJNOZROUT, 279 ř.)
- `scripts/kojnozrout_install_soft_neon_art.js` (KOJNOZROUT, 96 ř.)
- `scripts/kojnozrout_install_v35_asset_polish.js` (KOJNOZROUT, 76 ř.)
- `scripts/kojnozrout_install_v36_koj_unify.js` (KOJNOZROUT, 350 ř.)
- `scripts/KOJNOZROUT_MOOD_DERIVE.js` (KOJNOZROUT, 163 ř.)
- `scripts/kojnozrout_move_offline_backup.js` (KOJNOZROUT, 134 ř.)
- `scripts/kojnozrout_normalize_frames.js` (KOJNOZROUT, 190 ř.)
- `scripts/kojnozrout_offline_paths.js` (KOJNOZROUT, 49 ř.)
- `scripts/kojnozrout_pose_frames.js` (KOJNOZROUT, 699 ř.)
- `scripts/kojnozrout_prepare_sprite.js` (KOJNOZROUT, 121 ř.)
- `scripts/kojnozrout_prepare_stages.js` (KOJNOZROUT, 55 ř.)
- `scripts/kojnozrout_restore_canon_sprites.js` (KOJNOZROUT, 205 ř.)
- `scripts/kojnozrout_scene_composer.js` (KOJNOZROUT, 142 ř.)
- `scripts/kojnozrout_seed_vital_moods.js` (KOJNOZROUT, 71 ř.)
- `scripts/kojnozrout_soft_neon_tint.js` (KOJNOZROUT, 92 ř.)
- `scripts/kojnozrout_sprite_renderer.js` (KOJNOZROUT, 717 ř.)
- `scripts/kojnozrout_story_scene_renderer.js` (KOJNOZROUT, 242 ř.)
- `scripts/koj_2d_factory_audit.js` (KOJNOZROUT, 328 ř.)
- `scripts/koj_gallery_build.js` (KOJNOZROUT, 268 ř.)
- `scripts/koj_obs_visual_audit.js` (OBS, 323 ř.)
- `scripts/koj_procedural_png.js` (KOJNOZROUT, 539 ř.)
- `scripts/koj_scene_backgrounds_build.js` (KOJNOZROUT, 35 ř.)
- `scripts/koj_status.js` (KOJNOZROUT, 79 ř.)
- `scripts/live_prep.js` (MIA, 80 ř.)
- `scripts/media_apply_obs.js` (MIA, 128 ř.)
- `scripts/media_catalog_scan.js` (MIA, 89 ř.)
- `scripts/media_intelligence_report.js` (MIA, 132 ř.)
- `scripts/media_slots_summary.js` (MIA, 77 ř.)
- `scripts/media_videos_2_intake.js` (MIA, 135 ř.)
- `scripts/media_visual_review.js` (MIA, 235 ř.)
- `scripts/media_visual_review_apply.js` (MIA, 539 ř.)
- `scripts/MIA_2D_FX_REGISTRY.js` (MIA, 188 ř.)
- `scripts/MIA_ACHIEVEMENT_MOMENT.js` (MIA, 148 ř.)
- `scripts/MIA_ACTION_BUILDER_CTX.js` (MIA, 22 ř.)
- `scripts/MIA_ACTION_BUILDER_HOST.js` (MIA, 28 ř.)
- `scripts/MIA_ACTION_BUILDER_RUNTIME.js` (MIA, 153 ř.)
- `scripts/mia_admin_client.js` (MIA, 64 ř.)
- `scripts/MIA_ANIMATION_REACTION.js` (MIA, 63 ř.)
- `scripts/MIA_ANIMATION_TRACE.js` (MIA, 189 ř.)
- `scripts/mia_apply_master_vault.js` (MIA, 181 ř.)
- `scripts/MIA_ARENA_BATTLE.js` (MIA, 246 ř.)
- `scripts/MIA_ARENA_BATTLE_DEMO.js` (MIA, 175 ř.)
- `scripts/MIA_ARENA_BATTLE_DEMO_CTX.js` (MIA, 16 ř.)
- `scripts/MIA_ARENA_BATTLE_DEMO_HOST.js` (MIA, 18 ř.)
- `scripts/MIA_AWAY_MODE.js` (MIA, 240 ř.)
- `scripts/MIA_BODY_GIFT_MOMENT.js` (MIA, 159 ř.)
- `scripts/MIA_BOSS_CINEMATIC.js` (MIA, 125 ř.)
- `scripts/MIA_BOSS_MISSION.js` (MIA, 155 ř.)
- `scripts/MIA_BOSS_MISSION_CTX.js` (MIA, 24 ř.)
- `scripts/MIA_BOSS_MISSION_HOST.js` (MIA, 30 ř.)
- `scripts/MIA_BOSS_MISSION_RUNTIME.js` (MIA, 75 ř.)
- `scripts/MIA_BOWL_FULL_VIDEO.js` (MIA, 179 ř.)
- `scripts/mia_build_cyber_alpha.js` (MIA, 209 ř.)
- `scripts/mia_canon_audit.js` (MIA, 287 ř.)
- `scripts/MIA_CAPYBARA_FLOW.js` (MIA, 431 ř.)
- `scripts/MIA_CAPYBARA_FLOW_CTX.js` (MIA, 30 ř.)
- `scripts/MIA_CAPYBARA_FLOW_HOST.js` (MIA, 35 ř.)
- `scripts/MIA_CAPYBARA_FLOW_RUNTIME.js` (MIA, 111 ř.)
- `scripts/MIA_CARE_COMMANDS_CTX.js` (MIA, 40 ř.)
- `scripts/MIA_CARE_COMMANDS_HOST.js` (MIA, 62 ř.)
- `scripts/MIA_CARE_COMMANDS_WIRING.js` (MIA, 46 ř.)
- `scripts/MIA_CHAT_BRAIN.js` (MIA, 838 ř.)
- `scripts/MIA_CHAT_LEXICON.js` (MIA, 610 ř.)
- `scripts/MIA_CHAT_REWARD_ENGINE.js` (MIA, 149 ř.)
- `scripts/MIA_COMBO_OVERLAY.js` (MIA, 138 ř.)
- `scripts/MIA_COMMAND_REGISTRY.js` (MIA, 107 ř.)
- `scripts/MIA_CONFIG.js` (MIA, 673 ř.)
- `scripts/MIA_DEBUG_ROUTES_CTX.js` (ROUTER, 18 ř.)
- `scripts/MIA_DEBUG_ROUTES_HOST.js` (ROUTER, 18 ř.)
- `scripts/MIA_DEBUG_ROUTES_RUNTIME.js` (ROUTER, 54 ř.)
- `scripts/MIA_DELIVERY_CTX.js` (MIA, 49 ř.)
- `scripts/MIA_DELIVERY_HOST.js` (MIA, 62 ř.)
- `scripts/MIA_DELIVERY_RUNTIME.js` (MIA, 1354 ř.)
- `scripts/mia_display_self_check.js` (MIA, 129 ř.)
- `scripts/MIA_DISPLAY_VISION.js` (MIA, 303 ř.)
- `scripts/MIA_DUAL_VOICE.js` (MIA, 17 ř.)
- `scripts/MIA_ECOSYSTEM_ORCHESTRATOR.js` (MIA, 536 ř.)
- `scripts/MIA_ENV.js` (MIA, 29 ř.)
- `scripts/MIA_EVENT_CONTEXT.js` (MIA, 153 ř.)
- `scripts/MIA_EVENT_PIPELINE.js` (MIA, 30 ř.)
- `scripts/MIA_EVENT_PIPELINE_CTX.js` (MIA, 92 ř.)
- `scripts/MIA_EVENT_PIPELINE_HOST.js` (MIA, 100 ř.)
- `scripts/MIA_EVENT_PIPELINE_WIRING.js` (MIA, 101 ř.)
- `scripts/MIA_EYES.js` (MIA, 981 ř.)
- `scripts/MIA_FOLD_LIBRARY.js` (MIA, 208 ř.)
- `scripts/MIA_GAME_CONFIG.js` (MIA, 73 ř.)
- `scripts/MIA_GIFT_ANIMATION_CONTEXT.js` (MIA, 124 ř.)
- `scripts/MIA_GIFT_ECONOMY.js` (MIA, 371 ř.)
- `scripts/MIA_GIFT_MAP.js` (MIA, 842 ř.)
- `scripts/MIA_GIFT_MEDIA_CTX.js` (MIA, 40 ř.)
- `scripts/MIA_GIFT_MEDIA_HOST.js` (MIA, 47 ř.)
- `scripts/MIA_GIFT_MEDIA_RUNTIME.js` (MIA, 516 ř.)
- `scripts/MIA_GIFT_PRESENTATION.js` (MIA, 527 ř.)
- `scripts/MIA_GIFT_RUNTIME.js` (MIA, 216 ř.)
- `scripts/MIA_GIFT_RUNTIME_CTX.js` (MIA, 31 ř.)
- `scripts/MIA_GIFT_RUNTIME_HOST.js` (MIA, 37 ř.)
- `scripts/MIA_GIFT_SUPPORTER_PROFILE.js` (MIA, 357 ř.)
- `scripts/MIA_GIFT_TIERS.js` (MIA, 112 ř.)
- `scripts/MIA_GIFT_USER_LEDGER.js` (MIA, 121 ř.)
- `scripts/MIA_GIFT_VISUAL_COMPOSER.js` (MIA, 416 ř.)
- `scripts/MIA_GRAPHICS_AGENT.js` (MIA, 198 ř.)
- `scripts/MIA_GRAPHIC_REFERENCE.js` (MIA, 224 ř.)
- `scripts/mia_guided_walkthrough.js` (MIA, 408 ř.)
- `scripts/mia_health.js` (MIA, 59 ř.)
- `scripts/MIA_HEALTH_CTX.js` (MIA, 40 ř.)
- `scripts/MIA_HEALTH_HOST.js` (MIA, 48 ř.)
- `scripts/MIA_HEALTH_RUNTIME.js` (MIA, 181 ř.)
- `scripts/MIA_HOST_MODE_CONFIG.js` (MIA, 105 ř.)
- `scripts/MIA_HOST_TEAM_POINTS.js` (MIA, 91 ř.)
- `scripts/MIA_HOST_TEAM_UI.js` (MIA, 52 ř.)
- `scripts/MIA_IMMERSIVE_SCENE.js` (MIA, 100 ř.)
- `scripts/MIA_INGEST_DEDUPER_CTX.js` (MIA, 17 ř.)
- `scripts/MIA_INGEST_DEDUPER_HOST.js` (MIA, 19 ř.)
- `scripts/MIA_INGEST_GUARD.js` (MIA, 141 ř.)
- `scripts/MIA_INGEST_HTTP.js` (MIA, 260 ř.)
- `scripts/MIA_INGEST_HTTP_CTX.js` (MIA, 33 ř.)
- `scripts/MIA_INGEST_HTTP_HOST.js` (MIA, 36 ř.)
- `scripts/MIA_INGEST_HTTP_WIRING.js` (MIA, 54 ř.)
- `scripts/MIA_INGEST_LANE.js` (MIA, 73 ř.)
- `scripts/MIA_INGEST_QUEUE.js` (MIA, 95 ř.)
- `scripts/MIA_INGEST_UTILS_CTX.js` (MIA, 21 ř.)
- `scripts/MIA_INGEST_UTILS_HOST.js` (MIA, 29 ř.)
- `scripts/MIA_INGEST_UTILS_RUNTIME.js` (MIA, 87 ř.)
- `scripts/MIA_INTERPRETER_CTX.js` (MIA, 12 ř.)
- `scripts/MIA_INTERPRETER_HOST.js` (MIA, 12 ř.)
- `scripts/MIA_KICK_BRIDGE.js` (MIA, 584 ř.)
- `scripts/MIA_KISS_MEMORIAL.js` (MIA, 172 ř.)
- `scripts/MIA_KOJNOZROUT_ASSETS.js` (KOJNOZROUT, 335 ř.)
- `scripts/MIA_KOJNOZROUT_BACKPACK.js` (KOJNOZROUT, 234 ř.)
- `scripts/MIA_KOJNOZROUT_BOND.js` (KOJNOZROUT, 151 ř.)
- `scripts/MIA_KOJNOZROUT_CARE.js` (KOJNOZROUT, 359 ř.)
- `scripts/MIA_KOJNOZROUT_CARE_OPPORTUNITIES.js` (KOJNOZROUT, 463 ř.)
- `scripts/MIA_KOJNOZROUT_CARE_QUEST.js` (KOJNOZROUT, 327 ř.)
- `scripts/MIA_KOJNOZROUT_CARE_REWARD.js` (KOJNOZROUT, 71 ř.)
- `scripts/MIA_KOJNOZROUT_CARE_VALIDATION.js` (KOJNOZROUT, 172 ř.)
- `scripts/MIA_KOJNOZROUT_DISPLAY.js` (KOJNOZROUT, 799 ř.)
- `scripts/MIA_KOJNOZROUT_DUEL.js` (KOJNOZROUT, 287 ř.)
- `scripts/MIA_KOJNOZROUT_DUEL_BRIDGE.js` (KOJNOZROUT, 117 ř.)
- `scripts/MIA_KOJNOZROUT_ENGINE.js` (KOJNOZROUT, 867 ř.)
- `scripts/MIA_KOJNOZROUT_EVOLUTION.js` (KOJNOZROUT, 129 ř.)
- `scripts/MIA_KOJNOZROUT_ITEM_COMMAND.js` (KOJNOZROUT, 579 ř.)
- `scripts/MIA_KOJNOZROUT_ITEM_EFFECT.js` (KOJNOZROUT, 303 ř.)
- `scripts/MIA_KOJNOZROUT_ITEM_META.js` (KOJNOZROUT, 383 ř.)
- `scripts/MIA_KOJNOZROUT_MOOD_EMOJI.js` (KOJNOZROUT, 168 ř.)
- `scripts/MIA_KOJNOZROUT_PERSISTENCE.js` (KOJNOZROUT, 137 ř.)
- `scripts/MIA_KOJNOZROUT_REACTION_ORDER.js` (KOJNOZROUT, 80 ř.)
- `scripts/MIA_KOJNOZROUT_TEST_MODE.js` (KOJNOZROUT, 120 ř.)
- `scripts/MIA_KOJNOZROUT_VITALS.js` (KOJNOZROUT, 421 ř.)
- `scripts/MIA_KOJNOZROUT_VITALS_COMPANION.js` (KOJNOZROUT, 227 ř.)
- `scripts/MIA_KOJNOZROUT_WALK.js` (KOJNOZROUT, 144 ř.)
- `scripts/MIA_KOJNOZROUT_WORLD_PERSISTENCE.js` (KOJNOZROUT, 56 ř.)
- `scripts/MIA_KOJ_BATTLE_CHOREOGRAPHY.js` (MIA, 299 ř.)
- `scripts/MIA_KOJ_MOMENTS_CTX.js` (MIA, 34 ř.)
- `scripts/MIA_KOJ_MOMENTS_HOST.js` (MIA, 42 ř.)
- `scripts/MIA_KOJ_MOMENTS_RUNTIME.js` (MIA, 237 ř.)
- `scripts/MIA_KOJ_ROBOT_MODES.js` (MIA, 311 ř.)
- `scripts/MIA_KOJ_ROSTER.js` (MIA, 372 ř.)
- `scripts/MIA_LANGUAGE.js` (MIA, 413 ř.)
- `scripts/mia_live_audit.js` (MIA, 697 ř.)
- `scripts/MIA_LLM_ADAPTER.js` (MIA, 646 ř.)
- `scripts/MIA_LOG_ROTATION.js` (MIA, 82 ř.)
- `scripts/MIA_MATTING_INGEST_BRIDGE.js` (MIA, 292 ř.)
- `scripts/MIA_MATTING_INGEST_BRIDGE_CTX.js` (MIA, 20 ř.)
- `scripts/MIA_MATTING_INGEST_BRIDGE_HOST.js` (MIA, 28 ř.)
- `scripts/MIA_MEDIA_CATALOG.js` (MIA, 1071 ř.)
- `scripts/MIA_MEDIA_ORCHESTRATOR.js` (MIA, 151 ř.)
- `scripts/MIA_MEDIA_PROBE.js` (MIA, 187 ř.)
- `scripts/MIA_MEDIA_TEMPLATE_RENDERER.js` (MIA, 243 ř.)
- `scripts/MIA_MIA_EYES_CTX.js` (MIA, 18 ř.)
- `scripts/MIA_MIA_EYES_HOST.js` (MIA, 22 ř.)
- `scripts/MIA_MOOD_BRAIN.js` (MIA, 44 ř.)
- `scripts/MIA_OBS_AWAY_LOOP.js` (OBS, 313 ř.)
- `scripts/MIA_OBS_AWAY_SCENE.js` (OBS, 178 ř.)
- `scripts/MIA_OBS_BODY_PREVIEW.js` (OBS, 293 ř.)
- `scripts/MIA_OBS_BODY_SYNC.js` (OBS, 50 ř.)
- `scripts/MIA_OBS_BOOTSTRAP.js` (OBS, 371 ř.)
- `scripts/MIA_OBS_BOOTSTRAP_CTX.js` (OBS, 27 ř.)
- `scripts/MIA_OBS_BOOTSTRAP_HOST.js` (OBS, 35 ř.)
- `scripts/MIA_OBS_HANDS.js` (OBS, 573 ř.)
- `scripts/MIA_OBS_LIVE_MANIFEST.js` (OBS, 520 ř.)
- `scripts/MIA_OBS_OVERLAY_RENDERER_CTX.js` (OBS, 19 ř.)
- `scripts/MIA_OBS_OVERLAY_RENDERER_HOST.js` (OBS, 23 ř.)
- `scripts/MIA_OBS_OVERLAY_SYNC.js` (OBS, 1582 ř.)
- `scripts/MIA_OBS_OVERLAY_SYNC_CTX.js` (OBS, 31 ř.)
- `scripts/MIA_OBS_OVERLAY_SYNC_HOST.js` (OBS, 43 ř.)
- `scripts/MIA_OBS_OVERLAY_SYNC_RUNTIME.js` (OBS, 31 ř.)
- `scripts/MIA_OBS_OVERLAY_SYNC_WRAPPERS_CTX.js` (OBS, 16 ř.)
- `scripts/MIA_OBS_OVERLAY_SYNC_WRAPPERS_HOST.js` (OBS, 18 ř.)
- `scripts/MIA_OBS_PERSISTENT_LAYERS.js` (OBS, 143 ř.)
- `scripts/MIA_OBS_POST_CONNECT_CTX.js` (OBS, 31 ř.)
- `scripts/MIA_OBS_POST_CONNECT_HOST.js` (OBS, 35 ř.)
- `scripts/MIA_OBS_POST_CONNECT_RUNTIME.js` (OBS, 76 ř.)
- `scripts/MIA_OBS_SAFE_CALL.js` (OBS, 129 ř.)
- `scripts/MIA_OBS_SAFE_CALL_CTX.js` (OBS, 19 ř.)
- `scripts/MIA_OBS_SAFE_CALL_HOST.js` (OBS, 23 ř.)
- `scripts/MIA_OBS_SCENE_GUARD.js` (OBS, 92 ř.)
- `scripts/MIA_OBS_STREAMER_CAMERAS.js` (OBS, 243 ř.)
- `scripts/MIA_OBS_VERIFY.js` (OBS, 718 ř.)
- `scripts/MIA_OBS_VISION.js` (OBS, 870 ř.)
- `scripts/MIA_OBS_VISION_CTX.js` (OBS, 22 ř.)
- `scripts/MIA_OBS_VISION_HOST.js` (OBS, 28 ř.)
- `scripts/MIA_OBS_WATCHDOG.js` (OBS, 137 ř.)
- `scripts/MIA_OBS_WATCHDOG_CTX.js` (OBS, 19 ř.)
- `scripts/MIA_OBS_WATCHDOG_HOST.js` (OBS, 23 ř.)
- `scripts/MIA_OUTPUT_POLICY.js` (MIA, 297 ř.)
- `scripts/MIA_OUTPUT_POLICY_CTX.js` (MIA, 14 ř.)
- `scripts/MIA_OUTPUT_POLICY_HOST.js` (MIA, 18 ř.)
- `scripts/MIA_OUTPUT_STATE.js` (MIA, 582 ř.)
- `scripts/MIA_OVERLAY_EMIT_RESULT.js` (MIA, 46 ř.)
- `scripts/MIA_OVERLAY_PUBLIC_CTX.js` (MIA, 62 ř.)
- `scripts/MIA_OVERLAY_PUBLIC_HOST.js` (MIA, 61 ř.)
- `scripts/MIA_OVERLAY_PUBLIC_RESPONSE.js` (MIA, 341 ř.)
- `scripts/MIA_OVERLAY_PUBLIC_WIRING.js` (MIA, 63 ř.)
- `scripts/MIA_OVERLAY_QUEUE.js` (MIA, 87 ř.)
- `scripts/MIA_OVERLAY_QUEUE_CTX.js` (MIA, 16 ř.)
- `scripts/MIA_OVERLAY_QUEUE_HOST.js` (MIA, 18 ř.)
- `scripts/MIA_OVERLAY_STATE.js` (MIA, 1089 ř.)
- `scripts/MIA_OVERLAY_STATE_CACHE_CTX.js` (MIA, 16 ř.)
- `scripts/MIA_OVERLAY_STATE_CACHE_HOST.js` (MIA, 18 ř.)
- `scripts/MIA_OVERLAY_STATE_CTX.js` (MIA, 23 ř.)
- `scripts/MIA_OVERLAY_STATE_HOST.js` (MIA, 29 ř.)
- `scripts/MIA_OVERLAY_STATE_RUNTIME.js` (MIA, 63 ř.)
- `scripts/MIA_OVERLAY_TIMING.js` (MIA, 62 ř.)
- `scripts/MIA_OVERLAY_TIMING_CTX.js` (MIA, 16 ř.)
- `scripts/MIA_OVERLAY_TIMING_HOST.js` (MIA, 18 ř.)
- `scripts/MIA_PAINT_AI.js` (MIA, 195 ř.)
- `scripts/MIA_PAINT_BRIDGE.js` (MIA, 511 ř.)
- `scripts/MIA_PAINT_NATIVE_BRIDGE.js` (MIA, 75 ř.)
- `scripts/MIA_PAINT_PLUGIN_LOADER.js` (MIA, 76 ř.)
- `scripts/MIA_PAINT_SMOKE.js` (MIA, 336 ř.)
- `scripts/MIA_PAINT_WS.js` (MIA, 153 ř.)
- `scripts/MIA_PARTICIPANT_CTX.js` (MIA, 21 ř.)
- `scripts/MIA_PARTICIPANT_HOST.js` (MIA, 29 ř.)
- `scripts/MIA_PARTICIPANT_RUNTIME.js` (MIA, 57 ř.)
- `scripts/MIA_PIPELINE_SUMMARY_CTX.js` (MIA, 19 ř.)
- `scripts/MIA_PIPELINE_SUMMARY_HOST.js` (MIA, 25 ř.)
- `scripts/MIA_PIPELINE_SUMMARY_RUNTIME.js` (MIA, 45 ř.)
- `scripts/MIA_PLATFORM_ARENA.js` (MIA, 707 ř.)
- `scripts/MIA_PLATFORM_BRIDGES.js` (MIA, 257 ř.)
- `scripts/MIA_PLATFORM_BRIDGES_CTX.js` (MIA, 29 ř.)
- `scripts/MIA_PLATFORM_BRIDGES_HOST.js` (MIA, 33 ř.)
- `scripts/MIA_PORT_GUARD.js` (MIA, 246 ř.)
- `scripts/MIA_PRESENTATION_PLAN.js` (MIA, 55 ř.)
- `scripts/MIA_PROACTIVE_HOST.js` (MIA, 394 ř.)
- `scripts/MIA_REMOTE_DEV.js` (MIA, 376 ř.)
- `scripts/mia_remote_dev_watcher.js` (MIA, 252 ř.)
- `scripts/mia_repair_obs_gift_videos.js` (OBS, 197 ř.)
- `scripts/mia_replay.js` (MIA, 220 ř.)
- `scripts/MIA_RESPONSE_ENGINE.js` (MIA, 1579 ř.)
- `scripts/mia_restart.js` (MIA, 114 ř.)
- `scripts/MIA_ROUTE_CONTEXT.js` (ROUTER, 225 ř.)
- `scripts/MIA_ROUTE_CONTEXT_BOOT.js` (ROUTER, 66 ř.)
- `scripts/MIA_ROUTE_CONTEXT_CTX.js` (ROUTER, 143 ř.)
- `scripts/MIA_ROUTE_CONTEXT_DEPS.js` (ROUTER, 27 ř.)
- `scripts/MIA_ROUTE_CONTEXT_HOST.js` (ROUTER, 156 ř.)
- `scripts/MIA_RUNTIME_AUDIT.js` (MIA, 100 ř.)
- `scripts/MIA_RUNTIME_GETTER.js` (MIA, 9 ř.)
- `scripts/MIA_RUNTIME_LOOPS.js` (MIA, 279 ř.)
- `scripts/MIA_RUNTIME_LOOPS_CTX.js` (MIA, 42 ř.)
- `scripts/MIA_RUNTIME_LOOPS_HOST.js` (MIA, 48 ř.)
- `scripts/MIA_RUNTIME_PERF.js` (MIA, 63 ř.)
- `scripts/MIA_RUNTIME_SECURITY.js` (MIA, 183 ř.)
- `scripts/MIA_RUNTIME_SECURITY_CTX.js` (MIA, 12 ř.)
- `scripts/MIA_RUNTIME_SECURITY_HOST.js` (MIA, 12 ř.)
- `scripts/MIA_RUNTIME_STATE_CTX.js` (MIA, 31 ř.)
- `scripts/MIA_RUNTIME_STATE_HOST.js` (MIA, 37 ř.)
- `scripts/MIA_RUNTIME_STATE_RUNTIME.js` (MIA, 127 ř.)
- `scripts/MIA_RUNTIME_STATE_SEED_CTX.js` (MIA, 58 ř.)
- `scripts/MIA_RUNTIME_STATE_SEED_HOST.js` (MIA, 31 ř.)
- `scripts/MIA_SAFE_REQUIRE.js` (MIA, 29 ř.)
- `scripts/MIA_SELF_RESTART.js` (MIA, 118 ř.)
- `scripts/MIA_SERVER_BOOTSTRAP.js` (MIA, 116 ř.)
- `scripts/MIA_SERVER_BOOTSTRAP_CTX.js` (MIA, 29 ř.)
- `scripts/MIA_SERVER_BOOTSTRAP_HOST.js` (MIA, 37 ř.)
- `scripts/MIA_SESSION_MEMORY.js` (MIA, 276 ř.)
- `scripts/mia_setup.js` (MIA, 84 ř.)
- `scripts/mia_setup_secrets_folder.js` (MIA, 171 ř.)
- `scripts/MIA_SHOWCASE_COMMAND_CTX.js` (MIA, 44 ř.)
- `scripts/MIA_SHOWCASE_COMMAND_HOST.js` (MIA, 47 ř.)
- `scripts/MIA_SHOWCASE_COMMAND_RUNTIME.js` (MIA, 206 ř.)
- `scripts/MIA_SHOWCASE_CTX.js` (MIA, 24 ř.)
- `scripts/MIA_SHOWCASE_HOST.js` (MIA, 30 ř.)
- `scripts/MIA_SHOWCASE_RUNTIME.js` (MIA, 70 ř.)
- `scripts/MIA_SOLO_STREAM.js` (MIA, 515 ř.)
- `scripts/MIA_SOLO_STREAM_CONFIG.js` (MIA, 135 ř.)
- `scripts/MIA_SOLO_STREAM_CTX.js` (MIA, 37 ř.)
- `scripts/MIA_SOLO_STREAM_HOST.js` (MIA, 42 ř.)
- `scripts/MIA_SOLO_STREAM_RUNTIME.js` (MIA, 159 ř.)
- `scripts/MIA_SPAM_SESSION_CTX.js` (MIA, 19 ř.)
- `scripts/MIA_SPAM_SESSION_HOST.js` (MIA, 18 ř.)
- `scripts/MIA_SPEAKER_ROUTING.js` (MIA, 634 ř.)
- `scripts/MIA_STARTUP_CHECK.js` (MIA, 368 ř.)
- `scripts/MIA_STARTUP_OVERLAY_CTX.js` (MIA, 40 ř.)
- `scripts/MIA_STARTUP_OVERLAY_HOST.js` (MIA, 50 ř.)
- `scripts/MIA_STARTUP_OVERLAY_RUNTIME.js` (MIA, 472 ř.)
- `scripts/MIA_STATUS_CTX.js` (MIA, 62 ř.)
- `scripts/MIA_STATUS_HOST.js` (MIA, 63 ř.)
- `scripts/MIA_STATUS_RUNTIME.js` (MIA, 315 ř.)
- `scripts/MIA_STATUS_SNAPSHOT.js` (MIA, 231 ř.)
- `scripts/mia_stop.js` (MIA, 89 ř.)
- `scripts/MIA_STORY_ANIMATION_ENGINE.js` (MIA, 279 ř.)
- `scripts/MIA_STORY_ARC_REGISTRY.js` (MIA, 248 ř.)
- `scripts/MIA_STORY_FEED_CTX.js` (MIA, 29 ř.)
- `scripts/MIA_STORY_FEED_HOST.js` (MIA, 37 ř.)
- `scripts/MIA_STORY_FEED_RUNTIME.js` (MIA, 161 ř.)
- `scripts/MIA_STORY_MEMORY.js` (MIA, 201 ř.)
- `scripts/MIA_STORY_VIDEO_ENGINE.js` (MIA, 189 ř.)
- `scripts/MIA_STREAMER_ACCESS.js` (MIA, 58 ř.)
- `scripts/MIA_STREAMER_IDENTITY.js` (MIA, 210 ř.)
- `scripts/MIA_STREAMER_MATTING.js` (MIA, 193 ř.)
- `scripts/MIA_STREAMER_MEDIA_COMMAND.js` (MIA, 391 ř.)
- `scripts/MIA_STREAMER_MEDIA_CTX.js` (MIA, 32 ř.)
- `scripts/MIA_STREAMER_MEDIA_HOST.js` (MIA, 39 ř.)
- `scripts/MIA_STREAMER_MEDIA_RUNTIME.js` (MIA, 184 ř.)
- `scripts/MIA_STREAMER_SHOWCASE.js` (MIA, 662 ř.)
- `scripts/MIA_STREAM_AUDIENCE.js` (MIA, 333 ř.)
- `scripts/MIA_STREAM_ECONOMY_CONFIG.js` (MIA, 127 ř.)
- `scripts/MIA_STREAM_SESSION.js` (MIA, 124 ř.)
- `scripts/MIA_STREAM_STATE.js` (MIA, 468 ř.)
- `scripts/MIA_STREAM_STATE_CTX.js` (MIA, 22 ř.)
- `scripts/MIA_STREAM_STATE_HOST.js` (MIA, 26 ř.)
- `scripts/MIA_STREAM_STATE_RUNTIME.js` (MIA, 144 ř.)
- `scripts/MIA_SUPPORT_REACTION_POLICY.js` (MIA, 769 ř.)
- `scripts/MIA_SUPPORT_RESOLVER.js` (MIA, 435 ř.)
- `scripts/MIA_T0_ENGAGEMENT.js` (MIA, 255 ř.)
- `scripts/MIA_TELEGRAM_BRIDGE.js` (MIA, 319 ř.)
- `scripts/MIA_TEXT_BANK.js` (MIA, 26 ř.)
- `scripts/MIA_TEXT_BANK_COVERAGE.js` (MIA, 334 ř.)
- `scripts/MIA_TEXT_BANK_LEGACY_INLINE.js` (MIA, 927 ř.)
- `scripts/MIA_TEXT_BANK_LOADER.js` (MIA, 157 ř.)
- `scripts/MIA_TRANSLATE.js` (MIA, 817 ř.)
- `scripts/mia_translate_smoke.js` (MIA, 120 ř.)
- `scripts/MIA_TRANSLATION_CTX.js` (MIA, 32 ř.)
- `scripts/MIA_TRANSLATION_HOST.js` (MIA, 35 ř.)
- `scripts/MIA_TRANSLATION_RUNTIME.js` (MIA, 467 ř.)
- `scripts/MIA_TTS_ENGINE.js` (MIA, 274 ř.)
- `scripts/MIA_TTS_ENGINE_CTX.js` (MIA, 17 ř.)
- `scripts/MIA_TTS_ENGINE_HOST.js` (MIA, 19 ř.)
- `scripts/MIA_TWITCH_BRIDGE.js` (MIA, 457 ř.)
- `scripts/MIA_USER_ACK_THROTTLE.js` (MIA, 268 ř.)
- `scripts/MIA_VAULT.js` (MIA, 46 ř.)
- `scripts/MIA_VIDEO_ENGINE.js` (MIA, 1622 ř.)
- `scripts/MIA_VIDEO_ENGINE_CTX.js` (MIA, 21 ř.)
- `scripts/MIA_VIDEO_ENGINE_HOST.js` (MIA, 29 ř.)
- `scripts/MIA_VIEWER_STORY_MOMENT.js` (MIA, 203 ř.)
- `scripts/MIA_VISION_CONTEXT_CTX.js` (MIA, 25 ř.)
- `scripts/MIA_VISION_CONTEXT_HOST.js` (MIA, 33 ř.)
- `scripts/MIA_VISION_CONTEXT_RUNTIME.js` (MIA, 81 ř.)
- `scripts/mia_visual_self_check.js` (MIA, 155 ř.)
- `scripts/MIA_VOICE_CONTROL_LAYER.js` (MIA, 864 ř.)
- `scripts/MIA_VOICE_CONTROL_LAYER_CTX.js` (MIA, 16 ř.)
- `scripts/MIA_VOICE_LAYER_HOST.js` (MIA, 18 ř.)
- `scripts/MIA_VOICE_PRIORITY.js` (MIA, 164 ř.)
- `scripts/MIA_VOICE_PRIORITY_CTX.js` (MIA, 16 ř.)
- `scripts/MIA_VOICE_PRIORITY_HOST.js` (MIA, 18 ř.)
- `scripts/MIA_VOICE_TIMING.js` (MIA, 23 ř.)
- `scripts/MIA_VOICE_TIMING_CTX.js` (MIA, 17 ř.)
- `scripts/MIA_VOICE_TIMING_HOST.js` (MIA, 21 ř.)
- `scripts/MIA_WORLD_LAYER_CTX.js` (MIA, 35 ř.)
- `scripts/MIA_WORLD_LAYER_HOST.js` (MIA, 43 ř.)
- `scripts/MIA_WORLD_LAYER_RUNTIME.js` (MIA, 269 ř.)
- `scripts/MIA_WORLD_MODE_CTX.js` (MIA, 25 ř.)
- `scripts/MIA_WORLD_MODE_HOST.js` (MIA, 34 ř.)
- `scripts/MIA_WORLD_MODE_RUNTIME.js` (MIA, 72 ř.)
- `scripts/obs_add_gift_video_slots.js` (OBS, 242 ř.)
- `scripts/obs_apply_away_eyes.js` (OBS, 150 ř.)
- `scripts/obs_apply_away_scene.js` (OBS, 30 ř.)
- `scripts/obs_apply_hands.js` (OBS, 151 ř.)
- `scripts/obs_discover_ndi_cameras.js` (OBS, 35 ř.)
- `scripts/obs_ensure_arena.js` (OBS, 116 ř.)
- `scripts/obs_ensure_arena_battle.js` (OBS, 126 ř.)
- `scripts/obs_ensure_arena_battle_test.js` (OBS, 105 ř.)
- `scripts/obs_ensure_streamer_cameras.js` (OBS, 102 ř.)
- `scripts/obs_ensure_voice.js` (OBS, 73 ř.)
- `scripts/obs_fix_camera_visible.js` (OBS, 123 ř.)
- `scripts/obs_fix_gift_video_layers.js` (OBS, 58 ř.)
- `scripts/obs_fix_overlay_layout.js` (OBS, 242 ř.)
- `scripts/obs_move_koj_visible.js` (OBS, 74 ř.)
- `scripts/obs_prepare_tiktok_live.js` (OBS, 144 ř.)
- `scripts/obs_print_away_manifest.js` (OBS, 8 ř.)
- `scripts/obs_print_manifest.js` (OBS, 11 ř.)
- `scripts/obs_refresh_overlays.js` (OBS, 214 ř.)
- `scripts/obs_register_streamer_cameras.js` (OBS, 34 ř.)
- `scripts/obs_revive_voice.js` (OBS, 205 ř.)
- `scripts/obs_setup_notebook_camera.js` (OBS, 176 ř.)
- `scripts/obs_set_canvas.js` (OBS, 146 ř.)
- `scripts/obs_stream_prep.js` (OBS, 62 ř.)
- `scripts/obs_stream_ready.js` (OBS, 268 ř.)
- `scripts/obs_verify_camera.js` (OBS, 90 ř.)
- `scripts/obs_verify_stream_ready.js` (OBS, 227 ř.)
- `scripts/obs_visibility_diag.js` (OBS, 119 ř.)
- `scripts/pipeline/phase_command_gate.js` (MIA, 16 ř.)
- `scripts/pipeline/phase_decide.js` (MIA, 73 ř.)
- `scripts/pipeline/phase_enrich.js` (MIA, 263 ř.)
- `scripts/pipeline/phase_execute.js` (MIA, 94 ř.)
- `scripts/pipeline/phase_observe.js` (MIA, 172 ř.)
- `scripts/pipeline/phase_post.js` (MIA, 138 ř.)
- `scripts/pipeline/phase_present.js` (MIA, 130 ř.)
- `scripts/pipeline/phase_session.js` (MIA, 72 ř.)
- `scripts/pipeline/run.js` (MIA, 50 ř.)
- `scripts/promote_ai_animation_to_bank.js` (MIA, 82 ř.)
- `scripts/remote_connectivity_check.js` (MIA, 107 ř.)
- `scripts/remote_setup_all.js` (MIA, 176 ř.)
- `scripts/run_graphics_body_tests.js` (MIA, 99 ř.)
- `scripts/run_preflight_tests.js` (MIA, 608 ř.)
- `scripts/seed_animation_bank.js` (MIA, 348 ř.)
- `scripts/telegram_setup_hint.js` (MIA, 26 ř.)
- `scripts/twitch_eventsub_probe.js` (MIA, 51 ř.)
- `scripts/twitch_oauth_login.js` (MIA, 206 ř.)
- `scripts/_tmp_bump_0054.js` (MIA, 19 ř.)

</details>

## `server.js/` (1 modulů)

| Cesta | Kat. | Ř. | Exporty | Použito | Konzumenti | Flags |
|-------|------|-----|---------|---------|------------|-------|
| `server.js` | CORE | 16 | - | ano | entrypoint/test | C |

## `shared/` (285 modulů)

_Složka obsahuje 285 modulů — tabulka zkrácena na prvních 40 + souhrn._

| Cesta | Kat. | Ř. | Exporty | Použito | Konzumenti | Flags |
|-------|------|-----|---------|---------|------------|-------|
| `shared/gifts/index.js` | ECONOMY | 27 | resolver, validator, createRuntime | ano | index.js, scripts/gift_map_log_audit.js | - |
| `shared/gifts/resolver.js` | ECONOMY | 294 | MAP_DIR, resolveGift, normalizeGiftKey | ano | shared/gifts/index.js, shared/gifts/runtime.js | - |
| `shared/gifts/runtime.js` | ECONOMY | 515 | createRuntime, ingest, resolve | ano | shared/gifts/index.js | - |
| `shared/gifts/validator.js` | ECONOMY | 77 | validateGiftEvent | ano | shared/gifts/index.js, shared/gifts/runtime.js | - |
| `shared/mia-achievement-core/achievementEngine.js` | MIA | 664 | AE_COMPONENT, AE_COMPONENT_ORDER, AE_CATEGORY | ano | shared/mia-achievement-core/index.js | - |
| `shared/mia-achievement-core/index.js` | MIA | 4 | require | ano | tests/mia_master_canon_0043_contract.js | - |
| `shared/mia-action-core/actionOrchestrator.js` | ACTION | 597 | AO_COMPONENT, AO_COMPONENT_ORDER, AO_ACTION_STATE | ano | shared/mia-action-core/index.js | - |
| `shared/mia-action-core/index.js` | ACTION | 4 | require | ano | tests/mia_master_canon_0029_contract.js, tests/mia_master_canon_0038_contract.js | - |
| `shared/mia-alert-core/alertManager.js` | MIA | 1570 | AM_COMPONENT, AM_COMPONENT_ORDER, AM_CATEGORY | ano | shared/mia-alert-core/index.js | - |
| `shared/mia-alert-core/index.js` | MIA | 4 | require | ano | tests/mia_master_canon_0073_contract.js | - |
| `shared/mia-animation-core/animationEngine.js` | MIA | 529 | AE_COMPONENT, AE_COMPONENT_ORDER, AE_CHARACTER | ano | shared/mia-animation-core/index.js | - |
| `shared/mia-animation-core/index.js` | MIA | 4 | require | ano | tests/mia_master_canon_0036_contract.js, tests/mia_master_canon_0037_contract.js | - |
| `shared/mia-animation-engine/AnimationBank.js` | MIA | 192 | DEFAULT_BANK_ROOT, discoverClipDirs, loadBankIndex | ano | scripts/build_animation_bank.js, scripts/export_paint_to_animation_bank.js | - |
| `shared/mia-animation-engine/animationBankSchema.js` | MIA | 133 | BANK_VERSION, MANIFEST_KIND, DEFAULT_CLIP | ano | scripts/build_animation_bank.js, shared/mia-animation-engine/AnimationBank.js | - |
| `shared/mia-animation-engine/bankPreview.js` | MIA | 205 | listBankOperatorClips, previewBankClip, pushBankClipPreview | ano | routes/eyes.js, shared/mia-animation-engine/index.js | - |
| `shared/mia-animation-engine/effectProgramPresets.js` | MIA | 115 | PARTICLE_PRESETS, SOUND_CUES, MOTION_BY_EFFECT | ano | shared/mia-animation-engine/AnimationBank.js, shared/mia-animation-engine/GiftReactionOrchestrator.js | - |
| `shared/mia-animation-engine/GiftReactionOrchestrator.js` | ACTION | 119 | resolveGiftReactionPlan, resolveSpriteHint, resolveBankQuality | ano | shared/mia-animation-engine/bankPreview.js, shared/mia-animation-engine/index.js | - |
| `shared/mia-animation-engine/index.js` | MIA | 72 | BANK_VERSION, MANIFEST_KIND, DEFAULT_BANK_ROOT | ano | index.js, scripts/MIA_ANIMATION_REACTION.js | - |
| `shared/mia-animation-engine/ProceduralMotion.js` | MIA | 216 | CHARACTER_MOTION_PRESETS, normalizeMotionStyle, buildMotionKeyframes | ano | shared/mia-animation-engine/GiftReactionOrchestrator.js, shared/mia-animation-engine/index.js | - |
| `shared/mia-animation-engine/productionGate.js` | MIA | 91 | DEFAULT_MIN_ALPHA, isProceduralMeta | ano | shared/mia-animation-engine/bankPreview.js, shared/mia-animation-engine/index.js | - |
| `shared/mia-animation-engine/promoteAiAnimation.js` | MIA | 677 | DEFAULT_STAGING_ROOT, normalizeClipId, resolvePromoteQuality | ano | routes/eyes.js, scripts/promote_ai_animation_to_bank.js | - |
| `shared/mia-animation-engine/spriteSheetPack.js` | MIA | 147 | readFrameBuffers, detectFrameSize, packSpriteSheet | ano | scripts/build_animation_bank.js, scripts/export_paint_to_animation_bank.js | - |
| `shared/mia-animation-engine/stagingPreview.js` | MIA | 539 | publicStagingSheetUrl, publicStagingManifestUrl, previewStagingClip | ano | routes/eyes.js, shared/mia-animation-engine/index.js | - |
| `shared/mia-architecture-core/architectureLayers.js` | MIA | 57 | ARCHITECTURE_LAYER, ARCHITECTURE_LAYER_ORDER, LAYER_RESPONSIBILITY | ano | shared/mia-architecture-core/index.js, shared/mia-architecture-core/layerRules.js | - |
| `shared/mia-architecture-core/architecturePrinciples.js` | MIA | 45 | ARCHITECTURE_PRINCIPLE, ARCHITECTURE_PRINCIPLE_LABELS | ano | shared/mia-architecture-core/index.js | - |
| `shared/mia-architecture-core/index.js` | MIA | 20 | layers, rules, naming | ano | tests/mia_master_canon_0005_contract.js, tests/mia_master_canon_0006_contract.js | - |
| `shared/mia-architecture-core/layerRules.js` | MIA | 60 | LAYER_DEPENDENCY_RULES | ano | shared/mia-architecture-core/index.js | - |
| `shared/mia-architecture-core/namingRules.js` | MIA | 52 | LAYER_SUFFIX_HINTS, validateArchitectureName | ano | shared/mia-architecture-core/index.js | - |
| `shared/mia-architecture-core/platformDataFlow.js` | MIA | 31 | CANON_PLATFORM_DATA_FLOW | ano | shared/mia-architecture-core/index.js | - |
| `shared/mia-architecture-core/platformMap.js` | MIA | 208 | MIA_PLATFORM_MAP, MAP_0004_COMPONENT_TO_LAYER, walkPlatformMap | ano | shared/mia-architecture-core/index.js | - |
| `shared/mia-architecture-core/platformSystems.js` | MIA | 397 | PLATFORM_SYSTEM_ID, PLATFORM_SYSTEM_ORDER, PLATFORM_SYSTEMS | ano | shared/mia-architecture-core/index.js | - |
| `shared/mia-audit-core/auditManager.js` | MIA | 1002 | AUM_COMPONENT, AUM_COMPONENT_ORDER, AUM_CATEGORY | ano | shared/mia-audit-core/index.js | - |
| `shared/mia-audit-core/index.js` | MIA | 4 | require | ano | tests/mia_master_canon_0074_contract.js | - |
| `shared/mia-battle-core/battleEngine.js` | BATTLE | 503 | BE_COMPONENT, BE_COMPONENT_ORDER, BE_STATE | ano | shared/mia-battle-core/index.js | - |
| `shared/mia-battle-core/index.js` | BATTLE | 4 | require | ano | tests/mia_master_canon_0039_contract.js, tests/mia_master_canon_0040_contract.js | - |
| `shared/mia-boot-core/bootManager.js` | MIA | 816 | BM_COMPONENT, BM_COMPONENT_ORDER, BM_PIPELINE | ano | shared/mia-boot-core/index.js | - |
| `shared/mia-boot-core/index.js` | MIA | 4 | require | ano | tests/mia_master_canon_0051_contract.js, tests/mia_master_canon_0052_contract.js | - |
| `shared/mia-character-core/characterEngine.js` | MIA | 735 | CE_COMPONENT, CE_COMPONENT_ORDER, CE_CHARACTER_TIER | ano | shared/mia-character-core/index.js | - |
| `shared/mia-character-core/index.js` | MIA | 4 | require | ano | tests/mia_master_canon_0047_contract.js | - |
| `shared/mia-command-bus-core/commandBusManager.js` | MIA | 1047 | CBM_COMPONENT, CBM_COMPONENT_ORDER, CBM_PIPELINE | ano | shared/mia-command-bus-core/index.js | - |

_… a dalších 245 souborů ve složce `shared/`._

<details><summary>Úplný seznam souborů (285)</summary>

- `shared/gifts/index.js` (ECONOMY, 27 ř.)
- `shared/gifts/resolver.js` (ECONOMY, 294 ř.)
- `shared/gifts/runtime.js` (ECONOMY, 515 ř.)
- `shared/gifts/validator.js` (ECONOMY, 77 ř.)
- `shared/mia-achievement-core/achievementEngine.js` (MIA, 664 ř.)
- `shared/mia-achievement-core/index.js` (MIA, 4 ř.)
- `shared/mia-action-core/actionOrchestrator.js` (ACTION, 597 ř.)
- `shared/mia-action-core/index.js` (ACTION, 4 ř.)
- `shared/mia-alert-core/alertManager.js` (MIA, 1570 ř.)
- `shared/mia-alert-core/index.js` (MIA, 4 ř.)
- `shared/mia-animation-core/animationEngine.js` (MIA, 529 ř.)
- `shared/mia-animation-core/index.js` (MIA, 4 ř.)
- `shared/mia-animation-engine/AnimationBank.js` (MIA, 192 ř.)
- `shared/mia-animation-engine/animationBankSchema.js` (MIA, 133 ř.)
- `shared/mia-animation-engine/bankPreview.js` (MIA, 205 ř.)
- `shared/mia-animation-engine/effectProgramPresets.js` (MIA, 115 ř.)
- `shared/mia-animation-engine/GiftReactionOrchestrator.js` (ACTION, 119 ř.)
- `shared/mia-animation-engine/index.js` (MIA, 72 ř.)
- `shared/mia-animation-engine/ProceduralMotion.js` (MIA, 216 ř.)
- `shared/mia-animation-engine/productionGate.js` (MIA, 91 ř.)
- `shared/mia-animation-engine/promoteAiAnimation.js` (MIA, 677 ř.)
- `shared/mia-animation-engine/spriteSheetPack.js` (MIA, 147 ř.)
- `shared/mia-animation-engine/stagingPreview.js` (MIA, 539 ř.)
- `shared/mia-architecture-core/architectureLayers.js` (MIA, 57 ř.)
- `shared/mia-architecture-core/architecturePrinciples.js` (MIA, 45 ř.)
- `shared/mia-architecture-core/index.js` (MIA, 20 ř.)
- `shared/mia-architecture-core/layerRules.js` (MIA, 60 ř.)
- `shared/mia-architecture-core/namingRules.js` (MIA, 52 ř.)
- `shared/mia-architecture-core/platformDataFlow.js` (MIA, 31 ř.)
- `shared/mia-architecture-core/platformMap.js` (MIA, 208 ř.)
- `shared/mia-architecture-core/platformSystems.js` (MIA, 397 ř.)
- `shared/mia-audit-core/auditManager.js` (MIA, 1002 ř.)
- `shared/mia-audit-core/index.js` (MIA, 4 ř.)
- `shared/mia-battle-core/battleEngine.js` (BATTLE, 503 ř.)
- `shared/mia-battle-core/index.js` (BATTLE, 4 ř.)
- `shared/mia-boot-core/bootManager.js` (MIA, 816 ř.)
- `shared/mia-boot-core/index.js` (MIA, 4 ř.)
- `shared/mia-character-core/characterEngine.js` (MIA, 735 ř.)
- `shared/mia-character-core/index.js` (MIA, 4 ř.)
- `shared/mia-command-bus-core/commandBusManager.js` (MIA, 1047 ř.)
- `shared/mia-command-bus-core/index.js` (MIA, 4 ř.)
- `shared/mia-community-core/communityEngine.js` (MIA, 610 ř.)
- `shared/mia-community-core/index.js` (MIA, 4 ř.)
- `shared/mia-component-core/componentDependencies.js` (MIA, 62 ř.)
- `shared/mia-component-core/componentHealth.js` (MIA, 35 ř.)
- `shared/mia-component-core/componentLifecycle.js` (MIA, 38 ř.)
- `shared/mia-component-core/componentRegistry.js` (MIA, 243 ř.)
- `shared/mia-component-core/componentSchema.js` (MIA, 124 ř.)
- `shared/mia-component-core/componentTypes.js` (MIA, 24 ř.)
- `shared/mia-component-core/index.js` (MIA, 18 ř.)
- `shared/mia-configuration-core/configurationManager.js` (MIA, 595 ř.)
- `shared/mia-configuration-core/index.js` (MIA, 4 ř.)
- `shared/mia-conversation-core/conversationEngine.js` (MIA, 535 ř.)
- `shared/mia-conversation-core/index.js` (MIA, 4 ř.)
- `shared/mia-coordination-core/coordinationEngine.js` (MIA, 910 ř.)
- `shared/mia-coordination-core/index.js` (MIA, 4 ř.)
- `shared/mia-core-canon/coreLifecycle.js` (MIA, 48 ř.)
- `shared/mia-core-canon/coreManagers.js` (MIA, 205 ř.)
- `shared/mia-core-canon/index.js` (MIA, 13 ř.)
- `shared/mia-core-canon/lifecycleManager.js` (MIA, 286 ř.)
- `shared/mia-core-canon/runtimeManager.js` (MIA, 224 ř.)
- `shared/mia-creature-core/creatureEvolutionEngine.js` (MIA, 557 ř.)
- `shared/mia-creature-core/index.js` (MIA, 4 ř.)
- `shared/mia-decision-core/decisionEngine.js` (MIA, 506 ř.)
- `shared/mia-decision-core/index.js` (MIA, 4 ř.)
- `shared/mia-dependency-core/dependencyManager.js` (MIA, 695 ř.)
- `shared/mia-dependency-core/index.js` (MIA, 4 ř.)
- `shared/mia-diagnostics-core/diagnosticsManager.js` (MIA, 1490 ř.)
- `shared/mia-diagnostics-core/index.js` (MIA, 4 ř.)
- `shared/mia-economy-core/economyEngine.js` (ECONOMY, 482 ř.)
- `shared/mia-economy-core/index.js` (ECONOMY, 4 ř.)
- `shared/mia-emotion-core/emotionEngine.js` (MIA, 510 ř.)
- `shared/mia-emotion-core/index.js` (MIA, 4 ř.)
- `shared/mia-entity-core/entityCategories.js` (MIA, 34 ř.)
- `shared/mia-entity-core/entityLifecycle.js` (MIA, 60 ř.)
- `shared/mia-entity-core/entityRelations.js` (MIA, 61 ř.)
- `shared/mia-entity-core/entitySchema.js` (MIA, 127 ř.)
- `shared/mia-entity-core/index.js` (MIA, 16 ř.)
- `shared/mia-entity-core/systemEntities.js` (MIA, 123 ř.)
- `shared/mia-event-bus-core/eventBusManager.js` (MIA, 940 ř.)
- `shared/mia-event-bus-core/index.js` (MIA, 4 ř.)
- `shared/mia-event-core/eventBus.js` (MIA, 47 ř.)
- `shared/mia-event-core/eventBusInfrastructure.js` (MIA, 275 ř.)
- `shared/mia-event-core/eventCategories.js` (MIA, 40 ř.)
- `shared/mia-event-core/eventDispatcher.js` (MIA, 480 ř.)
- `shared/mia-event-core/eventGateway.js` (MIA, 274 ř.)
- `shared/mia-event-core/eventLifecycle.js` (MIA, 50 ř.)
- `shared/mia-event-core/eventPriority.js` (MIA, 47 ř.)
- `shared/mia-event-core/eventQueues.js` (MIA, 62 ř.)
- `shared/mia-event-core/eventRegistry.js` (MIA, 393 ř.)
- `shared/mia-event-core/eventRouter.js` (MIA, 409 ř.)
- `shared/mia-event-core/eventSchema.js` (MIA, 152 ř.)
- `shared/mia-event-core/eventValidator.js` (MIA, 419 ř.)
- `shared/mia-event-core/index.js` (MIA, 34 ř.)
- `shared/mia-event-core/priorityManager.js` (MIA, 329 ř.)
- `shared/mia-event-core/queueManager.js` (MIA, 542 ř.)
- `shared/mia-event-store-core/eventStoreManager.js` (MIA, 1014 ř.)
- `shared/mia-event-store-core/index.js` (MIA, 4 ř.)
- `shared/mia-fault-core/faultManager.js` (MIA, 1414 ř.)
- `shared/mia-fault-core/index.js` (MIA, 4 ř.)
- `shared/mia-gift-animation/config.js` (ECONOMY, 95 ř.)
- `shared/mia-gift-animation/index.js` (ECONOMY, 434 ř.)
- `shared/mia-gift-animation/proceduralRenderer.js` (ECONOMY, 282 ř.)
- `shared/mia-gift-animation/promptBuilder.js` (ECONOMY, 209 ř.)
- `shared/mia-gift-animation/storyboard.js` (ECONOMY, 178 ř.)
- `shared/mia-goal-core/goalManagementSystem.js` (MIA, 635 ř.)
- `shared/mia-goal-core/index.js` (MIA, 4 ř.)
- `shared/mia-graphics-studio/aiAnimationCommands.js` (MIA, 669 ř.)
- `shared/mia-graphics-studio/aiModules.js` (MIA, 249 ř.)
- `shared/mia-graphics-studio/aiMotionCommands.js` (MIA, 100 ř.)
- `shared/mia-graphics-studio/animationEncoder.js` (MIA, 126 ř.)
- `shared/mia-graphics-studio/avatarCommands.js` (MIA, 270 ř.)
- `shared/mia-graphics-studio/bodyAnimationSync.js` (MIA, 118 ř.)
- `shared/mia-graphics-studio/bodyHeroPortrait.js` (MIA, 73 ř.)
- `shared/mia-graphics-studio/bodyLiveAudit.js` (MIA, 69 ř.)
- `shared/mia-graphics-studio/bodyLiveSync.js` (MIA, 125 ř.)
- `shared/mia-graphics-studio/bodyPartsAssets.js` (MIA, 117 ř.)
- `shared/mia-graphics-studio/bodyPartsCatalog.js` (MIA, 221 ř.)
- `shared/mia-graphics-studio/bodyPartState.js` (MIA, 193 ř.)
- `shared/mia-graphics-studio/bodyPreviewCommands.js` (MIA, 83 ř.)
- `shared/mia-graphics-studio/bodyPublishBridge.js` (MIA, 74 ř.)
- `shared/mia-graphics-studio/commandCatalog.js` (MIA, 653 ř.)
- `shared/mia-graphics-studio/exportCommands.js` (MIA, 77 ř.)
- `shared/mia-graphics-studio/exportTemplates.js` (MIA, 68 ř.)
- `shared/mia-graphics-studio/fxCommands.js` (MIA, 64 ř.)
- `shared/mia-graphics-studio/index.js` (MIA, 50 ř.)
- `shared/mia-graphics-studio/moodBrain.js` (MIA, 151 ř.)
- `shared/mia-graphics-studio/motionCommands.js` (MIA, 578 ř.)
- `shared/mia-graphics-studio/particlePresets.js` (MIA, 4 ř.)
- `shared/mia-graphics-studio/pipelineRunner.js` (MIA, 439 ř.)
- `shared/mia-graphics-studio/poseCommands.js` (MIA, 71 ř.)
- `shared/mia-health-core/healthManager.js` (MIA, 1048 ř.)
- `shared/mia-health-core/index.js` (MIA, 4 ř.)
- `shared/mia-inventory-core/index.js` (MIA, 4 ř.)
- `shared/mia-inventory-core/inventoryEngine.js` (MIA, 527 ř.)
- `shared/mia-kernel-core/coreKernel.js` (MIA, 646 ř.)
- `shared/mia-kernel-core/index.js` (MIA, 4 ř.)
- `shared/mia-kernel-decision-core/decisionEngine.js` (MIA, 874 ř.)
- `shared/mia-kernel-decision-core/index.js` (MIA, 4 ř.)
- `shared/mia-lifecycle-core/index.js` (MIA, 4 ř.)
- `shared/mia-lifecycle-core/lifecycleManager.js` (MIA, 819 ř.)
- `shared/mia-logging-core/index.js` (MIA, 4 ř.)
- `shared/mia-logging-core/loggingManager.js` (MIA, 1173 ř.)
- `shared/mia-memory-core/emotionalMemory.js` (MIA, 511 ř.)
- `shared/mia-memory-core/episodicMemory.js` (MIA, 513 ř.)
- `shared/mia-memory-core/index.js` (MIA, 24 ř.)
- `shared/mia-memory-core/knowledgeGraphManager.js` (MIA, 546 ř.)
- `shared/mia-memory-core/longTermMemory.js` (MIA, 499 ř.)
- `shared/mia-memory-core/memorySystem.js` (MIA, 463 ř.)
- `shared/mia-memory-core/proceduralMemory.js` (MIA, 584 ř.)
- `shared/mia-memory-core/semanticMemory.js` (MIA, 574 ř.)
- `shared/mia-memory-core/shortTermMemory.js` (MIA, 457 ř.)
- `shared/mia-memory-core/workingMemory.js` (MIA, 392 ř.)
- `shared/mia-message-queue-core/index.js` (MIA, 4 ř.)
- `shared/mia-message-queue-core/messageQueueManager.js` (MIA, 1101 ř.)
- `shared/mia-metrics-core/index.js` (MIA, 4 ř.)
- `shared/mia-metrics-core/metricsManager.js` (MIA, 1267 ř.)
- `shared/mia-module-core/index.js` (MIA, 4 ř.)
- `shared/mia-module-core/pluginModuleEngine.js` (MIA, 556 ř.)
- `shared/mia-monitoring-core/index.js` (MIA, 8 ř.)
- `shared/mia-monitoring-core/monitoringSystem.js` (MIA, 519 ř.)
- `shared/mia-obs-core/index.js` (MIA, 4 ř.)
- `shared/mia-obs-core/obsIntegrationLayer.js` (MIA, 507 ř.)
- `shared/mia-orchestrator-core/index.js` (MIA, 4 ř.)
- `shared/mia-orchestrator-core/orchestratorEngine.js` (MIA, 868 ř.)
- `shared/mia-paint-ai/constants.js` (EDITOR, 80 ř.)
- `shared/mia-paint-ai/imageOps.js` (EDITOR, 459 ř.)
- `shared/mia-paint-ai/index.js` (EDITOR, 14 ř.)
- `shared/mia-paint-ai/trueAlpha.js` (EDITOR, 146 ř.)
- `shared/mia-paint-ai/visualIdentity.js` (EDITOR, 138 ř.)
- `shared/mia-paint-core/Animation.js` (EDITOR, 96 ř.)
- `shared/mia-paint-core/boneRig.js` (EDITOR, 124 ř.)
- `shared/mia-paint-core/cameraPresets.js` (EDITOR, 176 ř.)
- `shared/mia-paint-core/commands/PaintStrokeCommand.js` (EDITOR, 33 ř.)
- `shared/mia-paint-core/commands/TileSnapshotCommand.js` (EDITOR, 11 ř.)
- `shared/mia-paint-core/constants.js` (EDITOR, 16 ř.)
- `shared/mia-paint-core/Document.js` (EDITOR, 123 ř.)
- `shared/mia-paint-core/EventBus.js` (EDITOR, 42 ř.)
- `shared/mia-paint-core/FxParticles.js` (EDITOR, 57 ř.)
- `shared/mia-paint-core/HistoryStack.js` (EDITOR, 67 ř.)
- `shared/mia-paint-core/index.js` (EDITOR, 51 ř.)
- `shared/mia-paint-core/Layer.js` (EDITOR, 75 ř.)
- `shared/mia-paint-core/LipSync.js` (EDITOR, 646 ř.)
- `shared/mia-paint-core/Motion.js` (EDITOR, 540 ř.)
- `shared/mia-paint-core/particlePresets.js` (EDITOR, 96 ř.)
- `shared/mia-paint-core/PluginHost.js` (EDITOR, 126 ř.)
- `shared/mia-paint-core/pressureCurve.js` (EDITOR, 42 ř.)
- `shared/mia-paint-core/Selection.js` (EDITOR, 146 ř.)
- `shared/mia-paint-core/selectionOps.js` (EDITOR, 30 ř.)
- `shared/mia-paint-core/spriteSheetExport.js` (EDITOR, 70 ř.)
- `shared/mia-paint-core/svgExport.js` (EDITOR, 57 ř.)
- `shared/mia-paint-core/svgRender.js` (EDITOR, 11 ř.)
- `shared/mia-paint-core/timelineClock.js` (EDITOR, 106 ř.)
- `shared/mia-paint-core/VectorShape.js` (EDITOR, 63 ř.)
- `shared/mia-paint-core/Viewport.js` (EDITOR, 98 ř.)
- `shared/mia-paint-gpu/index.js` (EDITOR, 10 ř.)
- `shared/mia-paint-gpu/tileMath.js` (EDITOR, 128 ř.)
- `shared/mia-paint-gpu/TileStore.js` (EDITOR, 54 ř.)
- `shared/mia-paint-io/flatComposite.js` (EDITOR, 89 ř.)
- `shared/mia-paint-io/index.js` (EDITOR, 16 ř.)
- `shared/mia-paint-io/manifest.js` (EDITOR, 81 ř.)
- `shared/mia-paint-io/miapaintBundle.js` (EDITOR, 59 ř.)
- `shared/mia-paint-io/psdImport.js` (EDITOR, 23 ř.)
- `shared/mia-paint-io/rasterCodec.js` (EDITOR, 71 ř.)
- `shared/mia-personality-core/index.js` (MIA, 4 ř.)
- `shared/mia-personality-core/personalityEngine.js` (MIA, 554 ř.)
- `shared/mia-planning-core/index.js` (MIA, 4 ř.)
- `shared/mia-planning-core/planningEngine.js` (MIA, 530 ř.)
- `shared/mia-policy-core/index.js` (MIA, 4 ř.)
- `shared/mia-policy-core/policyEngine.js` (MIA, 775 ř.)
- `shared/mia-process-core/index.js` (MIA, 4 ř.)
- `shared/mia-process-core/processManager.js` (MIA, 783 ř.)
- `shared/mia-progression-core/index.js` (MIA, 4 ř.)
- `shared/mia-progression-core/progressionEngine.js` (MIA, 622 ř.)
- `shared/mia-projection-core/index.js` (MIA, 4 ř.)
- `shared/mia-projection-core/projectionManager.js` (MIA, 1125 ř.)
- `shared/mia-query-bus-core/index.js` (MIA, 4 ř.)
- `shared/mia-query-bus-core/queryBusManager.js` (MIA, 1104 ř.)
- `shared/mia-recovery-core/index.js` (MIA, 4 ř.)
- `shared/mia-recovery-core/recoveryManager.js` (MIA, 1518 ř.)
- `shared/mia-render-core/index.js` (MIA, 4 ř.)
- `shared/mia-render-core/visualRenderingSystem.js` (MIA, 431 ř.)
- `shared/mia-resource-core/index.js` (MIA, 4 ř.)
- `shared/mia-resource-core/resourceManager.js` (MIA, 645 ř.)
- `shared/mia-rule-core/index.js` (MIA, 4 ř.)
- `shared/mia-rule-core/ruleEngine.js` (MIA, 846 ř.)
- `shared/mia-runtime-core/index.js` (MIA, 4 ř.)
- `shared/mia-runtime-core/runtimeManager.js` (MIA, 632 ř.)
- `shared/mia-safe-mode-core/index.js` (MIA, 4 ř.)
- `shared/mia-safe-mode-core/safeModeManager.js` (MIA, 1134 ř.)
- `shared/mia-saga-core/index.js` (MIA, 4 ř.)
- `shared/mia-saga-core/sagaManager.js` (MIA, 1414 ř.)
- `shared/mia-scene-engine/creaturePresets.js` (MIA, 99 ř.)
- `shared/mia-scene-engine/environmentPresets.js` (MIA, 86 ř.)
- `shared/mia-scene-engine/index.js` (MIA, 20 ř.)
- `shared/mia-scene-engine/mattingPipeline.js` (MIA, 103 ř.)
- `shared/mia-scene-engine/ndiDiscovery.js` (MIA, 85 ř.)
- `shared/mia-scene-engine/obsCameraLayout.js` (MIA, 162 ř.)
- `shared/mia-scene-engine/sceneDirector.js` (MIA, 109 ř.)
- `shared/mia-scene-engine/streamerCameraRig.js` (MIA, 106 ř.)
- `shared/mia-scheduler-core/index.js` (MIA, 4 ř.)
- `shared/mia-scheduler-core/taskScheduler.js` (MIA, 746 ř.)
- `shared/mia-service-core/index.js` (MIA, 4 ř.)
- `shared/mia-service-core/serviceManager.js` (MIA, 780 ř.)
- `shared/mia-shutdown-core/index.js` (MIA, 4 ř.)
- `shared/mia-shutdown-core/shutdownManager.js` (MIA, 1223 ř.)
- `shared/mia-speech-core/index.js` (MIA, 4 ř.)
- `shared/mia-speech-core/speechEngine.js` (MIA, 544 ř.)
- `shared/mia-startup-core/index.js` (MIA, 4 ř.)
- `shared/mia-startup-core/startupSequenceManager.js` (MIA, 781 ř.)
- `shared/mia-state-core/index.js` (MIA, 4 ř.)
- `shared/mia-state-core/stateManager.js` (MIA, 597 ř.)
- `shared/mia-story-core/index.js` (MIA, 4 ř.)
- `shared/mia-story-core/storyEngine.js` (MIA, 579 ř.)
- `shared/mia-svg-primitives.js` (MIA, 122 ř.)
- `shared/mia-thread-core/index.js` (MIA, 4 ř.)
- `shared/mia-thread-core/threadManager.js` (MIA, 889 ř.)
- `shared/mia-timer-core/index.js` (MIA, 4 ř.)
- `shared/mia-timer-core/timerEngine.js` (MIA, 694 ř.)
- `shared/mia-watchdog-core/index.js` (MIA, 4 ř.)
- `shared/mia-watchdog-core/watchdogEngine.js` (MIA, 1161 ř.)
- `shared/mia-workflow-core/index.js` (MIA, 4 ř.)
- `shared/mia-workflow-core/workflowEngine.js` (MIA, 1328 ř.)
- `shared/mia-world-core/index.js` (MIA, 4 ř.)
- `shared/mia-world-core/worldEngine.js` (MIA, 559 ř.)
- `shared/next/share_runtime_bridge.js` (MIA, 146 ř.)
- `shared/next/share_runtime_share_debug_route.js` (MIA, 275 ř.)
- `shared/next/share_runtime_share_preview.js` (MIA, 52 ř.)
- `shared/next_action/share_action_builder.js` (ACTION, 162 ř.)
- `shared/next_action/share_text_bank.js` (ACTION, 223 ř.)
- `shared/next_decision/share_decision_engine.js` (MIA, 294 ř.)
- `shared/platform_normalizers/normalize_event.js` (NORMALIZER, 730 ř.)
- `shared/platform_runtime/action_builder.js` (ACTION, 1281 ř.)
- `shared/platform_runtime_contracts/core_contracts_action_result.js` (ACTION, 216 ř.)
- `shared/platform_runtime_contracts/core_contracts_normalized_event.js` (MIA, 110 ř.)
- `shared/platform_runtime_contracts/core_contracts_overlay_payload.js` (MIA, 88 ř.)
- `shared/platform_runtime_rules/decision_engine.js` (MIA, 548 ř.)
- `shared/runtime_execution/executors/bowl_executor.js` (MIA, 20 ř.)
- `shared/runtime_execution/executors/overlay_executor.js` (MIA, 20 ř.)
- `shared/runtime_execution/executors/video_executor.js` (MIA, 22 ř.)
- `shared/runtime_execution/index.js` (MIA, 7 ř.)
- `shared/runtime_execution/intent_resolver.js` (MIA, 48 ř.)
- `shared/runtime_execution/overlay_executor.js` (MIA, 72 ř.)
- `shared/runtime_execution/run_runtime_execution_bridge.js` (MIA, 300 ř.)
- `shared/runtime_execution/utils/execution_result.js` (MIA, 96 ř.)

</details>

## `src/` (1 modulů)

| Cesta | Kat. | Ř. | Exporty | Použito | Konzumenti | Flags |
|-------|------|-----|---------|---------|------------|-------|
| `src/routes/ingestroute.js` | UNKNOWN | 8 | require | pravděpodobně_ne | - | - |

## `tests/` (425 modulů)

_Složka obsahuje 425 modulů — tabulka zkrácena na prvních 40 + souhrn._

| Cesta | Kat. | Ř. | Exporty | Použito | Konzumenti | Flags |
|-------|------|-----|---------|---------|------------|-------|
| `tests/achievement_moment_contract.js` | TEST | 87 | - | ano | entrypoint/test | T |
| `tests/action_builder_ctx_contract.js` | TEST | 61 | - | ano | entrypoint/test | T |
| `tests/action_builder_runtime_contract.js` | TEST | 98 | - | ano | entrypoint/test | T |
| `tests/app_runtimes_contract.js` | TEST | 37 | - | ano | entrypoint/test | T |
| `tests/arena_battle_demo_contract.js` | TEST | 45 | - | ano | entrypoint/test | T |
| `tests/arena_battle_demo_ctx_contract.js` | TEST | 56 | - | ano | entrypoint/test | T |
| `tests/away_host_mode_contract.js` | TEST | 115 | - | ano | entrypoint/test | T |
| `tests/boss_cinematic_contract.js` | TEST | 175 | - | ano | entrypoint/test | T |
| `tests/boss_mission_ctx_contract.js` | TEST | 62 | - | ano | entrypoint/test | T |
| `tests/boss_mission_runtime_contract.js` | TEST | 119 | - | ano | entrypoint/test | T |
| `tests/bowl_full_video_contract.js` | TEST | 138 | - | ano | entrypoint/test | T |
| `tests/capybara_flow_contract.js` | TEST | 140 | - | ano | entrypoint/test | T |
| `tests/capybara_flow_ctx_contract.js` | TEST | 73 | - | ano | entrypoint/test | T |
| `tests/capybara_flow_runtime_contract.js` | TEST | 179 | - | ano | entrypoint/test | T |
| `tests/care_commands_ctx_contract.js` | TEST | 72 | - | ano | entrypoint/test | T |
| `tests/care_commands_wiring_contract.js` | TEST | 76 | - | ano | entrypoint/test | T |
| `tests/care_opportunities_contract.js` | TEST | 85 | - | ano | entrypoint/test | T |
| `tests/chat_lexicon_smoke.js` | TEST | 142 | - | ano | entrypoint/test | T |
| `tests/chat_variety_contract.js` | TEST | 127 | - | ano | entrypoint/test | T |
| `tests/combo_overlay_contract.js` | TEST | 96 | - | ano | entrypoint/test | T |
| `tests/combo_wave_ui_contract.js` | TEST | 74 | - | ano | entrypoint/test | T |
| `tests/config_contract_smoke.js` | TEST | 217 | - | ano | entrypoint/test | T |
| `tests/debug_routes_ctx_contract.js` | TEST | 69 | - | ano | entrypoint/test | T |
| `tests/debug_routes_runtime_contract.js` | TEST | 102 | - | ano | entrypoint/test | T |
| `tests/delivery_ctx_contract.js` | TEST | 68 | - | ano | entrypoint/test | T |
| `tests/delivery_runtime_contract.js` | TEST | 109 | - | ano | entrypoint/test | T |
| `tests/direct_chat_flow_smoke.js` | TEST | 619 | - | ano | entrypoint/test | T |
| `tests/direct_chat_intelligence_contract.js` | TEST | 453 | - | ano | entrypoint/test | T |
| `tests/duel_cross_stream_sync_contract.js` | TEST | 115 | - | ano | entrypoint/test | T |
| `tests/ecosystem_orchestrator_contract.js` | TEST | 103 | - | ano | entrypoint/test | T |
| `tests/emotion_grief_bank_contract.js` | TEST | 86 | - | ano | entrypoint/test | T |
| `tests/env_wiring_contract.js` | TEST | 148 | - | ano | entrypoint/test | T |
| `tests/event_pipeline_contract.js` | TEST | 220 | - | ano | entrypoint/test | T |
| `tests/event_pipeline_ctx_contract.js` | TEST | 127 | - | ano | entrypoint/test | T |
| `tests/event_pipeline_wiring_contract.js` | TEST | 111 | - | ano | entrypoint/test | T |
| `tests/fold_library_contract.js` | TEST | 108 | - | ano | entrypoint/test | T |
| `tests/gift_animation_context_contract.js` | TEST | 64 | - | ano | entrypoint/test | T |
| `tests/gift_animation_generate_contract.js` | TEST | 149 | - | ano | entrypoint/test | T |
| `tests/gift_economy_contract.js` | TEST | 158 | - | ano | entrypoint/test | T |
| `tests/gift_map_contract.js` | TEST | 450 | - | ano | entrypoint/test | T |

_… a dalších 385 souborů ve složce `tests/`._

<details><summary>Úplný seznam souborů (425)</summary>

- `tests/achievement_moment_contract.js` (TEST, 87 ř.)
- `tests/action_builder_ctx_contract.js` (TEST, 61 ř.)
- `tests/action_builder_runtime_contract.js` (TEST, 98 ř.)
- `tests/app_runtimes_contract.js` (TEST, 37 ř.)
- `tests/arena_battle_demo_contract.js` (TEST, 45 ř.)
- `tests/arena_battle_demo_ctx_contract.js` (TEST, 56 ř.)
- `tests/away_host_mode_contract.js` (TEST, 115 ř.)
- `tests/boss_cinematic_contract.js` (TEST, 175 ř.)
- `tests/boss_mission_ctx_contract.js` (TEST, 62 ř.)
- `tests/boss_mission_runtime_contract.js` (TEST, 119 ř.)
- `tests/bowl_full_video_contract.js` (TEST, 138 ř.)
- `tests/capybara_flow_contract.js` (TEST, 140 ř.)
- `tests/capybara_flow_ctx_contract.js` (TEST, 73 ř.)
- `tests/capybara_flow_runtime_contract.js` (TEST, 179 ř.)
- `tests/care_commands_ctx_contract.js` (TEST, 72 ř.)
- `tests/care_commands_wiring_contract.js` (TEST, 76 ř.)
- `tests/care_opportunities_contract.js` (TEST, 85 ř.)
- `tests/chat_lexicon_smoke.js` (TEST, 142 ř.)
- `tests/chat_variety_contract.js` (TEST, 127 ř.)
- `tests/combo_overlay_contract.js` (TEST, 96 ř.)
- `tests/combo_wave_ui_contract.js` (TEST, 74 ř.)
- `tests/config_contract_smoke.js` (TEST, 217 ř.)
- `tests/debug_routes_ctx_contract.js` (TEST, 69 ř.)
- `tests/debug_routes_runtime_contract.js` (TEST, 102 ř.)
- `tests/delivery_ctx_contract.js` (TEST, 68 ř.)
- `tests/delivery_runtime_contract.js` (TEST, 109 ř.)
- `tests/direct_chat_flow_smoke.js` (TEST, 619 ř.)
- `tests/direct_chat_intelligence_contract.js` (TEST, 453 ř.)
- `tests/duel_cross_stream_sync_contract.js` (TEST, 115 ř.)
- `tests/ecosystem_orchestrator_contract.js` (TEST, 103 ř.)
- `tests/emotion_grief_bank_contract.js` (TEST, 86 ř.)
- `tests/env_wiring_contract.js` (TEST, 148 ř.)
- `tests/event_pipeline_contract.js` (TEST, 220 ř.)
- `tests/event_pipeline_ctx_contract.js` (TEST, 127 ř.)
- `tests/event_pipeline_wiring_contract.js` (TEST, 111 ř.)
- `tests/fold_library_contract.js` (TEST, 108 ř.)
- `tests/gift_animation_context_contract.js` (TEST, 64 ř.)
- `tests/gift_animation_generate_contract.js` (TEST, 149 ř.)
- `tests/gift_economy_contract.js` (TEST, 158 ř.)
- `tests/gift_map_contract.js` (TEST, 450 ř.)
- `tests/gift_map_log_audit_contract.js` (TEST, 48 ř.)
- `tests/gift_media_ctx_contract.js` (TEST, 104 ř.)
- `tests/gift_media_runtime_contract.js` (TEST, 156 ř.)
- `tests/gift_runtime_contract.js` (TEST, 146 ř.)
- `tests/gift_runtime_ctx_contract.js` (TEST, 92 ř.)
- `tests/gift_user_metadata_contract.js` (TEST, 69 ř.)
- `tests/gift_visual_animation_bank_contract.js` (TEST, 69 ř.)
- `tests/health_ctx_contract.js` (TEST, 73 ř.)
- `tests/health_runtime_contract.js` (TEST, 156 ř.)
- `tests/host_mode_overlay_contract.js` (TEST, 73 ř.)
- `tests/host_team_ui_contract.js` (TEST, 62 ř.)
- `tests/ingest_contract_smoke.js` (TEST, 788 ř.)
- `tests/ingest_deduper_ctx_contract.js` (TEST, 57 ř.)
- `tests/ingest_dedupe_smoke.js` (TEST, 32 ř.)
- `tests/ingest_empty_payload_smoke.js` (TEST, 46 ř.)
- `tests/ingest_http_ctx_contract.js` (TEST, 85 ř.)
- `tests/ingest_http_wiring_contract.js` (TEST, 118 ř.)
- `tests/ingest_utils_ctx_contract.js` (TEST, 62 ř.)
- `tests/ingest_utils_runtime_contract.js` (TEST, 64 ř.)
- `tests/interpreter_auto_contract.js` (TEST, 80 ř.)
- `tests/interpreter_ctx_contract.js` (TEST, 52 ř.)
- `tests/kick_chat_reply_contract.js` (TEST, 148 ř.)
- `tests/kojnozout_canon_contract.js` (TEST, 86 ř.)
- `tests/kojnozout_canon_flow_contract.js` (TEST, 124 ř.)
- `tests/kojnozout_care_reward_contract.js` (TEST, 51 ř.)
- `tests/kojnozout_display_mood_contract.js` (TEST, 395 ř.)
- `tests/kojnozout_evolution_contract.js` (TEST, 75 ř.)
- `tests/kojnozout_evolution_milestone_contract.js` (TEST, 122 ř.)
- `tests/kojnozout_full_sprite_set_contract.js` (TEST, 85 ř.)
- `tests/kojnozout_item_care_contract.js` (TEST, 142 ř.)
- `tests/kojnozout_mood_derive_contract.js` (TEST, 55 ř.)
- `tests/kojnozout_pose_resolve_contract.js` (TEST, 60 ř.)
- `tests/kojnozout_runtime_contract.js` (TEST, 289 ř.)
- `tests/kojnozout_runtime_split_contract.js` (TEST, 695 ř.)
- `tests/kojnozout_sprite_alpha_contract.js` (TEST, 130 ř.)
- `tests/kojnozout_test_mode_contract.js` (TEST, 49 ř.)
- `tests/kojnozout_vitals_duel_contract.js` (TEST, 118 ř.)
- `tests/kojnozout_walk_unify_contract.js` (TEST, 65 ř.)
- `tests/koj_2d_factory_contract.js` (TEST, 109 ř.)
- `tests/koj_battle_choreography_contract.js` (TEST, 143 ř.)
- `tests/koj_moments_ctx_contract.js` (TEST, 77 ř.)
- `tests/koj_moments_runtime_contract.js` (TEST, 108 ř.)
- `tests/koj_public_snapshot_contract.js` (TEST, 77 ř.)
- `tests/koj_robot_modes_contract.js` (TEST, 90 ř.)
- `tests/koj_stage_moods_contract.js` (TEST, 49 ř.)
- `tests/language_detection_contract.js` (TEST, 110 ř.)
- `tests/live_smoke_checklist_contract.js` (TEST, 113 ř.)
- `tests/llm_hybrid_smoke.js` (TEST, 170 ř.)
- `tests/log_rotation_smoke.js` (TEST, 73 ř.)
- `tests/matting_ingest_bridge_ctx_contract.js` (TEST, 65 ř.)
- `tests/media_catalog_contract.js` (TEST, 261 ř.)
- `tests/media_command_hosts_contract.js` (TEST, 1340 ř.)
- `tests/media_singletons_runtime_contract.js` (TEST, 60 ř.)
- `tests/mia_2d_fx_contract.js` (TEST, 91 ř.)
- `tests/mia_animation_bank_12w_promote_contract.js` (TEST, 196 ř.)
- `tests/mia_animation_bank_12x_preview_contract.js` (TEST, 143 ř.)
- `tests/mia_animation_bank_12y_gift_override_contract.js` (TEST, 201 ř.)
- `tests/mia_animation_bank_12z_production_gate_contract.js` (TEST, 200 ř.)
- `tests/mia_animation_bank_production_contract.js` (TEST, 88 ř.)
- `tests/mia_animation_engine_contract.js` (TEST, 128 ř.)
- `tests/mia_display_vision_contract.js` (TEST, 134 ř.)
- `tests/mia_engine2_e2_contract.js` (TEST, 164 ř.)
- `tests/mia_engine2_e3_contract.js` (TEST, 153 ř.)
- `tests/mia_engine2_e4_contract.js` (TEST, 121 ř.)
- `tests/mia_engine2_e5_contract.js` (TEST, 103 ř.)
- `tests/mia_engine2_first_slice_contract.js` (TEST, 157 ř.)
- `tests/mia_engine2_roadmap_contract.js` (TEST, 78 ř.)
- `tests/mia_eyes_away_contract.js` (TEST, 85 ř.)
- `tests/mia_eyes_contract.js` (TEST, 199 ř.)
- `tests/mia_eyes_ctx_contract.js` (TEST, 61 ř.)
- `tests/mia_graphics_r1_contract.js` (TEST, 224 ř.)
- `tests/mia_graphics_studio_12b_contract.js` (TEST, 137 ř.)
- `tests/mia_graphics_studio_12c_contract.js` (TEST, 124 ř.)
- `tests/mia_graphics_studio_12d_contract.js` (TEST, 391 ř.)
- `tests/mia_graphics_studio_12e_contract.js` (TEST, 137 ř.)
- `tests/mia_graphics_studio_12f_contract.js` (TEST, 133 ř.)
- `tests/mia_graphics_studio_12g_contract.js` (TEST, 78 ř.)
- `tests/mia_graphics_studio_12h_contract.js` (TEST, 88 ř.)
- `tests/mia_graphics_studio_12i_contract.js` (TEST, 75 ř.)
- `tests/mia_graphics_studio_12j_contract.js` (TEST, 109 ř.)
- `tests/mia_graphics_studio_12k_contract.js` (TEST, 138 ř.)
- `tests/mia_graphics_studio_12l_contract.js` (TEST, 145 ř.)
- `tests/mia_graphics_studio_12m_contract.js` (TEST, 86 ř.)
- `tests/mia_graphics_studio_12n_contract.js` (TEST, 191 ř.)
- `tests/mia_graphics_studio_12o_contract.js` (TEST, 142 ř.)
- `tests/mia_graphics_studio_12p_contract.js` (TEST, 65 ř.)
- `tests/mia_graphics_studio_12q_contract.js` (TEST, 91 ř.)
- `tests/mia_graphics_studio_12r_contract.js` (TEST, 145 ř.)
- `tests/mia_graphics_studio_12s_contract.js` (TEST, 63 ř.)
- `tests/mia_graphics_studio_12t_contract.js` (TEST, 86 ř.)
- `tests/mia_graphics_studio_12u_contract.js` (TEST, 87 ř.)
- `tests/mia_graphics_studio_12v_contract.js` (TEST, 108 ř.)
- `tests/mia_graphics_studio_13a_identity_contract.js` (TEST, 84 ř.)
- `tests/mia_graphics_studio_13b_unified_preview_contract.js` (TEST, 100 ř.)
- `tests/mia_graphics_studio_13c_obs_revive_contract.js` (TEST, 64 ř.)
- `tests/mia_graphics_studio_13d_composed_layout_contract.js` (TEST, 76 ř.)
- `tests/mia_graphics_studio_13e_hero_portrait_contract.js` (TEST, 88 ř.)
- `tests/mia_graphics_studio_13h_hero_alpha_contract.js` (TEST, 76 ř.)
- `tests/mia_graphics_studio_13i_paint_timeline_bridge_contract.js` (TEST, 90 ř.)
- `tests/mia_graphics_studio_13j_dashboard_ai_generate_contract.js` (TEST, 110 ř.)
- `tests/mia_graphics_studio_13k_staging_writeback_contract.js` (TEST, 122 ř.)
- `tests/mia_graphics_studio_13l_staging_preview_contract.js` (TEST, 105 ř.)
- `tests/mia_graphics_studio_13m_staging_video_encode_contract.js` (TEST, 90 ř.)
- `tests/mia_graphics_studio_13n_operator_polish_contract.js` (TEST, 73 ř.)
- `tests/mia_graphics_studio_13o_character_motion_identity_contract.js` (TEST, 102 ř.)
- `tests/mia_graphics_studio_13p_timeline_combo_contract.js` (TEST, 104 ř.)
- `tests/mia_graphics_studio_13q_timeline_pro_ux_contract.js` (TEST, 78 ř.)
- `tests/mia_graphics_studio_13r_ai_video_quality_contract.js` (TEST, 134 ř.)
- `tests/mia_graphics_studio_13s_body_art_assemble_contract.js` (TEST, 126 ř.)
- `tests/mia_graphics_studio_13t_assemble_v2_contract.js` (TEST, 136 ř.)
- `tests/mia_graphics_studio_13u_lip_audio_bone_contract.js` (TEST, 110 ř.)
- `tests/mia_graphics_studio_13v_whisper_mesh_contract.js` (TEST, 139 ř.)
- `tests/mia_graphics_studio_13w_live_viseme_contract.js` (TEST, 83 ř.)
- `tests/mia_graphics_studio_13x_live_audio_lip_contract.js` (TEST, 113 ř.)
- `tests/mia_graphics_studio_13y_body_speak_lip_contract.js` (TEST, 93 ř.)
- `tests/mia_graphics_studio_13z_visible_speak_faces_contract.js` (TEST, 136 ř.)
- `tests/mia_graphics_studio_14a_live_presence_contract.js` (TEST, 85 ř.)
- `tests/mia_graphics_studio_14b_mood_brain_contract.js` (TEST, 128 ř.)
- `tests/mia_graphics_studio_contract.js` (TEST, 116 ř.)
- `tests/mia_graphic_reference_contract.js` (TEST, 147 ř.)
- `tests/mia_master_canon_0001_contract.js` (TEST, 96 ř.)
- `tests/mia_master_canon_0002_contract.js` (TEST, 104 ř.)
- `tests/mia_master_canon_0003_contract.js` (TEST, 86 ř.)
- `tests/mia_master_canon_0004_contract.js` (TEST, 81 ř.)
- `tests/mia_master_canon_0005_contract.js` (TEST, 80 ř.)
- `tests/mia_master_canon_0006_contract.js` (TEST, 81 ř.)
- `tests/mia_master_canon_0007_contract.js` (TEST, 92 ř.)
- `tests/mia_master_canon_0008_contract.js` (TEST, 97 ř.)
- `tests/mia_master_canon_0009_contract.js` (TEST, 114 ř.)
- `tests/mia_master_canon_0010_contract.js` (TEST, 124 ř.)
- `tests/mia_master_canon_0011_contract.js` (TEST, 113 ř.)
- `tests/mia_master_canon_0012_contract.js` (TEST, 117 ř.)
- `tests/mia_master_canon_0013_contract.js` (TEST, 129 ř.)
- `tests/mia_master_canon_0014_contract.js` (TEST, 130 ř.)
- `tests/mia_master_canon_0015_contract.js` (TEST, 142 ř.)
- `tests/mia_master_canon_0016_contract.js` (TEST, 144 ř.)
- `tests/mia_master_canon_0017_contract.js` (TEST, 179 ř.)
- `tests/mia_master_canon_0018_contract.js` (TEST, 142 ř.)
- `tests/mia_master_canon_0019_contract.js` (TEST, 148 ř.)
- `tests/mia_master_canon_0020_contract.js` (TEST, 157 ř.)
- `tests/mia_master_canon_0021_contract.js` (TEST, 153 ř.)
- `tests/mia_master_canon_0022_contract.js` (TEST, 168 ř.)
- `tests/mia_master_canon_0023_contract.js` (TEST, 168 ř.)
- `tests/mia_master_canon_0024_contract.js` (TEST, 182 ř.)
- `tests/mia_master_canon_0025_contract.js` (TEST, 217 ř.)
- `tests/mia_master_canon_0026_contract.js` (TEST, 181 ř.)
- `tests/mia_master_canon_0027_contract.js` (TEST, 213 ř.)
- `tests/mia_master_canon_0028_contract.js` (TEST, 140 ř.)
- `tests/mia_master_canon_0029_contract.js` (TEST, 185 ř.)
- `tests/mia_master_canon_0030_contract.js` (TEST, 193 ř.)
- `tests/mia_master_canon_0031_contract.js` (TEST, 180 ř.)
- `tests/mia_master_canon_0032_contract.js` (TEST, 169 ř.)
- `tests/mia_master_canon_0033_contract.js` (TEST, 160 ř.)
- `tests/mia_master_canon_0034_contract.js` (TEST, 174 ř.)
- `tests/mia_master_canon_0035_contract.js` (TEST, 178 ř.)
- `tests/mia_master_canon_0036_contract.js` (TEST, 196 ř.)
- `tests/mia_master_canon_0037_contract.js` (TEST, 187 ř.)
- `tests/mia_master_canon_0038_contract.js` (TEST, 236 ř.)
- `tests/mia_master_canon_0039_contract.js` (TEST, 188 ř.)
- `tests/mia_master_canon_0040_contract.js` (TEST, 197 ř.)
- `tests/mia_master_canon_0041_contract.js` (TEST, 176 ř.)
- `tests/mia_master_canon_0042_contract.js` (TEST, 187 ř.)
- `tests/mia_master_canon_0043_contract.js` (TEST, 191 ř.)
- `tests/mia_master_canon_0044_contract.js` (TEST, 166 ř.)
- `tests/mia_master_canon_0045_contract.js` (TEST, 155 ř.)
- `tests/mia_master_canon_0046_contract.js` (TEST, 169 ř.)
- `tests/mia_master_canon_0047_contract.js` (TEST, 230 ř.)
- `tests/mia_master_canon_0048_contract.js` (TEST, 168 ř.)
- `tests/mia_master_canon_0049_contract.js` (TEST, 192 ř.)
- `tests/mia_master_canon_0050_contract.js` (TEST, 167 ř.)
- `tests/mia_master_canon_0051_contract.js` (TEST, 216 ř.)
- `tests/mia_master_canon_0052_contract.js` (TEST, 191 ř.)
- `tests/mia_master_canon_0053_contract.js` (TEST, 231 ř.)
- `tests/mia_master_canon_0054_contract.js` (TEST, 230 ř.)
- `tests/mia_master_canon_0055_contract.js` (TEST, 194 ř.)
- `tests/mia_master_canon_0056_contract.js` (TEST, 175 ř.)
- `tests/mia_master_canon_0057_contract.js` (TEST, 237 ř.)
- `tests/mia_master_canon_0058_contract.js` (TEST, 246 ř.)
- `tests/mia_master_canon_0059_contract.js` (TEST, 212 ř.)
- `tests/mia_master_canon_0060_contract.js` (TEST, 236 ř.)
- `tests/mia_master_canon_0061_contract.js` (TEST, 198 ř.)
- `tests/mia_master_canon_0062_contract.js` (TEST, 278 ř.)
- `tests/mia_master_canon_0063_contract.js` (TEST, 452 ř.)
- `tests/mia_master_canon_0064_contract.js` (TEST, 497 ř.)
- `tests/mia_master_canon_0065_contract.js` (TEST, 603 ř.)
- `tests/mia_master_canon_0066_contract.js` (TEST, 663 ř.)
- `tests/mia_master_canon_0067_contract.js` (TEST, 644 ř.)
- `tests/mia_master_canon_0068_contract.js` (TEST, 526 ř.)
- `tests/mia_master_canon_0069_contract.js` (TEST, 578 ř.)
- `tests/mia_master_canon_0070_contract.js` (TEST, 536 ř.)
- `tests/mia_master_canon_0071_contract.js` (TEST, 516 ř.)
- `tests/mia_master_canon_0072_contract.js` (TEST, 556 ř.)
- `tests/mia_master_canon_0073_contract.js` (TEST, 597 ř.)
- `tests/mia_master_canon_0074_contract.js` (TEST, 538 ř.)
- `tests/mia_master_canon_0075_contract.js` (TEST, 515 ř.)
- `tests/mia_master_canon_0076_contract.js` (TEST, 487 ř.)
- `tests/mia_master_canon_0077_contract.js` (TEST, 466 ř.)
- `tests/mia_master_canon_0078_contract.js` (TEST, 507 ř.)
- `tests/mia_master_canon_0079_contract.js` (TEST, 475 ř.)
- `tests/mia_master_canon_0080_contract.js` (TEST, 500 ř.)
- `tests/mia_master_canon_0081_contract.js` (TEST, 563 ř.)
- `tests/mia_master_canon_0082_contract.js` (TEST, 546 ř.)
- `tests/mia_master_canon_0083_contract.js` (TEST, 418 ř.)
- `tests/mia_master_canon_0084_contract.js` (TEST, 400 ř.)
- `tests/mia_master_canon_0085_contract.js` (TEST, 348 ř.)
- `tests/mia_master_canon_0086_contract.js` (TEST, 351 ř.)
- `tests/mia_master_canon_0087_contract.js` (TEST, 247 ř.)
- `tests/mia_obs_hands_contract.js` (TEST, 172 ř.)
- `tests/mia_obs_vision_contract.js` (TEST, 130 ř.)
- `tests/mia_paint_ai_contract.js` (TEST, 90 ř.)
- `tests/mia_paint_animation_contract.js` (TEST, 73 ř.)
- `tests/mia_paint_core_contract.js` (TEST, 94 ř.)
- `tests/mia_paint_gpu_contract.js` (TEST, 65 ř.)
- `tests/mia_paint_integration_contract.js` (TEST, 112 ř.)
- `tests/mia_paint_io_contract.js` (TEST, 97 ř.)
- `tests/mia_paint_koj_bridge_contract.js` (TEST, 44 ř.)
- `tests/mia_paint_plugin_contract.js` (TEST, 82 ř.)
- `tests/mia_paint_selection_contract.js` (TEST, 89 ř.)
- `tests/mia_paint_smoke_contract.js` (TEST, 73 ř.)
- `tests/mia_paint_stroke_contract.js` (TEST, 73 ř.)
- `tests/mia_paint_tauri_contract.js` (TEST, 93 ř.)
- `tests/mia_paint_vector_contract.js` (TEST, 79 ř.)
- `tests/mia_phase15_contract.js` (TEST, 138 ř.)
- `tests/mia_phase16_contract.js` (TEST, 144 ř.)
- `tests/mia_phase17_contract.js` (TEST, 93 ř.)
- `tests/mia_phase18_contract.js` (TEST, 109 ř.)
- `tests/mia_phase19_contract.js` (TEST, 168 ř.)
- `tests/mia_phase20_contract.js` (TEST, 134 ř.)
- `tests/mia_phase21_contract.js` (TEST, 94 ř.)
- `tests/mia_phase22_contract.js` (TEST, 139 ř.)
- `tests/mia_remote_fold_contract.js` (TEST, 57 ř.)
- `tests/mia_timeline_editor_contract.js` (TEST, 130 ř.)
- `tests/mia_visual_coverage_contract.js` (TEST, 73 ř.)
- `tests/mia_voice_revive_13f_contract.js` (TEST, 74 ř.)
- `tests/obs_away_loop_contract.js` (TEST, 63 ř.)
- `tests/obs_away_scene_contract.js` (TEST, 149 ř.)
- `tests/obs_bootstrap_contract.js` (TEST, 69 ř.)
- `tests/obs_bootstrap_ctx_contract.js` (TEST, 69 ř.)
- `tests/obs_fix_overlay_layout_contract.js` (TEST, 11 ř.)
- `tests/obs_live_manifest_contract.js` (TEST, 79 ř.)
- `tests/obs_overlay_renderer_ctx_contract.js` (TEST, 70 ř.)
- `tests/obs_overlay_render_smoke.js` (TEST, 173 ř.)
- `tests/obs_overlay_sync_contract.js` (TEST, 104 ř.)
- `tests/obs_overlay_sync_ctx_contract.js` (TEST, 58 ř.)
- `tests/obs_overlay_sync_runtime_contract.js` (TEST, 54 ř.)
- `tests/obs_overlay_sync_wrappers_ctx_contract.js` (TEST, 67 ř.)
- `tests/obs_persistent_layers_contract.js` (TEST, 94 ř.)
- `tests/obs_post_connect_ctx_contract.js` (TEST, 86 ř.)
- `tests/obs_post_connect_runtime_contract.js` (TEST, 108 ř.)
- `tests/obs_safe_call_contract.js` (TEST, 83 ř.)
- `tests/obs_safe_call_ctx_contract.js` (TEST, 60 ř.)
- `tests/obs_scene_guard_contract.js` (TEST, 79 ř.)
- `tests/obs_vision_ctx_contract.js` (TEST, 66 ř.)
- `tests/obs_watchdog_contract.js` (TEST, 112 ř.)
- `tests/obs_watchdog_ctx_contract.js` (TEST, 76 ř.)
- `tests/output_policy_ctx_contract.js` (TEST, 57 ř.)
- `tests/overlay_emit_smoke.js` (TEST, 37 ř.)
- `tests/overlay_layout_contract.js` (TEST, 60 ř.)
- `tests/overlay_participants_contract.js` (TEST, 73 ř.)
- `tests/overlay_public_ctx_contract.js` (TEST, 105 ř.)
- `tests/overlay_public_response_contract.js` (TEST, 148 ř.)
- `tests/overlay_public_wiring_contract.js` (TEST, 58 ř.)
- `tests/overlay_queue_ctx_contract.js` (TEST, 57 ř.)
- `tests/overlay_queue_smoke.js` (TEST, 232 ř.)
- `tests/overlay_state_cache_ctx_contract.js` (TEST, 58 ř.)
- `tests/overlay_state_ctx_contract.js` (TEST, 72 ř.)
- `tests/overlay_timing_ctx_contract.js` (TEST, 56 ř.)
- `tests/overlay_timing_smoke.js` (TEST, 163 ř.)
- `tests/overlay_voice_queue_integration_smoke.js` (TEST, 195 ř.)
- `tests/p2_architecture_contract.js` (TEST, 209 ř.)
- `tests/participant_ctx_contract.js` (TEST, 62 ř.)
- `tests/participant_runtime_contract.js` (TEST, 83 ř.)
- `tests/phase1_action_queue_contract.js` (TEST, 315 ř.)
- `tests/phase1_event_normalizer_contract.js` (TEST, 117 ř.)
- `tests/phase1_replay_contract.js` (TEST, 94 ř.)
- `tests/phase1_runtime_state_contract.js` (TEST, 87 ř.)
- `tests/phase1_stream_watchdog_contract.js` (TEST, 104 ř.)
- `tests/phase2_admin_storyboard_contract.js` (TEST, 116 ř.)
- `tests/phase2_combo_moments_contract.js` (TEST, 105 ř.)
- `tests/phase2_mia_director_contract.js` (TEST, 103 ř.)
- `tests/phase2_viewer_memory_contract.js` (TEST, 93 ř.)
- `tests/phase3_game_layer_contract.js` (TEST, 240 ř.)
- `tests/phase4_product_boundary_contract.js` (TEST, 150 ř.)
- `tests/pipeline_runtimes_contract.js` (TEST, 42 ř.)
- `tests/pipeline_summary_ctx_contract.js` (TEST, 70 ř.)
- `tests/pipeline_summary_runtime_contract.js` (TEST, 77 ř.)
- `tests/platform_arena_contract.js` (TEST, 185 ř.)
- `tests/platform_bridges_contract.js` (TEST, 124 ř.)
- `tests/platform_bridges_ctx_contract.js` (TEST, 95 ř.)
- `tests/platform_form_assets_contract.js` (TEST, 97 ř.)
- `tests/proactive_idle_host_smoke.js` (TEST, 121 ř.)
- `tests/process_event_fallback_regression.js` (TEST, 171 ř.)
- `tests/remote_dev_contract.js` (TEST, 111 ř.)
- `tests/route_context_contract.js` (TEST, 97 ř.)
- `tests/route_context_ctx_contract.js` (TEST, 76 ř.)
- `tests/route_context_deps_contract.js` (TEST, 77 ř.)
- `tests/route_context_host_contract.js` (TEST, 94 ř.)
- `tests/runtime_loops_contract.js` (TEST, 106 ř.)
- `tests/runtime_loops_ctx_contract.js` (TEST, 108 ř.)
- `tests/runtime_perf_contract.js` (TEST, 100 ř.)
- `tests/runtime_security_ctx_contract.js` (TEST, 56 ř.)
- `tests/runtime_smoke.js` (TEST, 533 ř.)
- `tests/runtime_state_ctx_contract.js` (TEST, 99 ř.)
- `tests/runtime_state_runtime_contract.js` (TEST, 124 ř.)
- `tests/runtime_state_seed_ctx_contract.js` (TEST, 89 ř.)
- `tests/server_bootstrap_contract.js` (TEST, 91 ř.)
- `tests/server_bootstrap_ctx_contract.js` (TEST, 104 ř.)
- `tests/session_memory_response_contract.js` (TEST, 139 ř.)
- `tests/shadow_pipeline_integration.js` (TEST, 308 ř.)
- `tests/share_flow_smoke.js` (TEST, 78 ř.)
- `tests/showcase_command_ctx_contract.js` (TEST, 114 ř.)
- `tests/showcase_command_runtime_contract.js` (TEST, 142 ř.)
- `tests/showcase_ctx_contract.js` (TEST, 73 ř.)
- `tests/showcase_runtime_contract.js` (TEST, 86 ř.)
- `tests/solo_stream_contract.js` (TEST, 149 ř.)
- `tests/solo_stream_ctx_contract.js` (TEST, 71 ř.)
- `tests/solo_stream_runtime_contract.js` (TEST, 97 ř.)
- `tests/spam_session_contract.js` (TEST, 256 ř.)
- `tests/spam_session_ctx_contract.js` (TEST, 69 ř.)
- `tests/speaker_routing_contract.js` (TEST, 345 ř.)
- `tests/sprint3_contract.js` (TEST, 80 ř.)
- `tests/sprint4_contract.js` (TEST, 107 ř.)
- `tests/sprint5_contract.js` (TEST, 129 ř.)
- `tests/sprint6_contract.js` (TEST, 86 ř.)
- `tests/sprint_a_security_contract.js` (TEST, 108 ř.)
- `tests/sprint_b_contract.js` (TEST, 138 ř.)
- `tests/sprint_c_contract.js` (TEST, 102 ř.)
- `tests/sprint_d_contract.js` (TEST, 66 ř.)
- `tests/sprint_e_contract.js` (TEST, 199 ř.)
- `tests/sprint_f_contract.js` (TEST, 89 ř.)
- `tests/sprint_g_contract.js` (TEST, 89 ř.)
- `tests/sprint_h_contract.js` (TEST, 67 ř.)
- `tests/sprint_i_contract.js` (TEST, 86 ř.)
- `tests/sprint_j_contract.js` (TEST, 75 ř.)
- `tests/sprint_k_contract.js` (TEST, 46 ř.)
- `tests/sprint_l_contract.js` (TEST, 53 ř.)
- `tests/sprint_m_contract.js` (TEST, 55 ř.)
- `tests/sprint_n_contract.js` (TEST, 50 ř.)
- `tests/startup_overlay_ctx_contract.js` (TEST, 121 ř.)
- `tests/startup_overlay_runtime_contract.js` (TEST, 166 ř.)
- `tests/startup_readiness_contract.js` (TEST, 72 ř.)
- `tests/status_ctx_contract.js` (TEST, 93 ř.)
- `tests/status_overlay_vision_runtime_contract.js` (TEST, 156 ř.)
- `tests/status_smoke.js` (TEST, 50 ř.)
- `tests/status_snapshot_contract.js` (TEST, 117 ř.)
- `tests/story_animation_contract.js` (TEST, 95 ř.)
- `tests/story_feed_ctx_contract.js` (TEST, 63 ř.)
- `tests/story_feed_runtime_contract.js` (TEST, 159 ř.)
- `tests/story_request_contract.js` (TEST, 83 ř.)
- `tests/streamer_identity_contract.js` (TEST, 79 ř.)
- `tests/streamer_media_command_contract.js` (TEST, 117 ř.)
- `tests/streamer_media_ctx_contract.js` (TEST, 103 ř.)
- `tests/streamer_media_runtime_contract.js` (TEST, 126 ř.)
- `tests/streamer_showcase_contract.js` (TEST, 76 ř.)
- `tests/stream_audience_smoke.js` (TEST, 57 ř.)
- `tests/stream_state_ctx_contract.js` (TEST, 69 ř.)
- `tests/stream_state_runtime_contract.js` (TEST, 73 ř.)
- `tests/support_ack_adaptive_smoke.js` (TEST, 140 ř.)
- `tests/support_koj_reaction_policy_smoke.js` (TEST, 106 ř.)
- `tests/support_subtext_smoke.js` (TEST, 79 ř.)
- `tests/telegram_bridge_contract.js` (TEST, 75 ř.)
- `tests/text_bank_coverage_contract.js` (TEST, 86 ř.)
- `tests/text_bank_loader_smoke.js` (TEST, 63 ř.)
- `tests/theme_manager_contract.js` (TEST, 78 ř.)
- `tests/translation_ctx_contract.js` (TEST, 80 ř.)
- `tests/translation_runtime_contract.js` (TEST, 104 ř.)
- `tests/tts_engine_ctx_contract.js` (TEST, 59 ř.)
- `tests/tts_overlay_integration_smoke.js` (TEST, 176 ř.)
- `tests/user_ack_throttle_contract.js` (TEST, 230 ř.)
- `tests/video_engine_ctx_contract.js` (TEST, 76 ř.)
- `tests/video_rotation_smoke.js` (TEST, 75 ř.)
- `tests/video_timing_contract.js` (TEST, 162 ř.)
- `tests/vision_context_ctx_contract.js` (TEST, 68 ř.)
- `tests/vitals_companion_contract.js` (TEST, 129 ř.)
- `tests/voice_control_layer_ctx_contract.js` (TEST, 56 ř.)
- `tests/voice_control_layer_smoke.js` (TEST, 229 ř.)
- `tests/voice_endpoint_smoke.js` (TEST, 506 ř.)
- `tests/voice_priority_ctx_contract.js` (TEST, 57 ř.)
- `tests/voice_priority_smoke.js` (TEST, 258 ř.)
- `tests/voice_timing_contract.js` (TEST, 61 ř.)
- `tests/voice_timing_ctx_contract.js` (TEST, 64 ř.)
- `tests/world_layer_ctx_contract.js` (TEST, 73 ř.)
- `tests/world_layer_runtime_contract.js` (TEST, 154 ř.)
- `tests/world_mode_ctx_contract.js` (TEST, 64 ř.)
- `tests/world_mode_runtime_contract.js` (TEST, 76 ř.)

</details>

## `tools/` (1 modulů)

| Cesta | Kat. | Ř. | Exporty | Použito | Konzumenti | Flags |
|-------|------|-----|---------|---------|------------|-------|
| `tools/mia-paint-tauri/ui/bridge.js` | EDITOR | 68 | - | pravděpodobně_ne | - | - |

## Kořenové a config soubory (ne-JS)

| Cesta | Účel | Kat. |
|-------|------|------|
| `index.js` | Hlavní monolitický runtime server | CORE |
| `server.js` | npm start wrapper | CORE |
| `package.json` | NPM scripts, dependencies | CONFIG |
| `config/stream-media-catalog.json` | Media katalog pro OBS sloty (9874 ř.) | CONFIG |
| `config/media-visual-review.json` | Visual review metadata | CONFIG |
| `shared/stream_economy_config.json` | Stream economy nastavení | ECONOMY |
| `shared/gifts/gift_map/*.json` | Gift map definice (tiers, aliases, rewards) | ECONOMY |
