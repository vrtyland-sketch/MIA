# Etapa 3G — Extrakt kánonních pravidel (Persistence & Recovery)

Číslovaný seznam pravidel extrahovaných z kánonu / guardrails / stream implementace.  
**Datum extraktu:** 2026-07-27  
**Prefix matrix:** PR-01…PR-72

---

## A. Governance, inventář, Stream vs Master

1. **`data/*.json` = live stav** — necommitovat jako source of truth; runtime artefakt.  
   *Zdroj:* capability `08_PERSISTENCE_*` · dirty-tree poznámky · Etapa 2 state map

2. **Inventář Stream Core store souborů je známý** — koj state/world, runtime-state, viewer-memory/inventory, platform-arena, AQ flag, theme, session, lexicon, story, gift-map-stats, streamer-identity.  
   *Zdroj:* `docs/MIA_AUDIT_ETAPA_2/00_ARCHITECTURE_MAP.md` · live `data/` listing 2026-07-27

3. **Capability ≠ compliance** — Etapa 3 §08 inventarizuje schopnosti; 3G měří shodu.  
   *Zdroj:* metodika 3A–3F

4. **Stream Core subset ≠ Master Canon Recovery stack** — produkční měřítko = disk JSON + stream/OBS watchdog + replay; 0065/0066/0075 = lab/vize.  
   *Zdroj:* `KANON_MIA_ALIGNMENT.md` 0065/66/75 🟡 · metodika 3E Master vs stream

5. **TikFinity → MIA → OBS** — business/persist rozhoduje MIA; OBS nerestartuje ekonomiku ani Koj disk.  
   *Zdroj:* `.cursor/rules/mia-guardrails.mdc`

6. **Veřejný overlay nikdy coins** — persist soubory pro admin/dev mohou mít agregáty, ale public strip zůstává miaPoints (cross 3B/3F).  
   *Zdroj:* guardrails · 3B/3F

7. **Per-tier `rotationIndexByTier` bez resetu tier indexu** — runtime guardrail (persist napříč restartem = samostatné PR).  
   *Zdroj:* guardrails · 3A · `MIA_VIDEO_ENGINE.js`

8. **Po větší změně stream/OBS/ingest logiky** — `node --check index.js` + `npm run test:preflight:fast`.  
   *Zdroj:* guardrails

---

## B. Atomic write / write safety

9. **`runtime-state.json` atomic write** — `writeFileSync(tmp)` + `renameSync`.  
   *Zdroj:* `core/runtime-state.js` `writePayload`

10. **Streamer profiles atomic** — `writeJsonAtomic` s pid `.tmp`.  
    *Zdroj:* `core/streamer-profiles.js`

11. **Settings bundle atomic** — tmp + rename.  
    *Zdroj:* `core/settings-bundle.js`

12. **Koj state write není atomic** — přímý `writeFileSync` na `kojnozout-state.json`.  
    *Zdroj:* `MIA_KOJNOZROUT_PERSISTENCE.js`

13. **Koj world write není atomic** — přímý `writeFileSync`.  
    *Zdroj:* `MIA_KOJNOZROUT_WORLD_PERSISTENCE.js`

14. **Viewer-memory / inventory / arena / session / theme / AQ / gift-map-stats** — přímý `writeFileSync` (bez tmp+rename).  
    *Zdroj:* příslušné `core/*` / `scripts/*` / `shared/gifts/runtime.js`

---

## C. Koj state persistence

15. **Canonical path** — `data/kojnozout-state.json` přes `MIA_KOJNOZROUT_PERSISTENCE`.  
    *Zdroj:* capability §1 · 3C

16. **Whitelist `PERSISTED_FIELDS`** — bowl/vitals/bond/evolution…; ne celý in-memory objekt.  
    *Zdroj:* `PERSISTED_FIELDS` v persistence skriptu

17. **Payload nese `version: 1` + `updatedAt`**.  
    *Zdroj:* `extractPersistedState`

18. **Debounced save ~2500 ms** — `scheduleSaveKojnozoutState`.  
    *Zdroj:* totéž

19. **`flushSaveKojnozoutState`** — sync flush (cancel timer).  
    *Zdroj:* totéž

20. **Chybějící soubor → `{}` seed** — safe default.  
    *Zdroj:* `loadPersistedSeed`

21. **Corrupt JSON → `{}`** (try/catch) — soft-fail bez pádu procesu.  
    *Zdroj:* `loadPersistedSeed` catch

22. **Walk state (`walkUntilTs`) není v `PERSISTED_FIELDS`** — ztráta po restartu (cross 3C GAP-C10).  
    *Zdroj:* 3C KJ-73 · persistence whitelist

---

## D. Koj world persistence

23. **Canonical path** — `data/kojnozout-world.json` (backpack + duel).  
    *Zdroj:* capability §2 · 3C

