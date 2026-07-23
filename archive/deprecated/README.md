# Deprecated code archive (2026-06-18)

Soubory sem byly přesunuty z aktivního runtime — **index.js je nenačítá**.

| Složka | Co to bylo | Proč pryč |
|--------|------------|-----------|
| `code/scripts/` | Starý ingest router, event bus, avatary, mega bank modul | Nahrazeno `index.js` + shadow pipeline |
| `code/legacy/` | Normalizer, action/decision engine, Kick adapter | Duplicita k `shared/` |
| `code/MIA_NEXT/` | Fork decision/action builder, runtime switch | Duplicita k `shared/platform_runtime*` |
| `code/generators/` | Procedurální sprite/mega generátory | Kanonická grafika z `_raw/` + restore |
| `code/root/` | Dev CLI skripty | Nepoužívané |
| `assets/kojnozrout-mega/` | 400+ procedurálních PNG | Runtime nepoužívá — jen `moods/` |

Obnovení: přesuň soubor zpět jen pokud víš proč. Pro Koj grafiku používej `npm run restore:koj-sprites`.
