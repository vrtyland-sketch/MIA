# Master Canon 0052 — soulad s projektem

Audit [`0052-startup-sequence-manager.md`](./0052-startup-sequence-manager.md) vůči stavu `C:\MIA` k 2026-07-16.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-startup-core/startupSequenceManager.js`

---

## §1–§4 Účel a vrstvy

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný SSM | ✅ | `singleton` flag |
| Layers 0–7 | ✅ | `SSM_LAYER`, `SSM_LAYER_SERVICES` |
| Po Boot Manageru | ✅ | `bootCompleted` gate |
| Bez doménových rozhodnutí | ✅ | `SSM_FORBIDDEN_ACTIVITIES` |

---

## §5–§14 Orchestrace

| Oblast | Stav | Implementace |
|--------|------|--------------|
| Dependency Graph | ✅ | `buildStartupDependencyGraph` |
| Startup Queue | ✅ | `buildStartupQueue` |
| Paralelní skupiny | ✅ | `parallelGroups` |
| Service FSM | ✅ | `SSM_SERVICE_STATE` |
| Sync barriers | ✅ | `synchronizeLayer` |
| Timeouts | ✅ | `SSM_DEFAULT_TIMEOUTS_MS` |
| Retry | ✅ | `retryService` |
| Report + Metrics | ✅ | `generateStartupReport`, `collectStartupMetrics` |
| Priority | ✅ | `SSM_PRIORITY` |

---

## §15–§20 Integrace

| Oblast | Stav |
|--------|------|
| Plugin hook po Kernel | ✅ `runPluginHook` |
| OBS order + degraded | ✅ contract |
| Platforms až po READY | ✅ Layer 6 deferred |
| Live bootstrap wiring | 🟡 plánováno |

---

| Dokument | Stav |
|----------|------|
| [0051](./0051-boot-manager.md) | Boot Manager |
| **0052** Startup Sequence Manager | 🟢 kanon + kotva + contract |
| **0053** Service Manager | 🟢 kanon + kotva + contract |
| **0054** (plánováno) | Runtime Health & Watchdog |