24. **Save nese `version: 1` + `updatedAt` + backpack/duel**.  
    *Zdroj:* `scheduleSaveWorld`

25. **Chybějící soubor → `{ backpack: null, duel: null }`**.  
    *Zdroj:* `loadWorldSeed`

26. **Corrupt → null backpack/duel** — soft-fail.  
    *Zdroj:* catch v `loadWorldSeed`

27. **Debounce ~2500 ms** na world save.  
    *Zdroj:* `scheduleSaveWorld`

---

## E. Runtime-state + boot compose

28. **`data/runtime-state.json`** = bowl + Koj critical + queue snapshot (+ watchdog extra).  
    *Zdroj:* `core/runtime-state.js` · capability §3

29. **Nesmí wipe `kojnozout-state.json`** — jen reference `kojRef` + compose.  
    *Zdroj:* komentář + `KOJ_REF`

30. **`kojRef: "data/kojnozout-state.json"`** v payloadu.  
    *Zdroj:* `buildPayload`

31. **`composeKojSeed`** — merge runtime přes seed když fresher / prázdná miska.  
    *Zdroj:* `composeKojSeed` · `phase1_runtime_state`

32. **Boot seed** — `MIA_RUNTIME_STATE_SEED_CTX` volá load koj + world + compose.  
    *Zdroj:* `scripts/MIA_RUNTIME_STATE_SEED_CTX.js` · `runtime_state_seed_ctx`

33. **Periodický interval save** (~8 s) + schedule delay.  
    *Zdroj:* `startRuntimeStateInterval`

34. **Stream watchdog nesmí vytvořit runtime-state z prázdna** — jen anotuje existující.  
    *Zdroj:* `stream-watchdog.js` `persistHealth` · `phase1_stream_watchdog`

35. **Corrupt runtime-state → `null`** — compose pak nepoužije.  
    *Zdroj:* `loadRuntimeState` catch

---

## F. Economy / community persist (cross 3B)

36. **`viewer-memory.json` ukládá miaPoints, ne coins / ne chat text**.  
    *Zdroj:* `core/viewer-memory.js` · `phase2_viewer_memory` · 3B

37. **Store shape `version` + `updatedAt` + `viewers`**.  
    *Zdroj:* `emptyStore` / `loadStore`

38. **Corrupt viewer-memory → fresh empty store**.  
    *Zdroj:* catch → `emptyStore`

39. **Debounce save ~1500 ms** + `flushSync`.  
    *Zdroj:* `scheduleSave` / `flushSync`

40. **`viewer-inventory.json` stub persist** (cosmetics/keys), bez coins.  
    *Zdroj:* `core/viewer-inventory.js` · `phase3_game_layer`

41. **Gift user ledger = krátký runtime cache** — ne povinný disk SQL (kánon 3B).  
    *Zdroj:* `MIA_GIFT_USER_LEDGER.js` · 3B BE-27

42. **Supporter streak / multi-day** — vyžaduje per-user persistence scope (⚠ produkční file).  
    *Zdroj:* 3B BE-24 / GAP-B03

43. **`platform-arena.json` version:1, body v miaPoints**.  
    *Zdroj:* `MIA_PLATFORM_ARENA.js` · 3B

44. **`gift-map-stats.json` může obsahovat `totalCoins` agregáty** — disk audit, ne public overlay.  
    *Zdroj:* `shared/gifts/runtime.js` · 3A/3B GAP

---

## G. Session / theme / AQ / ostatní stores

45. **`mia-session-memory.json` version:1** — recent messages / users; corrupt → empty.  
    *Zdroj:* `MIA_SESSION_MEMORY.js`

46. **`mia-chat-lexicon.json` persist** — load soft-fail + save.  
    *Zdroj:* `MIA_CHAT_LEXICON.js`

47. **`story-memory.json` persist** — story engine path (capability §9).  
    *Zdroj:* capability · `shared/mia-story-core` / alignment

48. **Action Queue disk = jen `enabled` flag** — fronta položek in-memory; default OFF.  
    *Zdroj:* `core/action-queue.js` · capability §7

49. **Theme `mia-theme.json`** — themeId persist; apply jen při flagu ON.  
    *Zdroj:* `core/theme-manager.js` · capability §8

50. **`streamer-identity.json`** — host identity na disku.  
    *Zdroj:* `MIA_STREAMER_IDENTITY.js` · `data/` listing

51. **`MIA_STATUS_SNAPSHOT` = diagnostika `/status`** — ne durable recovery snapshot ekonomiky.  
    *Zdroj:* `MIA_STATUS_SNAPSHOT.js` · `status_snapshot` test

52. **OBS persistent layers ≠ MIA app state JSON** — browser source layers (cross 3D).  
    *Zdroj:* `MIA_OBS_PERSISTENT_LAYERS.js` · `obs_persistent_layers` · 3D

