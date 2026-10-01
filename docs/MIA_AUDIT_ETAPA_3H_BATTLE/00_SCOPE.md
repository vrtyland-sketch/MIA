# MIA Audit — Etapa 3H: Battle (shoda s kánonem)

**Datum:** 2026-07-27  
**Typ auditu:** Behavior correctness — **Stream Core Battle** (cross-stream duel, platform arena, choreografie, fronty, inventář v duelu, sync) proti Stream Core kánonu.  
**Metodika:** Canon ↔ Implementation ↔ Tests ↔ Status + **Poslední ověření** (fresh vs hist. vs nikdy). Stejný bar jako **Etapa 3F / 3G**.

---

## Stream Core vs Master Canon (povinné rozlišení)

| Vrstva | Co to je | Status v tomto auditu |
|--------|----------|------------------------|
| **Stream Core subset** | Live stream path: `MIA_KOJNOZROUT_DUEL*`, `MIA_PLATFORM_ARENA`, `MIA_ARENA_BATTLE`, `MIA_KOJ_BATTLE_CHOREOGRAPHY`, `MIA_KOJ_ROSTER`, world layer, item command boost, arena routes, `arena-battle-overlay.html`, `obs:ensure-arena-battle`, demo host | Primární měřítko shody |
| **Master Canon 0039** | Battle Engine (session/queue/damage/AI/history) v `shared/mia-battle-core/` | **Lab / contract** — **ne** wired do `index.js` stream path → ⚠, ne ❌ proti Stream Core |
| **Master Canon 0048** | Creature Evolution + platform battle vize (`mia-creature-core`) | **Vize** — platform roster Stream Core existuje; genetika/modulární hry = lab |

> Capability inventář (`docs/MIA_AUDIT_ETAPA_3/05_ECONOMY_BATTLE_INVENTORY.md`) = **schopnosti**, ne compliance. Tento pack = **shoda s kánonem**.

---

## Co Etapa 3H pokrývá (IN)

| Oblast | Rozsah |
|--------|--------|
| **Cross-stream duel** | `MIA_KOJNOZROUT_DUEL.js` + bridge + routes `/duel/*` — bodový závod týmů |
| **Platform arena** | `MIA_PLATFORM_ARENA.js` — 4 coin-žrouti, MVP fáze, energy/interval, steal |
| **Arena battle moves** | `MIA_ARENA_BATTLE.js` — push action, poses, snapshot |
| **Choreografie** | `MIA_KOJ_BATTLE_CHOREOGRAPHY.js` + roster forms — vitals block IN |
| **Team points / duel power** | Power bar, host team split — **použití** miaPoints v battle IN (vzorce konverze OUT → 3B) |
| **Item use boost** | `MIA_KOJNOZROUT_ITEM_COMMAND` → `itemPower` v duelu; fronta display |
| **Command / action gates** | Item display queue; arena energy + 8s interval; battle action buffer |
| **Determinismus** | Kde je pure math; kde `Date.now` / `Math.random` |
| **World layer hooks** | `MIA_WORLD_LAYER_RUNTIME` backpack/duel/arena/rewards |
| **OBS arena layers** | `obs:ensure-arena-battle`, overlay URL — battle-specific IN |
| **Demo** | `MIA_ARENA_BATTLE_DEMO*` — součást stream tooling path |
| **Uživatelská témata** | (1) determinismus (2) ekonomika battle (3) fronty (4) inventář (5) sync |

**Mimo rozsah 3H (OUT):**

| Oblast | Kde |
|--------|-----|
| Gift tier / spam math | **3A** |
| miaPoints konverze / ledger core | **3B** |
| Full Koj CARE / bowl 95/100 | **3C** (vitals *block* choreografie = IN) |
| OBS bootstrap / manifest | **3D** (battle source ensure = IN) |
| TTS engine | **3E** |
| Overlay pick/pin HTML obecně | **3F** (arena HTML entrypoint = IN) |
| Persist bak / quarantine | **3G** (arena/duel JSON existuje — durability OUT; battle behavior IN) |
| Editor / 2D factory deep | → **3I** |
| Plný Master Battle Engine live wiring | poznámka Stream vs Master — ne auto-fix |

