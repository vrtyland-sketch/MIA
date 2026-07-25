# MIA Graphics ? Phase R1 Status

**Datum:** 2026-07-24  
**Mega audit:** [`MIA_MEGA_AUDIT_2026-07-24.md`](./MIA_MEGA_AUDIT_2026-07-24.md)  
**GitHub:** Private YES · SSH OK · `master` @ `ddab7eb0` synced  
**Roadmap:** [`MIA_ENGINE_2_0_ROADMAP.md`](./MIA_ENGINE_2_0_ROADMAP.md) §4  
**Freeze baseline:** `v=32-gfx-whole` ([`GRAPHICS_CHECKPOINT_v32.md`](./GRAPHICS_CHECKPOINT_v32.md))  
**Active runtime bust:** `v=36-koj-unify` (speech / bowl / manifest URLs)  
**Koj split bust:** `v=49-r1-milestone-polish` (`kojnozrout-runtime.html` + split libs)  
**Gift overlay bust:** `v=37-stream-polish` (beze zm?ny)

---

## R1 acceptance checks (3 concrete gates)

| # | Check | How to verify | Status |
|---|--------|---------------|--------|
| **R1-A** | Koj runtime contract suites green | `node tests/kojnozout_runtime_split_contract.js` + `node tests/koj_public_snapshot_contract.js` + `node tests/mia_graphics_r1_contract.js` | ? automated |
| **R1-B** | Public overlay exposes **miaPoints only** (no coins/gift value) | `node tests/overlay_public_response_contract.js` + `node tests/mia_graphics_r1_contract.js` (spamSession strip) | ? automated |
| **R1-C** | Stable stream session: Koj mood/scene/combo wave react during gifts + spam wave; gift video rotation per-tier unchanged | Manual OBS session (checklist below) + `npm run test:preflight:fast` | ⏳ **manual gate open** |

**Gate to E1:** R1 lead confirms one stable stream session (R1-C) → optional tag `v0.1.1-graphics`.

---

## RC freeze (2026-07-24)

**MIA je stream release candidate.** Do úspěšného R1-C v OBS **nepřidávat velké featury** — žádný Engine wiring, žádný poker, žádné nové šílenosti.

| Co | Stav |
|----|------|
| Automatické testy | ✅ 157/157 (`preflight:fast`) |
| Tag `v0.1-stream-core` | ✅ rollback checkpoint |
| Tag `v0.1.1-graphics` | ⏳ **čeká na R1-C PASS** |
| Engine 2.0 první blok | 🔒 až po tagu |

**Po R1-C PASS:** commit `Complete R1-C OBS validation` → tag `v0.1.1-graphics` → push tag → teprve pak Engine první slice (4 moduly).

Výsledek zapisovat do [`MIA_R1C_OBS_RESULT.md`](./MIA_R1C_OBS_RESULT.md). Plán: [`MIA_RC_NEXT_STEPS.md`](./MIA_RC_NEXT_STEPS.md).

---

### R1-C — 10-krokový OBS checklist (exact)

**R1-C how to verify:** jedna kontrolovaná OBS session podle tabulky níže; automatické testy to nenahrazují.

Jedna kontrolovaná OBS session. Automatické testy to **nenahrazují** — vizuální + audio gate před grafickým tagem.

| # | Kroky | Co ověřit |
|---|--------|-----------|
| 1 | Spustit běžný runtime | `node index.js` nebo `npm start`; zelený health / OBS WS connect |
| 2 | Ověřit speech overlay **`36`** | Hologram + bublina, bust `36-koj-unify` |
| 3 | Ověřit gift overlay **`37`** | Animace dárků, bust `37-stream-polish` |
| 4 | Ověřit Kojnožrout **`49-r1-milestone-polish`** | Runtime split, belly HUD, scény |
| 5 | Poslat testovací chat | MIA reaguje, bublina OK |
| 6 | Poslat malý, střední a velký gift | T1–T4 animace, rotace per-tier (`rotationIndexByTier` beze resetu) |
| 7 | Ověřit combo/spam HUD | Belly progress, countdown, **jen `miaPoints`** — žádné coins/gift value |
| 8 | Ověřit bowl, inventář a battle obraz | Vizuálně srozumitelné, bez rozbitého layoutu |
| 9 | Poslechnout oba hlasy uchem | MIA + Koj — žádná dvojitá echo, žádný překryv |
| 10 | Zkontrolovat OBS layout | Nic není oříznuté, skryté nebo přes sebe |

