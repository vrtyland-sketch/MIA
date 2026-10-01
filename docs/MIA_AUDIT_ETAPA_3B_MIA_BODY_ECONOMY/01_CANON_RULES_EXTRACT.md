# Etapa 3B — Extrakt kánonních pravidel (MIA body / ekonomika)

Číslovaný seznam pravidel extrahovaných z kánonu. Každé pravidlo má zdrojový dokument.

---

## A. Architektura bodů a tok dat

1. **Gift = RAW → normalizace → resolver → decision** — body se počítají v MIA, ne na platformě ani v OBS.  
   *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Základní princip · `docs/KANON_SOUCASNY_PREHLED.md`

2. **Ingest ukládá coins/giftValue jen interně** — platforma, userId, giftName, giftCount, repeatCount, streak, giftValue/coins, timestamp.  
   *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Co ingest ukládá

3. **Support resolver = source of truth** pro tier, miaPoints, XP enrich (`MIA_SUPPORT_RESOLVER` + `shared/gifts/`).  
   *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` · `docs/KANON_MIA_ALIGNMENT.md` § Gift Economy

4. **Jednotná konfigurace ekonomiky** v `shared/stream_economy_config.json` (tiery, spam wave, throttle).  
   *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md` · `docs/KANON_MIA_ALIGNMENT.md`

5. **Tok checklist body vrstva:** resolver → body v overlay (bez coinů) → miska (miaPoints gain) → inventář rewards → duel/arena.  
   *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Tok podle kánonu

---

## B. MIA body — tvrdá pravidla (guardrails)

6. **Overlay nikdy neukazuje coins, diamondy, Kč, €, hodnotu giftu** — jen MIA body (`miaPoints`), profil, nickname, logo platformy.  
   *Zdroj:* `.cursor/rules/mia-canon.mdc` · `docs/MIA_GIFT_ECONOMY.md` § Co overlay neukazuje · `docs/KANON_MIA_AGENT.md` §18

7. **Public naming:** interně `miaPoints` / XP / level; navenek copy **„podpora projektu“** / poděkování — ne monetární hodnota.  
   *Zdroj:* `docs/KANON_MIA_AGENT.md` §18 · `docs/MIA_GIFT_ECONOMY.md` § Co overlay ukazuje

8. **`giftValue` / `coins` / `totalCoins` nesmí do public overlay payloadu** pro diváky — sanitizace na hranici API.  
   *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Resolved gift context · `docs/KANON_MIA_ALIGNMENT.md`

9. **`/overlay-state` GET je side-effect-free** — strip coin polí při sestavení odpovědi, ne až v klientovi.  
   *Zdroj:* `docs/KANON_MIA_ALIGNMENT.md` · `.cursor/rules/mia-canon.mdc`

10. **Battle/arena leaderboard: sjednocené MIA body** napříč platformami — ne coins.  
    *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md` · `docs/KANON_MIA_AGENT.md` §17

11. **Duely = bodový závod týmů** (`miaPoints`/power), ne deathmatch video ani coin hodnota.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Battle/Combat · `docs/KANON_MIA_AGENT.md` §17

---

## C. Konverze a tier ekonomiky

12. **MIA_POINTS_PER_COIN = 7.5** — `1 coin = 7.5 miaPoints`.  
    *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md` · `shared/stream_economy_config.json`

13. **XP vize: 1 coin = 1 XP** (kumulativní uživatelské XP); miaPoints = coins × 7.5 pro gamifikaci/stream tier.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Gift XP

14. **Coin tier rozsahy T1–T6 (interní):**

| Tier | Coins (celkem) |
|------|----------------|
| T1 | 1–99 |
| T2 | 100–999 |
| T3 | 1 000–4 999 |
| T4 | 5 000–9 999 |
| T5 | 10 000–24 999 |
| T6 | 25 000+ |

*Zdroj:* `docs/MIA_GIFT_ECONOMY.md` · `docs/KANON_SOUCASNY_PREHLED.md`

15. **Default tier mode = coins** (`MIA_GIFT_ECONOMY_TIERS=coins`); legacy režim mapuje tier přímo z miaPoints prahů.  
    *Zdroj:* `docs/KANON_MIA_ALIGNMENT.md` · `scripts/MIA_SUPPORT_RESOLVER.js`

16. **Tři druhy tier labelů nesmí se plést:**
    - `coinTier` — jen z coinů eventu  
    - `streamTier` / `obsTier` — playback = max(coin, katalog gift mapy)  
    - `spamRewardTier` — milestone community vlny v MIA bodech (15 s okno)  
    *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md` § Spam a kontrola hluku

17. **Spam reward prahy (MIA body):** T2=750 (~100 coins), T3=7500 (~1000), T4=37500 (~5000).  
    *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md` · `shared/stream_economy_config.json`

18. **`spamRewardTier` ≠ `streamTier`** u jednotlivého giftu — spam je agregát vlny.  
    *Zdroj:* `MIA_NEXT/engine_spam_session.js` hlavička · `docs/KANON_SOUCASNY_PREHLED.md`

19. **Playback tier = max(coinTier, katalogový tier)** — ekonomika body/tier neignoruje gift mapu.  
    *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md` § Gift mapa

20. **T6 obsTier → T5 video pool** (mapování pro OBS; body tier T6 zůstává).  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` · `docs/KANON_MIA_ALIGNMENT.md`

---

## D. XP, levely, combo, streak

21. **Gift Level Lv1–8** (Nováček → Mýtus) z kumulativního XP uživatele.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Gift Level

22. **Combo ×10 / ×50 / ×100** — COMBO / SUPER / ULTIMATE; overlay v MIA bodech/kontextu, ne coiny.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Combo systém

