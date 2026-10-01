# Etapa 3 — Gifts + Video rotace

**Datum:** 2026-07-27  
**Oblast:** gifty, tier routing, video engine, rotace, spam/combo

**Guardrail:** Overlay public API **jen miaPoints** — žádné coins/gift value.

---

## 1. Gift map + tier routing (T1–T4)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Kanonická gift mapa; support resolver určí tier, category, care, obsTier |
| **Co neumí** | Neznámé gifty → fallback tier (NEOVĚŘENO live mapping completeness) |
| **Vstup** | Gift event: `giftName`, `coins`, `repeatCount`, user metadata |
| **Výstup** | Enriched support context s tier T1–T4 |
| **Testy** | `gift_map`, `gift_map_log_audit`, `gift_runtime`, `gift_runtime_ctx` |
| **NEOVĚŘENO** | Každý nový TikTok gift name v live mapě |

---

## 2. miaPoints konverze

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `coinsToMiaPoints(coins, count)` = coins × count × 7.5 (`MIA_POINTS_PER_COIN`); strip coin fields z public overlay |
| **Co neumí** | Interně stále pracuje s coins — guardrail na export vrstvě |
| **Vstup** | Raw coin count |
| **Výstup** | miaPoints v overlay/TTS/arena |
| **Testy** | `overlay_public_response`, `graphics_r1`, `gift_economy` |
| **NEOVĚŘENO** | — |

---

## 3. Per-tier video rotace

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `rotationIndexByTier` — per-tier index bez resetu tier indexu (guardrail) |
| **Co neumí** | Slow test mimo fast preflight |
| **Vstup** | Gift tier + media catalog |
| **Výstup** | Vybrané video URL pro OBS media source |
| **Testy** | `video_rotation` (slow), `video_engine_ctx`, `gift_media_runtime` |
| **NEOVĚŘENO** | Live OBS přepínání všech tier videí v jedné session (R1-C krok 6 = PASS 2026-07-26, ale ne v tomto běhu) |

---

## 4. Gift present / thanks overlay

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `phase_present` → gift overlay payload; MIA/Koj speaker routing; achievement moments |
| **Co neumí** | — |
| **Vstup** | `actionResult` po GIFT decide |
| **Výstup** | Gift animation overlay (bust `37-stream-polish`) + TTS thank-you |
| **Testy** | `gift_economy`, `achievement_moment`, `user_ack_throttle`, `combo_overlay` |
| **NEOVĚŘENO** | — |

---

## 5. Gift economy enrich (XP, combo, streak)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | XP/levels, combo thresholds (10/50/100), streak bonus, boss event metadata |
| **Co neumí** | Boss events — live trigger frequency NEOVĚŘENO |
| **Vstup** | Support event + viewer history |
| **Výstup** | `giftPresentationPlan`, combo moment flags |
| **Testy** | `gift_economy`, `phase2_combo_moments`, `spam_session_ctx` |
| **NEOVĚŘENO** | Multi-hour streak persistence |

---

## 6. Spam session / combo wave

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Agregace rapid gifts; spam wave HUD; cap reward T3; belly/combo HUD na Koj |
| **Co neumí** | — |
| **Vstup** | Rapid gift sequence |
| **Výstup** | `comboMoment`, `spamSession` v overlay-state (miaPoints only) |
| **Testy** | `combo_wave_ui`, `combo_overlay`, `graphics_r1`, `spam_session_ctx` |
| **NEOVĚŘENO** | R1-C krok 7 PASS (2026-07-26) — mimo tento audit běh |

---

## 7. Tier video playback (OBS)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `MIA_VIDEO_ENGINE.js` — tier routing, OBS media command, defer MIA voice |
| **Co neumí** | Persistent layers throttle — slow test |
| **Vstup** | `shouldPlayVideo`, tier, media catalog entry |
| **Výstup** | OBS video source switch/play |
| **Testy** | `gift_media_runtime`, `video_engine_ctx`, `media_singletons_runtime` |
| **NEOVĚŘENO** | OBS media source timing pod CPU load |

---

## 8. Gift animation bank override

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Co umí** | Animation bank override pro gift overlay; desk routes |
| **Co neumí** | Mimo `preflight:fast`; ne stream-critical |
| **Vstup** | Admin/gift desk config |
| **Výstup** | Custom animation binding |
| **Testy** | `gift_visual` (slow), `gift_animation_context` |
| **NEOVĚŘENO** | Live stream s custom bank |

---

## 9. Storyboard (Universe/Galaxy/Rose)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Admin storyboard config; phase2 story paths |
| **Co neumí** | — |
| **Vstup** | Admin storyboard API |
| **Výstup** | Story-driven gift moments |
| **Testy** | `phase2_admin_storyboard`, `story_feed_runtime` |
| **NEOVĚŘENO** | — |

---

## 10. Bowl-full special video

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Trigger special OBS sources při full bowl |
| **Co neumí** | Závisí na bowl engine state |
| **Vstup** | Bowl percent ≥ 100 |
| **Výstup** | Special video sources (`bowlFullSpecialSources`) |
| **Testy** | Koj/bowl wiring via `koj_moments_runtime`, `gift_media_ctx` |
| **NEOVĚŘENO** | Live full bowl → video sync |

---

## Shrnutí oblasti

| ✅ | ⚠ | ❌ |
|----|----|-----|
| 8 | 1 | 0 |

**Stream-ready:** Gift pipeline je RC core. Rotace per-tier ověřena R1-C (historicky PASS).

*Etapa 3 — docs only.*
