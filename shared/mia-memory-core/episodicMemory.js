"use strict";

/**
 * Master Canon 0023 — Episodic Memory: episodes, timeline, replay, search.
 */

const crypto = require("crypto");
const {
  createMemoryRecord,
  validateMemoryRecord,
  computeMemoryScore,
  createKnowledgeGraph,
  createKnowledgeGraphNode,
  createKnowledgeGraphEdge,
  MEMORY_TYPE,
  MEMORY_LIFECYCLE,
  MEMORY_RETENTION
} = require("./memorySystem");

const EM_COMPONENT = Object.freeze({
  EPISODE_BUILDER: "episode_builder",
  EPISODE_TIMELINE: "episode_timeline",
  EPISODE_INDEX: "episode_index",
  EPISODE_CONTEXT: "episode_context",
  EPISODE_PARTICIPANTS: "episode_participants",
  EPISODE_TAGS: "episode_tags",
  EPISODE_IMPORTANCE: "episode_importance",
  EPISODE_LINKS: "episode_links",
  EPISODE_REPLAY: "episode_replay",
  EPISODE_ARCHIVE: "episode_archive",
  EPISODE_SEARCH: "episode_search",
  EPISODE_API: "episode_api"
});

const EM_COMPONENT_ORDER = Object.freeze(Object.values(EM_COMPONENT));

const EPISODE_TYPE = Object.freeze({
  STREAM: "stream",
  BATTLE: "battle",
  COMMUNITY: "community",
  DEVELOPMENT: "development",
  AI: "ai",
  PERSONAL: "personal"
});

const EPISODE_TAG = Object.freeze({
  BATTLE: "battle",
  GIFT: "gift",
  RECORD: "record",
  STREAM: "stream",
  BUG: "bug",
  DEVELOPMENT: "development",
  COMMUNITY: "community",
  AI: "ai",
  KOJNOZROUT: "kojnozout"
});

const EPISODE_SOURCE = Object.freeze({
  EVENT_BUS: "event_bus",
  AI: "ai",
  BATTLE_ENGINE: "battle_engine",
  STREAM_ENGINE: "stream_engine",
  ADMIN: "admin"
});

const EM_OPERATION = Object.freeze({
  BUILD: "build",
  PUT: "put",
  GET: "get",
  SEARCH: "search",
  REPLAY: "replay",
  ARCHIVE: "archive",
  LINK: "link"
});

const EM_FORBIDDEN_ACTIVITIES = Object.freeze([
  "store_every_trivial_event",
  "replace_logs",
  "store_incomplete_without_mark",
  "mutate_episode_without_audit"
]);

const EM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-memory-core/episodicMemory.js",
  "shared/mia-memory-core/longTermMemory.js",
  "data/story-memory.json"
]);

function createTimelineMoment(input = {}) {
  const at = input.at != null ? Number(input.at) : Date.now();
  const label = String(input.label || input.event || "").trim();
  if (!label) throw new Error("timeline moment label is required");

  return Object.freeze({
    momentId: input.momentId || `moment-${crypto.randomUUID()}`,
    at,
    label,
    event: String(input.event || label),
    metadata: Object.freeze(input.metadata || {})
  });
}

function computeEpisodeImportanceScore(episode = {}, options = {}) {
  const participants = Array.isArray(episode.participants) ? episode.participants.length : 0;
  const tags = Array.isArray(episode.tags) ? episode.tags.length : 0;
  const timeline = Array.isArray(episode.timeline) ? episode.timeline.length : 0;
  const links = Array.isArray(episode.links) ? episode.links.length : 0;

  const participantFactor = Math.min(1, participants / 5);
  const tagFactor = Math.min(1, tags / 4);
  const timelineFactor = Math.min(1, timeline / 6);
  const linkFactor = Math.min(1, links / 3);
  const economicWeight = options.economicWeight != null ? Number(options.economicWeight) : 0.5;
  const emotionWeight = options.emotionWeight != null ? Number(options.emotionWeight) : 0.5;
  const uniqueness = options.uniqueness != null ? Number(options.uniqueness) : 0.5;
  const projectImpact = options.projectImpact != null ? Number(options.projectImpact) : 0.5;
  const usageCount = options.usageCount != null ? Number(options.usageCount) : 0;
  const usageFactor = Math.min(1, usageCount / 8);

  const score =
    participantFactor * 0.12 +
    tagFactor * 0.08 +
    timelineFactor * 0.1 +
    linkFactor * 0.1 +
    economicWeight * 0.2 +
    emotionWeight * 0.15 +
    uniqueness * 0.15 +
    projectImpact * 0.05 +
    usageFactor * 0.05;

  return Object.freeze({
    score: Math.round(score * 1000) / 1000,
    participants,
    tags,
    timeline,
    links
  });
}

