"use strict";

/**
 * Master Canon 0021 — Short-Term Memory: conversation, stream, gifts, battle, sync.
 */

const crypto = require("crypto");
const {
  createMemoryRecord,
  computeMemoryScore,
  consolidateMemories,
  MEMORY_TYPE,
  MEMORY_LIFECYCLE
} = require("./memorySystem");

const STM_COMPONENT = Object.freeze({
  CONVERSATION_MEMORY: "conversation_memory",
  STREAM_MEMORY: "stream_memory",
  USER_SESSION_MEMORY: "user_session_memory",
  GIFT_MEMORY: "gift_memory",
  BATTLE_MEMORY: "battle_memory",
  OVERLAY_MEMORY: "overlay_memory",
  EMOTION_CONTEXT: "emotion_context",
  RELATIONSHIP_CONTEXT: "relationship_context",
  TEMPORARY_KNOWLEDGE: "temporary_knowledge",
  MEMORY_EXPIRATION: "memory_expiration",
  MEMORY_SYNCHRONIZER: "memory_synchronizer",
  STM_API: "stm_api"
});

const STM_COMPONENT_ORDER = Object.freeze(Object.values(STM_COMPONENT));

const STM_ENTRY_KIND = Object.freeze({
  CONVERSATION: "conversation",
  STREAM: "stream",
  USER_SESSION: "user_session",
  GIFT: "gift",
  BATTLE: "battle",
  OVERLAY: "overlay",
  EMOTION: "emotion",
  RELATIONSHIP: "relationship",
  TEMPORARY_KNOWLEDGE: "temporary_knowledge"
});

const STM_OPERATION = Object.freeze({
  PUT: "put",
  GET: "get",
  APPEND: "append",
  CLOSE: "close",
  SWEEP: "sweep",
  SYNC: "sync"
});

const DEFAULT_STM_TTL_MS = Object.freeze({
  [STM_ENTRY_KIND.CONVERSATION]: 20 * 60 * 1000,
  [STM_ENTRY_KIND.STREAM]: 8 * 60 * 60 * 1000,
  [STM_ENTRY_KIND.USER_SESSION]: 4 * 60 * 60 * 1000,
  [STM_ENTRY_KIND.GIFT]: 8 * 60 * 60 * 1000,
  [STM_ENTRY_KIND.BATTLE]: 60 * 60 * 1000,
  [STM_ENTRY_KIND.OVERLAY]: 30 * 60 * 1000,
  [STM_ENTRY_KIND.EMOTION]: 15 * 60 * 1000,
  [STM_ENTRY_KIND.RELATIONSHIP]: 2 * 60 * 60 * 1000,
  [STM_ENTRY_KIND.TEMPORARY_KNOWLEDGE]: 24 * 60 * 60 * 1000
});

const STM_FORBIDDEN_ACTIVITIES = Object.freeze([
  "replace_long_term",
  "store_permanent_knowledge",
  "unlimited_retention",
  "bypass_stm_api",
  "decide_truth"
]);

const MAX_GIFT_HISTORY = 500;

const STM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-memory-core/shortTermMemory.js",
  "shared/mia-memory-core/workingMemory.js",
  "scripts/MIA_SESSION_MEMORY.js",
  "data/mia-session-memory.json"
]);

function createStmEntry(input = {}) {
  const kind = Object.values(STM_ENTRY_KIND).includes(input.kind) ? input.kind : STM_ENTRY_KIND.CONVERSATION;
  const entryId =
    typeof input.entryId === "string" && input.entryId.trim()
      ? input.entryId.trim()
      : `stm-${crypto.randomUUID()}`;

  const createdAt = input.createdAt != null ? Number(input.createdAt) : Date.now();
  const ttlMs = input.ttlMs != null ? Number(input.ttlMs) : DEFAULT_STM_TTL_MS[kind] || 3600000;

  return Object.freeze({
    entryId,
    kind,
    key: input.key != null ? String(input.key) : entryId,
    data: Object.freeze({ ...(input.data || {}) }),
    createdAt,
    updatedAt: input.updatedAt != null ? Number(input.updatedAt) : createdAt,
    expiresAt: createdAt + ttlMs,
    score: input.score != null ? Number(input.score) : null,
    closed: Boolean(input.closed)
  });
}

