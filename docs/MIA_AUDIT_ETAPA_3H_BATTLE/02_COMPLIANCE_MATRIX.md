# Etapa 3H — Compliance matrix (Battle)

**Datum:** 2026-07-27  
**Pravidla:** BT-01…BT-70  
**Legenda:** ✅ shoda · ⚠ drift / částečná · ❌ rozpor · ❓ neověřeno  

**Poslední ověření:** *fresh* = code review + contract běh **2026-07-27** · *hist.* = R1-C **2026-07-26** · *nikdy* = bez důkazu

---

## Souhrn stavů

| Stav | Počet | IDs |
|------|-------|-----|
| ✅ | 50 | BT-01…03,05…17,20…32,34…39,41,43,45,46,48,50,51,53,56…59,62,64,66 |
| ⚠ | 16 | BT-04,18,33,40,44,47,49,52,54,55,60,61,63,65,69,70 |
| ❌ | 0 | — |
| ❓ | 4 | BT-19,42,67,68 |
| **Celkem** | **70** | |

---

| ID | Pravidlo (zkráceně) | Canon | Implementace | Test | Status | Poslední ověření |
|----|---------------------|-------|--------------|------|--------|------------------|
| BT-01 | TikFinity→MIA→OBS | guardrails | index + world layer + routes | world_layer / care wiring | ✅ | fresh code 2026-07-27 |
| BT-02 | OBS jen render | guardrails | arena HTML poll; skóre v MIA | arena overlay code | ✅ | fresh code 2026-07-27 |
| BT-03 | Overlay miaPoints only | guardrails §Body | power bar / `.pts` miaPoints | 3F cross + arena HTML | ✅ | fresh code 2026-07-27 |
| BT-04 | Stream ≠ Master 0039 | alignment 🟡 | stream scripts; lab `mia-battle-core` | master_0039 mimo fast | ⚠ | fresh — lab unwired |
| BT-05 | Capability ≠ compliance | metodika | tento pack vs §05 | — | ✅ | fresh docs 2026-07-27 |
| BT-06 | MIA rozhoduje výsledek | 0039 §2 | finishDuel / finishArenaDuel | phase3 / vitals_duel | ✅ | fresh phase3 2026-07-27 |
| BT-07 | Gift video ≠ combat | §17 | gift engine oddělen | 3A cross | ✅ | fresh code 2026-07-27 |
| BT-08 | Fan avatary prezentace | §17 | viewer-strip | 3F | ✅ | fresh code 2026-07-27 |
| BT-09 | Duel = body závod | §17 · duel header | `MIA_KOJNOZROUT_DUEL` | vitals_duel / sprint6 | ✅ | fresh code 2026-07-27 |
| BT-10 | Default 5 min | KJ-63 | `durationMs: 300000` | vitals_duel | ✅ | fresh code 2026-07-27 |
| BT-11 | EventType weights | duel ingest | LIKE/FOLLOW/… floors | sprint6 / vitals_duel | ✅ | fresh code 2026-07-27 |
| BT-12 | itemPower → body | §19 | ingest `itemPower` | vitals_duel / item_care | ✅ | fresh code 2026-07-27 |
| BT-13 | Winner by miaPoints | duel finish | `finishDuel` | vitals_duel | ✅ | fresh code 2026-07-27 |
| BT-14 | Power bar | Gift Economy | `resolvePowerBar` | sprint6 | ✅ | fresh code 2026-07-27 |
| BT-15 | Export / sync peer | alignment duel sync | export + syncOpponent | duel_cross_stream | ✅ | fresh PASS 2026-07-27 |
| BT-16 | HTTP `/duel/*` | capability §8 | `routes/arena.js` | duel sync mock HTTP | ✅ | fresh PASS 2026-07-27 |
| BT-17 | World persist duel | 3G PR-23 | scheduleWorldSave | 3G / world | ✅ | fresh code (3G) 2026-07-27 |
| BT-18 | Bridge push peer | DUEL_BRIDGE | `pushLocalExportToPeer` | duel_cross_stream | ⚠ | fresh unit mock — ne 2 hosty |
| BT-19 | Paralelní 2-stream live | alignment 🟡 | model OK | — | ❓ | **nikdy** live dual-host |
| BT-20 | Contributors | duel side | `bumpContributor` | code | ✅ | fresh code 2026-07-27 |
| BT-21 | 4 platform kojs | roster / 0048 vize | PLATFORM_IDENTITY | platform_arena | ✅ | fresh PASS 2026-07-27 |
| BT-22 | coin_eater species | roster | `MIA_KOJ_ROSTER` | platform_arena | ✅ | fresh PASS 2026-07-27 |
| BT-23 | Arena = MIA body | PLATFORM_ARENA | economy note snapshot | platform_arena | ✅ | fresh PASS 2026-07-27 |
| BT-24 | MVP announce→countdown→active | capability §5 | `advanceDuelPhases` | phase3_game_layer | ✅ | fresh PASS 2026-07-27 |
| BT-25 | Score jen active | phase machine | `duelScoringOpen` | phase3 | ✅ | fresh PASS 2026-07-27 |
| BT-26 | Energy gate | Phase 3 | energy cost 12 | phase3 | ✅ | fresh PASS 2026-07-27 |
| BT-27 | Action interval 8s | Phase 3 | `DUEL_ACTION_INTERVAL_MS` | phase3 | ✅ | fresh PASS 2026-07-27 |
| BT-28 | Steal damage | arena battle | pushPlatformBattleAction | platform_arena / phase3 | ✅ | fresh PASS 2026-07-27 |
| BT-29 | Tournament champion | PLATFORM_ARENA | start/finish tournament | platform_arena | ✅ | fresh PASS 2026-07-27 |
| BT-30 | platform-arena.json | 3G | load/saveArenaState | phase3 / 3G | ✅ | fresh code 2026-07-27 |
| BT-31 | Soft identity Kisstube | 3G soft mig | createArenaState rewrite | platform_arena | ✅ | fresh PASS 2026-07-27 |
| BT-32 | MIA_BATTLE_MVP default ON | capability | `isBattleMvpEnabled` | phase3 | ✅ | fresh PASS 2026-07-27 |
| BT-33 | Demo ≠ live | capability §7 | DEMO modules | arena_battle_demo* | ⚠ | fresh demo PASS — live ❓ |
| BT-34 | Kick box attacks | ARENA_BATTLE | pushBattleAction | platform_arena | ✅ | fresh PASS 2026-07-27 |
| BT-35 | resolveKojBattleContext | choreography | CHOREOGRAPHY.js | koj_battle_choreography | ✅ | fresh PASS 2026-07-27 |
| BT-36 | Feeding blocks | choreography | `blockedBy: feeding` | choreography | ✅ | fresh PASS 2026-07-27 |
| BT-37 | Sleep/sick blocks | vitals cross 3C | `resolveVitalBlock` | choreography / code | ✅ | fresh code 2026-07-27 |
| BT-38 | Attacker / hit poses | forms | battle snapshot poses | choreography | ✅ | fresh PASS 2026-07-27 |
| BT-39 | Duel-ready mood | choreography | map aliases | choreography | ✅ | fresh PASS 2026-07-27 |
| BT-40 | Backpack rush hint | choreography | item queue + duel | choreography | ⚠ | fresh contract — live thin |
| BT-41 | Form sprites | roster / forms | `forms/{platform}` | platform_arena / factory | ✅ | fresh code 2026-07-27 |
| BT-42 | Arena overlay live viz | §17 / 3F | arena-battle-overlay.html | HTML; live | ❓ | hist. R1-C 2026-07-26 — **ne fresh** |
| BT-43 | Team points → skóre | Gift Economy | world layer ingest | world_layer / phase3 | ✅ | fresh code 2026-07-27 |
| BT-44 | Host team split | alignment | HOST_TEAM_POINTS / UI | host_team_ui / sprint5 | ⚠ | fresh UI contract — live host thin |
| BT-45 | Power = miaPoints | 3B cross | resolvePowerBar | sprint6 | ✅ | fresh code 2026-07-27 |
| BT-46 | Arena steal updates scores | PLATFORM_ARENA | damage steal block | platform_arena | ✅ | fresh PASS 2026-07-27 |
| BT-47 | Chat arena_boost | CHAT_REWARD | rewardId arena_boost | world_layer thin | ⚠ | fresh code — e2e thin |
| BT-48 | Duel item catalog | ITEM_META | DUEL_ITEM_IDS | item_care | ✅ | fresh code 2026-07-27 |
| BT-49 | Dual inventory stores | capability §9 | backpack vs viewer-inventory | phase3 inventory stub | ⚠ | fresh — dvě cesty |
| BT-50 | Public HUD bez coins | guardrails | overlay pts | 3F + arena HTML | ✅ | fresh code 2026-07-27 |
| BT-51 | Item display queue | §19 | enqueueItemDisplay | item_care | ✅ | fresh code 2026-07-27 |
| BT-52 | Arena gate ≠ Master FIFO | 0039 §12 | energy+interval only | phase3 | ⚠ | fresh — jiný model fronty |
| BT-53 | Action buffer 24 | ARENA_BATTLE | createBattleState | choreography / arena | ✅ | fresh PASS 2026-07-27 |
| BT-54 | Master Action Queue wired | 0039 | lab only | master_0039 mimo fast | ⚠ | fresh — unwired index |
| BT-55 | CARE → battle push | care_commands | pushPlatformBattleAction | care wiring thin | ⚠ | fresh code — e2e thin |
| BT-56 | World layer sync path | WORLD_LAYER | gift→duel/arena/battle | world_layer_runtime | ✅ | fresh code (fast suite) |
| BT-57 | item use boost v duelu | §19 | handleItemCommand | item_care | ✅ | fresh code 2026-07-27 |
| BT-58 | Offstream → CARE | ITEM_COMMAND | applyOffstreamItemCare | item_care | ✅ | fresh code 2026-07-27 |
| BT-59 | Backpack world persist | 3G | WORLD_PERSISTENCE | 3G | ✅ | fresh (3G) 2026-07-27 |
| BT-60 | Item variant Math.random | ITEM_META | rollCanonGiftVariant | — | ⚠ | fresh — non-det grant |
| BT-61 | Inventář do chatu | §19 🔴 | — | — | ⚠ | fresh — záměrně chybí (future) |
| BT-62 | Pure scoring w/ fixed clock | determinismus | ingest math | phase3 / duel | ✅ | fresh PASS 2026-07-27 |
| BT-63 | Date.now time-coupled | nowTs | start/tick/holdUntil | — | ⚠ | fresh — replay clock |
| BT-64 | Arena power formula det | ARENA_BATTLE | miaPoints*0.12 | platform_arena | ✅ | fresh PASS 2026-07-27 |
| BT-65 | Master damage seed stub | 0039 §13 | randomFactor always 1 | master_0039 | ⚠ | fresh lab stub |
| BT-66 | Pose frame from actionId | ARENA_BATTLE | `% frames.length` | choreography | ✅ | fresh PASS 2026-07-27 |
| BT-67 | obs:ensure-arena-battle live | 3D cross | obs_ensure_arena_battle.js | script exists | ❓ | **nikdy** OBS live v tomto běhu |
| BT-68 | Live arena + reálné viewery | capability §7 | runtime path | demo ≠ live | ❓ | **nikdy** produkční session |
| BT-69 | Master 0048 řídí battle | 0048 §3 | Stream = PLATFORM_ARENA přímý | master_0048 mimo fast | ⚠ | fresh — vize vs stream |
| BT-70 | Realtime shader combat | §17 🔴 | 2D forms only | — | ⚠ | fresh — aspirace, ne Stream MVP |
