# Master Canon 0064 — soulad s projektem

Audit [`0064-health-manager.md`](./0064-health-manager.md) vůči stavu `C:\MIA` k 2026-07-17.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-health-core/healthManager.js`

---

## §1–§11 Registry, score a události

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Health Manager | ✅ | `singleton` / `soleHealthAuthority` |
| Health ≠ State | ✅ | oddělený descriptor a registry |
| Pět úrovní + score 0–100 | ✅ | `HM_HEALTH`, `scoreToHealth` |
| Konfigurovatelné hranice/intervaly | ✅ |
| Rozšiřitelná Health Rules | ✅ `evaluateRules` |
| HealthChanged → Event Bus | ✅ |

---

## §12–§17 Reporty a diagnostika

| Oblast | Stav |
|--------|------|
| Health Report + archiv | ✅ `createReport` |
| Trend Analysis | ✅ `trend` |
| Recovery diagnostický feed | ✅ `recoveryFeed` |
| Watchdog hlavní zdroj | ✅ `watchdogFeed` |
| Žádný restart/oprava | ✅ `diagnosticOnly` |
| Autorizovaný measurement write | ✅ |
| Live wiring do `index.js` / `server.js` | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0063](./0063-lifecycle-manager.md) | Lifecycle Manager |
| **0064** Health Manager | 🟢 kanon + kotva + contract |
| **0065** Recovery Manager | 🟢 kanon + kotva + contract |
| **0066** (plánováno) | Watchdog Engine |
