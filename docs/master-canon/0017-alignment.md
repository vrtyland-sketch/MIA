# Master Canon 0017 — soulad s projektem

Audit [`0017-event-dispatcher.md`](./0017-event-dispatcher.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-event-core/eventDispatcher.js`

---

## §1–§4 Účel a životní cyklus

| Bod | Stav | Důkaz |
|-----|------|-------|
| Centrální Dispatcher API | ✅ | `dispatchEvent` |
| Převzetí z Queue Manageru | ✅ | `pickNextDispatchItem` |
| Doručení dle Router plánu | ✅ | `computeDistributionPlan` |
| Bez rozhodování o routingu | ✅ | `DISPATCHER_FORBIDDEN_ACTIVITIES` |

---

## §3 Architektura — 10 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Dispatch Scheduler | ✅ | `pickNextDispatchItem` |
| Delivery Manager | ✅ | `deliverToSubscriber` |
| ACK Manager | ✅ | `DELIVERY_ACK`, `evaluateAckResponse` |
| Retry Manager | ✅ | `createRetryAttempt`, `handleDeliveryFailure` |
| Timeout Manager | ✅ | `resolveSubscriberTimeout` |
| Idempotency Manager | ✅ | `createIdempotencyStore` |
| Delivery Monitor | ✅ | `createDeliveryMonitorSnapshot` |
| Delivery Logger | ✅ | `createDeliveryLog` |
| Failure Handler | ✅ | DLQ via `createDeadLetterRecord` |
| Metrics Collector | ✅ | `createDeliveryMetricsSnapshot` |

---

## §7–§14 ACK, retry, timeout, režimy

| Požadavek | Stav |
|-----------|------|
| ACK / NACK / TIMEOUT | ✅ |
| Retry s backoff | ✅ `createRetryPolicy` |
| Per-subscriber timeout | ✅ |
| Idempotence | ✅ |
| Fire & Forget / Confirmed / Guaranteed | ✅ `DELIVERY_MODE` |
| Paralelní multicast | ✅ `Promise.all` |
| Strict order pro ekonomiku | ✅ sequential loop |

---

## §12–§13 Failure a log

| Oblast | Stav |
|--------|------|
| Selhání jednoho subscribera neblokuje ostatní | ✅ |
| Dead Letter Queue record | ✅ |
| Immutable delivery log | ✅ `readOnly: true` |
| Perzistentní delivery log soubory | ❌ |

---

## §17 Integrace s MIA

| Řetězec | Stav |
|---------|------|
| Gift dispatch chain | ✅ `MIA_GIFT_DISPATCH_CHAIN` |
| Chat dispatch chain | 🟡 | reference chain, moderation modul |
| `scripts/pipeline/run.js` | 🟡 | implicitní fáze místo dispatcheru |
| `MIA_DELIVERY_RUNTIME.js` | 🟡 | overlay/voice queue |

---

## §18–§20 Výkon, zakázané, checklist

| Položka | Stav |
|---------|------|
| Centrální Dispatcher | 🟡 | API ✅, runtime singleton ❌ |
| ACK/NACK | ✅ |
| Timeouty | ✅ |
| Retry | ✅ |
| Idempotence | ✅ |
| Metriky | ✅ |
| Runtime ingest hook | ❌ |

---

## Event Bus stack 0010–0017

| Dokument | Komponenta | Stav |
|----------|------------|------|
| 0010 | Event Bus | 🟢 |
| 0011 | Gateway | 🟢 |
| 0012 | Validator | 🟢 |
| 0013 | Registry | 🟢 |
| 0014 | Router | 🟢 |
| 0015 | Priority Manager | 🟢 |
| 0016 | Queue Manager | 🟢 |
| **0017** | **Dispatcher** | 🟢 |

---

## Doporučené další kroky

1. **0019 Memory System**
2. Hook `dispatchEvent` do ingest pipeline po routeru
3. Perzistentní `logs/delivery-*.jsonl`

---

| Dokument | Stav |
|----------|------|
| **0017** Event Dispatcher | 🟢 kanon + kotva + contract |
| [0018](./0018-monitoring-system.md) | Monitoring System |
| **0019** (plánováno) | Memory System |
