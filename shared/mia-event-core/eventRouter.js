"use strict";

/**
 * Master Canon 0014 — Event Router: distribution planning from Event Registry.
 * Never mutates event payload or priority.
 */

const crypto = require("crypto");
const { EVENT_PRIORITY, compareEventPriority } = require("./eventPriority");
const { getEventTypeDefinition } = require("./eventRegistry");

const ROUTER_COMPONENT = Object.freeze({
  ROUTE_RESOLVER: "route_resolver",
  SUBSCRIBER_RESOLVER: "subscriber_resolver",
  FILTER_ENGINE: "filter_engine",
  PRIORITY_RESOLVER: "priority_resolver",
  BROADCAST_MANAGER: "broadcast_manager",
  MULTICAST_MANAGER: "multicast_manager",
  DIRECT_ROUTE_MANAGER: "direct_route_manager",
  ROUTE_CACHE: "route_cache",
  ROUTE_LOGGER: "route_logger",
  DISPATCHER_CONNECTOR: "dispatcher_connector"
});

const ROUTER_COMPONENT_ORDER = Object.freeze(Object.values(ROUTER_COMPONENT));

const ROUTE_MODE = Object.freeze({
  DIRECT: "direct",
  MULTICAST: "multicast",
  BROADCAST: "broadcast",
  CONDITIONAL: "conditional"
});

const ROUTE_RULE_FIELDS = Object.freeze([
  "ruleId",
  "eventType",
  "subscriber",
  "priority",
  "filter",
  "condition",
  "enabled"
]);

const ROUTER_FORBIDDEN_ACTIVITIES = Object.freeze([
  "mutate_payload",
  "mutate_event_priority",
  "create_business_events",
  "invoke_ai",
  "persist_business_data"
]);

const ROUTE_ERROR_CODE = Object.freeze({
  UNKNOWN_EVENT_TYPE: "unknown_event_type",
  NO_ACTIVE_SUBSCRIBERS: "no_active_subscribers",
  PERMISSION_DENIED: "permission_denied",
  ROUTE_COMPUTE_FAILED: "route_compute_failed"
});

/** Default route mode per canonical event type. */
const ROUTE_MODE_BY_EVENT = Object.freeze({
  EVENT_SYSTEM_STARTED: ROUTE_MODE.MULTICAST,
  EVENT_SYSTEM_STOPPED: ROUTE_MODE.BROADCAST,
  EVENT_RUNTIME_READY: ROUTE_MODE.DIRECT,
  EVENT_RUNTIME_FAILED: ROUTE_MODE.MULTICAST,
  EVENT_CHAT_MESSAGE: ROUTE_MODE.MULTICAST,
  EVENT_GIFT_RECEIVED: ROUTE_MODE.MULTICAST,
  EVENT_FOLLOW: ROUTE_MODE.MULTICAST,
  EVENT_ANIMATION_STARTED: ROUTE_MODE.DIRECT,
  EVENT_RENDER_COMPLETED: ROUTE_MODE.DIRECT,
  EVENT_AI_REQUEST: ROUTE_MODE.DIRECT,
  EVENT_AI_RESPONSE: ROUTE_MODE.MULTICAST,
  EVENT_KOJNOZROUT_FED: ROUTE_MODE.MULTICAST,
  EVENT_ITEM_USED: ROUTE_MODE.MULTICAST,
  EVENT_POINTS_CHANGED: ROUTE_MODE.MULTICAST,
  EVENT_REWARD_GRANTED: ROUTE_MODE.MULTICAST
});

/** MIA reference gift route (0014 §18). */
const MIA_GIFT_ROUTE_CHAIN = Object.freeze([
  "economy.gift_engine",
  "game.kojnozout",
  "graphics.video_engine",
  "graphics.overlay",
  "analytics.stream",
  "memory.session"
]);

const ROUTER_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-event-core/eventRouter.js",
  "shared/mia-event-core/eventRegistry.js",
  "scripts/pipeline/run.js",
  "scripts/MIA_INGEST_QUEUE.js"
]);

function createRouteCache() {
  const store = new Map();
  let registryVersion = 0;

  return {
    get(key) {
      const row = store.get(key);
      if (!row) return null;
      if (row.registryVersion !== registryVersion) return null;
      return row.plan;
    },
    set(key, plan) {
      store.set(key, { plan, registryVersion, cachedAt: Date.now() });
    },
    invalidate() {
      registryVersion += 1;
      store.clear();
    },
    size() {
      return store.size;
    }
  };
}

const defaultRouteCache = createRouteCache();

function isRouteMode(value) {
  return typeof value === "string" && Object.values(ROUTE_MODE).includes(value);
}

