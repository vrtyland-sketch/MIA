# MIA MASTER CANON — Dokument 0012

**Název:** Event Validator – Validace událostí  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Kritická

**Nadřazené dokumenty:**

- [0003 – Definice události](./0003-event-definition.md)
- [0010 – Event Bus](./0010-event-bus.md)
- [0011 – Event Gateway](./0011-event-gateway.md)

---

## 1. Účel dokumentu

Event Validator je **bezpečnostní a kvalitativní vrstva** Event Busu.

Ověřuje, že každá událost splňuje pravidla platformy **před** vstupem do interní komunikace. Validator je **poslední kontrolní bod** před systémem.

---

## 2. Definice Event Validatoru

Validator kontroluje: strukturu, úplnost dat, kompatibilitu verzí, integritu, pravidla platformy.

Validator **nikdy neopravuje data**. Neplatná událost je **odmítnuta**.

---

## 3. Architektura Validatoru

```
EVENT VALIDATOR
├── Schema Validator
├── Metadata Validator
├── Payload Validator
├── Version Validator
├── Integrity Validator
├── Security Validator
├── Rule Validator
├── Size Validator
├── Timestamp Validator
├── Result Builder
└── Validation Logger
```

Registr: `VALIDATOR_COMPONENT` v `shared/mia-event-core/eventValidator.js`

---

## 4. Základní pravidlo

Každá událost musí projít validací. **Neexistují výjimky.** Ani interní systémy nesmí Validator obcházet.

---

## 5. Povinné položky události

`VALIDATOR_REQUIRED_FIELDS`:

EventID, EventType, Source, Timestamp, Payload, SchemaVersion, CorrelationID

Chybějící položka = selhání validace.

---

## 6. Schema Validator

Kontrola struktury dle schématu. Nepovolená pole podle konfigurace: povolena / ignorována / zakázána.

Kotva: `validateEventRecord()` (0003) + `validateEventCanon()` schema fáze

---

## 7. Metadata Validator

Kontrola: GatewayID, RuntimeID, SessionID, Environment, ReceiveTime.

Varování při chybějících metadata polích — ne vždy hard fail.

---

## 8. Payload Validator

Pravidla per typ (`PAYLOAD_RULES_BY_TYPE`):

| Typ | Povinné |
|-----|---------|
| GIFT / GIFT_RECEIVED | user, support.giftName |
| COMMENT / CHAT_MESSAGE | user, message |
| AI_RESPONSE | model, content |

---

## 9. Version Validator

Podporované verze: `SUPPORTED_SCHEMA_VERSIONS` (aktuálně `1.0`).

Nepodporovaná verze → odmítnuto.

---

## 10. Integrity Validator

Kontrola konzistence — např. `coins > 0` a `giftValue === 0` → nekonzistence.

Implementace: `checkGiftIntegrity()` v `validateEventCanon()`

---

## 11. Security Validator

Kontrola: script tagy, `javascript:`, SQL union patterns, nadměrné řetězce.

Výsledek: `SECURITY_BLOCKED`

---

## 12. Rule Validator

Obchodní pravidla: známý typ, povolený režim, oprávněný zdroj.

Neznámý typ → `VALID_WITH_WARNING` (konfigurovatelné).

---

## 13. Size Validator

Limit velikosti payloadu (`DEFAULT_MAX_PAYLOAD_BYTES`), hloubka objektu (`DEFAULT_MAX_OBJECT_DEPTH`).

---

## 14. Timestamp Validator

UTC / ISO kontrola, skew limit (`DEFAULT_MAX_TIMESTAMP_SKEW_MS`).

---

## 15. Výsledek validace

| Stav | Může do Event Busu |
|------|-------------------|
| `VALID` | ✅ |
| `VALID_WITH_WARNING` | ✅ |
| `INVALID` | ❌ |
| `SECURITY_BLOCKED` | ❌ |

Enum: `VALIDATION_RESULT`

---

## 16. Validation Report

Pole: ValidationID, EventID, Výsledek, Čas, Délka, Problémy, Verze pravidel.

API: `createValidationReport()` · vráceno z `validateEventCanon()`

---

## 17. Validation Logger

API: `createValidationLogRecord()` · perzistentní log 🟡

---

## 18. Výkonnost

Cíl: vysoká propustnost, paralelní validace, nízká latence, horizontální škálování.

---

## 19. Zakázané činnosti

Validator nesmí: měnit Payload, doplňovat business data, rozhodovat AI, zapisovat business DB, směrovat události.

Enum: `VALIDATOR_FORBIDDEN_ACTIVITIES`

---

## 20. Kontrolní seznam implementace

Automatická kontrola: `tests/mia_master_canon_0012_contract.js` · [`0012-alignment.md`](./0012-alignment.md)

---

## 21. Vazba na současnou MIA

Doporučený tok (`VALIDATOR_PIPELINE_AFTER_GATEWAY`):

```
TikTok / Kick / OBS → Event Gateway → Normalizer → Event Validator
  → Event Registry → Event Bus
```

`describeValidatorPipeline()`

---

## 22. Poznámka architekta

Validator je **technická kontrola na letišti**. Teprze po VALID / VALID_WITH_WARNING vstupuje událost do platformy.

---

**Konec dokumentu 0012**

**Další krok:** Dokument **0013** — [Event Registry](./0013-event-registry.md). Dokument **0014** — Event Router.
