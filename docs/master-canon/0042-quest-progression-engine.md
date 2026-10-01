# MIA MASTER CANON — Dokument 0042

**Název:** Quest & Progression Engine – Systém úkolů a dlouhodobého postupu MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Absolutně kritická (Progression Core)

**Nadřazené dokumenty:**

- [0041 – Economy Engine](./0041-economy-engine.md)
- [0040 – Inventory Engine](./0040-inventory-engine.md)
- [0039 – Battle Engine](./0039-battle-engine.md)

---

## 1. Účel dokumentu

Quest & Progression Engine je systém dlouhodobé motivace komunity. Vytváří cíle, odměny a pocit neustálého postupu během sledování streamů — questy, mise, levely, zkušenosti, odměny, sezóny, odemykání funkcí a dlouhodobou progresi komunity.

---

## 2. Definice

Každý hráč má vlastní progres. Každý Kojnožrout má vlastní progres. Celá komunita má společný progres. Tyto tři vrstvy se navzájem ovlivňují.

---

## 3. Architektura

```
QUEST & PROGRESSION ENGINE
├── Quest Manager
├── Progression Manager
├── XP Manager
├── Level Manager
├── Mission Manager
├── Season Manager
├── Reward Distributor
├── Unlock Manager
├── Progress Analytics
├── Progress History
├── Progress Persistence
└── Progress API
```

---

## 4. Hlavní princip

Každý postup probíhá stejným způsobem: Aktivita → XP → Level → Reward → Unlock → Historie. Veškerá progrese musí být auditovatelná.

---

## 5. Quest Manager

Spravuje všechny questy — QuestID, název, popis, podmínky, odměny, stav, dobu platnosti. Questy jsou plně datově řízené.

---

## 6. Typy questů

Daily Quest, Weekly Quest, Monthly Quest, Event Quest, Story Quest, Community Quest.

---

## 7. XP Manager

Spravuje zkušenostní body za aktivní chat, gifty, Battle, questy, eventy a achievementy. XP nejsou stejné jako ekonomické body.

---

## 8. Level Manager

Každá entita může mít level — divák, Kojnožrout, MIA, komunita, Battle tým. Level určuje odemčené možnosti.

---

## 9. Mission Manager

Mise jsou krátkodobé cíle — napiš 20 zpráv, nakrm Kojnožrouta, dokonči Battle, přiveď nového diváka, splň komunitní výzvu. Po dokončení následuje odměna.

---

## 10. Season Manager

Podporuje sezónní obsah — Léto, Halloween, Vánoce, Velikonoce, výročí projektu. Každá sezóna může mít vlastní questy, kosmetiku i ekonomiku.

---

## 11. Reward Distributor

Rozděluje odměny — XP, itemy, tituly, kosmetiku, speciální animace, Battle bonusy. Veškeré odměny procházejí Economy Engine.

---

## 12. Unlock Manager

Spravuje odemykání funkcí — nové animace, schopnosti Kojnožrouta, Battle itemy, efekty, hlasové reakce, mise. Odemčení je trvalé, pokud pravidla neurčí jinak.

---

## 13. Community Progression

Komunita sdílí společné cíle — 100 000 komentářů → nový Kojnožrout, 10 000 giftů → nová Battle aréna. Komunitní postup motivuje ke spolupráci.

---

## 14. Kojnožrout Progression

Každý Kojnožrout může získávat zkušenosti, levely, nové schopnosti, animace, útoky a kosmetické úpravy. Progrese je dlouhodobá.

---

## 15. Progress Analytics

Měří počet dokončených questů, získané XP, rychlost levelování, aktivitu komunity a oblíbenost questů. Výsledky využívá Monitoring.

---

## 16. Progress History

Každý postup je uložen — Quest → XP → Level → Reward → Archiv. Historie je neměnná.

---

## 17. Integrace s Battle

Battle může vytvářet Battle questy, Battle XP, Battle levely a Battle achievementy. Battle pouze oznamuje výsledky. Progresi řídí tento engine.

---

## 18. Integrace s Economy

Economy poskytuje ekonomické body, odměny a itemy. Quest Engine rozhoduje kdy, komu a za co.

---

## 19. Vazba na současnou MIA

Architektura podporuje body za chat, gifty, Bowl progres, itemy, Battle odměny, playlist, Kojnožrout progres a komunitní eventy. Tyto systémy budou propojeny přes Quest Engine.

---

## 20. Zakázané činnosti

Quest & Progression Engine nesmí měnit Battle logiku, ekonomické výpočty, Personality, Memory ani vytvářet itemy mimo Economy Engine. Je pouze systémem dlouhodobého postupu.

---

## 21. Kontrolní seznam implementace

- Existuje Quest Manager
- Funguje XP Manager
- Existuje Level Manager
- Funguje Mission Manager
- Existuje Season Manager
- Funguje Reward Distributor
- Existuje Unlock Manager
- Funguje Community Progression
- Existuje Progress History
- Přístup probíhá přes Progress API

---

## 22. Budoucí evoluce

Battle Pass, Guild Questy, světové eventy, komunitní hlasování, příběhové kampaně, evoluce Kojnožroutů, denní streaky, reputace hráčů a kooperativní mise mezi streamy.

---

## 23. Standard životního cyklu questu

Pipeline: Vytvoření → Aktivace → Plnění → Kontrola → Reward → Archivace. Každý krok je zaznamenán do historie.

---

## 24. Vazba na dlouhodobou vizi MIA

Quest & Progression Engine promění komunitu ze skupiny diváků na aktivní účastníky světa MIA — rozvoj hráčů, Kojnožroutů, společné cíle, odemykání nových částí projektu a motivace vracet se na další streamy.

---

## 25. Poznámka architekta

Quest & Progression Engine je dlouhodobá paměť úspěchů komunity. Zatímco Economy Engine řeší okamžité odměny a Battle Engine jednotlivé souboje, tento systém vytváří pocit růstu a kontinuity napříč měsíci i roky.

Dokument **0043** bude věnován **Achievement Engine**.
