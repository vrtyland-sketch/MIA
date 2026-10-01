# Master Canon 0053 — soulad s projektem

Audit [`0053-service-manager.md`](./0053-service-manager.md) vůči stavu `C:\MIA` k 2026-07-16.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-service-core/serviceManager.js`

---

## §1–§8 Registry a lifecycle

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Service Manager | ✅ | `singleton` |
| Service Registry + descriptor | ✅ | `register`, `createServiceDescriptor` |
| Kategorie | ✅ | `SVM_CATEGORY` |
| Lifecycle FSM | ✅ | `SVM_STATE`, `transitionServiceState` |
| Povinné rozhraní | ✅ | `SVM_REQUIRED_METHODS` |

---

## §9–§18 Provoz

| Oblast | Stav |
|--------|------|
| Priority / AutoStart | ✅ |
| Restart Policy | ✅ `evaluateRestartPolicy` |
| Health Check | ✅ `SVM_HEALTH`, `health()` |
| Komunikace jen přes gate | ✅ `assertCommunicationAllowed` |
| Izolace nekritických pádů | ✅ `fail().isolatesOthers` |
| Audit log | ✅ `auditTrail` immutable |
| Plugin registrace | ✅ `registerPluginService` |
| Kernel ochrana | ✅ `SVM_KERNEL_PROTECTED` |
| Live wiring do index.js | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0052](./0052-startup-sequence-manager.md) | Startup Sequence Manager |
| **0053** Service Manager | 🟢 kanon + kotva + contract |
| **0054** Dependency Manager | 🟢 kanon + kotva + contract |
| **0055** (plánováno) | Runtime Health & Watchdog |
