# Etapa 3E — Extrakt kánonních pravidel (MIA Voice / TTS)

Číslovaný seznam pravidel extrahovaných z kánonu. Každé pravidlo má zdrojový dokument.  
**Datum extraktu:** 2026-07-27

---

## A. Architektura a single TTS authority

1. **TikFinity → MIA → OBS** — TTS rozhodnutí v MIA; OBS jen přehrává audio z `MIA_VOICE`.  
   *Zdroj:* `.cursor/rules/mia-guardrails.mdc` · `docs/KANON_MIA_ALIGNMENT.md`

2. **Speech Engine = jediná oprávněná hlasová vrstva** — řeč nevzniká přímo v Conversation Engine.  
   *Zdroj:* `docs/master-canon/0035-speech-engine.md` §2–4 · alignment delivery runtime

3. **Jedna mluvená věta = jeden TTS event** — `audioSink: MIA_VOICE` only.  
   *Zdroj:* `scripts/MIA_SPEAKER_ROUTING.js` header · `docs/OBS_LIVE_SETUP.md` §5

4. **`MIA_VOICE` — jediný TTS audio browser** — Control audio ON; hub/legacy muted.  
   *Zdroj:* `docs/OBS_LIVE_SETUP.md` §4 · alignment „Voice single authority“

5. **Client single-authority lock** — `mia-voice-overlay` localStorage / BroadcastChannel; non-canonical URL = audio OFF.  
   *Zdroj:* `mia-voice-overlay.html` `AUTH_KEY` · alignment 13f/single authority

6. **Speech overlay ignoruje `meta.voiceMirror`** — žádné druhé bliknutí bubliny z TTS mirroru.  
   *Zdroj:* `speech-overlay.html` filter · alignment „Voice single authority“

7. **NE duplicitní voice browser / TikFinity unmuted** — ensure-voice nechá jen `MIA_VOICE` unmuted.  
   *Zdroj:* `docs/OBS_LIVE_SETUP.md` §5 · `routes/obs.js` overlay-audit

8. **Monitor typ default: Monitor and Output** — VB-Cable Input → TikTok mic Output.  
   *Zdroj:* `docs/OBS_LIVE_SETUP.md` §4 · `resolveObsVoiceMonitorType`

9. **Anti-echo (13g)** — Desktop Audio MUTE při Monitor+Output (default ON `MIA_OBS_VOICE_ANTI_ECHO`).  
   *Zdroj:* alignment 13g · `obs_revive_voice.js` · `MIA_OBS_OVERLAY_SYNC.js`

10. **Mute gift video během MIA voice** — anti-echo proti overlapping music+TTS (default ON).  
    *Zdroj:* alignment Stream Engine · `MIA_VIDEO_ENGINE.js` `muteGiftVideoDuringMiaVoice`

---

## B. Edge TTS / provider / hlasy / cache

11. **Primary provider: Edge TTS** (`edge-tts-universal`) když není OpenAI key.  
    *Zdroj:* Etapa 2 `03_FLOW_MIA_BODY_SPEECH` · `MIA_TTS_ENGINE.js` · package.json

12. **MIA hlas default:** `cs-CZ-VlastaNeural` (`MIA_TTS_EDGE_VOICE`).  
    *Zdroj:* `MIA_TTS_ENGINE.js` · `MIA_CONFIG.js` · Etapa 3 capability §1

13. **Koj hlas default:** `cs-CZ-AntoninNeural` (`MIA_TTS_EDGE_VOICE_KOJ`).  
    *Zdroj:* totéž · alignment §14 „Koj voice“

14. **Prosody MIA vs Koj** — oddělené rate/volume/pitch (MIA pomalejší/výš; Koj rychlejší/níže).  
    *Zdroj:* `MIA_TTS_ENGINE.js` `edgeProsodyMia` / `edgeProsodyKoj`

15. **Filesystem TTS cache** — opakované věty zrychlují odezvu.  
    *Zdroj:* master canon §16 · `MIA_TTS_ENGINE.js` cacheDir

