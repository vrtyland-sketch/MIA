# MIA Graphics Studio — vize 2D Content Studio (Phase 12+)

**Codename runtime:** `mia-paint` · **Produktový název:** **MIA Graphics Studio**  
**Stav:** Phase 12 — kánon + agent API + pipeline orchestrátor (implementace po modulech)

MIA Graphics Studio není „jen editor obrázků“. Je to **2D Content Studio** v ekosystému MIA — assety, animace, krátká videa a efekty pro Koj, overlaye a OBS, **řízené příkazy (API), ne klikáním**.

**Pravidlo:** Studio **nemaže** stream runtime (TikFinity → MIA → OBS). Exportuje do známých cest. Live stream logika zůstává v `index.js` / shadow pipeline.

---

## Dlouhodobá evoluce (6 stupňů)

| # | Fáze | Popis |
|---|------|--------|
| 1 | Editor obrázků | ✅ Phases 0–6 — štětec, vrstvy, I/O, vektor |
| 2 | Editor vrstev | ✅ masky, výběry, transformace |
| 3 | Editor animací | 🟡 timeline + onion · bones/keyframes 🟢 foundation (12d) |
| 4 | Editor videa | 🟢 GIF/WEBM/MP4 export (12e) |
| 5 | Realtime editor pro stream | 🟢 OBS preview + body + bank operator (12f–12x) |
| 6 | AI studio řízené MIA | 🟢 pipeline + true-alpha anim + bank promote/override (12v–12y) |

---

## Schopnosti Phase 12 (cíl studia)

### Profesionální 2D práce
- Vrstvy + masky (🟢 základ hotov)
- Nekonečné plátno — tile GPU compositor (🟢)
- Raster + vektor v jednom dokumentu (🟢)
- Timeline (🟡 produktová maturity — onion/scrub základ) · bones / layer KF / kamera (🟢 foundation 12d)
- Částice — sparkle / déšť / oheň / kouř (🟢 12e · `mia-2d-fx.js`)
- Motion presets bounce/pulse/shake + **hair_eyes / blink / breath / nod / sway** (🟢 13o)

### Export
| Formát | Stav |
|--------|------|
| PNG, JPG, WEBP, SVG, `.miapaint` | 🟢 |
| GIF | 🟢 Phase 12e |
| WEBM, MP4 | 🟢 Phase 12e (`yuva420p` WEBM) |

### Šablony plátna
| Šablona | Rozměr | API |
|---------|--------|-----|
| TikTok | 1080×1920 | `MIA.createFromTemplate({ template: "tiktok" })` |
| YouTube Shorts | 1080×1920 | `youtube_shorts` |
| Twitch / OBS | 1920×1080 | `twitch` |
| Koj sprite | 512×512 | `koj_sprite` |

Definice: `shared/mia-graphics-studio/exportTemplates.js`

---

## AI moduly (samostatné, ne jeden black box)

| Modul | API | Stav |
|-------|-----|------|
| **AI Generate** | `MIA.generateImage()` | 🟢 (+ `trueAlpha` flag) |
| **AI Edit** | `MIA.editRegion()` | 🟢 inpaint + maska výběru |
| **AI Remove Background** | `MIA.removeBackground()` | 🟢 corner key |
| **True Alpha** | `MIA.trueAlpha()` | 🟢 12v edge flood-fill |
| **AI 2D Animation** | `MIA.generateAnimation()` | 🟢 12v PNG frames → sheet / WEBM · **13i** Paint timeline |
| **AI Upscale** | `MIA.upscale()` | 🟢 Lanczos3 + sharpen |
| **AI Restore** | `MIA.restore()` | 🟢 denoise + sharpen + normalize |
| **AI Recolor** | `MIA.recolor()` | 🟢 palety cyberpunk / neon / vintage / … |
| **AI Pose** | `MIA.pose()` | 🟢 procedurální + body sync |
| **AI Animate** | `MIA.animate()` | 🟢 procedurální keyframy (ne pixel frames) |
| **AI Lip Sync** | `MIA.lipSync()` | 🟢 foundation |
| **AI Motion** | `MIA.motion()` | 🟢 procedurální keyframy |

Log: `logs/paint-ai.jsonl` (stejně jako dnes)

### Phase 12b — kanonické AI endpointy

