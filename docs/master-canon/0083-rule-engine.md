# MIA MASTER CANON
# Dokument 0083
# Rule Engine
---
## Metadata
| Položka            | Hodnota                                                                      |
| ------------------ | ---------------------------------------------------------------------------- |
| ID                 | MIA-0083                                                                     |
| Název              | Rule Engine                                                                  |
| Vrstva             | Kernel Layer 0                                                               |
| Priorita           | ABSOLUTNĚ KRITICKÁ                                                           |
| Verze              | 1.0.0                                                                        |
| Stav               | ACTIVE                                                                       |
| Nadřazený dokument | 0050 – MIA Core Kernel                                                       |
| Souvisí            | 0078 – Command Bus Manager, 0079 – Query Bus Manager, 0082 – Workflow Engine |
---
## 1. Účel
Rule Engine (RE) je centrální systém pro definování, správu a vyhodnocování pravidel (Rules) v platformě MIA.
Jeho úkolem není vykonávat obchodní logiku.
Nevytváří Commands.
Nevytváří Eventy.
Vyhodnocuje pravidla a vrací rozhodnutí, která následně využívají ostatní části systému.
Rule Engine odděluje obchodní pravidla od implementace aplikace.
---
## 2. Hlavní odpovědnosti
Rule Engine:
* načítá pravidla,
* vyhodnocuje podmínky,
* vrací výsledky,
* podporuje kombinace pravidel,
* spravuje verze pravidel,
* eviduje rozhodnutí.
---
## 3. Architektura
```text
        Context
           │
           ▼
      Rule Engine
           │
     ┌─────┼─────┐
     │     │     │
     ▼     ▼     ▼
   Rule   Rule  Rule
     │
     ▼
   Decision
```
Rule Engine přijímá vstupní kontext a vrací rozhodnutí.
---
## 4. Co je Rule
Rule představuje definované pravidlo.
Například:
* Coins ≥ 100
* Bowl = 100 %
* User je Moderator
* Battle běží
* AI Mood = Happy
* Inventory obsahuje Item
* Cooldown vypršel
Rule vrací pouze výsledek.
---
## 5. Rule Descriptor
Každé pravidlo obsahuje:
```text
RuleID
RuleType
Version
Priority
Condition
Result
Created
Updated
```
RuleID je globálně jedinečné.
---
## 6. Rule Types
Platforma podporuje například:
### Gift Rules
---
### Battle Rules
---
### Inventory Rules
---
### AI Rules
---
### OBS Rules
---
### Security Rules
Nové typy lze přidávat bez změny jádra systému.
---
## 7. Conditions
Pravidla obsahují podmínky.
Například:
```text
Coins >= 500
```
nebo
```text
Mood == HAPPY
```
Podmínky musí být deterministické.
---
## 8. Decision
Výsledek pravidla:
```text
TRUE
```
nebo
```text
FALSE
```
Případně může vracet konkrétní hodnotu definovanou pravidlem.
---
## 9. Rule Sets
Více pravidel lze sdružovat.
Například:
```text
Battle Rules
├── Rule 1
├── Rule 2
└── Rule 3
```
Rule Set představuje logickou skupinu pravidel.
---
## 10. Rule Priority
Pokud existuje více pravidel:
```text
Priority 100
↓
Priority 50
↓
Priority 10
```
Vyhodnocení probíhá podle definované strategie.
---
## 11. Logical Operators
Rule Engine podporuje:
* AND
* OR
* NOT
* XOR
Lze vytvářet složené podmínky.
---
## 12. Rule Evaluation
Proces vyhodnocení:
```text
Context
↓
Rule Engine
↓
Decision
```
Rule Engine nemění vstupní data.
---
## 13. Integrace s Workflow Engine
Workflow může požádat Rule Engine o rozhodnutí.
Například:
```text
Workflow
↓
Rule Engine
↓
Decision
↓
Next Step
```
Workflow využívá výsledek pravidla.
---
## 14. Integrace s Command Bus
Command může být spuštěn až po splnění pravidla.
```text
Rule = TRUE
↓
Command Bus
```
Rule Engine Command přímo nespouští.
---
## 15. Rule API
Veřejné rozhraní:
```text
evaluate()
loadRule()
reloadRules()
validateRule()
getRule()
```
Veškerá práce s pravidly probíhá přes toto API.
---
## 16. Bezpečnost
Rule Engine:
* ověřuje integritu pravidel,
* chrání Rule Set,
* eviduje změny verzí,
* blokuje neplatná pravidla,
* podporuje bezpečné načítání.
Pravidla nelze měnit za běhu bez autorizace.
---
## 17. Monitoring
Rule Engine publikuje:
* počet pravidel,
* počet vyhodnocení,
* dobu vyhodnocení,
* počet chyb,
* počet Rule Setů,
* vytížení enginu.
Monitoring sleduje výkon všech pravidel.
---
## 18. Audit
Audit obsahuje:
* RuleID,
* Rule Set,
* vstupní kontext,
* výsledek,
* čas vyhodnocení,
* verzi pravidla.
Audit rozhodnutí je plně dohledatelný.
---
## 19. Audit Cursor
Při kontrole ověřit:
* ☐ Existuje jediný Rule Engine.
* ☐ Pravidla jsou oddělena od obchodní logiky.
* ☐ Rule Sets fungují.
* ☐ Priority fungují.
* ☐ Logické operátory fungují.
* ☐ Rule Engine nemění stav systému.
* ☐ API odpovídá specifikaci.
* ☐ Monitoring funguje.
* ☐ Audit všech rozhodnutí existuje.
* ☐ Verzování pravidel funguje.
---
## 20. Definice HOTOVO
Rule Engine je implementován správně pouze tehdy, když:
* všechna obchodní pravidla jsou definována mimo aplikační logiku,
* pravidla lze bezpečně načítat, verzovat a vyhodnocovat,
* systém podporuje jednoduché i složené podmínky, priority a skupiny pravidel,
* Rule Engine vrací pouze rozhodnutí a nikdy přímo nevykonává Commands ani nevytváří Eventy,
* výsledky jsou monitorovatelné a auditovatelné,
* Rule Engine tvoří jednotnou rozhodovací vrstvu celé platformy MIA.
---
## 21. Vazba na projekt MIA
Rule Engine zajišťuje jednotné vyhodnocování pravidel napříč celou platformou MIA. Rozhoduje o spouštění Tier videí, Battle mechanik, AI reakcí, inventářů, gift ekonomiky, cooldownů, oprávnění uživatelů i dalších funkcí. Díky oddělení pravidel od aplikační logiky umožňuje snadnou úpravu chování systému bez zásahů do zdrojového kódu a zajišťuje konzistentní rozhodování ve všech modulech platformy.
---
**Architektonická poznámka:** Dokument **0084** je **Policy Engine**. Dokument **0085** je **Decision Engine** (Kernel). Dokument **0086** bude věnován **Telemetry Manager**.

## Konec dokumentu 0083
