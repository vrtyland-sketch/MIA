# Etapa 3H — Test coverage (Battle)

**Datum:** 2026-07-27  

Legenda pokrytí vůči Stream Core Battle:

| Symbol | Význam |
|--------|--------|
| 🟢 | V `npm run test:preflight:fast` |
| 🟡 | Existuje mimo fast (`test:arena`, `test:duel-sync`, `test:vitals-duel`, full preflight, …) |
| ❓ | Jen live / manuál / chybí |

---

## 🟢 preflight:fast (battle-relevant)

| Suite | Soubor | Co kryje | BT (příklady) |
|-------|--------|----------|---------------|
| `phase3_game_layer` | `tests/phase3_game_layer_contract.js` | MVP fáze, energy+interval, inventory stub, admin battle | BT-24…28,32,49 |
| `arena_battle_demo_ctx` | `tests/arena_battle_demo_ctx_contract.js` | Demo host/ctx wiring do index | BT-33 (wiring) |
| `world_layer_runtime` | `tests/world_layer_runtime_contract.js` | World layer hooks (duel/arena mocks) | BT-56 |
| `world_layer_ctx` | `tests/world_layer_ctx_contract.js` | Ctx wiring | BT-56 |
| `host_team_ui` | `tests/host_team_ui_contract.js` | Host team UI | BT-44 |
| `care_commands_wiring` / `care_commands_ctx` | wiring contracts | CARE route surface | BT-55 thin |
| `koj_moments_runtime` | moments | duel peer sync touch thin | BT-15 thin |

*Fresh běh v tomto auditu:* `phase3_game_layer`, `arena_battle_demo_ctx` — **PASS 2026-07-27**.

---

## 🟡 mimo fast (silné battle contracty)

| Suite / npm | Soubor | Co kryje | BT |
|-------------|--------|----------|-----|
| `npm run test:arena` | `platform_arena_contract.js` | 4 kojs, duel, turnaj, kick box | BT-21…23,28,29,31,34 |
| `test:arena` | `koj_battle_choreography_contract.js` | feeding block, poses, rush | BT-35…40 |
| `test:arena` | `arena_battle_demo_contract.js` | demo 4 platforms | BT-33 |
| `npm run test:duel-sync` | `duel_cross_stream_sync_contract.js` | export/sync/bridge HTTP | BT-15,16,18 |
| `npm run test:vitals-duel` | `kojnozout_vitals_duel_contract.js` | duel scoring + itemPower | BT-09…14 |
| full / item | `kojnozout_item_care_contract.js` | item use boost queue | BT-51,57,58 |
| sprint | `sprint5_contract.js` / `sprint6` | host team / power bar | BT-14,44,45 |
| Master | `mia_master_canon_0039_contract.js` | lab engine | BT-04,54,65 |
| Master | `mia_master_canon_0048_contract.js` | creature + battle lab | BT-69 |

*Fresh běh v tomto auditu:* `duel_cross_stream_sync`, `koj_battle_choreography`, `platform_arena`, `arena_battle_demo` — **PASS 2026-07-27**.

---

## ❓ live only / chybí

| Oblast | Důkaz místo toho | Gap |
|--------|------------------|-----|
| Paralelní 2-stream duel live | unit sync + routes | GAP-H01 · T-H01 |
| Live arena HUD s viewery | demo + hist. R1-C | GAP-H07 · T-H02 |
| `obs:ensure-arena-battle` proti běžícímu OBS | script only | GAP-H07 · T-H03 |
| Host team live split viz | host_team_ui contract | GAP-H11 · T-H04 |
| CARE item → steal e2e full | care_commands code | GAP-H11 · T-H05 |
| Bit-identical replay duel (clock) | pure math + Date.now | GAP-H08 · T-H06 |

---

## Mapování k uživatelským 5 tématům

| Téma | 🟢 fast | 🟡 mimo | ❓ live |
|------|---------|---------|--------|
| 1 Determinismus | phase3 scoring | platform_arena power | clock inject replay |
| 2 Ekonomika battle | phase3 phases/energy | platform_arena steal, vitals_duel | live viewer economy |
| 3 Fronty příkazů | phase3 energy+interval | item_care queue | Master queue wire |
| 4 Inventář | phase3 viewer-inventory stub | item_care backpack boost | dual-store live |
| 5 Sync | world_layer fast | duel_cross_stream, choreography | 2-stream live, OBS |

---

## Navržené testy (Decision later — ne implementovat teď)

| ID | Návrh | Kryje Gap |
|----|-------|-----------|
| T-H01 | Dual-process duel sync smoke (2 ports) | GAP-H01 |
| T-H02 | Live checklist arena overlay + 1 gift | GAP-H07 |
| T-H03 | OBS ensure dry-run mock WS | GAP-H07 |
| T-H04 | Host team split ingest contract expand | GAP-H11 |
| T-H05 | CARE use → arena steal integration | GAP-H11 |
| T-H06 | Duel ingest s injectable `now` | GAP-H08 |
| T-H07 | Přidat `platform_arena` + `duel_cross_stream` do fast (opt-in) | GAP-H06 |
| T-H08 | Documented single inventory battle path | GAP-H05 |

---

## Poznámka k „Testováno“ v SUMMARY

- **Testováno ≈ 48** = řádky BT s 🟢 nebo relevantním 🟡 důkazem (včetně fresh PASS sad).  
- **Chybí test ≈ 22** = 70 − 48 (❓ + ⚠ bez silného contractu + Master-only thin).
