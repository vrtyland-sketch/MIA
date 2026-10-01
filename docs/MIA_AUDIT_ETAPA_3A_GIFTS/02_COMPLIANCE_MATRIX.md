# Etapa 3A — Compliance matrix (gifts vs kánon)

**Legenda stavu:** ✅ shoda · ⚠ částečná / drift · ❌ rozpor · ❓ neověřeno

| ID | Funkce / pravidlo | Kánon | Implementace (soubor / logika) | Testy | Stav |
|----|-------------------|-------|--------------------------------|-------|------|
| G-01 | Architektura TikFinity → MIA → OBS | A1 | `index.js` ingest → pipeline → delivery; OBS `MIA_VIDEO_ENGINE`, browser overlaye | `ingest_contract`, `shadow_pipeline` | ✅ |
| G-02 | Streamer.bot mimo tok | A2 | Nepoužíván; gift metadata přes `normalize_event.js` + ledger | `ingest_contract` | ✅ |
| G-03 | Gift = RAW → normalizace → map → decision | A3–A5 | `normalize_event.js` → `MIA_SUPPORT_RESOLVER` → `engine_shadow_runtime` → `MIA_DELIVERY_RUNTIME` | `gift_runtime`, `shadow_pipeline` | ✅ |
| G-04 | `/overlay-state` GET bez side-effect mutací | A4 | `MIA_OVERLAY_STATE.js` peek-only; `pruneExpiredEphemeral` mimo GET | `overlay_state_runtime` | ✅ |
| G-05 | Overlay **nikdy** coins / hodnotu giftu | B6–B8 | `MIA_OVERLAY_PUBLIC_RESPONSE.stripValueFieldsForPublic()` na `/overlay-state` | `overlay_public_response` (preflight:fast) | ✅ |
| G-06 | Public ukazuje **miaPoints**, giftCount OK | B6 | Strip zachová `miaPoints`, `giftCount`; maže `giftValue`, `coins`, … | `overlay_public_response`, `graphics_r1` | ✅ |
| G-07 | Koj snapshot strip coin metrik | B8 | `getPublicKojSnapshot()` stejný strip | `overlay_public_response` | ✅ |
| G-08 | 1 coin = 7.5 miaPoints | C16 | `shared/stream_economy_config.json` · `MIA_GIFT_TIERS.computeMiaPointsFromCoins` | `gift_economy`, `gift_map` | ✅ |
| G-09 | XP base = totalCoins (1 coin = 1 XP) | C15 | `MIA_SUPPORT_RESOLVER` `xpBase = totalCoins` | `gift_economy` | ✅ |
| G-10 | Coin tier T1: 1–99 | C10 | `COIN_TIER_THRESHOLDS` / `gift_tiers.json` T1:1 | `gift_economy` | ✅ |
| G-11 | Coin tier T2: 100–999 | C10 | prah T2:100 | `gift_economy` | ✅ |
| G-12 | Coin tier T3: 1000–4999 | C10 | prah T3:1000 | `gift_economy` | ✅ |
| G-13 | Coin tier T4: 5000–9999 | C10 | prah T4:5000 | `gift_economy` | ✅ |
| G-14 | Coin tier T5: 10000–24999 | C10 | prah T5:10000 | `gift_economy` | ✅ |
| G-15 | Coin tier T6: 25000+ | C10 | prah T6:25000 | `gift_economy` | ✅ |
| G-16 | Default tier mode = coins (`MIA_GIFT_ECONOMY_TIERS`) | C10, C16 | `useCoinTierEconomy()` default `coins` | `gift_economy` | ✅ |
| G-17 | Legacy miaPoints tier mode (env) | C10 | `legacy`/`miapoints` → `LEGACY_MIA_POINTS_THRESHOLDS` | `gift_economy` (implicit) | ✅ |
| G-18 | T6 obsTier → T5 video pool | C14 | `MIA_GIFT_ECONOMY.mapStreamTierToObsTier("T6")→"T5"` | `gift_economy` | ✅ |
| G-19 | T4 boss banner / boss event metadata | C12 | `buildResolvedGiftContext` → `bossEvent`, `bossBanner` „PŘIŠEL BOSS“ | `gift_economy` | ✅ |
| G-20 | T5/T6 full video cutscéna | C13–C14 | Boss cinematic overlay 🟢; **full cutscéna video** 🔴 v alignment | — | ⚠ |
| G-21 | Playback tier = max(coinTier, catalog tier) | C18 | `MIA_SUPPORT_RESOLVER.buildResolvedSupport` `pickHigherPlaybackTier` + `shared/gifts` `pickHigherTier` | `gift_map`, `gift_economy` (Galaxy) | ✅ |
| G-22 | Lion 1 coin → T4 playback (katalog) | C18 | `gift_catalog.json` LION `defaultTier:T4`, priority 8 | `gift_map` | ✅ |
| G-23 | Rose alias normalizace (🌹, Růže) | E27 | `shared/gifts/gift_aliases.json` + `MIA_GIFT_MAP` exactNames | `gift_map` | ✅ |
| G-24 | Enterprise gift map `shared/gifts/` = sémantika | E24 | `shared/gifts/resolver.js` `resolveGift()` | `gift_map`, `gift_map_log_audit` | ✅ |
| G-25 | Legacy `MIA_GIFT_MAP.js` = animace only | E25 | Resolver volá obě; ekonomika z `shared/gifts` + enrich | `gift_runtime` | ✅ |
| G-26 | Gift overlay `showCoins:false` | E29 | `resolver.js` overlay.showCoins false | `gift_map` | ✅ |
| G-27 | Resolved `giftContext` bez coinů na overlay | E30 | `MIA_GIFT_ECONOMY.buildResolvedGiftContext` | `gift_economy` | ✅ |
| G-28 | Priorita ≥8 → full ack + video | E28 | `MIA_SUPPORT_REACTION_POLICY` `giftPriority >= 8` | `user_ack_throttle`, `gift_map` | ✅ |
| G-29 | Per-tier video rotace T1_01→02→… | D19 | `MIA_VIDEO_ENGINE.getNextSourceForTier` modulo pool | `video_rotation` (slow) | ✅ |
| G-30 | `rotationIndexByTier` per tier | D20 | Objekt indexů per tier v engine state | `video_rotation` | ✅ |
| G-31 | **Bez resetu** indexu při T1→T3→T1 | D20 | Index per tier, ne globální; kód OK | Cross-tier test **chybí** | ⚠ |
| G-32 | Dlouhé audio >60 s celé | D21 | `resolveGiftVideoTiming`, `waitForMediaEnd` | `video_timing` (slow) | ✅ |
| G-33 | T2+ vyžaduje audio v katalogu | D22 | `MIA_MEDIA_CATALOG.TIERS_REQUIRING_AUDIO` | `gift_media_runtime` | ✅ |
| G-34 | COMBO ×10/50/100 | F31 | `MIA_GIFT_ECONOMY.resolveComboTier` + combo overlay | `gift_economy`, `combo_overlay`, `phase2_combo_moments` | ✅ |
| G-35 | Gift level Lv1–8 | F33 | `MIA_GIFT_ECONOMY.resolveGiftLevel` | `gift_economy` | ✅ |
| G-36 | Streak bonus 3/7/30 dní | F32 | `resolveStreakBonusPct` + `MIA_GIFT_SUPPORTER_PROFILE` | `gift_economy` | ✅ |
| G-37 | Streak persistence mezi streamy / dny | F34 | Runtime profile v session; **dlouhodobá DB** 🔴 | Unit only | ⚠ |
| G-38 | Spam session 15s okno, min 3 eventy | G35–G36 | `engine_spam_session.js` + `stream_economy_config.json` | `spam_session_contract` | ✅ |
| G-39 | Spam prahy T2/T3/T4 v miaPoints | G36 | 750 / 7500 / 37500 v config | `spam_session_contract` | ✅ |
| G-40 | `spamRewardTier` ≠ `streamTier` | G40 | Oddělené pole ve spam engine + resolver `coinTier` | `spam_session_contract` | ✅ |
| G-41 | Spam milestone T4 v engine | G36 | `getCappedTierByPoints` vrací T4 | `spam_session_contract` | ✅ |
| G-42 | **Shadow runtime cap spam T4→T3 video** | G36, G40 | `engine_shadow_runtime.js` `cappedRewardTier = T4 ? T3` | Engine T4 milestone ≠ shadow cap | ⚠ |
| G-43 | Per-user gift ack throttle | G37 | `MIA_USER_ACK_THROTTLE` + reaction policy | `user_ack_throttle` (gift-map suite) | ✅ |
| G-44 | Bypass throttle T3+ / priority≥8 / milestone | G38 | `shouldBypassUserGiftThrottle()` | `user_ack_throttle` | ✅ |
| G-45 | Large gift T3/T4 full ack mimo spam flood | G39 | `ctx.tier === T3\|T4` → full before spam branch | Implicit v policy | ✅ |
| G-46 | T1/T2 silent na large/huge streamu (anti-flood) | L59 | `MIA_SUPPORT_REACTION_POLICY` large_stream_skip | — | ✅ |
| G-47 | Bowl fill z gift mapy | H42 | `shared/gifts` bowl.fill by tier + entry mul | `gift_map` | ✅ |
| G-48 | Bowl plná ≥95 % → full trigger | H41 | `KOJNOZROUT_BOWL_ENGINE` percent≥100 trigger; visual ≥95 | `koj_public_snapshot` | ✅ |
| G-49 | Bowl vizuální pásma 0–30 / 31–94 / ≥95 | H41 | Kánon 30/94; kód `low<30`, `mid 30–59`, `high 60–94`, `full≥95` | — | ⚠ |
| G-50 | Plná miska → celebrate + T4 video | H43 | `MIA_BOWL_FULL_VIDEO` preferredTier T4; bowl cycle trigger | `gift_media_ctx` wiring | ✅ |
| G-51 | Bowl reset po full hold (~3s) | H44 | `KOJNOZROUT_BOWL_ENGINE` FULL_BOWL_HOLD_MS 3000 → reset | — | ✅ |
| G-52 | `processBowlCycle` periodic loop | H44 | `MIA_RUNTIME_LOOPS.js` ~750ms | `runtime_loops_ctx` | ✅ |
| G-53 | `resolveVariantIndex` mood-based | I46 | `MIA_GIFT_VISUAL_COMPOSER.resolveVariantIndex` mood offset | `gift_animation_context` | ✅ |
| G-54 | Care/neglect/bowl v variant index | I47 | `MIA_GIFT_ANIMATION_CONTEXT.resolveCareVariantOffset` hook | `gift_animation_context` | ⚠ |
| G-55 | Kapybara AWAY 20s → chat loop | I48 | `MIA_CAPYBARA_FLOW.js` SHOW_MS 20000; default `away_only` | `capybara_flow` ctx contracts | ✅ |
| G-56 | chatLoop gifts z mapy (ne jen název) | I48 | `MIA_GIFT_MAP` `chatLoop:true` u `animal_small` | — | ✅ |
| G-57 | CAPYBARA v enterprise catalog | I48 | `gift_catalog.json` CAPYBARA; chat loop v legacy map | `gift_map` aliases | ⚠ |
| G-58 | Gift Map nemění tier/video queue | I49 | Tier z resolver; mapa jen enrich | `gift_runtime` | ✅ |
| G-59 | Gift → CARE akce | I50 | Care map + `MIA_KOJNOZROUT_CARE` gift care | `item_care` (slow) | ✅ |
| G-60 | recentGifts v `/overlay-state` | J52 | `MIA_GIFT_USER_LEDGER` → `MIA_OVERLAY_PUBLIC_RESPONSE` | `gift_user_metadata` | ✅ |
| G-61 | recentParticipants ve viewer strip | J52 | `MIA_PARTICIPANT_RUNTIME` + overlay state | `participant_ctx` | ✅ |
| G-62 | TikTok gift metadata normalizace | J51 | `normalize_event.js` giftName, giftCount, giftValue | `phase1_event_normalizer` | ✅ |
| G-63 | Žádná SQL DB pro TikTok eventy | J53 | Session/runtime JSON only | — | ✅ |
| G-64 | gift-map-stats na disku | J53 | `data/gift-map-stats.json` 🟡 alignment | — | ⚠ |
| G-65 | Duel power z giftů (body, ne HP video) | K54 | `MIA_KOJNOZROUT_DUEL.js` miaPoints/power | Arena contracts | ✅ |
| G-66 | Gift presentation orchestrátor | K56 | `MIA_GIFT_PRESENTATION.js` combo/speech/visual/story | `gift_economy`, `gift_media_runtime` | ✅ |
| G-67 | Speaker Koj primary u giftu | K57 | `MIA_SPEAKER_ROUTING` | `speaker_routing_contract` | ✅ |
| G-68 | 1 coin Rose → T1, bowl, overlay text | L58 | `gift_map_contract` Rose coins:1 | `gift_map` | ✅ |
| G-69 | T0 engagement (like/follow) | C9 | `MIA_T0_ENGAGEMENT.js` | ingest/T0 paths | ✅ |
| G-70 | Hall of Fame T6 flag | C14 | `hallOfFameEligible: streamTier === T6` | `gift_economy` partial | ✅ |
| G-71 | Rewards → batoh roll | E26 | `shared/gifts` rewards + backpack | `achievement_moment` | ✅ |
| G-72 | AI paměť dárce ≥3 gifty | E26 | Supporter profile + chat hint | `gift_user_metadata` | ✅ |
| G-73 | Achievement unlock v subtext (ne coins) | E26 | Achievement moment pipeline | `achievement_moment` | ✅ |
| G-74 | Host team split body | C11 area | `MIA_HOST_TEAM_POINTS.js` | — | ✅ |
| G-75 | Kompletní TikTok gift name coverage | E27 | Stovky giftů — auto bucket + panel intake; **live completeness** | `gift_map_log_audit` | ❓ |
| G-76 | Live OBS všech tier videí v jedné session | D19 | R1-C PASS 2026-07-26 historicky | Mimo tento běh | ❓ |
| G-77 | Live full bowl → T4 video sync | H43 | Wiring existuje | R1-C krok 8 historicky | ❓ |
| G-78 | Multi-hour streak / restart persistence | F37 | Supporter state runtime scope | — | ❓ |
| G-79 | T5 Mega Boss cutscéna (video) | C13 | Cinematic overlay 🟢; plné T5 video cut 🔴 | — | ⚠ |
| G-80 | Care-aware animace „plně“ dle kánon tabulky | I46–I47 | Mood ✅; care bond tabulka v agent kánonu 🟡 | `gift_animation_context` | ⚠ |

