# MIA Audit Etapa 3 — Capability Matrix

**Datum:** 2026-07-27  
**Repo:** `C:\MIA`  
**Typ:** Funkční audit (docs-only, bez změn kódu)  
**Zdroje:** Etapa 2 mapy, `MIA_CAPABILITY_STATUS.md`, `MIA_INGEST_PATH_AUDIT.md`, `MIA_GRAPHICS_R1_STATUS.md`, `MIA_R1C_OBS_RESULT.md`, `scripts/run_preflight_tests.js`

**Legenda stavu:** ✅ funguje | ⚠ částečně | ❌ nefunguje / jen návrh

**Poznámka:** R1-C OBS PASS (2026-07-26) potvrzuje stream core; tento audit rozlišuje *kód existuje* vs *stream-ready*.

> **NOTE — Capability ≠ Canon compliance:** Složka `docs/MIA_AUDIT_ETAPA_3/` je **inventář schopností** (co runtime umí / co je stream-ready). **Ne** měří shodu chování s kánonem. Pro audit shody gift systému s kánonem viz **`docs/MIA_AUDIT_ETAPA_3A_GIFTS/`** (Etapa 3A).

---

## Master tabulka

| # | Oblast | Schopnost | Stav | Evidence (1 řádek) |
|---|--------|-----------|------|---------------------|
| **INGEST** |
| 1 | Ingest | TikFinity HTTP `POST /ingest` | ✅ | `routes/ingest.js` → queue → `processEvent`; suite `ingest_contract`, `ingest_http_wiring` |
| 2 | Ingest | Ingest auth guard (`MIA_INGEST_SECRET`) | ✅ | `MIA_INGEST_HTTP.js` guard; volitelný secret |
| 3 | Ingest | Lane queue (support/community) | ✅ | `MIA_INGEST_QUEUE.js`; fastAck + async pipeline |
| 4 | Ingest | Event normalizer F1 | ✅ | `shared/platform_normalizers/normalize_event.js`; suite `phase1_event_normalizer` |
| 5 | Ingest | Kick Pusher bridge (default ON) | ✅ | `MIA_KICK_BRIDGE.js` → `processEvent`; suite `kick_chat_reply`, `env_wiring` |
| 6 | Ingest | Kick webhook mode | ✅ | `MIA_KICK_MODE=webhook`; ingest audit 2026-07-26 |
| 7 | Ingest | Twitch bridge | ⚠ | `MIA_TWITCH_ENABLED=0` default; bridge existuje, ne stream core |
| 8 | Ingest | Telegram bridge | ⚠ | `MIA_TELEGRAM_ENABLED=0` default; contract testy, text reply only |
| 9 | Ingest | Debug simulate ingest | ✅ | `MIA_DEBUG_ROUTES=on`; suite `debug_routes_runtime` |
| 10 | Ingest | Remote dev (Tailscale) | ⚠ | Skripty + suite `remote_dev`; volitelné nasazení |
| **CHAT** |
| 11 | Chat | Direct chat intelligence | ✅ | Shadow runtime COMMENT path; suite `shadow_pipeline`, smoke |
| 12 | Chat | Community ack (like/follow/share) | ✅ | T0 + community lane; suite `ingest_contract` |
| 13 | Chat | LLM hybrid responses | ✅ | Runtime smoke + interpreter contracts |
| 14 | Chat | Session memory | ✅ | `MIA_SESSION_MEMORY.js`; persist `data/mia-session-memory.json` |
| 15 | Chat | Chat lexicon | ✅ | `data/mia-chat-lexicon.json`; enrich fáze |
| 16 | Chat | Care commands | ✅ | Suite `care_commands_wiring`, `care_commands_ctx` |
| **GIFTS / VIDEO** |
| 17 | Gifts | Gift map + tier routing (T1–T4) | ✅ | `MIA_SUPPORT_RESOLVER`, `gift_map`; suite `gift_map`, `gift_runtime` |
| 18 | Gifts | miaPoints konverze (bez coin na overlay) | ✅ | `core/event-normalizer.js`; suite `overlay_public_response`, `graphics_r1` |
| 19 | Gifts | Per-tier video rotace | ✅ | `rotationIndexByTier` v `MIA_VIDEO_ENGINE.js`; slow suite `video_rotation` |
| 20 | Gifts | Gift present / thanks overlay | ✅ | `phase_present` + `executeOverlay`; suite `gift_economy` |
| 21 | Gifts | Achievement moments | ✅ | Suite `achievement_moment` |
| 22 | Gifts | User ack throttle | ✅ | Suite `user_ack_throttle` |
| 23 | Gifts | Spam session / combo wave | ✅ | `MIA_NEXT/engine_spam_session.js`; suite `spam_session_ctx`, `combo_wave_ui` |
| 24 | Gifts | Gift animation bank override | ⚠ | Kód + slow suite `gift_visual`; mimo `preflight:fast` |
| 25 | Gifts | Storyboard (Universe/Galaxy/Rose) | ✅ | Suite `phase2_admin_storyboard` |
| 26 | Video | Tier video playback (OBS) | ✅ | `MIA_VIDEO_ENGINE.js`; suite `gift_media_runtime`, `video_engine_ctx` |
| 27 | Video | Bowl-full special video | ✅ | `MIA_BOWL_FULL_VIDEO.js`; Koj bowl trigger |
| **KOJ / BOWL** |
| 28 | Koj | Koj engine + vitals | ✅ | `MIA_KOJNOZROUT_ENGINE.js`, `MIA_KOJNOZROUT_VITALS.js` |
| 29 | Koj | Bowl fill / full trigger | ✅ | `KOJNOZROUT_BOWL_ENGINE.js`; persist + overlay |
| 30 | Koj | Mood / scene / pose runtime | ✅ | Split libs `koj-runtime-*`; bust `49-r1-milestone-polish` |
| 31 | Koj | Combo/spam belly HUD | ✅ | `koj-runtime-belly.js`; suite `graphics_r1`, R1-C krok 7 |
| 32 | Koj | Walk moment | ✅ | `MIA_KOJNOZROUT_WALK.js`; suite `koj_walk_unify` |
| 33 | Koj | Evolution tier | ✅ | `MIA_KOJNOZROUT_EVOLUTION.js`; suite `koj_moments_runtime` |
| 34 | Koj | Care quest / bond | ⚠ | Moduly existují; suite `item_care` (mimo fast); live depth NEOVĚŘENO |
| 35 | Koj | Duel (peer sync) | ✅ | `MIA_KOJNOZROUT_DUEL.js`; routes `arena.js`; contract level |
| **TTS / OVERLAY / OBS** |
| 36 | TTS | Edge TTS (MIA voice) | ✅ | `MIA_TTS_ENGINE.js`; suite `tts_engine_ctx`, `voice_timing` |
| 37 | TTS | Single voice (default) | ✅ | `MIA_DUAL_VOICE` unset; suite `speaker_routing` |
| 38 | TTS | Dual voice (Koj companion) | ⚠ | `MIA_DUAL_VOICE=1`; kód hotov, default OFF; R1-C audio OK when enabled |
| 39 | TTS | Voice queue / priority / defer | ✅ | `MIA_DELIVERY_RUNTIME.js`; suite `voice_priority_ctx`, `speaker_routing` |
| 40 | Overlay | Speech hologram + bublina | ✅ | `speech-overlay.html` bust `36-koj-unify`; R1-C krok 2 |
| 41 | Overlay | Gift animation overlay | ✅ | bust `37-stream-polish`; R1-C krok 3 |
| 42 | Overlay | Bowl overlay | ✅ | Manifest URL bust `36`; R1-C krok 8 |
| 43 | Overlay | Viewer strip / avatar chips | ✅ | Milestone speech fix; suite `host_team_ui` |
| 44 | Overlay | Public API — jen miaPoints | ✅ | `MIA_OVERLAY_PUBLIC_RESPONSE.js`; suite `overlay_public_response` |
| 45 | OBS | WebSocket sync + bootstrap | ✅ | obs-websocket-js; suite `obs_bootstrap`, `obs_overlay_sync` |
| 46 | OBS | Live manifest + refresh | ✅ | `MIA_OBS_LIVE_MANIFEST.js`; `npm run obs:refresh-overlays` |
| 47 | OBS | Browser poll `/overlay-state` | ✅ | TTL cache 450 ms; suite `overlay_state_cache_ctx` |
| 48 | OBS | Auto overlay creation (hands) | ✅ | `MIA_OBS_HANDS`; suite `mia_obs_hands` |
| 49 | OBS | Away host mode | ❌ | Stub; suite `away_host_mode` mimo fast; default OFF |
| 50 | OBS | Body parts (MIA_HEAD–FEET) | ❌ | Záměrně skryté v OBS refresh JSON |
| **ECONOMY / BATTLE / INVENTORY** |
| 51 | Economy | Gift economy (XP, combo, streak) | ✅ | `MIA_GIFT_ECONOMY.js`; suite `gift_economy` |
| 52 | Economy | Viewer memory + levels | ✅ | `core/viewer-memory.js`; suite `phase2_viewer_memory` |
| 53 | Economy | Ecosystem orchestrator | ✅ | Suite `phase3_game_layer` |
| 54 | Battle | Platform arena leaderboard | ✅ | `MIA_PLATFORM_ARENA.js`; suite `arena_battle_demo_ctx` |
| 55 | Battle | Battle MVP state machine | ✅ | `MIA_ARENA_BATTLE.js`; `MIA_BATTLE_MVP` default ON |
| 56 | Battle | Battle choreography 2D + FX | ✅ | Factory contracts; demo skripty `battle:demo` |
| 57 | Battle | Battle OBS overlay | ✅ | R1-C krok 8 OK; suite `obs_overlay_sync` |
| 58 | Inventory | Viewer inventory grant | ⚠ | `core/viewer-inventory.js`; enabled default ON; data untracked; R1-C viz OK |
| 59 | Playlist | Playlist economy / enqueue | ❌ | Jen v `shared/mia-economy-core` (canon stub); ne v live pipeline |
| 60 | Games | Poker / Monopoly | ❌ | Design only; Engine 2.0 roadmap |
| **EDITOR / GRAFIKA** |
| 61 | Editor | MIA Paint / Graphics Studio | ⚠ | Routes + contracty green; mimo stream core path |
| 62 | Editor | Animation bank / timeline | ⚠ | Production gate testy; ne live ingest |
| 63 | Editor | Rig / body part tools | ⚠ | Client tooling `mia-part-rig.js`; ne server stream |
| 64 | Editor | Gift animation desk | ⚠ | `routes/gift_animation.js`; admin/dev only |
| 65 | Graphics | Koj R1 polish (combo/hype/duel CSS) | ✅ | R1-C PASS; suite `graphics_r1`, `koj_runtime_split` |
| 66 | Graphics | MIA Paint Tauri shell | ⚠ | Contract `mia_paint_tauri`; optional desktop |
| **ADMIN / API / CONFIG** |
| 67 | Admin | `/mia-admin` dashboard | ✅ | `routes/admin.js`; suite `phase4_product_boundary` |
| 68 | Admin | Test T1–T4 / bowl / battle inject | ✅ | Admin API smoke routes |
| 69 | Admin | Action Queue toggle | ✅ | Admin ON/OFF/Flush; default OFF |
| 70 | Admin | Storyboard admin | ✅ | Suite `phase2_admin_storyboard` |
| 71 | API | Health / diagnose / status | ✅ | Suite `health_runtime`, `status_snapshot` |
| 72 | API | Koj admin API | ✅ | `routes/koj.js`; snapshot, wake, test-mode |
| 73 | API | Arena / duel API | ✅ | `routes/arena.js` |
| 74 | Config | `MIA_CONFIG.js` + runtime.json | ✅ | Suite `config_contract`, `env_wiring` |
| 75 | Config | Feature flag precedence | ⚠ | Env + runtime.json + disk JSON; různá priorita per modul |
| **PERSISTENCE / WATCHDOG / RECOVERY** |
| 76 | Persistence | Koj state persist | ✅ | `data/kojnozout-state.json`; `MIA_KOJNOZROUT_PERSISTENCE.js` |
| 77 | Persistence | Runtime state persist | ✅ | `core/runtime-state.js`; suite `phase1_runtime_state` |
| 78 | Persistence | Viewer memory persist | ✅ | `data/viewer-memory.json` |
| 79 | Persistence | Arena / world persist | ✅ | `platform-arena.json`, `kojnozout-world.json` |
| 80 | Watchdog | Stream ingest watchdog | ✅ | `core/stream-watchdog.js`; suite `phase1_stream_watchdog` |
| 81 | Watchdog | OBS watchdog | ✅ | `MIA_OBS_WATCHDOG.js`; suite `obs_watchdog_ctx` |
| 82 | Recovery | Event replay | ✅ | `scripts/mia_replay.js`; suite `phase1_replay` |
| 83 | Recovery | Safe mode / fault manager | ⚠ | `shared/mia-recovery-core` untracked; live wiring NEOVĚŘENO |
| **ENGINE2 / FLAGS (LAB)** |
| 84 | Lab | MIA NEXT shadow runtime (produkce) | ✅ | Default runtime mode; `engine_shadow_runtime.js` |
| 85 | Lab | Action Queue (`MIA_ACTION_QUEUE`) | ⚠ | Default OFF; advisory enqueue; suite `phase1_action_queue` |
| 86 | Lab | Engine2 stub (`MIA_ENGINE2_STUB`) | ⚠ | Default OFF; admin preview only; suites `engine2_e2`–`e5` |
| 87 | Lab | Dual voice (`MIA_DUAL_VOICE`) | ⚠ | Default OFF; funguje při `=1`; suite `speaker_routing` |
| 88 | Lab | Theme manager (`MIA_THEME_MANAGER`) | ⚠ | Default OFF; CSS vars v overlay-state; suite `theme_manager` |
| 89 | Lab | Tech forms / user mode | ❌ | Default OFF; stub; suite `phase3_game_layer`, `phase4_product_boundary` |
| 90 | Lab | Plugin loader (Poker/Monopoly) | ❌ | Design only; `MIA_PAINT_PLUGIN_LOADER` ≠ stream plugin |

---

## Souhrn počtů (matrix řádky 1–90)

| Stav | Počet |
|------|-------|
| ✅ funguje | **58** |
| ⚠ částečně | **22** |
| ❌ nefunguje / jen návrh | **10** |

---

## Stream-ready vs lab

| Vrstva | Verdikt |
|--------|---------|
| **Stream core** (TikFinity/Kick → pipeline → OBS/TTS/Koj) | ✅ RC — R1-C PASS 2026-07-26, preflight fast 159/159 (capability status) |
| **Volitelné mosty** (Twitch, Telegram, remote dev) | ⚠ existují, default OFF |
| **Lab flags** (AQ, Engine2, dual voice, theme) | ⚠ kód + contracty; default OFF; neblokují stream |
| **Editor / Paint / canon stubs** | ⚠ mimo live path |
| **Design-only** (playlist economy, poker, away host, body parts) | ❌ |

---

## Reference

- Etapa 2: `docs/MIA_AUDIT_ETAPA_2/`
- Preflight fast: 159 suites v `FAST_SUITE_NAMES` (`scripts/run_preflight_tests.js`)
- R1-C: `docs/MIA_R1C_OBS_RESULT.md`

*Etapa 3 — docs only, necommitnuto.*