```http
GET  /mia/graphics/ai
POST /mia/graphics/ai/generate
POST /mia/graphics/ai/edit
POST /mia/graphics/ai/remove-background
POST /mia/graphics/ai/upscale
POST /mia/graphics/ai/restore
POST /mia/graphics/ai/recolor
POST /mia/graphics/ai/true-alpha
GET  /mia/graphics/ai/animation
POST /mia/graphics/ai/animation/generate
```

Legacy (stejný backend): `/mia/paint/ai/generate` · `remove-bg` · `inpaint`

### Phase 12v — AI 2D animace + true alpha

Tok: prompt → N stills (magenta `#FF00FF` BG contract) → edge-flood matte → PNG frames → sprite sheet (+ volitelně GIF/WEBM `yuva420p`).

```http
POST /mia/graphics/ai/animation/generate
{
  "prompt": "MIA cyberpunk mascot",
  "motion": "wave",
  "frameCount": 8,
  "width": 512,
  "height": 512,
  "fps": 12,
  "packSheet": true
}
```

Výstup: `data/mia-ai-animations/<clipId>/frames/*.png` + `built/sprite_sheet.png`. Bez OpenAI klíče běží procedural silueta na magenta (stejný true-alpha pipeline).

### Phase 13i — Paint AI anim ↔ timeline bridge

Operátor v Paint (`mia-paint`):

1. Prompt + motion + počet snímků → **Generovat animaci**
2. `POST /mia/graphics/ai/animation/generate` s `forPaintTimeline: true` → `framesBase64` + `clientStep: import_animation_frames`
3. Snímky na timeline (onion / play) → ruční polish → **→ Bank** (stávající export)

Bez OpenAI klíče: procedural true-alpha stejně jako 12v. Staging ≠ live gift sheets (promote / mark-production beze změny).

### Phase 13j — Dashboard AI generate + staging ↔ Paint

Operátor na streamer dashboardu (Animation Bank):

1. Prompt + motion + fr → **Generovat AI animaci** → `POST /mia/graphics/ai/animation/generate`
2. Staging se obnoví; volitelně **Auto promote** (quality ai/procedural, ne live)
3. **Otevřít v Paint** → `/mia-paint/?aiStaging=<id>` načte frames na timeline

```http
GET /mia/animation/staging/:stagingId?frames=1
→ { framesBase64, paintUrl, motion, fps, … }
```

### Phase 13k — Paint polish → staging write-back

Po úpravě timeline v Paint:

1. **→ Staging** → `POST /mia/animation/staging/:id/save` (frames + rebuild `built/sprite_sheet.png`)
2. Dashboard thumb ukáže sheet; **Promote staging** bere už polished draft
3. **→ Bank** zůstává oddělená cesta (direct bank export)

Bez auto-promote / mark-production. Staging ≠ live gift sheets.

### Phase 13l — Staging studio preview (před promote)

Dashboard **Preview staging**:

1. `POST /mia/animation/staging/:id/preview` → Koj reaction (`studioPreview` + public sheet)
2. Body mood sync (+ volitelně OBS) stejně jako bank preview
3. Sheet URL: `/assets/mia-ai-staging/<id>/built/sprite_sheet.png` (static, ne live gift)

`liveSheetEligible: false` vždy. Promote / mark-production beze změny.

### Phase 13m — Staging GIF/WEBM (video-generator UX)

```http
POST /mia/animation/staging/:stagingId/encode
{ "format": "gif" }   // nebo "webm" / "mp4"
→ { downloadUrl: "/assets/mia-ai-staging/<id>/built/preview.gif", liveSheetEligible: false }
```

Dashboard: **GIF** / **WEBM** u stagingu. WEBM vyžaduje ffmpeg (`MIA_FFMPEG_PATH`). Bez cloud video modelů (Sora/Runway).

### Phase 13n — Operator polish (docs · Paint UX · production checklist)

- Docs sync: motion / částice / export / bones už nejsou falešně 🔴
- Paint: **True Alpha** + **MP4** export tlačítka
- Dashboard: checklist před Promote / Mark production (α, preview, gate, force warning)

### Phase 13o — Character motion + identity parts tint

Paint timeline **AI** select: `hair_eyes` · `blink` · `breath` · `nod_gesture` · `sway` (+ bounce/pulse/shake).

Body parts rebuild s cyan identity lock (opt-in, nemění art bez flagu):

```bash
npm run build:mia-body-parts -- --force --identity
npm run build:mia-body-parts -- --force --identity --identity-mix=0.25
```

### Phase 13p — Timeline maturity + combo head

