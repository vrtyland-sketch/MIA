# MIA Phase 3 — Progress

**Datum:** 2026-07-20  
**Stav:** Phase 3 Game Layer MVP shipped (bez commit)  
**Roadmapa:** [`MIA_RUNTIME_ROADMAP.md`](./MIA_RUNTIME_ROADMAP.md) · Phase 2: [`MIA_PHASE2_PROGRESS.md`](./MIA_PHASE2_PROGRESS.md)

## Co přibylo

| Modul | Cesta |
|-------|--------|
| Koj long-term needs | `core/koj-long-term-needs.js` → fatigue + techCharge (persist) |
| Tech Forms runtime | `core/tech-forms-runtime.js` + `scripts/MIA_KOJ_ROBOT_MODES.js` |
| Battle MVP phases | `scripts/MIA_PLATFORM_ARENA.js` (announce → countdown → active → finished) |
| Viewer inventory | `core/viewer-inventory.js` → `data/viewer-inventory.json` |
| Viewer levels | `core/viewer-memory.js` (`level` z `totalMiaPoints`) |
| Admin Phase 3 | `routes/admin.js` (status + test endpoints) |

## Wiring (minimální)

1. **Persist** — `fatigue` / `techCharge` / `robotModes` v `kojnozout-state.json` + `runtime-state` critical.
2. **Decay** — `applyPassiveDecay` volá `tickLongTermNeeds`; CARE soft-bump v `applyCareAction` (bez změny bowl hunger math).
3. **Enrich** — level-up flag + first-support inventory sticker; Tech Forms expiry tick při `MIA_TECH_FORMS=1`.
4. **Thank line** — Director-gated memory line může zmínit level / level-up.
5. **Arena** — skóre + battle FX jen ve fázi `active`; energy meter + 8s action interval.
6. **HTTP** — nové admin test route (viz níže). **Restart MIA** po pullu.

## Flagy

| Flag | Default | Význam |
|------|---------|--------|
| `MIA_TECH_FORMS` | **OFF** | Live aktivace Tech Forms (`1` = zapnout) |
| `MIA_BATTLE_MVP` | ON | `0` = legacy instant `active` (bez announce/countdown) |
| `MIA_VIEWER_INVENTORY` | ON | `0` vypne inventář |
| `MIA_VIEWER_MEMORY` | ON | levels + paměť (Phase 2) |
| `MIA_DUAL_VOICE` | OFF | beze změny |

Config: `config/runtime.json` → `phase3.*`

## Formy (aliasy)

| Roadmapa / alias | Form ID |
|------------------|---------|
| pet (default) | `pet` |
| assistant | `assistant` |
| scout | `scanner` |
| guardian | `shield` |
| battle | `battle_tool` |
| party | `projector` |

Aktivace spotřebuje **energy**; Pet Core lock při hunger/sick/neglect/sleep.

## Jak testovat

```bash
npm run test:phase3
npm run test:phase1
npm run test:phase2
node --check index.js
npm run test:preflight:fast
```

Live (po restartu MIA na :3000):

- Control Center: http://localhost:3000/mia-admin
- Status: `GET /api/mia-admin/status` → `phase: 3`, `kojNeeds`, `techForms`, `inventory`, `battle`
- Battle: `POST /api/mia-admin/test/battle` nebo `POST /arena/duel/start` → overlay `/arena-battle-overlay.html`
- Forms: `MIA_TECH_FORMS=1` + `POST /api/mia-admin/test/tech-form` `{ "formId": "scout" }`
- Inventory: `POST /api/mia-admin/test/inventory` `{ "itemId": "battle_token" }`

## Checklist Phase 3 (MVP)

- [x] Koj dlouhodobé potřeby (hunger/energy/mood + fatigue/techCharge persist)
- [x] Tech Forms jako funkce (flag, cost, gates, overlay hint)
- [x] Battle MVP close (announce → countdown → energy → score → win)
- [x] Inventář (thin stubs)
- [x] Divácké profily / levels (thin)

## Odloženo

- Overload / Party boss mode jako samostatná forma
- Plný inventář / economy / craft
- gift_storm + legendary_moment (Phase 2 zbytek)
- Theme Manager, big-bang split `index.js`
- Automatický grant inventáře po každém battle win (jen admin / first-support stub)
