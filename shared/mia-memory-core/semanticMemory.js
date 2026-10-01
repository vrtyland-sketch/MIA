"use strict";

/**
 * Master Canon 0024 — Semantic Memory: concepts, rules, ontology, search.
 */

const crypto = require("crypto");
const {
  createMemoryRecord,
  validateMemoryRecord,
  createKnowledgeGraph,
  createKnowledgeGraphNode,
  createKnowledgeGraphEdge,
  MEMORY_TYPE,
  MEMORY_LIFECYCLE,
  MEMORY_RETENTION
} = require("./memorySystem");

const SM_COMPONENT = Object.freeze({
  CONCEPT_LIBRARY: "concept_library",
  KNOWLEDGE_BASE: "knowledge_base",
  RULE_LIBRARY: "rule_library",
  ONTOLOGY_MANAGER: "ontology_manager",
  TAXONOMY_MANAGER: "taxonomy_manager",
  KNOWLEDGE_GRAPH: "knowledge_graph",
  FACT_VALIDATOR: "fact_validator",
  KNOWLEDGE_INDEX: "knowledge_index",
  SEMANTIC_SEARCH: "semantic_search",
  KNOWLEDGE_VERSIONING: "knowledge_versioning",
  KNOWLEDGE_IMPORT: "knowledge_import",
  KNOWLEDGE_EXPORT: "knowledge_export",
  SEMANTIC_API: "semantic_api"
});

const SM_COMPONENT_ORDER = Object.freeze(Object.values(SM_COMPONENT));

const SM_ENTRY_KIND = Object.freeze({
  CONCEPT: "concept",
  KNOWLEDGE: "knowledge",
  RULE: "rule"
});

const KNOWLEDGE_TRUST = Object.freeze({
  VERIFIED: "verified",
  PROPOSED: "proposed",
  DEPRECATED: "deprecated"
});

const ONTOLOGY_RELATION = Object.freeze({
  IS_TYPE: "is_type",
  USES: "uses",
  IS: "is",
  PART_OF: "part_of",
  RELATED_TO: "related_to"
});

const RULE_DOMAIN = Object.freeze({
  BATTLE: "battle",
  ECONOMY: "economy",
  GIFT: "gift",
  MODERATION: "moderation",
  OVERLAY: "overlay",
  ANIMATION: "animation"
});

const SM_OPERATION = Object.freeze({
  PUT: "put",
  GET: "get",
  SEARCH: "search",
  VALIDATE: "validate",
  VERSION: "version",
  IMPORT: "import",
  EXPORT: "export"
});

const SM_FORBIDDEN_ACTIVITIES = Object.freeze([
  "store_episodic_memories",
  "replace_episodic_memory",
  "store_unverified_as_fact",
  "mutate_rules_without_version",
  "break_graph_consistency"
]);

const SM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-memory-core/semanticMemory.js",
  "shared/mia-memory-core/longTermMemory.js",
  "docs/master-canon/README.md"
]);

function normalizeTerm(term) {
  return String(term || "")
    .trim()
    .toLowerCase();
}

function createConcept(input = {}) {
  const term = String(input.term || input.name || "").trim();
  const definition = String(input.definition || "").trim();
  if (!term) throw new Error("concept term is required");
  if (!definition) throw new Error("concept definition is required");

  const trust = Object.values(KNOWLEDGE_TRUST).includes(input.trust)
    ? input.trust
    : KNOWLEDGE_TRUST.VERIFIED;
  if (trust === KNOWLEDGE_TRUST.PROPOSED && input.verified === true) {
    throw new Error("proposed concepts cannot be marked verified");
  }

  const version = input.version != null ? Number(input.version) : 1;
  const record = createMemoryRecord({
    what: term,
    why: "semantic_concept",
    when: Date.now(),
    retention: MEMORY_RETENTION.PERMANENT,
    memoryType: MEMORY_TYPE.SEMANTIC,
    lifecycle: MEMORY_LIFECYCLE.LONG_TERM
  });
  const validation = validateMemoryRecord(record);
  if (!validation.ok) throw new Error(`invalid concept record: ${validation.errors.join(",")}`);

  return Object.freeze({
    entryId: input.entryId || `concept-${crypto.randomUUID()}`,
    kind: SM_ENTRY_KIND.CONCEPT,
    term,
    definition,
    synonyms: Object.freeze((input.synonyms || []).map(String)),
    relatedTerms: Object.freeze((input.relatedTerms || []).map(String)),
    version,
    trust,
    record,
    auditId: `concept-audit-${crypto.randomUUID()}`
  });
}

