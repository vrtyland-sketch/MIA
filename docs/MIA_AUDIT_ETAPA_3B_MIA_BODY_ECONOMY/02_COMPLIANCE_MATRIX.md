# Etapa 3B — Compliance matrix (MIA body & economy vs kánon)

**Legenda stavu:** ✅ shoda · ⚠ částečná / drift · ❌ rozpor · ❓ neověřeno

| ID | Funkce / pravidlo | Kánon | Implementace (soubor / logika) | Testy | Stav |
|----|-------------------|-------|--------------------------------|-------|------|
| BE-01 | Architektura: body počítá MIA, ne OBS/platforma | A1–A3 | `MIA_SUPPORT_RESOLVER` → enrich → presentation; OBS poll only | `gift_runtime`, `shadow_pipeline` | ✅ |
| BE-02 | Ingest: coins/giftValue jen interně v normalized event | A2 | `core/event-normalizer.js`, `normalize_event.js` | `phase1_event_normalizer` | ✅ |
| BE-03 | Source of truth tier + miaPoints | A3 | `MIA_SUPPORT_RESOLVER.buildResolvedSupport` + `shared/gifts/resolver.js` | `gift_economy`, `gift_map` | ✅ |
| BE-04 | Jednotná config `stream_economy_config.json` | A4 | `shared/stream_economy_config.json` ← `MIA_GIFT_TIERS.js` | `gift_economy` | ✅ |
| BE-05 | **Overlay nikdy coins/diamondy/Kč/hodnotu giftu** | B6–B8 | `MIA_OVERLAY_PUBLIC_RESPONSE.stripValueFieldsForPublic()` | `overlay_public_response` (preflight:fast) | ✅ |
| BE-06 | Public API zachová `miaPoints`, `giftCount` | B6 | Strip whitelist implicit — forbidden keys set | `overlay_public_response`, `graphics_r1` | ✅ |
| BE-07 | Koj snapshot strip coin metrik | B6 | `getPublicKojSnapshot()` stejný strip | `overlay_public_response` | ✅ |
| BE-08 | Public naming „podpora projektu“ vs interní miaPoints | B7 | API pole `miaPoints`; UI copy v overlay/TTS mix — **ne vždy doslovně „podpora projektu“** | — | ⚠ |
| BE-09 | Sanitizace na hranici `/overlay-state`, ne v klientovi | B9 | Celý `body = stripValueFieldsForPublic({...})` | `overlay_public_response` | ✅ |
| BE-10 | Arena/duel leaderboard jen miaPoints | B10–B11 | `MIA_PLATFORM_ARENA`, `MIA_KOJNOZROUT_DUEL` snapshots | `phase3_game_layer`, `arena_battle_demo_ctx` | ✅ |
| BE-11 | **1 coin = 7.5 miaPoints** | C12 | `MIA_POINTS_PER_COIN` · `computeMiaPointsFromCoins` | `gift_economy`, `gift_map` | ✅ |
| BE-12 | XP base = totalCoins (1 coin = 1 XP vize) | C13 | `buildResolvedSupport` `xpBase = totalCoins` | `gift_economy` | ✅ |
| BE-13 | Coin tier T1–T6 prahy | C14 | `COIN_TIER_THRESHOLDS` / config JSON | `gift_economy` | ✅ |
| BE-14 | Default `MIA_GIFT_ECONOMY_TIERS=coins` | C15 | `useCoinTierEconomy()` default true | `gift_economy` | ✅ |
| BE-15 | Legacy miaPoints tier mode (env) | C15 | `legacy`/`miapoints` → `LEGACY_MIA_POINTS_THRESHOLDS` | `gift_economy` (implicit) | ✅ |
| BE-16 | `coinTier` vs `streamTier` vs `spamRewardTier` oddělené | C16–C18 | `tierKinds` v `buildResolvedGiftContext`; spam engine alias | `gift_economy`, `spam_session` | ✅ |
| BE-17 | Spam prahy T2/T3/T4 v miaPoints (750/7500/37500) | C17 | `stream_economy_config.json` spamWave.rewardThresholds | `spam_session_contract` | ✅ |
| BE-18 | Playback tier = max(coin, catalog) | C19 | `MIA_SUPPORT_RESOLVER` `pickHigherPlaybackTier` | `gift_economy` (Galaxy), `gift_map` (Lion) | ✅ |
| BE-19 | T6 → T5 obsTier mapování | C20 | `mapStreamTierToObsTier("T6")→"T5"` | `gift_economy` | ✅ |
| BE-20 | Gift Level Lv1–8 z cumulative XP | D21 | `MIA_GIFT_ECONOMY.resolveGiftLevel` | `gift_economy` | ✅ |
| BE-21 | Combo ×10/50/100 | D22 | `resolveComboTier` + combo overlay payload | `gift_economy`, `combo_overlay`, `phase2_combo_moments` | ✅ |
| BE-22 | Streak bonus 3/7/30 dní | D23 | `resolveStreakBonusPct` + profile | `gift_economy` | ✅ |
| BE-23 | Streak days increment per user | D24 | `MIA_GIFT_SUPPORTER_PROFILE.recordGiftSupport` dayKey logic | `gift_economy` (unit) | ✅ |
| BE-24 | **Streak persistence restart / multi-day produkce** | D24 | Runtime in-memory profile; **file persist neověřeno** | Unit only | ⚠ |
| BE-25 | T0 engagement XP (like/follow/share/comment) | D25 | `MIA_T0_ENGAGEMENT.js` + profile `recordEngagement` | `sprint5` audit aggregate | ✅ |
| BE-26 | giftXp.viewer multiplier přednost před raw coins | D26 | `MIA_GIFT_SUPPORTER_PROFILE` mapViewerXp branch | `gift_map` | ✅ |
| BE-27 | Gift user ledger recent donors | E27 | `MIA_GIFT_USER_LEDGER` → `/overlay-state` recentGifts | `gift_user_metadata`, `overlay_public_response` | ✅ |
| BE-28 | Ledger interně drží giftValue — strip na public | E27–E28 | `buildGiftUserEntry.giftValue`; strip v public response | `overlay_public_response` | ✅ |
| BE-29 | Supporter profile snapshot v overlay (giftEconomy) | E28 | `getSupporterSnapshot` → public body | `gift_runtime`, `sprint5` | ✅ |
| BE-30 | Supporter snapshot **bez coin polí** | E28 | XP, level, streak, achievements — no coins | Implicit | ✅ |
| BE-31 | Viewer memory ≥3 gifty personalizace | E29 | `core/viewer-memory.js` + chat hint | `phase2_viewer_memory`, `gift_map` | ✅ |
| BE-32 | Viewer memory level z totalMiaPoints | F36 | `levelFromMiaPoints` thresholds | `phase2_viewer_memory` | ✅ |
| BE-33 | Viewer memory **nikdy neukládá coins** | F36 | `recordGiftEvent` miaPoints only | `phase2_viewer_memory` | ✅ |
| BE-34 | Host team split aktivní v host/nejsem_tu | E30–E31 | `MIA_HOST_TEAM_POINTS.isHostTeamSplitActive` | `sprint5`, `host_team_ui` | ✅ |
| BE-35 | `MIA_HOST_TEAM_SPLIT_PCT` default 50 | E31 | `process.env.MIA_HOST_TEAM_SPLIT_PCT` clamp 0–100 | `sprint_d_contract` | ✅ |
| BE-36 | Host team score bar visible jen host mode | E30 | `MIA_HOST_TEAM_UI.buildHostTeamBarModel` | `host_team_ui` | ✅ |
| BE-37 | Team points z gift profilu | E32 | `giftProfile.teamPoints` / ctx.teamPoints | `sprint5`, `gift_map` | ✅ |
| BE-38 | Achievement public moment bez coins | F33–F34 | `MIA_ACHIEVEMENT_MOMENT`; private → null | `achievement_moment` | ✅ |
| BE-39 | Achievement v subtext/speech, ne coin unlock text | F33 | `prepareGiftPresentation` achievement lane | `achievement_moment` | ✅ |
| BE-40 | Rewards → batoh bez coin storage | F35 | `shared/gifts` rewards + `viewer-inventory` | `achievement_moment`, `gift_map` | ✅ |
| BE-41 | Koj bowl gain z miaPoints | G37 | `MIA_KOJNOZROUT_ENGINE.computeSupportImpact` | `koj_public_snapshot` | ✅ |
| BE-42 | Duel sides track miaPoints | G38 | `MIA_KOJNOZROUT_DUEL.applyGiftSupport` | Arena contracts | ✅ |
| BE-43 | Platform arena activity weighted miaPoints | G39 | `MIA_PLATFORM_ARENA.resolveActivityPoints` | `phase3_game_layer` | ✅ |
| BE-44 | Hall of Fame T6 eligibility flag | G40 | `leaderboard.hallOfFameEligible: streamTier === T6` | `gift_economy` partial | ✅ |
| BE-45 | Žádná SQL DB pro TikTok gift eventy | H41 | Session/runtime JSON | — | ✅ |
| BE-46 | gift-map-stats.json on disk | H42 | `data/gift-map-stats.json` 🟡 alignment | — | ⚠ |
| BE-47 | `buildResolvedGiftContext` obsahuje interní `giftValue` | B8 | Pole `giftValue: totalCoins` v internal ctx — **strip až na API** | `gift_economy` (shape) | ⚠ |
| BE-48 | Internal ctx nesmí jít raw do overlay delivery | B8 | `MIA_GIFT_PRESENTATION` / delivery používá sanitizované payloady | Implicit | ✅ |
| BE-49 | Combo wave HUD miaPoints only | H45 | `engine_spam_session`, combo-overlay assets | `combo_wave_ui`, `graphics_r1` | ✅ |
| BE-50 | **Spam T4 milestone vs shadow cap T4→T3** | I48 | Engine T4 ✅; `engine_shadow_runtime` cap ⚠ | Engine test ✅; shadow 🔴 | ⚠ |
| BE-51 | `core/event-normalizer` overlay-safe projection | B6 | `projectEventForOverlay` miaPoints only | — | ⚠ |
| BE-52 | `core/combo-moments` subtext ukazuje „miaPoints“ label | B7 | Subtext `… miaPoints` — technický label vs „podpora projektu“ | — | ⚠ |
| BE-53 | Runtime audit admin: lastGiftMapping může mít totalCoins | H44 | `MIA_RUNTIME_AUDIT` — admin surface, ne overlay | `sprint5` | ⚠ |
| BE-54 | Enterprise gift runtime community totalMiaPoints | A3 | `shared/gifts/runtime.js` aggregace | `gift_map_log_audit` | ✅ |
| BE-55 | normalize_event early pipeline coins→miaPoints | A2 | `core/event-normalizer.js` `coinsToMiaPoints` | ingest paths | ✅ |
| BE-56 | Graphics MIA body parts ≠ ekonomické miaPoints | J49 | Oddělené vrstvy; alignment explicit | `graphics_r1` partial | ✅ |
| BE-57 | Live audit overlay_state_no_coins | J50 | `bodyLiveAudit.js` / npm `audit:live` | `mia_graphics_studio_12s` ref | ❓ |
| BE-58 | Multi-hour streak po restart serveru | D24 | Supporter state v stream runtime — **persist file** | — | ❓ |
| BE-59 | Host team split live NEJSEM TU stream | E30 | Wiring existuje | Live host session | ❓ |
| BE-60 | Arena steal mechanics miaPoints only public | B10 | Battle snapshot through strip | `phase3_game_layer` | ✅ |

