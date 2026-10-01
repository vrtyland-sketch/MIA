# MIA MASTER CANON — Dokument 0041

**Název:** Economy Engine – Ekonomický systém MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Absolutně kritická (Economy Core)

**Nadřazené dokumenty:**

- [0039 – Battle Engine](./0039-battle-engine.md)
- [0040 – Inventory Engine](./0040-inventory-engine.md)
- [0028 – Decision Engine](./0028-decision-engine.md)

---

## 1. Účel dokumentu

Economy Engine je centrální ekonomický systém platformy MIA. Řídí všechny body, odměny, progresi a ekonomické vztahy — převod giftů, aktivitu chatu, Bowl systém, Battle body, Playlist body, itemy, achievementy a ekonomickou stabilitu. Veškerá ekonomika existuje pouze zde.

---

## 2. Definice

Každá ekonomická změna vzniká podle schématu:

```
Událost → Výpočet → Body → Reward → Inventory → Memory
```

Žádný jiný systém nesmí měnit ekonomiku.

---

## 3. Architektura

```
ECONOMY ENGINE
├── Economy Manager
├── Point Calculator
├── Gift Economy
├── Chat Economy
├── Bowl Economy
├── Playlist Economy
├── Reward Manager
├── Achievement Manager
├── Economy Validator
├── Economy Analytics
├── Economy History
└── Economy API
```

---

## 4. Hlavní princip

Ekonomika musí být spravedlivá, předvídatelná, odolná proti zneužití a dlouhodobě stabilní. Každá změna je auditována.

---

## 5. Economy Manager

Řídí všechny ekonomické procesy — EconomyID, aktivní pravidla, konfiguraci, limity a stav. Je hlavním koordinátorem ekonomiky.

---

## 6. Point Calculator

Počítá všechny body. Výchozí pravidla: **1 coin = 7,5 bodu**, **1 validní komentář = 7,5 bodu** (bez spamu, s časovým limitem, smysluplný text).

---

## 7. Chat Economy

Maximálně 1 započítaný komentář za 3 sekundy na uživatele. Spam se nezapočítává. Moderátorské zprávy lze konfigurovat samostatně.

---

## 8. Gift Economy

Gift Economy převádí TikTok a Kick gifty na body: `Coiny × 7,5 → Body`. Gift mapa je v samostatné databázi.

---

## 9. Bowl Economy

Body plní Bowl (0–100 %). Po 100 %: spustí se Tier T4, Bowl se resetuje, událost se uloží do Memory. Plnění pouze přes Economy Engine.

---

## 10. Playlist Economy

**250 bodů = 1 skladba do fronty.** Body se odečítají až při zařazení. Playlist je nezávislý na Battle.

---

## 11. Reward Manager

Spravuje odměny — item, Battle bonus, achievement, kosmetika, titul, speciální event. Každá odměna vzniká podle pravidel.

---

## 12. Achievement Manager

Řídí úspěchy — první Battle, první gift, 100 komentářů, 1000 bodů, první vítězství. Achievement může odemknout odměnu.

---

## 13. Limity

Denní, hodinový, anti-spam, anti-bot a Battle limit. Limity chrání ekonomiku.

---

## 14. Economy Validator

Kontroluje záporné body, duplicity, překročení limitů, neplatné převody a poškozená data. Každá změna musí projít validací.

---

## 15. Economy Analytics

Sleduje celkové body, získané a utracené body, aktivitu komunity, Battle ekonomiku a ekonomiku Bowl. Monitoring využívá tato data.

---

## 16. Economy History

Každá ekonomická operace je uložena — Gift → Body → Reward → Inventory → Historie. Historie je neměnná.

---

## 17. Integrace s Battle

Battle používá Economy Engine pro Battle odměny, body, achievementy a loot. Výpočet ekonomiky neprobíhá uvnitř Battle.

---

## 18. Integrace s Inventory

Economy Engine vytváří itemy, Inventory je pouze ukládá: `Body → Reward → Item → Inventory`. Oddělení odpovědností je povinné.

---

## 19. Vazba na současnou MIA

Převody: 1 coin = 7,5 bodu, 1 validní komentář = 7,5 bodu. Milníky: 37,5 děkování, 75 item, 150 Battle, 250 playlist. Bowl: plnění body, T4 při 100 %, automatický reset.

---

## 20. Zakázané činnosti

Economy Engine nesmí řídit Battle, měnit Personality, Memory, generovat overlaye ani přehrávat videa. Je pouze ekonomickou vrstvou.

---

## 21. Kontrolní seznam implementace

- Existuje Economy Manager
- Funguje Point Calculator
- Existuje Gift Economy
- Funguje Chat Economy
- Existuje Bowl Economy
- Funguje Playlist Economy
- Existuje Reward Manager
- Funguje Achievement Manager
- Existuje Economy History
- Přístup probíhá přes Economy API

---

## 22. Budoucí evoluce

Komunitní ekonomika, obchod mezi hráči, sezónní měny, Battle Pass, questy, aukce, denní úkoly, reputační body a ekonomika více serverů.

---

## 23. Standard ekonomické operace

Pipeline: Event → Validator → Výpočet → Body → Reward → Inventory → Memory → Analytics. Žádná změna nesmí obejít tuto pipeline.

---

## 24. Poznámka architekta

Economy Engine je krevní oběh platformy MIA. Propojuje komunitu, Battle, inventář, Bowl i dlouhodobou progresi do jednoho konzistentního modelu. Oddělení od ostatních systémů umožňuje měnit pravidla bez zásahů do Battle, Inventory nebo Decision Engine.

Dokument **0042** bude věnován **Quest & Progression Engine**.
