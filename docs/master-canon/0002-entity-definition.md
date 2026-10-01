# MIA MASTER CANON — Dokument 0002

**Název:** Definice entity (Entity Definition)  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Kritická

Předchozí: [0001 — Prohlášení projektu](./0001-project-constitution.md)

---

## 1. Účel dokumentu

Tento dokument zavádí nejdůležitější pojem v celém projektu MIA — **Entitu**.

Celá architektura MIA je postavena na entitách. Vše, co v systému existuje, je entita nebo je součástí nějaké entity.

Bez této definice nelze navrhovat databázi, AI, grafiku, ekonomiku ani komunikaci mezi moduly.

---

## 2. Definice entity

Entita je **jednoznačně identifikovatelný objekt**, který existuje uvnitř ekosystému MIA a může mít:

- vlastní identitu,
- vlastní stav,
- vlastní vlastnosti,
- vlastní historii,
- vlastní chování,
- vztahy k ostatním entitám.

Entita může existovat **fyzicky**, **digitálně** nebo pouze **logicky**.

---

## 3. Základní pravidlo

Každá entita musí mít **jedinečnou identitu**.

- Nikdy nesmí existovat dvě různé entity se stejným identifikátorem.
- Identita entity se po vytvoření **již nikdy nemění**.

Technická kotva: `shared/mia-entity-core/` · `entityId` je primární klíč.

---

## 4. Životní cyklus entity

Každá entita prochází těmito stavy:

| Stav | Kód |
|------|-----|
| Návrh | `concept` |
| Vytvoření | `created` |
| Inicializace | `initialized` |
| Aktivní stav | `active` |
| Pozastavení | `suspended` |
| Archivace | `archived` |
| Odstranění | `deleted` |

Odstraněná entita může zůstat v archivu kvůli auditním záznamům, ale **již nesmí být aktivně používána**.

---

## 5. Povinné vlastnosti každé entity

Každá entita musí obsahovat minimálně:

| Pole | Význam |
|------|--------|
| `entityId` | Jedinečný identifikátor |
| `entityType` | Typ entity (kategorie + podtyp) |
| `name` | Lidsky čitelný název |
| `createdAt` | Datum vytvoření (ISO 8601) |
| `updatedAt` | Datum poslední změny |
| `createdBy` | Autor vytvoření |
| `version` | Verze schématu / instance |
| `state` | Stav životního cyklu |
| `metadata` | Rozšiřitelná metadata (objekt) |

Bez těchto údajů není objekt považován za platnou entitu.

Validace: `validateEntityRecord()` v `shared/mia-entity-core/entitySchema.js`.

---

## 6. Druhy entit

Projekt MIA rozlišuje několik základních kategorií:

### Systémové entity

Například: MIA, Brain moduly, Scheduler, Runtime, Memory Engine.

### Uživatelské entity

Například: streamer, divák, administrátor, moderátor.

### Herní entity

Například: Kojnožrout, předměty, inventář, schopnosti, questy, odměny.

### Grafické entity

Například: sprite, animace, kostra, vrstva, část těla, kamera.

### Datové entity

Například: log, událost, databázový záznam, konfigurace, profil.

### AI entity

Například: AI agent, rozhodovací modul, plánovač, konverzační modul, paměťový uzel.

Kódy kategorií: `ENTITY_CATEGORY` v `shared/mia-entity-core/`.

---

## 7. Vztahy mezi entitami

Entita může:

- vlastnit jinou entitu,
- obsahovat jinou entitu,
- vytvářet jinou entitu,
- ovládat jinou entitu,
- komunikovat s jinou entitou,
- sledovat jinou entitu,
- dědit vlastnosti jiné entity.

Každý vztah musí být v systému **evidován**.

Typy vztahů: `ENTITY_RELATION` v `shared/mia-entity-core/entityRelations.js`.

---

## 8. Chování entity

Každá entita může reagovat na události.

Například: vytvoření, změna, přesun, aktivace, deaktivace, příjem zprávy, časovač, vstup uživatele, AI rozhodnutí.

**Entita nikdy nereaguje sama od sebe.** Každá změna musí být vyvolána konkrétní událostí nebo interním procesem.

*(Formální definice události → dokument 0003.)*

---

## 9. Jedinečnost

Jedna entita nikdy nepředstavuje dvě různé věci současně.

Například:

- Kojnožrout není současně uživatel.
- Sprite není současně inventář.
- Gift není současně AI agent.

Každá entita má přesně definovanou **odpovědnost**.

---

## 10. Budoucí rozšíření

Každá nová funkce přidaná do MIA musí být nejprve definována jako **nová entita** nebo jako **rozšíření existující entity**.

Tím je zajištěna konzistence celé platformy.

---

## 11. Kontrolní seznam implementace

Při kontrole projektu v Cursoru ověřit:

- [ ] Mají všechny objekty jednoznačné ID?
- [ ] Je u všech znám jejich typ?
- [ ] Je evidována historie změn?
- [ ] Existuje jasně definovaný životní cyklus?
- [ ] Jsou vztahy mezi entitami dohledatelné?
- [ ] Je každá entita odpovědná pouze za jednu oblast?

Automatická kontrola: `tests/mia_master_canon_0002_contract.js` · mapa souladu: [`0002-alignment.md`](./0002-alignment.md).

---

## 12. Poznámka architekta

Veškerá budoucí architektura MIA bude navržena jako **Entity-First Architecture**.

To znamená, že se nejprve navrhují entity a jejich vztahy, teprve poté logika, uživatelské rozhraní a implementace. Tím se minimalizuje riziko nejasností a zajišťuje dlouhodobá rozšiřitelnost systému.

---

**Konec dokumentu 0002**

Dokument **0003** bude definovat další základní stavební kámen celého systému: **Událost (Event)**. V MIA totiž každá změna vzniká jako reakce na událost, takže tím položíme základ celé komunikační architektury.
