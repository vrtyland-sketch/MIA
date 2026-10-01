# MIA Creative Studio — produktová vize

**Status:** **VISION / DESIGN** — neimplementovat během CONTENT FREEZE  
**Datum:** 2026-08-08  
**Nadřazené:** Stream Core zůstává odděleně; OBS/TikTok = **jeden výstupní kanál** z Creative Studia

```
mia-paint          = kreslicí / compositing engine (zůstává)
MIA Creative Studio = produkt nad engine + pipeline + export + publish
Stream Studio       = větev exportu (overlay, gift, Animation Bank, OBS)
```

**Mantra:** *Create → Generate → Animate → Edit → Adapt → Export → Publish*

---

## 1. Proč posun od „editor pro stream“

| Dříve | Cíl |
|-------|-----|
| Graphics Studio = assety pro Koj/OBS | **Univerzální multimediální AI studio** v ekosystému MIA |
| Stream = primární use case | Stream = **jeden z kanálů** (TikTok, Reels, Shorts, YouTube, post, merch, …) |
| `mia-paint` = produkt | `mia-paint` = **engine** pod Creative Studiem |

Creative Studio vyrábí **veškerý vizuální a audiovizuální obsah** MIA — včetně promo, social, merch i live overlay.

---

## 2. Moduly (cílový „kříženec všeho“)

| Modul | Schopnosti | Dnešní základ v repu |
|-------|------------|----------------------|
| 🎨 **Design** | Canva-like plátno, vrstvy, šablony, text, loga, bannery | 🟢 `mia-paint`, export templates, GPU tiles |
| ✨ **AI Image** | text→image, ref→image, fill, bg remove, alpha, upscale | 🟢 `shared/mia-paint-ai`, true-alpha, `/mia/graphics/ai/*` |
| 🎬 **AI Video** | text→video, image→video, extend, motion, transitions | 🟡 anim frames + ffmpeg WEBM/GIF; chybí generative video |
| ✂️ **Video Editor** | timeline, střih, speed, filtry, keyframes | 🟡 timeline-editor, motion KF foundation; chybí full NLE |
| 🧍 **Character Studio** | MIA/Koj konzistence, pózy, výrazy, reference | 🟡 rig-desk, koj-factory, animation bank; chybí identity lock pro Koj v AI |
| 🦴 **Animation** | rig, sprite, lip-sync, loops | 🟢 animation bank, sprite pack, lip-sync foundation |
| 🎙️ **Audio** | TTS, VO, SFX, mix, denoise | 🟢 Edge TTS ve streamu; 🟡 studio mix vrstva chybí |
| 📝 **Captions** | STT, titulky, karaoke, překlady | 🟡 chat translation v live; chybí caption track v editoru |
| 🧠 **AI Director** | zadání → master projekt → varianty | 🔴 koncept; 🟡 `graphics/pipeline` = primitivní orchestrátor |
| 📱 **Social Studio** | formáty TikTok/Reels/Shorts/Stories/post | 🟡 export templates (TikTok, Shorts, Twitch); chybí batch adapt |
| 🔄 **Repurpose** | long → Shorts + thumbnails + posty | 🔴 |
| 📺 **Stream Studio** | OBS overlay, gift, WEBM alpha, bank | 🟢 hlavní produkční větev dnes |
| 👕 **Print/Merch** | hi-res PNG, plakáty | 🟡 export PNG/upscale; chybí print profily |
| 📦 **Export** | PNG/JPG/WebP/GIF/MP4/WEBM/WAV, sprites | 🟢 většina formátů existuje |

Legenda: 🟢 hotovo / použitelné · 🟡 částečně · 🔴 chybí

---

## 3. AI Director (klíčový diferenciátor)

**Vstup (příklad):**

> „Máme v pondělí duel. Udělej kompletní promo kampaň.“

**Výstup — jeden master projekt + deriváty:**

| Derivát | Formát |
|---------|--------|
| Teaser | vertikální 12 s |
| Promo | 30 s |
| TikTok cover | 1080×1920 |
| IG Story | 9:16 safe zones |
| Klasický post | 1:1 / 4:5 |
| YouTube thumbnail | 1280×720 |
| Copy | text příspěvku |
| Audio | voice-over skript + TTS |
| Live | OBS countdown / overlay pack |

Master projekt = **jeden `.miacreative` (návrh)** — všechny deriváty jsou linked adaptation layers, ne osm oddělených souborů.

---

