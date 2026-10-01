# MIA Social Media Factory

**Status:** DESIGN ONLY · FREEZE-safe  
**Datum:** 2026-08-08

**Pravidlo #1:** Jeden master projekt → automatické varianty. Ne vyrábět každou síť zvlášť.

---

## 1. Master formáty

| Preset ID | Ratio | Px (ref) | Max duration | Platform |
|-----------|-------|----------|--------------|----------|
| `tiktok_feed` | 9:16 | 1080×1920 | 60s (rec 15–30) | TikTok |
| `instagram_reel` | 9:16 | 1080×1920 | 90s (rec 8–15) | IG Reels |
| `instagram_story` | 9:16 | 1080×1920 | 15s/slide | IG Story |
| `instagram_feed_sq` | 1:1 | 1080×1080 | static / carousel | IG feed |
| `instagram_feed_portrait` | 4:5 | 1080×1350 | static | IG feed |
| `youtube_short` | 9:16 | 1080×1920 | 60s | YT Shorts |
| `youtube_thumb` | 16:9 | 1280×720 | static | YT |
| `twitter_post` | 16:9 | 1200×675 | static | X |
| `obs_overlay` | custom | scene dep | loop | OBS WEBM alpha |
| `twitch_panel` | 16:9 | 320×180 | static | Twitch |

---

## 2. Safe zones (9:16 master)

```text
┌──────────────────────── 1080 ────────────────────────┐
│ ░░░ UI / status bar (avoid text) ░░░  top ~120px   │
│                                                     │
│              SAFE TITLE ZONE                        │
│              (center-weighted)                      │
│                                                     │
│              MAIN SUBJECT                           │
│                                                     │
│ ░░░ caption / TikTok UI ░░░  bottom ~280px         │
│ ░░░ right rail icons ░░░     right ~120px          │
└─────────────────────────────────────────────────────┘
```

| Zone | Inset (from edge) | Use |
|------|-------------------|-----|
| Top unsafe | 0–120 px | platform UI |
| Bottom caption | 0–280 px | subtitles, CTA |
| Right rail | 0–120 px | TikTok buttons |
| Title safe | 10% margin all sides | logos, headlines |

**1:1 / 4:5 / 16:9:** reframe z masteru — center-weight crop + title reposition.

---

## 3. Adaptační operace (non-destructive)

| Op | Popis |
|----|-------|
| `crop_center` | Crop to target ratio |
| `crop_face_safe` | Subject-aware (future) |
| `duration_trim` | Shorten to preset max |
| `caption_reflow` | Move subs to bottom safe |
| `title_reposition` | Move headline to title safe |
| `hook_first_3s` | Reel: ensure motion in first 3s |
| `thumb_extract` | Frame @ t + title overlay template |
| `bitrate_cap` | Platform export profile |

---

## 4. Variant manifest (z 1 master)

```json
{
  "masterProjectId": "proj_duel_monday",
  "variants": [
    { "preset": "tiktok_feed", "ops": ["duration_trim:12", "caption_reflow"], "export": "mp4_h264" },
    { "preset": "instagram_story", "ops": ["duration_trim:15", "crop_center"], "export": "mp4_h264" },
    { "preset": "youtube_thumb", "ops": ["thumb_extract:3.5", "title_reposition"], "export": "jpg" },
    { "preset": "instagram_feed_sq", "ops": ["crop_center:1:1"], "export": "jpg" }
  ]
}
```

---

## 5. Export profiles

| Profile | Codec | Notes |
|---------|-------|-------|
| `mp4_h264_1080x1920_30` | H.264 | TikTok/Reels default |
| `mp4_h264_720p` | H.264 | fallback size |
| `webm_vp9_alpha` | VP9 | OBS overlay |
| `jpg_high` | JPEG q=92 | thumbs |
| `png_alpha` | PNG | stickers, merch |

Existující: `mia-graphics-studio/exportTemplates.js` — mapovat preset → template.

---

## 6. QC checklist per variant

- [ ] Duration ≤ preset max  
- [ ] No text in unsafe zones (or auto-fixed)  
- [ ] Subject not cropped at chin (9:16→1:1)  
- [ ] Caption readable (contrast min)  
- [ ] File size under platform cap  
- [ ] Hook motion first 3s (video variants)

---

## 7. Director one-liner mapping

> „Udělej Reel + Story + thumbnail“

→ Director vytvoří 1 master + 3 variant entries v manifestu (ne 3 projekty).

---

## 8. Stav dnes

| | Status |
|---|--------|
| Export templates (izolated) | 🟡 NEDOTAŽENO |
| Unified variant engine | 🔴 PLÁNOVANÉ |
| Safe zone QC | 🔴 PLÁNOVANÉ |
| Master project model | 🔴 PLÁNOVANÉ |

**CS2-1:** schema + 3 exporty z 1 master PNG/video.

---

## 9. Odkazy

- [`MIA_CREATIVE_STUDIO_2_BLUEPRINT.md`](./MIA_CREATIVE_STUDIO_2_BLUEPRINT.md)  
- [`MIA_DIRECTOR_SPEC.md`](./MIA_DIRECTOR_SPEC.md)
