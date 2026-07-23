# MIA Post-DoD Progress

**Datum:** 2026-07-21  
**Stav:** product slice po Live DoD ~91% + AQ production harden (commit zatím ne)  
**Předchozí:** [`MIA_LIVE_DOD.md`](./MIA_LIVE_DOD.md) · [`MIA_AQ_PRODUCTION.md`](./MIA_AQ_PRODUCTION.md) · [`MIA_PHASE2_PROGRESS.md`](./MIA_PHASE2_PROGRESS.md)

## Co přibylo

| Modul | Cesta |
|-------|--------|
| Storyboard Universe / Galaxy / Rose | `shared/mia-gift-animation/storyboard.js` |
| Theme Manager thin MVP | `core/theme-manager.js` |
| Admin theme API | `GET/POST /api/mia-admin/theme` + toggle v `/mia-admin` |
| Overlay hint | `/overlay-state` → `theme` (`cssVars` jen když flag ON) |
| Gift overlay bust | `37-stream-polish` (speech/Koj/bowl zůstávají `36-koj-unify`) |
| **Action Queue production** | `core/action-queue.js` + admin AQ ON/OFF/Flush |

## Action Queue (produkční gap uzavřen)

Roadmap verdikt: Queue + Director + Replay — **Queue default OFF**, ale bezpečně zapínatelná.

| Položka | Stav |
|---------|------|
| Default | **OFF** (ne soak-default — TTS/gift path) |
| Kill switch | `MIA_ACTION_QUEUE=0` |
| Admin | `/mia-admin` AQ ON · OFF · Flush · depth |
| API | `GET/POST /api/mia-admin/action-queue` |
| Gift thanks | `gift_thanks` + Director coalesce / intensity |
| Gift present | `gift_present` ve gift media path (miaPoints only) |

Detail: [`MIA_AQ_PRODUCTION.md`](./MIA_AQ_PRODUCTION.md)

## Storyboard pipeline

Stejný blokový tok jako Lion:

`intro → avatar → react → koj → outro`

| Gift | React block | Effect |
|------|-------------|--------|
| Lion | `roar` | `lion_roar` |
| Universe | `react` | `universe_surge` |
| Galaxy | `react` | `galaxy_burst` |
| Rose | `react` | `rose_bloom` |

Overlay payload: jen `miaPoints` (žádné coins).

## Theme Manager

| Flag | Default | Význam |
|------|---------|--------|
| `MIA_THEME_MANAGER` | **OFF** | `1` zapne apply CSS vars přes overlay-state |

Témata: **Cyber** · **Purple Robot** · **Arena**.

Persist: `data/mia-theme.json` (výběr tématu i při OFF; apply až po flagu).

## Jak testovat

```bash
node --check index.js
node tests/phase1_action_queue_contract.js
node tests/phase2_admin_storyboard_contract.js
node tests/theme_manager_contract.js
npm run test:phase1
npm run test:phase2
npm run test:preflight:fast
```

### Action Queue (běžící MIA)

1. http://127.0.0.1:3000/mia-admin → **AQ ON**
2. 2–3× T1 Rose rychle za sebou → status `depth` / coalesce log
3. **Flush** vyprázdní frontu; **AQ OFF** vypne bez restartu
4. Kill: `MIA_ACTION_QUEUE=0` (překryje admin i config)

### Themes (běžící MIA)

1. Restart s `MIA_THEME_MANAGER=1`
2. http://127.0.0.1:3000/mia-admin → tlačítka Cyber / Purple Robot / Arena
3. `GET /overlay-state` → `theme.enabled=true` + `theme.cssVars`
4. Gift overlay (`?v=37-stream-polish`) aplikuje `--accent` / Soft Neon tokeny

Bez flagu: theme se uloží, ale `cssVars` v overlay-state je `null`.

### Universe / Galaxy generate

1. Gift Desk: `/mia-paint/gift-animation-desk.html` → chip Universe / Galaxy  
2. nebo `POST /api/gift-animation/generate` s `giftName: "Universe"` / `"Galaxy"`  
3. OBS: refresh **MIA_GIFT_ANIMATION** na  
   `http://127.0.0.1:3000/gift-animation-overlay.html?v=37-stream-polish`

Storyboard výběr (desk/preview):

```js
const { resolveStoryboard } = require("./shared/mia-gift-animation/storyboard");
resolveStoryboard("Universe"); // blocks intro…outro
```

## Guardrails (beze změny)

- TikFinity → MIA → OBS  
- Overlay jen `miaPoints`  
- Dual voice OFF  
- v32 freeze art nedotčen  
- Dual bust:

```text
freeze baseline = 32-gfx-whole
active runtime bust = 36-koj-unify
gift-only polish = 37-stream-polish
```

## Commit

**Čeká na explicitní request** — zatím necommitováno. Plán splitů 1–5: [`MIA_COMMIT_PLAN_RUNTIME_1_4.md`](./MIA_COMMIT_PLAN_RUNTIME_1_4.md) · předstream: [`MIA_PRESTREAM_DOD.md`](./MIA_PRESTREAM_DOD.md).
