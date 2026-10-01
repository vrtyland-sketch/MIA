# Master Canon 0013 — soulad s projektem

Audit [`0013-event-registry.md`](./0013-event-registry.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-event-core/eventRegistry.js`

---

## §1–§3 Účel a odpovědnosti

| Bod | Stav | Důkaz |
|-----|------|-------|
| Centrální katalog typů | 🟡 | EVENT_TYPE_REGISTRY (15 typů) |
| Definice ≠ instance události | ✅ | frozen definitions only |
| Bez registrace nový typ | 🟡 | pravidlo v kánonu; runtime enforcement 🟡 |

---

## §4–§5 Struktura záznamu

| Pole | Stav |
|------|------|
| EVENT_TYPE_DEFINITION_FIELDS (14+) | ✅ |
| createEventTypeDefinition() | ✅ |
| EVENT_TYPE_REGISTRY | ✅ 15 active types |

---

## §6 Pojmenování

| Pravidlo | Stav |
|----------|------|
| EVENT_ prefix, uppercase | ✅ validateCanonicalEventName |
| Runtime alias map | ✅ runtimeAliases per type |

---

## §7 Kategorie

| Kategorie | Počet typů v registru |
|-----------|----------------------|
| system | 2 |
| runtime | 2 |
| stream | 3 |
| graphics | 2 |
| ai | 2 |
| game | 2 |
| economy | 2 |

---

## §8–§9 Verze a stav

| Požadavek | Stav |
|-----------|------|
| version per type | ✅ default 1.0.0 |
| compatibility object | ✅ |
| Active-only in production | 🟡 | validator warning |

---

## §10–§13 Schémata, publishers, subscribers

| Oblast | Stav |
|--------|------|
| payloadSchema in registry | 🟡 | gift, chat, ai |
| metadataSchema | 🟡 | stream types |
| publishers / subscribers | ✅ | per definition |
| Router uses subscribers | ❌ | 0014 planned |

---

## §14–§17 Lifecycle, kompatibilita, search, audit

| Požadavek | Stav |
|-----------|------|
| REGISTRY_LIFECYCLE_ORDER | ✅ |
| createRegistryAuditEvent | ✅ |
| searchEventTypeDefinitions | ✅ |
| Persistent audit store | ❌ |

---

## §18–§19 Výkon a zakázané činnosti

| Pravidlo | Stav |
|----------|------|
| Read-only catalog | ✅ frozen registry |
| REGISTRY_FORBIDDEN_ACTIVITIES | ✅ |

---

## Rozptýlené typy v repu (současný stav)

| Umístění | Typy |
|----------|------|
| normalize_event.js | COMMENT, GIFT, LIKE, FOLLOW, SHARE |
| eventBusInfrastructure KNOWN_EVENT_TYPES | 9 legacy names |
| EVENT_TYPE_REGISTRY | 15 canonical EVENT_* types |
| Validator | resolve via getEventTypeDefinition |

**Cíl:** jeden zdroj — `EVENT_TYPE_REGISTRY`.

---

## §20 Kontrolní seznam (ruční)

| Položka | Stav |
|---------|------|
| Centrální registry | 🟡 |
| Všechny typy registrovány | 🟡 |
| Jednotné názvy | 🟡 |
| Payload schémata | 🟡 |
| Publishers | ✅ v definicích |
| Subscribers | ✅ v definicích |
| Verzování | ✅ |
| Audit změn | 🟡 |
| Vyhledávání | ✅ |

---

## Doporučené kroky

1. **0014 Event Router** — použít subscribers z registry
2. Nahradit KNOWN_EVENT_TYPES re-exportem z registry
3. Admin UI pro search registry
4. `data/event-registry.json` pro draft/proposed typy

---

## Vazby

| Dokument | Vztah |
|----------|-------|
| [0012](./0012-event-validator.md) | Validator čte registry |
| [0010](./0010-event-bus.md) | Registry krok v journey |
| **0014** (plánováno) | Event Router |
