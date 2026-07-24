# MIA Graphics ? Phase R1 Status

**Datum:** 2026-07-24  
**Roadmap:** [`MIA_ENGINE_2_0_ROADMAP.md`](./MIA_ENGINE_2_0_ROADMAP.md) ?4  
**Freeze baseline:** `v=32-gfx-whole` ([`GRAPHICS_CHECKPOINT_v32.md`](./GRAPHICS_CHECKPOINT_v32.md))  
**Active runtime bust:** `v=36-koj-unify` (speech / bowl / manifest URLs)  
**Koj split bust:** `v=47-r1-tech-hype` (`kojnozrout-runtime.html` + split libs)  
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

Manual stream = jedna ?iv? OBS session, kde ?lov?k vizu?ln? potvrd? chov?n? overlay? (automatick? testy to nenahrad?).

1. **Start server** ? `node index.js` (nebo `npm start`); po?kej na zelen? health / OBS WS connect.
2. **Open overlays** ? v OBS na?ti runtime (`MIA_KOJ_RUNTIME` / `KOJNOZROUT_RUNTIME`), speech, bowl, gift anim (`37-stream-polish`); voliteln? `npm run obs:refresh-overlays`.
3. **Trigger combo/wave test** ? po?li d?rky / spam wave (admin debug nebo TikFinity ingest), a? vznikne `comboMoment` nebo aktivn? `spamSession`.
4. **Belly HUD** ? na b?i?e Koje: progress bar spam wave (`NN% ? T2`), countdown v subtextu, **??dn?** coin/gift value; stage t??dy `combo` / `spam-wave` / p?i vysok?m progress `combo-pulse`.
5. **Pass/fail** ? **PASS:** party scene p?i combo/wave, mood/FX reaguje i b?hem gift animace, gift video rotace per-tier beze zm?ny (index `rotationIndexByTier`); **FAIL:** zamrznut? mood, chyb?j?c? wave HUD, nebo coin/value na overlayi.

---

## This session (R1 slice)

### Improved (cb717643 + follow-up)

- **Stage mood during gift FX:** `applyStageMood` + `syncComboVisual` run every poll tick ? no longer skipped when `animationReaction` is active.
- **Combo / spam wave on Koj stage:** `syncComboVisual` adds `combo`, `spam-wave`, `combo-pulse`, `combo-urgent` from `comboMoment` / `spamSession` (miaPoints progress only).
- **Party scene fallback:** `resolveScene` switches to `party` when combo moment or spam wave is live.
- **Belly HUD wave:** `buildSpamWaveBellyContent` shows progress bar + countdown on Koj belly during active spam wave (no coin fields).
- **Split cache bust:** `43-koj-split` ? `44-r1-combo` ? `45-r1-combo-belly` on runtime HTML + split libs only (36 / 37 unchanged).
- **Combo belly HUD:** `buildComboMomentBellyContent` ? title/subtext/count on belly during combo moment (no coins).
- **Live motion hype:** `KojLiveMotion.isHype` boosts sway during combo/spam stage classes (split bust `46-r1-live-hype` -> `47-r1-tech-hype`).
- **Tech-energy hype:** `MiaTechEnergy.isHype` on Koj runtime + speech holo + gift overlay idle stage.
- **Speech holo parity:** `#miaHolo` combo-pulse/urgent CSS + `syncMiaHoloHype`; bubble `combo-hype` rim during wave.
- **Dashboard operator:** `spamHype` row shows wave/pulse/urgent % from miaPoints progress.
- **R1 acceptance contract:** `tests/mia_graphics_r1_contract.js` ? dual bust invariant, combo CSS selectors, pulse/urgent thresholds, public spamSession strip, speech/gift hype wiring (preflight fast).

### Still open for R1

| Area | Note |
|------|------|
| Manual stream gate (R1-C) | One full session with OBS overlays ? team sign-off |
| Battle / duel / walk pose art pass | LOW ? v36 doc gaps; motion via cycles/FX |
| Graphics freeze window doc | Formal ?E1 wiring freeze? paragraph after R1-C |
| Optional tag | `v0.1.1-graphics` after R1-C |

---

## deps-runtime (unchanged vs v36)

| Layer | Bust |
|-------|------|
| Speech / bowl / manifest | `36-koj-unify` |
| Gift overlay / desk | `37-stream-polish` |
| Koj runtime split | `47-r1-tech-hype` |

Refresh after deploy: `npm run obs:refresh-overlays`

---

## Test commands

```powershell
node --check index.js
npm run test:preflight:fast
node tests/kojnozout_runtime_split_contract.js
node tests/mia_graphics_r1_contract.js
```
