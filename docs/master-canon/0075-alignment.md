# Master Canon 0075 — soulad s projektem

Audit [`0075-event-store-manager.md`](./0075-event-store-manager.md) vůči stavu `C:\MIA` k 2026-07-18.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-event-store-core/eventStoreManager.js`

---

## §1–§11 Domain Eventy, streamy a replay

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Event Store Manager | ✅ | `singleton` / `soleEventStoreAuthority` |
| Odděleno od Logging / Audit | ✅ | `storesOperationalLogs: false` / `storesAdminAudit: false` |
| Descriptor 9 polí | ✅ | `createEventDescriptor` |
| Aggregate → Event Stream | ✅ | `appendEvent` / `loadStream` |
| Neměnné pořadí + monotonická verze | ✅ | `version` |
| Replay → state reconstruction | ✅ | `replay` |
| Snapshot jako optimalizace | ✅ | `createSnapshot` |
| Event type versioning | ✅ | `eventSchemaVersion` / preserved history |

---

## §12–§18 Integrace a bezpečnost

| Oblast | Stav |
|--------|------|
| State Manager: historie = Eventy | ✅ `forStateManager` |
| Logging / Audit oddělené | ✅ |
| API append/load/replay/snapshot | ✅ pouze `appendEvent` zapisuje |
| Archivace zachovává Replay | ✅ |
| Immutable events / no rewrite | ✅ |
| Live durable event store | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0074](./0074-audit-manager.md) | Audit Manager |
| **0075** Event Store Manager | 🟢 kanon + kotva + contract |
| **0076** Event Bus Manager | 🟢 kanon + kotva + contract |
| **0077** Message Queue Manager | 🟢 kanon + kotva + contract |
| **0078** Command Bus Manager | 🟢 kanon + kotva + contract |
| **0079** (plánováno) | Telemetry Manager |
