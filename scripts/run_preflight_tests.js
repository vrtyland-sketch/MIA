"use strict";

const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { getClipEntry, loadBankIndex } = require("../shared/mia-animation-engine/AnimationBank");

const ROOT = path.resolve(__dirname, "..");

const SLOW_SUITE_NAMES = new Set(["video_timing", "video_rotation"]);

const FAST_SUITE_NAMES = [
  "runtime_smoke",
  "config_contract",
  "status_snapshot",
  "runtime_perf",
  "mia_eyes",
  "mia_obs_hands",
  "combo_overlay",
  "combo_wave_ui",
  "sprint_a_security",
  "control_route_http_auth",
  "control_side_effect_http",
  "duel_peer_credential",
  "ingest_contract",
  "shadow_pipeline",
  "speaker_routing",
  "gift_economy",
  "gift_map",
  "gift_map_log_audit",
  "achievement_moment",
  "user_ack_throttle",
  "remote_dev",
  "live_smoke_checklist",
  "p2_architecture",
  "overlay_public_response",
  "koj_public_snapshot",
  "koj_walk_unify",
  "koj_runtime_split",
  "koj_live_assets",
  "overlay_layout",
  "graphics_r1",
  "event_pipeline",
  "gift_dedupe_lifecycle",
  "obs_bootstrap",
  "obs_overlay_sync",
  "server_bootstrap",
  "runtime_loops",
  "delivery_runtime",
  "platform_bridges",
  "youtube_poll",
  "kick_chat_reply",
  "env_wiring",
  "gift_runtime",
  "gift_media_runtime",
  "story_feed_runtime",
  "participant_runtime",
  "world_mode_runtime",
  "startup_overlay_runtime",
  "startup_voice_queue",
  "mia_say_voice_queue",
  "health_runtime",
  "obs_post_connect_runtime",
  "route_context",
  "status_overlay_vision_runtime",
  "translation_runtime",
  "translation_voice_queue",
  "showcase_runtime",
  "obs_safe_call",
  "boss_mission_runtime",
  "voice_timing",
  "showcase_command_runtime",
  "route_context_deps",
  "streamer_media_runtime",
  "capybara_flow_runtime",
  "solo_stream_runtime",
  "world_layer_runtime",
  "runtime_state_runtime",
  "phase1_event_normalizer",
  "phase1_action_queue",
  "phase1_runtime_state",
  "phase1_stream_watchdog",
  "phase1_replay",
  "phase2_mia_director",
  "phase2_combo_moments",
  "phase2_viewer_memory",
  "runtime_privacy_absence",
  "media_review_privacy",
  "phase2_admin_storyboard",
  "theme_manager",
  "phase3_game_layer",
  "phase4_product_boundary",
  "event_pipeline_wiring",
  "action_builder_runtime",
  "koj_moments_runtime",
  "ingest_utils_runtime",
  "overlay_public_wiring",
  "care_commands_wiring",
  "route_context_ctx",
  "pipeline_summary_runtime",
  "event_pipeline_ctx",
  "ingest_http_wiring",
  "ingest_http_ctx",
  "debug_routes_runtime",
  "debug_routes_ctx",
  "overlay_public_ctx",
  "care_commands_ctx",
  "stream_state_runtime",
  "stream_state_ctx",
  "obs_overlay_sync_runtime",
  "obs_overlay_sync_ctx",
  "delivery_ctx",
  "status_ctx",
  "platform_bridges_ctx",
  "route_context_host",
  "runtime_loops_ctx",
  "translation_ctx",
  "gift_runtime_ctx",
  "koj_moments_ctx",
  "health_ctx",
  "showcase_ctx",
  "capybara_flow_ctx",
  "solo_stream_ctx",
  "world_layer_ctx",
  "boss_mission_ctx",
  "world_mode_ctx",
  "showcase_command_ctx",
  "streamer_media_ctx",
  "runtime_state_ctx",
  "action_builder_ctx",
  "ingest_utils_ctx",
  "pipeline_summary_ctx",
  "pipeline_runtimes",
  "media_command_hosts",
  "app_runtimes",
  "startup_overlay_ctx",
  "obs_post_connect_ctx",
  "obs_bootstrap_ctx",
  "obs_safe_call_ctx",
  "voice_timing_ctx",
  "story_feed_ctx",
  "gift_media_ctx",
  "participant_ctx",
  "vision_context_ctx",
  "overlay_state_ctx",
  "video_engine_ctx",
  "media_singletons_runtime",
  "mia_eyes_ctx",
  "overlay_state_cache_ctx",
  "ingest_deduper_ctx",
  "ingest_dedupe",
  "voice_speak_queue",
  "overlay_voice_queue",
  "gift_voice_routing",
  "kojnozout_persistence",
  "log_rotation",
  "obs_vision_ctx",
  "overlay_timing_ctx",
  "overlay_queue_ctx",
  "voice_priority_ctx",
  "tts_engine_ctx",
  "voice_control_layer_ctx",
  "interpreter_ctx",
  "matting_ingest_bridge_ctx",
  "obs_overlay_renderer_ctx",
  "runtime_state_seed_ctx",
  "output_policy_ctx",
  "obs_watchdog_ctx",
  "arena_battle_demo_ctx",
  "runtime_security_ctx",
  "spam_session_ctx",
  "obs_overlay_sync_wrappers_ctx",
  "server_bootstrap_ctx",
  "obs_live_manifest",
  "host_team_ui",
  "sprint_e",
  "sprint_f",
  "mia_obs_vision",
  "sprint_m",
  "mia_paint_integration",
  "mia_paint_smoke",
  "mia_graphics_studio",
  "mia_graphics_studio_12b",
  "mia_graphics_studio_12c",
  "mia_graphics_studio_12d",
  "mia_graphics_studio_12e",
  "mia_graphics_studio_12f",
  "graphics_body",
  "engine2_roadmap",
  "engine2_first_slice",
  "engine2_e2",
  "engine2_e3",
  "engine2_e4",
  "engine2_e5",
  "preflight_cloud"
];

