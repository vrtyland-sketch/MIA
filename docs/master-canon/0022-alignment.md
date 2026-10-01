# Master Canon 0022 — soulad s projektem

Audit [`0022-long-term-memory.md`](./0022-long-term-memory.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-memory-core/longTermMemory.js`

---

## §1–§4 Účel a princip

| Bod | Stav | Důkaz |
|-----|------|-------|
| LTM API | ✅ | `createLongTermMemoryStore` |
| Oddělení od STM | ✅ | `ingestFromShortTerm` |
| Vyhodnocení před zápisem | ✅ | `evaluateForLongTermRetention` |

---

## §3 Architektura — 14 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| User Memory | ✅ | `upsertUserProfile` |
| Stream Memory | ✅ | `recordStreamMemory` |
| Relationship Memory | ✅ | `updateRelationshipMemory` |
| Project Memory | ✅ | `addProjectMemory` |
| World Knowledge | ✅ | `addWorldKnowledge` |
| Personality Memory | ✅ | `updatePersonalityMemory` |
| Kojnožrout Memory | ✅ | `updateKojnozoutMemory` |
| Skill Memory | ✅ | `addSkillMemory` |
| Decision History | ✅ | `recordDecision` |
| Experience Library | ✅ | `addExperience` |
| Memory Archive | ✅ | `store.archive` |
| Memory Backup | ✅ | `store.backup` / `restore` |
| Knowledge Graph | ✅ | `store.graph` |
| LTM API | ✅ | put/get |

---

## §15–§16 Konsolidace a zapomínání

| Požadavek | Stav |
|-----------|------|
| Konsolidace | ✅ `consolidateLongTermMemories` |
| Zapomínání | ✅ `shouldForgetLtm` |
| Ochrana kritických znalostí | ✅ `CRITICAL_LTM_KINDS` |

---

## §18–§19 Přístup a zakázané

| Položka | Stav |
|---------|------|
| LTM API only | ✅ |
| Zakázané činnosti | ✅ `assertLtmForbiddenActivity` |
| Perzistentní LTM store | ❌ | in-memory API |
| Runtime singleton | ❌ |
| `MIA_STORY_MEMORY.js` bridge | 🟡 | data soubor bez LTM API |

---

| Dokument | Stav |
|----------|------|
| [0021](./0021-short-term-memory.md) | Short-Term Memory |
| **0022** Long-Term Memory | 🟢 kanon + kotva + contract |
| [0023](./0023-episodic-memory.md) | Episodic Memory |
