# Etapa 4 — Cross-module contracts (XC-*)

**Datum:** 2026-07-28  
**Prefix:** `XC-01`…`XC-62` (62 cross pravidel)  
**Charakter:** ověřitelné **interakční** pravidlo mezi moduly / E2E handoff — ne re-listing všech module internals (ty zůstávají v 3A–3I).

**Guardrails cross (GR-X01…08)** — viz sekce Z na konci; mapují se do XC, ne jako samostatná matrix řada.

---

## A. Architektura & ownership (XC-01…08)

1. **XC-01 — Tok TikFinity → MIA → OBS**  
   Ingest a rozhodování v MIA; OBS přijímá browser/media/WS výstupy.  
   *Zdroj:* guardrails · Etapa 2 · 3D OR-01

2. **XC-02 — Business logika výhradně v MIA**  
   Overlay HTML a OBS skripty nepočítají economy/tier/spam/CARE.  
   *Zdroj:* guardrails · 3F · 3D

3. **XC-03 — OBS = render / transport vrstva**  
   Manifest + hands + media sloty; žádný gift ledger v OBS.  
   *Zdroj:* 3D · `MIA_OBS_LIVE_MANIFEST.js`

4. **XC-04 — Public overlay nikdy coins**  
   `/overlay-state` a public snapshoty jen `miaPoints` (strip).  
   *Zdroj:* `MIA_OVERLAY_PUBLIC_RESPONSE.js` · 3B · 3F

5. **XC-05 — Dual voice default OFF**  
   Companion/dual TTS jen při `MIA_DUAL_VOICE=1`.  
   *Zdroj:* `MIA_DUAL_VOICE.js` · 3E VT-* · Etapa 2 flags

6. **XC-06 — Per-tier `rotationIndexByTier` bez cross-tier resetu**  
   Postup v jednom tieru nesmí resetovat index jiného tieru.  
   *Zdroj:* `MIA_VIDEO_ENGINE.js` · guardrails · 3A

7. **XC-07 — Capability ≠ compliance ≠ Cross**  
   Etapa 3 „funguje“, 3A–3I „shoda“, 4 „spolupráce“.  
   *Zdroj:* metodika 3A–3I · tento pack

8. **XC-08 — Prior 3A–3I zůstávají SoT pro internály**  
   Cross cituje; při konfliktu detailů platí modulový audit.  
   *Zdroj:* `00_SCOPE.md` · SUMMARY 3*

---

## B. Gift → Economy → Overlay strip (XC-09…15) · S01

9. **XC-09 — Gift → Support resolver → miaPoints**  
   Coin vstup → konverze (7.5) → body pro HUD/economy.  
   *Zdroj:* 3B · `MIA_SUPPORT_RESOLVER` · `stream_economy_config.json`

10. **XC-10 — Strip hranice na public API**  
    `stripValueFieldsForPublic` odstraňuje coins/giftValue z public body.  
    *Zdroj:* 3B/3F · `MIA_OVERLAY_PUBLIC_RESPONSE.js`

11. **XC-11 — Single economy config pro tier/spam prahy**  
    Shared config je SoT; shadow/runtime nesmí tiše divergovat bez záznamu.  
    *Zdroj:* 3A/3B · GAP-A01/B01

12. **XC-12 — Spam milestone T4 ↔ video reward tier musí být konzistentní napříč engine↔shadow↔HUD**  
    Wave HUD (miaPoints) a shadow video cap nesmí lhát divákovi.  
    *Zdroj:* 3A GAP-01 · 3B GAP-B01 · `engine_shadow_runtime.js`

13. **XC-13 — Ledger / supporter profile v miaPoints**  
    XP/level/streak metadata neexponují coins do public overlay.  
    *Zdroj:* 3B · `MIA_GIFT_SUPPORTER_PROFILE` · viewer-memory

14. **XC-14 — Host team split v miaPoints (když aktivní)**  
    Team bar z MIA state; Away/NEJSEM TU nesmí rozbít strip guard.  
    *Zdroj:* 3B GAP-B11 · 3F host panel · 3D Away

15. **XC-15 — Viewer-memory persist bez chat textu**  
    Economy hydrate po restartu bez leak chat do disk/public.  
    *Zdroj:* 3G · `core/viewer-memory.js`

