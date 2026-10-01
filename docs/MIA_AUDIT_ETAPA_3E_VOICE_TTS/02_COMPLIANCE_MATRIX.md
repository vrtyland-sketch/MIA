# Etapa 3E — Compliance matrix (Voice / TTS)

**Datum:** 2026-07-27  
**Pravidla:** VT-01…VT-70 (mapují `01_CANON_RULES_EXTRACT.md` §1–70)  
**Status:** ✅ shoda · ⚠ drift · ❌ rozpor · ❓ neověřeno  
**Poslední ověření:** *fresh* = code/contract review **2026-07-27**; *hist.* = R1-C / starší live; *nikdy* = bez live důkazu

---

## A. Architektura a single authority

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| VT-01 | TikFinity→MIA→OBS TTS | guardrails | TTS v MIA; OBS jen `MIA_VOICE` | speaker_routing, delivery_runtime | ✅ | fresh 2026-07-27 |
| VT-02 | Jediná hlasová vrstva | master 0035 | `MIA_TTS_ENGINE` + delivery | tts_engine_ctx | ✅ | fresh 2026-07-27 |
| VT-03 | 1 věta = 1 TTS event | speaker header | plan + dedupe | speaker_routing | ✅ | fresh 2026-07-27 |
| VT-04 | Jen `MIA_VOICE` audio | OBS_LIVE §4 | manifest + ensure-voice | obs (3D), revive_13f | ✅ | fresh code; live hist. R1-C 2026-07-26 |
| VT-05 | Client authority lock | alignment | `mia-voice-overlay` AUTH_KEY | mia_voice_revive_13f | ✅ | fresh 2026-07-27 |
| VT-06 | Ignoruj `voiceMirror` | alignment | speech-overlay filter | graphics/overlay (partial) | ✅ | fresh 2026-07-27 |
| VT-07 | Bez duplicitního voice source | OBS_LIVE §5 | ensure-voice mute others | overlay-audit route | ❓ | hist. R1-C Audio 2026-07-26; fresh live **nikdy** (tento běh) |
| VT-08 | Monitor and Output | OBS_LIVE §4 | `resolveObsVoiceMonitorType` | revive_13f, obs_overlay_sync | ✅ | fresh 2026-07-27 |
| VT-09 | Anti-echo Desktop mute | 13g | `MIA_OBS_VOICE_ANTI_ECHO` default 1 | revive_13f | ❓ | hist. R1-C 2026-07-26; fresh live nikdy |
| VT-10 | Mute gift video během voice | Stream Engine | `muteGiftVideoDuringMiaVoice` | video/delivery (partial) | ✅ | fresh 2026-07-27 (kód) |

---

## B. Edge TTS / provider

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| VT-11 | Edge primary | Etapa 2/3 | `edge-tts-universal` | tts_engine_ctx | ✅ | fresh 2026-07-27 |
| VT-12 | MIA VlastaNeural | config | `MIA_TTS_EDGE_VOICE` | tts routes (runtime) | ✅ | fresh 2026-07-27 |
| VT-13 | Koj AntoninNeural | config | `MIA_TTS_EDGE_VOICE_KOJ` | speaker_routing dual | ✅ | fresh 2026-07-27 |
| VT-14 | Oddělená prosody | engine | edgeProsodyMia/Koj | — | ✅ | fresh 2026-07-27 |
| VT-15 | Filesystem cache | master §16 | cacheDir + hash | — (runtime) | ✅ | fresh 2026-07-27 |
| VT-16 | OpenAI fallback | capability | provider openai if key | — | ✅ | fresh 2026-07-27 (kód) |
| VT-17 | TTS default enabled | engine | `MIA_TTS_ENABLED` | — | ✅ | fresh 2026-07-27 |
| VT-18 | maxChars / timeout | engine | 900 / 25s | — | ✅ | fresh 2026-07-27 |
| VT-19 | Duration estimate | Etapa 2 | `estimateDurationMs` | voice_timing | ⚠ | fresh 2026-07-27 (heuristika) |
| VT-20 | Offline / Edge outage | capability | network required | — | ❓ | **nikdy** live outage fallback |

---

