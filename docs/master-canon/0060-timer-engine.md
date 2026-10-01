# MIA MASTER CANON
# Dokument 0060
# Timer Engine
---
## Metadata
| Položka            | Hodnota                                      |
| ------------------ | -------------------------------------------- |
| ID                 | MIA-0060                                     |
| Název              | Timer Engine                                 |
| Vrstva             | Kernel Layer 0                               |
| Priorita           | KRITICKÁ                                     |
| Verze              | 1.0.0                                        |
| Stav               | ACTIVE                                       |
| Nadřazený dokument | 0050 – MIA Core Kernel                       |
| Souvisí            | 0058 – Task Scheduler, 0059 – Thread Manager |
---
## 1. Účel
Timer Engine (TE) je centrální systém pro správu času v celé platformě MIA.
Veškeré časově řízené události musí být plánovány prostřednictvím Timer Engine.
Žádná část systému nesmí používat přímo:
* `setTimeout()`
* `setInterval()`
* vlastní nekontrolované časovače
v produkčním kódu.
Timer Engine poskytuje jednotný, auditovatelný a přesný systém plánování.
---
## 2. Hlavní odpovědnosti
Timer Engine:
* vytváří časovače,
* ruší časovače,
* pozastavuje časovače,
* obnovuje časovače,
* plánuje jednorázové i opakované události,
* synchronizuje čas mezi moduly,
* poskytuje centrální časovou základnu.
---
## 3. Architektura
```text
                  Timer Engine
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
 One Shot         Repeating       Scheduled
   Timer             Timer           Timer
        │               │               │
        └───────────────┼───────────────┘
                        ▼
                 Task Scheduler
                        ▼
                  Process Manager
```
---
## 4. Typy časovačů
### One Shot
Jednorázová událost.
Příklad:
* zavření notifikace,
* přehrání zvuku.
---
### Repeating
Pravidelné opakování.
Například:
* Health Check,
* Monitoring,
* Watchdog.
---
### Scheduled
Událost spuštěná v přesném čase.
Například:
* plánovaný stream,
* denní záloha,
* reset statistik.
---
### Delayed
Úloha spuštěná po definované prodlevě.
Například:
* animace,
* čekání mezi akcemi.
---
## 5. Timer Descriptor
Každý časovač obsahuje:
```text
TimerID
Type
Owner
StartTime
NextExecution
Interval
RepeatCount
Status
Priority
```
Každý TimerID je jedinečný.
---
## 6. Životní cyklus
```text
CREATED
↓
SCHEDULED
↓
WAITING
↓
RUNNING
↓
COMPLETED
```
Při opakování:
```text
RUNNING
↓
WAITING
↓
RUNNING
```
Při zrušení:
```text
CANCELLED
```
---
## 7. Přesnost
Timer Engine používá monotónní systémový čas.
Nepoužívá lokální čas operačního systému pro měření intervalů.
Tím je zajištěna odolnost proti:
* změně systémového času,
* změně časové zóny,
* synchronizaci hodin.
---
## 8. Časová synchronizace
Všechny moduly používají jediný zdroj času.
Například:
* Battle,
* AI,
* OBS,
* Overlay,
* Inventory,
* Memory.
Tím se zabrání rozdílnému měření času.
---
## 9. Intervaly
Timer Engine podporuje:
* milisekundy,
* sekundy,
* minuty,
* hodiny,
* dny.
Intervaly jsou reprezentovány jednotným interním formátem.
---
## 10. Opakování
Možnosti:
* nekonečné,
* pevný počet opakování,
* do určitého času,
* do splnění podmínky.
Po splnění podmínky je časovač automaticky ukončen.
---
## 11. Priority
| Priorita   | Použití      |
| ---------- | ------------ |
| CRITICAL   | Recovery     |
| HIGH       | Health Check |
| NORMAL     | Gameplay     |
| LOW        | Overlay      |
| BACKGROUND | Statistiky   |
Při přetížení mají přednost kritické časovače.
---
## 12. Integrace s Task Schedulerem
Po vypršení časovače:
```text
Timer Expired
↓
Task Created
↓
Task Scheduler
↓
Worker
↓
Execution
```
Timer Engine nikdy nevykonává úlohy přímo.
---
## 13. Integrace s Battle
Battle využívá Timer Engine například pro:
* cooldown schopností,
* délku kol,
* odpočítávání,
* efekty,
* časové bonusy.
Všechny herní časovače jsou registrovány.
---
## 14. Integrace s OBS
Timer Engine řídí:
* délku animací,
* přechody scén,
* zobrazení overlayů,
* přehrávání videí,
* automatické skrytí prvků.
---
## 15. Integrace s AI
AI využívá Timer Engine pro:
* plánované odpovědi,
* připomínky,
* pravidelné kontroly,
* automatické akce.
---
## 16. Monitoring
Timer Engine sleduje:
* počet aktivních časovačů,
* zpoždění,
* počet opakování,
* zrušené časovače,
* nejdelší běžící časovače.
---
## 17. Audit
Každý časovač zapisuje:
* vytvoření,
* změnu intervalu,
* spuštění,
* dokončení,
* zrušení,
* vlastníka.
Auditní historie je uchována.
---
## 18. Bezpečnost
Timer Engine:
* zabraňuje duplicitním TimerID,
* blokuje nekonečné smyčky,
* chrání Kernel časovače,
* kontroluje limity počtu aktivních časovačů,
* zabraňuje přetečení plánovače.
---
## 19. Audit Cursor
Při kontrole ověřit:
* ☐ Existuje jediný Timer Engine.
* ☐ Nepoužívá se přímé `setTimeout()` ani `setInterval()` mimo Timer Engine.
* ☐ Všechny časovače mají TimerID.
* ☐ Časovače jsou registrovány.
* ☐ Battle používá Timer Engine.
* ☐ OBS používá Timer Engine.
* ☐ AI používá Timer Engine.
* ☐ Timer Engine spolupracuje s Task Schedulerem.
* ☐ Monitoring funguje.
* ☐ Auditní historie existuje.
---
## 20. Definice HOTOVO
Timer Engine je implementován správně pouze tehdy, když:
* všechny časově řízené operace používají centrální Timer Engine,
* systém poskytuje jednotný zdroj času pro všechny moduly,
* časovače podporují jednorázové, opakované i plánované události,
* Timer Engine nevykonává úlohy přímo, ale předává je Task Scheduleru,
* časovače jsou auditovatelné, monitorované a bezpečně ukončované,
* změna systémového času ani časové zóny nenaruší běh platformy.
---
## 21. Vazba na projekt MIA
Timer Engine je časovou páteří celé platformy MIA. Synchronizuje AI, Battle systém, Kojnožrouty, OBS, overlaye, platformní konektory i budoucí herní moduly. Díky jednotnému plánování času zajišťuje konzistentní chování celé platformy bez ohledu na výkon počítače, délku streamu nebo počet současně běžících systémů.
---
**Architektonická poznámka:** Dokument **0061** bude věnován **Runtime Health & Watchdog**.

## Konec dokumentu 0060
