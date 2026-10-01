"use strict";

/**
 * Master Canon 0026 — Emotional Memory: trust, relationships, mood history.
 */

const crypto = require("crypto");
const {
  createMemoryRecord,
  validateMemoryRecord,
  consolidateMemories,
  createKnowledgeGraph,
  createKnowledgeGraphNode,
  createKnowledgeGraphEdge,
  MEMORY_TYPE,
  MEMORY_LIFECYCLE,
  MEMORY_RETENTION
} = require("./memorySystem");

const EM_COMPONENT = Object.freeze({
  EMOTION_HISTORY: "emotion_history",
  RELATIONSHIP_ENGINE: "relationship_engine",
  TRUST_MANAGER: "trust_manager",
  REPUTATION_MANAGER: "reputation_manager",
  MOOD_HISTORY: "mood_history",
  EMOTION_CONTEXT: "emotion_context",
  EMOTION_SCORING: "emotion_scoring",
  EMOTION_CONSOLIDATOR: "emotion_consolidator",
  EMOTION_TIMELINE: "emotion_timeline",
  EMOTION_GRAPH: "emotion_graph",
  EMOTION_SEARCH: "emotion_search",
  EMOTIONAL_API: "emotional_api"
});

const EM_COMPONENT_ORDER = Object.freeze(Object.values(EM_COMPONENT));

const EM_ENTRY_KIND = Object.freeze({
  EXPERIENCE: "experience",
  RELATIONSHIP: "relationship",
  MOOD: "mood",
  KOJNOZROUT: "kojnozout"
});

const REPUTATION_ROLE = Object.freeze({
  SUPPORTER: "project_supporter",
  TESTER: "tester",
  MODERATOR: "moderator",
  ACTIVE_MEMBER: "active_community_member",
  CREATOR: "content_creator"
});

const EM_OPERATION = Object.freeze({
  PUT: "put",
  GET: "get",
  SEARCH: "search",
  CONSOLIDATE: "consolidate",
  TIMELINE: "timeline"
});

const EM_FORBIDDEN_ACTIVITIES = Object.freeze([
  "create_real_emotions",
  "discriminate_users",
  "store_unverified_conclusions",
  "mutate_history_without_audit",
  "replace_decision_engine"
]);

const EM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-memory-core/emotionalMemory.js",
  "shared/mia-memory-core/longTermMemory.js",
  "scripts/MIA_MOOD_BRAIN.js"
]);

const TRUST_MIN = 0;
const TRUST_MAX = 100;
const EMOTION_SCORE_MIN = -100;
const EMOTION_SCORE_MAX = 100;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computeEmotionScore(input = {}, options = {}) {
  const intensity = clamp(Number(input.intensity != null ? input.intensity : 0.5), 0, 1);
  const repetition = clamp(Number(input.repetition != null ? input.repetition : 1) / 10, 0, 1);
  const importance = clamp(Number(input.importance != null ? input.importance : 0.5), 0, 1);
  const impact = clamp(Number(input.impact != null ? input.impact : 0.5), 0, 1);
  const relationshipWeight = clamp(
    Number(input.relationshipWeight != null ? input.relationshipWeight : 0.5),
    0,
    1
  );
  const projectSignificance = clamp(
    Number(input.projectSignificance != null ? input.projectSignificance : 0.5),
    0,
    1
  );
  const polarity = input.polarity === "negative" ? -1 : 1;

  const raw =
    polarity *
    (intensity * 0.25 +
      repetition * 0.15 +
      importance * 0.2 +
      impact * 0.15 +
      relationshipWeight * 0.15 +
      projectSignificance * 0.1);

  const score = Math.round(clamp(raw * 100, EMOTION_SCORE_MIN, EMOTION_SCORE_MAX));

  return Object.freeze({
    score,
    intensity,
    repetition: input.repetition != null ? Number(input.repetition) : 1,
    importance,
    impact,
    relationshipWeight,
    projectSignificance,
    component: EM_COMPONENT.EMOTION_SCORING
  });
}

function computeTrustScore(profile = {}, delta = {}) {
  const base = Number.isFinite(profile.trustScore) ? profile.trustScore : 50;
  const activity = Number(delta.activityBoost || 0);
  const communication = Number(delta.communicationBoost || 0);
  const support = Number(delta.supportBoost || 0);
  const fairness = Number(delta.fairnessBoost || 0);
  const positive = Number(delta.positiveExperienceBoost || 0);
  const negative = Number(delta.negativeExperiencePenalty || 0);

  const next = clamp(
    base + activity + communication + support + fairness + positive - negative,
    TRUST_MIN,
    TRUST_MAX
  );

  return Object.freeze({
    trustScore: Math.round(next),
    previous: base,
    delta: Math.round(next - base),
    component: EM_COMPONENT.TRUST_MANAGER
  });
}