Volitelně před session: `npm run obs:refresh-overlays` · po session: `npm run test:preflight:fast`.

#### Výsledek — šablona (vyplnit po session)

```text
R1-C PASS
Speech 36: OK
Gift 37: OK
Koj 49: OK
Chat: OK
Gift tiers: OK
Combo/spam: OK
Battle/inventory: OK
Audio: OK
OBS layout: OK
```

**FAIL:** nahradit `PASS` za `FAIL` a u konkrétní řádky napsat problém (např. `Combo/spam: FAIL — chybí belly HUD`).

#### Po R1-C PASS (operátor)

```powershell
# NEPOUŽÍVAT git add . — data/ a live stav nepatří do commitu
git add docs/MIA_R1C_OBS_RESULT.md
git commit -m "Complete R1-C OBS validation"
git push
git tag v0.1.1-graphics
git push origin v0.1.1-graphics
```

---

## This session (R1 slice)

### Improved (cb717643 + follow-up)

- **Stage mood during gift FX:** `applyStageMood` + `syncComboVisual` run every poll tick ? no longer skipped when `animationReaction` is active.
- **Combo / spam wave on Koj stage:** `syncComboVisual` adds `combo`, `spam-wave`, `combo-pulse`, `combo-urgent` from `comboMoment` / `spamSession` (miaPoints progress only).
- **Party scene fallback:** `resolveScene` switches to `party` when combo moment or spam wave is live.
- **Belly HUD wave:** `buildSpamWaveBellyContent` shows progress bar + countdown on Koj belly during active spam wave (no coin fields).
- **Split cache bust:** `43-koj-split` ? `44-r1-combo` ? `45-r1-combo-belly` on runtime HTML + split libs only (36 / 37 unchanged).
- **Combo belly HUD:** `buildComboMomentBellyContent` ? title/subtext/count on belly during combo moment (no coins).
- **Live motion hype:** `KojLiveMotion.isHype` boosts sway during combo/spam stage classes (split bust trail through `49-r1-milestone-polish`).
- **Duel/battle/walk CSS polish:** Soft Neon purple rim on duel/battle; walk-frame contact shadow (slice 11, no new art).
- **Tech-energy hype:** `MiaTechEnergy.isHype` on Koj runtime + speech holo + gift overlay idle stage.
- **Speech holo parity:** `#miaHolo` combo-pulse/urgent CSS + `syncMiaHoloHype`; bubble `combo-hype` rim during wave.
- **Dashboard operator:** `spamHype` row shows wave/pulse/urgent % from miaPoints progress.
- **R1 acceptance contract:** `tests/mia_graphics_r1_contract.js` ? dual bust invariant, combo CSS selectors, pulse/urgent thresholds, public spamSession strip, speech/gift hype wiring (preflight fast).

### Still open for R1

| Area | Note |
|------|------|
| Manual stream gate (R1-C) | One full OBS session — **10-step checklist** in § R1-C above; **blocks `v0.1.1-graphics` tag** |
| RC freeze doc | ✅ [`MIA_RC_NEXT_STEPS.md`](./MIA_RC_NEXT_STEPS.md) + result stub [`MIA_R1C_OBS_RESULT.md`](./MIA_R1C_OBS_RESULT.md) |
| Battle / duel / walk pose art pass | LOW — v36 doc gaps; motion via cycles/FX |
| Optional tag | `v0.1.1-graphics` after R1-C PASS only |

---

## deps-runtime (unchanged vs v36)

| Layer | Bust |
|-------|------|
| Speech / bowl / manifest | `36-koj-unify` |
| Gift overlay / desk | `37-stream-polish` |
| Koj runtime split | `49-r1-milestone-polish` |

Refresh after deploy: `npm run obs:refresh-overlays`

---

## Test commands

```powershell
node --check index.js
npm run test:preflight:fast
node tests/kojnozout_runtime_split_contract.js
node tests/mia_graphics_r1_contract.js
```
