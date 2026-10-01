# MIA MASTER CANON — Dokument 0026

**Název:** Emotional Memory – Emoční paměť MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Nejvyšší (Critical)

**Nadřazené dokumenty:**

- [0019 – Memory System](./0019-memory-system.md)
- [0022 – Long-Term Memory](./0022-long-term-memory.md)
- [0023 – Episodic Memory](./0023-episodic-memory.md)
- [0025 – Procedural Memory](./0025-procedural-memory.md)

---

## 1. Účel dokumentu

Emotional Memory umožňuje MIA emocionální kontinuitu — model dlouhodobého hodnocení zkušeností, vztahů a opakovaných interakcí. MIA si pamatuje důvěru, spolupráci, pozitivní i negativní situace.

---

## 2. Definice

Dlouhodobé emocionální vazby — nejen fakta, ale emocionální význam. Odpovídá na: **„Jaký význam měla tato zkušenost pro MIA?"**

---

## 3. Architektura

```
EMOTIONAL MEMORY
├── Emotion History
├── Relationship Engine
├── Trust Manager
├── Reputation Manager
├── Mood History
├── Emotion Context
├── Emotion Scoring
├── Emotion Consolidator
├── Emotion Timeline
├── Emotion Graph
├── Emotion Search
└── Emotional API
```

---

## 4. Hlavní princip

Událost → vyhodnocení → emoční význam → uložení → budoucí rozhodování.

---

## 5. Emotion History

Historie významných emocionálních zkušeností — rekordní stream, první Battle, velký gift, spolupracovník, chyba, úspěch.

---

## 6. Relationship Engine

Relationship Profile pro každou osobu — historie, interakce, důvěra, spolupráce, dlouhodobý vztah. Nikdy izolovaná jednorázová událost.

---

## 7. Trust Manager

Trust Score 0–100 podle aktivity, komunikace, podpory projektu, férovosti a pozitivních zkušeností. Není veřejně zobrazován.

---

## 8. Reputation Manager

Dlouhodobá pověst — podporovatel, tester, moderátor, aktivní člen, tvůrce obsahu.

---

## 9. Mood History

Vývoj emocionálního stavu MIA — období vývoje, Battle, testování, úspěchy.

---

## 10. Emotion Context

Čas, místo, platforma, účastníci, Battle, stream, Kojnožrout, výsledek.

---

## 11. Emotion Score

Rozsah -100 až +100 — intenzita, opakování, důležitost, dopad, vztahy, význam pro projekt.

---

## 12. Emotion Consolidator

Slučování podobných zkušeností — 100 pozitivních interakcí → dlouhodobá důvěra.

---

## 13. Emotion Timeline

Časová osa vztahu — první kontakt → Battle → testování → gift → spolupráce.

---

## 14. Emotion Graph

Emocionální vazby propojené s Knowledge Graphem — uživatelé, projekt, MIA, Kojnožrout, komunita, Battle.

---

## 15. Vyhledávání

Podle osoby, emocí, důvěry, reputace, období, významu, vztahů.

---

## 16. Integrace s Emotion Engine

Emotional Memory nerozhoduje — je zdrojem dat: Memory → Emotion Engine → Decision Engine → reakce.

---

## 17. Integrace s Kojnožroutem

Samostatná emocionální historie Kojnožrouta — dárci, Battle, předměty, nálada.

---

## 18. Zakázané činnosti

Nevytvářet skutečné emoce, nediskriminovat, neukládat neověřené závěry, neměnit historii bez auditu, nenahrazovat Decision Engine.

---

## 19. Kontrolní seznam implementace

Automatická kontrola: `tests/mia_master_canon_0026_contract.js` · [`0026-alignment.md`](./0026-alignment.md)

---

## 20. Vazba na současnou MIA

Přirozenější reakce na pravidelné diváky, zapamatování okamžiků, vztah MIA–Kojnožrout, atmosféra komunity, vývoj osobnosti.

---

## 21. Budoucí rozšíření

Emoční model více agentů, skupinové vztahy, hlasová/obrazová analýza, adaptivní osobnost, plánování podle vztahů.

---

## 22. Poznámka architekta

Emotional Memory není simulace lidských emocí — systém dlouhodobého hodnocení zkušeností a vztahů. Spolu s Episodic, Semantic a Procedural Memory tvoří základ osobnosti MIA.

---

**Architektonická poznámka:** Dokument **0027** bude věnován **Knowledge Graph** — centrální mapě světa MIA.
