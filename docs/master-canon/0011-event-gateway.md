# MIA MASTER CANON — Dokument 0011

**Název:** Event Gateway – Vstupní brána událostí  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Kritická

**Nadřazené dokumenty:**

- [0003 – Definice události](./0003-event-definition.md)
- [0010 – Event Bus](./0010-event-bus.md)

---

## 1. Účel dokumentu

Event Gateway je **jediná oficiální vstupní brána** všech událostí do platformy MIA.

Každá událost z externího nebo interního zdroje musí nejprve projít Event Gateway. **Žádná událost nesmí** být vložena přímo do Event Busu bez průchodu touto vrstvou.

---

## 2. Definice Event Gateway

Event Gateway je **ochranná a normalizační vrstva** mezi okolním světem a platformou MIA.

Úkoly:

- přijímat události,
- ověřit původ,
- převést do jednotného formátu,
- přidat systémová metadata,
- předat Validatoru.

Gateway **nerozhoduje** o významu události — pouze zajišťuje platná a jednotně popsaná data.

---

## 3. Architektura Event Gateway

```
EVENT GATEWAY
├── Input Listener
├── Source Detector
├── Authentication Checker
├── Rate Limiter
├── Payload Parser
├── Metadata Builder
├── Event Normalizer
├── Security Filter
├── Duplicate Detector
├── Gateway Logger
└── Validator Connector
```

Registr: `GATEWAY_COMPONENT` v `shared/mia-event-core/eventGateway.js`

---

## 4. Podporované zdroje

| Kategorie | Zdroje |
|-----------|--------|
| Streamovací platformy | TikTok, Kick, Twitch, YouTube, Facebook, budoucí |
| Lokální aplikace | OBS, Streamer.bot, grafický editor, MIA Launcher |
| AI systémy | OpenAI, lokální modely, budoucí poskytovatelé |
| Interní systémy | Scheduler, Pluginy, Administrace, Test |

Enum: `GATEWAY_SOURCE` · stream platformy: `STREAM_PLATFORM_SOURCES`

---

## 5. Input Listener

Naslouchá vstupům: HTTP, HTTPS, WebSocket, IPC, lokální fronty.

Každý vstup dostane vlastní **Request ID**.

Kotva: `routes/ingest.js` · `INPUT_TRANSPORT`

---

## 6. Source Detector

Určuje původ události (TikTok, Kick, OBS, Scheduler, Plugin, Memory, AI, Administrator).

Zdroj se zapisuje do metadat.

Kotva: `detectPlatform()` v `normalize_event.js` 🟡

---

## 7. Authentication Checker

Ověření: API klíče, tokeny, podpisy, oprávnění, důvěryhodnost.

Neověřená událost je **odmítnuta**.

Kotva: `ingestAuthGuard` · `scripts/MIA_RUNTIME_SECURITY.js`

---

## 8. Rate Limiter

Limity na IP, platformu, plugin, účet.

Po překročení: odložit, odmítnout, označit jako podezřelé.

Kotva: 🟡 částečně v ingest guard / LLM adapter pattern

---

## 9. Payload Parser

Převod příchozích dat do interní reprezentace (např. `giftType` vs `gift_name`).

Kotva: `normalize_event.js` field mapping

---

## 10. Metadata Builder

Povinná metadata (`GATEWAY_METADATA_FIELDS`):

GatewayID, EventID, CorrelationID, Source, ReceiveTime (UTC), GatewayVersion, SessionID, Environment, SchemaVersion, RequestID

API: `createGatewayMetadata()`

---

## 11. Event Normalizer

Převod všech vstupů na jednotný interní formát MIA.

Příklad: TikTok Gift / Kick Donation / YouTube SuperChat → `GIFT_RECEIVED`

Kotva: `shared/platform_normalizers/normalize_event.js` · `fromNormalizedIngestEvent()`

---

## 12. Security Filter

Kontrola: zakázané znaky, velikost zprávy, neplatné formáty, známé útoky.

Kotva: `hasIngestPayloadSignal()` · `MIA_INGEST_GUARD.js` 🟡

---

## 13. Duplicate Detector

Porovnání EventID, času, zdroje, obsahu.

Akce: ignorovat, spojit, předat s příznakem duplicity.

Kotva: `createIngestDeduper()` v `MIA_INGEST_GUARD.js`

---

## 14. Gateway Logger

Log průchodu: čas, zdroj, velikost payloadu, doba zpracování, výsledek, chyby.

API: `createGatewayLogRecord()` · kotva: `logs/ingest-*.jsonl` 🟡

---

## 15. Chybové stavy

| Error Code | Význam |
|------------|--------|
| `invalid_source` | Neplatný zdroj |
| `authentication_failed` | Auth selhala |
| `invalid_payload` | Neplatný payload |
| `unsupported_schema` | Nepodporované schéma |
| `payload_too_large` | Příliš velký payload |
| `duplicate_event` | Duplicita |
| `rate_limit_exceeded` | Překročen limit |
| `internal_gateway_error` | Interní chyba |

Enum: `GATEWAY_ERROR_CODE` · API: `createGatewayError()`

---

## 16. Výkonnost

Požadavky: nízká latence, paralelní zpracování, odolnost proti špičkám, horizontální škálování.

Gateway **nesmí** být úzkým hrdlem.

---

## 17. Zásady návrhu

Gateway nesmí: ukládat business data, rozhodovat AI, počítat ekonomiku, spouštět animace, komunikovat s grafikou.

Enum: `GATEWAY_FORBIDDEN_ACTIVITIES`

---

## 18. Vazba na současný projekt MIA

Aktuální adaptéry (`MIA_GATEWAY_ADAPTERS`):

| Zdroj | Adaptér | Runtime |
|-------|---------|---------|
| TikTok | TikFinity Ingest | `routes/ingest.js` |
| Kick | Kick Adapter | `MIA_KICK_BRIDGE.js` |
| OBS | OBS WebSocket | `index.js` |
| Streamer.bot | Forwarder | `routes/ingest.js` (legacy) |

Dlouhodobý cíl: jednotné rozhraní Event Gateway pro všechny adaptéry.

`listGatewayAdapters()` · `describeGatewayPipeline()`

---

## 19. Kontrolní seznam implementace

- [ ] Jediná vstupní vrstva pro události?
- [ ] Ověřování zdrojů?
- [ ] Autentizace?
- [ ] Rate Limiter?
- [ ] Normalizace dat?
- [ ] Systémová metadata?
- [ ] Detekce duplicit?
- [ ] Logování průchodů?
- [ ] Žádná událost mimo Gateway?

Automatická kontrola: `tests/mia_master_canon_0011_contract.js` · [`0011-alignment.md`](./0011-alignment.md)

---

## 20. Poznámka architekta

Event Gateway je **recepce** celé MIA — ověří, kdo přichází, odkud, a převede vstup do jednotného jazyka platformy. Vyšší vrstvy pak pracují bez ohledu na původní platformu.

---

**Konec dokumentu 0011**

**Další krok:** Dokument **0012** — [Event Validator](./0012-event-validator.md). Dokument **0013** — Event Registry.
