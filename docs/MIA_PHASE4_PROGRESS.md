# MIA Phase 4 — Progress

**Datum:** 2026-07-20  
**Stav:** Phase 4 product-boundary MVP shipped (bez commit)  
**Roadmapa:** [`MIA_RUNTIME_ROADMAP.md`](./MIA_RUNTIME_ROADMAP.md) · Changelog: [`MIA_PHASES_1_TO_4_CHANGELOG.md`](./MIA_PHASES_1_TO_4_CHANGELOG.md)

## Co přibylo

| Modul | Cesta |
|-------|--------|
| Streamer profiles | `core/streamer-profiles.js` → `data/streamer-profiles/` |
| Settings export/import | `core/settings-bundle.js` |
| User Mode stub | `core/user-mode.js` (`MIA_USER_MODE`) |
| Setup skript | `scripts/mia_setup.js` (`npm run setup:mia`) |
| Installer docs | `docs/MIA_INSTALLER.md` |
| Admin UI | `mia-output-overlay/mia-admin.html` (profily + export/import) |
| Admin API | `routes/admin.js` |

## Wiring

1. **Profily** — uloží slice `config/runtime.json` (phase1–4) + flag/voice hints + pointery (gift map / solo-stream).  
2. **Load profilu** — zapíše `runtime.json`, `_active.json`; env voice/flags jen jako hints → **restart MIA**.  
3. **Export** — JSON bundle bez secrets; viewer-memory defaultně vyloučeno (`?includeViewerMemory=1` volitelně).  
4. **Import** — merge runtime slice; volitelně viewer-memory.  
5. **User Mode** — flag stub, žádný multi-tenant surface.  
6. **HTTP** — Control Center tlačítka + API níže.

## Flagy

| Flag | Default | Význam |
|------|---------|--------|
| `MIA_USER_MODE` | **OFF** (`0` / unset) | Stub User Mode (`1` = flag ON, stále stub) |
| (ostatní Phase 1–3) | beze změny | Director, AQ, Tech Forms, … |

Config: `config/runtime.json` → `phase4.*`  
Multi-tenant: `phase4.multiTenant.status = "deferred"`

## API

| Method | Path | Účel |
|--------|------|------|
| GET | `/api/mia-admin/profiles` | seznam |
| POST | `/api/mia-admin/profiles` | uložit `{ "name": "…" }` |
| POST | `/api/mia-admin/profiles/load` | načíst |
| POST | `/api/mia-admin/profiles/delete` | smazat |
| GET | `/api/mia-admin/export` | stáhnout bundle |
| POST | `/api/mia-admin/import` | nahrát `{ "bundle": {…} }` |

## Jak testovat

```bash
npm run setup:mia
npm run test:phase4
npm run test:phase1
npm run test:phase2
npm run test:phase3
node --check index.js
npm run test:preflight:fast
```

Live (po **restartu** MIA na :3000):

- Control Center: http://localhost:3000/mia-admin  
- Status: `GET /api/mia-admin/status` → `phase: 4`, `profiles`, `userMode`  
- Export: http://localhost:3000/api/mia-admin/export  

## Checklist Phase 4 (MVP)

- [x] Konfigurační profily streamerů  
- [x] Instalátor (docs + `setup:mia`, ne EXE)  
- [x] Export / import nastavení  
- [x] User Mode stub / flag  
- [x] Multi-tenant — **explicitně deferred** (jen docs/config poznámka)

## Odloženo

- Windows EXE / MSI instalátor  
- Multi-tenant / cloud tenant izolace  
- Live hot-apply env flagů bez restartu  
- Samostatný `gifts.json` / `tiers.json` (zatím pointery na gift map)
