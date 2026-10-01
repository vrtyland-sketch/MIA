"use strict";

/**
 * Master Canon 0013 — Event Registry: canonical event type catalog.
 * Definitions only — no event instances, routing, or validation logic.
 */

const crypto = require("crypto");

const REGISTRY_CATEGORY = Object.freeze({
  SYSTEM: "system",
  RUNTIME: "runtime",
  STREAM: "stream",
  GRAPHICS: "graphics",
  AI: "ai",
  GAME: "game",
  ECONOMY: "economy"
});

const REGISTRY_DEFINITION_STATUS = Object.freeze({
  DRAFT: "draft",
  PROPOSED: "proposed",
  APPROVED: "approved",
  ACTIVE: "active",
  DEPRECATED: "deprecated",
  ARCHIVED: "archived"
});

const REGISTRY_LIFECYCLE_ORDER = Object.freeze([
  REGISTRY_DEFINITION_STATUS.DRAFT,
  "review",
  REGISTRY_DEFINITION_STATUS.APPROVED,
  "implemented",
  REGISTRY_DEFINITION_STATUS.ACTIVE,
  REGISTRY_DEFINITION_STATUS.DEPRECATED,
  REGISTRY_DEFINITION_STATUS.ARCHIVED
]);

const EVENT_TYPE_DEFINITION_FIELDS = Object.freeze([
  "eventTypeId",
  "canonicalName",
  "description",
  "category",
  "version",
  "status",
  "createdAt",
  "author",
  "owner",
  "documentationRef",
  "payloadSchema",
  "metadataSchema",
  "publishers",
  "subscribers"
]);

const REGISTRY_FORBIDDEN_ACTIVITIES = Object.freeze([
  "route_events",
  "create_payload",
  "mutate_event_data",
  "business_logic",
  "replace_validator"
]);

const CANONICAL_NAME_PATTERN = /^EVENT_[A-Z0-9_]+$/;

function defineEventType(input) {
  return Object.freeze({
    eventTypeId: input.eventTypeId,
    canonicalName: input.canonicalName,
    description: input.description,
    category: input.category,
    version: input.version || "1.0.0",
    status: input.status || REGISTRY_DEFINITION_STATUS.ACTIVE,
    createdAt: input.createdAt || new Date().toISOString(),
    author: input.author || "mia.platform",
    owner: input.owner || "mia.platform",
    documentationRef: input.documentationRef || `master-canon/0013-event-registry.md#${input.eventTypeId}`,
    payloadSchema: Object.freeze(input.payloadSchema || {}),
    metadataSchema: Object.freeze(input.metadataSchema || {}),
    publishers: Object.freeze(input.publishers || []),
    subscribers: Object.freeze(input.subscribers || []),
    runtimeAliases: Object.freeze(input.runtimeAliases || []),
    compatibility: Object.freeze({
      backward: input.compatibility?.backward ?? true,
      forward: input.compatibility?.forward ?? false,
      migrationNotes: input.compatibility?.migrationNotes || ""
    })
  });
}

