# Etapa 3 — TTS + Overlay + OBS

**Datum:** 2026-07-27  
**Oblast:** TTS, speech overlay, OBS sync, browser sources, overlay public API

---

## 1. Edge TTS (MIA primary voice)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Edge TTS (`edge-tts-universal`); MIA voice `cs-CZ-VlastaNeural`; filesystem cache; fallback OpenAI pokud key |
| **Co neumí** | Offline bez network pro edge provider |
| **Vstup** | Text + speaker z voice plan |
| **Výstup** | `{ audioUrl, durationMs, speaker }` |
| **Testy** | `tts_engine_ctx`, `voice_timing`, `voice_timing_ctx`, `runtime_smoke` |
| **NEOVĚŘENO** | Edge TTS outage fallback v live streamu |

---

## 2. Single voice (default)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Jeden MIA TTS stream; Koj text bez companion audio když dual OFF |
| **Co neumí** | — |
| **Vstup** | `MIA_DUAL_VOICE` unset nebo `0` |
| **Výstup** | MIA-only audio + lip sync |
| **Testy** | `speaker_routing`, `runtime_smoke` (dual OFF branch) |
| **NEOVĚŘENO** | — |

---

## 3. Dual voice (Koj companion)

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Co umí** | Druhý TTS `cs-CZ-AntoninNeural` pro deferred Koj companion; speaker routing |
| **Co neumí** | Default OFF — musí explicitně `MIA_DUAL_VOICE=1` |
| **Vstup** | Dual voice flag + actionResult s Koj speaker |
| **Výstup** | Dva audio tracky v pořadí (queue) |
| **Testy** | `speaker_routing` (dual ON branches), Live DoD |
| **NEOVĚŘENO** | Echo/overlap pod extrémní zátěží (R1-C krok 9 = PASS 2026-07-26 historicky) |

---

## 4. Voice queue / priority / defer

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Speak queue max 6; defer MIA voice po gift video; voice priority layer; holdUntilTs |
| **Co neumí** | Timing křehký při rychlých gift+chat burst (Etapa 2 poznámka) |
| **Vstup** | Voice delivery plan |
| **Výstup** | Serialized playback + overlay text sync |
| **Testy** | `voice_priority_ctx`, `voice_control_layer_ctx`, `speaker_routing` |
| **NEOVĚŘENO** | Live gift+chat overlap session |

---

## 5. Speech hologram + bublina overlay

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `speech-overlay.html` bust `36-koj-unify`; holo + bubble; combo-hype CSS; milestone gesture fix |
| **Co neumí** | — |
| **Vstup** | `/overlay-state` → miaOverlay |
| **Výstup** | OBS browser speech layer |
| **Testy** | `graphics_r1`, `overlay_public_wiring`, `status_overlay_vision_runtime` |
| **NEOVĚŘENO** | R1-C krok 2 — PASS 2026-07-26 |

---

## 6. Gift animation overlay

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Gift overlay bust `37-stream-polish`; idle průhledný; T4 stage; tech sparks |
| **Co neumí** | — |
| **Vstup** | Gift overlay payload |
| **Výstup** | OBS gift browser source |
| **Testy** | `graphics_r1`, `gift_runtime`, `combo_overlay` |
| **NEOVĚŘENO** | R1-C krok 3 — PASS 2026-07-26 |

---

## 7. Viewer strip / avatar chips

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Viewer strip overlay; skrytí avatar chips při milestone speech |
| **Co neumí** | — |
| **Vstup** | Recent viewers snapshot |
| **Výstup** | Strip overlay HTML |
| **Testy** | `host_team_ui`, `graphics_r1` |
| **NEOVĚŘENO** | — |

---

