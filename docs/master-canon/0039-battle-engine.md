# MIA MASTER CANON — Dokument 0039

**Název:** Battle Engine – Systém soubojů MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Absolutně kritická (Gameplay Core)

**Nadřazené dokumenty:**

- [0028 – Decision Engine](./0028-decision-engine.md)
- [0029 – Action Orchestrator](./0029-action-orchestrator.md)
- [0038 – OBS Integration Layer](./0038-obs-integration-layer.md)

---

## 1. Účel dokumentu

Battle Engine je samostatný herní subsystém platformy MIA. Řídí všechny souboje, inventář, itemy, strategie, animace a vyhodnocení výsledků. Battle není pouze vizuální efekt — je to samostatná hra běžící během streamu.

---

## 2. Definice

Battle Engine spravuje Battle, Kojnožrouty, itemy, inventář, ekonomiku Battle, akce hráčů, AI strategii a statistiky. Battle běží nezávisle na TikTok Battle — TikTok pouze oznamuje začátek. O výsledku rozhoduje MIA.

---

## 3. Architektura

```
BATTLE ENGINE
├── Battle Manager
├── Battle Session Manager
├── Battle State Machine
├── Inventory Manager
├── Item Manager
├── Action Queue
├── Damage Calculator
├── AI Battle Controller
├── Battle Renderer
├── Battle Analytics
├── Battle History
└── Battle API
```

---

## 4. Hlavní princip

Každý Battle probíhá stejně:

```
Battle Start → Inventář → Použití itemů → Animace → Výpočet → Výsledek → Archivace
```

---

## 5. Battle Manager

Řídí celý Battle — BattleID, typ, stav, délku, účastníky a skóre. Je hlavním koordinátorem.

---

## 6. Battle Session Manager

Každý Battle je samostatná session — čas začátku a konce, historie akcí, aktivní hráči a použitý inventář. Po skončení se session archivuje.

---

## 7. Battle State Machine

Stavy: Waiting → Preparing → Starting → Active → Finishing → Completed → Archived. Přeskakování stavů není dovoleno.

---

## 8. Battle typy

Friendly, Ranked, Event, Boss, Community a Story Battle. Architektura umožňuje přidávání dalších typů.

---

## 9. Čtyři typy Kojnožroutů

**Tank** — vysoká obrana, pomalejší. **Fighter** — univerzální, vyvážený. **Assassin** — rychlý, vysoké poškození, malá obrana. **Support** — léčení, buffy, podpora týmu.

---

## 10. Inventory Manager

Každý Battle má vlastní inventář — itemy, jídlo, bonusy, buffy a obranné předměty. Inventář je oddělen od ekonomiky streamu.

---

## 11. Item Manager

Každý item obsahuje ItemID, název, typ, efekt, cooldown, cenu a raritu. Itemy jsou konfigurovatelné.

---

## 12. Akční fronta

Každá akce jde do Battle Queue. Pořadí určuje Battle Engine. Jeden hráč může použít jednu akci za definovaný interval.

---

## 13. Damage Calculator

Poškození počítá podle typu itemu, obrany, buffů, náhodného faktoru a Battle pravidel. Výpočet je deterministický při daném seedu.

---

## 14. AI Battle Controller

V AI Battle vyhodnocuje stav hry, zásoby, strategie, riziko a pravděpodobnost vítězství. Rozhoduje pouze v AI Battle.

---

## 15. Battle Renderer

Řídí Battle Overlay, animace, efekty, pohyb Kojnožroutů a HUD. Spolupracuje s Animation Engine a OBS Layer.

---

## 16. Battle Analytics

Měří počet Battle, výhry, prohry, použité itemy, strategie a délku soubojů. Výsledky využívá Monitoring.

---

## 17. Battle History

Každý Battle se ukládá — BattleID, účastníci, itemy, průběh, vítěz a statistiky. Historie je propojena s Memory.

---

## 18. Integrace s MIA

Battle Engine komunikuje s Decision Engine, Goal Manager, Emotion Engine, Animation Engine, Speech Engine, OBS Layer, Inventory, Economy a Analytics. Je samostatným herním subsystémem.

---

## 19. Vazba na současnou MIA

Battle se aktivuje při zahájení TikTok Battle — TikTok pouze spustí režim. O výsledku rozhodují itemy komunity. Inventář se plní během streamu. Battle standardně trvá 5 minut. MIA komentuje průběh. Kojnožrouti bojují na overlayi.

---

## 20. Zakázané činnosti

Battle Engine nesmí měnit ekonomiku streamu, Personality, Memory, obcházet Decision Engine ani přehrávat videa mimo Action Orchestrator.

---

## 21. Kontrolní seznam implementace

- Existuje Battle Manager
- Funguje Battle Session
- Existuje Battle State Machine
- Funguje Inventory
- Existuje Item Manager
- Funguje Battle Queue
- Existuje Damage Calculator
- Funguje AI Battle Controller
- Existuje Battle History
- Přístup probíhá přes Battle API

---

## 22. Budoucí evoluce

Battle Engine bude možné rozšířit o PvP turnaje, týmové Battle, Boss Raidy, kooperativní mise, sezóny, Battle Pass, AI protivníky, ligový systém, světovou mapu a sdílené Battle mezi streamy.

---

## 23. Poznámka architekta

Battle Engine je herním srdcem MIA. Dává komunitě možnost společně ovlivňovat souboje prostřednictvím inventáře a itemů. Oddělení od ekonomiky streamu umožňuje dlouhodobé rozšiřování bez zásahů do ostatních částí platformy.

Dokument **0040** bude věnován **Inventory Engine** — detailní správě inventáře a itemů.