- Onion default **on** (checkbox sync s `onionBefore/After`)
- Timeline scrub: drag + snap na KF (~70 ms) / fps step · ruler ticks
- Motion sampling: `easing: "ease"` (smoothstep) u AI motion KF
- Dedicated `head/combo.png` (happy source + party tint) — už ne alias `think`
- Head crop `h` 0.20 → 0.23

```bash
npm run build:mia-body-parts -- --force
```

### Phase 13q — Timeline pro UX (balíček D)

- **Onion ghosts** na canvas overlay (modrá před / oranžová po) + depth slider ±1–3
- **Easing inspector** u layer/camera KF: linear · ease · ease-in · ease-out · ease-in-out
- Offline AI motion KF mají `easing: "ease"` (parity se serverem)
- Nástroj **IK** (`bone-ik` / klávesa `I`) — drag cíle na canvasu; tlačítko IK použije poslední target

### Phase 13r — AI / video quality (balíček E)

- Dashboard: **MP4** encode + inline staging playback (GIF/WEBM/MP4)
- `GET /mia/animation/staging/:id/media` — URL sheet/gif/webm/mp4
- Temporal consistency (default on): stabilní `identitySeed` · OpenAI edit z předchozího framu · soft blend
- Opt-out: `{ "temporalConsistency": false }`

### Phase 13s — Body art + light assemble (balíček F)

- Body crop polish (těsnější head/hands/feet/eyes; `head.h` ≥ 0.22)
- Dedicated `faces/combo.png` master (auto z gift/happy pokud chybí) + party tint
- Light NLE: `POST /mia/animation/assemble` — spoji staging clipy → GIF/WEBM/MP4 (studio-only)
- Dashboard: Assemble (clipy čárkou · fps · format)

```http
POST /mia/animation/assemble
{ "clips": ["wave-a", "idle-b"], "format": "gif", "fps": 12 }
```

```bash
npm run build:mia-body-parts -- --force
```

### Phase 13t — Assemble v2 (balíček G)

- `gapFrames` — transparentní framу mezi clipy
- `holdLast` — drží poslední frame každého clipu
- Volitelné **audio** (`audioBase64` / `audioPath`) → mux do WEBM/MP4 (ffmpeg)
- Dashboard: ＋ selected · Clear · gap/hold · audio file

```http
POST /mia/animation/assemble
{
  "clips": ["wave-a", "idle-b"],
  "format": "mp4",
  "fps": 12,
  "gapFrames": 2,
  "holdLast": 1,
  "audioBase64": "…",
  "audioExt": "mp3"
}
```

### Phase 13u — Lip audio + bone deform (balíček H)

- **Lip♪** v Paint — lip sync z audio (amplituda → viseme, bez cloud STT)
- `POST /mia/graphics/motion/lip-sync` s `audioBase64` (WAV přímo; MP3 přes ffmpeg)
- Bone **tip deform**: IK/angles posunou vrstvu (x/y/rot/scale) vůči rest pose (`deformScale` ~0.45)

```http
POST /mia/graphics/motion/lip-sync
{ "layerId": "…", "audioBase64": "…", "startMs": 0, "stepMs": 50 }
```

### Phase 13v — Whisper lip + soft mesh warp (balíček I)

- **Whisper STT** (když je `MIA_LLM_API_KEY` / `OPENAI_API_KEY`) → text → visemes; jinak fallback amplituda (13u)
- Amplitude **gate** při tichu (Whisper KF → SIL/M)
- Opt-out: `"useStt": false`
- Soft **skew** warp z bone bend (`skewX`/`skewY` v sample + Paint GPU)

```http
POST /mia/graphics/motion/lip-sync
{ "layerId": "…", "audioBase64": "…", "audioExt": "wav", "language": "cs" }
```

### Phase 13w — Live viseme speech (balíček J)

- `#miaHolo` už **nebliká** blind 105ms loop — sampling z `voicePlayback.lipTrack`
- TTS delivery přibalí `lipTrack` (text → visemes, délka ≈ audio)
- Overlay fallback: `textPreview` → `MiaLiveLip` pokud server track chybí
- Speak PNG žebřík `01→04` podle `mouthOpen`

### Phase 13x — Live audio lip (balíček K)

- Po TTS: async upgrade `lipTrack` z MP3 amplitudy (`audio_amplitude_live_v1`)
- Overlay rebind při provider upgrade (text → amp) bez resetu playhead
- Client fallback: `AudioContext` decode `audioUrl`, když server ještě drží text track
- TTS vrací `filePath` vedle `audioUrl`

