# MIA MASTER CANON
# Dokument 0078
# Command Bus Manager
---
## Metadata
| Položka            | Hodnota                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| ID                 | MIA-0078                                                                                                  |
| Název              | Command Bus Manager                                                                                       |
| Vrstva             | Kernel Layer 0                                                                                            |
| Priorita           | ABSOLUTNĚ KRITICKÁ                                                                                        |
| Verze              | 1.0.0                                                                                                     |
| Stav               | ACTIVE                                                                                                    |
| Nadřazený dokument | 0050 – MIA Core Kernel                                                                                    |
| Souvisí            | 0058 – Task Scheduler, 0075 – Event Store Manager, 0076 – Event Bus Manager, 0077 – Message Queue Manager |
---
## 1. Účel
Command Bus Manager (CBM) je centrální vrstva pro předávání příkazů (Commands) mezi jednotlivými částmi platformy MIA.
Na rozdíl od Event Bus nepřenáší informace o tom, co se stalo.
Na rozdíl od Message Queue nepředstavuje transportní frontu.
Jeho úkolem je bezpečně doručit požadavek na vykonání konkrétní akce jedinému odpovědnému Handleru.
---
## 2. Hlavní odpovědnosti
Command Bus Manager:
* přijímá Commands,
* směruje Commands,
* vyhledává Handler,
* předává příkazy,
* ověřuje validitu,
* sleduje výsledek vykonání.
---
## 3. Architektura
```text
        Command Sender
               │
               ▼
     Command Bus Manager
               │
               ▼
      Command Handler
               │
               ▼
          Domain Logic
```
Každý Command má právě jednoho Handlera.
---
## 4. Co je Command
Command představuje požadavek na vykonání akce.
Například:
* StartBattle
* AddInventoryItem
* PlayVideo
* GenerateSpeech
* FeedKojnozrout
* SaveSnapshot
* StartMission
* ResetBowl
Command říká systému, co má udělat.
---
## 5. Command Descriptor
Každý Command obsahuje:
```text
CommandID
CommandType
Sender
Timestamp
Payload
Priority
CorrelationID
Version
```
CommandID je globálně jedinečné.
---
## 6. Command Handler
Každý Command má jediný Handler.
Například:
```text
StartBattle
↓
Battle Handler
```
nebo
```text
GenerateSpeech
↓
Speech Handler
```
Více Handlerů pro jeden Command není dovoleno.
---
## 7. Routing
Command Bus automaticky vyhledává správný Handler.
Workflow:
```text
Command
↓
Command Bus
↓
Correct Handler
```
Odesílatel Handler nezná.
---
## 8. Validace
Před předáním Handleru probíhá validace.
Kontroluje se:
* typ Command,
* Payload,
* oprávnění,
* verze,
* integrita.
Neplatný Command je odmítnut.
---
## 9. Výsledek
Každý Handler vrací výsledek.
Například:
```text
Success
```
nebo
```text
Validation Failed
```
nebo
```text
Execution Failed
```
Výsledek je vrácen odesílateli.
---
## 10. Command Pipeline
Každý Command prochází pipeline.
```text
Validation
↓
Authorization
↓
Routing
↓
Handler
↓
Result
```
Pipeline je jednotná pro všechny Commands.
---
## 11. Synchronní a asynchronní Commands
Platforma podporuje:
### Sync
Výsledek je vrácen okamžitě.
---
### Async
Výsledek je vrácen později prostřednictvím Message Queue nebo Event Bus.
Volba režimu závisí na typu Command.
---
## 12. Integrace s Event Store
Úspěšné vykonání Command může vytvořit Domain Event.
Například:
```text
StartBattle Command
↓
BattleStarted Event
```
Command není ukládán do Event Store.
Do Event Store se ukládá pouze vzniklá doménová událost.
---
## 13. Integrace s Event Bus
Po úspěšném vykonání Command může být publikován Event.
Workflow:
```text
Command
↓
Handler
↓
Domain Event
↓
Event Bus
```
Command Bus a Event Bus mají odlišné role.
---
## 14. Integrace s Message Queue
Dlouhé Commands mohou vytvořit Message.
Například:
```text
GenerateVideo
↓
Queue Message
```
Samotný Command Bus Message neukládá.
---
## 15. Command Bus API
Veřejné rozhraní:
```text
send()
validate()
dispatch()
cancel()
getResult()
```
Veškeré Commands procházejí tímto API.
---
## 16. Bezpečnost
Command Bus Manager:
* ověřuje oprávnění,
* validuje Payload,
* chrání CommandID,
* eviduje výsledky,
* blokuje duplicitní Commands.
Každý Command lze zpracovat pouze jednou.
---
## 17. Monitoring
Command Bus Manager publikuje:
* počet Commandů,
* počet Handlerů,
* počet úspěšných Commands,
* počet zamítnutých Commands,
* průměrnou dobu vykonání,
* počet chyb.
Monitoring sleduje výkon celé Command vrstvy.
---
## 18. Audit
Audit obsahuje:
* CommandID,
* Sender,
* Handler,
* čas přijetí,
* čas dokončení,
* výsledek,
* CorrelationID.
Audit Commandů je oddělen od Event Store.
---
## 19. Audit Cursor
Při kontrole ověřit:
* ☐ Existuje jediný Command Bus Manager.
* ☐ Každý Command má právě jednoho Handlera.
* ☐ Routing funguje.
* ☐ Validace funguje.
* ☐ Pipeline je jednotná.
* ☐ Sync i Async režim fungují.
* ☐ Command nevytváří přímý zápis do Event Store.
* ☐ Event vzniká až po úspěšném vykonání Command.
* ☐ Monitoring funguje.
* ☐ Audit všech Commandů existuje.
---
## 20. Definice HOTOVO
Command Bus Manager je implementován správně pouze tehdy, když:
* všechny příkazy procházejí jedinou centrální Command vrstvou,
* každý Command je směrován přesně jednomu odpovědnému Handleru,
* před vykonáním probíhá validace, autorizace a směrování v jednotné pipeline,
* systém podporuje synchronní i asynchronní vykonávání příkazů,
* úspěšně vykonaný Command může vytvořit Domain Event, který je následně distribuován přes Event Bus,
* Command Bus zajišťuje bezpečné, auditovatelné a konzistentní vykonávání všech příkazů platformy.
---
## 21. Vazba na projekt MIA
Command Bus Manager představuje centrální vrstvu pro řízení všech aktivních akcí v platformě MIA. Přijímá příkazy z AI, Battle systému, Kojnožroutů, gift ekonomiky, overlayů, OBS i ostatních modulů a směruje je ke správným Handlerům. Díky jednotné pipeline, validaci, autorizaci a propojení s Event Store, Event Bus a Message Queue zajišťuje konzistentní a bezpečné vykonávání všech operací v celé platformě.
---
**Architektonická poznámka:** Dokument **0079** je věnován **Query Bus Manager**. Dokument **0080** je věnován **Projection Manager**. Dokument **0081** bude věnován **Telemetry Manager**.

## Konec dokumentu 0078
