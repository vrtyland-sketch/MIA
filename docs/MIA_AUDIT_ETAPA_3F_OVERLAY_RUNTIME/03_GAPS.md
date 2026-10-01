# Etapa 3F — Mezery (Overlay Runtime)

Seřazeno dle severity: **VYSOKÁ → STŘEDNÍ → NÍZKÁ → INFO**.  
Mezery = záznam pro **DECISION later** — ne auto-fix.

**Poslední ověření:** rozlišuje fresh review (2026-07-27) vs historický live vs nikdy.

---

## STŘEDNÍ

### GAP-F01 — Live speech/gift/combo vizuál bez fresh session
| | |
|--|--|
| **ID matrix** | OV-55, OV-58, OV-29…OV-38 (live) |
| **Kánon** | Speech 36 / Gift 37 / Combo HUD fungují ve stream scéně |
| **Implementace** | HTML + poll + contracts OK |
| **Důkaz** | **R1-C kroky 2/3/7 PASS 2026-07-26 (historický)** |
| **Poslední ověření** | hist. 2026-07-26 · fresh live **nikdy** (tento běh) |
| **Severity** | ❓ **STŘEDNÍ** |
| **Návrh** | Jednorázový live: chat → speech bubble; gift → anim 37; spam wave HUD |

### GAP-F02 — `flushOverlayQueue` mimo preflight:fast
| | |
|--|--|
| **ID matrix** | OV-23, GR-O07 · cross 3E GAP-E03 |
| **Kánon** | Fronta při voice lock → flush po TTS |
| **Implementace** | `flushOverlayQueue` + `overlay_voice_queue_integration_smoke.js` |
| **Důkaz** | Smoke existuje; **není** v `run_preflight_tests.js --fast` |
| **Poslední ověření** | fresh code 2026-07-27 |
| **Severity** | ⚠ **STŘEDNÍ** (regrese nehlídaná ve fast) |
| **Návrh** | DECISION: přidat smoke do fast **nebo** ponechat full-only |

### GAP-F03 — `overlay_layout_contract` mimo preflight:fast
| | |
|--|--|
| **ID matrix** | OV-29…OV-39, GR-O04 |
| **Kánon** | Priority pick + pin break + z-index |
| **Implementace** | `tests/overlay_layout_contract.js` — static HTML assert |
| **Důkaz** | Soubor existuje; **není** ve fast listu |
| **Poslední ověření** | fresh 2026-07-27 (soubor review; suite neběžela v tomto auditu) |
| **Severity** | ⚠ **STŘEDNÍ** |
| **Návrh** | Zařadit do preflight:fast — DECISION later |

### GAP-F04 — Gift+chat burst overlay timing
| | |
|--|--|
| **ID matrix** | OV-26 · cross 3E GAP-E02 |
| **Kánon** | Serializace bez chaos overlapping bublin |
| **Implementace** | queue + pin + voice-first |
| **Důkaz** | Unit OK; live burst chybí |
| **Poslední ověření** | **nikdy** |
| **Severity** | ❓ **STŘEDNÍ** |
| **Návrh** | Live script: rapid chat + T2/T3 → spočítat overlapping bubbles |

### GAP-F05 — Away / NEJSEM TU host behavior stub
| | |
|--|--|
| **ID matrix** | OV-68 · cross 3D GAP-D06 |
| **Kánon** | Host panel + away scéna |
| **Implementace** | Overlay panel + ninja URL ✅; away runtime stub / slow test |
| **Poslední ověření** | fresh panel contract 2026-07-27; live away **nikdy** stream-ready |
| **Severity** | ⚠ **STŘEDNÍ** (presentation OK, full flow ne) |
| **Návrh** | DECISION later — neblokuje běžný LIVE overlay |

### GAP-F06 — Portrait / hard zones end-to-end
| | |
|--|--|
| **ID matrix** | OV-71, OV-39 · cross 3D GAP-D02 |
| **Kánon** | Safe zones portrait 1080×1920 |
| **Implementace** | `tiktok-viewer-zones.css` + speech media query |
| **Důkaz** | CSS ✅; R1-C landscape; portrait live chybí |
| **Poslední ověření** | fresh CSS 2026-07-27; live portrait **nikdy** |
| **Severity** | ❓ **STŘEDNÍ** |
| **Návrh** | Live portrait OBS browser check |

---

## NÍZKÁ

### GAP-F07 — Shared `MiaOverlayPoll` ne ve všech HTML
| | |
|--|--|
| **ID matrix** | OV-18 |
| **Kánon** | Jednotný poll scheduler (aspirace) |
| **Implementace** | `lib/overlay-poll.js` — Koj runtime; speech/combo často vlastní fetch loop |
| **Poslední ověření** | fresh 2026-07-27 |
| **Severity** | ⚠ **NÍZKÁ** (funguje; ne unifikováno) |
| **Návrh** | Refactor later — neblokuje |

