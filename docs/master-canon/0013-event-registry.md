# MIA MASTER CANON — Dokument 0013

**Název:** Event Registry – Centrální registr událostí  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Kritická

**Nadřazené dokumenty:**

- [0003 – Definice události](./0003-event-definition.md)
- [0010 – Event Bus](./0010-event-bus.md)
- [0012 – Event Validator](./0012-event-validator.md)

---

## 1. Účel dokumentu

Event Registry je **jediný oficiální katalog** všech typů událostí platformy MIA.

Zajišťuje: jednoznačné názvy, žádné duplicity, jednotnou terminologii, bezpečné verzování, dlouhodobou rozšiřitelnost.

**Bez registrace nesmí vzniknout nový typ události.**

---

## 2. Definice Event Registry

Event Registry je **databáze definic událostí** — ne obsahuje samotné události, pouze jejich popis. Slovník jazyka MIA.

---

## 3. Odpovědnosti

Evidencia typů, verze, názvy, dokumentace, kompatibilita, životní cyklus definic.

Registry **nerozhoduje** o zpracování událostí.

---

## 4. Povinné informace o typu

`EVENT_TYPE_DEFINITION_FIELDS`: EventTypeID, Název, Popis, Kategorie, Verze, Stav, Datum vytvoření, Autor, Vlastník, Dokumentace, Payload Schema, Metadata Schema, Publishers, Subscribers.

---

## 5. Struktura záznamu

```
EventTypeID → Canonical Name → Description → Payload Schema → Metadata Schema
  → Version → Lifecycle → Subscribers → Publishers → Documentation
```

API: `defineEventType()` · katalog: `EVENT_TYPE_REGISTRY`

---

## 6. Pojmenování

Anglické, VELKÁ_PÍSMENA, podtržítko, prefix `EVENT_`.

Validace: `validateCanonicalEventName()` — pattern `^EVENT_[A-Z0-9_]+$`

---

## 7. Kategorie událostí

| Kategorie | Příklady |
|-----------|----------|
| System | EVENT_SYSTEM_STARTED, EVENT_SYSTEM_STOPPED |
| Runtime | EVENT_RUNTIME_READY, EVENT_RUNTIME_FAILED |
| Stream | EVENT_CHAT_MESSAGE, EVENT_GIFT_RECEIVED, EVENT_FOLLOW |
| Graphics | EVENT_ANIMATION_STARTED, EVENT_RENDER_COMPLETED |
| AI | EVENT_AI_REQUEST, EVENT_AI_RESPONSE |
| Game | EVENT_KOJNOZROUT_FED, EVENT_ITEM_USED |
| Economy | EVENT_POINTS_CHANGED, EVENT_REWARD_GRANTED |

Enum: `REGISTRY_CATEGORY` — **15 aktivních typů** v katalogu.

---

## 8. Verzování

Každý typ má `version` (semver). `compatibility.backward` / `forward` / `migrationNotes`.

---

## 9. Stav definice

`REGISTRY_DEFINITION_STATUS`: Draft, Proposed, Approved, Active, Deprecated, Archived.

**Pouze Active** v produkci (kontrola ve Validatoru jako warning).

---

## 10. Payload Schema

Registry ukládá schéma dat. Validator čerpá pravidla z `payloadSchema` v definici a z `PAYLOAD_RULES_BY_TYPE`.

Příklad `EVENT_GIFT_RECEIVED`: giftName, coins, senderId, senderName, timestamp.

---

## 11. Metadata Schema

Každý typ může definovat vlastní metadata (platform, language, sessionId, streamId).

Metadata jsou **oddělena** od Payloadu — pole `metadataSchema` v definici.

## 12. Publisher Registry

Každá definice obsahuje `publishers[]` — kdo smí událost vytvářet.

Příklad: `EVENT_GIFT_RECEIVED` — TikTok/Kick adaptéry; AI modul nesmí vytvářet Gift Event.

---

## 13. Subscriber Registry

Každá definice obsahuje `subscribers[]` — kdo událost odebírá.

Příklad: `EVENT_CHAT_MESSAGE` — AI, Chat Overlay, Analytics, Moderation.

Router použije tyto informace (dokument 0014).

## 14. Životní cyklus definice

`REGISTRY_LIFECYCLE_ORDER`: draft → review → approved → implemented → active → deprecated → archived

Audit: `createRegistryAuditEvent()`

---

## 15. Kompatibilita

Pole `compatibility` v každé definici.

---

## 16. Vyhledávání

`searchEventTypeDefinitions({ q, category, status, author, version, publisher, subscriber })`

`listEventTypeDefinitions(filter)`

---

## 17. Audit

`createRegistryAuditEvent()` — RegistryID, Author, Timestamp, Operation, OldVersion, NewVersion.

Perzistentní audit log 🟡

---

## 18. Výkonnost

Převážně read-only, cache-friendly. Aktualizace vzácné.

---

## 19. Zakázané činnosti

Enum: `REGISTRY_FORBIDDEN_ACTIVITIES` — žádné směrování, payload, opravy dat, business logika, náhrada Validatoru.

---

## 20. Kontrolní seznam implementace

Automatická kontrola: `tests/mia_master_canon_0013_contract.js` · [`0013-alignment.md`](./0013-alignment.md)

---

## 21. Vazba na současnou architekturu MIA

Cílový tok:

```
Adaptéry (TikTok, Kick, OBS, AI, Scheduler) → Event Registry → Validator → Event Bus
```

Bridge runtime typů: `resolveCanonicalEventName("GIFT")` → `EVENT_GIFT_RECEIVED`

---

## 22. Poznámka architekta

Event Registry je **slovník platformy**. Všechny moduly komunikují jednotným jazykem událostí.

---

**Konec dokumentu 0013**

**Další krok:** Dokument **0014** — [Event Router](./0014-event-router.md). Dokument **0015** — Priority Manager.
