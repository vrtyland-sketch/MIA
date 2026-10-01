# Master Canon 0073 — soulad s projektem

Audit [`0073-alert-manager.md`](./0073-alert-manager.md) vůči stavu `C:\MIA` k 2026-07-18.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-alert-core/alertManager.js`

---

## §1–§12 Pravidla, životní cyklus a doručení

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Alert Manager | ✅ | `singleton` / `soleAlertAuthority` |
| Neřeší chyby (jen upozorňuje) | ✅ | `repairsDirectly: false` |
| Descriptor 10 polí | ✅ | `createAlertDescriptor` |
| Kategorie (9+) | ✅ | `AM_CATEGORY` |
| Priority LOW→EMERGENCY | ✅ | `AM_PRIORITY` |
| Status FSM | ✅ | `AM_STATUS` / `transition` |
| Alert Rules | ✅ | `addRule` / `evaluate` |
| Deduplikace | ✅ | `counter++` |
| Eskalace | ✅ | `escalate` |
| Notifikace (dashboard/log/api) | ✅ | `notify` / channels |

---

## §13–§18 Integrace a bezpečnost

| Oblast | Stav |
|--------|------|
| Metrics threshold → Alert | ✅ `fromMetrics` |
| Critical Fault → Alert (ne každý) | ✅ `fromFault` |
| Diagnostics link | ✅ |
| Alert Report + archiv | ✅ |
| Unauthorized close blocked | ✅ |
| Live external notification services | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0072](./0072-metrics-manager.md) | Metrics Manager |
| **0073** Alert Manager | 🟢 kanon + kotva + contract |
| **0074** Audit Manager | 🟢 kanon + kotva + contract |
| **0075** Event Store Manager | 🟢 kanon + kotva + contract |
| **0076** (plánováno) | Telemetry Manager |
