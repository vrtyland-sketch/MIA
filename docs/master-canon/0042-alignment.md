# Master Canon 0042 — soulad s projektem

Audit [`0042-quest-progression-engine.md`](./0042-quest-progression-engine.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-progression-core/progressionEngine.js`

---

## §1–§4 Účel a princip

| Bod | Stav | Důkaz |
|-----|------|-------|
| Progress API | ✅ | `createProgressionEngine` |
| Tři vrstvy progrese | ✅ | `QPE_PROGRESS_LAYER` |
| Pipeline activity → history | ✅ | `buildProgressPipeline` |
| Auditovatelný postup | ✅ | `recordProgressHistory` |

---

## §3 Architektura — 12 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Quest Manager | ✅ | `manageQuests`, `createQuestDefinition` |
| Progression Manager | ✅ | `manageProgression`, `processCommunityGoal` |
| XP Manager | ✅ | `awardXp` |
| Level Manager | ✅ | `calculateLevel` |
| Mission Manager | ✅ | `createMission`, `checkMissionProgress` |
| Season Manager | ✅ | `manageSeason` |
| Reward Distributor | ✅ | `distributeReward` |
| Unlock Manager | ✅ | `unlockFeature` |
| Progress Analytics | ✅ | `collectProgressAnalytics` |
| Progress History | ✅ | `recordProgressHistory` |
| Progress Persistence | ✅ | `persistProgress` |
| Progress API | ✅ | `createProgressionEngine` |

---

## §17–§20 Integrace a zákazy

| Oblast | Stav |
|--------|------|
| Rewards via Economy | ✅ contract |
| Battle reports only | ✅ `reportBattleOutcome` |
| Care quest runtime | 🟡 `MIA_KOJNOZROUT_CARE_QUEST.js` |
| Centrální ingest hook | ❌ |
| Zakázané aktivity | ✅ `QPE_FORBIDDEN_ACTIVITIES` |

---

| Dokument | Stav |
|----------|------|
| [0041](./0041-economy-engine.md) | Economy Engine |
| **0042** Quest & Progression Engine | 🟢 kanon + kotva + contract |
| [0043](./0043-achievement-engine.md) | Achievement Engine |