/** Production-active catalog (0013 §7 + bridge to runtime normalizer types). */
const EVENT_TYPE_REGISTRY = Object.freeze({
  EVENT_SYSTEM_STARTED: defineEventType({
    eventTypeId: "evt-type.system.started",
    canonicalName: "EVENT_SYSTEM_STARTED",
    description: "Platform or subsystem started.",
    category: REGISTRY_CATEGORY.SYSTEM,
    publishers: ["core.runtime_manager"],
    subscribers: ["monitoring.system", "administration.dashboard"],
    runtimeAliases: ["SYSTEM_START", "SYSTEM_STARTED"]
  }),
  EVENT_SYSTEM_STOPPED: defineEventType({
    eventTypeId: "evt-type.system.stopped",
    canonicalName: "EVENT_SYSTEM_STOPPED",
    description: "Platform or subsystem stopped.",
    category: REGISTRY_CATEGORY.SYSTEM,
    publishers: ["core.shutdown_manager"],
    subscribers: ["monitoring.system"],
    runtimeAliases: ["SYSTEM_STOP", "SYSTEM_STOPPED"]
  }),
  EVENT_RUNTIME_READY: defineEventType({
    eventTypeId: "evt-type.runtime.ready",
    canonicalName: "EVENT_RUNTIME_READY",
    description: "Runtime reached RUNNING state.",
    category: REGISTRY_CATEGORY.RUNTIME,
    publishers: ["core.runtime_manager"],
    subscribers: ["stream.ingest", "administration.health"]
  }),
  EVENT_RUNTIME_FAILED: defineEventType({
    eventTypeId: "evt-type.runtime.failed",
    canonicalName: "EVENT_RUNTIME_FAILED",
    description: "Runtime entered failed state.",
    category: REGISTRY_CATEGORY.RUNTIME,
    publishers: ["core.runtime_manager", "core.error_manager"],
    subscribers: ["monitoring.system", "administration.dashboard"]
  }),
  EVENT_CHAT_MESSAGE: defineEventType({
    eventTypeId: "evt-type.stream.chat_message",
    canonicalName: "EVENT_CHAT_MESSAGE",
    description: "Viewer chat message received.",
    category: REGISTRY_CATEGORY.STREAM,
    payloadSchema: Object.freeze({ required: ["user", "message"] }),
    metadataSchema: Object.freeze({ optional: ["platform", "language", "sessionId", "streamId"] }),
    publishers: ["adapter.tiktok", "adapter.kick"],
    subscribers: ["ai.conversation", "graphics.chat_overlay", "analytics.stream", "moderation.engine"],
    runtimeAliases: ["COMMENT", "CHAT_MESSAGE"]
  }),
  EVENT_GIFT_RECEIVED: defineEventType({
    eventTypeId: "evt-type.stream.gift_received",
    canonicalName: "EVENT_GIFT_RECEIVED",
    description: "Gift or donation received from stream platform.",
    category: REGISTRY_CATEGORY.STREAM,
    payloadSchema: Object.freeze({
      required: ["user", "support"],
      fields: ["giftName", "coins", "senderId", "senderName", "timestamp"]
    }),
    metadataSchema: Object.freeze({ optional: ["platform", "sessionId", "streamId"] }),
    publishers: ["adapter.tiktok", "adapter.kick"],
    subscribers: [
      "economy.gift_engine",
      "game.kojnozout",
      "graphics.video_engine",
      "analytics.stream"
    ],
    runtimeAliases: ["GIFT", "GIFT_RECEIVED"]
  }),
  EVENT_FOLLOW: defineEventType({
    eventTypeId: "evt-type.stream.follow",
    canonicalName: "EVENT_FOLLOW",
    description: "New follower on stream platform.",
    category: REGISTRY_CATEGORY.STREAM,
    publishers: ["adapter.tiktok", "adapter.kick"],
    subscribers: ["analytics.stream", "graphics.overlay"],
    runtimeAliases: ["FOLLOW"]
  }),
  EVENT_ANIMATION_STARTED: defineEventType({
    eventTypeId: "evt-type.graphics.animation_started",
    canonicalName: "EVENT_ANIMATION_STARTED",
    description: "Animation playback started.",
    category: REGISTRY_CATEGORY.GRAPHICS,
    publishers: ["graphics.animation_engine"],
    subscribers: ["graphics.render_engine", "monitoring.graphics"]
  }),
  EVENT_RENDER_COMPLETED: defineEventType({
    eventTypeId: "evt-type.graphics.render_completed",
    canonicalName: "EVENT_RENDER_COMPLETED",
    description: "Render frame or scene completed.",
    category: REGISTRY_CATEGORY.GRAPHICS,
    publishers: ["graphics.render_engine"],
    subscribers: ["monitoring.graphics"]
  }),
  EVENT_AI_REQUEST: defineEventType({
    eventTypeId: "evt-type.ai.request",
    canonicalName: "EVENT_AI_REQUEST",
    description: "AI inference or planning request.",
    category: REGISTRY_CATEGORY.AI,
    publishers: ["ai.conversation", "stream.decision_layer"],
    subscribers: ["ai.llm_adapter"]
  }),
  EVENT_AI_RESPONSE: defineEventType({
    eventTypeId: "evt-type.ai.response",
    canonicalName: "EVENT_AI_RESPONSE",
    description: "AI generated response.",
    category: REGISTRY_CATEGORY.AI,
    payloadSchema: Object.freeze({ required: ["model", "content"] }),
    publishers: ["ai.llm_adapter"],
    subscribers: ["graphics.voice_overlay", "memory.session", "analytics.ai"],
    runtimeAliases: ["AI_RESPONSE"]
  }),
  EVENT_KOJNOZROUT_FED: defineEventType({
    eventTypeId: "evt-type.game.kojnozout_fed",
    canonicalName: "EVENT_KOJNOZROUT_FED",
    description: "Kojnožrout fed or care action.",
    category: REGISTRY_CATEGORY.GAME,
    publishers: ["game.kojnozout_engine"],
    subscribers: ["game.inventory", "graphics.avatar_runtime"],
    runtimeAliases: ["KOJNOZROUT_FEED"]
  }),
  EVENT_ITEM_USED: defineEventType({
    eventTypeId: "evt-type.game.item_used",
    canonicalName: "EVENT_ITEM_USED",
    description: "Inventory item used in game context.",
    category: REGISTRY_CATEGORY.GAME,
    publishers: ["game.kojnozout_engine"],
    subscribers: ["game.inventory", "economy.rewards"]
  }),
  EVENT_POINTS_CHANGED: defineEventType({
    eventTypeId: "evt-type.economy.points_changed",
    canonicalName: "EVENT_POINTS_CHANGED",
    description: "MIA points balance changed.",
    category: REGISTRY_CATEGORY.ECONOMY,
    publishers: ["economy.gift_engine", "economy.chat_reward"],
    subscribers: ["graphics.overlay", "memory.session", "analytics.economy"]
  }),
  EVENT_REWARD_GRANTED: defineEventType({
    eventTypeId: "evt-type.economy.reward_granted",
    canonicalName: "EVENT_REWARD_GRANTED",
    description: "Reward granted to viewer or streamer.",
    category: REGISTRY_CATEGORY.ECONOMY,
    publishers: ["economy.gift_engine", "game.quest_engine"],
    subscribers: ["graphics.overlay", "memory.session"]
  })
});