### Phase 13y — Body speak lip parity (balíček L)

- `MIA_EYES` sampluje stejný `lipTrack` jako `#miaHolo` (žebřík eyes/01–04)
- `bodyLiveSync` publikuje `lipTrack` do `/mia/graphics/body/state`
- Hybrid: graphics state + optional overlay refresh při text-only tracku
- Metronome jen jako fallback bez tracku

### Phase 13z — Visible speak faces (fix #1)

- Divák neviděl ústa: full-body `masters/speak` jsou na holo příliš malá
- `parts/speak-lip/01–04` = face crop z speak masters (`npm run build:mia-speak-lip`)
- `#miaHolo.speak-face` při řeči: větší face fill + slabší glitch
- Aura z `voicePlayback` (ne jen bubble signature)
- **Hero mód:** při řeči se malé speech-holo skryje; ústa jedou na velké `MIA_HEAD` (speak-lip)

### Phase 12w — promote do Animation Bank

Staging (12v) **není** live bank. Explicitní promote:

```http
POST /mia/graphics/ai/animation/promote
{ "stagingId": "wave-abc", "category": "ai" }

POST /mia/graphics/ai/animation/mark-production
{ "clipId": "ai/wave-abc", "confirmProduction": true }
```

CLI: `npm run promote:ai-animation -- <stagingId>`  
Production na live gift sheet: `--mark-production --confirm` (povinné).

Quality gate (`GiftReactionOrchestrator`):

| quality | Live gift sheet | Poznámka |
|---------|-----------------|----------|
| `production` | ano | Koj moods / explicit mark |
| `ai` | ne | v bance pro studio/preview |
| `procedural` | ne | fallback / draft |

### Phase 12x — operator preview

Dashboard karta **Animation Bank** (`mia-streamer-dashboard.html`):

1. Obnovit seznam clipů (`GET /mia/animation/bank/operator`)
2. **Studio preview** → push `animationReaction` s `studioPreview: true` (Koj přehraje sheet i u `ai`)
3. **Bind giftKeys** → metadata (hardcoded `rose`/`heart`… mají prioritu)
4. **Mark production** → confirm → live gift sheets

```http
GET  /mia/animation/bank/preview?clipId=ai/wave
POST /mia/animation/bank/preview   { "clipId": "ai/wave", "push": true }
POST /mia/animation/bank/bind-gift-keys  { "clipId": "ai/wave", "giftKeys": ["custom_wave"] }
```

Live `resolveGiftReactionPlan` **stále** nulluje sheets u non-production.

### Phase 12y — known-gift override

Hardcoded `rose` → `gift/rose` (atd.) má prioritu — **kromě** production clipu s `giftOverride: true` + matching `giftKeys`.

```http
POST /mia/animation/bank/bind-gift-keys
{
  "clipId": "ai/my_rose",
  "giftKeys": ["rose"],
  "overrideHardcoded": true,
  "confirmOverride": true
}
```

Pak **Mark production** (pokud ještě není). Live rose gift → sheet z `ai/my_rose`.

Dashboard: checkbox **Override known gifts (12y)**.

### Phase 12z — production gate + staging

`mark-production` kontroluje readiness:

| Blocker | Význam |
|---------|--------|
| `procedural_not_allowed` | quality/provider procedural |
| `alpha_too_low` | `avgAlphaRatio` &lt; 0.25 |

Bypass jen s `forceProduction` + `confirmForceProduction`.

```http
GET  /mia/animation/staging
POST /mia/animation/promote-ai   { "stagingId": "wave-abc" }
POST /mia/animation/mark-production
{ "clipId": "ai/wave-abc", "confirmProduction": true }
```

Dashboard: **Promote staging** + **Force production** checkbox.

### Phase 13a — visual identity lock

Nové AI/procedural framy sedí na `#miaHolo` cyan (`0,220,255`), ne náhodný hash RGB.

- `shared/mia-paint-ai/visualIdentity.js`
- `GET /mia/graphics/visual-identity`
- `generateAnimation` / `createAvatar(mia)` appendují identity prompt
- Studio bank preview syncne i body mood (Koj sheet + MIA body)

### Phase 13b — unified studio preview

Dashboard **Preview body+Koj**:

