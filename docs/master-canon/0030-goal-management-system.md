# MIA MASTER CANON — Dokument 0030

**Název:** Goal Management System – Správa cílů MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Absolutně kritická (Core AI)

**Nadřazené dokumenty:**

- [0028 – Decision Engine](./0028-decision-engine.md)
- [0029 – Action Orchestrator](./0029-action-orchestrator.md)
- [0019 – Memory System](./0019-memory-system.md)

---

## 1. Účel dokumentu

Goal Management System (GMS) určuje, **čeho chce MIA v daném okamžiku dosáhnout**. Decision Engine rozhoduje **jak** něco udělat. Goal Manager rozhoduje **co je právě nejdůležitější**. Bez něj by MIA pouze reagovala na jednotlivé události a neuměla by plánovat.

---

## 2. Definice

Goal Management System spravuje všechny cíle platformy. Rozlišuje okamžité, krátkodobé, dlouhodobé, systémové a osobnostní cíle. Každý cíl má svůj životní cyklus.

---

## 3. Architektura

```
GOAL MANAGEMENT SYSTEM
├── Goal Registry
├── Goal Planner
├── Goal Prioritizer
├── Goal Evaluator
├── Goal Scheduler
├── Goal Dependency Manager
├── Goal Conflict Resolver
├── Goal Lifecycle Manager
├── Goal Metrics
├── Goal History
├── Goal Learning
└── Goal API
```

Každá část řeší jedinou odpovědnost.

---

## 4. Hlavní princip

MIA může mít současně desítky aktivních cílů — poděkovat za gift, dokončit Battle, odpovědět na chat, udržet výkon, rozvíjet vztahy. Goal Manager rozhoduje jejich pořadí.

---

## 5. Goal Registry

Obsahuje všechny cíle. Každý cíl má GoalID, název, popis, prioritu, stav, vlastníka, čas vytvoření a předpokládané dokončení. Registry je jediným zdrojem pravdy.

---

## 6. Typy cílů

### Reactive Goal

Vzniká reakcí na událost — odpověď na chat, poděkování za gift.

### Planned Goal

Naplánovaný úkol — pravidelná údržba, generování statistik.

### Persistent Goal

Dlouhodobý cíl — růst komunity, zlepšování AI, rozvoj Kojnožrouta.

### Emergency Goal

Vzniká při kritických situacích — výpadek OBS, přetížení systému. Má vždy nejvyšší prioritu.

---

## 7. Goal Planner

Planner rozděluje cíl na jednotlivé kroky. Například dokončit Battle: použít item → animace → vyhodnocení → uložení výsledku. Každý krok může být samostatný Action Plan.

---

## 8. Goal Prioritizer

Každý cíl získává Priority Score. Výpočet zohledňuje důležitost, čas, riziko, ekonomický význam, emocionální význam a dopad na stream. Priority se mohou během času měnit.

---

## 9. Goal Scheduler

Scheduler rozhoduje, kdy bude cíl řešen — okamžitě, po skončení Battle, po skončení videa nebo v noci. Scheduler spolupracuje s Action Orchestratorem.

---

## 10. Dependency Manager

Některé cíle závisí na jiných — například dokončit Battle → vyhlásit vítěze → uložit statistiky. Závislosti jsou explicitně definované.

---

## 11. Goal Conflict Resolver

Řeší konflikty mezi cíli. Chat chce okamžitou odpověď, Battle vyžaduje plnou pozornost. Resolver rozhodne, který cíl má přednost, zda lze oba spojit, nebo zda jeden odložit.

---

## 12. Goal Lifecycle

Každý cíl prochází stavy: Created → Planned → Active → Waiting → Completed → Archived, nebo Cancelled. Žádný cíl nesmí zůstat ve stavu Active neomezeně dlouho.

---

## 13. Goal Metrics

Každý cíl měří dobu trvání, počet kroků, úspěšnost, počet pokusů, spotřebu zdrojů a ekonomický přínos. Metriky využívá Monitoring.

---

## 14. Goal History

Každý dokončený cíl vytváří historii s GoalID, průběhem, rozhodnutími, výsledkem, chybami a časem. Historie slouží pro budoucí učení.

---

## 15. Goal Learning

Po dokončení cíle probíhá vyhodnocení. Úspěch posiluje strategii, neúspěch vede k úpravě plánování. Goal Manager se postupně zlepšuje.

---

## 16. Integrace s Memory

Každý cíl může využívat Working Memory, Short-Term Memory, Long-Term Memory, Episodic Memory, Procedural Memory a Emotional Memory. Paměť pomáhá lépe plánovat — adaptér je read-only.

---

## 17. Integrace s MIA

Goal Manager komunikuje s Decision Engine, Action Orchestrator, Battle Engine, Kojnožrout Engine, AI Engine, OBS Manager, Overlay Engine, Scheduler, Monitoring a Economy. Je strategickou vrstvou celé platformy.

---

## 18. Příklady cílů MIA

**Krátkodobé:** poděkovat za gift, odpovědět na chat, přehrát video.

**Střednědobé:** dokončit Battle, vyhodnotit stream, vytvořit statistiky.

**Dlouhodobé:** rozvoj projektu, budování komunity, zlepšování AI, rozvoj Kojnožrouta.

---

## 19. Zakázané činnosti

Goal Manager nesmí vykonávat akce, měnit Memory, měnit pravidla, měnit ekonomiku ani obcházet Decision Engine. Je pouze správcem cílů.

---

## 20. Kontrolní seznam implementace

- ☐ Existuje Goal Registry?
- ☐ Funguje Goal Planner?
- ☐ Existuje Goal Prioritizer?
- ☐ Funguje Scheduler?
- ☐ Existují závislosti mezi cíli?
- ☐ Funguje Conflict Resolver?
- ☐ Je implementován celý životní cyklus?
- ☐ Existuje Goal History?
- ☐ Probíhá Learning Feedback?
- ☐ Přístup probíhá přes Goal API?

---

## 21. Vazba na současnou MIA

Goal Management System řídí plynulý průběh streamu, správu více Battle, dlouhodobý růst Kojnožrouta, budování vztahů s komunitou, optimalizaci výkonu, plánování vývoje projektu a priority mezi chatem, gifty a systémovými úlohami.

---

## 22. Budoucí evoluce

GMS bude rozšířen o plánování na dny a týdny dopředu, autonomní správu streamů, koordinaci více AI agentů, dlouhodobé strategické cíle a adaptivní změnu priorit podle komunity.

---

## 23. Poznámka architekta

Goal Management System představuje vůli MIA. Zatímco Decision Engine řeší, jak dosáhnout určitého výsledku, Goal Manager určuje, který výsledek je právě nejdůležitější. Díky této vrstvě nebude MIA pouze reagovat na podněty, ale bude schopná dlouhodobě sledovat cíle a plánovat svou činnost.

---

### Architektonická poznámka

Dokument **0031** bude věnován **Planning Engine** — víceúrovňovému plánování nad Goal Management Systemem.
