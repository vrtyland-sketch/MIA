# Etapa 3C — Mezery (jen ⚠ / ❌ / ❓)

Seřazeno dle severity: **VYSOKÁ → STŘEDNÍ → NÍZKÁ → INFO**.

Cross-reference: bowl pásma sdílené s **Etapa 3A** (`GAP-03` G-49); speaker routing částečně v 3A G-67.

---

## VYSOKÁ

### GAP-C01 — Bowl full: vizuál/mood ≥95 % vs T4 trigger až při 100 %
| | |
|--|--|
| **ID matrix** | KJ-34 ✅, KJ-37 ⚠, KJ-38 ⚠ (≈ 3A G-49) |
| **Kánon** | `KOJNOZROUT_KANON.md`: plná miska ≥95 % → oslava + T4 event |
| **Implementace** | `MIA_KOJNOZROUT_DISPLAY.js` + ENGINE: mood/stage/celebrate od **95 %**; `KOJNOZROUT_BOWL_ENGINE.shouldTriggerFullBowl`: **`percent < 100` → false** — T4 cyklus až při **100 %** |
| **Dopad** | V rozsahu **95–99 %** divák vidí „plnou“ misku a celebrate, ale **T4 video/cycle se neodpálí** — user-visible behavior drift |
| **Severity** | ⚠ **VYSOKÁ** |
| **Návrh (bez kódu)** | Sjednotit trigger na ≥95 % nebo upřesnit kánon (visual full ≠ cycle trigger) |

---

## STŘEDNÍ

### GAP-C02 — Trust jako CARE výstup chybí
| | |
|--|--|
| **ID** | KJ-23 |
| **Kánon** | `KOJNOZROUT_KANON.md` § CARE výstupy — Trust |
| **Implementace** | `MIA_KOJNOZROUT_BOND.js` — bond, satisfaction, neglect; **žádné `trust` pole** |
| **Dopad** | Kánon slibuje dimenzi důvěry oddělenou od bond; chybí pro budoucí avatar/quest vrstvy |
| **Severity** | ❌ **STŘEDNÍ** (kánonní mezera, ne runtime crash) |

### GAP-C03 — Bowl vizuální 4 pásma vs kánon 3 pásma
| | |
|--|--|
| **ID** | KJ-33 (≈ 3A GAP-03) |
| **Kánon** | 0–30 / 31–94 / ≥95 |
| **Implementace** | `resolveBowlVisualLevel`: low / mid(30–59) / high(60–94) / full(≥95) |
| **Dopad** | Extra granularita od 60 % — overlay CSS a copy mohou divergovat od kánonního popisu |
| **Severity** | ⚠ **STŘEDNÍ** |

### GAP-C04 — Přítomnost diváků 🟡
| | |
|--|--|
| **ID** | KJ-14 |
| **Kánon** | Přítomnost aktivních sledujících jako zdroj energie |
| **Implementace** | Proxy přes `streamState.engagementState` + chat recency; **bez viewer-count vitals** |
| **Severity** | ⚠ **STŘEDNÍ** + ❓ live viewer API |

### GAP-C05 — Speaker routing: chybí contract rutinní chat → MIA
| | |
|--|--|
| **ID** | KJ-47, KJ-67 |
| **Kánon** | Koj = pet, ne hlavní řečník; rutinní chat → MIA |
| **Implementace** | `describeEventResponder` default `"mia"` ✅ |
| **Důkaz** | `speaker_routing_contract.js` pokrývá **gifty**, ne obecný CHAT event |
| **Severity** | ⚠ **STŘEDNÍ** (regrese nehlídaná) |

### GAP-C06 — Doménová hierarchie orchestrace 🟡
| | |
|--|--|
| **ID** | KJ-15 |
| **Kánon** | Community → CARE → SUPPORT → Events jako vrstvený model |
| **Implementace** | Lanes v delivery/orchestrator; ne centralizovaný „domain hierarchy“ modul |
| **Severity** | ⚠ **STŘEDNÍ** (architektonický drift, behavior OK) |

### GAP-C07 — CARE Activity output unnamed
| | |
|--|--|
| **ID** | KJ-24 |
| **Kánon** | Activity jako explicitní CARE výstup |
| **Implementace** | `energy`, `behavior`, `socialState` — sémanticky pokryto, bez pole `activity` |
| **Severity** | ⚠ **STŘEDNÍ** (naming drift) |

### GAP-C08 — Cross-stream duel live na dvou hostech
| | |
|--|--|
| **ID** | KJ-79 |
| **Kánon** | Paralelní duely 2 streamy |
| **Implementace** | `MIA_KOJNOZROUT_DUEL.js` model + sync contracts |
| **Neověřeno** | Produční dual-host OBS scéna |
| **Severity** | ❓ **STŘEDNÍ** |

---

## NÍZKÁ

### GAP-C09 — Eating variant count 12 vs 16
| | |
|--|--|
| **ID** | KJ-50 |
| **Kánon** | eating-01…eating-12 |
| **Implementace** | `EATING_VARIANT_COUNT = 16` v `KOJNOZROUT_MOOD_DERIVE.js` |
| **Dopad** | Rozšíření nad kánon; testy aligned na 16 |
| **Severity** | ⚠ **NÍZKÁ** |

### GAP-C10 — Walk state nepersistována
| | |
|--|--|
| **ID** | KJ-73 |
| **Kánon** | — (implicitní continuity) |
| **Implementace** | `walkUntilTs` / `walkActive` mimo `PERSISTED_FIELDS` |
| **Dopad** | Restart během venčení ztratí walk animaci |
| **Severity** | ⚠ **NÍZKÁ** |

### GAP-C11 — PNG count dokumentace (290 vs expanded set)
| | |
|--|--|
| **ID** | KJ-56 |
| **Kánon** | 290 PNG v moods/ |
| **Implementace** | Expanded asset set + derived; alignment doc uvádí 48 canon + derived |
| **Severity** | ⚠ **NÍZKÁ** (docs only) |

### GAP-C12 — Priorita overlay z-index Streamer→Koj→MIA
| | |
|--|--|
| **ID** | KJ-03 |
| **Kánon** | Priorita AI entit |
| **Implementace** | Anchors + manifest; speech bubble priority rules separátně |
| **Severity** | ⚠ **NÍZKÁ** |

### GAP-C13 — Bowl cycle / reset bez izolovaného contractu
| | |
|--|--|
| **ID** | KJ-39, KJ-40 |
| **Kánon** | 750 ms loop, 3 s hold reset |
| **Implementace** | Kód existuje |
| **Důkaz** | Jen indirect přes `runtime_loops_ctx`, `canon_flow` |
| **Severity** | ⚠ **NÍZKÁ** |

---

## INFO / budoucí (⬜)

| ID | Oblast | Poznámka |
|----|--------|----------|
| KJ-80 | Avatar viewer | Plánováno v kánonu |
| KJ-81 | Playlist queue | Plánováno |
| KJ-82 | NEJSEM TU | Plánováno |

---

## Souhrn severity

| Severity | Počet |
|----------|-------|
| VYSOKÁ | 1 |
| STŘEDNÍ | 7 |
| NÍZKÁ | 5 |
| INFO ⬜ | 3 |

**Rizika pro summary tabulku:** 1 vysoké · 5 středních · 4 nízké (+ 3 INFO mimo skóre)
