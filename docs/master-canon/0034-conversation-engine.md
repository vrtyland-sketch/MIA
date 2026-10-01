# MIA MASTER CANON — Dokument 0034

**Název:** Conversation Engine – Komunikační systém MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Absolutně kritická (Core AI)

**Nadřazené dokumenty:**

- [0028 – Decision Engine](./0028-decision-engine.md)
- [0032 – Emotion Engine](./0032-emotion-engine.md)
- [0033 – Personality Engine](./0033-personality-engine.md)
- [0019 – Memory System](./0019-memory-system.md)

---

## 1. Účel dokumentu

Conversation Engine je centrální systém řízení komunikace MIA. Řídí průběh komunikace mezi MIA, Kojnožroutem, diváky, moderátory, administrátory a ostatními AI agenty. Vytváří iluzi přirozené konverzace.

---

## 2. Definice

Conversation Engine odpovídá na otázku „Jak bude MIA komunikovat?“. Je propojen s Personality Engine, Emotion Engine, Decision Engine, Memory System a Speech Engine.

---

## 3. Architektura

```
CONVERSATION ENGINE
├── Conversation Manager
├── Context Manager
├── Dialogue Planner
├── Intent Analyzer
├── Topic Tracker
├── Speaker Manager
├── Turn Manager
├── Response Builder
├── Language Manager
├── Conversation History
├── Conversation Metrics
└── Conversation API
```

---

## 4. Hlavní princip

Každá zpráva prochází: Chat → Analýza → Kontext → Paměť → Rozhodnutí → Odpověď → Uložení. Každá odpověď vzniká na základě kontextu.

---

## 5. Conversation Manager

Řídí všechny aktivní konverzace. Každá konverzace má ConversationID, účastníky, historii, stav a prioritu. Jedna MIA může vést více konverzací současně.

---

## 6. Context Manager

Spravuje kontext — předchozí otázky, poslední odpovědi, aktivní Battle, aktuální stream, jazyk a téma. Kontext je ukládán do Working Memory.

---

## 7. Dialogue Planner

Plánuje průběh rozhovoru — pozdrav, odpověď, doplňující otázka, shrnutí. Konverzace není pouze sled izolovaných vět.

---

## 8. Intent Analyzer

Rozpoznává záměr uživatele — otázka, pochvala, kritika, příkaz, žádost, Battle, humor, test. Výsledek využívá Decision Engine.

---

## 9. Topic Tracker

Sleduje aktuální téma — Battle, Kojnožrout, vývoj, OBS, AI, grafika. Při změně tématu vzniká nový kontext.

---

## 10. Speaker Manager

Rozhoduje, kdo bude mluvit — MIA, Kojnožrout, oba nebo systémové hlášení. Gift → Kojnožrout, technická chyba → MIA, Battle → oba.

---

## 11. Turn Manager

Řídí střídání řečníků — divák → MIA → Kojnožrout → divák. Přerušování je řízené.

---

## 12. Response Builder

Sestavuje výslednou odpověď spojením Personality, Emotion, Memory, Decision a aktuálního kontextu.

---

## 13. Language Manager

Spravuje jazyky — čeština, angličtina, slovenština a další. Může automaticky rozpoznat jazyk uživatele.

---

## 14. Conversation History

Každá konverzace vytváří historii s otázkami, odpověďmi, změnami témat, účastníky a časem. Historie je propojena s Memory Systemem.

---

## 15. Conversation Metrics

Měří délku dialogu, počet zpráv, změny témat, dobu odpovědi a spokojenost.

---

## 16. Paralelní komunikace

Conversation Engine podporuje více vláken — TikTok Chat, Kick Chat, Battle, Admin Panel, interní AI. Každé vlákno má vlastní kontext.

---

## 17. Integrace s hlasem

Conversation Engine spolupracuje se Speech Engine — kdo mluví, pořadí vět, přerušení, synchronizace s animacemi, délka projevu.

---

## 18. Integrace s MIA

Conversation Engine komunikuje s Personality, Emotion, Decision, Memory, Speech, Overlay, Kojnožrout Engine, Battle, Chat Bridge a Monitoring.

---

## 19. Zakázané činnosti

Conversation Engine nesmí měnit Memory, měnit Personality, rozhodovat o ekonomice, obcházet Decision Engine ani generovat odpovědi bez kontextu.

---

## 20. Kontrolní seznam implementace

- ☐ Existuje Conversation Engine?
- ☐ Funguje Conversation Manager?
- ☐ Existuje Context Manager?
- ☐ Funguje Intent Analyzer?
- ☐ Funguje Topic Tracker?
- ☐ Existuje Speaker Manager?
- ☐ Funguje Turn Manager?
- ☐ Existuje Response Builder?
- ☐ Funguje vícevláknová komunikace?
- ☐ Přístup probíhá přes Conversation API?

---

## 21. Vazba na současnou MIA

Conversation Engine řídí odpovědi na TikTok a Kick chat, přímé oslovení diváků, střídání MIA a Kojnožrouta, Battle komentáře, reakce na gift zprávy, správu kontextu dlouhých rozhovorů a hlasovou komunikaci během streamu.

---

## 22. Budoucí evoluce

Rozšíření o více AI postav, skupinové rozhovory, hlasové diskuse, automatické moderování, simultánní překlad a autonomní vedení celé show.

---

## 23. Vazba na architekturu MIA

Typický tok: TikTok → Chat Bridge → Conversation Engine → Decision Engine → Emotion Engine → Personality Engine → Speech Engine → OBS → Divák.

---

## 24. Poznámka architekta

Conversation Engine je hlas MIA. Z informací o osobnosti a emocích vytváří skutečný dialog. Právě tato vrstva bude pro diváky nejviditelnější a určí, jak „živě“ bude MIA působit.

---

### Architektonická poznámka

Dokument **0035** bude věnován **Speech Engine** — převodu textu z Conversation Engine do hlasu a synchronizaci s mimikou a overlayi.
