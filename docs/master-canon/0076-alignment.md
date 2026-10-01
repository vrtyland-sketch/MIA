# Master Canon 0076 — soulad s projektem

Audit [`0076-event-bus-manager.md`](./0076-event-bus-manager.md) vůči stavu `C:\MIA` k 2026-07-18.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-event-bus-core/eventBusManager.js`

Poznámka: Distinct from legacy `shared/mia-event-core/` (docs 0010–0017). 0076 is Kernel Layer 0 Event Bus Manager kotva.

---

## §1–§13 Distribuce, topics a DLQ

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Event Bus Manager | ✅ | `singleton` / `soleEventBusAuthority` |
| Bez business decisions / no rewrite / no state | ✅ | flags |
| Descriptor 8 polí (≠ Event Store) | ✅ | `createBusEventDescriptor` |
| Topic Routing | ✅ | `subscribe(topic)` |
| Priority LOW→CRITICAL | ✅ | `EBM_PRIORITY` |
| Broadcast / Targeted / Filtered | ✅ | delivery policies |
| Per-publisher ordering | ✅ | sequence |
| Retry → DLQ | ✅ | `retry` / `deadLetterQueue` |
| DLQ never auto-deletes | ✅ | |

---

## §14–§18 Integrace a bezpečnost

| Oblast | Stav |
|--------|------|
| Odděleno od Event Store | ✅ |
| API publish/subscribe/unsubscribe/ack/retry/reject | ✅ |
| Publisher/Subscriber auth | ✅ |
| Delivery audit trail | ✅ |
| Live async broker / external bus | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0075](./0075-event-store-manager.md) | Event Store Manager |
| **0076** Event Bus Manager | 🟢 kanon + kotva + contract |
| **0077** Message Queue Manager | 🟢 kanon + kotva + contract |
| **0078** Command Bus Manager | 🟢 kanon + kotva + contract |
| **0079** (plánováno) | Telemetry Manager |
