# Etapa 3C — Extrakt kánonních pravidel (Kojnožrout)

Číslovaný seznam pravidel extrahovaných z `docs/KOJNOZROUT_KANON.md`, `docs/KOJNOZROUT_CANON_ALIGNMENT.md` a souvisejících KANON_* dokumentů.

---

## A. Identita a umístění

1. **Kojnožrout = samostatná AI entita** — ne dekorace, ne jen overlay efekt.  
   *Zdroj:* `KOJNOZROUT_KANON.md` § Základní identita · `KANON_MIA_ALIGNMENT.md` § Koj

2. **Trvalá pozice: pravý dolní roh**, vždy viditelný na streamu.  
   *Zdroj:* `KOJNOZROUT_KANON.md` § Umístění · OBS `kojnozrout-runtime.html`

3. **Priorita entit:** Streamer → Kojnožrout → MIA (nejvyšší priorita AI entit).  
   *Zdroj:* `KOJNOZROUT_KANON.md` § Umístění

4. **OBS overlaye:** `kojnozrout-runtime.html` + `kojnozrout-bowl-overlay.html`.  
   *Zdroj:* `KOJNOZROUT_KANON.md` § Umístění

5. **Architektura TikFinity → MIA → OBS** — Koj business logika v MIA, OBS jen renderuje.  
   *Zdroj:* `.cursor/rules/mia-canon.mdc` · `KANON_MIA_AGENT.md`

---

## B. Výchozí chování a aktivace

6. **Default stav:** spí / odpočívá / pozoruje (`watching`, `calm`, `cozy`, `sleepy`) — není hyperaktivní.  
   *Zdroj:* `KOJNOZROUT_KANON.md` § Chování

7. **Nereaguje na všechno** — selektivní aktivace.  
   *Zdroj:* `KOJNOZROUT_KANON.md` § Chování

8. **Aktivace při:** gifech, podpoře, péči, silných emocích, speciálních eventech (T4, duel, combo).  
   *Zdroj:* `KOJNOZROUT_KANON.md` § Aktivace · `KOJNOZROUT_CANON_ALIGNMENT.md`

9. **Overlay polluje `/overlay-state`** — side-effect-free GET pro runtime HTML.  
   *Zdroj:* `.cursor/rules/mia-canon.mdc` · `KANON_MIA_ALIGNMENT.md`

---

## C. Zdroje energie

10. **Chat** — aktivní komunikace → community ping, vitals `communityVibe`.  
    *Zdroj:* `KOJNOZROUT_KANON.md` § Zdroje energie

11. **CARE** — přímá péče diváků (silnější než chat).  
    *Zdroj:* `KOJNOZROUT_KANON.md` § CARE doména

12. **Support / gifty** — naplnění misky, vitals wake, evolution feed points.  
    *Zdroj:* `KOJNOZROUT_KANON.md` · `MIA_GIFT_ECONOMY.md` (komunita/miska)

13. **Nálada komunity** — wellbeing, social state, stream engagement.  
    *Zdroj:* `KOJNOZROUT_KANON.md` · `MIA_KOJNOZROUT_VITALS.js`

14. **Přítomnost diváků** — aktivní sledující jako energie (alignment 🟡).  
    *Zdroj:* `KOJNOZROUT_KANON.md` · `KOJNOZROUT_CANON_ALIGNMENT.md`

---

## D. Doménová hierarchie a CARE

15. **Hierarchie:** Community Activity → CARE → SUPPORT → Major Events (T1–T4).  
    *Zdroj:* `KOJNOZROUT_KANON.md` § Doménová hierarchie

16. **CARE silnější než běžný chat** — validace + vyšší bond impact.  
    *Zdroj:* `KOJNOZROUT_KANON.md` · `MIA_KOJNOZROUT_BOND.js`

17. **6 typů péče:** krmení, podrbání, uklidnění, léčení, pozornost, venčení.  
    *Zdroj:* `KOJNOZROUT_KANON.md` § CARE tabulka

18. **Menu `pece`** → `MIA_KOJNOZROUT_CARE_OPPORTUNITIES.js`.  
    *Zdroj:* `KOJNOZROUT_KANON.md`

19. **CARE validace:** kdo (per-user cooldown), jak často (anti-spam), kontext (soft heal když není nemocný).  
    *Zdroj:* `KOJNOZROUT_KANON.md` · `MIA_KOJNOZROUT_CARE_VALIDATION.js`

20. **CARE výstupy:** Mood, Bond, Trust, Activity, Neglect.  
    *Zdroj:* `KOJNOZROUT_KANON.md` § CARE výstupy