const REGISTRY_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-event-core/eventRegistry.js",
  "shared/mia-event-core/eventBusInfrastructure.js",
  "shared/platform_normalizers/normalize_event.js"
]);

function isRegistryCategory(value) {
  return typeof value === "string" && Object.values(REGISTRY_CATEGORY).includes(value);
}

function isRegistryDefinitionStatus(value) {
  return typeof value === "string" && Object.values(REGISTRY_DEFINITION_STATUS).includes(value);
}

function validateCanonicalEventName(name) {
  const value = String(name || "").trim();
  if (!CANONICAL_NAME_PATTERN.test(value)) {
    return { ok: false, reason: "invalid_canonical_name" };
  }
  if (!value.startsWith("EVENT_")) {
    return { ok: false, reason: "missing_event_prefix" };
  }
  return { ok: true, reason: null };
}

function listEventTypeDefinitions(filter = {}) {
  let rows = Object.values(EVENT_TYPE_REGISTRY);
  if (filter.category) {
    rows = rows.filter((row) => row.category === filter.category);
  }
  if (filter.status) {
    rows = rows.filter((row) => row.status === filter.status);
  }
  if (filter.publisher) {
    const pub = String(filter.publisher);
    rows = rows.filter((row) => row.publishers.includes(pub));
  }
  if (filter.subscriber) {
    const sub = String(filter.subscriber);
    rows = rows.filter((row) => row.subscribers.includes(sub));
  }
  return rows;
}

