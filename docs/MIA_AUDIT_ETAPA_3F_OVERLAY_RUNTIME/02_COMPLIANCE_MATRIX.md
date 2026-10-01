# Etapa 3F — Compliance matrix (Overlay Runtime)

**Datum:** 2026-07-27  
**Pravidla:** OV-01…OV-72 (mapují `01_CANON_RULES_EXTRACT.md` §1–72)  
**Status:** ✅ shoda · ⚠ drift · ❌ rozpor · ❓ neověřeno  
**Poslední ověření:** *fresh* = code/contract review **2026-07-27**; *hist.* = R1-C / starší live; *nikdy* = bez live důkazu

---

## A. Architektura a public strip

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| OV-01 | TikFinity→MIA→OBS | guardrails | HTML polluje MIA; rozhoduje MIA | overlay_public_*, graphics_r1 | ✅ | fresh 2026-07-27 |
| OV-02 | OBS = render only | guardrails | žádná economy math v HTML | — (arch) | ✅ | fresh 2026-07-27 |
| OV-03 | Nikdy coins v overlay | guardrails · §15 | `stripValueFieldsForPublic` | overlay_public_response, graphics_r1 | ✅ | fresh 2026-07-27 |
| OV-04 | Strip na API hranici | alignment public | `MIA_OVERLAY_PUBLIC_RESPONSE` | overlay_public_response, wiring, ctx | ✅ | fresh 2026-07-27 |
| OV-05 | Zachovat miaPoints/giftCount | 3B · strip | explicit keep | overlay_public_response | ✅ | fresh 2026-07-27 |
| OV-06 | Forbidden key aliasy | public response | PUBLIC_OVERLAY_FORBIDDEN_KEYS | overlay_public_response | ✅ | fresh 2026-07-27 |
| OV-07 | Koj public stejný strip | alignment | `getPublicKojSnapshot` | overlay_public_response | ✅ | fresh 2026-07-27 |
| OV-08 | Spam/combo bez coins | graphics_r1 | strip spamSession | graphics_r1 | ✅ | fresh 2026-07-27 |
| OV-09 | Admin ≠ public surface | capability §8 | public factory vs admin | — | ❓ | **nikdy** private API spot-check |
| OV-10 | Body ≠ coins labels | § Body | miaPoints fields | graphics_r1 | ✅ | fresh 2026-07-27 |

---

## B. `/overlay-state` poll

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| OV-11 | GET snapshot pro overlays | alignment tok | public wiring route | overlay_public_wiring | ✅ | fresh 2026-07-27 |
| OV-12 | Poll ~450 ms | capability §11 | overlay-poll + cache MS | overlay_state_cache_ctx, timing_ctx | ✅ | fresh 2026-07-27 |
| OV-13 | Cache key voice+video | public response | `buildOverlayStateCacheKey` | overlay_public_response | ✅ | fresh 2026-07-27 |
| OV-14 | Gettery peek-only | alignment GET | peek komentáře + prune central | overlay_state_ctx | ✅ | fresh 2026-07-27 |
| OV-15 | pruneExpiredEphemeral | overlay state | getOverlaySnapshot | overlay_state_* | ✅ | fresh 2026-07-27 |
| OV-16 | mia/koj overlay slots | snapshot shape | getOverlaySnapshot | overlay_public_*, layout | ✅ | fresh 2026-07-27 |
| OV-17 | voicePlayback v body | 3E cross | public response includes VP | overlay_public_response | ✅ | fresh 2026-07-27 |
| OV-18 | Shared poll scheduler | overlay-poll.js | in-flight + backoff | — (lib, partial HTML use) | ⚠ | fresh 2026-07-27 (ne všechny HTML) |
| OV-19 | cache: no-store fetch | HTML pattern | gift/combo/speech fetch | — (static assert partial) | ✅ | fresh 2026-07-27 |
| OV-20 | Engine2 profile filter | engine2 E3 | stub + ?profile= | mia_engine2_e3 | ✅ | fresh 2026-07-27 (stub OFF) |

---

