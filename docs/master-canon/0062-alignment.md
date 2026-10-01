# Master Canon 0062 — soulad s projektem

Audit [`0062-runtime-manager.md`](./0062-runtime-manager.md) vůči stavu `C:\MIA` k 2026-07-17.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-runtime-core/runtimeManager.js`

---

## §1–§10 Context, registry a lifecycle

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Runtime Manager | ✅ | process-wide singleton guard |
| Context až po Boot | ✅ | `createRuntimeManager({ bootCompleted })` |
| Read-only Runtime Context | ✅ | frozen `runtime()` |
| Registry aktivních komponent | ✅ | `registerComponent` / `unregisterComponent` |
| Lifecycle + veřejné API | ✅ | `RM_STATE`, `RM_PUBLIC_API` |
| Runtime Session do shutdown | ✅ | `session()` |

---

## §11–§17 Provoz

| Oblast | Stav |
|--------|------|
| Bezpečný config update / reload | ✅ `applyConfiguration` |
| Moduly a platformy v registry | ✅ |
| Izolace odpojení platformy | ✅ `disconnectPlatform` |
| Diagnostický snapshot | ✅ `snapshot` |
| Monitoring | ✅ `metrics` |
| Immutable audit | ✅ `auditTrail` |
| Recovery integrace | ✅ `recover` |
| Live wiring do `index.js` / `server.js` | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0061](./0061-state-manager.md) | State Manager |
| **0062** Runtime Manager | 🟢 kanon + kotva + contract |
| **0063** Lifecycle Manager | 🟢 kanon + kotva + contract |
| **0064** (plánováno) | Runtime Health & Watchdog |