16. **OpenAI TTS fallback** — pokud `MIA_TTS_API_KEY` / OpenAI key → provider openai.  
    *Zdroj:* `resolveConfig` · Etapa 3 capability §1

17. **TTS enabled default ON** — vypnutí jen explicitním `MIA_TTS_ENABLED=0/false`.  
    *Zdroj:* `MIA_TTS_ENGINE.js` `resolveConfig`

18. **Max chars / timeout** — default maxChars 900, timeoutMs 25000.  
    *Zdroj:* `MIA_TTS_ENGINE.js`

19. **Duration estimate** — `estimateDurationMs` (heuristika slov) když není exact.  
    *Zdroj:* `MIA_TTS_ENGINE.js` · Etapa 2 poznámka lip sync aproximace

20. **Offline Edge outage** — bez network Edge provider nefunguje (capability gap).  
    *Zdroj:* Etapa 3 `04_TTS_OVERLAY_OBS.md` „Co neumí“

---

## C. Dual voice policy

21. **Dual voice default OFF** — jedna user akce = jedna TTS utterance.  
    *Zdroj:* `MIA_DUAL_VOICE.js` · `docs/MIA_PRESTREAM_DOD.md` · Etapa 3 capability §2 · 3C KJ-70

22. **Opt-in jen `MIA_DUAL_VOICE=1`** — unset/`0` = single MIA (nebo Koj primary bez companion TTS).  
    *Zdroj:* `isDualVoiceEnabled()` · `docs/MIA_CAPABILITY_STATUS.md`

23. **Deferred Koj overlay bez dual-voice** — vizuál/text po MIA běží i když dual OFF; bez TTS.  
    *Zdroj:* `MIA_SPEAKER_ROUTING.js` · execution bridge · `runtime_smoke`

24. **Companion nesmí říkat stejnou větu jako primary** — `scrubDuplicateCompanionVoice` / `isSameUtterance`.  
    *Zdroj:* `MIA_SPEAKER_ROUTING.js` header · dual ON branches

25. **Dual ON → Koj+MIA companion chain** — druhý TTS Antonín / deferred.  
    *Zdroj:* Etapa 3 capability §3 · `speaker_routing_contract`

26. **Prestream DoD: dual musí zůstat OFF** na produkčním streamu.  
    *Zdroj:* `docs/MIA_PRESTREAM_DOD.md`

---

## D. Speaker routing (TTS strana)

27. **MIA = mozek + hlas scény** — primary TTS u chat/host; `/voice/command`.  
    *Zdroj:* alignment § entity · `MIA_VOICE_CONTROL_LAYER`

28. **Koj = pet, ne hlavní řečník chatu** — Koj primary u gift/support; ne default chat.  
    *Zdroj:* alignment · 3C speaker notes · `isKojGiftVoice`

29. **`resolveVoiceDeliveryPlan`** — kanonický plán `{ shouldSpeak, voiceMode, text, voiceSpeaker, … }`.  
    *Zdroj:* `MIA_SPEAKER_ROUTING.js` · Etapa 2 flow

30. **`applyVoiceOverlayPolicy`** — synchronizace overlay s TTS (voice-first).  
    *Zdroj:* totéž

31. **Support spam throttle → no TTS** — `isSupportSpamThrottled` → `shouldSpeak: false`.  
    *Zdroj:* `resolveVoiceDeliveryPlan` · cross-link 3A spam

32. **`suppressGiftVoice` / `suppressVoice` → no TTS**.  
    *Zdroj:* `resolveVoiceDeliveryPlan`

33. **Gift video s embedded audio (T2+)** — bublina místo Koj TTS (`bubble_over_music`).  
    *Zdroj:* alignment §15 · `applyGiftVideoPresentationPolicy` · `TIERS_REQUIRING_AUDIO` (3A)

34. **Při music gift + dual ON** — MIA companion může být deferred TTS po videu.  
    *Zdroj:* `applyGiftVideoPresentationPolicy` `miaVoiceDeferredForVideo`