function createKnowledgeEntry(input = {}) {
  const title = String(input.title || input.what || "").trim();
  const body = String(input.body || input.content || "").trim();
  if (!title) throw new Error("knowledge title is required");
  if (!body) throw new Error("knowledge body is required");

  const trust = Object.values(KNOWLEDGE_TRUST).includes(input.trust)
    ? input.trust
    : KNOWLEDGE_TRUST.VERIFIED;

  return Object.freeze({
    entryId: input.entryId || `knowledge-${crypto.randomUUID()}`,
    kind: SM_ENTRY_KIND.KNOWLEDGE,
    title,
    body,
    domain: String(input.domain || "general"),
    tags: Object.freeze((input.tags || []).map(String)),
    version: input.version != null ? Number(input.version) : 1,
    trust,
    source: input.source || "internal",
    record: createMemoryRecord({
      what: title,
      why: "semantic_knowledge",
      when: Date.now(),
      retention: MEMORY_RETENTION.PERMANENT,
      memoryType: MEMORY_TYPE.SEMANTIC,
      lifecycle: MEMORY_LIFECYCLE.LONG_TERM
    }),
    auditId: `knowledge-audit-${crypto.randomUUID()}`
  });
}

function createRule(input = {}) {
  const name = String(input.name || input.title || "").trim();
  const rule = String(input.rule || input.body || "").trim();
  if (!name) throw new Error("rule name is required");
  if (!rule) throw new Error("rule body is required");

  const domain = Object.values(RULE_DOMAIN).includes(input.domain)
    ? input.domain
    : RULE_DOMAIN.BATTLE;

  return Object.freeze({
    entryId: input.entryId || `rule-${crypto.randomUUID()}`,
    kind: SM_ENTRY_KIND.RULE,
    name,
    rule,
    domain,
    version: input.version != null ? Number(input.version) : 1,
    trust: KNOWLEDGE_TRUST.VERIFIED,
    record: createMemoryRecord({
      what: name,
      why: `semantic_rule:${domain}`,
      when: Date.now(),
      retention: MEMORY_RETENTION.PERMANENT,
      memoryType: MEMORY_TYPE.SEMANTIC,
      lifecycle: MEMORY_LIFECYCLE.LONG_TERM
    }),
    auditId: `rule-audit-${crypto.randomUUID()}`
  });
}

function validateFact(candidate = {}, existing = []) {
  const errors = [];
  const warnings = [];

  const term = normalizeTerm(candidate.term || candidate.title || candidate.name);
  const definition = String(candidate.definition || candidate.body || candidate.rule || "").trim();

  if (!term) errors.push("missing_term");
  if (!definition) errors.push("missing_definition");

  const duplicate = existing.find(
    (e) =>
      normalizeTerm(e.term || e.title || e.name) === term &&
      e.version === (candidate.version != null ? Number(candidate.version) : 1) &&
      e.entryId !== candidate.entryId
  );
  if (duplicate) errors.push("duplicate");

  const conflict = existing.find(
    (e) =>
      normalizeTerm(e.term || e.title || e.name) === term &&
      e.version === (candidate.version != null ? Number(candidate.version) : 1) &&
      String(e.definition || e.body || e.rule || "").trim() !== definition &&
      e.entryId !== candidate.entryId
  );
  if (conflict) errors.push("conflict");

  if (candidate.trust === KNOWLEDGE_TRUST.PROPOSED) {
    warnings.push("proposed_not_fact");
  }

  if (!candidate.source && candidate.trust !== KNOWLEDGE_TRUST.PROPOSED) {
    warnings.push("missing_source");
  }

  const staleAfterMs = candidate.staleAfterMs != null ? Number(candidate.staleAfterMs) : null;
  if (staleAfterMs != null && candidate.updatedAt != null) {
    if (Date.now() - Number(candidate.updatedAt) > staleAfterMs) {
      warnings.push("stale");
    }
  }

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
    trust:
      candidate.trust === KNOWLEDGE_TRUST.PROPOSED
        ? KNOWLEDGE_TRUST.PROPOSED
        : errors.length === 0
          ? KNOWLEDGE_TRUST.VERIFIED
          : KNOWLEDGE_TRUST.PROPOSED,
    component: SM_COMPONENT.FACT_VALIDATOR
  });
}