```http
POST /mia/animation/bank/preview
{
  "clipId": "gift/rose",
  "push": true,
  "syncBody": true,
  "syncObs": true
}
```

- `syncBody` (default) → `publishBodyPreview` podle emotion/spriteHint  
- `syncObs` → zapne MIA body vrstvy v OBS  
- `spriteHint` jako `react-gift` → body mood `gift`

---

## Agent API — MIA nekliká, MIA přikazuje

Editor vystavuje **příkazy**, ne UI automatizaci. MIA (nebo Cursor agent) posílá pipeline:

```http
POST /mia/graphics/pipeline
{
  "intent": "Vytvoř cyberpunkovou Miu, odstraň pozadí, exportuj jako WEBM"
}
```

nebo explicitně:

```json
{
  "steps": [
    { "command": "createFromTemplate", "args": { "template": "tiktok" } },
    { "command": "generateImage", "args": { "prompt": "cyberpunk MIA mascot" } },
    { "command": "removeBackground" },
    { "command": "motion", "args": { "style": "hair_eyes_subtle" } },
    { "command": "createParticles", "args": { "preset": "blue_sparkle" } },
    { "command": "exportVideo", "args": { "format": "webm" } }
  ]
}
```

Odpověď:

```json
{
  "ok": true,
  "partial": true,
  "executed": [ … hotové kroky … ],
  "pending": [ … planned moduly s phase 12x … ],
  "clientSteps": [ { "command": "import_image", "args": { … } } ]
}
```

**Hybrid execution:** server spustí AI + strukturu dokumentu; editor aplikuje `clientSteps` (import vrstvy, render exportu).

Katalog všech příkazů:

```http
GET /mia/graphics/catalog
```

Implementace: `shared/mia-graphics-studio/` · `scripts/MIA_GRAPHICS_AGENT.js`

---

## Příklad — jedna věta MIA

> „Vytvoř cyberpunkovou Miu, odstraň pozadí, přidej mrkající oči, lehký pohyb vlasů, modré částice, exportuj jako WEBM.“

| Krok | Příkaz | Stav |
|------|--------|------|
| Plátno Shorts | `createFromTemplate` | ✅ |
| Obrázek | `generateImage` | ✅ |
| Pozadí | `removeBackground` / `trueAlpha` | ✅ |
| Motion | `motion` (bounce/pulse/shake foundation) | ✅ foundation |
| Částice | `createParticles` | ✅ |
| Export | `exportVideo` (GIF/WEBM/MP4) | ✅ |

Pipeline vrátí `pending` jen u skutečně chybějících kroků (`planned` count = 0 v katalogu; zbývá `export_image` jako hybrid client).

---

## Sub-fáze Phase 12 (implementační pořadí)

