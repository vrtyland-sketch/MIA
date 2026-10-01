# Master Canon 0071 — soulad s projektem

Audit [`0071-logging-manager.md`](./0071-logging-manager.md) vůči stavu `C:\MIA` k 2026-07-18.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-logging-core/loggingManager.js`

---

## §1–§11 Zápis, struktura a úložiště

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Logging Manager | ✅ | `singleton` / `soleLoggingAuthority` |
| Neanalyzuje logy | ✅ | `analyzesLogs: false` |
| Log Descriptor 9 polí | ✅ | `createLogDescriptor` |
| Levels TRACE→FATAL | ✅ | `LM_LEVEL` |
| Kategorie (10+) | ✅ | `LM_CATEGORY` |
| Strukturované logování | ✅ | `structured` primary |
| CorrelationID | ✅ | `getByCorrelation` |
| Rotace + retence | ✅ | `rotate` / policy |
| Konfigurovatelné storage | ✅ | injected `storageBridge` |

---

## §12–§18 Integrace a bezpečnost

| Oblast | Stav |
|--------|------|
| Fault → auto log | ✅ `fromFault` |
| Diagnostics read feed | ✅ `forDiagnostics` |
| AI read-only (no mutate/delete) | ✅ `forAi` |
| Unitární API log/trace/…/fatal | ✅ |
| Metrics | ✅ |
| Immutable logs + masked secrets | ✅ |
| Live file/DB/cloud storage wiring | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0070](./0070-diagnostics-manager.md) | Diagnostics Manager |
| **0071** Logging Manager | 🟢 kanon + kotva + contract |
| **0072** Metrics Manager | 🟢 kanon + kotva + contract |
| **0073** Alert Manager | 🟢 kanon + kotva + contract |
| **0074** Audit Manager | 🟢 kanon + kotva + contract |
| **0075** Event Store Manager | 🟢 kanon + kotva + contract |
| **0076** (plánováno) | Telemetry Manager |
