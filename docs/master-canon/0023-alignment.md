# Master Canon 0023 — soulad s projektem

Audit [`0023-episodic-memory.md`](./0023-episodic-memory.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-memory-core/episodicMemory.js`

---

## §1–§4 Účel a princip

| Bod | Stav | Důkaz |
|-----|------|-------|
| Episode API | ✅ | `createEpisodicMemoryStore` |
| Jedna epizoda = jeden příběh | ✅ | `createEpisodeBuilder` |
| Oddělení od Semantic | ✅ | `MEMORY_TYPE.EPISODIC` |

---

## §3 Architektura — 12 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Episode Builder | ✅ | `createEpisodeBuilder` |
| Episode Timeline | ✅ | `createTimelineMoment` |
| Episode Index | ✅ | `indexSnapshot` |
| Episode Context | ✅ | `createEpisode` context |
| Episode Participants | ✅ | `participants` pole |
| Episode Tags | ✅ | `EPISODE_TAG` |
| Episode Importance | ✅ | `computeEpisodeImportanceScore` |
| Episode Links | ✅ | `store.link` |
| Episode Replay | ✅ | `store.replay` |
| Episode Archive | ✅ | `store.archive` |
| Episode Search | ✅ | `store.search` |
| Episode API | ✅ | put/get |

---

## §14 Typy epizod

| Typ | Stav |
|-----|------|
| Stream, Battle, Community, Development, AI, Personal | ✅ `EPISODE_TYPE` |

---

## §16–§17 Integrace a zakázané

| Položka | Stav |
|---------|------|
| Episode API only | ✅ |
| Neúplné epizody označené | ✅ `incomplete: true` |
| Zakázané činnosti | ✅ `assertEpisodicForbiddenActivity` |
| Runtime hook (Battle/Stream) | ❌ |
| Perzistentní episode store | ❌ in-memory |
| `story-memory.json` bridge | 🟡 data bez Episode API |

---

| Dokument | Stav |
|----------|------|
| [0022](./0022-long-term-memory.md) | Long-Term Memory |
| **0023** Episodic Memory | 🟢 kanon + kotva + contract |
| [0024](./0024-semantic-memory.md) | Semantic Memory |