## C. Overlay queue / delivery

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| OV-21 | Fronta při voice lock | §15 | `MIA_OVERLAY_QUEUE` | overlay_queue_smoke, queue_ctx | ✅ | fresh 2026-07-27 |
| OV-22 | Priority T4…chat | queue resolvePriority | enqueue sort | overlay_queue_smoke | ✅ | fresh 2026-07-27 |
| OV-23 | Flush po TTS | §15 · 3E | `flushOverlayQueue` | overlay_voice_queue_integration (mimo fast) | ⚠ | fresh code; fast gap |
| OV-24 | Enqueue při block | delivery | queue path | overlay_queue_smoke / delivery | ✅ | fresh 2026-07-27 |
| OV-25 | Queue host/ctx | host inventory | QUEUE_HOST/CTX | overlay_queue_ctx | ✅ | fresh 2026-07-27 |
| OV-26 | Serializace chaos | Etapa 2/3 | voice+queue | speaker_routing (partial) | ❓ | live burst **nikdy** |
| OV-27 | Gift prezentace 1 cesta | §15 | GIFT_PRESENTATION | gift_runtime (3A) | ✅ | fresh 2026-07-27 (wiring) |
| OV-28 | Overlay timing host | timing host | TIMING_* | overlay_timing_ctx | ✅ | fresh 2026-07-27 |

---

## D. Speech pick / pin / priority

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| OV-29 | priority → updatedAt | §14 pick | `pickActiveOverlay` sort | overlay_layout_contract | ✅ | fresh 2026-07-27 |
| OV-30 | Support beats low-prio chatter | §14 | priority-first sort | overlay_layout_contract | ✅ | fresh 2026-07-27 |
| OV-31 | Tři owner kandidáti | speech HTML | mia/koj/alias | overlay_layout (partial) | ✅ | fresh 2026-07-27 |
| OV-32 | Filtr voiceMirror | § / 3E | filter meta.voiceMirror | layout + 3E VT-06 | ✅ | fresh 2026-07-27 |
| OV-33 | TTS wins over pin | resolveVisible | voiceOverlay first | overlay_layout (partial) | ✅ | fresh 2026-07-27 |
| OV-34 | MIN_READ_MS 9000 | speech HTML | pinOverlay | — | ✅ | fresh 2026-07-27 |
| OV-35 | Pin break higher prio | §14 | livePriority > pinned | overlay_layout_contract | ✅ | fresh 2026-07-27 |
| OV-36 | Pin break newer text | speech HTML | liveUpdated > pinned | — (code) | ✅ | fresh 2026-07-27 |
| OV-37 | Pin break expiry | speech HTML | now >= pinnedUntil | — (code) | ✅ | fresh 2026-07-27 |
| OV-38 | Bubble z-index > holo | layout | #box 10 / #miaHolo 2 | overlay_layout_contract | ✅ | fresh 2026-07-27 |
| OV-39 | Portrait shrink holo | layout | max-height 500px | overlay_layout_contract | ✅ | fresh 2026-07-27 |
| OV-40 | Signature bez holdUntil | speech HTML | buildSignature | — | ✅ | fresh 2026-07-27 |

---

## E. Voice-first / music (overlay side)

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| OV-41 | Hide bubble při TTS | §14 · 3E | applyVoiceOverlayPolicy null | speaker_routing | ✅ | fresh 2026-07-27 |
| OV-42 | Mirror přes voicePlayback | speech HTML | pickVoiceMirrorOverlay | — (HTML) | ✅ | fresh 2026-07-27 |
| OV-43 | Audio grace window | speech HTML | isActiveVoicePlayback | — | ⚠ | fresh code; live timing **nikdy** |
| OV-44 | Music → bubble TTS off | §15 · 3E | suppressGiftVoice | speaker_routing | ✅ | fresh 2026-07-27 |
| OV-45 | Overlay ≠ literal voice | §15 | bubble_over_music | speaker_routing | ✅ | fresh 2026-07-27 |
| OV-46 | Speak aura z VP | speech tick | syncMiaSpeakingAura | — | ✅ | fresh 2026-07-27 |
| OV-47 | Viewer strip + VP | capability §7 | viewer-strip VP read | host_team / participants | ⚠ | fresh code; live hide **hist./nikdy** |
| OV-48 | Live avatar = #miaHolo | alignment body | speech holo; body parts OFF | overlay_layout, 3D | ✅ | fresh 2026-07-27 |

---

## F. Response contract

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| OV-49 | speech_text ≠ field overlay_text | §14 contract | RESPONSE_ENGINE dual fields | session_memory (partial) | ✅ | fresh 2026-07-27 |
| OV-50 | responseContract shape | engine | intent+speech+overlay | — (shape code) | ✅ | fresh 2026-07-27 |
| OV-51 | Intent v meta/contract | §15 | responseContract.intent | — | ⚠ | často type; deep meta audit thin |
| OV-52 | Text fallback chain | speech HTML | resolveOverlayText | — | ✅ | fresh 2026-07-27 |
| OV-53 | Owner normalize | routing | normalizeOwner | speaker_routing | ✅ | fresh 2026-07-27 |
| OV-54 | holdUntilTs životnost | overlay state | isActiveOverlay | overlay_state / combo | ✅ | fresh 2026-07-27 |

