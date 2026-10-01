# MIA — inventura schopností

**Datum:** 2026-08-08  
**Legenda:** jedna pravda — co bestie **opravdu** umí dnes

| Status | Význam |
|--------|--------|
| **HOTOVO** | Funguje, testováno, použitelné v produkci |
| **NEDOTAŽENO** | Funguje částečně; známé mezery |
| **PLACEHOLDER** | Scaffold / stub / design-only |
| **ROZBITÉ** | Known broken nebo false-green |
| **PLÁNOVANÉ** | Vize / spec; v kódu není |

**PMB 2026-08-08:** pipeline TikFinity→ingest→TTS→audio **~10 s proven**; stabilita notebooku **FAIL**.

---

## A. Stream Core (live runtime)

| Oblast | Položka | Status | Poznámka |
|--------|---------|--------|----------|
| Ingest | TikFinity → `/ingest` | **HOTOVO** | PMB: 10 eventů, Rose map OK |
| Ingest | Kick bridge (realtime) | **NEDOTAŽENO** | Wiring OK; live mimo TikTok jádro |
| Ingest | Twitch bridge | **NEDOTAŽENO** | PASS 2026-07-31 |
| Ingest | YouTube bridge | **ROZBITÉ** | Quota 403, smoke FAIL |
| Ingest | Telegram | **NEDOTAŽENO** | Modul existuje |
| Pipeline | Shadow pipeline / decision | **HOTOVO** | Preflight 165/165 fast |
| Pipeline | Gift economy / tiers | **HOTOVO** | gift_map, miaPoints strip |
| TTS | Edge MIA + Koj Antonín | **HOTOVO** | Server-side; Koj ve streamu neověřen operátorem |
| TTS | Comment EN voice (Jenny) | **NEDOTAŽENO** | Překlad CS, TTS EN — PF backlog |
| TTS | Gift template vs text bank | **NEDOTAŽENO** | PF-01 |
| OBS | WebSocket control | **NEDOTAŽENO** | PMB: dlouhé období disconnected |
| OBS | Browser overlays (speech, Koj, gift) | **HOTOVO** | R1-C historicky PASS |
| OBS | Gift video T1 rotation | **NEDOTAŽENO** | PMB: 1/6 Rose mělo video |
| OBS | OBS watchdog auto-launch | **NEDOTAŽENO** | PMB: crash loop |
| Voice | Dual voice | **HOTOVO** | Default OFF (guardrail) |
| Voice | Speaker routing Koj/MIA | **HOTOVO** | speaker_routing contract |
| Overlay | Public strip (no coins) | **HOTOVO** | overlay_public contract |
| Overlay | Combo / spam HUD | **HOTOVO** | |
| Memory | Session / viewer memory | **NEDOTAŽENO** | Funguje; userId vs nickname PF-07 |
| Text | Text bank 86 keys | **HOTOVO** | coverage PASS |
| Stability | Notebook 6 GB RAM live | **ROZBITÉ** | TikFinity pád, Studio tlak |
| Stability | Multi-PC | **PLÁNOVANÉ** | Setup docs ready, HW čeká |
| Test | preflight:fast | **HOTOVO** | 165/165 |
| Test | preflight:full | **PLÁNOVANÉ** | THAW checkpoint |
| Test | ingest_contract_smoke | **ROZBITÉ** | False-green, stale Kick test |

---

## B. MIA Creative / Graphics (mia-paint engine)

| Oblast | Položka | Status | Poznámka |
|--------|---------|--------|----------|
| Editor | Paint UI `/mia-paint/` | **HOTOVO** | Browser + contracty |
| Editor | GPU tile compositor | **HOTOVO** | |
| Editor | Vrstvy, masky, vektor | **HOTOVO** | |
| Editor | Timeline + onion skin | **NEDOTAŽENO** | Foundation; ne full NLE |
| Editor | Rig Desk (Koj anchors) | **HOTOVO** | |
| Editor | Gift Animation Desk | **NEDOTAŽENO** | Procedural stage |
| AI Image | generate / edit / remove-bg | **NEDOTAŽENO** | API OK; DALL-E fallback → procedural |
| AI Image | true-alpha pipeline | **HOTOVO** | 12v |
| AI Image | Koj character lock | **ROZBITÉ** | visualIdentity = MIA holo, ne Koj |
| AI Anim | generateAnimation N frames | **NEDOTAŽENO** | Procedural placeholder kvalita |
| Export | PNG/JPG/WebP/SVG/miapaint | **HOTOVO** | |
| Export | GIF / WEBM / MP4 | **NEDOTAŽENO** | ffmpeg dependent |
| Export | Koj Factory custom PNG | **HOTOVO** | plugin + bridge |
| Bank | Animation bank pack/promote | **HOTOVO** | production gate testy |
| Bank | AI staging → bank | **NEDOTAŽENO** | Manual promote path |
| Studio | Graphics command catalog | **HOTOVO** | `/mia/graphics/*` |
| Studio | Pipeline orchestrator | **NEDOTAŽENO** | Primitivní multi-step |
| Studio | OBS preview hook | **NEDOTAŽENO** | Volitelný; ne pro generaci |
| Shell | Tauri / native shell | **PLACEHOLDER** | Scaffold |
| Director | AI Director (brief → kampaně) | **PLÁNOVANÉ** | |
| Social | 1 master → N variant | **PLÁNOVANÉ** | Templates existují izolated |
| Repurpose | Long → Shorts pack | **PLÁNOVANÉ** | |