## C. Dual voice

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| VT-21 | Dual default OFF | DoD · DUAL_VOICE.js | `isDualVoiceEnabled` | speaker_routing, runtime_smoke | ✅ | fresh 2026-07-27 |
| VT-22 | Opt-in `=1` only | capability | env trim === "1" | speaker_routing | ✅ | fresh 2026-07-27 |
| VT-23 | Deferred overlay bez TTS | routing header | overlayOnly + voiceSuppressed | speaker_routing, runtime_smoke | ✅ | fresh 2026-07-27 |
| VT-24 | No duplicate companion utterance | routing | scrubDuplicateCompanionVoice | speaker_routing | ✅ | fresh 2026-07-27 |
| VT-25 | Dual ON companion chain | capability | deferred TTS | speaker_routing | ✅ | fresh 2026-07-27 (contract) |
| VT-26 | Prestream dual OFF | PRESTREAM_DOD | policy docs | — (ops) | ✅ | hist. DoD; live dual OFF **nikdy** fresh |

---

## D. Speaker routing

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| VT-27 | MIA hlas scény | alignment | voice layer + delivery | voice_control_layer_* | ✅ | fresh 2026-07-27 |
| VT-28 | Koj primary u gift | alignment · 3C | isKojGiftVoice / support | speaker_routing | ✅ | fresh 2026-07-27 |
| VT-29 | resolveVoiceDeliveryPlan | Etapa 2 | MIA_SPEAKER_ROUTING | speaker_routing | ✅ | fresh 2026-07-27 |
| VT-30 | applyVoiceOverlayPolicy | Etapa 2 | totéž | speaker_routing | ✅ | fresh 2026-07-27 |
| VT-31 | Spam throttle → no TTS | 3A cross | isSupportSpamThrottled | speaker_routing (partial) | ✅ | fresh 2026-07-27 |
| VT-32 | suppressGiftVoice | alignment | plan shouldSpeak false | speaker_routing music test | ✅ | fresh 2026-07-27 |
| VT-33 | Music gift → bubble | §15 · 3A | bubble_over_music | speaker_routing | ✅ | fresh 2026-07-27 |
| VT-34 | Dual+music deferred MIA | routing | miaVoiceDeferredForVideo | speaker_routing dual | ✅ | fresh 2026-07-27 |
| VT-35 | Cross-speaker dedupe | delivery | tts_speak_deduped_utterance | delivery_runtime (partial) | ✅ | fresh 2026-07-27 |
| VT-36 | speech vs overlay text | §14 | Response Engine fields | — (mimo deep 3E) | ⚠ | fresh 2026-07-27 (cross-link) |

---

## E. Queue / priority / timing

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| VT-37 | Speak queue max 6 | capability | MAX_VOICE_SPEAK_QUEUE | delivery_runtime | ✅ | fresh 2026-07-27 |
| VT-38 | Serialized playback | capability | speakProcessing flags | delivery_runtime | ✅ | fresh 2026-07-27 |
| VT-39 | voiceHoldUntilTs | Voice timing | MIA_VOICE_TIMING | voice_timing, voice_timing_ctx | ✅ | fresh 2026-07-27 |
| VT-40 | Voice priority lock | Voice priority | MIA_VOICE_PRIORITY | voice_priority_ctx, smoke | ✅ | fresh 2026-07-27 |
| VT-41 | T3/T4 break lock | priority header | shouldBlockOverlay | voice_priority_smoke (partial) | ⚠ | fresh 2026-07-27 |
| VT-42 | Overlay queue on lock | §15 | MIA_OVERLAY_QUEUE | overlay_queue_ctx | ✅ | fresh 2026-07-27 |
| VT-43 | Flush po TTS | §15 | flush after voice drain | overlay_voice_queue_integration_smoke | ⚠ | fresh 2026-07-27 (smoke mimo fast) |
| VT-44 | Defer voice po gift video | Etapa 2 | shouldDefer / deferred plans | speaker_routing | ✅ | fresh 2026-07-27 |
| VT-45 | Preempt / interrupt | master §18 | voicePreempt / miaInterrupt | — | ⚠ | fresh 2026-07-27 (částečné) |
| VT-46 | Gift+chat burst timing | Etapa 2/3 | známá křehkost | — | ❓ | **nikdy** fresh live burst |

---

## F. Voice-first / bublina

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| VT-47 | Hide bubble při TTS | §14 | overlayPayload=null primary | speaker_routing | ✅ | fresh 2026-07-27 |
| VT-48 | Koj TTS bez 2. bubliny | routing | companion cleared | speaker_routing | ✅ | fresh 2026-07-27 |
| VT-49 | voicePlayback mirror | delivery | setVoicePlaybackState | tts routes | ✅ | fresh 2026-07-27 |
| VT-50 | TTS wins vs stale pin | speech-overlay | pickActiveOverlay | overlay_layout (3F) | ⚠ | fresh 2026-07-27 → 3F |
| VT-51 | Music: bubble yes TTS no | §15 | suppressGiftVoice | speaker_routing | ✅ | fresh 2026-07-27 |
| VT-52 | Overlay ≠ doslovný hlas | §15 | music path | speaker_routing | ✅ | fresh 2026-07-27 |

