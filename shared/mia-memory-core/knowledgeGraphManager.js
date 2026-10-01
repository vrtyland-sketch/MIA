"use strict";

/**
 * Master Canon 0027 — Knowledge Graph: entities, relationships, reasoning.
 */

const crypto = require("crypto");
const { createKnowledgeGraph } = require("./memorySystem");

const KG_COMPONENT = Object.freeze({
  ENTITY_MANAGER: "entity_manager",
  RELATIONSHIP_MANAGER: "relationship_manager",
  GRAPH_DATABASE: "graph_database",
  GRAPH_INDEX: "graph_index",
  GRAPH_SEARCH: "graph_search",
  GRAPH_REASONER: "graph_reasoner",
  GRAPH_OPTIMIZER: "graph_optimizer",
  GRAPH_VALIDATOR: "graph_validator",
  GRAPH_VERSIONING: "graph_versioning",
  GRAPH_ANALYTICS: "graph_analytics",
  GRAPH_VISUALIZER: "graph_visualizer",
  GRAPH_API: "graph_api"
});

const KG_COMPONENT_ORDER = Object.freeze(Object.values(KG_COMPONENT));

const KG_ENTITY_KIND = Object.freeze({
  PERSON: "person",
  AI_ENTITY: "ai_entity",
  OBJECT: "object",
  EVENT: "event",
  CONCEPT: "concept",
  SYSTEM: "system"
});

const KG_RELATION_TYPE = Object.freeze({
  IS: "is",
  CONTAINS: "contains",
  USES: "uses",
  OWNS: "owns",
  CREATED: "created",
  RECEIVED: "received",
  BELONGS_TO: "belongs_to",
  COLLABORATES: "collaborates",
  INFLUENCES: "influences",
  DERIVED_FROM: "derived_from"
});

const KG_ENTITY_STATUS = Object.freeze({
  ACTIVE: "active",
  ARCHIVED: "archived",
  PROPOSED: "proposed"
});

const KG_OPERATION = Object.freeze({
  PUT_ENTITY: "put_entity",
  PUT_RELATION: "put_relation",
  GET: "get",
  SEARCH: "search",
  REASON: "reason",
  VALIDATE: "validate",
  VERSION: "version",
  ANALYZE: "analyze",
  VISUALIZE: "visualize"
});

const KG_FORBIDDEN_ACTIVITIES = Object.freeze([
  "store_binary_data",
  "replace_log_database",
  "mutate_business_logic",
  "create_unverified_relations",
  "break_consistency"
]);

const KG_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-memory-core/knowledgeGraphManager.js",
  "shared/mia-memory-core/memorySystem.js",
  "shared/mia-memory-core/longTermMemory.js"
]);

const WEIGHT_MIN = 0;
const WEIGHT_MAX = 1;

function clampWeight(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(WEIGHT_MIN, Math.min(WEIGHT_MAX, n));
}

function createGraphEntity(input = {}) {
  const graphId = String(input.graphId || input.nodeId || "").trim() || `entity-${crypto.randomUUID()}`;
  const name = String(input.name || input.label || "").trim();
  if (!name) throw new Error("entity name is required");

  const kind = Object.values(KG_ENTITY_KIND).includes(input.kind)
    ? input.kind
    : KG_ENTITY_KIND.OBJECT;

  const now = Date.now();
  return Object.freeze({
    graphId,
    kind,
    name,
    createdAt: input.createdAt != null ? Number(input.createdAt) : now,
    updatedAt: input.updatedAt != null ? Number(input.updatedAt) : now,
    version: input.version != null ? Number(input.version) : 1,
    owner: input.owner ? String(input.owner) : null,
    status: Object.values(KG_ENTITY_STATUS).includes(input.status)
      ? input.status
      : KG_ENTITY_STATUS.ACTIVE,
    metadata: Object.freeze(input.metadata || {}),
    auditId: `entity-audit-${crypto.randomUUID()}`
  });
}

