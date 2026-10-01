# MIA AI Provider Architecture

**Status:** DESIGN ONLY · FREEZE-safe  
**Datum:** 2026-08-08

Cíl: MIA **není** přivázaná k jednomu generátoru. Jeden interface, N providerů, Director vybírá / fallback.

---

## 1. Principy

1. **Capability-based routing** — ne „OpenAI everywhere“  
2. **Failover chain** — A → B → C → procedural (poslední)  
3. **Character-aware prompts** — profile injection před voláním  
4. **Cost/latency hints** — Director může preferovat rychlý/cheap provider  
5. **Audit trail** — každý gen job loguje provider + model + seed

---

## 2. Interface (koncept)

```typescript
interface MiaAiProvider {
  id: string;                          // "openai-dalle3", "local-sd", "runway-gen3"
  capabilities: AiCapability[];        // see below
  health(): Promise<ProviderHealth>;
  generateImage(req: ImageGenRequest): Promise<ImageGenResult>;
  generateVideo?(req: VideoGenRequest): Promise<VideoGenResult>;
  generateAudio?(req: AudioGenRequest): Promise<AudioGenResult>;
  tts?(req: TtsRequest): Promise<TtsResult>;
  upscale?(req: UpscaleRequest): Promise<UpscaleResult>;
  removeBackground?(req: BgRemoveRequest): Promise<BgRemoveResult>;
}

type AiCapability =
  | "text2image" | "image2image" | "inpaint" | "outpaint"
  | "text2video" | "image2video"
  | "tts" | "sfx" | "music"
  | "upscale" | "bg_remove" | "lip_sync";
```

---

## 3. Router

```text
Request + capability + characterProfile + budget
        ↓
   ProviderRegistry (ordered chain per capability)
        ↓
   Try provider A → fail → B → fail → C → procedural
        ↓
   Normalized result (PNG/WEBM/WAV + metadata)
```

### Router config (návrh `config/ai-providers.json`)

```json
{
  "text2image": {
    "chain": ["openai-dalle3", "stability-sdxl", "local-comfy", "procedural-shapes"],
    "characterOverride": { "koj": { "prepend": "characterProfile:koj" } }
  },
  "text2video": {
    "chain": ["runway-gen3", "kling", "frame-sequence-ffmpeg"]
  },
  "tts": {
    "chain": ["edge-tts-cs", "edge-tts-en", "openai-tts"]
  }
}
```

---

## 4. Provider matrix (cílový)

| Capability | Provider A | Provider B | Fallback |
|------------|------------|------------|----------|
| text2image | OpenAI DALL·E 3 | Stability SDXL | Comfy local → procedural |
| image2image | OpenAI edits | IP-Adapter local | — |
| inpaint / outpaint | OpenAI | Comfy | manual mask |
| bg remove | rembg local | OpenAI | chroma key |
| upscale | Real-ESRGAN | Topaz API | bicubic |
| text2video | Runway Gen-3 | Kling / Luma | frame morph + ffmpeg |
| image2video | Runway i2v | Ken Burns ffmpeg | — |
| TTS CS | Edge Antonín (Koj) | Edge Vlasta (MIA) | — |
| TTS EN | Edge Jenny | OpenAI TTS | — |
| SFX | ElevenLabs SFX | Freesound lib | silence |
| music | Suno API | stock beds | — |
| lip_sync | Wav2Lip local | — | static mouth |

---

## 5. Normalized result

```json
{
  "jobId": "gen_…",
  "providerId": "openai-dalle3",
  "capability": "text2image",
  "files": [{ "path": "…", "mime": "image/png", "hasAlpha": true }],
  "metadata": { "model": "dall-e-3", "seed": null, "latencyMs": 4200, "costUsd": 0.04 },
  "characterProfileApplied": "koj",
  "fallbackUsed": false
}
```

---

## 6. Director integration

Director task typ `generate_asset` obsahuje:
- `capability`
- `prompt` (po Copywriter + Character Bible merge)
- `preferredProviders[]` (optional)
- `maxRetries`
- `allowProceduralFallback: false` (default pro brand assets)

---

## 7. Dnešní stav vs cíl

| | Dnes | Cíl |
|---|------|-----|
| Image | `paintAi` → OpenAI nebo procedural inline | Router + chain |
| Animation | Procedural shapes in `generateAnimation` | Video provider + bank |
| TTS | Edge hardcoded in stream | Shared TTS provider in studio |
| Health | None | Per-provider health + circuit breaker |
| Character | MIA holo lock bug | Profile injection |

**Implementace:** post-freeze refactor `routes/mia_paint.js` + nový `lib/ai-provider-router.js` (CS2-2).

---

## 8. Guardrails

- Procedural **nikdy** pro MASTER character art bez explicitního flagu  
- API keys jen server-side (existující pattern)  
- Public overlay payload nikdy neobsahuje provider metadata s cenami  
- Log retention: job metadata ano; raw prompts optional redact