function createRouteRule(input = {}) {
  const ruleId = String(input.ruleId || "").trim();
  const eventType = String(input.eventType || "").trim().toUpperCase();
  const subscriber = String(input.subscriber || "").trim();
  if (!ruleId || !eventType || !subscriber) {
    throw new Error("ruleId, eventType and subscriber are required");
  }

  return Object.freeze({
    ruleId,
    eventType,
    subscriber,
    priority: Object.values(EVENT_PRIORITY).includes(input.priority)
      ? input.priority
      : EVENT_PRIORITY.NORMAL,
    filter: input.filter != null ? Object.freeze({ ...input.filter }) : null,
    condition: input.condition != null ? input.condition : null,
    enabled: input.enabled !== false
  });
}

function evaluateFilter(filter, event = {}) {
  if (!filter || typeof filter !== "object") return true;

  if (filter.language) {
    const lang = String(event.language || event.payload?.language || "").toLowerCase();
    if (lang && lang !== String(filter.language).toLowerCase()) return false;
  }

  if (filter.publicOnly === true) {
    if (event.payload?.isPublic === false) return false;
  }

  if (filter.minCoins != null) {
    const coins = Number(event.payload?.support?.coins ?? event.payload?.coins ?? 0);
    if (!Number.isFinite(coins) || coins < Number(filter.minCoins)) return false;
  }

  return true;
}

function evaluateCondition(condition, event = {}) {
  if (!condition || typeof condition !== "object") return true;

  if (condition.coinsGreaterThan != null) {
    const coins = Number(event.payload?.support?.coins ?? event.payload?.coins ?? 0);
    return Number.isFinite(coins) && coins > Number(condition.coinsGreaterThan);
  }

  return true;
}

function resolveRouteMode(canonicalName, subscriberCount) {
  if (ROUTE_MODE_BY_EVENT[canonicalName]) {
    return ROUTE_MODE_BY_EVENT[canonicalName];
  }
  if (subscriberCount <= 1) return ROUTE_MODE.DIRECT;
  return ROUTE_MODE.MULTICAST;
}

function resolveActiveSubscribers(definition, options = {}) {
  const activeSet =
    options.activeSubscribers instanceof Set
      ? options.activeSubscribers
      : new Set(definition.subscribers);

  const denied = new Set(options.deniedSubscribers || []);
  return definition.subscribers.filter((sub) => activeSet.has(sub) && !denied.has(sub));
}

function applySubscriberRules(definition, event = {}, rules = []) {
  const applicable = rules.filter(
    (rule) => rule.enabled && rule.eventType === definition.canonicalName
  );

  const selected = new Set();
  for (const subscriber of definition.subscribers) {
    const subscriberRules = applicable.filter((rule) => rule.subscriber === subscriber);
    if (subscriberRules.length === 0) {
      selected.add(subscriber);
      continue;
    }
    const passed = subscriberRules.every(
      (rule) => evaluateFilter(rule.filter, event) && evaluateCondition(rule.condition, event)
    );
    if (passed) selected.add(subscriber);
  }

  return Array.from(selected);
}

function sortRecipientsByPriority(recipients, rules = []) {
  const priorityBySub = new Map();
  for (const rule of rules) {
    if (rule.subscriber) priorityBySub.set(rule.subscriber, rule.priority);
  }

  return [...recipients].sort((a, b) => {
    const pa = priorityBySub.get(a) || EVENT_PRIORITY.NORMAL;
    const pb = priorityBySub.get(b) || EVENT_PRIORITY.NORMAL;
    return compareEventPriority(pa, pb);
  });
}

function createDistributionPlan(input = {}) {
  const routeId =
    typeof input.routeId === "string" && input.routeId.trim()
      ? input.routeId.trim()
      : `route-${crypto.randomUUID()}`;

  return Object.freeze({
    routeId,
    eventId: String(input.eventId || ""),
    canonicalEventType: String(input.canonicalEventType || ""),
    mode: isRouteMode(input.mode) ? input.mode : ROUTE_MODE.MULTICAST,
    recipients: Object.freeze(Array.isArray(input.recipients) ? input.recipients : []),
    rulesApplied: Object.freeze(Array.isArray(input.rulesApplied) ? input.rulesApplied : []),
    computedAt: input.computedAt != null ? Number(input.computedAt) : Date.now(),
    fromCache: Boolean(input.fromCache),
    eventPriority: input.eventPriority || EVENT_PRIORITY.NORMAL
  });
}

function createRouteLog(input = {}) {
  const routeId = String(input.routeId || "").trim();
  if (!routeId) throw new Error("routeId is required");

  return Object.freeze({
    routeId,
    eventId: String(input.eventId || ""),
    recipients: Object.freeze(Array.isArray(input.recipients) ? input.recipients : []),
    computedAt: input.computedAt != null ? Number(input.computedAt) : Date.now(),
    rulesApplied: Object.freeze(Array.isArray(input.rulesApplied) ? input.rulesApplied : []),
    result: String(input.result || "ok"),
    fromCache: Boolean(input.fromCache)
  });
}

