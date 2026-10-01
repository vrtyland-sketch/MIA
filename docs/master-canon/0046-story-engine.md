# MIA MASTER CANON — Dokument 0046

**Název:** Story Engine – Narativní systém MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Absolutně kritická (Narrative Core)

**Nadřazené dokumenty:**

- [0045 – World Engine](./0045-world-engine.md)
- [0044 – Community Engine](./0044-community-engine.md)
- [0034 – Conversation Engine](./0034-conversation-engine.md)

---

## 1. Účel dokumentu

Story Engine řídí celý příběh světa MIA — hlavní a vedlejší děje, NPC, události, volby komunity, kontinuitu, vývoj MIA a Kojnožroutů.

---

## 2. Definice

Každý příběh je samostatná entita s kapitolami, událostmi, dialogy, rozhodnutími a následky. Příběhy mohou běžet současně.

---

## 3. Architektura

```
STORY ENGINE
├── Story Manager
├── Chapter Manager
├── Event Manager
├── Dialogue Manager
├── NPC Manager
├── Choice Manager
├── Consequence Manager
├── Timeline Manager
├── Story Analytics
├── Story History
├── Story Persistence
└── Story API
```

---

## 4. Hlavní princip

Událost → Kapitola → Dialog → Rozhodnutí → Následky → Historie. Každé rozhodnutí může změnit svět.

---

## 5. Story Manager

StoryID, název, stav, kapitoly, aktivní postavy, historie.

---

## 6. Chapter Manager

Prolog → Kapitola I → Kapitola II → Finále → Epilog. Kapitoly se odemykají postupně.

---

## 7. Event Manager

Nalezení artefaktu, útok na vesnici, nový Kojnožrout, nová oblast, Battle šampionát.

---

## 8. Dialogue Manager

Speaker, text, emoce, podmínky, reakce. Propojeno s Conversation Engine.

---

## 9. NPC Manager

NPCID, jméno, osobnost, vztahy, lokace, příběh, dialogy.

---

## 10. Choice Manager

Komunitní volby ovlivňují další vývoj příběhu.

---

## 11. Consequence Manager

Změna regionu, nový quest, NPC, reputace, Battle. Dlouhodobé následky.

---

## 12. Timeline Manager

Hlavní děj, vedlejší děje, historické a budoucí události.

---

## 13. Story Analytics

Dokončené kapitoly, volby, oblíbené NPC, dokončené příběhy, aktivita komunity.

---

## 14. Story History

Kapitola → Rozhodnutí → Výsledek → Historie. Kronika světa.

---

## 15. Integrace s Community

Hlasování, odemykání kapitol, ovlivnění NPC, nové větve děje.

---

## 16. Integrace s World Engine

Story požaduje změny; World Engine je vykonává.

---

## 17. Integrace s Questy

Kapitola → Quest → Battle → Nová kapitola.

---

## 18. Integrace s Battle

Battle jako součást děje; výsledek může změnit příběh.

---

## 19. Vazba na současnou MIA

Původ Kojnožroutů, vznik MIA, první miska, legendární Battle, historie světa.

---

## 20. Zakázané činnosti

Nesmí měnit ekonomiku, Battle pravidla, Personality, Memory ani rozhodovat mimo Decision Engine.

---

## 21. Kontrolní seznam implementace

- Existuje Story Manager
- Funguje Chapter Manager
- Existuje Dialogue Manager
- Funguje NPC Manager
- Existuje Choice Manager
- Funguje Consequence Manager
- Existuje Timeline Manager
- Funguje Story History
- Existuje Analytics
- Přístup probíhá přes Story API

---

## 22. Budoucí evoluce

Větvené kampaně, komunitní scénáře, AI NPC, procedurální příběhy, hlasované konce, světové události.

---

## 23. Standard životního cyklu příběhu

Návrh → Schválení → Prolog → Kapitoly → Finále → Archivace.

---

## 24. Vazba na dlouhodobou vizi MIA

MIA jako vypravěč živého světa — každý stream je další kapitola společného příběhu.

---

## 25. Poznámka architekta

Story Engine je kronikářem světa MIA. World Engine vytváří prostor, Story Engine dává smysl, historii a budoucnost.

Dokument **0047** bude věnován **NPC & Character Engine**.
