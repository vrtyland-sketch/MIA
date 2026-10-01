# Etapa 3A — Extrakt kánonních pravidel (gifts / bowl / tier / overlay)

Číslovaný seznam pravidel extrahovaných z kánonu. Každé pravidlo má zdrojový dokument.

---

## A. Architektura a tok

1. **TikFinity → MIA → OBS** — platforma ne rozhoduje ani nerenderuje; OBS jen renderuje, business logika v MIA.  
   *Zdroj:* `.cursor/rules/mia-canon.mdc` § Architektura · `docs/KANON_MIA_AGENT.md` · `docs/KANON_SOUCASNY_PREHLED.md`

2. **Streamer.bot se nepoužívá** v produkčním toku.  
   *Zdroj:* `.cursor/rules/mia-canon.mdc` · `docs/KANON_SOUCASNY_PREHLED.md`

3. **Gift z platformy = RAW událost** — ingest jen sběr, bez business logiky; normalizace → gift map → decision → reakce.  
   *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Základní princip

4. **Overlaye pollují `/overlay-state`** — side-effect-free GET.  
   *Zdroj:* `.cursor/rules/mia-canon.mdc` · `docs/KANON_MIA_ALIGNMENT.md` § Stream Engine

5. **Tok checklist:** RAW → ingest → normalize → gift map → support resolver → decision (spam, duel) → MIA/Koj → body/miska/inventář/overlay/TTS/video.  
   *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Tok podle kánonu

---

## B. Overlay a MIA body (tvrdá pravidla)

6. **Overlay nikdy neukazuje coins, diamondy, Kč, €, hodnotu giftu** — jen MIA body (`miaPoints`), profil, nickname, logo platformy.  
   *Zdroj:* `.cursor/rules/mia-canon.mdc` § Tvrdá runtime pravidla · `docs/MIA_GIFT_ECONOMY.md` § Co overlay neukazuje · `docs/KANON_MIA_AGENT.md` §18

7. **`giftValue` / `coins` jen interně** — nesmí do public overlay payloadu pro diváky.  
   *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Resolved gift context · `docs/KANON_MIA_ALIGNMENT.md` §5

8. **Public API sanitizace** na hranici `/overlay-state` — strip coin/value polí rekurzivně.  
   *Zdroj:* `docs/KANON_MIA_ALIGNMENT.md` (řádek overlay public) · `docs/KANON_SOUCASNY_PREHLED.md`

---

## C. Tier systém T0–T6

9. **T0 = interakce** (like, follow, share, komentář) — ne gift; +XP, avatar, statistiky.  
   *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Tier 0 · `docs/KANON_MIA_AGENT.md` §10b

10. **Coin rozsahy stream tierů (interní):**

| Tier | Coins (celkem) |
|------|----------------|
| T1 | 1–99 |
| T2 | 100–999 |
| T3 | 1 000–4 999 |
| T4 | 5 000–9 999 |
| T5 | 10 000–24 999 |
| T6 | 25 000+ |

*Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Tier systém · `docs/KANON_MIA_AGENT.md` §10b · `docs/KANON_SOUCASNY_PREHLED.md`

11. **Každý tier = balíček efektů** (video, animace, hlas, overlay, duel…) — ne jen video slot.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Tier systém

12. **T4 Boss** — stop běžných efektů, „PŘIŠEL BOSS“, boss event.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` · `docs/KANON_MIA_ALIGNMENT.md` § Gift Economy

13. **T5 Mega Boss** — cutscéna, MIA interrupt, speciální hudba, může vyvolat duel.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md`

14. **T6 Legenda** — celá stream událost, síň slávy; OBS video pool mapuje T6 → T5 sloty.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` · `docs/KANON_SOUCASNY_PREHLED.md` · `docs/KANON_MIA_ALIGNMENT.md` §6

15. **1 coin = 1 XP (vize produktu)** — kumulativní XP uživatele; resolver může používat `miaPoints = coins × 7.5`.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Gift XP

16. **MIA_POINTS_PER_COIN = 7.5** — jednotná konfigurace v `shared/stream_economy_config.json`.  
    *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md` · `docs/KANON_MIA_ALIGNMENT.md`

17. **Tři druhy „T2/T3/T4“ nesmí se plést:** `coinTier` (jen coiny) · `streamTier`/`obsTier` (max coin, katalog) · `spamRewardTier` (milestone vlny v MIA bodech).  
    *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md` § Spam a kontrola hluku

18. **Playback tier = max(coinTier, katalogový tier gift mapy)** — Lion/Galaxy nejsou T1 video za málo coinů.  
    *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md` § Gift mapa · `docs/KANON_MIA_ALIGNMENT.md`

---

## D. Video rotace