const SUITES = [
  { name: "media_catalog", cmd: "node", args: ["tests/media_catalog_contract.js"] },
  { name: "video_rotation", cmd: "node", args: ["tests/video_rotation_smoke.js"], slow: true },
  { name: "video_timing", cmd: "node", args: ["tests/video_timing_contract.js"], slow: true },
  { name: "status_snapshot", cmd: "node", args: ["tests/status_snapshot_contract.js"] },
  { name: "mia_eyes", cmd: "node", args: ["tests/mia_eyes_contract.js"] },
  { name: "mia_obs_hands", cmd: "node", args: ["tests/mia_obs_hands_contract.js"] },
  { name: "gift_visual", cmd: "node", args: ["tests/gift_visual_animation_bank_contract.js"] },
  { name: "gift_animation_context", cmd: "node", args: ["tests/gift_animation_context_contract.js"] },
  { name: "capybara_flow", cmd: "node", args: ["tests/capybara_flow_contract.js"] },
  { name: "gift_economy", cmd: "node", args: ["tests/gift_economy_contract.js"] },
  { name: "gift_map", cmd: "node", args: ["tests/gift_map_contract.js"] },
  { name: "gift_map_log_audit", cmd: "node", args: ["tests/gift_map_log_audit_contract.js"] },
  { name: "achievement_moment", cmd: "node", args: ["tests/achievement_moment_contract.js"] },
  { name: "user_ack_throttle", cmd: "node", args: ["tests/user_ack_throttle_contract.js"] },
  { name: "remote_dev", cmd: "node", args: ["tests/remote_dev_contract.js"] },
  { name: "live_smoke_checklist", cmd: "node", args: ["tests/live_smoke_checklist_contract.js"] },
  { name: "p2_architecture", cmd: "node", args: ["tests/p2_architecture_contract.js"] },
  { name: "overlay_public_response", cmd: "node", args: ["tests/overlay_public_response_contract.js"] },
  { name: "koj_public_snapshot", cmd: "node", args: ["tests/koj_public_snapshot_contract.js"] },
  { name: "koj_walk_unify", cmd: "node", args: ["tests/kojnozout_walk_unify_contract.js"] },
  { name: "koj_runtime_split", cmd: "node", args: ["tests/kojnozout_runtime_split_contract.js"] },
  { name: "koj_live_assets", cmd: "node", args: ["tests/koj_live_assets_contract.js"] },
  { name: "overlay_layout", cmd: "node", args: ["tests/overlay_layout_contract.js"] },
  { name: "graphics_r1", cmd: "node", args: ["tests/mia_graphics_r1_contract.js"] },
  { name: "event_pipeline", cmd: "node", args: ["tests/event_pipeline_contract.js"] },
  { name: "gift_dedupe_lifecycle", cmd: "node", args: ["tests/gift_dedupe_lifecycle_contract.js"] },
  { name: "obs_bootstrap", cmd: "node", args: ["tests/obs_bootstrap_contract.js"] },
  { name: "obs_overlay_sync", cmd: "node", args: ["tests/obs_overlay_sync_contract.js"] },
  { name: "server_bootstrap", cmd: "node", args: ["tests/server_bootstrap_contract.js"] },
  { name: "runtime_loops", cmd: "node", args: ["tests/runtime_loops_contract.js"] },
  { name: "delivery_runtime", cmd: "node", args: ["tests/delivery_runtime_contract.js"] },
  { name: "platform_bridges", cmd: "node", args: ["tests/platform_bridges_contract.js"] },
  { name: "youtube_poll", cmd: "node", args: ["tests/youtube_poll_contract.js"] },
  { name: "platform_integration_layer", cmd: "node", args: ["tests/platform_integration_layer_contract.js"] },
  { name: "platform_arena", cmd: "node", args: ["tests/platform_arena_contract.js"] },
  { name: "platform_arena_e2e", cmd: "node", args: ["tests/platform_arena_e2e_contract.js"] },
  { name: "kick_chat_reply", cmd: "node", args: ["tests/kick_chat_reply_contract.js"] },
  { name: "env_wiring", cmd: "node", args: ["tests/env_wiring_contract.js"] },
  { name: "gift_runtime", cmd: "node", args: ["tests/gift_runtime_contract.js"] },
  { name: "gift_media_runtime", cmd: "node", args: ["tests/gift_media_runtime_contract.js"] },
  { name: "story_feed_runtime", cmd: "node", args: ["tests/story_feed_runtime_contract.js"] },
  { name: "participant_runtime", cmd: "node", args: ["tests/participant_runtime_contract.js"] },
  { name: "world_mode_runtime", cmd: "node", args: ["tests/world_mode_runtime_contract.js"] },
  { name: "startup_overlay_runtime", cmd: "node", args: ["tests/startup_overlay_runtime_contract.js"] },
  { name: "startup_voice_queue", cmd: "node", args: ["tests/startup_voice_queue_contract.js"] },
  { name: "mia_say_voice_queue", cmd: "node", args: ["tests/mia_say_voice_queue_contract.js"] },
  { name: "tts_test_voice_queue", cmd: "node", args: ["tests/tts_test_voice_queue_contract.js"] },
  { name: "health_runtime", cmd: "node", args: ["tests/health_runtime_contract.js"] },
  { name: "obs_post_connect_runtime", cmd: "node", args: ["tests/obs_post_connect_runtime_contract.js"] },
  { name: "route_context", cmd: "node", args: ["tests/route_context_contract.js"] },
  { name: "status_overlay_vision_runtime", cmd: "node", args: ["tests/status_overlay_vision_runtime_contract.js"] },
  { name: "translation_runtime", cmd: "node", args: ["tests/translation_runtime_contract.js"] },
  { name: "translation_voice_queue", cmd: "node", args: ["tests/translation_voice_queue_contract.js"] },
  { name: "showcase_runtime", cmd: "node", args: ["tests/showcase_runtime_contract.js"] },
  { name: "showcase_voice_queue", cmd: "node", args: ["tests/showcase_voice_queue_contract.js"] },
  { name: "obs_safe_call", cmd: "node", args: ["tests/obs_safe_call_contract.js"] },
  { name: "boss_mission_runtime", cmd: "node", args: ["tests/boss_mission_runtime_contract.js"] },
  { name: "voice_timing", cmd: "node", args: ["tests/voice_timing_contract.js"] },
  { name: "showcase_command_runtime", cmd: "node", args: ["tests/showcase_command_runtime_contract.js"] },
  { name: "route_context_deps", cmd: "node", args: ["tests/route_context_deps_contract.js"] },
  { name: "streamer_media_runtime", cmd: "node", args: ["tests/streamer_media_runtime_contract.js"] },
  { name: "capybara_flow_runtime", cmd: "node", args: ["tests/capybara_flow_runtime_contract.js"] },
  { name: "solo_stream_runtime", cmd: "node", args: ["tests/solo_stream_runtime_contract.js"] },
  { name: "world_layer_runtime", cmd: "node", args: ["tests/world_layer_runtime_contract.js"] },
  { name: "runtime_state_runtime", cmd: "node", args: ["tests/runtime_state_runtime_contract.js"] },
  { name: "phase1_event_normalizer", cmd: "node", args: ["tests/phase1_event_normalizer_contract.js"] },
  { name: "phase1_action_queue", cmd: "node", args: ["tests/phase1_action_queue_contract.js"] },
  { name: "phase1_runtime_state", cmd: "node", args: ["tests/phase1_runtime_state_contract.js"] },
  { name: "phase1_stream_watchdog", cmd: "node", args: ["tests/phase1_stream_watchdog_contract.js"] },
  { name: "phase1_replay", cmd: "node", args: ["tests/phase1_replay_contract.js"] },
  { name: "phase2_mia_director", cmd: "node", args: ["tests/phase2_mia_director_contract.js"] },
  { name: "phase2_combo_moments", cmd: "node", args: ["tests/phase2_combo_moments_contract.js"] },
  { name: "phase2_viewer_memory", cmd: "node", args: ["tests/phase2_viewer_memory_contract.js"] },
  { name: "runtime_privacy_absence", cmd: "node", args: ["tests/runtime_privacy_absence_contract.js"] },
  { name: "media_review_privacy", cmd: "node", args: ["tests/media_review_privacy_contract.js"] },
  { name: "phase2_admin_storyboard", cmd: "node", args: ["tests/phase2_admin_storyboard_contract.js"] },
  { name: "theme_manager", cmd: "node", args: ["tests/theme_manager_contract.js"] },
  { name: "phase3_game_layer", cmd: "node", args: ["tests/phase3_game_layer_contract.js"] },
  { name: "phase4_product_boundary", cmd: "node", args: ["tests/phase4_product_boundary_contract.js"] },
  { name: "event_pipeline_wiring", cmd: "node", args: ["tests/event_pipeline_wiring_contract.js"] },
  { name: "action_builder_runtime", cmd: "node", args: ["tests/action_builder_runtime_contract.js"] },
  { name: "koj_moments_runtime", cmd: "node", args: ["tests/koj_moments_runtime_contract.js"] },
  { name: "ingest_utils_runtime", cmd: "node", args: ["tests/ingest_utils_runtime_contract.js"] },
  { name: "overlay_public_wiring", cmd: "node", args: ["tests/overlay_public_wiring_contract.js"] },
  { name: "care_commands_wiring", cmd: "node", args: ["tests/care_commands_wiring_contract.js"] },
  { name: "route_context_ctx", cmd: "node", args: ["tests/route_context_ctx_contract.js"] },
  { name: "pipeline_summary_runtime", cmd: "node", args: ["tests/pipeline_summary_runtime_contract.js"] },
  { name: "event_pipeline_ctx", cmd: "node", args: ["tests/event_pipeline_ctx_contract.js"] },
  { name: "ingest_http_wiring", cmd: "node", args: ["tests/ingest_http_wiring_contract.js"] },
  { name: "ingest_http_ctx", cmd: "node", args: ["tests/ingest_http_ctx_contract.js"] },
  { name: "debug_routes_runtime", cmd: "node", args: ["tests/debug_routes_runtime_contract.js"] },
  { name: "debug_routes_ctx", cmd: "node", args: ["tests/debug_routes_ctx_contract.js"] },
  { name: "overlay_public_ctx", cmd: "node", args: ["tests/overlay_public_ctx_contract.js"] },
  { name: "care_commands_ctx", cmd: "node", args: ["tests/care_commands_ctx_contract.js"] },
  { name: "stream_state_runtime", cmd: "node", args: ["tests/stream_state_runtime_contract.js"] },
  { name: "stream_state_ctx", cmd: "node", args: ["tests/stream_state_ctx_contract.js"] },
  { name: "obs_overlay_sync_runtime", cmd: "node", args: ["tests/obs_overlay_sync_runtime_contract.js"] },
  { name: "obs_overlay_sync_ctx", cmd: "node", args: ["tests/obs_overlay_sync_ctx_contract.js"] },
  { name: "delivery_ctx", cmd: "node", args: ["tests/delivery_ctx_contract.js"] },
  { name: "status_ctx", cmd: "node", args: ["tests/status_ctx_contract.js"] },
  { name: "platform_bridges_ctx", cmd: "node", args: ["tests/platform_bridges_ctx_contract.js"] },
  { name: "route_context_host", cmd: "node", args: ["tests/route_context_host_contract.js"] },
  { name: "runtime_loops_ctx", cmd: "node", args: ["tests/runtime_loops_ctx_contract.js"] },
  { name: "translation_ctx", cmd: "node", args: ["tests/translation_ctx_contract.js"] },
  { name: "gift_runtime_ctx", cmd: "node", args: ["tests/gift_runtime_ctx_contract.js"] },
  { name: "koj_moments_ctx", cmd: "node", args: ["tests/koj_moments_ctx_contract.js"] },
  { name: "health_ctx", cmd: "node", args: ["tests/health_ctx_contract.js"] },
  { name: "showcase_ctx", cmd: "node", args: ["tests/showcase_ctx_contract.js"] },
  { name: "capybara_flow_ctx", cmd: "node", args: ["tests/capybara_flow_ctx_contract.js"] },
  { name: "solo_stream_ctx", cmd: "node", args: ["tests/solo_stream_ctx_contract.js"] },
  { name: "world_layer_ctx", cmd: "node", args: ["tests/world_layer_ctx_contract.js"] },
  { name: "boss_mission_ctx", cmd: "node", args: ["tests/boss_mission_ctx_contract.js"] },
  { name: "world_mode_ctx", cmd: "node", args: ["tests/world_mode_ctx_contract.js"] },
  { name: "showcase_command_ctx", cmd: "node", args: ["tests/showcase_command_ctx_contract.js"] },
  { name: "streamer_media_ctx", cmd: "node", args: ["tests/streamer_media_ctx_contract.js"] },
  { name: "runtime_state_ctx", cmd: "node", args: ["tests/runtime_state_ctx_contract.js"] },
  { name: "action_builder_ctx", cmd: "node", args: ["tests/action_builder_ctx_contract.js"] },
  { name: "ingest_utils_ctx", cmd: "node", args: ["tests/ingest_utils_ctx_contract.js"] },
  { name: "pipeline_summary_ctx", cmd: "node", args: ["tests/pipeline_summary_ctx_contract.js"] },
  { name: "pipeline_runtimes", cmd: "node", args: ["tests/pipeline_runtimes_contract.js"] },
  { name: "media_command_hosts", cmd: "node", args: ["tests/media_command_hosts_contract.js"] },
  { name: "app_runtimes", cmd: "node", args: ["tests/app_runtimes_contract.js"] },
  { name: "startup_overlay_ctx", cmd: "node", args: ["tests/startup_overlay_ctx_contract.js"] },
  { name: "obs_post_connect_ctx", cmd: "node", args: ["tests/obs_post_connect_ctx_contract.js"] },
  { name: "obs_bootstrap_ctx", cmd: "node", args: ["tests/obs_bootstrap_ctx_contract.js"] },
  { name: "obs_safe_call_ctx", cmd: "node", args: ["tests/obs_safe_call_ctx_contract.js"] },
  { name: "voice_timing_ctx", cmd: "node", args: ["tests/voice_timing_ctx_contract.js"] },
  { name: "story_feed_ctx", cmd: "node", args: ["tests/story_feed_ctx_contract.js"] },
  { name: "gift_media_ctx", cmd: "node", args: ["tests/gift_media_ctx_contract.js"] },
  { name: "participant_ctx", cmd: "node", args: ["tests/participant_ctx_contract.js"] },
  { name: "vision_context_ctx", cmd: "node", args: ["tests/vision_context_ctx_contract.js"] },
  { name: "overlay_state_ctx", cmd: "node", args: ["tests/overlay_state_ctx_contract.js"] },
  { name: "video_engine_ctx", cmd: "node", args: ["tests/video_engine_ctx_contract.js"] },
  { name: "media_singletons_runtime", cmd: "node", args: ["tests/media_singletons_runtime_contract.js"] },
  { name: "mia_eyes_ctx", cmd: "node", args: ["tests/mia_eyes_ctx_contract.js"] },
  { name: "overlay_state_cache_ctx", cmd: "node", args: ["tests/overlay_state_cache_ctx_contract.js"] },
  { name: "ingest_deduper_ctx", cmd: "node", args: ["tests/ingest_deduper_ctx_contract.js"] },
  { name: "obs_vision_ctx", cmd: "node", args: ["tests/obs_vision_ctx_contract.js"] },
  { name: "overlay_timing_ctx", cmd: "node", args: ["tests/overlay_timing_ctx_contract.js"] },
  { name: "overlay_queue_ctx", cmd: "node", args: ["tests/overlay_queue_ctx_contract.js"] },
  { name: "voice_priority_ctx", cmd: "node", args: ["tests/voice_priority_ctx_contract.js"] },
  { name: "tts_engine_ctx", cmd: "node", args: ["tests/tts_engine_ctx_contract.js"] },
  { name: "voice_control_layer_ctx", cmd: "node", args: ["tests/voice_control_layer_ctx_contract.js"] },
  { name: "interpreter_ctx", cmd: "node", args: ["tests/interpreter_ctx_contract.js"] },
  { name: "matting_ingest_bridge_ctx", cmd: "node", args: ["tests/matting_ingest_bridge_ctx_contract.js"] },
  { name: "obs_overlay_renderer_ctx", cmd: "node", args: ["tests/obs_overlay_renderer_ctx_contract.js"] },
  { name: "runtime_state_seed_ctx", cmd: "node", args: ["tests/runtime_state_seed_ctx_contract.js"] },
  { name: "output_policy_ctx", cmd: "node", args: ["tests/output_policy_ctx_contract.js"] },
  { name: "obs_watchdog_ctx", cmd: "node", args: ["tests/obs_watchdog_ctx_contract.js"] },
  { name: "arena_battle_demo_ctx", cmd: "node", args: ["tests/arena_battle_demo_ctx_contract.js"] },
  { name: "runtime_security_ctx", cmd: "node", args: ["tests/runtime_security_ctx_contract.js"] },
  { name: "spam_session_ctx", cmd: "node", args: ["tests/spam_session_ctx_contract.js"] },
  { name: "obs_overlay_sync_wrappers_ctx", cmd: "node", args: ["tests/obs_overlay_sync_wrappers_ctx_contract.js"] },
  { name: "server_bootstrap_ctx", cmd: "node", args: ["tests/server_bootstrap_ctx_contract.js"] },
  { name: "obs_live_manifest", cmd: "node", args: ["tests/obs_live_manifest_contract.js"] },
  { name: "host_team_ui", cmd: "node", args: ["tests/host_team_ui_contract.js"] },
  { name: "streamer_media_command", cmd: "node", args: ["tests/streamer_media_command_contract.js"] },
  { name: "streamer_showcase", cmd: "node", args: ["tests/streamer_showcase_contract.js"] },
  { name: "obs_persistent_layers", cmd: "node", args: ["tests/obs_persistent_layers_contract.js"] },
  { name: "voice_speak_queue", cmd: "node", args: ["tests/voice_speak_queue_contract.js"] },
  { name: "overlay_voice_queue", cmd: "node", args: ["tests/overlay_voice_queue_integration_smoke.js"] },
  { name: "gift_voice_routing", cmd: "node", args: ["tests/gift_voice_routing_contract.js"] },
  { name: "kojnozout_persistence", cmd: "node", args: ["tests/kojnozout_persistence_contract.js"] },
  { name: "ingest_dedupe", cmd: "node", args: ["tests/ingest_dedupe_smoke.js"] },
  { name: "log_rotation", cmd: "node", args: ["tests/log_rotation_smoke.js"] },
  { name: "runtime_perf", cmd: "node", args: ["tests/runtime_perf_contract.js"] },
  { name: "combo_overlay", cmd: "node", args: ["tests/combo_overlay_contract.js"] },
  { name: "combo_wave_ui", cmd: "node", args: ["tests/combo_wave_ui_contract.js"] },
  { name: "away_host_mode", cmd: "node", args: ["tests/away_host_mode_contract.js"] },
  { name: "sprint3", cmd: "node", args: ["tests/sprint3_contract.js"] },
  { name: "sprint4", cmd: "node", args: ["tests/sprint4_contract.js"] },
  { name: "sprint5", cmd: "node", args: ["tests/sprint5_contract.js"] },
  { name: "sprint6", cmd: "node", args: ["tests/sprint6_contract.js"] },
  { name: "story_animation", cmd: "node", args: ["tests/story_animation_contract.js"] },
  { name: "config_contract", cmd: "node", args: ["tests/config_contract_smoke.js"] },
  { name: "master_canon_0001", cmd: "node", args: ["tests/mia_master_canon_0001_contract.js"] },
  { name: "master_canon_0002", cmd: "node", args: ["tests/mia_master_canon_0002_contract.js"] },
  { name: "master_canon_0003", cmd: "node", args: ["tests/mia_master_canon_0003_contract.js"] },
  { name: "master_canon_0004", cmd: "node", args: ["tests/mia_master_canon_0004_contract.js"] },
  { name: "master_canon_0005", cmd: "node", args: ["tests/mia_master_canon_0005_contract.js"] },
  { name: "master_canon_0006", cmd: "node", args: ["tests/mia_master_canon_0006_contract.js"] },
  { name: "master_canon_0007", cmd: "node", args: ["tests/mia_master_canon_0007_contract.js"] },
  { name: "master_canon_0008", cmd: "node", args: ["tests/mia_master_canon_0008_contract.js"] },
  { name: "master_canon_0009", cmd: "node", args: ["tests/mia_master_canon_0009_contract.js"] },
  { name: "master_canon_0010", cmd: "node", args: ["tests/mia_master_canon_0010_contract.js"] },
  { name: "master_canon_0011", cmd: "node", args: ["tests/mia_master_canon_0011_contract.js"] },
  { name: "master_canon_0012", cmd: "node", args: ["tests/mia_master_canon_0012_contract.js"] },
  { name: "master_canon_0013", cmd: "node", args: ["tests/mia_master_canon_0013_contract.js"] },
  { name: "master_canon_0014", cmd: "node", args: ["tests/mia_master_canon_0014_contract.js"] },
  { name: "master_canon_0015", cmd: "node", args: ["tests/mia_master_canon_0015_contract.js"] },
  { name: "master_canon_0016", cmd: "node", args: ["tests/mia_master_canon_0016_contract.js"] },
  { name: "master_canon_0017", cmd: "node", args: ["tests/mia_master_canon_0017_contract.js"] },
  { name: "master_canon_0018", cmd: "node", args: ["tests/mia_master_canon_0018_contract.js"] },
  { name: "master_canon_0019", cmd: "node", args: ["tests/mia_master_canon_0019_contract.js"] },
  { name: "master_canon_0020", cmd: "node", args: ["tests/mia_master_canon_0020_contract.js"] },
  { name: "master_canon_0021", cmd: "node", args: ["tests/mia_master_canon_0021_contract.js"] },
  { name: "master_canon_0022", cmd: "node", args: ["tests/mia_master_canon_0022_contract.js"] },
  { name: "master_canon_0023", cmd: "node", args: ["tests/mia_master_canon_0023_contract.js"] },
  { name: "master_canon_0024", cmd: "node", args: ["tests/mia_master_canon_0024_contract.js"] },
  { name: "master_canon_0025", cmd: "node", args: ["tests/mia_master_canon_0025_contract.js"] },
  { name: "master_canon_0026", cmd: "node", args: ["tests/mia_master_canon_0026_contract.js"] },
  { name: "master_canon_0027", cmd: "node", args: ["tests/mia_master_canon_0027_contract.js"] },
  { name: "master_canon_0028", cmd: "node", args: ["tests/mia_master_canon_0028_contract.js"] },
  { name: "master_canon_0029", cmd: "node", args: ["tests/mia_master_canon_0029_contract.js"] },
  { name: "master_canon_0030", cmd: "node", args: ["tests/mia_master_canon_0030_contract.js"] },
  { name: "master_canon_0031", cmd: "node", args: ["tests/mia_master_canon_0031_contract.js"] },
  { name: "master_canon_0032", cmd: "node", args: ["tests/mia_master_canon_0032_contract.js"] },
  { name: "master_canon_0033", cmd: "node", args: ["tests/mia_master_canon_0033_contract.js"] },
  { name: "master_canon_0034", cmd: "node", args: ["tests/mia_master_canon_0034_contract.js"] },
  { name: "master_canon_0035", cmd: "node", args: ["tests/mia_master_canon_0035_contract.js"] },
  { name: "master_canon_0036", cmd: "node", args: ["tests/mia_master_canon_0036_contract.js"] },
  { name: "master_canon_0037", cmd: "node", args: ["tests/mia_master_canon_0037_contract.js"] },
  { name: "master_canon_0038", cmd: "node", args: ["tests/mia_master_canon_0038_contract.js"] },
  { name: "master_canon_0039", cmd: "node", args: ["tests/mia_master_canon_0039_contract.js"] },
  { name: "master_canon_0040", cmd: "node", args: ["tests/mia_master_canon_0040_contract.js"] },
  { name: "master_canon_0041", cmd: "node", args: ["tests/mia_master_canon_0041_contract.js"] },
  { name: "master_canon_0042", cmd: "node", args: ["tests/mia_master_canon_0042_contract.js"] },
  { name: "master_canon_0043", cmd: "node", args: ["tests/mia_master_canon_0043_contract.js"] },
  { name: "master_canon_0044", cmd: "node", args: ["tests/mia_master_canon_0044_contract.js"] },
  { name: "master_canon_0045", cmd: "node", args: ["tests/mia_master_canon_0045_contract.js"] },
  { name: "master_canon_0046", cmd: "node", args: ["tests/mia_master_canon_0046_contract.js"] },
  { name: "master_canon_0047", cmd: "node", args: ["tests/mia_master_canon_0047_contract.js"] },
  { name: "master_canon_0048", cmd: "node", args: ["tests/mia_master_canon_0048_contract.js"] },
  { name: "master_canon_0049", cmd: "node", args: ["tests/mia_master_canon_0049_contract.js"] },
  { name: "master_canon_0050", cmd: "node", args: ["tests/mia_master_canon_0050_contract.js"] },
  { name: "master_canon_0051", cmd: "node", args: ["tests/mia_master_canon_0051_contract.js"] },
  { name: "master_canon_0052", cmd: "node", args: ["tests/mia_master_canon_0052_contract.js"] },
  { name: "master_canon_0053", cmd: "node", args: ["tests/mia_master_canon_0053_contract.js"] },
  { name: "master_canon_0054", cmd: "node", args: ["tests/mia_master_canon_0054_contract.js"] },
  { name: "master_canon_0055", cmd: "node", args: ["tests/mia_master_canon_0055_contract.js"] },
  { name: "master_canon_0056", cmd: "node", args: ["tests/mia_master_canon_0056_contract.js"] },
  { name: "master_canon_0057", cmd: "node", args: ["tests/mia_master_canon_0057_contract.js"] },
    { name: "master_canon_0058", cmd: "node", args: ["tests/mia_master_canon_0058_contract.js"] },
  { name: "master_canon_0059", cmd: "node", args: ["tests/mia_master_canon_0059_contract.js"] },
  { name: "master_canon_0060", cmd: "node", args: ["tests/mia_master_canon_0060_contract.js"] },
  { name: "master_canon_0061", cmd: "node", args: ["tests/mia_master_canon_0061_contract.js"] },
  { name: "master_canon_0062", cmd: "node", args: ["tests/mia_master_canon_0062_contract.js"] },
  { name: "master_canon_0063", cmd: "node", args: ["tests/mia_master_canon_0063_contract.js"] },
  { name: "master_canon_0064", cmd: "node", args: ["tests/mia_master_canon_0064_contract.js"] },
  { name: "master_canon_0065", cmd: "node", args: ["tests/mia_master_canon_0065_contract.js"] },
  { name: "master_canon_0066", cmd: "node", args: ["tests/mia_master_canon_0066_contract.js"] },
  { name: "master_canon_0067", cmd: "node", args: ["tests/mia_master_canon_0067_contract.js"] },
  { name: "master_canon_0068", cmd: "node", args: ["tests/mia_master_canon_0068_contract.js"] },
  { name: "master_canon_0069", cmd: "node", args: ["tests/mia_master_canon_0069_contract.js"] },
  { name: "master_canon_0070", cmd: "node", args: ["tests/mia_master_canon_0070_contract.js"] },
  { name: "master_canon_0071", cmd: "node", args: ["tests/mia_master_canon_0071_contract.js"] },
  { name: "master_canon_0072", cmd: "node", args: ["tests/mia_master_canon_0072_contract.js"] },
  { name: "master_canon_0073", cmd: "node", args: ["tests/mia_master_canon_0073_contract.js"] },
  { name: "master_canon_0074", cmd: "node", args: ["tests/mia_master_canon_0074_contract.js"] },
  { name: "master_canon_0075", cmd: "node", args: ["tests/mia_master_canon_0075_contract.js"] },
  { name: "master_canon_0076", cmd: "node", args: ["tests/mia_master_canon_0076_contract.js"] },
  { name: "master_canon_0077", cmd: "node", args: ["tests/mia_master_canon_0077_contract.js"] },
  { name: "master_canon_0078", cmd: "node", args: ["tests/mia_master_canon_0078_contract.js"] },
  { name: "master_canon_0079", cmd: "node", args: ["tests/mia_master_canon_0079_contract.js"] },
  { name: "master_canon_0080", cmd: "node", args: ["tests/mia_master_canon_0080_contract.js"] },
  { name: "master_canon_0081", cmd: "node", args: ["tests/mia_master_canon_0081_contract.js"] },
  { name: "master_canon_0082", cmd: "node", args: ["tests/mia_master_canon_0082_contract.js"] },
  { name: "master_canon_0083", cmd: "node", args: ["tests/mia_master_canon_0083_contract.js"] },
  { name: "master_canon_0084", cmd: "node", args: ["tests/mia_master_canon_0084_contract.js"] },
  { name: "master_canon_0085", cmd: "node", args: ["tests/mia_master_canon_0085_contract.js"] },
  { name: "master_canon_0086", cmd: "node", args: ["tests/mia_master_canon_0086_contract.js"] },
  { name: "master_canon_0087", cmd: "node", args: ["tests/mia_master_canon_0087_contract.js"] },
  { name: "runtime_smoke", cmd: "node", args: ["tests/runtime_smoke.js"] },
  { name: "gift_user_metadata", cmd: "node", args: ["tests/gift_user_metadata_contract.js"] },
  { name: "shadow_pipeline", cmd: "node", args: ["tests/shadow_pipeline_integration.js"] },
  { name: "speaker_routing", cmd: "node", args: ["tests/speaker_routing_contract.js"] },
  { name: "ingest_contract", cmd: "node", args: ["tests/ingest_contract_smoke.js"] },
  { name: "item_care", cmd: "node", args: ["tests/kojnozout_item_care_contract.js"] },
  { name: "sprint_a_security", cmd: "node", args: ["tests/sprint_a_security_contract.js"] },
  { name: "control_route_http_auth", cmd: "node", args: ["tests/control_route_http_auth_contract.js"] },
  { name: "control_side_effect_http", cmd: "node", args: ["tests/control_side_effect_http_contract.js"] },
  { name: "duel_peer_credential", cmd: "node", args: ["tests/duel_peer_credential_contract.js"] },
  { name: "sprint_b", cmd: "node", args: ["tests/sprint_b_contract.js"] },
  { name: "sprint_c", cmd: "node", args: ["tests/sprint_c_contract.js"] },
  { name: "sprint_d", cmd: "node", args: ["tests/sprint_d_contract.js"] },
  { name: "sprint_e", cmd: "node", args: ["tests/sprint_e_contract.js"] },
  { name: "sprint_f", cmd: "node", args: ["tests/sprint_f_contract.js"] },
  { name: "sprint_g", cmd: "node", args: ["tests/sprint_g_contract.js"] },
  { name: "startup_readiness", cmd: "node", args: ["tests/startup_readiness_contract.js"] },
  { name: "sprint_h", cmd: "node", args: ["tests/sprint_h_contract.js"] },
  { name: "sprint_i", cmd: "node", args: ["tests/sprint_i_contract.js"] },
  { name: "sprint_j", cmd: "node", args: ["tests/sprint_j_contract.js"] },
  { name: "sprint_k", cmd: "node", args: ["tests/sprint_k_contract.js"] },
  { name: "sprint_l", cmd: "node", args: ["tests/sprint_l_contract.js"] },
  { name: "mia_obs_vision", cmd: "node", args: ["tests/mia_obs_vision_contract.js"] },
  { name: "sprint_m", cmd: "node", args: ["tests/sprint_m_contract.js"] },
  { name: "sprint_n", cmd: "node", args: ["tests/sprint_n_contract.js"] },
  { name: "mia_paint_integration", cmd: "node", args: ["tests/mia_paint_integration_contract.js"] },
  { name: "mia_paint_core", cmd: "node", args: ["tests/mia_paint_core_contract.js"] },
  { name: "mia_paint_gpu", cmd: "node", args: ["tests/mia_paint_gpu_contract.js"] },
  { name: "mia_paint_stroke", cmd: "node", args: ["tests/mia_paint_stroke_contract.js"] },
  { name: "mia_paint_selection", cmd: "node", args: ["tests/mia_paint_selection_contract.js"] },
  { name: "mia_paint_vector", cmd: "node", args: ["tests/mia_paint_vector_contract.js"] },
  { name: "mia_paint_koj_bridge", cmd: "node", args: ["tests/mia_paint_koj_bridge_contract.js"] },
  { name: "mia_paint_animation", cmd: "node", args: ["tests/mia_paint_animation_contract.js"] },
  { name: "mia_paint_io", cmd: "node", args: ["tests/mia_paint_io_contract.js"] },
  { name: "mia_paint_plugin", cmd: "node", args: ["tests/mia_paint_plugin_contract.js"] },
  { name: "mia_paint_ai", cmd: "node", args: ["tests/mia_paint_ai_contract.js"] },
  { name: "mia_paint_tauri", cmd: "node", args: ["tests/mia_paint_tauri_contract.js"] },
  { name: "mia_paint_smoke", cmd: "node", args: ["tests/mia_paint_smoke_contract.js"] },
  { name: "mia_graphics_studio", cmd: "node", args: ["tests/mia_graphics_studio_contract.js"] },
  { name: "mia_graphics_studio_12b", cmd: "node", args: ["tests/mia_graphics_studio_12b_contract.js"] },
  { name: "mia_graphics_studio_12c", cmd: "node", args: ["tests/mia_graphics_studio_12c_contract.js"] },
  { name: "mia_graphics_studio_12d", cmd: "node", args: ["tests/mia_graphics_studio_12d_contract.js"] },
  { name: "mia_graphics_studio_12e", cmd: "node", args: ["tests/mia_graphics_studio_12e_contract.js"] },
  { name: "mia_graphics_studio_12f", cmd: "node", args: ["tests/mia_graphics_studio_12f_contract.js"] },
  { name: "graphics_body", cmd: "node", args: ["scripts/run_graphics_body_tests.js"] },
  { name: "engine2_roadmap", cmd: "node", args: ["tests/mia_engine2_roadmap_contract.js"] },
  { name: "engine2_first_slice", cmd: "node", args: ["tests/mia_engine2_first_slice_contract.js"] },
  { name: "engine2_e2", cmd: "node", args: ["tests/mia_engine2_e2_contract.js"] },
  { name: "engine2_e3", cmd: "node", args: ["tests/mia_engine2_e3_contract.js"] },
  { name: "engine2_e4", cmd: "node", args: ["tests/mia_engine2_e4_contract.js"] },
  { name: "engine2_e5", cmd: "node", args: ["tests/mia_engine2_e5_contract.js"] },
  { name: "preflight_cloud", cmd: "node", args: ["tests/preflight_cloud_contract.js"] }
];

