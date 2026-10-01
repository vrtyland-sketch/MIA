# MIA MASTER CANON — Dokument 0021

**Název:** Short-Term Memory – Krátkodobá paměť MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Nejvyšší (Critical)

**Nadřazené dokumenty:**

- [0019 – Memory System](./0019-memory-system.md)
- [0020 – Working Memory](./0020-working-memory.md)

---

## 1. Účel dokumentu

Short-Term Memory (STM) uchovává informace stále důležité, ale už mimo okamžité rozhodování. Zůstávají minuty, hodiny nebo celý stream. STM je most mezi Working Memory a dlouhodobou pamětí.

---

## 2. Definice

STM uchovává: nedávné události, konverzace, aktuální vztahy, stav streamu, aktivní Battle, historii giftů, poslední rozhodnutí AI.

---

## 3. Architektura

```
SHORT-TERM MEMORY
├── Conversation Memory
├── Stream Memory
├── User Session Memory
├── Gift Memory
├── Battle Memory
├── Overlay Memory
├── Emotion Context
├── Relationship Context
├── Temporary Knowledge
├── Memory Expiration
├── Memory Synchronizer
└── STM API
```

---

## 4. Hlavní princip

> „Bude tato informace ještě pravděpodobně potřeba během současného streamu nebo konverzace?"

Pokud ano → STM. Pokud ne → zanikne nebo Long-Term Memory.

---

## 5. Conversation Memory

Historie aktuálních konverzací: otázky, odpovědi, téma, jazyk, rozpracované myšlenky.

---

## 6. Stream Memory

Průběh probíhajícího streamu: začátek, momenty, Battle, rekordní gift, scény, videa, eventy.

---

## 7. User Session Memory

Session per aktivní uživatel: příchod, zprávy, gifty, reakce MIA, kontext. Po odchodu uzavření.

---

## 8. Gift Memory

Historie giftů (např. posledních 500): dárce, čas, Battle, reakce MIA a Kojnožrouta.

---

## 9. Battle Memory

Průběh aktivního Battle: kolo, itemy, pořadí akcí, skóre, čas, stav Kojnožroutů. Po konci Battle Summary.

---

## 10. Overlay Memory

Aktivní grafické prvky: bubliny, animace, overlaye, videa, fronta přehrávání.

---

## 11. Emotion Context

Krátkodobý emocionální kontext ovlivňující následující reakce MIA.

---

## 12. Relationship Context

Krátkodobé vztahy s aktivními diváky během streamu.

---

## 13. Temporary Knowledge

Dočasné znalosti: speciální event, soutěž, bonus, challenge.

---

## 14. Expirace

TTL per typ (Chat 10–30 min, Gift celý stream, Battle do konce, User Session do odchodu).

---

## 15. Memory Score

Četnost, význam, vazby, opakování, emoce, hodnota pro AI → rozhodnutí o přesunu do LTM.

---

## 16. Memory Synchronizer

Čištění, přesun důležitých informací, slučování, příprava pro Long-Term Memory.

---

## 17. Přístup ostatních systémů

Pouze přes STM API — Conversation, Decision, Emotion, Battle, Gift, Overlay, Video, AI Planner, Moderation, Scheduler.

---

## 18. Zakázané činnosti

STM nesmí nahrazovat LTM, ukládat trvalé znalosti, uchovávat neomezeně, obcházet API ani rozhodovat o pravdě.

---

## 19. Kontrolní seznam implementace

Automatická kontrola: `tests/mia_master_canon_0021_contract.js` · [`0021-alignment.md`](./0021-alignment.md)

---

## 20. Vazba na současnou MIA

Spam giftů (5s okno), navazování v chatu, aktivní diváci, miska Kojnožrouta, fronta videí T1–T4, Battle, overlay koordinace.

---

## 21. Budoucí rozšíření

Paralelní konverzace, více streamů, týmová AI, hlas, emoce z hlasu, kamera, živé plánování.

---

## 22. Poznámka architekta

STM je krátkodobá zkušenost MIA — co se dělo před minutami, kdo mluví, jak se vyvíjí Battle. Bez ní by každá odpověď vznikala izolovaně.

---

**Architektonická poznámka:** Od **0022** začíná **Long-Term Memory**.
