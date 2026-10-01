# MIA MASTER CANON
# Dokument 0076
# Event Bus Manager
---
## Metadata
| Položka            | Hodnota                                                                   |
| ------------------ | ------------------------------------------------------------------------- |
| ID                 | MIA-0076                                                                  |
| Název              | Event Bus Manager                                                         |
| Vrstva             | Kernel Layer 0                                                            |
| Priorita           | ABSOLUTNĚ KRITICKÁ                                                        |
| Verze              | 1.0.0                                                                     |
| Stav               | ACTIVE                                                                    |
| Nadřazený dokument | 0050 – MIA Core Kernel                                                    |
| Souvisí            | 0053 – Service Manager, 0058 – Task Scheduler, 0075 – Event Store Manager |
---
## 1. Účel
Event Bus Manager (EBM) je centrální komunikační páteř platformy MIA.
Jeho úkolem je bezpečně distribuovat události mezi jednotlivými komponentami systému bez jejich přímé závislosti.
Event Bus nepřijímá obchodní rozhodnutí.
Nepřepisuje události.
Nepamatuje si stav systému.
Pouze zajišťuje spolehlivé doručení událostí.
---
## 2. Hlavní odpovědnosti
Event Bus Manager:
* přijímá Eventy,
* distribuuje Eventy,
* spravuje odběratele,
* garantuje pořadí doručení,
* podporuje asynchronní komunikaci,
* monitoruje provoz Event Bus.
---
## 3. Architektura
```text
          Publisher
               │
               ▼
       Event Bus Manager
               │
      ┌────────┼────────┐
      │        │        │
      ▼        ▼        ▼
 Subscriber Subscriber Subscriber
```
Komponenty spolu nikdy nekomunikují přímo.
Veškerá komunikace probíhá přes Event Bus.
---
## 4. Co je Event Bus
Event Bus představuje centrální distribuční vrstvu.
Workflow:
```text
Publisher
↓
Event Bus
↓
Subscribers
```
Publisher neví, kdo Event přijme.
Subscriber neví, kdo Event vytvořil.
Vzniká plně oddělená architektura.
---
## 5. Event Descriptor
Každý přenášený Event obsahuje:
```text
EventID
EventType
Timestamp
Publisher
CorrelationID
Payload
Priority
Version
```
Event Bus Event není totožný s Event Store Event.
Event Bus přenáší zprávu.
Event Store ukládá historii.
---
## 6. Publisher
Publisher může být například:
* AI Engine
* Battle Engine
* Gift Engine
* Chat Engine
* OBS Connector
* TikTok Connector
* Kick Connector
* Scheduler
Každý Publisher publikuje Eventy pouze přes Event Bus API.
---
## 7. Subscriber
Subscriber může být například:
* Overlay Engine
* Speech Engine
* Inventory
* Battle Manager
* Metrics Manager
* Logging Manager
* Alert Manager
* Diagnostics
Jedna událost může mít libovolný počet Subscriberů.
---
## 8. Event Topics
Event Bus podporuje Topic Routing.
Například:
```text
battle.*
gift.*
chat.*
ai.*
overlay.*
runtime.*
obs.*
```
Subscriber může poslouchat jeden nebo více Topiců.
---
## 9. Event Priority
Události podporují priority.
```text
LOW
↓
NORMAL
↓
HIGH
↓
CRITICAL
```
Vyšší priorita je zpracována dříve.
---
## 10. Delivery Policy
Platforma podporuje:
### Broadcast
Událost obdrží všichni odběratelé.
---
### Targeted
Událost obdrží pouze konkrétní Subscriber.
---
### Filtered
Subscriber dostane pouze Eventy odpovídající filtru.
---
## 11. Ordering
Event Bus garantuje pořadí Eventů v rámci jednoho Publisheru.
Například:
```text
GiftReceived
↓
InventoryUpdated
↓
OverlayShown
```
Pořadí nesmí být změněno.
---
## 12. Retry
Pokud Subscriber Event nepřevezme:
```text
Delivery
↓
Retry
↓
Retry
↓
Dead Letter Queue
```
Retry politika je konfigurovatelná.
---
## 13. Dead Letter Queue
Nezpracované Eventy jsou přesunuty do DLQ.
Obsahují:
* původní Event,
* důvod selhání,
* počet pokusů,
* čas.
DLQ nikdy automaticky nemaže události.
---
## 14. Integrace s Event Store
Event Bus:
* přenáší Event.
Event Store:
* ukládá Event.
Jedná se o dvě zcela odlišné vrstvy.
---
## 15. Event Bus API
Veřejné rozhraní:
```text
publish()
subscribe()
unsubscribe()
ack()
retry()
reject()
```
Veškerá komunikace probíhá přes toto API.
---
## 16. Monitoring
Event Bus Manager publikuje:
* počet Eventů,
* počet Publisherů,
* počet Subscriberů,
* počet Retry,
* počet DLQ,
* průměrnou latenci.
Monitoring sleduje vytížení celé sběrnice.
---
## 17. Bezpečnost
Event Bus Manager:
* ověřuje Publisher,
* ověřuje Subscriber,
* chrání Payload,
* eviduje doručení,
* blokuje neplatné Eventy.
Každý Event má definovanou verzi.
---
## 18. Audit
Audit obsahuje:
* EventID,
* Publisher,
* Subscriber,
* čas publikování,
* čas doručení,
* počet Retry,
* výsledek.
Audit Event Bus je oddělen od Event Store.
---
## 19. Audit Cursor
Při kontrole ověřit:
* ☐ Existuje jediný Event Bus Manager.
* ☐ Publisher nekomunikují přímo se Subscribery.
* ☐ Topic Routing funguje.
* ☐ Priority fungují.
* ☐ Ordering je zachováno.
* ☐ Retry funguje.
* ☐ Dead Letter Queue existuje.
* ☐ Event Bus je oddělen od Event Store.
* ☐ Monitoring Event Bus funguje.
* ☐ Audit všech přenosů existuje.
---
## 20. Definice HOTOVO
Event Bus Manager je implementován správně pouze tehdy, když:
* všechny systémové události jsou distribuovány přes jedinou komunikační sběrnici,
* Publisher a Subscriber jsou plně oddělené a vzájemně na sobě nezávislé,
* je zachováno pořadí událostí v rámci jednotlivých Publisherů,
* systém podporuje směrování podle Topiců, priority i Retry mechanismus,
* nezpracované události jsou bezpečně ukládány do Dead Letter Queue,
* Event Bus poskytuje spolehlivou, škálovatelnou a auditovatelnou komunikaci napříč celou platformou.
---
## 21. Vazba na projekt MIA
Event Bus Manager tvoří komunikační páteř celé platformy MIA. Propojuje AI, Battle systém, Kojnožrouty, gift ekonomiku, overlaye, OBS, TikTok, Kick i všechny další moduly bez jejich vzájemné závislosti. Díky asynchronní distribuci událostí, podpoře Topic Routingu, priorit a Dead Letter Queue umožňuje budovat rozsáhlou modulární architekturu, která je snadno rozšiřitelná, stabilní a připravená na budoucí vývoj.
---
**Architektonická poznámka:** Dokument **0077** je věnován **Message Queue Manager**. Dokument **0078** je věnován **Command Bus Manager**. Dokument **0079** bude věnován **Telemetry Manager**.

## Konec dokumentu 0076