---

## H. Verzování a migrace

53. **Stream stores deklarují `version: 1`** při zápisu (koj, world, runtime, viewer-*, arena, session…).  
    *Zdroj:* extract/build payloady

54. **Load cesty neběží schema migrátor** — `version` se čte/defaultuje, ne upgrade pipeline.  
    *Zdroj:* load* funkce (žádný `migrateV1toV2`)

55. **Arena soft-migrace identity** — label/mascot vždy z kánonu, ne ze starého save.  
    *Zdroj:* `createArenaState` komentář „Identita vždy z kánonu“

56. **Žádný jednotný Stream Core migration runner** pro v1→v2 disk JSON.  
    *Zdroj:* code search · Master 0075 má Version Controller jen v lab

57. **Master Event Store (`0075`) version/replay/snapshot** — lab module; ne live durable store stream path.  
    *Zdroj:* alignment 0075 🟡 · `mia-event-store-core`

---

## I. Ochrana poškozených snapshotů

58. **Soft-fail JSON.parse** na hlavních storech — proces nespadne.  
    *Zdroj:* catch bloky persistence modulů

59. **Žádný `.bak` před overwrite** hlavních stream storeů.  
    *Zdroj:* code search write paths

60. **Žádná quarantine** poškozeného souboru (přesun stranou).  
    *Zdroj:* load catch → empty/null in-place semantics

61. **Žádná rotace „poslední dobrý snapshot“** pro state JSON (na rozdíl od log rotation).  
    *Zdroj:* `MIA_LOG_ROTATION.js` rotuje logy, ne state; state paths bez rotate

---

## J. Crash recovery, ephemeral, watchdog, Master

62. **Restart MIA hydratuje Koj z disku + compose runtime-state**.  
    *Zdroj:* `MIA_RUNTIME_STATE_SEED_CTX` · phase1 contracts

63. **Debounce window = riziko ztráty posledních mutací** při hard kill (1.5–2.5 s+).  
    *Zdroj:* schedule timers koj/world/viewer/runtime

64. **Overlay state / voice timing / speak queue = ephemeral** — restart = fresh (Koj z disku).  
    *Zdroj:* capability §14 · 3E/3F SUMMARY

65. **`rotationIndexByTier` se nepersistuje napříč restartem** — index startuje znovu (cross 3A).  
    *Zdroj:* `MIA_VIDEO_ENGINE.js` in-memory · Etapa 2 poznámka

66. **Stream watchdog** — default ON; stale ingest; reconnect hooks; nekill process.  
    *Zdroj:* `core/stream-watchdog.js` · `phase1_stream_watchdog`

67. **OBS process relaunch** — `MIA_OBS_WATCHDOG` cooldown + maxAttempts (ownership live session → 3D).  
    *Zdroj:* `MIA_OBS_WATCHDOG.js` · alignment OBS resilience · 3D GAP-D01

68. **Event replay** — `phase1_replay` / `mia_replay` re-process saved events ≠ live auth.  
    *Zdroj:* capability §12 · `phase1_replay`

69. **Master Recovery Manager (`0065`)** — modul existuje; **není wired v `index.js` stream path**.  
    *Zdroj:* `shared/mia-recovery-core/recoveryManager.js` · grep index · alignment 🟡

70. **Master Watchdog Engine (`0066`)** — lab; stream používá `stream-watchdog` + `MIA_OBS_WATCHDOG`, ne plný kernel watchdog.  
    *Zdroj:* alignment 0066 🟡 · capability §13

71. **Master Safe Mode (`0068`) / Fault (`0067`)** — lab; produkční safe-mode trigger stream path NEOVĚŘENO.  
    *Zdroj:* alignment · capability §13

72. **Live end-to-end: kill MIA mid-write → restart → konzistentní Koj+economy** — vyžaduje manuální/live důkaz.  
    *Zdroj:* metodika Poslední ověření

---

## Guardrails subset (GR-P*)

| ID | Pravidlo |
|----|----------|
| GR-P01 | `data/*.json` live — ne jako kanonický commit source |
| GR-P02 | TikFinity → MIA → OBS (persist v MIA) |
| GR-P03 | Public overlay jen miaPoints (cross persist stats) |
| GR-P04 | `rotationIndexByTier` per-tier bez resetu (runtime) |
| GR-P05 | Soft-fail corrupt JSON (no crash) |
| GR-P06 | Runtime-state atomic + compose bez wipe koj file |
| GR-P07 | Stream watchdog neinventuje prázdný runtime-state |
| GR-P08 | Master Recovery/Event Store ≠ povinný Stream Core runtime |

---

*Celkem kánonních pravidel pro matrix: **72** (PR-01…PR-72).*
