# MIA MASTER CANON — Dokument 0049

**Název:** Plugin & Module Engine – Univerzální systém modulů MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Absolutně kritická (Module Core)

**Nadřazené dokumenty:**

- [0048 – Creature Evolution Engine](./0048-creature-evolution-engine.md)
- [0010 – Event Bus](./0010-event-bus.md)
- [0009 – Lifecycle Manager](./0009-lifecycle-manager.md)

---

## 1. Účel

Umožnit bezpečné instalování, aktualizaci a odpojování modulů bez přepisování jádra MIA.

---

## 2. Hranice odpovědnosti

Plugin & Module Engine smí vykonávat pouze správu modulů. Nesmí přebírat odpovědnost jiného enginu ani obcházet Event Bus, Decision Engine, Action Orchestrator ani veřejná API.

---

## 3. Povinné invarianty

- Každý modul deklaruje manifest, verzi, API, události, závislosti a oprávnění.
- Moduly komunikují přes Event Bus a veřejná API.
- Neověřený modul se nesmí spustit v produkci.
- Hot reload nesmí narušit aktivní Battle, ekonomickou transakci ani OBS akci.

---

## 4. Povinný technický kontrakt

Stabilní identifikátor a verze, vstupní/výstupní schéma, publikované a odebírané události, konfigurace bez kritických hardcoded hodnot, timeouty/retry/idempotence, strukturované logování s `CorrelationID`, health stav, bezpečný start/stop/recovery, testy a auditní důkaz.

---

## 5. Stavy

```text
CREATED → INITIALIZED → READY → RUNNING → DEGRADED/PAUSED → STOPPING → STOPPED
```

Při neobnovitelné chybě přechází komponenta do `FAILED`.

---

## 6. Události

- `PLUGIN_AND_MODULE_ENGINE_INITIALIZED`
- `PLUGIN_AND_MODULE_ENGINE_STARTED`
- `PLUGIN_AND_MODULE_ENGINE_UPDATED`
- `PLUGIN_AND_MODULE_ENGINE_FAILED`
- `PLUGIN_AND_MODULE_ENGINE_STOPPED`

Payloady musí být registrovány v Event Registry.

---

## 7. Konfigurace

Konfigurace musí být verzovaná, validovaná a oddělená od zdrojového kódu. Produkční tajemství nesmí být uloženo v repozitáři.

---

## 8. Chyby a recovery

Chyba obsahuje `ErrorID`, komponentu, závažnost, čas, `CorrelationID`, popis, příčinu a doporučený recovery krok. Selhání jedné nekritické části nesmí zastavit celou MIA.

---

## 9. Monitoring

Health stav, počet vstupů/výstupů, latence, chybovost, retry, timeouty, využití front a systémových zdrojů.

---

## 10. Audit v Cursoru

Kontrolní seznam implementace — skutečné soubory, závislosti, konfigurace, event kontrakty, testy, logy a recovery.

---

## 11. Definice hotovo

Dokument je splněn pouze tehdy, když existuje funkční kód, test, konfigurace, monitoring a dohledatelný důkaz v alignment mapě.

---

## Konec dokumentu 0049

**Architektonická poznámka:** Dokument **0050** bude věnován **MIA Core Kernel** (návrh).