---

## C. Gift → Video / OBS media + Overlay HUD (XC-16…21) · S02

16. **XC-16 — Gift → Video Engine tier pool**  
    Playback tier z coin/catalog; media výběr v MIA.  
    *Zdroj:* 3A · `MIA_VIDEO_ENGINE.js`

17. **XC-17 — Rotace uvnitř tieru zachována napříč po sobě jdoucími gifty**  
    Index tieru roste; jiný tier nezávislý.  
    *Zdroj:* 3A · XC-06

18. **XC-18 — Gift media sloty T1–T5 v OBS**  
    OBS zobrazuje media vybrané MIA; neřeší pool.  
    *Zdroj:* 3D OR-38/58 · Etapa 2 gift flow

19. **XC-19 — Gift animation overlay (v37) polluje MIA state**  
    HUD entrypoint bez coins.  
    *Zdroj:* 3F OV-55… · 3D bust 37

20. **XC-20 — Combo / spam wave HUD ↔ spam session engine**  
    Wave UI čte MIA body/session; ne lokální coin math.  
    *Zdroj:* 3A · 3F combo contracts

21. **XC-21 — `rotationIndexByTier` po process restart = ephemeral (dokumentovaný handoff)**  
    Restart může skočit na začátek poolu; to není cross-tier reset za běhu.  
    *Zdroj:* 3G GAP-G06 · 3A

---

## D. Gift → Voice suppress / bubble vs TTS (XC-22…27) · S03

22. **XC-22 — Music gift → bubble_over_music + suppressGiftVoice**  
    TTS potlačen; textová bublina povolena.  
    *Zdroj:* 3E · `MIA_SPEAKER_ROUTING.js` · `MIA_GIFT_PRESENTATION.js`

23. **XC-23 — Voice-first: při TTS bublina skrytá**  
    Overlay respektuje voiceHold / voiceMirror.  
    *Zdroj:* 3E · 3F OV-33…35

24. **XC-24 — Speak queue + voiceHoldUntilTs napříč delivery**  
    Burst neparalelizuje neomezeně TTS.  
    *Zdroj:* 3E · `MIA_DELIVERY_RUNTIME.js`

25. **XC-25 — Flush overlay fronty po dokončení TTS**  
    Delivery → overlay queue handoff.  
    *Zdroj:* 3E GAP-E03 · 3F GAP-F02 · `flushOverlayQueue`

26. **XC-26 — Dual OFF: Koj gift speaker bez paralelní companion chain**  
    Default single authority path.  
    *Zdroj:* 3E · 3C speaker notes

27. **XC-27 — Single `MIA_VOICE` sink + anti-echo vůči Desktop/video**  
    Cross 3D transport + 3E policy.  
    *Zdroj:* 3D OR-57/62 · 3E VT-07/09 · GAP-E01/D13

---

## E. Gift/Support → Koj / Bowl → Overlay/OBS (XC-28…33) · S04

28. **XC-28 — Gift/support → bowl fill v MIA → kojDisplay**  
    Fill formula v Koj/economy; overlay jen zobrazí.  
    *Zdroj:* 3A bowl · 3C · Etapa 2 `04_FLOW_KOJ_BOWL`

29. **XC-29 — Vizuál „plná miska“ (≥95 %) ↔ T4 full trigger (100 %) konzistence**  
    Cross 3A+3C: celebrate vs `shouldTriggerFullBowl`.  
    *Zdroj:* 3C GAP-C01 · 3A GAP-03

30. **XC-30 — CARE / bond → kojDisplay → OBS Koj browser**  
    Vitals/mood v MIA; OBS `MIA_KOJ_RUNTIME` poll.  
    *Zdroj:* 3C · 3D OR-36/49 · 3F entity

31. **XC-31 — CARE výstupy: Trust field (kánon) vs bond-only (runtime)**  
    Cross očekávání CARE→overlay metadata.  
    *Zdroj:* 3C KJ-23 ❌ · GAP-C02

32. **XC-32 — Reaction order: MIA first, Koj deferred companion**  
    Gift reakční řetězec timing.  
    *Zdroj:* 3C · `MIA_KOJNOZROUT_REACTION_ORDER.js`

