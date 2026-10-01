"use strict";

/**
 * Master Canon 0080 — Projection Manager.
 * Kernel Layer 0 sole central authority for Read Models built from domain events.
 * PM never creates domain events, never mutates Event Store history,
 * never runs business logic beyond projection reducers.
 */

const crypto = require("crypto");

const PM_COMPONENT = Object.freeze({
  PROJECTION_MANAGER: "projection_manager",
  INTAKE_GATE: "intake_gate",
  DESCRIPTOR_FACTORY: "descriptor_factory",
  TYPE_REGISTRY: "type_registry",
  APPLY_ENGINE: "apply_engine",
  INCREMENTAL_UPDATER: "incremental_updater",
  REPLAY_REBUILDER: "replay_rebuilder",
  VERSION_CONTROLLER: "version_controller",
  QUERY_FEED: "query_feed",
  EVENT_BUS_ADAPTER: "event_bus_adapter",
  SECURITY_GATE: "security_gate",
  PROJECTION_AUDIT: "projection_audit"
});

const PM_COMPONENT_ORDER = Object.freeze(Object.values(PM_COMPONENT));

const PM_DESCRIPTOR_FIELDS = Object.freeze([
  "projectionId",
  "projectionType",
  "sourceStream",
  "version",
  "lastEvent",
  "created",
  "updated",
  "status"
]);

const PM_STATUS = Object.freeze({
  BUILDING: "building",
  READY: "ready",
  REBUILDING: "rebuilding",
  DELETED: "deleted"
});

const PM_PROJECTION_TYPE = Object.freeze({
  INVENTORY: "inventory",
  BATTLE: "battle",
  LEADERBOARD: "leaderboard",
  GIFT_STATISTICS: "gift_statistics",
  RUNTIME: "runtime",
  AI: "ai",
  OVERLAY: "overlay"
});

const PM_AUTHORIZED_SOURCES = Object.freeze([
  "kernel",
  "operator",
  "admin",
  "system",
  "runtime",
  "runtime_manager",
  "runtime-manager",
  "scheduler",
  "task_scheduler",
  "service_manager",
  "service-manager",
  "projection_manager",
  "projection-manager",
  "event_bus",
  "event-bus",
  "event_store",
  "event-store",
  "query_bus",
  "query-bus",
  "command_bus",
  "command-bus",
  "state_manager",
  "state-manager",
  "ai_engine",
  "battle_engine",
  "gift_engine",
  "inventory",
  "platform",
  "security",
  "monitoring"
]);

const PM_FLAGS = Object.freeze({
  soleProjectionAuthority: true,
  createsDomainEvents: false,
  mutatesEventStore: false,
  sourceOfTruthIsEventStore: true,
  eventualConsistency: true,
  manualPatchBlocked: true,
  queryReadsProjectionsOnly: true
});

const PM_PUBLIC_API = Object.freeze([
  "createProjection",
  "updateProjection",
  "rebuildProjection",
  "deleteProjection",
  "getProjection"
]);

const PM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-projection-core/projectionManager.js",
  "shared/mia-state-core/stateManager.js",
  "shared/mia-event-store-core/eventStoreManager.js",
  "shared/mia-event-bus-core/eventBusManager.js",
  "shared/mia-query-bus-core/queryBusManager.js",
  "docs/master-canon/0080-projection-manager.md"
]);

let activeProjectionManager = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function rejectManualPatch(op) {
  return Object.freeze({
    ok: false,
    error: `projection_${op}_rejected`,
    manualPatchBlocked: true,
    createsDomainEvents: false,
    mutatesEventStore: false
  });
}