---

## G. Gift / combo / spam HUD

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| OV-55 | Gift bust 37 | R1-C · 3D | gift-animation-overlay | graphics_r1 | ✅ | fresh code; live hist. R1-C 2026-07-26 |
| OV-56 | Idle transparent | capability §6 | HTML idle transparent | — | ✅ | fresh 2026-07-27 |
| OV-57 | Combo moment slot | COMBO_OVERLAY | setComboMoment | combo_overlay_contract | ✅ | fresh 2026-07-27 |
| OV-58 | Spam wave HUD | alignment spam | combo-overlay + wave-ui | combo_overlay, combo_wave_ui | ✅ | fresh; live hist. R1-C 2026-07-26 |
| OV-59 | Boss banner moment | combo | buildBossComboMoment | combo_overlay | ✅ | fresh 2026-07-27 |
| OV-60 | pickStrongerMoment | combo | priority pick | combo_overlay | ✅ | fresh 2026-07-27 |
| OV-61 | T0/boss/story HTML | alignment T0/T4 | dedicated overlays | gift_runtime / graphics (partial) | ⚠ | entrypoints OK; deep choreo → 3A/3H |
| OV-62 | Ephemeral gift slots | overlay state | giftVisual/AnimationMoment | overlay_state | ✅ | fresh 2026-07-27 |

---

## H. Viewer / entity / host

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| OV-63 | Viewer strip participants | §16/17 | viewer-strip-overlay | overlay_participants | ✅ | fresh 2026-07-27 |
| OV-64 | Entity vitals badge | entity HTML | vitalsSummary | overlay_layout | ✅ | fresh 2026-07-27 |
| OV-65 | Host team score bar | alignment | hostTeamBar + UI | host_team_ui (related) | ✅ | fresh 2026-07-27 |
| OV-66 | Host-mode overlay poll | host panel | host-mode-overlay.html | host_mode_overlay_contract | ✅ | fresh 2026-07-27 |
| OV-67 | Live → panel skrytý | host config | overlayVisible false | host_mode_overlay_contract | ✅ | fresh 2026-07-27 |
| OV-68 | Away + ninja URL | host / 3D | resolveNinjaEmbedUrl | host_mode_overlay | ⚠ | panel OK; away behavior stub (3D GAP-D06) |
| OV-69 | Fan avatars presentation | §17 | strip chips | overlay_participants | ✅ | fresh 2026-07-27 |
| OV-70 | Bowl/backpack display only | alignment | HTML poll display | layout/bowl asserts | ✅ | fresh; vitals → 3C |

---

## I. Layout / bust / Engine2

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| OV-71 | Hard zones CSS | zones.css | safe/MIA/koj clear | overlay_layout (partial link) | ⚠ | fresh CSS 2026-07-27; live portrait **nikdy** |
| OV-72 | Engine2 profiles stub OFF | engine2 E3 | MIA_ENGINE2_STUB default unset | mia_engine2_e3 | ✅ | fresh 2026-07-27 |

---

## Guardrails GR-O* mapování

| GR | Mapuje na | Status |
|----|-----------|--------|
| GR-O01 | OV-03…OV-08 | ✅ |
| GR-O02 | OV-01, OV-02 | ✅ |
| GR-O03 | OV-04, OV-11 | ✅ |
| GR-O04 | OV-29…OV-37 | ✅ |
| GR-O05 | OV-32 | ✅ |
| GR-O06 | OV-44, OV-45 | ✅ |
| GR-O07 | OV-21…OV-23 | ⚠ (flush mimo fast) |
| GR-O08 | OV-71 | ⚠ (CSS OK; live portrait nikdy) |

---

## Souhrn statusů (matrix)

| Stav | Počet | Podíl |
|------|-------|-------|
| ✅ | 62 | 86 % |
| ⚠ | 8 | 11 % |
| ❌ | 0 | 0 % |
| ❓ | 2 | 3 % |

*⚠: OV-18, OV-23, OV-43, OV-47, OV-51, OV-61, OV-68, OV-71. ❓: OV-09, OV-26. Detaily v `05_SUMMARY.md`.*
