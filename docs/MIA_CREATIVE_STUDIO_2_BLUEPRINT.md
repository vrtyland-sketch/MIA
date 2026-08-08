# MIA Creative Studio 2.0 — Blueprint

**Status:** DESIGN ONLY · **nula kódu** · FREEZE-safe  
**Datum:** 2026-08-08  
**Vstup:** [`MIA_CAPABILITY_INVENTORY.md`](./MIA_CAPABILITY_INVENTORY.md)

```
Canva × CapCut × AI image/video × animation × audio × social × OBS
= MIA Creative Studio 2.0
Engine = mia-paint (existuje)
Stream = export channel #7
```

---

## 1. Produktová definice

**MIA Creative Studio** je univerzální multimediální AI studio v ekosystému MIA.

- Jeden **master projekt** → N výstupů (TikTok, Reel, Story, thumb, post, OBS WEBM, merch PNG, …)
- **AI Director** rozseká brief na úlohy; **QC** hlídá safe zones; **100 % ruční edit** vždy možný
- **Stream Core** konzumuje exporty — neřídí studium

---

## 2. Vrstvená architektura

```text
┌─────────────────────────────────────────────────────────────┐
│ L4  PUBLISH     TikTok · IG · YT · OBS · files · (API)      │
├─────────────────────────────────────────────────────────────┤
│ L3  ADAPT       Social Factory · Repurpose · Stream presets │
├─────────────────────────────────────────────────────────────┤
│ L2  PRODUCE     Director · Timeline · AI gen · Audio · QC   │
├─────────────────────────────────────────────────────────────┤
│ L1  PROJECT     .miacreative · scenes · assets · variants   │
├─────────────────────────────────────────────────────────────┤
│ L0  ENGINES     mia-paint · animation · audio · providers   │
└─────────────────────────────────────────────────────────────┘
         Stream Core (index.js) ← importuje L3/L4 exporty
```

---

## 3. Moduly (cílový stav)

### 3.1 Design Studio
- Plátno, vrstvy, masky, text, shapes, templates  
- **Dnes:** mia-paint 🟢  
- **Gap:** Canva-grade template marketplace, brand kit UI

### 3.2 AI Image Studio
- text→image, ref→image, inpaint, outpaint, remove-bg, true-alpha, upscale  
- **Dnes:** `/mia/graphics/ai/*` 🟡  
- **Gap:** provider router, Koj/MIA character profiles

### 3.3 AI Video Studio
- image→video, text→video, extend, camera motion  
- **Dnes:** frame sequence + ffmpeg 🟡  
- **Gap:** generative video providers (Runway, Kling, …)

### 3.4 Video Editor
- Multi-track timeline, trim, speed, transitions, filters  
- **Dnes:** timeline-editor foundation 🟡  
- **Gap:** CapCut-class NLE, audio tracks

### 3.5 Character Studio
- Master ref, proportions, palette, expressions, outfit variants  
- **Dnes:** rig-desk, koj factory, voice bible draft 🟡  
- **Gap:** visual bible enforcement in AI prompts + QC

### 3.6 Animation Studio
- Sprite, rig, lip-sync, loops, Animation Bank  
- **Dnes:** bank + pack + promote 🟢  
- **Gap:** unified with video timeline

### 3.7 Audio Studio
- TTS, VO, SFX library, music beds, mix, denoise  
- **Dnes:** Edge TTS in stream 🟢; studio mix 🔴  
- **Gap:** timeline audio lanes, ducking, export WAV

### 3.8 Captions Studio
- STT → captions → karaoke → translate  
- **Dnes:** live chat translation 🟡  
- **Gap:** caption track on timeline, SRT/VTT export

### 3.9 AI Director
- NL brief → task graph → draft project  
- **Dnes:** graphics/pipeline primitive 🟡  
- **Spec:** [`MIA_DIRECTOR_SPEC.md`](./MIA_DIRECTOR_SPEC.md)

### 3.10 Social Media Factory
- Master formats, safe zones, auto variants  
- **Spec:** [`MIA_SOCIAL_MEDIA_FACTORY.md`](./MIA_SOCIAL_MEDIA_FACTORY.md)

### 3.11 Repurpose Engine
- Long video → Shorts/Reels/TikTok cuts + thumbs + quotes  
- **Dnes:** 🔴

### 3.12 Stream Studio (export channel)
- OBS overlays, gift WEBM alpha, Animation Bank bind, countdown  
- **Dnes:** hlavní produkční větev 🟢

