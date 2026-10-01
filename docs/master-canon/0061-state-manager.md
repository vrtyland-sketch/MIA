# MIA MASTER CANON
# Dokument 0061
# State Manager
---
## Metadata
| Položka            | Hodnota                                                            |
| ------------------ | ------------------------------------------------------------------ |
| ID                 | MIA-0061                                                           |
| Název              | State Manager                                                      |
| Vrstva             | Kernel Layer 0                                                     |
| Priorita           | ABSOLUTNĚ KRITICKÁ                                                 |
| Verze              | 1.0.0                                                              |
| Stav               | ACTIVE                                                             |
| Nadřazený dokument | 0050 – MIA Core Kernel                                             |
| Souvisí            | 0053 – Service Manager, 0058 – Task Scheduler, 0060 – Timer Engine |
---
## 1. Účel
State Manager (SM) je centrální správce všech stavů (States) platformy MIA.
Je jedinou autoritou, která:
* eviduje aktuální stav systému,
* řídí přechody mezi stavy,
* validuje změny stavů,
* synchronizuje stav mezi moduly,
* uchovává historii změn.
Každý modul MIA musí používat jednotný stavový model.
---
## 2. Hlavní odpovědnosti
State Manager:
* registruje nové stavové objekty,
* mění jejich stav,
* kontroluje povolené přechody,
* publikuje změny přes Event Bus,
* uchovává historii,
* obnovuje stav po restartu (je-li podporováno).
---
## 3. Architektura
```text
                  State Manager
                        │
      ┌─────────────────┼─────────────────┐
      │                 │                 │
      ▼                 ▼                 ▼
 System States    Service States    Game States
      │                 │                 │
      └─────────────────┼─────────────────┘
                        ▼
                    Event Bus
                        ▼
                  Interested Modules
```
State Manager je jediný centrální registr stavů.
---
## 4. Co je State
State představuje aktuální stav objektu.
Příklady:
* stav Kernelu,
* stav služby,
* stav Battle,
* stav Kojnožrouta,
* stav MIA,
* stav OBS,
* stav platformního konektoru.
---
## 5. State Descriptor
Každý stav obsahuje minimálně:
```text
StateID
Owner
CurrentState
PreviousState
Version
Timestamp
Source
LastModified
```
Každý StateID je jedinečný.
---
## 6. Typy stavů
### System State
Například:
* STARTING
* READY
* PAUSED
* SAFE_MODE
* SHUTDOWN
---
### Service State
Například:
* RUNNING
* FAILED
* STOPPED
---
### Module State
Například:
* LOADED
* UNLOADED
* UPDATING
---
### Gameplay State
Například:
* Battle
* Economy
* Quest
* Story
---
### Entity State
Například:
* MIA
* Kojnožrout
* NPC
* Boss
---
## 7. Životní cyklus stavu
Příklad obecného modelu:
```text
CREATED
↓
INITIALIZED
↓
READY
↓
ACTIVE
↓
PAUSED
↓
STOPPING
↓
STOPPED
```
Při chybě:
```text
FAILED
```
Každý modul může mít vlastní podmnožinu stavů.
---
## 8. State Machine
Každý objekt používá definovanou State Machine.
Například:
```text
READY
↓
ACTIVE
↓
PAUSED
↓
ACTIVE
↓
STOPPED
```
Přechody mimo definovanou State Machine nejsou povoleny.
---
## 9. Validace přechodů
State Manager ověřuje:
* zda je přechod povolen,
* zda jsou splněny podmínky,
* zda nejsou porušeny závislosti.
Neplatný přechod je zamítnut a zalogován.
---
## 10. State Events
Každá změna stavu generuje událost.
Například:
```text
StateChanged
↓
Event Bus
↓
Subscribers
```
Ostatní moduly reagují na změny prostřednictvím Event Bus.
---
## 11. Historie stavů
State Manager uchovává:
* předchozí stav,
* nový stav,
* čas změny,
* zdroj změny,
* důvod změny.
Historie slouží pro audit a diagnostiku.
---
## 12. Obnova stavu
Vybrané stavy lze obnovit po restartu.
Například:
* konfigurace,
* aktivní Feature Flags,
* stav některých dlouhodobých modulů.
Krátkodobé provozní stavy (např. běžící Battle) se po restartu standardně neobnovují, pokud není definována speciální strategie.
---
## 13. Synchronizace
State Manager zajišťuje, že všechny moduly pracují se stejnou verzí stavu.
Například:
```text
Battle State
↓
State Manager
↓
Overlay
↓
OBS
↓
Chat
```
Tím se zabrání nekonzistentním zobrazením.
---
## 14. Monitoring
State Manager sleduje:
* počet registrovaných stavů,
* počet změn za minutu,
* neplatné přechody,
* nejčastější změny,
* dobu mezi změnami.
---
## 15. Integrace s AI
AI moduly mohou sledovat změny stavů.
Například:
```text
Battle Started
↓
State Event
↓
Conversation Engine
↓
MIA reaguje
```
AI nikdy nemění stav přímo bez schváleného API.
---
## 16. Integrace s Battle
Battle systém registruje například:
* WAITING
* STARTING
* ACTIVE
* FINISHED
* REWARD
Každý přechod je validován.
---
## 17. Bezpečnost
State Manager:
* blokuje neplatné přechody,
* chrání systémové stavy,
* zabraňuje přímé manipulaci se stavy,
* eviduje všechny změny.
Pouze autorizované moduly mohou měnit stav.
---
## 18. Audit Cursor
Při kontrole ověřit:
* ☐ Existuje centrální State Manager.
* ☐ Každý stav má StateID.
* ☐ State Machine je definována.
* ☐ Přechody jsou validovány.
* ☐ Historie změn existuje.
* ☐ Event Bus publikuje změny.
* ☐ Synchronizace stavů funguje.
* ☐ AI využívá State Events.
* ☐ Battle používá State Manager.
* ☐ Neplatné přechody jsou blokovány.
---
## 19. Definice HOTOVO
State Manager je implementován správně pouze tehdy, když:
* všechny důležité části platformy používají centrální správu stavů,
* každý stav má jednoznačnou State Machine,
* přechody jsou validovány před provedením,
* změny stavů jsou publikovány přes Event Bus,
* historie změn je auditovatelná,
* synchronizace zajišťuje konzistentní pohled všech modulů na aktuální stav systému.
---
## 20. Vazba na projekt MIA
State Manager tvoří jednotný jazyk celé platformy MIA. Díky němu AI, Battle systém, Kojnožrouti, OBS, overlaye i platformní konektory vždy pracují se stejnou informací o aktuálním stavu. To je nezbytné pro správnou koordinaci složitých interakcí mezi moduly, budoucí podporu více AI agentů i rozšiřování systému o nové hry a platformy.
---
**Architektonická poznámka:** Dokument **0062** bude věnován **Runtime Health & Watchdog**.

## Konec dokumentu 0061
