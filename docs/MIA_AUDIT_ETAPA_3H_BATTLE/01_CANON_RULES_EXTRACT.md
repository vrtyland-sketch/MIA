# Etapa 3H — Extrakt kánonních pravidel (Battle)

Číslovaný seznam pravidel extrahovaných z kánonu / guardrails / Stream Core implementace.  
**Datum extraktu:** 2026-07-27  
**Prefix matrix:** BT-01…BT-70

---

## A. Governance, Stream vs Master, guardrails

1. **TikFinity → MIA → OBS** — battle rozhoduje MIA; OBS jen renderuje arena/duel HUD.  
   *Zdroj:* `.cursor/rules/mia-guardrails.mdc`

2. **OBS nerovná se business logika** — žádné skóre v browser source.  
   *Zdroj:* guardrails · alignment Stream Mode

3. **Veřejný overlay nikdy coins** — battle HUD / power bar / arena pts = miaPoints.  
   *Zdroj:* guardrails · § Body · 3B/3F

4. **Stream Core Battle ≠ Master Canon 0039 plný engine** — produkční měřítko = duel + platform arena + choreografie; `mia-battle-core` = lab.  
   *Zdroj:* `KANON_MIA_ALIGNMENT.md` Master 0039 🟡 · `0039-alignment.md`

5. **Capability ≠ compliance** — Etapa 3 §05 inventarizuje schopnosti; 3H měří shodu.  
   *Zdroj:* metodika 3E+

6. **MIA rozhoduje výsledek** — TikTok/platforma jen trigger/aktivita; výsledek = MIA body.  
   *Zdroj:* Master 0039 §2 · Stream `MIA_PLATFORM_ARENA` komentář ekonomiky

7. **Gift videa ≠ combat** — SPINAK gift scény nejsou battle deathmatch.  
   *Zdroj:* alignment §17

8. **Fan avatary jen prezentace** — viewer strip / spotlight ≠ bojové entity.  
   *Zdroj:* alignment §17

---

## B. Cross-stream duel (bodový závod)

9. **Duel = závod o MIA body, ne deathmatch HP.**  
   *Zdroj:* `MIA_KOJNOZROUT_DUEL.js` header · alignment §17

10. **Default délka 5 min** (`durationMs: 300000`, min 30 s).  
    *Zdroj:* `startDuel` · 3C KJ-63

11. **Ingest příspěvků podle eventType** — LIKE/FOLLOW/SHARE/COMMENT floors + GIFT + `itemPower`.  
    *Zdroj:* `ingestDuelContribution`

12. **`itemPower` přičítá `itemBonusPoints` a celkové `miaPoints` týmu.**  
    *Zdroj:* totéž · §19 Inventář

13. **Vítěz = vyšší `miaPoints` (draw při rovnosti).**  
    *Zdroj:* `finishDuel`

14. **Power bar** — `resolvePowerBar` / `getDuelSnapshot.powerBar` (lokál vs soupeř %).  
    *Zdroj:* duel modul · Gift Economy „Team points + duel power“

15. **Export / sync peer** — `exportLocalSide` + `syncOpponentFromPeer` (absolutní skóre soupeře).  
    *Zdroj:* duel · `MIA_KOJNOZROUT_DUEL_BRIDGE.js`

16. **HTTP routes** — `POST /duel/start`, `/duel/opponent-sync`, `/duel/export`, …  
    *Zdroj:* `routes/arena.js`

17. **World persist duel** — `kojnozout-world.json` přes `scheduleWorldSave` (cross 3G).  
    *Zdroj:* WORLD_PERSISTENCE · 3G PR-23

18. **Bridge push** — `pushLocalExportToPeer` → peer `/duel/opponent-sync`.  
    *Zdroj:* DUEL_BRIDGE · `duel_cross_stream_sync_contract`

19. **Paralelní duel na 2 live streamech** — kánon očekává host scény na obou; live ověření v repu chybí.  
    *Zdroj:* alignment „Paralelní duely“ 🟡 · 3C GAP-C08

20. **Contributors per side** — agregace přispěvatelů na straně.  
    *Zdroj:* `bumpContributor` v duel

---

## C. Platform arena (4 coin-žrouti)

21. **Čtyři platformy** — TikTok Tokžrout, Kick Stackžrout, Twitch Bitsžrout, YouTube Kisstube.  
    *Zdroj:* `MIA_PLATFORM_ARENA` · `MIA_KOJ_ROSTER` · alignment platform forms

