# Etapa 3E — Pokrytí testy (Voice / TTS)

Mapování Voice/TTS pravidel na existující contract/smoke testy.  
Preflight profil: `npm run test:preflight:fast` (`scripts/run_preflight_tests.js --fast`).

**Datum:** 2026-07-27

---

## Legenda pokrytí

| Symbol | Význam |
|--------|--------|
| 🟢 | Contract v preflight:fast |
| 🟡 | Test existuje, mimo fast preflight nebo partial |
| 🔴 | Pravidlo bez dedikovaného contractu |
| ❓ | Manuální / live-only (R1-C historický) |

---

## Voice / TTS suites v preflight:fast

| Suite | Soubor | Oblast |
|-------|--------|--------|
| `speaker_routing` | `tests/speaker_routing_contract.js` | Dual OFF/ON, music gift, defer overlay |
| `delivery_runtime` | `tests/delivery_runtime_contract.js` | Delivery path wiring |
| `voice_timing` | `tests/voice_timing_contract.js` | holdUntilTs |
| `voice_timing_ctx` | `tests/voice_timing_ctx_contract.js` | Ctx wiring |
| `voice_priority_ctx` | `tests/voice_priority_ctx_contract.js` | Priority ctx |
| `tts_engine_ctx` | `tests/tts_engine_ctx_contract.js` | TTS engine host/ctx |
| `voice_control_layer_ctx` | `tests/voice_control_layer_ctx_contract.js` | Voice command ctx |
| `overlay_queue_ctx` | `tests/overlay_queue_ctx_contract.js` | Overlay queue ctx |

**Související (ne čistě voice, ale TTS path):** `runtime_smoke` (deferred koj bez dual), `obs_overlay_sync` (monitor/anti-echo wiring — 3D).

---

## Testy mimo preflight:fast (existují)

| Soubor | Oblast | Pokrytí |
|--------|--------|---------|
| `tests/voice_priority_smoke.js` | Priority lock smoke | 🟡 |
| `tests/voice_control_layer_smoke.js` | Command layer smoke | 🟡 |
| `tests/voice_endpoint_smoke.js` | `/tts` / voice endpoints | 🟡 |
| `tests/tts_overlay_integration_smoke.js` | TTS↔overlay | 🟡 |
| `tests/overlay_voice_queue_integration_smoke.js` | Queue + flush po lock | 🟡 |
| `tests/mia_voice_revive_13f_contract.js` | Revive + anti-echo wiring | 🟡 (graphics/13f path) |
| `tests/delivery_ctx_contract.js` | Delivery ctx | 🟡 |

---

## Guardrails GR-V*

| Pravidlo | Test soubor(y) | Preflight:fast | Pokrytí |
|----------|----------------|----------------|---------|
| GR-V01 Architektura | speaker_routing, delivery | 🟢 | 🟢 |
| GR-V02 Single MIA_VOICE | revive_13f, obs sync | 🟡 | 🟡 + ❓ live |
| GR-V03 Dual OFF | speaker_routing, runtime_smoke | 🟢 | 🟢 |
| GR-V04 Anti-echo | revive_13f | 🟡 | 🟡 + ❓ live |
| GR-V05 Music→bubble | speaker_routing | 🟢 | 🟢 |
| GR-V06 Voice-first hide | speaker_routing | 🟢 | 🟢 |
| GR-V07 Flush po TTS | overlay_voice_queue_integration | 🟡 | 🟡 |
| GR-V08 Queue max 6 | delivery_runtime | 🟢 | 🟢 |

---

## Edge TTS / engine

| Pravidlo | Test | Fast | Pokrytí |
|----------|------|------|---------|
| Ctx/host wiring | `tts_engine_ctx` | 🟢 | 🟢 |
| speak() API shape | `tts_engine_ctx` | 🟢 | 🟢 |
| Edge network synthesize | — | — | 🔴 / ❓ live |
| OpenAI fallback branch | — | — | 🔴 |
| Cache hit path | — | — | 🔴 |
| Prosody MIA vs Koj | — | — | 🔴 |