function createEpisode(input = {}) {
  const incomplete = input.incomplete === true;
  const what = String(input.what || input.title || "").trim();
  const why = String(input.why || "episodic_memory").trim();
  const outcome = String(input.outcome || input.result || "").trim();

  if (!what) throw new Error("episode what/title is required");
  if (!why) throw new Error("episode why is required");
  if (!outcome && !incomplete) {
    throw new Error("incomplete episodes must be explicitly marked");
  }

  const startedAt = input.startedAt != null ? Number(input.startedAt) : Date.now();
  const endedAt = input.endedAt != null ? Number(input.endedAt) : startedAt;
  const type = Object.values(EPISODE_TYPE).includes(input.type)
    ? input.type
    : EPISODE_TYPE.STREAM;

  const timeline = Object.freeze(
    (Array.isArray(input.timeline) ? input.timeline : []).map((m) =>
      m.momentId ? m : createTimelineMoment(m)
    )
  );

  const participants = Object.freeze(
    (Array.isArray(input.participants) ? input.participants : []).map((p) =>
      Object.freeze({
        participantId: String(p.participantId || p.id || crypto.randomUUID()),
        name: String(p.name || p.label || "unknown"),
        kind: String(p.kind || "user")
      })
    )
  );

  const tags = Object.freeze(
    Array.isArray(input.tags) ? input.tags.map(String) : []
  );

  const context = Object.freeze({
    platform: input.context?.platform || null,
    language: input.context?.language || null,
    activeBattle: input.context?.activeBattle || null,
    moodMia: input.context?.moodMia || null,
    moodKojnozout: input.context?.moodKojnozout || null,
    streamConfig: input.context?.streamConfig || null,
    weather: input.context?.weather || null,
    specialEvents: Object.freeze(input.context?.specialEvents || [])
  });

  const draft = {
    what,
    why,
    when: startedAt,
    timeline,
    participants,
    tags,
    context,
    outcome: outcome || null,
    type
  };

  const importance = computeEpisodeImportanceScore(draft, input.importance || {});

  const record = createMemoryRecord({
    what,
    why,
    when: startedAt,
    retention: MEMORY_RETENTION.PERMANENT,
    memoryType: MEMORY_TYPE.EPISODIC,
    lifecycle: MEMORY_LIFECYCLE.LONG_TERM,
    context,
    score: importance.score
  });

  const validation = validateMemoryRecord(record);
  if (!validation.ok) throw new Error(`invalid episode record: ${validation.errors.join(",")}`);

  return Object.freeze({
    episodeId:
      typeof input.episodeId === "string" && input.episodeId.trim()
        ? input.episodeId.trim()
        : `episode-${crypto.randomUUID()}`,
    type,
    what,
    why,
    outcome: outcome || null,
    startedAt,
    endedAt,
    durationMs: Math.max(0, endedAt - startedAt),
    timeline,
    participants,
    tags,
    context,
    links: Object.freeze([]),
    importanceScore: importance.score,
    record,
    incomplete,
    archived: false,
    auditId: `episode-audit-${crypto.randomUUID()}`,
    source: Object.values(EPISODE_SOURCE).includes(input.source)
      ? input.source
      : EPISODE_SOURCE.EVENT_BUS
  });
}

