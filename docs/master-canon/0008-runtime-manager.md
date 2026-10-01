# MIA MASTER CANON — Dokument 0008

**Název:** Runtime Manager – Správce běhu platformy  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Kritická

**Nadřazený dokument:** [0007 – Core System](./0007-core-system.md)

---

## 1. Účel dokumentu

Tento dokument definuje **Runtime Manager** — první aktivní část platformy MIA.

Runtime Manager je zodpovědný za spuštění, udržování a řízené ukončení běhu celé platformy. Je to první software, který začne pracovat po spuštění procesu MIA, a poslední, který se ukončí při vypnutí.

**Bez Runtime Manageru platforma neexistuje.**

---

## 2. Definice Runtime Manageru

Runtime Manager je **centrální orchestrátor životního cyklu platformy**.

Hlavní úkoly:

- připravit prostředí,
- spustit systémy ve správném pořadí,
- dohlížet na jejich stav,
- zajistit bezpečný provoz,
- koordinovat ukončení.

Runtime Manager **neobsahuje** obchodní logiku ani logiku jednotlivých modulů.

---

## 3. Odpovědnosti

Runtime Manager odpovídá za:

- vytvoření Runtime Contextu,
- inicializaci Core Systemu,
- načtení konfigurace,
- kontrolu prostředí,
- spuštění modulů,
- registraci služeb,
- spuštění hlavní smyčky,
- dohled nad během,
- řízené vypnutí.

Jakákoli jiná odpovědnost musí být řešena jinou komponentou.

---

## 4. Runtime Context

Po spuštění vytvoří Runtime Manager objekt **Runtime Context**.

Obsahuje sdílené informace pro běh platformy:

| Pole | Popis |
|------|-------|
| Runtime ID | Jedinečný identifikátor běhu |
| Verze platformy | Semver MIA |
| Čas spuštění | UTC timestamp |
| Aktivní konfigurace | Načtená runtime config |
| Seznam spuštěných systémů | Registry aktivních systémů |
| Stav platformy | Stavový automat Runtime |
| Session ID | Identifikátor relace |

Runtime Context je dostupný pouze prostřednictvím **veřejného rozhraní**.

Kanonický model: `createRuntimeContextRecord()` v `shared/mia-core-canon/runtimeManager.js`

Částečná implementace: `serverStartedAt`, stream session v `index.js`

---

## 5. Fáze spuštění

Runtime Manager musí postupovat v přesně definovaných krocích (`RUNTIME_PHASE`):

| Fáze | Název | Obsah |
|------|-------|-------|
| 1 | Start procesu | proces, Runtime Context, logování |
| 2 | Kontrola prostředí | Node.js, paměť, oprávnění, soubory, čas, síť |
| 3 | Načtení konfigurace | systém, moduly, ENV, bezpečnost — s validací |
| 4 | Inicializace Core | Event Bus, Scheduler, Logging, Error, Metrics, Health |
| 5 | Registrace systémů | jméno, verze, závislosti, služby, události |
| 6 | Aktivace | přechod do `RUNNING` |

Kritická kontrola prostředí při selhání **zastaví** bootstrap.

`describeRuntimeBootstrapPhases()` — mapa fází → runtime kotvy.

---

## 6. Stavový automat Runtime

```
CREATED → INITIALIZING → LOADING_CONFIGURATION → STARTING_CORE
  → STARTING_SYSTEMS → RUNNING ⇄ PAUSING/PAUSED/RESUMING → STOPPING → STOPPED
```

**Přeskakování stavů není dovoleno.** Validace: `canTransitionRuntimeState(from, to)`.

Enum: `RUNTIME_STATE` v `shared/mia-core-canon/runtimeManager.js`

---

## 7. Hlavní smyčka

Po spuštění běží Runtime Manager v hlavní řídicí smyčce.

Každý cyklus provádí například:

- kontrolu stavu systémů,
- kontrolu plánovaných úloh,
- kontrolu kritických chyb,
- aktualizaci metrik,
- kontrolu požadavků na vypnutí.

