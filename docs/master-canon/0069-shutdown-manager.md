# MIA MASTER CANON
# Dokument 0069
# Shutdown Manager
---
## Metadata
| Položka            | Hodnota                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| ID                 | MIA-0069                                                                                            |
| Název              | Shutdown Manager                                                                                    |
| Vrstva             | Kernel Layer 0                                                                                      |
| Priorita           | ABSOLUTNĚ KRITICKÁ                                                                                  |
| Verze              | 1.0.0                                                                                               |
| Stav               | ACTIVE                                                                                              |
| Nadřazený dokument | 0050 – MIA Core Kernel                                                                              |
| Souvisí            | 0062 – Runtime Manager, 0063 – Lifecycle Manager, 0065 – Recovery Manager, 0068 – Safe Mode Manager |
---
## 1. Účel
Shutdown Manager (SDM) je centrální systém pro řízené ukončení běhu platformy MIA.
Jeho úkolem není pouze vypnout aplikaci.
Musí zajistit, že:
* žádná data nebudou ztracena,
* všechny služby budou korektně ukončeny,
* Runtime bude uzavřen konzistentně,
* systém bude připraven na další spuštění.
Každé ukončení platformy musí proběhnout přes Shutdown Manager.
---
## 2. Hlavní odpovědnosti
Shutdown Manager:
* přijímá požadavky na ukončení,
* plánuje Shutdown Sequence,
* koordinuje ukončení služeb,
* ukládá stav systému,
* uzavírá Runtime,
* vytváří Shutdown Report.
---
## 3. Architektura
```text
             Shutdown Request
                    │
                    ▼
            Shutdown Manager
                    │
     ┌──────────────┼──────────────┐
     │              │              │
     ▼              ▼              ▼
Lifecycle      Runtime      Service Manager
     │              │              │
     └──────────────┼──────────────┘
                    ▼
               System Exit
```
Shutdown Manager je jediná komponenta oprávněná zahájit řízené ukončení systému.
---
## 4. Typy Shutdown
Platforma podporuje několik režimů.
### Graceful Shutdown
Standardní bezpečné ukončení.
---
### Maintenance Shutdown
Ukončení kvůli údržbě.
---
### Emergency Shutdown
Nouzové ukončení při kritickém stavu.
---
### Restart Shutdown
Řízené ukončení následované automatickým restartem Runtime.
---
## 5. Shutdown Descriptor
Každý Shutdown obsahuje:
```text
ShutdownID
RuntimeID
Reason
RequestedBy
Started
Finished
Mode
Result
```
ShutdownID je jedinečný.
---
## 6. Shutdown Workflow
Každé ukončení probíhá stejně.
```text
Shutdown Request
↓
Validation
↓
Notify Components
↓
Stop Services
↓
Save State
↓
Release Resources
↓
Close Runtime
↓
Exit
```
Žádná fáze nesmí být přeskočena.
---
## 7. Validace
Před ukončením se ověřuje:
* oprávnění,
* aktuální stav Runtime,
* aktivní Recovery,
* kritické operace,
* otevřené transakce.
Pokud nelze Shutdown bezpečně provést, je požadavek odmítnut nebo odložen.
---
## 8. Notifikace komponent
Všechny aktivní komponenty obdrží událost:
```text
ShutdownRequested
```
Komponenty mají možnost:
* dokončit rozpracovanou práci,
* uložit data,
* korektně se odregistrovat.
---
## 9. Ukončení služeb
Pořadí ukončení:
```text
Pluginy
↓
Battle
↓
AI
↓
Platformní konektory
↓
OBS
↓
Core Services
↓
Kernel
```
Kernel se ukončuje vždy jako poslední.
---
## 10. Uložení stavu
Shutdown Manager koordinuje uložení:
* konfigurace,
* Runtime informací,
* statistik,
* inventářů,
* stavů Battle,
* paměti AI,
* auditních dat.
Pouze komponenty, které podporují perzistenci, ukládají svůj stav.
---
## 11. Uvolnění prostředků
Po ukončení služeb:
* uvolnění RAM,
* uzavření souborů,
* uzavření databází,
* uzavření socketů,
* odpojení API,
* ukončení vláken.
Nesmí zůstat žádné aktivní systémové prostředky.
---
## 12. Integrace s Runtime Managerem
Runtime Manager přechází:
```text
RUNNING
↓
STOPPING
↓
STOPPED
```
Shutdown Manager koordinuje tento přechod.
---
## 13. Integrace s Lifecycle Managerem
Lifecycle všech objektů přechází:
```text
ACTIVE
↓
STOPPING
↓
STOPPED
↓
DESTROYED
```
Přechody jsou auditovány.
---
## 14. Integrace s Recovery
Pokud právě probíhá Recovery:
* Recovery se nejprve dokončí nebo bezpečně ukončí,
* teprve poté pokračuje Shutdown.
Tím se zabraňuje nekonzistentnímu stavu.
---
## 15. Emergency Shutdown
Při kritickém selhání:
```text
Critical Failure
↓
Emergency Shutdown
↓
Minimal Save
↓
Kernel Exit
```
Prioritou je ochrana integrity systému.
---
## 16. Shutdown Report
Každé ukončení vytváří report.
Obsahuje:
* ShutdownID,
* důvod,
* dobu ukončení,
* ukončené komponenty,
* případné chyby,
* výsledek.
Report je archivován.
---
## 17. Monitoring
Shutdown Manager publikuje:
* počet Shutdown,
* důvody,
* průměrnou dobu ukončení,
* počet Emergency Shutdown,
* úspěšnost ukončení.
---
## 18. Bezpečnost
Shutdown Manager:
* ověřuje oprávnění k ukončení,
* blokuje paralelní Shutdown požadavky,
* chrání auditní data,
* zajišťuje konzistentní pořadí ukončení,
* zabraňuje ztrátě dat.
---
## 19. Audit Cursor
Při kontrole ověřit:
* ☐ Existuje jediný Shutdown Manager.
* ☐ Shutdown Workflow odpovídá specifikaci.
* ☐ Validace probíhá před ukončením.
* ☐ Komponenty dostávají ShutdownRequested.
* ☐ Runtime přechází do STOPPING.
* ☐ Prostředky jsou korektně uvolněny.
* ☐ Shutdown Report vzniká.
* ☐ Emergency Shutdown funguje.
* ☐ Auditní historie existuje.
* ☐ Kernel se ukončuje jako poslední.
---
## 20. Definice HOTOVO
Shutdown Manager je implementován správně pouze tehdy, když:
* každé ukončení systému probíhá přes definovaný Shutdown Workflow,
* všechny aktivní komponenty dostanou možnost dokončit svou práci,
* Runtime i Lifecycle objektů přecházejí do konzistentního ukončeného stavu,
* systémové prostředky jsou zcela uvolněny,
* vzniká kompletní Shutdown Report,
* po dalším spuštění lze bezpečně navázat na předchozí běh bez nekonzistence.
---
## 21. Vazba na projekt MIA
Shutdown Manager zajišťuje bezpečné ukončení celé platformy MIA bez ztráty dat a bez poškození Runtime. Koordinuje ukončení AI, Battle systému, Kojnožroutů, OBS, overlayů i všech platformních konektorů, chrání auditní historii a připravuje systém na další spuštění nebo plánovanou údržbu. Díky tomu je MIA schopna dlouhodobého spolehlivého provozu i při častých aktualizacích a restartování.
---
**Architektonická poznámka:** Dokument **0070** je věnován **Diagnostics Manager**. Dokument **0071** bude věnován další Kernel Layer 0 službě (plánováno).

## Konec dokumentu 0069