## 8. Public overlay API (miaPoints only)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `stripValueFieldsForPublic` — odstraní coins/gift value ze snapshotu |
| **Co neumí** | Interní admin API může mít více (NEOVĚŘENO spot-check) |
| **Vstup** | Raw overlay state |
| **Výstup** | Sanitized JSON pro browser |
| **Testy** | `overlay_public_response`, `overlay_public_wiring`, `overlay_public_ctx`, `graphics_r1` |
| **NEOVĚŘENO** | Private API spot-check (DoD backlog LOW) |

---

## 9. OBS WebSocket sync

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | obs-websocket-js connect; bootstrap scenes; overlay sync; safe call wrapper |
| **Co neumí** | Vyžaduje běžící OBS s matching password |
| **Vstup** | `OBS_WS_URL`, `OBS_WS_PASSWORD` |
| **Výstup** | Scene/source control, media commands |
| **Testy** | `obs_bootstrap`, `obs_overlay_sync`, `obs_safe_call`, `obs_post_connect_runtime` |
| **NEOVĚŘENO** | OBS reconnect po crash |

---

## 10. Live manifest + refresh overlays

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `MIA_OBS_LIVE_MANIFEST.js`; `npm run obs:refresh-overlays` — cache bust URLs |
| **Co neumí** | — |
| **Vstup** | Manifest + bust constants |
| **Výstup** | Updated OBS browser source URLs |
| **Testy** | `obs_live_manifest`, `obs_overlay_sync_wrappers_ctx` |
| **NEOVĚŘENO** | — |

---

## 11. Browser poll `/overlay-state`

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Poll interval; TTL cache `MIA_OVERLAY_STATE_CACHE_MS=450`; profile bypass pro Engine2 |
| **Co neumí** | — |
| **Vstup** | HTTP GET |
| **Výstup** | JSON snapshot pro všechny overlaye |
| **Testy** | `overlay_state_cache_ctx`, `overlay_state_ctx`, `overlay_timing_ctx` |
| **NEOVĚŘENO** | — |

---

## 12. OBS auto overlay creation (hands)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `MIA_OBS_HANDS` — auto vytvoření browser overlay sources |
| **Co neumí** | — |
| **Vstup** | OBS post-connect hook |
| **Výstup** | Browser sources ve scéně |
| **Testy** | `mia_obs_hands`, `obs_bootstrap` |
| **NEOVĚŘENO** | Fresh OBS scene bez existujících sources |

---

## 13. Away host mode

| Pole | Hodnota |
|------|---------|
| **Stav** | ❌ nefunguje / jen návrh |
| **Co umí** | Stub kód existuje |
| **Co neumí** | Default OFF; slow test mimo fast; ne stream-ready |
| **Vstup** | Away scene config |
| **Výstup** | — |
| **Testy** | `away_host_mode` (slow/full only) |
| **NEOVĚŘENO** | Celý away host flow |

---

## 14. Body parts overlay (MIA_HEAD–FEET)

| Pole | Hodnota |
|------|---------|
| **Stav** | ❌ nefunguje / jen návrh |
| **Co umí** | Kód existuje v audit inventuře |
| **Co neumí** | Záměrně skryté v OBS refresh — ne stream feature |
| **Vstup** | — |
| **Výstup** | — |
| **Testy** | `graphics_body` (studio, ne stream) |
| **NEOVĚŘENO** | — |

---

## 15. OBS overlay control from browser

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Co umí** | `MIA_OVERLAY_OBS_CONTROL_ENABLED` — volitelný reverse control |
| **Co neumí** | Default OFF |
| **Vstup** | Flag ON |
| **Výstup** | Browser → OBS commands |
| **Testy** | Wiring contracts (částečně) |
| **NEOVĚŘENO** | Live reverse control session |

---

## Shrnutí oblasti

| ✅ | ⚠ | ❌ |
|----|----|-----|
| 10 | 2 | 2 |

**Stream-ready:** TTS + hlavní overlaye + OBS sync = RC core. Dual voice a OBS control = volitelné.

*Etapa 3 — docs only.*
