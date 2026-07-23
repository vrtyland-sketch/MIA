# MIA Live DoD — výsledky běhu

**Datum:** 2026-07-20 · ~22:55 CEST  
**Refresh:** 2026-07-21 ~20:05 CEST — prestream Preview / mute / AQ soak · [`MIA_PRESTREAM_DOD.md`](./MIA_PRESTREAM_DOD.md) · audit [`MIA_AUDIT_2026-07-21.md`](./MIA_AUDIT_2026-07-21.md)  
**Checklist:** [`MIA_LIVE_DOD.md`](./MIA_LIVE_DOD.md)  
**Commit plán:** [`MIA_COMMIT_PLAN_RUNTIME_1_4.md`](./MIA_COMMIT_PLAN_RUNTIME_1_4.md) (splity **1–5**)  
**Checkpoint C1–C5 + docs:** lokálně (`874227d6`…`bc126646`, docs `4bf3e582`) · **push ⏳** · zbývající dirty: [`MIA_DIRTY_TREE_AFTER_C5.md`](./MIA_DIRTY_TREE_AFTER_C5.md)

### Confirmed status 2026-07-21 evening

| Položka | Stav |
|---------|------|
| Preview | 🟢 |
| AQ soak | 🟢 |
| Mute logika | 🟢 |
| Ucho (manuál listen) | ⏳ stále otevřené |
| DoD | **~94 %** |
| Push | **NE** — až po explicitním go |

MIA ready na finální manuální check + safe checkpoint. Největší otevřené: **ucho** + triage zbývajícího dirty (C1–C5 už jsou commitnuté).

## Verdikt

**DoD skóre: ~91 % → ~92 % → ~94 % (prestream soak) · celkově 🟢 stream-ready**

- Runtime Fáze 1–4 contracty: **🟢** (phase1–4 exit 0)  
- Live server + OBS WS + dual bust `36` / gift `37`: **🟢**  
- Preflight fast: **🟢** 151/151  
- Admin T1–T4 + bowl + battle stub: **🟢**  
- OBS Preview refresh + core 6/6 + body-parts OFF + screenshoty: **🟢**  
- Mute logika (OBS `MIA_VOICE`): **🟢** · ucho backlog: **⏳** human  
- Action Queue short soak: **🟢** · default **OFF** po testu  
- Dual voice: **🟢** OFF · TikFinity muted  

Žádné **🔴** blokující.

---

## Co se opravilo v této vlně

1. **`runtime_state_seed_ctx`** — `buildRuntimeStateSeedCtx` přijímá `host.phase1RuntimeState` (včetně `null`) → test izolovaný od live `data/runtime-state.json`; přidaný inject-compose assert.  
2. **Admin smoke T2–T4 / bowl / battle** — automaticky přes `/api/mia-admin/test/*`.  
3. **OBS refresh** — `audit.bodyPartsAllOff` + `coreSources` v outputu `obs:refresh-overlays`.  
4. Docs / skóre aktualizovány.

---

## 1. Server / OBS / health

| # | Kontrola | Výsledek | Poznámka |
|---|----------|----------|----------|
| 1.1 | MIA běží | 🟢 | port 3000, health ok |
| 1.2 | `/health` | 🟢 | `ok:true`, `obsConnected:true` |
| 1.3 | `/api/mia-admin/status` | 🟢 | `phase:4`, director ON |
| 1.4 | OBS WebSocket | 🟢 | health + refresh OK |
| 1.5 | Scéna / overlay URL | 🟢 | speech/runtime `36-koj-unify` · gift `37-stream-polish` |
| 1.6 | `node --check index.js` | 🟢 | exit 0 |
| 1.6b | `test:preflight:fast` | 🟢 | **151/151** · exit 0 (bez retry) |

---

## 2. Overlay + bust

| # | Kontrola | Výsledek | Poznámka |
|---|----------|----------|----------|
| 2.1–2.3 | URL v health | 🟢 | speech/Koj `36-koj-unify` · gift `37-stream-polish` |
| 2.4 | `npm run obs:refresh-overlays` | 🟢 | `refreshed:26`, dual bust 36/37, core 6/6 |
| 2.5 | Body-party OFF | 🟢 | audit: HEAD/TORSO/EYES/HANDS/FEET + PREVIEW all `enabledAfter:false` |

---

## 3. Single voice

| # | Kontrola | Výsledek | Poznámka |
|---|----------|----------|----------|
| 3.1 | Dual OFF | 🟢 | default OFF · phase2 „never revives dual“ |
| 3.2–3.3 | TikFinity mute / MIA_VOICE | 🟢 / ⏳ | TikFinity muted; mute test via OBS `MIA_VOICE` — logika 🟢, ucho ⏳ |

---