22. **Species `coin_eater`** — ne „cute pea“; combat/love/items funkce.  
    *Zdroj:* roster · `platform_arena_contract`

23. **Aréna počítá MIA body, ne peníze platforem.**  
    *Zdroj:* header komentář PLATFORM_ARENA · snapshot economy note

24. **Battle MVP state machine** — announce → countdown → active → finished (`MIA_BATTLE_MVP` default ON).  
    *Zdroj:* `startArenaDuel` / `advanceDuelPhases` · capability §5

25. **Skóre duel jen ve fázi `active`.**  
    *Zdroj:* `duelScoringOpen` · `phase3_game_layer_contract`

26. **Energy gate** — gift/activity nabíjí energy; akce stojí `DUEL_ACTION_ENERGY_COST` (12).  
    *Zdroj:* `pushPlatformBattleAction` · phase3

27. **Action interval** — min 8 s mezi battle akcemi (`DUEL_ACTION_INTERVAL_MS`).  
    *Zdroj:* totéž

28. **Damage = steal bodů** z cílů na útočníka (token/Pokémon styl).  
    *Zdroj:* `pushPlatformBattleAction` damage block

29. **Turnaj** — delší okno, champion / history.  
    *Zdroj:* `startTournament` / `finishTournament`

30. **Persist `data/platform-arena.json`** — version:1, soft-fail load (cross 3G).  
    *Zdroj:* `loadArenaState` / `saveArenaState`

31. **Soft identity rewrite** — Kisstube label vždy z kánonu, ne ze starého save.  
    *Zdroj:* `createArenaState` · 3G migrace soft

32. **`MIA_BATTLE_MVP=0`** → legacy instant-active (`skipPhases` / phasesEnabled false).  
    *Zdroj:* `isBattleMvpEnabled`

33. **Demo ≠ live stream battle** — `battle:demo` / admin inject ≠ produkční viewři.  
    *Zdroj:* capability §7 · `MIA_ARENA_BATTLE_DEMO*`

34. **Kick box / item → útok na ostatní platformy.**  
    *Zdroj:* `MIA_ARENA_BATTLE.pushBattleAction` · platform_arena_contract

---

## D. Choreografie a Koj sync

35. **`resolveKojBattleContext`** — jednotný kontext aréna/duel/batoh pro overlay.  
    *Zdroj:* `MIA_KOJ_BATTLE_CHOREOGRAPHY.js`

36. **Krmení blokuje battle choreografii** (`blockedBy: feeding`).  
    *Zdroj:* choreography · contract

37. **Spánek / nemoc blokuje** (`sleepy` / `sick`).  
    *Zdroj:* `resolveVitalBlock` · cross 3C vitals

38. **Attacker pose vs target hit** podle `arena.battle.current`.  
    *Zdroj:* choreography + `getBattleSnapshot` poses

39. **Koj duel active → duel-ready / win mood map.**  
    *Zdroj:* choreography · display mood alias

40. **Batoh fronta během duelu → attack rush hint.**  
    *Zdroj:* choreography contract „backpack queue“

41. **Platform form sprites** — `forms/{platform}/attack|hit|win|…`.  
    *Zdroj:* roster · arena battle snapshot · alignment

42. **`arena-battle-overlay.html`** — prezentace fighters / pts / move log (poll).  
    *Zdroj:* overlay HTML · OBS URL ensure

---

## E. Ekonomika battle (body / power / odměny)

43. **Team points z gift/aktivity vstupují do duel/arena skóre jako miaPoints.**  
    *Zdroj:* Gift Economy tabulka · world layer ingest

44. **Host team split** — `MIA_HOST_TEAM_POINTS` při host módu.  
    *Zdroj:* alignment · `host_team_ui` / sprint5

45. **Duel power = podíl miaPoints** (power bar), ne coins.  
    *Zdroj:* `resolvePowerBar` · 3B cross-link

46. **Arena steal** mění platform `miaPoints` + duel scores.  
    *Zdroj:* PLATFORM_ARENA damage block

47. **Chat reward `arena_boost`** — vážený boost platformy.  
    *Zdroj:* `MIA_CHAT_REWARD_ENGINE` · world layer

48. **Duel item katalog** — boost/útok/posílení/… (`DUEL_ITEM_IDS`).  
    *Zdroj:* `MIA_KOJNOZROUT_ITEM_META`

49. **Dva inventáře** — Koj batoh (`kojnozout-world`) vs `core/viewer-inventory.js` (Phase 3 stub) — nejedna store.  
    *Zdroj:* capability §9 ⚠ · 3G

