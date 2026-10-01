# MIA MASTER CANON — Dokument 0032

**Název:** Emotion Engine – Emoční řídicí systém MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Absolutně kritická (Core AI)

**Nadřazené dokumenty:**

- [0026 – Emotional Memory](./0026-emotional-memory.md)
- [0028 – Decision Engine](./0028-decision-engine.md)
- [0031 – Planning Engine](./0031-planning-engine.md)

---

## 1. Účel dokumentu

Emotion Engine převádí informace z Emotional Memory na aktuální chování MIA. Nejde o simulaci lidských emocí — jde o inteligentní adaptační vrstvu ovlivňující styl komunikace, intenzitu reakcí, výběr slov a animací, chování Kojnožrouta a dlouhodobou konzistenci osobnosti. Emotion Engine nikdy nenahrazuje Decision Engine.

---

## 2. Definice

Emotion Engine přijímá informace z Emotional Memory, aktuální situace, Memory Systemu, Goal Manageru a Monitoring Systemu. Na jejich základě vytváří **Emotion State**.

---

## 3. Architektura

```
EMOTION ENGINE
├── Emotion State Manager
├── Mood Manager
├── Emotion Evaluator
├── Emotion Mixer
├── Personality Adapter
├── Community Adapter
├── Relationship Adapter
├── Intensity Controller
├── Emotion Transition Manager
├── Emotion Validator
├── Emotion Metrics
└── Emotion API
```

Každá komponenta řeší jednu oblast.

---

## 4. Hlavní princip

Každá reakce MIA vzniká: Událost → Paměť → Vyhodnocení → Emotion State → Decision Engine → Akce. Emoce ovlivňují způsob reakce, nikdy neurčují fakta.

---

## 5. Emotion State Manager

Spravuje aktuální emocionální stav — klid, radost, napětí, překvapení, soustředění. V jednom okamžiku může být aktivních více stavů.

---

## 6. Mood Manager

Nálada je dlouhodobější než emoce — pozitivní, neutrální, hravá, soutěživá, soustředěná, unavená. Mood se mění pomaleji než Emotion State.

---

## 7. Emotion Evaluator

Vyhodnocuje vliv událostí — malý gift → malá radost, velký gift → velká radost, výpadek OBS → technické napětí. Výsledek je pouze vstup pro Emotion State.

---

## 8. Emotion Mixer

Více emocí může existovat současně — radost + napětí + očekávání → výsledná reakce. Emotion Mixer spojuje jednotlivé vlivy.

---

## 9. Personality Adapter

Každá emoce je filtrována přes osobnost MIA — klidně, vtipně, energicky, jemně. Osobnost zůstává dlouhodobě konzistentní.

---

## 10. Community Adapter

Emotion Engine sleduje komunitu — aktivita chatu, počet diváků, tempo giftů, atmosféra Battle, nálada streamu. Reakce se přizpůsobují celé komunitě.

---

## 11. Relationship Adapter

Každý uživatel může vyvolat jinou reakci — pravidelný podporovatel dostane osobnější přivítání, nový divák přátelské představení. Rozdíly vycházejí z Emotional Memory.

---

## 12. Intensity Controller

Řídí sílu projevu na škále 0–100. Ovlivňuje hlas, délku odpovědi, velikost animací, energii Kojnožrouta a rychlost reakcí.

---

## 13. Emotion Transition Manager

Emoce se mění plynule — klid → radost → nadšení → uklidnění. Přechody nesmí být nepřirozené.

---

## 14. Emotion Validator

Kontroluje konzistenci, konflikty, extrémní hodnoty a bezpečnost. Nelze současně vykazovat extrémní radost a extrémní smutek.

---

## 15. Emotion Metrics

Engine měří četnost změn, intenzitu, stabilitu, dobu trvání a vliv na rozhodnutí. Metriky využívá Monitoring.

---

## 16. Integrace s MIA

Emotion Engine ovlivňuje AI odpovědi, Speech Engine, mimiku, animace, gesta, Kojnožrouta, Battle reakce a overlaye. Neřídí logiku systému — řídí způsob projevu.

---

## 17. Integrace s Kojnožroutem

Kojnožrout má vlastní Emotion State — hlad, radost, zvědavost, ospalost, bojovnost, spokojenost. Tyto stavy nejsou totožné se stavy MIA.

---

## 18. Zakázané činnosti

Emotion Engine nesmí měnit fakta, rozhodovat o ekonomice, obcházet Decision Engine, měnit Memory, diskriminovat uživatele ani vytvářet nekonzistentní chování. Je pouze adaptační vrstvou.

---

## 19. Kontrolní seznam implementace

- ☐ Existuje Emotion Engine?
- ☐ Funguje Emotion State?
- ☐ Existuje Mood Manager?
- ☐ Funguje Emotion Evaluator?
- ☐ Existuje Emotion Mixer?
- ☐ Funguje Personality Adapter?
- ☐ Funguje Relationship Adapter?
- ☐ Existuje Intensity Controller?
- ☐ Fungují plynulé přechody?
- ☐ Přístup probíhá přes Emotion API?

---

## 20. Vazba na současnou MIA

Emotion Engine řídí tón hlasu MIA, náladu Kojnožrouta, intenzitu reakcí na gifty, Battle komentáře, výběr animací, délku odpovědí, styl humoru a přirozené navazování na komunitu.

---

## 21. Budoucí evoluce

Emotion Engine bude rozšířen o hlasovou analýzu emocí, rozpoznávání emocí z obrazu, adaptivní osobnost, skupinové emoce komunity a dlouhodobý vývoj charakteru.

---

## 22. Poznámka architekta

Emotion Engine je výraz tváře MIA. Rozhodnutí vznikají v Decision Enginu, ale Emotion Engine určuje, jak budou působit na lidi. Ve spojení s Emotional Memory vytváří dlouhodobě konzistentní osobnost MIA i Kojnožrouta.

---

### Architektonická poznámka

Dokument **0033** bude věnován **Personality Engine** — neměnným charakterovým vlastnostem MIA nad Emotion Enginem.
