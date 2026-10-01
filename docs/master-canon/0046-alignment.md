# Master Canon 0046 — soulad s projektem

Audit [`0046-story-engine.md`](./0046-story-engine.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-story-core/storyEngine.js`

---

## §1–§4 Účel a princip

| Bod | Stav | Důkaz |
|-----|------|-------|
| Story API | ✅ | `createStoryEngine` |
| Narativní vrstva | ✅ | `validateStoryInput` |
| Pipeline event → history | ✅ | `buildStoryPipeline` |
| Story lifecycle | ✅ | `buildStoryLifecycle` |

---

## §3 Architektura — 12 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Story Manager | ✅ | `manageStory`, `buildStoryPipeline` |
| Chapter Manager | ✅ | `createChapter`, `advanceChapter` |
| Event Manager | ✅ | `scheduleStoryEvent` |
| Dialogue Manager | ✅ | `createDialogue` |
| NPC Manager | ✅ | `registerNpc` |
| Choice Manager | ✅ | `presentCommunityChoice`, `resolveCommunityChoice` |
| Consequence Manager | ✅ | `applyConsequence` |
| Timeline Manager | ✅ | `buildTimeline` |
| Story Analytics | ✅ | `collectStoryAnalytics` |
| Story History | ✅ | `recordStoryHistory` |
| Story Persistence | ✅ | `persistStory` |
| Story API | ✅ | `createStoryEngine` |

---

## §15–§20 Integrace a zákazy

| Oblast | Stav |
|--------|------|
| World via adapters | ✅ contract |
| Community choices | ✅ contract |
| Battle reports only | ✅ `reportBattleOutcome` |
| Story memory runtime | 🟡 `MIA_STORY_MEMORY.js` |
| Story arc registry | 🟡 `MIA_STORY_ARC_REGISTRY.js` |
| Zakázané aktivity | ✅ `SE_FORBIDDEN_ACTIVITIES` |

---

| Dokument | Stav |
|----------|------|
| [0045](./0045-world-engine.md) | World Engine |
| **0046** Story Engine | 🟢 kanon + kotva + contract |
| **0047** NPC & Character Engine | 🟢 kanon + kotva + contract |
| **0048** (plánováno) | Creature Evolution Engine |
