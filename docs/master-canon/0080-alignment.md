# Master Canon 0080 — soulad s projektem

Audit [`0080-projection-manager.md`](./0080-projection-manager.md) vůči stavu `C:\MIA` k 2026-07-18.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-projection-core/projectionManager.js`

---

## §1–§12 Projekce z Eventů

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Projection Manager | ✅ | `singleton` / `soleProjectionAuthority` |
| Nevytváří Eventy / nemění Event Store | ✅ | flags |
| Descriptor 8 polí | ✅ | `createProjectionDescriptor` |
| Typy (Inventory/Battle/…) | ✅ | `PM_PROJECTION_TYPE` |
| Incremental update | ✅ | `updateProjection` / `applyEvent` |
| Replay rebuild | ✅ | `rebuildProjection` |
| Versioning | ✅ | `version` |
| Eventual consistency | ✅ | `eventualConsistency: true` |
| Manual patch blocked | ✅ | |

---

## §13–§18 Integrace a API

| Oblast | Stav |
|--------|------|
| Query čte jen Projection | ✅ `forQueryBus` |
| Event Bus → applyEvent | ✅ `fromEventBus` |
| API create/update/rebuild/delete/get | ✅ |
| Projection audit (≠ Audit Manager) | ✅ |
| Live Event Store subscription | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0079](./0079-query-bus-manager.md) | Query Bus Manager |
| **0080** Projection Manager | 🟢 kanon + kotva + contract |
| **0081** Saga Manager | 🟢 kanon + kotva + contract |
| **0082** Workflow Engine | 🟢 kanon + kotva + contract |
| **0083** Rule Engine | 🟢 kanon + kotva + contract |
| **0084** Policy Engine | 🟢 kanon + kotva + contract |
| **0085** Decision Engine (Kernel) | 🟢 kanon + kotva + contract |
| **0086** Orchestrator Engine | 🟢 kanon + kotva + contract |
| **0087** Coordination Engine | 🟢 kanon + kotva + contract |
| **0088** (plánováno) | Telemetry Manager |