/**
 * Local files that some suites read. Cloud mode may call a failure
 * ENV_BLOCKED only when one of these is actually absent and every failure
 * in the suite output is that absence. A different assertion stays FAIL.
 * If a missing-asset failure and any other assertion appear together, the
 * suite is FAIL.
 */
const CLOUD_ENV_PREREQUISITES = [
  {
    suite: "media_catalog",
    path: "incoming-images/videos",
    kind: "dir",
    matches: (output) =>
      output.includes('prefixes.includes("videos")') ||
      /missing file videos\//.test(output)
  },
  {
    suite: "media_catalog",
    path: "incoming-images/videos_2",
    kind: "dir",
    matches: (output) =>
      output.includes("expected videos_2 files in catalog") ||
      /missing file videos_2\//.test(output)
  },
  {
    suite: "story_animation",
    path: "mia-output-overlay/assets/kojnozrout/story-bank-manifest.json",
    kind: "file",
    matches: (output) => output.includes("story bank manifest exists")
  },
  {
    suite: "koj_live_assets",
    path: "mia-output-overlay/assets/kojnozrout/moods",
    kind: "dir",
    matches: (output) =>
      output.includes("KOJ_LIVE_ASSET_MISSING") &&
      output.includes("mia-output-overlay/assets/kojnozrout/moods")
  },
  {
    suite: "koj_live_assets",
    path: "mia-output-overlay/assets/kojnozrout/pose-catalog.js",
    kind: "file",
    matches: (output) =>
      output.includes("KOJ_LIVE_ASSET_MISSING") &&
      output.includes("mia-output-overlay/assets/kojnozrout/pose-catalog.js")
  },
  {
    suite: "koj_live_assets",
    path: "mia-output-overlay/assets/kojnozrout/props/bowl.png",
    kind: "file",
    matches: (output) =>
      output.includes("KOJ_LIVE_ASSET_MISSING") &&
      output.includes("mia-output-overlay/assets/kojnozrout/props/bowl.png")
  },
  {
    suite: "koj_live_assets",
    path: "mia-output-overlay/assets/kojnozrout/props/ball.png",
    kind: "file",
    matches: (output) =>
      output.includes("KOJ_LIVE_ASSET_MISSING") &&
      output.includes("mia-output-overlay/assets/kojnozrout/props/ball.png")
  },
  {
    suite: "koj_live_assets",
    path: "mia-output-overlay/assets/kojnozrout/props/mic.png",
    kind: "file",
    matches: (output) =>
      output.includes("KOJ_LIVE_ASSET_MISSING") &&
      output.includes("mia-output-overlay/assets/kojnozrout/props/mic.png")
  },
  {
    suite: "koj_live_assets",
    path: "mia-output-overlay/assets/kojnozrout/props/hand.png",
    kind: "file",
    matches: (output) =>
      output.includes("KOJ_LIVE_ASSET_MISSING") &&
      output.includes("mia-output-overlay/assets/kojnozrout/props/hand.png")
  },
  {
    suite: "graphics_body",
    path: "mia-output-overlay/assets/animation-bank/gift/rose",
    kind: "rose-clip",
    matches: (output) => graphicsFailureIsMissingRoseClip(output)
  },
  {
    suite: "master_canon_0001",
    path: ".cursor/rules/mia-canon.mdc",
    kind: "file",
    matches: (output) =>
      output.includes(".cursor/rules/mia-canon.mdc") &&
      (output.includes("ENOENT") || output.includes("no such file"))
  }
];