| Sub | Obsah |
|-----|--------|
| **12a** | Kánon, katalog API, šablony, pipeline runner ✅ |
| **12b** | AI moduly Generate / Edit / Remove BG — sjednotit pod Graphics API |
| **12c** | Upscale, Restore, Recolor |
| **12d** | Keyframes, bones, kamera, `animateLayer` ✅ |
| **12e** | Částice, GIF/WEBM/MP4 export ✅ |
| **12f** | `createAvatar`, realtime preview, OBS hook ✅ |
| **12g** | MIA body OBS vrstvy (`MIA_HEAD`…`MIA_TORSO`) ✅ |
| **12h** | `MIA.pose` procedurální pózy + body publish API ✅ |
| **12i** | Body overlay `?sync=graphics` → `/mia/graphics/body/state` ✅ |
| **12j** | Auto `publishBodyState` z pose / lip_sync / avatar pipeline ✅ |
| **12k** | Live `/overlay-state` → body state mirror + `?sync=hybrid` ✅ |
| **12l** | `npm run obs:apply-hands` nastaví hybrid URL na MIA body vrstvách ✅ |
| **12m** | Admin preview API + dashboard tlačítka pro rychlý body test ✅ |
| **12n** | Preview + OBS WebSocket — auto zapnutí `MIA_HEAD`/`EYES`/`HANDS` ✅ |
| **12o** | T3+ gift moment → timed body preview show + auto hide ✅ |
| **12p** | Sjednocený Graphics Body blok + `npm run test:graphics-body` ✅ |
| **12q** | Animation reaction → body mood/speaking bridge (live sync + T3+ gift moment) ✅ |
| **12r** | `obs:verify-stream-ready` — kontrola MIA body vrstev (hybrid URL, skryté ve scéně) ✅ |
| **12s** | `audit:live` — `/mia/graphics/body/state` + public overlay bez coins ✅ |
| **12t** | `obs:stream-ready --fix` + `/system/obs-hands` — hybrid body sync auto-fix ✅ |
| **12u** | Dedicated body-part PNG (`assets/mia/parts/`) — konec CSS crop full-body masters ✅ |
| **12v** | AI 2D animace + true alpha PNG (`MIA.generateAnimation`, `MIA.trueAlpha`) ✅ |
| **12w** | Promote AI clip → Animation Bank + ternary quality gate (live sheets jen `production`) ✅ |
| **12x** | Operator bank preview + giftKeys bind (dashboard) — studio sheets bez live gift path ✅ |
| **12y** | Known-gift production override — bind+confirm beats `gift/rose` atd. na live ✅ |
| **12z** | Production quality gate + staging promote UI — blokuje procedural/low-alpha ✅ |
| **13a** | MIA visual identity lock — cyan holo paleta + prompt suffix (AI/procedural) ✅ |
| **13b** | Unified studio preview — bank sheet + MIA body mood (+ volitelné OBS) ✅ |
| **13c** | OBS body revive — portrait transform + refresh browsers po výpadku MIA ✅ |
| **13d** | Composed body layout — per-part OBS pozice + chytrý preview (bez Frankensteina) ✅ |
| **13e** | Hero body portrait — jedna MIA_HEAD nad bublinou; speech holo se ztlumí ✅ |
| **13f** | Voice revive — MIA_VOICE refresh + autoplay unlock + TTS test (MIA/Koj) ✅ |
| **13g** | Voice anti-echo — ztlum Desktop Audio při Monitor+Output (konec ozvěny) ✅ |
| **13h** | Hero true-alpha polish — flood matte + soft fringe + padding v parts build ✅ |
| **13i** | Paint AI anim ↔ timeline bridge — Generovat animaci → frames → onion/play → Bank ✅ |
| **13j** | Dashboard AI generate → staging → Paint `?aiStaging=` round-trip ✅ |
| **13k** | Paint polish → staging write-back (+ sheet) · dashboard staging thumb ✅ |
| **13l** | Staging studio preview — Koj sheet + body/OBS před promote (ne live) ✅ |
| **13m** | Staging GIF/WEBM encode + download — video-generator UX bez cloud AI ✅ |
| **13n** | Operator polish — docs sync · True Alpha/MP4 UI · production checklist ✅ |
| **13o** | Character motion presets + body-parts `--identity` cyan tint ✅ |
| **13p** | Timeline maturity (onion/scrub/easing) + dedicated `head/combo.png` ✅ |
| **13q** | Timeline pro UX — onion ghosts · easing UI · bone IK drag ✅ |
| **13r** | AI/video quality — staging MP4/playback · temporal seed/ref/blend ✅ |
| **13s** | Body crop polish + combo master · multi-clip assemble (light NLE) ✅ |
| **13t** | Assemble v2 — gap/hold · audio mux · dashboard UX ✅ |
| **13u** | Lip sync z audio · bone tip deform ✅ |
| **13v** | Whisper STT lip · soft bone skew warp ✅ |
| **13w** | Live `#miaHolo` viseme lip z TTS ✅ |
| **13x** | Live lip z TTS audio amplitudy ✅ |
| **13y** | Body `MIA_EYES` lipTrack parity s holo ✅ |
| **13z** | Visible speak faces — face-crop na `#miaHolo` ✅ |

---

## Co MIA umí (operátorský přehled)

### Live stream / OBS
- TikFinity → MIA → OBS (business logika v MIA; OBS jen render)
- Gift video vrstvy, per-tier rotace, combo / away, stream-ready + revive
- Overlay nikdy neukazuje coins — jen `miaPoints`

### Graphics Studio / Paint
- Vrstvy, timeline, onion, bones/keyframes, částice, avatar
- AI: generate / edit / remove-bg / upscale / restore / recolor / true-alpha
- Export GIF · WEBM · MP4 · → Bank · → Koj Factory

### AI animace / Animation Bank
- Generate (Paint + dashboard) → staging → polish (`→ Staging`) → Preview → GIF/WEBM → Promote
- GiftKeys bind, known-gift override, Mark production (live sheets jen `production`)
- Bank Preview body+Koj (+ OBS)

