# MIA MASTER CANON — Dokument 0027

**Název:** Knowledge Graph – Centrální graf znalostí a vztahů MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Nejvyšší (Critical)

**Nadřazené dokumenty:**

- [0019 – Memory System](./0019-memory-system.md)
- [0022 – Long-Term Memory](./0022-long-term-memory.md)
- [0023 – Episodic Memory](./0023-episodic-memory.md)
- [0024 – Semantic Memory](./0024-semantic-memory.md)
- [0025 – Procedural Memory](./0025-procedural-memory.md)
- [0026 – Emotional Memory](./0026-emotional-memory.md)

---

## 1. Účel dokumentu

Knowledge Graph je centrální mapa celého světa MIA — propojuje znalosti, vzpomínky, vztahy, procedury i emoce do jedné inteligentní sítě.

---

## 2. Definice

Orientovaný graf: uzel = objekt, hrana = vztah. MIA chápe souvislosti mezi objekty.

---

## 3. Architektura

```
KNOWLEDGE GRAPH
├── Entity Manager
├── Relationship Manager
├── Graph Database
├── Graph Index
├── Graph Search
├── Graph Reasoner
├── Graph Optimizer
├── Graph Validator
├── Graph Versioning
├── Graph Analytics
├── Graph Visualizer
└── Graph API
```

---

## 4. Hlavní princip

Entita + vztahy + metadata. Data bez vazeb nejsou úplná znalost.

---

## 5. Entity Manager

Entity s GraphID — uživatel, MIA, Kojnožrout, Battle, Gift, Overlay, Video, Projekt, Stream, AI Agent, Plugin.

---

## 6. Relationship Manager

Typy vztahů: JE, OBSAHUJE, POUŽÍVÁ, VLASTNÍ, VYTVOŘIL, PŘIJAL, PATŘÍ, SPOLUPRACUJE, OVLIVŇUJE, VZNIKLO_Z — verzované.

---

## 7. Typy entit

Person, AI Entity, Object, Event, Concept, System.

---

## 8. Metadata uzlů

GraphID, typ, název, datum vytvoření, poslední změna, verze, vlastník, stav.

---

## 9. Metadata vztahů

RelationID, typ, zdroj, cíl, síla vztahu (weight), čas, verze, důvěryhodnost.

---

## 10. Síla vztahu

Weight 0.0–1.0 — silnější vazby mají větší význam při rozhodování AI.

---

## 11. Graph Database

Grafová databáze — rychlé procházení, verzování, audit. Implementace oddělena od logiky.

---

## 12. Graph Search

Vyhledávání nad grafem — Battle, přátelé Kojnožrouta, projekty Váši, gifty streamu.

---

## 13. Graph Reasoner

Odvozování nových znalostí z existujících vztahů — bez explicitního zápisu.

---

## 14. Graph Validator

Kontrola neplatných vztahů, duplicit, cyklů, neexistujících entit, poškozených vazeb.

---

## 15. Graph Versioning

Verzovaný graf — obnova starších stavů.

---

## 16. Graph Analytics

Nejdůležitější entity, časté vztahy, vývoj komunity, hustota propojení.

---

## 17. Graph Visualizer

Zobrazení grafu pro administrátora — ladění systému.

---

## 18. Integrace s MIA

Memory, AI, Emotion, Decision, Battle, Economy, OBS, Runtime, Monitoring, Development — společný jazyk platformy.

---

## 19. Zakázané činnosti

Neukládat binární data, nenahrazovat logy, neměnit business logiku, nevytvářet neověřené vztahy.

---

## 20. Kontrolní seznam implementace

Automatická kontrola: `tests/mia_master_canon_0027_contract.js` · [`0027-alignment.md`](./0027-alignment.md)

---

## 21. Vazba na současnou MIA

Váša → Projekt MIA → Runtime → Event Bus → Memory → Battle → Kojnožrout → Overlay → OBS → TikTok → Komunita.

---

## 22. Budoucí evoluce

Sdílený graf více agentů, automatické vztahy, logické dokazování, plánování, internetové znalosti, graf komunity.

---

## 23. Poznámka architekta

Knowledge Graph je nervová mapa znalostí MIA — spojuje paměťové vrstvy do jednoho živého modelu reality.

---

**Architektonická poznámka:** Dokument **0028** bude věnován **Decision Engine**.
