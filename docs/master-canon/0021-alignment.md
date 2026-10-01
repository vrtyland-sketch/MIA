# Master Canon 0021 — soulad s projektem

Audit [`0021-short-term-memory.md`](./0021-short-term-memory.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-memory-core/shortTermMemory.js`

---

## §1–§4 Účel a princip

| Bod | Stav | Důkaz |
|-----|------|-------|
| STM API | ✅ | `createShortTermMemoryStore` |
| Oddělení od Working Memory | ✅ | `promoteToLongTermCandidate` z STM |
| Stream/konverzační relevance | ✅ | `shouldRetainInStm` |

---

## §3 Architektura — 12 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Conversation Memory | ✅ | `addConversationTurn` |
| Stream Memory | ✅ | `updateStreamMemory` |
| User Session Memory | ✅ | `openUserSession`, `closeUserSession` |
| Gift Memory | ✅ | `appendGift`, `getRecentGifts`, `detectGiftSpam` |
| Battle Memory | ✅ | `updateBattleMemory`, `createBattleSummary` |
| Overlay Memory | 🟡 | kind `overlay` v `createStmEntry` |
| Emotion Context | ✅ | `setEmotionContext` |
| Relationship Context | ✅ | `updateRelationshipContext` |
| Temporary Knowledge | ✅ | `addTemporaryKnowledge` |
| Memory Expiration | ✅ | `isStmExpired`, `sweepExpired` |
| Memory Synchronizer | ✅ | `synchronizeShortTermMemory` |
| STM API | ✅ | put/get/update |

---

## §14–§16 TTL, score, synchronizer

| Požadavek | Stav |
|-----------|------|
| TTL per typ | ✅ `DEFAULT_STM_TTL_MS` |
| Memory Score | ✅ `computeStmScore` |
| Sync + LTM kandidáti | ✅ `synchronizeShortTermMemory` |
| Gift cap 500 | ✅ `MAX_GIFT_HISTORY` |

---

## §20 Vazba na MIA

| Oblast | Stav |
|--------|------|
| `MIA_SESSION_MEMORY.js` | 🟡 | chat/users bez STM API |
| Gift spam 5s | ✅ `detectGiftSpam` |
| Battle / overlay runtime | ❌ hook |
| Video queue T1–T4 | 🟡 | mimo STM store |

---

## §18–§19 Zakázané a checklist

| Položka | Stav |
|---------|------|
| Centrální STM | 🟡 | API ✅, singleton ❌ |
| STM API only | ✅ |
| Runtime adopce | ❌ |

---

| Dokument | Stav |
|----------|------|
| [0020](./0020-working-memory.md) | Working Memory |
| **0021** Short-Term Memory | 🟢 kanon + kotva + contract |
| [0022](./0022-long-term-memory.md) | Long-Term Memory |
