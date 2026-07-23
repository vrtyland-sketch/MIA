# MIA Action Queue — Production Harden

**Datum:** 2026-07-21  
**Stav:** post-DoD production slice (commit zatím ne)  
**Souvisí:** [`MIA_RUNTIME_ROADMAP.md`](./MIA_RUNTIME_ROADMAP.md) · [`MIA_LIVE_DOD.md`](./MIA_LIVE_DOD.md) · [`MIA_POST_DOD_PROGRESS.md`](./MIA_POST_DOD_PROGRESS.md)

## Verdikt

Trojice roadmapy: **Action Queue + Director + Replay**.  
Director = ON · Replay = existuje · Action Queue = produkčně zpevněná, **default stále OFF**.

### Proč default OFF (ne soak-default ON)

Zapnutí mění TTS thank path i gift-present cue (coalesce / priority / interrupt).  
Bez delšího live soaku na streamu je bezpečnější **opt-in** přes admin nebo env, s kill switchem.

## Enable / kill

| Zdroj | Chování |
|-------|---------|
| `MIA_ACTION_QUEUE=0` | **Kill switch** — vždy OFF |
| `MIA_ACTION_QUEUE=1` | ON |
| Admin toggle | ON/OFF **bez restartu** (`data/mia-action-queue.json` + live `runtimeConfig`) |
| `config/runtime.json` → `phase1.actionQueue.enabled` | ON když `true` (po adminu i in-memory) |

## Admin Control Center

URL: http://127.0.0.1:3000/mia-admin

- **AQ ON / AQ OFF** — `POST /api/mia-admin/action-queue` `{ "enabled": true|false }`
- **Flush** — `{ "flush": true }` vyprázdní frontu
- Status: `depth` + `snapshot` (i v `GET /api/mia-admin/status`)

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/api/mia-admin/action-queue -ContentType application/json -Body '{"enabled":true}'
```

## Co se zlepšilo

1. **Priorita + Director intensity** — vysoká intensity bumpne speak prioritu; spectacle může přerušit klidnější thanks  
2. **Coalesce** — `gift_thanks` + Director `coalescePolicy.windowMs`; spam T1 se sloučí  
3. **Gift present** — `gift_present` akce (miaPoints only) přes frontu v gift media path  
4. **Runner** — speak + overlay + gift_present; handlery se slučují na shared runneru  
5. **Flush + depth** v adminu  

## Testy

```bash
node --check index.js
node tests/phase1_action_queue_contract.js
npm run test:phase1
npm run test:phase2
npm run test:preflight:fast
```

## Guardrails

- TikFinity → MIA → OBS  
- Overlay jen `miaPoints`  
- Dual voice OFF  
- Minimální zásah do `index.js`  