33. **XC-33 — Public `kojDisplay` bez coin metrik**  
    Strip / public snapshot.  
    *Zdroj:* 3C · `koj_public_snapshot_contract`

---

## F. Gift → Battle → Overlay (XC-34…39) · S05

34. **XC-34 — Gift → World Layer → duel/arena activity**  
    `MIA_WORLD_LAYER_RUNTIME` mapuje support/miaPoints do battle.  
    *Zdroj:* 3H · `MIA_WORLD_LAYER_RUNTIME.js`

35. **XC-35 — Battle power / HUD v miaPoints (ne coins)**  
    Arena/duel overlay pts.  
    *Zdroj:* 3H BT-14/45 · 3B · 3F

36. **XC-36 — Dva battle modely (duel peer vs platform arena) sdílí world layer, nejsou jedna FSM**  
    Cross dokumentovaný dual-path.  
    *Zdroj:* 3H GAP-H02

37. **XC-37 — Item use → `itemPower` v duelu**  
    Inventář/batoh → battle scoring handoff.  
    *Zdroj:* 3H · `handleItemCommand`

38. **XC-38 — Paralelní 2-stream duel sync (live)**  
    Unit HTTP sync ≠ live dual-host.  
    *Zdroj:* 3H GAP-H01 · 3C GAP-C08

39. **XC-39 — Arena overlay + `obs:ensure-arena-battle`**  
    MIA state → HTML → OBS browser.  
    *Zdroj:* 3H BT-42/67 · 3D OR-68

---

## G. Chat/Speaker → Voice → Overlay bubble → OBS Voice (XC-40…44) · S06

40. **XC-40 — Chat → speaker routing → Edge TTS**  
    Default MIA u rutinního chatu (Koj lanes u gift).  
    *Zdroj:* 3E · 3C GAP-C05 (test gap)

41. **XC-41 — TTS playing → speech overlay hide / voiceMirror**  
    Cross voice↔overlay.  
    *Zdroj:* 3E · 3F

42. **XC-42 — TTS audio → `MIA_VOICE` browser (jediný sink)**  
    Cross delivery↔OBS.  
    *Zdroj:* 3E · 3D · `obs:ensure-voice` / revive

43. **XC-43 — Overlay queue priority + pin vs TTS win**  
    PickActiveOverlay handoff.  
    *Zdroj:* 3F · 3E VT-06/47

44. **XC-44 — Gift+chat burst: voice queue + overlay queue bez dvojitého echa**  
    Integrační křehkost.  
    *Zdroj:* 3E GAP-E02 · 3F GAP-F04

---

## H. Overlay poll ← MIA (no coins) (XC-45…47) · S07

45. **XC-45 — `/overlay-state` vždy přes public strip**  
    Jediná veřejná hranice pro browser sources.  
    *Zdroj:* 3F · 3B · OR-06

46. **XC-46 — Overlay HTML = presentation; žádná economy math**  
    Poll + render.  
    *Zdroj:* XC-02 · 3F

47. **XC-47 — Admin/private surfaces mohou mít coins; nesmí uniknout do public poll**  
    Disciplína kanálů.  
    *Zdroj:* 3B GAP-B05/B10 · 3F GAP-F09

---

## I. OBS reconnect / voice revive (XC-48…51) · S08

48. **XC-48 — OBS crash → watchdog/bootstrap reconnect path existuje**  
    Kód chain; live e2e samostatně.  
    *Zdroj:* 3D GAP-D01 · 3G GAP-G08 · `MIA_OBS_BOOTSTRAP` / stream-watchdog

49. **XC-49 — `obs:revive-voice` / ensure-voice obnoví `MIA_VOICE` sink**  
    Cross 3D+3E ops skripty.  
    *Zdroj:* 3E · 3D · `scripts/obs_revive_voice.js`

50. **XC-50 — Post-connect: hands → layout → voice → layers**  
    Deterministický bootstrap chain.  
    *Zdroj:* 3D · `MIA_OBS_POST_CONNECT_RUNTIME.js`

51. **XC-51 — Body parts `MIA_HEAD…FEET` default OFF na live**  
    Editor/catalog nesmí omylem zapnout live body vedle bubble.  
    *Zdroj:* 3D OR-08…10 · 3I ED-35 · 3F

---

