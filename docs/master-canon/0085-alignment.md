# Master Canon 0085 — soulad s projektem

Audit [`0085-decision-engine.md`](./0085-decision-engine.md) vůči stavu `C:\MIA` k 2026-07-18.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-kernel-decision-core/decisionEngine.js`  
(≠ AI `shared/mia-decision-core/` z 0028)

---

## §1–§11 Sjednocení, konflikty, determinismus

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný Kernel Decision Engine | ✅ | `singleton` / `soleDecisionAuthority` |
| Nevykonává Commands / Events / business logic | ✅ | flags |
| Descriptor 8 polí | ✅ | `createDecisionDescriptor` |
| Sources (rule/policy/state/ai/…) | ✅ | `KDE_SOURCE` |
| Conflict Resolution (Policy DENY > Rule) | ✅ | `resolve` / strategy |
| Priority CRITICAL→LOW | ✅ | `KDE_PRIORITY` |
| Strategies (firstMatch/highest/majority/weighted/custom) | ✅ | `KDE_STRATEGY` |
| Context read-only | ✅ | |
| Determinismus | ✅ | same input → same DecisionID chain |

---

## §12–§18 Integrace a bezpečnost

| Oblast | Stav |
|--------|------|
| Rule / Policy / AI inputs | ✅ bridges + `evaluate` inputs |
| AI only suggests | ✅ `aiDecidesAlone` rejected |
| API evaluate/resolve/compare/get/validate | ✅ |
| Decision audit | ✅ |
| Live wiring in index (kernel DE) | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0084](./0084-policy-engine.md) | Policy Engine |
| **0085** Decision Engine (Kernel) | 🟢 kanon + kotva + contract |
| **0086** Orchestrator Engine | 🟢 kanon + kotva + contract |
| **0087** Coordination Engine | 🟢 kanon + kotva + contract |
| **0088** (plánováno) | Telemetry Manager |
| [0028](./0028-decision-engine.md) | AI Decision Engine (oddělená kotva) |
