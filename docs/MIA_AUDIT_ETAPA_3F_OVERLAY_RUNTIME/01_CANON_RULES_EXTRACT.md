# Etapa 3F — Extrakt kánonních pravidel (Overlay Runtime)

Číslovaný seznam pravidel extrahovaných z kánonu. Každé pravidlo má zdrojový dokument.  
**Datum extraktu:** 2026-07-27  
**Prefix matrix:** OV-01…OV-72

---

## A. Architektura a public strip (guardrails)

1. **TikFinity → MIA → OBS** — business logika v MIA; overlay HTML jen prezentuje pollnutý stav.  
   *Zdroj:* `.cursor/rules/mia-guardrails.mdc` · `docs/KANON_MIA_ALIGNMENT.md`

2. **OBS jen renderuje** — žádná gift/ekonomická logika v browser source.  
   *Zdroj:* guardrails · alignment Stream Mode

3. **Overlay nikdy neexpozuje coins / hodnotu giftů** — jen `miaPoints`.  
   *Zdroj:* guardrails · alignment §15 / public strip · 3B

4. **`stripValueFieldsForPublic()` na hranici API** — rekurzivní strip forbidden keys.  
   *Zdroj:* `MIA_OVERLAY_PUBLIC_RESPONSE.js` · alignment „Public `/overlay-state`“

5. **Zachovat `miaPoints` / `giftCount`** — strip nesmí smazat body metriky.  
   *Zdroj:* totéž · `tests/overlay_public_response_contract.js`

6. **Forbidden keys pokrývají coin/value aliasy** — giftValue, coins, totalCoins, rawValue, diamond*, coin_value…  
   *Zdroj:* `PUBLIC_OVERLAY_FORBIDDEN_KEYS`

7. **Koj public snapshot stejný strip** — `getPublicKojSnapshot`.  
   *Zdroj:* `MIA_OVERLAY_PUBLIC_RESPONSE.js`

8. **Spam / combo HUD bez coins** — graphics_r1 + public response.  
   *Zdroj:* `mia_graphics_r1_contract.js` · alignment spam wave

9. **Interní admin surface smí mít víc** — public ≠ admin (spot-check ❓).  
   *Zdroj:* Etapa 3 capability §8 · DoD backlog

10. **Body ≠ coins v overlay** — UI labels = MIA body / miaPoints.  
    *Zdroj:* alignment § Body · 3B

---

## B. `/overlay-state` poll contract

11. **GET `/overlay-state` = kanonický snapshot pro všechny browser overlays**.  
    *Zdroj:* alignment tok · Etapa 3 capability §11

12. **Poll interval default ~450 ms** — `MIA_OVERLAY_STATE_CACHE_MS` / overlay-poll.  
    *Zdroj:* capability · `lib/overlay-poll.js` · cache ctx

13. **Cache key sleduje voice + video fields** — seq, speak queue, acceptedAt, playbackId.  
    *Zdroj:* `buildOverlayStateCacheKey` · `overlay_public_response_contract`

14. **Gettery peek-only** — mutace expirace jen v `pruneExpiredEphemeral`.  
    *Zdroj:* alignment § „GET side-effect-free“ · `MIA_OVERLAY_STATE.js`

15. **`getOverlaySnapshot` centralizuje prune** — overlayByOwner + ephemeral slots.  
    *Zdroj:* `pruneExpiredEphemeral` · chatFeed / recentParticipants prune

16. **Snapshot obsahuje miaOverlay + kojnozoutOverlay (+ alias kojnozroutOverlay)**.  
    *Zdroj:* `getOverlaySnapshot` · speech-overlay candidates

17. **`voicePlayback` v public body** — pro mirror / lip / speak aura.  
    *Zdroj:* public response · 3E cross-link

18. **Shared poll scheduler** — in-flight guard + exponential backoff (`MiaOverlayPoll`).  
    *Zdroj:* `lib/overlay-poll.js`

19. **Fetch `cache: "no-store"`** v HTML poll path.  
    *Zdroj:* gift/combo/speech HTML fetch patterns

20. **Engine2 profile bypass / filter** — `?profile=` jen při stub ON.  
    *Zdroj:* `engine2/overlay-profiles` · capability

---

## C. Overlay queue / delivery

21. **Fronta při voice lock** — `MIA_OVERLAY_QUEUE`.  
    *Zdroj:* alignment §15 · `MIA_OVERLAY_QUEUE.js`

22. **Priority sort** — T4>T3>T2>T1 > voice stage > chat low.  
    *Zdroj:* `resolvePriority` · `overlay_queue_smoke.js`

