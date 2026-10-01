# MIA MASTER CANON — 0034

## Conversation Engine

**Verze:** 1.0  
**Stav dokumentu:** ACTIVE  
**Stav implementace:** UNKNOWN — ověřit auditem kódu  
**Priorita:** KRITICKÁ

## 1. Účel

Řídit chat, kontext, volbu mluvčího a tvorbu odpovědi pro TikTok i Kick.

## 2. Hranice odpovědnosti

Tato část smí vykonávat pouze činnosti popsané tímto dokumentem. Nesmí přebírat odpovědnost jiného enginu, obcházet Event Bus, Decision Engine, Action Orchestrator ani veřejná API.

## 3. Povinné invarianty

- MIA mluví v ženském rodě; Kojnožrout v mužském.
- MIA řeší obecné dotazy a pečovatelské reakce; Kojnožrout misku, hlad a výrazné support momenty.
- Chat feed zachovává platformu a jméno autora.

## 4. Povinný technický kontrakt

Každá implementace musí deklarovat:

- stabilní identifikátor a verzi,
- vstupní a výstupní schéma,
- publikované a odebírané události,
- konfiguraci bez kritických hardcoded hodnot,
- timeouty, retry a idempotenci tam, kde jsou potřeba,
- strukturované logování s `CorrelationID`,
- health stav a provozní metriky,
- bezpečný start, stop a recovery,
- testy a auditní důkaz implementace.

## 5. Stavy

Minimální stavový model:

`CREATED → INITIALIZED → READY → RUNNING → DEGRADED/PAUSED → STOPPING → STOPPED`

Při neobnovitelné chybě přechází komponenta do `FAILED`.

## 6. Události

Doporučené systémové události:

- `CONVERSATION_ENGINE_INITIALIZED`
- `CONVERSATION_ENGINE_STARTED`
- `CONVERSATION_ENGINE_UPDATED`
- `CONVERSATION_ENGINE_FAILED`
- `CONVERSATION_ENGINE_STOPPED`

Konkrétní payloady musí být registrovány v Event Registry.

## 7. Konfigurace

Konfigurace musí být verzovaná, validovaná a oddělená od zdrojového kódu. Produkční tajemství nesmí být uloženo v repozitáři.

## 8. Chyby a recovery

Chyba musí obsahovat `ErrorID`, komponentu, závažnost, čas, `CorrelationID`, popis, příčinu a doporučený recovery krok. Selhání jedné nekritické části nesmí zastavit celou MIA.

## 9. Monitoring

Minimálně sledovat:

- health stav,
- počet vstupů a výstupů,
- latenci,
- chybovost,
- retry a timeouty,
- využití front a systémových zdrojů.

## 10. Audit v Cursoru

- [ ] Najít skutečné soubory a třídy odpovídající dokumentu.
- [ ] Označit stav `OK / CHYBÍ / ČÁSTEČNĚ / KONFLIKT`.
- [ ] Vypsat přímé a kruhové závislosti.
- [ ] Ověřit konfiguraci a hardcoded hodnoty.
- [ ] Ověřit event kontrakty.
- [ ] Ověřit testy, logy a recovery.
- [ ] Přidat odkazy na důkazní soubory do `IMPLEMENTATION_MATRIX.csv`.

## 11. Definice hotovo

Dokument je implementačně splněn pouze tehdy, když existuje funkční kód, test, konfigurace, monitoring a dohledatelný důkaz v implementační matici.

---

**Konec dokumentu 0034**
