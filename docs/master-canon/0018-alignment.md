# Master Canon 0018 — soulad s projektem

Audit [`0018-monitoring-system.md`](./0018-monitoring-system.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-monitoring-core/monitoringSystem.js`

---

## §1–§4 Účel a rozsah sledování

| Bod | Stav | Důkaz |
|-----|------|-------|
| Centrální Monitoring API | ✅ | `collectMonitoringSnapshot` |
| Bez zásahu do business logiky | ✅ | `MONITORING_FORBIDDEN_ACTIVITIES` |
| Sledované cíle (runtime, bus, AI, …) | ✅ | `MONITORING_TARGET` |

---

## §3 Architektura — 12 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Metrics Collector | ✅ | `createMetricSample` |
| Health Monitor | ✅ | `createHealthReport`, `computePlatformHealth` |
| Alert Manager | ✅ | `evaluateAlertThreshold`, `createAlert` |
| Dashboard Engine | ✅ | `createDashboardSnapshot`, `DASHBOARD_PANEL` |
| Performance Analyzer | ✅ | `analyzePerformance` |
| Trend Analyzer | ✅ | `analyzeTrend` |
| Diagnostic Engine | ✅ | `runDiagnostic` |
| Audit Monitor | ✅ | `createAuditMonitorCheck` |
| Resource Monitor | ✅ | `createResourceSnapshot` |
| Event Monitor | ✅ | `createEventBusMonitorSnapshot` |
| Log Aggregator | ✅ | `aggregateLogEntry` |
| Monitoring API | ✅ | `createMonitoringApiResponse` |

---

## §5–§16 Metriky, health, alerty, API

| Požadavek | Stav |
|-----------|------|
| 5 health stavů | ✅ `MONITORING_HEALTH` |
| CPU/RAM threshold alerty | ✅ `DEFAULT_ALERT_THRESHOLDS` |
| Dashboard panely | ✅ |
| Read-only Monitoring API | ✅ |
| Historická data / time-series DB | ❌ budoucí |

---

## §17–§19 Doménový monitoring

| Oblast | Stav |
|--------|------|
| Kojnožrout snapshot | ✅ `createKojnozoutMonitorSnapshot` |
| AI snapshot | ✅ `createAiMonitorSnapshot` |
| OBS snapshot | ✅ `createObsMonitorSnapshot` |
| Runtime `/health` integrace | 🟡 | `MIA_HEALTH_RUNTIME.js` |
| Streamer dashboard | 🟡 | `mia-streamer-dashboard.html` |

---

## §20 Kontrolní seznam (ruční)

| Položka | Stav |
|---------|------|
| Monitoring System | 🟡 | API ✅, centrální singleton ❌ |
| Metriky | ✅ |
| Health Monitor | ✅ |
| Alert Manager | ✅ |
| Dashboardy | 🟡 |
| Trendy | ✅ API |
| Diagnostika | ✅ |
| Log agregace | 🟡 | schema ✅, centralizace ❌ |
| OBS/Koj/AI monitoring | 🟡 |

---

## Vazby

| Dokument / modul | Vztah |
|------------------|-------|
| [0006](./0006-platform-architecture.md) | MONITORING system #17 |
| [0017](./0017-event-dispatcher.md) | Event metrics vstup |
| `MIA_HEALTH_RUNTIME.js` | Runtime health payload |
| [0019](./0019-memory-system.md) | Memory System |
| **0020** (plánováno) | Working Memory |

---

| Dokument | Stav |
|----------|------|
| **0018** Monitoring System | 🟢 kanon + kotva + contract |
| [0019](./0019-memory-system.md) | Memory System |
| **0020** (plánováno) | Working Memory |
