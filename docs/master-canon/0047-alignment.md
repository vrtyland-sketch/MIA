# Master Canon 0047 — soulad s projektem

Audit [`0047-npc-character-engine.md`](./0047-npc-character-engine.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-character-core/characterEngine.js`

---

## §1–§4 Účel a princip

| Bod | Stav | Důkaz |
|-----|------|-------|
| Character API | ✅ | `createCharacterEngine` |
| Pipeline identity → memory | ✅ | `buildCharacterPipeline` |
| Character lifecycle | ✅ | `buildCharacterLifecycle` |
| Tier hierarchie A–D | ✅ | `CE_CHARACTER_TIER` |

---

## §3 Architektura — 12 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Character Manager | ✅ | `manageCharacter` |
| Character Registry | ✅ | `registerCharacterDefinition`, `DEFAULT_CHARACTER_REGISTRY` |
| Identity Manager | ✅ | `createIdentity` |
| Behaviour Manager | ✅ | `resolveBehaviour` |
| Routine Manager | ✅ | `advanceRoutine` |
| Relationship Manager | ✅ | `manageRelationship` |
| Character Stats | ✅ | `createStats` |
| Equipment Manager | ✅ | `equipViaInventory` |
| Character AI | ✅ | `planCharacterAction` |
| Character Analytics | ✅ | `collectCharacterAnalytics` |
| Character History | ✅ | `recordCharacterHistory` |
| Character API | ✅ | `createCharacterEngine` |

---

## §16–§20 Integrace a zákazy

| Oblast | Stav |
|--------|------|
| World placement via adapters | ✅ contract |
| Story character export | ✅ `getCharacterForStory` |
| Personality Engine required | ✅ contract |
| Decision Engine required | ✅ contract |
| Inventory equipment | ✅ contract |
| Kojnožrout runtime | 🟡 `MIA_KOJNOZROUT_ENGINE.js` |
| Zakázané aktivity | ✅ `CE_FORBIDDEN_ACTIVITIES` |

---

| Dokument | Stav |
|----------|------|
| [0046](./0046-story-engine.md) | Story Engine |
| **0047** NPC & Character Engine | 🟢 kanon + kotva + contract |
| **0048** Creature Evolution Engine | 🟢 kanon + kotva + contract |
| **0049** (plánováno) | Plugin & Module Engine |
