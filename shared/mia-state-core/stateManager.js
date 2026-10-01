"use strict";

/**
 * Master Canon 0061 — State Manager: sole authority for state registry, validated transitions, and Event Bus publish.
 */

const SM_COMPONENT = Object.freeze({
  STATE_MANAGER: "state_manager",
  STATE_REGISTRY: "state_registry",
  STATE_MACHINE: "state_machine",
  TRANSITION_VALIDATOR: "transition_validator",
  EVENT_PUBLISHER: "event_publisher",
  HISTORY_STORE: "history_store",
  PERSISTENCE: "persistence",
  SYNC_VIEW: "sync_view",
  AI_BRIDGE: "ai_bridge",
  BATTLE_BRIDGE: "battle_bridge",
  AUDIT_LOG: "audit_log",
  METRICS: "metrics"
});

const SM_COMPONENT_ORDER = Object.freeze(Object.values(SM_COMPONENT));

const SM_STATE_KIND = Object.freeze({
  SYSTEM: "system",
  SERVICE: "service",
  MODULE: "module",
  GAMEPLAY: "gameplay",
  ENTITY: "entity"
});

const SM_GENERIC = Object.freeze({
  CREATED: "created",
  INITIALIZED: "initialized",
  READY: "ready",
  ACTIVE: "active",
  PAUSED: "paused",
  STOPPING: "stopping",
  STOPPED: "stopped",
  FAILED: "failed"
});

const SM_SYSTEM = Object.freeze({
  STARTING: "starting",
  READY: "ready",
  PAUSED: "paused",
  SAFE_MODE: "safe_mode",
  SHUTDOWN: "shutdown"
});

const SM_SERVICE = Object.freeze({
  RUNNING: "running",
  FAILED: "failed",
  STOPPED: "stopped",
  READY: "ready"
});

const SM_MODULE = Object.freeze({
  LOADED: "loaded",
  UNLOADED: "unloaded",
  UPDATING: "updating"
});

const SM_BATTLE = Object.freeze({
  WAITING: "waiting",
  STARTING: "starting",
  ACTIVE: "active",
  FINISHED: "finished",
  REWARD: "reward"
});

const SM_EVENT = Object.freeze({
  STATE_CHANGED: "StateChanged"
});

const SM_PUBLIC_API = Object.freeze([
  "register",
  "transition",
  "get",
  "getSyncedView",
  "subscribe",
  "history",
  "snapshot",
  "restore",
  "registerBattleState",
  "metrics"
]);

const SM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-state-core/stateManager.js",
  "shared/mia-service-core/serviceManager.js",
  "shared/mia-scheduler-core/taskScheduler.js",
  "shared/mia-timer-core/timerEngine.js",
  "docs/master-canon/0061-state-manager.md"
]);

const SM_DEFAULT_TRANSITIONS = Object.freeze({
  [SM_GENERIC.CREATED]: [SM_GENERIC.INITIALIZED, SM_GENERIC.FAILED],
  [SM_GENERIC.INITIALIZED]: [SM_GENERIC.READY, SM_GENERIC.FAILED],
  [SM_GENERIC.READY]: [SM_GENERIC.ACTIVE, SM_GENERIC.STOPPING, SM_GENERIC.FAILED],
  [SM_GENERIC.ACTIVE]: [SM_GENERIC.PAUSED, SM_GENERIC.STOPPING, SM_GENERIC.FAILED],
  [SM_GENERIC.PAUSED]: [SM_GENERIC.ACTIVE, SM_GENERIC.STOPPING, SM_GENERIC.FAILED],
  [SM_GENERIC.STOPPING]: [SM_GENERIC.STOPPED, SM_GENERIC.FAILED],
  [SM_GENERIC.STOPPED]: [SM_GENERIC.INITIALIZED, SM_GENERIC.CREATED],
  [SM_GENERIC.FAILED]: [SM_GENERIC.INITIALIZED, SM_GENERIC.STOPPED]
});

const SM_SYSTEM_TRANSITIONS = Object.freeze({
  [SM_SYSTEM.STARTING]: [SM_SYSTEM.READY, SM_SYSTEM.SAFE_MODE, SM_SYSTEM.SHUTDOWN],
  [SM_SYSTEM.READY]: [SM_SYSTEM.PAUSED, SM_SYSTEM.SAFE_MODE, SM_SYSTEM.SHUTDOWN],
  [SM_SYSTEM.PAUSED]: [SM_SYSTEM.READY, SM_SYSTEM.SAFE_MODE, SM_SYSTEM.SHUTDOWN],
  [SM_SYSTEM.SAFE_MODE]: [SM_SYSTEM.READY, SM_SYSTEM.SHUTDOWN],
  [SM_SYSTEM.SHUTDOWN]: []
});

