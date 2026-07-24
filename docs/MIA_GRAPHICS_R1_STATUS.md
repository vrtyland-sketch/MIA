# MIA Graphics ù Phase R1 Status

**Datum:** 2026-07-24  
**Roadmap:** [`MIA_ENGINE_2_0_ROADMAP.md`](./MIA_ENGINE_2_0_ROADMAP.md) ù4  
**Freeze baseline:** `v=32-gfx-whole` ([`GRAPHICS_CHECKPOINT_v32.md`](./GRAPHICS_CHECKPOINT_v32.md))  
**Active runtime bust:** `v=36-koj-unify` (speech / bowl / manifest URLs)  
**Koj split bust:** `v=45-r1-combo-belly` (`kojnozrout-runtime.html` + split libs)  
**Gift overlay bust:** `v=37-stream-polish` (beze zm?ny)

---

## R1 acceptance checks (3 concrete gates)

| # | Check | How to verify | Status |
|---|--------|---------------|--------|
| **R1-A** | Koj runtime contract suites green | `node tests/kojnozout_runtime_split_contract.js` + `node tests/koj_public_snapshot_contract.js` + `node tests/mia_graphics_r1_contract.js` | ? automated |
| **R1-B** | Public overlay exposes **miaPoints only** (no coins/gift value) | `node tests/overlay_public_response_contract.js` + `node tests/mia_graphics_r1_contract.js` (spamSession strip) | ? automated |
| **R1-C** | Stable stream session: Koj mood/scene/combo wave react during gifts + spam wave; gift video rotation per-tier unchanged | Manual OBS session (checklist below) + `npm run test:preflight:fast` | ? manual gate open |

**Gate to E1:** R1 lead confirms one stable stream session (R1-C) ? optional tag `v0.1.1-graphics`.

### R1-C how to verify (manual stream gate)

Manual stream = jedna ùivù OBS session, kde ?lov?k vizuùln? potvrdù chovùnù overlay? (automatickù testy to nenahradù).

1. **Start server** ù `node index.js` (nebo `npm start`); po?kej na zelenù health / OBS WS connect.
2. **Open overlays** ù v OBS na?ti runtime (`MIA_KOJ_RUNTIME` / `KOJNOZROUT_RUNTIME`), speech, bowl, gift anim (`37-stream-polish`); voliteln? `npm run obs:refresh-overlays`.
3. **Trigger combo/wave test** ù poùli dùrky / spam wave (admin debug nebo TikFinity ingest), a? vznikne `comboMoment` nebo aktivnù `spamSession`.
4. **Belly HUD** ù na b?iùe Koje: progress bar spam wave (`NN% ? T2`), countdown v subtextu, **ùùdnù** coin/gift value; stage t?ùdy `combo` / `spam-wave` / p?i vysokùm progress `combo-pulse`.
5. **Pass/fail** ù **PASS:** party scene p?i combo/wave, mood/FX reaguje i b?hem gift animace, gift video rotace per-tier beze zm?ny (index `rotationIndexByTier`); **FAIL:** zamrznutù mood, chyb?jùcù wave HUD, nebo coin/value na overlayi.

---

## This session (R1 slice)

### Improved (cb717643 + follow-up)

- **Stage mood during gift FX:** `applyStageMood` + `syncComboVisual` run every poll tick ù no longer skipped when `animationReaction` is active.
- **Combo / spam wave on Koj stage:** `syncComboVisual` adds `combo`, `spam-wave`, `combo-pulse`, `combo-urgent` from `comboMoment` / `spamSession` (miaPoints progress only).
- **Party scene fallback:** `resolveScene` switches to `party` when combo moment or spam wave is live.
- **Belly HUD wave:** `buildSpamWaveBellyContent` shows progress bar + countdown on Koj belly during active spam wave (no coin fields).
- **Split cache bust:** `43-koj-split` ? `44-r1-combo` ? `45-r1-combo-belly` on runtime HTML + split libs only (36 / 37 unchanged).
- **Combo belly HUD:** `buildComboMomentBellyContent` ó title/subtext/count on belly during combo moment (no coins).
- **R1 acceptance contract:** `tests/mia_graphics_r1_contract.js` ù dual bust invariant, combo CSS selectors, pulse/urgent thresholds, public spamSession strip (preflight fast).

### Still open for R1

| Area | Note |
|------|------|
| Manual stream gate (R1-C) | One full session with OBS overlays ù team sign-off |
| Battle / duel / walk pose art pass | LOW ù v36 doc gaps; motion via cycles/FX |
| Graphics freeze window doc | Formal ùE1 wiring freezeù paragraph after R1-C |
| Optional tag | `v0.1.1-graphics` after R1-C |

---

## deps-runtime (unchanged vs v36)

| Layer | Bust |
|-------|------|
| Speech / bowl / manifest | `36-koj-unify` |
| Gift overlay / desk | `37-stream-polish` |
| Koj runtime split | `45-r1-combo-belly` |

Refresh after deploy: `npm run obs:refresh-overlays`

---

## Test commands

```powershell
node --check index.js
npm run test:preflight:fast
node tests/kojnozout_runtime_split_contract.js
node tests/mia_graphics_r1_contract.js
```