50. **Public battle UI bez coins** — pts labely = MIA body.  
    *Zdroj:* arena overlay `.pts` · guardrails

---

## F. Fronty příkazů / akcí

51. **Item display queue** — více uživatelů, rotate (`enqueueItemDisplay`).  
    *Zdroj:* §19 · `MIA_KOJNOZROUT_ITEM_COMMAND`

52. **Arena „fronta“ = gate** energy + interval (ne FIFO Master queue).  
    *Zdroj:* `pushPlatformBattleAction` · Master 0039 §12 contrast

53. **Battle action buffer** — max 24 recent actions, prune by `holdUntil`.  
    *Zdroj:* `MIA_ARENA_BATTLE`

54. **Master `enqueueBattleAction` / `canPlayerAct`** existuje v lab — **ne** v index stream path.  
    *Zdroj:* `shared/mia-battle-core/battleEngine.js` · alignment 🟡

55. **CARE / item path může pushnout platform battle action.**  
    *Zdroj:* `routes/care_commands.js` · world layer

56. **World layer** koordinuje gift → duel contribution + arena activity + battle push + save.  
    *Zdroj:* `MIA_WORLD_LAYER_RUNTIME.js`

---

## G. Inventář ↔ duel

57. **`item use` / `batoh use` v aktivním duelu → `ingestDuelContribution` s `itemPower`.**  
    *Zdroj:* `handleItemCommand` · §19

58. **Mimo duel item use → offstream CARE** (`applyOffstreamItemCare`).  
    *Zdroj:* ITEM_COMMAND · 3C

59. **Batoh persist v world JSON** (cross 3G).  
    *Zdroj:* WORLD_PERSISTENCE

60. **Variant roll itemů používá `Math.random`** — grant path není plně deterministický.  
    *Zdroj:* `MIA_KOJNOZROUT_ITEM_META.rollCanonGiftVariant`

61. **Inventář přímo do chatu** — alignment 🔴 budoucnost (ne Stream Core dnes).  
    *Zdroj:* alignment §19

---

## H. Determinismus

62. **Při pevném čase a stejných payloadách** — duel/arena scoring je pure arithmetic (bez RNG).  
    *Zdroj:* `ingestDuelContribution` · `resolveActivityPoints` · steal

63. **`Date.now()` v start/tick/holdUntil** — výsledek je časově vázaný (replay bez clock inject ≠ bit-identical).  
    *Zdroj:* duel/arena/battle `nowTs`

64. **Arena move power** — `max(4, round(miaPoints * 0.12) || item.power)` — deterministické.  
    *Zdroj:* `pushBattleAction`

65. **Master `calculateDamage`** — `randomSeed` flaguje `deterministic`, ale faktor je vždy `1` (stub). Lab only.  
    *Zdroj:* battleEngine.js

66. **Pose frame z `actionId % n`** — deterministická animace při daném id.  
    *Zdroj:* `resolveBattleFramePose`

---

## I. OBS, demo, Master 0048, sync

67. **`npm run obs:ensure-arena-battle`** — Browser Source `MIA_ARENA_BATTLE` → overlay URL.  
    *Zdroj:* `scripts/obs_ensure_arena_battle.js` · package.json

68. **Live arena s reálnými viewery** — contract/demo OK; produkční session v tomto auditu chybí.  
    *Zdroj:* capability §7 NEOVĚŘENO

69. **Master 0048** — platform battle řídí Battle Engine (vize); Stream Core řídí `MIA_PLATFORM_ARENA` přímo.  
    *Zdroj:* `0048-creature-evolution-engine.md` §3 · alignment 🟡

70. **Realtime shader combat** — alignment §17 🔴 (aspirace); Stream Core = 2D forms + overlay, ne shader combat.  
    *Zdroj:* alignment §17

---

## Guardrails subset (pro souhrnnou tabulku)

| ID | Mapuje na | Text |
|----|-----------|--------|
| GR-B01 | BT-01 | TikFinity → MIA → OBS |
| GR-B02 | BT-02 | OBS jen render |
| GR-B03 | BT-03 | miaPoints only |
| GR-B04 | BT-04 | Stream ≠ Master 0039 |
| GR-B05 | BT-06 | MIA rozhoduje výsledek |
| GR-B06 | BT-07 | Gift ≠ combat |
| GR-B07 | BT-09 | Duel = body závod |
| GR-B08 | BT-23 | Arena = MIA body ne platform money |

*Celkem pravidel: **70** (BT-01…BT-70).*