function createShortTermMemoryStore(input = {}) {
  const entries = new Map();
  const gifts = [];
  const maxGifts = input.maxGifts != null ? Number(input.maxGifts) : MAX_GIFT_HISTORY;

  function put(entryInput = {}) {
    const entry = createStmEntry(entryInput);
    entries.set(entry.key, entry);
    return Object.freeze({ ok: true, entry, operation: STM_OPERATION.PUT });
  }

  function get(key) {
    const entry = entries.get(String(key));
    if (!entry) return Object.freeze({ ok: false, error: "not_found" });
    return Object.freeze({ ok: true, entry, operation: STM_OPERATION.GET });
  }

  function update(key, patch = {}) {
    const existing = entries.get(String(key));
    if (!existing) return Object.freeze({ ok: false, error: "not_found" });
    const next = createStmEntry({
      ...existing,
      data: { ...existing.data, ...(patch.data || {}) },
      score: patch.score != null ? patch.score : existing.score,
      updatedAt: Date.now(),
      closed: patch.closed != null ? patch.closed : existing.closed
    });
    entries.set(next.key, next);
    return Object.freeze({ ok: true, entry: next, operation: STM_OPERATION.PUT });
  }

  return {
    put,
    get,
    update,
    list(kind = null) {
      const all = Array.from(entries.values());
      return kind ? all.filter((e) => e.kind === kind) : all;
    },
    appendGift(gift = {}) {
      const record = createStmEntry({
        kind: STM_ENTRY_KIND.GIFT,
        key: gift.giftId || `gift-${crypto.randomUUID()}`,
        data: {
          donorId: gift.donorId || null,
          donorName: gift.donorName || null,
          coins: gift.coins != null ? Number(gift.coins) : null,
          at: gift.at != null ? Number(gift.at) : Date.now(),
          battleId: gift.battleId || null,
          miaReaction: gift.miaReaction || null,
          kojReaction: gift.kojReaction || null
        }
      });
      gifts.push(record);
      while (gifts.length > maxGifts) gifts.shift();
      return Object.freeze({ ok: true, gift: record, operation: STM_OPERATION.APPEND });
    },
    getRecentGifts(limit = 20) {
      const slice = gifts.slice(-Math.max(1, limit));
      return Object.freeze(slice);
    },
    detectGiftSpam(windowMs = 5000, threshold = 5, now = Date.now()) {
      const recent = gifts.filter((g) => now - g.data.at <= windowMs);
      return Object.freeze({
        spam: recent.length >= threshold,
        count: recent.length,
        windowMs
      });
    },
    sweepExpired(now = Date.now()) {
      const removed = [];
      for (const [key, entry] of entries.entries()) {
        if (entry.expiresAt <= now && !entry.closed) {
          entries.delete(key);
          removed.push(key);
        }
      }
      return Object.freeze({ removed: Object.freeze(removed), operation: STM_OPERATION.SWEEP });
    }
  };
}

function addConversationTurn(store, turn = {}) {
  const key = turn.conversationId || "active-conversation";
  const existing = store.get(key);
  const messages = existing.ok ? [...(existing.entry.data.messages || [])] : [];
  messages.push({
    role: turn.role || "user",
    text: String(turn.text || ""),
    at: turn.at != null ? Number(turn.at) : Date.now()
  });
  return store.put({
    kind: STM_ENTRY_KIND.CONVERSATION,
    key,
    data: {
      conversationId: key,
      topic: turn.topic || existing.entry?.data?.topic || null,
      language: turn.language || existing.entry?.data?.language || "cs",
      messages: messages.slice(-50)
    }
  });
}

function openUserSession(store, userId, data = {}) {
  return store.put({
    kind: STM_ENTRY_KIND.USER_SESSION,
    key: `session:${userId}`,
    data: {
      userId: String(userId),
      joinedAt: Date.now(),
      messages: [],
      gifts: [],
      ...data
    }
  });
}

