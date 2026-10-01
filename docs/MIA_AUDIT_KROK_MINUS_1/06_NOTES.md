# MIA AUDIT KROK -1 — Poznámky a souhrn

> Datum auditu: 2026-07-27

## FINÁLNÍ SOUHRN — POČTY

| Metrika | Počet |
|---------|-------|
| **Složky** (mimo node_modules/.git) | 4600 |
| **Soubory** (mimo node_modules/.git) | 101722 |
| **Celková velikost** (mimo node_modules/.git) | ~17,6 GB |
| **Soubory** (mimo .tmp-audit, avatar-cache) | ~93108 |
| **Soubory >1 MB** (mimo node_modules/.git) | 1295 |
| **JS soubory** (celé repo mimo node_modules) | 1354 |
| **JS first-party moduly** (inventarizované) | 1255 |
| **Core** (core/ 16 + engine2/ 14 + index.js) | 17 kategorizovaných CORE + 14 ENGINE |
| **Legacy** (legacy/, archive/, archiv_dead*) | 1+ (archiv_dead **NEOVĚŘENO**) |
| **Testy** (tests/) | 427 |
| **Docs** (docs/ + _canon_import/) | 609 |
| **Nepoužívané** (statický require graf) | 117 |
| **Duplicity** (basename skupiny JS, first-party) | 15 (+ index.js ×96) |
| **Přerostlé** (>1000 řádků, JS/JSON/HTML/MD) | 38 |
| **node_modules** (soubory / složky) | 1672 / 252 |
| **.git** (soubory / složky) | 226 / 142 |

## Vyloučené oblasti

| Oblast | Důvod |
|--------|-------|
| `node_modules/` | npm dependencies — collapsed |
| `.git/` | git metadata |
| `data/avatar-cache/*.bin` | binární cache — pouze existence |
| `.tmp-audit/` Edge profily | browser cache, ~desítky tisíc souborů |
| `mia-output-overlay/assets/**` PNG/bin | assety — inventarizovány ve stromu, ne po souborech |

## Rozložení souborů dle přípony (top 15)

| Přípona | Počet |
|---------|-------|
| .png | 90238 |
| (no ext) | 6551 |
| .js | 1354 |
| .json | 855 |
| .md | 621 |
| .mp3 | 614 |
| .log | 342 |
| .jpg | 282 |
| .mp4 | 195 |
| .db | 155 |
| .db-journal | 83 |
| .html | 52 |
| .dat | 48 |
| .db-wal | 45 |
| .jsonl | 41 |

## TODO / FIXME / HACK / XXX

`rg` přes `*.{js,md,html,css,ps1,sh}` — **0** aktivních `// TODO`, `// FIXME`, `// HACK` komentářů v produkčním kódu.

False positives (ne markery práce):
- `scripts/MIA_GIFT_MAP.js` — řetězec `"XXXL Květiny"` (název giftu)
- `package-lock.json` — hash integrity obsahující `XXX`
- `docs/_export_mia_inventory_for_chatgpt.md` — zmínka o `XXXX` v názvu testů

**NEOVĚŘENO:** `.tmp-audit/` a archivované soubory nebyly re-prohledány samostatně.

## Architektura — aktuální stav (popis, ne návrh)

1. **Monolit:** `index.js` (~4461 ř.) je centrální runtime — načítá desítky `scripts/MIA_*` modulů přes `safeRequire()`.
2. **Engine 2.0:** `core/` (16 modulů) + `engine2/` (11 modulů) — paralelní moderní vrstva.
3. **Shared canon:** `shared/mia-*-core/` — ~70 modulů generovaných dle master kánonu (manager/engine pattern).
4. **Overlay:** `mia-output-overlay/` — browser source pro OBS; paint editor; kojnožrout runtime CSS/JS.
5. **Ingest:** TikFinity → `ingest/` / `index.js` HTTP endpointy → normalizer → action pipeline.
6. **Testy:** 425+ contract testů; master-canon testy 0001–0087; preflight framework.

## Rizika inventury

- **safeRequire dynamika:** mnoho modulů načítáno podmíněně — statický graf podhodnocuje použití.
- **HTML script tags:** overlay JS není v Node require grafu.
- **npm scripts:** utility skripty spouštěné jen z CLI.
- **.tmp-audit/** nafukuje celkové počty souborů/složek — není produkční kód.

## Další krok

**Čeká se na další zadání (Etapa 2).**