## 4. Agentní výroba (cílový pipeline)

```text
Director → Designer → ImageGen → VideoGen → Editor → Animator → Audio → Copywriter → QC → Publisher
```

| Agent | Role |
|-------|------|
| **Director** | rozpad zadání na scény, formáty, deadline |
| **Designer** | layout, typografie, brand |
| **Image / Video Gen** | generace assetů dle briefu |
| **Editor** | střih, timing, transitions |
| **Animator** | motion, lip-sync, loops |
| **Audio** | TTS, mix, SFX |
| **Copywriter** | post texty, titulky |
| **QC** | safe zones, délka, brand, alpha, **ruční override queue** |
| **Publisher** | export preset + volitelně upload |

**QC příklad:** text leze mimo TikTok safe zone → auto reposition → uživatel schválí.

---

## 5. Zásada editoru (nepřekročitelná)

> **AI může udělat 95 % automaticky — 100 % musí jít ručně rozebrat a upravit.**

Implementační důsledky:

- Každý AI krok = **vrstva + historie** (ne flatten-only)
- Director output = **draft projekt**, ne finální render
- QC gate před publish; uživatel vždy může vstoupit do timeline/vrstev
- Žádný „black box export“ bez `.miapaint` / project source

---

## 6. Architektura vrstev

```text
┌─────────────────────────────────────────────────────────┐
│  MIA Creative Studio (UI shell + project model)         │
│  Director · Social · Repurpose · Publish                │
├─────────────────────────────────────────────────────────┤
│  Production pipeline (agents + QC + presets)            │
├──────────────┬──────────────┬──────────────┬────────────┤
│ mia-paint    │ animation    │ audio/captions│ export    │
│ engine       │ engine       │ engine        │ engine    │
├──────────────┴──────────────┴──────────────┴────────────┤
│  Stream Studio branch → OBS / Animation Bank / overlay  │
└─────────────────────────────────────────────────────────┘
```

**Stream Core** (`index.js`, ingest, TTS live, gift pipeline) **nesmí** být zahlcen Creative Studiem — Creative **exportuje** do známých cest, Stream **konzumuje**.

---

## 7. Vztah k existujícím iniciativám

| Iniciativa | Vztah |
|------------|--------|
| **Stream Core / R1-D** | Oddělený live gate; Creative neblokuje |
| **Genesis Mode** | Veřejná activation větev; může consumovat Creative exporty |
| **mia-paint / Graphics Studio** | Přejmenování produktu → Creative Studio; engine zůstává |
| **CONTENT FREEZE** | Creative vize = docs; implementace až po thaw + multi-PC |
| **PMB baseline** | Stream pipeline proven; Creative = širší produkt |

---

## 8. Fázování (návrh — ne závazek)

| Fáze | Scope | Kdy |
|------|--------|-----|
| **CS-0** | Vision doc + module map (tento dokument) | ✅ 2026-08-08 |
| **CS-1** | Project model `.miacreative` + Social export presets z jednoho masteru | post-thaw |
| **CS-2** | AI Director MVP (brief → storyboard + 3 deriváty) | + |
| **CS-3** | Repurpose (long → Shorts pack) | + |
| **CS-4** | Agent pipeline + QC safe zones | + |
| **CS-5** | Publisher integrations | + |

**Nepředbíhat CS-1** dokud: THAW CHECKPOINT clean · multi-PC stable · Stream Core R1-D PASS.

---

## 9. Otevřené otázky (Decision Later)

1. **Koj vs MIA identity** v AI — samostatný Character Studio profil (dnes `visualIdentity` lockne MIA holo)
2. **Jeden desktop app** (Tauri) vs pure browser — scaffold existuje
3. **Kde žije master projekt** — `data/mia-creative/` vs cloud
4. **Publisher** — jen export preset vs API upload (TikTok/IG API restrikce)

---

## 10. Rychlé odkazy (dnešní kód)

| Co | Kde |
|----|-----|
| Paint UI | `/mia-paint/` |
| Graphics API | `routes/mia_paint.js`, `scripts/MIA_GRAPHICS_AGENT.js` |
| Studio docs | `docs/MIA_GRAPHICS_STUDIO.md` |
| Animation bank | `shared/mia-animation-engine/` |
| Export templates | `shared/mia-graphics-studio/exportTemplates.js` |

---

**Další krok (až po thaw):** CS-1 spike — master project JSON + `Social Studio` export 3 presetů z jednoho timeline bez nového Stream Core kódu.