function defaultReducerForType(projectionType) {
  const type = String(projectionType || "").trim();
  if (type === PM_PROJECTION_TYPE.INVENTORY) {
    return (state, event) => {
      const prev = state && typeof state === "object" ? { ...state } : { items: [] };
      const items = Array.isArray(prev.items) ? [...prev.items] : [];
      const payload = event && event.payload && typeof event.payload === "object"
        ? event.payload
        : {};
      if (payload.item != null) items.push(payload.item);
      if (Array.isArray(payload.items)) items.push(...payload.items);
      if (payload.removeItem != null) {
        const idx = items.indexOf(payload.removeItem);
        if (idx >= 0) items.splice(idx, 1);
      }
      return Object.freeze({
        ...prev,
        ...payload,
        items: Object.freeze(items)
      });
    };
  }
  if (type === PM_PROJECTION_TYPE.BATTLE) {
    return (state, event) => {
      const prev = state && typeof state === "object" ? { ...state } : { status: "idle" };
      const payload = event && event.payload && typeof event.payload === "object"
        ? event.payload
        : {};
      return Object.freeze({
        ...prev,
        ...payload,
        status:
          payload.status != null
            ? payload.status
            : event && event.eventType
              ? String(event.eventType)
              : prev.status || "idle"
      });
    };
  }
  // shallow merge for leaderboard, gift_statistics, runtime, ai, overlay, custom
  return (state, event) => {
    const prev = state && typeof state === "object" ? { ...state } : {};
    const payload = event && event.payload && typeof event.payload === "object"
      ? event.payload
      : {};
    return Object.freeze({ ...prev, ...payload });
  };
}

function createProjectionDescriptor(input = {}) {
  const projectionType = String(input.projectionType || input.type || "").trim();
  if (!projectionType) return { ok: false, error: "missing_projectionType" };

  const sourceStream = String(input.sourceStream || input.stream || "").trim();
  if (!sourceStream) return { ok: false, error: "missing_sourceStream" };

  const now =
    typeof input.nowMs === "number" && Number.isFinite(input.nowMs)
      ? input.nowMs
      : Date.now();

  const created =
    typeof input.created === "number" && Number.isFinite(input.created)
      ? input.created
      : now;

  const updated =
    typeof input.updated === "number" && Number.isFinite(input.updated)
      ? input.updated
      : created;

  const version =
    typeof input.version === "number" && Number.isFinite(input.version)
      ? Math.max(0, Math.floor(input.version))
      : 0;

  const status = String(input.status || PM_STATUS.READY).trim() || PM_STATUS.READY;

  const projectionId =
    input.projectionId != null && String(input.projectionId).trim()
      ? String(input.projectionId).trim()
      : makeId("proj");

  const lastEvent =
    input.lastEvent != null && String(input.lastEvent).trim()
      ? String(input.lastEvent).trim()
      : null;

  const descriptor = {
    projectionId,
    projectionType,
    sourceStream,
    version,
    lastEvent,
    created,
    updated,
    status
  };

  return {
    ok: true,
    descriptor: Object.freeze(descriptor)
  };
}

