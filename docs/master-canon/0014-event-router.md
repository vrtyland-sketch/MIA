# MIA MASTER CANON — Dokument 0014

**Název:** Event Router – Směrování událostí  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Kritická

**Nadřazené dokumenty:**

- [0010 – Event Bus](./0010-event-bus.md)
- [0012 – Event Validator](./0012-event-validator.md)
- [0013 – Event Registry](./0013-event-registry.md)

---

## 1. Účel dokumentu

Event Router je **rozhodovací vrstva** Event Busu — určuje, které části platformy obdrží konkrétní událost.

Nerozhoduje o obsahu ani nezpracovává událost. Pouze **směruje**. Umožňuje připojovat nové systémy bez změn ve stávajících modulech.

---

## 2. Definice Event Routeru

Router:

- přijímá validované události,
- vyhledá definici v Event Registry,
- určí oprávněné příjemce,
- vytvoří distribuční plán,
- předá plán Dispatcheru.

Router **nikdy nemění** obsah události.

---

## 3. Architektura Event Routeru

```
EVENT ROUTER
├── Route Resolver
├── Subscriber Resolver
├── Filter Engine
├── Priority Resolver
├── Broadcast Manager
├── Multicast Manager
├── Direct Route Manager
├── Route Cache
├── Route Logger
└── Dispatcher Connector
```

Registr: `ROUTER_COMPONENT` v `shared/mia-event-core/eventRouter.js`

---

## 4. Princip směrování

Směrování podle: typu události, registrace odběratelů, filtrů, oprávnění, priority.

Výsledek musí být **deterministický**.

API: `computeDistributionPlan(event, options)`

---

## 5. Route Resolver

Načte z Event Registry subscribers pro daný typ.

Pouze **čte** definice — `getEventTypeDefinition()`.

---

## 6. Subscriber Resolver

Ověří aktivní odběratele. Neaktivní nedostanou událost.

API: `resolveActiveSubscribers()` (via `options.activeSubscribers`, `options.deniedSubscribers`)

---

## 7. Filter Engine

Filtry per subscriber (jazyk, publicOnly, minCoins).

API: `createRouteRule()` · `evaluateFilter()` · `applySubscriberRules()`

---

## 8. Priority Resolver

Respektuje prioritu události a pravidel odběratelů.

API: `sortRecipientsByPriority()` · `compareEventPriority()`

---

## 9. Typy směrování

| Režim | Popis |
|-------|--------|
| **Direct** | jeden příjemce |
| **Multicast** | více příjemců |
| **Broadcast** | všichni aktivní |
| **Conditional** | podmíněné větve |

Enum: `ROUTE_MODE` · mapa: `ROUTE_MODE_BY_EVENT`

---

## 10. Route Cache

Cache distribučních plánů s invalidací při změně registrace.

API: `createRouteCache()` · `defaultRouteCache.invalidate()`

---

## 11. Směrovací pravidla

Pole: `ROUTE_RULE_FIELDS` — RuleID, EventType, Subscriber, Priority, Filter, Condition, Enabled.

---

## 12. Dynamická registrace

Nový subscriber za běhu — `options.activeSubscribers` rozšíření bez restartu (koncept).

---

## 13. Oprávnění

`options.deniedSubscribers` — blokace doručení (např. interní události → pluginy).

---

## 14. Selhání směrování

`ROUTE_ERROR_CODE` · `createRouteError()` — unknown type, no subscribers, permission denied.

Router **nesmí** shodit platformu — vrací `{ ok: false, error }`.

---

## 15. Audit směrování

`createRouteLog()` — RouteID, EventID, příjemci, čas, pravidla, výsledek.

---

## 16. Výkonnost

Cache, deterministický výpočet, minimální alokace. Plán nesmí být úzkým hrdlem.

---

## 17. Zakázané činnosti

Enum: `ROUTER_FORBIDDEN_ACTIVITIES` — žádná mutace payload/priority, AI, business data.

---

## 18. Vazba na MIA

`EVENT_GIFT_RECEIVED` → economy → kojnožrout → video → overlay → analytics → memory

`MIA_GIFT_ROUTE_CHAIN` · `describeGiftRouteChain()`

Runtime dnes: pipeline fáze 🟡 místo explicitního routeru

---

## 19. Kontrolní seznam implementace

Automatická kontrola: `tests/mia_master_canon_0014_contract.js` · [`0014-alignment.md`](./0014-alignment.md)

---

## 20. Vazba na budoucí vývoj MIA

Router jako klíčová komponenta pro distribuovanou architekturu — AI, graphics, stream adaptéry na oddělených uzlech.

---

## 21. Poznámka architekta

Event Router je **dopravní dispečer** — najde správnou cestu ke správným příjemcům. Moduly o sobě nemusí vědět.

---

**Konec dokumentu 0014**

**Další krok:** Dokument **0015** — **Priority Manager** (pořadí zpracování při vysokém zatížení, fair scheduling, ochrana proti zahlcení).
