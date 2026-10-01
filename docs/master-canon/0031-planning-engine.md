# MIA MASTER CANON — Dokument 0031

**Název:** Planning Engine – Strategické plánování MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Absolutně kritická (Core AI)

**Nadřazené dokumenty:**

- [0028 – Decision Engine](./0028-decision-engine.md)
- [0029 – Action Orchestrator](./0029-action-orchestrator.md)
- [0030 – Goal Management System](./0030-goal-management-system.md)

---

## 1. Účel dokumentu

Planning Engine představuje strategickou vrstvu inteligence MIA. Zatímco Goal Management určuje **čeho chce MIA dosáhnout**, Planning Engine vytváří konkrétní plán, jak tohoto cíle dosáhnout — plánování dopředu, dekompozice cílů, alternativní scénáře, reakce na změny a optimalizace zdrojů.

---

## 2. Definice

Planning Engine je systém víceúrovňového plánování. Pracuje s okamžitými plány, krátkodobými plány, dlouhodobými strategiemi a krizovými scénáři. Nevykonává akce — pouze vytváří plán.

---

## 3. Architektura

```
PLANNING ENGINE
├── Plan Generator
├── Task Decomposer
├── Resource Planner
├── Timeline Manager
├── Scenario Planner
├── Prediction Engine
├── Constraint Solver
├── Plan Optimizer
├── Replanning Engine
├── Plan Validator
├── Plan History
├── Learning Adapter
└── Planning API
```

Každá komponenta má jedinou odpovědnost.

---

## 4. Hlavní princip

Každý plán vzniká stejným způsobem: Cíl → Analýza → Rozdělení → Plán → Kontrola → Schválení → Decision Engine. Plán nikdy nevzniká náhodně.

---

## 5. Plan Generator

Vytváří plán z Goal Manageru. Například cíl „Dokončit Battle“ se převede na kroky: vyhodnotit stav, vybrat item, připravit animaci, vyhlásit výsledek, uložit statistiky.

---

## 6. Task Decomposer

Velké cíle rozděluje na menší úkoly — analýza, návrh, implementace, testování, nasazení. Každý úkol lze plánovat samostatně.

---

## 7. Resource Planner

Vyhodnocuje dostupné prostředky: CPU, RAM, GPU, AI model, OBS, čas, síť. Plán nesmí překročit dostupné zdroje.

---

## 8. Timeline Manager

Každý plán má vlastní časovou osu — teď, za 5 sekund, po Battle, po skončení streamu, v noci. Timeline podporuje dlouhodobé plánování.

---

## 9. Scenario Planner

Pro jeden cíl může existovat více scénářů: Varianta A (normální průběh), Varianta B (velké množství giftů), Varianta C (výpadek OBS). Planning Engine vybírá nejlepší variantu.

---

## 10. Prediction Engine

Odhaduje budoucí situace — příchod Battle, přetížení systému, zvýšenou aktivitu chatu, růst počtu giftů. Predikce nejsou rozhodnutí, pouze vstup.

---

## 11. Constraint Solver

Každý plán musí respektovat omezení: výkon počítače, čas, pravidla Battle, ekonomiku, bezpečnost. Plán porušující omezení je zamítnut.

---

## 12. Plan Optimizer

Vyhodnocuje různé varianty podle času, výkonu, kvality a spotřeby zdrojů. Například varianta B (2 s) může být vybrána před variantou A (4 s).

---

## 13. Replanning Engine

Pokud se situace změní (Battle skončí dříve), probíhá přepočítání plánu. Plánování je dynamické.

---

## 14. Plan Validator

Kontroluje úplnost, konflikty, závislosti, dostupnost zdrojů a bezpečnost. Neplatný plán nesmí být použit.

---

## 15. Plan History

Každý plán je uložen s PlanID, GoalID, časem, průběhem, výsledkem a úspěšností. Historie slouží pro budoucí optimalizaci.

---

## 16. Learning Adapter

Po dokončení plánu probíhá vyhodnocení — úspěch posiluje strategii, neúspěch vede k revizi. Planning Engine se učí z historie.

---

## 17. Integrace s MIA

Planning Engine komunikuje s Goal Manager, Decision Engine, Memory System, Knowledge Graph, Monitoring, Scheduler, Battle Engine, Economy, OBS Manager a AI Engine. Je strategickým plánovačem celé platformy.

---

## 18. Příklady plánů

**Battle:** Příprava → Battle → Vyhodnocení → Shrnutí

**Stream:** Start → Uvítání → Battle → Q&A → Závěr

**Vývoj:** Analýza → Implementace → Test → Nasazení

---

## 19. Zakázané činnosti

Planning Engine nesmí vykonávat akce, měnit Memory, měnit Goal Registry, obcházet Decision Engine ani ignorovat pravidla systému. Je pouze plánovací vrstvou.

---

## 20. Kontrolní seznam implementace

- ☐ Existuje Plan Generator?
- ☐ Funguje Task Decomposer?
- ☐ Existuje Resource Planner?
- ☐ Funguje Timeline Manager?
- ☐ Existuje Scenario Planner?
- ☐ Funguje Prediction Engine?
- ☐ Existuje Constraint Solver?
- ☐ Funguje Replanning?
- ☐ Existuje Plan History?
- ☐ Probíhá Learning Feedback?
- ☐ Přístup probíhá přes Planning API?

---

## 21. Vazba na současnou MIA

Planning Engine plánuje pořadí reakcí na více giftů, správu více Battle, střídání videí T1–T4, koordinaci overlayů, plánování řeči MIA a Kojnožrouta, dlouhodobé úkoly vývoje a optimalizaci výkonu během streamu.

---

## 22. Budoucí evoluce

Planning Engine bude rozšířen o plánování na týdny dopředu, autonomní správu streamu, koordinaci více AI agentů, simulaci scénářů a adaptivní plánování podle historie.

---

## 23. Poznámka architekta

Planning Engine je strategický plánovač MIA. Goal Manager představuje vůli, Decision Engine schopnost rozhodovat, Planning Engine schopnost připravit cestu k cíli. Díky němu MIA nebude pouze reagovat na přítomnost, ale plánovat budoucnost.

---

### Architektonická poznámka

Dokument **0032** zahájí blok **Emotion Engine** — aktivní využití emočních informací při rozhodování.
