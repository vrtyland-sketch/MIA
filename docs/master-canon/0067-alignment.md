# Master Canon 0067 — soulad s projektem

Audit [`0067-fault-manager.md`](./0067-fault-manager.md) vůči stavu `C:\MIA` k 2026-07-18.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-fault-core/faultManager.js`

---

## §1–§12 Evidence, klasifikace a směrování

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Fault Manager | ✅ | `singleton` / `soleFaultAuthority` |
| Nikdy neopravuje sám | ✅ | `repairsDirectly: false` |
| Fault Descriptor (10 polí) | ✅ | `createFaultDescriptor` |
| Kategorie (10) | ✅ | `FM_CATEGORY` |
| Severity INFO→FATAL | ✅ | `FM_SEVERITY` |
| Status lifecycle | ✅ | `FM_STATUS` / `transition` |
| Fault Routing | ✅ | `routeFault` |
| Deduplikace | ✅ | `report` counter |
| CorrelationID | ✅ | `correlate` |
| Časová eskalace | ✅ | `escalate` |

---

## §13–§17 Integrace a bezpečnost

| Oblast | Stav |
|--------|------|
| Health score impact feed | ✅ `toHealthImpact` |
| Recoverable → Recovery only | ✅ `toRecovery` |
| Monitoring metrics | ✅ `metrics` |
| Fault Report + archiv | ✅ |
| Registry immutable / no delete | ✅ |
| Forged fault blocked | ✅ |
| Live wiring Health/Recovery bridges | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0066](./0066-watchdog-engine.md) | Watchdog Engine |
| **0067** Fault Manager | 🟢 kanon + kotva + contract |
| **0068** Safe Mode Manager | 🟢 kanon + kotva + contract |
| **0069** Shutdown Manager | 🟢 kanon + kotva + contract |
| **0070** (plánováno) | Diagnostic Engine |
