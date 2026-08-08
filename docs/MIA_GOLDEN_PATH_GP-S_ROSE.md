# GP-S — Rose Reaction Scorecard

**Golden Path:** `Rose → kompletní reakce → divák`  
**Řízeno:** [`MIA_GOLDEN_PATHS.md`](./MIA_GOLDEN_PATHS.md)  
**Datum lock:** 2026-08-08  
**Stav:** **FAIL** — 0/15 článků PROD 5/5

> **Rose E2E není PROD podle průměru. PROD určuje nejslabší článek řetězce.**

---

## Řetězec (15 článků)

```text
TikFinity → ingest → dedup → normalize → gift map → economy → decision
  → Koj routing → text bank → Antonín → animation selection → queue
  → WEBM/video → OBS → viewer
```

**Sloupce:** IMPL | TEST | LIVE | QUALITY | REPEAT | EVIDENCE | OWNER/BLOCKER

**OWNER/BLOCKER:** CODE / CONTENT / CONFIG / INFRA / HUMAN CHECK

---

## Golden Rose protocol (po migraci)

```text
Rose #1 → 10 s pauza → Rose #2 → 10 s pauza → Rose #3
→ krátká pauza → burst 3× Rose
```

**Pass:** 3/3 singles + burst dedup/queue OK + screenshot no coins + log + operátor sign-off.

---

## Scorecard

### 1. TikFinity

| IMPL | TEST | LIVE | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|------|---------|--------|----------|-------|
| ✅ | — | ⚠️ | — | ❌ | PMB: eventy, pak crash | **INFRA** |

**Verdikt:** FAIL

---

### 2. Ingest (`/ingest`)

| IMPL | TEST | LIVE | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|------|---------|--------|----------|-------|
| ✅ | ⚠️ | ✅ | — | ⚠️ | 6× Rose v `ingest-2026-08-08.jsonl` | **INFRA** |

**Verdikt:** PARTIAL

---

### 3. Dedup

| IMPL | TEST | LIVE | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|------|---------|--------|----------|-------|
| ✅ | ✅ | ❌ | — | ❌ | `ingest_dedupe_smoke`; burst ne testován | **CODE** |

**Verdikt:** FAIL (LIVE/REPEAT)

---

### 4. Normalize

| IMPL | TEST | LIVE | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|------|---------|--------|----------|-------|
| ✅ | ✅ | ✅ | — | ⚠️ | Rose prošla do decision/TTS | **CODE** |

**Verdikt:** PARTIAL

---

### 5. Gift map (ROSE → tier)

| IMPL | TEST | LIVE | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|------|---------|--------|----------|-------|
| ✅ | ✅ | ✅ | ✅ | ⚠️ | `gift-mapping-2026-08-08.jsonl`, T1 | **CODE** |

**Verdikt:** PARTIAL→PASS logika

---

### 6. Economy (miaPoints, no coins)

| IMPL | TEST | LIVE | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|------|---------|--------|----------|-------|
| ✅ | ✅ | ⚠️ | ⚠️ | ❌ | overlay_public contract; no screenshot | **HUMAN CHECK** |

**Verdikt:** FAIL

---

### 7. Decision (shadow pipeline)

| IMPL | TEST | LIVE | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|------|---------|--------|----------|-------|
| ✅ | ✅ | ⚠️ | — | ⚠️ | Koj path v logu u Rose 20:26 | **CODE** |

**Verdikt:** PARTIAL

---

### 8. Koj routing (speaker + vizuál)

| IMPL | TEST | LIVE | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|------|---------|--------|----------|-------|
| ✅ | ✅ | ⚠️ | ⚠️ | ❌ | Log Koj; operátor neslyšel Koj izolovaně | **CODE** + **HUMAN** |

**Verdikt:** FAIL

---

### 9. Text bank

| IMPL | TEST | LIVE | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|------|---------|--------|----------|-------|
| ✅ | ✅ | ✅ | ⚠️ | ⚠️ | Bank lines v logu; overlay test mask PF-01 | **CONTENT** |

**Verdikt:** PARTIAL

---

### 10. Antonín TTS

| IMPL | TEST | LIVE | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|------|---------|--------|----------|-------|
| ✅ | ✅ | ⚠️ | ⚠️ | ❌ | Log Antonín; ucho nepotvrdilo Koj | **HUMAN** + **INFRA** |

**Verdikt:** FAIL

---

### 11. Animation selection

| IMPL | TEST | LIVE | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|------|---------|--------|----------|-------|
| ✅ | ✅ | ❌ | ⚠️ | ❌ | Overlay viditelnost ne auditována | **HUMAN CHECK** |

**Verdikt:** FAIL

---

### 12. Queue (TTS / video ordering)

| IMPL | TEST | LIVE | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|------|---------|--------|----------|-------|
| ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ | 6 Rose v okně; burst ne testován | **CODE** |

**Verdikt:** FAIL

---

### 13. WEBM / video (`video_job_enqueued`)

| IMPL | TEST | LIVE | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|------|---------|--------|----------|-------|
| ✅ | ⚠️ | ❌ | ⚠️ | ❌ | **1/6** Rose video; 20:26 bez video job | **CODE** + **CONTENT** |

**Verdikt:** FAIL — **2. nejslabší článek**

---

### 14. OBS (WS, playback)

| IMPL | TEST | LIVE | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|------|---------|--------|----------|-------|
| ✅ | ⚠️ | ❌ | — | ❌ | 34/60 ticků disconnected; crash | **INFRA** + **CONFIG** |

**Verdikt:** FAIL — **primární blocker**

---

### 15. Viewer (kompletní reakce)

| IMPL | TEST | LIVE | QUALITY | REPEAT | EVIDENCE | OWNER |
|------|------|------|---------|--------|----------|-------|
| — | — | ⚠️ | ⚠️ | ❌ | MIA ~10 s slyšet; produkt ne 3× | **INFRA** + **HUMAN** |

**Verdikt:** FAIL

---

## Heatmap

```text
TikFinity      ⚠️❌  INFRA
ingest         ✅⚠️  INFRA
dedup          ✅❌  CODE
normalize      ✅⚠️
gift map       ✅⚠️
economy        ✅❌  HUMAN
decision       ✅⚠️
Koj routing    ✅❌  HUMAN+CODE
text bank      ✅⚠️  CONTENT
Antonín        ✅❌  HUMAN
animation sel  ✅❌  HUMAN
queue          ✅❌  CODE
WEBM/video     ✅❌  CODE
OBS            ✅❌  INFRA ← weakest
viewer         ❌
```

---

## Blocker stack (po migraci)

| P | Článek | Owner |
|---|--------|-------|
| P0 | OBS → viewer | INFRA |
| P0 | TikFinity stabilita | INFRA |
| P1 | WEBM/video u Rose | CODE |
| P1 | Antonín + Koj routing LIVE | HUMAN |
| P2 | dedup + queue burst | CODE |
| P2 | economy no-coins screenshot | HUMAN |
| P3 | text bank overlay copy | CONTENT |

**Rose nepotřebuje novou architekturu** — většina řetězce IMPL+TEST existuje. Chybí infra proof, video konzistence, lidský důkaz.

---

## Finální verdikt

# **`ROSE REACTION = FAIL (NOT PROD 5/5)`**

**Weakest link:** OBS → viewer  
**Pass =** všech 15 článků PROD 5/5 + Golden Rose protocol

Evidence baseline: [`PRE_MIGRATION_BASELINE_EVIDENCE.md`](./PRE_MIGRATION_BASELINE_EVIDENCE.md)
