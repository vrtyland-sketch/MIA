# Master Canon 0003 — soulad s projektem

Audit [`0003-event-definition.md`](./0003-event-definition.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-event-core/`

---

## §1 Účel dokumentu

| Bod | Stav | Důkaz / poznámka |
|-----|------|------------------|
| Event-Driven System definován | ✅ | ingest → queue → pipeline → delivery |
| Žádná změna „sama od sebe“ | ✅ | fázový pipeline; init výjimka v bootstrap |
| Základ komunikace modulů | ✅ | `MIA_EVENT_PIPELINE.js`, `EventContext` |

---

## §2 Definice události

| Bod | Stav | Důkaz |
|-----|------|-------|
| Záznam významné skutečnosti | ✅ | `normalize_event.js` |
| Událost nerozhoduje sama | ✅ | `phase_decide` + shadow odděleně od `phase_execute` |
| Typy: oznámení, požadavek, AI výstup… | 🟡 | mapováno na `eventType`; ne všechny labely explicitní |

---

## §3 Základní pravidlo

| Bod | Stav | Poznámka |
|-----|------|----------|
| Změna = důsledek události | ✅ | stream reakce přes ingest |
| Přímé změny bez události zakázány | 🟡 | overlay refresh timery = scheduler výjimka |
| Init procesy výjimka | ✅ | `server.js` bootstrap, OBS connect |

---

## §4 Životní cyklus události

| Fáze | Kód | Stav |
|------|-----|------|
| Vznik | `created` | ✅ enum |
| Fronta | `queued` | ✅ enum + ingest enqueue |
| Distribuce | `dispatched` | ✅ enum |
| Zpracování | `processing` | ✅ enum |
| Dokončení | `completed` | ✅ enum |
| Archivace | `archived` | ✅ enum |
| Chyba | `failed` | ✅ enum + `mia-errors` log |

| Bod | Stav | Poznámka |
|-----|------|----------|
| `state` na každé runtime události | 🟡 | enum hotový; ingest objekt nemá vždy `state` pole |

---

## §5 Povinné informace

| Pole | Runtime (normalize) | Canon validace |
|------|---------------------|----------------|
| eventId | ✅ | ✅ |
| eventType | ✅ | ✅ |
| createdAt / isoTime | ✅ | ✅ |
| source / platform | ✅ | ✅ |
| target | 🟡 route jako cíl | ✅ optional |
| priority | 🟡 gift tier odvozeno | ✅ |
| payload | 🟡 rozptýleno v normalized | ✅ |
| state | ❌ | ✅ v canon record |
| schemaVersion | ❌ | ✅ v canon record |

| Bod | Stav | Poznámka |
|-----|------|----------|
| `validateEventRecord()` | ✅ | `eventSchema.js` |
| `fromNormalizedIngestEvent()` | ✅ | bridge z ingestu |
| Všechny ingest eventy projdou validací | 🟡 | best-effort bridge; postupná adopce |

---

## §6 Kategorie událostí

| Kategorie | Příklad v kódu | Stav |
|-----------|----------------|------|
| Uživatelské | COMMENT, chat commands | 🟡 |
| Streamovací | GIFT, LIKE, FOLLOW, SHARE | ✅ `STREAM_EVENT_TYPES` |
| AI | shadow result, TTS plan | 🟡 uvnitř pipeline scratch |
| Grafické | overlay queue, animation | 🟡 delivery runtime |
| Systémové | health, OBS disconnect | 🟡 |
| Časové | runtime loops, watchdog | 🟡 `EVENT_QUEUE.SCHEDULER` |

---

## §7 Priorita

| Úroveň | Stav | Důkaz |
|--------|------|-------|
| critical → background | ✅ | `EVENT_PRIORITY` |
| Gift tier → priorita | ✅ | `resolveGiftEventPriority` |
| Voice / video fronta podle priority | ✅ | `MIA_VOICE_PRIORITY`, gift map priority |

---

## §8 Fronty událostí

| Canon fronta | Runtime | Stav |
|--------------|---------|------|
| Stream | `MIA_INGEST_QUEUE` lanes | ✅ |
| AI | shadow v pipeline | 🟡 |
| Graphics | overlay + voice queue | ✅ |
| Database | JSON persistence | 🟡 |
| Scheduler | runtime loops | 🟡 |
| Network | platform bridges | ✅ |

| Bod | Stav | Poznámka |
|-----|------|----------|
| Přetížená fronta neblokuje ostatní | ✅ | support serial / community parallel / audience direct |

---

## §9 Směr toku

| Bod | Stav | Důkaz |
|-----|------|-------|
| Zdroj → Bus → Příjemce | ✅ | `CANON_EVENT_FLOW` (9 kroků) |
| TikTok → … → OBS dohledatelné | 🟡 | `logs/ingest-*.jsonl`; ne unified trace UI |
| `describeEventFlow()` | ✅ | `eventBus.js` |

---

## §10 Event Bus

| Odpovědnost | Stav | Modul |
|-------------|------|-------|
| Přijmout + validovat | 🟡 | ingest guard + normalize |
| Fronty | ✅ | `MIA_INGEST_QUEUE` |
| Distribuce | ✅ | pipeline fáze |
| Bez business logiky | 🟡 | queue čistá ✅; pipeline fáze obsahují logiku |

---

## §11 Pravidla zpracování

| Pravidlo | Stav | Poznámka |
|----------|------|----------|
| Modul zpracuje jen své události | ✅ | command registry, route lanes |
| Neměnit přijatou událost | 🟡 | `EventContext` kopie; scratch separátní |
| Výstup = nová událost | 🟡 | actionResult chain; ne vždy nový eventId |

---

## §12 Audit

| Požadavek | Stav | Důkaz |
|-----------|------|-------|
| Kdy vznikla | ✅ | `isoTime`, ingest logs |
| Kdo vytvořil | 🟡 | `user` v normalized |
| Který modul zpracoval | 🟡 | pipeline summary částečně |
| Délka zpracování | 🟡 | perf contract; ne per-event vždy |
| Výsledek / chyba | 🟡 | `mia-errors`, ingest log |
| Neměnné záznamy | 🟡 | append-only jsonl; bez hash chain |

---

## §13 Budoucí rozšíření

| Rozšíření | Stav |
|-----------|------|
| Podpis, crypto, distributed, cloud sync | ❌ dokumentováno jako budoucí |
| Kompatibilita | ✅ `schemaVersion` v canon schématu |

---

## §14 Kontrolní seznam

| Otázka | Stav |
|--------|------|
| ☐ Každá změna jako událost? | 🟡 stream ano; některé timery ne |
| ☐ Povinná metadata? | 🟡 ingest částečně; canon plně |
| ☐ Centrální Event Bus? | 🟡 ingest queue + pipeline (= bus) |
| ☐ Oddělené fronty? | ✅ |
| ☐ Logování důležitých událostí? | ✅ ingest jsonl |
| ☐ Dohledatelný tok? | 🟡 eventId + traceId; full trace 🟡 |

---

## §15 Poznámka architekta

| Bod | Stav | Poznámka |
|-----|------|----------|
| Komunikace přes bus, ne přímé volání | 🟡 ingest ano; interní HOST volání pro wiring |
| Nahraditelnost modulů | ✅ HOST/CTX refactor, routes |

---

## Shrnutí 0003

| Sekce | ✅ | 🟡 | ❌ |
|-------|----|----|-----|
| §1–§3 Principy | 5 | 2 | 0 |
| §4–§5 Lifecycle + pole | 10 | 5 | 0 |
| §6–§8 Kategorie + fronty | 6 | 8 | 0 |
| §9–§12 Tok + bus + audit | 5 | 11 | 0 |
| §13–§15 Rozšíření + architektura | 2 | 4 | 1 |

**Celkově:** MIA je **reálně event-driven** v stream toku (TikFinity → ingest → pipeline → OBS). Canon vrstva `mia-event-core` sjednocuje terminologii. Chybí plná **state/schemaVersion** na každém ingest záznamu a jednotný **audit trace** end-to-end.

---

## Vazba na 0002

Události **ovlivňují entity** (§8 dokumentu 0002) — např. GIFT event → Koj bowl, MIA overlay, video queue. Vztah event→entity zatím implicitní v pipeline, ne v graph store.

---

## Další krok

**Dokument 0004 — Definice komponenty (Component)** — modul, rozhraní, životní cyklus, spolupráce částí MIA.
