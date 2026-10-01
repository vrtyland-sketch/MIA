# Master Canon 0063 — soulad s projektem

Audit [`0063-lifecycle-manager.md`](./0063-lifecycle-manager.md) vůči stavu `C:\MIA` k 2026-07-17.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-lifecycle-core/lifecycleManager.js`

---

## §1–§10 Registry, descriptor a přechody

| Bod | Stav | Důkaz |
|-----|------|-------|
| Centrální Lifecycle Manager | ✅ | `singleton` / `soleLifecycleAuthority` |
| Typy service/module/runtime/entity | ✅ | `LCM_OBJECT_TYPE` |
| Výchozí i vlastní FSM | ✅ | `LCM_DEFAULT_TRANSITIONS` |
| LifecycleChanged → Event Bus | ✅ | `transition` |
| Inicializace s validací | ✅ | `initialize` |
| Bez business logiky | ✅ | pouze orchestrace lifecycle |

---

## §11–§18 Provoz

| Oblast | Stav |
|--------|------|
| Pause / resume | ✅ |
| Cleanup před destroy | ✅ `shutdown` / `destroy` |
| Recovery FAILED→READY→ACTIVE | ✅ `recover` |
| Runtime API bridge | ✅ `runtimeTransition` |
| Battle vlastní FSM | ✅ `registerBattle` |
| Kojnožrout vlastní FSM | ✅ `registerKojnozrout` |
| Monitoring + immutable historie | ✅ |
| Live wiring do `index.js` / `server.js` | 🟡 |

---

Dokument 0063 rozšiřuje obecnou kotvu dokumentu 0009 o Kernel Layer 0 orchestrace Runtime, Battle a entity lifecycle. Business logiku nepřebírá.

| Dokument | Stav |
|----------|------|
| [0062](./0062-runtime-manager.md) | Runtime Manager |
| **0063** Lifecycle Manager | 🟢 kanon + kotva + contract |
| **0064** Health Manager | 🟢 kanon + kotva + contract |
| **0065** (plánováno) | Watchdog Engine |
