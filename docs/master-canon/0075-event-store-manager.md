# MIA MASTER CANON
# Dokument 0075
# Event Store Manager
---
## Metadata
| Položka            | Hodnota                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------- |
| ID                 | MIA-0075                                                                                  |
| Název              | Event Store Manager                                                                       |
| Vrstva             | Kernel Layer 0                                                                            |
| Priorita           | ABSOLUTNĚ KRITICKÁ                                                                        |
| Verze              | 1.0.0                                                                                     |
| Stav               | ACTIVE                                                                                    |
| Nadřazený dokument | 0050 – MIA Core Kernel                                                                    |
| Souvisí            | 0058 – Task Scheduler, 0061 – State Manager, 0071 – Logging Manager, 0074 – Audit Manager |
---
## 1. Účel
Event Store Manager (ESM) je centrální systém pro trvalé ukládání všech doménových událostí platformy MIA.
Na rozdíl od Logging Manageru neukládá provozní logy.
Na rozdíl od Audit Manageru neukládá administrativní historii.
Jeho úkolem je uchovávat samotné obchodní (doménové) události systému tak, aby bylo možné zpětně rekonstruovat průběh činnosti jednotlivých objektů.
---
## 2. Hlavní odpovědnosti
Event Store Manager:
* ukládá doménové události,
* zachovává jejich pořadí,
* vytváří historii objektů,
* umožňuje přehrání událostí,
* podporuje obnovu stavu,
* poskytuje Event Store API.
---
## 3. Architektura
```text
            Domain Components
                    │
                    ▼
           Event Store Manager
                    │
        ┌───────────┼────────────┐
        │           │            │
        ▼           ▼            ▼
   Event Store  Event Index  Replay Engine
                    │
                    ▼
             State Reconstruction
```
Event Store Manager je jediným vlastníkem uložených doménových událostí.
---
## 4. Co je Domain Event
Domain Event představuje skutečnost, která změnila stav některého objektu platformy.
Například:
* BattleStarted
* BattleFinished
* GiftReceived
* InventoryItemAdded
* SongQueued
* AIConversationStarted
* AvatarChanged
* MissionCompleted
Událost popisuje to, co se již stalo.
---
## 5. Event Descriptor
Každá událost obsahuje:
```text
EventID
AggregateID
AggregateType
EventType
Version
Timestamp
Payload
CorrelationID
RuntimeID
```
EventID je globálně jedinečné.
---
## 6. Aggregate
Každá událost patří jednomu Aggregate.
Například:
```text
Battle
↓
BattleStarted
↓
GiftReceived
↓
BattleFinished
```
Nebo
```text
Inventory
↓
ItemAdded
↓
ItemUsed
↓
ItemRemoved
```
Historie Aggregate vzniká posloupností jeho událostí.
---
## 7. Event Stream
Události jsou ukládány do Event Streamů.
Například:
```text
Battle-001
↓
Event 1
↓
Event 2
↓
Event 3
↓
Event 4
```
Pořadí událostí je neměnné.
---
## 8. Event Ordering
Platforma garantuje:
* správné pořadí,
* monotonicky rostoucí verze,
* konzistenci Event Streamu.
Události nelze mezi sebou přeskupovat.
---
## 9. Event Replay
Event Store podporuje přehrání historie.
Workflow:
```text
Event Stream
↓
Replay
↓
State Reconstruction
```
Replay umožňuje znovu vytvořit stav objektu od jeho vzniku.
---
## 10. Snapshot Integration
Při dlouhých Event Streamech lze použít Snapshot.
Workflow:
```text
Snapshot
+
Remaining Events
↓
Current State
```
Snapshot je optimalizační mechanismus.
Úplnou historii stále tvoří Event Stream.
---
## 11. Versioning
Každý Event obsahuje verzi.
Například:
```text
GiftReceived
v1
↓
GiftReceived
v2
```
Starší Eventy zůstávají zachovány.
---
## 12. Integrace se State Managerem
State Manager vytváří aktuální stav.
Event Store uchovává historii změn.
State není primárním zdrojem historie.
Historii představují Eventy.
---
## 13. Integrace s Logging Managerem
Logging Manager zapisuje provozní logy.
Event Store ukládá pouze doménové události.
Oba systémy mají odlišný účel.
---
## 14. Integrace s Audit Managerem
Audit Manager zaznamenává administrativní operace.
Event Store zaznamenává obchodní změny.
Například:
```text
Admin vytvořil Battle
↓
Audit
BattleStarted
↓
Event Store
```
---
## 15. Event Store API
Veřejné rozhraní:
```text
appendEvent()
loadStream()
loadAggregate()
replay()
createSnapshot()
```
Zápis probíhá pouze přes `appendEvent()`.
---
## 16. Archivace
Historické Event Streamy mohou být archivovány.
Archivace:
* zachovává pořadí,
* zachovává verze,
* zachovává integritu.
Replay musí být možný i z archivovaných dat.
---
## 17. Bezpečnost
Event Store Manager:
* chrání Event Streamy,
* ověřuje integritu,
* blokuje přepisování Eventů,
* eviduje přístupy,
* podporuje dlouhodobou archivaci.
Události jsou po uložení neměnné.
---
## 18. Monitoring
Event Store Manager publikuje:
* počet Eventů,
* počet Streamů,
* počet Replay,
* počet Snapshotů,
* velikost Event Store,
* rychlost zápisu.
Monitoring sleduje i výkon Replay Engine.
---
## 19. Audit Cursor
Při kontrole ověřit:
* ☐ Existuje jediný Event Store Manager.
* ☐ Domain Eventy jsou ukládány v neměnném pořadí.
* ☐ Aggregate obsahují vlastní Event Stream.
* ☐ Replay funguje.
* ☐ Snapshoty pouze optimalizují načítání.
* ☐ Versioning Eventů je implementován.
* ☐ State Manager využívá Event Stream.
* ☐ Logging a Audit jsou oddělené od Event Store.
* ☐ Event Store API odpovídá specifikaci.
* ☐ Archivace zachovává Replay.
---
## 20. Definice HOTOVO
Event Store Manager je implementován správně pouze tehdy, když:
* všechny doménové události jsou ukládány chronologicky do neměnných Event Streamů,
* každý Aggregate má úplnou historii svých změn,
* aktuální stav lze kdykoli znovu vytvořit pomocí Replay,
* Snapshoty slouží pouze jako optimalizace načítání,
* Eventy podporují verzování bez ztráty zpětné kompatibility,
* Event Store tvoří dlouhodobý historický zdroj pravdy o obchodních událostech platformy.
---
## 21. Vazba na projekt MIA
Event Store Manager uchovává kompletní historii všech doménových událostí platformy MIA – od Battle systému přes inventáře, gift ekonomiku, playlisty, AI konverzace až po interakce Kojnožroutů. Díky Replay mechanismu umožňuje kdykoliv rekonstruovat stav jednotlivých objektů, analyzovat jejich vývoj a poskytuje pevný základ pro dlouhodobou rozšiřitelnost celé platformy.
---
**Architektonická poznámka:** Dokument **0076** je věnován **Event Bus Manager**. Dokument **0077** bude věnován **Telemetry Manager**.

## Konec dokumentu 0075
