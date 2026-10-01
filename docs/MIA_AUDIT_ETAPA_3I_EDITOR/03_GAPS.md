# Etapa 3I — Mezery (Editor)

Seřazeno dle severity: **VYSOKÁ → STŘEDNÍ → NÍZKÁ → INFO**.  
Mezery = záznam pro **DECISION later** — ne auto-fix.

**Poslední ověření:** fresh review (2026-07-27) vs historický vs nikdy.

---

## VYSOKÁ

*Žádná VYSOKÁ mezera proti Stream Core guardrails.*  
Editor je oddělený od `processEvent`; body parts default OFF; production gate existuje. Rizika níže jsou provozní / maturity, ne hard break streamu.

---

## STŘEDNÍ

### GAP-I01 — Standalone editor není plný offline produkt bez MIA serveru
| | |
|--|--|
| **ID matrix** | ED-30…32 · user theme #6 |
| **Kánon / cíl** | Samostatné použití editoru mimo full stream ingest |
| **Implementace** | UI/shell bez ingest ✅; Tauri README vyžaduje `npm start`; AI/export/bank → HTTP; `offline` notices v `app.js` |
| **Důkaz** | `tools/mia-paint-tauri/README.md`; app.js „offline“ |
| **Poslední ověření** | fresh 2026-07-27 |
| **Severity** | ⚠ **STŘEDNÍ** |
| **Návrh** | DECISION: dokumentovat oficiální „Paint needs MIA HTTP“ boundary **nebo** bundlovat embedded static server |

### GAP-I02 — Produkční Tauri build na operator stroji neověřen
| | |
|--|--|
| **ID matrix** | ED-28,33 · theme #6 |
| **Kánon** | `npm run paint:tauri` · Windows Ink |
| **Implementace** | Scaffold + contract detect ✅; Rust env-dependent; installer **nikdy** |
| **Poslední ověření** | scaffold fresh; install **nikdy** |
| **Severity** | ⚠/❓ **STŘEDNÍ** |
| **Návrh** | DECISION: one-time operator install checklist + smoke; nebo oficiálně preferovat `paint:shell` |

### GAP-I03 — Bone / IK / AI Motion = foundation, ne production mocap
| | |
|--|--|
| **ID matrix** | ED-56,57,60 · aspirational |
| **Kánon** | alignment „🟢 foundation“ |
| **Implementace** | `boneRig.js`, `aiMotionCommands`, phase15 contract |
| **Poslední ověření** | fresh code/contract existence |
| **Severity** | ⚠ **STŘEDNÍ** (očekávání vs realita) |
| **Návrh** | DECISION: zmrazit messaging „foundation only“; neprodávat jako full AI motion |

### GAP-I04 — Shared `mia-paint-core` LipSync v live delivery
| | |
|--|--|
| **ID matrix** | ED-12 · theme #1 |
| **Kánon** | Editor ≠ live path; shared lib OK pokud není Paint UI |
| **Implementace** | `MIA_DELIVERY_RUNTIME` require `buildLiveLipTrack*` |
| **Poslední ověření** | fresh 2026-07-27 |
| **Severity** | ⚠ **STŘEDNÍ** (hranice / ownership při refaktoru) |
| **Návrh** | DECISION: přesunout lip helpers do `shared/mia-lip-core` **nebo** explicitně kanonizovat „paint-core = shared graphics lib“ |

### GAP-I05 — Live custom timeline / camera gift resolve na streamu
| | |
|--|--|
| **ID matrix** | ED-55 · theme #2/#4 |
| **Kánon** | Multi-angle bank → gift resolve by shot |
| **Implementace** | phase16 + orchestrator unit; live stream s custom paint export **nikdy** |
| **Poslední ověření** | **nikdy** live |
| **Severity** | ❓ **STŘEDNÍ** |
| **Návrh** | Manuální: promote C3 clip → gift na live → ověřit shot |

