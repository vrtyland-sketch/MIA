# MIA AUDIT KROK -1 — Strom projektu

> Datum: 2026-07-27 | Etapa 1 — inventura | Repo: C:\MIA

## Souhrn

| Metrika | Hodnota |
|---------|---------|
| Složky (mimo node_modules/.git) | 4600 |
| Soubory (mimo node_modules/.git) | 101722 |
| Celková velikost (mimo node_modules/.git) | ~17,6 GB (18 905 437 444 B) |
| Soubory (mimo .tmp-audit cache) | ~93108 |
| JS soubory (mimo node_modules) | 1354 |
| JS first-party moduly (inventarizované) | 1255 |
| Test soubory (tests/) | 427 |
| Dokumentace (docs/ + _canon_import/) | 609 |
| node_modules (soubory / složky) | 1672 / 252 |
| .git (soubory / složky) | 226 / 142 |

## Strom (max. hloubka 4, node_modules collapsed)

```
MIA/
├── _canon_import/          # Import master kánonu (0001–0300+)
├── _obs_scene_backups/     # Zálohy OBS scén (JSON)
├── .cursor/rules/          # Cursor guardrails a kánon pravidla
├── .tmp-audit/             # Dočasné audit/cache profily Edge [NEPOUŽÍVAT v produkci]
├── archive/deprecated/     # Archivovaný deprecated kód a assety
├── config/                 # JSON konfigurace runtime
├── core/                   # Engine 2.0 core moduly (16 souborů)
├── data/                   # Runtime data, avatar-cache/*.bin, paint, profily
├── docs/                   # Dokumentace + master-canon alignment
├── downloads/              # Stažené soubory
├── engine2/                # Engine 2.0 modulární vrstva (11 modulů)
├── game/hello/             # Game layer stub
├── generated/walkthrough/  # Generované walkthrough artefakty
├── imports/chatgpt/        # ChatGPT import kanon
├── incoming-images/        # Intake obrázků/videí (gift-map screenshots)
├── ingest/                 # Ingest entry modul
├── legacy/                 # Legacy kopie (MIA_SUPPORT_RESOLVER)
├── logs/                   # Runtime logy
├── MIA_NEXT/               # Shadow runtime + spam session
│   ├── action/
│   └── decision/
├── mia-output-overlay/     # OBS overlay HTML/CSS/JS + masivní asset strom
│   ├── anchors/
│   ├── assets/             # kojnozrout, animation-bank, gift-creatures, mia/
│   ├── generated/
│   ├── lib/
│   ├── mia-paint/
│   └── vendor/
├── node_modules/           [collapsed — npm dependencies]
├── output/                 # Výstupní soubory
├── plugins/mia-paint/      # Paint pluginy (grid, koj-factory-export)
├── renderers/              # obs_overlay_render.js
├── routes/                 # Express routes
├── scripts/                # ~437 JS — hlavní business logika MIA_*
│   └── pipeline/           # phase_decide, phase_enrich, phase_observe
├── secrets/local/          # Lokální secrets (mimo git)
├── shared/                 # ~70+ mia-*-core modulů, platform_runtime, gifts
│   ├── archiv_dead*/       # Mrtvé archivy
│   ├── gifts/gift_map/
│   ├── platform_normalizers/
│   ├── platform_runtime/
│   └── runtime_execution/
├── src/routes/             # Alternativní ingest route
├── tests/                  # ~425 contract/smoke testů
├── text-bank/packs/        # Textové banky (community, emotion, koj, mia…)
├── tools/                  # mia-paint-shell, mia-paint-tauri
├── index.js                # Hlavní monolitický entrypoint (~4461 ř.)
├── server.js               # npm start wrapper
├── package.json
└── package-lock.json

## Top-level — soubory a velikost

| Složka | Soubory | Podsložky | Velikost (MB) |
|--------|---------|-----------|---------------|
| mia-output-overlay | 90077 | 199 | 13509,4 |
| .tmp-audit | 8614 | 4154 | 1032,0 |
| incoming-images | 343 | 6 | 3081,4 |
| archive | 447 | 19 | 37,5 |
| scripts | 446 | 1 | 2,4 |
| tests | 427 | 0 | 2,0 |
| _canon_import | 364 | 15 | 0,8 |
| shared | 305 | 114 | 2,6 |
| data | 271 | 21 | 21,3 |
| docs | 245 | 2 | 1,3 |
| logs | 48 | 0 | 27,2 |
| routes | 25 | 0 | 0,2 |
| engine2 | 17 | 11 | 0,0 |
| core | 16 | 0 | 0,1 |
| config | 11 | 0 | 0,5 |
| downloads | 1 | 0 | 142,6 |
| .cursor | 4 | 1 | 58,7 |

**Poznámky ke stromu:**
- Celkem **4600** složek (včetně vnořených asset/cache stromů)
- Celkem **101722** souborů mimo `node_modules/` a `.git/`
- Kořen obsahuje dočasné/audit artefakty: `_tmp_master.bundle` (~115 MB), `.tmp-*`, `tmp_*`, prázdný soubor `{`
- `data/avatar-cache/` — binární cache soubory (*.bin) — pouze existence, obsah neanalyzován
- `.tmp-audit/` — obsahuje Edge browser profily (~desítky tisíc souborů) — auditní cache, ne first-party kód
- `mia-output-overlay/assets/` — tisíce PNG/JSON/CSS — primárně assety, ne zdrojový kód

```

## Top-level účel složek

- **`index.js`** — Hlavní runtime — Express server, ingest, gift/OBS pipeline, overlay, Kojnožrout
- **`server.js`** — Alternativní entrypoint pro start serveru (npm start)
- **`core/`** — Engine 2.0 jádro — normalizace, action queue, runtime state, director
- **`engine2/`** — Engine 2.0 modulární vrstva — composition, projection, visibility, OBS boundary
- **`scripts/`** — Monolitické MIA moduly (MIA_*), utility skripty, OBS tooling, asset pipeline
- **`shared/`** — Sdílené knihovny — platform runtime, canon core moduly, paint, gifts
- **`routes/`** — Express route handlery
- **`src/routes/`** — Legacy/alternativní route definice
- **`ingest/`** — Ingest modul — příjem TikFinity/platform eventů
- **`renderers/`** — OBS overlay render logika
- **`mia-output-overlay/`** — Browser overlay HTML/CSS/JS + statické assety pro OBS
- **`MIA_NEXT/`** — Next-gen shadow runtime moduly
- **`tests/`** — Contract/smoke/regression testy
- **`docs/`** — Projektová dokumentace a master-canon alignment
- **`config/`** — Runtime konfigurace (media catalog, gift map, stream settings)
- **`game/`** — Game layer hello world / experimentální modul
- **`legacy/`** — Deprecated kopie modulů
- **`archive/`** — Archiv deprecated kódu a assetů
- **`text-bank/`** — Textové banky pro odpovědi MIA/Koj
- **`tools/`** — MIA Paint shell (Tauri/browser)
- **`plugins/`** — MIA Paint pluginy
- **`data/`** — Runtime data, cache, profily, paint projekty
- **`_canon_import/`** — Importovaný master kánon (dokumentace)
