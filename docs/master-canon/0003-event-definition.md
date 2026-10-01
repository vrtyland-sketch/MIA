# MIA MASTER CANON — Dokument 0003

**Název:** Definice události (Event Definition)  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Kritická

Předchozí: [0002 — Definice entity](./0002-entity-definition.md)

---

## 1. Účel dokumentu

Tento dokument definuje pojem **Událost (Event)**.

Celá platforma MIA je navržena jako **Event-Driven System** (systém řízený událostmi). To znamená, že žádná změna v systému nevzniká náhodně ani „sama od sebe“. Každá změna musí být vyvolána konkrétní událostí.

Tento princip je základem komunikace mezi všemi moduly MIA.

---

## 2. Definice události

Událost je **záznam o tom, že se v systému stalo něco významného**.

Událost může být:

- oznámení,
- požadavek,
- výsledek,
- změna stavu,
- vstup od uživatele,
- výstup z AI,
- odpověď externí služby.

**Událost sama o sobě nerozhoduje.** Pouze oznamuje, že nastala určitá skutečnost.

---

## 3. Základní pravidlo

Každá změna systému musí vzniknout jako **důsledek jedné nebo více událostí**.

Přímé změny stavu bez odpovídající události nejsou povoleny, s výjimkou **interních inicializačních procesů** definovaných architekturou.

---

## 4. Životní cyklus události

Každá událost prochází těmito fázemi:

| Fáze | Kód |
|------|-----|
| Vznik | `created` |
| Zařazení do fronty | `queued` |
| Distribuce příjemcům | `dispatched` |
| Zpracování | `processing` |
| Dokončení | `completed` |
| Archivace | `archived` |

Pokud nastane chyba, událost přechází do stavu **`failed`** a musí být zaznamenán důvod selhání.

---

## 5. Povinné informace každé události

Každá událost musí obsahovat minimálně:

| Pole | Význam |
|------|--------|
| `eventId` | Jedinečný identifikátor události |
| `eventType` | Typ události |
| `createdAt` | Čas vytvoření (UTC, ISO 8601) |
| `source` | Zdroj události |
| `target` | Cíl události (je-li znám) |
| `priority` | Priorita zpracování |
| `payload` | Data události (objekt) |
| `state` | Stav životního cyklu |
| `schemaVersion` | Verze schématu události |

Bez těchto údajů **nesmí být událost přijata ke zpracování**.

Validace: `validateEventRecord()` v `shared/mia-event-core/eventSchema.js`.

---

## 6. Kategorie událostí

### Uživatelské události

Vznikají činností uživatele. Příklady: odeslání zprávy, kliknutí, přihlášení, změna nastavení.

### Streamovací události

Vznikají během živého vysílání. Příklady: komentář, follower, gift, sdílení, začátek/konec streamu.

### AI události

Vznikají rozhodováním AI. Příklady: odpověď, změna nálady, návrh akce, plánování.

### Grafické události

Řídí vizuální část. Příklady: animace, výraz, pohyb, vrstva, vykreslení.

### Systémové události

Vznikají uvnitř infrastruktury. Příklady: start serveru, restart modulu, chyba, ztráta/obnovení spojení.

### Časové události

Vytvářeny plánovačem. Příklady: tick, minuta, půlnoc, naplánovaný úkol, timeout.

Kódy: `EVENT_CATEGORY` v `shared/mia-event-core/eventCategories.js`.

---

## 7. Priorita událostí

| Úroveň | Kód | Použití |
|--------|-----|---------|
| Critical | `critical` | Bezpečnost, pád systému |
| High | `high` | Live stream, AI rozhodnutí, dary |
| Normal | `normal` | Běžná komunikace |
| Low | `low` | Statistiky, analytika |
| Background | `background` | Údržba, archivace |

Vyšší priorita má přednost při zpracování.

---

## 8. Fronty událostí

Události mohou být zpracovávány ve více frontách současně:

- Stream Queue
- AI Queue
- Graphics Queue
- Database Queue
- Scheduler Queue
- Network Queue

**Jedna přetížená fronta nesmí zastavit ostatní části systému.**

Mapování na runtime: `EVENT_QUEUE` v `shared/mia-event-core/eventQueues.js`.

---

## 9. Směr toku událostí

Každá událost má jasně definovaný směr:

**Zdroj → Event Bus → Příjemce**

Příklad:

```
TikTok → Ingest → Event Bus → Gift Engine → Decision Layer → Action Orchestrator → OBS
```

Tento tok musí být **dohledatelný v logách**.

Kanonický tok: `CANON_EVENT_FLOW` v `shared/mia-event-core/eventBus.js`.

---

## 10. Event Bus

**Event Bus** je centrální komunikační vrstva MIA.

Jeho úkoly:

- přijímat události,
- ověřovat jejich platnost,
- zařazovat je do front,
- distribuovat je příslušným modulům,
- zaznamenávat průběh zpracování.

**Event Bus nesmí obsahovat obchodní logiku.** Slouží pouze jako dopravní infrastruktura.

Runtime kotva: `MIA_INGEST_QUEUE.js` + `MIA_EVENT_PIPELINE.js` (fázový bus bez business logiky ve frontě).

---

## 11. Pravidla zpracování

Každý modul:

- přijímá pouze události, které umí zpracovat,
- **nesmí měnit obsah přijaté události**,
- vytváří **novou událost** jako výsledek své práce, pokud je potřeba.

Tím vzniká sled navazujících událostí místo přímých zásahů mezi moduly.

---

## 12. Audit

Každá důležitá událost musí být **auditovatelná**.

Musí být možné zpětně zjistit:

- kdy vznikla,
- kdo ji vytvořil,
- který modul ji zpracoval,
- jak dlouho zpracování trvalo,
- jaký byl výsledek,
- zda došlo k chybě.

**Auditní záznamy jsou neměnné.**

---

## 13. Budoucí rozšíření

Události mohou být v budoucnu rozšířeny o:

- digitální podpis,
- kryptografické ověření,
- distribuované zpracování,
- cloudovou synchronizaci,
- prioritu podle AI,
- skupinové (batch) zpracování.

Rozšíření nesmí narušit kompatibilitu stávajících událostí.

---

## 14. Kontrolní seznam implementace

Při kontrole projektu v Cursoru ověřit:

- [ ] Vzniká každá změna jako událost?
- [ ] Obsahují události povinná metadata?
- [ ] Existuje centrální Event Bus?
- [ ] Jsou použity oddělené fronty?
- [ ] Jsou důležité události logovány?
- [ ] Je možné dohledat celý tok události od vzniku po dokončení?

Automatická kontrola: `tests/mia_master_canon_0003_contract.js` · mapa souladu: [`0003-alignment.md`](./0003-alignment.md).

---

## 15. Poznámka architekta

V MIA spolu moduly nekomunikují přímým voláním, pokud to není nezbytné. Standardním způsobem komunikace je **předávání událostí přes Event Bus**.

Díky tomu lze systém snadno rozšiřovat, testovat a nahrazovat jednotlivé moduly bez zásahů do ostatních částí platformy.

---

**Konec dokumentu 0003**

Dokument **0004** bude definovat další základní kámen architektury: **Komponentu (Component)** — přesná pravidla pro modul, rozhraní, životní cyklus a spolupráci částí MIA.