---

## C. Content & assets

| Oblast | Položka | Status | Poznámka |
|--------|---------|--------|----------|
| Gift map | ROSE…T6 canonical | **HOTOVO** | shared/gifts/gift_map |
| Text bank | 86 runtime keys | **HOTOVO** | TEXT PASS stable |
| Voice bible | MIA + Koj draft | **NEDOTAŽENO** | Draft, ne guardrail |
| Asset registry | 1091 entries seed | **HOTOVO** | content-pass; no runtime wire |
| Asset retention | 12 GB eyes design | **PLÁNOVANÉ** | APPROVED, not applied |
| Dedup / video catalog | Analysis PASS | **HOTOVO** | execution post-freeze |
| Character art | Koj moods/sprites | **NEDOTAŽENO** | Lokální assety; část gitignored |

---

## D. Multi-platform & genesis

| Oblast | Položka | Status | Poznámka |
|--------|---------|--------|----------|
| TikTok | Stream core target | **NEDOTAŽENO** | Pipeline proven; stabilita ne |
| Kick | Chat ingest | **NEDOTAŽENO** | |
| Twitch | Live test | **HOTOVO** | 2026-07-31 |
| YouTube | Live chat | **ROZBITÉ** | API quota |
| Genesis Mode | Design pack | **HOTOVO** | HOLD implementace |
| Genesis | Overlay HTML | **PLACEHOLDER** | Branch local |
| Engine2 | E1–E5b stubs | **NEDOTAŽENO** | Commit; stub OFF default |

---

## E. Canon & infra (meta)

| Oblast | Položka | Status | Poznámka |
|--------|---------|--------|----------|
| Master canon | 87 contract tests | **PLACEHOLDER** | Untracked; mimo fast preflight |
| shared/mia-*-core | 50+ stub modulů | **PLACEHOLDER** | Genesis/canon import |
| Git | feature/mia-genesis-mode dirty | **NEDOTAŽENO** | Velký uncommitted diff |
| Docs | Etapa 2–4 audity | **HOTOVO** | |
| Docs | R1-D live gate | **PLÁNOVANÉ** | Checklist ready |
| Remote | SSH / Tailscale scripts | **NEDOTAŽENO** | |
| Multi-PC | Setup + env templates | **HOTOVO** | HW pending |

---

## F. Shrnutí rizik (2026-08-08)

| Riziko | Proč |
|--------|------|
| **Zapomenutá funkce** | Větší než chybějící — 50+ stub modulů, genesis, canon |
| **False confidence** | preflight fast green + ingest smoke false-green |
| **Identity drift** | AI generuje MIA holo místo Koje |
| **HW single point** | Vše na 6 GB notebooku |
| **Nedokončená integrace** | Registry, Engine2, canon ≠ runtime |

---

## G. Stavební kameny pro Creative Studio 2.0 (už existují)

1. `mia-paint` engine + GPU + I/O  
2. `mia-graphics-studio` command catalog + export templates  
3. Animation bank + sprite pack + promote gates  
4. true-alpha + ffmpeg encode path  
5. Gift map + tier video + overlay templates  
6. Text bank + voice bible draft  
7. Asset registry seed + retention design  
8. Export presets (TikTok, Shorts, Twitch, koj_sprite)  

**Chybí:** project model, Director, social variant engine, provider abstraction, Koj visual bible enforcement, QC safe zones.

→ Blueprint: [`MIA_CREATIVE_STUDIO_2_BLUEPRINT.md`](./MIA_CREATIVE_STUDIO_2_BLUEPRINT.md)
