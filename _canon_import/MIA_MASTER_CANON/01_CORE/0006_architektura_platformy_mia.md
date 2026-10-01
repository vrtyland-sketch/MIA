# MIA MASTER CANON — 0006

## Architektura platformy MIA

**Verze:** 1.0  
**Stav dokumentu:** ACTIVE  
**Stav implementace:** UNKNOWN — ověřit auditem kódu  
**Priorita:** ABSOLUTNĚ KRITICKÁ

## 1. Účel

Definovat mapu systémů celé platformy a hranice jejich odpovědností.

## 2. Hranice odpovědnosti

Tato část smí vykonávat pouze činnosti popsané tímto dokumentem. Nesmí přebírat odpovědnost jiného enginu, obcházet Event Bus, Decision Engine, Action Orchestrator ani veřejná API.

## 3. Povinné invarianty

- Tok: RAW EVENT → NORMALIZER → DECISION → ACTION → OVERLAY/VIDEO/OBS.
- Jádro nesmí obsahovat obchodní, herní ani grafickou logiku.
- Každá externí platforma je připojena adaptérem.

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

- `ARCHITEKTURA_PLATFORMY_MIA_INITIALIZED`
- `ARCHITEKTURA_PLATFORMY_MIA_STARTED`
- `ARCHITEKTURA_PLATFORMY_MIA_UPDATED`
- `ARCHITEKTURA_PLATFORMY_MIA_FAILED`
- `ARCHITEKTURA_PLATFORMY_MIA_STOPPED`

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

**Konec dokumentu 0006**
