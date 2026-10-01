# MIA / Koj — 2D part-rig plan

Status: **v0 foundation shipped** (anchors + joint API + interim head clip).  
Not yet: part art sheets, timeline editor, 3D.

## Goal

Readable life on stream from **independent joints**, not whole-PNG squash/scale “breathing.”  
3D studio is deferred until 2D anchors + part art + a simple timeline are solid.

## Phases

### 1. Anchors (now)

- Explicit normalized rects/pivots in config (`koj-body-anchors.js`): belly, head, neck, eye.
- Belly HUD (gift priority → idle clock/date/weather @ 20s) syncs every motion frame to the sprite **layout** box (not transformed `getBoundingClientRect`), so it rides the same motion wrapper as the body.
- Edit anchors in JS/JSON; later a graphics tool can write the same schema.

### 2. Part art sheets (next)

- Export **root / body (torso) / head** PNGs (optional eyes later) with shared canvas size and known pivots.
- Replace interim clipped single-PNG head layers.
- Keep archived Koj looks; do not delete old masters.

### 3. Simple timeline editor

- Keyframe local `x / y / rot` on rig parts (idle / speak / gift pulse).
- Reuse `mia-paint` timeline ideas lightly — no full animation suite required.
- Motion modules sample timeline or fall back to procedural sines.

### 4. Later: 3D

- Only after 2D part art + timeline feel right on phone/OBS.
- 3D must map to the same semantic parts (root / torso / head), not a parallel pipeline.

## Do

- Drive **rig joints** for idle life (head yaw/nod, light root weight).
- Keep belly gift priority + idle cycle; overlay shows `miaPoints` language only (no coins).
- Document pivots next to art; bump cache query when shipping overlay changes.
- Run `node --check` + `npm run test:preflight:fast` after stream/OBS/ingest-adjacent edits.

## Don’t

- Don’t fake life with strong whole-sprite squash/scale as the primary motion.
- Don’t invent a second gift/media pipeline for the belly.
- Don’t jump to 3D while belly still drifts or head is only a scale pulse.
- Don’t delete archived Koj art sets (`_archive/…`).

## v0 can / can’t

| Can | Can’t (yet) |
|-----|-------------|
| Belly HUD locked to config anchor + layout sync | Pixel-perfect without retuning anchors per new art |
| Procedural head micro-yaw/nod via part-rig | Real separate head mesh/PNG deformation |
| MIA speech `root / torso / head` slots | Full editor UI / saved timelines |
| Shared `MiaPartRig` API | Arms, eyes, lip joints as first-class parts |

## Key files

- `mia-output-overlay/lib/koj-body-anchors.js`
- `mia-output-overlay/lib/mia-part-rig.js`
- `mia-output-overlay/lib/koj-live-motion.js`
- `mia-output-overlay/lib/mia-holo-motion.js`
- `mia-output-overlay/kojnozrout-runtime.html` (`v=24-koj-PRO-BELLY`)
- `mia-output-overlay/speech-overlay.html`
