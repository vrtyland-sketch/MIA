# MIA MASTER CANON — Dokument 0010

**Název:** Event Bus – Komunikační páteř platformy MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Nejvyšší (Critical)

**Nadřazené dokumenty:**

- [0003 – Definice události](./0003-event-definition.md)
- [0007 – Core System](./0007-core-system.md)
- [0009 – Lifecycle Manager](./0009-lifecycle-manager.md)

---

## 1. Účel dokumentu

Event Bus je **nejdůležitější komunikační infrastruktura** celé platformy MIA.

Veškerá komunikace mezi systémy probíhá prostřednictvím Event Busu. Žádný systém nesmí předpokládat existenci jiného systému — jednotlivé části znají pouze Event Bus.

To umožňuje: modularitu, výměnu modulů, distribuovaný provoz, testování, budoucí škálování.

---

## 2. Definice Event Busu

Event Bus je centrální infrastruktura pro: příjem, validaci, směrování, prioritizaci, frontování, doručování, audit, monitoring.

Event Bus **není Business Logic**. Nerozhoduje. Nepřepočítává. Nevytváří AI odpovědi. Pouze bezpečně dopravuje informace.

---

## 3. Architektura Event Busu

```
EVENT BUS
├── Event Gateway
├── Validator
├── Event Registry
├── Router
├── Priority Manager
├── Queue Manager
├── Dispatcher
├── Retry Manager
├── Dead Letter Queue
├── Audit Logger
├── Metrics Collector
└── Event History
```

Kanonický registr: `EVENT_BUS_COMPONENT` v `shared/mia-event-core/eventBusInfrastructure.js`

Každá část bude mít vlastní dokument (od **0011** Event Gateway).

---

## 4. Životní cesta jedné události

Povinná cesta:

```
Zdroj → Gateway → Validator → Registry → Priority → Queue
  → Router → Dispatcher → Subscriber → Audit → History
```

API: `EVENT_JOURNEY_ORDER` · `describeEventJourney()`

---

## 5. Event Gateway

Gateway přijímá všechny příchozí události ze zdrojů: TikTok, Kick, OBS, Scheduler, AI, Plugin, API, Administrace.

Gateway **pouze přijme** událost. Nesmí ji měnit.

Kotva: `routes/ingest`, `scripts/MIA_INGEST_HTTP.js`

---

## 6. Validator

Kontroluje: EventID, formát, typ, velikost dat, verzi schématu, bezpečnost.

Neplatná událost je **okamžitě odmítnuta**.

Kotva: `validateEventRecord()` · `scripts/MIA_INGEST_GUARD.js`

---

## 7. Event Registry

Seznam známých typů událostí (`KNOWN_EVENT_TYPES`):

CHAT_MESSAGE, GIFT_RECEIVED, FOLLOW, SUBSCRIBE, VIDEO_PLAY, AI_RESPONSE, KOJNOZROUT_FEED, SYSTEM_START, SYSTEM_STOP

Neznámé události nejsou standardně povoleny.

---

## 8. Priority Manager

Úrovně (`EVENT_PRIORITY`): Critical, High, Normal, Low, Background.

Mapování na fronty: `resolvePriorityQueue()` → `PRIORITY_QUEUE_*`

---

## 9. Queue Manager

Standardní fronty: Critical, High, Normal, Low, Background.

Runtime dnes: ingest **lanes** (support / community / audience) v `MIA_INGEST_QUEUE.js` 🟡

---

## 10. Router

Rozhoduje, kteří odběratelé událost obdrží. Jedna událost může jít více příjemcům.

Kotva: pipeline fáze v `scripts/pipeline/run.js` 🟡

---

## 11. Dispatcher

Fyzické doručení: synchronní, asynchronní, dávkové, budoucí distribuované.

Dispatcher **nesmí** změnit obsah události.

Kotva: `enqueuePayload()` · `MIA_DELIVERY_RUNTIME.js`

