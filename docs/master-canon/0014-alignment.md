# Master Canon 0014 — soulad s projektem

Audit [`0014-event-router.md`](./0014-event-router.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-event-core/eventRouter.js`

---

## §1–§4 Účel a princip

| Bod | Stav | Důkaz |
|-----|------|-------|
| Rozhodovací vrstva bez mutace payloadu | ✅ | computeDistributionPlan |
| Registry-based routing | ✅ | getEventTypeDefinition |
| Deterministický výsledek | ✅ | contract test |
| Centrální router v runtime ingest | ❌ | pipeline fáze místo routeru |

---

## §3 Architektura — 10 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Route Resolver | ✅ | registry lookup |
| Subscriber Resolver | ✅ | active/denied sets |
| Filter Engine | ✅ | evaluateFilter |
| Priority Resolver | ✅ | sortRecipientsByPriority |
| Broadcast/Multicast/Direct | ✅ | ROUTE_MODE |
| Route Cache | ✅ | createRouteCache |
| Route Logger | ✅ | createRouteLog |
| Dispatcher Connector | 🟡 | plán pro dispatcher; ingest queue částečně |

---

## §5–§13 Resolver, filtry, režimy, oprávnění

| Požadavek | Stav |
|-----------|------|
| Subscribers z registry | ✅ |
| Filtry (language, public, minCoins) | ✅ |
| Direct / Multicast / Broadcast / Conditional | ✅ |
| Route rules CRUD model | ✅ createRouteRule |
| Dynamic subscriber registration | 🟡 | options API |
| Permission deny list | ✅ deniedSubscribers |

---

## §14–§16 Chyby, audit, výkon

| Oblast | Stav |
|--------|------|
| Route errors bez pádu | ✅ |
| Route log per compute | ✅ |
| Cache hit | ✅ |
| Perzistentní route audit log | ❌ |

---

## §18 MIA gift route

| Subscriber v registry | V MIA_GIFT_ROUTE_CHAIN |
|-----------------------|------------------------|
| economy.gift_engine | ✅ |
| game.kojnozout | ✅ (registry) |
| graphics.video_engine | ✅ |
| graphics.overlay | 🟡 | chain reference |
| analytics.stream | ✅ |
| memory.session | 🟡 | chain reference |

Pipeline `runEventPipeline` fáze = implicitní multicast 🟡

---

## §19 Kontrolní seznam (ruční)

| Položka | Stav |
|---------|------|
| Centrální Event Router | 🟡 |
| Směrování z registry | ✅ |
| Filtry odběratelů | ✅ |
| Direct/Multicast/Broadcast | ✅ |
| Route Cache | ✅ |
| Oprávnění | 🟡 |
| Audit směrování | 🟡 |
| Subscriber bez restartu | 🟡 |

---

## Doporučené kroky

1. **0016 Queue Manager**
2. Volat `computeDistributionPlan()` v ingest před pipeline
3. `logs/route-*.jsonl`
4. Mapovat pipeline fáze na router recipients

---

## Vazby

| Dokument | Vztah |
|----------|-------|
| [0013](./0013-event-registry.md) | Subscribers source |
| [0010](./0010-event-bus.md) | Router → Dispatcher |
| [0015](./0015-priority-manager.md) | Priority Manager |
| **0016** (plánováno) | Queue Manager |
