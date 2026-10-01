# MIA MASTER CANON — Dokument 0020

**Název:** Working Memory – Pracovní paměť MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Nejvyšší (Critical)

**Nadřazené dokumenty:**

- [0019 – Memory System](./0019-memory-system.md)
- [0008 – Runtime Manager](./0008-runtime-manager.md)
- [0009 – Lifecycle Manager](./0009-lifecycle-manager.md)

---

## 1. Účel dokumentu

Working Memory je nejrychlejší a nejaktivnější vrstva paměti platformy MIA — prostor, ve kterém MIA „přemýšlí". Obsahuje informace potřebné právě v tomto okamžiku.

---

## 2. Definice Working Memory

Dočasná operační paměť pro: aktivní AI konverzaci, probíhající rozhodování, aktuální stream, právě přijaté události, krátkodobé plánování a aktivní úkoly. **Žádná informace zde nemá být uložena dlouhodobě.**

---

## 3. Architektura

```
WORKING MEMORY
├── Context Buffer
├── Active Conversation
├── Active Tasks
├── Decision Buffer
├── Event Context
├── Temporary Objects
├── Attention Manager
├── Focus Manager
├── Cache Manager
├── Memory Expiration
├── Synchronization Manager
└── Working Memory API
```

---

## 4. Hlavní princip

Working Memory obsahuje pouze informace, které MIA právě potřebuje. Po dokončení úlohy se pracovní prostor uvolní.

---

## 5. Context Buffer

Aktuální kontext: poslední otázka/odpověď, aktivní téma, jazyk, platforma, Battle, stav streamu.

---

## 6. Active Conversation

Právě probíhající komunikace. Po ukončení přesun do Short-Term Memory.

---

## 7. Active Tasks

Běžící úkoly: generování obrázku, video, AI odpověď, analýza giftu, Battle, overlay. Každý úkol má Task Context.

---

## 8. Decision Buffer

Informace pro aktuální rozhodnutí (gift → velikost → spam → battle → mood → reakce). Po rozhodnutí odstraněn.

---

## 9. Event Context

Kontext právě zpracovávané události: EventID, CorrelationID, Priority, Source, Subscribers, stav zpracování.

---

## 10. Temporary Objects

Dočasné objekty: rozpracované animace, AI návrhy, prompty, mezivýpočty. Nikdy do Long-Term bez Consolidatoru.

---

## 11. Attention Manager

Rozhoduje čemu věnovat pozornost (velký gift, moderátor, Battle, kritická chyba). Attention Score.

---

## 12. Focus Manager

Hlavní aktivní úkol s prioritou (Battle 100, Chat 70, Analytics 20).

---

## 13. Cache Manager

Rychlá cache: poslední AI odpovědi, dotazy, overlaye, konfigurace. Pravidelné čištění.

---

## 14. Expirace

Každá položka má dobu života. Po vypršení odstranění nebo přesun.

---

## 15. Synchronization Manager

Asynchronní přesuny Working → Short-Term → Long-Term.

---

## 16. Working Memory API

Operace: Create, Update, Read, Lock, Release, Delete Context. Přímý přístup do interních struktur zakázán.

---

## 17. Ochrana proti přetečení

Omezená kapacita — evikce, přesun do Short-Term, Warning, odmítnutí nízkoprioritních objektů.

---

## 18. Integrace s MIA

Conversation, Decision, Emotion, Kojnožrout, Battle, Overlay, Video, AI Engine, Scheduler, Runtime.

---

## 19. Zakázané činnosti

Working Memory nesmí ukládat dlouhodobé vzpomínky, archivovat, rozhodovat o ekonomice, nahrazovat databázi ani uchovávat neomezené množství informací.

---

## 20. Kontrolní seznam implementace

Automatická kontrola: `tests/mia_master_canon_0020_contract.js` · [`0020-alignment.md`](./0020-alignment.md)

---

## 21. Vazba na budoucí MIA

Extrémně vytížená část — více AI modelů, Battle scén, overlayů, stovek chatů, hlas, grafický editor, autonomní plánování.

---

## 22. Poznámka architekta

Working Memory je vědomí přítomného okamžiku. Informace zde nezůstávají navždy — slouží jen po dobu, kdy jsou skutečně potřebné.

---

**Architektonická poznámka:** Dokument **0021** — Short-Term Memory (most mezi Working a Long-Term).