19. **Rotace T1_01 → T1_02 → T1_03 → T1_04 → T1_01** per tier pool.  
    *Zdroj:* `docs/KANON_MIA_AGENT.md` §6 · `docs/KANON_MIA_ALIGNMENT.md` §6

20. **Vlastní index per tier** (`rotationIndexByTier`) — **bez resetu** při střídání tierů (T1→T3→T1 pokračuje T1 index).  
    *Zdroj:* `.cursor/rules/mia-canon.mdc` · `docs/KANON_MIA_AGENT.md` §6 · `docs/KANON_MIA_ALIGNMENT.md`

21. **Dlouhé audio >60 s hraje celé** — neusekávat playback.  
    *Zdroj:* `docs/KANON_MIA_ALIGNMENT.md` §6

22. **T2+ audio policy** — od T2 jen videa se zvukem; bublina místo Koj TTS kde applicable.  
    *Zdroj:* `docs/KANON_MIA_ALIGNMENT.md` § Graphics (T2+ audio policy)

---

## E. Gift Map a metadata

23. **Gift Map mapuje název → význam**, ne Kč; coin rozsah určuje stream tier, název animaci/Koj reakci.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Gift Map — mapování významu

24. **Enterprise gift mapa = `shared/gifts/`** — jediné místo sémantiky (tier, overlay, voice, bowl, XP, rewards).  
    *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md` · `docs/KANON_MIA_ALIGNMENT.md` §10

25. **Legacy `scripts/MIA_GIFT_MAP.js`** = animační `giftProfile` (effectProgram, exactNames, chatLoop) — **ne** řídicí ekonomika.  
    *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md` · `docs/KANON_MIA_AGENT.md` §10

26. **Každý gift v mapě má dimenze:** hodnota (interní), význam, animace, reakce MIA, duel power, profil XP, komunita (miska, bond), odměny, žebříček.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Co má mít každý gift

27. **Gift Map pole:** `key` / `exactNames` pro TikTok názvy; alias normalizace (Rose, 🌹, Růže).  
    *Zdroj:* `docs/KANON_MIA_AGENT.md` §10 · `docs/KANON_MIA_ALIGNMENT.md`

28. **Priorita ≥ 8 → vždy full ack + video**; video fronta řadí podle priority.  
    *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md`

29. **Overlay mapa: `showCoins: false`, `showMiaPoints: true`.**  
    *Zdroj:* `shared/gifts/resolver.js` design · kánon overlay policy

30. **Resolved gift context JSON** pro decision layer — pole coins/giftValue ne do overlay.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Resolved gift context

---

## F. Combo, streak, levely

31. **Combo ×10 / ×50 / ×100** → COMBO / SUPER COMBO / ULTIMATE COMBO overlay.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Combo systém

32. **Gift streak bonus:** 3 dny +10 %, 7 dní +25 %, 30 dní +100 % XP.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Gift Streak

33. **Gift Level Lv1–Lv8** (Nováček → Mýtus) z kumulativního XP.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Gift Level

34. **Gift streak (MIA_GIFT_ECONOMY roadmap)** — dříve 🔴 per-user streak cache; alignment mapa uvádí 🟢 runtime.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` vs `docs/KANON_MIA_ALIGNMENT.md` § Gift Economy

---

## G. Spam session a anti-hluk

35. **Community gift-wave** (`engine_spam_session`) — vlna dárků → milestone odměna (`spamRewardTier`) — pozitivní hra.  
    *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md` · `docs/MIA_GIFT_ECONOMY.md`

36. **Spam okno default 15 s**, min sequence count 3; prahy v MIA bodech: T2≈750, T3≈7500, T4≈37500 (~100/1000/5000 coins × 7.5).  
    *Zdroj:* `shared/stream_economy_config.json` · `docs/KANON_SOUCASNY_PREHLED.md`

37. **Per-user ack throttle** — stejný člověk nedostane díky dokola; oddělené od community wave.  
    *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md`

38. **Bypass throttle:** priorita ≥ 8, T3+, spam milestone; bowl/Koj se krmí i při silent ack.  
    *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md`

39. **Velký gift mimo spam** — T3/T4/T5/T6 a gift map priority mají full ack + video mimo spam wave throttling.  
    *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md` · `docs/KANON_MIA_AGENT.md` (implicitně tier efekty)

40. **Spam reward tier ≠ stream tier** jednotlivého giftu.  
    *Zdroj:* `MIA_NEXT/engine_spam_session.js` header comment · `docs/KANON_SOUCASNY_PREHLED.md`

---

## H. Bowl (Kojnožrout)

41. **Bowl stavy:** prázdná 0–30 %, částečně plná 31–94 %, plná ≥ 95 % → oslava + **T4 event**.  
    *Zdroj:* `docs/KOJNOZROUT_KANON.md` § BOWL systém

