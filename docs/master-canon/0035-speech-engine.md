# MIA MASTER CANON — Dokument 0035

**Název:** Speech Engine – Hlasový systém MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Absolutně kritická (Core AI)

**Nadřazené dokumenty:**

- [0034 – Conversation Engine](./0034-conversation-engine.md)
- [0033 – Personality Engine](./0033-personality-engine.md)
- [0032 – Emotion Engine](./0032-emotion-engine.md)
- [0028 – Decision Engine](./0028-decision-engine.md)

---

## 1. Účel dokumentu

Speech Engine je kompletní hlasový systém platformy MIA. Jeho úkolem není pouze převést text na řeč — řídí celý hlasový projev platformy: MIA, Kojnožrouta, budoucích AI postav a systémových hlášení. Synchronizuje hlas, mimiku, pohyb, overlaye i OBS.

---

## 2. Definice

Speech Engine převádí text vytvořený Conversation Enginem do živého projevu. Řídí hlas, tempo, emoce, pauzy, výslovnost a synchronizaci animací. Je jediným systémem oprávněným spouštět řeč.

---

## 3. Architektura

```
SPEECH ENGINE
├── Voice Manager
├── Speech Queue
├── TTS Manager
├── Voice Profile Manager
├── Emotion Voice Adapter
├── Lip Sync Engine
├── Facial Sync Manager
├── Gesture Synchronizer
├── Overlay Synchronizer
├── Speech Scheduler
├── Speech Cache
├── Voice Effects
├── Speech Analytics
└── Speech API
```

Každý modul řeší pouze jednu oblast.

---

## 4. Hlavní princip

Každá věta prochází stejným cyklem:

```
Text → Voice Profile → Emotion → TTS → Synchronizace → OBS → Divák
```

Řeč nikdy nevzniká přímo v Conversation Enginu.

---

## 5. Voice Manager

Spravuje všechny hlasy. Každý hlas obsahuje VoiceID, jazyk, pohlaví, barvu hlasu, styl, rychlost a výšku. Každá AI entita má vlastní Voice Profile.

---

## 6. Voice Profile Manager

Každá postava má svůj profil.

- **MIA** — ženský hlas, klidný, přátelský, inteligentní, jemně energický.
- **Kojnožrout** — mužský hlas, hravý, lehce chraplavý, živý, výraznější emoce.
- Budoucí AI mohou mít vlastní hlasové profily.

---

## 7. Speech Queue

Řeč je ukládána do fronty. Každá položka obsahuje SpeechID, Speaker, Priority, Emotion, Délku a Stav. Fronta zabraňuje překrývání hlasů.

---

## 8. Speech Scheduler

Rozhoduje kdy začne řeč, kdo bude mluvit, zda lze řeč přerušit a pořadí mluvčích. Scheduler spolupracuje s Conversation Enginem.

---

## 9. TTS Manager

Řídí převod textu na hlas. Podporuje lokální modely, cloudové modely a budoucí vlastní model MIA. Musí podporovat více jazyků.

---

## 10. Emotion Voice Adapter

Emotion Engine ovlivňuje hlasitost, tempo, intonaci, důraz a délku pauz. Například radost zrychluje tempo a zvyšuje energii; napětí zpomaluje řeč a snižuje hlas.

---

## 11. Lip Sync Engine

Synchronizuje řeč s ústy MIA — otevření úst, zavření, fonémy, délku slabik. Navazuje na systém MIA_HEAD.

---

## 12. Facial Sync Manager

Řídí obličej — oči, mrkání, obočí, výraz. Navazuje na MIA_EYES a budoucí mimiku obličeje.

---

## 13. Gesture Synchronizer

Řídí pohyb těla — ruce, nohy, otočení hlavy, naklánění. Navazuje na MIA_HANDS a MIA_FEET.

---

## 14. Overlay Synchronizer

Řídí speech-overlay: Speech Start → Bubble → Mouth → Eyes → Speech End → Bubble Hide. Overlay musí být synchronizovaný s hlasem.

---

## 15. Voice Effects

Podporuje efekty — echo, rádio, telefon, Battle megafon, robot, šepot. Efekty nesmí narušit srozumitelnost.

---

## 16. Speech Cache

Opakované věty mohou být ukládány — pozdrav, poděkování, Battle hlášky. To výrazně zrychluje odezvu.

---

## 17. Speech Analytics

Měří dobu řeči, počet vět, dobu generování, latenci, kvalitu TTS a využití cache. Výsledky využívá Monitoring.

---

## 18. Přerušení řeči

Speech Engine podporuje Soft Interrupt (počkej na konec věty) a Hard Interrupt (okamžitě zastav řeč, např. kritická chyba).

---

## 19. Integrace s MIA

Speech Engine komunikuje s Conversation Engine, Emotion Engine, Personality Engine, Decision Engine, OBS, Overlay, MIA_HEAD, MIA_EYES, MIA_HANDS, MIA_FEET a Kojnožrout Runtime. Je jedinou hlasovou vrstvou platformy.

---

## 20. Integrace s Kojnožroutem

Kojnožrout má vlastní Speech Pipeline: Kojnožrout → Voice Profile → Emotion → Speech → Animace. Jeho řeč nikdy nesmí používat Voice Profile MIA.

---

## 21. Zakázané činnosti

Speech Engine nesmí měnit obsah textu, rozhodovat o odpovědích, měnit Personality, obcházet Conversation Engine ani obcházet Safety Rules. Pouze převádí text na hlas.

---

## 22. Kontrolní seznam implementace

- Existuje Speech Engine
- Funguje Voice Manager
- Existuje Speech Queue
- Funguje Voice Profile Manager
- Existuje Emotion Voice Adapter
- Funguje Lip Sync
- Funguje Facial Sync
- Funguje Gesture Synchronizer
- Funguje Overlay Synchronizer
- Existuje Speech Cache
- Fungují přerušení řeči
- Přístup probíhá přes Speech API

---

## 23. Vazba na současnou MIA

Speech Engine řídí hlas MIA, hlas Kojnožrouta, speech-overlay, synchronizaci MIA_HEAD, MIA_EYES, MIA_HANDS, MIA_FEET, Battle komentáře, poděkování za gifty, čtení chatu a systémová oznámení. Sjednocuje všechny hlasové funkce do jedné architektury.

---

## 24. Budoucí evoluce

Speech Engine bude možné rozšířit o vlastní neuronový hlas MIA, emocionální změnu hlasu v reálném čase, více současně mluvících AI, zpěv, prostorový zvuk, hlasové dialogy mezi AI, automatické dabování a synchronizaci s 3D modelem.

---

## 25. Poznámka architekta

Speech Engine je hlas MIA. Pokud Conversation Engine vytváří slova a Personality Engine určuje jejich styl, právě Speech Engine jim dává skutečný život. Je zodpovědný za to, aby každé slovo zaznělo ve správný okamžik, správnou intonací a bylo dokonale sladěno s mimikou, pohybem i grafickými prvky OBS.

Dokument **0036** bude věnován **Animation Engine** — sjednocení všech vizuálních projevů MIA a Kojnožrouta.
