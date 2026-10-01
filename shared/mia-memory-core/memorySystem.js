"use strict";

/**
 * Master Canon 0019 — Memory System: types, lifecycle, score, graph, search, API.
 */

const crypto = require("crypto");

const MEMORY_COMPONENT = Object.freeze({
  WORKING_MEMORY: "working_memory",
  SHORT_TERM_MEMORY: "short_term_memory",
  LONG_TERM_MEMORY: "long_term_memory",
  EPISODIC_MEMORY: "episodic_memory",
  SEMANTIC_MEMORY: "semantic_memory",
  PROCEDURAL_MEMORY: "procedural_memory",
  EMOTIONAL_MEMORY: "emotional_memory",
  CONTEXT_MANAGER: "context_manager",
  KNOWLEDGE_GRAPH: "knowledge_graph",
  MEMORY_INDEX: "memory_index",
  MEMORY_SEARCH: "memory_search",
  MEMORY_CONSOLIDATOR: "memory_consolidator",
  MEMORY_CLEANER: "memory_cleaner",
  MEMORY_BACKUP: "memory_backup",
  MEMORY_API: "memory_api"
});

const MEMORY_COMPONENT_ORDER = Object.freeze(Object.values(MEMORY_COMPONENT));

const MEMORY_TYPE = Object.freeze({
  WORKING: "working",
  SHORT_TERM: "short_term",
  LONG_TERM: "long_term",
  EPISODIC: "episodic",
  SEMANTIC: "semantic",
  PROCEDURAL: "procedural",
  EMOTIONAL: "emotional"
});

const MEMORY_LIFECYCLE = Object.freeze({
  CREATED: "created",
  WORKING: "working",
  SHORT_TERM: "short_term",
  EVALUATION: "evaluation",
  LONG_TERM: "long_term",
  ARCHIVE: "archive",
  DELETION: "deletion"
});

const MEMORY_LIFECYCLE_ORDER = Object.freeze([
  MEMORY_LIFECYCLE.CREATED,
  MEMORY_LIFECYCLE.WORKING,
  MEMORY_LIFECYCLE.SHORT_TERM,
  MEMORY_LIFECYCLE.EVALUATION,
  MEMORY_LIFECYCLE.LONG_TERM,
  MEMORY_LIFECYCLE.ARCHIVE,
  MEMORY_LIFECYCLE.DELETION
]);

const MEMORY_RETENTION = Object.freeze({
  EPHEMERAL: "ephemeral",
  SESSION: "session",
  DAYS_7: "days_7",
  DAYS_30: "days_30",
  PERMANENT: "permanent"
});

const MEMORY_FORBIDDEN_ACTIVITIES = Object.freeze([
  "control_ai_directly",
  "decide_for_decision_engine",
  "mutate_economy",
  "mutate_graphics",
  "bypass_permissions"
]);

const MEMORY_INTEGRATION_SYSTEM = Object.freeze({
  AI: "ai",
  KOJNOZROUT: "kojnozout",
  GIFT_ENGINE: "gift_engine",
  ECONOMY: "economy",
  OVERLAY: "overlay",
  OBS: "obs",
  ANALYTICS: "analytics",
  MODERATION: "moderation",
  GRAPHICS_EDITOR: "graphics_editor"
});

const MEMORY_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-memory-core/memorySystem.js",
  "scripts/MIA_SESSION_MEMORY.js",
  "scripts/MIA_STORY_MEMORY.js",
  "data/mia-session-memory.json",
  "data/story-memory.json"
]);

function isMemoryType(value) {
  return typeof value === "string" && Object.values(MEMORY_TYPE).includes(value);
}

function isMemoryLifecycle(value) {
  return typeof value === "string" && Object.values(MEMORY_LIFECYCLE).includes(value);
}

