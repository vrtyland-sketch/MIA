# MIA Creative Pipeline

**Status:** DESIGN ONLY · FREEZE-safe  
**Datum:** 2026-08-08

Univerzální datový tok pro všechny typy výstupů (video, obrázek, OBS animace, social pack).

---

## 1. Master flow

```text
Idea → Project → Assets → Scene → Timeline → AI generation → Edit → QC → Variants → Export/Publish
```

| Stage | Vstup | Výstup | Owner |
|-------|-------|--------|-------|
| **Idea** | brief, moodboard, ref URL | idea record | Human / Director |
| **Project** | idea + template | `.miacreative` skeleton | Director |
| **Assets** | refs, uploads, gen jobs | asset manifest | Image/VideoGen |
| **Scene** | assets + layout | scene graph (layers) | Designer |
| **Timeline** | scenes + duration | timed tracks | Editor |
| **AI generation** | prompts + character profile | raw gen assets | Provider router |
| **Edit** | raw + timeline | master composition | Human / Editor |
| **QC** | master + variant rules | pass/fail + fixes | QC agent |
| **Variants** | master + presets | N adapted compositions | Social Factory |
| **Export/Publish** | variants | files + manifest | Export Hub |

---

## 2. Datové objekty

### Idea
```json
{ "id": "idea_001", "brief": "8s Reel Koj jí kabely", "refs": [], "characters": ["koj"], "outputs": ["reel", "story", "thumb"] }
```

### Project
- Odkaz na master canvas + timeline + character bindings  
- Viz [`MIA_CREATIVE_STUDIO_2_BLUEPRINT.md`](./MIA_CREATIVE_STUDIO_2_BLUEPRINT.md) §4

### Asset
```json
{
  "id": "asset_koj_chew_01",
  "type": "image|video|audio|sfx|font",
  "source": "upload|ai|bank|procedural",
  "provider": "openai|local|animation-bank",
  "characterId": "koj|null",
  "status": "MASTER|ACTIVE|DERIVED|LEGACY"
}
```

### Scene
- Subset timeline; např. intro / body / CTA / outro  
- OBS countdown = jedna scene v projektu

### Variant
```json
{
  "presetId": "instagram_reel_9x16",
  "parentProjectId": "proj_…",
  "adaptations": ["crop_center", "caption_bottom_safe", "duration_trim_8s"],
  "exportProfile": "h264_1080x1920_30"
}
```

---

## 3. Branching (jeden projekt → N výstupů)

```text
                    ┌─ TikTok 9:16 12s
                    ├─ IG Reel 9:16 8s
Master (9:16 30s) ──┼─ IG Story 9:16 15s
                    ├─ YT Short 9:16
                    ├─ Thumb 16:9 crop
                    ├─ Square post 1:1
                    └─ OBS WEBM alpha loop
```

**Pravidlo:** master se edituje **jednou**; varianty = non-destructive adapt layer.

---

## 4. Gift pipeline (zkratka)

```text
TikTok gift → gift_map tier → visual motif → character reaction
  → image/video/SFX → Animation Bank slot → Stream overlay
```

Detail: [`MIA_GIFT_CONTENT_FACTORY.md`](./MIA_GIFT_CONTENT_FACTORY.md)

---

## 5. QC gates (povinné před exportem)

| Gate | Check |
|------|-------|
| G1 | Duration within preset max |
| G2 | Safe zone (title, caption, UI) |
| G3 | Alpha premultiply correct (OBS) |
| G4 | Character profile match (Koj ≠ random cousin) |
| G5 | No coins/gift value in public overlay payload |
| G6 | Audio peak / LUFS band |
| G7 | File size / bitrate cap per platform |

---

## 6. Mapování na existující kód

| Stage | Dnes v repu |
|-------|-------------|
| Assets | `content-pass/`, `assets/`, `animation-bank/` |
| AI gen | `routes/mia_paint.js`, `MIA.generateAnimation` |
| Edit | `mia-paint` editor |
| Export | `mia-graphics-studio/exportTemplates.js` |
| Publish (stream) | Animation Bank → OBS |
| QC | 🟡 manuální; no automated safe zone |

---

## 7. Anti-patterns

- ❌ Samostatný projekt per síť  
- ❌ Generovat přímo do OBS bez bank/QC  
- ❌ Procedural jako první volba (až poslední fallback)  
- ❌ Míchat stream ingest logiku do Creative Studio