21. **Gift → CARE mapování** — některé gifty spouští care akce.  
    *Zdroj:* `KANON_MIA_ALIGNMENT.md` § Gift animace · 3A G-59

22. **CARE rewards** — roll odměn do batohu po validní péči.  
    *Zdroj:* `MIA_KOJNOZROUT_CARE_REWARD.js` · `KOJNOZROUT_CANON_ALIGNMENT.md`

---

## E. Neglect a bond

23. **Neglect:** dlouho bez péče → smutek, únava, spánek, pasivita.  
    *Zdroj:* `KOJNOZROUT_KANON.md` § NEGLECT

24. **Bond neglect levels** — tierované zanedbání s vizuálním dopadem.  
    *Zdroj:* `MIA_KOJNOZROUT_BOND.js`

25. **Neglect hints v bowl overlay** + `describeBehavior()` v care opportunities.  
    *Zdroj:* `KOJNOZROUT_KANON.md` · `KOJNOZROUT_CANON_ALIGNMENT.md`

26. **Pasivní bond decay** při neaktivitě.  
    *Zdroj:* `MIA_KOJNOZROUT_BOND.js`

---

## F. Bowl systém (miska)

27. **Vizuální pásma:** prázdná 0–30 %, částečně plná 31–94 %, plná ≥ 95 %.  
    *Zdroj:* `KOJNOZROUT_KANON.md` § BOWL systém

28. **Naplňování:** gifty, support, speciální akce, CARE krmení.  
    *Zdroj:* `KOJNOZROUT_KANON.md`

29. **Plná miska ≥ 95 %** → oslava (`celebrate` sprite) + **T4 event**.  
    *Zdroj:* `KOJNOZROUT_KANON.md` · `MIA_BOWL_FULL_VIDEO.js`

30. **Bowl cycle loop** — `processBowlCycle` každých ~750 ms.  
    *Zdroj:* `KOJNOZROUT_KANON.md` · `MIA_RUNTIME_LOOPS.js`

31. **Reset po full hold** (~3 s) po dosažení plné misky.  
    *Zdroj:* `KOJNOZROUT_BOWL_ENGINE.js` · 3A G-51

32. **Support → bowl gain** — MIA body převod na % misky (Koj engine).  
    *Zdroj:* `MIA_KOJNOZROUT_ENGINE.js` `applySupportToKojnozout` · 3B cross-link

33. **Public kojDisplay bez coin metrik** — strip na `/overlay-state`.  
    *Zdroj:* `.cursor/rules/mia-canon.mdc` · 3A G-07 · 3B guardrails

---

## G. Eventy a reakční pořadí

34. **T4 speciální** — aktivace plnou miskou (mimo běžný gift tier flow).  
    *Zdroj:* `KOJNOZROUT_KANON.md` § Eventy

35. **Reakční pořadí: MIA první, Koj poté** (`MIA_KOJNOZROUT_REACTION_ORDER.js`).  
    *Zdroj:* `KOJNOZROUT_KANON.md` § Reakční logika

36. **Emoční intenty → deferred Koj companion** (~3 s zpoždění).  
    *Zdroj:* `KOJNOZROUT_KANON.md` · `DEFAULT_KOJ_DELAY_MS = 3200`

37. **Emoční chat: MIA odpoví, Koj companion overlay** — ne primary TTS u rutiny.  
    *Zdroj:* `KANON_MIA_ALIGNMENT.md` § Koj = pet, ne hlavní řečník

---

## H. Nálady, sprity, display

38. **Vitals → expressive mood** (sleepy, sick, sad, hungry…).  
    *Zdroj:* `MIA_KOJNOZROUT_VITALS.js` · `MIA_KOJNOZROUT_DISPLAY.js`

39. **Kontextové nálady:** combo, duel, gift, celebrate, video watch chain.  
    *Zdroj:* `KOJNOZROUT_KANON.md` § Nálady tabulka

40. **Krmení eating rotace** — `eating-01`…`eating-12` (kánon); implementace rozšířena.  
    *Zdroj:* `KOJNOZROUT_KANON.md` · `KOJNOZROUT_MOOD_DERIVE.js`

41. **Video reakce:** `watch` → `groove` → `dance` → `hype`.  
    *Zdroj:* `KOJNOZROUT_KANON.md` · `MIA_KOJNOZROUT_DISPLAY.js`

42. **Pose multi-frame cykly** — jediný zdroj `pose-catalog.js` z `kojnozrout_pose_frames.js`.  
    *Zdroj:* `KOJNOZROUT_KANON.md` § Vícepozicová animace

