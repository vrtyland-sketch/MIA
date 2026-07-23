# MIA Phase 2 — Progress

**Datum:** 2026-07-20  
**Stav:** Phase 2 stream quality slice shipped (bez commit)  
**Roadmapa:** [`MIA_RUNTIME_ROADMAP.md`](./MIA_RUNTIME_ROADMAP.md) · Phase 1: [`MIA_PHASE1_PROGRESS.md`](./MIA_PHASE1_PROGRESS.md)

## Co přibylo

| Modul | Cesta |
|-------|--------|
| MIA Director | `core/mia-director.js` |
| Combo moments | `core/combo-moments.js` |
| Viewer memory | `core/viewer-memory.js` → `data/viewer-memory.json` |
| Control Center | `routes/admin.js` + `mia-output-overlay/mia-admin.html` (`/admin`, `/mia-admin`) |
| Lion storyboard | `shared/mia-gift-animation/storyboard.js` |

## Wiring (minimální)

1. **Enrich** (`scripts/pipeline/phase_enrich.js`) — po normalizaci: viewer memory, combo observe, `miaDirection` plan.
2. **TTS thank path** (`scripts/MIA_DELIVERY_RUNTIME.js` → `enqueueVoiceSpeak`) — Director speaker / coalesce / anti-dual.
3. **Gift presentation** — Phase 2 combo moment merge + direction meta.
4. **Thank text** (`MIA_RESPONSE_ENGINE` + `action_builder`) — memory line když Director dovolí.
5. **HTTP** — `registerAdminRoutes` v `routes/index.js`.

## Flagy

| Flag | Default | Význam |
|------|---------|--------|
| `MIA_DIRECTOR` | ON | `0` vypne Director |
| `MIA_COMBO_MOMENTS` | ON | `0` vypne detektor |
| `MIA_VIEWER_MEMORY` | ON | `0` vypne zápis paměti |
| `MIA_DUAL_VOICE` | OFF | Director **nikdy** nezapíná dual |
| `MIA_ACTION_QUEUE` | OFF | Phase 1 fronta (beze změny) |

## Jak testovat

```bash
npm run test:phase2
npm run test:phase1
node --check index.js
npm run test:preflight:fast
```

Live (běžící MIA na :3000):

- Control Center: http://localhost:3000/mia-admin (nebo `/admin`)
- Tlačítka T1–T4 / bowl stub / chat → normalizované test eventy
- Status: `/api/mia-admin/status`, `/health`, `/status`

## Odloženo (Phase 2 zbytek / Phase 4)

- gift_storm + legendary_moment (combo typy)
- plný Theme Manager
- hlubší Gift Animation Desk (víc giftů než Lion blocks)
- big-bang split `index.js`

Phase 3 Game Layer → [`MIA_PHASE3_PROGRESS.md`](./MIA_PHASE3_PROGRESS.md)

## Checklist Phase 2 (slice)

- [x] MIA Director (mood, speaker, intensity, overlayHints, coalescePolicy)
- [x] Combo: solo_combo, community_burst, first_support, bowl_rush
- [x] Viewer memory JSON (bez private chat)
- [x] Control Center stub
- [x] Lion storyboard blocks (data-driven)