function createEmotionContext(input = {}) {
  return Object.freeze({
    at: input.at != null ? Number(input.at) : Date.now(),
    platform: input.platform || null,
    location: input.location || null,
    participants: Object.freeze((input.participants || []).map(String)),
    battleId: input.battleId || null,
    streamId: input.streamId || null,
    kojnozoutInvolved: input.kojnozoutInvolved === true,
    outcome: input.outcome || null
  });
}

function createEmotionalExperience(input = {}) {
  const summary = String(input.summary || input.what || "").trim();
  if (!summary) throw new Error("emotional experience summary is required");
  if (input.verified === false && !input.proposed) {
    throw new Error("unverified conclusions must be marked as proposed");
  }

  const scored = computeEmotionScore(input.scoring || input, input.scoring || {});
  const context = createEmotionContext(input.context || {});

  const record = createMemoryRecord({
    what: summary,
    why: String(input.why || "emotional_significance"),
    when: context.at,
    retention: MEMORY_RETENTION.PERMANENT,
    memoryType: MEMORY_TYPE.EMOTIONAL,
    lifecycle: MEMORY_LIFECYCLE.LONG_TERM,
    context,
    score: scored.score
  });

  const validation = validateMemoryRecord(record);
  if (!validation.ok) throw new Error(`invalid emotional record: ${validation.errors.join(",")}`);

  return Object.freeze({
    entryId: input.entryId || `emotion-${crypto.randomUUID()}`,
    kind: EM_ENTRY_KIND.EXPERIENCE,
    summary,
    emotionScore: scored.score,
    scoring: scored,
    context,
    userId: input.userId ? String(input.userId) : null,
    proposed: input.proposed === true,
    auditId: `emotion-audit-${crypto.randomUUID()}`,
    record
  });
}

function createRelationshipProfile(userId, input = {}) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("userId is required");

  return Object.freeze({
    userId: id,
    trustScore: clamp(input.trustScore != null ? Number(input.trustScore) : 50, TRUST_MIN, TRUST_MAX),
    reputation: Object.values(REPUTATION_ROLE).includes(input.reputation)
      ? input.reputation
      : REPUTATION_ROLE.ACTIVE_MEMBER,
    interactionCount: Number(input.interactionCount || 0),
    collaborationCount: Number(input.collaborationCount || 0),
    timeline: Object.freeze(input.timeline || []),
    historySummary: input.historySummary || null,
    component: EM_COMPONENT.RELATIONSHIP_ENGINE
  });
}

function createMoodRecord(input = {}) {
  const label = String(input.label || input.mood || "").trim();
  if (!label) throw new Error("mood label is required");

  return Object.freeze({
    entryId: input.entryId || `mood-${crypto.randomUUID()}`,
    kind: EM_ENTRY_KIND.MOOD,
    label,
    intensity: clamp(Number(input.intensity != null ? input.intensity : 0.5), 0, 1),
    period: input.period || null,
    reason: input.reason || null,
    at: input.at != null ? Number(input.at) : Date.now(),
    record: createMemoryRecord({
      what: label,
      why: "mia_mood_history",
      when: input.at != null ? Number(input.at) : Date.now(),
      retention: MEMORY_RETENTION.PERMANENT,
      memoryType: MEMORY_TYPE.EMOTIONAL,
      lifecycle: MEMORY_LIFECYCLE.LONG_TERM
    }),
    auditId: `mood-audit-${crypto.randomUUID()}`
  });
}

function createKojnozoutEmotionProfile(input = {}) {
  return Object.freeze({
    entryId: input.entryId || `koj-emotion-${crypto.randomUUID()}`,
    kind: EM_ENTRY_KIND.KOJNOZROUT,
    favoriteDonors: Object.freeze((input.favoriteDonors || []).map(String)),
    battleHistory: Object.freeze(input.battleHistory || []),
    favoriteItems: Object.freeze((input.favoriteItems || []).map(String)),
    moodBaseline: input.moodBaseline || "content",
    timeline: Object.freeze(input.timeline || []),
    auditId: `koj-emotion-audit-${crypto.randomUUID()}`
  });
}

