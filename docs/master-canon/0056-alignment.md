# Master Canon 0056 — soulad s projektem

Audit [`0056-resource-manager.md`](./0056-resource-manager.md) vůči stavu `C:\MIA` k 2026-07-16.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-resource-core/resourceManager.js`

---

## §1–§11 Registry a prostředky

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Resource Manager | ✅ | `singleton` |
| Hardware / Runtime / App / AI | ✅ | `RM_DOMAIN` |
| Resource Registry | ✅ | `register` / `list` |
| Exclusive / Shared / Limited | ✅ | `RM_RESOURCE_KIND` |
| Alokace jen přes RM | ✅ | `request` → `release` |
| Self-allocate zakázáno | ✅ | `assertSelfAllocateForbidden` |

---

## §12–§18 Provoz

| Oblast | Stav |
|--------|------|
| Priority CRITICAL→OPTIONAL | ✅ `RM_PRIORITY` |
| Limity z Configuration | ✅ `applyLimits` |
| Auto optimalizace (ne Kernel) | ✅ `optimize` |
| Alarmy WARNING→EMERGENCY | ✅ `evaluateAlarms` |
| Watchdog feed | ✅ `watchdogSnapshot` |
| Kernel ochrana | ✅ `protectKernel` |
| Live wiring do index.js | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0055](./0055-configuration-manager.md) | Configuration Manager |
| **0056** Resource Manager | ? kanon + kotva + contract |
| **0057** Process Manager | ? kanon + kotva + contract |
| **0058** (pl�nov�no) | Runtime Health & Watchdog |
