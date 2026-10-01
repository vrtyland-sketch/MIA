# MIA MASTER CANON
# Dokument 0082
# Workflow Engine
---
## Metadata
| Položka            | Hodnota                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| ID                 | MIA-0082                                                                                             |
| Název              | Workflow Engine                                                                                      |
| Vrstva             | Kernel Layer 0                                                                                       |
| Priorita           | ABSOLUTNĚ KRITICKÁ                                                                                   |
| Verze              | 1.0.0                                                                                                |
| Stav               | ACTIVE                                                                                               |
| Nadřazený dokument | 0050 – MIA Core Kernel                                                                               |
| Souvisí            | 0058 – Task Scheduler, 0077 – Message Queue Manager, 0078 – Command Bus Manager, 0081 – Saga Manager |
---
## 1. Účel
Workflow Engine (WFE) je centrální systém pro definici, řízení a vykonávání pracovních toků (Workflows) v platformě MIA.
Na rozdíl od Saga Manageru nemusí řešit pouze dlouhotrvající obchodní procesy.
Workflow Engine umožňuje definovat obecné pracovní postupy skládající se z více kroků, podmínek, větvení a paralelních úloh.
Workflow popisuje **jak** má proces probíhat.
---
## 2. Hlavní odpovědnosti
Workflow Engine:
* spouští workflow,
* řídí jednotlivé kroky,
* vyhodnocuje podmínky,
* podporuje větvení,
* koordinuje paralelní úlohy,
* sleduje průběh workflow.
---
## 3. Architektura
```text
      Trigger
         │
         ▼
  Workflow Engine
         │
 ┌───────┼────────┐
 │       │        │
 ▼       ▼        ▼
Step   Decision  Parallel
 │       │        │
 └───────┼────────┘
         ▼
      Complete
```
Workflow představuje řízený sled činností.
---
## 4. Co je Workflow
Workflow je definovaný pracovní proces.
Například:
* spuštění streamu,
* inicializace Battle,
* AI odpověď,
* vytvoření overlaye,
* přehrání videa,
* synchronizace OBS,
* import dat,
* export statistik.
Workflow může obsahovat libovolný počet kroků.
---
## 5. Workflow Descriptor
Každý Workflow obsahuje:
```text
WorkflowID
WorkflowType
Version
CurrentStep
Status
Started
Updated
Owner
```
WorkflowID je globálně jedinečné.
---
## 6. Workflow Step
Workflow se skládá z jednotlivých kroků.
Například:
```text
Initialize
↓
Load Data
↓
Generate
↓
Publish
↓
Finish
```
Každý krok představuje samostatnou činnost.
---
## 7. Decision
Workflow může obsahovat rozhodovací uzly.
Například:
```text
Coins > 100 ?
↓
YES
↓
Play Tier2
NO
↓
Play Tier1
```
Rozhodnutí je založeno na definovaných pravidlech.
---
## 8. Parallel Execution
Workflow může spustit více kroků současně.
```text
          Start
             │
     ┌───────┼────────┐
     ▼       ▼        ▼
 AI     Overlay     OBS
     └───────┼────────┘
             ▼
          Continue
```
Paralelní kroky jsou nezávislé.
---
## 9. Synchronization
Workflow může čekat na dokončení všech paralelních větví.
```text
Parallel
↓
Wait All
↓
Next Step
```
Pokračování nastane až po splnění všech podmínek.
---
## 10. Loops
Workflow podporuje opakování.
Například:
```text
Check Queue
↓
Empty?
↓
NO
↓
Repeat
```
Cyklus musí mít definovanou ukončovací podmínku.
---
## 11. Error Handling
Při chybě:
```text
Step Failed
↓
Retry
↓
Alternative Step
↓
Abort
```
Každý Workflow definuje vlastní strategii řešení chyb.
---
## 12. Timeout
Workflow podporuje timeout.
Například:
```text
Waiting
↓
Timeout
↓
Cancel
```
Timeout je nastavitelný.
---
## 13. Integrace s Command Bus
Workflow může spouštět Commands.
```text
Workflow
↓
Command Bus
↓
Handler
```
Workflow nikdy nevolá Handler přímo.
---
## 14. Integrace se Saga Managerem
Saga může využívat Workflow.
Workflow může být součástí Sagy.
Oba systémy mají odlišné role:
* Saga koordinuje obchodní proces.
* Workflow vykonává pracovní postup.
---
## 15. Workflow API
Veřejné rozhraní:
```text
startWorkflow()
pauseWorkflow()
resumeWorkflow()
cancelWorkflow()
completeWorkflow()
getWorkflow()
```
Veškerá správa Workflow probíhá přes toto API.
---
## 16. Bezpečnost
Workflow Engine:
* ověřuje definice Workflow,
* chrání stav Workflow,
* eviduje změny,
* blokuje neplatné přechody,
* podporuje obnovu po výpadku.
Workflow nelze přeskočit do neplatného kroku.
---
## 17. Monitoring
Workflow Engine publikuje:
* počet aktivních Workflow,
* počet dokončených Workflow,
* počet chyb,
* počet timeoutů,
* průměrnou dobu běhu,
* počet paralelních větví.
Monitoring sleduje všechny pracovní procesy.
---
## 18. Audit
Audit obsahuje:
* WorkflowID,
* typ Workflow,
* aktuální krok,
* čas změny,
* výsledek,
* Owner.
Audit Workflow je oddělen od Audit Manageru.
---
## 19. Audit Cursor
Při kontrole ověřit:
* ☐ Existuje jediný Workflow Engine.
* ☐ Workflow obsahuje definované kroky.
* ☐ Decision funguje.
* ☐ Parallel Execution funguje.
* ☐ Synchronization funguje.
* ☐ Loop funguje.
* ☐ Error Handling funguje.
* ☐ Timeout funguje.
* ☐ Monitoring funguje.
* ☐ Audit všech Workflow existuje.
---
## 20. Definice HOTOVO
Workflow Engine je implementován správně pouze tehdy, když:
* umožňuje definovat a vykonávat pracovní postupy složené z více kroků,
* podporuje podmínky, větvení, paralelní zpracování i synchronizaci,
* správně řeší chyby, opakování a časové limity,
* spolupracuje s Command Bus a dalšími systémovými komponentami bez přímého volání jejich interních implementací,
* průběh každého Workflow je plně monitorovatelný, auditovatelný a obnovitelný,
* poskytuje jednotný mechanismus pro automatizaci procesů napříč celou platformou MIA.
---
## 21. Vazba na projekt MIA
Workflow Engine řídí pracovní procesy napříč celou platformou MIA. Zajišťuje automatizaci AI odpovědí, generování overlayů, synchronizaci OBS, Battle systém, gift ekonomiku, správu playlistů, importy, exporty i další procesy. Díky podpoře větvení, paralelního zpracování, opakování a obnovy po chybách tvoří univerzální výkonnou vrstvu pro orchestraci všech interních workflow platformy.
---
**Architektonická poznámka:** Dokument **0083** je **Rule Engine**. Dokument **0084** je **Policy Engine**. Dokument **0085** je **Decision Engine** (Kernel). Dokument **0086** bude věnován **Telemetry Manager**.

## Konec dokumentu 0082