function defaultProbe(root = ROOT) {
  return {
    exists(relPath) {
      return fs.existsSync(path.join(root, relPath));
    },
    roseClipPresent() {
      const bankRoot = path.join(root, "mia-output-overlay", "assets", "animation-bank");
      return Boolean(getClipEntry(loadBankIndex(bankRoot), "gift/rose"));
    }
  };
}

function prerequisiteIsPresent(spec, probe) {
  if (spec.kind === "rose-clip") {
    return probe.roseClipPresent() === true;
  }
  return probe.exists(spec.path) === true;
}

function listMissingPrerequisites(suiteName, probe = defaultProbe()) {
  return CLOUD_ENV_PREREQUISITES.filter(
    (spec) => spec.suite === suiteName && !prerequisiteIsPresent(spec, probe)
  ).map((spec) => spec.path);
}

function graphicsFailureIsMissingRoseClip(output) {
  const text = String(output || "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return false;
  let report;
  try {
    report = JSON.parse(text.slice(start, end + 1));
  } catch (_err) {
    return false;
  }
  const failed = Array.isArray(report.results)
    ? report.results.filter((row) => row && row.ok === false)
    : [];
  if (failed.length !== 1) return false;
  if (failed[0].file !== "mia_graphics_studio_13b_unified_preview_contract.js") return false;
  const stderr = String(failed[0].stderr || "");
  if (stderr.includes("result.bodyMood") || stderr.includes("falsy value")) return false;
  return (
    stderr.includes("pushBankClipPreview returns unified bodyMood") &&
    stderr.includes("false !== true")
  );
}

function specsForMissing(suiteName, missing) {
  const absent = new Set(missing || []);
  return CLOUD_ENV_PREREQUISITES.filter(
    (spec) => spec.suite === suiteName && absent.has(spec.path)
  );
}

function isIgnorableFailureLine(line) {
  const text = String(line || "").trim();
  if (!text) return true;
  if (/^\s*at\s+\S/.test(line) || text.startsWith("at ")) return true;
  if (text === "^" || text === "{" || text === "}" || text === "throw err;") return true;
  if (/^node:\S+:\d+$/.test(text)) return true;
  if (/^Node\.js v\d+/.test(text)) return true;
  if (/^(?:errno|code|syscall|path|generatedMessage|actual|expected|operator|name|stack)\s*:/.test(text)) return true;
  if (/^diff:\s*(?:'simple'|'full'),?$/.test(text)) return true;
  if (/^(?:AssertionError(?: \[ERR_ASSERTION\])?: )?(?:The expression evaluated to a falsy value|Expected (?:values|inputs) to be strictly(?: deep-equal| deep equal| equal)|Expected (?:values|inputs) to not be strictly(?: deep-equal| deep equal| equal)):?$/.test(text)) return true;
  if (/^(?:AssertionError(?: \[ERR_ASSERTION\])?: )?Expected "(?:actual|expected)" to be strictly unequal to:/.test(text)) return true;
  if (/^\+ actual - expected(?:\s+\.\.\. Lines skipped)?$/.test(text)) return true;
  if (text === "... Lines skipped") return true;
  if (/^✅(?:\s|$)/.test(text)) return true;
  if (/^ok - /.test(text)) return true;
  return false;
}

function stripNodeErrorBanners(text) {
  const lines = String(text || "").split(/\r?\n/);
  const kept = [];
  let skipping = false;
  for (const line of lines) {
    const text = line.trim();
    if (!skipping && /^node:\S+:\d+$/.test(text)) {
      skipping = true;
      continue;
    }
    if (skipping) {
      if (text === "^") {
        skipping = false;
        continue;
      }
      if (/^(?:Error\b|AssertionError\b|❌|fail - |FAIL |not ok )/.test(text)) {
        skipping = false;
        kept.push(line);
      }
      continue;
    }
    kept.push(line);
  }
  return kept.join("\n");
}

function splitFailureBlocks(text) {
  const lines = String(text || "").split(/\r?\n/);
  const blocks = [];
  let current = [];
  const header = /^(?:AssertionError\b|Error\b|ENOENT:|❌|fail - |FAIL |not ok )/;
  for (const line of lines) {
    if (header.test(line.trim()) && current.some((row) => row.trim())) {
      blocks.push(current.join("\n"));
      current = [line];
      continue;
    }
    current.push(line);
  }
  if (current.some((row) => row.trim())) blocks.push(current.join("\n"));
  return blocks;
}

function blockIsExplained(block, specs) {
  if (!specs.some((spec) => spec.matches(block))) return false;
  for (const line of String(block).split(/\r?\n/)) {
    if (isIgnorableFailureLine(line)) continue;
    if (specs.some((spec) => spec.matches(line))) continue;
    return false;
  }
  return true;
}

function failureIsOnlyMissingPrerequisites(suiteName, output, missing) {
  const specs = specsForMissing(suiteName, missing);
  if (specs.length === 0) return false;
  const text = stripNodeErrorBanners(output);
  if (!String(text).trim()) return false;

  if (suiteName === "graphics_body") {
    if (!graphicsFailureIsMissingRoseClip(text)) return false;
    if (!specs.some((spec) => spec.kind === "rose-clip")) return false;
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const outside = `${text.slice(0, Math.max(start, 0))}\n${text.slice(end + 1)}`;
    return outside.split(/\r?\n/).every((line) => isIgnorableFailureLine(line));
  }

  const blocks = splitFailureBlocks(text).filter((block) =>
    String(block)
      .split(/\r?\n/)
      .some((line) => !isIgnorableFailureLine(line))
  );
  return blocks.length > 0 && blocks.every((block) => blockIsExplained(block, specs));
}

function classifyCloudSuite({ name, exitCode, output, missing }) {
  const absent = Array.isArray(missing) ? missing : [];
  if (exitCode === 0) {
    return { disposition: "PASS", missing: [] };
  }
  if (failureIsOnlyMissingPrerequisites(name, output, absent)) {
    return { disposition: "ENV_BLOCKED", missing: absent };
  }
  return { disposition: "FAIL", missing: absent };
}

function resolvePreflightProfile(argv = process.argv) {
  return argv.includes("--cloud") ? "cloud" : "strict";
}

function publishSuiteResult(raw, profile, probe) {
  const published = {
    name: raw.name,
    ok: raw.ok,
    exitCode: raw.exitCode,
    ms: raw.ms,
    output: raw.output
  };
  if (profile !== "cloud") return published;
  const missing = listMissingPrerequisites(raw.name, probe || defaultProbe());
  const classified = classifyCloudSuite({
    name: raw.name,
    exitCode: raw.exitCode,
    output: raw.fullOutput != null ? raw.fullOutput : raw.output,
    missing
  });
  return {
    ...published,
    disposition: classified.disposition,
    missing: classified.missing
  };
}

function summarizeCloudResults(results) {
  const passed = results.filter((row) => row.disposition === "PASS");
  const failed = results.filter((row) => row.disposition === "FAIL");
  const envBlocked = results.filter((row) => row.disposition === "ENV_BLOCKED");
  return {
    passed: passed.length,
    failed: failed.length,
    envBlocked: envBlocked.length,
    blocked: envBlocked.map((row) => ({
      name: row.name,
      missing: row.missing
    })),
    ok: failed.length === 0
  };
}

function printCloudSummary(report) {
  console.error(`PASS ${report.passed}`);
  console.error(`FAIL ${report.failed}`);
  console.error(`ENV_BLOCKED ${report.envBlocked}`);
  for (const row of report.blocked || []) {
    console.error(`ENV_BLOCKED ${row.name}`);
    for (const item of row.missing || []) {
      console.error(`  missing ${item}`);
    }
  }
}

function resolvePreflightMode(argv = process.argv, env = process.env) {
  if (argv.includes("--fast")) return "fast";
  if (argv.includes("--full")) return "full";
  const raw = String(env.MIA_PREFLIGHT_MODE || "full").trim().toLowerCase();
  if (raw === "fast" || raw === "startup") return "fast";
  return "full";
}

function selectSuites(mode = "full") {
  if (mode === "full") {
    return [...SUITES];
  }
  const wanted = new Set(FAST_SUITE_NAMES);
  return SUITES.filter((suite) => wanted.has(suite.name));
}

function shouldRunParallel(mode, options = {}, env = process.env) {
  if (options.parallel === false) return false;
  if (options.parallel === true) return true;
  if (mode === "fast") return true;
  const raw = String(env.MIA_PREFLIGHT_PARALLEL || "off").toLowerCase();
  return raw === "on" || raw === "1" || raw === "true";
}

function runSuite(suite) {
  const started = Date.now();
  const result = spawnSync(suite.cmd, suite.args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: false
  });
  const fullOutput = `${result.stdout || ""}${result.stderr || ""}`.trim();
  return {
    name: suite.name,
    ok: result.status === 0,
    exitCode: result.status,
    ms: Date.now() - started,
    output: fullOutput.slice(-400),
    fullOutput
  };
}

