# Multilingual plan (Phase C)

| Lang | File | Status |
|------|------|--------|
| CS | `text-bank/packs/genesis/cs.json` + overlay copy | **300 lines** (100 system / 80 community / 60 diagnostics / 40 platforms / 20 special) |
| EN | `en.json` | skeleton (`[EN]` prefix) — translate before public EN session |
| DE | `de.json` | skeleton |
| ES | `es.json` | skeleton |
| FR / IT / PL | — | after CS/EN/DE/ES quality pass |

Runtime loads `/assets/genesis/voice/{lang}.json` via `genesis-voice.js` — **not** Stream Core `MIA_TEXT_BANK` gift routing.
