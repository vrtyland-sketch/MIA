# Master Canon 0065 — soulad s projektem

Audit [`0065-recovery-manager.md`](./0065-recovery-manager.md) vůči stavu `C:\MIA` k 2026-07-17.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-recovery-core/recoveryManager.js`

---

## §1–§12 Workflow, strategie a eskalace

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Recovery Manager | ✅ | `singleton` / `soleRecoveryAuthority` |
| Workflow Detect→Report | ✅ | `RM_WORKFLOW` / `recover` |
| Recovery Levels 1–5 | ✅ | `RM_LEVEL` |
| Severity INFO→FATAL | ✅ | `RM_SEVERITY` |
| Retry + exponential delay | ✅ | `evaluateRetry` |
| Izolace před obnovou | ✅ | `recover` |
| Verification povinná | ✅ |
| Sekvenční eskalace | ✅ `escalate` |

---

## §13–§18 Integrace a bezpečnost

| Oblast | Stav |
|--------|------|
| Health diagnostický vstup | ✅ `fromHealth` |
| Watchdog request | ✅ `fromWatchdog` |
| Runtime recovery přes bridge | ✅ |
| Snapshot jen diagnostika/strategy input | ✅ |
| Recovery Report + archiv | ✅ |
| Limity proti nekonečné smyčce | ✅ |
| Live wiring skutečných executors | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0064](./0064-health-manager.md) | Health Manager |
| **0065** Recovery Manager | 🟢 kanon + kotva + contract |
| **0066** Watchdog Engine | 🟢 kanon + kotva + contract |
| **0067** (plánováno) | Diagnostic Engine |