function getEventTypeDefinition(canonicalNameOrAlias) {
  const raw = String(canonicalNameOrAlias || "").trim();
  if (!raw) return null;

  if (EVENT_TYPE_REGISTRY[raw]) {
    return EVENT_TYPE_REGISTRY[raw];
  }

  const upper = raw.toUpperCase();
  for (const def of Object.values(EVENT_TYPE_REGISTRY)) {
    if (def.canonicalName === upper) return def;
    if (def.runtimeAliases.includes(upper)) return def;
  }
  return null;
}

function resolveCanonicalEventName(runtimeType = "") {
  const def = getEventTypeDefinition(runtimeType);
  return def ? def.canonicalName : null;
}

function createEventTypeDefinition(input = {}) {
  const canonicalName = String(input.canonicalName || "").trim().toUpperCase();
  const nameCheck = validateCanonicalEventName(canonicalName);
  if (!nameCheck.ok) {
    throw new Error(`Invalid canonical name: ${canonicalName} (${nameCheck.reason})`);
  }
  if (!isRegistryCategory(input.category)) {
    throw new Error(`Invalid registry category: ${input.category}`);
  }

  for (const field of EVENT_TYPE_DEFINITION_FIELDS) {
    if (input[field] == null || input[field] === "") {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  return defineEventType({
    ...input,
    canonicalName,
    eventTypeId: input.eventTypeId,
    status: input.status || REGISTRY_DEFINITION_STATUS.DRAFT
  });
}

function createRegistryAuditEvent(input = {}) {
  const registryId =
    typeof input.registryId === "string" && input.registryId.trim()
      ? input.registryId.trim()
      : `registry-audit-${crypto.randomUUID()}`;

  return Object.freeze({
    registryId,
    author: String(input.author || "unknown"),
    timestamp: input.timestamp != null ? Number(input.timestamp) : Date.now(),
    operation: String(input.operation || "update"),
    oldVersion: input.oldVersion != null ? String(input.oldVersion) : null,
    newVersion: input.newVersion != null ? String(input.newVersion) : null,
    eventTypeId: input.eventTypeId != null ? String(input.eventTypeId) : null
  });
}

function searchEventTypeDefinitions(query = {}) {
  const q = String(query.q || query.name || "").trim().toLowerCase();
  const author = String(query.author || "").trim().toLowerCase();
  const version = String(query.version || "").trim();

  return listEventTypeDefinitions(query).filter((row) => {
    if (q) {
      const haystack = [
        row.canonicalName,
        row.eventTypeId,
        row.description,
        ...row.runtimeAliases
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (author && !row.author.toLowerCase().includes(author)) return false;
    if (version && row.version !== version) return false;
    return true;
  });
}

function assertRegistryForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !REGISTRY_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function countActiveEventTypes() {
  return listEventTypeDefinitions({ status: REGISTRY_DEFINITION_STATUS.ACTIVE }).length;
}

module.exports = {
  REGISTRY_CATEGORY,
  REGISTRY_DEFINITION_STATUS,
  REGISTRY_LIFECYCLE_ORDER,
  EVENT_TYPE_DEFINITION_FIELDS,
  REGISTRY_FORBIDDEN_ACTIVITIES,
  EVENT_TYPE_REGISTRY,
  REGISTRY_RUNTIME_ANCHORS,
  isRegistryCategory,
  isRegistryDefinitionStatus,
  validateCanonicalEventName,
  listEventTypeDefinitions,
  getEventTypeDefinition,
  resolveCanonicalEventName,
  createEventTypeDefinition,
  createRegistryAuditEvent,
  searchEventTypeDefinitions,
  assertRegistryForbiddenActivity,
  countActiveEventTypes
};
