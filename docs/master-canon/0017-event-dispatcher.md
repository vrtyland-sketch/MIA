# MIA MASTER CANON — Dokument 0017

**Název:** Event Dispatcher – Doručování událostí  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Kritická

**Nadřazené dokumenty:**

- [0010 – Event Bus](./0010-event-bus.md)
- [0014 – Event Router](./0014-event-router.md)
- [0016 – Queue Manager](./0016-queue-manager.md)

---

## 1. Účel dokumentu

Event Dispatcher je **poslední aktivní část** Event Busu.

Jeho úkolem je bezpečně převzít připravenou událost z Queue Manageru a doručit ji všem příjemcům určeným Event Routerem.

Dispatcher představuje poslední krok mezi Core Systemem a aplikační logikou.

---

## 2. Definice Dispatcheru

Dispatcher je doručovací komponenta. Odpovědnost:

- převzít událost,
- doručit ji správným odběratelům,
- získat potvrzení,
- řešit chyby,
- zaznamenat průběh.

Dispatcher **nikdy nerozhoduje**, kdo má událost dostat. To určil Event Router.

---

## 3. Architektura Dispatcheru

```
EVENT DISPATCHER
├── Dispatch Scheduler
├── Delivery Manager
├── ACK Manager
├── Retry Manager
├── Timeout Manager
├── Idempotency Manager
├── Delivery Monitor
├── Delivery Logger
├── Failure Handler
└── Metrics Collector
```

---

## 4. Životní cyklus doručení

```
Queue → Dispatcher → Subscriber → ACK → Completed
```

Pokud ACK nepřijde, aktivuje se Retry Manager.

---

## 5. Dispatch Scheduler

Scheduler vybírá další událost připravenou k doručení. Respektuje Priority Manager, Queue Manager, Fair Scheduler a limity odběratelů. **Nesmí měnit pořadí** definované Priority Managerem.

---

## 6. Delivery Manager

Fyzicky předává událost odběrateli. Podporuje synchronní, asynchronní, lokální, vzdálené a budoucí distribuované doručení.

---

## 7. ACK Manager

Možné odpovědi: **ACK** (úspěch), **NACK** (odmítnutí), **TIMEOUT** (bez odpovědi).

---

## 8. Retry Manager

Při NACK, Timeout nebo dočasné chybě vytvoří nový pokus s RetryID, číslem pokusu, časem dalšího pokusu a důvodem.

---

## 9. Timeout Manager

Každý Subscriber má vlastní timeout (např. Overlay 100 ms, AI 20 s, Analytics 60 s).

---

## 10. Idempotency Manager

Stejná událost nesmí být jedním odběratelem zpracována vícekrát. Kontrola: EventID, SubscriberID, CorrelationID.

---

## 11. Delivery Monitor

Sleduje počet doručení, úspěšnost, timeouty, průměrnou dobu, nejpomalejší odběratele a chybovost.

---

## 12. Failure Handler

Při definitivním selhání: Delivery Error, informace Error Manageru, Audit, předání do Dead Letter Queue. **Selhání jednoho odběratele nesmí zastavit ostatní.**

---

## 13. Delivery Logger

Každé doručení vytváří Delivery Log: DeliveryID, EventID, SubscriberID, časy, výsledek, doba doručení. Historie je neměnná.

---

## 14. Doručovací režimy

| Režim | Popis | Použití |
|-------|-------|---------|
| **Fire & Forget** | Bez čekání na ACK | Logování, telemetrie |
| **Confirmed Delivery** | Čeká na ACK | AI, ekonomika, Kojnožrout |
| **Guaranteed Delivery** | Opakuje do ACK nebo limitu Retry | Kritické systémové události |

---

## 15. Paralelní doručování

Jedna událost může být doručována více Subscriberům současně. Každý potvrzuje přijetí samostatně.

---

## 16. Pořadí doručení

Respektuje pořadí fronty, pravidla Event Registry a Priority Manageru. Strict Order pro vyžadující Subscribers.

---

## 17. Integrace s MIA

**Chat:** Conversation → Overlay → Memory → Moderation → Analytics  
**Gift:** Economy → Kojnožrout → Video → OBS → Memory → Statistics

---

## 18. Výkonnost

Desetitisíce doručení za sekundu, stovky odběratelů, minimální latence, horizontální škálování.

---

## 19. Zakázané činnosti

Dispatcher nesmí: měnit Payload, prioritu, směrování; vytvářet obchodní události; rozhodovat za AI.

---

## 20. Kontrolní seznam implementace

Automatická kontrola: `tests/mia_master_canon_0017_contract.js` · [`0017-alignment.md`](./0017-alignment.md)

---

## 21. Vazba na budoucí architekturu MIA

Distribuovatelná komponenta — AI na jiném serveru, grafika na dedikovaném stroji, více instancí Dispatcheru.

---

## 22. Poznámka architekta

Dispatcher je kurýr platformy MIA. Přijme připravenou událost, doručí správným příjemcům, získá potvrzení a zaznamená průběh.

---

**Architektonická poznámka:** Dokumenty **0010–0017** tvoří kompletní specifikaci základní infrastruktury Event Busu. Od **0018** začíná Monitoring System.