function closeUserSession(store, userId) {
  return store.update(`session:${userId}`, { closed: true, data: { leftAt: Date.now() } });
}

function updateStreamMemory(store, patch = {}) {
  const key = "stream:active";
  const existing = store.get(key);
  return store.put({
    kind: STM_ENTRY_KIND.STREAM,
    key,
    data: {
      ...(existing.ok ? existing.entry.data : {}),
      startedAt: patch.startedAt || existing.entry?.data?.startedAt || Date.now(),
      highlights: patch.highlights || existing.entry?.data?.highlights || [],
      lastBattleId: patch.lastBattleId ?? existing.entry?.data?.lastBattleId ?? null,
      recordGift: patch.recordGift ?? existing.entry?.data?.recordGift ?? null,
      activeEvents: patch.activeEvents || existing.entry?.data?.activeEvents || []
    }
  });
}

function updateBattleMemory(store, battleId, patch = {}) {
  return store.put({
    kind: STM_ENTRY_KIND.BATTLE,
    key: `battle:${battleId}`,
    data: {
      battleId: String(battleId),
      roundStartedAt: patch.roundStartedAt || Date.now(),
      itemsUsed: patch.itemsUsed || [],
      actionOrder: patch.actionOrder || [],
      score: patch.score || { left: 0, right: 0 },
      remainingMs: patch.remainingMs != null ? Number(patch.remainingMs) : null,
      kojStates: patch.kojStates || {}
    }
  });
}

function createBattleSummary(battleEntry = {}) {
  const data = battleEntry.data || battleEntry;
  return Object.freeze({
    battleId: data.battleId,
    endedAt: Date.now(),
    finalScore: data.score || {},
    itemsUsed: Object.freeze([...(data.itemsUsed || [])]),
    actionCount: (data.actionOrder || []).length,
    component: STM_COMPONENT.BATTLE_MEMORY
  });
}

function setEmotionContext(store, emotion = {}) {
  return store.put({
    kind: STM_ENTRY_KIND.EMOTION,
    key: "emotion:active",
    data: {
      mood: emotion.mood || "neutral",
      intensity: emotion.intensity != null ? Number(emotion.intensity) : 0.5,
      reason: emotion.reason || null,
      at: Date.now()
    },
    ttlMs: DEFAULT_STM_TTL_MS[STM_ENTRY_KIND.EMOTION]
  });
}

function updateRelationshipContext(store, userId, patch = {}) {
  const key = `relationship:${userId}`;
  const existing = store.get(key);
  return store.put({
    kind: STM_ENTRY_KIND.RELATIONSHIP,
    key,
    data: {
      userId: String(userId),
      active: patch.active != null ? Boolean(patch.active) : true,
      giftCount: patch.giftCount ?? existing.entry?.data?.giftCount ?? 0,
      lastTopic: patch.lastTopic || existing.entry?.data?.lastTopic || null,
      conversationActive: patch.conversationActive != null ? Boolean(patch.conversationActive) : false
    }
  });
}

function addTemporaryKnowledge(store, knowledge = {}) {
  return store.put({
    kind: STM_ENTRY_KIND.TEMPORARY_KNOWLEDGE,
    key: knowledge.key || `tk-${crypto.randomUUID()}`,
    data: {
      title: knowledge.title || "",
      rules: knowledge.rules || null,
      endsAt: knowledge.endsAt != null ? Number(knowledge.endsAt) : null
    },
    ttlMs: knowledge.ttlMs || DEFAULT_STM_TTL_MS[STM_ENTRY_KIND.TEMPORARY_KNOWLEDGE]
  });
}

function computeStmScore(entry = {}, options = {}) {
  const base = computeMemoryScore(
    {
      what: entry.data?.topic || entry.kind,
      when: entry.updatedAt || entry.createdAt,
      why: entry.data?.reason || "stm_entry",
      links: entry.data?.links || []
    },
    {
      importance: options.importance != null ? options.importance : 0.5,
      usageCount: options.usageCount || 0,
      now: options.now
    }
  );

  let bonus = 0;
  if (entry.kind === STM_ENTRY_KIND.GIFT && (entry.data?.coins || 0) >= 1000) bonus += 0.15;
  if (entry.kind === STM_ENTRY_KIND.EMOTION && (entry.data?.intensity || 0) > 0.7) bonus += 0.1;
  if (entry.kind === STM_ENTRY_KIND.RELATIONSHIP && entry.data?.giftCount >= 3) bonus += 0.1;

  return Object.freeze({
    ...base,
    score: Math.min(1, base.score + bonus)
  });
}