## J. Persistence → restart → hydrate (XC-52…55) · S09

52. **XC-52 — Boot `MIA_RUNTIME_STATE_SEED_CTX` hydratuje Koj/runtime ze disk JSON**  
    Compose seed bez wipe.  
    *Zdroj:* 3G · `composeKojSeed` · runtime_state_seed_ctx

53. **XC-53 — Multi-file konzistence Koj + runtime-state + economy při debounce**  
    Cross-store timing.  
    *Zdroj:* 3G GAP-G02

54. **XC-54 — Overlay state + voice hold = ephemeral po restartu (by design)**  
    Disk = Koj/economy/runtime; UI/voice fronty ne.  
    *Zdroj:* 3G GAP-G16 · 3E/3F

55. **XC-55 — Atomic write jen u části storeů; Koj/economy direct write**  
    Durability handoff dokumentován.  
    *Zdroj:* 3G GAP-G04 · PR-09…14

---

## K. Crash / mid-write recovery (XC-56…57) · S10

56. **XC-56 — Corrupt JSON → soft-fail empty; chybí `.bak` / quarantine**  
    Recovery bez last-good.  
    *Zdroj:* 3G GAP-G01

57. **XC-57 — Kill Node mid-write → konzistence napříč soubory**  
    Live e2e **nikdy**.  
    *Zdroj:* 3G GAP-G03

---

## L. Editor export → Animation Bank → runtime gift (XC-58…60) · S11

58. **XC-58 — Editor / Paint mimo `processEvent` ingest**  
    Tooling nezasahuje live pipeline.  
    *Zdroj:* 3I · Etapa 2 editor flow

59. **XC-59 — Export timeline → Animation Bank (+ C1–C6 / gate) → gift resolve asset**  
    Asset handoff 3I→3A.  
    *Zdroj:* 3I ED-55 · GAP-I05 · 3A gift map/bank

60. **XC-60 — Staging ≠ live; production gate před promote**  
    Editor nesmí obejít live guard.  
    *Zdroj:* 3I · `productionGate.js`

---

## M. Host / Away / dual stream (XC-61…62) · S12

61. **XC-61 — Away / NEJSEM TU: OBS vrstvy + panel existují; full host flow stub**  
    Cross 3D+3F.  
    *Zdroj:* 3D GAP-D06 · 3F GAP-F05 · 3B GAP-B11

62. **XC-62 — Dual-host / 2× OBS battle nebo Away na dvou streamech**  
    Unit ≠ live.  
    *Zdroj:* 3H GAP-H01 · XC-38

---

## Z. Guardrails cross (GR-X01…08)

| ID | Pravidlo | Mapuje na |
|----|----------|-----------|
| GR-X01 | TikFinity → MIA → OBS | XC-01…03 |
| GR-X02 | Business logika v MIA | XC-02, XC-46 |
| GR-X03 | Overlay public = miaPoints only | XC-04, XC-10, XC-45 |
| GR-X04 | Dual voice default OFF | XC-05, XC-26 |
| GR-X05 | `rotationIndexByTier` no cross-tier reset | XC-06, XC-17 |
| GR-X06 | OBS bez economy/CARE math | XC-03, XC-18 |
| GR-X07 | Persist: disk SoT pro Koj/economy; overlay ephemeral | XC-52, XC-54 |
| GR-X08 | Editor mimo live ingest | XC-58, XC-60 |

---

## Počet

| | |
|--|--|
| Cross contracts XC-* | **62** |
| Guardrails GR-X* | **8** |
| Scénáře S01–S12 | **12** |

*Kontrola: XC-01…XC-62 = 62.*

---

## Vlastníci cross-kontraktů (údržba)

Při změně modulu znovu ověř kontrakty, kde je modul **primární** nebo **spoluúčastník**.  
Primární = SoT chování; spoluúčastník = handoff / spotřebitel výstupu.

