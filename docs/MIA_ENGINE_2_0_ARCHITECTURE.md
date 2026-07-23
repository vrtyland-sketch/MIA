# MIA Engine 2.0 — Architecture (Design-First)

**Status:** Design document only — **not implemented overnight**  
**Checkpoint tag:** `v0.1-stream-core` (`903c1d88`)  
**Date:** 2026-07-23

---

## 1. Purpose

Engine 2.0 defines how MIA evolves from the current **`index.js` monolith** into a modular stream platform without breaking live production. This document is the blueprint for incremental extraction — **graphics and Koj product quality remain the top priority** until a dedicated Engine 2.0 implementation phase begins.

**Hard rules (unchanged):**

- TikFinity / Kick / Twitch ? **MIA** ? **OBS** (OBS renders only)
- Overlay payload: **`miaPoints` only** — never coin/gift value
- Video rotation: per-tier `rotationIndexByTier` — no tier index reset

---

## 2. Module boundaries

```
???????????????????????????????????????????????????????????????????
?                         MIA Engine 2.0                          ?
???????????????????????????????????????????????????????????????????
?    Core     ?  Event Bus  ?  GameState   ?  Visibility Engine   ?
?  (kernel)   ?  (ingress)  ?  (world)     ?  (who sees what)     ?
???????????????????????????????????????????????????????????????????
?  Platform   ?  OBS Router ?  Plugin      ?  AI Director         ?
?  Renderer   ?  (scenes)   ?  Games       ?  (moments/plans)     ?
???????????????????????????????????????????????????????????????????
                              ?
                              ?
                    OBS Browser Sources (4 outputs)
```

### 2.1 Core (kernel)

**Responsibility:** Boot, lifecycle, configuration, service registry, health, shutdown.

| Today | Future home |
|-------|-------------|
| Top of `index.js`, `server.js` bootstrap | `shared/mia-kernel-core/`, `shared/mia-boot-core/` |
| `/health`, `/admin/status` | Core HTTP surface |
| `MIA_CONFIG`, env loading | Configuration manager |

Core owns **no business rules** — only orchestration and wiring.

### 2.2 Event Bus

**Responsibility:** Normalize, validate, route, prioritize, and dispatch platform events.

| Today | Future home |
|-------|-------------|
| `POST /ingest`, `normalize_event.js` | Event Gateway |
| Shadow pipeline, action queue | Event Dispatcher + Queue Manager |
| Gift/chat/follow contracts | Event Registry + Validator |

**Ingress contract:** All platforms ? normalized event envelope ? bus. No platform logic in OBS or overlay HTML.

### 2.3 GameState

**Responsibility:** Authoritative runtime state — Koj vitals, arena, inventory, economy, progression, viewer memory.

| Today | Future home |
|-------|-------------|
| `MIA_KOJNOZROUT_*`, `data/kojnozout-*.json` | GameState service + persistence adapters |
| Gift economy, supporter profile | Economy + Community sub-states |
| Platform arena / duel sync | Battle sub-state |

GameState is **single writer** for world truth. Renderers and plugins read snapshots; they do not mutate state directly.

### 2.4 Visibility Engine

**Responsibility:** Decide **what each output channel may show** — privacy, spoilers, platform ToS, host mode, away mode.

| Concern | Example |
|---------|---------|
| Overlay sanitization | Strip coins; expose `miaPoints` |
| Multi-platform | Kick chat visible on output A, TikTok gifts on output B |
| Host / away | Suppress duel UI when host is AFK |
| Plugin isolation | Poker table hidden until game plugin activates |

Visibility sits **between GameState and all renderers**.

### 2.5 Platform Renderer

**Responsibility:** Build **presentation payloads** per target — overlay JSON, TTS cues, browser source props, GPU studio frames.

