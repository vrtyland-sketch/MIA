# Master Canon 0079 — soulad s projektem

Audit [`0079-query-bus-manager.md`](./0079-query-bus-manager.md) vůči stavu `C:\MIA` k 2026-07-18.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-query-bus-core/queryBusManager.js`

---

## §1–§14 CQRS a Read Model

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Query Bus Manager | ✅ | `singleton` / `soleQueryBusAuthority` |
| Nikdy nemění stav / nevytváří Domain Events | ✅ | flags |
| Descriptor 7 polí | ✅ | `createQueryDescriptor` |
| Právě jeden Handler na QueryType | ✅ | `registerHandler` |
| Read Model only | ✅ | `readModel` bridge |
| Pipeline Validation→Response | ✅ | `QBM_PIPELINE` |
| CQRS: Commands ≠ Queries | ✅ | `cqrsSeparated: true` |
| Event Store jen přes Projection → Read Model | ✅ | no direct stream read |

---

## §15–§18 API a bezpečnost

| Oblast | Stav |
|--------|------|
| API execute/validate/authorize/cancel/getResponse | ✅ |
| Sensitive data filtering | ✅ |
| Query audit (≠ Audit Manager) | ✅ |
| Live read-model wiring | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0078](./0078-command-bus-manager.md) | Command Bus Manager |
| **0079** Query Bus Manager | 🟢 kanon + kotva + contract |
| **0080** Projection Manager | 🟢 kanon + kotva + contract |
| **0081** (plánováno) | Telemetry Manager |