### 3.13 Print / Merch
- Hi-res PNG, CMYK profile, bleed  
- **Dnes:** upscale export 🟡

### 3.14 Export Hub
- PNG/JPG/WebP/GIF/MP4/WEBM/WAV/sprite/atlas  
- **Dnes:** 🟢 většina formátů

---

## 4. Project model (návrh `.miacreative`)

```json
{
  "version": "2.0",
  "id": "proj_duel_monday_promo",
  "title": "Duel Monday Promo",
  "master": {
    "canvas": { "w": 1080, "h": 1920, "fps": 30 },
    "durationMs": 30000,
    "paintDocument": "…/.miapaint ref…",
    "timeline": "…/timeline.json"
  },
  "characters": ["mia", "koj"],
  "assets": [{ "id": "…", "role": "MASTER|ACTIVE|DERIVED" }],
  "variants": [
    { "preset": "tiktok_teaser_12s", "adaptations": ["crop", "safeZone", "caption"] },
    { "preset": "youtube_thumb", "adaptations": ["crop", "titleSafe"] }
  ],
  "director": { "brief": "…", "taskGraphId": "…" },
  "qc": [{ "check": "tiktok_safe_zone", "status": "pass|fail|fixed" }]
}
```

**Pravidlo:** varianty jsou **odkazy + adaptační instrukce**, ne kopie celého projektu.

---

## 5. Agentní pipeline

```text
Director → Designer → ImageGen → VideoGen → Editor → Animator
    → Audio → Copywriter → QC → Publisher
```

| Agent | Input | Output |
|-------|-------|--------|
| Director | NL brief | task graph + project skeleton |
| Designer | tasks | layouts, typography, brand |
| ImageGen / VideoGen | frames + character profile | assets (via provider router) |
| Editor | assets | timed timeline |
| Animator | timeline | loops, lip-sync, bank clips |
| Audio | script | TTS/SFX/music stems |
| Copywriter | brief | post text, titles, hashtags |
| QC | variants | safe zone, duration, alpha, brand |
| Publisher | approved variants | files + manifest |

**Human gate:** schválení po QC; každá vrstva editovatelná.

---

## 6. Integrace se Stream Core

| Creative export | Stream consumer |
|-----------------|-----------------|
| Animation Bank clip | gift video / Koj reaction |
| WEBM alpha overlay | OBS browser source |
| Gift factory PNG | overlay template |
| Countdown scene | OBS scene switch |
| TTS script | text bank key (optional) |

**Hranice:** Creative Studio **nepíše** do ingest pipeline. Pouze do `assets/`, `animation-bank/`, `content-pass/`.

---

## 7. Fáze implementace (po thaw + multi-PC)

| Fáze | Deliverable | Build on |
|------|-------------|----------|
| **CS2-0** | Blueprint + inventura | ✅ tento doc |
| **CS2-1** | `.miacreative` schema + 3 social exports z 1 master | exportTemplates |
| **CS2-2** | Provider router (image) | mia-paint-ai refactor |
| **CS2-3** | Character profiles MIA/Koj in AI | Character Bible |
| **CS2-4** | Director MVP (1 brief → teaser+thumb+story) | pipeline runner |
| **CS2-5** | QC safe zones | Social Factory |
| **CS2-6** | Gift Content Factory automation | gift map + bank |
| **CS2-7** | Repurpose + Publisher | |

**Blokátor:** Stream Core R1-D PASS na stabilním HW před CS2-4 production use.

---

## 8. Co záměrně neřešit v 2.0 v1

- Full CapCut competitor (střih long-form filmu)
- Auto-upload na všechny sítě (API hell)
- Real-time collaborative Figma clone
- Nahrazení Stream Core decision engine

---

## 9. Odkazy

| Dokument | Téma |
|----------|------|
| [`MIA_CREATIVE_PIPELINE.md`](./MIA_CREATIVE_PIPELINE.md) | Datový tok |
| [`MIA_AI_PROVIDER_ARCHITECTURE.md`](./MIA_AI_PROVIDER_ARCHITECTURE.md) | Provider interface |
| [`MIA_CHARACTER_BIBLE.md`](./MIA_CHARACTER_BIBLE.md) | Postavy |
| [`MIA_GIFT_CONTENT_FACTORY.md`](./MIA_GIFT_CONTENT_FACTORY.md) | Gift linka |
| [`MIA_CREATIVE_OFFLINE_INDEX.md`](./MIA_CREATIVE_OFFLINE_INDEX.md) | Index balíku |
