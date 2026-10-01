# Master Canon 0020 — soulad s projektem

Audit [`0020-working-memory.md`](./0020-working-memory.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-memory-core/workingMemory.js`

---

## §1–§4 Účel a princip

| Bod | Stav | Důkaz |
|-----|------|-------|
| Working Memory API | ✅ | `createWorkingMemoryStore` |
| Pouze aktivní informace | ✅ | TTL + `sweepExpired` |
| Oddělení od Short-Term | ✅ | `promoteToShortTerm` |

---

## §3 Architektura — 12 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Context Buffer | ✅ | `createContextBuffer` |
| Active Conversation | ✅ | `createActiveConversation` |
| Active Tasks | ✅ | `createActiveTask` |
| Decision Buffer | ✅ | `createDecisionBuffer` |
| Event Context | ✅ | `createEventContext` |
| Temporary Objects | ✅ | `createTemporaryObject` |
| Attention Manager | ✅ | `computeAttentionScore`, `pickAttentionTarget` |
| Focus Manager | ✅ | `setFocus`, `pickFocusTarget` |
| Cache Manager | 🟡 | kind `cache` + TTL |
| Memory Expiration | ✅ | `isWorkingContextExpired`, `sweepExpired` |
| Synchronization Manager | ✅ | `promoteToShortTerm` |
| Working Memory API | ✅ | CRUD + lock/release |

---

## §14–§17 Expirace, sync, overflow

| Požadavek | Stav |
|-----------|------|
| TTL per typ | ✅ `DEFAULT_TTL_MS` |
| Lock during processing | ✅ |
| Overflow eviction | ✅ `handleWorkingMemoryOverflow` |
| Kapacitní limit | ✅ `DEFAULT_CAPACITY` |

---

## §18 Integrace s MIA

| Engine | Stav |
|--------|------|
| Pipeline event context | 🟡 | lze mapovat na `createEventContext` |
| AI conversation | 🟡 | `MIA_SESSION_MEMORY` odděleně |
| Decision / Battle / Overlay | ❌ runtime hook |

---

## §19–§20 Zakázané a checklist

| Položka | Stav |
|---------|------|
| Centrální Working Memory store | 🟡 | API ✅, singleton ❌ |
| Expirace | ✅ |
| Focus / Attention | ✅ |
| API-only přístup | ✅ |
| Runtime adopce | ❌ |

---

| Dokument | Stav |
|----------|------|
| [0019](./0019-memory-system.md) | Memory System |
| **0020** Working Memory | 🟢 kanon + kotva + contract |
| [0021](./0021-short-term-memory.md) | Short-Term Memory |
| **0022** (plánováno) | Long-Term Memory |