function createMemoryContext(input = {}) {
  return Object.freeze({
    streamId: input.streamId != null ? String(input.streamId) : null,
    sessionId: input.sessionId != null ? String(input.sessionId) : null,
    userId: input.userId != null ? String(input.userId) : null,
    platform: input.platform != null ? String(input.platform) : null,
    topic: input.topic != null ? String(input.topic) : null,
    relatedEntities: Object.freeze(
      Array.isArray(input.relatedEntities) ? input.relatedEntities.map(String) : []
    ),
    outcome: input.outcome != null ? String(input.outcome) : null
  });
}

function createMemoryRecord(input = {}) {
  const what = String(input.what || "").trim();
  if (!what) throw new Error("what is required");

  const when = input.when != null ? Number(input.when) : Date.now();
  const why = String(input.why || "").trim();
  if (!why) throw new Error("why is required");

  const retention = Object.values(MEMORY_RETENTION).includes(input.retention)
    ? input.retention
    : MEMORY_RETENTION.SESSION;

  const memoryType = isMemoryType(input.memoryType) ? input.memoryType : MEMORY_TYPE.SHORT_TERM;
  const lifecycle = isMemoryLifecycle(input.lifecycle)
    ? input.lifecycle
    : MEMORY_LIFECYCLE.CREATED;

  return Object.freeze({
    memoryId:
      typeof input.memoryId === "string" && input.memoryId.trim()
        ? input.memoryId.trim()
        : `memory-${crypto.randomUUID()}`,
    what,
    when,
    why,
    retention,
    memoryType,
    lifecycle,
    context: createMemoryContext(input.context || {}),
    score: input.score != null ? Number(input.score) : null,
    links: Object.freeze(Array.isArray(input.links) ? input.links.map(String) : [])
  });
}

