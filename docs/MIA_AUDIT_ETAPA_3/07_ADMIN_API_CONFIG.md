# Etapa 3 — Admin + API + Konfigurace

**Datum:** 2026-07-27  
**Oblast:** administrace, HTTP API, runtime config, feature flags

---

## 1. `/mia-admin` dashboard

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Operátorský dashboard; status snapshot; spam hype row; fáze 4 boundary |
| **Co neumí** | — |
| **Vstup** | Browser `/mia-admin` |
| **Výstup** | HTML dashboard + embedded status |
| **Testy** | `phase4_product_boundary`, `status_snapshot`, `host_team_ui` |
| **NEOVĚŘENO** | — |

---

## 2. Admin test inject (T1–T4, bowl, battle)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Simulate gift tiers, bowl fill, battle start z admin API |
| **Co neumí** | Vyžaduje běžící server |
| **Vstup** | Admin POST routes |
| **Výstup** | Pipeline trigger jako live event |
| **Testy** | Admin routes v `routes/admin.js`; arena/koj routes |
| **NEOVĚŘENO** | — |

---

## 3. Action Queue admin toggle

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | ON/OFF/Flush z admin; persist `data/mia-action-queue.json` |
| **Co neumí** | Default OFF — stream běží bez AQ |
| **Vstup** | Admin toggle |
| **Výstup** | Queue state + advisory/full routing |
| **Testy** | `phase1_action_queue` |
| **NEOVĚŘENO** | AQ soak v produkci (DoD ~94% — historicky green) |

---

## 4. Storyboard admin

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Storyboard config CRUD; phase2 admin paths |
| **Co neumí** | — |
| **Vstup** | Admin API |
| **Výstup** | Story config pro gift moments |
| **Testy** | `phase2_admin_storyboard` |
| **NEOVĚŘENO** | — |

---

## 5. Health / diagnose / status API

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `GET /health` (kickBridge, obs, runtime); `/diagnose`; status snapshot |
| **Co neumí** | `telegramBridge` jen na `/diagnose`, ne `/health` |
| **Vstup** | HTTP GET |
| **Výstup** | JSON health payload |
| **Testy** | `health_runtime`, `health_ctx`, `status_snapshot` |
| **NEOVĚŘENO** | Live `/health.kickBridge.connected` v tomto běhu |

---

## 6. Koj admin API

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Snapshot, wake, test-mode, showcase routes |
| **Co neumí** | — |
| **Vstup** | `routes/koj.js` |
| **Výstup** | Koj state control |
| **Testy** | `koj_public_snapshot`, `showcase_runtime`, `showcase_command_runtime` |
| **NEOVĚŘENO** | — |

---

## 7. Arena / duel API

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Battle MVP routes; duel start/sync/export |
| **Co neumí** | Cross-stream vyžaduje peer |
| **Vstup** | `routes/arena.js` |
| **Výstup** | Arena/duel state |
| **Testy** | `arena_battle_demo_ctx`, `phase3_game_layer` |
| **NEOVĚŘENO** | — |

---

## 8. Ingest / overlay public API

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `POST /ingest`; `GET /overlay-state`; care commands; ping-overlay |
| **Co neumí** | `MIA_PUBLIC_CHAT_WRITE_ENABLED` default OFF |
| **Vstup** | HTTP |
| **Výstup** | Pipeline / sanitized snapshot |
| **Testy** | `ingest_http_wiring`, `overlay_public_wiring`, `care_commands_wiring` |
| **NEOVĚŘENO** | — |

---

## 9. Runtime config (`MIA_CONFIG.js` + `runtime.json`)

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | `buildRuntimeConfig()` — env + JSON merge; phase1–4 flags |
| **Co neumí** | 673+ řádků — ne vše auditováno |
| **Vstup** | `.env`, `config/runtime.json` |
| **Výstup** | `runtimeConfig` object |
| **Testy** | `config_contract`, `env_wiring` |
| **NEOVĚŘENO** | Všechny env kombinace |

---

## 10. Feature flag precedence

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Co umí** | Per-modul precedence (env > runtime.json > disk JSON) |
| **Co neumí** | Tři zdroje (env, MIA_CONFIG, runtime.json) — matoucí pro operátora; Action Queue kill switch `=0` vždy wins |
| **Vstup** | Mixed config sources |
| **Výstup** | Resolved enabled/disabled |
| **Testy** | `phase1_action_queue`, `theme_manager`, `env_wiring` |
| **NEOVĚŘENO** | Kompletní precedence mapa všech flagů |

---

## 11. Debug routes

| Pole | Hodnota |
|------|---------|
| **Stav** | ✅ funguje |
| **Co umí** | Simulate events when `MIA_DEBUG_ROUTES=on` |
| **Co neumí** | Musí být OFF v produkci |
| **Vstup** | Debug HTTP |
| **Výstup** | Full pipeline |
| **Testy** | `debug_routes_runtime`, `debug_routes_ctx`, `sprint_a_security` |
| **NEOVĚŘENO** | — |

---

## 12. Engine2 admin endpoints

| Pole | Hodnota |
|------|---------|
| **Stav** | ⚠ částečně |
| **Co umí** | Admin snapshot/profile když `MIA_ENGINE2_STUB=1` |
| **Co neumí** | Default OFF — 404/undefined when OFF |
| **Vstup** | Admin + flag ON |
| **Výstup** | Engine2 preview snapshot |
| **Testy** | `engine2_e3`, `engine2_e4`, `engine2_e5` |
| **NEOVĚŘENO** | — |

---

## Shrnutí oblasti

| ✅ | ⚠ | ❌ |
|----|----|-----|
| 9 | 2 | 0 |

**Stream-ready:** Admin + core API jsou produkční. Flag precedence = operátorský dluh.

*Etapa 3 — docs only.*
