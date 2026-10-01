# Master Canon 0034 — soulad s projektem

Audit [`0034-conversation-engine.md`](./0034-conversation-engine.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-conversation-core/conversationEngine.js`

---

## §1–§4 Účel a princip

| Bod | Stav | Důkaz |
|-----|------|-------|
| Conversation API | ✅ | `createConversationEngine` |
| Komunikační vrstva | ✅ | `handleMessage()` |
| Tok chat → kontext → DE → odpověď | ✅ | contract test |
| Bez přímé mutace paměti | ✅ | `adaptMemoryContext` read-only |

---

## §3 Architektura — 12 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Conversation Manager | ✅ | `manageConversation`, `openConversation` |
| Context Manager | ✅ | `buildConversationContext` |
| Dialogue Planner | ✅ | `planDialogue` |
| Intent Analyzer | ✅ | `analyzeIntent` |
| Topic Tracker | ✅ | `trackTopic` |
| Speaker Manager | ✅ | `selectSpeaker` |
| Turn Manager | ✅ | `manageTurn` |
| Response Builder | ✅ | `buildResponse` |
| Language Manager | ✅ | `manageLanguage`, `detectLanguage` |
| Conversation History | ✅ | `recordConversationHistory` |
| Conversation Metrics | ✅ | `collectConversationMetrics` |
| Conversation API | ✅ | `createConversationEngine` |

---

## §16–§18 Integrace

| Oblast | Stav |
|--------|------|
| Personality + Emotion + Decision | ✅ contract |
| Speech Engine (0035) | ✅ contract + TTS 🟡 `MIA_TTS_ENGINE.js` |
| Chat Bridge ingest hook | ❌ |
| Paralelní vlákna | ✅ `CE_THREAD` |

---

| Dokument | Stav |
|----------|------|
| [0033](./0033-personality-engine.md) | Personality Engine |
| **0034** Conversation Engine | 🟢 kanon + kotva + contract |
| [0035](./0035-speech-engine.md) | Speech Engine |
