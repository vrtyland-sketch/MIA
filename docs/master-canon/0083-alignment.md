# Master Canon 0083 — soulad s projektem

Audit [`0083-rule-engine.md`](./0083-rule-engine.md) vůči stavu `C:\MIA` k 2026-07-18.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-rule-core/ruleEngine.js`

---

## §1–§12 Pravidla, podmínky, priority

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Rule Engine | ✅ | `singleton` / `soleRuleAuthority` |
| Nevykonává business logic / Commands / Events | ✅ | flags |
| Descriptor 8 polí | ✅ | `createRuleDescriptor` |
| Rule types (Gift/Battle/…) + extensible | ✅ | `RE_RULE_TYPE` / `registerRuleType` |
| Deterministic conditions | ✅ | `evaluateCondition` |
| Decision TRUE/FALSE / value | ✅ | `evaluate` |
| Rule Sets | ✅ | `loadRuleSet` / `evaluate` set |
| Priority strategy | ✅ | `firstMatch` by priority |
| AND / OR / NOT / XOR | ✅ | `RE_OPERATOR` |

---

## §13–§18 Integrace a bezpečnost

| Oblast | Stav |
|--------|------|
| Workflow může žádat rozhodnutí | ✅ `forWorkflowBridge` |
| Command Bus: RE nespouští Commands | ✅ `dispatchCommand` rejected |
| API evaluate/load/reload/validate/get | ✅ |
| Unauthorized runtime mutate blocked | ✅ |
| Rule audit (≠ Audit Manager) | ✅ |
| Live rule catalog wiring in index | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0082](./0082-workflow-engine.md) | Workflow Engine |
| **0083** Rule Engine | 🟢 kanon + kotva + contract |
| **0084** Policy Engine | 🟢 kanon + kotva + contract |
| **0085** Decision Engine (Kernel) | 🟢 kanon + kotva + contract |
| **0086** Orchestrator Engine | 🟢 kanon + kotva + contract |
| **0087** Coordination Engine | 🟢 kanon + kotva + contract |
| **0088** (plánováno) | Telemetry Manager |
