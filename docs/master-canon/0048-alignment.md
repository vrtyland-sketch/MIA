# Master Canon 0048 — soulad s projektem

Audit [`0048-creature-evolution-engine.md`](./0048-creature-evolution-engine.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-creature-core/creatureEvolutionEngine.js`

---

## §1–§4 Účel a platformové Kojnožrouty

| Bod | Stav | Důkaz |
|-----|------|-------|
| Creature API | ✅ | `createCreatureEvolutionEngine` |
| Platform registry (5 platforem) | ✅ | `DEFAULT_PLATFORM_CREATURES`, `CVE_PLATFORM` |
| Oddělená historie/progres | ✅ | `createCreatureProgress`, `recordCreatureHistory` |

---

## §3–§6 Modulární hry

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Game Module Registry | ✅ | `registerGameModule`, `DEFAULT_GAME_MODULES` |
| Module Manager | ✅ | `manageModuleLifecycle`, `attachModuleToCreature` |
| Platform Battle Coordinator | ✅ | `coordinatePlatformBattle` |
| Evolution Manager | ✅ | `evolveCreature` |
| Genetics Manager | ✅ | `createGeneticProfile` |
| Community Adapter | ✅ | `adaptCommunityProgress` |
| World Adapter | ✅ | `placeCreatureHome` |

---

## §7–§11 Integrace a zákazy

| Oblast | Stav |
|--------|------|
| Battle via adapters only | ✅ contract |
| Evolution ≠ battle rules | ✅ `mutatesBattleRules: false` |
| World read-only placement | ✅ contract |
| Kojnožrout evolution runtime | 🟡 `MIA_KOJNOZROUT_EVOLUTION.js` |
| Live multi-platform battle | 🟡 plánováno |
| Zakázané aktivity | ✅ `CVE_FORBIDDEN_ACTIVITIES` |

---

| Dokument | Stav |
|----------|------|
| [0047](./0047-npc-character-engine.md) | NPC & Character Engine |
| **0048** Creature Evolution Engine | 🟢 kanon + kotva + contract |
| **0049** Plugin & Module Engine | 🟢 kanon + kotva + contract |
| **0050** (návrh) | MIA Core Kernel |