function createSemanticMemoryStore() {
  const entries = new Map();
  const versions = new Map();
  const taxonomy = new Map();
  const index = new Map();
  const graph = createKnowledgeGraph();

  function allEntries() {
    return Array.from(entries.values());
  }

  function indexEntry(entry) {
    const keys = new Set();
    const term = entry.term || entry.title || entry.name;
    if (term) keys.add(normalizeTerm(term));
    if (Array.isArray(entry.synonyms)) {
      for (const s of entry.synonyms) keys.add(normalizeTerm(s));
    }
    if (Array.isArray(entry.tags)) {
      for (const t of entry.tags) keys.add(normalizeTerm(t));
    }
    for (const key of keys) {
      const bucket = index.get(key) || [];
      if (!bucket.includes(entry.entryId)) bucket.push(entry.entryId);
      index.set(key, bucket);
    }
  }

  function put(entryInput = {}) {
    let entry;
    if (entryInput.kind === SM_ENTRY_KIND.RULE || entryInput.rule) {
      entry = createRule(entryInput);
    } else if (entryInput.kind === SM_ENTRY_KIND.KNOWLEDGE || entryInput.body) {
      entry = createKnowledgeEntry(entryInput);
    } else {
      entry = createConcept(entryInput);
    }

    const validation = validateFact(entry, allEntries());
    if (!validation.ok && entry.trust !== KNOWLEDGE_TRUST.PROPOSED) {
      return Object.freeze({ ok: false, validation, error: "validation_failed" });
    }
    if (entry.trust === KNOWLEDGE_TRUST.PROPOSED && validation.errors.includes("missing_definition")) {
      return Object.freeze({ ok: false, validation, error: "validation_failed" });
    }

    entries.set(entry.entryId, entry);
    indexEntry(entry);

    const label = entry.term || entry.title || entry.name;
    graph.addNode(
      createKnowledgeGraphNode({
        nodeId: entry.entryId,
        label,
        kind: entry.kind
      })
    );

    for (const related of entry.relatedTerms || entry.tags || []) {
      graph.addEdge(
        createKnowledgeGraphEdge({
          from: entry.entryId,
          to: normalizeTerm(related),
          relation: ONTOLOGY_RELATION.RELATED_TO
        })
      );
    }

    return Object.freeze({ ok: true, entry, validation, operation: SM_OPERATION.PUT });
  }

  function get(entryId) {
    const entry = entries.get(String(entryId));
    if (!entry) return Object.freeze({ ok: false, error: "not_found" });
    return Object.freeze({ ok: true, entry, operation: SM_OPERATION.GET });
  }

  return {
    put,
    get,
    list(kind = null) {
      const all = allEntries();
      return kind ? all.filter((e) => e.kind === kind) : all;
    },
    addConcept(input) {
      return put({ ...input, kind: SM_ENTRY_KIND.CONCEPT });
    },
    addKnowledge(input) {
      return put({ ...input, kind: SM_ENTRY_KIND.KNOWLEDGE });
    },
    addRule(input) {
      return put({ ...input, kind: SM_ENTRY_KIND.RULE });
    },
    defineOntologyRelation(fromTerm, relation, toTerm) {
      const fromKey = normalizeTerm(fromTerm);
      const toKey = normalizeTerm(toTerm);
      const rel = Object.values(ONTOLOGY_RELATION).includes(relation)
        ? relation
        : ONTOLOGY_RELATION.RELATED_TO;

      graph.addEdge(
        createKnowledgeGraphEdge({
          from: fromKey,
          to: toKey,
          relation: rel
        })
      );

      return Object.freeze({
        ok: true,
        from: fromKey,
        to: toKey,
        relation: rel,
        component: SM_COMPONENT.ONTOLOGY_MANAGER
      });
    },
    addTaxonomyNode(nodeId, label, parentId = null) {
      const id = String(nodeId).trim();
      const node = Object.freeze({
        nodeId: id,
        label: String(label || id),
        parentId: parentId ? String(parentId) : null,
        children: Object.freeze([])
      });
      taxonomy.set(id, node);
      if (parentId) {
        const parent = taxonomy.get(String(parentId));
        if (parent) {
          taxonomy.set(String(parentId), Object.freeze({
            ...parent,
            children: Object.freeze([...parent.children, id])
          }));
        }
      }
      return Object.freeze({ ok: true, node, component: SM_COMPONENT.TAXONOMY_MANAGER });
    },
    versionEntry(entryId, patch = {}) {
      const current = entries.get(String(entryId));
      if (!current) return Object.freeze({ ok: false, error: "not_found" });

      const history = versions.get(entryId) || [];
      history.push(Object.freeze({ ...current }));
      versions.set(entryId, history);

      const nextVersion = (current.version || 1) + 1;
      const updatedInput = {
        ...current,
        ...patch,
        entryId: `${entryId}:v${nextVersion}`,
        version: nextVersion
      };
      delete updatedInput.record;

      const result = put(updatedInput);
      if (!result.ok) return result;

      entries.set(entryId, Object.freeze({ ...current, supersededBy: result.entry.entryId }));
      return Object.freeze({
        ...result,
        previousVersion: current.version || 1,
        operation: SM_OPERATION.VERSION,
        component: SM_COMPONENT.KNOWLEDGE_VERSIONING
      });
    },
    search(query = {}) {
      const q = normalizeTerm(query.q || query.query || "");
      const domain = query.domain ? String(query.domain) : null;
      const language = query.language ? String(query.language) : null;
      const minTrust = query.minTrust || null;

      const directIds = q ? index.get(q) || [] : null;
      let results = directIds
        ? directIds.map((id) => entries.get(id)).filter(Boolean)
        : allEntries();

      if (domain) {
        results = results.filter((e) => e.domain === domain || (e.tags || []).includes(domain));
      }
      if (language && query.languageField) {
        results = results.filter((e) => e[query.languageField] === language);
      }
      if (minTrust) {
        results = results.filter((e) => e.trust === minTrust);
      }
      if (q && !directIds) {
        results = results.filter((e) => {
          const hay = [
            e.term,
            e.title,
            e.name,
            e.definition,
            e.body,
            e.rule,
            ...(e.synonyms || []),
            ...(e.tags || [])
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        });
      }

      const expanded = new Set(results.map((e) => e.entryId));
      for (const entry of results) {
        const label = entry.term || entry.title || entry.name;
        const edges = graph.listEdges(normalizeTerm(label));
        for (const edge of edges) {
          const linked = allEntries().find(
            (e) => normalizeTerm(e.term || e.title || e.name) === edge.to
          );
          if (linked) expanded.add(linked.entryId);
        }
        for (const edge of graph.listEdges(entry.entryId)) {
          const linked = entries.get(edge.to);
          if (linked) expanded.add(linked.entryId);
        }
      }

      const semanticResults = Array.from(expanded)
        .map((id) => entries.get(id))
        .filter(Boolean);

      return Object.freeze({
        ok: true,
        results: Object.freeze(semanticResults),
        count: semanticResults.length,
        operation: SM_OPERATION.SEARCH,
        component: SM_COMPONENT.SEMANTIC_SEARCH
      });
    },
    importKnowledge(bundle = {}, source = "import") {
      const items = Array.isArray(bundle.items) ? bundle.items : [];
      const imported = [];
      const rejected = [];

      for (const raw of items) {
        const item = { ...raw, source, trust: raw.trust || KNOWLEDGE_TRUST.PROPOSED };
        const result = put(item);
        if (result.ok) imported.push(result.entry);
        else rejected.push({ item, validation: result.validation });
      }

      return Object.freeze({
        ok: true,
        importedCount: imported.length,
        rejectedCount: rejected.length,
        auditId: `import-audit-${crypto.randomUUID()}`,
        source,
        operation: SM_OPERATION.IMPORT,
        component: SM_COMPONENT.KNOWLEDGE_IMPORT
      });
    },
    exportKnowledge(options = {}) {
      const includeProposed = options.includeProposed === true;
      const includeInternal = options.includeInternal === true;

      const exportable = allEntries().filter((e) => {
        if (!includeProposed && e.trust === KNOWLEDGE_TRUST.PROPOSED) return false;
        if (!includeInternal && e.source === "internal_protected") return false;
        return true;
      });

      return Object.freeze({
        ok: true,
        concepts: Object.freeze(exportable.filter((e) => e.kind === SM_ENTRY_KIND.CONCEPT)),
        knowledge: Object.freeze(exportable.filter((e) => e.kind === SM_ENTRY_KIND.KNOWLEDGE)),
        rules: Object.freeze(exportable.filter((e) => e.kind === SM_ENTRY_KIND.RULE)),
        graph: graph.snapshot(),
        taxonomy: Object.freeze(Array.from(taxonomy.values())),
        operation: SM_OPERATION.EXPORT,
        component: SM_COMPONENT.KNOWLEDGE_EXPORT
      });
    },
    validate(candidate) {
      return validateFact(candidate, allEntries());
    },
    indexSnapshot() {
      return Object.freeze(
        Array.from(index.entries()).map(([key, ids]) => Object.freeze({ key, entryIds: Object.freeze(ids) }))
      );
    },
    graph: () => graph.snapshot(),
    taxonomySnapshot() {
      return Object.freeze(Array.from(taxonomy.values()));
    }
  };
}

function createSemanticApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    readOnly: options.readOnly !== false,
    data,
    component: SM_COMPONENT.SEMANTIC_API
  });
}

function assertSemanticForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !SM_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

module.exports = {
  SM_COMPONENT,
  SM_COMPONENT_ORDER,
  SM_ENTRY_KIND,
  KNOWLEDGE_TRUST,
  ONTOLOGY_RELATION,
  RULE_DOMAIN,
  SM_OPERATION,
  SM_FORBIDDEN_ACTIVITIES,
  SM_RUNTIME_ANCHORS,
  createConcept,
  createKnowledgeEntry,
  createRule,
  validateFact,
  createSemanticMemoryStore,
  createSemanticApiResponse,
  assertSemanticForbiddenActivity
};
