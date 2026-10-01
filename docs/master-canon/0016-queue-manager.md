# MIA MASTER CANON — Dokument 0016

**Název:** Queue Manager – Správa front událostí  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Kritická

**Nadřazené dokumenty:**

- [0010 – Event Bus](./0010-event-bus.md)
- [0014 – Event Router](./0014-event-router.md)
- [0015 – Priority Manager](./0015-priority-manager.md)

---

## 1. Účel dokumentu

Queue Manager je komponenta Core Systemu, která spravuje **všechny fronty událostí** v platformě MIA.

Jeho úkolem je zajistit, aby žádná událost nebyla ztracena, aby byly události zpracovávány ve správném pořadí a aby systém zůstal stabilní i při extrémním zatížení.

Queue Manager představuje vyrovnávací vrstvu mezi příjmem a zpracováním událostí.

---

## 2. Definice Queue Manageru

Queue Manager odpovídá za:

- vytváření front,
- ukládání událostí,
- správu pořadí,
- správu kapacity,
- obnovu po pádu,
- monitorování front,
- bezpečné předávání Dispatcheru.

Queue Manager **neprovádí obchodní logiku** ani směrování.

---

## 3. Architektura Queue Manageru

```
QUEUE MANAGER
├── Queue Registry
├── Queue Factory
├── Queue Storage
├── Queue Scheduler
├── Capacity Manager
├── Overflow Manager
├── Queue Recovery
├── Queue Monitor
├── Queue Metrics
├── Queue Audit
└── Dispatcher Connector
```

Každá část má jedinou odpovědnost.

---

## 4. Základní princip

Každá událost, která byla přijata Event Busem, musí být nejprve **bezpečně zařazena** do příslušné fronty. Teprve poté může být zpracována.

To zajišťuje, že ani při pádu systému nedojde ke ztrátě již přijatých událostí.

---

## 5. Typy front

Platforma MIA používá několik základních typů front.

| Typ | Popis | Použití |
|-----|-------|---------|
| **Priority Queue** | Řazení podle priority | Critical, High, Normal, Low |
| **FIFO Queue** | První dovnitř, první ven | Chat, logování, analytika |
| **Scheduled Queue** | Úlohy naplánované na čas | Odložené animace, časované úkoly |
| **Retry Queue** | Opakované doručení | Neúspěšné zpracování |
| **Dead Letter Queue** | Nezpracovatelné události | DLQ |

---

## 6. Queue Registry

Queue Registry eviduje všechny aktivní fronty. Každá fronta obsahuje: QueueID, Název, Typ, Prioritu, Kapacitu, Aktuální velikost, Stav, Statistiky.

Registry je **jediným zdrojem pravdy** o existujících frontách.

---

## 7. Queue Factory

Nové fronty vytváří výhradně Queue Factory. Každá nová fronta musí získat jedinečné QueueID, být zaregistrována, projít validací konfigurace a být auditována. Ruční vytváření front není povoleno.

---

## 8. Queue Storage

Queue Storage zajišťuje fyzické uložení událostí. Implementace může být: pouze v paměti, kombinace paměti a disku, distribuované úložiště, budoucí cloudové řešení.

---

## 9. Queue Scheduler

Queue Scheduler rozhoduje, ze které fronty bude Dispatcher číst jako další. Respektuje priority, Fair Scheduler, ochranu proti hladovění a limity systému. Scheduler **nikdy nemění obsah** front.

---

## 10. Capacity Manager

Každá fronta má definovanou kapacitu: maximální počet událostí, maximální velikost dat, maximální dobu čekání. Po dosažení limitu se aktivují pravidla Overflow Manageru.

---

## 11. Overflow Manager

Pokud je fronta přeplněná, lze podle konfigurace: odmítnout Low Priority události, odložit Background úlohy, zvýšit kapacitu, vytvořit Overflow Warning, přepnout platformu do nouzového režimu.

**Critical Queue nesmí být zablokována** běžnými událostmi.

---

## 12. Queue Recovery

Po neočekávaném ukončení platformy musí být možné obnovit rozpracované fronty: načtení uložených událostí, kontrola integrity, odstranění poškozených záznamů, pokračování ve zpracování. Recovery **nesmí vytvořit duplicitní** události.

---

## 13. Queue Monitor

Queue Monitor nepřetržitě sleduje: délku front, dobu čekání, rychlost zpracování, počet odmítnutých událostí, počet opakovaných pokusů. Výsledky poskytuje Monitoring Systemu.

---

## 14. Queue Metrics

Každá fronta měří minimálně: Queue Length, Average Wait Time, Peak Size, Throughput, Retry Count, Overflow Count, Drop Count.

---

## 15. Audit

Každá operace nad frontou vytváří Queue Audit s: QueueID, EventID, Operací, Časem, Výsledkem, Vyvolávající komponentou. Auditní historie je neměnná.

---

## 16. Paralelní zpracování

Queue Manager musí podporovat více pracovníků (Workers). Každá událost smí být zpracována pouze **jedním Workerem**.

---

## 17. Záruka pořadí

**Strict Order** — pořadí zachováno (ekonomika, databázové transakce).  
**Parallel Order** — pořadí není důležité (analytika, některé AI úlohy). Režim určuje Event Registry.

---

## 18. Integrace s MIA

Samostatné fronty pro: Chat, Gifts, AI Requests, AI Responses, Overlay, Video Engine, Kojnožrout, Inventory, Memory, Analytics, Logging.

To zabrání tomu, aby masivní příliv chatových zpráv zpomalil zpracování giftů nebo AI.

---

## 19. Zakázané činnosti

Queue Manager nesmí: rozhodovat o AI, směrovat události, měnit Payload, měnit priority, zapisovat obchodní data. Je pouze správcem front.

---

## 20. Kontrolní seznam implementace

- Queue Registry
- Všechny fronty registrovány
- Queue Factory
- Queue Storage
- Obnova po pádu
- Capacity Manager
- Overflow Manager
- Metriky
- Audit operací
- Paralelní zpracování
- Pořadí tam, kde je vyžadováno

Automatická kontrola: `tests/mia_master_canon_0016_contract.js` · [`0016-alignment.md`](./0016-alignment.md)

---

## 21. Vazba na budoucí architekturu MIA

Queue Manager bude hlavním prvkem při přechodu MIA na vícevláknové a distribuované zpracování: přesun front na jiné procesy, rozdělení mezi servery, nezávislé škálování AI a grafiky.

---

## 22. Poznámka architekta

Queue Manager je logistické centrum platformy MIA. Stejně jako moderní překladiště zásilek nejprve bezpečně přijme každou zásilku, zařadí ji do správné fronty a teprve poté ji odešle dál — i Queue Manager zajišťuje, že každá událost bude bezpečně uložena, správně seřazena a doručena ke zpracování.

---

**Další krok:** Dokument **0017** — Dispatcher (synchronní/asynchronní doručování, ACK/NACK, timeouty, retry, idempotence).