function createEmotionalMemoryStore() {
  const experiences = new Map();
  const relationships = new Map();
  const moods = [];
  let kojnozoutProfile = createKojnozoutEmotionProfile();
  const graph = createKnowledgeGraph();

  function putExperience(input = {}) {
    const entry = createEmotionalExperience(input);
    experiences.set(entry.entryId, entry);

    if (entry.userId) {
      graph.addNode(
        createKnowledgeGraphNode({
          nodeId: entry.userId,
          label: entry.userId,
          kind: "user"
        })
      );
      graph.addEdge(
        createKnowledgeGraphEdge({
          from: entry.userId,
          to: entry.entryId,
          relation: entry.emotionScore >= 0 ? "positive_experience" : "negative_experience"
        })
      );
    }

    return Object.freeze({ ok: true, entry, operation: EM_OPERATION.PUT });
  }

  function getRelationship(userId) {
    const profile = relationships.get(String(userId));
    if (!profile) return Object.freeze({ ok: false, error: "not_found" });
    return Object.freeze({ ok: true, profile, operation: EM_OPERATION.GET });
  }

  return {
    putExperience,
    getRelationship,
    getExperience(entryId) {
      const entry = experiences.get(String(entryId));
      if (!entry) return Object.freeze({ ok: false, error: "not_found" });
      return Object.freeze({ ok: true, entry, operation: EM_OPERATION.GET });
    },
    listExperiences(userId = null) {
      const all = Array.from(experiences.values());
      return userId ? all.filter((e) => e.userId === String(userId)) : all;
    },
    updateRelationship(userId, patch = {}) {
      const existing = relationships.get(String(userId)) || createRelationshipProfile(userId);
      const trust = computeTrustScore(existing, patch.trustDelta || {});
      const timelineMoment = patch.timelineMoment
        ? Object.freeze({
            momentId: `rel-moment-${crypto.randomUUID()}`,
            at: patch.timelineMoment.at || Date.now(),
            label: String(patch.timelineMoment.label || "interaction"),
            emotionScore: patch.timelineMoment.emotionScore != null
              ? Number(patch.timelineMoment.emotionScore)
              : null
          })
        : null;

      const profile = Object.freeze({
        ...existing,
        trustScore: trust.trustScore,
        reputation: patch.reputation || existing.reputation,
        interactionCount: existing.interactionCount + (patch.interactionDelta || 0),
        collaborationCount: existing.collaborationCount + (patch.collaborationDelta || 0),
        timeline: Object.freeze(
          timelineMoment ? [...existing.timeline, timelineMoment] : existing.timeline
        ),
        historySummary: patch.historySummary || existing.historySummary
      });

      relationships.set(String(userId), profile);
      graph.addNode(
        createKnowledgeGraphNode({ nodeId: String(userId), label: String(userId), kind: "user" })
      );

      return Object.freeze({
        ok: true,
        profile,
        trust,
        operation: EM_OPERATION.PUT,
        component: EM_COMPONENT.RELATIONSHIP_ENGINE
      });
    },
    setReputation(userId, reputation) {
      const rel = this.updateRelationship(userId, {
        reputation: Object.values(REPUTATION_ROLE).includes(reputation)
          ? reputation
          : REPUTATION_ROLE.ACTIVE_MEMBER
      });
      return Object.freeze({
        ...rel,
        component: EM_COMPONENT.REPUTATION_MANAGER
      });
    },
    recordMood(input = {}) {
      const mood = createMoodRecord(input);
      moods.push(mood);
      return Object.freeze({
        ok: true,
        mood,
        component: EM_COMPONENT.MOOD_HISTORY
      });
    },
    moodHistory() {
      return Object.freeze([...moods]);
    },
    kojnozoutProfile() {
      return Object.freeze({ ...kojnozoutProfile });
    },
    updateKojnozoutEmotion(patch = {}) {
      kojnozoutProfile = createKojnozoutEmotionProfile({ ...kojnozoutProfile, ...patch });
      graph.addNode(
        createKnowledgeGraphNode({ nodeId: "kojnozout", label: "Kojnožrout", kind: "entity" })
      );
      return Object.freeze({
        ok: true,
        profile: this.kojnozoutProfile(),
        component: EM_COMPONENT.EMOTION_CONTEXT
      });
    },
    consolidate(userId = null, options = {}) {
      const target = userId
        ? this.listExperiences(String(userId))
        : Array.from(experiences.values());
      const positive = target.filter((e) => e.emotionScore > 0);
      if (positive.length < (options.minCount != null ? options.minCount : 3)) {
        return Object.freeze({
          ok: true,
          mergedCount: 0,
          component: EM_COMPONENT.EMOTION_CONSOLIDATOR
        });
      }

      const consolidated = consolidateMemories(
        positive.map((e) => e.record),
        options
      );

      if (userId && consolidated.mergedCount > 0) {
        this.updateRelationship(userId, {
          trustDelta: { positiveExperienceBoost: 5 },
          historySummary: consolidated.consolidated[0]?.what || "long_term_trust"
        });
      }

      return Object.freeze({
        ok: true,
        consolidated,
        mergedCount: consolidated.mergedCount,
        operation: EM_OPERATION.CONSOLIDATE,
        component: EM_COMPONENT.EMOTION_CONSOLIDATOR
      });
    },
    relationshipTimeline(userId) {
      const rel = relationships.get(String(userId));
      if (!rel) return Object.freeze({ ok: false, error: "not_found" });
      return Object.freeze({
        ok: true,
        userId: String(userId),
        timeline: rel.timeline,
        operation: EM_OPERATION.TIMELINE,
        component: EM_COMPONENT.EMOTION_TIMELINE
      });
    },
    search(query = {}) {
      const userId = query.userId ? String(query.userId) : null;
      const minScore = query.minScore != null ? Number(query.minScore) : null;
      const maxScore = query.maxScore != null ? Number(query.maxScore) : null;
      const minTrust = query.minTrust != null ? Number(query.minTrust) : null;
      const reputation = query.reputation || null;
      const fromAt = query.fromAt != null ? Number(query.fromAt) : null;
      const toAt = query.toAt != null ? Number(query.toAt) : null;
      const battleId = query.battleId || null;

      let results = Array.from(experiences.values());
      if (userId) results = results.filter((e) => e.userId === userId);
      if (minScore != null) results = results.filter((e) => e.emotionScore >= minScore);
      if (maxScore != null) results = results.filter((e) => e.emotionScore <= maxScore);
      if (fromAt != null) results = results.filter((e) => e.context.at >= fromAt);
      if (toAt != null) results = results.filter((e) => e.context.at <= toAt);
      if (battleId) results = results.filter((e) => e.context.battleId === battleId);

      let relationshipMatches = Array.from(relationships.values());
      if (minTrust != null) {
        relationshipMatches = relationshipMatches.filter((r) => r.trustScore >= minTrust);
      }
      if (reputation) {
        relationshipMatches = relationshipMatches.filter((r) => r.reputation === reputation);
      }
      if (userId) {
        relationshipMatches = relationshipMatches.filter((r) => r.userId === userId);
      }

      return Object.freeze({
        ok: true,
        experiences: Object.freeze(results),
        relationships: Object.freeze(relationshipMatches),
        count: results.length,
        operation: EM_OPERATION.SEARCH,
        component: EM_COMPONENT.EMOTION_SEARCH
      });
    },
    graph: () => graph.snapshot(),
    snapshotForEmotionEngine() {
      return Object.freeze({
        readOnly: true,
        experiences: Object.freeze(this.listExperiences()),
        relationships: Object.freeze(Array.from(relationships.values())),
        moods: this.moodHistory(),
        kojnozout: this.kojnozoutProfile(),
        component: EM_COMPONENT.EMOTIONAL_API
      });
    }
  };
}

function createEmotionalApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    readOnly: options.readOnly !== false,
    decides: false,
    data,
    component: EM_COMPONENT.EMOTIONAL_API
  });
}

function assertEmotionalForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !EM_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

module.exports = {
  EM_COMPONENT,
  EM_COMPONENT_ORDER,
  EM_ENTRY_KIND,
  REPUTATION_ROLE,
  EM_OPERATION,
  EM_FORBIDDEN_ACTIVITIES,
  TRUST_MIN,
  TRUST_MAX,
  EMOTION_SCORE_MIN,
  EMOTION_SCORE_MAX,
  EM_RUNTIME_ANCHORS,
  computeEmotionScore,
  computeTrustScore,
  createEmotionContext,
  createEmotionalExperience,
  createRelationshipProfile,
  createMoodRecord,
  createKojnozoutEmotionProfile,
  createEmotionalMemoryStore,
  createEmotionalApiResponse,
  assertEmotionalForbiddenActivity
};