---

## Vztah k ostatním etapám (handoffs)

| Etapa | Složka | Handoff |
|-------|--------|---------|
| **3A** | `docs/MIA_AUDIT_ETAPA_3A_GIFTS/` | Gift → arena activity / battle move trigger |
| **3B** | `docs/MIA_AUDIT_ETAPA_3B_MIA_BODY_ECONOMY/` | miaPoints vstup do duel/arena; host team |
| **3C** | `docs/MIA_AUDIT_ETAPA_3C_KOJNOZROUT/` | Duel vitals block + choreografie; CARE OUT |
| **3D** | `docs/MIA_AUDIT_ETAPA_3D_OBS_RUNTIME/` | `obs:ensure-arena-battle`; bootstrap OUT |
| **3E** | `docs/MIA_AUDIT_ETAPA_3E_VOICE_TTS/` | Battle speech lines thin; TTS OUT |
| **3F** | `docs/MIA_AUDIT_ETAPA_3F_OVERLAY_RUNTIME/` | Arena overlay poll; public strip |
| **3G** | `docs/MIA_AUDIT_ETAPA_3G_PERSISTENCE_RECOVERY/` | `platform-arena.json` / world duel JSON |
| **3 (Capability)** | `docs/MIA_AUDIT_ETAPA_3/05_ECONOMY_BATTLE_INVENTORY.md` | Inventář schopností |
| **3H (tento)** | `docs/MIA_AUDIT_ETAPA_3H_BATTLE/` | **Battle vs kánon** |
| **3I** | `docs/MIA_AUDIT_ETAPA_3I_EDITOR/` | Editor — **HOTOVO** |
| **Etapa 4** | (příští) | Cross Audit |

---

## Zdroje důkazů

- Kánon: `docs/KANON_MIA_ALIGNMENT.md` §17 Battle, § Gift Economy (team/duel power), §19 Inventář (item v duelu), Master 0039/0048 🟡
- Capability: `docs/MIA_AUDIT_ETAPA_3/05_ECONOMY_BATTLE_INVENTORY.md`
- Prior: 3B power, 3C duel, 3D OR layers, 3G arena JSON
- Master: `docs/master-canon/0039-*`, `0048-*` (skim — vize)
- Kód: duel/arena/choreography/roster/world layer/item command/host team/OBS ensure/demo
- Testy: `phase3_game_layer`, `platform_arena`, `koj_battle_choreography`, `duel_cross_stream_sync`, `arena_battle_demo*`, `kojnozout_vitals_duel`, `kojnozout_item_care`, `host_team_ui`, `world_layer_*`, master `mia_master_canon_0039` (mimo fast)

---

## Metodika a statusy

| Symbol | Význam |
|--------|--------|
| ✅ | Shoda — kánon a Stream Core implementace se shodují |
| ⚠ | Částečná shoda / drift — jádro OK, chybí live wiring Master / dual model / non-det |
| ❌ | Rozpor — porušení tvrdého pravidla Stream Core |
| ❓ | Neověřeno — chybí důkaz (live 2-stream duel, live arena s viewery) |

**Pravidlo:** Při nejasnosti → **❓ NEOVĚŘENO**, ne domněnka.  
**Gaps = Decision later** — **žádný auto-fix**.

**Poslední ověření:** *fresh* = code/contract review + vybrané contract běhy **2026-07-27**; *hist.* = R1-C **2026-07-26**; *nikdy* = bez důkazu. Historický PASS **není** fresh live.

---

## Omezení auditu

- **Žádné změny aplikačního kódu** — pouze dokumentace.
- Live paralelní duel na dvou streamech **nebyl** součástí tohoto běhu.
- Gift math, CARE full, TTS, Overlay UX, OBS bootstrap, persist bak — **neopravujeme**; cross-link.
- Master Battle Engine hodnotíme jako **vizi vs Stream subset**, ne jako povinný produkční runtime.
