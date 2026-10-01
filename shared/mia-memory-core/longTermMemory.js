"use strict";

/**
 * Master Canon 0022 — Long-Term Memory: users, streams, relationships, consolidation.
 */

const crypto = require("crypto");
const {
  createMemoryRecord,
  validateMemoryRecord,
  computeMemoryScore,
  consolidateMemories,
  createKnowledgeGraph,
  createKnowledgeGraphNode,
  createKnowledgeGraphEdge,
  createMemoryBackup,
  MEMORY_TYPE,
  MEMORY_LIFECYCLE,
  MEMORY_RETENTION
} = require("./memorySystem");

const LTM_COMPONENT = Object.freeze({
  USER_MEMORY: "user_memory",
  STREAM_MEMORY: "stream_memory",
  RELATIONSHIP_MEMORY: "relationship_memory",
  PROJECT_MEMORY: "project_memory",
  WORLD_KNOWLEDGE: "world_knowledge",
  PERSONALITY_MEMORY: "personality_memory",
  KOJNOZROUT_MEMORY: "kojnozout_memory",
  SKILL_MEMORY: "skill_memory",
  DECISION_HISTORY: "decision_history",
  EXPERIENCE_LIBRARY: "experience_library",
  MEMORY_ARCHIVE: "memory_archive",
  MEMORY_BACKUP: "memory_backup",
  KNOWLEDGE_GRAPH: "knowledge_graph",
  LTM_API: "ltm_api"
});

const LTM_COMPONENT_ORDER = Object.freeze(Object.values(LTM_COMPONENT));

const LTM_ENTRY_KIND = Object.freeze({
  USER: "user",
  STREAM: "stream",
  RELATIONSHIP: "relationship",
  PROJECT: "project",
  WORLD: "world",
  PERSONALITY: "personality",
  KOJNOZROUT: "kojnozout",
  SKILL: "skill",
  DECISION: "decision",
  EXPERIENCE: "experience"
});

const LTM_OPERATION = Object.freeze({
  PUT: "put",
  GET: "get",
  ARCHIVE: "archive",
  CONSOLIDATE: "consolidate",
  BACKUP: "backup",
  RESTORE: "restore"
});

const LTM_FORBIDDEN_ACTIVITIES = Object.freeze([
  "store_every_detail",
  "replace_database",
  "bypass_permissions",
  "mutate_history_without_audit",
  "store_corrupted_data"
]);

const CRITICAL_LTM_KINDS = Object.freeze([
  LTM_ENTRY_KIND.PROJECT,
  LTM_ENTRY_KIND.WORLD,
  LTM_ENTRY_KIND.PERSONALITY
]);

const LTM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-memory-core/longTermMemory.js",
  "shared/mia-memory-core/shortTermMemory.js",
  "data/story-memory.json",
  "data/mia-session-memory.json"
]);

function evaluateForLongTermRetention(candidate = {}, options = {}) {
  const importance =
    options.importance != null
      ? options.importance
      : candidate.importance != null
        ? candidate.importance
        : candidate.record?.score != null
          ? Number(candidate.record.score)
          : 0.6;

  const score = computeMemoryScore(
    {
      what: candidate.what || candidate.summary || candidate.record?.what || "",
      when: candidate.when || candidate.record?.when || Date.now(),
      why: candidate.why || candidate.record?.why || "ltm_evaluation",
      links: candidate.links || candidate.record?.links || []
    },
    {
      importance,
      usageCount: options.usageCount || 0,
      now: options.now
    }
  );

  const minScore = options.minScore != null ? options.minScore : 0.45;
  const durable =
    candidate.retention === MEMORY_RETENTION.PERMANENT ||
    candidate.retention === MEMORY_RETENTION.DAYS_30 ||
    importance >= 0.75 ||
    score.score >= minScore;

  return Object.freeze({
    accepted: durable,
    score: score.score,
    reason: durable ? "long_term_value" : "insufficient_value"
  });
}

