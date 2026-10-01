# MIA Director — specifikace příkazů

**Status:** DESIGN ONLY · FREEZE-safe  
**Datum:** 2026-08-08

Director = NL brief → **task graph** → orchestrace agentů / providerů.

---

## 1. Příklad příkazu

> „Udělej z tohoto obrázku 8sekundový Reel, rozhýbej Koje, přidej český voice-over, titulky, hudbu a udělej ještě Story a thumbnail.“

---

## 2. Rozpad na úlohy

```text
T0 parse_brief
T1 load_source_image (input ref)
T2 character_validate (koj profile)
T3 image2video OR animate_character (Koj chew loop 8s)
T4 script_generate (CS copy, ~8s read time)
T5 tts_generate (Edge Antonín, Koj)
T6 music_select (bed, duck under VO)
T7 timeline_compose (video + audio + VO)
T8 captions_generate (STT align or script-based)
T9 master_qc
T10 variant_story (15s trim + safe zone)
T11 variant_thumb (frame extract + title)
T12 export_all
T13 human_approve_gate
```

---

## 3. Task graph (JSON)

```json
{
  "directorJobId": "dir_20260808_001",
  "brief": "Udělej z tohoto obrázku 8s Reel…",
  "inputs": { "sourceImage": "uploads/koj_ref.png", "characters": ["koj"] },
  "outputs": ["instagram_reel", "instagram_story", "youtube_thumb"],
  "tasks": [
    { "id": "T1", "type": "load_asset", "deps": [], "params": { "path": "…" } },
    { "id": "T2", "type": "character_qc", "deps": ["T1"], "params": { "profile": "koj" } },
    { "id": "T3", "type": "animate", "deps": ["T2"], "params": { "durationMs": 8000, "expression": "chewing" } },
    { "id": "T4", "type": "copywrite", "deps": [], "params": { "lang": "cs", "maxSeconds": 8 } },
    { "id": "T5", "type": "tts", "deps": ["T4"], "params": { "voice": "koj_antonin" } },
    { "id": "T6", "type": "music_select", "deps": [], "params": { "mood": "playful", "duckDb": -12 } },
    { "id": "T7", "type": "timeline_compose", "deps": ["T3", "T5", "T6"] },
    { "id": "T8", "type": "captions", "deps": ["T5", "T7"], "params": { "lang": "cs", "style": "reel_bottom_safe" } },
    { "id": "T9", "type": "qc", "deps": ["T7", "T8"], "params": { "preset": "instagram_reel" } },
    { "id": "T10", "type": "variant", "deps": ["T9"], "params": { "preset": "instagram_story" } },
    { "id": "T11", "type": "variant", "deps": ["T9"], "params": { "preset": "youtube_thumb", "frameSec": 3.5 } },
    { "id": "T12", "type": "export", "deps": ["T9", "T10", "T11"] },
    { "id": "T13", "type": "human_gate", "deps": ["T12"], "params": { "required": true } }
  ]
}
```

---

## 4. Task types (katalog)

| Type | Agent | Provider capability |
|------|-------|---------------------|
| `parse_brief` | Director | LLM |
| `load_asset` | — | filesystem |
| `character_qc` | QC | Character Bible rules |
| `generate_image` | ImageGen | text2image |
| `animate` | Animator | image2video / bank |
| `copywrite` | Copywriter | LLM |
| `tts` | Audio | tts |
| `music_select` | Audio | library / music gen |
| `timeline_compose` | Editor | mia-paint |
| `captions` | Captions | STT / script |
| `qc` | QC | Social Factory rules |
| `variant` | Social Factory | adapt ops |
| `export` | Publisher | Export Hub |
| `promote_bank` | — | Animation Bank |
| `human_gate` | — | UI approve |

---

## 5. Příkazový jazyk (intent patterns)

| Intent | Trigger fráze | Default outputs |
|--------|---------------|-----------------|
| `reel_from_image` | „Reel z obrázku“ | reel + story + thumb |
| `gift_reaction` | „Reakce na Rose“ | bank WEBM + sfx |
| `social_pack` | „Social pack“ | tiktok + reel + story + sq |
| `obs_loop` | „OBS loop“ | webm alpha |
| `repurpose_long` | „Z streamu Shorts“ | N shorts + thumbs |
| `thumb_only` | „Thumbnail“ | jpg 16:9 |
| `translate_captions` | „Titulky EN“ | srt + burned |

---

## 6. Error / fallback policy

| Failure | Action |
|---------|--------|
| ImageGen fail | next provider in chain |
| All image providers fail | abort (no procedural for Koj MASTER) |
| TTS fail | retry once → abort with partial export |
| QC fail safe zone | auto-fix caption_reflow → re-QC |
| QC fail character | human gate required |

---

## 7. Stav dnes

| | |
|---|---|
| `graphics/pipeline` multi-step | 🟡 primitive |
| LLM brief parser | 🔴 |
| Task graph persistence | 🔴 |
| Human gate UI | 🔴 (edit in mia-paint manual) |

**MVP (CS2-4):** hardcoded parser pro 3 intent patterns + export 3 variant.

---

## 8. Odkazy

- [`MIA_AI_PROVIDER_ARCHITECTURE.md`](./MIA_AI_PROVIDER_ARCHITECTURE.md)  
- [`MIA_SOCIAL_MEDIA_FACTORY.md`](./MIA_SOCIAL_MEDIA_FACTORY.md)  
- [`MIA_CREATIVE_PIPELINE.md`](./MIA_CREATIVE_PIPELINE.md)
