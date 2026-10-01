# Master Canon 0007 — soulad s projektem

Audit [`0007-core-system.md`](./0007-core-system.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-core-canon/coreManagers.js`

---

## §1–§3 Účel a odpovědnosti

| Bod | Stav | Důkaz |
|-----|------|-------|
| Core = infrastruktura bez business logiky | 🟡 | ingest queue čistý; `index.js` orchestruje vše |
| Spuštění, lifecycle, události, config, chyby, shutdown | ✅ | registry 12 managerů |
| Nestabilita Core = nestabilita celé platformy | ✅ | preflight + health endpoint |

---

## §4 Architektura — 12 managerů

| Manager | § | Stav | Runtime kotva |
|---------|---|------|---------------|
| **Runtime Manager** | 5 | ✅ | `server.js`, `index.js` |
| **Lifecycle Manager** | 6 | 🟡 | entity lifecycle enum; stream session částečně |
| **Event Bus** | 7 | ✅ | `scripts/MIA_INGEST_QUEUE.js` |
| **Scheduler** | 8 | ✅ | `MIA_RUNTIME_LOOPS.js`, `MIA_OBS_WATCHDOG.js` |
| **Configuration Manager** | 9 | ✅ | `MIA_CONFIG.js`, `MIA_ENV.js` |
| **Dependency Manager** | 10 | 🟡 | HOST wiring; acyklický test v component-core |
| **Health Manager** | 11 | ✅ | `mia_health.js`, `/health` |
| **Error Manager** | 12 | 🟡 | `writeLog("mia-errors")`; ne jednotný ErrorID |
| **Logging Manager** | 13 | ✅ | `writeLog`, jsonl, `MIA_LOG_ROTATION.js` |
| **Metrics Manager** | 14 | 🟡 | `MIA_RUNTIME_PERF.js`; ne centralizovaný dashboard |
| **Plugin Loader** | 15 | 🟡 | `routes/` modulární; bez security gate |
| **Shutdown Manager** | 16 | ✅ | `mia_stop.js`, `mia_restart.js` |

**Souhrn:** 6× ✅ · 6× 🟡 · 0× ❌

---

## §5 Runtime Manager

| Požadavek | Stav | Poznámka |
|-----------|------|----------|
| První aktivní část | ✅ | `startMiaServer` v index.js |
| Načtení config před moduly | ✅ | MIA_CONFIG při bootstrapu |
| Bez AI/herní logiky v runtime vrstvě | 🟡 | orchestrátor volá vše; logika v HOST modulech |

---

## §6 Lifecycle Manager

| Požadavek | Stav | Poznámka |
|-----------|------|----------|
| 8 stavů Created→Archived | ✅ | `CORE_LIFECYCLE` enum |
| Centralizované přechody | 🟡 | entity lifecycle ano; moduly ad-hoc |
| Záznam přechodů | 🟡 | částečně v logách |

---

## §7 Event Bus

| Požadavek | Stav | Poznámka |
|-----------|------|----------|
| Každá událost přes bus | 🟡 | ingest ano; interní přímá volání existují |
| Bez změny payloadu | ✅ | queue forward |
| Bez business logiky | ✅ | rozhodnutí v pipeline fázích |

---

## §8–§16 Ostatní manažeři

| Oblast | Stav | Mezera |
|--------|------|--------|
| Scheduler bez rozhodování | ✅ | watchdog + loops |
| Config audit | 🟡 | změny ENV bez audit trail |
| Dependency acykličnost | 🟡 | test v component-core; ne runtime enforcement |
| Health metriky | ✅ | `/health`, OBS snapshot |
| Error struktura (ErrorID, severity) | 🟡 | volný text v logu |
| Log úrovně Trace→Critical | 🟡 | ne všechny úrovně používány |
| Metrics bez rozhodování | ✅ | perf contract |
| Plugin bezpečnost | ❌ | chybí sandbox / deklarace závislostí |
| Shutdown pořadí | 🟡 | stop script; ne plný graceful pipeline |

---

## §17 Architektonické zásady Core

| Zásada | Stav |
|--------|------|
| Malý, stabilní, testovatelný | 🟡 |
| Nezávislý na aplikaci | ✅ shared balíčky |
| Dlouhodobá kompatibilita | 🟡 |

---

## §18 Zakázané závislosti

| Pravidlo | Stav | Poznámka |
|----------|------|----------|
| Core nezávisí na AI/Game/Graphics/Stream/Economy | 🟡 | `index.js` importuje vše pro wiring — orchestrátor, ne Core modul |
| `assertCoreForbiddenDependencies()` | ✅ | registry metadata + test |

**Architektonická poznámka:** Skutečná separace je v `shared/mia-*-core` a ingest queue. Monolitický `index.js` je kompoziční vrstva nad Core — dokument 0008 (Runtime Manager) to rozepíše.

---

## §19 Kontrolní seznam (ruční)

| Položka | Stav |
|---------|------|
| Pouze infrastrukturní logika v Core modulech | 🟡 |
| Bez herních pravidel v Core | ✅ |
| Runtime Manager | ✅ |
| Lifecycle řízení | 🟡 |
| Centralizované chyby | 🟡 |
| Jednotné logování | 🟡 |
| Metriky | 🟡 |
| Řízené vypínání | 🟡 |
| Core nezávislost | 🟡 |

---

## Doporučené další kroky (implementace)

1. **0008** — Runtime Manager: explicitní bootstrap fáze a lifecycle hooky
2. Centralizovaný `ErrorRecord` s ErrorID v `mia-errors`
3. Config change audit log
4. Plugin manifest + dependency deklarace u routes

---

## Vazby

| Dokument | Vztah |
|----------|-------|
| [0006](./0006-platform-architecture.md) | Core jako systém §4 |
| [0003](./0003-event-definition.md) | Event Bus |
| [0004](./0004-component-definition.md) | HOST komponenty nad Core |
| **0008** (plánováno) | Runtime Manager detail |