function createLtmEntry(input = {}) {
  const evaluation = evaluateForLongTermRetention(input, input.evaluation || {});
  if (!evaluation.accepted && !input.force) {
    throw new Error("entry does not meet long-term retention criteria");
  }

  const kind = Object.values(LTM_ENTRY_KIND).includes(input.kind)
    ? input.kind
    : LTM_ENTRY_KIND.EXPERIENCE;

  const record = createMemoryRecord({
    what: String(input.what || input.summary || "").trim(),
    why: String(input.why || "long_term_memory"),
    when: input.when != null ? Number(input.when) : Date.now(),
    retention: MEMORY_RETENTION.PERMANENT,
    memoryType: MEMORY_TYPE.LONG_TERM,
    lifecycle: MEMORY_LIFECYCLE.LONG_TERM,
    context: input.context || {},
    score: evaluation.score
  });

  const validation = validateMemoryRecord(record);
  if (!validation.ok) throw new Error(`invalid ltm record: ${validation.errors.join(",")}`);

  return Object.freeze({
    entryId:
      typeof input.entryId === "string" && input.entryId.trim()
        ? input.entryId.trim()
        : `ltm-${crypto.randomUUID()}`,
    kind,
    record,
    data: Object.freeze({ ...(input.data || {}) }),
    archived: false,
    auditId: `ltm-audit-${crypto.randomUUID()}`,
    createdAt: record.when
  });
}

function createLongTermMemoryStore(input = {}) {
  const entries = new Map();
  const archive = [];
  const graph = createKnowledgeGraph();

  function put(entryInput = {}) {
    const entry = createLtmEntry(entryInput);
    entries.set(entry.entryId, entry);
    if (entryInput.graphNode) {
      graph.addNode(createKnowledgeGraphNode(entryInput.graphNode));
    }
    if (entryInput.graphEdge && entryInput.graphEdge.to) {
      graph.addEdge(createKnowledgeGraphEdge(entryInput.graphEdge));
    }
    return Object.freeze({ ok: true, entry, operation: LTM_OPERATION.PUT });
  }

  function get(entryId) {
    const entry = entries.get(String(entryId));
    if (!entry || entry.archived) return Object.freeze({ ok: false, error: "not_found" });
    return Object.freeze({ ok: true, entry, operation: LTM_OPERATION.GET });
  }

  return {
    put,
    get,
    list(kind = null) {
      const all = Array.from(entries.values()).filter((e) => !e.archived);
      return kind ? all.filter((e) => e.kind === kind) : all;
    },
    archive(entryId, reason = "archived") {
      const entry = entries.get(String(entryId));
      if (!entry) return Object.freeze({ ok: false, error: "not_found" });
      if (CRITICAL_LTM_KINDS.includes(entry.kind) && !input.allowCriticalArchive) {
        return Object.freeze({ ok: false, error: "critical_kind_protected" });
      }
      const archivedEntry = Object.freeze({
        ...entry,
        archived: true,
        archivedAt: Date.now(),
        archiveReason: reason
      });
      entries.delete(entry.entryId);
      archive.push(archivedEntry);
      return Object.freeze({ ok: true, entry: archivedEntry, operation: LTM_OPERATION.ARCHIVE });
    },
    graph: () => graph.snapshot(),
    backup() {
      const snapshot = {
        memories: this.list().map((e) => ({ ...e })),
        graph: graph.snapshot()
      };
      return createMemoryBackup(snapshot);
    },
    restore(backup) {
      if (!backup || !Array.isArray(backup.memories)) {
        throw new Error("invalid ltm backup");
      }
      entries.clear();
      archive.length = 0;
      let restoredCount = 0;
      for (const raw of backup.memories) {
        if (!raw?.entryId || !raw?.record) continue;
        entries.set(raw.entryId, Object.freeze({ ...raw, archived: false }));
        restoredCount += 1;
      }
      return Object.freeze({
        restoredCount,
        backupId: backup.backupId,
        operation: LTM_OPERATION.RESTORE
      });
    }
  };
}

