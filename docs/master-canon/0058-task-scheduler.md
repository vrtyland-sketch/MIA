# MIA MASTER CANON
# Dokument 0058
# Task Scheduler
---
## Metadata
| Položka            | Hodnota                                         |
| ------------------ | ----------------------------------------------- |
| ID                 | MIA-0058                                        |
| Název              | Task Scheduler                                  |
| Vrstva             | Kernel Layer 0                                  |
| Priorita           | ABSOLUTNĚ KRITICKÁ                              |
| Verze              | 1.0.0                                           |
| Stav               | ACTIVE                                          |
| Nadřazený dokument | 0050 – MIA Core Kernel                          |
| Souvisí            | 0056 – Resource Manager, 0057 – Process Manager |
---
## 1. Účel
Task Scheduler (TS) je centrální plánovač všech úloh (Tasks) v platformě MIA.
Je zodpovědný za:
* plánování úloh,
* určování pořadí vykonání,
* rozdělování práce mezi procesy,
* řízení priorit,
* správu front,
* prevenci přetížení systému.
Task Scheduler neprovádí úlohy přímo. Jeho úkolem je rozhodnout **kdy**, **kde** a **v jakém pořadí** budou vykonány.
---
## 2. Rozdíl mezi Task a Process
### Process
Dlouhodobě běžící vykonávací jednotka.
Například:
* Battle Engine
* Speech Worker
* OBS Connector
---
### Task
Jednotlivá práce určená ke zpracování.
Například:
* odpověď do chatu,
* přehrání videa,
* výpočet Battle,
* uložení do Memory,
* aktualizace overlaye.
Jeden proces může vykonat tisíce Tasků.
---
## 3. Architektura
```text
                Task Scheduler
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
 Priority Queue   Worker Pool   Delayed Queue
        │              │              │
        └──────────────┼──────────────┘
                       ▼
                Process Manager
                       ▼
                 Running Processes
```
Task Scheduler je jediný plánovač úloh v systému.
---
## 4. Životní cyklus Tasku
Každý Task prochází následujícími stavy:
```text
CREATED
↓
QUEUED
↓
SCHEDULED
↓
RUNNING
↓
COMPLETED
```
Při problému:
```text
FAILED
```
Nebo:
```text
CANCELLED
```
---
## 5. Task Descriptor
Každý Task obsahuje minimálně:
```text
TaskID
Type
Owner
Priority
CreatedTime
ScheduledTime
Timeout
Retries
Dependencies
Status
```
Každý Task má jedinečné TaskID.
---
## 6. Priority Tasků
| Priorita   | Příklad   |
| ---------- | --------- |
| CRITICAL   | Recovery  |
| HIGH       | Event Bus |
| NORMAL     | Battle    |
| LOW        | Overlay   |
| BACKGROUND | Údržba    |
Vyšší priorita má přednost před nižší.
---
## 7. Fronty
Task Scheduler spravuje několik front.
### Immediate Queue
Úkoly vykonané okamžitě.
---
### Priority Queue
Řazení podle priority.
---
### Delayed Queue
Úkoly spuštěné po určitém čase.
---
### Scheduled Queue
Úkoly plánované na konkrétní čas.
---
### Retry Queue
Úkoly čekající na opětovné spuštění.
---
## 8. Typy Tasků
### System Task
Kernel.
---
### Service Task
Jednotlivé služby.
---
### AI Task
Inference, plánování, odpovědi.
---
### Gameplay Task
Battle.
Economy.
Inventory.
---
### Platform Task
TikTok.
Kick.
OBS.
---
### Maintenance Task
Čištění cache.
Backup.
Log Rotation.
---
## 9. Scheduling Policy
Scheduler podporuje více strategií.
Například:
* Priority First
* FIFO
* Round Robin
* Deadline First
* Weighted Fair Queue
Výchozí strategie je konfigurovatelná.
---
## 10. Paralelní vykonávání
Tasky bez vzájemných závislostí mohou běžet současně.
Například:
```text
Overlay Update
+
Speech Synthesis
+
Battle Calculation
```
To zvyšuje výkon systému.
---
## 11. Timeout
Každý Task má vlastní timeout.
Po jeho překročení:
```text
Timeout
↓
Cancel
↓
Retry
↓
Recovery
```
Timeouty jsou definovány konfigurací.
---
## 12. Retry Policy
Každý Task může mít:
* žádný retry,
* pevný počet pokusů,
* exponenciální prodlevu,
* vlastní strategii.
Po vyčerpání pokusů je označen jako FAILED.
---
## 13. Závislosti Tasků
Task může čekat na dokončení jiných Tasků.
Například:
```text
Speech
↓
Overlay
↓
Animation
```
Scheduler zajistí správné pořadí.
---
## 14. Worker Pool
Task Scheduler spolupracuje s Worker Poolem.
Například:
```text
Priority Queue
↓
Worker 1
Worker 2
Worker 3
Worker 4
```
Počet Workerů je dynamicky nastavitelný.
---
## 15. Monitoring
Scheduler sleduje:
* počet aktivních Tasků,
* délku front,
* průměrnou čekací dobu,
* počet Retry,
* počet Failed Tasků,
* vytížení Workerů.
---
## 16. Přetížení
Pokud dojde k přetížení:
Scheduler může:
* odložit nízkou prioritu,
* sloučit podobné Tasky,
* odmítnout volitelné úkoly,
* aktivovat nouzový režim.
Kernel Tasky mají vždy přednost.
---
## 17. Audit
Každý Task zapisuje:
* vytvoření,
* zařazení do fronty,
* spuštění,
* dokončení,
* chybu,
* zrušení.
Auditní historie je uchována po celou dobu běhu.
---
## 18. Bezpečnost
Task Scheduler:
* nedovolí duplicitní TaskID,
* zabraňuje nekonečným Retry smyčkám,
* chrání Kernel Tasky,
* kontroluje oprávnění před spuštěním Tasku,
* zabraňuje přetečení front.
---
## 19. Audit Cursor
Při kontrole ověřit:
* ☐ Existuje jediný Task Scheduler.
* ☐ Všechny Tasky mají TaskID.
* ☐ Fronty fungují správně.
* ☐ Priority jsou respektovány.
* ☐ Worker Pool spolupracuje se Schedulerem.
* ☐ Timeouty fungují.
* ☐ Retry Policy funguje.
* ☐ Přetížení je řešeno.
* ☐ Auditní log zaznamenává celý životní cyklus Tasku.
* ☐ Kernel Tasky mají nejvyšší prioritu.
---
## 20. Definice HOTOVO
Task Scheduler je implementován správně pouze tehdy, když:
* všechny úlohy procházejí jeho plánováním,
* pořadí vykonání odpovídá definovaným prioritám,
* fronty a Worker Pool jsou řízeny centrálně,
* timeouty a Retry Policy fungují podle konfigurace,
* systém zvládá paralelní zpracování bez porušení závislostí,
* přetížení je detekováno a řízeno bez ohrožení Kernelu.
---
## 21. Vazba na projekt MIA
Task Scheduler je časovým koordinátorem celé platformy MIA. Řídí vykonávání tisíců úloh – od odpovědí AI přes Battle výpočty, aktualizace overlayů až po komunikaci s TikTokem, Kickem a OBS. Díky centralizovanému plánování, prioritám a řízení front zajišťuje plynulý chod MIA i při extrémní zátěži během streamů a budoucím rozšíření o další platformy, hry a AI agenty.
---
**Architektonická poznámka:** Dokument **0059** bude věnován **Runtime Health & Watchdog**.

## Konec dokumentu 0058
