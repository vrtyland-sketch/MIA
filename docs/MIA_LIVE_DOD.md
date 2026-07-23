# MIA Live DoD — stream-ready checklist

**Účel:** před live ověřit Runtime 1–4 + OBS grafiku (freeze).  
**Datum šablony:** 2026-07-20  
**Výsledky běhu:** [`MIA_LIVE_DOD_RESULTS.md`](./MIA_LIVE_DOD_RESULTS.md)  
**Commit plán (freeze, bez commitu):** [`MIA_COMMIT_PLAN_RUNTIME_1_4.md`](./MIA_COMMIT_PLAN_RUNTIME_1_4.md)

**Skóre:** 🟢 pass · 🟡 partial / manuál · 🔴 fail / blokuje live  
**Poslední běh:** ~**91 %** 🟢 — detail ve [`MIA_LIVE_DOD_RESULTS.md`](./MIA_LIVE_DOD_RESULTS.md)

Hard rules: TikFinity → MIA → OBS · overlay jen `miaPoints` · dual voice default OFF · žádný big-bang split `index.js`.

---

## 1. Server / OBS / health

| # | Kontrola | Jak | Pass kritérium | 🟢/🟡/🔴 |
|---|----------|-----|----------------|---------|
| 1.1 | MIA běží | `npm run restart` (nebo `npm start`) | proces živý, port 3000 | 🟢 |
| 1.2 | Health | `GET http://127.0.0.1:3000/health` | HTTP 200, ok/service | 🟢 |
| 1.3 | Admin status (Fáze 4) | `GET /api/mia-admin/status` | `phase: 4`, `ok: true` | 🟢 |
| 1.4 | OBS WebSocket | OBS + plugin, port 4455, heslo v `.env` | WS connected (watchdog / log) | 🟢 |
| 1.5 | Scéna | `SPINAK_ENGINE_GIFTS` (nebo `MIA_OBS_CAMERA_SCENE`) | program scéna správná | 🟢 |
| 1.6 | Syntax / preflight | `node --check index.js` · `npm run test:preflight:fast` | exit 0 (1× retry OK) | 🟢 |

---

## 2. Overlay sources + cache bust

Dual bust (živý stream):

```text
freeze baseline = 32-gfx-whole
active runtime bust = 36-koj-unify
gift-only polish = 37-stream-polish
```

| # | OBS zdroj (alias) | URL | Pass kritérium | 🟢/🟡/🔴 |
|---|-------------------|-----|----------------|---------|
| 2.1 | `MIA_BUBBLE` / `MIA_SPEECH` | `/speech-overlay.html?v=36-koj-unify` | hologram + bublina, bez coins | 🟢 |
| 2.2 | `KOJNOZROUT_RUNTIME` / `MIA_KOJ_RUNTIME` | `/kojnozrout-runtime.html?v=36-koj-unify` | Koj vidět, half-robot art | 🟢 URL / 🟡 Preview |
| 2.3 | `MIA_GIFT_ANIMATION` | `/gift-animation-overlay.html?v=37-stream-polish` | idle průhledný; T4 stage | 🟢 URL / 🟡 stage |
| 2.4 | Bust konzistence | runtime = `36` · gift = `37` (ne starý v30/v32/v34 gift) | po změně: Refresh cache / `npm run obs:refresh-overlays` | 🟢 |
| 2.5 | Body-party OFF | `MIA_HEAD`…`MIA_FEET` skryté | žádná dvojitá MIA · audit v refresh JSON | 🟢 |

**Bust hinty:** po art / kotvách vždy refresh browser source (pravý klik → Refresh cache) nebo `npm run obs:refresh-overlays`. Staré gift `?v=36-…` / `?v=34-…` / bez `?v=` = 🟡 cache riziko. Předstream checklist: [`MIA_PRESTREAM_DOD.md`](./MIA_PRESTREAM_DOD.md).

---

## 3. Single voice (dual OFF)

| # | Kontrola | Jak | Pass kritérium | 🟢/🟡/🔴 |
|---|----------|-----|----------------|---------|
| 3.1 | Dual voice | `MIA_DUAL_VOICE` unset / `0` · status | jeden hlasový výstup | 🟢 |
| 3.2 | TikFinity widget | mute (ensure-voice) | žádný druhý TTS z widgetu | 🟡 |
| 3.3 | `MIA_VOICE` | browser source ON (audio) | jen MIA cesta | 🟡 |

---

## 4. Action Queue test

| # | Kontrola | Jak | Pass kritérium | 🟢/🟡/🔴 |
|---|----------|-----|----------------|---------|
| 4.1 | Enable | Admin **AQ ON** nebo `MIA_ACTION_QUEUE=1` | status `actionQueue.enabled` | 🟡 default OFF (záměr) |
| 4.2 | Contract | `npm run test:phase1` | exit 0 | 🟢 |
| 4.3 | Live smoke (volitelně) | 2–3 rychlé T1 z adminu | coalesce / bez překřikování | 🟡 |

Default v `config/runtime.json`: Action Queue **OFF** (ne soak-default).  
Produkční harden: [`MIA_AQ_PRODUCTION.md`](./MIA_AQ_PRODUCTION.md) — admin toggle + flush **bez restartu**; kill `MIA_ACTION_QUEUE=0`.

