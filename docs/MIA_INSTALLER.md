# MIA Installer (Phase 4)

**Stav:** docs + setup skript (ne Windows EXE)  
**Datum:** 2026-07-20

Plný Windows instalátor (EXE/MSI) **není** v Phase 4 MVP. Stačí Node + repo + `npm run setup:mia`.

## Požadavky

- **Node.js 18+** (`node -v`)
- Git (volitelně) pro klon repa
- OBS Studio + WebSocket plugin (pro live overlay)
- TikFinity (ingest gift/chat) dle stávajícího MIA toku

## Rychlý start

```bash
cd C:\MIA
npm install
npm run setup:mia
```

`setup:mia` udělá:

1. Kontrola Node major ≥ 18  
2. Vytvoří `data/`, `data/streamer-profiles/`, `logs/` pokud chybí  
3. Zkopíruje `.env.example` → `.env` **jen když `.env` ještě neexistuje**

Pak:

```bash
# uprav .env (OBS_WS_URL, OBS_WS_PASSWORD, …)
npm start
```

Control Center: http://localhost:3000/mia-admin

## Co setup nedělá

- Neinstaluje OBS ani TikFinity  
- Nevytváří Windows službu / autostart  
- Nepisuje secrets do gitu  

## Profily a export

Viz [`MIA_PHASE4_PROGRESS.md`](./MIA_PHASE4_PROGRESS.md):

- Profily: `data/streamer-profiles/` · API `/api/mia-admin/profiles`
- Export: `GET /api/mia-admin/export` (default bez viewer-memory)
- Import: `POST /api/mia-admin/import`

## User Mode / multi-tenant

- `MIA_USER_MODE=0` (default) — stub flag  
- Multi-tenant = **odloženo** (není v MVP)

## Související

- Roadmapa: [`MIA_RUNTIME_ROADMAP.md`](./MIA_RUNTIME_ROADMAP.md)  
- Changelog 1–4: [`MIA_PHASES_1_TO_4_CHANGELOG.md`](./MIA_PHASES_1_TO_4_CHANGELOG.md)