function validateMemoryRecord(record = {}) {
  const errors = [];
  if (!String(record.what || "").trim()) errors.push("missing_what");
  if (!Number.isFinite(record.when)) errors.push("missing_when");
  if (!String(record.why || "").trim()) errors.push("missing_why");
  if (!Object.values(MEMORY_RETENTION).includes(record.retention)) errors.push("missing_retention");
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

function computeMemoryScore(record = {}, options = {}) {
  const importance = Number.isFinite(options.importance) ? options.importance : 0.5;
  const usageCount = Number.isFinite(options.usageCount) ? options.usageCount : 0;
  const ageMs = options.now != null ? Number(options.now) - Number(record.when) : 0;
  const linkCount = Array.isArray(record.links) ? record.links.length : 0;

  const ageFactor = ageMs > 0 ? Math.max(0, 1 - ageMs / (30 * 24 * 60 * 60 * 1000)) : 1;
  const usageFactor = Math.min(1, usageCount / 10);
  const linkFactor = Math.min(1, linkCount / 5);

  const score = importance * 0.4 + usageFactor * 0.25 + ageFactor * 0.15 + linkFactor * 0.2;

  return Object.freeze({
    score: Math.round(score * 1000) / 1000,
    importance,
    usageCount,
    linkCount,
    ageMs
  });
}

function transitionMemoryLifecycle(record, nextLifecycle) {
  if (!isMemoryLifecycle(nextLifecycle)) {
    throw new Error(`invalid lifecycle: ${nextLifecycle}`);
  }

  const currentIdx = MEMORY_LIFECYCLE_ORDER.indexOf(record.lifecycle);
  const nextIdx = MEMORY_LIFECYCLE_ORDER.indexOf(nextLifecycle);
  if (currentIdx < 0 || nextIdx < currentIdx) {
    throw new Error("invalid lifecycle transition");
  }

  return Object.freeze({
    ...record,
    lifecycle: nextLifecycle
  });
}

function createKnowledgeGraphNode(input = {}) {
  const nodeId = String(input.nodeId || "").trim();
  const label = String(input.label || "").trim();
  if (!nodeId || !label) throw new Error("nodeId and label are required");

  return Object.freeze({
    nodeId,
    label,
    kind: String(input.kind || "entity")
  });
}

function createKnowledgeGraphEdge(input = {}) {
  const from = String(input.from || "").trim();
  const to = String(input.to || "").trim();
  const relation = String(input.relation || "").trim();
  if (!from || !to || !relation) {
    throw new Error("from, to and relation are required");
  }

  return Object.freeze({ from, to, relation });
}

function createKnowledgeGraph() {
  const nodes = new Map();
  const edges = [];

  return {
    addNode(node) {
      nodes.set(node.nodeId, node);
      return node;
    },
    addEdge(edge) {
      edges.push(edge);
      return edge;
    },
    getNode(nodeId) {
      return nodes.get(String(nodeId)) || null;
    },
    listEdges(from = null) {
      if (from == null) return [...edges];
      return edges.filter((e) => e.from === from);
    },
    snapshot() {
      return Object.freeze({
        nodes: Object.freeze(Array.from(nodes.values())),
        edges: Object.freeze([...edges])
      });
    }
  };
}

function createMemoryIndex() {
  const byId = new Map();
  const byType = new Map();

  function bucket(map, key, memoryId) {
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(memoryId);
  }

  return {
    add(record) {
      byId.set(record.memoryId, record);
      bucket(byType, record.memoryType, record.memoryId);
      if (record.context?.userId) bucket(byType, `user:${record.context.userId}`, record.memoryId);
      if (record.context?.topic) bucket(byType, `topic:${record.context.topic}`, record.memoryId);
      return record;
    },
    get(memoryId) {
      return byId.get(String(memoryId)) || null;
    },
    listByType(memoryType) {
      const ids = byType.get(memoryType);
      if (!ids) return [];
      return Array.from(ids).map((id) => byId.get(id)).filter(Boolean);
    },
    all() {
      return Array.from(byId.values());
    }
  };
}

function searchMemories(index, query = {}) {
  const all = index.all();
  const now = query.now != null ? Number(query.now) : Date.now();
  const topic = query.topic != null ? String(query.topic).toLowerCase() : null;
  const userId = query.userId != null ? String(query.userId) : null;
  const memoryType = query.memoryType;
  const since = query.since != null ? Number(query.since) : null;
  const minScore = query.minScore != null ? Number(query.minScore) : null;

  let results = all.filter((record) => {
    if (memoryType && record.memoryType !== memoryType) return false;
    if (since != null && record.when < since) return false;
    if (userId && record.context?.userId !== userId) return false;
    if (topic) {
      const hay = `${record.what} ${record.why} ${record.context?.topic || ""}`.toLowerCase();
      if (!hay.includes(topic)) return false;
    }
    return true;
  });

  results = results.map((record) => {
    const scored = computeMemoryScore(record, {
      importance: record.score != null ? record.score : 0.5,
      usageCount: query.usageCount || 0,
      now
    });
    return Object.freeze({ ...record, relevance: scored.score });
  });

  if (minScore != null) {
    results = results.filter((r) => r.relevance >= minScore);
  }

  results.sort((a, b) => b.relevance - a.relevance || b.when - a.when);
  return Object.freeze(results);
}

function consolidateMemories(records = [], options = {}) {
  const threshold = options.similarityThreshold != null ? options.similarityThreshold : 0.8;
  const groups = [];
  const used = new Set();

  for (let i = 0; i < records.length; i += 1) {
    if (used.has(i)) continue;
    const group = [records[i]];
    used.add(i);
    for (let j = i + 1; j < records.length; j += 1) {
      if (used.has(j)) continue;
      const a = String(records[i].what || "").toLowerCase();
      const b = String(records[j].what || "").toLowerCase();
      if (a === b || (a.length > 10 && b.includes(a.slice(0, 10)))) {
        group.push(records[j]);
        used.add(j);
      }
    }
    groups.push(group);
  }

  const consolidated = groups.map((group) => {
    if (group.length === 1) return group[0];
    const base = group[0];
    return createMemoryRecord({
      memoryId: base.memoryId,
      what: base.what,
      when: Math.max(...group.map((g) => g.when)),
      why: `consolidated:${group.length}`,
      retention: base.retention,
      memoryType: base.memoryType,
      lifecycle: MEMORY_LIFECYCLE.LONG_TERM,
      context: base.context,
      links: group.flatMap((g) => g.links || [])
    });
  });

  const mergedCount = records.length - consolidated.length;
  return Object.freeze({
    consolidated: Object.freeze(consolidated),
    mergedCount,
    threshold
  });
}

function shouldForget(record = {}, options = {}) {
  const now = options.now != null ? Number(options.now) : Date.now();
  const scored = computeMemoryScore(record, options);
  const minScore = options.minScore != null ? options.minScore : 0.15;

  if (record.retention === MEMORY_RETENTION.PERMANENT) {
    return Object.freeze({ forget: false, reason: "permanent" });
  }

  if (scored.score < minScore) {
    return Object.freeze({ forget: true, reason: "low_score", score: scored.score });
  }

  const maxAge = {
    [MEMORY_RETENTION.EPHEMERAL]: 60 * 1000,
    [MEMORY_RETENTION.SESSION]: 6 * 60 * 60 * 1000,
    [MEMORY_RETENTION.DAYS_7]: 7 * 24 * 60 * 60 * 1000,
    [MEMORY_RETENTION.DAYS_30]: 30 * 24 * 60 * 60 * 1000
  }[record.retention];

  if (maxAge != null && now - record.when > maxAge && scored.score < 0.4) {
    return Object.freeze({ forget: true, reason: "expired", score: scored.score });
  }

  return Object.freeze({ forget: false, reason: "retain", score: scored.score });
}

function createMemoryBackup(snapshot = {}) {
  return Object.freeze({
    backupId: `backup-${crypto.randomUUID()}`,
    createdAt: Date.now(),
    memories: Object.freeze(Array.isArray(snapshot.memories) ? snapshot.memories : []),
    graph: snapshot.graph || null,
    readOnly: true
  });
}

function restoreMemoryBackup(backup = {}, index) {
  if (!backup || !Array.isArray(backup.memories)) {
    throw new Error("invalid backup");
  }
  const restored = [];
  for (const raw of backup.memories) {
    const validation = validateMemoryRecord(raw);
    if (!validation.ok) continue;
    const record = createMemoryRecord(raw);
    if (index) index.add(record);
    restored.push(record);
  }
  return Object.freeze({
    restoredCount: restored.length,
    backupId: backup.backupId,
    memories: Object.freeze(restored)
  });
}

function createMemoryApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    readOnly: options.readOnly !== false,
    write: options.write === true,
    data,
    component: MEMORY_COMPONENT.MEMORY_API
  });
}

function assertMemoryForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !MEMORY_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

module.exports = {
  MEMORY_COMPONENT,
  MEMORY_COMPONENT_ORDER,
  MEMORY_TYPE,
  MEMORY_LIFECYCLE,
  MEMORY_LIFECYCLE_ORDER,
  MEMORY_RETENTION,
  MEMORY_FORBIDDEN_ACTIVITIES,
  MEMORY_INTEGRATION_SYSTEM,
  MEMORY_RUNTIME_ANCHORS,
  isMemoryType,
  isMemoryLifecycle,
  createMemoryContext,
  createMemoryRecord,
  validateMemoryRecord,
  computeMemoryScore,
  transitionMemoryLifecycle,
  createKnowledgeGraphNode,
  createKnowledgeGraphEdge,
  createKnowledgeGraph,
  createMemoryIndex,
  searchMemories,
  consolidateMemories,
  shouldForget,
  createMemoryBackup,
  restoreMemoryBackup,
  createMemoryApiResponse,
  assertMemoryForbiddenActivity
};