**PowerShell — admin toggle (bez env restartu):**

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/api/mia-admin/action-queue -ContentType application/json -Body '{"enabled":true}'
1..3 | ForEach-Object { Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/api/mia-admin/test/gift -ContentType application/json -Body '{"tier":"T1","userLabel":"AQ Spam"}' }
(Invoke-RestMethod http://127.0.0.1:3000/api/mia-admin/status).actionQueue
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/api/mia-admin/action-queue -ContentType application/json -Body '{"flush":true}'
```

**Alt env:** `$env:MIA_ACTION_QUEUE='1'; npm run restart` — po testu `MIA_ACTION_QUEUE=0` + restart, pokud nechceš frontu na live.

---

## 5. Admin smoke (Control Center)

URL: http://127.0.0.1:3000/mia-admin

| # | Akce | Endpoint / UI | Pass kritérium | 🟢/🟡/🔴 | Pozn. |
|---|------|---------------|----------------|---------|-------|
| 5.1 | T1 stub | `POST /api/mia-admin/test/gift` `{ "tier": "T1" }` | ok, video/TTS bez crash | 🟢 | bezpečný smoke |
| 5.2 | T2 | tier `T2` | ok | 🟢 | API 2026-07-20 |
| 5.3 | T3 | tier `T3` | ok | 🟢 | API |
| 5.4 | T4 | tier `T4` (Lion) | gift anim + TTS | 🟢 API / 🟡 Preview | |
| 5.5 | Bowl stub | `POST …/test/bowl` | ok (high gift stub) | 🟢 | mírný vliv na bowl stav |
| 5.6 | Battle | `POST …/test/battle` | announce→countdown / active | 🟢 | skipPhases OK |
| 5.7 | Export | `GET /api/mia-admin/export` | JSON bundle, bez secrets | 🟢 | read-only |
| 5.8 | Profily | `GET /api/mia-admin/profiles` | seznam OK | 🟢 | load/import = restart |

Nepouštět import / load profilu těsně před live, pokud nechceš restart.

---

## 6. Director / combo / memory ON

| # | Modul | Flag / config | Pass kritérium | 🟢/🟡/🔴 |
|---|-------|---------------|----------------|---------|
| 6.1 | Director | `phase2.director.enabled` / `MIA_DIRECTOR` | ON ve status | 🟢 |
| 6.2 | Combo moments | `MIA_COMBO_MOMENTS` | ON | 🟢 |
| 6.3 | Viewer memory | `MIA_VIEWER_MEMORY` | ON · path `data/viewer-memory.json` | 🟢 |
| 6.4 | Phase2 contracts | `npm run test:phase2` | exit 0 | 🟢 |

---

## 7. Koj half-robot visible

| # | Kontrola | Jak | Pass kritérium | 🟢/🟡/🔴 |
|---|----------|-----|----------------|---------|
| 7.1 | Art bust v36 | Koj runtime URL `36-koj-unify` | Soft Neon purple half-robot (ne starý teal-only) | 🟢 |
| 7.2 | Runtime vrstva ON | `KOJNOZROUT_RUNTIME` viditelný | sprite + belly HUD | 🟢 source / 🟡 Preview |
| 7.3 | Phase3 needs | long-term needs v status | fatigue/techCharge žijí | 🟢 |

Detaily artu: [`GRAPHICS_v36_KOJ_UNIFY.md`](./GRAPHICS_v36_KOJ_UNIFY.md).

---

## 8. Automatizované contracty (před live)

| # | Příkaz | Pass | 🟢/🟡/🔴 |
|---|--------|------|---------|
| 8.1 | `npm run test:phase1` | exit 0 | 🟢 |
| 8.2 | `npm run test:phase2` | exit 0 | 🟢 |
| 8.3 | `npm run test:phase3` | exit 0 | 🟢 |
| 8.4 | `npm run test:phase4` | exit 0 | 🟢 |
| 8.5 | `node --check index.js` | exit 0 | 🟢 |
| 8.6 | `npm run test:preflight:fast` | exit 0 (1× retry) | 🟢 151/151 |

---

## Manuál operátor (OBS / admin) — před Go Live

1. Otevři OBS scénu `SPINAK_ENGINE_GIFTS`.  
2. Zkontroluj URL: speech/Koj → `?v=36-koj-unify`; gift → `?v=37-stream-polish`.  
3. Refresh cache všech tří browser sources (nebo `npm run obs:refresh-overlays`).  
4. Ověř: body-party skryté, dual voice OFF, TikFinity muted.  
5. Otevři `/mia-admin` → T1 → T4 → (volitelně) bowl / battle.  
6. Pokud chceš Action Queue: v `/mia-admin` **AQ ON** (nebo one-liner v §4); kill `MIA_ACTION_QUEUE=0`.  
7. Vizuelně: Koj half-robot vpravo dole, MIA bublina bez coins.  
8. Commit: až řekneš „commit“ — plán 1–5 v [`MIA_COMMIT_PLAN_RUNTIME_1_4.md`](./MIA_COMMIT_PLAN_RUNTIME_1_4.md) · předstream [`MIA_PRESTREAM_DOD.md`](./MIA_PRESTREAM_DOD.md).

---

## Související

- [`MIA_PRESTREAM_DOD.md`](./MIA_PRESTREAM_DOD.md)  
- [`MIA_AQ_PRODUCTION.md`](./MIA_AQ_PRODUCTION.md)  
- [`MIA_PHASES_1_TO_4_CHANGELOG.md`](./MIA_PHASES_1_TO_4_CHANGELOG.md)  
- [`OBS_LIVE_SETUP.md`](./OBS_LIVE_SETUP.md)  
- [`MIA_RUNTIME_ROADMAP.md`](./MIA_RUNTIME_ROADMAP.md)  
- [`MIA_GRAPHICS_WHOLE.md`](./MIA_GRAPHICS_WHOLE.md)  
