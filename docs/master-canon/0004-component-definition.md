# MIA MASTER CANON — Dokument 0004

**Název:** Definice komponenty (Component Definition)  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Kritická

Předchozí: [0003 — Definice události](./0003-event-definition.md)

---

## 1. Účel dokumentu

Tento dokument zavádí pojem **Komponenta (Component)**.

Zatímco dokument **0002** definoval, co je entita, a dokument **0003** vysvětlil, co je událost, tento dokument popisuje, **kdo práci skutečně vykonává**.

Komponenty představují aktivní stavební prvky platformy MIA. Přijímají události, zpracovávají je a vytvářejí nové události nebo mění stav entit.

---

## 2. Definice komponenty

Komponenta je **samostatná softwarová jednotka s jasně vymezenou odpovědností**.

Každá komponenta:

- vykonává konkrétní úlohu,
- má definované vstupy,
- má definované výstupy,
- komunikuje se zbytkem systému přes standardizovaná rozhraní,
- může být spuštěna, zastavena nebo nahrazena bez nutnosti měnit ostatní komponenty.

**Komponenta není totéž co entita.** Entita představuje objekt systému, zatímco komponenta představuje logiku, která s entitami pracuje.

---

## 3. Základní princip

**Jedna komponenta = jedna hlavní odpovědnost.**

Komponenta nesmí řešit více nesouvisejících oblastí. Pokud její odpovědnost narůstá, musí být rozdělena na více menších komponent.

---

## 4. Povinné vlastnosti komponenty

Každá komponenta musí obsahovat:

| Pole | Význam |
|------|--------|
| `componentId` | Jedinečný identifikátor |
| `name` | Název |
| `version` | Verze komponenty |
| `purpose` | Popis účelu |
| `inputs` | Seznam vstupů |
| `outputs` | Seznam výstupů |
| `state` | Stav životního cyklu |
| `dependencies` | Seznam závislostí (`componentId`) |
| `logging` | Vlastní logování (modul / kanál) |
| `configuration` | Konfigurační zdroje |

Bez těchto údajů není komponenta považována za **dokončenou**.

Validace: `validateComponentRecord()` v `shared/mia-component-core/componentSchema.js`.

---

## 5. Životní cyklus komponenty

| Stav | Kód |
|------|-----|
| Navržena | `designed` |
| Implementována | `implemented` |
| Inicializována | `initialized` |
| Aktivní | `running` |
| Pozastavená | `paused` |
| Restartovaná | `restarting` |
| Ukončená | `stopped` |
| Archivovaná | `archived` |

Každý přechod mezi stavy musí být **zaznamenán do logu**.

---

## 6. Komunikační pravidla

Komponenta komunikuje pouze prostřednictvím:

- **Event Bus** (`shared/mia-event-core/`),
- definovaných **API** (`routes/`),
- schválených **systémových rozhraní** (HOST/CTX wiring).

Přímé propojení komponent je povoleno pouze tehdy, pokud je **zdokumentováno v architektuře** a neporušuje modularitu systému.

---

## 7. Typy komponent

| Typ | Kód | Příklady |
|-----|-----|----------|
| Runtime | `runtime` | Event Bus, Scheduler, Runtime Engine, Memory Manager |
| AI | `ai` | Decision Layer, Planner, Conversation Engine |
| Grafické | `graphic` | Render Engine, Animation Engine, Camera Controller |
| Streamovací | `stream` | TikTok/Kick Adapter, OBS Controller, Stream State |
| Datové | `data` | Logger, Cache, Persistence |
| Herní | `game` | Kojnožrout Engine, Inventory, Economy |

Kódy: `COMPONENT_TYPE` v `shared/mia-component-core/componentTypes.js`.

---

## 8. Rozhraní komponent

Každá komponenta musí veřejně definovat:

- co přijímá,
- co vytváří,
- jaké události poslouchá,
- jaké události vytváří,
- jaké chyby může vracet.

Kanonický registr: `CANON_COMPONENT_REGISTRY` v `shared/mia-component-core/componentRegistry.js`.

---

## 9. Konfigurace

Komponenta nesmí mít důležité hodnoty pevně zapsané ve zdrojovém kódu.

Nastavení se načítají z:

- konfiguračních souborů (`shared/stream_economy_config.json`, …),
- runtime dat (`data/*.json`),
- prostředí (`.env` / `MIA_CONFIG.js`),
- administračního rozhraní (`/status`, dashboard).

---

## 10. Chybové stavy

Každá komponenta musí umět rozlišit:

| Stav | Kód |
|------|-----|
| OK | `ok` |
| Warning | `warning` |
| Error | `error` |
| Critical | `critical` |

Při chybě nesmí dojít k nekontrolovanému pádu celé platformy.

---

## 11. Výkonnost

Měřitelné metriky: doba zpracování, CPU, paměť, počet událostí, počet chyb, doba nečinnosti.

Runtime kotva: `tests/runtime_perf_contract.js`, `/health`, pipeline summary.

---

## 12. Testovatelnost

Každá komponenta musí být testovatelná samostatně — contract testy v `tests/*_contract.js`, HOST/CTX izolace.

---

## 13. Závislosti

Komponenta **nesmí vytvářet kruhové závislosti**.

Kontrola: `assertAcyclicDependencies()` v `shared/mia-component-core/componentDependencies.js`.

---

## 14. Budoucí rozšíření

Nové komponenty (platforma, AI model, herní systém) se připojují přes standardní rozhraní bez přepisu jádra.

---

## 15. Kontrolní seznam implementace

- [ ] Jasně definovaná odpovědnost?
- [ ] Jedinečný identifikátor?
- [ ] Zdokumentované vstupy a výstupy?
- [ ] Komunikace přes Event Bus nebo schválené API?
- [ ] Vlastní logování?
- [ ] Konfigurační rozhraní?
- [ ] Samostatná testovatelnost?
- [ ] Bez kruhových závislostí?

Automatická kontrola: `tests/mia_master_canon_0004_contract.js` · [`0004-alignment.md`](./0004-alignment.md).

---

## 16. Poznámka architekta

MIA bude navržena jako platforma složená z **desítek až stovek komponent**. Každá má vymezenou odpovědnost a standardizované rozhraní — dlouhodobé rozšiřování bez přepisu základní architektury.

---

**Konec dokumentu 0004**

**Poznámka k dalším dokumentům:** Od dokumentu **0005** přecházíme k architektuře. Další bude **Modul (Module)** — přesný rozdíl mezi entitou, komponentou, modulem, službou (Service) a enginem (Engine).