function createGraphRelationship(input = {}) {
  const from = String(input.from || input.source || "").trim();
  const to = String(input.to || input.target || "").trim();
  if (!from || !to) throw new Error("relationship source and target are required");

  const type = Object.values(KG_RELATION_TYPE).includes(input.type || input.relation)
    ? input.type || input.relation
    : KG_RELATION_TYPE.IS;

  if (input.verified === false && !input.proposed) {
    throw new Error("unverified relations must be marked as proposed");
  }

  return Object.freeze({
    relationId: input.relationId || `rel-${crypto.randomUUID()}`,
    type,
    from,
    to,
    weight: clampWeight(input.weight != null ? input.weight : 0.5),
    createdAt: input.createdAt != null ? Number(input.createdAt) : Date.now(),
    version: input.version != null ? Number(input.version) : 1,
    trust: clampWeight(input.trust != null ? input.trust : 0.8),
    proposed: input.proposed === true,
    auditId: `relation-audit-${crypto.randomUUID()}`
  });
}

function validateGraphChange(storeState = {}, change = {}) {
  const errors = [];
  const entity = change.entity || null;
  const relationship = change.relationship || null;
  const entities = storeState.entities || new Map();
  const relationships = storeState.relationships || [];

  if (entity) {
    const dup = entities.get(entity.graphId);
    if (dup && dup.graphId !== change.existingId) errors.push("duplicate_entity");
  }

  if (relationship) {
    if (!entities.has(relationship.from) && relationship.from !== relationship.to) {
      errors.push("missing_source_entity");
    }
    if (!entities.has(relationship.to)) {
      errors.push("missing_target_entity");
    }

    const duplicate = relationships.find(
      (r) =>
        r.from === relationship.from &&
        r.to === relationship.to &&
        r.type === relationship.type &&
        r.relationId !== relationship.relationId
    );
    if (duplicate) errors.push("duplicate_relation");

    if (
      relationship.type === KG_RELATION_TYPE.IS &&
      relationship.from === relationship.to
    ) {
      errors.push("invalid_self_is_relation");
    }
  }

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    component: KG_COMPONENT.GRAPH_VALIDATOR
  });
}

function optimizeGraphSnapshot(snapshot = {}) {
  const nodes = Array.isArray(snapshot.nodes) ? snapshot.nodes : [];
  const edges = Array.isArray(snapshot.edges) ? snapshot.edges : [];
  const nodeIds = new Set(nodes.map((n) => n.graphId || n.nodeId));
  const prunedEdges = edges.filter(
    (e) => nodeIds.has(e.from) && nodeIds.has(e.to)
  );

  return Object.freeze({
    nodes: Object.freeze(nodes),
    edges: Object.freeze(prunedEdges),
    prunedCount: edges.length - prunedEdges.length,
    component: KG_COMPONENT.GRAPH_OPTIMIZER
  });
}

