# Master Canon 0028 — soulad s projektem

Audit [`0028-decision-engine.md`](./0028-decision-engine.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-decision-core/decisionEngine.js`

---

## §1–§4 Účel a princip

| Bod | Stav | Důkaz |
|-----|------|-------|
| Decision API | ✅ | `createDecisionEngine` |
| Action Plan, ne exekuce | ✅ | `orchestratorOnly: true` |
| Kanonický rozhodovací tok | ✅ | `decide()` pipeline |

---

## §3 Architektura — 15 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Input Collector | ✅ | `collectDecisionInputs` |
| Context Builder | ✅ | `buildDecisionContext` |
| Situation Analyzer | ✅ | `analyzeSituation` |
| Goal Manager | ✅ | `manageGoals` |
| Rule Evaluator | ✅ | `evaluateRules` |
| Emotion Adapter | ✅ | `adaptEmotionContext` |
| Memory Adapter | ✅ | `adaptMemoryContext` |
| Knowledge Adapter | ✅ | `adaptKnowledgeContext` |
| Strategy Selector | ✅ | `selectStrategy` |
| Decision Planner | ✅ | `planDecision` |
| Risk Analyzer | ✅ | `analyzeRisk` |
| Decision Validator | ✅ | `validateDecision` |
| Action Generator | ✅ | `generateActionPlan` |
| Learning Feedback | ✅ | `applyLearningFeedback` |
| Decision API | ✅ | `createDecisionEngine` |

---

## §19–§20 Runtime a zakázané

| Oblast | Stav |
|--------|------|
| Legacy gift/chat rules | 🟡 | `platform_runtime_rules/decision_engine.js` |
| Centrální runtime hook | ❌ |
| Action Orchestrator (0029) | ✅ kotva + contract · ingest hook ❌ |
| Goal Management (0030) | ❌ plánováno |

---

| Dokument | Stav |
|----------|------|
| [0027](./0027-knowledge-graph.md) | Knowledge Graph |
| **0028** Decision Engine | 🟢 kanon + kotva + contract |
| **0029** (plánováno) | Action Orchestrator |