function createRouteError(input = {}) {
  const code = String(input.code || ROUTE_ERROR_CODE.ROUTE_COMPUTE_FAILED);
  return Object.freeze({
    code,
    message: String(input.message || code),
    eventId: input.eventId != null ? String(input.eventId) : null,
    at: input.at != null ? Number(input.at) : Date.now()
  });
}

function computeDistributionPlan(event = {}, options = {}) {
  const cache = options.cache || defaultRouteCache;
  const eventType = String(event.eventType || event.canonicalEventType || "").trim();
  const definition = getEventTypeDefinition(eventType);

  if (!definition) {
    return {
      ok: false,
      error: createRouteError({
        code: ROUTE_ERROR_CODE.UNKNOWN_EVENT_TYPE,
        message: `Unknown event type: ${eventType}`,
        eventId: event.eventId
      }),
      plan: null,
      log: null
    };
  }

  const cacheKey = `${definition.canonicalName}:${JSON.stringify(options.ruleIds || [])}`;
  const cached = options.useCache === false ? null : cache.get(cacheKey);
  if (cached) {
    const log = createRouteLog({
      routeId: cached.routeId,
      eventId: event.eventId,
      recipients: cached.recipients,
      computedAt: cached.computedAt,
      rulesApplied: cached.rulesApplied,
      fromCache: true
    });
    return { ok: true, plan: { ...cached, fromCache: true }, log, error: null };
  }

  const rules = Array.isArray(options.rules) ? options.rules : [];
  let recipients = applySubscriberRules(definition, event, rules);

  const active = resolveActiveSubscribers(definition, options);
  recipients = recipients.filter((sub) => active.includes(sub));

  if (options.routeMode === ROUTE_MODE.BROADCAST) {
    recipients = [...definition.subscribers];
  }

  if (options.routeMode === ROUTE_MODE.CONDITIONAL && options.conditionalRoutes) {
    const conditional = options.conditionalRoutes.find((row) =>
      evaluateCondition(row.condition, event)
    );
    if (conditional && Array.isArray(conditional.recipients)) {
      recipients = conditional.recipients.filter((sub) => active.includes(sub));
    }
  }

  recipients = sortRecipientsByPriority(recipients, rules);

  if (recipients.length === 0) {
    return {
      ok: false,
      error: createRouteError({
        code: ROUTE_ERROR_CODE.NO_ACTIVE_SUBSCRIBERS,
        message: `No active subscribers for ${definition.canonicalName}`,
        eventId: event.eventId
      }),
      plan: null,
      log: createRouteLog({
        routeId: `route-empty-${crypto.randomUUID()}`,
        eventId: event.eventId,
        recipients: [],
        result: "no_recipients"
      })
    };
  }

  const mode =
    options.routeMode && isRouteMode(options.routeMode)
      ? options.routeMode
      : resolveRouteMode(definition.canonicalName, recipients.length);

  const finalRecipients =
    mode === ROUTE_MODE.DIRECT ? [recipients[0]] : Object.freeze([...recipients]);

  const plan = createDistributionPlan({
    eventId: event.eventId,
    canonicalEventType: definition.canonicalName,
    mode,
    recipients: finalRecipients,
    rulesApplied: rules.map((rule) => rule.ruleId),
    eventPriority: event.priority || EVENT_PRIORITY.NORMAL
  });

  if (options.useCache !== false) {
    cache.set(cacheKey, plan);
  }

  const log = createRouteLog({
    routeId: plan.routeId,
    eventId: event.eventId,
    recipients: plan.recipients,
    computedAt: plan.computedAt,
    rulesApplied: plan.rulesApplied,
    result: "ok"
  });

  return { ok: true, plan, log, error: null };
}

function assertRouterForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !ROUTER_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function describeGiftRouteChain() {
  return MIA_GIFT_ROUTE_CHAIN.join(" → ");
}

module.exports = {
  ROUTER_COMPONENT,
  ROUTER_COMPONENT_ORDER,
  ROUTE_MODE,
  ROUTE_RULE_FIELDS,
  ROUTER_FORBIDDEN_ACTIVITIES,
  ROUTE_ERROR_CODE,
  ROUTE_MODE_BY_EVENT,
  MIA_GIFT_ROUTE_CHAIN,
  ROUTER_RUNTIME_ANCHORS,
  createRouteCache,
  defaultRouteCache,
  isRouteMode,
  createRouteRule,
  evaluateFilter,
  evaluateCondition,
  createDistributionPlan,
  createRouteLog,
  createRouteError,
  computeDistributionPlan,
  assertRouterForbiddenActivity,
  describeGiftRouteChain
};
