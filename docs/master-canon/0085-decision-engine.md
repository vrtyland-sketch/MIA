# MIA MASTER CANON
# Dokument 0085
# Decision Engine
---
## Metadata
| Položka            | Hodnota                                                        |
| ------------------ | -------------------------------------------------------------- |
| ID                 | MIA-0085                                                       |
| Název              | Decision Engine                                                |
| Vrstva             | Kernel Layer 0                                                 |
| Priorita           | ABSOLUTNĚ KRITICKÁ                                             |
| Verze              | 1.0.0                                                          |
| Stav               | ACTIVE                                                         |
| Nadřazený dokument | 0050 – MIA Core Kernel                                         |
| Souvisí            | 0061 – State Manager, 0083 – Rule Engine, 0084 – Policy Engine |
---
## 1. Účel
Decision Engine (DE) je centrální rozhodovací vrstva platformy MIA.
Jeho úkolem je spojovat výsledky z Rule Engine, Policy Engine, AI modulů a aktuálního stavu systému do jediného finálního rozhodnutí.
Decision Engine nevykonává Commands.
Nevytváří Eventy.
Nevykonává obchodní logiku.
Jeho jediným výstupem je rozhodnutí (Decision).
---
## 2. Hlavní odpovědnosti
Decision Engine:
* přijímá vstupy,
* kombinuje výsledky,
* řeší konflikty,
* určuje finální rozhodnutí,
* podporuje priority,
* eviduje rozhodovací proces.
---
## 3. Architektura
```text
         Context
            │
            ▼
     Decision Engine
            │
 ┌──────────┼──────────┐
 │          │          │
 ▼          ▼          ▼
Rules    Policies     State
 │          │          │
 └──────────┼──────────┘
            ▼
       Decision
```
Decision Engine představuje centrální rozhodovací bod.
---
## 4. Co je Decision
Decision představuje konečný výsledek rozhodovacího procesu.
Například:
* přehrát Tier 2,
* zamítnout Battle,
* povolit AI odpověď,
* zablokovat příkaz,
* změnit náladu Kojnožrouta,
* pokračovat Workflow.
Decision není Command.
---
## 5. Decision Descriptor
Každé Decision obsahuje:
```text
DecisionID
DecisionType
Context
Priority
Source
Result
Timestamp
CorrelationID
```
DecisionID je globálně jedinečné.
---
## 6. Sources
Decision může vycházet z více zdrojů.
Například:
* Rule Engine,
* Policy Engine,
* State Manager,
* AI,
* Runtime,
* Workflow.
Decision Engine všechny zdroje sjednocuje.
---
## 7. Conflict Resolution
Pokud vznikne konflikt:
```text
Rule = TRUE
↓
Policy = DENY
↓
Decision = DENY
```
Strategie řešení konfliktů je konfigurovatelná.
---
## 8. Priority
Rozhodnutí mohou mít priority.
```text
CRITICAL
↓
HIGH
↓
NORMAL
↓
LOW
```
Vyšší priorita má přednost.
---
## 9. Decision Strategies
Platforma podporuje například:
* First Match,
* Highest Priority,
* Majority,
* Weighted,
* Custom Strategy.
Strategie je definována podle typu rozhodování.
---
## 10. Decision Context
Každé rozhodnutí vychází z aktuálního kontextu.
Například:
* aktuální Battle,
* stav inventáře,
* stav Bowl,
* AI Mood,
* uživatelská oprávnění,
* stav Workflow.
Kontext je pouze pro čtení.
---
## 11. Determinismus
Stejný vstupní kontext musí vždy vytvořit stejné rozhodnutí.
Decision Engine nesmí generovat náhodná rozhodnutí, pokud to není explicitně definováno.
---
## 12. Integrace s Rule Engine
Workflow:
```text
Rule Result
↓
Decision Engine
↓
Decision
```
Rule Engine poskytuje pouze výsledky pravidel.
---
## 13. Integrace s Policy Engine
Workflow:
```text
Policy Result
↓
Decision Engine
↓
Decision
```
Policy Engine poskytuje systémová omezení.
---
## 14. Integrace s AI
AI může poskytovat doporučení.
Například:
```text
AI Suggestion
↓
Decision Engine
↓
Decision
```
AI nikdy nerozhoduje sama.
Konečné rozhodnutí vždy vytváří Decision Engine.
---
## 15. Decision API
Veřejné rozhraní:
```text
evaluate()
resolve()
compare()
getDecision()
validate()
```
Veškerá rozhodnutí procházejí tímto API.
---
## 16. Bezpečnost
Decision Engine:
* chrání vstupní kontext,
* ověřuje zdroje,
* eviduje konflikty,
* podporuje audit,
* blokuje neplatná rozhodnutí.
Každé rozhodnutí musí být reprodukovatelné.
---
## 17. Monitoring
Decision Engine publikuje:
* počet rozhodnutí,
* počet konfliktů,
* dobu vyhodnocení,
* počet strategií,
* počet zamítnutí,
* vytížení Decision Engine.
Monitoring sleduje výkon rozhodovací vrstvy.
---
## 18. Audit
Audit obsahuje:
* DecisionID,
* vstupní kontext,
* použitou strategii,
* výsledky Rule Engine,
* výsledky Policy Engine,
* finální Decision.
Audit umožňuje zpětnou rekonstrukci každého rozhodnutí.
---
## 19. Audit Cursor
Při kontrole ověřit:
* ☐ Existuje jediný Decision Engine.
* ☐ Rozhodnutí vznikají pouze z ověřených vstupů.
* ☐ Conflict Resolution funguje.
* ☐ Priority fungují.
* ☐ Strategie fungují.
* ☐ AI pouze doporučuje.
* ☐ Decision je deterministické.
* ☐ Monitoring funguje.
* ☐ Audit všech rozhodnutí existuje.
* ☐ API odpovídá specifikaci.
---
## 20. Definice HOTOVO
Decision Engine je implementován správně pouze tehdy, když:
* sjednocuje výsledky z Rule Engine, Policy Engine, AI a dalších systémových komponent,
* řeší konflikty mezi jednotlivými zdroji pomocí definovaných strategií,
* vytváří deterministická a reprodukovatelná rozhodnutí,
* nikdy přímo nevykonává Commands ani nevytváří Eventy,
* všechna rozhodnutí jsou monitorovatelná a auditovatelná,
* Decision Engine tvoří jedinou autoritativní rozhodovací vrstvu celé platformy MIA.
---
## 21. Vazba na projekt MIA
Decision Engine představuje centrální mozek rozhodování celé platformy MIA. Vyhodnocuje výsledky obchodních pravidel, systémových politik, aktuálního stavu, AI doporučení i dalších vstupů a určuje finální chování systému. Rozhoduje například o reakcích MIA a Kojnožroutů, Battle mechanikách, gift ekonomice, správě overlayů, AI workflow i bezpečnostních omezeních. Díky jednotnému rozhodovacímu procesu zajišťuje konzistentní, předvídatelné a auditovatelné chování celé platformy.
---
**Architektonická poznámka:** Dokument **0086** je **Orchestrator Engine**. Dokument **0087** bude věnován **Telemetry Manager**. Kernel Decision Engine (0085) je odlišný od AI Decision Engine (0028): 0085 sjednocuje Rule/Policy/State/AI doporučení; 0028 plánuje akce v AI SYSTEM.

## Konec dokumentu 0085
