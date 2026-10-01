# Etapa 3E — Mezery (Voice / TTS)

Seřazeno dle severity: **VYSOKÁ → STŘEDNÍ → NÍZKÁ → INFO**.  
Mezery = záznam pro **DECISION later** — ne auto-fix.

**Poslední ověření:** rozlišuje fresh review (2026-07-27) vs historický live vs nikdy.

---

## STŘEDNÍ

### GAP-E01 — Live anti-echo / single audio path bez fresh session
| | |
|--|--|
| **ID matrix** | VT-07, VT-09, GR-V02, GR-V04 |
| **Kánon** | Jen `MIA_VOICE` unmuted; Desktop Audio mute při Monitor+Output |
| **Implementace** | ensure-voice, revive-voice, anti-echo default ON |
| **Důkaz** | Contract 13f/13g; **R1-C Audio PASS 2026-07-26 (historický)** |
| **Poslední ověření** | hist. 2026-07-26 · fresh live **nikdy** (tento běh) |
| **Severity** | ❓ **STŘEDNÍ** |
| **Návrh** | Jednorázový live: `obs:ensure-voice` → 1× hlas; Desktop mute check; TikFinity muted |

### GAP-E02 — Gift+chat burst timing (voice queue křehkost)
| | |
|--|--|
| **ID matrix** | VT-46 |
| **Kánon** | Serializace + hold window bez chaos overlapping |
| **Implementace** | speak queue max 6 + holdUntilTs |
| **Důkaz** | Etapa 2/3 poznámka; unit OK; live burst chybí |
| **Poslední ověření** | **nikdy** |
| **Severity** | ❓ **STŘEDNÍ** |
| **Návrh** | Live script: rapid chat + T2/T3 gifts → spočítat overlapping TTS |

### GAP-E03 — Flush overlay po TTS mimo preflight:fast
| | |
|--|--|
| **ID matrix** | VT-43, GR-V07 |
| **Kánon** | Fronta při voice lock → flush po TTS |
| **Implementace** | `flushOverlayQueue` v delivery + smoke `overlay_voice_queue_integration_smoke.js` |
| **Důkaz** | Smoke existuje; **není** v `run_preflight_tests.js --fast` |
| **Poslední ověření** | fresh code 2026-07-27 |
| **Severity** | ⚠ **STŘEDNÍ** (regrese nehlídaná ve fast) |

### GAP-E04 — Edge TTS outage / offline fallback
| | |
|--|--|
| **ID matrix** | VT-20 |
| **Kánon** | Capability: Edge potřebuje network; OpenAI jen s key |
| **Implementace** | Žádný garantovaný offline TTS |
| **Poslední ověření** | **nikdy** |
| **Severity** | ❓ **STŘEDNÍ** (ops resilience) |
| **Návrh** | Documentovaný degradace path (bubble-only) — DECISION later |

### GAP-E05 — Dual voice OFF chybí v `mia-guardrails.mdc`
| | |
|--|--|
| **ID matrix** | VT-21, GR-V03 |
| **Kánon provozní** | Prestream DoD + `MIA_DUAL_VOICE.js` + capability |
| **Implementace** | Default OFF ✅ v kódu |
| **Drift** | Workspace guardrails file neuvádí dual voice bullet |
| **Poslední ověření** | fresh 2026-07-27 |
| **Severity** | ⚠ **STŘEDNÍ** (docs/guardrails drift, ne runtime bug) |

### GAP-E06 — Master canon Speech Engine vs stream subset
| | |
|--|--|
| **ID matrix** | VT-66…VT-69 |
| **Kánon** | Emotion adapter, Voice Effects, full interrupt, Analytics |
| **Implementace** | Stream = Edge + queue + prosody env; ne plný 0035 |
| **Poslední ověření** | fresh 2026-07-27 |
| **Severity** | ⚠ **STŘEDNÍ** (aspirace vs RC) — neblokuje stream-ready |

### GAP-E07 — `obs:ensure-voice` / VB-Cable bez automated testu
| | |
|--|--|
| **ID matrix** | VT-58 · cross 3D GAP-D15 |
| **Kánon** | VB-Cable → TikTok mic |
| **Implementace** | skripty + routes; vyžaduje live OBS + hardware |
| **Poslední ověření** | hist. ops / R1-C; fresh **nikdy** |
| **Severity** | ❓ **STŘEDNÍ** |

---

## NÍZKÁ

