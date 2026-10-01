# MIA MASTER CANON
# Dokument 0066
# Watchdog Engine
---
## Metadata
| Položka            | Hodnota                                        |
| ------------------ | ---------------------------------------------- |
| ID                 | MIA-0066                                       |
| Název              | Watchdog Engine                                |
| Vrstva             | Kernel Layer 0                                 |
| Priorita           | ABSOLUTNĚ KRITICKÁ                             |
| Verze              | 1.0.0                                          |
| Stav               | ACTIVE                                         |
| Nadřazený dokument | 0050 – MIA Core Kernel                         |
| Souvisí            | 0064 – Health Manager, 0065 – Recovery Manager |
---
## 1. Účel
Watchdog Engine (WDE) je autonomní dohledový systém platformy MIA.
Jeho úkolem je nepřetržitě sledovat běh celé platformy a okamžitě rozpoznat situace, které mohou vést k nestabilitě nebo úplnému selhání.
Watchdog:
* neprovádí běžné monitorování,
* neřídí služby,
* neprovádí plánování.
Jeho jediným úkolem je **hlídat**, zda platforma stále funguje správně.
Pokud zjistí problém, předává jej Recovery Manageru.
---
## 2. Hlavní odpovědnosti
Watchdog Engine:
* monitoruje kritické komponenty,
* ověřuje jejich odezvu,
* detekuje zamrznutí,
* detekuje deadlocky,
* detekuje přetížení,
* vyvolává Recovery.
---
## 3. Architektura
```text
              Watchdog Engine
                     │
      ┌──────────────┼──────────────┐
      │              │              │
      ▼              ▼              ▼
 Health Manager  Runtime Manager  Resource Manager
      │              │              │
      └──────────────┼──────────────┘
                     ▼
             Recovery Manager
```
Watchdog nikdy neopravuje systém sám.
---
## 4. Co Watchdog sleduje
### Kernel
* Runtime
* Scheduler
* Registry
* Event Bus
---
### Services
* aktivitu
* odezvu
* zablokování
---
### Resources
* CPU
* RAM
* Disk
* GPU
* síť
---
### Platformy
* TikTok
* Kick
* Twitch
* OBS
---
### AI
* dlouhé inference,
* zamrzlé Workery,
* přetížené fronty.
---
## 5. Watchdog Heartbeat
Každá kritická komponenta musí pravidelně odesílat Heartbeat.
Například:
```text
Runtime
↓
Heartbeat
↓
Watchdog
```
Pokud Heartbeat nepřijde:
Komponenta je označena jako neodpovídající.
---
## 6. Heartbeat Descriptor
Každý Heartbeat obsahuje:
```text
ComponentID
Timestamp
Health
RuntimeID
Sequence
Status
```
Heartbeat musí být jednoznačně identifikovatelný.
---
## 7. Watchdog Cycle
Každý cyklus probíhá následovně:
```text
Receive Heartbeats
↓
Verify
↓
Detect Problems
↓
Classify
↓
Notify Recovery
```
Délka cyklu je konfigurovatelná.
---
## 8. Detekované problémy
Watchdog rozpoznává například:
* zamrznutí procesu,
* ztrátu Heartbeatu,
* deadlock,
* přetečení front,
* přetížení CPU,
* únik paměti,
* dlouhou odezvu,
* ztrátu spojení s platformou.
---
## 9. Klasifikace
Každý problém získá úroveň.
```text
INFO
↓
WARNING
↓
ERROR
↓
CRITICAL
↓
FATAL
```
Klasifikace určuje další postup Recovery Manageru.
---
## 10. Timeout
Každá komponenta má vlastní timeout.
Například:
| Komponenta | Timeout |
| ---------- | ------- |
| Kernel     | 1 s     |
| Event Bus  | 2 s     |
| Battle     | 3 s     |
| OBS        | 5 s     |
| Plugin     | 10 s    |
Timeouty jsou nastavitelné.
---
## 11. Deadlock Detection
Watchdog analyzuje:
* blokovaná vlákna,
* čekání na zámky,
* cyklické závislosti,
* neaktivní procesy.
Po potvrzení deadlocku je vyvolána Recovery.
---
## 12. Freeze Detection
Pokud komponenta:
* neposílá Heartbeat,
* neodpovídá,
* nemění stav,
je označena jako Frozen.
Například:
```text
Speech
↓
Frozen
↓
Recovery
```
---
## 13. Resource Monitoring
Watchdog využívá Resource Manager.
Například:
```text
CPU
99 %
↓
Watchdog
↓
Recovery
```
Stejně funguje:
* RAM,
* GPU,
* Disk.
---
## 14. Integrace s Recovery
Recovery je spuštěna pouze přes Watchdog nebo na základě požadavku jiného autorizovaného systému.
Workflow:
```text
Problem
↓
Watchdog
↓
Recovery Manager
↓
Verification
```
---
## 15. Integrace s Battle
Watchdog sleduje:
* zamrzlé Battle,
* neukončená kola,
* nekonečné smyčky,
* přetížené výpočty.
Battle může být obnovena bez restartu celé platformy.
---
## 16. Integrace s Platformami
Watchdog kontroluje:
* TikTok,
* Kick,
* Twitch,
* Discord,
* OBS.
Při výpadku:
* reconnect,
* Recovery.
Platformní chyba nesmí zastavit Kernel.
---
## 17. Monitoring
Watchdog publikuje:
* počet Heartbeatů,
* počet timeoutů,
* počet Freeze,
* počet Deadlock,
* počet Recovery,
* průměrnou dobu reakce.
---
## 18. Bezpečnost
Watchdog:
* chrání Kernel,
* kontroluje integritu Heartbeatů,
* blokuje falešná hlášení,
* omezuje opakované Recovery,
* nedovolí obejít dohledový mechanismus.
Watchdog běží jako kritická Kernel služba.
---
## 19. Audit Cursor
Při kontrole ověřit:
* ☐ Existuje jediný Watchdog Engine.
* ☐ Kritické komponenty posílají Heartbeat.
* ☐ Heartbeat obsahuje všechna povinná pole.
* ☐ Freeze Detection funguje.
* ☐ Deadlock Detection funguje.
* ☐ Timeouty jsou konfigurovatelné.
* ☐ Watchdog spolupracuje s Recovery Managerem.
* ☐ Platformní výpadky neohrožují Kernel.
* ☐ Monitoring je aktivní.
* ☐ Auditní historie existuje.
---
## 20. Definice HOTOVO
Watchdog Engine je implementován správně pouze tehdy, když:
* všechny kritické komponenty pravidelně odesílají Heartbeat,
* systém automaticky detekuje zamrznutí, deadlocky i ztrátu odezvy,
* problémy jsou klasifikovány podle závažnosti,
* Recovery Manager je informován bez prodlení,
* Watchdog nikdy neprovádí opravy přímo, ale pouze koordinuje jejich vyvolání,
* dohled funguje nepřetržitě po celou dobu běhu Runtime.
---
## 21. Vazba na projekt MIA
Watchdog Engine je ochranným mechanismem celé platformy MIA. Nepřetržitě sleduje Kernel, AI, Battle systém, Kojnožrouty, OBS i všechny platformní konektory a zajišťuje, že i při dlouhých streamech nebo vysokém zatížení jsou problémy odhaleny během několika sekund. Společně s Health Managerem a Recovery Managerem tvoří základ samoopravné architektury MIA.
---
**Architektonická poznámka:** Dokument **0067** bude věnován další Kernel Layer 0 službě (plánováno).

## Konec dokumentu 0066
