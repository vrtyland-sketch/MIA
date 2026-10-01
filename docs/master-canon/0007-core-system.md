# MIA MASTER CANON — Dokument 0007

**Název:** Core System – Jádro platformy MIA  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Nejvyšší

**Navazuje na:** [Dokument 0006 — Architektura platformy MIA](./0006-platform-architecture.md)

---

## 1. Účel dokumentu

Core System je **nejdůležitější část** celé platformy MIA.

Je to infrastruktura, na které běží všechny ostatní systémy. Core **neobsahuje** herní logiku, AI, grafiku ani streamovací funkce. Jeho jediným úkolem je zajistit **stabilní, bezpečný a předvídatelný provoz** celé platformy.

Pokud je Core nestabilní, není stabilní ani žádná jiná část systému.

---

## 2. Definice Core Systemu

Core System je **nejnižší softwarová vrstva** platformy MIA.

Poskytuje ostatním systémům základní služby, které jsou nezbytné pro jejich fungování.

Core System **nesmí obsahovat obchodní logiku (Business Logic)**.

Například Core neví, co je Kojnožrout, Gift, TikTok ani AI konverzace. Pouze poskytuje prostředí, ve kterém mohou tyto systémy bezpečně fungovat.

---

## 3. Hlavní odpovědnosti

Core System odpovídá za:

- spuštění platformy,
- inicializaci systémů,
- správu životního cyklu,
- správu událostí,
- správu konfigurace,
- správu závislostí,
- správu chyb,
- koordinaci vypnutí.

**Nic víc.**

---

## 4. Architektura Core Systemu

```
CORE SYSTEM
├── Runtime Manager
├── Lifecycle Manager
├── Event Bus
├── Scheduler
├── Configuration Manager
├── Dependency Manager
├── Health Manager
├── Error Manager
├── Logging Manager
├── Metrics Manager
├── Plugin Loader
└── Shutdown Manager
```

Kanonický registr: `shared/mia-core-canon/coreManagers.js`

---

## 5. Runtime Manager

Runtime Manager je **první aktivní část** systému.

Úkoly: spustit platformu, připravit prostředí, načíst konfiguraci, inicializovat Core, zahájit hlavní smyčku.

Runtime **nikdy nesmí** obsahovat logiku AI ani herní pravidla.

Runtime kotva: `server.js` → `index.js` (`startMiaServer`).

---

## 6. Lifecycle Manager

Řídí životní cyklus všech systémů.

Stavy: `Created` → `Initialized` → `Starting` → `Running` → `Paused` → `Stopping` → `Stopped` → `Archived`

Přechody musí být řízeny výhradně Lifecycle Managerem.

Enum: `CORE_LIFECYCLE` v `shared/mia-core-canon/coreLifecycle.js`

---

## 7. Event Bus

Centrální dopravní síť. Každá událost musí projít Event Busem (viz [0003](./0003-event-definition.md)).

Event Bus **nesmí**: měnit obsah událostí, rozhodovat o logice, ukládat obchodní data.

Kotva: `scripts/MIA_INGEST_QUEUE.js`

---

## 8. Scheduler

Spravuje čas: časovače, plánované úkoly, periodické a odložené úlohy.

Scheduler **nesmí** obsahovat vlastní rozhodovací logiku.

Kotva: `scripts/MIA_RUNTIME_LOOPS.js`, `scripts/MIA_OBS_WATCHDOG.js`

---

## 9. Configuration Manager

Spravuje konfiguraci ze souborů, ENV, admin rozhraní.

Každá změna konfigurace musí být **auditována**.

Kotva: `scripts/MIA_CONFIG.js`, `scripts/MIA_ENV.js`, `shared/stream_economy_config.json`

---

## 10. Dependency Manager

Pořadí spouštění, kruhové závislosti, dostupnost modulů.

Kotva: `scripts/MIA_*_HOST.js` wiring, `shared/mia-component-core/componentDependencies.js`

---

## 11. Health Manager

Kontrola stavu: dostupnost modulů, paměť, CPU, odezva, fronty, chyby.

Kotva: `scripts/mia_health.js`, `routes/health`, `/health`

---

## 12. Error Manager

Každá chyba: ErrorID, čas, komponenta, závažnost, popis, stack, doporučení.

Chyby se **nikdy nesmí ztratit**.

Kotva: `writeLog("mia-errors", …)`, ingest queue error chain

---

## 13. Logging Manager

Log: čas, úroveň, zdroj, zpráva, Correlation ID, metadata.

Úrovně: Trace, Debug, Info, Warning, Error, Critical.

Kotva: `writeLog`, `logs/ingest-*.jsonl`, `scripts/MIA_LOG_ROTATION.js`

---

## 14. Metrics Manager

Provozní statistiky — měření, ne rozhodování.

Kotva: `scripts/MIA_RUNTIME_PERF.js`, `scripts/MIA_PIPELINE_SUMMARY_*`, `tests/runtime_perf_contract.js`

---

## 15. Plugin Loader

Načítání rozšiřujících modulů: identita, verze, závislosti, bezpečnost, veřejná API.

Plugin **nesmí** měnit interní části Core.

Kotva: `routes/registerAllRoutes()`, modulární `routes/` 🟡

---

## 16. Shutdown Manager

Korektní ukončení: zastavit příjem → dokončit úlohy → uložit data → odpojit služby → ukončit Runtime.

Kotva: `scripts/mia_stop.js`, `scripts/mia_restart.js`

---

## 17. Architektonické zásady Core

Core musí být: co nejmenší, maximálně stabilní, nezávislé na konkrétní aplikaci, snadno testovatelné, přenositelné, dlouhodobě kompatibilní.

---

## 18. Zakázané závislosti

Core **nikdy nesmí záviset** na: AI System, Game System, Graphics System, Stream System, Economy System.

Závislost smí existovat pouze **opačným směrem**.

Kontrola: `assertCoreForbiddenDependencies()` v `shared/mia-core-canon/coreManagers.js`

---

## 19. Kontrolní seznam implementace

- [ ] Obsahuje Core pouze infrastrukturní logiku?
- [ ] Neobsahuje obchodní ani herní pravidla?
- [ ] Existuje Runtime Manager?
- [ ] Je řízen životní cyklus modulů?
- [ ] Jsou chyby centralizovaně zpracovány?
- [ ] Existuje jednotné logování?
- [ ] Jsou měřeny metriky?
- [ ] Probíhá řízené vypínání?
- [ ] Nezávisí Core na ostatních systémech?

Automatická kontrola: `tests/mia_master_canon_0007_contract.js` · [`0007-alignment.md`](./0007-alignment.md)

---

## 20. Poznámka architekta

Core System je **„operační systém“** platformy MIA. Stejně jako OS neřeší obsah her, Core neřeší dary, AI konverzace ani animace. Vytváří spolehlivé prostředí pro všechny ostatní systémy.

---

**Konec dokumentu 0007**

**Další krok:** Dokument **0008** — [Runtime Manager](./0008-runtime-manager.md). Dokument **0009** — Lifecycle Manager.