function upsertUserProfile(store, userId, patch = {}) {
  const key = `user:${userId}`;
  const existing = store.list(LTM_ENTRY_KIND.USER).find((e) => e.data?.userId === userId);
  return store.put({
    entryId: existing ? existing.entryId : undefined,
    kind: LTM_ENTRY_KIND.USER,
    what: `User profile: ${patch.nickname || userId}`,
    why: "user_long_term_profile",
    data: {
      userId: String(userId),
      nickname: patch.nickname || existing?.data?.nickname || null,
      preferences: patch.preferences || existing?.data?.preferences || {},
      notableGifts: patch.notableGifts || existing?.data?.notableGifts || [],
      battleHistory: patch.battleHistory || existing?.data?.battleHistory || [],
      relationshipToMia: patch.relationshipToMia || existing?.data?.relationshipToMia || "community"
    },
    graphNode: { nodeId: String(userId), label: patch.nickname || String(userId), kind: "user" },
    force: true
  });
}

function recordStreamMemory(store, summary = {}) {
  return store.put({
    kind: LTM_ENTRY_KIND.STREAM,
    what: summary.title || `Stream on ${summary.date || new Date().toISOString().slice(0, 10)}`,
    why: "significant_stream",
    data: {
      streamId: summary.streamId || `stream-${crypto.randomUUID()}`,
      date: summary.date || null,
      durationMs: summary.durationMs != null ? Number(summary.durationMs) : null,
      peakViewers: summary.peakViewers != null ? Number(summary.peakViewers) : null,
      recordGift: summary.recordGift || null,
      highlights: Object.freeze(summary.highlights || [])
    },
    force: true
  });
}

function updateRelationshipMemory(store, userId, relationship = {}) {
  return store.put({
    kind: LTM_ENTRY_KIND.RELATIONSHIP,
    what: `Relationship with ${userId}`,
    why: "relationship_evolution",
    data: {
      userId: String(userId),
      role: relationship.role || "community_member",
      trustLevel: relationship.trustLevel || "normal",
      collaborationHistory: relationship.collaborationHistory || []
    },
    graphNode: { nodeId: `rel:${userId}`, label: relationship.role || "member", kind: "relationship" },
    graphEdge: relationship.linkTo
      ? { from: String(userId), to: relationship.linkTo, relation: relationship.relation || "knows" }
      : null,
    force: true
  });
}

function addProjectMemory(store, milestone = {}) {
  return store.put({
    kind: LTM_ENTRY_KIND.PROJECT,
    what: milestone.title || "Project milestone",
    why: "project_milestone",
    data: {
      version: milestone.version || null,
      system: milestone.system || null,
      milestoneType: milestone.milestoneType || "release",
      notes: milestone.notes || null
    },
    force: true
  });
}

function addWorldKnowledge(store, fact = {}) {
  return store.put({
    kind: LTM_ENTRY_KIND.WORLD,
    what: fact.term || fact.what,
    why: "world_knowledge",
    data: {
      term: fact.term || null,
      definition: fact.definition || null,
      source: fact.source || "canon"
    },
    force: true
  });
}

function updatePersonalityMemory(store, traits = {}) {
  return store.put({
    kind: LTM_ENTRY_KIND.PERSONALITY,
    what: "MIA personality traits",
    why: "personality_evolution",
    data: {
      communicationStyle: traits.communicationStyle || "warm",
      humor: traits.humor || "playful",
      values: Object.freeze(traits.values || []),
      favoritePhrases: Object.freeze(traits.favoritePhrases || [])
    },
    force: true
  });
}

function updateKojnozoutMemory(store, patch = {}) {
  return store.put({
    kind: LTM_ENTRY_KIND.KOJNOZROUT,
    what: "Kojnozout long-term development",
    why: "kojnozout_entity_memory",
    data: {
      evolutionStage: patch.evolutionStage || null,
      abilities: Object.freeze(patch.abilities || []),
      favoriteFood: patch.favoriteFood || null,
      battleHistory: Object.freeze(patch.battleHistory || []),
      moodBaseline: patch.moodBaseline || "content"
    },
    graphNode: { nodeId: "kojnozout", label: "Kojnožrout", kind: "entity" },
    force: true
  });
}

function addSkillMemory(store, skill = {}) {
  return store.put({
    kind: LTM_ENTRY_KIND.SKILL,
    what: skill.name || "learned skill",
    why: "skill_acquisition",
    data: {
      skillId: skill.skillId || `skill-${crypto.randomUUID()}`,
      domain: skill.domain || "general",
      procedure: skill.procedure || null
    },
    force: true
  });
}

