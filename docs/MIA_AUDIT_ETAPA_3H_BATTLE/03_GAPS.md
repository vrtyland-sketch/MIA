# Etapa 3H — Gaps (Battle)

**Datum:** 2026-07-27  
**Pravidlo:** Všechny gaps = **Decision later** — žádný auto-fix v tomto auditu.

Severity: **VYSOKÁ** / **STŘEDNÍ** / **NÍZKÁ** / **INFO**

---

## GAP-H01 — Paralelní duel na 2 live streamech

| Pole | Hodnota |
|------|---------|
| **Severity** | **VYSOKÁ** (uživatelské téma sync) |
| **BT** | BT-19, BT-18 |
| **Problém** | Model + unit HTTP sync ✅; live dual-host + host scény na obou streamech **nikdy** ověřeno v repu |
| **Decision later** | Ano — plánovaný live smoke 2× Node / 2× OBS |
| **Poslední ověření** | **nikdy** (unit PASS 2026-07-27 ≠ live) |

---

## GAP-H02 — Dva battle modely (cross-stream vs platform arena)

| Pole | Hodnota |
|------|---------|
| **Severity** | **STŘEDNÍ** |
| **BT** | BT-09…20 vs BT-21…34 |
| **Problém** | `MIA_KOJNOZROUT_DUEL` (2 strany peer) a `MIA_PLATFORM_ARENA` (4 platformy + MVP fáze) běží vedle sebe — sdílí world layer, ale nejsou jeden state machine |
| **Decision later** | Ano — sjednotit dokumentaci / eventual merge vs keep dual |
| **Poslední ověření** | fresh code 2026-07-27 |

---

## GAP-H03 — Master 0039 / 0048 unwired

| Pole | Hodnota |
|------|---------|
| **Severity** | **STŘEDNÍ** (vůči Master vizi) / INFO vůči Stream Core |
| **BT** | BT-04, BT-54, BT-65, BT-69 |
| **Problém** | `mia-battle-core` má session/queue/damage/AI — **není** require z `index.js` stream path; 0048 očekává Battle Engine řízení platform battle |
| **Decision later** | Ano — ne auto-wire |
| **Poslední ověření** | fresh — lab only |

---

## GAP-H04 — Fronty: energy/interval ≠ Master Action Queue

| Pole | Hodnota |
|------|---------|
| **Severity** | **STŘEDNÍ** |
| **BT** | BT-52, BT-54 |
| **Problém** | Stream Core má (1) item display FIFO (2) arena energy+8s gate (3) action ring 24 — ne jednotnou Battle Queue z 0039 |
| **Decision later** | Ano |
| **Poslední ověření** | fresh phase3 PASS 2026-07-27 |

---

## GAP-H05 — Dual inventář (batoh vs viewer-inventory)

| Pole | Hodnota |
|------|---------|
| **Severity** | **STŘEDNÍ** |
| **BT** | BT-49, BT-57 |
| **Problém** | Duel boost jde přes Koj batoh; Phase 3 `core/viewer-inventory.js` je paralelní stub — riziko zmatku „který inventář platí v battle“ |
| **Decision later** | Ano (cross 3G inventář) |
| **Poslední ověření** | fresh phase3 2026-07-27 |

---

## GAP-H06 — `preflight:fast` nepokrývá klíčové battle contracty

| Pole | Hodnota |
|------|---------|
| **Severity** | **STŘEDNÍ** |
| **BT** | (test coverage) |
| **Problém** | Fast má `phase3_game_layer`, `arena_battle_demo_ctx`, `world_layer_*`, `host_team_ui`. **Mimo fast:** `platform_arena`, `koj_battle_choreography`, `duel_cross_stream_sync`, `arena_battle_demo`, `vitals_duel`, `item_care` |
| **Decision later** | Ano — rozšířit fast vs nechat `npm run test:arena` |
| **Poslední ověření** | fresh listing `run_preflight_tests.js` 2026-07-27 |

---

## GAP-H07 — Live arena / OBS ensure / real viewers

| Pole | Hodnota |
|------|---------|
| **Severity** | **STŘEDNÍ** |
| **BT** | BT-33, BT-42, BT-67, BT-68 |
| **Problém** | Demo + contract ✅; live overlay viz = hist. R1-C; `obs:ensure-arena-battle` live a produkční vieweri = **nikdy** v tomto auditu |
| **Decision later** | Ano |
| **Poslední ověření** | hist. R1-C 2026-07-26 (viz); live ensure **nikdy** |

---

## GAP-H08 — Non-determinismus (Date.now + Math.random)

| Pole | Hodnota |
|------|---------|
| **Severity** | **NÍZKÁ** |
| **BT** | BT-60, BT-63 |
| **Problém** | Scoring math je pure; start/tick/`holdUntil` vázané na wall clock; item variant roll = `Math.random` |
| **Decision later** | Ano — clock inject / seed jen pokud replay vyžaduje |
| **Poslední ověření** | fresh code 2026-07-27 |

---

## GAP-H09 — Realtime shader combat (aspirace)

| Pole | Hodnota |
|------|---------|
| **Severity** | **NÍZKÁ** / INFO |
| **BT** | BT-70 |
| **Problém** | Alignment §17 🔴; Stream Core záměrně 2D forms + overlay — ne rozpor Stream MVP |
| **Decision later** | Ano (Engine 2 / graphics) |
| **Poslední ověření** | fresh — chybí by design |

---

## GAP-H10 — Inventář přímo do chatu

| Pole | Hodnota |
|------|---------|
| **Severity** | **NÍZKÁ** / INFO |
| **BT** | BT-61 |
| **Problém** | Alignment §19 🔴 budoucnost |
| **Decision later** | Ano |
| **Poslední ověření** | fresh — není |

---

## GAP-H11 — Host team / arena_boost / CARE→battle e2e thin

| Pole | Hodnota |
|------|---------|
| **Severity** | **NÍZKÁ** |
| **BT** | BT-44, BT-47, BT-55 |
| **Problém** | Moduly existují; live host split a full CARE→steal path tenké mimo unit |
| **Decision later** | Ano |
| **Poslední ověření** | fresh UI/code; live thin |

---

## GAP-H12 — Master damage seed stub

| Pole | Hodnota |
|------|---------|
| **Severity** | **INFO** |
| **BT** | BT-65 |
| **Problém** | Lab `calculateDamage` ignoruje skutečný random; Stream Core stejně nepoužívá |
| **Decision later** | Ano (jen při wire Master) |
| **Poslední ověření** | fresh lab |

---

## Souhrn severity

| Severity | Počet | IDs |
|----------|-------|-----|
| VYSOKÁ | 1 | GAP-H01 |
| STŘEDNÍ | 6 | GAP-H02…H07 |
| NÍZKÁ | 3 | GAP-H08, H09*, H11 (*H09 i INFO) |
| INFO | 2 | GAP-H10, GAP-H12 |

*Pro povinnou tabulku rizik: **V=1, S=6, N=3** (INFO mimo skóre rizik).*
