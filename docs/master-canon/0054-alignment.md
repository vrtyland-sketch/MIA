# Master Canon 0054 — soulad s projektem

Audit [`0054-dependency-manager.md`](./0054-dependency-manager.md) vůči stavu `C:\MIA` k 2026-07-16.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-dependency-core/dependencyManager.js`

---

## §1–§9 Graph a pořadí

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Dependency Manager | ✅ | `singleton` |
| Typy hard/soft/optional | ✅ | `DM_DEP_TYPE` |
| Dependency Descriptor | ✅ | `createDependencyDescriptor` |
| DAG + cyklus stop | ✅ | `detectCycles`, `validateGraph` |
| Topologické pořadí | ✅ | `computeInitOrder` |

---

## §10–§17 Provoz

| Oblast | Stav |
|--------|------|
| Validace startu | ✅ `validateForStartup` |
| Dynamické změny | ✅ `addModule` / `removeModule` |
| Konflikty → Recovery | ✅ `detectConflicts`, `handOffToRecovery` |
| Plugin pipeline | ✅ `registerPlugin` 5 kroků |
| Platform disconnect | ✅ `disconnectPlatform` izolace |
| Hry bez úprav Kernelu | ✅ `registerGame` |
| Metrics | ✅ `metrics()` |
| Bypass validation zakázán | ✅ `assertValidationRequired` |
| Live wiring do index.js | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0053](./0053-service-manager.md) | Service Manager |
| **0054** Dependency Manager | 🟢 kanon + kotva + contract |
| [0055](./0055-configuration-manager.md) | Configuration Manager |
| **0056** (plánováno) | Runtime Health & Watchdog |