43. **Wander jen u CALM_WANDER_MOODS** — walk-a/b sync s krokem.  
    *Zdroj:* `KOJNOZROUT_KANON.md` · `koj-runtime-pose.js`

44. **MIA propriocepce** — overlay POST `/mia/koj/render-report`.  
    *Zdroj:* `KOJNOZROUT_KANON.md` · `kojnozrout-runtime.html`

45. **290 PNG v moods/** (kánon popis; expanded set v repu).  
    *Zdroj:* `KOJNOZROUT_KANON.md`

---

## I. Walk, celebration, evoluce

46. **Venčení (CARE walk)** — `MIA_KOJNOZROUT_WALK.js` (kánon stub+, kód funkční).  
    *Zdroj:* `KOJNOZROUT_KANON.md` · `KOJNOZROUT_CANON_ALIGNMENT.md`

47. **Jednotná walk visual cesta** — CARE walk vs ambient wander.  
    *Zdroj:* `tests/kojnozout_walk_unify_contract.js`

48. **Evoluce tiery** egg → legend podle feed points / komunity.  
    *Zdroj:* `MIA_KOJNOZROUT_EVOLUTION.js`

49. **Celebrate sprite při FULL_BOWL_TRIGGER** (~6,5 s pulse).  
    *Zdroj:* `MIA_KOJNOZROUT_DISPLAY.js` · `KOJNOZROUT_BOWL_ENGINE.js`

---

## J. Batoh, duel, arena

50. **Batoh per user** — `item`, `batoh`, `použij …` · overlay backpack.  
    *Zdroj:* `KOJNOZROUT_KANON.md` · `MIA_KOJNOZROUT_BACKPACK.js`

51. **Duel cross-stream** — 5 min, bodový závod v MIA bodech, ne HP video.  
    *Zdroj:* `KOJNOZROUT_KANON.md` · `MIA_KOJNOZROUT_DUEL.js` · 3B

52. **Platform arena** — 4 coin-žrouti, team bar, battle choreografie.  
    *Zdroj:* `KOJNOZROUT_CANON_ALIGNMENT.md` · `MIA_PLATFORM_ARENA.js`

53. **Battle pose cykly** — attack/hit/win/defend z platform forms.  
    *Zdroj:* `MIA_KOJ_BATTLE_CHOREOGRAPHY.js`

54. **Duel power z giftů** — miaPoints, ne coin overlay.  
    *Zdroj:* 3B BE-* · `MIA_KOJNOZROUT_DUEL.js`

---

## K. Speaker routing

55. **Koj NENÍ default chat speaker** — rutinní chat → MIA primary TTS.  
    *Zdroj:* `KANON_MIA_ALIGNMENT.md` · `MIA_SPEAKER_ROUTING.js`

56. **Gift / velká událost → Koj voice primary** (T1+ dle policy).  
    *Zdroj:* `KANON_MIA_ALIGNMENT.md` § Speaker

57. **MIA primary + deferred Koj companion** u emočních odpovědí.  
    *Zdroj:* `MIA_SPEAKER_ROUTING.js` · `speaker_routing_contract.js`

58. **Dual voice OFF by default** — `MIA_DUAL_VOICE=1` opt-in.  
    *Zdroj:* `MIA_SPEAKER_ROUTING.js`

---

## L. Persistence a test modes

59. **Persist core Koj state** — `data/kojnozout-state.json` (bowl, vitals, bond, evolution…).  
    *Zdroj:* `MIA_KOJNOZROUT_PERSISTENCE.js`

60. **Persist world** — backpack + duel v `data/kojnozout-world.json`.  
    *Zdroj:* `MIA_KOJNOZROUT_WORLD_PERSISTENCE.js`

61. **Test mode env** — `MIA_KOJ_TEST_MODE`, probud/duel streamer commands.  
    *Zdroj:* `MIA_KOJNOZROUT_TEST_MODE.js`

---

## M. Budoucí (mimo scope implementace)

62. **Avatar viewer interakce** — ⬜ plánováno.  
    *Zdroj:* `KOJNOZROUT_KANON.md` · `KOJNOZROUT_CANON_ALIGNMENT.md`

63. **Song playlist queue** — ⬜ plánováno.

64. **Režim NEJSEM TU** — ⬜ plná integrace plánována.

65. **Docházka bonus batohu** — ⬜ plánováno.

---

**Celkem extrahováno: 65 pravidel** (61 implementačně relevantních + 4 budoucí ⬜).