function createEpisodeBuilder(input = {}) {
  const pendingEvents = [];
  const builderId = input.builderId || `builder-${crypto.randomUUID()}`;
  const episodeType = Object.values(EPISODE_TYPE).includes(input.type)
    ? input.type
    : EPISODE_TYPE.BATTLE;
  const maxGapMs = input.maxGapMs != null ? Number(input.maxGapMs) : 15 * 60 * 1000;

  return {
    builderId,
    episodeType,
    appendEvent(event = {}) {
      const at = event.at != null ? Number(event.at) : Date.now();
      if (pendingEvents.length > 0) {
        const last = pendingEvents[pendingEvents.length - 1];
        if (at - last.at > maxGapMs) {
          return Object.freeze({ ok: false, error: "event_gap_too_large" });
        }
      }
      pendingEvents.push(
        Object.freeze({
          eventId: event.eventId || `evt-${crypto.randomUUID()}`,
          at,
          kind: String(event.kind || "event"),
          label: String(event.label || event.kind || "event"),
          payload: Object.freeze(event.payload || {})
        })
      );
      return Object.freeze({ ok: true, count: pendingEvents.length });
    },
    build(summary = {}) {
      if (pendingEvents.length === 0) {
        return Object.freeze({ ok: false, error: "no_events" });
      }

      const startedAt = pendingEvents[0].at;
      const endedAt = pendingEvents[pendingEvents.length - 1].at;
      const timeline = pendingEvents.map((e) =>
        createTimelineMoment({ at: e.at, label: e.label, event: e.kind, metadata: e.payload })
      );

      const participants = Object.freeze(
        (summary.participants || []).map((p) =>
          Object.freeze({
            participantId: String(p.participantId || p.id || crypto.randomUUID()),
            name: String(p.name || p.label),
            kind: String(p.kind || "user")
          })
        )
      );

      const episode = createEpisode({
        episodeId: summary.episodeId,
        type: episodeType,
        what: summary.what || summary.title || `Episode: ${episodeType}`,
        why: summary.why || "episode_builder",
        outcome: summary.outcome || summary.result || "completed",
        startedAt,
        endedAt,
        timeline,
        participants,
        tags: summary.tags || [],
        context: summary.context || {},
        source: summary.source || EPISODE_SOURCE.EVENT_BUS,
        importance: summary.importance || {}
      });

      pendingEvents.length = 0;
      return Object.freeze({
        ok: true,
        episode,
        operation: EM_OPERATION.BUILD,
        component: EM_COMPONENT.EPISODE_BUILDER
      });
    }
  };
}