### GAP-E08 — Duration estimate / lip sync aproximace
| | |
|--|--|
| **ID matrix** | VT-19, VT-62 |
| **Implementace** | `estimateDurationMs` + amplitude lip |
| **Poslední ověření** | fresh code 2026-07-27; live lip quality **nikdy** |
| **Severity** | ⚠ **NÍZKÁ** |

### GAP-E09 — T3/T4 voice lock break — partial test
| | |
|--|--|
| **ID matrix** | VT-41 |
| **Implementace** | `shouldBlockOverlay` high tier |
| **Poslední ověření** | fresh 2026-07-27 |
| **Severity** | ⚠ **NÍZKÁ** |
| **Návrh** | T-E* contract: T4 overlay prorazí aktivní voice lock |

### GAP-E10 — Preempt / Soft-Hard interrupt neúplný vs master
| | |
|--|--|
| **ID matrix** | VT-45, VT-68 |
| **Poslední ověření** | fresh 2026-07-27 |
| **Severity** | ⚠ **NÍZKÁ** |

### GAP-E11 — Speech pin vs TTS win → Overlay Runtime 3F
| | |
|--|--|
| **ID matrix** | VT-50 |
| **Poslední ověření** | fresh 2026-07-27 |
| **Severity** | ⚠ **NÍZKÁ** (scope 3F) |

### GAP-E12 — Response contract speech_text deep audit mimo 3E
| | |
|--|--|
| **ID matrix** | VT-36 |
| **Poslední ověření** | fresh 2026-07-27 |
| **Severity** | ⚠ **NÍZKÁ** |

### GAP-E13 — Revive / endpoint smoke mimo fast preflight
| | |
|--|--|
| **Testy** | `voice_endpoint_smoke`, `voice_priority_smoke`, `tts_overlay_integration_smoke`, `mia_voice_revive_13f` (13f je v graphics path?) |
| **Poslední ověření** | fresh 2026-07-27 |
| **Severity** | ⚠ **NÍZKÁ** |

---

## NEOVĚŘENO (❓ INFO)

### GAP-E14 — Dual voice ON pod zátěží (echo/overlap)
| | |
|--|--|
| **Historický** | R1-C krok 9 „Audio (oba hlasy)“ PASS **2026-07-26** |
| **Tento běh** | ❓ bez live; dual default OFF na produkci |
| **Poslední ověření** | hist. 2026-07-26 · fresh **nikdy** |
| **Severity** | ❓ INFO |

### GAP-E15 — Persistence voicePlayback state
| | |
|--|--|
| **Poznámka** | holdUntilTs in-memory; hlubší persist → **3G** |
| **Poslední ověření** | n/a → 3G |
| **Severity** | ❓ INFO (out of scope) |

---

## INFO — mimo scope auto-fix

| Gap | Odkaz |
|-----|-------|
| Gift tier / spam cap | 3A |
| Koj CARE / bowl 95/100 | 3C |
| OBS bootstrap / manifest | 3D |
| Overlay layout / pickActiveOverlay full | → 3F |
| Voice state persistence | → 3G |

---

## Souhrn severity + Poslední ověření (ops)

| Oblast | Stav | Poslední ověření |
|--------|------|------------------|
| Single `MIA_VOICE` / no duplex | ❓ | hist. R1-C 2026-07-26 |
| Anti-echo Desktop mute | ❓ | hist. R1-C 2026-07-26 |
| Dual voice OFF default | ✅ | fresh contract 2026-07-27 |
| Music gift → bubble, TTS off | ✅ | fresh contract 2026-07-27 |
| Voice queue / holdUntilTs | ✅ | fresh contract 2026-07-27 |
| Flush overlay po TTS | ⚠ | smoke 2026-07-27 (ne fast) |
| Edge outage fallback | ❓ | nikdy |
| Gift+chat burst | ❓ | nikdy |
| VB-Cable / ensure-voice live | ❓ | nikdy (tento běh) |
| Lip sync visual quality | ❓ | nikdy fresh |
| Dual ON under load | ❓ | hist. R1-C 2026-07-26 |

---

## Souhrn severity

| Severity | Počet |
|----------|-------|
| VYSOKÁ | 0 |
| STŘEDNÍ | 7 |
| NÍZKÁ | 6 |
| ❓ INFO | 2 |

**Žádný tvrdý rozpor (❌)** proti Voice/TTS kánonu nebyl nalezen.