const SM_BATTLE_TRANSITIONS = Object.freeze({
  [SM_BATTLE.WAITING]: [SM_BATTLE.STARTING],
  [SM_BATTLE.STARTING]: [SM_BATTLE.ACTIVE, SM_BATTLE.WAITING],
  [SM_BATTLE.ACTIVE]: [SM_BATTLE.FINISHED],
  [SM_BATTLE.FINISHED]: [SM_BATTLE.REWARD],
  [SM_BATTLE.REWARD]: [SM_BATTLE.WAITING]
});

const SM_SYSTEM_PROTECTED = Object.freeze(["state-kernel", "state-runtime"]);

function assertDirectMutationForbidden(activity) {
  if (
    activity === "direct_state_write" ||
    activity === "ai_bypass_api" ||
    activity === "mutate_without_manager"
  ) {
    return { ok: false, error: "direct_state_mutation_forbidden" };
  }
  return { ok: true };
}

function validateTransition(machine, from, to, conditions = {}) {
  const allowed = (machine && machine[from]) || [];
  if (!allowed.includes(to)) {
    return { ok: false, error: "invalid_transition", from, to };
  }
  if (conditions.require === false) {
    return { ok: false, error: "condition_not_met", from, to };
  }
  if (Array.isArray(conditions.dependencies)) {
    const unmet = conditions.dependencies.filter((d) => d && d.ok === false);
    if (unmet.length) {
      return { ok: false, error: "dependency_violation", unmet };
    }
  }
  return { ok: true, from, to };
}

function createStateDescriptor(input = {}) {
  const stateId = String(input.stateId || input.id || "").trim();
  if (!stateId) return { ok: false, error: "missing_state_id" };
  const owner = String(input.owner || "").trim();
  if (!owner) return { ok: false, error: "missing_owner" };

  const now = Date.now();
  return {
    ok: true,
    descriptor: Object.freeze({
      stateId,
      owner,
      kind: input.kind || SM_STATE_KIND.SERVICE,
      currentState: input.currentState || SM_GENERIC.CREATED,
      previousState: null,
      version: 1,
      timestamp: now,
      source: input.source || "register",
      lastModified: now,
      durable: input.durable === true,
      machine: input.machine || SM_DEFAULT_TRANSITIONS,
      protected: input.protected === true || SM_SYSTEM_PROTECTED.includes(stateId)
    })
  };
}

