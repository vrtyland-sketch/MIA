# Master Canon 0002 — soulad s projektem

Audit [`0002-entity-definition.md`](./0002-entity-definition.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-entity-core/`

---

## §1 Účel dokumentu

| Bod | Stav | Důkaz / poznámka |
|-----|------|------------------|
| Pojem Entita zaveden | ✅ | `0002-entity-definition.md` + `mia-entity-core` |
| Architektura postavena na entitách | 🟡 | implicitně v runtime; formální Entity-First právě zavedeno |
| Bez entity nelze navrhovat moduly | ✅ | dokument + registry `systemEntities.js` |

---

## §2 Definice entity

| Vlastnost entity | Stav | Důkaz / poznámka |
|------------------|------|------------------|
| Identita | ✅ | `entityId` v `validateEntityRecord`; ingest `eventId` |
| Stav | ✅ | Koj state, body state, overlay state, stream session |
| Vlastnosti | ✅ | metadata pole, gift mapa, item meta |
| Historie | 🟡 | `logs/ingest-*.jsonl`, persistence JSON; bez unified entity audit log |
| Chování | ✅ | shadow pipeline, speaker routing, CARE commands |
| Vztahy | 🟡 | `CANON_ENTITY_RELATIONS`; ne všechny runtime vazby evidovány |
| Fyzická / digitální / logická | ✅ | OBS render (digitální), streamer pin (logická identita) |

---

## §3 Základní pravidlo (jedinečná identita)

| Bod | Stav | Důkaz / poznámka |
|-----|------|------------------|
| Jedinečné ID | 🟡 | `assertUniqueEntityIds`; ingest deduper; ne všude jednotné |
| Identita se nemění | ✅ | `streamer-identity.json` TOFU pin; `entityId` immutable v registry |
| Žádné duplicity v canon registry | ✅ | `SYSTEM_ENTITY_REGISTRY` — 6 unikátních ID |

---

## §4 Životní cyklus

| Stav | Kód | Stav implementace |
|------|-----|-------------------|
| Návrh | `concept` | ✅ enum |
| Vytvoření | `created` | ✅ enum |
| Inicializace | `initialized` | ✅ enum |
| Aktivní | `active` | ✅ použito v system registry |
| Pozastavení | `suspended` | ✅ enum |
| Archivace | `archived` | ✅ enum |
| Odstranění | `deleted` | ✅ enum |

| Bod | Stav | Poznámka |
|-----|------|----------|
| Lifecycle na všech objektech | 🟡 | enum hotový; většina runtime objektů nemá `state` pole |
| Deleted = jen archiv | 🟡 | princip dokumentován; enforcement per-modul |

---

## §5 Povinné vlastnosti

| Pole | Stav | Důkaz |
|------|------|-------|
| entityId | ✅ | `REQUIRED_ENTITY_FIELDS` |
| entityType | ✅ | validace |
| name | ✅ | validace |
| createdAt / updatedAt | ✅ | validace ISO |
| createdBy | ✅ | validace |
| version | ✅ | validace |
| state | ✅ | lifecycle enum |
| metadata | ✅ | objekt povinný |

| Bod | Stav | Poznámka |
|-----|------|----------|
| Všechny runtime objekty splňují §5 | 🟡 | platí pro canon registry; ingest/Koj/items mají vlastní schémata |
| `validateEntityRecord()` | ✅ | `entitySchema.js` |

---

## §6 Druhy entit

| Kategorie | Příklad v kódu | Stav |
|-----------|----------------|------|
| Systémové | `runtime.stream`, `runtime.memory` | ✅ registry |
| Uživatelské | `userId` v ingest, `streamer-identity.json` | 🟡 bez unified user entity |
| Herní | Kojnožrout, batoh, duely | 🟡 `kojnozout.pet` v registry; items bez plného entity záznamu |
| Grafické | body parts, animation bank clips | 🟡 clip `id` v bank schema; ne full entity record |
| Datové | ingest events, config, logs | 🟡 `eventId` + `traceId`; ne entityType |
| AI | `mia.main`, shadow, interpreter | 🟡 `mia.main` v registry |

---

## §7 Vztahy mezi entitami

| Typ vztahu | Stav | Důkaz |
|------------|------|-------|
| owns / contains / creates / controls / … | ✅ | `ENTITY_RELATION` + `validateEntityRelation` |
| Evidované vztahy (canon) | ✅ | `CANON_ENTITY_RELATIONS` (5 hran) |
| Všechny runtime vazby evidované | ❌ | gift→video, user→participant — implicitní, ne graph |

---

## §8 Chování entity

| Bod | Stav | Důkaz |
|-----|------|-------|
| Reakce na události | ✅ | ingest → pipeline → shadow → delivery |
| Žádná změna bez triggeru | ✅ | pipeline je event-driven |
| Formální Event model | 🟡 | `normalize_event.js`; dokument **0003** |

---

## §9 Jedinečnost odpovědnosti

| Pravidlo | Stav | Důkaz |
|----------|------|-------|
| Koj ≠ user | ✅ | oddělené moduly a speaker routing |
| Sprite ≠ inventář | ✅ | animation bank vs backpack |
| Gift ≠ AI agent | ✅ | gift mapa vs shadow runtime |
| Jedna entita = jedna oblast | 🟡 | architektonicky drženo; bez linter enforcement |

---

## §10 Budoucí rozšíření

| Bod | Stav | Poznámka |
|-----|------|----------|
| Nová funkce = entita nebo rozšíření | 🟡 | pravidlo zapsáno; review v PR procesu |
| Entity-First pro nové moduly | ✅ | `mia-entity-core` jako vstupní bod |

---

## §11 Kontrolní seznam implementace

| Otázka | Stav | Poznámka |
|--------|------|----------|
| ☐ Jednoznačné ID? | 🟡 | ingest + registry ✅; starší moduly částečně |
| ☐ Známý typ? | 🟡 | `entityType` v canon; jinde `eventType`, `speaker` |
| ☐ Historie změn? | 🟡 | logy + JSON persistence; ne entity-level audit |
| ☐ Životní cyklus? | 🟡 | enum ✅; adopce v runtime 🟡 |
| ☐ Dohledatelné vztahy? | 🟡 | canon graph ✅; full runtime graph ❌ |
| ☐ Jedna odpovědnost? | ✅ | speaker routing, gift mapa, Koj moduly |

---

## §12 Entity-First Architecture

| Bod | Stav | Poznámka |
|-----|------|----------|
| Entity-first jako směr | ✅ | tento dokument + `shared/mia-entity-core/` |
| Migrace existujícího kódu | 🟡 | inkrementální — bez big-bang refactoru |

---

## Shrnutí 0002

| Sekce | ✅ | 🟡 | ❌ |
|-------|----|----|-----|
| §1–§2 Definice | 4 | 2 | 0 |
| §3–§5 Identita + lifecycle + pole | 12 | 4 | 0 |
| §6–§9 Kategorie + vztahy + chování | 8 | 7 | 1 |
| §10–§12 Architektura | 2 | 3 | 0 |

**Celkově:** základ Entity-First je **zaveden** (`mia-entity-core`). Runtime zatím používá **doménová schémata** — sjednocení na plný entity record je postupná migrace, ne jednorázový přepis.

---

## Další krok

**Dokument 0003 — Definice události (Event)** — formální model triggerů pro §8 a celý ingest/pipeline tok.
