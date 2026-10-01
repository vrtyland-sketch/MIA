# Etapa 3D — Mezery (jen ⚠ / ❌ / ❓)

Seřazeno dle severity: **VYSOKÁ → STŘEDNÍ → NÍZKÁ → INFO**.

**Pravidlo auditu:** Mezery jsou záznam pro **rozhodnutí později** — ne auto-fix. Trust, bowl 95/100 atd. zůstávají v 3A/3C.

Cross-reference: gift/spam/koj behavior mimo OBS transport → **3A**, **3B**, **3C**.

---

## STŘEDNÍ

### GAP-D01 — Live reconnect po OBS crash / safe mode
| | |
|--|--|
| **ID matrix** | OR-63, OR-27 |
| **Kánon** | Stream musí obnovit WS + playback po pádu OBS |
| **Implementace** | Bootstrap reconnect + watchdog relaunch existují; kombinace safe mode dialog + WS off = operátor musí zavřít OBS ručně |
| **Důkaz** | Unit testy watchdog/bootstrap; **žádný live crash test v tomto běhu** |
| **Severity** | ❓ **STŘEDNÍ** (kód OK, live neověřeno) |
| **Návrh (bez kódu)** | Jednorázový live test: kill obs64 → ověřit watchdog + reconnect do 60 s |

### GAP-D02 — Portrait režim 1080×1920 end-to-end
| | |
|--|--|
| **ID matrix** | OR-33, OR-35 |
| **Kánon** | TikTok na výšku → portrait canvas + přerovnané overlaye |
| **Implementace** | `obs_set_canvas.js` + layout reapply; landscape transforms v hands jsou kalibrované na 1920×1080 |
| **Důkaz** | Kód existuje; R1-C běžel landscape |
| **Severity** | ❓ **STŘEDNÍ** |
| **Návrh** | Manuální portrait session checklist (zrcadlo R1-C) |

### GAP-D03 — `OBS_LIVE_SETUP.md` zastaralý gift bust v tabulce
| | |
|--|--|
| **ID matrix** | OR-65 |
| **Kánon** | Dokumentace = operátorský kánon |
| **Implementace** | Tabulka browser sources uvádí `gift-animation-overlay.html?v=30-lion-wau`; kód/manifest = `37-stream-polish` |
| **Dopad** | Operátor může refreshnout špatný bust po copy-paste z docs |
| **Severity** | ⚠ **STŘEDNÍ** (docs drift) |

### GAP-D04 — Scene guard bez contract testu v preflight:fast
| | |
|--|--|
| **ID matrix** | OR-30 |
| **Kánon** | Varování před „Missing Files“ dialogem |
| **Implementace** | `MIA_OBS_SCENE_GUARD.scanScenes` + bootstrap warn |
| **Důkaz** | Žádný `obs_scene_guard_contract.js` v preflight |
| **Severity** | ⚠ **STŘEDNÍ** (regrese nehlídaná) |

### GAP-D05 — `obs:refresh-overlays` bez automated contract
| | |
|--|--|
| **ID matrix** | OR-22 |
| **Kánon** | Po deploy nutný cache bust |
| **Implementace** | Standalone script vyžaduje live OBS WS |
| **Důkaz** | Logika duplikuje část overlay sync; **žádný unit test** izolace gift v37 |
| **Severity** | ⚠ **STŘEDNÍ** |

### GAP-D06 — Away host režim ne stream-ready
| | |
|--|--|
| **ID matrix** | OR-47 |
| **Kánon** | `SPINAK_NEJSEM_TU`, away loop, host mode |
| **Implementace** | Skripty + manifest existují; Etapa 3 capability hodnotí away jako ❌ nefunguje / stub |
| **Dopad** | NEJSEM TU flow není RC-core; OBS vrstvy ano, chování ne |
| **Severity** | ⚠ **STŘEDNÍ** (feature gap, ne architektura) |

### GAP-D07 — Dual bust runtime URL (v36) vs split libs (v49)
| | |
|--|--|
| **ID matrix** | OR-21 |
| **Kánon** | R1 docs: speech/bowl/manifest v36; Koj split v49 |
| **Implementace** | Záměrně dual-layer; `obs:refresh-overlays` musí obnovit HTML i vnitřní assety |
| **Dopad** | Operátor refreshne jen v36 URL → staré split JS pokud browser cache drží |
| **Severity** | ⚠ **STŘEDNÍ** (UX/deploy nuance; R1-C PASS s v49 uvnitř) |

---

## NÍZKÁ

### GAP-D08 — Browser refresh on overlay/connect default OFF
| | |
|--|--|
| **ID matrix** | OR-53, OR-54 |
| **Implementace** | `browserRefreshOnConnect/Overlay` false — operátor spoléhá na `obs:refresh-overlays` |
| **Severity** | ⚠ **NÍZKÁ** |

### GAP-D09 — Hub legacy stále v manifest URL
| | |
|--|--|
| **ID matrix** | OR-04 |
| **Implementace** | `buildSplitUrls` `.hub`; post-connect stále volá `configureObsMiaLiveHub` |
| **Severity** | ⚠ **NÍZKÁ** (dead code path, docs říkají NE) |

### GAP-D10 — Reverse OBS control default OFF, wiring částečný
| | |
|--|--|
| **ID matrix** | OR-66 |
| **Severity** | ⚠ **NÍZKÁ** |

### GAP-D11 — `obs_fix_overlay_layout` mimo preflight:fast
| | |
|--|--|
| **ID matrix** | OR-31 |
| **Implementace** | Contract existuje (`obs_fix_overlay_layout_contract.js`), není v fast suite |
| **Severity** | ⚠ **NÍZKÁ** |

### GAP-D12 — Startup check overlay timing
| | |
|--|--|
| **ID matrix** | OR-69 |
| **Implementace** | ~60 s slide; chybí contract na auto-hide po connect |
| **Severity** | ⚠ **NÍZKÁ** |

---

## NEOVĚŘENO (❓)

### GAP-D13 — Audio echo / dual path live (R1-C krok 9)
| | |
|--|--|
| **ID matrix** | OR-62, GR-O08 |
| **Historický důkaz** | R1-C PASS 2026-07-26 |
| **Tento běh** | ❓ bez live OBS |
| **Severity** | ❓ **INFO pro audit** |

### GAP-D14 — Fresh OBS scéna bez existujících sources
| | |
|--|--|
| **ID matrix** | OR-64 |
| **Implementace** | Hands create-if-missing v unit testech |
| **Severity** | ❓ |

### GAP-D15 — VB-Cable / TikTok mic wiring
| | |
|--|--|
| **Kánon** | `OBS_LIVE_SETUP.md` §4 |
| **Implementace** | `obs:ensure-voice`, `obs:prepare-tiktok` |
| **Severity** | ❓ live hardware |

---

## INFO — mimo scope auto-fix

| Gap | Odkaz |
|-----|-------|
| Bowl 95/100 T4 trigger | 3C GAP-C01 — **decision later** |
| Trust field | 3C GAP-C02 |
| Spam T4 shadow cap | 3A GAP-01, 3B GAP-B01 |
| Gift rotace cross-tier test | 3A GAP-02 |

---

## Souhrn severity

| Severity | Počet |
|----------|-------|
| VYSOKÁ | 0 |
| STŘEDNÍ | 7 |
| NÍZKÁ | 5 |
| ❓ INFO | 3 |

**Žádný tvrdý rozpor (❌)** proti OBS render-only architektuře nebyl nalezen.
