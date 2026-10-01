# Etapa 3G — Mezery (Persistence & Recovery)

Seřazeno dle severity: **VYSOKÁ → STŘEDNÍ → NÍZKÁ → INFO**.  
Mezery = záznam pro **DECISION later** — ne auto-fix.

**Poslední ověření:** fresh review (2026-07-27) vs historický live vs nikdy.

---

## VYSOKÁ

### GAP-G01 — Chybí `.bak` / quarantine / last-good rotace state JSON
| | |
|--|--|
| **ID matrix** | PR-59, PR-60, PR-61 · user theme #5 |
| **Kánon / cíl** | Poškozený snapshot nesmí tiše zničit poslední dobrý stav |
| **Implementace** | Soft-fail → `{}` / `null` / emptyStore; **žádný** `.bak`, quarantine, rotate |
| **Důkaz** | Write paths `MIA_KOJNOZROUT_*`, `viewer-memory`, arena, session… |
| **Poslední ověření** | fresh code 2026-07-27 |
| **Severity** | ⚠ **VYSOKÁ** (data-loss path při corrupt + overwrite) |
| **Návrh** | DECISION: před zápisem kopírovat `.bak` / quarantine corrupt; nebo atomic+backup policy |

### GAP-G02 — Multi-file konzistence Koj + runtime-state + economy
| | |
|--|--|
| **ID matrix** | PR-12…14, PR-31, PR-36, PR-63 · user theme #1 |
| **Kánon / cíl** | Související stav (miska/vitals vs runtime snapshot vs viewer-memory) po pádu konzistentní |
| **Implementace** | Oddělené soubory + různé debounce (1.5–2.5 s); compose jen Koj↔runtime; **žádná** transakce napříč economy |
| **Důkaz** | `composeKojSeed` OK pro Koj; economy nezávislá |
| **Poslední ověření** | fresh 2026-07-27; live kill **nikdy** |
| **Severity** | ⚠/❓ **VYSOKÁ** |
| **Návrh** | DECISION: flush-all-on-shutdown + sdílený dirty barrier; nebo single snapshot bundle |

### GAP-G03 — Live crash mid-write / hard kill e2e neověřeno
| | |
|--|--|
| **ID matrix** | PR-63, PR-72 · user theme #2 |
| **Kánon / cíl** | Po pádu aplikace obnovitelný konzistentní stav |
| **Implementace** | Boot hydrate ✅; atomic jen runtime-state; debounce loss window |
| **Důkaz** | Contract seed/compose; **žádný** live kill test |
| **Poslední ověření** | **nikdy** |
| **Severity** | ❓ **VYSOKÁ** |
| **Návrh** | Manuální: kill Node během gift storm → restart → spočítat bowl/miaPoints drift |

---

## STŘEDNÍ

### GAP-G04 — Atomic write jen na části storeů
| | |
|--|--|
| **ID matrix** | PR-09 vs PR-12…14 |
| **Kánon / cíl** | Write-temp-rename na kritických state files |
| **Implementace** | Atomic: runtime-state, settings-bundle, streamer-profiles. Direct write: koj, world, viewer-*, arena, session, theme, AQ, gift-map |
| **Poslední ověření** | fresh 2026-07-27 |
| **Severity** | ⚠ **STŘEDNÍ** |
| **Návrh** | DECISION: sjednotit atomic helper pro všechny `data/*.json` stream storey |

### GAP-G05 — Verze ano, migrace ne
| | |
|--|--|
| **ID matrix** | PR-53…57 · user themes #3–4 |
| **Kánon / cíl** | Schema version + upgrade path |
| **Implementace** | `version: 1` zapisováno; load bez migrátoru; Master 0075 lab only |
| **Poslední ověření** | fresh 2026-07-27 |
| **Severity** | ⚠ **STŘEDNÍ** |
| **Návrh** | DECISION: minimální `migrateStore(raw)` switch per file **nebo** zmrazit schema + dokumentovat breaking |

### GAP-G06 — `rotationIndexByTier` ztráta po restartu
| | |
|--|--|
| **ID matrix** | PR-65 · cross 3A · user theme #6 Gift |
| **Kánon** | Per-tier index bez resetu **mezi tiery**; napříč restartem aspirace Etapa 2 |
| **Implementace** | In-memory only v `MIA_VIDEO_ENGINE` |
| **Poslední ověření** | fresh 2026-07-27 |
| **Severity** | ⚠ **STŘEDNÍ** (UX rotace po restartu skočí na začátek) |
| **Návrh** | DECISION: persist index map do `runtime-state` / dedicated JSON |

### GAP-G07 — Streak / supporter multi-day file (cross 3B)
| | |
|--|--|
| **ID matrix** | PR-42 · 3B GAP-B03 |
| **Kánon** | Streak persistence scope |
| **Implementace** | Runtime supporter profile; viewer-memory nemá streak pole |
| **Poslední ověření** | unit OK; produkční restart **nikdy** |
| **Severity** | ⚠ **STŘEDNÍ** |
| **Návrh** | DECISION later — vlastnictví 3B; 3G jen persistence handoff |

