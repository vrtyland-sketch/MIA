# Master Canon 0015 — soulad s projektem

Audit [`0015-priority-manager.md`](./0015-priority-manager.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-event-core/priorityManager.js`

---

## §1–§5 Účel, princip, úrovně P0–P4

| Bod | Stav | Důkaz |
|-----|------|-------|
| Centrální Priority Manager API | ✅ | `priorityManager.js` |
| P0–P4 mapování na EVENT_PRIORITY | ✅ | `PRIORITY_LEVEL`, `EVENT_PRIORITY_BY_LEVEL` |
| Jedna priorita na událost | ✅ | `resolveEventPriority` |
| Bez mutace payloadu | ✅ | `assertPriorityForbiddenActivity` |

---

## §3 Architektura — 9 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Priority Resolver | ✅ | `resolveEventPriority`, `assignEventPriority` |
| Queue Selector | ✅ | `selectQueueForPriority` |
| Fair Scheduler | ✅ | `pickNextQueue`, `createFairSchedulerState` |
| Starvation Protection | ✅ | `applyStarvationProtection` |
| Load Balancer | 🟡 | připraveno v metrikách; bez distribuovaného runtime |
| Dynamic Priority Engine | ✅ | `resolveDynamicGiftPriority` |
| Overflow Manager | ✅ | `handleQueueOverflow` |
| Metrics Collector | ✅ | `createPriorityMetricsSnapshot` |
| Audit Logger | ✅ | `createPriorityChangeEvent` |

---

## §6–§12 Fronty, fair scheduling, overflow

| Požadavek | Stav |
|-----------|------|
| Fronta per priorita | ✅ `PRIORITY_QUEUE_BY_PRIORITY` (0010) |
| Fair scheduler po N High | ✅ `DEFAULT_FAIR_SCHEDULER` |
| Starvation boost | ✅ `boostPriority` |
| Gift dynamic priority | ✅ coins ≥ 5000 → High |
| Critical nikdy reject | ✅ `handleQueueOverflow` |
| Low/Background reject při overflow | ✅ |

---

## §13–§16 Pravidla, audit, zakázané činnosti

| Oblast | Stav |
|--------|------|
| Admin override | ✅ `options.adminPriorityOverride` |
| Priority Event audit | ✅ `createPriorityChangeEvent` |
| Zakázané aktivity | ✅ `PRIORITY_FORBIDDEN_ACTIVITIES` |
| Perzistentní audit log | ❌ |

---

## §17 Vazba na MIA

| Oblast | Stav |
|--------|------|
| `eventPriority.js` (0003) | ✅ základní úrovně |
| `MIA_INGEST_QUEUE.js` lanes | 🟡 support/community/audience — částečná priorita |
| Pipeline priority hook | ❌ | ingest queue nepoužívá `assignEventPriority` |
| Gift tier priority | 🟡 | `resolveGiftEventPriority` v eventPriority + dynamic v PM |

---

## §18 Kontrolní seznam (ruční)

| Položka | Stav |
|---------|------|
| Centrální Priority Manager | 🟡 | API ✅, runtime singleton ❌ |
| P0–P4 úrovně | ✅ |
| Fronta per priorita | ✅ |
| Fair Scheduler | ✅ |
| Starvation Protection | ✅ |
| Dynamic Priority Engine | ✅ |
| Overflow Manager | ✅ |
| Audit změn | 🟡 | in-memory event, bez persistence |
| Metriky | 🟡 | snapshot API |

---

## Doporučené další kroky

1. **0017 Dispatcher** — ACK/NACK, retry, idempotence
2. Hook `assignEventPriority` + `enqueueEvent` do ingest pipeline
3. Perzistentní Priority Event audit log

---

| Dokument | Stav |
|----------|------|
| **0015** Priority Manager | 🟢 kanon + kotva + contract |
| [0015](./0015-priority-manager.md) | Priority assignment |
| [0016](./0016-queue-manager.md) | Queue storage |
| **0017** (plánováno) | Dispatcher |