function recordDecision(store, decision = {}) {
  return store.put({
    kind: LTM_ENTRY_KIND.DECISION,
    what: decision.decision || "significant decision",
    why: decision.reason || "decision_history",
    data: {
      decision: decision.decision || null,
      reason: decision.reason || null,
      outcome: decision.outcome || null,
      evaluation: decision.evaluation || null
    },
    force: true
  });
}

function addExperience(store, experience = {}) {
  return store.put({
    kind: LTM_ENTRY_KIND.EXPERIENCE,
    what: experience.summary || "generalized experience",
    why: "experience_library",
    data: {
      pattern: experience.pattern || null,
      strategy: experience.strategy || null,
      sourceEvents: experience.sourceEvents != null ? Number(experience.sourceEvents) : null
    },
    force: true
  });
}

function consolidateLongTermMemories(store, options = {}) {
  const chatLike = store
    .list()
    .filter((e) => e.kind === LTM_ENTRY_KIND.EXPERIENCE || e.kind === LTM_ENTRY_KIND.USER)
    .map((e) => e.record);

  const consolidated = consolidateMemories(chatLike, options);
  if (consolidated.mergedCount > 0 && consolidated.consolidated.length > 0) {
    const top = consolidated.consolidated[0];
    store.put({
      kind: LTM_ENTRY_KIND.EXPERIENCE,
      what: top.what,
      why: `ltm_consolidation:${consolidated.mergedCount}`,
      data: { generalized: true },
      force: true
    });
  }

  return Object.freeze({
    consolidated,
    operation: LTM_OPERATION.CONSOLIDATE,
    component: LTM_COMPONENT.EXPERIENCE_LIBRARY
  });
}

function shouldForgetLtm(entry = {}, options = {}) {
  if (CRITICAL_LTM_KINDS.includes(entry.kind) && !options.allowCriticalForget) {
    return Object.freeze({ forget: false, reason: "critical_protected" });
  }

  const scored = computeMemoryScore(entry.record || entry, {
    importance: entry.record?.score || 0.4,
    usageCount: options.usageCount || 0,
    now: options.now
  });

  if (scored.score < (options.minScore != null ? options.minScore : 0.12)) {
    return Object.freeze({ forget: true, reason: "low_relevance", score: scored.score });
  }

  return Object.freeze({ forget: false, reason: "retain", score: scored.score });
}

function ingestFromShortTerm(promotion = {}) {
  if (!promotion.promoted || !promotion.record) {
    return Object.freeze({ ok: false, error: "invalid_promotion" });
  }

  return Object.freeze({
    ok: true,
    entryInput: {
      what: promotion.record.what,
      why: promotion.record.why || "stm_promotion",
      when: promotion.record.when,
      context: promotion.record.context,
      kind: LTM_ENTRY_KIND.EXPERIENCE,
      evaluation: { importance: promotion.record.score || 0.6 }
    },
    fromEntryId: promotion.fromEntryId
  });
}

function createLtmApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    readOnly: options.readOnly !== false,
    data,
    component: LTM_COMPONENT.LTM_API
  });
}

function assertLtmForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !LTM_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

module.exports = {
  LTM_COMPONENT,
  LTM_COMPONENT_ORDER,
  LTM_ENTRY_KIND,
  LTM_OPERATION,
  LTM_FORBIDDEN_ACTIVITIES,
  CRITICAL_LTM_KINDS,
  LTM_RUNTIME_ANCHORS,
  evaluateForLongTermRetention,
  createLtmEntry,
  createLongTermMemoryStore,
  upsertUserProfile,
  recordStreamMemory,
  updateRelationshipMemory,
  addProjectMemory,
  addWorldKnowledge,
  updatePersonalityMemory,
  updateKojnozoutMemory,
  addSkillMemory,
  recordDecision,
  addExperience,
  consolidateLongTermMemories,
  shouldForgetLtm,
  ingestFromShortTerm,
  createLtmApiResponse,
  assertLtmForbiddenActivity
};
