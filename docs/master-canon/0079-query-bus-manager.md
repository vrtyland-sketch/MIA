# MIA MASTER CANON
# Dokument 0079
# Query Bus Manager
---
## Metadata
| Položka            | Hodnota                                                                      |
| ------------------ | ---------------------------------------------------------------------------- |
| ID                 | MIA-0079                                                                     |
| Název              | Query Bus Manager                                                            |
| Vrstva             | Kernel Layer 0                                                               |
| Priorita           | ABSOLUTNĚ KRITICKÁ                                                           |
| Verze              | 1.0.0                                                                        |
| Stav               | ACTIVE                                                                       |
| Nadřazený dokument | 0050 – MIA Core Kernel                                                       |
| Souvisí            | 0061 – State Manager, 0075 – Event Store Manager, 0078 – Command Bus Manager |
---
## 1. Účel
Query Bus Manager (QBM) je centrální vrstva pro zpracování dotazů (Queries) v platformě MIA.
Na rozdíl od Command Bus nevykonává změny systému.
Na rozdíl od Event Bus nerozšiřuje události.
Jeho jediným úkolem je bezpečně získat informace a vrátit odpověď.
Query Bus nikdy nemění stav systému.
---
## 2. Hlavní odpovědnosti
Query Bus Manager:
* přijímá Queries,
* směruje Queries,
* vyhledává Query Handler,
* vrací odpovědi,
* ověřuje oprávnění,
* monitoruje dotazy.
---
## 3. Architektura
```text
         Query Sender
              │
              ▼
     Query Bus Manager
              │
              ▼
      Query Handler
              │
              ▼
        Read Model
              │
              ▼
          Response
```
Veškeré čtení dat probíhá přes Query Bus.
---
## 4. Co je Query
Query představuje požadavek na získání informací.
Například:
* GetInventory
* GetBattleStatus
* GetCurrentMood
* GetGiftStatistics
* GetLeaderboard
* GetHealth
* GetOverlayState
* GetRuntimeInfo
Query nikdy nic nemění.
---
## 5. Query Descriptor
Každá Query obsahuje:
```text
QueryID
QueryType
Sender
Timestamp
Payload
CorrelationID
Version
```
QueryID je globálně jedinečné.
---
## 6. Query Handler
Každá Query má právě jednoho Handlera.
Například:
```text
GetInventory
↓
Inventory Query Handler
```
nebo
```text
GetBattleStatus
↓
Battle Query Handler
```
Více Handlerů není dovoleno.
---
## 7. Read Model
Query Handler pracuje pouze s Read Model.
Workflow:
```text
Query
↓
Read Model
↓
Response
```
Read Model je optimalizovaný pouze pro čtení.
---
## 8. Routing
Query Bus automaticky vyhledá správný Handler.
```text
Query
↓
Query Bus
↓
Correct Handler
```
Odesílatel nezná implementaci Handleru.
---
## 9. Validace
Před vykonáním Query probíhá kontrola:
* typu Query,
* Payload,
* oprávnění,
* verze,
* integrity.
Neplatná Query je odmítnuta.
---
## 10. Response
Každá Query vrací Response.
Například:
```text
InventoryResponse
```
nebo
```text
BattleStatusResponse
```
nebo
```text
HealthResponse
```
Response obsahuje pouze data.
---
## 11. Query Pipeline
Každá Query prochází jednotnou pipeline.
```text
Validation
↓
Authorization
↓
Routing
↓
Handler
↓
Response
```
Pipeline je společná pro všechny Queries.
---
## 12. Integrace se State Managerem
State Manager poskytuje aktuální stav.
Query Bus tento stav pouze čte.
Nikdy jej neupravuje.
---
## 13. Integrace s Event Store
Pokud Read Model potřebuje historii:
```text
Event Store
↓
Projection
↓
Read Model
↓
Query
```
Query nikdy nečte Event Stream přímo.
---
## 14. CQRS
Platforma používá princip:
```text
Commands
↓
Write Model
≠
Queries
↓
Read Model
```
Čtení a zápis jsou zcela oddělené.
---
## 15. Query Bus API
Veřejné rozhraní:
```text
execute()
validate()
authorize()
cancel()
getResponse()
```
Veškeré Queries procházejí tímto API.
---
## 16. Bezpečnost
Query Bus Manager:
* ověřuje oprávnění,
* chrání Response,
* filtruje citlivá data,
* eviduje Query,
* chrání Read Model.
Každá Query je auditována.
---
## 17. Monitoring
Query Bus Manager publikuje:
* počet Queries,
* počet Handlerů,
* průměrnou dobu odezvy,
* počet odmítnutých Query,
* počet chyb,
* vytížení Read Modelu.
Monitoring sleduje výkon celé Query vrstvy.
---
## 18. Audit
Audit obsahuje:
* QueryID,
* Sender,
* Handler,
* čas přijetí,
* čas odpovědi,
* výsledek,
* CorrelationID.
Audit Query je oddělen od Audit Manageru.
---
## 19. Audit Cursor
Při kontrole ověřit:
* ☐ Existuje jediný Query Bus Manager.
* ☐ Každá Query má právě jednoho Handlera.
* ☐ Query nemění stav systému.
* ☐ Read Model je oddělen od Write Modelu.
* ☐ Routing funguje.
* ☐ Validace funguje.
* ☐ CQRS je dodrženo.
* ☐ Monitoring funguje.
* ☐ Audit všech Query existuje.
* ☐ Response obsahuje pouze data.
---
## 20. Definice HOTOVO
Query Bus Manager je implementován správně pouze tehdy, když:
* všechny dotazy procházejí jedinou centrální Query vrstvou,
* každá Query je směrována přesně jednomu Query Handleru,
* systém důsledně odděluje čtecí a zapisovací model podle principů CQRS,
* Query nikdy nemění stav systému ani nevytváří doménové události,
* Response jsou bezpečné, validované a optimalizované pro čtení,
* Query Bus poskytuje jednotné, rychlé a auditovatelné rozhraní pro získávání dat z celé platformy.
---
## 21. Vazba na projekt MIA
Query Bus Manager představuje jednotnou čtecí vrstvu platformy MIA. Zajišťuje bezpečné získávání informací o Battle systému, inventářích, gift ekonomice, AI, Kojnožroutech, overlayích, OBS i ostatních modulech. Díky oddělení od Command Bus a využití principu CQRS umožňuje rychlé dotazy bez ovlivnění běhu systému a vytváří stabilní základ pro dashboardy, administraci i samotnou umělou inteligenci MIA.
---
**Architektonická poznámka:** Dokument **0080** je věnován **Projection Manager**. Dokument **0081** bude věnován **Telemetry Manager**.

## Konec dokumentu 0079