### Body / Voice
- Hero portrait, composed layout, OBS body revive, hybrid sync
- Voice revive, anti-echo (Desktop Audio), TTS test MIA/Koj

### Testy
- `npm run test:graphics-body` · `test:animation-engine` · `test:mia-paint` · `test:preflight:fast`

---

## Graphics Body (12g–12u)

Samostatný kanál pro **split MIA body vrstvy** v OBS (`MIA_HEAD` … `MIA_TORSO`). Live avatar zůstává v `MIA_SPEECH` (`#miaHolo`); body vrstvy jsou volitelné a defaultně skryté.

### Tok

```
Graphics Studio / dashboard / T3+ gift
    → publishBodyState (/mia/graphics/body/state)
    → overlay ?sync=hybrid (nebo graphics)
    → OBS browser sources (MIA_HEAD, MIA_EYES, MIA_HANDS…)

Live stream (paralelně):
    /overlay-state → bodyLiveSync (+ animationReaction) → /mia/graphics/body/state
```

### OBS bootstrap

```powershell
npm run obs:apply-hands          # hybrid URL na body vrstvách
npm run obs:stream-ready -- --fix --wait  # go-live + auto-fix body/browser
npm run obs:verify-stream-ready  # diagnostika včetně MIA_HEAD…MIA_FEET
```

### Preview & test

```powershell
# Streamer dashboard → MIA body preview (zapnout / vypnout)
http://127.0.0.1:3000/mia-streamer-dashboard.html

# Contract testy celého Graphics Body bloku
npm run test:graphics-body
```

### Env přepínače

| Proměnná | Význam |
|----------|--------|
| `MIA_OBS_BODY_SYNC` | `hybrid` (default v apply-hands), `graphics`, `off` |
| `MIA_BODY_GIFT_MOMENT` | `1` = auto show po T3+ giftu (default) |
| `MIA_BODY_GIFT_MOMENT_MIN_TIER` | Min tier pro gift moment (default `T3`) |
| `MIA_OBS_BODY_GIFT_SYNC` | `0` = gift moment bez OBS WebSocket |

### Klíčové moduly

| Modul | Úloha |
|-------|--------|
| `shared/mia-graphics-studio/bodyPartsAssets.js` | Dedicated part asset map + crop fractions |
| `scripts/build_mia_body_parts.js` | Extrakce part PNG s alpha z masters |
| `shared/mia-graphics-studio/bodyAnimationSync.js` | Animation bank emotion → body póza |
| `shared/mia-graphics-studio/bodyLiveSync.js` | Mirror z `/overlay-state` |
| `shared/mia-graphics-studio/bodyLiveAudit.js` | Live audit evaluators (`audit:live`) |
| `shared/mia-graphics-studio/bodyPreviewCommands.js` | Dashboard / admin preview |
| `scripts/MIA_OBS_BODY_PREVIEW.js` | OBS visibility + hybrid URL |
| `scripts/MIA_BODY_GIFT_MOMENT.js` | T3+ timed show |
| `scripts/MIA_OBS_BODY_SYNC.js` | URL sync režimy + hands default hybrid |
| `mia-output-overlay/lib/mia-body-part-runtime.js` | Client poll (`sync=hybrid`) |

```
MIA (chat brain / agent)
    → POST /mia/graphics/pipeline
    → MIA_GRAPHICS_AGENT
    → bridge + mia-paint-ai + (budoucí) video encoder
    → clientSteps → editor (mia-paint/app.js)
    → export → mia-output-overlay/assets/… → OBS / Koj runtime
```

**Nesmí:** přidávat business logiku giftů, coins ani overlay render do studia.

---

## Kontrola kvality

```powershell
npm run build:mia-body-parts   # regeneruj assets/mia/parts z masters
npm run test:graphics-body      # Phase 12g–12v (OBS body + AI true-alpha anim)
npm run test:animation-engine   # včetně 12w promote + production gate
npm run promote:ai-animation -- <stagingId>
npm run test:mia-paint          # včetně mia_graphics_studio_contract
node tests/mia_graphics_studio_contract.js
curl http://127.0.0.1:3000/mia/graphics/catalog
```

---

## Související dokumenty

- [`MIA_2D_EDITOR_ARCHITECTURE.md`](./MIA_2D_EDITOR_ARCHITECTURE.md) — technické fáze 0–11
- [`KANON_SOUCASNY_PREHLED.md`](./KANON_SOUCASNY_PREHLED.md) — runtime přehled