function createEpisodicMemoryStore() {
  const episodes = new Map();
  const archive = [];
  const index = new Map();
  const graph = createKnowledgeGraph();

  function indexEpisode(episode) {
    index.set(episode.episodeId, {
      episodeId: episode.episodeId,
      type: episode.type,
      startedAt: episode.startedAt,
      tags: episode.tags,
      participants: episode.participants.map((p) => p.participantId),
      importanceScore: episode.importanceScore
    });
  }

  function put(episodeInput = {}) {
    const episode = createEpisode(episodeInput);
    episodes.set(episode.episodeId, episode);
    indexEpisode(episode);
    graph.addNode(
      createKnowledgeGraphNode({
        nodeId: episode.episodeId,
        label: episode.what,
        kind: episode.type
      })
    );
    return Object.freeze({ ok: true, episode, operation: EM_OPERATION.PUT });
  }

  function get(episodeId) {
    const episode = episodes.get(String(episodeId));
    if (!episode || episode.archived) {
      return Object.freeze({ ok: false, error: "not_found" });
    }
    return Object.freeze({ ok: true, episode, operation: EM_OPERATION.GET });
  }

  return {
    put,
    get,
    list(type = null) {
      const all = Array.from(episodes.values()).filter((e) => !e.archived);
      return type ? all.filter((e) => e.type === type) : all;
    },
    link(fromEpisodeId, toEpisodeId, relation = "follows") {
      const from = episodes.get(String(fromEpisodeId));
      const to = episodes.get(String(toEpisodeId));
      if (!from || !to) return Object.freeze({ ok: false, error: "not_found" });

      const edge = createKnowledgeGraphEdge({
        from: from.episodeId,
        to: to.episodeId,
        relation
      });
      graph.addEdge(edge);

      const updated = Object.freeze({
        ...from,
        links: Object.freeze([
          ...from.links,
          Object.freeze({ toEpisodeId: to.episodeId, relation, auditId: `link-${crypto.randomUUID()}` })
        ])
      });
      episodes.set(from.episodeId, updated);
      return Object.freeze({
        ok: true,
        from: updated,
        to,
        operation: EM_OPERATION.LINK,
        component: EM_COMPONENT.EPISODE_LINKS
      });
    },
    replay(episodeId) {
      const result = get(episodeId);
      if (!result.ok) return result;

      const episode = result.episode;
      return Object.freeze({
        ok: true,
        replay: Object.freeze({
          episodeId: episode.episodeId,
          what: episode.what,
          timeline: episode.timeline,
          participants: episode.participants,
          keyEvents: episode.timeline.map((m) => m.event),
          decisions: episode.timeline.filter((m) => m.metadata?.decision),
          outcome: episode.outcome,
          durationMs: episode.durationMs
        }),
        operation: EM_OPERATION.REPLAY,
        component: EM_COMPONENT.EPISODE_REPLAY
      });
    },
    search(query = {}) {
      const qTags = Array.isArray(query.tags) ? query.tags.map(String) : [];
      const qPerson = query.participantId ? String(query.participantId) : null;
      const qType = query.type || null;
      const qPlatform = query.platform ? String(query.platform) : null;
      const qEmotion = query.emotion ? String(query.emotion) : null;
      const minImportance =
        query.minImportance != null ? Number(query.minImportance) : null;
      const fromAt = query.fromAt != null ? Number(query.fromAt) : null;
      const toAt = query.toAt != null ? Number(query.toAt) : null;

      const matches = this.list().filter((episode) => {
        if (qType && episode.type !== qType) return false;
        if (fromAt != null && episode.startedAt < fromAt) return false;
        if (toAt != null && episode.startedAt > toAt) return false;
        if (minImportance != null && episode.importanceScore < minImportance) return false;
        if (qPlatform && episode.context.platform !== qPlatform) return false;
        if (qEmotion && episode.context.moodMia !== qEmotion) return false;
        if (qPerson && !episode.participants.some((p) => p.participantId === qPerson)) {
          return false;
        }
        if (qTags.length > 0 && !qTags.every((t) => episode.tags.includes(t))) return false;
        if (query.battleId && episode.context.activeBattle !== query.battleId) return false;
        if (query.giftRelated && !episode.tags.includes(EPISODE_TAG.GIFT)) return false;
        return true;
      });

      return Object.freeze({
        ok: true,
        results: Object.freeze(matches),
        count: matches.length,
        operation: EM_OPERATION.SEARCH,
        component: EM_COMPONENT.EPISODE_SEARCH
      });
    },
    archive(episodeId, reason = "archived") {
      const episode = episodes.get(String(episodeId));
      if (!episode) return Object.freeze({ ok: false, error: "not_found" });

      const archivedEpisode = Object.freeze({
        ...episode,
        archived: true,
        archivedAt: Date.now(),
        archiveReason: reason,
        archiveSummary: episode.outcome || episode.what
      });
      episodes.delete(episode.episodeId);
      index.delete(episode.episodeId);
      archive.push(archivedEpisode);

      return Object.freeze({
        ok: true,
        episode: archivedEpisode,
        operation: EM_OPERATION.ARCHIVE,
        component: EM_COMPONENT.EPISODE_ARCHIVE
      });
    },
    indexSnapshot() {
      return Object.freeze(Array.from(index.values()));
    },
    graph: () => graph.snapshot()
  };
}

function createEpisodeApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    readOnly: options.readOnly !== false,
    data,
    component: EM_COMPONENT.EPISODE_API
  });
}

function assertEpisodicForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !EM_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

module.exports = {
  EM_COMPONENT,
  EM_COMPONENT_ORDER,
  EPISODE_TYPE,
  EPISODE_TAG,
  EPISODE_SOURCE,
  EM_OPERATION,
  EM_FORBIDDEN_ACTIVITIES,
  EM_RUNTIME_ANCHORS,
  createTimelineMoment,
  computeEpisodeImportanceScore,
  createEpisode,
  createEpisodeBuilder,
  createEpisodicMemoryStore,
  createEpisodeApiResponse,
  assertEpisodicForbiddenActivity
};