---

## 12. Subscriber

Registrace odběratele: SystemID, seznam událostí, priorita, filtr, max rychlost.

API: `createSubscriberRegistration()` · pole `SUBSCRIBER_FIELDS`

---

## 13. Retry Manager

Při selhání doručení: Retry Event, čítač pokusů, interval, opakování.

Po limitu → Dead Letter Queue.

API: `createRetryPolicy()` · runtime implementace 🟡

---

## 14. Dead Letter Queue

Nezpracované události: EventID, důvod, počet pokusů, čas, poslední chyba.

Administrátor: znovu odeslat, archivovat, odstranit.

API: `createDeadLetterRecord()` · perzistentní DLQ 🟡

---

## 15. Audit Logger

Kroky: Přijata → Validována → Zařazena → Odeslána → Doručena → Zpracována → Archivována.

API: `AUDIT_STEP` · `createEventAuditStep()`

Kotva: `logs/ingest-*.jsonl` 🟡

---

## 16. Event History

Read-only historie: EventID, Payload, čas, zdroj, příjemce, doba zpracování, výsledek.

API: `createEventHistoryRecord()`

---

## 17. Korelační identifikátor

Každá událost nese **Correlation ID**. Odvozené události sdílí stejné ID.

API: `ensureCorrelationId()`

---

## 18. Výkonnostní požadavky

Cíl: desítky tisíc událostí/s, paralelní zpracování, minimální latence, budoucí auto-škálování.

Architektura **nesmí** předpokládat jediný server.

---

## 19. Bezpečnost

Události mohou být: podepsány, ověřeny, autorizovány, šifrovány.

Kotva: `scripts/MIA_RUNTIME_SECURITY.js` · `MIA_INGEST_GUARD.js` 🟡

---

## 20. Monitoring

Metriky: EPS, délka front, selhání, latence doručení, validace, čekání, retry, DLQ count.

Kotva: `MIA_PIPELINE_SUMMARY_*` · `MIA_RUNTIME_PERF.js` 🟡

---

## 21. Zakázané činnosti

Event Bus nesmí: rozhodovat za AI, upravovat ekonomiku, měnit Payload, vykreslovat grafiku, přistupovat k business DB.

Enum: `EVENT_BUS_FORBIDDEN_ACTIVITIES` · `assertEventBusForbiddenActivity()`

---

## 22. Kontrolní seznam implementace

- [ ] Jediný centrální Event Bus?
- [ ] Validace všech událostí?
- [ ] Prioritizace?
- [ ] Oddělené fronty?
- [ ] Směrování podle odběratelů?
- [ ] Retry Manager?
- [ ] Dead Letter Queue?
- [ ] Audit všech kroků?
- [ ] Correlation ID?
- [ ] Dohledatelná cesta události?

Automatická kontrola: `tests/mia_master_canon_0010_contract.js` · [`0010-alignment.md`](./0010-alignment.md)

---

## 23. Vazba na současnou implementaci MIA

Referenční pipeline (`MIA_REFERENCE_PIPELINE`):

```
Externí platformy (TikTok, Kick, OBS)
  → Integration → Ingest → Normalizer → Event Bus
  → Decision Layer → Action Orchestrator → Video Engine
  → Kojnožrout → Memory → Logging & Analytics
```

Zachovává kompatibilitu s MIA41 i MIA_NEXT.

`describeMiaReferencePipeline()` · `CANON_EVENT_FLOW` (0003)

---

## 24. Poznámka architekta

Event Bus je **nervová soustava** MIA. Nepřemýšlí — přenáší informace mezi „mozkem, svaly a smysly“. Správně navržený Event Bus umožní rozšíření o stovky modulů bez zásadních změn jádra.

---

**Konec dokumentu 0010**

**Další krok:** Dokument **0011** — [Event Gateway](./0011-event-gateway.md). Dokument **0012** — Validator.