### GAP-I06 — Live OBS revive / verify body layers
| | |
|--|--|
| **ID matrix** | ED-39,43 · theme #5 · cross 3D |
| **Kánon** | Preview/revive body + verify layers |
| **Implementace** | Contracts 13c+; live operator session **nikdy** v 3I |
| **Poslední ověření** | **nikdy** |
| **Severity** | ❓ **STŘEDNÍ** (ownership částečně 3D) |
| **Návrh** | Ops checklist `obs:revive` + `obs:verify-stream-ready` — Decision later |

---

## NÍZKÁ

### GAP-I07 — Preflight:fast neobsahuje celý Paint/Studio/animation-engine
| | |
|--|--|
| **ID matrix** | ED-67 |
| **Implementace** | FAST: `mia_paint_integration`, `mia_paint_smoke`, `graphics_body`; full `test:mia-paint` / `test:animation-engine` mimo |
| **Poslední ověření** | fresh FAST list |
| **Severity** | ⚠ **NÍZKÁ** |
| **Návrh** | DECISION: rozšířit FAST o phase15/16 smoke **nebo** ponechat `test:graphics-body` jako gated |

### GAP-I08 — Sound cues timeline coverage thin
| | |
|--|--|
| **ID matrix** | ED-53 · theme #2 |
| **Implementace** | `mia-sound-cues.js` existuje; dedikovaný contract slabý |
| **Poslední ověření** | fresh |
| **Severity** | ⚠ **NÍZKÁ** |
| **Návrh** | DECISION: mini contract na cue attach při exportu |

### GAP-I09 — Live AI assist / Whisper kvalita
| | |
|--|--|
| **ID matrix** | ED-21,59 |
| **Implementace** | Agent + 13v kód; kvalita výstupu **nikdy** |
| **Poslední ověření** | **nikdy** |
| **Severity** | ❓ **NÍZKÁ** (neblokuje RC stream) |
| **Návrh** | Lab eval set — Decision later |

### GAP-I10 — Promote ops musí respektovat production gate
| | |
|--|--|
| **ID matrix** | ED-50 · theme #3 |
| **Implementace** | Gate blokuje procedural; force/confirm existuje — lidský bypass možný |
| **Poslední ověření** | fresh |
| **Severity** | ⚠ **NÍZKÁ** |
| **Návrh** | Checklist „nikdy forceProduction na live“ v ops docs |

---

## INFO

### GAP-I11 — Stream plugin engine (Poker/Monopoly) ≠ Paint plugins
| | |
|--|--|
| **ID matrix** | ED-64 · capability §10 |
| **Poznámka** | Paint plugins (grid, koj-factory) ✅; stream game plugins = design only — **ne** ❌ proti Stream Core editoru |
| **Poslední ověření** | fresh |
| **Severity** | INFO |
| **Návrh** | Neplést v Cross Audit |

### GAP-I12 — Immersive / multi-cam live produkt
| | |
|--|--|
| **ID matrix** | OUT scope · Phase 17–21 |
| **Poznámka** | Cross-link; editor C1–C6 bank IN; immersive scene deep OUT → Etapa 4 |
| **Severity** | INFO |

### GAP-I13 — Paint autosave durability (cross 3G)
| | |
|--|--|
| **ID matrix** | ED-19 · 3G |
| **Poznámka** | `data/mia-paint/autosave` bez bak/quarantine — editor lab data, ne stream state |
| **Severity** | INFO |

---

## Mapování mezer → 6 uživatelských témat

| # | Téma | Gaps |
|---|------|------|
| 1 | Oddělení runtime | GAP-I04 |
| 2 | Export pipeline | GAP-I05, I08, I10 |
| 3 | Assety | GAP-I10, I13 |
| 4 | Overlay vazby | GAP-I05 (consume) |
| 5 | OBS | GAP-I06 |
| 6 | Standalone | GAP-I01, I02 |
| — | Aspirational bone/AI | GAP-I03, I09, I11, I12 |

---

## Souhrn rizik (pro SUMMARY tabulku)

| Severity | Počet | IDs |
|----------|-------|-----|
| VYSOKÁ | **0** | — |
| STŘEDNÍ | **6** | GAP-I01…I06 |
| NÍZKÁ | **4** | GAP-I07…I10 |
| INFO | **3** | GAP-I11…I13 |

**Celkem mezer:** 13 (GAP-I01…I13).