function createProjectionManager(options = {}) {
  if (
    activeProjectionManager &&
    activeProjectionManager.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "projection_manager_already_active",
      soleProjectionAuthority: true
    });
  }

  const authorized = new Set(
    options.authorizedSources || PM_AUTHORIZED_SOURCES
  );
  const eventStoreBridge = options.eventStoreBridge || null;

  /** @type {Map<string, object>} */
  const knownTypes = new Map();
  for (const t of Object.values(PM_PROJECTION_TYPE)) {
    knownTypes.set(t, { name: t, builtIn: true });
  }

  /** @type {Map<string, Function>} */
  const reducers = new Map();
  for (const t of Object.values(PM_PROJECTION_TYPE)) {
    reducers.set(t, defaultReducerForType(t));
  }

  /** @type {Map<string, { descriptor: object, state: object, reducer: Function }>} */
  const projections = new Map();
  const projectionAuditLog = [];

  let updateCount = 0;
  let rebuildCount = 0;
  let errorCount = 0;
  let updateMsSum = 0;
  let updateMsSamples = 0;
  let active = true;

  function isAuthorized(meta = {}) {
    return (
      meta.authorized === true ||
      authorized.has(meta.source || "") ||
      authorized.has(meta.actor || "") ||
      authorized.has(meta.sender || "")
    );
  }

  function isSourceVerified(meta = {}) {
    if (meta.forged === true) return false;
    if (meta.sourceVerified === false) return false;
    if (meta.sourceVerified === true) return true;
    return isAuthorized(meta);
  }

  function gate(meta, _operation, { requireAuth = true } = {}) {
    if (requireAuth && !isAuthorized(meta)) {
      return Object.freeze({ ok: false, error: "unauthorized_projection" });
    }
    if (!isSourceVerified(meta)) {
      return Object.freeze({ ok: false, error: "forged_projection_blocked" });
    }
    return null;
  }

  function verifyEventIntegrity(event) {
    if (event == null || typeof event !== "object") {
      return { ok: false, error: "invalid_event" };
    }
    if (event.forged === true || event.integrityOk === false) {
      return { ok: false, error: "event_integrity_failed" };
    }
    return { ok: true };
  }

  function eventSequence(event) {
    if (event == null) return null;
    if (typeof event.version === "number" && Number.isFinite(event.version)) {
      return event.version;
    }
    if (typeof event.sequence === "number" && Number.isFinite(event.sequence)) {
      return event.sequence;
    }
    return null;
  }

  function lastEventSequence(entry) {
    const le = entry.descriptor.lastEvent;
    if (le == null) return null;
    if (typeof le === "number" && Number.isFinite(le)) return le;
    const asNum = Number(le);
    if (Number.isFinite(asNum) && String(asNum) === String(le).trim()) {
      return asNum;
    }
    // lastEvent may be eventId string — sequence compare only when numeric seq stored
    if (entry.lastEventSequence != null) return entry.lastEventSequence;
    return null;
  }

  function recordAudit(entry) {
    projectionAuditLog.push(
      Object.freeze({
        projectionId: entry.projectionId,
        sourceEvent: entry.sourceEvent != null ? entry.sourceEvent : null,
        updatedAt: entry.updatedAt != null ? entry.updatedAt : Date.now(),
        newVersion: entry.newVersion != null ? entry.newVersion : null,
        result: entry.result || "unknown",
        correlationId:
          entry.correlationId != null ? entry.correlationId : null
      })
    );
  }

  function freezeView(entry) {
    return Object.freeze({
      ...entry.descriptor,
      state: entry.state,
      readOnly: true,
      soleProjectionAuthority: true,
      queryReadsProjectionsOnly: true,
      createsDomainEvents: false,
      mutatesEventStore: false
    });
  }

  function registerType(typeName, meta = {}) {
    const name = String(typeName || "").trim();
    if (!name) return Object.freeze({ ok: false, error: "missing_type" });
    if (knownTypes.has(name) && meta.force !== true) {
      return Object.freeze({
        ok: false,
        error: "type_already_registered",
        projectionType: name
      });
    }
    knownTypes.set(name, Object.freeze({ name, ...(meta || {}), builtIn: false }));
    if (!reducers.has(name)) {
      reducers.set(name, defaultReducerForType(name));
    }
    return Object.freeze({ ok: true, projectionType: name });
  }

  function registerReducer(projectionType, reducerFn, meta = {}) {
    const type = String(projectionType || "").trim();
    if (!type) return Object.freeze({ ok: false, error: "missing_projectionType" });
    if (typeof reducerFn !== "function") {
      return Object.freeze({ ok: false, error: "invalid_reducer" });
    }
    if (!knownTypes.has(type)) {
      knownTypes.set(type, Object.freeze({ name: type, builtIn: false }));
    }
    reducers.set(type, reducerFn);
    return Object.freeze({
      ok: true,
      projectionType: type,
      ...(meta || {})
    });
  }

  function createProjection(input = {}, meta = {}) {
    const blocked = gate(meta, "create");
    if (blocked) return blocked;

    const projectionType = String(input.projectionType || input.type || "").trim();
    const sourceStream = String(input.sourceStream || input.stream || "").trim();

    if (!projectionType) {
      errorCount += 1;
      return Object.freeze({ ok: false, error: "missing_projectionType" });
    }
    if (!sourceStream) {
      errorCount += 1;
      return Object.freeze({ ok: false, error: "missing_sourceStream" });
    }
    if (!knownTypes.has(projectionType) && input.allowUnknownType !== true) {
      // auto-register unknown types as extensible
      knownTypes.set(
        projectionType,
        Object.freeze({ name: projectionType, builtIn: false })
      );
      if (!reducers.has(projectionType)) {
        reducers.set(projectionType, defaultReducerForType(projectionType));
      }
    }

    const now =
      typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
        ? meta.nowMs
        : Date.now();

    const desc = createProjectionDescriptor({
      projectionId: input.projectionId,
      projectionType,
      sourceStream,
      version: 0,
      lastEvent: null,
      created: now,
      updated: now,
      status: PM_STATUS.READY,
      nowMs: now
    });
    if (!desc.ok) {
      errorCount += 1;
      return Object.freeze({ ok: false, error: desc.error });
    }

    if (projections.has(desc.descriptor.projectionId)) {
      errorCount += 1;
      return Object.freeze({
        ok: false,
        error: "projection_already_exists",
        projectionId: desc.descriptor.projectionId
      });
    }

    const reducer =
      typeof input.reducer === "function"
        ? input.reducer
        : reducers.get(projectionType) || defaultReducerForType(projectionType);

    const initialState =
      input.initialState != null && typeof input.initialState === "object"
        ? Object.freeze(
            Array.isArray(input.initialState)
              ? [...input.initialState]
              : { ...input.initialState }
          )
        : Object.freeze(
            projectionType === PM_PROJECTION_TYPE.INVENTORY
              ? { items: Object.freeze([]) }
              : projectionType === PM_PROJECTION_TYPE.BATTLE
                ? { status: "idle" }
                : {}
          );

    const entry = {
      descriptor: desc.descriptor,
      state: initialState,
      reducer,
      lastEventSequence: null
    };
    projections.set(desc.descriptor.projectionId, entry);

    recordAudit({
      projectionId: desc.descriptor.projectionId,
      sourceEvent: null,
      updatedAt: now,
      newVersion: 0,
      result: "created",
      correlationId: meta.correlationId || null
    });

    return Object.freeze({
      ok: true,
      projectionId: desc.descriptor.projectionId,
      projection: freezeView(entry),
      createsDomainEvents: false,
      mutatesEventStore: false,
      soleProjectionAuthority: true
    });
  }

  function applyEvent(projectionId, event, meta = {}) {
    const startedAt = Date.now();
    const blocked = gate(meta, "update");
    if (blocked) {
      errorCount += 1;
      return blocked;
    }

    const integrity = verifyEventIntegrity(event);
    if (!integrity.ok) {
      errorCount += 1;
      return Object.freeze({ ok: false, error: integrity.error });
    }

    const id = String(projectionId || "").trim();
    if (!id) {
      errorCount += 1;
      return Object.freeze({ ok: false, error: "missing_projectionId" });
    }

    const entry = projections.get(id);
    if (!entry) {
      errorCount += 1;
      return Object.freeze({ ok: false, error: "projection_not_found", projectionId: id });
    }

    if (entry.descriptor.status === PM_STATUS.DELETED) {
      errorCount += 1;
      return Object.freeze({ ok: false, error: "projection_deleted", projectionId: id });
    }

    const seq = eventSequence(event);
    const lastSeq = lastEventSequence(entry);
    if (seq != null && lastSeq != null && seq <= lastSeq) {
      errorCount += 1;
      return Object.freeze({
        ok: false,
        error: "out_of_order_event",
        projectionId: id,
        lastEvent: entry.descriptor.lastEvent,
        eventSequence: seq
      });
    }

    let nextState;
    try {
      nextState = entry.reducer(entry.state, event);
    } catch (err) {
      errorCount += 1;
      return Object.freeze({
        ok: false,
        error: err && err.message ? err.message : "reducer_threw",
        projectionId: id
      });
    }

    if (nextState == null || typeof nextState !== "object") {
      nextState = Object.freeze({});
    } else if (!Object.isFrozen(nextState)) {
      nextState = Object.freeze(
        Array.isArray(nextState) ? [...nextState] : { ...nextState }
      );
    }

    const now =
      typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
        ? meta.nowMs
        : Date.now();

    const eventId =
      event.eventId != null
        ? String(event.eventId)
        : event.id != null
          ? String(event.id)
          : seq != null
            ? String(seq)
            : makeId("evt");

    const nextVersion = entry.descriptor.version + 1;
    const nextDescriptor = Object.freeze({
      ...entry.descriptor,
      version: nextVersion,
      lastEvent: eventId,
      updated: now,
      status: PM_STATUS.READY
    });

    entry.descriptor = nextDescriptor;
    entry.state = nextState;
    if (seq != null) entry.lastEventSequence = seq;

    updateCount += 1;
    const elapsed = Math.max(0, Date.now() - startedAt);
    updateMsSum += elapsed;
    updateMsSamples += 1;

    recordAudit({
      projectionId: id,
      sourceEvent: eventId,
      updatedAt: now,
      newVersion: nextVersion,
      result: "updated",
      correlationId:
        meta.correlationId ||
        (event.correlationId != null ? event.correlationId : null)
    });

    return Object.freeze({
      ok: true,
      projectionId: id,
      version: nextVersion,
      lastEvent: eventId,
      projection: freezeView(entry),
      updateMs: elapsed,
      eventualConsistency: true,
      createsDomainEvents: false,
      mutatesEventStore: false
    });
  }

  function updateProjection(projectionId, event, meta = {}) {
    return applyEvent(projectionId, event, meta);
  }

  function rebuildProjection(projectionId, meta = {}) {
    const blocked = gate(meta, "rebuild");
    if (blocked) {
      errorCount += 1;
      return blocked;
    }

    const id = String(projectionId || "").trim();
    if (!id) {
      errorCount += 1;
      return Object.freeze({ ok: false, error: "missing_projectionId" });
    }

    const entry = projections.get(id);
    if (!entry) {
      errorCount += 1;
      return Object.freeze({ ok: false, error: "projection_not_found", projectionId: id });
    }

    if (!eventStoreBridge) {
      errorCount += 1;
      return Object.freeze({
        ok: false,
        error: "event_store_bridge_missing",
        projectionId: id,
        mutatesEventStore: false
      });
    }

    const now =
      typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
        ? meta.nowMs
        : Date.now();

    entry.descriptor = Object.freeze({
      ...entry.descriptor,
      status: PM_STATUS.REBUILDING,
      updated: now
    });

    // Clear read-model state — Event Store history untouched
    const emptyState =
      entry.descriptor.projectionType === PM_PROJECTION_TYPE.INVENTORY
        ? Object.freeze({ items: Object.freeze([]) })
        : entry.descriptor.projectionType === PM_PROJECTION_TYPE.BATTLE
          ? Object.freeze({ status: "idle" })
          : Object.freeze({});

    entry.state = emptyState;
    entry.lastEventSequence = null;
    entry.descriptor = Object.freeze({
      ...entry.descriptor,
      version: 0,
      lastEvent: null,
      status: PM_STATUS.REBUILDING,
      updated: now
    });

    const streamId = entry.descriptor.sourceStream;
    let replayedState = emptyState;
    let lastEvt = null;
    let lastSeq = null;
    let version = 0;

    try {
      if (typeof eventStoreBridge.replay === "function") {
        const replayed = eventStoreBridge.replay(streamId, entry.reducer);
        if (replayed && replayed.ok === false) {
          errorCount += 1;
          entry.descriptor = Object.freeze({
            ...entry.descriptor,
            status: PM_STATUS.READY,
            updated: Date.now()
          });
          return Object.freeze({
            ok: false,
            error: replayed.error || "replay_failed",
            projectionId: id,
            mutatesEventStore: false
          });
        }
        if (replayed != null && typeof replayed === "object") {
          if ("state" in replayed) {
            replayedState = replayed.state;
            version =
              typeof replayed.version === "number"
                ? replayed.version
                : typeof replayed.eventCount === "number"
                  ? replayed.eventCount
                  : 0;
            lastEvt =
              replayed.lastEvent != null ? String(replayed.lastEvent) : null;
            lastSeq =
              typeof replayed.lastSequence === "number"
                ? replayed.lastSequence
                : null;
          } else if (!("ok" in replayed) || replayed.ok === true) {
            // treat as state object
            replayedState =
              replayed.state != null ? replayed.state : Object.freeze({ ...replayed });
          }
        }
      } else if (typeof eventStoreBridge.loadStream === "function") {
        const loaded = eventStoreBridge.loadStream(streamId);
        const events =
          loaded && Array.isArray(loaded.events)
            ? loaded.events
            : Array.isArray(loaded)
              ? loaded
              : [];
        let state = emptyState;
        for (const evt of events) {
          state = entry.reducer(state, evt);
          version += 1;
          lastEvt =
            evt.eventId != null
              ? String(evt.eventId)
              : evt.id != null
                ? String(evt.id)
                : String(version);
          const seq = eventSequence(evt);
          if (seq != null) lastSeq = seq;
        }
        replayedState = state;
      } else {
        errorCount += 1;
        return Object.freeze({
          ok: false,
          error: "event_store_bridge_incomplete",
          projectionId: id,
          mutatesEventStore: false
        });
      }
    } catch (err) {
      errorCount += 1;
      return Object.freeze({
        ok: false,
        error: err && err.message ? err.message : "rebuild_threw",
        projectionId: id,
        mutatesEventStore: false
      });
    }

    if (replayedState == null || typeof replayedState !== "object") {
      replayedState = emptyState;
    } else if (!Object.isFrozen(replayedState)) {
      replayedState = Object.freeze(
        Array.isArray(replayedState)
          ? [...replayedState]
          : { ...replayedState }
      );
    }

    const doneAt = Date.now();
    entry.state = replayedState;
    entry.lastEventSequence = lastSeq;
    entry.descriptor = Object.freeze({
      ...entry.descriptor,
      version,
      lastEvent: lastEvt,
      updated: doneAt,
      status: PM_STATUS.READY
    });

    rebuildCount += 1;
    recordAudit({
      projectionId: id,
      sourceEvent: lastEvt,
      updatedAt: doneAt,
      newVersion: version,
      result: "rebuilt",
      correlationId: meta.correlationId || null
    });

    return Object.freeze({
      ok: true,
      projectionId: id,
      version,
      lastEvent: lastEvt,
      projection: freezeView(entry),
      rebuildCount,
      mutatesEventStore: false,
      sourceOfTruthIsEventStore: true
    });
  }

  function deleteProjection(projectionId, meta = {}) {
    const blocked = gate(meta, "delete");
    if (blocked) {
      errorCount += 1;
      return blocked;
    }

    const id = String(projectionId || "").trim();
    if (!id) {
      errorCount += 1;
      return Object.freeze({ ok: false, error: "missing_projectionId" });
    }

    const entry = projections.get(id);
    if (!entry) {
      errorCount += 1;
      return Object.freeze({ ok: false, error: "projection_not_found", projectionId: id });
    }

    projections.delete(id);

    recordAudit({
      projectionId: id,
      sourceEvent: null,
      updatedAt: Date.now(),
      newVersion: entry.descriptor.version,
      result: "deleted",
      correlationId: meta.correlationId || null
    });

    return Object.freeze({
      ok: true,
      projectionId: id,
      deleted: true,
      mutatesEventStore: false,
      createsDomainEvents: false,
      note: "projection_read_model_only"
    });
  }

  function getProjection(projectionId) {
    const id = String(projectionId || "").trim();
    if (!id) return Object.freeze({ ok: false, error: "missing_projectionId" });
    const entry = projections.get(id);
    if (!entry) {
      return Object.freeze({
        ok: false,
        error: "projection_not_found",
        projectionId: id
      });
    }
    return Object.freeze({
      ok: true,
      projectionId: id,
      projection: freezeView(entry),
      readOnly: true,
      queryReadsProjectionsOnly: true
    });
  }

  function forQueryBus(projectionTypeOrId) {
    const key = String(projectionTypeOrId || "").trim();
    if (!key) {
      return Object.freeze({
        ok: false,
        error: "missing_projection_key",
        queryReadsProjectionsOnly: true
      });
    }

    // Prefer exact id
    if (projections.has(key)) {
      const entry = projections.get(key);
      if (entry.descriptor.status !== PM_STATUS.READY) {
        return Object.freeze({
          ok: false,
          error: "projection_not_ready",
          status: entry.descriptor.status,
          queryReadsProjectionsOnly: true
        });
      }
      return Object.freeze({
        ok: true,
        projectionId: key,
        projectionType: entry.descriptor.projectionType,
        view: freezeView(entry),
        readOnly: true,
        queryReadsProjectionsOnly: true,
        needsEventStore: false
      });
    }

    // Match by type — first ready
    for (const [id, entry] of projections) {
      if (
        entry.descriptor.projectionType === key &&
        entry.descriptor.status === PM_STATUS.READY
      ) {
        return Object.freeze({
          ok: true,
          projectionId: id,
          projectionType: key,
          view: freezeView(entry),
          readOnly: true,
          queryReadsProjectionsOnly: true,
          needsEventStore: false
        });
      }
    }

    return Object.freeze({
      ok: false,
      error: "projection_not_found",
      key,
      queryReadsProjectionsOnly: true
    });
  }

  function fromEventBus(busEvent, meta = {}) {
    if (busEvent == null || typeof busEvent !== "object") {
      errorCount += 1;
      return Object.freeze({ ok: false, error: "invalid_bus_event" });
    }

    const event = busEvent.event || busEvent.payload || busEvent;
    const stream =
      busEvent.stream ||
      busEvent.sourceStream ||
      (event && (event.stream || event.sourceStream || event.aggregateId)) ||
      null;
    const eventType =
      busEvent.eventType ||
      busEvent.type ||
      (event && (event.eventType || event.type)) ||
      null;

    const applied = [];
    const skipped = [];

    for (const [id, entry] of projections) {
      const matchesStream =
        stream != null &&
        String(entry.descriptor.sourceStream) === String(stream);
      const matchesType =
        eventType != null &&
        (entry.subscribeTypes == null ||
          (Array.isArray(entry.subscribeTypes) &&
            entry.subscribeTypes.includes(String(eventType))));

      // Default: match by sourceStream; optional subscribeTypes on entry
      const subscribed =
        matchesStream ||
        (entry.subscribeTypes && matchesType) ||
        (meta.applyAll === true);

      if (!subscribed && !(matchesStream || meta.matchStreamOnly === false)) {
        if (!matchesStream) {
          skipped.push(id);
          continue;
        }
      }

      if (!matchesStream && meta.applyAll !== true) {
        skipped.push(id);
        continue;
      }

      const result = applyEvent(
        id,
        event,
        {
          ...meta,
          source: meta.source || "event_bus",
          authorized: meta.authorized !== false ? meta.authorized || true : false,
          correlationId:
            meta.correlationId ||
            busEvent.correlationId ||
            (event && event.correlationId) ||
            null
        }
      );
      applied.push(Object.freeze({ projectionId: id, ...result }));
    }

    return Object.freeze({
      ok: true,
      applied: Object.freeze(applied),
      skipped: Object.freeze(skipped),
      createsDomainEvents: false,
      mutatesEventStore: false
    });
  }

  function patchProjection() {
    return rejectManualPatch("patch");
  }
  function setState() {
    return rejectManualPatch("setState");
  }
  function writeState() {
    return rejectManualPatch("writeState");
  }

  function metrics() {
    let versionSum = 0;
    let versionMax = 0;
    for (const entry of projections.values()) {
      versionSum += entry.descriptor.version;
      if (entry.descriptor.version > versionMax) {
        versionMax = entry.descriptor.version;
      }
    }
    return Object.freeze({
      projectionCount: projections.size,
      updateCount,
      rebuildCount,
      averageUpdateMs: updateMsSamples > 0 ? updateMsSum / updateMsSamples : 0,
      errorCount,
      versionCount: versionSum,
      versionMax,
      soleProjectionAuthority: true,
      createsDomainEvents: false,
      mutatesEventStore: false,
      sourceOfTruthIsEventStore: true,
      eventualConsistency: true,
      manualPatchBlocked: true,
      queryReadsProjectionsOnly: true
    });
  }

  function projectionAudit() {
    return Object.freeze([...projectionAuditLog]);
  }

  function status() {
    return Object.freeze({
      ok: true,
      singleton: true,
      soleProjectionAuthority: true,
      createsDomainEvents: false,
      mutatesEventStore: false,
      sourceOfTruthIsEventStore: true,
      eventualConsistency: true,
      manualPatchBlocked: true,
      queryReadsProjectionsOnly: true,
      components: PM_COMPONENT_ORDER,
      projectionCount: projections.size,
      typeCount: knownTypes.size,
      updateCount,
      rebuildCount
    });
  }

  const manager = Object.freeze({
    ok: true,
    createProjection,
    updateProjection,
    rebuildProjection,
    deleteProjection,
    getProjection,
    applyEvent,
    fromEventBus,
    forQueryBus,
    registerType,
    registerReducer,
    metrics,
    projectionAudit,
    status,
    patchProjection,
    setState,
    writeState,
    isActive() {
      return active === true;
    }
  });

  activeProjectionManager = {
    isActive: manager.isActive
  };

  return manager;
}

function clearProjectionSingletonForTest() {
  activeProjectionManager = null;
}

module.exports = {
  PM_COMPONENT,
  PM_COMPONENT_ORDER,
  PM_DESCRIPTOR_FIELDS,
  PM_STATUS,
  PM_PROJECTION_TYPE,
  PM_AUTHORIZED_SOURCES,
  PM_FLAGS,
  PM_PUBLIC_API,
  PM_RUNTIME_ANCHORS,
  createProjectionDescriptor,
  createProjectionManager,
  clearProjectionSingletonForTest,
  soleProjectionAuthority: true,
  createsDomainEvents: false,
  mutatesEventStore: false,
  sourceOfTruthIsEventStore: true,
  eventualConsistency: true,
  manualPatchBlocked: true,
  queryReadsProjectionsOnly: true
};
