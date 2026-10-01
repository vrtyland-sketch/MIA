# MIA MASTER CANON
# Dokument 0064
# Health Manager
---
## Metadata
| Položka            | Hodnota                                                               |
| ------------------ | --------------------------------------------------------------------- |
| ID                 | MIA-0064                                                              |
| Název              | Health Manager                                                        |
| Vrstva             | Kernel Layer 0                                                        |
| Priorita           | ABSOLUTNĚ KRITICKÁ                                                    |
| Verze              | 1.0.0                                                                 |
| Stav               | ACTIVE                                                                |
| Nadřazený dokument | 0050 – MIA Core Kernel                                                |
| Souvisí            | 0056 – Resource Manager, 0061 – State Manager, 0062 – Runtime Manager |
---
## 1. Účel
Health Manager (HM) je centrální systém pro průběžné vyhodnocování zdravotního stavu celé platformy MIA.
Jeho úkolem není opravovat chyby.
Jeho úkolem je **poznat**, že se něco děje.
Veškeré rozhodnutí o opravě provádí:
* Recovery Manager
* Watchdog Engine
Health Manager pouze poskytuje přesná data.
---
## 2. Hlavní odpovědnosti
Health Manager:
* kontroluje zdraví systému,
* vyhodnocuje stav služeb,
* sleduje výkon,
* vyhledává degradaci,
* vytváří Health Report,
* publikuje změny přes Event Bus.
---
## 3. Architektura
```text
                 Health Manager
                        │
      ┌─────────────────┼─────────────────┐
      │                 │                 │
      ▼                 ▼                 ▼
 System Health    Service Health    Module Health
      │                 │                 │
      └─────────────────┼─────────────────┘
                        ▼
                   Health Report
                        ▼
                Recovery / Watchdog
```
Health Manager nikdy neprovádí restart.
---
## 4. Co je Health
Health představuje skutečný provozní stav objektu.
Například:
* běží správně,
* běží omezeně,
* neodpovídá,
* selhal.
Health není totožný se State.
Objekt může být:
```text
State
RUNNING
Health
DEGRADED
```
---
## 5. Health Descriptor
Každý monitorovaný objekt obsahuje:
```text
HealthID
Owner
Component
CurrentHealth
PreviousHealth
Score
LastCheck
NextCheck
```
---
## 6. Úrovně Health
Platforma používá pět úrovní.
```text
EXCELLENT
↓
GOOD
↓
DEGRADED
↓
CRITICAL
↓
FAILED
```
Každý objekt je právě v jedné úrovni.
---
## 7. Health Score
Každý objekt získává skóre.
Rozsah:
```text
100
↓
0
```
Příklad:
| Score  | Stav      |
| ------ | --------- |
| 95–100 | Excellent |
| 80–94  | Good      |
| 50–79  | Degraded  |
| 20–49  | Critical  |
| 0–19   | Failed    |
Hranice jsou konfigurovatelné.
---
## 8. Co se kontroluje
Health Manager sleduje například:
### Kernel
* běh Runtime,
* Registry,
* Scheduler.
---
### Services
* odpovědi,
* latenci,
* využití CPU,
* využití RAM.
---
### Platformy
* TikTok,
* Kick,
* Twitch,
* OBS.
---
### AI
* odezvu,
* délku inference,
* velikost front.
---
### Battle
* počet aktivních instancí,
* odezvu,
* synchronizaci.
---
## 9. Interval kontrol
Každá komponenta má vlastní interval.
Například:
| Komponenta | Interval |
| ---------- | -------- |
| Kernel     | 1 s      |
| Event Bus  | 1 s      |
| AI         | 5 s      |
| Battle     | 2 s      |
| OBS        | 3 s      |
| Pluginy    | 10 s     |
Intervaly jsou nastavitelné.
---
## 10. Health Rules
Každá komponenta definuje vlastní pravidla.
Například:
```text
CPU > 90 %
↓
Health -
10
```
```text
No response
↓
FAILED
```
Pravidla jsou rozšiřitelná.
---
## 11. Health Events
Každá změna generuje událost.
Například:
```text
HealthChanged
↓
Event Bus
↓
Subscribers
```
AI může reagovat například hláškou o výpadku platformy.
---
## 12. Health Report
Pravidelně vzniká report.
Obsahuje:
* celkové skóre systému,
* skóre jednotlivých modulů,
* počet Failed objektů,
* počet Critical objektů,
* trendy.
Report je archivován.
---
## 13. Trend Analysis
Health Manager ukládá historii.
Například:
```text
CPU
40 %
↓
55 %
↓
70 %
↓
90 %
```
Díky tomu lze odhalit postupné zhoršování ještě před selháním.
---
## 14. Integrace s Recovery
Pokud:
```text
Health
FAILED
```
Health Manager pouze odešle informaci.
Recovery rozhoduje:
* restart,
* Safe Mode,
* Shutdown.
---
## 15. Integrace s Watchdogem
Watchdog využívá Health Manager jako hlavní zdroj.
Například:
```text
Health
↓
Watchdog
↓
Decision
```
Health Manager nikdy přímo nerestartuje službu.
---
## 16. Monitoring
Health Manager publikuje:
* System Health,
* Service Health,
* AI Health,
* Battle Health,
* OBS Health,
* Platform Health.
Monitoring systém zobrazuje historii.
---
## 17. Bezpečnost
Health Manager:
* chrání Health Registry,
* blokuje falešné změny,
* ověřuje zdroj měření,
* zabraňuje manipulaci se skóre.
Pouze autorizované komponenty mohou zapisovat výsledky kontrol.
---
## 18. Audit Cursor
Při kontrole ověřit:
* ☐ Existuje jediný Health Manager.
* ☐ Každá služba má Health Score.
* ☐ Health není zaměňován se State.
* ☐ Health Report vzniká.
* ☐ Trend Analysis funguje.
* ☐ Recovery používá Health Manager.
* ☐ Watchdog používá Health Manager.
* ☐ Intervaly jsou konfigurovatelné.
* ☐ Historie měření existuje.
* ☐ Health Events jsou publikovány.
---
## 19. Definice HOTOVO
Health Manager je implementován správně pouze tehdy, když:
* všechny důležité komponenty platformy pravidelně reportují svůj zdravotní stav,
* Health Score je vypočítáváno konzistentně podle definovaných pravidel,
* změny zdravotního stavu jsou publikovány přes Event Bus,
* historie umožňuje sledovat dlouhodobé trendy,
* Recovery a Watchdog využívají Health Manager jako hlavní zdroj diagnostických informací,
* systém dokáže rozlišit mezi běžícím, ale degradovaným objektem a skutečným selháním.
---
## 20. Vazba na projekt MIA
Health Manager představuje diagnostický nervový systém celé platformy MIA. Neustále sleduje stav Kernelu, AI, Battle systému, Kojnožroutů, OBS, overlayů i všech platformních konektorů. Díky průběžnému vyhodnocování, trendové analýze a jednotnému Health Score umožňuje včas odhalit problémy ještě před jejich dopadem na stream nebo chování MIA a poskytuje Recovery Manageru přesné podklady pro automatickou obnovu systému.
---
**Architektonická poznámka:** Dokument **0065** bude věnován **Watchdog Engine**.

## Konec dokumentu 0064
