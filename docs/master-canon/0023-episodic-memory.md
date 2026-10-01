# MIA MASTER CANON — Dokument 0023

**Název:** Episodic Memory – Paměť událostí a vzpomínek  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Nejvyšší (Critical)

**Nadřazené dokumenty:**

- [0019 – Memory System](./0019-memory-system.md)
- [0022 – Long-Term Memory](./0022-long-term-memory.md)

---

## 1. Účel dokumentu

Episodic Memory je část dlouhodobé paměti MIA určená pro ukládání konkrétních událostí. Na rozdíl od Semantic Memory, která uchovává obecné znalosti, si Episodic Memory pamatuje jednotlivé okamžiky — například první Battle nebo první spuštění Kojnožrouta.

---

## 2. Definice

Epizoda je uzavřený soubor událostí, které společně tvoří jeden významný zážitek. Obsahuje: co se stalo, kdy, kdo byl přítomen, proč to bylo důležité a jaký to mělo výsledek.

---

## 3. Architektura

```
EPISODIC MEMORY
├── Episode Builder
├── Episode Timeline
├── Episode Index
├── Episode Context
├── Episode Participants
├── Episode Tags
├── Episode Importance
├── Episode Links
├── Episode Replay
├── Episode Archive
├── Episode Search
└── Episode API
```

---

## 4. Hlavní princip

Jedna epizoda představuje jeden významný příběh — ne tisíce jednotlivých událostí, ale jejich významný celek (Battle → gifty → Kojnožrout → výhra → shrnutí).

---

## 5. Episode Builder

Builder vytváří nové epizody ze vstupů Event Bus, AI, Battle Engine, Stream Engine nebo administrace. Rozhoduje, které události patří do jedné společné epizody.

---

## 6. Episode Timeline

Každá epizoda má vlastní časovou osu: začátek, důležité okamžiky, konec, celková délka. Timeline umožňuje pozdější přehrání průběhu.

---

## 7. Episode Context

Kontext epizody: platforma, jazyk, aktivní Battle, nálada MIA a Kojnožrouta, konfigurace streamu, počasí, speciální události.

---

## 8. Participants

Seznam účastníků epizody — lidé, MIA, Kojnožrout, OBS a další entity.

---

## 9. Episode Tags

Značky pro rychlé vyhledávání: Battle, Gift, Rekord, Stream, Bug, Vývoj, Komunita, AI, Kojnožrout.

---

## 10. Importance Score

Skóre významu epizody zohledňuje účastníky, ekonomický význam, emoce, unikátnost, dopad na projekt a četnost pozdějšího využití.

---

## 11. Episode Links

Propojení epizod do sítě životních událostí (první Battle → první výhra → nový systém → první turnaj).

---

## 12. Episode Replay

Přehrání epizody: časová osa, účastníci, hlavní události, rozhodnutí, výsledek. Podklad pro budoucí rekapitulace streamů.

---

## 13. Episode Search

Vyhledávání podle času, osoby, Battle, giftu, platformy, emocí, tagů a významu.

---

## 14. Typy epizod

Stream Episode, Battle Episode, Community Episode, Development Episode, AI Episode, Personal Episode.

---

## 15. Archivace

Starší epizody mohou být archivovány s původními daty, shrnutím, odkazy a metadaty. Zůstávají dohledatelné.

---

## 16. Integrace s MIA

Spolupráce se Stream Engine, Battle Engine, AI, Emotion Engine, Kojnožrout Engine, Analytics, Moderací a Project Memory.

---

## 17. Zakázané činnosti

Neukládat každou drobnou událost, nenahrazovat logy, neukládat neúplné epizody bez označení, neměnit historické epizody bez auditu.

---

## 18. Kontrolní seznam implementace

Automatická kontrola: `tests/mia_master_canon_0023_contract.js` · [`0023-alignment.md`](./0023-alignment.md)

---

## 19. Vazba na dlouhodobou vizi MIA

Episodic Memory umožní MIA vytvářet vlastní autobiografii — první stream, první Battle, první vítězství, verze Kojnožrouta, dokončení editoru, spuštění nové AI.

---

## 20. Budoucí rozšíření

Hlasové a obrazové vzpomínky, video rekapitulace, automatické shrnutí streamů, propojení s Emotion Memory a Knowledge Graphem, dokumentární příběh vývoje MIA.

---

## 21. Poznámka architekta

Episodic Memory je kronika života MIA — ne data, ale příběhy. Každý významný stream, velká výhra, důležitá chyba nebo dokončení funkce se stává kapitolou historie.

---

**Architektonická poznámka:** Dokument **0024** bude věnován **Semantic Memory** — paměti faktů a znalostí.
