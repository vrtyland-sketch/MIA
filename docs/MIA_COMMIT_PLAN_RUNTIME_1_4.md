# MIA — Commit plán (předstreamový checkpoint)

**Stav:** checkpoint **1–5 DONE** lokálně · **push NEDĚLAT**, dokud operátor neřekne „push“.  
**Datum:** 2026-07-21 · audit ~**92 %**  
**Předstream:** [`MIA_PRESTREAM_DOD.md`](./MIA_PRESTREAM_DOD.md) · audit: [`MIA_AUDIT_2026-07-21.md`](./MIA_AUDIT_2026-07-21.md)  
**DoD:** [`MIA_LIVE_DOD.md`](./MIA_LIVE_DOD.md) · výsledky: [`MIA_LIVE_DOD_RESULTS.md`](./MIA_LIVE_DOD_RESULTS.md)  
**Dirty po C5:** [`MIA_DIRTY_TREE_AFTER_C5.md`](./MIA_DIRTY_TREE_AFTER_C5.md)

Cíl: zmrazit funkční stav do reviewovatelných commitů **bez** big-bang „MIA hotovo“ pytle — **splněno** (C1–C5).

### Checkpoint hashes (local, not pushed)

| # | Message (short) | Hash |
|---|-----------------|------|
| 1 | Runtime F1–4 | `874227d6` |
| 2 | Post-DoD / AQ / gift 37 | `b5d51352` |
| 3 | Graphics 36/37 | `34f9816e` |
| 4 | Docs / DoD | `306eb61d` |
| 5 | Archive deletes | `bc126646` |

> Dřívější návrh A–E (phase1→4 + graphics) je nahrazen tímto **5-commit** pořadím. Fáze 1–4 = **commit 1**; post-DoD/AQ/gift37 odděleně.

---

## Principy

1. Minimální diff per commit — žádné „uklidit ještě index.js“.  
2. Runtime ≠ grafika ≠ archive deletes — oddělené historie.  
3. Archive deletes **vždy zvlášť** (snadný revert).  
4. Po každém commitu (až „go“): `node --check index.js` + relevantní phase / preflight testy.  
5. **Žádný commit bez explicitního „commit“ od operátora.**

---

## Commit 1 — Runtime phases 1–4

**Proč:** páteř stream runtime (normalizer, AQ jádro, Director, Koj needs, battle MVP, profiles…).

**Typický obsah:**

- `core/` — event-normalizer, action-queue (základ), runtime-state, watchdog, director, combo, viewer-memory, koj needs, tech-forms, inventory, profiles…
- `config/runtime.json` — phase1–4
- wiring: pipeline / TTS enqueue / boot / admin routes (runtime část)
- testy: `tests/phase1_*.js` … `phase4_*.js`
- docs fází: `MIA_PHASE1_*.md` … `MIA_PHASE4_*.md`, changelog 1–4 (volitelně)

**Message (návrh):**  
`feat(runtime): freeze phases 1–4 — director, game layer, profiles`

**Verify:** `npm run test:phase1` … `test:phase4` · `node --check index.js`

---

## Commit 2 — Post-DoD / AQ hardening / gift 37

**Proč:** produkční AQ harden, Theme Manager MVP (default OFF), gift storyboards Universe/Galaxy/Rose, gift-only bust `37-stream-polish`.

**Typický obsah:**

- `core/action-queue.js` harden + admin AQ API
- `core/theme-manager.js` + theme routes / overlay-state hint
- `shared/mia-gift-animation/storyboard.js` (Universe / Galaxy / Rose)
- gift overlay / desk / `index.js` gift URL → `37-stream-polish` (`GIFT_ANIM_CACHE_BUST`)
- testy: AQ / theme / storyboard contracts
- docs: `MIA_AQ_PRODUCTION.md`, `MIA_POST_DOD_PROGRESS.md`

**Message:**  
`feat(post-dod): AQ production harden, theme MVP OFF, gift bust 37`

**Verify:** `node tests/phase1_action_queue_contract.js` · theme + storyboard contracts · gift URL `?v=37-stream-polish`

---

## Commit 3 — Graphics 36/37

**Proč:** Runtime freeze nesmí být blokovaný art busty; Soft Neon / Koj half-robot + gift polish assets.

**Typický obsah:**

- Soft Neon / Koj half-robot assets (`36-koj-unify`)
- runtime bust string `36-koj-unify` (speech / Koj / bowl / manifest / promptBuilder)
- gift art / desk polish vázané na `37-stream-polish` (pokud nešlo do commit 2)
- docs: `GRAPHICS_v3*.md`, `MIA_GRAPHICS_WHOLE.md` (inkrementy)

**Message:**  
`feat(graphics): v36 koj unify + v37 gift polish (dual bust)`

**Verify:** vizuál OBS + `npm run obs:refresh-overlays`  
Baseline freeze zůstává `v=32-gfx-whole`.

---

## Commit 4 — Documentation sync

**Proč:** sjednotit dual-bust model a předstreamový DoD bez míchání s kódem.

**Typický obsah:**

- `docs/MIA_PRESTREAM_DOD.md`
- `docs/MIA_AUDIT_2026-07-21.md`
- `docs/MIA_LIVE_DOD*.md`, `MIA_COMMIT_PLAN_RUNTIME_1_4.md`
- sync: `MIA_GRAPHICS_WHOLE`, `GIFT_ANIMATION_STREAM`, checkpoint pointery

**Model v docs:**

```text
freeze baseline = 32-gfx-whole
active runtime bust = 36-koj-unify
gift-only polish = 37-stream-polish
```

**Message:**  
`docs: prestream DoD + dual bust 32/36/37 sync`

**Verify:** žádný zbývající „gift overlay = 36“ v živých stream docs.

---

## Commit 5 — Archive deletions

**Proč:** mazání archivů / `_offline_backup` cleanup odděleně — snadný revert, čistá historie.

**Typický obsah:**

- smazané archive cesty (např. staré `_archive/v3*` raw masters)
- **ne** míchat s runtime ani graphics feature commity

**Message:**  
`chore: remove obsolete graphics archives`

**Verify:** stream stále běží; chybějící archive ≠ runtime path.

---

## Pořadí

```text
1 (Runtime F1–4)
  → 2 (Post-DoD / AQ / gift 37)
  → 3 (Graphics 36/37)
  → 4 (Docs sync)
  → 5 (Archive deletes)   ← vždy poslední / odděleně
```

Commity 3 a 4 mohou jít těsně za sebou; **5 nikdy nemíchat** s 1–3.

---

## Co záměrně NEcommittovat

- `.env`, hesla, TikFinity/OBS secrets  
- `data/viewer-memory.json` / velké live state dumps  
- WIP experimenty mimo freeze  
- generované joby s PII  

---

## Operátor checklist po C5

1. ✅ C1–C5 hotové lokálně (`874227d6` … `bc126646`).  
2. Manuál: OBS Preview · mute · AQ soak — viz [`MIA_PRESTREAM_DOD.md`](./MIA_PRESTREAM_DOD.md).  
3. Dirty leftovers: [`MIA_DIRTY_TREE_AFTER_C5.md`](./MIA_DIRTY_TREE_AFTER_C5.md) — **necommittovat** jako mega-commit; master-canon odděleně.  
4. **Push** až po explicitním „push“.