---

## Speaker routing / dual / music

| Pravidlo | Test | Fast | Pokrytí |
|----------|------|------|---------|
| Dual OFF deferred overlay | speaker_routing, runtime_smoke | 🟢 | 🟢 |
| Dual ON companion | speaker_routing | 🟢 | 🟢 |
| Music gift skip TTS | speaker_routing | 🟢 | 🟢 |
| Duplicate utterance scrub | speaker_routing | 🟢 | 🟢 |
| Spam throttle no TTS | speaker_routing partial | 🟢 | 🟡 |

---

## Queue / priority / timing

| Pravidlo | Test | Fast | Pokrytí |
|----------|------|------|---------|
| holdUntilTs | voice_timing* | 🟢 | 🟢 |
| Priority lock | voice_priority_ctx + smoke | 🟢/🟡 | 🟢 |
| T3/T4 break lock | — | — | 🔴 |
| Flush after voice | overlay_voice_queue_integration | 🟡 | 🟡 |
| Speak queue max drop | delivery_runtime partial | 🟢 | 🟡 |
| Preempt interrupt | — | — | 🔴 |
| Gift+chat burst | — | — | ❓ |

---

## OBS voice delivery / revive

| Pravidlo | Test | Fast | Pokrytí |
|----------|------|------|---------|
| Authority lock HTML | mia_voice_revive_13f | 🟡 | 🟡 |
| Anti-echo wiring | mia_voice_revive_13f | 🟡 | 🟡 |
| ensure-voice E2E | — | — | ❓ |
| VB-Cable path | — | — | ❓ |
| voiceMirror filter | — (HTML assert partial) | — | 🟡 |

---

## Lip sync / AQ

| Pravidlo | Test | Fast | Pokrytí |
|----------|------|------|---------|
| lipTrack wiring | graphics body partial | 🟡 | 🟡 |
| Live lip quality | — | — | ❓ |
| AQ OFF default | docs / flags | — | 🟡 indirect |

---

## Historický manuální důkaz

| Gate | Datum | Co kryje |
|------|-------|----------|
| R1-C krok 9 Audio (oba hlasy) | **2026-07-26** | Live audio path / dual hlasy — **ne** fresh 2026-07-27 |

---

## Navržené chybějící testy (T-E*) — bez implementace

| ID | Návrh | Priorita | Map |
|----|-------|----------|-----|
| T-E01 | Speak queue drop při overflow max 6 (unit) | STŘEDNÍ | VT-37 |
| T-E02 | Flush overlay po voice drain v preflight:fast | STŘEDNÍ | VT-43 |
| T-E03 | T4 support overlay prorazí voice lock | NÍZKÁ | VT-41 |
| T-E04 | OpenAI fallback branch (mock key/provider) | NÍZKÁ | VT-16 |
| T-E05 | voiceMirror rows filtered in speech overlay fixture | NÍZKÁ | VT-06 |
| T-E06 | Preempt clears/skips queue item | NÍZKÁ | VT-45 |
| T-E07 | Edge failure → bubble-only degradace (mock) | STŘEDNÍ | VT-20 |
| T-E08 | Live checklist script: ensure-voice 1× playback (ops) | STŘEDNÍ | VT-07, VT-58 |

---

## Shrnutí pokrytí

| Metrika | Hodnota |
|---------|---------|
| Fast voice-related suites | 8 |
| Extra smoke/contracts mimo fast | 7 |
| Navržené T-E* | 8 |
| Řádky VT s 🟢/🟡 důkazem (odhad) | ~52 / 70 |
| Chybí dedikovaný test (🔴/❓) | ~18 |

*Poznámka: `mia_voice_revive_13f_contract` je silný wiring důkaz, ale není v seznamu `FAST` suites v `run_preflight_tests.js` — zařadit do T-E* rozhodnutí (DECISION later).*