### GAP-F08 — Intent v overlay meta — tenký contract
| | |
|--|--|
| **ID matrix** | OV-51 |
| **Kánon** | Stejný intent v overlayPayload.meta |
| **Implementace** | `responseContract.intent`; meta často achievement/overlay_mode |
| **Poslední ověření** | fresh 2026-07-27 |
| **Severity** | ⚠ **NÍZKÁ** |
| **Návrh** | Dedikovaný contract „intent round-trip speech↔overlay“ — DECISION |

### GAP-F09 — Admin / private API coin spot-check
| | |
|--|--|
| **ID matrix** | OV-09 |
| **Kánon** | Public strip tvrdý; admin smí víc |
| **Implementace** | Public factory ✅ |
| **Poslední ověření** | **nikdy** (tento běh) |
| **Severity** | ❓ **NÍZKÁ** (DoD backlog) |
| **Návrh** | Spot-check admin JSON vs public — dokumentovat boundary |

### GAP-F10 — Viewer strip hide při milestone — live
| | |
|--|--|
| **ID matrix** | OV-47 |
| **Kánon** | Capability: skrytí avatar chips při milestone speech |
| **Implementace** | viewer-strip čte voicePlayback |
| **Poslední ověření** | fresh code; live **nikdy** / hist. unclear |
| **Severity** | ⚠ **NÍZKÁ** |
| **Návrh** | Live: milestone speech → strip chips off |

### GAP-F11 — Audio grace window timing
| | |
|--|--|
| **ID matrix** | OV-43 |
| **Kánon** | Bubble sync s audio (grace) |
| **Implementace** | 12–20 s grace po holdUntil |
| **Poslední ověření** | fresh code; live **nikdy** |
| **Severity** | ⚠ **NÍZKÁ** |
| **Návrh** | Ops note — DECISION pokud bubble „visí“ |

### GAP-F12 — Dual bust nuance (HTML vs OBS manifest)
| | |
|--|--|
| **ID matrix** | OV-55 · cross 3D GAP-D07 / D03 |
| **Kánon** | Cache bust entrypoints |
| **Implementace** | Speech 36 / Gift 37 / Koj 49 — záměrně multi-bust |
| **Poslední ověření** | fresh HTML 2026-07-27; ownership → 3D |
| **Severity** | ⚠ **NÍZKÁ** (docs/ops, ne HTML bug) |
| **Návrh** | Operátor: `obs:refresh-overlays` — viz 3D |

### GAP-F13 — T0 / boss cinematic deep choreography
| | |
|--|--|
| **ID matrix** | OV-61 |
| **Kánon** | T0 flyby / T4+ cinematic entrypoints |
| **Implementace** | HTML existuje; deep trigger → 3A/3H |
| **Poslední ověření** | fresh entrypoints 2026-07-27 |
| **Severity** | ⚠ **NÍZKÁ** (scope boundary) |
| **Návrh** | Hlubší audit v 3A revisit / 3H |

### GAP-F14 — Engine2 profiles mimo produkční stream
| | |
|--|--|
| **ID matrix** | OV-72 |
| **Kánon** | Profiles stub OFF |
| **Implementace** | Default OFF ✅ |
| **Poslední ověření** | fresh 2026-07-27 |
| **Severity** | ℹ **INFO** |
| **Návrh** | Žádná akce; zapnout jen s vědomým stub |

### GAP-F15 — Persistence overlay snapshot
| | |
|--|--|
| **ID matrix** | (out of scope) |
| **Kánon** | Deep persist → 3G |
| **Implementace** | In-memory overlay state |
| **Poslední ověření** | n/a |
| **Severity** | ℹ **INFO** |
| **Návrh** | Etapa **3G Persistence & Recovery** |

---

## Poslední ověření (GAP highlight)

| GAP | Poslední ověření |
|-----|------------------|
| GAP-F01 live speech/gift/combo | hist. R1-C **2026-07-26** |
| GAP-F02 flush mimo fast | fresh code 2026-07-27 |
| GAP-F03 layout mimo fast | fresh file 2026-07-27 |
| GAP-F04 burst | **nikdy** |
| GAP-F05 away stub | panel fresh; away live nikdy |
| GAP-F06 portrait | CSS fresh; live **nikdy** |
| GAP-F09 admin spot-check | **nikdy** |

> Historický PASS **nepovažovat** za fresh live ověření z 2026-07-27.

---

## Počty mezer

| Severity | Počet |
|----------|-------|
| VYSOKÁ | 0 |
| STŘEDNÍ | 6 |
| NÍZKÁ | 7 |
| INFO | 2 |
| **Celkem** | **15** |