function runSuiteAsync(suite) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(suite.cmd, suite.args, {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk || "");
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });

    child.on("close", (code) => {
      const fullOutput = `${stdout}${stderr}`.trim();
      resolve({
        name: suite.name,
        ok: code === 0,
        exitCode: code,
        ms: Date.now() - started,
        output: fullOutput.slice(-400),
        fullOutput
      });
    });

    child.on("error", (err) => {
      resolve({
        name: suite.name,
        ok: false,
        exitCode: 1,
        ms: Date.now() - started,
        output: err.message
      });
    });
  });
}

async function runAllSuites(options = {}) {
  const mode = options.mode || resolvePreflightMode();
  const profile = options.profile || resolvePreflightProfile();
  const suites = selectSuites(mode);
  const parallel = shouldRunParallel(mode, options, process.env);
  const started = Date.now();
  const probe = options.probe;

  const rawResults = parallel
    ? await Promise.all(suites.map((suite) => runSuiteAsync(suite)))
    : suites.map((suite) => runSuite(suite));
  const results = rawResults.map((row) => publishSuiteResult(row, profile, probe));

  const skipped =
    mode === "fast"
      ? SUITES.filter((suite) => !suites.some((row) => row.name === suite.name)).map(
          (suite) => suite.name
        )
      : [];

  if (profile === "cloud") {
    const cloud = summarizeCloudResults(results);
    return {
      ok: cloud.ok,
      profile,
      mode,
      parallel,
      passed: cloud.passed,
      failed: cloud.failed,
      envBlocked: cloud.envBlocked,
      blocked: cloud.blocked,
      total: results.length,
      skippedSlow: [...skipped],
      durationMs: Date.now() - started,
      results,
      finishedAt: new Date().toISOString(),
      running: false
    };
  }

  const failed = results.filter((row) => !row.ok);
  return {
    ok: failed.length === 0,
    mode,
    parallel,
    passed: results.filter((row) => row.ok).length,
    failed: failed.length,
    total: results.length,
    skippedSlow: [...skipped],
    durationMs: Date.now() - started,
    results,
    finishedAt: new Date().toISOString(),
    running: false
  };
}

async function main() {
  const profile = resolvePreflightProfile();
  const report = await runAllSuites({ profile });
  if (profile === "cloud") printCloudSummary(report);
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err?.message || err);
    process.exitCode = 1;
  });
}

module.exports = {
  SUITES,
  FAST_SUITE_NAMES,
  SLOW_SUITE_NAMES,
  CLOUD_ENV_PREREQUISITES,
  resolvePreflightMode,
  resolvePreflightProfile,
  selectSuites,
  listMissingPrerequisites,
  classifyCloudSuite,
  publishSuiteResult,
  summarizeCloudResults,
  graphicsFailureIsMissingRoseClip,
  runSuite,
  runSuiteAsync,
  runAllSuites
};
