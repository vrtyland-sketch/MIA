# Master Canon 0019 — soulad s projektem

Audit [`0019-memory-system.md`](./0019-memory-system.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-memory-core/memorySystem.js`

---

## §1–§4 Účel a princip CO/KDY/PROČ/JAK DLOUHO

| Bod | Stav | Důkaz |
|-----|------|-------|
| Centrální Memory System API | ✅ | `memorySystem.js` |
| Čtyři povinné otázky | ✅ | `createMemoryRecord`, `validateMemoryRecord` |
| Ukládá význam, ne jen data | ✅ | `why`, `context`, `score` |

---

## §3 Architektura — 15 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Working / Short / Long-Term | ✅ | `MEMORY_TYPE` |
| Episodic / Semantic / Procedural / Emotional | ✅ | `MEMORY_TYPE` |
| Context Manager | ✅ | `createMemoryContext` |
| Knowledge Graph | ✅ | `createKnowledgeGraph` |
| Memory Index | ✅ | `createMemoryIndex` |
| Memory Search | ✅ | `searchMemories` |
| Memory Consolidator | ✅ | `consolidateMemories` |
| Memory Cleaner | ✅ | `shouldForget` |
| Memory Backup | ✅ | `createMemoryBackup`, `restoreMemoryBackup` |
| Memory API | ✅ | `createMemoryApiResponse` |

---

## §5–§14 Typy, lifecycle, score, graph

| Požadavek | Stav |
|-----------|------|
| 7 typů paměti | ✅ |
| Lifecycle fáze | ✅ `MEMORY_LIFECYCLE_ORDER` |
| Memory Score | ✅ `computeMemoryScore` |
| Knowledge Graph edges | ✅ |
| Rychlé vyhledávání | ✅ in-memory index |
| Zapomínání | ✅ `shouldForget` |
| Konsolidace podobných | ✅ |

---

## §15 Integrace s MIA

| Modul runtime | Stav |
|---------------|------|
| `MIA_SESSION_MEMORY.js` | 🟡 | short-term chat, bez kanonického API |
| `MIA_STORY_MEMORY.js` | 🟡 | story episodic |
| `data/mia-session-memory.json` | 🟡 | perzistence |
| Centrální Memory API hook | ❌ |
| AI přes Memory API only | ❌ |

---

## §16–§17 Zakázané činnosti a checklist

| Položka | Stav |
|---------|------|
| Memory System | 🟡 | API ✅, runtime singleton ❌ |
| Oddělené typy paměti | ✅ |
| Memory Score | ✅ |
| Konsolidace / zapomínání | ✅ |
| Knowledge Graph | ✅ |
| Zálohování | 🟡 | API ✅, scheduled backup ❌ |
| Kontext u záznamů | ✅ |

---

## Doporučené další kroky

1. **0022 Long-Term Memory**
2. Bridge `MIA_SESSION_MEMORY` → STM API
3. Scheduled consolidation job

---

| Dokument | Stav |
|----------|------|
| **0019** Memory System | 🟢 kanon + kotva + contract |
| [0020](./0020-working-memory.md) | Working Memory |
| [0021](./0021-short-term-memory.md) | Short-Term Memory |
| [0022](./0022-long-term-memory.md) | Long-Term Memory |
| **0023** (plánováno) | Episodic Memory |
