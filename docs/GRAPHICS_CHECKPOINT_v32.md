# Graphics Checkpoint — v32 (FREEZE / BASELINE)

**Stav:** 🔒 **FREEZE CHECKPOINT**  
**Datum:** 2026-07-20  
**Produkt:** Graphics Whole v32  
**Cache bust (baseline):** `v=32-gfx-whole` (řetězec `32-gfx-whole`)

Od tohoto data je **Graphics Whole v32** oficiální grafický baseline. Všechny další grafické změny se porovnávají proti němu. Další návrhová práce (inventory / battle / stream runtime) bere **v32** jako výchozí grafickou verzi.

---

## Deklarace freeze

| Položka | Hodnota |
|---------|---------|
| Checkpoint | Graphics Whole v32 |
| Bust string | `32-gfx-whole` / query `?v=32-gfx-whole` |
| Potvrzeno | hotové, na disku |
| Git commit | *není součástí freeze* — freeze je dokumentace + stav na disku |
| Další inkrementy | jen `v33`, `v34`, … (ne přepis v32) |

**v32 se nemění.** Opravy a vylepšení jdou do nové bust verze.

---

## Pointery (zdroj pravdy)

| Dokument / artefakt | Úloha |
|---------------------|--------|
| [`docs/MIA_GRAPHICS_WHOLE.md`](./MIA_GRAPHICS_WHOLE.md) | Celek produktu: Rig Desk → runtime → gift stage → OBS |
| [`docs/MIA_RUNTIME_ROADMAP.md`](./MIA_RUNTIME_ROADMAP.md) | **Runtime roadmapa** (stabilita / Director / Replay) — **není** grafický inkrement; freeze v32 zůstává |
| [`docs/MIA_PHASE1_STABILITY.md`](./MIA_PHASE1_STABILITY.md) | Checklist Fáze 1 (go) |
| [`docs/SOFT_NEON_RIG_DESK.md`](./SOFT_NEON_RIG_DESK.md) | Soft Neon Rig Desk — editor kotvev |
| [`docs/GIFT_ANIMATION_STREAM.md`](./GIFT_ANIMATION_STREAM.md) | Gift Animation Stream / Desk / OBS |
| [`.tmp-audit/gfx-v32-SUMMARY.json`](../.tmp-audit/gfx-v32-SUMMARY.json) | Proof run v32 (jobs Lion/Universe/Galaxy, pages, OBS refresh) |
| Chat audit „co přibylo“ (2026-07-20) | Referenční inventář artefaktů — viz agent transcript [Audit grafiky](4f99c00f-e986-4792-afae-e6dbb488b563) |
| `mia-output-overlay/GRAPHICS_BASELINE.txt` | Krátká kotva v overlay stromu |

Sdílený runtime bust (příklady): `mia-output-overlay/lib/mia-rig-anchors.js` (`CACHE_BUST`), speech/Koj/bowl URLs → `36-koj-unify`.  
Gift-only: `index.js` / gift overlay → `37-stream-polish` (`GIFT_ANIM_CACHE_BUST`).  
OBS: `scripts/obs_refresh_overlays.js`.

```text
freeze baseline = 32-gfx-whole
active runtime bust = 36-koj-unify
gift-only polish = 37-stream-polish
```

Předstream: [`docs/MIA_PRESTREAM_DOD.md`](./MIA_PRESTREAM_DOD.md).

---

## Proces pro v33+

1. **Nesahat na v32 jako na „živou“ verzi** — baseline zůstává referencí.
2. **Inkrementální bust:** nová práce = `v=33-…` (nebo `34-…`), aktualizovat centralizované výskyty bust stringu + docs.
3. **Každá změna (PR / poznámka / checkpoint entry) dokumentuje:**
   - **added** — co přibylo
   - **changed** — co se změnilo oproti předchozí verzi (defaultně vs v32, nebo vs poslední inkrement)
   - **removed** — co zmizelo / deprecated
   - **deps-runtime** — závislosti, runtime mapping, OBS URL, API, cache bust
4. **Porovnání** vždy proti tomuto checkpointu (nebo proti poslednímu schválenému inkrementu odvozenému z něj).
5. Po větší změně stream/OBS/ingest: `node --check index.js` + `npm run test:preflight:fast` (MIA guardrails).

Šablona poznámky:

```text
## Graphics delta vNN
- baseline: v32-gfx-whole (docs/GRAPHICS_CHECKPOINT_v32.md)
- added:
- changed:
- removed:
- deps-runtime:
```

---

## Post-checkpoint checklist

*Dokumentovat / projít před dalším grafickým inkrementem — ne nutně plný deep audit.*  
**Provedeno 2026-07-20** → výsledky: [`docs/GRAPHICS_CHECKPOINT_v32_POSTCHECK.md`](./GRAPHICS_CHECKPOINT_v32_POSTCHECK.md) · proof `.tmp-audit/gfx-v32-POSTCHECK.json`

- [x] **PNG completeness** — cyber MIA, Koj moods, gift-creatures (lion / universe / galaxy dual frames), žádné chybějící cesty v HTML/CSS
- [x] **Animation linkages** — gift stage swap frames, idle→play, Rig Desk → anchors JSON → runtime
- [x] **Runtime mapping** — MIA (`speech-overlay`), Koj (`kojnozrout-runtime`), battle (pokud se dotkne grafiky), overlays + OBS zdroje (`MIA_GIFT_ANIMATION`, …)
- [x] **Unused assets** — orphan PNG / staré manifests (`31-gfx-next` vs aktivní bust)
- [x] **Duplicates** — archivy vs aktivní moods, duplicate sprites / backup `*.pre-*-vNN.png`
- [x] **Bundle / payload size** — velké assety, generated gift jobs, zbytečné archive v hot path

---

## Interim záměrně ponechané ve v32

(nezměnit „opravou v32“ — řešit až v33+)

- Head slot = clip / mock — ne part PNG sheets
- Gift stage = HTML/CSS/Canvas, `trueAiVideo=false`
- Graphics Studio Phase 13+ / timeline / 3D — mimo tento celek

---

*Freeze zaznamenán 2026-07-20. Oficiální graphics baseline = `v=32-gfx-whole`.*
