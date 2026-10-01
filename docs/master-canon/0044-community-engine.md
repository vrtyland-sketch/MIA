# MIA MASTER CANON — Dokument 0044

**Název:** Community Engine – Sociální systém komunity MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Absolutně kritická (Community Core)

**Nadřazené dokumenty:**

- [0019 – Memory System](./0019-memory-system.md)
- [0027 – Knowledge Graph](./0027-knowledge-graph.md)
- [0043 – Achievement Engine](./0043-achievement-engine.md)

---

## 1. Účel dokumentu

Community Engine je centrální sociální systém platformy MIA. Spravuje vztahy mezi diváky, MIA, Kojnožrouty, moderátory, VIP členy, komunitami, guildami a budoucími AI agenty. Komunita je živý sociální organismus.

---

## 2. Definice

Každý člen má profil, historii, reputaci, vztahy, inventář, achievementy a Battle historii. Community Engine propojuje všechny tyto informace.

---

## 3. Architektura

```
COMMUNITY ENGINE
├── Community Manager
├── User Profile Manager
├── Reputation Manager
├── Relationship Manager
├── Guild Manager
├── VIP Manager
├── Moderator Manager
├── Voting Manager
├── Community Analytics
├── Community History
├── Community Persistence
└── Community API
```

---

## 4. Hlavní princip

Interakce → Paměť → Reputace → Vztah → Komunita. Komunita se dlouhodobě vyvíjí.

---

## 5. Community Manager

Řídí celou komunitu — CommunityID, aktivní členy, statistiky, konfiguraci, historii.

---

## 6. User Profile Manager

Profil člena — UserID, jméno, platformy, datum příchodu, level, XP, Achievementy, reputace, Battle statistiky. Sdílen napříč platformou.

---

## 7. Reputation Manager

Reputace v rozsahu -1000 až 1000. Ovlivňuje aktivita, pomoc komunitě, Battle, dlouhodobá účast a porušování pravidel.

---

## 8. Relationship Manager

Vztahy MIA↔divák, Kojnožrout↔divák. Propojeno s Emotional Memory.

---

## 9. Guild Manager

Skupiny hráčů — GuildID, název, členy, statistiky, společný inventář, Battle historii.

---

## 10. VIP Manager

VIP Bronze, Silver, Gold, Founder, Legend. Odemkne kosmetiku, speciální reakce, exkluzivní Battle.

---

## 11. Moderator Manager

Oprávnění, historie zásahů, aktivita, úroveň důvěry. Akce jsou auditovány.

---

## 12. Voting Manager

Hlasování komunity — Battle mapa, animace, eventy, budoucí funkce, příběhové volby. Archivováno.

---

## 13. Community Analytics

Aktivní členové, noví členové, retence, průměrná aktivita, Battle účast, ekonomická aktivita.

---

## 14. Community History

Příchod → Battle → Achievement → Quest → Historie. Dlouhodobá paměť komunity.

---

## 15. Integrace s Memory

Long-Term Memory, Emotional Memory, Knowledge Graph — read-only reference adaptéry.

---

## 16. Integrace s Battle

Battle čte vztahy, Guildy, reputaci, týmové statistiky. Community Engine je spravuje.

---

## 17. Integrace s Economy

Reputační bonusy, komunitní odměny, Guild bonusy, VIP bonusy — výpočty provádí Economy Engine.

---

## 18. Integrace se současnou MIA

TikTok a Kick komunita, společná identita, Battle statistiky, dlouhodobé vztahy, oblíbení dárci, pravidelní diváci, komunitní eventy.

---

## 19. Zakázané činnosti

Nesmí měnit Battle logiku, ekonomiku, Personality, Decision Engine ani generovat AI odpovědi.

---

## 20. Kontrolní seznam implementace

- Existuje Community Manager
- Funguje User Profile Manager
- Existuje Reputation Manager
- Funguje Relationship Manager
- Existuje Guild Manager
- Funguje VIP Manager
- Existuje Voting Manager
- Funguje Community History
- Existuje Analytics
- Přístup probíhá přes Community API

---

## 21. Budoucí evoluce

Více komunit, propojení streamů, mezinárodní Guildy, komunitní války, světové eventy, reputační ligy, AI moderátoři, komunitní ekonomika.

---

## 22. Standard životního cyklu člena

První návštěva → Registrace → Komunikace → Battle → Questy → Achievementy → VIP → Legenda komunity.

---

## 23. Vazba na dlouhodobou vizi MIA

Propojí Memory, Knowledge Graph, Personality, Emotion, Battle, Economy, Inventory, Questy a Achievementy do dlouhodobých vztahů.

---

## 24. Poznámka architekta

Community Engine je společenským srdcem platformy MIA — živá síť vztahů, historie a společných zážitků napojená na Memory a Knowledge Graph.

Dokument **0045** bude věnován **World Engine**.
