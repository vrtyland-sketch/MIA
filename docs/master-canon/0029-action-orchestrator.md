# MIA MASTER CANON — Dokument 0029

**Název:** Action Orchestrator – Orchestrace akcí platformy MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Absolutně kritická (Core AI)

**Nadřazené dokumenty:**

- [0010 – Event Bus](./0010-event-bus.md)
- [0017 – Event Dispatcher](./0017-event-dispatcher.md)
- [0028 – Decision Engine](./0028-decision-engine.md)

---

## 1. Účel dokumentu

Action Orchestrator je výkonná vrstva platformy MIA. Přebírá Action Plan vytvořený Decision Enginem a řídí jeho bezpečné, koordinované a synchronizované provedení napříč celou platformou. Action Orchestrator nikdy nerozhoduje — pouze organizuje vykonání rozhodnutí.

---

## 2. Definice

Action Orchestrator je centrální koordinátor všech akcí. Je odpovědný za plánování vykonání, pořadí akcí, paralelizaci, synchronizaci, potvrzení dokončení, řešení chyb a zpětnou vazbu Decision Enginu.

---

## 3. Architektura

```
ACTION ORCHESTRATOR
├── Action Queue
├── Action Scheduler
├── Dependency Manager
├── Execution Planner
├── Parallel Executor
├── Synchronization Manager
├── Timeout Manager
├── Retry Manager
├── Rollback Manager
├── Completion Tracker
├── Feedback Collector
├── Metrics Collector
└── Action API
```

Každá komponenta má jednu jasně definovanou odpovědnost.

---

## 4. Hlavní princip

Decision Engine vytvoří plán. Action Orchestrator jej vykoná.

```
Decision
↓
Action Plan
↓
Orchestrator
↓
Jednotlivé systémy
↓
Výsledek
↓
Feedback
```

Rozhodnutí a vykonání jsou vždy odděleny.

---

## 5. Action Queue

Každý Action Plan je zařazen do vlastní fronty. Každá akce obsahuje ActionID, PlanID, Prioritu, Stav, Timeout a Závislosti. Fronta podporuje paralelní zpracování.

---

## 6. Action Scheduler

Scheduler určuje pořadí provedení. Bere v úvahu priority, závislosti, vytížení systému a dostupnost modulů. Scheduler nesmí měnit obsah Action Planu.

---

## 7. Dependency Manager

Některé akce mohou začít až po dokončení jiných. Například: výpočet bodů → aktualizace misky → výběr videa → overlay → speech. Dependency Manager hlídá správné pořadí.

---

## 8. Execution Planner

Rozděluje plán na jednotlivé úlohy pro moduly: Video, Overlay, Speech, Memory, Analytics. Každý modul dostává pouze svou část.

---

## 9. Parallel Executor

Pokud to závislosti dovolují, provádí akce současně — například Video, Overlay, Analytics a Memory paralelně. To výrazně zkracuje dobu odezvy.

---

## 10. Synchronization Manager

Některé akce musí skončit současně — spuštění videa, zobrazení overlaye a přehrání hlasu. Synchronizační body zajišťují správné načasování.

---

## 11. Timeout Manager

Každá akce má maximální dobu provedení.

| Modul        | Doporučený timeout |
| ------------ | ------------------ |
| Overlay      | 200 ms             |
| Video Engine | 2 s                |
| Speech       | 10 s               |
| AI           | 30 s               |
| OBS          | 5 s                |

Po překročení limitu je vyvolána chyba.

---

## 12. Retry Manager

Pokud akce selže: provede nový pokus, respektuje počet pokusů, zachová idempotenci a vytvoří audit. Retry pravidla určuje konfigurace.

---

## 13. Rollback Manager

Pokud se některé akce nepodaří dokončit, může být provedeno vrácení změn — například zrušení overlaye po selhání videa. Rollback se používá pouze tam, kde je bezpečný.

---

## 14. Completion Tracker

Sleduje průběh vykonávání. Každá akce může být ve stavu: Waiting → Running → Completed / Failed / Cancelled. Tracker poskytuje přehled o průběhu celého Action Planu.

---

## 15. Feedback Collector

Po dokončení každé akce sbírá výsledky: úspěch, chyba, délka vykonání, spotřebované prostředky, počet pokusů. Tyto informace jsou předány zpět Decision Enginu.

---

## 16. Metrics Collector

Orchestrator měří počet akcí, dobu vykonání, počet paralelních akcí, úspěšnost, chybovost, timeouty a rollbacky. Výsledky jsou dostupné Monitoring Systemu.

---

## 17. Integrace s MIA

Action Orchestrator komunikuje s OBS Manager, Overlay Engine, Video Engine, Speech Engine, Battle Engine, Kojnožrout Engine, Memory System, Economy Engine, Inventory, Analytics a Monitoring. Je centrálním koordinátorem vykonávání.

---

## 18. Typický příklad

Gift za 500 coinů:

```
Decision Engine
↓
Action Plan
↓
Výpočet bodů ║ Overlay ║ Výběr videa ║ Speech ║ Memory ║ Analytics
↓
Completion
↓
Feedback
```

Celý proces probíhá koordinovaně.

---

## 19. Zakázané činnosti

Action Orchestrator nesmí: vytvářet vlastní rozhodnutí, měnit ekonomiku, měnit obsah Memory, měnit pravidla Battle, měnit AI odpovědi ani obcházet Decision Engine. Je pouze koordinátorem vykonávání.

---

## 20. Kontrolní seznam implementace

- ☐ Existuje Action Orchestrator?
- ☐ Funguje Action Queue?
- ☐ Existuje Scheduler?
- ☐ Funguje Dependency Manager?
- ☐ Je podporováno paralelní vykonávání?
- ☐ Funguje Synchronization Manager?
- ☐ Jsou implementovány timeouty?
- ☐ Existuje Retry Manager?
- ☐ Funguje Rollback?
- ☐ Existuje Completion Tracker?
- ☐ Jsou sbírány metriky?
- ☐ Probíhá Feedback do Decision Enginu?

---

## 21. Vazba na současnou MIA

Action Orchestrator řídí přehrávání T1–T4 videí, spuštění správného overlaye, mluvené reakce MIA a Kojnožrouta, plnění misky, spuštění Battle animací, aktualizaci inventáře, zápisy do Memory, aktualizaci statistik a komunikaci s OBS. Tím se odstraní přímé vazby mezi jednotlivými moduly.

---

## 22. Budoucí evoluce

Action Orchestrator bude připraven pro více AI agentů, distribuované vykonávání, více počítačů současně, cloudové služby, mobilní klienty, autonomní správu streamu a inteligentní plánování zdrojů.

---

## 23. Poznámka architekta

Action Orchestrator je dirigent orchestru MIA. Hudbu neskládá a nerozhoduje, jaká skladba se bude hrát — to dělá Decision Engine. Jeho úkolem je zajistit, aby každý nástroj začal hrát ve správný okamžik, správným tempem a ve správném pořadí.

---

### Architektonická poznámka

Dokument **0030** bude věnován **Goal Management Systemu** — správě dlouhodobých i krátkodobých cílů MIA.
