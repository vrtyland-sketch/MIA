# Soft Neon Rig Desk (Build Package v1)

Úzký browser editor kotvev + stejný JSON runtime pro **Koj** i **MIA** na OBS.

## Otevření editoru

- Primární URL: [http://127.0.0.1:3000/mia-paint/rig-desk.html](http://127.0.0.1:3000/mia-paint/rig-desk.html)
- Alias: [http://127.0.0.1:3000/soft-neon-rig-desk.html](http://127.0.0.1:3000/soft-neon-rig-desk.html)
- Odkaz: Streamer dashboard → **Soft Neon Rig Desk** (vedle Graphics Studio)

MIA server musí běžet (`node index.js` / obvyklý start).

## Co editor umí

1. Přepínač **Koj / MIA** — načte idle sprite + `/anchors/{koj|mia}.json`
2. Tažení **belly** / **head** (rect) a pivotů **neck** / **body** / **root**
3. **Live preview** — `MiaPartRig` + idle head yaw/nod (`KojLiveMotion`)
4. **Save to server** → `POST /api/rig-anchors` zapíše JSON na disk  
   (vyžaduje **restart MIA serveru** po deployi nové route; jinak použij Download)
5. Fallback: **Download** / **Copy JSON** (když API není dostupné)

## Uložené soubory

| Entity | Cesta (static) |
|--------|----------------|
| Koj | `mia-output-overlay/anchors/koj.json` |
| MIA | `mia-output-overlay/anchors/mia.json` |

Schéma: `characterId`, `artId`, `idleAsset`, `anchors.{ belly, head, neck, root, body, eye?, hand? }` — hodnoty normalizované 0–1.

## Runtime (OBS)

| Overlay | Kotvy | Pohyb |
|---------|-------|--------|
| `kojnozrout-runtime.html` | fetch `koj.json` → belly HUD + head clip | `MiaPartRig` + `koj-live-motion` |
| `speech-overlay.html` | fetch `mia.json` → head clip + pivots | `MiaPartRig` + `mia-holo-motion` |

Fallback při chybě fetch: `koj-body-anchors.js` / vestavěné MIA defaults.

Cache bust: `?v=34-asset-control` (sdílený s gift stage / runtime — viz `docs/MIA_GRAPHICS_WHOLE.md`, `docs/GRAPHICS_v34_ASSET_CONTROL.md`)

Po uložení kotvev obnov OBS browser sources:

```bash
npm run obs:refresh-overlays
```

(nebo dashboard tlačítko refresh overlays, pokud ho používáš)

## Limity v1

- Žádný timeline / paint / 3D
- Head je interim **clip** z idle PNG (ne part sheets)
- Overlay dál neexpozuje coins — jen `miaPoints`
- Archivy `assets/kojnozrout/_archive/` se nemění / nemažou

## Související

- Gift Animation Desk: `docs/GIFT_ANIMATION_STREAM.md` · `/mia-paint/gift-animation-desk.html`
- Návrh: `docs/_export_mia_graphics_system_proposal.md`
- Part-rig plán: `docs/_export_mia_2d_part_rig_plan.md`
- API: `lib/mia-part-rig.js`, `lib/mia-rig-anchors.js`
