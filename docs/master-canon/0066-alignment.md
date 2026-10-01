# Master Canon 0066 — soulad s projektem

Audit [`0066-watchdog-engine.md`](./0066-watchdog-engine.md) vůči stavu `C:\MIA` k 2026-07-18.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-watchdog-core/watchdogEngine.js`

---

## §1–§12 Heartbeat, cyklus a detekce

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Watchdog Engine | ✅ | `singleton` / `soleWatchdogAuthority` |
| Nikdy neopravuje sám | ✅ | `repairsDirectly: false` / notify-only Recovery |
| Heartbeat povinná pole | ✅ | `createHeartbeatDescriptor` |
| Watchdog Cycle | ✅ | `WDE_CYCLE` / `runCycle` |
| Freeze Detection | ✅ | `detectFreeze` |
| Deadlock Detection | ✅ | `detectDeadlock` |
| Konfigurovatelné timeouty | ✅ | `setTimeoutMs` / defaults Kernel 1s … Plugin 10s |
| Klasifikace INFO→FATAL | ✅ | `WDE_SEVERITY` |

---

## §13–§18 Integrace a bezpečnost

| Oblast | Stav |
|--------|------|
| Resource Manager diagnostický vstup | ✅ `ingestResourceSignal` |
| Recovery notify (bez volby strategie) | ✅ `notifyRecovery` |
| Platformní výpadek neohrozí Kernel | ✅ |
| Integrita Heartbeatů / forged blocked | ✅ |
| Limit opakovaných Recovery | ✅ |
| Battle / platform scopes | ✅ |
| Live wiring skutečných timerů | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0065](./0065-recovery-manager.md) | Recovery Manager |
| **0066** Watchdog Engine | 🟢 kanon + kotva + contract |
| **0067** Fault Manager | 🟢 kanon + kotva + contract |
| **0068** Safe Mode Manager | 🟢 kanon + kotva + contract |
| **0069** Shutdown Manager | 🟢 kanon + kotva + contract |
| **0070** (plánováno) | Diagnostic Engine |
