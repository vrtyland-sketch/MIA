# GP-C — PNG → Reel Scorecard

**Golden Path:** `PNG → publikovatelný 8s Reel MP4 (9:16)`  
**Řízeno:** [`MIA_GOLDEN_PATHS.md`](./MIA_GOLDEN_PATHS.md)  
**Datum lock:** 2026-08-08  
**Stav:** **FAIL** — 2/12 článků PROD 5/5

> **GP-C implementace je ZAKÁZÁNA, dokud GP-S ≠ PROD 5/5.** Viz hlavička v [`MIA_GOLDEN_PATHS.md`](./MIA_GOLDEN_PATHS.md).

> **PROD určuje nejslabší článek řetězce.**

---

## Řetězec (12 článků)

```text
PNG import → 9:16 project → Director → image prep → timeline
  → motion → TTS/VO → audio mix → captions → safe zone → render MP4 → QC publish
```

**Sloupce:** IMPL | TEST | REAL OUTPUT | QUALITY | REPEAT | EVIDENCE | OWNER/BLOCKER

---

## Golden PNG → Reel (po GP-S PROD)

**Vstup:** 1 existující PNG (Koj MASTER ref — **ne** AI gen).

**Brief (fixní):**

> „8s Reel, 9:16, jemný motion, český VO 1 věta, titulky dole, export MP4.“

**Pass criteria:**

| # | Kritérium |
|---|-----------|
| 1 | MP4 1080×1920, 8±1 s |
| 2 | QUALITY ≥ ACCEPTABLE — human „dal bych na TikTok“ |
| 3 | Titulky v bottom safe zone |
| 4 | VO slyšitelné CS |
| 5 | Motion ≠ procedural placeholder |
| 6 | 3× repeat → 3× publishable MP4 |

**Evidence:** `.miapaint` + MP4 + screenshot @ 3s + operátor checklist.

---

## Scorecard

### 1. PNG import

| IMPL | TEST | OUTPUT | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|--------|---------|--------|----------|-------|
| ✅ | ✅ | ✅ | 🟢 HQ | ✅ | mia-paint import | **CODE** |

**Verdikt:** **PROD 5/5** ✅

---

### 2. 9:16 project / canvas

| IMPL | TEST | OUTPUT | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|--------|---------|--------|----------|-------|
| ✅ | ✅ | ⚠️ | — | ⚠️ | `exportTemplates.tiktok`; ne „New Reel“ UX | **CODE** CS2-1 |

**Verdikt:** PARTIAL

---

### 3. Director

| IMPL | TEST | OUTPUT | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|--------|---------|--------|----------|-------|
| ⚠️ | ⚠️ | ❌ | — | ❌ | `pipelineRunner` regex stub | **CODE** CS2-4 |

**Verdikt:** FAIL

---

### 4. Image prep (crop/scale)

| IMPL | TEST | OUTPUT | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|--------|---------|--------|----------|-------|
| ✅ | ✅ | ✅ | 🟢 | ✅ | Ruční v mia-paint | **CODE** |

**Verdikt:** **PROD 5/5** ✅

---

### 5. Timeline

| IMPL | TEST | OUTPUT | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|--------|---------|--------|----------|-------|
| ✅ | ✅ | ⚠️ | — | ❌ | Foundation; ne 8s Reel workflow | **CODE** |

**Verdikt:** FAIL

---

### 6. Motion / animation

| IMPL | TEST | OUTPUT | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|--------|---------|--------|----------|-------|
| ⚠️ | ⚠️ | ⚠️ | 🔴 PLACEHOLDER | ❌ | Koj pokus = procedural; ne golden | **CODE** + **CONTENT** |

**Verdikt:** FAIL — **weakest link**

---

### 7. TTS / VO (studio)

| IMPL | TEST | OUTPUT | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|--------|---------|--------|----------|-------|
| ⚠️ | ⚠️ | ❌ | — | ❌ | Edge TTS jen Stream Core | **CODE** CS2-3 |

**Verdikt:** FAIL

---

### 8. Audio mix

| IMPL | TEST | OUTPUT | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|--------|---------|--------|----------|-------|
| ❌ | ❌ | ❌ | — | ❌ | Neexistuje | **CODE** CS2-6 |

**Verdikt:** FAIL

---

### 9. Captions

| IMPL | TEST | OUTPUT | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|--------|---------|--------|----------|-------|
| ❌ | ❌ | ❌ | — | ❌ | PLÁNOVANÉ | **CODE** CS2-6 |

**Verdikt:** FAIL

---

### 10. Safe zone QC

| IMPL | TEST | OUTPUT | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|--------|---------|--------|----------|-------|
| ⚠️ | ❌ | ❌ | — | ❌ | safeMargin v JSON; ne engine | **CODE** CS2-5 |

**Verdikt:** FAIL

---

### 11. Render MP4

| IMPL | TEST | OUTPUT | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|--------|---------|--------|----------|-------|
| ✅ | ⚠️ | ⚠️ | ? | ❌ | `MIA.exportVideo`; ne Reel E2E | **CODE** + **CONFIG** |

**Verdikt:** FAIL

---

### 12. QC publish gate

| IMPL | TEST | OUTPUT | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|--------|---------|--------|----------|-------|
| ⚠️ | ✅ | ❌ | — | ❌ | Bank gate only; ne social Reel | **CODE** CS2-5 |

**Verdikt:** FAIL

---

## Heatmap

```text
PNG import       ✅ PROD
9:16 project     ⚠️
Director         ❌
image prep       ✅ PROD
timeline         ❌
motion           ❌ ← weakest
TTS/VO           ❌
audio mix        ❌
captions         ❌
safe zone        ❌
render MP4       ⚠️❌
QC publish       ❌
```

---

## Blocker stack (po GP-S PROD)

| Fáze | Článek | GP-C # |
|------|--------|--------|
| CS2-1 | 9:16 project + `.miacreative` v0 | 2 |
| CS2-2 | Motion (Ken Burns min.) | **6** |
| CS2-3 | TTS → audio → timeline | 7 |
| CS2-4 | Director MVP `reel_from_png` | 3 |
| CS2-5 | Safe zone + QC + MP4 golden | 10, 11, 12 |
| CS2-6 | Captions + audio mix | 8, 9 |

**Later (jen pokud zvedne motion/QC):** provider router, AI Koj, 1→N social — jinak STOP.

Blueprint: [`MIA_CREATIVE_STUDIO_2_BLUEPRINT.md`](./MIA_CREATIVE_STUDIO_2_BLUEPRINT.md)

---

## Finální verdikt

# **`PNG → REEL = FAIL (NOT PROD 5/5)`**

**PROD 5/5 dnes:** 2/12 (PNG import + ruční image prep)  
**Weakest link:** Motion / animation

**Pass =** 12/12 PROD + Golden test 3×