---

## Shrnutí matrix

| Stav | Počet |
|------|-------|
| ✅ | 48 |
| ⚠ | 8 |
| ❌ | 0 |
| ❓ | 4 |
| **Celkem** | **60** |

---

## Guardrails (tvrdá pravidla) — subset

| ID | Pravidlo | Stav |
|----|----------|------|
| BE-05 | Overlay bez coins | ✅ |
| BE-06 | Public miaPoints + giftCount | ✅ |
| BE-09 | Strip na API hranici | ✅ |
| BE-10 | Arena/duel miaPoints | ✅ |
| BE-11 | 7.5 konverze | ✅ |
| BE-33 | Viewer memory bez coins | ✅ |
| BE-38 | Achievement bez coins | ✅ |
| BE-45 | No SQL TikTok events | ✅ |

**8/8 guardrails ✅** — žádný tvrdý rozpor (❌).

---

## Tři druhy tier labelů (kánonní pojistka)

| Pole | Příklad | Ověření |
|------|---------|---------|
| `coinTier` | 1000 coins → T3 | ✅ BE-13, BE-18 |
| `streamTier` / `obsTier` | Galaxy catalog T5 > coin T3 → T5 | ✅ BE-18 |
| `spamRewardTier` | Vlna 7500 miaPoints → T3 milestone | ✅ BE-17; ⚠ BE-50 shadow cap |

---

## Cross-reference Etapa 3A

| 3A ID | 3B ID | Poznámka |
|-------|-------|----------|
| G-05–G-09 | BE-05–BE-12 | Overlay + konverze — 3B detail body sémantika |
| G-36–G-42 | BE-20–BE-24, BE-50 | Combo/streak/spam reward tiers |
| G-60 | BE-27–BE-28 | Ledger |
| G-74 | BE-34–BE-37 | Host team |
| G-42 | BE-50 | Spam T4 cap — **sdílené riziko** |

---

## Tok MIA bodů (zkráceně)

```
RAW gift (coins interně)
  → normalize (coinsToMiaPoints)
  → MIA_SUPPORT_RESOLVER (tier, miaPoints, xpBase)
  → MIA_GIFT_SUPPORTER_PROFILE (cumulative XP, streak)
  → MIA_GIFT_USER_LEDGER (recent donors)
  → MIA_HOST_TEAM_POINTS (optional split)
  → engine_spam_session (wave miaPoints → spamRewardTier)
  → Koj bowl / duel / arena (miaPoints impact)
  → MIA_OVERLAY_PUBLIC_RESPONSE.stripValueFieldsForPublic
  → /overlay-state (divák: miaPoints, ne coins)
```