35. **Utterance dedupe cross-speaker** — stejná věta nesmí znít 2× (MIA+Koj).  
    *Zdroj:* `MIA_DELIVERY_RUNTIME.js` `tts_speak_deduped_utterance`

36. **Response contract: speech vs overlay text** — `speech_text` / `overlay_text` (alignment §14).  
    *Zdroj:* alignment §14 · Response Engine (cross-link, ne deep audit)

---

## E. Voice queue, priority, timing

37. **Speak queue max 6** — `MIA_VOICE_SPEAK_QUEUE_MAX` default 6.  
    *Zdroj:* `MIA_DELIVERY_RUNTIME.js` · Etapa 3 capability §4

38. **Serializace playback** — `voiceSpeakProcessing` + `isVoicePlaybackActive` blokuje overlap.  
    *Zdroj:* `MIA_DELIVERY_RUNTIME.js`

39. **`voiceHoldUntilTs`** — hold window po TTS (runtime perf nebo fallback +1200 / min 3500).  
    *Zdroj:* `MIA_VOICE_TIMING.js` · hosts/ctx

40. **Voice priority lock** — voice uzamkne overlay owner/stage; chat/gift runtime běží, overlay se nepřepíše.  
    *Zdroj:* `MIA_VOICE_PRIORITY.js` header

41. **High tier support (T3/T4) může voice lock prorazit**.  
    *Zdroj:* `MIA_VOICE_PRIORITY.js` · `shouldBlockOverlay`

42. **Overlay fronta při voice lock** — `MIA_OVERLAY_QUEUE`; stage voice = vysoká priorita.  
    *Zdroj:* alignment §15 · `MIA_OVERLAY_QUEUE.js`

43. **Flush overlay queue po TTS** — po dokončení speak drain.  
    *Zdroj:* alignment §15 · `MIA_DELIVERY_RUNTIME.js` `overlay_queue_flush_after_voice`

44. **Defer MIA voice po gift video** — `shouldDeferVoiceForGiftVideo` / deferred plans.  
    *Zdroj:* Etapa 2 · speaker routing

45. **Preempt / interrupt** — `voicePreempt` / `meta.miaInterrupt` může přeskočit frontu.  
    *Zdroj:* `maybeDeliverMiaVoice` · master canon §18 Soft/Hard interrupt (částečně)

46. **Timing křehký při gift+chat burst** — známé riziko (Etapa 2/3).  
    *Zdroj:* Etapa 2 summary · capability §4 NEOVĚŘENO live

---

## F. Voice-first, bublina, mirror

47. **Voice-first: bublina se skrývá při TTS** — primary mode nulluje `overlayPayload`.  
    *Zdroj:* alignment §14 · `applyVoiceOverlayPolicy`

48. **Koj TTS: žádná druhá bublina během řeči** — companion cleared.  
    *Zdroj:* `applyVoiceOverlayPolicy` primary koj branch

49. **TTS mirror do overlay state** — `voicePlayback` + optional mirror s `voiceMirror: true` (speech filtruje).  
    *Zdroj:* `MIA_DELIVERY_RUNTIME.js` · `speech-overlay.html`

50. **Active TTS wins over stale pin** — speech overlay nesmí schovat bubble při řeči kvůli starému pinu.  
    *Zdroj:* `speech-overlay.html` komentář · pickActiveOverlay (3F detail)

51. **Gift s hudbou: bublina ANO, TTS NE** — `giftVideoPresentation: bubble_over_music`.  
    *Zdroj:* alignment §15 · `speaker_routing_contract` music gift test

52. **Overlay ≠ doslovný hlas** — text v bublině nemusí být TTS string (music path).  
    *Zdroj:* alignment §15

---

## G. Delivery, routes, control layer

53. **`createDeliveryRuntime()`** — jednotný path overlay/voice/gift/video.  
    *Zdroj:* alignment delivery runtime · `MIA_DELIVERY_RUNTIME.js`

54. **`GET /tts/test`** — operátorský smoke TTS (+ holdUntilTs, voicePlayback).  
    *Zdroj:* `routes/tts.js` · `OBS_LIVE_SETUP.md` · Prestream DoD