| Cross Contract | Primární vlastník | Spoluúčastníci | Scénář |
| -------------- | ----------------- | -------------- | ------ |
| XC-01 | Guardrails / Etapa 2 | 3D | — |
| XC-02 | Guardrails | 3D, 3F | — |
| XC-03 | **3D** | — | — |
| XC-04 | **3B** | 3F | S07 |
| XC-05 | **3E** | Etapa 2 flags | S03 |
| XC-06 | **3A** | Video engine | S02 |
| XC-07 | Metodika | 3A–3I, 4 | — |
| XC-08 | Metodika | 3A–3I | — |
| XC-09 | **3B** | 3A | S01 |
| XC-10 | **3B** | 3F | S01 |
| XC-11 | **3A** + **3B** | — | S01 |
| XC-12 | **3A** + **3B** | Overlay HUD | S01 |
| XC-13 | **3B** | 3G viewer-memory | S01 |
| XC-14 | **3B** | 3F, 3D Away | S12 |
| XC-15 | **3G** | 3B | S09 |
| XC-16 | **3A** | — | S02 |
| XC-17 | **3A** | XC-06 | S02 |
| XC-18 | **3D** | 3A | S02 |
| XC-19 | **3F** | 3D bust | S02 |
| XC-20 | **3A** | 3F | S02 |
| XC-21 | **3G** | 3A | S09 |
| XC-22 | **3E** | 3A gift presentation | S03 |
| XC-23 | **3E** | 3F | S03 |
| XC-24 | **3E** | — | S03 |
| XC-25 | **3E** + **3F** | — | S03 |
| XC-26 | **3E** | 3C | S03 |
| XC-27 | **3E** + **3D** | — | S06/S08 |
| XC-28 | **3C** | 3A bowl | S04 |
| XC-29 | **3C** + **3A** | OBS/video | S04 |
| XC-30 | **3C** | 3D, 3F | S04 |
| XC-31 | **3C** | Overlay CARE meta | S04 |
| XC-32 | **3C** | Gift reaction | S04 |
| XC-33 | **3C** | 3B strip | S04 |
| XC-34 | **3H** | Gift/world layer | S05 |
| XC-35 | **3H** | 3B, 3F | S05 |
| XC-36 | **3H** | — | S05 |
| XC-37 | **3H** | Inventář / 3G | S05 |
| XC-38 | **3H** | 3C | S05/S12 |
| XC-39 | **3H** | 3D | S05 |
| XC-40 | **3E** | 3C | S06 |
| XC-41 | **3E** + **3F** | — | S06 |
| XC-42 | **3E** + **3D** | — | S06/S08 |
| XC-43 | **3F** | 3E | S06 |
| XC-44 | **3E** + **3F** | — | S06 |
| XC-45 | **3F** | 3B, 3D | S07 |
| XC-46 | **3F** | XC-02 | S07 |
| XC-47 | **3B** | 3F | S07 |
| XC-48 | **3D** | 3G watchdog | S08 |
| XC-49 | **3E** + **3D** | — | S08 |
| XC-50 | **3D** | — | S08 |
| XC-51 | **3D** + **3I** | 3F | S08 |
| XC-52 | **3G** | 3C | S09 |
| XC-53 | **3G** | 3B, 3C | S09 |
| XC-54 | **3G** | 3E, 3F | S09 |
| XC-55 | **3G** | — | S09 |
| XC-56 | **3G** | — | S10 |
| XC-57 | **3G** | — | S10 |
| XC-58 | **3I** | Etapa 2 | S11 |
| XC-59 | **3I** + **3A** | — | S11 |
| XC-60 | **3I** | Live promote | S11 |
| XC-61 | **3D** + **3F** | 3B | S12 |
| XC-62 | **3H** | XC-38, 3D | S12 |

### Rychlá mapa: modul → XC k re-verifikaci

| Při změně… | Znovu ověř XC |
|------------|---------------|
| **3A Gifts** | XC-06, 11–12, 16–21, 28–29, 59 |
| **3B Economy** | XC-04, 09–15, 35, 45, 47, 53 |
| **3C Koj** | XC-26, 28–33, 38, 40, 52–53 |
| **3D OBS** | XC-01–03, 18, 27, 39, 42, 48–51, 61–62 |
| **3E Voice** | XC-05, 22–27, 40–44, 49, 54 |
| **3F Overlay** | XC-02, 10, 14, 19–20, 23, 25, 41, 43–47, 61 |
| **3G Persistence** | XC-15, 21, 52–57 |
| **3H Battle** | XC-34–39, 62 |
| **3I Editor** | XC-51, 58–60 |