23. **Flush po TTS** — `flushOverlayQueue` v delivery runtime.  
    *Zdroj:* alignment §15 · `MIA_DELIVERY_RUNTIME.js` · 3E VT-43

24. **Enqueue při voice block** — overlay čeká, ne ztrácí se.  
    *Zdroj:* delivery runtime queue path

25. **Queue host/ctx wiring** — `MIA_OVERLAY_QUEUE_HOST` / `_CTX`.  
    *Zdroj:* alignment host inventory · `overlay_queue_ctx_contract`

26. **Max speak/overlay chaos limit** — serializace přes voice + queue (ne paralelní chaos).  
    *Zdroj:* Etapa 2/3 poznámky · delivery

27. **Gift prezentace jednou cestou** — orchestrátor → overlay slots (combo/speech/visual).  
    *Zdroj:* alignment §15 · `MIA_GIFT_PRESENTATION.js` (cross 3A)

28. **Overlay timing host** — hold/TTL timing oddělený od ekonomiky.  
    *Zdroj:* `MIA_OVERLAY_TIMING*` · `overlay_timing_ctx`

---

## D. Speech overlay — pick / pin / priority

29. **`pickActiveOverlay` — priority desc → updatedAt desc**.  
    *Zdroj:* alignment §14 odstavec · `speech-overlay.html` · `overlay_layout_contract.js`

30. **Support priority 5–6 nepřebije novější chatter priority 3** — vyšší prio vyhrává; při shodě newest.  
    *Zdroj:* totéž (kánon text: support neprohraje s novějším low-prio — *priorita první*)

31. **Kandidáti: `miaOverlay` / `kojnozoutOverlay` / `kojnozroutOverlay`**.  
    *Zdroj:* `pickActiveOverlay`

32. **Filtr `meta.voiceMirror`** — žádné druhé bliknutí po TTS.  
    *Zdroj:* alignment · speech-overlay · 3E VT-06

33. **Active TTS vždy vyhrává nad pin** — `pickVoiceMirrorOverlay` first.  
    *Zdroj:* `resolveVisibleOverlay` komentář

34. **Pin min read `MIN_READ_MS = 9000`**.  
    *Zdroj:* `speech-overlay.html`

35. **Pin break vyšší prioritou** — `livePriority > pinnedPriority`.  
    *Zdroj:* alignment · layout contract

36. **Pin break novějším textem** — `liveUpdated > pinnedUpdated`.  
    *Zdroj:* `resolveVisibleOverlay`

37. **Pin break expirací** — `now >= pinnedUntil`.  
    *Zdroj:* totéž

38. **Bubble nad hologramem** — `#box` z-index 10, `#miaHolo` z-index 2.  
    *Zdroj:* layout contract · alignment MIA holo

39. **Portrait shrink hologram** — `@media (max-height: 500px)`.  
    *Zdroj:* layout contract

40. **Signature bez holdUntil** — prodloužení TTS hold nepřekreslí stejný text.  
    *Zdroj:* `buildSignature` · speech-overlay

---

## E. Voice-first / music bubble (overlay strana)

41. **Voice-first: bublina skrytá při TTS** — server `applyVoiceOverlayPolicy` nulluje primary overlay.  
    *Zdroj:* alignment §14 · `MIA_SPEAKER_ROUTING.js` · 3E (policy); 3F (HTML mirror)

42. **TTS mirror přes `voicePlayback` / liveCaption** — klient zobrazí mirror, ne voiceMirror row.  
    *Zdroj:* `pickVoiceMirrorOverlay`

43. **Grace window po holdUntil** — audio outlasts server hold (12–20 s).  
    *Zdroj:* `isActiveVoicePlayback`

44. **Gift s hudbou → bublina, TTS potlačen** — overlay text ano.  
    *Zdroj:* alignment §15 · `suppressGiftVoice` / `bubble_over_music` · 3E VT-51

45. **Overlay ≠ doslovný hlas** — music gift path.  
    *Zdroj:* alignment §15 řádek 1

46. **Speaking aura sync z `voicePlayback`**.  
    *Zdroj:* speech-overlay tick · lip/holo

47. **Viewer strip respektuje voicePlayback** (milestone / speak presence).  
    *Zdroj:* `viewer-strip-overlay.html` · capability §7

48. **Lip / holo presence na speech layer** — `#miaHolo`, ne body parts jako trvalý avatar.  
    *Zdroj:* alignment body parts default skryté · 3D OR body OFF

---

## F. Response contract

