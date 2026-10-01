# Master Canon 0010 — soulad s projektem

Audit [`0010-event-bus.md`](./0010-event-bus.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-event-core/eventBusInfrastructure.js`

---

## §1–§2 Účel a definice

| Bod | Stav | Důkaz |
|-----|------|-------|
| Centrální komunikace přes bus | 🟡 | ingest queue + pipeline; ne jeden unified bus proces |
| Moduly neznají přímo sebe | 🟡 | HOST pattern; přímá volání v index.js stále existují |
| Bus bez business logiky | ✅ | queue forward; rozhodnutí v pipeline fázích |

---

## §3 Architektura — 12 komponent

| Komponenta | Stav | Runtime |
|------------|------|---------|
| Event Gateway | 🟡 | routes/ingest |
| Validator | 🟡 | validateEventRecord + ingest guard |
| Event Registry | 🟡 | KNOWN_EVENT_TYPES enum |
| Router | 🟡 | pipeline phases |
| Priority Manager | ✅ | EVENT_PRIORITY + resolvePriorityQueue |
| Queue Manager | 🟡 | ingest lanes ≠ 5 priority queues |
| Dispatcher | 🟡 | enqueuePayload |
| Retry Manager | ❌ | createRetryPolicy model only |
| Dead Letter Queue | ❌ | createDeadLetterRecord model only |
| Audit Logger | 🟡 | jsonl ingest logs |
| Metrics Collector | 🟡 | pipeline summary, runtime perf |
| Event History | ❌ | model only |

**Souhrn:** 1× ✅ · 8× 🟡 · 3× ❌ (modely)

---

## §4 Životní cesta události

| Krok | Stav | Kotva |
|------|------|-------|
| 11 kroků definováno | ✅ | EVENT_JOURNEY_ORDER |
| Povinná cesta v runtime | 🟡 | implicitní v ingest→pipeline |
| describeEventJourney() | ✅ | contract test |

---

## §5–§12 Gateway → Subscriber

| Oblast | Stav | Poznámka |
|--------|------|----------|
| Gateway bez mutace payloadu | ✅ | HTTP ingest forward |
| Validator odmítá neplatné | ✅ | validateEventRecord |
| Registry známých typů | 🟡 | enum; runtime enforcement částečný |
| Priority → queue map | ✅ | PRIORITY_QUEUE_BY_PRIORITY |
| Router multi-subscriber | 🟡 | pipeline orchestrace |
| Subscriber registrace | 🟡 | API ✅; central registry ❌ |
| Dispatcher beze změny payloadu | ✅ | design |

---

## §13–§16 Retry, DLQ, Audit, History

| Požadavek | Stav |
|-----------|------|
| Retry policy model | ✅ |
| Runtime retry manager | ❌ |
| DLQ model | ✅ |
| Perzistentní DLQ | ❌ |
| Audit steps enum | ✅ |
| Per-step audit v runtime | 🟡 |
| Event history read-only store | ❌ |

---

## §17 Correlation ID

| Požadavek | Stav |
|-----------|------|
| ensureCorrelationId() | ✅ |
| Povinné na všech událostech | 🟡 | traceId volitelné v schema |

---

## §18–§20 Výkon, bezpečnost, monitoring

| Oblast | Stav |
|--------|------|
| Multi-node ready | 🟡 | design only |
| Ingest auth / guard | ✅ |
| EPS / queue depth metrics | 🟡 |
| DLQ / retry metrics | ❌ |

---

## §21 Zakázané činnosti

| Pravidlo | Stav |
|----------|------|
| EVENT_BUS_FORBIDDEN_ACTIVITIES | ✅ |
| Bus moduly bez gift/AI logiky | ✅ |

---

## §23 Reference pipeline MIA

| Krok | Stav | Modul |
|------|------|-------|
| TikTok/Kick/OBS ingest | ✅ | platform bridges |
| Normalizer | ✅ | normalize_event.js |
| Event Bus | ✅ | MIA_INGEST_QUEUE |
| Decision Layer | ✅ | shadow runtime |
| Action Orchestrator | ✅ | MIA_DELIVERY_RUNTIME |
| Video / Koj / Memory | ✅ | respective engines |
| Logging | ✅ | writeLog |

11 kroků v `MIA_REFERENCE_PIPELINE`.

---

## §22 Kontrolní seznam (ruční)

| Položka | Stav |
|---------|------|
| Jediný centrální bus | 🟡 |
| Validace všech událostí | 🟡 |
| Prioritizace | ✅ |
| Oddělené fronty | 🟡 |
| Směrování odběratelů | 🟡 |
| Retry Manager | ❌ |
| Dead Letter Queue | ❌ |
| Audit kroků | 🟡 |
| Correlation ID | 🟡 |
| Trace celé cesty | 🟡 |

---

## Doporučené kroky

1. **0011 Event Gateway** — formát a normalizace per platforma
2. Central `EventBus` singleton s journey enforcement
3. Perzistentní DLQ + retry worker
4. `logs/event-audit-*.jsonl` s AUDIT_STEP
5. Povinné `correlationId` v `createEventRecord`

---

## Vazby

| Dokument | Vztah |
|----------|-------|
| [0003](./0003-event-definition.md) | Co je událost |
| [0007](./0007-core-system.md) | Event Bus jako Core §7 |
| [0009](./0009-lifecycle-manager.md) | Lifecycle events |
| **0011** (plánováno) | Event Gateway detail |
