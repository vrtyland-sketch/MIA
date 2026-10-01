# Master Canon 0030 — soulad s projektem

Audit [`0030-goal-management-system.md`](./0030-goal-management-system.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-goal-core/goalManagementSystem.js`

---

## §1–§4 Účel a princip

| Bod | Stav | Důkaz |
|-----|------|-------|
| Goal API | ✅ | `createGoalManagementSystem` |
| Strategická vrstva, ne exekuce | ✅ | `executes: false` |
| Prioritizace nad Decision Engine | ✅ | `resolve()` → `decisionCandidates` |
| Kanonický tok GMS → DE → AO | ✅ | contract test |

---

## §3 Architektura — 12 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Goal Registry | ✅ | `registerGoal`, `register()` |
| Goal Planner | ✅ | `planGoal` |
| Goal Prioritizer | ✅ | `prioritizeGoals` |
| Goal Evaluator | ✅ | `evaluateGoal` |
| Goal Scheduler | ✅ | `scheduleGoal` |
| Goal Dependency Manager | ✅ | `resolveGoalDependencies` |
| Goal Conflict Resolver | ✅ | `resolveGoalConflicts` |
| Goal Lifecycle Manager | ✅ | `transitionGoalLifecycle` |
| Goal Metrics | ✅ | `collectGoalMetrics` |
| Goal History | ✅ | `recordGoalHistory` |
| Goal Learning | ✅ | `applyGoalLearning` |
| Goal API | ✅ | `createGoalManagementSystem` |

---

## §6 Typy cílů

| Typ | Stav |
|-----|------|
| Reactive | ✅ |
| Planned | ✅ |
| Persistent | ✅ |
| Emergency | ✅ |

---

## §12 Lifecycle

| Stav | Stav implementace |
|------|-------------------|
| Created → Planned → Active → Waiting → Completed → Archived | ✅ |
| Cancelled | ✅ |
| Active time limit | ✅ `enforceActiveGoalLimit` |

---

## §16–§19 Memory a zakázané

| Oblast | Stav |
|--------|------|
| Memory adaptér read-only | ✅ `adaptMemoryContext` |
| Decision Engine `manageGoals` | 🟡 legacy inline · GMS kotva ✅ |
| Centrální ingest hook | ❌ |
| Planning Engine (0031) | ✅ kotva + contract · ingest hook ❌ |
| Emotion Engine (0032) | ❌ plánováno |

---

| Dokument | Stav |
|----------|------|
| [0029](./0029-action-orchestrator.md) | Action Orchestrator |
| **0030** Goal Management System | 🟢 kanon + kotva + contract |
| **0031** (plánováno) | Planning Engine |
