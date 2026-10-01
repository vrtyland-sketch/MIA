# Master Canon 0072 — soulad s projektem

Audit [`0072-metrics-manager.md`](./0072-metrics-manager.md) vůči stavu `C:\MIA` k 2026-07-18.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-metrics-core/metricsManager.js`

---

## §1–§10 Sběr, typy a časové řady

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Metrics Manager | ✅ | `singleton` / `soleMetricsAuthority` |
| Neukládá logy / nediagnostikuje | ✅ | `storesLogs: false` / `runsDiagnostics: false` |
| Descriptor 8 polí | ✅ | `createMetricDescriptor` |
| Kategorie (10+) | ✅ | `MM_CATEGORY` |
| Counter / Gauge / Histogram / Timer | ✅ | `MM_TYPE` |
| Jednotné Metrics API | ✅ | `record` / `inc` / `set` / `observe` / `timing` |
| Agregace min/max/avg/median/pXX/sum | ✅ | `aggregate` |
| Time Series | ✅ | `getSeries` |

---

## §11–§18 Integrace a bezpečnost

| Oblast | Stav |
|--------|------|
| Monitoring read feed | ✅ `forMonitoring` |
| Diagnostics read feed | ✅ `forDiagnostics` |
| AI read-only | ✅ `forAi` |
| Thresholds + alerts | ✅ `setThreshold` / `evaluateThresholds` |
| Report + export | ✅ |
| Historie immutable | ✅ |
| Live external metrics storage | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0071](./0071-logging-manager.md) | Logging Manager |
| **0072** Metrics Manager | 🟢 kanon + kotva + contract |
| **0073** Alert Manager | 🟢 kanon + kotva + contract |
| **0074** Audit Manager | 🟢 kanon + kotva + contract |
| **0075** Event Store Manager | 🟢 kanon + kotva + contract |
| **0076** (plánováno) | Telemetry Manager |
