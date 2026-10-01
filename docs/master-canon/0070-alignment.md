# Master Canon 0070 — soulad s projektem

Audit [`0070-diagnostics-manager.md`](./0070-diagnostics-manager.md) vůči stavu `C:\MIA` k 2026-07-18.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-diagnostics-core/diagnosticsManager.js`

---

## §1–§10 Čtení, snapshot a analýza

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Diagnostics Manager | ✅ | `singleton` / `soleDiagnosticsAuthority` |
| Pouze čtecí vrstva | ✅ | `readOnly: true` / mutace blokovány |
| Definované diagnostické zdroje | ✅ | `DM_SOURCES` |
| Descriptor 8 polí | ✅ | `createDiagnosticDescriptor` |
| Kategorie (10+) | ✅ | `DM_CATEGORY` |
| Snapshot | ✅ | `snapshot` |
| Trend Analysis | ✅ | `analyzeTrend` |
| Root Cause Analysis | ✅ | `analyzeRootCause` |
| Read-only Queries | ✅ | `query` |

---

## §11–§18 Integrace a bezpečnost

| Oblast | Stav |
|--------|------|
| Health read-only (nepočítá Health) | ✅ |
| Fault historie jako zdroj | ✅ |
| Recovery diagnostický feed | ✅ `forRecovery` |
| AI read-only access | ✅ `forAi` |
| Report + export | ✅ |
| Metrics + immutable audit | ✅ |
| Live wiring všech source bridges | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0069](./0069-shutdown-manager.md) | Shutdown Manager |
| **0070** Diagnostics Manager | 🟢 kanon + kotva + contract |
| **0071** Logging Manager | 🟢 kanon + kotva + contract |
| **0072** Metrics Manager | 🟢 kanon + kotva + contract |
| **0073** (plánováno) | Telemetry Manager |
