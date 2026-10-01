# MIA MASTER CANON — Dokument 0019

**Název:** Memory System – Architektura paměti MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Nejvyšší (Critical)

**Nadřazené dokumenty:**

- [0006 – Architektura platformy](./0006-platform-architecture.md)
- [0007 – Core System](./0007-core-system.md)
- [0008 – Runtime Manager](./0008-runtime-manager.md)

---

## 1. Účel dokumentu

Memory System představuje **paměť celé MIA**.

Stejně jako je Event Bus nervovou soustavou platformy, Memory System je její dlouhodobá i krátkodobá paměť. Bez něj MIA zapomíná, neumí se učit, nepoznává uživatele a nedokáže budovat vlastní zkušenosti.

---

## 2. Definice Memory Systemu

Memory System je samostatný systém platformy určený pro ukládání informací, vyhledávání znalostí, správu kontextu, zkušeností, osobnosti a historie a podporu rozhodování AI.

Memory **není databáze**. Databáze ukládá data. Memory ukládá **význam**.

---

## 3. Architektura Memory Systemu

```
MEMORY SYSTEM
├── Working Memory
├── Short-Term Memory
├── Long-Term Memory
├── Episodic Memory
├── Semantic Memory
├── Procedural Memory
├── Emotional Memory
├── Context Manager
├── Knowledge Graph
├── Memory Index
├── Memory Search
├── Memory Consolidator
├── Memory Cleaner
├── Memory Backup
└── Memory API
```

Každá část bude mít vlastní dokument.

---

## 4. Hlavní princip

Každá informace musí odpovědět na: **CO** (co se stalo), **KDY** (kdy), **PROČ** (proč je důležité), **JAK DLOUHO** (doba uchování). Bez těchto odpovědí informace není vhodná pro Memory System.

---

## 5. Typy paměti

Sedm základních druhů: **Working**, **Short-Term**, **Long-Term**, **Episodic**, **Semantic**, **Procedural**, **Emotional**.

---

## 6. Memory Context

Každá informace musí mít kontext (od koho, na jakém streamu, jak reagovala MIA, Kojnožrout, výsledek). Paměť bez kontextu ztrácí význam.

---

## 7. Životní cyklus vzpomínky

```
Created → Working → Short-Term → Evaluation → Long-Term → Archive → Deletion
```

Ne každá informace se dostane do dlouhodobé paměti.

---

## 8. Konsolidace paměti

Memory Consolidator rozhoduje co ponechat, přesunout, sloučit nebo odstranit. Např. 100 podobných chatových zpráv → jedna souhrnná informace.

---

## 9. Hodnota informace

Každá informace dostává **Memory Score** (důležitost, četnost, stáří, vazby, význam pro AI).

---

## 10. Vazby mezi vzpomínkami

Memory je **síť**, ne seznam. Jedna vzpomínka může být propojena s desítkami dalších.

---

## 11. Knowledge Graph

Graf znalostí propojuje entity a vztahy (např. Váša → vytvořil → MIA → obsahuje → Kojnožrout).

---

## 12. Vyhledávání

Memory Search podle času, osoby, platformy, tématu, emocí, typu informace a relevance. Musí být velmi rychlé.

---

## 13. Zapomínání

Odstranění bezvýznamných informací, sloučení podobných, archivace starých. Paměť nesmí růst neomezeně.

---

## 14. Zálohování

Memory Backup — obnova celé paměti, jedné vzpomínky nebo konkrétního časového okamžiku bez poškození ostatních částí.

---

## 15. Integrace s MIA

AI, Kojnožrout, Gift Engine, Economy, Overlay, OBS, Analytics, Moderation, Graphics Editor — čtení/zápis pouze přes **Memory API**.

---

## 16. Zakázané činnosti

Memory nesmí přímo řídit AI, rozhodovat za Decision Engine, měnit ekonomiku/grafiku ani obcházet oprávnění.

---

## 17. Kontrolní seznam implementace

Automatická kontrola: `tests/mia_master_canon_0019_contract.js` · [`0019-alignment.md`](./0019-alignment.md)

---

## 18. Dlouhodobá vize

Dlouholetí diváci, historie streamů, oblíbené vtípky, vývoj Kojnožrouta, vlastní chyby, úspěšné strategie — dlouhodobé vztahy MIA s komunitou.

---

## 19. Poznámka architekta

Memory System není obyčejná databáze. Je to zkušenost MIA — události se mění ve znalosti, znalosti ve zkušenosti a zkušenosti v osobnost. Event Bus je nervová soustava, Core srdce, Memory System **mozek** platformy.

---

**Architektonická poznámka:** Od **0020** začíná detailní rozpracování částí Memory Systemu — začínáme **Working Memory**.
