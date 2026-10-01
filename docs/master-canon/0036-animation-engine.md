# MIA MASTER CANON — Dokument 0036

**Název:** Animation Engine – Centrální animační systém MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Absolutně kritická (Visual Core)

**Nadřazené dokumenty:**

- [0032 – Emotion Engine](./0032-emotion-engine.md)
- [0035 – Speech Engine](./0035-speech-engine.md)
- [0029 – Action Orchestrator](./0029-action-orchestrator.md)

---

## 1. Účel dokumentu

Animation Engine je centrální systém všech vizuálních animací platformy MIA. Řídí animace MIA, Kojnožrouta, Battle animace, reakce na gifty, přechody mezi stavy a synchronizaci s hlasem, emocemi i OBS. Je jediným systémem oprávněným měnit vizuální stav postav.

---

## 2. Definice

Animation Engine převádí interní stav platformy na pohyb. Každá změna nálady, řeči nebo události se projeví změnou animace. Animation Engine nikdy nerozhoduje — pouze vizualizuje rozhodnutí ostatních systémů.

---

## 3. Architektura

```
ANIMATION ENGINE
├── Animation Manager
├── Animation State Machine
├── Animation Scheduler
├── Transition Manager
├── Layer Manager
├── Blend Engine
├── Emotion Adapter
├── Speech Adapter
├── Battle Adapter
├── OBS Adapter
├── Animation Cache
├── Animation Metrics
└── Animation API
```

---

## 4. Hlavní princip

Každá animace vzniká stejným procesem:

```
Událost → Decision Engine → Emotion → Animation State → OBS → Divák
```

Animace je vždy důsledkem rozhodnutí.

---

## 5. Animation Manager

Spravuje všechny animace. Každá animace obsahuje AnimationID, název, délku, prioritu, typ a podmínky spuštění. Manager rozhoduje pouze o správě, nikoli o logice.

---

## 6. Animation State Machine

Každá postava je vždy v jednom stavu.

**MIA:** Idle, Listening, Speaking, Happy, Thinking, Surprised, Sleeping, Battle.

**Kojnožrout:** Hungry, Eating, Happy, Angry, Sleeping, Running, Battle, Love, Drama, Chaos.

Přechody řídí State Machine.

---

## 7. Transition Manager

Řídí přechody mezi animacemi — např. Idle → Smile → Speaking → Idle. Přechody musí být plynulé.

---

## 8. Layer Manager

Animace jsou rozděleny do vrstev: Background → Body → Head → Eyes → Hands → Accessories → Effects. Každá vrstva se může měnit nezávisle.

---

## 9. Blend Engine

Spojuje více animací současně — MIA může mluvit, mrkat, usmívat se a pohybovat rukama. Blend Engine zajišťuje kombinaci bez konfliktů.

---

## 10. Emotion Adapter

Emotion Engine ovlivňuje animace — radost zvětšuje úsměv a zrychluje pohyby, napětí omezuje pohyb a mění oči, klid zpomaluje animace.

---

## 11. Speech Adapter

Speech Engine synchronizuje ústa, oči, pohyb hlavy a ruce: Speech → Lip Sync → Blink → Head → Hands.

---

## 12. Battle Adapter

Battle Engine spouští speciální animace — útok, obrana, vítězství, porážka, combo, speciální item. Battle animace mají vyšší prioritu.

---

## 13. OBS Adapter

Animation Engine komunikuje s OBS — zdroje, viditelnost, pořadí vrstev, scény a efekty. Je kompatibilní se stávající architekturou OBS.

---

## 14. Animation Cache

Často používané animace jsou ukládány — Idle, Smile, Blink, Gift, Eating. To výrazně zrychluje vykreslování.

---

## 15. Animation Metrics

Engine měří FPS, dobu přepnutí, počet aktivních animací, využití cache a zatížení GPU. Monitoring využívá tato data.

---

## 16. Integrace s MIA

Animation Engine řídí MIA_HEAD, MIA_EYES, MIA_HANDS, MIA_FEET, speech-overlay, gift-overlay, battle-overlay a runtime animace. Je jediným animačním systémem.

---

## 17. Integrace s Kojnožroutem

Kojnožrout má vlastní Animation State Machine — Hungry → Eating → Happy → Idle → Sleep. Každý Battle Kojnožrout může mít vlastní animace.

---

## 18. Budoucí renderery

Animation Engine není závislý na technologii. Podporuje PNG Runtime (současná MIA), Live2D, Spine, PixiJS, Three.js, Unreal a Unity — stejná architektura, jiný renderer.

---

## 19. Zakázané činnosti

Animation Engine nesmí měnit Decision Engine, Emotion Engine, Personality, rozhodovat o akcích ani přehrávat zvuk. Je pouze vizuální vrstvou.

---

## 20. Kontrolní seznam implementace

- Existuje Animation Engine
- Funguje Animation State Machine
- Existuje Transition Manager
- Funguje Layer Manager
- Existuje Blend Engine
- Funguje Emotion Adapter
- Funguje Speech Adapter
- Funguje Battle Adapter
- Existuje OBS Adapter
- Funguje Animation Cache
- Přístup probíhá přes Animation API

---

## 21. Vazba na současnou MIA

Animation Engine sjednotí všechny PNG stavy MIA, 11 nálad, Battle animace, Bowl animace, animace Kojnožrouta, gift moment overlay, speech overlay, přechody mezi stavy a budoucí grafický editor. Odstraní rozdílné animační systémy.

---

## 22. Budoucí evoluce

Animation Engine bude možné rozšířit o Live2D MIA, 3D MIA, motion capture, AI generované animace, fyziku vlasů a oblečení, procedural animation a více AI postav. Architektura zůstane stejná.

---

## 23. Poznámka architekta

Animation Engine je tělo MIA. Decision Engine rozhoduje, Personality definuje styl, Emotion určuje prožitek a Speech dává hlas. Animation Engine převádí vše do viditelného pohybu — mimika, gesta i pohyby odpovídají tomu, co MIA říká a prožívá.

Dokument **0037** bude věnován **Visual Rendering System** — vykreslování obrazu, OBS pipeline a GPU optimalizaci.
