# MIA MASTER CANON — Dokument 0024

**Název:** Semantic Memory – Paměť znalostí a faktů  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Nejvyšší (Critical)

**Nadřazené dokumenty:**

- [0019 – Memory System](./0019-memory-system.md)
- [0022 – Long-Term Memory](./0022-long-term-memory.md)
- [0023 – Episodic Memory](./0023-episodic-memory.md)

---

## 1. Účel dokumentu

Semantic Memory představuje znalostní základnu MIA. Na rozdíl od Episodic Memory uchovává obecné znalosti, pravidla, definice, vztahy mezi pojmy a technické informace. Odpovídá na otázku: **„Co MIA ví?"**

---

## 2. Definice

Semantic Memory obsahuje informace nezávislé na konkrétním čase nebo události — co je Battle, gift, OBS, TikTok, architektura MIA, význam pojmů. Nejde o vzpomínky, ale o znalosti.

---

## 3. Architektura

```
SEMANTIC MEMORY
├── Concept Library
├── Knowledge Base
├── Rule Library
├── Ontology Manager
├── Taxonomy Manager
├── Knowledge Graph
├── Fact Validator
├── Knowledge Index
├── Semantic Search
├── Knowledge Versioning
├── Knowledge Import
├── Knowledge Export
└── Semantic API
```

---

## 4. Hlavní princip

Každá znalost musí být pravdivá, ověřitelná, verzovaná a propojená. Neověřené informace nesmí být uloženy jako fakta bez označení důvěryhodnosti.

---

## 5. Concept Library

Definice pojmů: Gift, Battle, Overlay, Event, Runtime, AI, Kojnožrout, Stream — název, definice, související pojmy, verze.

---

## 6. Knowledge Base

Znalosti MIA: architektura, ekonomika, Battle, struktura projektu, API dokumentace, pravidla OBS. Hlavní zdroj znalostí pro AI.

---

## 7. Rule Library

Pravidla platformy oddělená od kódu: Battle, Economy, Gift, Moderation, Overlay, Animation Rules.

---

## 8. Ontology Manager

Význam vztahů mezi pojmy — Gift JE TYP Event, Battle POUŽÍVÁ Gift, Kojnožrout JE Entity.

---

## 9. Taxonomy Manager

Hierarchie znalostí — Entity → Game Entity → Kojnožrout → Battle Kojnožrout.

---

## 10. Knowledge Graph

Propojené znalosti — OBS → Overlay → Video Engine → Gift → Battle → Economy → AI.

---

## 11. Fact Validator

Validace nových znalostí: správnost, duplicita, konflikt, aktuálnost, zdroj. Neověřené = návrhy.

---

## 12. Knowledge Index

Rychlé vyhledávání podle názvů, synonym, tagů, jazyků, oblastí a vztahů.

---

## 13. Semantic Search

Vyhledávání podle významu — dotaz „Jak fungují gifty?" vrátí i Battle, Economy, Video Engine, Kojnožrout, Overlay.

---

## 14. Verzování znalostí

Každá znalost má verzi — Battle Rules v1 → v2 → v3. MIA pracuje s historickými i aktuálními verzemi.

---

## 15. Import znalostí

Načítání z dokumentace, API, PDF, databází, projektových souborů — každý import auditován.

---

## 16. Export znalostí

Export dokumentace, pravidel, grafů, API, učebních dat — bez chráněných interních dat bez oprávnění.

---

## 17. Integrace s MIA

AI, Decision, Conversation, Emotion, Battle, Kojnožrout, Development, Documentation, Knowledge Graph, Moderation — nejčastější zdroj znalostí platformy.

---

## 18. Zakázané činnosti

Neukládat vzpomínky, nenahrazovat Episodic Memory, neukládat neověřené jako fakta, neměnit pravidla bez verzování, neporušovat konzistenci grafu.

---

## 19. Kontrolní seznam implementace

Automatická kontrola: `tests/mia_master_canon_0024_contract.js` · [`0024-alignment.md`](./0024-alignment.md)

---

## 20. Vazba na současnou MIA

Master Canon, Battle pravidla, ekonomika giftů, API dokumentace, overlay struktura, AI pravidla, animace, moduly, terminologie projektu.

---

## 21. Budoucí rozšíření

Automatické vytváření znalostí, vícejazyčné verze, externí zdroje, expertní systémy, logické odvozování, autonomní ontologie, sdílená báze instancí.

---

## 22. Poznámka architekta

Semantic Memory je encyklopedie MIA — Episodic odpovídá „Co se stalo?", Semantic „Co to znamená?". Společně tvoří základ inteligence platformy.

---

**Architektonická poznámka:** Dokument **0025** bude věnován **Procedural Memory** — paměti dovedností.
