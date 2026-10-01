# MIA MASTER CANON — Dokument 0045

**Název:** World Engine – Správa světa MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Absolutně kritická (World Core)

**Nadřazené dokumenty:**

- [0044 – Community Engine](./0044-community-engine.md)
- [0042 – Quest & Progression Engine](./0042-quest-progression-engine.md)
- [0039 – Battle Engine](./0039-battle-engine.md)

---

## 1. Účel dokumentu

World Engine je centrální systém správy digitálního světa MIA — živý svět s MIA, Kojnožrouty, komunitou, lokacemi, příběhy, Battle arénami, eventy a prostředím.

---

## 2. Definice

Svět MIA je dlouhodobě existující prostředí. Změny ovlivňují Battle, Questy, ekonomiku, animace, příběhy a komunitu. Svět se neresetuje po každém streamu.

---

## 3. Architektura

```
WORLD ENGINE
├── World Manager
├── Region Manager
├── Location Manager
├── Environment Manager
├── Weather Manager
├── Time Manager
├── Event Manager
├── Story Manager
├── World Analytics
├── World History
├── World Persistence
└── World API
```

---

## 4. Hlavní princip

Událost → World Update → Region → Lokace → Komunita → Historie. Svět je dlouhodobě konzistentní.

---

## 5. World Manager

Řídí celý svět — WorldID, aktivní regiony, stav, konfiguraci, historii.

---

## 6. Region Manager

Regiony — Vesnice Kojnožroutů, Battle Aréna, Les, Jeskyně, Přístav, Chrám. Každý region má vlastní pravidla.

---

## 7. Location Manager

Lokace v regionu — Battle Arena, Hostinec, Miska, Dům MIA, Tržiště. Lokace mohou obsahovat objekty.

---

## 8. Environment Manager

Světlo, vegetace, dekorace, sezónní vzhled, efekty.

---

## 9. Weather Manager

Slunečno, déšť, mlha, bouřka, sníh, vítr. Počasí ovlivňuje Battle i eventy.

---

## 10. Time Manager

Ráno → Den → Večer → Noc. Denní doba mění animace, hudbu, eventy a dostupné questy.

---

## 11. Event Manager

Halloween, Vánoce, Battle Festival, Den Kojnožroutů, výročí projektu. Události mohou měnit celý svět.

---

## 12. Story Manager

Kapitoly, hlavní děj, vedlejší děje, NPC, dialogy. Příběh je dlouhodobý.

---

## 13. World Analytics

Aktivní regiony, nejnavštěvovanější lokace, eventy, Battle oblasti, komunitní aktivita.

---

## 14. World History

Nový region → Nový event → Battle → Historie. Historie vytváří živý svět.

---

## 15. Integrace s Battle

Battle využívá arény, počasí, denní dobu a speciální lokace. Battle nikdy nespravuje svět.

---

## 16. Integrace s Questy

Questy závislé na lokaci, regionu, počasí, denní době a sezóně. World Engine poskytuje data.

---

## 17. Integrace s Community

Společné stavby, odemykání regionů, komunitní eventy, hlasování o změnách.

---

## 18. Vazba na současnou MIA

Domov Kojnožroutů, Battle mapy, miska, tržiště, zahrada, laboratoř MIA, tréninková aréna.

---

## 19. Zakázané činnosti

Nesmí řídit Battle, měnit ekonomiku, Personality, Decision Engine ani generovat AI odpovědi.

---

## 20. Kontrolní seznam implementace

- Existuje World Manager
- Funguje Region Manager
- Existuje Location Manager
- Funguje Environment Manager
- Existuje Weather Manager
- Funguje Time Manager
- Existuje Story Manager
- Funguje World History
- Existuje Analytics
- Přístup probíhá přes World API

---

## 21. Budoucí evoluce

Otevřený svět, více kontinentů, podzemí, cestování, NPC vesnice, komunitní města, dynamické počasí, živá ekonomika světa.

---

## 22. Standard životního cyklu světa

Návrh → Schválení → Aktualizace → Synchronizace → Render → Historie. Svět se nikdy nemění bez záznamu.

---

## 23. Vazba na dlouhodobou vizi MIA

Jednotný svět propojující Battle, Questy, Komunitu, Achievementy, Inventory, Kojnožrouty a MIA.

---

## 24. Návrh výchozí mapy světa MIA

Centrální oblast (Dům MIA, miska, náměstí), Battle oblast (trénink, turnaj, boss), Dobrodružná oblast (les, jeskyně, hrad), Komunitní oblast (tržiště, síň legend, VIP klubovna).

---

## 25. Poznámka architekta

World Engine je digitální vesmír MIA — společný domov všech subsystémů s dlouhodobou pamětí a historií.

Dokument **0046** bude věnován **Story Engine**.
