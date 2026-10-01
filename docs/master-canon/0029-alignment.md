# Master Canon 0029 — soulad s projektem

Audit [`0029-action-orchestrator.md`](./0029-action-orchestrator.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-action-core/actionOrchestrator.js`

---

## §1–§4 Účel a princip

| Bod | Stav | Důkaz |
|-----|------|-------|
| Action API | ✅ | `createActionOrchestrator` |
| Exekuce Action Planu | ✅ | `orchestrate()` |
| Oddělení od rozhodování | ✅ | `decides: false`, `validateActionPlan` |
| Tok Decision → Plan → Orchestrator | ✅ | contract s `mia-decision-core` |

---

## §3 Architektura — 13 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Action Queue | ✅ | `enqueueActionPlan` |
| Action Scheduler | ✅ | `scheduleActions` |
| Dependency Manager | ✅ | `resolveDependencies` |
| Execution Planner | ✅ | `planExecution` |
| Parallel Executor | ✅ | `executeParallel` |
| Synchronization Manager | ✅ | `synchronizeBarrier` |
| Timeout Manager | ✅ | `checkTimeout`, `AO_DEFAULT_TIMEOUT_MS` |
| Retry Manager | ✅ | `retryAction` |
| Rollback Manager | ✅ | `rollbackActions` |
| Completion Tracker | ✅ | `trackCompletion` |
| Feedback Collector | ✅ | `collectFeedback` |
| Metrics Collector | ✅ | `collectMetrics` |
| Action API | ✅ | `createActionOrchestrator` |

---

## §11 Timeouty

| Modul | Kánon | Implementace |
|-------|-------|--------------|
| Overlay | 200 ms | ✅ |
| Video Engine | 2 s | ✅ |
| Speech | 10 s | ✅ |
| AI | 30 s | ✅ |
| OBS | 5 s | ✅ |

---

## §19–§21 Runtime a zakázané

| Oblast | Stav |
|--------|------|
| Legacy gift delivery (`MIA_DELIVERY_RUNTIME.js`) | 🟡 anchor |
| Centrální ingest hook | ❌ |
| Goal Management (0030) | ✅ kotva + contract · ingest hook ❌ |
| Planning Engine (0031) | ❌ plánováno |

---

| Dokument | Stav |
|----------|------|
| [0028](./0028-decision-engine.md) | Decision Engine |
| **0029** Action Orchestrator | 🟢 kanon + kotva + contract |
| **0030** (plánováno) | Goal Management System |