55. **`GET /tts/compare`** — MIA vs Koj voice compare.  
    *Zdroj:* `routes/tts.js`

56. **`POST /voice/command`** — trusted streamer voice control layer → world mode + optional TTS.  
    *Zdroj:* `routes/voice.js` · `MIA_VOICE_CONTROL_LAYER.js`

57. **Voice control layer nespouští OBS sám** — jen intent contract.  
    *Zdroj:* `MIA_VOICE_CONTROL_LAYER.js` header

58. **`npm run obs:ensure-voice`** — TTS test + `/obs/ensure-voice`.  
    *Zdroj:* `obs_ensure_voice.js` · package.json

59. **Voice revive (13f)** — `npm run obs:revive-voice`, dashboard Oživit hlas, autoplay unlock.  
    *Zdroj:* alignment 13f · `obs_revive_voice.js` · `mia_voice_revive_13f_contract`

60. **Host/ctx wiring** — `MIA_TTS_ENGINE_HOST/CTX`, `MIA_VOICE_TIMING_*`, `MIA_VOICE_PRIORITY_*`, `MIA_VOICE_CONTROL_LAYER_*`, `MIA_VOICE_LAYER_HOST`.  
    *Zdroj:* alignment hosts table · index.js init

---

## H. Lip sync, AQ, master canon aspirace

61. **Live viseme (13w)** — `voicePlayback.lipTrack` → speak frames na `#miaHolo`.  
    *Zdroj:* alignment 13w · speech-overlay / lip runtime

62. **Live audio lip (13x)** — TTS MP3 amplitude + AudioContext fallback.  
    *Zdroj:* alignment 13x

63. **Action Queue default OFF** — `MIA_ACTION_QUEUE` kill switch; neblokuje single-voice stream.  
    *Zdroj:* `docs/MIA_AQ_PRODUCTION.md` · Etapa 3 flags

64. **AQ nesmí být předpoklad pro TTS** — TTS běží bez AQ.  
    *Zdroj:* capability / Prestream DoD

65. **Speech Queue (master canon)** — fronta brání overlapping hlasům (mapováno na speak queue).  
    *Zdroj:* master canon §7 · `MIA_DELIVERY_RUNTIME`

66. **Emotion Voice Adapter (master)** — Emotion Engine → tempo/intonace (stream = statická prosody + částečně).  
    *Zdroj:* master canon §10

67. **Voice Effects (master)** — echo/rádio/battle megafon (ne stream-ready feature).  
    *Zdroj:* master canon §15

68. **Soft/Hard interrupt (master)** — Soft = počkej konec; Hard = okamžitě (stream = preempt částečně).  
    *Zdroj:* master canon §18 · delivery preempt

69. **Speech Analytics (master)** — latence, cache hit (částečně logs, ne full analytics).  
    *Zdroj:* master canon §17

70. **Koj integrace Speech Engine** — Koj má vlastní voice profile, sdílí TTS authority.  
    *Zdroj:* master canon §20 · speaker routing

---

## Guardrails subset (GR-V*)

| ID | Pravidlo | Zdroj |
|----|----------|-------|
| GR-V01 | Architektura TikFinity→MIA→OBS (TTS v MIA) | mia-guardrails |
| GR-V02 | Single TTS browser `MIA_VOICE` | OBS_LIVE_SETUP · alignment |
| GR-V03 | Dual voice default OFF | `MIA_DUAL_VOICE.js` · Prestream DoD |
| GR-V04 | Anti-echo Desktop mute při Monitor+Output | 13g |
| GR-V05 | Gift s hudbou → bublina, TTS off | alignment §15 · 3A |
| GR-V06 | Voice-first: hide bubble during TTS | alignment §14 |
| GR-V07 | Overlay queue flush po TTS | alignment §15 |
| GR-V08 | Speak queue limituje overlap (max 6) | delivery runtime |

> **Poznámka:** Dual voice OFF je tvrdé provozní pravidlo v DoD/capability; v `.cursor/rules/mia-guardrails.mdc` **není** explicitní bullet (docs drift → GAP-E*).
