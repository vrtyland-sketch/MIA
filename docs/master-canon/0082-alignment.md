# Master Canon 0082 — soulad s projektem

Audit [`0082-workflow-engine.md`](./0082-workflow-engine.md) vůči stavu `C:\MIA` k 2026-07-18.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-workflow-core/workflowEngine.js`

---

## §1–§12 Kroky, decision, parallel, loop

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Workflow Engine | ✅ | `singleton` / `soleWorkflowAuthority` |
| Workflow ≠ Saga (pracovní postup vs obchodní proces) | ✅ | flags / doc note |
| Descriptor 8 polí | ✅ | `createWorkflowDescriptor` |
| Steps | ✅ | `registerWorkflowType` / node `step` |
| Decision / větvení | ✅ | node `decision` |
| Parallel + Wait All sync | ✅ | node `parallel` / `completeBranch` |
| Loops s ukončovací podmínkou | ✅ | node `loop` |
| Error Handling (retry / alternative / abort) | ✅ | `onError` |
| Timeout | ✅ | `tickTimeouts` |

---

## §13–§18 Integrace a bezpečnost

| Oblast | Stav |
|--------|------|
| Commands jen přes Command Bus | ✅ `commandBusBridge.send` |
| Saga může využívat Workflow (bridge) | ✅ `forSagaBridge` |
| API start/pause/resume/cancel/complete/get | ✅ |
| Neplatné přechody / skip kroku blocked | ✅ |
| Workflow audit (≠ Audit Manager) | ✅ |
| Live workflow type wiring in index | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0081](./0081-saga-manager.md) | Saga Manager |
| **0082** Workflow Engine | 🟢 kanon + kotva + contract |
| **0083** Rule Engine | 🟢 kanon + kotva + contract |
| **0084** Policy Engine | 🟢 kanon + kotva + contract |
| **0085** Decision Engine (Kernel) | 🟢 kanon + kotva + contract |
| **0086** Orchestrator Engine | 🟢 kanon + kotva + contract |
| **0087** Coordination Engine | 🟢 kanon + kotva + contract |
| **0088** (plánováno) | Telemetry Manager |
