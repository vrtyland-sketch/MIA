# MIA MASTER CANON
# Dokument 0081
# Saga Manager
---
## Metadata
| Položka            | Hodnota                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| ID                 | MIA-0081                                                                                                       |
| Název              | Saga Manager                                                                                                   |
| Vrstva             | Kernel Layer 0                                                                                                 |
| Priorita           | ABSOLUTNĚ KRITICKÁ                                                                                             |
| Verze              | 1.0.0                                                                                                          |
| Stav               | ACTIVE                                                                                                         |
| Nadřazený dokument | 0050 – MIA Core Kernel                                                                                         |
| Souvisí            | 0075 – Event Store Manager, 0076 – Event Bus Manager, 0077 – Message Queue Manager, 0078 – Command Bus Manager |
---
## 1. Účel
Saga Manager (SM) je centrální systém pro řízení dlouhotrvajících obchodních procesů (Sagas) v platformě MIA.
Jeho úkolem není vykonávat jednotlivé Commands.
Nevytváří obchodní logiku.
Koordinuje průběh složitých procesů rozdělených do více kroků, které mohou probíhat napříč různými moduly.
Saga Manager zajišťuje konzistenci distribuovaných procesů bez použití globálních transakcí.
---
## 2. Hlavní odpovědnosti
Saga Manager:
* spouští Sagy,
* sleduje jejich průběh,
* koordinuje jednotlivé kroky,
* reaguje na Eventy,
* spouští Commands,
* řeší kompenzační akce při chybách.
---
## 3. Architektura
```text
        Start Event
             │
             ▼
       Saga Manager
             │
     ┌───────┼────────┐
     │       │        │
     ▼       ▼        ▼
 Command  Event Bus  State
     │
     ▼
 Next Step
```
Saga představuje koordinátor procesu.
---
## 4. Co je Saga
Saga je dlouhotrvající obchodní proces složený z více navazujících kroků.
Například:
* vytvoření Battle,
* registrace hráčů,
* spuštění overlayů,
* spuštění playlistu,
* synchronizace OBS,
* ukončení Battle,
* výpočet odměn.
Každý krok může probíhat v jiném modulu.
---
## 5. Saga Descriptor
Každá Saga obsahuje:
```text
SagaID
SagaType
CurrentStep
Status
Started
Updated
CorrelationID
Version
```
SagaID je globálně jedinečné.
---
## 6. Stav Sagy
Životní cyklus:
```text
Created
↓
Running
↓
Waiting
↓
Completed
```
Při chybě:
```text
Running
↓
Compensating
↓
Failed
```
---
## 7. Saga Steps
Každá Saga obsahuje posloupnost kroků.
Například:
```text
Step 1
↓
Step 2
↓
Step 3
↓
Step 4
```
Pořadí kroků je definováno implementací Sagy.
---
## 8. Event Driven
Saga reaguje na Eventy.
Workflow:
```text
Event
↓
Saga
↓
Next Command
```
Saga sama nevytváří obchodní logiku.
Pouze rozhoduje, jaký bude další krok.
---
## 9. Command Execution
Saga spouští Commands prostřednictvím Command Bus.
```text
Saga
↓
Command Bus
↓
Handler
```
Saga nikdy nevolá Handler přímo.
---
## 10. Waiting State
Saga může čekat.
Například:
```text
Command Sent
↓
Waiting Event
↓
Continue
```
Čekání může trvat sekundy i hodiny.
---
## 11. Compensation
Pokud některý krok selže:
```text
Step 4 Failed
↓
Compensation Step
↓
Rollback
```
Kompenzační kroky vracejí systém do konzistentního stavu.
Nejedná se o databázový rollback.
---
## 12. Timeout
Saga podporuje timeout.
Například:
```text
Waiting
↓
Timeout
↓
Compensation
```
Timeout je konfigurovatelný.
---
## 13. Integrace s Event Bus
Saga přijímá Eventy přes Event Bus.
```text
Event Bus
↓
Saga Manager
↓
Next Step
```
Event Bus pouze doručuje události.
---
## 14. Integrace s Event Store
Stav Sagy lze ukládat do Event Store pomocí doménových událostí.
Například:
```text
SagaStarted
↓
SagaCompleted
↓
SagaFailed
```
Historie Sagy je plně dohledatelná.
---
## 15. Saga API
Veřejné rozhraní:
```text
startSaga()
resumeSaga()
cancelSaga()
completeSaga()
compensateSaga()
getSaga()
```
Veškeré řízení Sag probíhá přes toto API.
---
## 16. Bezpečnost
Saga Manager:
* ověřuje platnost kroků,
* chrání stav Sagy,
* eviduje přechody,
* blokuje duplicitní spuštění,
* podporuje obnovu po pádu systému.
Každá Saga je jednoznačně identifikována.
---
## 17. Monitoring
Saga Manager publikuje:
* počet aktivních Sag,
* počet dokončených Sag,
* počet kompenzací,
* počet timeoutů,
* průměrnou dobu běhu,
* počet selhání.
Monitoring sleduje všechny dlouhotrvající procesy.
---
## 18. Audit
Audit obsahuje:
* SagaID,
* typ,
* aktuální krok,
* čas změny,
* výsledek,
* CorrelationID.
Audit Sagy je oddělen od Audit Manageru.
---
## 19. Audit Cursor
Při kontrole ověřit:
* ☐ Existuje jediný Saga Manager.
* ☐ Saga koordinuje pouze proces.
* ☐ Commands jsou spouštěny přes Command Bus.
* ☐ Eventy přicházejí přes Event Bus.
* ☐ Waiting funguje.
* ☐ Timeout funguje.
* ☐ Compensation funguje.
* ☐ Stav Sagy lze obnovit.
* ☐ Monitoring funguje.
* ☐ Audit všech kroků existuje.
---
## 20. Definice HOTOVO
Saga Manager je implementován správně pouze tehdy, když:
* koordinuje dlouhotrvající obchodní procesy napříč více moduly,
* jednotlivé kroky jsou řízeny pomocí Commands a Eventů,
* podporuje čekání na události, timeouty i kompenzační akce,
* při chybách vrací systém do konzistentního stavu bez použití globálních transakcí,
* průběh každé Sagy je plně dohledatelný a obnovitelný,
* poskytuje robustní orchestraci distribuovaných procesů celé platformy MIA.
---
## 21. Vazba na projekt MIA
Saga Manager řídí všechny složité vícekrokové procesy platformy MIA, například průběh Battle systému, synchronizaci overlayů s OBS, správu playlistů, AI workflow, inventáře i další distribuované operace. Díky koordinaci přes Command Bus a Event Bus, podpoře kompenzačních kroků a možnosti obnovy po výpadku zajišťuje konzistentní a spolehlivý průběh všech dlouhotrvajících procesů v celé platformě.
---
**Architektonická poznámka:** Dokument **0082** je **Workflow Engine**. Dokument **0083** je **Rule Engine**. Dokument **0084** je **Policy Engine**. Dokument **0085** je **Decision Engine** (Kernel). Dokument **0086** bude věnován **Telemetry Manager**.

## Konec dokumentu 0081