42. **Naplňování misky:** gifty, support, speciální akce, CARE krmení.  
    *Zdroj:* `docs/KOJNOZROUT_KANON.md`

43. **Vyvrcholení plné misky:** `celebrate` sprite → T4 video (`MIA_BOWL_FULL_VIDEO.js`, `KOJNOZROUT_BOWL_ENGINE.js`).  
    *Zdroj:* `docs/KOJNOZROUT_KANON.md` · `docs/KANON_MIA_ALIGNMENT.md`

44. **Bowl cyklus** `processBowlCycle` každých ~750 ms; po full hold reset misky.  
    *Zdroj:* `docs/KOJNOZROUT_KANON.md` · `scripts/KOJNOZROUT_BOWL_ENGINE.js`

45. **Eventy Koj T1–T4:** T4 = speciální aktivace plnou miskou.  
    *Zdroj:* `docs/KOJNOZROUT_KANON.md` § Eventy

---

## I. Animace, Kapybara, care

46. **Stejný gift ≠ stejná animace** — varianta dle Koj nálady, hlad/miska, neglect vs care bond.  
    *Zdroj:* `docs/KANON_MIA_AGENT.md` §10 · `docs/MIA_GIFT_ECONOMY.md` § Animace podle Koj stavu

47. **`resolveVariantIndex({ giftKey, kojMood, tier, careContext })`** — care bond/neglect/bowl plně v kánonu, alignment 🟡/🔴 na care varianty.  
    *Zdroj:* `docs/KANON_MIA_AGENT.md` · `docs/KANON_MIA_ALIGNMENT.md` §10

48. **Kapybara** (`animal_small`, `pet_react`) — reprezentativní gift; **AWAY: 20 s animace → wait comment → AI odpověď**.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` · `docs/KANON_MIA_AGENT.md` § Kapybara flow

49. **Gift Map nemění** ekonomiku/tier ani video frontu — jen metadata animací.  
    *Zdroj:* `docs/KANON_MIA_AGENT.md` § Co Gift Map nemění

50. **Gift → CARE** — `giftCare` spouští lehkou CARE akci (slabší než chat `péče`).  
    *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md`

---

## J. TikTok data a ledger

51. **Povolená TikTok pole:** userId, nickname, avatarUrl, giftName, giftCount, giftValue (interně).  
    *Zdroj:* `.cursor/rules/mia-canon.mdc` · `docs/KANON_MIA_ALIGNMENT.md` §5

52. **Gift dárci v `/overlay-state`:** `recentGifts` + `recentParticipants`.  
    *Zdroj:* `.cursor/rules/mia-canon.mdc` · `docs/KANON_MIA_ALIGNMENT.md` §4

53. **TikTok data jen runtime + krátký cache** — žádná dlouhodobá DB pro platform eventy.  
    *Zdroj:* `.cursor/rules/mia-canon.mdc` · `docs/KANON_MIA_ALIGNMENT.md`

---

## K. Duely, battle, prezentace

54. **Duely = bodový závod týmů** — ne deathmatch video; gift → team points + duel power.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Battle/Combat · `.cursor/rules/mia-canon.mdc`

55. **Gift nesmí ničit fan avatary** — avatary jen prezentace.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Battle/Combat

56. **Gift presentation jednou cestou** — combo / speech / visual / story orchestrátor.  
    *Zdroj:* `docs/KANON_MIA_ALIGNMENT.md` §15

57. **Speaker u giftu:** Koj primary u giftu, MIA companion u vyšších tierů/milníků.  
    *Zdroj:* `docs/KANON_MIA_ALIGNMENT.md` §3 · §23 shrnutí

---

## L. 1 coin / malé dárky

58. **1 coin gift (Rose)** — T1 tier, bowl fill, overlay bez coinů, miaPoints = 7.5 × count.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` · `tests/gift_map_contract.js` (Rose 1 coin)

59. **Malé dárky na velkém streamu** — reaction policy může silent/brief ack (anti-flood), ale bowl/Koj impact pokračuje.  
    *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md` · `scripts/MIA_SUPPORT_REACTION_POLICY.js`

---

## M. Vize mimo runtime (explicitně mimo shodu 3A)

60. **Kapybara flow, HOST, STARK, User Mode, multi-tenant** — ne lepit do stream kódu bez zadání; některé části 🟢 (Kapybara AWAY), jiné 🔴.  
    *Zdroj:* `.cursor/rules/mia-canon.mdc` § Vize mimo runtime

---

*Celkem: 60 extrahovaných pravidel. Detailní mapování na kód: `02_COMPLIANCE_MATRIX.md`.*
