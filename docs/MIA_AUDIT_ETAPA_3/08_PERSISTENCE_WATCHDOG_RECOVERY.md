# Etapa 3 — Persistence + Watchdog + Recovery

**Datum:** 2026-07-27  
**Oblast:** persist dat, watchdog, replay, recovery

**Pravidlo:** `data/*.json` = live stav, **necommitovat**.

---

## 1. Koj state persist

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `MIA_KOJNOZROUT_PERSISTENCE.js` → `data/kojnozout-state.json`; seed při boot |
| **Co neumí** | Corrupt file handling NEOVĚŘENO |
| **Vstup** | Koj state mutations |
| **Výstup** | Disk JSON |
| **Testy** | Runtime state wiring, `phase1_runtime_state` |
| **NEOVĚŘENO** | Recovery po corrupt JSON |

---

## 2. Koj world persist

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `MIA_KOJNOZROUT_WORLD_PERSISTENCE.js` → `data/kojnozout-world.json`; duel state |
| **Co neumí** | — |
| **Vstup** | World/duel mutations |
| **Výstup** | World JSON |
| **Testy** | Arena/duel contracts |
| **NEOVĚŘENO** | — |

---

## 3. Runtime state persist (phase1)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `core/runtime-state.js` → `data/runtime-state.json`; KOJ critical fields sync |
| **Co neumí** | — |
| **Vstup** | Pipeline runtime mutations |
| **Výstup** | Persisted runtime snapshot |
| **Testy** | `phase1_runtime_state`, `runtime_state_runtime`, `runtime_state_ctx` |
| **NEOVĚŘENO** | — |

---

## 4. Viewer memory persist

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `data/viewer-memory.json`; levels, gift history |
| **Co neumí** | — |
| **Vstup** | Viewer events |
| **Výstup** | Viewer memory JSON |
| **Testy** | `phase2_viewer_memory` |
| **NEOVĚŘENO** | — |

---

## 5. Viewer inventory persist

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Co umí** | `data/viewer-inventory.json`; grant z enrich |
| **Co neumí** | Untracked live data; hloubka item systému omezená |
| **Vstup** | Item grant events |
| **Výstup** | Inventory JSON |
| **Testy** | `phase3_game_layer` |
| **NEOVĚŘENO** | — |

---

## 6. Platform arena persist

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `data/platform-arena.json`; activity rows |
| **Co neumí** | — |
| **Vstup** | Arena activity |
| **Výstup** | Arena JSON |
| **Testy** | `phase3_game_layer`, `arena_battle_demo_ctx` |
| **NEOVĚŘENO** | — |

---

## 7. Action queue persist

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `data/mia-action-queue.json`; enabled flag + queue items |
| **Co neumí** | Default OFF — soubor optional |
| **Vstup** | Admin toggle / enqueue |
| **Výstup** | Queue JSON |
| **Testy** | `phase1_action_queue` |
| **NEOVĚŘENO** | — |

---

## 8. Theme persist

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Co umí** | `data/mia-theme.json`; themeId |
| **Co neumí** | Theme manager default OFF |
| **Vstup** | Admin theme select |
| **Výstup** | Theme JSON + CSS vars v overlay |
| **Testy** | `theme_manager` |
| **NEOVĚŘENO** | — |

---

## 9. Session / story / gift-map persist

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `mia-session-memory.json`, `story-memory.json`, `gift-map-stats.json`, `mia-chat-lexicon.json` |
| **Co neumí** | Cesty částečně NEOVĚŘENO v Etapa 2 |
| **Vstup** | Runtime mutations |
| **Výstup** | Various data/*.json |
| **Testy** | Story/gift contracts |
| **NEOVĚŘENO** | Kompletní persist map |

---

## 10. Stream ingest watchdog

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `core/stream-watchdog.js`; stale ingest detection; reconnect cooldown; `MIA_STREAM_WATCHDOG` default ON |
| **Co neumí** | — |
| **Vstup** | Ingest timestamps |
| **Výstup** | Watchdog alerts / recovery hooks |
| **Testy** | `phase1_stream_watchdog` |
| **NEOVĚŘENO** | Live stale ingest recovery v OBS session |

---

## 11. OBS watchdog

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `MIA_OBS_WATCHDOG.js`; OBS connection health; ctx/host wiring |
| **Co neumí** | — |
| **Vstup** | OBS WS state |
| **Výstup** | Reconnect / alert |
| **Testy** | `obs_watchdog_ctx`, `obs_post_connect_runtime` |
| **NEOVĚŘENO** | OBS crash → auto recovery live |

---

## 12. Event replay

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `scripts/mia_replay.js`; `npm run replay`; re-process saved events |
| **Co neumí** | Replay ≠ live ingest auth |
| **Vstup** | Event log file |
| **Výstup** | Re-run pipeline |
| **Testy** | `phase1_replay` |
| **NEOVĚŘENO** | — |

---

## 13. Safe mode / fault / recovery manager

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Co umí** | `shared/mia-recovery-core/recoveryManager.js` (1518 ř.) — untracked canon module |
| **Co neumí** | Live wiring do stream path NEOVĚŘENO; `safeRequire` může být no-op |
| **Vstup** | Fault events |
| **Výstup** | Recovery actions |
| **Testy** | Master canon contracts (mimo fast) |
| **NEOVĚŘENO** | Produkční safe mode trigger |

---

## 14. In-memory overlay state

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `overlayState`, `outputState`, `voicePlaybackState` — reset při restartu |
| **Co neumí** | Nepersistuje — restart = fresh overlay (Koj seed z disk) |
| **Vstup** | Pipeline delivery |
| **Výstup** | HTTP `/overlay-state` |
| **Testy** | `overlay_state_ctx`, `overlay_state_cache_ctx` |
| **NEOVĚŘENO** | — |

---

## Shrnutí oblasti

| ✅ | ⚠ | ❌ |
|----|----|-----|
| 10 | 3 | 0 |

**Stream-ready:** Core persist + watchdog + replay jsou produkční. Recovery canon moduly = lab/untracked.

*Etapa 3 — docs only.*