function shouldRetainInStm(entry = {}, options = {}) {
  const streamActive = options.streamActive !== false;
  const scored = computeStmScore(entry, options);
  if (!streamActive && entry.kind === STM_ENTRY_KIND.STREAM) {
    return Object.freeze({ retain: false, reason: "stream_ended" });
  }
  if (entry.closed && entry.kind === STM_ENTRY_KIND.USER_SESSION) {
    return Object.freeze({ retain: false, reason: "session_closed" });
  }
  return Object.freeze({
    retain: scored.score >= (options.minScore != null ? options.minScore : 0.25),
    score: scored.score
  });
}

function promoteToLongTermCandidate(entry = {}) {
  const what =
    entry.data?.topic ||
    entry.data?.title ||
    entry.data?.donorName ||
    `stm:${entry.kind}`;
  const record = createMemoryRecord({
    what: String(what),
    why: "stm_sync_promotion",
    memoryType: MEMORY_TYPE.LONG_TERM,
    lifecycle: MEMORY_LIFECYCLE.EVALUATION,
    context: {
      userId: entry.data?.userId || entry.data?.donorId || null,
      topic: entry.data?.topic || entry.kind
    }
  });
  return Object.freeze({
    promoted: true,
    fromEntryId: entry.entryId,
    record,
    component: STM_COMPONENT.MEMORY_SYNCHRONIZER
  });
}

function synchronizeShortTermMemory(store, options = {}) {
  const now = options.now != null ? Number(options.now) : Date.now();
  const swept = store.sweepExpired(now);
  const entries = store.list();
  const promotions = [];
  const removals = [];

  for (const entry of entries) {
    const decision = shouldRetainInStm(entry, options);
    if (!decision.retain) {
      removals.push(entry.entryId);
      continue;
    }
    const scored = computeStmScore(entry, options);
    if (scored.score >= (options.promoteThreshold != null ? options.promoteThreshold : 0.75)) {
      promotions.push(promoteToLongTermCandidate({ ...entry, score: scored.score }));
    }
  }

  const conversationEntries = entries
    .filter((e) => e.kind === STM_ENTRY_KIND.CONVERSATION)
    .map((e) =>
      createMemoryRecord({
        what: e.data?.topic || "conversation",
        why: "stm_consolidation",
        memoryType: MEMORY_TYPE.SHORT_TERM,
        when: e.updatedAt
      })
    );
  const consolidated = consolidateMemories(conversationEntries);

  return Object.freeze({
    swept,
    promotions: Object.freeze(promotions),
    removals: Object.freeze(removals),
    consolidated,
    operation: STM_OPERATION.SYNC,
    component: STM_COMPONENT.MEMORY_SYNCHRONIZER
  });
}

function isStmExpired(entry, now = Date.now()) {
  return Number(entry?.expiresAt) <= now;
}

function assertStmForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !STM_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

module.exports = {
  STM_COMPONENT,
  STM_COMPONENT_ORDER,
  STM_ENTRY_KIND,
  STM_OPERATION,
  DEFAULT_STM_TTL_MS,
  STM_FORBIDDEN_ACTIVITIES,
  MAX_GIFT_HISTORY,
  STM_RUNTIME_ANCHORS,
  createStmEntry,
  createShortTermMemoryStore,
  addConversationTurn,
  openUserSession,
  closeUserSession,
  updateStreamMemory,
  updateBattleMemory,
  createBattleSummary,
  setEmotionContext,
  updateRelationshipContext,
  addTemporaryKnowledge,
  computeStmScore,
  shouldRetainInStm,
  promoteToLongTermCandidate,
  synchronizeShortTermMemory,
  isStmExpired,
  assertStmForbiddenActivity
};
