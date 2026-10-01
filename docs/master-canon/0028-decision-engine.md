# MIA MASTER CANON — Dokument 0028

**Název:** Decision Engine – Rozhodovací mozek MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Absolutně kritická (Core AI)

**Nadřazené dokumenty:**

- [0007 – Core System](./0007-core-system.md)
- [0019 – Memory System](./0019-memory-system.md)
- [0027 – Knowledge Graph](./0027-knowledge-graph.md)

---

## 1. Účel dokumentu

Decision Engine je centrální mozek MIA — jediná komponenta, která rozhoduje co, kdy, proč a jak udělat. Ostatní systémy poskytují informace nebo vykonávají příkazy.

---

## 2. Definice

Autonomní rozhodovací vrstva: přijímá informace, vyhodnocuje je, volí nejlepší akci a předává Action Plan Action Orchestratoru.

---

## 3. Architektura

```
DECISION ENGINE
├── Input Collector
├── Context Builder
├── Situation Analyzer
├── Goal Manager
├── Rule Evaluator
├── Emotion Adapter
├── Memory Adapter
├── Knowledge Adapter
├── Strategy Selector
├── Decision Planner
├── Risk Analyzer
├── Decision Validator
├── Action Generator
├── Learning Feedback
└── Decision API
```

---

## 4. Hlavní princip

Událost → kontext → analýza → možnosti → vyhodnocení → rozhodnutí → akce → vyhodnocení výsledku → učení. Žádný krok nesmí být přeskočen.

---

## 5. Input Collector

Sběr z Event Bus, Memory, Monitoring, OBS, AI, Battle, Kojnožrout, Chat, Scheduler — pouze sbírá, nerozhoduje.

---

## 6. Context Builder

Sestavení aktuálního obrazu situace z giftu, Battle, nálady, chatu, paměti a historie.

---

## 7. Situation Analyzer

Co se děje, důležitost, zapojené systémy, cíle — Situation Score.

---

## 8. Goal Manager

Více současných cílů s prioritami — chat, gift, Battle, výkon, stream.

---

## 9. Rule Evaluator

Battle, Economy, Safety, Moderation, Personality Rules — pravidla nad strategiemi.

---

## 10. Emotion Adapter

Načtení důvěry, vztahů, nálady z Emotional Memory — pouze čtení.

---

## 11. Memory Adapter

Všechny vrstvy paměti jako vstup rozhodování.

---

## 12. Knowledge Adapter

Souvislosti z Knowledge Graphu.

---

## 13. Strategy Selector

Výběr strategie při více řešeních — útočit, bránit, šetřit, poděkovat, odložit.

---

## 14. Decision Planner

Plán kroků — poděkovat, video, overlay, Kojnožrout, memory.

---

## 15. Risk Analyzer

Přetížení, konflikty, bezpečnost, ekonomické dopady — zamítnutí rizikových akcí.

---

## 16. Decision Validator

Ověření úplnosti, bezpečnosti, pravidel, konfliktů, zdrojů před odesláním.

---

## 17. Action Generator

Výstup je Action Plan, ne přímá exekuce — vykonává Action Orchestrator.

---

## 18. Learning Feedback

Vyhodnocení výsledku — posílení nebo úprava strategie.

---

## 19. Integrace s MIA

Komunikace se všemi systémy — centrální mozek platformy.

---

## 20. Zakázané činnosti

Nepřímo vykonávat akce, neměnit DB, nepřehrávat videa, neobcházet Action Orchestrator ani Safety Rules.

---

## 21. Kontrolní seznam implementace

Automatická kontrola: `tests/mia_master_canon_0028_contract.js` · [`0028-alignment.md`](./0028-alignment.md)

---

## 22. Vazba na současnou MIA

Rozhodování o gifech, videích T1–T4, řeči MIA/Kojnožrouta, Battle, spamu, náladě, chatu a paralelních akcích.

---

## 23. Budoucí evoluce

Paralelní agenti, plánování dopředu, autonomní stream, predikce, strategické Battle, dlouhodobé cíle.

---

## 24. Poznámka architekta

Decision Engine je mozek MIA — spojuje paměť, znalosti, emoce a monitoring do plánu akce. Rozhoduje, nevykonává.

---

**Architektonická poznámka:** Dokument **0029** bude věnován **Action Orchestratoru** — řetězec Event → Memory → Decision → Action → Učení.
