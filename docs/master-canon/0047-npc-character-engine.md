# MIA MASTER CANON — Dokument 0047

**Název:** NPC & Character Engine – Systém postav a autonomních bytostí MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Absolutně kritická (Character Core)

**Nadřazené dokumenty:**

- [0046 – Story Engine](./0046-story-engine.md)
- [0045 – World Engine](./0045-world-engine.md)
- [0033 – Personality Engine](./0033-personality-engine.md)
- [0032 – Emotion Engine](./0032-emotion-engine.md)

---

## 1. Účel dokumentu

NPC & Character Engine je centrální systém všech inteligentních postav ve světě MIA — MIA, Kojnožroutů, NPC, budoucích AI postav, obchodníků, průvodců, Boss postav, zvířat a pomocníků. Každá postava existuje jako samostatná inteligentní entita.

---

## 2. Definice

Každá postava obsahuje identitu, osobnost, emoce, paměť, vztahy, statistiky, vybavení, schopnosti, cíle a historii. Postava není pouze obrázek — je to živý objekt.

---

## 3. Architektura

```text id="character0047"
NPC & CHARACTER ENGINE
├── Character Manager
├── Character Registry
├── Identity Manager
├── Behaviour Manager
├── Routine Manager
├── Relationship Manager
├── Character Stats
├── Equipment Manager
├── Character AI
├── Character Analytics
├── Character History
└── Character API
```

Každý modul má jednu odpovědnost.

---

## 4. Hlavní princip

```text id="characterflow0047"
Identita
↓
Osobnost
↓
Emoce
↓
Rozhodnutí
↓
Akce
↓
Paměť
```

Pouze konfigurace určuje rozdíly mezi postavami.

---

## 5. Character Manager

Řídí všechny aktivní postavy (CharacterID, typ, lokace, stav, AI profil, historie). Je hlavním koordinátorem.

---

## 6. Character Registry

Jediný zdroj definic postav — MIA, Kojnožrout Tank/Fighter/Assassin/Support, Obchodník, Kovář, Vypravěč, Boss.

---

## 7. Identity Manager

Jméno, věk (fiktivní), druh, původ, povolání, frakce, domov. Identita se mění pouze výjimečně.

---

## 8. Behaviour Manager

Klidný, agresivní, zvědavý, přátelský, opatrný, chaotický — chování využívá Personality Engine.

---

## 9. Routine Manager

```text id="routine0047"
Spánek → Práce → Volný čas → Battle → Odpočinek
```

Rutina vytváří iluzi živého světa.

---

## 10. Relationship Manager

```text id="relations0047"
MIA → Kojnožrout → Velmi silný vztah
NPC → Komunita → Neutrální vztah
```

Vztahy využívají Emotional Memory.

---

## 11. Character Stats

Zdraví, energie, hlad, zkušenosti, level, síla, obrana, charisma, inteligence — využitelné v Battle.

---

## 12. Equipment Manager

Oblečení, zbraně, nástroje, kosmetika, speciální předměty — správu provádí Inventory Engine.

---

## 13. Character AI

Obchodník, průvodce, Boss, MIA, Kojnožrout — AI používá Decision Engine, Personality Engine a Emotion Engine.

---

## 14. Character Analytics

Aktivita, Battle, dialogy, vztahy, oblíbenost, využití — výsledky využívá Monitoring.

---

## 15. Character History

Battle, dialogy, questy, vztahy, změny vybavení, vývoj — dlouhodobá historie postavy.

---

## 16. Integrace s World Engine

```text id="worldcharacter0047"
Svět → Region → Lokace → Postava
```

World Engine určuje prostředí, Character Engine řídí postavu.

---

## 17. Integrace se Story Engine

Dialogy, questy, NPC, Boss, spojenci — Character Engine poskytuje data Story Engine.

---

## 18. Integrace s Community

Vztahy s NPC, odemykání postav, pomoc Kojnožroutům, ovlivnění vývoje MIA — sociální vazby spravuje Community Engine.

---

## 19. Vazba na současnou MIA

**Hlavní postavy:** MIA, Kojnožrout Tank/Fighter/Assassin/Support.

**Budoucí NPC:** obchodník, kuchař, trenér, vypravěč, správce Battle, Boss postavy. Všechny využívají stejnou architekturu.

---

## 20. Zakázané činnosti

Character Engine nesmí měnit ekonomiku, World Engine, Decision Engine; nesmí obcházet Personality Engine ani vytvářet vlastní Battle pravidla.

---

## 21. Kontrolní seznam implementace

- Character Manager, Registry, Identity, Behaviour, Routine, Relationship, Character AI, History, Analytics
- Přístup přes Character API

---

## 22. Budoucí evoluce

Stovky NPC, autonomní AI postavy, obchodní systémy, rodiny, frakce, mazlíčci, spojenci, nepřátelé, procedurální postavy.

---

## 23. Standard životního cyklu postavy

```text id="characterlife0047"
Vytvoření → Registrace → Umístění → Rutina → Interakce → Vývoj → Historie
```

Postava nikdy neztrácí svou identitu.

---

## 24. Hierarchie hlavních postav MIA

- **Úroveň A:** MIA, Kojnožrout
- **Úroveň B:** Tank, Fighter, Assassin, Support
- **Úroveň C:** obchodníci, průvodci, správci, trenéři, Bossové
- **Úroveň D:** zvířata, dekorativní postavy, sezónní NPC

---

## 25. Poznámka architekta

NPC & Character Engine dává život všem bytostem světa MIA. Společná architektura identity, emocí, osobnosti a paměti umožní přidávat nové postavy bez zásahů do jádra a vytvoří základ pro svět obývaný stovkami inteligentních digitálních bytostí.

---

## Konec dokumentu 0047

**Architektonická poznámka:** Dokument **0048** bude věnován **Creature Evolution Engine** — evoluce Kojnožroutů, růst, mutace, genetika, schopnosti, vzhled, vzácné varianty a dlouhodobý vývoj.