| Today | Future home |
|-------|-------------|
| `MIA_OVERLAY_STATE`, overlay queue | Overlay renderer |
| `MIA_VIDEO_ENGINE`, gift presentation | Video / moment renderer |
| `mia-output-overlay/*` runtime | Client-side render (still product priority) |
| Graphics studio routes | Studio renderer submodule |

Renderer is **read-only** toward GameState; writes go through Event Bus actions.

### 2.6 OBS Router

**Responsibility:** Map MIA commands to OBS WebSocket — scenes, media, browser source URLs, filters. **No game logic.**

| Today | Future home |
|-------|-------------|
| `MIA_VIDEO_ENGINE`, OBS scripts | `shared/mia-obs-core/` |
| `MIA_OBS_WATCHDOG`, scene guard | Resilience layer on router |
| Browser source refresh / bindMedia | Router command queue |

OBS Router consumes **render intents** from Platform Renderer; it never computes gift tiers or Koj mood.

### 2.7 Plugin Games

**Responsibility:** Optional game modules loaded at runtime — poker, monopoly, future mini-games.

**Future layout:**

```
game/
  poker/
    manifest.json      # id, version, permissions, OBS scenes
    state.js           # plugin-local state (syncs via GameState API)
    rules.js
    overlay/           # plugin-specific overlay fragments
  monopoly/
    ...
```

Plugins register with **Plugin Engine** (`shared/mia-module-core/`): manifest validation, lifecycle (load/unload), event subscriptions, visibility hooks.

Plugins **cannot** bypass Visibility Engine or write raw overlay coin values.

### 2.8 AI Director

**Responsibility:** Plan moments — combos, story beats, director queue, LLM hybrid responses — within policy bounds.

| Today | Future home |
|-------|-------------|
| `MIA_RESPONSE_ENGINE`, chat brain | Conversation submodule |
| Combo moments, storyboard | Planning submodule |
| `MIA_VOICE_PRIORITY`, speaker routing | Speech orchestration |

Director **proposes** actions; Event Bus **commits** them; GameState **records** outcomes.

---

## 3. How modules communicate

### 3.1 Primary pattern: Event Bus (async)

```
Platform adapter ? normalize ? validate ? route ? dispatch
                                      ?
                    ?????????????????????????????????????
                    ?                 ?                 ?
              GameState          AI Director      Plugin handler
                    ?                 ?                 ?
                    ?????????? action results ???????????
                                      ?
                              Platform Renderer
                                      ?
                               OBS Router ? OBS
```

- **Commands** (imperative): `ActionOrchestrator` queue — today `mia-action-queue.json`
- **Queries** (read): snapshot APIs — today `/overlay-state`, `/status`
- **Events** (past tense): normalized envelopes with correlation IDs

### 3.2 Forbidden shortcuts

| From | To | Rule |
|------|-----|------|
| OBS overlay JS | TikFinity | ? never |
| Plugin | OBS WebSocket direct | ? via OBS Router only |
| Renderer | GameState write | ? via Event Bus action |
| Any module | Overlay coin value | ? miaPoints only |

### 3.3 Shared contracts

Existing canon contracts remain source of truth:

- `docs/master-canon/0031-normalized-event-contract.md` (normalized events)
- `docs/master-canon/0033-overlay-payload-contract.md` (overlay payload)
- `shared/platform_normalizers/normalize_event.js` (implementation)

---

## 4. Four stream outputs concept

One encode (OBS program), **four logical MIA output channels** — each with its own visibility filter and renderer profile:

| Output | Typical use | Visibility profile |
|--------|-------------|-------------------|
| **A — Main overlay** | Koj + gifts + chat | Full sanitized overlay |
| **B — Clean / restream** | YouTube / brand-safe | No platform watermarks; reduced chat |
| **C — Host / producer** | Second monitor | Debug, queue, health, unreleased UI |
| **D — Plugin / game** | Poker, monopoly, arena | Plugin-owned browser source; isolated until active |

Implementation path:

