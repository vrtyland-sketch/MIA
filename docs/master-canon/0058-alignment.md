# Master Canon 0058 — soulad s projektem

Audit [`0058-task-scheduler.md`](./0058-task-scheduler.md) vůči stavu `C:\MIA` k 2026-07-16.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-scheduler-core/taskScheduler.js`

---

## §1–§9 Plánování a fronty

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Task Scheduler | ✅ | `singleton` / `executesTasksDirectly: false` |
| Task ≠ Process | ✅ | `TS_LAYER` |
| Lifecycle + FAILED/CANCELLED | ✅ | `TS_STATE` |
| Fronty (5) | ✅ | `TS_QUEUE` |
| Scheduling policies | ✅ | `TS_POLICY` |

---

## §10–§18 Provoz

| Oblast | Stav |
|--------|------|
| Paralelismus bez závislostí | ✅ `selectRunnable` |
| Timeout → cancel/retry | ✅ `checkTimeouts` |
| Retry Policy | ✅ `evaluateRetry` |
| Worker Pool | ✅ `setWorkerPoolSize` |
| Přetížení / emergency | ✅ `handleOverload` |
| Kernel vždy přednost | ✅ priority CRITICAL |
| Immutable audit | ✅ `auditTrail` |
| Live wiring | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0057](./0057-process-manager.md) | Process Manager |
| **0058** Task Scheduler | 🟢 kanon + kotva + contract |
| **0059** Thread Manager | 🟢 kanon + kotva + contract |
| **0060** (plánováno) | Runtime Health & Watchdog |