## 4. Action Queue

| # | Kontrola | Výsledek | Poznámka |
|---|----------|----------|----------|
| 4.1 | Live flag | 🟢 | default OFF; admin ON→soak→OFF bez restartu |
| 4.2 | `test:phase1` | 🟢 | priority + coalesce + director intensity + gift_present |
| 4.3 | Live spam coalesce | 🟢 | short soak 21.7. — T1×8+T2+chat+T3, depth max 0, flush, OFF (`.tmp-audit/prestream-aq-soak.json`) |

**Post-DoD:** produkční harden — kill `MIA_ACTION_QUEUE=0`, admin ON/OFF/Flush, `gift_thanks` coalesce + `gift_present`.

---

## 5. Admin smoke

| # | Akce | Výsledek | Poznámka |
|---|------|----------|----------|
| 5.1 | T1 gift stub | 🟢 | dříve OK |
| 5.2 | T2 | 🟢 | `POST …/test/gift` tier T2 → ok |
| 5.3 | T3 | 🟢 | Universe → ok |
| 5.4 | T4 | 🟢 | Lion → ok (API); vizuál stage = Preview manuál |
| 5.5 | Bowl | 🟢 | `stub:full_bowl_gift` → ok |
| 5.6 | Battle | 🟢 | duel `phase:active` (skipPhases) → pak finished |
| 5.7 | Export | 🟢 | bundle OK |
| 5.8 | Profily | 🟢 | API OK |

---

## 6. Director / combo / memory

| # | Modul | Výsledek | Poznámka |
|---|-------|----------|----------|
| 6.1 | Director | 🟢 | `enabled:true` |
| 6.2 | Combo | 🟢 | `test:phase2` |
| 6.3 | Viewer memory | 🟢 | top users včetně DoD T2–T4 / Bowl |
| 6.4 | `test:phase2` | 🟢 | exit 0 |

---

## 7. Koj half-robot

| # | Kontrola | Výsledek | Poznámka |
|---|----------|----------|----------|
| 7.1 | Bust v36 | 🟢 | URL + OBS refresh |
| 7.2 | Vizuál half-robot | 🟢 | screenshot `.tmp-audit/prestream-kojnozrout-runtime.png` + scene |
| 7.3 | Long-term needs | 🟢 | `kojNeeds` fatigue/techCharge/hunger v status |

---

## 8. Automatizované contracty

| Příkaz | Výsledek |
|--------|----------|
| `npm run test:phase1` | 🟢 exit 0 |
| `npm run test:phase2` | 🟢 exit 0 |
| `npm run test:phase3` | 🟢 exit 0 |
| `npm run test:phase4` | 🟢 exit 0 |
| `node --check index.js` | 🟢 exit 0 |
| `npm run test:preflight:fast` | 🟢 **151/151** |

**Fix seed:** test předává `phase1RuntimeState: null`, aby live `hunger≈71` z `data/runtime-state.json` nerozbíjel mock assert `hunger:50`. Compose path pokrytý inject testem.

---

## Prestream běh 21.7. ~20:00 (automatizováno)

| Položka | Verdikt | Artefakty |
|---------|---------|-----------|
| OBS refresh + core/body audit | 🟢 | `obs:refresh-overlays` · gift bust `37-stream-polish` |
| Preview screenshoty | 🟢 | `.tmp-audit/prestream-preview-scene.png`, `prestream-mia-bubble.png`, `prestream-kojnozrout-runtime.png`, `prestream-kojnozrout-bowl-v2.png`, `prestream-mia-gift-animation.png` (idle černý) |
| Mute (OBS `MIA_VOICE`) | 🟢 logika / ⏳ ucho | `.tmp-audit/prestream-mute-report.json` |
| AQ short soak | 🟢 | `.tmp-audit/prestream-aq-soak.json` |

## Manuál — co ještě před Go Live

1. **Ucho po unmute** `MIA_VOICE` (3–5 s) — žádná fronta starých vět.  
2. Volitelně: aktivní gift moment v Preview (jméno / `miaPoints`, ne coins).  
3. **Push** C1–C5 (+ docs) až po explicitním go.  
4. Triage zbývajícího dirty — [`MIA_DIRTY_TREE_AFTER_C5.md`](./MIA_DIRTY_TREE_AFTER_C5.md) (ne C1–C5).

---

## Soubory této vlny

- `scripts/MIA_RUNTIME_STATE_SEED_CTX.js` — izolace `phase1RuntimeState`  
- `tests/runtime_state_seed_ctx_contract.js` — null + inject compose  
- `scripts/obs_refresh_overlays.js` — audit body-parts / core sources  
- `docs/MIA_LIVE_DOD.md` / `docs/MIA_LIVE_DOD_RESULTS.md`  
