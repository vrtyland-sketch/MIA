# Master Canon 0081 — soulad s projektem

Audit [`0081-saga-manager.md`](./0081-saga-manager.md) vůči stavu `C:\MIA` k 2026-07-18.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-saga-core/sagaManager.js`

---

## §1–§12 Orchestrace, waiting, compensation

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Saga Manager | ✅ | `singleton` / `soleSagaAuthority` |
| Nekoná Commands / nevytváří business logic | ✅ | flags |
| Descriptor 8 polí | ✅ | `createSagaDescriptor` |
| Status Created→…→Completed / Compensating→Failed | ✅ | `SM_STATUS` |
| Steps + Event-driven next step | ✅ | `registerSagaType` / `onEvent` |
| Commands jen přes Command Bus | ✅ | `commandBusBridge.send` |
| Waiting + Timeout | ✅ | `tickTimeouts` |
| Compensation (ne DB rollback) | ✅ | `compensateSaga` |

---

## §13–§18 Integrace a bezpečnost

| Oblast | Stav |
|--------|------|
| Event Bus → onEvent | ✅ |
| Saga lifecycle events → Event Store (optional bridge) | ✅ |
| API start/resume/cancel/complete/compensate/get | ✅ |
| Duplicate start blocked; recovery after crash | ✅ |
| Saga audit (≠ Audit Manager) | ✅ |
| Live saga type wiring in index | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0080](./0080-projection-manager.md) | Projection Manager |
| **0081** Saga Manager | 🟢 kanon + kotva + contract |
| **0082** Workflow Engine | 🟢 kanon + kotva + contract |
| **0083** Rule Engine | 🟢 kanon + kotva + contract |
| **0084** Policy Engine | 🟢 kanon + kotva + contract |
| **0085** Decision Engine (Kernel) | 🟢 kanon + kotva + contract |
| **0086** Orchestrator Engine | 🟢 kanon + kotva + contract |
| **0087** Coordination Engine | 🟢 kanon + kotva + contract |
| **0088** (plánováno) | Telemetry Manager |