function createStateManager(options = {}) {
  const singleton = options.singleton !== false;
  const states = new Map();
  const history = [];
  const audit = [];
  const subscribers = [];
  const persisted = new Map();
  const changeLog = [];
  let invalidTransitions = 0;
  let changeCount = 0;
  const eventBus =
    options.eventBus ||
    ({
      publish(event) {
        return { ok: true, event };
      }
    });

  const authorized = new Set(
    options.authorizedActors || ["kernel", "service_manager", "battle-engine", "state_manager", "system"]
  );

  function appendAudit(record) {
    audit.push(
      Object.freeze({
        ...record,
        at: record.at || Date.now(),
        immutable: true
      })
    );
  }

  function get(stateId) {
    return states.get(stateId) || null;
  }

  function set(stateId, patch) {
    const prev = get(stateId);
    if (!prev) return null;
    const next = Object.freeze({ ...prev, ...patch });
    states.set(stateId, next);
    return next;
  }

  function publishStateChanged(payload) {
    const event = Object.freeze({
      type: SM_EVENT.STATE_CHANGED,
      ...payload,
      at: Date.now()
    });
    const published = eventBus.publish(event);
    for (const sub of subscribers) {
      try {
        sub(event);
      } catch (_) {
        /* isolate subscriber failures */
      }
    }
    return { ok: !!published.ok, event };
  }

  function register(input = {}, meta = {}) {
    const built = createStateDescriptor(input);
    if (!built.ok) return built;
    if (states.has(built.descriptor.stateId)) {
      return { ok: false, error: "duplicate_state_id" };
    }
    states.set(built.descriptor.stateId, built.descriptor);
    appendAudit({
      action: "registered",
      stateId: built.descriptor.stateId,
      owner: built.descriptor.owner,
      result: built.descriptor.currentState,
      actor: meta.actor || "system"
    });
    return { ok: true, state: built.descriptor };
  }

  function transition(stateId, nextState, meta = {}) {
    const forbidden = assertDirectMutationForbidden(meta.activity);
    if (!forbidden.ok) return forbidden;

    const actor = meta.actor || meta.source || "";
    if (actor && !authorized.has(actor) && meta.authorized !== true) {
      invalidTransitions += 1;
      appendAudit({
        action: "denied",
        stateId,
        owner: null,
        result: "unauthorized",
        actor
      });
      return { ok: false, error: "unauthorized_actor" };
    }

    const record = get(stateId);
    if (!record) return { ok: false, error: "unknown_state" };

    if (record.protected && meta.force !== true && nextState === SM_SYSTEM.SHUTDOWN === false) {
      // allow protected transitions only for authorized system actors
      if (!authorized.has(actor) && meta.authorized !== true) {
        return { ok: false, error: "system_state_protected" };
      }
    }

    const validation = validateTransition(record.machine, record.currentState, nextState, {
      require: meta.condition !== false,
      dependencies: meta.dependencies
    });
    if (!validation.ok) {
      invalidTransitions += 1;
      appendAudit({
        action: "invalid_transition",
        stateId,
        owner: record.owner,
        result: `${record.currentState}->${nextState}`,
        actor: actor || "unknown",
        reason: validation.error
      });
      return validation;
    }

    const previous = record.currentState;
    const now = Date.now();
    const version = record.version + 1;
    const updated = set(stateId, {
      previousState: previous,
      currentState: nextState,
      version,
      timestamp: now,
      source: actor || meta.source || "transition",
      lastModified: now
    });

    const hist = Object.freeze({
      stateId,
      previousState: previous,
      newState: nextState,
      at: now,
      source: updated.source,
      reason: meta.reason || "transition",
      version
    });
    history.push(hist);
    changeLog.push({ at: now, from: previous, to: nextState });
    changeCount += 1;

    appendAudit({
      action: "transition",
      stateId,
      owner: record.owner,
      result: `${previous}->${nextState}`,
      actor: updated.source,
      reason: meta.reason || "transition"
    });

    const published = publishStateChanged({
      stateId,
      owner: record.owner,
      previousState: previous,
      currentState: nextState,
      version,
      source: updated.source,
      reason: meta.reason || "transition"
    });

    if (record.durable) {
      persisted.set(stateId, {
        stateId,
        currentState: nextState,
        version,
        kind: record.kind,
        owner: record.owner
      });
    }

    return {
      ok: true,
      state: updated,
      eventPublished: published.ok,
      eventType: SM_EVENT.STATE_CHANGED
    };
  }

  function subscribe(handler) {
    if (typeof handler !== "function") return { ok: false, error: "invalid_subscriber" };
    subscribers.push(handler);
    return { ok: true, count: subscribers.length };
  }

  function getSyncedView(stateId) {
    const record = get(stateId);
    if (!record) return { ok: false, error: "unknown_state" };
    const view = Object.freeze({
      stateId: record.stateId,
      currentState: record.currentState,
      version: record.version,
      lastModified: record.lastModified,
      consumers: Object.freeze(["overlay", "obs", "chat", "ai", "battle"])
    });
    return { ok: true, consistent: true, view };
  }

  function snapshot() {
    const durable = [];
    for (const record of states.values()) {
      if (!record.durable) continue;
      durable.push(
        Object.freeze({
          stateId: record.stateId,
          currentState: record.currentState,
          version: record.version,
          kind: record.kind,
          owner: record.owner
        })
      );
    }
    return Object.freeze({ ok: true, durable: Object.freeze(durable) });
  }

  function restore(snapshotData = {}, meta = {}) {
    const items = snapshotData.durable || [];
    const restored = [];
    const skipped = [];
    for (const item of items) {
      const existing = get(item.stateId);
      if (!existing) {
        register({
          stateId: item.stateId,
          owner: item.owner,
          kind: item.kind,
          currentState: item.currentState,
          durable: true,
          machine: item.machine
        });
        restored.push(item.stateId);
        continue;
      }
      if (!existing.durable && meta.restoreEphemeral !== true) {
        skipped.push(item.stateId);
        continue;
      }
      set(item.stateId, {
        currentState: item.currentState,
        previousState: existing.currentState,
        version: item.version || existing.version + 1,
        lastModified: Date.now(),
        source: meta.actor || "restore"
      });
      restored.push(item.stateId);
    }
    appendAudit({
      action: "restore",
      stateId: null,
      owner: "state_manager",
      result: `restored:${restored.length}`,
      actor: meta.actor || "system"
    });
    return {
      ok: true,
      restored: Object.freeze(restored),
      skipped: Object.freeze(skipped),
      battleNotRestoredByDefault: true
    };
  }

  function registerBattleState(input = {}) {
    return register({
      stateId: input.stateId || "state-battle",
      owner: input.owner || "battle-engine",
      kind: SM_STATE_KIND.GAMEPLAY,
      currentState: input.currentState || SM_BATTLE.WAITING,
      machine: SM_BATTLE_TRANSITIONS,
      durable: false
    });
  }

  function metrics() {
    const now = Date.now();
    const recent = changeLog.filter((c) => now - c.at <= 60_000);
    const pairCounts = {};
    for (const c of changeLog) {
      const key = `${c.from}->${c.to}`;
      pairCounts[key] = (pairCounts[key] || 0) + 1;
    }
    const mostFrequent = Object.entries(pairCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => Object.freeze({ transition: k, count: v }));

    let avgGap = 0;
    if (changeLog.length > 1) {
      let sum = 0;
      for (let i = 1; i < changeLog.length; i += 1) {
        sum += changeLog[i].at - changeLog[i - 1].at;
      }
      avgGap = sum / (changeLog.length - 1);
    }

    return Object.freeze({
      registered: states.size,
      changes: changeCount,
      changesPerMinute: recent.length,
      invalidTransitions,
      mostFrequent: Object.freeze(mostFrequent),
      avgTimeBetweenChangesMs: avgGap,
      historySize: history.length
    });
  }

  if (options.seedDefaults !== false) {
    register({
      stateId: "state-kernel",
      owner: "kernel",
      kind: SM_STATE_KIND.SYSTEM,
      currentState: SM_SYSTEM.STARTING,
      machine: SM_SYSTEM_TRANSITIONS,
      durable: true,
      protected: true
    });
    register({
      stateId: "state-runtime",
      owner: "runtime",
      kind: SM_STATE_KIND.SYSTEM,
      currentState: SM_GENERIC.CREATED,
      durable: true,
      protected: true
    });
    register({
      stateId: "state-feature-flags",
      owner: "configuration",
      kind: SM_STATE_KIND.MODULE,
      currentState: SM_MODULE.LOADED,
      machine: {
        [SM_MODULE.LOADED]: [SM_MODULE.UPDATING, SM_MODULE.UNLOADED],
        [SM_MODULE.UPDATING]: [SM_MODULE.LOADED],
        [SM_MODULE.UNLOADED]: [SM_MODULE.LOADED]
      },
      durable: true
    });
    registerBattleState();
    transition("state-kernel", SM_SYSTEM.READY, {
      actor: "kernel",
      reason: "boot"
    });
    transition("state-runtime", SM_GENERIC.INITIALIZED, {
      actor: "kernel",
      reason: "boot"
    });
    transition("state-runtime", SM_GENERIC.READY, {
      actor: "kernel",
      reason: "boot"
    });
  }

  return {
    register,
    transition,
    get,
    getSyncedView,
    subscribe,
    history() {
      return Object.freeze([...history]);
    },
    snapshot,
    restore,
    registerBattleState,
    publishStateChanged,
    validateTransition,
    assertDirectMutationForbidden,
    metrics,
    list() {
      return Object.freeze({ states: Object.freeze([...states.values()]) });
    },
    auditTrail() {
      return Object.freeze([...audit]);
    },
    status() {
      return Object.freeze({
        singleton,
        soleStateAuthority: true,
        component: SM_COMPONENT.STATE_MANAGER,
        stateCount: states.size,
        eventType: SM_EVENT.STATE_CHANGED
      });
    },
    snapshotStatus() {
      return Object.freeze({
        ok: true,
        singleton,
        metrics: metrics()
      });
    }
  };
}

module.exports = {
  SM_COMPONENT,
  SM_COMPONENT_ORDER,
  SM_STATE_KIND,
  SM_GENERIC,
  SM_SYSTEM,
  SM_SERVICE,
  SM_MODULE,
  SM_BATTLE,
  SM_EVENT,
  SM_PUBLIC_API,
  SM_RUNTIME_ANCHORS,
  SM_DEFAULT_TRANSITIONS,
  SM_SYSTEM_TRANSITIONS,
  SM_BATTLE_TRANSITIONS,
  SM_SYSTEM_PROTECTED,
  assertDirectMutationForbidden,
  validateTransition,
  createStateDescriptor,
  createStateManager
};
