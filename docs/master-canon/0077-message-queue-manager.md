# MIA MASTER CANON
# Dokument 0077
# Message Queue Manager
---
## Metadata
| Položka            | Hodnota                                         |
| ------------------ | ----------------------------------------------- |
| ID                 | MIA-0077                                        |
| Název              | Message Queue Manager                           |
| Vrstva             | Kernel Layer 0                                  |
| Priorita           | ABSOLUTNĚ KRITICKÁ                              |
| Verze              | 1.0.0                                           |
| Stav               | ACTIVE                                          |
| Nadřazený dokument | 0050 – MIA Core Kernel                          |
| Souvisí            | 0058 – Task Scheduler, 0076 – Event Bus Manager |
---
## 1. Účel
Message Queue Manager (MQM) je centrální systém pro správu front zpráv v celé platformě MIA.
Na rozdíl od Event Bus Manageru není určen pro distribuování událostí.
Jeho úkolem je bezpečně uchovávat zprávy určené ke zpracování, řídit jejich pořadí, opakované doručování a životní cyklus.
Message Queue Manager představuje garantovanou transportní vrstvu mezi producenty a konzumenty zpráv.
---
## 2. Hlavní odpovědnosti
Message Queue Manager:
* přijímá zprávy,
* ukládá je do front,
* řídí pořadí,
* doručuje konzumentům,
* podporuje Retry,
* spravuje Dead Letter Queue.
---
## 3. Architektura
```text
        Producer
            │
            ▼
   Message Queue Manager
            │
     ┌──────┼──────┐
     │      │      │
     ▼      ▼      ▼
 Queue A Queue B Queue C
     │      │      │
     ▼      ▼      ▼
 Consumers Consumers Consumers
```
Každá zpráva patří právě do jedné fronty.
---
## 4. Co je Message
Message představuje pracovní úkol určený ke zpracování.
Například:
* vygeneruj overlay,
* přehraj video,
* odešli odpověď AI,
* aktualizuj inventář,
* synchronizuj Battle,
* ulož Snapshot.
Message představuje požadovanou akci.
---
## 5. Message Descriptor
Každá Message obsahuje:
```text
MessageID
QueueID
Type
Priority
Payload
Created
RetryCount
Status
CorrelationID
```
MessageID je globálně jedinečné.
---
## 6. Queue
Platforma podporuje více front.
Například:
### AI Queue
---
### Battle Queue
---
### Overlay Queue
---
### OBS Queue
---
### Inventory Queue
---
### Platform Queue
Každá Queue je nezávislá.
---
## 7. Status Message
Životní cyklus:
```text
Created
↓
Queued
↓
Processing
↓
Completed
```
Při chybě:
```text
Processing
↓
Retry
↓
Retry
↓
Dead Letter Queue
```
---
## 8. Priority
Message podporuje priority.
```text
LOW
↓
NORMAL
↓
HIGH
↓
CRITICAL
```
Priority určují pořadí zpracování uvnitř Queue.
---
## 9. FIFO
Ve výchozím režimu používá Queue:
**FIFO**
```text
1
↓
2
↓
3
↓
4
```
Pořadí lze změnit pouze definovanou prioritou.
---
## 10. Retry
Pokud zpracování selže:
```text
Processing
↓
Retry
↓
Retry
↓
Success
```
Počet pokusů je konfigurovatelný.
---
## 11. Dead Letter Queue
Po vyčerpání Retry:
```text
Retry Failed
↓
Dead Letter Queue
```
DLQ obsahuje:
* Message,
* důvod selhání,
* počet pokusů,
* čas.
DLQ nikdy automaticky nemaže zprávy.
---
## 12. Consumer
Consumer:
* čte Message,
* zpracuje ji,
* vrátí ACK nebo NACK.
Každá Message je dokončena pouze jedním Consumerem.
---
## 13. ACK
Úspěšné dokončení:
```text
Consumer
↓
ACK
↓
Completed
```
ACK odstraní Message z aktivní Queue.
---
## 14. NACK
Neúspěšné dokončení:
```text
Consumer
↓
NACK
↓
Retry
```
NACK nikdy Message nemaže.
---
## 15. Queue API
Veřejné rozhraní:
```text
enqueue()
dequeue()
ack()
nack()
retry()
peek()
purge()
```
Veškerá práce s Queue probíhá přes toto API.
---
## 16. Integrace s Event Bus
Event Bus přenáší události.
Queue uchovává pracovní zprávy.
Například:
```text
GiftReceived Event
↓
Event Bus
↓
Create Overlay Message
↓
Overlay Queue
↓
Overlay Consumer
```
Jedná se o dvě oddělené vrstvy.
---
## 17. Bezpečnost
Message Queue Manager:
* ověřuje Producer,
* ověřuje Consumer,
* chrání Payload,
* zabraňuje duplicitnímu zpracování,
* eviduje Retry.
Každá Message má vlastní identifikátor.
---
## 18. Monitoring
MQM publikuje:
* počet Queue,
* počet Message,
* počet Retry,
* počet DLQ,
* průměrnou dobu čekání,
* počet ACK,
* počet NACK.
Monitoring sleduje vytížení všech front.
---
## 19. Audit
Audit obsahuje:
* MessageID,
* QueueID,
* Producer,
* Consumer,
* čas vytvoření,
* čas dokončení,
* RetryCount,
* výsledek.
Audit Queue je oddělen od Audit Manageru.
---
## 20. Audit Cursor
Při kontrole ověřit:
* ☐ Existuje jediný Message Queue Manager.
* ☐ Queue jsou oddělené.
* ☐ FIFO funguje.
* ☐ Priority fungují.
* ☐ Retry funguje.
* ☐ ACK funguje.
* ☐ NACK funguje.
* ☐ Dead Letter Queue existuje.
* ☐ Queue API odpovídá specifikaci.
* ☐ Monitoring všech Queue funguje.
---
## 21. Definice HOTOVO
Message Queue Manager je implementován správně pouze tehdy, když:
* všechny pracovní zprávy jsou bezpečně ukládány do front,
* každá zpráva prochází jednoznačným životním cyklem od vytvoření až po dokončení,
* systém podporuje priority, FIFO pořadí, Retry i Dead Letter Queue,
* zpracování je potvrzováno pomocí ACK a NACK mechanismů,
* Event Bus a Message Queue mají jasně oddělené role,
* Queue poskytují spolehlivou a škálovatelnou transportní vrstvu pro všechny pracovní úkoly platformy MIA.
---
## 22. Vazba na projekt MIA
Message Queue Manager zajišťuje bezpečné zpracování všech pracovních úloh v platformě MIA. Řídí fronty pro AI odpovědi, overlaye, OBS, Battle systém, inventáře, gift ekonomiku i další moduly. Díky prioritám, Retry mechanismu, ACK/NACK potvrzování a Dead Letter Queue zaručuje, že žádná důležitá úloha nebude ztracena ani při vysokém zatížení systému.
---
**Architektonická poznámka:** Dokument **0078** je věnován **Command Bus Manager**. Dokument **0079** bude věnován **Telemetry Manager**.

## Konec dokumentu 0077
