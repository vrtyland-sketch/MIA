# Master Canon 0057 — soulad s projektem

Audit [`0057-process-manager.md`](./0057-process-manager.md) vůči stavu `C:\MIA` k 2026-07-16.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-process-core/processManager.js`

---

## §1–§9 Služba vs proces, lifecycle

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Process Manager | ✅ | `singleton` |
| Service ≠ Process | ✅ | `PM_LAYER` / multi-process per service |
| Typy kernel/worker/io/background | ✅ | `PM_PROCESS_TYPE` |
| Lifecycle FSM | ✅ | `PM_STATE`, `transitionProcessState` |
| Bez vlastníka / bez registrace | ✅ | `create` validace |

---

## §10–§18 Provoz

| Oblast | Stav |
|--------|------|
| Restart Policy + max restarts | ✅ `evaluateRestartPolicy` |
| Zombie detection | ✅ `detectZombies` |
| Deadlock detection | ✅ `detectDeadlocks` |
| Resource alloc před startem | ✅ `create` + `resourcesReserved` |
| Worker Pool | ✅ `configureWorkerPool` / `spawnWorkers` |
| Externí procesy | ✅ `registerExternal` |
| Izolace FAILED | ✅ `fail().isolatesOthers` |
| Immutable audit | ✅ `auditTrail` |
| Live wiring do index.js | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0056](./0056-resource-manager.md) | Resource Manager |
| **0057** Process Manager | 🟢 kanon + kotva + contract |
| **0058** Task Scheduler | ✅ kanon + kotva + contract |
| **0059** (pl�nov�no) | Runtime Health & Watchdog |