23. **Streak bonus:** 3 dny +10 %, 7 dní +25 %, 30 dní +100 % XP award.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Gift Streak

24. **Streak vyžaduje per-user cache** — runtime / krátká persistence mezi dny.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` · alignment 🟡

25. **T0 interakce (like/follow/share/komentář)** — +XP, ne gift coins; engagement do supporter profilu.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Tier 0

26. **giftXp.viewer z gift mapy** může přepsat surové coins pro XP award (category multiplier).  
    *Zdroj:* `shared/gifts/` schema · `MIA_GIFT_SUPPORTER_PROFILE.js`

---

## E. Ledger, profily, host team

27. **Gift user ledger** — runtime seznam dárců (recentGifts), krátký cache, bez SQL DB pro TikTok eventy.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` · `docs/KANON_MIA_ALIGNMENT.md`

28. **Supporter profile** — kumulativní XP, gift level, streak, achievements, favorite gift; runtime scope.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` · `MIA_GIFT_SUPPORTER_PROFILE.js`

29. **AI paměť dárce (≥3 gifty)** — personalizace díky; hint bez coins.  
    *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md` · `core/viewer-memory.js`

30. **Host režim: body sdílené/rozdělené** mezi hosty (`OBS Ninja`, NEJSEM TU).  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Týmový systém

31. **Host team split** — env `MIA_HOST_TEAM_SPLIT_PCT` (default 50 %), aktivní v host/away world mode.  
    *Zdroj:* `docs/KANON_MIA_ALIGNMENT.md` · `scripts/MIA_HOST_TEAM_POINTS.js`

32. **Team points z gift mapy** — každý gift → team points + duel power ≈ f(coins/miaPoints).  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Dimenez gift mapy

---

## F. Achievement, rewards, inventář

33. **Achievement unlock v subtext** bubliny — zlatý styl; **ne coins** v public textu.  
    *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md` · `docs/KANON_MIA_ALIGNMENT.md`

34. **Private achievements** (`public: false`) nesmí generovat veřejný moment.  
    *Zdroj:* `tests/achievement_moment_contract.js` (kánonní intent)

35. **Rewards → batoh** — item roll z gift mapy; inventář neukládá coin hodnotu.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` · `core/viewer-inventory.js`

36. **Viewer memory level** z kumulativních miaPoints thresholds — ne z coins.  
    *Zdroj:* `core/viewer-memory.js` · `docs/KANON_MIA_ALIGNMENT.md`

---

## G. Koj / miska / duel (body vstupy)

37. **Koj bowl gain source-of-truth = support.miaPoints**; fallback supportIndex/100 pokud chybí.  
    *Zdroj:* `scripts/MIA_KOJNOZROUT_ENGINE.js` komentář · alignment

38. **Duel power = miaPoints + itemPower** — sides track `miaPoints`, ne coins.  
    *Zdroj:* `scripts/MIA_KOJNOZROUT_DUEL.js`

39. **Platform arena activity** — vážené body z gift/chat/like v miaPoints; persist JSON.  
    *Zdroj:* `scripts/MIA_PLATFORM_ARENA.js` · Etapa 3 capability doc

40. **Hall of Fame T6 flag** — `hallOfFameEligible` při stream tier T6.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` · `MIA_GIFT_ECONOMY.buildResolvedGiftContext`

---

## H. Config a persistence

41. **TikTok data jen runtime / krátký cache** — ledger OK; dlouhodobá DB pro eventy ne.  
    *Zdroj:* `docs/KANON_MIA_ALIGNMENT.md` · `docs/MIA_GIFT_ECONOMY.md`

42. **gift-map-stats.json na disku** — 🟡 alignment (statistiky mapy, ne veřejný overlay).  
    *Zdroj:* `docs/KANON_MIA_ALIGNMENT.md`

43. **viewer-memory.json persist** — level/totalMiaPoints per viewer; bez coins.  
    *Zdroj:* `core/viewer-memory.js` · `data/viewer-memory.json`

44. **Admin/status endpointy** — nesmí obcházet public strip policy pro overlay-facing data.  
    *Zdroj:* guardrails intent · `core/settings-bundle.js` note

45. **Combo wave HUD / belly spam** — zobrazuje jen miaPoints agregát, ne coin sumu.  
    *Zdroj:* `docs/KANON_MIA_ALIGNMENT.md` · Etapa 3A test reference

---

## I. Vize vs MVP (ne tvrdý rozpor)

46. **Gift level per user dlouhodobě** — kánon dříve 🔴; nyní runtime supporter profile 🟢 s ⚠ persistence scope.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` roadmap · alignment

47. **Vizuální power bar duels** — 🟡 v alignment; body v snapshot ✅.  
    *Zdroj:* `docs/MIA_GIFT_ECONOMY.md` § Týmový systém

48. **Spam T4 milestone video** — engine počítá T4; shadow runtime cap T4→T3 (cross-ref 3A G-42).  
    *Zdroj:* `docs/KANON_SOUCASNY_PREHLED.md` · Etapa 3A

---

## J. MIA Body (graphics) vs body ekonomika

49. **MIA body part overlay (Graphics Studio)** — efemérní WOW / preview; default skryté; **ne** trvalý avatar bodového systému.  
    *Zdroj:* `docs/KANON_MIA_ALIGNMENT.md` § Graphics · `mia-body-part-overlay.html`

50. **Live audit body API** — `bodyLiveAudit.js` + `audit:live` kontroluje `overlay_state_no_coins`.  
    *Zdroj:* `docs/KANON_MIA_ALIGNMENT.md`