49. **Oddělený `speech_text` / `overlay_text`** v response engine.  
    *Zdroj:* alignment §14 „2 Response contract“ · `MIA_RESPONSE_ENGINE.js`

50. **`responseContract` nese speech + overlay + intent**.  
    *Zdroj:* `build*Response` return shape

51. **Intent v overlay meta / responseContract.intent**.  
    *Zdroj:* alignment §15 „Stejný intent“ · payloadMeta

52. **Overlay text fallback chain** — `text || overlay_text || speech_text`.  
    *Zdroj:* `resolveOverlayText` v speech-overlay

53. **Owner normalize mia / kojnozout**.  
    *Zdroj:* `normalizeOwner` · speaker routing

54. **HoldMs / holdUntilTs řídí životnost bubliny**.  
    *Zdroj:* overlay state setters · speech isActiveOverlay

---

## G. Gift / combo / spam prezentace

55. **Gift animation overlay bust `37-stream-polish`**.  
    *Zdroj:* `gift-animation-overlay.html` · R1-C · 3D cross

56. **Idle gift overlay průhledný** — žádný permanentní HUD noise.  
    *Zdroj:* capability §6 · HTML transparent idle

57. **Combo moment slot v overlay-state** — `setComboMoment` / expire.  
    *Zdroj:* `MIA_COMBO_OVERLAY` · `combo_overlay_contract`

58. **Spam wave HUD** — `combo-overlay.html` + `combo-wave-ui.js`.  
    *Zdroj:* alignment spam session · R1-C krok 7

59. **Boss / T4+ banner moment** — `buildBossComboMoment`.  
    *Zdroj:* combo contract · 3A cross (tier trigger)

60. **`pickStrongerMoment` priority**.  
    *Zdroj:* `MIA_COMBO_OVERLAY`

61. **T0 flyby / boss cinematic / story moment** — dedicated HTML entrypoints.  
    *Zdroj:* alignment T0/T4+ · `t0-flyby-overlay.html`, `boss-cinematic-overlay.html`

62. **Gift visual slots** — giftVisual / giftAnimationMoment ephemeral.  
    *Zdroj:* `MIA_OVERLAY_STATE` ephemeral keys

---

## H. Viewer / entity / host / NEJSEM TU

63. **Viewer strip = recentParticipants prezentace**.  
    *Zdroj:* alignment §16/§17 · `viewer-strip-overlay.html`

64. **Entity overlay = community / vitals summary badge**.  
    *Zdroj:* `entity-overlay.html` · layout contract

65. **Host team score bar (NEJSEM TU split)** — `hostTeamScore` → entity bar.  
    *Zdroj:* alignment · `MIA_HOST_TEAM_UI` · entity HTML

66. **Host panel / NEJSEM TU overlay** — `host-mode-overlay.html` poll `hostPanel`.  
    *Zdroj:* `host_mode_overlay_contract` · manifest host_mode layer

67. **Live mode → host panel skrytý**.  
    *Zdroj:* `buildHostPanelSnapshot` awayActive false

68. **Away panel + ninja embed URL** — validace URL.  
    *Zdroj:* host mode contract · capability away ⚠ stub behavior (3D/3)

69. **Fan avatary jen prezentace** — ne combat entity.  
    *Zdroj:* alignment §17 Battle

70. **Backpack / bowl overlays poll display** — presentation only (vitals math → 3C).  
    *Zdroj:* alignment batoh · bowl overlay

---

## I. Layout zones / cache bust / Engine2 / entrypoints

71. **Hard zones v `tiktok-viewer-zones.css`** — safe/top/bottom, MIA zone, koj-clear-right.  
    *Zdroj:* CSS header · speech/koj link

72. **Engine2 profiles `main|clean|host|game` default OFF** (`MIA_ENGINE2_STUB`).  
    *Zdroj:* `engine2/overlay-profiles` · `mia_engine2_e3_contract` · note stub

---

## Guardrails checklist (GR-O*)

| ID | Pravidlo |
|----|----------|
| GR-O01 | Overlay nikdy coins — jen miaPoints |
| GR-O02 | Business logika v MIA, ne v HTML |
| GR-O03 | Public strip na `/overlay-state` hranici |
| GR-O04 | Priority-first bubble pick + pin break |
| GR-O05 | voiceMirror filter (žádné double blink) |
| GR-O06 | Music gift → bubble path (overlay ≠ TTS) |
| GR-O07 | Fronta + flush po voice lock |
| GR-O08 | Layout hard zones respektovány v overlay CSS |