---

## Shrnutí matrix

| Stav | Počet |
|------|-------|
| ✅ | 62 |
| ⚠ | 10 |
| ❌ | 0 |
| ❓ | 4 |
| **Celkem** | **76** |

---

## Klíčové dvojcestné body (dual path)

| Vrstva | Soubor | Role vůči kánonu |
|--------|--------|------------------|
| **Economy / playback** | `shared/gifts/` + `MIA_SUPPORT_RESOLVER.js` | Source of truth tier, overlay, bowl, voice, XP |
| **Animace / chat loop** | `scripts/MIA_GIFT_MAP.js` | `giftProfile`, `effectProgram`, `exactNames`, `chatLoop` |
| **Prezentace** | `MIA_GIFT_PRESENTATION.js`, `MIA_GIFT_VISUAL_COMPOSER.js` | Orchestrace kanálů |

Kánon (`KANON_SOUCASNY_PREHLED`) explicitně popisuje dual path — implementace **odpovídá** ✅ (G-24, G-25), ale zvyšuje riziko driftu mezi katalogy (G-57 ⚠).

---

## Tři druhy tier labelů (kánonní pojistka)

| Pole | Příklad | Ověření |
|------|---------|---------|
| `coinTier` | 1000 coins → T3 | ✅ `gift_economy` Galaxy test |
| `streamTier` / `obsTier` | Galaxy catalog T5 > coin T3 → T5 | ✅ `gift_economy` enrich test |
| `spamRewardTier` | Vlna 7500 miaPoints → T3 milestone | ✅ spam tests; ⚠ shadow cap T4→T3 |
