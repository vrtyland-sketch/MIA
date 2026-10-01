# MIA MASTER CANON
# Dokument 0080
# Projection Manager
---
## Metadata
| Položka            | Hodnota                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| ID                 | MIA-0080                                                                                             |
| Název              | Projection Manager                                                                                   |
| Vrstva             | Kernel Layer 0                                                                                       |
| Priorita           | ABSOLUTNĚ KRITICKÁ                                                                                   |
| Verze              | 1.0.0                                                                                                |
| Stav               | ACTIVE                                                                                               |
| Nadřazený dokument | 0050 – MIA Core Kernel                                                                               |
| Souvisí            | 0061 – State Manager, 0075 – Event Store Manager, 0076 – Event Bus Manager, 0079 – Query Bus Manager |
---
## 1. Účel
Projection Manager (PM) je centrální systém pro vytváření a správu projekcí (Read Models) z doménových událostí platformy MIA.
Jeho úkolem není vytvářet události.
Neprovádí obchodní logiku.
Nemění historii Event Store.
Jeho jedinou rolí je převádět historické Eventy do rychle čitelných datových struktur určených pro Query Bus.
---
## 2. Hlavní odpovědnosti
Projection Manager:
* přijímá Eventy,
* vytváří Read Modely,
* aktualizuje projekce,
* obnovuje projekce,
* spravuje jejich verze,
* poskytuje konzistentní data pro Query.
---
## 3. Architektura
```text
         Event Store
              │
              ▼
     Projection Manager
              │
     ┌────────┼────────┐
     │        │        │
     ▼        ▼        ▼
 Inventory  Battle   Statistics
 Projection Projection Projection
              │
              ▼
         Query Bus
```
Projection Manager tvoří most mezi historií událostí a čtecím modelem.
---
## 4. Co je Projection
Projection představuje optimalizovaný pohled na data vytvořený z Eventů.
Například:
* aktuální inventář,
* stav Battle,
* leaderboard,
* statistiky giftů,
* playlist,
* aktuální nálada Kojnožrouta.
Projection není zdrojem pravdy.
Zdroj pravdy představuje Event Store.
---
## 5. Projection Descriptor
Každá projekce obsahuje:
```text
ProjectionID
ProjectionType
SourceStream
Version
LastEvent
Created
Updated
Status
```
ProjectionID je globálně jedinečné.
---
## 6. Projection Types
Platforma podporuje například:
### Inventory Projection
---
### Battle Projection
---
### Leaderboard Projection
---
### Gift Statistics Projection
---
### Runtime Projection
---
### AI Projection
---
### Overlay Projection
Typů může být libovolný počet.
---
## 7. Aktualizace projekcí
Po přijetí nového Eventu:
```text
Event
↓
Projection Manager
↓
Projection Updated
```
Aktualizace probíhá automaticky.
---
## 8. Replay
Při obnově systému:
```text
Event Store
↓
Replay
↓
Projection Rebuild
```
Celou projekci lze kdykoliv znovu vytvořit.
---
## 9. Incremental Update
Pokud přibude nový Event:
```text
Old Projection
+
New Event
↓
Updated Projection
```
Není nutné přepočítávat celou historii.
---
## 10. Projection Versioning
Každá projekce obsahuje vlastní verzi.
Například:
```text
Inventory Projection
v12
↓
v13
```
Verze slouží ke kontrole konzistence.
---
## 11. Read Consistency
Projection Manager podporuje:
### Eventual Consistency
Read Model se aktualizuje krátce po vzniku Eventu.
Nevyžaduje okamžitou synchronizaci.
---
## 12. Projection Rebuild
Pokud je projekce poškozena:
```text
Delete Projection
↓
Replay Event Store
↓
New Projection
```
Historie Event Store zůstává nedotčena.
---
## 13. Integrace s Query Bus
Query Bus nikdy nečte Event Store přímo.
Workflow:
```text
Query
↓
Projection
↓
Response
```
Projection je jediným zdrojem dat pro Query.
---
## 14. Integrace s Event Bus
Nové Eventy mohou být přijímány přes Event Bus.
```text
Event Bus
↓
Projection Manager
↓
Projection Update
```
Event Bus pouze distribuuje.
Projection Manager vytváří Read Model.
---
## 15. Projection API
Veřejné rozhraní:
```text
createProjection()
updateProjection()
rebuildProjection()
deleteProjection()
getProjection()
```
Veškerá správa projekcí probíhá přes toto API.
---
## 16. Bezpečnost
Projection Manager:
* chrání Read Model,
* ověřuje integritu Eventů,
* blokuje neplatné aktualizace,
* eviduje změny verzí,
* odděluje Read a Write vrstvu.
Projection nelze upravovat ručně.
---
## 17. Monitoring
Projection Manager publikuje:
* počet projekcí,
* počet aktualizací,
* počet Rebuild,
* dobu aktualizace,
* počet chyb,
* počet verzí.
Monitoring sleduje konzistenci všech Read Modelů.
---
## 18. Audit
Audit obsahuje:
* ProjectionID,
* zdrojový Event,
* čas aktualizace,
* novou verzi,
* výsledek,
* CorrelationID.
Audit projekcí je oddělen od Audit Manageru.
---
## 19. Audit Cursor
Při kontrole ověřit:
* ☐ Existuje jediný Projection Manager.
* ☐ Projekce vznikají pouze z Eventů.
* ☐ Query používá pouze Projection.
* ☐ Replay funguje.
* ☐ Rebuild funguje.
* ☐ Versioning funguje.
* ☐ Incremental Update funguje.
* ☐ Projection API odpovídá specifikaci.
* ☐ Monitoring funguje.
* ☐ Audit všech změn existuje.
---
## 20. Definice HOTOVO
Projection Manager je implementován správně pouze tehdy, když:
* všechny Read Modely vznikají výhradně z doménových událostí,
* projekce lze kdykoliv kompletně obnovit pomocí Replay z Event Store,
* nové události aktualizují projekce inkrementálně bez přepočtu celé historie,
* Query Bus získává data pouze z projekcí,
* systém podporuje verzování, obnovu i sledování konzistence projekcí,
* Projection Manager poskytuje rychlou, konzistentní a bezpečnou čtecí vrstvu celé platformy.
---
## 21. Vazba na projekt MIA
Projection Manager vytváří optimalizované pohledy na data celé platformy MIA. Zajišťuje rychlé čtení informací o inventářích, Battle systému, gift ekonomice, AI, Kojnožroutech, overlayích i statistikách streamu bez přímého přístupu do Event Store. Díky automatické aktualizaci projekcí, podpoře Replay a principům CQRS umožňuje vysoký výkon, snadnou obnovu dat a dlouhodobou škálovatelnost celé architektury MIA.
---
**Architektonická poznámka:** Dokument **0081** je věnován **Saga Manager**. Dokument **0082** je **Workflow Engine**. Dokument **0083** je **Rule Engine**. Dokument **0084** je **Policy Engine**. Dokument **0085** je **Decision Engine** (Kernel). Dokument **0086** bude věnován **Telemetry Manager**.

## Konec dokumentu 0080
