# Master Canon 0084 — soulad s projektem

Audit [`0084-policy-engine.md`](./0084-policy-engine.md) vůči stavu `C:\MIA` k 2026-07-18.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-policy-core/policyEngine.js`

---

## §1–§10 Politiky, scope, effect, inheritance

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Policy Engine | ✅ | `singleton` / `solePolicyAuthority` |
| ≠ Rule Engine (systémové politiky) | ✅ | flags |
| Descriptor 9 polí | ✅ | `createPolicyDescriptor` |
| Scope (system/module/…) | ✅ | `PE_SCOPE` |
| Effect ALLOW/DENY/LIMIT/REDIRECT | ✅ | `PE_EFFECT` |
| Priority | ✅ | first-match by priority |
| Inheritance (specific overrides) | ✅ | `inheritsFrom` |
| evaluate nemění request | ✅ | |

---

## §11–§17 Integrace a bezpečnost

| Oblast | Stav |
|--------|------|
| Odděleno od Rule Engine | ✅ `forRuleBridge` order Policy→Rule |
| Command Bus: PE nespouští Commands | ✅ `dispatchCommand` rejected |
| Workflow bridge | ✅ `forWorkflowBridge` |
| API evaluate/load/reload/validate/get | ✅ |
| Unauthorized mutate blocked | ✅ |
| Policy audit (≠ Audit Manager) | ✅ |
| Live policy catalog wiring in index | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0083](./0083-rule-engine.md) | Rule Engine |
| **0084** Policy Engine | 🟢 kanon + kotva + contract |
| **0085** Decision Engine (Kernel) | 🟢 kanon + kotva + contract |
| **0086** Orchestrator Engine | 🟢 kanon + kotva + contract |
| **0087** Coordination Engine | 🟢 kanon + kotva + contract |
| **0088** (plánováno) | Telemetry Manager |