Runtime Manager **nesmí** obsahovat časově náročné výpočty.

Kotva: `scripts/MIA_RUNTIME_LOOPS.js` (periodické úlohy — doménová logika v delegátech)

---

## 8. Registr systémů

Runtime udržuje seznam aktivních systémů.

Každý záznam: SystemID, Název, Verze, Stav, Čas spuštění, Health, Poslední aktivita, Počet chyb.

Model: `createSystemRegistryRecord()` · referenční seznam: `platformSystems.js`

Využití: administrace, monitoring, `/health`

---

## 9. Restart systému

Runtime umožňuje restart jednotlivých systémů bez ukončení celé platformy.

Podmínky:

- systém nesmí být kritickou součástí Core,
- musí být splněny závislosti,
- restart musí být zaznamenán.

Kotva: `scripts/mia_restart.js`, `scripts/MIA_SELF_RESTART.js` 🟡

---

## 10. Watchdog

Sleduje zamrznutí modulů, neaktivitu, kritické chyby; navrhuje restart.

Watchdog **nesmí** provádět automatické zásahy bez definovaných pravidel.

Kotva: `scripts/MIA_OBS_WATCHDOG.js` (OBS proces) · obecný module watchdog 🟡

---

## 11. Bezpečnostní režimy

| Režim | Charakteristika |
|-------|-----------------|
| **Development** | podrobné logy, simulace, testovací nástroje |
| **Testing** | automatické testy, kontrola výkonu |
| **Production** | maximální stabilita, omezené logy |
| **Safe Mode** | pouze nezbytné části platformy |

Enum: `RUNTIME_MODE` · resolver: `resolveRuntimeMode()` (ENV: `MIA_RUNTIME_MODE`, `NODE_ENV`)

---

## 12. Kritické chyby

Za kritickou chybu se považuje například:

- poškození Runtime Contextu,
- nefunkční Event Bus,
- nefunkční Logging,
- ztráta konfigurace,
- nekonzistentní stav Core.

Při kritické chybě: řízené ukončení nebo Safe Mode.

Kotva: graceful shutdown v `MIA_SERVER_BOOTSTRAP.js` · centralizovaný critical handler 🟡

---

## 13. Výkonnostní požadavky

Runtime Manager musí být navržen s **minimální režií** — koordinace, ne náročné zpracování dat.

Kotva: `scripts/MIA_RUNTIME_PERF.js`

---

## 14. Zakázané činnosti

Runtime Manager nesmí:

- komunikovat přímo s TikTokem,
- generovat odpovědi AI,
- vykreslovat grafiku,
- měnit herní logiku,
- ukládat obchodní data.

Enum: `RUNTIME_FORBIDDEN_ACTIVITIES` · kontrola: `assertRuntimeForbiddenActivity()`

---

## 15. Kontrolní seznam implementace

- [ ] Existuje Runtime Context?
- [ ] Probíhá spuštění ve správných fázích?
- [ ] Jsou validovány konfigurace?
- [ ] Je veden registr aktivních systémů?
- [ ] Existuje Watchdog?
- [ ] Lze restartovat jednotlivé systémy?
- [ ] Je implementován stavový automat Runtime?
- [ ] Je podporováno řízené vypnutí?

Automatická kontrola: `tests/mia_master_canon_0008_contract.js` · [`0008-alignment.md`](./0008-alignment.md)

---

## 16. Poznámka architekta

Runtime Manager je **dirigent** celé platformy. Sám „nehraje hudbu“ — nepočítá ekonomiku, negeneruje AI odpovědi ani nevykresluje animace. Zajišťuje, aby všechny části začaly hrát ve správný okamžik a při problému se korektně zastavily.

---

**Konec dokumentu 0008**

**Další krok:** Dokument **0009** — [Lifecycle Manager](./0009-lifecycle-manager.md). Dokument **0010** — Event Bus.
