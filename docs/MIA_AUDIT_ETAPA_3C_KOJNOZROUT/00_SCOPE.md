# MIA Audit — Etapa 3C: Kojnožrout (shoda s kánonem)

**Datum:** 2026-07-27  
**Typ auditu:** Behavior correctness — **platí implementace Kojnožrout proti kánonu** (vitals, CARE, bowl vizuální strana, runtime, duel, persistence).

---

## Co Etapa 3C pokrývá

| Oblast | Rozsah |
|--------|--------|
| **Identita & umístění** | Samostatná entita, pravý dolní roh, default spánek/pozorování |
| **Vitals / mood / hunger** | `MIA_KOJNOZROUT_VITALS.js`, mood derive, expressive mood, sleep depth |
| **CARE doména** | Příkazy, validace, bond, neglect, rewards, `pece` menu |
| **Bowl (Koj strana)** | Vizuální pásma, celebrate sprite, fill z supportu/CARE, T4 trigger, cycle loop |
| **Sprites / display / runtime** | `kojDisplay`, `kojnozrout-runtime.html`, pose cycles, wander/walk |
| **Speaker routing** | Koj **není** default chat speaker; gift vs MIA companion |
| **Duel / arena / battle** | Cross-stream duel, platform arena, choreografie |
| **Persistence** | `data/kojnozout-state.json`, `data/kojnozout-world.json` |
| **Walk / celebration** | Venčení CARE, pose celebrate, video watch chain |
| **Test modes** | `MIA_KOJNOZROUT_TEST_MODE.js`, streamer příkazy |
| **Reakční pořadí** | MIA první, Koj deferred (~3,2 s) |

**Mimo rozsah 3C (cross-link):**

| Oblast | Kde |
|--------|-----|
| Gift video rotace, spam T4 cap, dual gift map path | **Etapa 3A** `docs/MIA_AUDIT_ETAPA_3A_GIFTS/` |
| miaPoints konverze, ledger, supporter profily, host split | **Etapa 3B** `docs/MIA_AUDIT_ETAPA_3B_MIA_BODY_ECONOMY/` |
| Bowl fill **ekonomika** z gift mapy (fill % per tier) | 3A G-47; zde jen **Koj reakce** na fill |
| Plný OBS manifest / layout audit | Etapa 2 / Capability Etapa 3 |
| Avatar viewer, playlist queue, NEJSEM TU | Kánon ⬜ budoucí — jen zmínka |

---

## Vztah k ostatním etapám

| Etapa | Složka | Co měří |
|-------|--------|---------|
| **2** | `docs/MIA_AUDIT_ETAPA_2/` | Flow (`04_FLOW_KOJ_BOWL.md`) |
| **3 (Capability)** | `docs/MIA_AUDIT_ETAPA_3/` | Schopnosti (`03_KOJ_BOWL.md`) |
| **3A** | `docs/MIA_AUDIT_ETAPA_3A_GIFTS/` | Gift systém vs kánon (bowl fill wiring, T4 video path) |
| **3B** | `docs/MIA_AUDIT_ETAPA_3B_MIA_BODY_ECONOMY/` | MIA body & ekonomika |
| **3C (tento audit)** | `docs/MIA_AUDIT_ETAPA_3C_KOJNOZROUT/` | **Kojnožrout behavior vs kánon** |

> **Cross-link 3A:** G-47–G-52 (bowl fill, full trigger, cycle) — v 3C ověřena **Koj strana** (visualLevel, celebrate, vitals wake). Gift→bowl gain a T4 video resolver zůstávají primárně v 3A.  
> **Cross-link 3B:** Duel power v miaPoints, arena body — 3B BE-*; zde duel **choreografie + vitals impact**.

---

## Zdroje důkazů

- Kánon: `docs/KOJNOZROUT_KANON.md`, `docs/KOJNOZROUT_CANON_ALIGNMENT.md`, `docs/KANON_MIA_ALIGNMENT.md` § Koj
- Kód: `scripts/MIA_KOJNOZROUT_*.js`, `scripts/KOJNOZROUT_BOWL_ENGINE.js`, `scripts/KOJNOZROUT_MOOD_DERIVE.js`, `scripts/MIA_SPEAKER_ROUTING.js`, `mia-output-overlay/kojnozrout-*.html`, `routes/koj.js`, `routes/care_commands.js`
- Data: `data/kojnozout-state.json`, `data/kojnozout-world.json`
- Testy: 26+ contract souborů `tests/kojnozout_*`, `tests/koj_*`, `speaker_routing`, `support_koj_reaction_policy_smoke`

---

## Metodika a statusy

| Symbol | Význam |
|--------|--------|
| ✅ | Shoda — kánon a implementace se shodují (doloženo kódem a/nebo contract testem) |
| ⚠ | Částečná shoda / drift — jádro OK, detail nebo UX/dokumentace rozchází se s kánonem |
| ❌ | Rozpor — implementace proti tvrdému kánonnímu pravidlu |
| ❓ | Neověřeno — chybí důkaz (live OBS, cross-stream duel na dvou hostech) |

**Pravidlo:** Při nejasnosti → **❓ NEOVĚŘENO**, ne domněnka.

---

## Omezení auditu

- **Žádné změny kódu** — pouze analýza a dokumentace.
- Live stream / OBS end-to-end nebyl součástí tohoto běhu.
- Plná gift ekonomická matice se **neopakuje** — viz 3A/3B.