---

## G. Delivery / routes / revive

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| VT-53 | Delivery runtime path | alignment | createDeliveryRuntime | delivery_runtime | ✅ | fresh 2026-07-27 |
| VT-54 | GET /tts/test | OBS_LIVE | routes/tts.js | voice_endpoint_smoke (🟡) | ✅ | fresh 2026-07-27 |
| VT-55 | GET /tts/compare | routes | routes/tts.js | — | ✅ | fresh 2026-07-27 |
| VT-56 | POST /voice/command | alignment | voice.js + control layer | voice_control_layer_* | ✅ | fresh 2026-07-27 |
| VT-57 | Control layer ≠ OBS exec | layer header | intent only | voice_control_layer_smoke | ✅ | fresh 2026-07-27 |
| VT-58 | obs:ensure-voice | OBS_LIVE | obs_ensure_voice.js | — live | ❓ | hist. ops; fresh live **nikdy** |
| VT-59 | Voice revive 13f | alignment | revive + unlock | mia_voice_revive_13f | ✅ | fresh 2026-07-27 (contract); live hist. R1-C |
| VT-60 | Host/ctx wiring | alignment | TTS/VOICE hosts | *_ctx contracts | ✅ | fresh 2026-07-27 |

---

## H. Lip / AQ / master aspirace

| ID | Pravidlo | Canon | Implementace | Testy | Status | Poslední ověření |
|----|----------|-------|--------------|-------|--------|------------------|
| VT-61 | Viseme lipTrack 13w | alignment | voicePlayback.lipTrack | graphics body (partial) | ✅ | fresh 2026-07-27 (wiring) |
| VT-62 | Audio lip 13x quality | alignment | amplitude + AudioContext | — | ❓ | hist. partial; live quality **nikdy** fresh |
| VT-63 | AQ default OFF | AQ_PRODUCTION | MIA_ACTION_QUEUE | flags docs | ✅ | fresh 2026-07-27 |
| VT-64 | TTS bez AQ | capability | delivery nezávislé | delivery_runtime | ✅ | fresh 2026-07-27 |
| VT-65 | Speech Queue map | master §7 | speak queue | delivery_runtime | ✅ | fresh 2026-07-27 |
| VT-66 | Emotion→prosody | master §10 | statická prosody env | — | ⚠ | fresh 2026-07-27 (aspirace) |
| VT-67 | Voice Effects | master §15 | ne stream feature | — | ⚠ | fresh 2026-07-27 (mimo RC) |
| VT-68 | Soft/Hard interrupt | master §18 | preempt částečně | — | ⚠ | fresh 2026-07-27 |
| VT-69 | Speech Analytics | master §17 | logs částečně | — | ⚠ | fresh 2026-07-27 |
| VT-70 | Koj voice profile share | master §20 | Antonín + routing | speaker_routing | ✅ | fresh 2026-07-27 |

---

## Guardrails GR-V* (souhrn)

| ID | Map VT | Status | Poslední ověření |
|----|--------|--------|------------------|
| GR-V01 | VT-01 | ✅ | fresh 2026-07-27 |
| GR-V02 | VT-04, VT-07 | ⚠/❓ | code ✅; live echo hist. R1-C 2026-07-26 |
| GR-V03 | VT-21 | ✅ | fresh 2026-07-27 |
| GR-V04 | VT-09 | ❓ | hist. R1-C; fresh live nikdy |
| GR-V05 | VT-33, VT-51 | ✅ | fresh 2026-07-27 |
| GR-V06 | VT-47 | ✅ | fresh 2026-07-27 |
| GR-V07 | VT-43 | ⚠ | smoke mimo fast |
| GR-V08 | VT-37 | ✅ | fresh 2026-07-27 |

---

## Počty (VT-01…VT-70)

| Stav | Počet | Podíl |
|------|-------|-------|
| ✅ | 50 | 71 % |
| ⚠ | 12 | 17 % |
| ❌ | 0 | 0 % |
| ❓ | 8 | 11 % |

**Součet:** 50+12+0+8 = **70**.

> Žádný tvrdý **❌** rozpor (single authority / dual OFF / music→bubble) nebyl nalezen v kódu.