1. **Phase 0 (now):** Single `/overlay-state` + one browser source — production stable
2. **Phase 1:** Visibility Engine assigns `channelId` per payload field
3. **Phase 2:** Multiple overlay routes — `/overlay-state?profile=main|clean|host|game`
4. **Phase 3:** OBS Router binds four browser sources to four profiles

Restream (TikTok + Kick + Twitch) stays **outside** MIA encode path — MIA only multiplexes **presentation**, not RTMP.

---

## 5. Plugin layout (future)

```
C:\MIA\
  game/
    _registry.json           # enabled plugins, load order
    poker/
      manifest.json
      index.js               # registerHandlers(bus, gameState)
      assets/
      tests/poker_contract.js
    monopoly/
      ...
  shared/mia-module-core/    # loader, manifest schema, hot reload API
```

**Manifest minimum:**

```json
{
  "id": "game.poker",
  "version": "0.1.0",
  "permissions": ["gamestate.read", "gamestate.write.poker", "overlay.channel.d"],
  "obsScenes": ["Poker_Table"],
  "eventSubscriptions": ["GIFT", "COMMENT"]
}
```

Load order: Core ? Event Bus ? GameState ? Visibility ? Renderers ? OBS Router ? **Plugins** ? AI Director.

---

## 6. Migration path from monolith (no big-bang)

Extract in **thin vertical slices** — each slice keeps preflight green.

| Step | Extract | From | Risk |
|------|---------|------|------|
| E2.0-01 | Event normalizer + ingest route | `index.js` | Low — already isolated |
| E2.0-02 | Overlay state builder | `MIA_OVERLAY_STATE.js` | Low |
| E2.0-03 | OBS command queue | `MIA_VIDEO_ENGINE.js` | Medium — test OBS smoke |
| E2.0-04 | GameState facade | Koj + arena modules | Medium — contract tests |
| E2.0-05 | Visibility rules | overlay sanitization | Medium |
| E2.0-06 | AI Director queue | response engine | Medium |
| E2.0-07 | Plugin loader stub | new `game/` + manifest | Low — no games required |
| E2.0-08 | Multi-profile overlay routes | new HTTP routes | Medium |

**Rules per step:**

1. One module per PR/commit batch
2. `node --check index.js` + `npm run test:preflight:fast` after each step
3. Keep `index.js` as thin composition root until E2.0-08
4. No behavior change during extraction — move code, don't rewrite logic
5. `shared/mia-*-core/` scaffolds merge only when wired + tested

---

## 7. What stays monolith for now

Until Engine 2.0 implementation phase:

- **`index.js`** remains composition root (~production stable)
- **Graphics studio / Koj runtime** — active product development
- **Canon scaffolds** (`shared/mia-*-core/`) — untracked until import plan
- **Plugin games** — directory layout only; no poker/monopoly code required yet

---

## 8. Success criteria (future implementation phase)

Engine 2.0 implementation is **done** when:

- [ ] `index.js` < 500 lines (composition only)
- [ ] All ingest ? overlay ? OBS paths go through Event Bus + Visibility
- [ ] Four overlay profiles served with identical GameState source
- [ ] One sample plugin (`game/hello/`) loads/unloads without restart
- [ ] `test:preflight:fast` + OBS smoke pass
- [ ] Stream guardrails audit green

**Not in scope for v0.1:** full plugin catalog, SQL persistence, cloud multi-tenant.

---

## 9. Related documents

- [`KANON_MIA_ALIGNMENT.md`](./KANON_MIA_ALIGNMENT.md) — current code ? canon map
- [`MIA_GITHUB_MIGRATION_AUDIT.md`](./MIA_GITHUB_MIGRATION_AUDIT.md) — GitHub push audit
- [`MIA_MULTI_PLATFORM_STREAM.md`](./MIA_MULTI_PLATFORM_STREAM.md) — platform ingest map
- `.cursor/rules/mia-guardrails.mdc` — non-negotiable stream rules

---

*Engine 2.0: design-first. Build graphics first; extract modules when each slice is test-backed.*
