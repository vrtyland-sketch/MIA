# MIA Graphics — Phase R1 Status

**Datum:** 2026-07-24  
**Roadmap:** [`MIA_ENGINE_2_0_ROADMAP.md`](./MIA_ENGINE_2_0_ROADMAP.md) §4  
**Freeze baseline:** `v=32-gfx-whole` ([`GRAPHICS_CHECKPOINT_v32.md`](./GRAPHICS_CHECKPOINT_v32.md))  
**Active runtime bust:** `v=36-koj-unify` (speech / bowl / manifest URLs)  
**Koj split bust:** `v=44-r1-combo` (`kojnozrout-runtime.html` + split libs)  
**Gift overlay bust:** `v=37-stream-polish` (beze zm?ny)

---

## R1 acceptance checks (3 concrete gates)

| # | Check | How to verify | Status |
|---|--------|---------------|--------|
| **R1-A** | Koj runtime contract suites green | `node tests/kojnozout_runtime_split_contract.js` + `node tests/koj_public_snapshot_contract.js` | ?? |
| **R1-B** | Public overlay exposes **miaPoints only** (no coins/gift value) | `node tests/overlay_public_response_contract.js` + spot-check `/overlay-state` | ?? |
| **R1-C** | Stable stream session: Koj mood/scene/combo wave react during gifts + spam wave; gift video rotation per-tier unchanged | Manual OBS session + `npm run test:preflight:fast` | ?? manual gate open |

**Gate to E1:** R1 lead confirms one stable stream session (R1-C) ? optional tag `v0.1.1-graphics`.

---

## This session (R1 slice)

### Improved

- **Stage mood during gift FX:** `applyStageMood` + `syncComboVisual` run every poll tick — no longer skipped when `animationReaction` is active.
- **Combo / spam wave on Koj stage:** `syncComboVisual` adds `combo`, `spam-wave`, `combo-pulse`, `combo-urgent` from `comboMoment` / `spamSession` (miaPoints progress only).
- **Party scene fallback:** `resolveScene` switches to `party` when combo moment or spam wave is live.
- **Belly HUD wave:** `buildSpamWaveBellyContent` shows progress bar + countdown on Koj belly during active spam wave (no coin fields).
- **Split cache bust:** `43-koj-split` ? `44-r1-combo` on runtime HTML + split libs only (36 / 37 unchanged).

### Still open for R1

| Area | Note |
|------|------|
| Manual stream gate (R1-C) | One full session with OBS overlays — team sign-off |
| Battle / duel / walk pose art pass | LOW — v36 doc gaps; motion via cycles/FX |
| Graphics freeze window doc | Formal “E1 wiring freeze” paragraph after R1-C |
| Optional tag | `v0.1.1-graphics` after R1-C |

---

## deps-runtime (unchanged vs v36)

| Layer | Bust |
|-------|------|
| Speech / bowl / manifest | `36-koj-unify` |
| Gift overlay / desk | `37-stream-polish` |
| Koj runtime split | `44-r1-combo` |

Refresh after deploy: `npm run obs:refresh-overlays`

---

## Test commands

```powershell
node --check index.js
npm run test:preflight:fast
node tests/kojnozout_runtime_split_contract.js
```
