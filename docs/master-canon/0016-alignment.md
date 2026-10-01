# Master Canon 0016 — soulad s projektem

Audit [`0016-queue-manager.md`](./0016-queue-manager.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-event-core/queueManager.js`

---

## §1–§4 Účel a princip

| Bod | Stav | Důkaz |
|-----|------|-------|
| Centrální Queue Manager API | ✅ | `queueManager.js` |
| Bezpečné zařazení před zpracováním | ✅ | `enqueueEvent` |
| Bez business logiky / routingu | ✅ | `QUEUE_FORBIDDEN_ACTIVITIES` |

---

## §3 Architektura — 11 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Queue Registry | ✅ | `createQueueRegistry` |
| Queue Factory | ✅ | `createQueueViaFactory` |
| Queue Storage | ✅ | `createInMemoryQueueStorage` |
| Queue Scheduler | ✅ | `scheduleNextQueue` + Priority Manager |
| Capacity Manager | ✅ | `checkCapacity` |
| Overflow Manager | ✅ | delegace na `handleQueueOverflow` (0015) |
| Queue Recovery | ✅ | `recoverQueuesFromSnapshot` |
| Queue Monitor | ✅ | `createQueueMonitorSnapshot` |
| Queue Metrics | ✅ | `createQueueMetrics` |
| Queue Audit | ✅ | `createQueueAuditEvent` |
| Dispatcher Connector | ✅ | `dequeueForDispatcher` |

---

## §5–§12 Typy front, registry, storage, recovery

| Požadavek | Stav |
|-----------|------|
| 5 typů front (priority, fifo, scheduled, retry, dlq) | ✅ `QUEUE_TYPE` |
| Queue record s kapacitou a stavem | ✅ `createQueueRecord` |
| Factory-only vytváření | ✅ |
| In-memory storage | ✅ |
| Disk / distribuované úložiště | ❌ budoucí |
| Recovery bez duplicit | ✅ dedupe by eventId |
| Critical queue nikdy blokována | ✅ overflow accept_force |

---

## §13–§17 Monitor, metriky, paralelní zpracování, pořadí

| Oblast | Stav |
|--------|------|
| Monitor snapshot | ✅ |
| Metriky (length, peak, throughput, …) | ✅ |
| Worker claim (single consumer) | ✅ `claimEventForWorker` |
| Strict vs Parallel order | ✅ `resolveOrderMode` |
| Registry-driven order mode | 🟡 | mapa v QM, ne v registry schema |

---

## §18 Integrace s MIA

| Doménová fronta | Stav |
|-----------------|------|
| chat, gifts, ai_*, overlay, video, koj, inventory, memory, analytics, logging | ✅ `MIA_DOMAIN_QUEUE` + bootstrap |
| `MIA_INGEST_QUEUE.js` lanes | 🟡 | support/community/audience — částečná izolace |
| Perzistentní queue snapshot na disk | ❌ |

---

## §19–§20 Zakázané činnosti a checklist

| Položka | Stav |
|---------|------|
| Queue Registry | ✅ |
| Queue Factory | ✅ |
| Storage | 🟡 | in-memory |
| Recovery | 🟡 | API ✅, runtime hook ❌ |
| Paralelní workers | ✅ claim API |
| Strict order pro ekonomiku | ✅ gift → strict |

---

## Doporučené další kroky

1. **0018 Monitoring System**
2. Hook `dispatchEvent` + `enqueueEvent` do ingest pipeline
3. Perzistentní queue snapshot (`data/queue-snapshot.json`)
4. Order mode pole v Event Registry

---

| Dokument | Stav |
|----------|------|
| **0016** Queue Manager | 🟢 kanon + kotva + contract |
| [0017](./0017-event-dispatcher.md) | Event Dispatcher |
| **0018** (plánováno) | Monitoring System |
