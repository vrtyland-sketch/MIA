# Master Canon 0069 — soulad s projektem

Audit [`0069-shutdown-manager.md`](./0069-shutdown-manager.md) vůči stavu `C:\MIA` k 2026-07-18.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-shutdown-core/shutdownManager.js`

---

## §1–§11 Workflow a pořadí ukončení

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Shutdown Manager | ✅ | `singleton` / `soleShutdownAuthority` |
| Režimy graceful/maintenance/emergency/restart | ✅ | `SDM_MODE` |
| Descriptor 8 polí | ✅ | `createShutdownDescriptor` |
| Workflow 8 fází (žádná přeskočená) | ✅ | `SDM_WORKFLOW` / `shutdown` |
| Validace oprávnění + Recovery gate | ✅ | `validateRequest` |
| ShutdownRequested notifikace | ✅ | `notifyComponents` |
| Stop order: plugins→…→kernel last | ✅ | `SDM_STOP_ORDER` |
| Save state + release resources | ✅ | injected bridges |

---

## §12–§18 Integrace a bezpečnost

| Oblast | Stav |
|--------|------|
| Runtime RUNNING→STOPPING→STOPPED | ✅ |
| Lifecycle ACTIVE→…→DESTROYED | ✅ |
| Recovery dokončit/ukončit před Shutdown | ✅ |
| Emergency minimal save | ✅ |
| Report + archiv | ✅ |
| Parallel shutdown blocked | ✅ |
| Live process.exit / OS exit wiring | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0068](./0068-safe-mode-manager.md) | Safe Mode Manager |
| **0069** Shutdown Manager | 🟢 kanon + kotva + contract |
| **0070** Diagnostics Manager | 🟢 kanon + kotva + contract |
| **0071** (plánováno) | další Kernel Layer 0 služba |
