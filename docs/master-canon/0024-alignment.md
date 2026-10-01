# Master Canon 0024 — soulad s projektem

Audit [`0024-semantic-memory.md`](./0024-semantic-memory.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-memory-core/semanticMemory.js`

---

## §1–§4 Účel a princip

| Bod | Stav | Důkaz |
|-----|------|-------|
| Semantic API | ✅ | `createSemanticMemoryStore` |
| Oddělení od Episodic | ✅ | `MEMORY_TYPE.SEMANTIC` |
| Důvěryhodnost znalostí | ✅ | `KNOWLEDGE_TRUST` |

---

## §3 Architektura — 13 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Concept Library | ✅ | `addConcept` / `createConcept` |
| Knowledge Base | ✅ | `addKnowledge` |
| Rule Library | ✅ | `addRule` / `RULE_DOMAIN` |
| Ontology Manager | ✅ | `defineOntologyRelation` |
| Taxonomy Manager | ✅ | `addTaxonomyNode` |
| Knowledge Graph | ✅ | `store.graph` |
| Fact Validator | ✅ | `validateFact` |
| Knowledge Index | ✅ | `indexSnapshot` |
| Semantic Search | ✅ | `store.search` |
| Knowledge Versioning | ✅ | `versionEntry` |
| Knowledge Import | ✅ | `importKnowledge` |
| Knowledge Export | ✅ | `exportKnowledge` |
| Semantic API | ✅ | put/get |

---

## §17–§18 Integrace a zakázané

| Položka | Stav |
|---------|------|
| Semantic API only | ✅ |
| Zakázané činnosti | ✅ `assertSemanticForbiddenActivity` |
| Master Canon auto-ingest | ❌ |
| Perzistentní semantic store | ❌ in-memory |
| Runtime AI hook | ❌ |

---

| Dokument | Stav |
|----------|------|
| [0023](./0023-episodic-memory.md) | Episodic Memory |
| **0024** Semantic Memory | 🟢 kanon + kotva + contract |
| [0025](./0025-procedural-memory.md) | Procedural Memory |
