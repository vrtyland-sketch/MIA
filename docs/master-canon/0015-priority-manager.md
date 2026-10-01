# MIA MASTER CANON — Dokument 0015

**Název:** Priority Manager – Řízení priorit událostí  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Kritická

**Nadřazené dokumenty:**

- [0010 – Event Bus](./0010-event-bus.md)
- [0013 – Event Registry](./0013-event-registry.md)
- [0014 – Event Router](./0014-event-router.md)

---

## 1. Účel dokumentu

Priority Manager je součást Event Busu, která určuje **pořadí zpracování** událostí.

Jeho úkolem je zajistit, aby i při velmi vysokém zatížení platformy byly nejdůležitější události zpracovány včas a méně důležité úlohy neblokovaly provoz.

Priority Manager **neovlivňuje obsah** události. Rozhoduje pouze o pořadí jejího zpracování.

---

## 2. Definice Priority Manageru

Priority Manager je plánovací komponenta Core Systemu.

Hlavní úkoly:

- přiřazovat prioritu,
- spravovat pořadí,
- vyvažovat zatížení,
- chránit platformu proti zahlcení,
- zajistit spravedlivé plánování.

---

## 3. Architektura

```
PRIORITY MANAGER
├── Priority Resolver
├── Queue Selector
├── Fair Scheduler
├── Starvation Protection
├── Load Balancer
├── Dynamic Priority Engine
├── Overflow Manager
├── Metrics Collector
└── Audit Logger
```

Každá část řeší pouze jednu oblast.

---

## 4. Základní princip

Každá událost má právě **jednu aktuální prioritu**.

Priorita může být:

- pevně definovaná typem události,
- vypočítaná podle pravidel,
- upravená konfigurací,
- dočasně zvýšená nebo snížená během provozu.

---

## 5. Standardní úrovně priorit

Platforma používá pět hlavních úrovní.

| Úroveň | Název | Použití |
|--------|-------|---------|
| P0 | Critical | Pád systému, bezpečnost |
| P1 | High | Gifty, AI odpovědi, živý stream |
| P2 | Normal | Běžný provoz |
| P3 | Low | Statistiky |
| P4 | Background | Archivace, údržba |

Další úrovně lze přidat pouze rozšířením konfigurace.

---

## 6. Doporučené zařazení událostí

**P0 – Critical:** Runtime Failure, Database Failure, Security Alert, Shutdown — okamžité zpracování.

**P1 – High:** Gift Received, AI Response, Chat Overlay, Moderation, OBS Command — přímo ovlivňují živý stream.

**P2 – Normal:** Chat Message, Inventory Update, Memory Update, Avatar Animation.

**P3 – Low:** Statistiky, Export, Analýzy.

**P4 – Background:** Archivace logů, čištění cache, optimalizace databáze.

---

## 7. Queue Selector

Každá priorita odpovídá vlastní frontě:

```
Critical Queue → High Queue → Normal Queue → Low Queue → Background Queue
```

Jednotlivé fronty jsou na sobě nezávislé.

---

## 8. Fair Scheduler

Priority nesmí způsobit trvalé blokování méně důležitých úloh.

Scheduler používá spravedlivé plánování — po určitém počtu High událostí dostane prostor také Normal Queue.

---

## 9. Starvation Protection

Pokud některá fronta čeká příliš dlouho, Priority Manager může dočasně zvýšit její prioritu (např. Background → Low). Po dokončení se pravidla vrátí do normálního stavu.

---

## 10. Dynamic Priority Engine

Některé události mohou měnit prioritu podle okolností:

- Gift za 1 coin → Normal
- Gift za 5000 coinů → High
- Kritické systémové upozornění → Critical

Pravidla jsou konfigurovatelná.

---

## 11. Load Balancer

Priority Manager sleduje vytížení jednotlivých front. Při přetížení může rozdělit práci, využít další pracovní vlákna nebo aktivovat další instanci zpracování. Mechanismus je připraven pro budoucí distribuovaný provoz.

---

## 12. Overflow Manager

Pokud je fronta zaplněna, platforma může podle konfigurace:

- odmítnout nové Low události,
- dočasně odložit Background úlohy,
- vytvořit Overflow Warning,
- aktivovat nouzový režim.

**Critical události nesmí být odmítnuty.**

---

## 13. Prioritní pravidla

Priority mohou být ovlivněny hodnotou giftu, počtem diváků, stavem streamu, režimem platformy, administrátorským nastavením a budoucí AI optimalizací.

Priority **nesmí být měněny přímo** jednotlivými moduly.

---

## 14. Audit

Každá změna priority vytváří **Priority Event** s: EventID, původní prioritu, novou prioritu, důvod změny, čas, komponentu. Audit je povinný.

---

## 15. Monitoring

Priority Manager sleduje délku front, průměrnou čekací dobu, počet změn priorit, Overflow událostí, odmítnutých událostí a vytížení systému. Tyto údaje poskytuje Monitoring Systemu.

---

## 16. Zakázané činnosti

Priority Manager nesmí: měnit Payload, směrovat události, rozhodovat o AI, měnit ekonomiku, upravovat databázi. Jeho jedinou odpovědností je plánování pořadí.

---

## 17. Vazba na současnou MIA

V MIA již existují události s přirozeně vyšší prioritou: Gift → Video Engine → Overlay → Kojnožrout → Economy → Memory.

Naopak denní statistiky, analytics a archiv mohou počkat. Priority Manager tuto logiku sjednocuje a centralizuje.

---

## 18. Kontrolní seznam implementace

- Centrální Priority Manager
- Definované prioritní úrovně P0–P4
- Vlastní fronta pro každou prioritu
- Fair Scheduler
- Ochrana proti hladovění
- Dynamic Priority Engine
- Overflow Manager
- Audit změn priorit
- Sběr metrik

Automatická kontrola: `tests/mia_master_canon_0015_contract.js` · [`0015-alignment.md`](./0015-alignment.md)

---

## 19. Budoucí rozšíření

AI řízené priority, priorita podle emocí MIA, stavu Kojnožrouta, ekonomiky streamu, automatické přizpůsobení výkonu podle hardwaru, distribuované plánování mezi více servery. Rozšíření nesmí narušit kompatibilitu základního modelu.

---

## 20. Poznámka architekta

Priority Manager je dopravní policista platformy MIA. Na rušné křižovatce nerozhoduje, kam auta jedou ani co vezou, ale určuje, kdo projede jako první. Díky tomu se platforma nezahltí ani při extrémním provozu a přitom nezapomene na méně důležité úlohy.

---

**Další krok:** Dokument **0016** — Queue Manager (správa front událostí: kapacita, paralelní zpracování, obnova po pádu).