function createKnowledgeGraphStore(input = {}) {
  const entities = new Map();
  const relationships = [];
  const index = new Map();
  const versions = [];
  let graphVersion = input.version != null ? Number(input.version) : 1;
  const baseGraph = createKnowledgeGraph();

  function indexEntity(entity) {
    const keys = new Set([
      entity.graphId.toLowerCase(),
      entity.name.toLowerCase(),
      entity.kind
    ]);
    for (const key of keys) {
      const bucket = index.get(key) || [];
      if (!bucket.includes(entity.graphId)) bucket.push(entity.graphId);
      index.set(key, bucket);
    }
  }

  function snapshot() {
    return Object.freeze({
      version: graphVersion,
      nodes: Object.freeze(Array.from(entities.values())),
      edges: Object.freeze([...relationships])
    });
  }

  function putEntity(entityInput = {}) {
    const entity = createGraphEntity(entityInput);
    const validation = validateGraphChange({ entities, relationships }, { entity });
    if (!validation.ok) {
      return Object.freeze({ ok: false, validation, error: "validation_failed" });
    }

    entities.set(entity.graphId, entity);
    indexEntity(entity);
    baseGraph.addNode({
      nodeId: entity.graphId,
      label: entity.name,
      kind: entity.kind
    });

    return Object.freeze({
      ok: true,
      entity,
      operation: KG_OPERATION.PUT_ENTITY,
      component: KG_COMPONENT.ENTITY_MANAGER
    });
  }

  function putRelationship(relInput = {}) {
    const relationship = createGraphRelationship({
      ...relInput,
      trust:
        relInput.proposed && relInput.trust == null ? 0.4 : relInput.trust
    });

    const validation = validateGraphChange({ entities, relationships }, { relationship });
    if (!validation.ok) {
      return Object.freeze({ ok: false, validation, error: "validation_failed" });
    }

    relationships.push(relationship);
    baseGraph.addEdge({
      from: relationship.from,
      to: relationship.to,
      relation: relationship.type
    });

    return Object.freeze({
      ok: true,
      relationship,
      operation: KG_OPERATION.PUT_RELATION,
      component: KG_COMPONENT.RELATIONSHIP_MANAGER
    });
  }

  return {
    putEntity,
    putRelationship,
    getEntity(graphId) {
      const entity = entities.get(String(graphId));
      if (!entity) return Object.freeze({ ok: false, error: "not_found" });
      return Object.freeze({ ok: true, entity, operation: KG_OPERATION.GET });
    },
    listEntities(kind = null) {
      const all = Array.from(entities.values());
      return kind ? all.filter((e) => e.kind === kind) : all;
    },
    listRelationships(from = null, type = null) {
      let result = [...relationships];
      if (from) result = result.filter((r) => r.from === String(from));
      if (type) result = result.filter((r) => r.type === type);
      return Object.freeze(result);
    },
    search(query = {}) {
      const q = String(query.q || query.name || "").toLowerCase();
      const kind = query.kind || null;
      const relationType = query.relationType || null;
      const fromId = query.from || null;
      const owner = query.owner || null;

      let entityResults = Array.from(entities.values());
      if (q) {
        const ids = index.get(q) || [];
        entityResults =
          ids.length > 0
            ? ids.map((id) => entities.get(id)).filter(Boolean)
            : entityResults.filter((e) => e.name.toLowerCase().includes(q));
      }
      if (kind) entityResults = entityResults.filter((e) => e.kind === kind);
      if (owner) entityResults = entityResults.filter((e) => e.owner === owner);

      let relationResults = [...relationships];
      if (relationType) {
        relationResults = relationResults.filter((r) => r.type === relationType);
      }
      if (fromId) {
        relationResults = relationResults.filter((r) => r.from === String(fromId));
      }
      if (query.to) {
        relationResults = relationResults.filter((r) => r.to === String(query.to));
      }

      return Object.freeze({
        ok: true,
        entities: Object.freeze(entityResults),
        relationships: Object.freeze(relationResults),
        count: entityResults.length,
        operation: KG_OPERATION.SEARCH,
        component: KG_COMPONENT.GRAPH_SEARCH
      });
    },
    reason(startId, rules = {}) {
      const start = String(startId);
      const maxDepth = rules.maxDepth != null ? Number(rules.maxDepth) : 4;
      const inferred = [];
      const visited = new Set();

      function walk(nodeId, depth, path) {
        if (depth > maxDepth || visited.has(`${nodeId}:${depth}`)) return;
        visited.add(`${nodeId}:${depth}`);

        const outgoing = relationships.filter((r) => r.from === nodeId && !r.proposed);
        for (const edge of outgoing) {
          const nextPath = [...path, edge];
          const target = entities.get(edge.to);
          if (!target) continue;

          if (
            rules.inferContainsProject &&
            edge.type === KG_RELATION_TYPE.CREATED &&
            nextPath.some((e) => e.type === KG_RELATION_TYPE.CONTAINS)
          ) {
            inferred.push(
              Object.freeze({
                conclusion: `${target.name} is connected to ${entities.get(start)?.name || start} project chain`,
                path: Object.freeze(nextPath.map((e) => e.relationId)),
                confidence: Math.min(...nextPath.map((e) => e.trust))
              })
            );
          }

          if (edge.type === KG_RELATION_TYPE.CONTAINS && rules.expandContains !== false) {
            inferred.push(
              Object.freeze({
                conclusion: `${entities.get(start)?.name || start} contains ${target.name}`,
                path: Object.freeze(nextPath.map((e) => e.relationId)),
                confidence: edge.trust
              })
            );
          }

          walk(edge.to, depth + 1, nextPath);
        }
      }

      walk(start, 0, []);
      return Object.freeze({
        ok: true,
        startId: start,
        inferred: Object.freeze(inferred),
        operation: KG_OPERATION.REASON,
        component: KG_COMPONENT.GRAPH_REASONER
      });
    },
    validate(change = {}) {
      return validateGraphChange({ entities, relationships }, change);
    },
    version(label = "snapshot") {
      const snap = snapshot();
      versions.push(
        Object.freeze({
          version: graphVersion,
          label,
          snapshot: snap,
          createdAt: Date.now()
        })
      );
      graphVersion += 1;
      return Object.freeze({
        ok: true,
        version: graphVersion - 1,
        nextVersion: graphVersion,
        operation: KG_OPERATION.VERSION,
        component: KG_COMPONENT.GRAPH_VERSIONING
      });
    },
    restore(versionNumber) {
      const found = versions.find((v) => v.version === Number(versionNumber));
      if (!found) return Object.freeze({ ok: false, error: "version_not_found" });

      entities.clear();
      relationships.length = 0;
      index.clear();

      for (const node of found.snapshot.nodes) {
        entities.set(node.graphId, node);
        indexEntity(node);
      }
      for (const edge of found.snapshot.edges) {
        relationships.push(edge);
      }

      graphVersion = found.version;
      return Object.freeze({
        ok: true,
        restoredVersion: found.version,
        operation: KG_OPERATION.VERSION
      });
    },
    analyze() {
      const degree = new Map();
      for (const edge of relationships) {
        degree.set(edge.from, (degree.get(edge.from) || 0) + 1);
        degree.set(edge.to, (degree.get(edge.to) || 0) + 1);
      }

      const ranked = Array.from(degree.entries())
        .map(([graphId, count]) => ({
          graphId,
          entity: entities.get(graphId) || null,
          degree: count
        }))
        .sort((a, b) => b.degree - a.degree);

      const relationCounts = {};
      for (const edge of relationships) {
        relationCounts[edge.type] = (relationCounts[edge.type] || 0) + 1;
      }

      const density =
        entities.size > 1
          ? relationships.length / (entities.size * (entities.size - 1))
          : 0;

      return Object.freeze({
        ok: true,
        topEntities: Object.freeze(ranked.slice(0, 5)),
        relationCounts: Object.freeze(relationCounts),
        density: Math.round(density * 1000) / 1000,
        nodeCount: entities.size,
        edgeCount: relationships.length,
        operation: KG_OPERATION.ANALYZE,
        component: KG_COMPONENT.GRAPH_ANALYTICS
      });
    },
    visualize(rootId = null) {
      const root = rootId ? String(rootId) : Array.from(entities.keys())[0];
      const lines = [];
      const visited = new Set();

      function render(nodeId, depth) {
        if (!nodeId || visited.has(nodeId) || depth > 6) return;
        visited.add(nodeId);
        const entity = entities.get(nodeId);
        lines.push(`${"  ".repeat(depth)}${entity ? entity.name : nodeId}`);
        const outgoing = relationships.filter((r) => r.from === nodeId);
        for (const edge of outgoing) {
          render(edge.to, depth + 1);
        }
      }

      render(root, 0);
      return Object.freeze({
        ok: true,
        rootId: root,
        lines: Object.freeze(lines),
        operation: KG_OPERATION.VISUALIZE,
        component: KG_COMPONENT.GRAPH_VISUALIZER
      });
    },
    optimize() {
      const optimized = optimizeGraphSnapshot(snapshot());
      return Object.freeze({ ok: true, optimized });
    },
    snapshot,
    indexSnapshot() {
      return Object.freeze(
        Array.from(index.entries()).map(([key, ids]) =>
          Object.freeze({ key, graphIds: Object.freeze(ids) })
        )
      );
    },
    legacyGraph: () => baseGraph.snapshot()
  };
}

function createGraphApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    readOnly: options.readOnly !== false,
    data,
    component: KG_COMPONENT.GRAPH_API
  });
}

function assertGraphForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !KG_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

module.exports = {
  KG_COMPONENT,
  KG_COMPONENT_ORDER,
  KG_ENTITY_KIND,
  KG_RELATION_TYPE,
  KG_ENTITY_STATUS,
  KG_OPERATION,
  KG_FORBIDDEN_ACTIVITIES,
  WEIGHT_MIN,
  WEIGHT_MAX,
  KG_RUNTIME_ANCHORS,
  createGraphEntity,
  createGraphRelationship,
  validateGraphChange,
  optimizeGraphSnapshot,
  createKnowledgeGraphStore,
  createGraphApiResponse,
  assertGraphForbiddenActivity
};
