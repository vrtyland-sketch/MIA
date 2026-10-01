# MIA MASTER CANON
# Dokument 0057
# Process Manager
---
## Metadata
| Položka            | Hodnota                                         |
| ------------------ | ----------------------------------------------- |
| ID                 | MIA-0057                                        |
| Název              | Process Manager                                 |
| Vrstva             | Kernel Layer 0                                  |
| Priorita           | ABSOLUTNĚ KRITICKÁ                              |
| Verze              | 1.0.0                                           |
| Stav               | ACTIVE                                          |
| Nadřazený dokument | 0050 – MIA Core Kernel                          |
| Souvisí            | 0053 – Service Manager, 0056 – Resource Manager |
---
## 1. Účel
Process Manager (PM) je zodpovědný za správu všech běžících procesů platformy MIA.
Na rozdíl od **Service Manageru**, který spravuje logické služby, Process Manager řídí jejich skutečné vykonávání.
Jeho úlohou je:
* vytvářet procesy,
* ukončovat procesy,
* restartovat procesy,
* monitorovat procesy,
* izolovat procesy,
* předcházet jejich zablokování.
Každý běžící proces platformy MIA musí být registrován v Process Manageru.
---
## 2. Rozdíl mezi službou a procesem
### Service
Popisuje **co systém dělá**.
Například:
* Battle Engine
* Memory Engine
* OBS Connector
---
### Process
Popisuje **jak a kde právě běží**.
Jedna služba může používat více procesů.
Například:
```text
Speech Service
├── Speech Worker 1
├── Speech Worker 2
└── Speech Queue Process
```
---
## 3. Architektura
```text
                Service Manager
                       │
                       ▼
               Process Manager
                       │
      ┌────────────────┼────────────────┐
      │                │                │
      ▼                ▼                ▼
 Runtime Process   Worker Process   External Process
```
---
## 4. Typy procesů
## Kernel Process
Nejdůležitější procesy.
Například:
* Runtime
* Recovery
* Watchdog
---
## Worker Process
Provádí výpočty.
Například:
* AI
* Speech
* Rendering
---
## IO Process
Komunikuje se světem.
Například:
* TikTok
* Kick
* OBS
* Discord
---
## Background Process
Provádí údržbu.
Například:
* Cache Cleanup
* Backup
* Log Rotation
---
## 5. Process Descriptor
Každý proces obsahuje:
```text
ProcessID
ParentProcess
OwnerService
Priority
Status
CPU
RAM
StartTime
RestartCount
```
Každý proces má jedinečné ProcessID.
---
## 6. Životní cyklus procesu
```text
CREATED
↓
STARTING
↓
RUNNING
↓
WAITING
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
---
## 7. Vytvoření procesu
Každý proces vzniká tímto postupem:
```text
Service Request
↓
Validation
↓
Resource Allocation
↓
Process Creation
↓
Registration
↓
RUNNING
```
Bez registrace nesmí proces běžet.
---
## 8. Izolace procesů
Každý proces běží izolovaně.
Příklad:
```text
Speech FAILED
↓
Battle RUNNING
↓
OBS RUNNING
↓
Memory RUNNING
```
Selhání jednoho procesu nesmí poškodit ostatní.
---
## 9. Priorita procesů
| Priorita   | Použití   |
| ---------- | --------- |
| CRITICAL   | Kernel    |
| HIGH       | Event Bus |
| NORMAL     | AI        |
| LOW        | Overlay   |
| BACKGROUND | Údržba    |
Vyšší priorita znamená přednost při plánování.
---
## 10. Restart procesů
Každý proces má Restart Policy.
Například:
* nikdy,
* okamžitě,
* po prodlevě,
* exponenciální čekání,
* pouze přes Recovery Manager.
Počet restartů je omezen.
---
## 11. Zombie procesy
Process Manager pravidelně kontroluje:
* proces bez vlastníka,
* proces bez aktivity,
* proces čekající příliš dlouho,
* proces bez odpovědi.
Takové procesy jsou označeny jako Zombie.
Zombie proces je ukončen nebo předán Recovery Manageru.
---
## 12. Deadlock Detection
Manager sleduje:
* vzájemné blokování,
* čekání na zdroj,
* čekání na Event,
* nekonečné smyčky.
Při detekci:
* log,
* izolace,
* Recovery.
---
## 13. Monitoring
Každý proces publikuje:
* CPU,
* RAM,
* dobu běhu,
* počet restartů,
* počet chyb,
* stav,
* latenci.
Monitoring využívá Watchdog.
---
## 14. Resource Management
Před spuštěním procesu musí být rezervovány:
* RAM,
* CPU,
* fronty,
* síťové prostředky,
* cache.
Pokud není dostatek prostředků:
Proces se nespustí.
---
## 15. Integrace s Worker Pool
AI a další výpočetně náročné části mohou používat Worker Pool.
Například:
```text
Decision Engine
↓
Worker Pool
↓
Worker 1
Worker 2
Worker 3
```
Počet Workerů je konfigurovatelný.
---
## 16. Integrace s externími procesy
Externí procesy:
* OBS
* FFmpeg
* AI Runtime
* Databáze
jsou monitorovány stejně jako interní procesy.
---
## 17. Audit
Každá změna procesu zapisuje:
* čas,
* důvod,
* ProcessID,
* OwnerService,
* akci,
* výsledek.
Auditní historie je neměnná.
---
## 18. Bezpečnost
Process Manager:
* blokuje duplicitní ProcessID,
* nedovolí spuštění bez vlastníka,
* chrání Kernel procesy,
* omezuje počet restartů,
* zabraňuje nekonečnému vytváření procesů.
---
## 19. Audit Cursor
Při kontrole ověřit:
* ☐ Existuje centrální Process Manager.
* ☐ Všechny procesy mají ProcessID.
* ☐ Každý proces má vlastníka.
* ☐ Zombie procesy jsou detekovány.
* ☐ Deadlock Detection funguje.
* ☐ Restart Policy funguje.
* ☐ Resource Allocation probíhá před spuštěním.
* ☐ Monitoring procesů funguje.
* ☐ Externí procesy jsou sledovány.
* ☐ Auditní log zaznamenává všechny změny.
---
## 20. Definice HOTOVO
Process Manager je implementován správně pouze tehdy, když:
* každý proces je registrován a má vlastní životní cyklus,
* žádný proces neběží bez přiřazené služby,
* systém detekuje zombie procesy i deadlocky,
* restartovací politika zabraňuje nekonečným restartům,
* přidělení prostředků probíhá před spuštěním,
* selhání jednoho procesu neohrozí stabilitu ostatních částí platformy.
---
## 21. Vazba na projekt MIA
Process Manager je výkonnou vrstvou Kernelu. Zajišťuje bezpečný běh všech procesů – od AI výpočtů přes Battle Engine až po OBS a platformní konektory. Díky izolaci procesů, monitoringu a řízeným restartům umožňuje MIA zvládat dlouhé streamy, vysokou zátěž i budoucí rozšíření o více AI agentů a paralelní herní moduly bez ztráty stability.
---
**Architektonická poznámka:** Dokument **0058** bude věnován **Runtime Health & Watchdog**.

## Konec dokumentu 0057
