# Master Canon 0078 — soulad s projektem

Audit [`0078-command-bus-manager.md`](./0078-command-bus-manager.md) vůči stavu `C:\MIA` k 2026-07-18.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-command-bus-core/commandBusManager.js`

---

## §1–§11 Pipeline a handlery

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Command Bus Manager | ✅ | `singleton` / `soleCommandBusAuthority` |
| Právě jeden Handler na CommandType | ✅ | `registerHandler` |
| Descriptor 8 polí | ✅ | `createCommandDescriptor` |
| Routing Sender→Handler | ✅ | `dispatch` |
| Validace + Authorization | ✅ | pipeline |
| Jednotná pipeline | ✅ | `CBM_PIPELINE` |
| Sync / Async režim | ✅ | `mode: sync\|async` |
| Result Success / Validation Failed / Execution Failed | ✅ | |

---

## §12–§18 Integrace a bezpečnost

| Oblast | Stav |
|--------|------|
| Command ≠ Event Store zápis; Domain Event až po success | ✅ |
| Event Bus publish po success (injected) | ✅ |
| Message Queue enqueue pro long async (injected) | ✅ |
| Idempotent: jeden CommandID jednou | ✅ |
| API send/validate/dispatch/cancel/getResult | ✅ |
| Live handler wiring in index | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0077](./0077-message-queue-manager.md) | Message Queue Manager |
| **0078** Command Bus Manager | 🟢 kanon + kotva + contract |
| **0079** Query Bus Manager | 🟢 kanon + kotva + contract |
| **0080** Projection Manager | 🟢 kanon + kotva + contract |
| **0081** (plánováno) | Telemetry Manager |
