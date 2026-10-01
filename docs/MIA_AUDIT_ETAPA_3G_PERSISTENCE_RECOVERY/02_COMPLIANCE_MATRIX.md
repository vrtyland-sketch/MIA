# Etapa 3G — Compliance matrix (Persistence & Recovery)

**Datum:** 2026-07-27  
**Pravidla:** PR-01…PR-72 (mapují `01_CANON_RULES_EXTRACT.md` §1–72)  
**Status:** ✅ shoda · ⚠ drift · ❌ rozpor · ❓ neověřeno  
**Poslední ověření:** *fresh* = code/contract review **2026-07-27**; *hist.* = starší live; *nikdy* = bez live/crash důkazu

---

## A. Governance / inventář

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| PR-01 | data/*.json = live, necommit SoT | capability § rule | `.gitignore` jen `data/remote-dev/`, `data/mia-ai-animations/`; JSON v `data/` přítomny | — | ⚠ | fresh 2026-07-27 |
| PR-02 | Inventář stream storeů | Etapa 2 map | 14+ JSON v `data/` listing | — (inventář) | ✅ | fresh 2026-07-27 |
| PR-03 | Capability ≠ compliance | metodika | tento pack vs §08 | — | ✅ | fresh 2026-07-27 |
| PR-04 | Stream subset ≠ Master 0065/66/75 | alignment 🟡 | index.js bez recoveryManager | master contracts mimo fast | ✅ | fresh 2026-07-27 |
| PR-05 | TikFinity→MIA→OBS | guardrails | persist v MIA modules | arch | ✅ | fresh 2026-07-27 |
| PR-06 | Public overlay bez coins | guardrails · 3F | strip OK; gift-map-stats má coins | overlay_public_* | ⚠ | fresh 2026-07-27 |
| PR-07 | rotationIndexByTier no tier reset | guardrails · 3A | in-memory engine OK | video_rotation (slow) | ✅ | fresh code; slow suite |
| PR-08 | preflight po větší změně | guardrails | ops checklist | preflight:fast exists | ❓ | ops běh **nikdy** v tomto auditu |

---

## B. Atomic write

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| PR-09 | runtime-state atomic | phase1 durability | tmp+rename | phase1_runtime_state | ✅ | fresh 2026-07-27 |
| PR-10 | streamer-profiles atomic | profiles | writeJsonAtomic | phase4_product_boundary | ✅ | fresh 2026-07-27 |
| PR-11 | settings-bundle atomic | settings | tmp+rename | — | ✅ | fresh code 2026-07-27 |
| PR-12 | Koj state non-atomic | durability ideal | direct writeFileSync | evolution_milestone (partial) | ⚠ | fresh 2026-07-27 |
| PR-13 | Koj world non-atomic | durability ideal | direct writeFileSync | — | ⚠ | fresh 2026-07-27 |
| PR-14 | viewer/arena/session/theme/AQ/gift-map non-atomic | durability ideal | direct writeFileSync | phase2_viewer_memory partial | ⚠ | fresh 2026-07-27 |

---

## C. Koj state

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| PR-15 | path kojnozout-state.json | 3C · capability | MIA_KOJNOZROUT_PERSISTENCE | koj / evolution partial | ✅ | fresh 2026-07-27 |
| PR-16 | PERSISTED_FIELDS whitelist | 3C | PERSISTED_FIELDS | — (code) | ✅ | fresh 2026-07-27 |
| PR-17 | version:1 + updatedAt | versioning | extractPersistedState | evolution load | ✅ | fresh 2026-07-27 |
| PR-18 | debounce 2500 ms | persistence | scheduleSave | — | ✅ | fresh 2026-07-27 |
| PR-19 | flushSave | persistence | flushSaveKojnozoutState | — | ✅ | fresh 2026-07-27 |
| PR-20 | missing → {} | safe default | loadPersistedSeed | — | ✅ | fresh 2026-07-27 |
| PR-21 | corrupt → {} soft-fail | corrupt protect | try/catch | — (no dedicated corrupt test) | ✅ | fresh code; dedicated test **nikdy** |
| PR-22 | walkUntilTs nepersist | 3C GAP-C10 | mimo PERSISTED_FIELDS | — | ⚠ | fresh 2026-07-27 (cross 3C) |

---

## D. Koj world

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| PR-23 | kojnozout-world.json | 3C | WORLD_PERSISTENCE | arena/duel partial | ✅ | fresh 2026-07-27 |
| PR-24 | version:1 save | versioning | scheduleSaveWorld | — | ✅ | fresh 2026-07-27 |
| PR-25 | missing → nulls | safe default | loadWorldSeed | runtime_state_seed_ctx | ✅ | fresh 2026-07-27 |
| PR-26 | corrupt → nulls | soft-fail | catch | — | ✅ | fresh code |
| PR-27 | debounce 2500 ms | persistence | scheduleSaveWorld | — | ✅ | fresh 2026-07-27 |

---

## E. Runtime-state + compose

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| PR-28 | runtime-state shape | phase1 | buildPayload | phase1_runtime_state, runtime_state_* | ✅ | fresh 2026-07-27 |
| PR-29 | no wipe koj file | phase1 | compose only | phase1_runtime_state | ✅ | fresh 2026-07-27 |
| PR-30 | kojRef pointer | phase1 | KOJ_REF | phase1_runtime_state | ✅ | fresh 2026-07-27 |
| PR-31 | composeKojSeed fresher merge | phase1 | composeKojSeed | phase1_runtime_state | ✅ | fresh 2026-07-27 |
| PR-32 | boot via SEED_CTX | boot hydrate | MIA_RUNTIME_STATE_SEED_CTX | runtime_state_seed_ctx | ✅ | fresh 2026-07-27 |
| PR-33 | interval save | phase1 | startRuntimeStateInterval | runtime_state_runtime | ✅ | fresh 2026-07-27 |
| PR-34 | watchdog no invent empty RS | stream-watchdog | persistHealth guard | phase1_stream_watchdog | ✅ | fresh 2026-07-27 |
| PR-35 | corrupt RS → null | soft-fail | loadRuntimeState | — | ✅ | fresh code |

---

## F. Economy / community

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| PR-36 | viewer-memory miaPoints only | 3B | recordGift | phase2_viewer_memory | ✅ | fresh 2026-07-27 |
| PR-37 | version+viewers shape | 3B | emptyStore | phase2_viewer_memory | ✅ | fresh 2026-07-27 |
| PR-38 | corrupt → empty | soft-fail | catch | — | ✅ | fresh code |
| PR-39 | debounce 1500 + flush | persistence | scheduleSave | phase2 flushSync | ✅ | fresh 2026-07-27 |
| PR-40 | inventory stub disk | capability §5 | viewer-inventory | phase3_game_layer | ✅ | fresh 2026-07-27 |
| PR-41 | gift ledger short cache OK | 3B | in-memory ledger | gift_user_metadata | ✅ | fresh 2026-07-27 |
| PR-42 | streak multi-day file | 3B BE-24 | runtime profile; file thin | unit only | ⚠ | fresh code; produkce restart **nikdy** |
| PR-43 | platform-arena miaPoints | 3B | MIA_PLATFORM_ARENA | phase3 / arena ctx | ✅ | fresh 2026-07-27 |
| PR-44 | gift-map-stats coins on disk | 3A/3B GAP | community.totalCoins | gift_map | ⚠ | fresh 2026-07-27 |

---

## G. Session / theme / AQ / ostatní

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| PR-45 | session-memory version:1 | capability §9 | MIA_SESSION_MEMORY | session_memory_* partial | ✅ | fresh 2026-07-27 |
| PR-46 | chat lexicon persist | capability | MIA_CHAT_LEXICON | chat_lexicon_smoke 🟡 | ✅ | fresh code; smoke 🟡 |
| PR-47 | story-memory persist | capability | story engine path | story_* partial | ✅ | fresh wiring; depth thin |
| PR-48 | AQ disk = enabled only | capability §7 | action-queue saveDiskState | phase1_action_queue | ✅ | fresh 2026-07-27 |
| PR-49 | themeId persist | capability §8 | theme-manager | theme_manager | ✅ | fresh 2026-07-27 |
| PR-50 | streamer-identity.json | Etapa 2 | MIA_STREAMER_IDENTITY | — thin | ✅ | fresh file exists 2026-07-27 |
| PR-51 | status snapshot ≠ durable econ | diagnostics | MIA_STATUS_SNAPSHOT | status_snapshot | ✅ | fresh 2026-07-27 |
| PR-52 | OBS persistent layers ≠ app JSON | 3D | MIA_OBS_PERSISTENT_LAYERS | obs_persistent_layers | ✅ | fresh 2026-07-27 |

---

## H. Verzování / migrace

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| PR-53 | version:1 on write | versioning theme | většina storeů | phase1 / phase2 | ✅ | fresh 2026-07-27 |
| PR-54 | no migrate on load | migration canon ideal | version default only | — | ⚠ | fresh 2026-07-27 |
| PR-55 | arena identity soft-migrate | arena | createArenaState canon labels | phase3 partial | ✅ | fresh 2026-07-27 |
| PR-56 | no unified v1→v2 runner | migration | absent | — | ⚠ | fresh 2026-07-27 |
| PR-57 | Master 0075 version/replay | Master | lab event-store-core | mia_master_canon_0075 🟡 | ⚠ | fresh lab; live wiring **nikdy** |

---

## I. Corrupt protection

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| PR-58 | soft-fail parse | corrupt protect | try/catch hlavní storey | partial (implicit) | ✅ | fresh 2026-07-27 |
| PR-59 | .bak before overwrite | durable recovery ideal | **chybí** | — | ⚠ | fresh 2026-07-27 |
| PR-60 | quarantine corrupt file | durable recovery ideal | **chybí** | — | ⚠ | fresh 2026-07-27 |
| PR-61 | rotate last-good state | durable recovery ideal | **chybí** (log rotate ≠ state) | log_rotation_smoke 🟡 | ⚠ | fresh 2026-07-27 |

---

## J. Crash recovery / ephemeral / watchdog / Master

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| PR-62 | restart hydrate Koj+compose | crash recovery | SEED_CTX | runtime_state_seed_ctx | ✅ | fresh 2026-07-27 |
| PR-63 | debounce loss on hard kill | crash recovery | timers 1.5–2.5s+ | — | ⚠ | fresh code; live kill **nikdy** |
| PR-64 | overlay/voice ephemeral | 3E/3F | in-memory reset | overlay_state_* | ✅ | fresh 2026-07-27 |
| PR-65 | rotationIndex not across restart | Etapa 2 · 3A | in-memory only | — | ⚠ | fresh 2026-07-27 |
| PR-66 | stream watchdog ON + reconnect | capability §10 | stream-watchdog | phase1_stream_watchdog | ✅ | fresh 2026-07-27 |
| PR-67 | OBS process relaunch | alignment · 3D | MIA_OBS_WATCHDOG | obs_watchdog unit 🟡; ctx 🟢 | ⚠ | fresh unit; live crash → 3D / **nikdy** zde |
| PR-68 | event replay | capability §12 | mia_replay | phase1_replay | ✅ | fresh 2026-07-27 |
| PR-69 | Master Recovery not in index | Master 0065 | shared module unwired | master 0065 🟡 | ⚠ | fresh 2026-07-27 |
| PR-70 | Master Watchdog ≠ stream WD | Master 0066 | lab vs stream-watchdog | master 0066 🟡 | ⚠ | fresh 2026-07-27 |
| PR-71 | Master Safe Mode live | Master 0068 | lab unwired | — | ⚠ | fresh; produkční trigger **nikdy** |
| PR-72 | live kill mid-write e2e | user-critical | — | — | ❓ | **nikdy** |

---

## Souhrn statusů (musí sedět se SUMMARY)

| Stav | Počet | IDs |
|------|-------|-----|
| ✅ | 50 | PR-02…05,07,09…11,15…21,23…41,43,45…53,55,58,62,64,66,68 |
| ⚠ | 20 | PR-01,06,12…14,22,42,44,54,56,57,59…61,63,65,67,69…71 |
| ❌ | 0 | — |
| ❓ | 2 | PR-08, PR-72 |

**Celkem:** 50 + 20 + 0 + 2 = **72**.

**Poznámky:**
- PR-21 soft-fail kód = ✅; dedikovaný corrupt-file contract chybí (viz GAP / `04_TESTS`).
- PR-42 streak = ⚠ (runtime OK; produkční multi-day file **nikdy**).
- PR-67 OBS relaunch = ⚠ (unit OK; live → 3D).
