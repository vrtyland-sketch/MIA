# Master Canon 0025 — soulad s projektem

Audit [`0025-procedural-memory.md`](./0025-procedural-memory.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-memory-core/proceduralMemory.js`

---

## §1–§4 Účel a princip

| Bod | Stav | Důkaz |
|-----|------|-------|
| Procedural API | ✅ | `createProceduralMemoryStore` |
| Vstup → postup → výsledek | ✅ | `createProcedure` |
| Oddělení od Semantic/Episodic | ✅ | `MEMORY_TYPE.PROCEDURAL` |

---

## §3 Architektura — 13 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Skill Library | ✅ | `createSkill` |
| Procedure Engine | ✅ | `createProcedure` |
| Workflow Manager | ✅ | `createWorkflow` |
| Strategy Library | ✅ | `createStrategy` |
| Macro Engine | ✅ | `createMacro` |
| Automation Engine | ✅ | `addAutomation` / `runAutomation` |
| Optimization Engine | ✅ | `optimizeProcedure` |
| Skill Evaluator | ✅ | `evaluateSkill` |
| Skill Versioning | ✅ | `versionProcedure` |
| Learning Pipeline | ✅ | `registerProcedure` / `validateProcedure` |
| Procedure Index | ✅ | `indexSnapshot` |
| Procedure Search | ✅ | `store.search` |
| Procedural API | ✅ | put/get |

---

## §17 Příklady procedur

| Oblast | Stav |
|--------|------|
| Gift reaction workflow | 🟡 | contract test kotva |
| Battle / Chat pipeline | 🟡 | API ready |
| Runtime adopce (`MIA_DELIVERY_RUNTIME`) | ❌ |

---

## §18 Zakázané činnosti

| Položka | Stav |
|---------|------|
| Procedural API only | ✅ |
| Validace procedur | ✅ |
| Perzistentní store | ❌ in-memory |

---

| Dokument | Stav |
|----------|------|
| [0024](./0024-semantic-memory.md) | Semantic Memory |
| **0025** Procedural Memory | 🟢 kanon + kotva + contract |
| [0026](./0026-emotional-memory.md) | Emotional Memory |
