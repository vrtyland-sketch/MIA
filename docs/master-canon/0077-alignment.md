# Master Canon 0077 — soulad s projektem

Audit [`0077-message-queue-manager.md`](./0077-message-queue-manager.md) vůči stavu `C:\MIA` k 2026-07-18.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-message-queue-core/messageQueueManager.js`

---

## §1–§15 Fronty, FIFO, ACK/NACK

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Message Queue Manager | ✅ | `singleton` / `soleMessageQueueAuthority` |
| Odděleno od Event Bus | ✅ | `distributesEvents: false` |
| Descriptor 9 polí | ✅ | `createMessageDescriptor` |
| Nezávislé Queue (AI/Battle/…) | ✅ | `createQueue` |
| Status lifecycle + Retry path | ✅ | `MQM_STATUS` |
| Priority LOW→CRITICAL | ✅ | `MQM_PRIORITY` |
| FIFO + priority override | ✅ | `dequeue` |
| Retry → DLQ | ✅ | `nack` / `retry` |
| DLQ never auto-deletes | ✅ | |
| ACK / NACK | ✅ | |
| API enqueue/dequeue/ack/nack/retry/peek/purge | ✅ | |

---

## §16–§19 Integrace a bezpečnost

| Oblast | Stav |
|--------|------|
| Event Bus oddělená vrstva | ✅ |
| Producer/Consumer auth | ✅ |
| At-most-one consumer completion | ✅ |
| Queue audit trail (≠ Audit Manager) | ✅ |
| Live external broker wiring | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0076](./0076-event-bus-manager.md) | Event Bus Manager |
| **0077** Message Queue Manager | 🟢 kanon + kotva + contract |
| **0078** Command Bus Manager | 🟢 kanon + kotva + contract |
| **0079** (plánováno) | Telemetry Manager |
