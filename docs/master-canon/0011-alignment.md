# Master Canon 0011 — soulad s projektem

Audit [`0011-event-gateway.md`](./0011-event-gateway.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-event-core/eventGateway.js`

---

## §1–§2 Účel a definice

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediná oficiální vstupní brána | 🟡 | `/ingest` + Kick bridge; interní volání mimo gateway existují |
| Normalizace bez business logiky | ✅ | normalize_event bez tier rozhodnutí |
| Předání Validatoru | 🟡 | validateEventRecord po normalizaci částečně |

---

## §3 Architektura — 11 komponent

| Komponenta | Stav | Runtime |
|------------|------|---------|
| Input Listener | ✅ | routes/ingest HTTP GET/POST |
| Source Detector | 🟡 | detectPlatform v normalizer |
| Authentication Checker | ✅ | ingestAuthGuard + secret |
| Rate Limiter | ❌ | ne centralizovaný pro ingest |
| Payload Parser | ✅ | normalize_event field mapping |
| Metadata Builder | 🟡 | createGatewayMetadata API; runtime částečný |
| Event Normalizer | ✅ | normalize_event.js |
| Security Filter | 🟡 | hasIngestPayloadSignal |
| Duplicate Detector | ✅ | createIngestDeduper |
| Gateway Logger | 🟡 | ingest jsonl částečně |
| Validator Connector | 🟡 | pipeline po ingest |

**Souhrn:** 4× ✅ · 6× 🟡 · 1× ❌

---

## §4 Podporované zdroje

| Zdroj | Stav |
|-------|------|
| TikTok (TikFinity) | ✅ |
| Kick | ✅ |
| Twitch | 🟡 | normalizer detekce; bridge ❌ |
| YouTube / Facebook | ❌ | enum only |
| OBS WebSocket | ✅ |
| Streamer.bot forward | 🟡 | přes /ingest |
| AI / Scheduler / Admin | 🟡 | interní cesty |

---

## §5–§8 Listener, Source, Auth, Rate limit

| Požadavek | Stav |
|-----------|------|
| HTTP/HTTPS ingest | ✅ |
| WebSocket (Kick, OBS) | ✅ |
| Request ID | 🟡 | model v metadata; ne vždy v logu |
| Auth secret / localhost | ✅ |
| Rate limit per IP/platform | ❌ |

---

## §9–§14 Parser, Metadata, Normalizer, Security, Dedupe, Logger

| Oblast | Stav |
|--------|------|
| Unified internal format | ✅ |
| GATEWAY_METADATA_FIELDS | ✅ API |
| Correlation ID | 🟡 | ensureCorrelationId |
| Security filter | 🟡 |
| Dedupe window | ✅ |
| Gateway log record | 🟡 | API ✅; structured gateway log ❌ |

---

## §15 Chybové stavy

| Požadavek | Stav |
|-----------|------|
| 8 error codes enum | ✅ |
| createGatewayError() | ✅ |
| HTTP responses s error codes | 🟡 |

---

## §16–§17 Výkon a zásady

| Pravidlo | Stav |
|----------|------|
| Paralelní ingest lanes | ✅ |
| Horizontální škálování | ❌ design |
| Zakázané aktivity v gateway | ✅ | enum + assert |

---

## §18 Aktuální adaptéry MIA

| Adaptér | Stav |
|---------|------|
| TikFinity Ingest | ✅ |
| Kick Adapter | ✅ |
| OBS WebSocket | ✅ |
| Jednotné gateway API | 🟡 | MIA_GATEWAY_ADAPTERS registry |

---

## §19 Kontrolní seznam (ruční)

| Položka | Stav |
|---------|------|
| Jediná vstupní vrstva | 🟡 |
| Ověření zdrojů | 🟡 |
| Autentizace | ✅ |
| Rate limiter | ❌ |
| Normalizace | ✅ |
| Metadata | 🟡 |
| Duplicity | ✅ |
| Logování | 🟡 |
| Nic mimo gateway | 🟡 |

---

## Doporučené kroky

1. **0012 Validator** — schémata a odmítnutí
2. Central `EventGateway.process()` wrapper kolem ingest handleru
3. Ingest rate limiter middleware
4. Povinné `createGatewayMetadata()` v handleIngest
5. Structured `logs/gateway-*.jsonl`

---

## Vazby

| Dokument | Vztah |
|----------|-------|
| [0010](./0010-event-bus.md) | Gateway = první komponenta busu |
| [0003](./0003-event-definition.md) | Formát události po normalizaci |
| **0012** (plánováno) | Validator detail |