### GAP-G08 — OBS relaunch live (cross 3D)
| | |
|--|--|
| **ID matrix** | PR-67 · 3D GAP-D01 |
| **Kánon** | OBS pád → auto-recovery |
| **Implementace** | `MIA_OBS_WATCHDOG` unit ✅; ctx 🟢 |
| **Poslední ověření** | unit fresh; live **hist./nikdy** |
| **Severity** | ❓ **STŘEDNÍ** (ownership 3D) |
| **Návrh** | Live kill obs64 — neblokuje Stream Core disk persist |

### GAP-G09 — Master Recovery / Watchdog / Safe Mode / Event Store unwired
| | |
|--|--|
| **ID matrix** | PR-57, PR-69…71 · Stream vs Master |
| **Kánon** | Master 0065/66/68/75 ACTIVE vize |
| **Implementace** | `shared/mia-*-core` lab; `index.js` bez require |
| **Poslední ověření** | fresh 2026-07-27 |
| **Severity** | ⚠ **STŘEDNÍ** jako aspirace; **ne** ❌ Stream Core |
| **Návrh** | DECISION: ponechat lab **nebo** staged wire — mimo 3G auto-fix |

---

## NÍZKÁ

### GAP-G10 — `.gitignore` nepokryje `data/*.json`
| | |
|--|--|
| **ID matrix** | PR-01 |
| **Implementace** | Ignoruje jen `data/remote-dev/`, `data/mia-ai-animations/` |
| **Poslední ověření** | fresh 2026-07-27 |
| **Severity** | ⚠ **NÍZKÁ** (riziko commit live state) |
| **Návrh** | DECISION: rozšířit gitignore / dokumentovat výjimky |

### GAP-G11 — `gift-map-stats.json` totalCoins na disku
| | |
|--|--|
| **ID matrix** | PR-06, PR-44 · cross 3A/3B |
| **Implementace** | `shared/gifts/runtime.js` community.totalCoins |
| **Poslední ověření** | fresh 2026-07-27 |
| **Severity** | ⚠ **NÍZKÁ** (public strip OK; disk audit) |
| **Návrh** | DECISION: strip coins i z disk stats **nebo** explicit „dev-only“ |

### GAP-G12 — Walk state nepersist (cross 3C)
| | |
|--|--|
| **ID matrix** | PR-22 · 3C GAP-C10 |
| **Poslední ověření** | fresh 2026-07-27 |
| **Severity** | ⚠ **NÍZKÁ** |
| **Návrh** | DECISION v 3C ownership |

### GAP-G13 — Dedikovaný corrupt-JSON contract chybí
| | |
|--|--|
| **ID matrix** | PR-21, PR-26, PR-38, PR-58 |
| **Implementace** | Soft-fail v kódu; testy nepíší záměrně poškozený soubor |
| **Poslední ověření** | fresh; test **nikdy** |
| **Severity** | ⚠ **NÍZKÁ** |
| **Návrh** | T-G01… — viz `04_TESTS_COVERAGE.md` |

### GAP-G14 — `obs_watchdog` unit mimo preflight:fast
| | |
|--|--|
| **ID matrix** | PR-67 |
| **Implementace** | `tests/obs_watchdog_contract.js` existuje; ve fast jen `obs_watchdog_ctx` |
| **Poslední ověření** | fresh 2026-07-27 |
| **Severity** | ⚠ **NÍZKÁ** |
| **Návrh** | Zařadit unit do fast — DECISION later |

### GAP-G15 — Ops preflight po změně neověřen v tomto auditu
| | |
|--|--|
| **ID matrix** | PR-08 |
| **Poslední ověření** | **nikdy** (tento docs-only běh) |
| **Severity** | ❓ **NÍZKÁ** / INFO |
| **Návrh** | Při implementační změně persist — povinný fast |

---

## INFO

### GAP-G16 — Ephemeral overlay/voice po restartu (by design)
| | |
|--|--|
| **ID matrix** | PR-64 · cross 3E/3F |
| **Poznámka** | Není bug — dokumentovaný reset; Koj seed z disku |
| **Severity** | INFO |
| **Návrh** | Žádná akce, pokud produkt nevyžaduje resume mid-TTS |

### GAP-G17 — AQ položky nepersistují (jen enabled)
| | |
|--|--|
| **ID matrix** | PR-48 |
| **Poznámka** | By design default OFF |
| **Severity** | INFO |

---

## Mapování na 6 uživatelsky kritických témat

| # | Téma | Primární GAP | Verdikt tématu |
|---|------|--------------|----------------|
| 1 | Konzistence uloženého stavu | GAP-G02 | ⚠ kritický drift — compose Koj OK, multi-file economy ne |
| 2 | Obnova po pádu aplikace | GAP-G03, G01 | ❓/⚠ — hydrate funguje; mid-write + bak chybí |
| 3 | Verzování dat | GAP-G05 | ⚠ — `version:1` ano, semver migrace ne |
| 4 | Migrace | GAP-G05, G09 | ⚠ — arena soft-only; Master 0075 lab |
| 5 | Poškozené snapshoty | GAP-G01, G13 | ⚠ — soft-fail ano; bak/quarantine ne |
| 6 | Návaznost Economy/Overlay/Voice/Koj | GAP-G06, G07, G16 | ⚠/INFO — Koj disk ✅; Overlay/Voice ephemeral; Economy částečně |

---

## Počty mezer

| Severity | Počet |
|----------|-------|
| VYSOKÁ | 3 |
| STŘEDNÍ | 6 |
| NÍZKÁ | 6 |
| INFO | 2 |
| **Celkem** | **17** |
