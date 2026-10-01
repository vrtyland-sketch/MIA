# MIA MASTER CANON
# Dokument 0065
# Recovery Manager
---
## Metadata
| Položka            | Hodnota                                       |
| ------------------ | --------------------------------------------- |
| ID                 | MIA-0065                                      |
| Název              | Recovery Manager                              |
| Vrstva             | Kernel Layer 0                                |
| Priorita           | ABSOLUTNĚ KRITICKÁ                            |
| Verze              | 1.0.0                                         |
| Stav               | ACTIVE                                        |
| Nadřazený dokument | 0050 – MIA Core Kernel                        |
| Souvisí            | 0062 – Runtime Manager, 0064 – Health Manager |
---
## 1. Účel
Recovery Manager (RM) je centrální systém pro automatickou obnovu platformy MIA po chybách.
Jeho úkolem není pouze restartovat služby.
Jeho hlavním cílem je:
* zachovat běh systému,
* minimalizovat výpadky,
* obnovit poškozené části,
* zabránit šíření chyby,
* chránit Kernel.
Recovery Manager je jediná komponenta oprávněná provádět automatické obnovovací operace.
---
## 2. Hlavní odpovědnosti
Recovery Manager:
* přijímá hlášení o chybách,
* analyzuje jejich závažnost,
* vybírá strategii obnovy,
* koordinuje obnovu,
* ověřuje úspěšnost,
* vytváří Recovery Report.
---
## 3. Architektura
```text
                 Health Manager
                        │
                        ▼
               Recovery Manager
                        │
     ┌──────────────────┼──────────────────┐
     │                  │                  │
     ▼                  ▼                  ▼
Service Recovery   Module Recovery   Runtime Recovery
                        │
                        ▼
                 Runtime Manager
```
Recovery Manager nikdy neignoruje kritické chyby.
---
## 4. Recovery Workflow
Každá chyba prochází stejným postupem.
```text
Detect
↓
Validate
↓
Classify
↓
Choose Strategy
↓
Recover
↓
Verify
↓
Report
```
Bez ověření není Recovery dokončeno.
---
## 5. Recovery Levels
Platforma používá pět úrovní obnovy.
---
### Level 1
Restart Tasku
Například:
* AI odpověď,
* Overlay.
---
### Level 2
Restart procesu.
Například:
* Speech Worker,
* OBS Worker.
---
### Level 3
Restart služby.
Například:
* Battle,
* Inventory,
* OBS Connector.
---
### Level 4
Restart modulu.
Například:
* AI Module,
* TikTok Connector.
---
### Level 5
Runtime Recovery.
Restart celé Runtime bez restartu operačního systému.
---
## 6. Recovery Descriptor
Každá akce obsahuje:
```text
RecoveryID
Component
Severity
Strategy
Attempts
Result
Started
Finished
```
RecoveryID je jedinečné.
---
## 7. Klasifikace chyb
Recovery Manager rozlišuje:
### INFO
Pouze záznam.
---
### WARNING
Lehká degradace.
---
### ERROR
Nutná obnova.
---
### CRITICAL
Ohrožení Runtime.
---
### FATAL
Kernel již nemůže pokračovat.
---
## 8. Recovery Strategy
Každá komponenta může definovat vlastní strategii.
Například:
```text
Battle
↓
Restart Service
```
```text
OBS
↓
Reconnect
↓
Restart Connector
```
Strategie jsou konfigurovatelné.
---
## 9. Retry Policy
Každá Recovery akce obsahuje:
* maximální počet pokusů,
* čekací dobu,
* exponenciální prodlevu,
* podmínky ukončení.
Po vyčerpání pokusů je chyba eskalována.
---
## 10. Izolace
Recovery Manager nejprve izoluje problém.
Například:
```text
Battle FAILED
↓
Disconnect Battle
↓
Keep Runtime Running
```
Kernel musí zůstat funkční.
---
## 11. Verification
Po každé obnově proběhne kontrola.
```text
Recovered
↓
Health Check
↓
Verification
↓
READY
```
Pokud ověření selže:
další Recovery Level.
---
## 12. Eskalace
Pokud Recovery neuspěje:
```text
Level 1
↓
Level 2
↓
Level 3
↓
Level 4
↓
Level 5
```
Přeskakování úrovní není dovoleno, pokud není výslovně definováno.
---
## 13. Integrace s Health Managerem
Health Manager pouze hlásí.
Recovery Manager rozhoduje.
Například:
```text
Health
FAILED
↓
Recovery
```
---
## 14. Integrace s Watchdogem
Watchdog může vyžádat okamžitou obnovu.
Například:
```text
Deadlock
↓
Watchdog
↓
Recovery Manager
```
Rozhodnutí o konkrétní strategii zůstává na Recovery Manageru.
---
## 15. Integrace s Runtime
Recovery může obnovit:
* proces,
* službu,
* modul,
* Runtime.
Runtime Snapshot lze využít jako diagnostickou pomůcku nebo vstup do definované obnovovací strategie, pokud ji daný modul podporuje.
---
## 16. Recovery Report
Každá akce vytváří report.
Obsahuje:
* RecoveryID,
* příčinu,
* strategii,
* počet pokusů,
* dobu obnovy,
* výsledek.
Report je archivován.
---
## 17. Monitoring
Recovery Manager sleduje:
* počet Recovery akcí,
* úspěšnost,
* dobu obnovy,
* nejčastější chyby,
* počet eskalací.
---
## 18. Bezpečnost
Recovery Manager:
* chrání Kernel,
* nedovolí nekonečné Recovery smyčky,
* ověřuje oprávnění,
* blokuje neplatné strategie,
* eviduje všechny zásahy.
---
## 19. Audit Cursor
Při kontrole ověřit:
* ☐ Existuje jediný Recovery Manager.
* ☐ Recovery Workflow odpovídá specifikaci.
* ☐ Recovery Levels fungují.
* ☐ Retry Policy je implementována.
* ☐ Verification probíhá po každé obnově.
* ☐ Eskalace funguje.
* ☐ Recovery Report vzniká.
* ☐ Health Manager předává informace Recovery Manageru.
* ☐ Watchdog může vyvolat Recovery.
* ☐ Kernel je chráněn před nekonečnými Recovery cykly.
---
## 20. Definice HOTOVO
Recovery Manager je implementován správně pouze tehdy, když:
* každá chyba projde definovaným Recovery Workflow,
* strategie obnovy odpovídá typu a závažnosti chyby,
* obnova je po provedení vždy ověřena,
* eskalace probíhá řízeně mezi jednotlivými úrovněmi,
* Recovery Report je vytvořen pro každou akci,
* platforma dokáže obnovit běžné provozní chyby bez nutnosti restartu celého systému.
---
## 21. Vazba na projekt MIA
Recovery Manager je samoopravný mechanismus celé platformy MIA. Umožňuje automaticky obnovovat AI moduly, Battle systém, Kojnožrouty, OBS, overlaye i platformní konektory bez přerušení streamu. Ve spolupráci s Health Managerem, Watchdog Engine a Runtime Managerem tvoří základ vysoké dostupnosti systému a připravuje MIA na dlouhodobý nepřetržitý provoz.
---
**Architektonická poznámka:** Dokument **0066** bude věnován **Watchdog Engine**.

## Konec dokumentu 0065
