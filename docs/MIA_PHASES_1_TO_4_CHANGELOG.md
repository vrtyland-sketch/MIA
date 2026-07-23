# MIA — Changelog Fáze 1–4

**Datum:** 2026-07-20  
**Účel:** stručný přehled toho, co každá fáze přidala (Runtime / Studio / Canon).

---

## Vrstvy teď

| Vrstva | Stav po Fázi 4 |
|--------|----------------|
| **MIA Runtime** | Stabilní páteř (event → fronta → Director → hra) + profily/export jako produktová hranice |
| **MIA Studio** | Control Center (`/mia-admin`), Gift Animation Desk (Lion blocks), Rig Desk zůstává mimo tuto osu |
| **MIA Canon** | Roadmapa + progress docs; Canon ≠ „už běží“, dokud není ve Runtime |

Hard rules beze změny: TikFinity → MIA → OBS · overlay jen `miaPoints` · dual voice default OFF · žádný big-bang split `index.js`.

---

## Fáze 1 — Stabilita

**Progress:** [`MIA_PHASE1_PROGRESS.md`](./MIA_PHASE1_PROGRESS.md)

| Přidáno | Kde |
|---------|-----|
| Jednotný event | `core/event-normalizer.js` |
| Action Queue | `core/action-queue.js` (default OFF) |
| Runtime state | `core/runtime-state.js` → `data/runtime-state.json` |
| Watchdog | `core/stream-watchdog.js` |
| Replay log | `core/event-log.js` + `npm run replay` |

**Flagy:** `MIA_ACTION_QUEUE=1` · `MIA_STREAM_WATCHDOG=0` (vypnout)

**URL / nástroje:** replay JSONL · stav v runtime-state

---

## Fáze 2 — Kvalita streamu

**Progress:** [`MIA_PHASE2_PROGRESS.md`](./MIA_PHASE2_PROGRESS.md)

| Přidáno | Kde |
|---------|-----|
| MIA Director | `core/mia-director.js` |
| Combo momenty | `core/combo-moments.js` |
| Paměť diváků | `core/viewer-memory.js` |
| Control Center | `/mia-admin`, `/admin` |
| Lion storyboard | `shared/mia-gift-animation/storyboard.js` |

**Flagy:** `MIA_DIRECTOR` (ON) · `MIA_COMBO_MOMENTS` · `MIA_VIEWER_MEMORY` · `MIA_DUAL_VOICE` (OFF)

**URL:** http://localhost:3000/mia-admin · `/api/mia-admin/status`

---

## Fáze 3 — Herní vrstva

**Progress:** [`MIA_PHASE3_PROGRESS.md`](./MIA_PHASE3_PROGRESS.md)

| Přidáno | Kde |
|---------|-----|
| Koj long-term needs | `core/koj-long-term-needs.js` |
| Tech Forms | `core/tech-forms-runtime.js` |
| Battle MVP | `scripts/MIA_PLATFORM_ARENA.js` (announce→countdown→active) |
| Inventář (thin) | `core/viewer-inventory.js` |
| Divácké levels | viewer-memory `level` |

**Flagy:** `MIA_TECH_FORMS=1` (default OFF) · `MIA_BATTLE_MVP` · `MIA_VIEWER_INVENTORY`

**URL:** `/api/mia-admin/test/battle` · `/arena-battle-overlay.html` · test tech-form / inventory

---

## Fáze 4 — Produktové hranice (MVP)

**Progress:** [`MIA_PHASE4_PROGRESS.md`](./MIA_PHASE4_PROGRESS.md) · Installer: [`MIA_INSTALLER.md`](./MIA_INSTALLER.md)

| Přidáno | Kde |
|---------|-----|
| Streamer profiles | `data/streamer-profiles/` · `/api/mia-admin/profiles` |
| Export / import | `/api/mia-admin/export` · `/api/mia-admin/import` |
| Setup | `npm run setup:mia` |
| User Mode stub | `MIA_USER_MODE=0` (default) |
| Multi-tenant | **deferred** (jen poznámka v docs/config) |

**Jak export / profil**

1. Otevři http://localhost:3000/mia-admin  
2. **Export JSON** → stáhne bundle (bez viewer-memory, bez secrets)  
3. **Uložit profil** → `data/streamer-profiles/<name>.json`  
4. **Načíst profil** / **Import JSON** → aktualizuje `config/runtime.json` → **restart MIA**

**Flagy:** `MIA_USER_MODE` (default OFF)

**Testy:** `npm run test:phase1` … `test:phase4` · `npm run test:preflight:fast`

---

## Klíčové URL (souhrn)

| Účel | URL |
|------|-----|
| Control Center | http://localhost:3000/mia-admin |
| Health / status | `/health` · `/status` |
| Export nastavení | `/api/mia-admin/export` |
| Profily | `/api/mia-admin/profiles` |
| Arena overlay | `/arena-battle-overlay.html` |

---

## Po pullu

**Restartuj MIA**, aby se načetly nové route a `phase4` v `config/runtime.json`.

Commit v této vlně **nebyl** vytvořen — dle požadavku.
