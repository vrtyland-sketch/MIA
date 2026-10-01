# MIA MASTER CANON — Dokument 0040

**Název:** Inventory Engine – Inventář a systém předmětů MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Absolutně kritická (Gameplay Core)

**Nadřazené dokumenty:**

- [0039 – Battle Engine](./0039-battle-engine.md)
- [0030 – Goal Management System](./0030-goal-management-system.md)
- [0028 – Decision Engine](./0028-decision-engine.md)

---

## 1. Účel dokumentu

Inventory Engine je centrální systém pro správu všech předmětů v ekosystému MIA. Je odpovědný za inventáře diváků, Kojnožroutů, Battle inventáře, získávání a spotřebovávání itemů, vybavení, crafting, obchodování a ukládání inventářů. Je nezávislý na Battle systému — Battle jej pouze využívá.

---

## 2. Definice

Každý item existuje pouze jednou. Každý vlastník má pouze odkaz na item:

```
Item → Inventory → Battle → Použití → Výsledek
```

Item nikdy není přímo součástí Battle.

---

## 3. Architektura

```
INVENTORY ENGINE
├── Inventory Manager
├── Item Registry
├── Equipment Manager
├── Stack Manager
├── Crafting Manager
├── Loot Manager
├── Trade Manager
├── Inventory Validator
├── Inventory Analytics
├── Inventory History
├── Inventory Persistence
└── Inventory API
```

---

## 4. Hlavní princip

Každý předmět má ItemID, typ, vlastníka, stav, raritu a metadata. Veškeré změny jsou auditovány.

---

## 5. Inventory Manager

Spravuje všechny inventáře — InventoryID, OwnerID, seznam itemů, kapacitu a historii. Každá entita může mít více inventářů.

---

## 6. Typy inventářů

Player, Battle, Kojnožrout, Guild, Event a Temporary Inventory. Architektura je připravena na další typy.

---

## 7. Item Registry

Obsahuje všechny definice itemů — ItemID, název, popis, ikonu, typ, raritu, efekt a maximální počet. Registry je jediným zdrojem definic.

---

## 8. Typy itemů

Weapon, Armor, Food, Potion, Skill, Buff, Quest, Cosmetic, Key Item a Currency. Další typy lze přidávat.

---

## 9. Rarity System

Common → Uncommon → Rare → Epic → Legendary → Mythic → Unique. Rarita ovlivňuje pravděpodobnost získání, hodnotu a vizuální efekty.

---

## 10. Equipment Manager

Podporuje vybavení — hlava, tělo, ruce, doplněk, speciální slot. Kojnožrouti mohou mít vlastní vybavení.

---

## 11. Stack Manager

Některé itemy lze skládat (Jablko ×25). Jiné existují pouze jednotlivě.

---

## 12. Loot Manager

Řídí získávání itemů ze zdrojů — aktivní chat, gifty, Battle, eventy, achievementy, crafting. Loot systém používá konfigurovatelné tabulky.

---

## 13. Crafting Manager

Podporuje datově řízenou výrobu — např. Dřevo + Kámen → Prak.

---

## 14. Trade Manager

Spravuje obchodování — hráč ↔ hráč, hráč ↔ MIA, event obchod, aukce. Každý obchod je auditovaný.

---

## 15. Inventory Validator

Kontroluje duplicity, neplatné ItemID, překročení kapacity, poškozené záznamy a bezpečnost. Inventář musí být vždy konzistentní.

---

## 16. Inventory Analytics

Sleduje nejčastější itemy, využití, obchodování, crafting, spotřebu a ekonomiku Battle. Výsledky využívá Monitoring.

---

## 17. Inventory History

Každá změna je uložena — získání, přesun, použití, spotřebování, archiv. Historie je neměnná.

---

## 18. Integrace s Battle

Battle využívá Inventory Engine: Inventory → Battle Queue → Použití → Cooldown → Spotřeba. Battle nikdy nespravuje itemy přímo.

---

## 19. Vazba na současnou MIA

Inventář se plní aktivitou komunity. Gifty přidávají hodnotnější itemy, chat běžné itemy. Battle používá itemy z inventáře. Kojnožrouti mohou používat vlastní předměty.

---

## 20. Ekonomika získávání

Aktivní komentáře → běžné itemy. Dárky → kvalitnější itemy. Battle výhra → odměna. Event → speciální předměty. Achievement → unikátní předměty. Konkrétní hodnoty definuje Economy Engine.

---

## 21. Zakázané činnosti

Inventory Engine nesmí rozhodovat o Battle, měnit ekonomiku, Personality, vytvářet itemy mimo Loot Manager ani obcházet Decision Engine.

---

## 22. Kontrolní seznam implementace

- Existuje Inventory Manager
- Funguje Item Registry
- Existuje Equipment Manager
- Funguje Stack Manager
- Existuje Loot Manager
- Funguje Crafting
- Existuje Trade Manager
- Funguje Inventory History
- Existuje Inventory Persistence
- Přístup probíhá přes Inventory API

---

## 23. Budoucí evoluce

Sběratelské edice, tržiště, Battle Pass odměny, sezónní předměty, evoluce itemů, genetika Kojnožroutů, vybavení MIA a sdílené komunitní sklady.

---

## 24. Standard životního cyklu itemu

Vytvoření → Loot → Inventář → Použití → Cooldown → Spotřeba nebo trvalé vybavení → Archiv. Žádný item nesmí vzniknout mimo Item Registry a Loot Manager.

---

## 25. Poznámka architekta

Inventory Engine je logistickým centrem herního světa MIA. Odděluje správu předmětů od Battle systému, ekonomiky i rozhodovací logiky — inventář se stane společným majetkem komunity propojujícím Battle, eventy a Kojnožrouty.

Dokument **0041** bude věnován **Economy Engine** — sjednocení ekonomických systémů MIA.
