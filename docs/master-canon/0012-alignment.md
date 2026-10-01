# Master Canon 0012 — soulad s projektem

Audit [`0012-event-validator.md`](./0012-event-validator.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-event-core/eventValidator.js`

---

## §1–§4 Účel a pravidlo

| Bod | Stav | Důkaz |
|-----|------|-------|
| Poslední kontrolní bod před bus | 🟡 | validateEventCanon API; ingest ne vždy volá |
| Žádné opravy dat | ✅ | validator vrací null normalized při INVALID |
| Žádné výjimky / bypass | 🟡 | pravidlo v kánonu; runtime bypass možný |

---

## §3 Architektura — 11 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Schema | ✅ | validateEventRecord |
| Metadata | 🟡 | warnings v validateEventCanon |
| Payload | 🟡 | PAYLOAD_RULES_BY_TYPE |
| Version | ✅ | SUPPORTED_SCHEMA_VERSIONS |
| Integrity | 🟡 | gift coins/value check |
| Security | 🟡 | pattern scan |
| Rule | 🟡 | known event type warning |
| Size | ✅ | bytes + depth |
| Timestamp | ✅ | skew check |
| Result Builder | ✅ | VALIDATION_RESULT |
| Validation Logger | 🟡 | createValidationLogRecord |

---

## §5 Povinná pole

| Pole | Stav |
|------|------|
| 7 polí VALIDATOR_REQUIRED_FIELDS | ✅ |
| CorrelationID povinné | ✅ v validateEventCanon |
| 0003 REQUIRED_EVENT_FIELDS (širší) | ✅ validateEventRecord |

---

## §8–§14 Validátory detailně

| Oblast | Stav | Poznámka |
|--------|------|----------|
| Gift payload rules | 🟡 | structural only |
| Chat / AI rules | 🟡 | enum rules |
| Schema version 1.0 | ✅ | |
| Security blocked | ✅ | script/javascript/sql patterns |
| Max payload 256KB | ✅ | konfigurovatelné |
| Timestamp skew 24h | ✅ | warning/fail |

---

## §15–§17 Výsledek a audit

| Požadavek | Stav |
|-----------|------|
| 4 validation results | ✅ |
| Validation Report | ✅ |
| Perzistentní validation log | ❌ |
| Report v ingest pipeline | 🟡 |

---

## §18–§19 Výkon a zakázané činnosti

| Pravidlo | Stav |
|----------|------|
| Nízká latence (sync validate) | ✅ |
| Horizontální škálování | ❌ design |
| VALIDATOR_FORBIDDEN_ACTIVITIES | ✅ |

---

## §21 Pipeline MIA

| Krok | Stav | Modul |
|------|------|-------|
| Gateway | ✅ | routes/ingest |
| Normalizer | ✅ | normalize_event.js |
| Validator | 🟡 | validateEventCanon; ne vždy v handleIngest |
| Registry | 🟡 | KNOWN_EVENT_TYPES |
| Event Bus | ✅ | MIA_INGEST_QUEUE |

---

## §20 Kontrolní seznam (ruční)

| Položka | Stav |
|---------|------|
| Centrální Validator | 🟡 |
| Povinná pole | ✅ |
| Metadata | 🟡 |
| Payload | 🟡 |
| Verze schémat | ✅ |
| Security | 🟡 |
| Velikost | ✅ |
| Validation Report | ✅ |
| Audit log | 🟡 |
| Bez mutace dat | ✅ |

---

## Doporučené kroky

1. **0013 Event Registry** — formální registr typů
2. Volat `validateEventCanon()` v handleIngest před pipeline
3. `logs/validation-*.jsonl`
4. Rozšířit security filter (HTML entity, binární detekce)

---

## Vazby

| Dokument | Vztah |
|----------|-------|
| [0011](./0011-event-gateway.md) | Vstup před validací |
| [0010](./0010-event-bus.md) | Výstup po validaci |
| [0003](./0003-event-definition.md) | Základní event schema |
| **0013** (plánováno) | Event Registry |
