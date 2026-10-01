"use strict";

/**
 * Master Canon 0079 — Query Bus Manager.
 * Kernel Layer 0 sole central authority for read-only query delivery to ONE handler.
 * QBM never mutates system state, never creates domain events, never writes Event Store/Command Bus.
 * Distinct from Command Bus (0078), Event Bus (0076), Event Store (0075).
 */

const crypto = require("crypto");

const QBM_COMPONENT = Object.freeze({
  QUERY_BUS_MANAGER: "query_bus_manager",
  INTAKE_GATE: "intake_gate",
  VALIDATOR: "validator",
  AUTHORIZATION_GATE: "authorization_gate",
  ROUTER: "router",
  HANDLER_REGISTRY: "handler_registry",
  READ_MODEL_GATE: "read_model_gate",
  PIPELINE_CONTROLLER: "pipeline_controller",
  RESPONSE_STORE: "response_store",
  SECURITY_GATE: "security_gate",
  QUERY_AUDIT: "query_audit",
  METRICS_AUDIT: "metrics_audit"
});

const QBM_COMPONENT_ORDER = Object.freeze(Object.values(QBM_COMPONENT));

/** Unified pipeline for every query — exact order. */
const QBM_PIPELINE = Object.freeze([
  "validation",
  "authorization",
  "routing",
  "handler",
  "response"
]);

const QBM_DESCRIPTOR_FIELDS = Object.freeze([
  "queryId",
  "queryType",
  "sender",
  "timestamp",
  "payload",
  "correlationId",
  "version"
]);

const QBM_RESULT = Object.freeze({
  SUCCESS: "Success",
  VALIDATION_FAILED: "Validation Failed",
  EXECUTION_FAILED: "Execution Failed",
  CANCELLED: "Cancelled",
  PENDING: "Pending",
  REJECTED: "Rejected"
});

const QBM_AUTHORIZED_SOURCES = Object.freeze([
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
  "query_bus",
  "query-bus",
  "query_bus_manager",
  "query-bus-manager",
  "command_bus",
  "command-bus",
  "event_bus",
  "event-bus",
  "event_store",
  "event-store",
  "message_queue",
  "message-queue",
  "ai_engine",
  "battle_engine",
  "gift_engine",
  "chat_engine",
  "overlay_engine",
  "obs_connector",
  "tiktok_connector",
  "kick_connector",
  "inventory",
  "platform",
  "security",
  "monitoring",
  "dashboard",
  "sender"
]);

const QBM_FLAGS = Object.freeze({
  soleQueryBusAuthority: true,
  oneHandlerPerQuery: true,
  neverMutatesState: true,
  neverCreatesDomainEvents: true,
  cqrsSeparated: true,
  readsOnlyViaReadModel: true,
  noDirectEventStreamRead: true
});

const QBM_PUBLIC_API = Object.freeze([
  "execute",
  "validate",
  "authorize",
  "cancel",
  "getResponse"
]);

const QBM_SENSITIVE_KEYS = Object.freeze([
  "password",
  "token",
  "secret",
  "apiKey"
]);

const QBM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-query-bus-core/queryBusManager.js",
  "shared/mia-state-core/stateManager.js",
  "shared/mia-event-store-core/eventStoreManager.js",
  "shared/mia-command-bus-core/commandBusManager.js",
  "docs/master-canon/0079-query-bus-manager.md"
]);

let activeQueryBusManager = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function rejectMutation(op) {
  return Object.freeze({
    ok: false,
    error: `query_bus_${op}_rejected`,
    neverMutatesState: true,
    neverCreatesDomainEvents: true,
    cqrsSeparated: true
  });
}

function createQueryDescriptor(input = {}) {
  const queryType = String(input.queryType || input.type || "").trim();
  if (!queryType) return { ok: false, error: "missing_queryType" };

  const sender = String(input.sender || input.source || "").trim();
  if (!sender) return { ok: false, error: "missing_sender" };

  if (input.payload == null || typeof input.payload !== "object") {
    return { ok: false, error: "missing_or_invalid_payload" };
  }

  const version =
    input.version != null && String(input.version).trim()
      ? String(input.version).trim()
      : "1.0.0";

  const timestamp =
    typeof input.timestamp === "number" && Number.isFinite(input.timestamp)
      ? input.timestamp
      : Date.now();

  const correlationId =
    input.correlationId != null && String(input.correlationId).trim()
      ? String(input.correlationId).trim()
      : makeId("corr");

  const queryId =
    input.queryId != null && String(input.queryId).trim()
      ? String(input.queryId).trim()
      : makeId("qry");

  const payloadRaw = Array.isArray(input.payload)
    ? [...input.payload]
    : { ...input.payload };

  const descriptor = {
    queryId,
    queryType,
    sender,
    timestamp,
    payload: Object.freeze(payloadRaw),
    correlationId,
    version
  };

  return {
    ok: true,
    descriptor: Object.freeze(descriptor)
  };
}

function filterSensitive(data, allowSensitive) {
  if (allowSensitive === true) return data;
  if (data == null || typeof data !== "object") return data;
  if (Array.isArray(data)) {
    return data.map((item) => filterSensitive(item, false));
  }
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (QBM_SENSITIVE_KEYS.includes(key)) continue;
    const lower = key.toLowerCase();
    if (
      lower === "password" ||
      lower === "token" ||
      lower === "secret" ||
      lower === "apikey"
    ) {
      continue;
    }
    out[key] =
      value != null && typeof value === "object"
        ? filterSensitive(value, false)
        : value;
  }
  return out;
}

function stripSideEffectFields(data) {
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return data;
  }
  const blocked = new Set([
    "domainEvent",
    "mutate",
    "write",
    "appendEvent",
    "sendCommand",
    "transitionState",
    "sideEffect",
    "command",
    "events"
  ]);
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (blocked.has(key)) continue;
    out[key] = value;
  }
  return out;
}

function createQueryBusManager(options = {}) {
  if (
    activeQueryBusManager &&
    activeQueryBusManager.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "query_bus_manager_already_active",
      soleQueryBusAuthority: true
    });
  }

  const authorized = new Set(
    options.authorizedSources || QBM_AUTHORIZED_SOURCES
  );
  const readModelBridge = options.readModelBridge || null;
  const stateBridge = options.stateBridge || null;
  const scheduleAsync =
    typeof options.scheduleAsync === "function"
      ? options.scheduleAsync
      : (fn) => {
          setImmediate(fn);
        };

  /** @type {Map<string, { handlerFn: Function, meta: object }>} */
  const handlers = new Map();
  /** @type {Map<string, object>} */
  const responses = new Map();
  /** @type {Map<string, object>} */
  const pending = new Map();
  const queryAuditLog = [];

  let queryCount = 0;
  let rejectedCount = 0;
  let errorCount = 0;
  let latencySumMs = 0;
  let latencySamples = 0;
  let readModelHits = 0;
  let active = true;

  function isAuthorized(meta = {}) {
    return (
      meta.authorized === true ||
      authorized.has(meta.source || "") ||
      authorized.has(meta.actor || "") ||
      authorized.has(meta.sender || "") ||
      authorized.has(String(meta.query && meta.query.sender) || "")
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
      return Object.freeze({ ok: false, error: "unauthorized_query_bus" });
    }
    if (!isSourceVerified(meta)) {
      return Object.freeze({ ok: false, error: "forged_query_blocked" });
    }
    return null;
  }

  function recordAudit(entry) {
    queryAuditLog.push(
      Object.freeze({
        queryId: entry.queryId,
        sender: entry.sender != null ? entry.sender : null,
        handler: entry.handler != null ? entry.handler : null,
        receivedAt: entry.receivedAt != null ? entry.receivedAt : null,
        completedAt: entry.completedAt != null ? entry.completedAt : null,
        result: entry.result || "unknown",
        correlationId:
          entry.correlationId != null ? entry.correlationId : null
      })
    );
  }

  function storeResponse(queryId, entry) {
    responses.set(queryId, Object.freeze({ ...entry }));
  }

  function buildReadModelApi(meta) {
    let hits = 0;
    const api = Object.freeze({
      get(key) {
        hits += 1;
        readModelHits += 1;
        if (readModelBridge && typeof readModelBridge.get === "function") {
          return readModelBridge.get(key);
        }
        return undefined;
      },
      query(key) {
        return api.get(key);
      },
      snapshot() {
        hits += 1;
        readModelHits += 1;
        if (
          readModelBridge &&
          typeof readModelBridge.snapshot === "function"
        ) {
          return readModelBridge.snapshot();
        }
        return Object.freeze({});
      },
      set() {
        return rejectMutation("write");
      },
      mutate() {
        return rejectMutation("mutate");
      },
      write() {
        return rejectMutation("write");
      },
      appendEvent() {
        return rejectMutation("appendEvent");
      },
      sendCommand() {
        return rejectMutation("sendCommand");
      },
      transitionState() {
        return rejectMutation("transitionState");
      },
      _hitCount() {
        return hits;
      }
    });

    // Optional read-only state snapshot — never transition/set
    if (stateBridge && typeof stateBridge.readOnlySnapshot === "function") {
      try {
        void stateBridge.readOnlySnapshot(meta);
      } catch (_err) {
        /* optional */
      }
    }

    return api;
  }

  function buildHandlerContext(query, meta, readModel) {
    return Object.freeze({
      query,
      meta,
      readModel,
      mutate() {
        return rejectMutation("mutate");
      },
      write() {
        return rejectMutation("write");
      },
      appendEvent() {
        return rejectMutation("appendEvent");
      },
      sendCommand() {
        return rejectMutation("sendCommand");
      },
      transitionState() {
        return rejectMutation("transitionState");
      },
      loadStream() {
        return Object.freeze({
          ok: false,
          error: "direct_event_stream_read_rejected",
          noDirectEventStreamRead: true
        });
      },
      replay() {
        return Object.freeze({
          ok: false,
          error: "direct_event_stream_read_rejected",
          noDirectEventStreamRead: true
        });
      }
    });
  }

  function registerHandler(queryType, handlerFn, meta = {}) {
    const type = String(queryType || "").trim();
    if (!type) {
      return Object.freeze({ ok: false, error: "missing_queryType" });
    }
    if (typeof handlerFn !== "function") {
      return Object.freeze({ ok: false, error: "invalid_handler" });
    }
    if (handlers.has(type)) {
      return Object.freeze({
        ok: false,
        error: "handler_already_registered",
        queryType: type,
        oneHandlerPerQuery: true
      });
    }
    handlers.set(type, {
      handlerFn,
      meta: Object.freeze({ ...(meta || {}) })
    });
    return Object.freeze({
      ok: true,
      queryType: type,
      oneHandlerPerQuery: true
    });
  }

  function validateOnly(input = {}, meta = {}) {
    if (meta.forged === true || input.forged === true) {
      return Object.freeze({
        ok: false,
        valid: false,
        error: "forged_query_blocked",
        result: QBM_RESULT.VALIDATION_FAILED
      });
    }

    if (
      meta.asCommand === true ||
      meta.mutateRequested === true ||
      input.asCommand === true ||
      input.mutateRequested === true
    ) {
      return Object.freeze({
        ok: false,
        valid: false,
        error: "cqrs_query_as_command_rejected",
        result: QBM_RESULT.REJECTED,
        cqrsSeparated: true
      });
    }

    if (
      meta.readEventStreamDirectly === true ||
      input.readEventStreamDirectly === true
    ) {
      return Object.freeze({
        ok: false,
        valid: false,
        error: "direct_event_stream_read_rejected",
        result: QBM_RESULT.REJECTED,
        noDirectEventStreamRead: true
      });
    }

    const desc = createQueryDescriptor(input);
    if (!desc.ok) {
      return Object.freeze({
        ok: false,
        valid: false,
        error: desc.error,
        result: QBM_RESULT.VALIDATION_FAILED
      });
    }

    const d = desc.descriptor;
    if (!handlers.has(d.queryType)) {
      return Object.freeze({
        ok: false,
        valid: false,
        error: "query_type_not_registered",
        queryType: d.queryType,
        result: QBM_RESULT.VALIDATION_FAILED,
        descriptor: d
      });
    }

    if (!d.version) {
      return Object.freeze({
        ok: false,
        valid: false,
        error: "missing_version",
        result: QBM_RESULT.VALIDATION_FAILED,
        descriptor: d
      });
    }

    return Object.freeze({
      ok: true,
      valid: true,
      descriptor: d,
      phases: Object.freeze(["validation"])
    });
  }

  function authorizeOnly(input = {}, meta = {}) {
    const authMeta = {
      ...meta,
      sender: meta.sender || input.sender || meta.source,
      source: meta.source || input.sender || meta.sender
    };

    if (meta.forged === true || input.forged === true) {
      return Object.freeze({
        ok: false,
        authorized: false,
        error: "forged_query_blocked"
      });
    }

    const blocked = gate(authMeta, "authorize");
    if (blocked) {
      return Object.freeze({
        ok: false,
        authorized: false,
        error: blocked.error
      });
    }

    return Object.freeze({
      ok: true,
      authorized: true,
      sender: authMeta.sender || null,
      source: authMeta.source || null
    });
  }

  function runHandler(query, meta) {
    const entry = handlers.get(query.queryType);
    if (!entry) {
      return {
        ok: false,
        result: QBM_RESULT.VALIDATION_FAILED,
        error: "query_type_not_registered"
      };
    }

    const readModel = buildReadModelApi(meta);
    const ctx = buildHandlerContext(query, meta, readModel);

    try {
      const raw = entry.handlerFn(query, ctx, meta);
      if (raw && raw.ok === false) {
        return {
          ok: false,
          result: QBM_RESULT.EXECUTION_FAILED,
          error: raw.error || "handler_execution_failed",
          handlerReturn: raw,
          handlerName: entry.meta.name || query.queryType
        };
      }

      const dataOnly = stripSideEffectFields(
        raw && typeof raw === "object" && "data" in raw ? raw.data : raw
      );
      const filtered = filterSensitive(dataOnly, meta.allowSensitive === true);

      return {
        ok: true,
        result: QBM_RESULT.SUCCESS,
        data: filtered,
        handlerReturn: raw || { ok: true },
        handlerName: entry.meta.name || query.queryType,
        allowSensitive: meta.allowSensitive === true
      };
    } catch (err) {
      return {
        ok: false,
        result: QBM_RESULT.EXECUTION_FAILED,
        error: err && err.message ? err.message : "handler_threw",
        handlerName: entry.meta.name || query.queryType
      };
    }
  }

  function finishSuccess(query, handlerOutcome, meta, phaseHistory, startedAt) {
    const elapsed = Math.max(0, Date.now() - startedAt);
    latencySumMs += elapsed;
    latencySamples += 1;

    phaseHistory.push("response");
    const out = Object.freeze({
      ok: true,
      queryId: query.queryId,
      result: QBM_RESULT.SUCCESS,
      phases: Object.freeze([...phaseHistory]),
      handler: handlerOutcome.handlerName,
      data: handlerOutcome.data,
      latencyMs: elapsed,
      soleQueryBusAuthority: true,
      oneHandlerPerQuery: true,
      neverMutatesState: true,
      neverCreatesDomainEvents: true,
      cqrsSeparated: true,
      readsOnlyViaReadModel: true,
      noDirectEventStreamRead: true
    });

    storeResponse(query.queryId, out);
    recordAudit({
      queryId: query.queryId,
      sender: query.sender,
      handler: handlerOutcome.handlerName,
      receivedAt: startedAt,
      completedAt: Date.now(),
      result: QBM_RESULT.SUCCESS,
      correlationId: query.correlationId
    });
    return out;
  }

  function executePipeline(input = {}, meta = {}) {
    const startedAt =
      typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
        ? meta.nowMs
        : Date.now();

    const authMeta = {
      ...meta,
      sender: meta.sender || input.sender || meta.source,
      source: meta.source || input.sender || meta.sender
    };

    const phaseHistory = [];

    // --- validation ---
    phaseHistory.push("validation");

    if (
      meta.asCommand === true ||
      meta.mutateRequested === true ||
      input.asCommand === true ||
      input.mutateRequested === true
    ) {
      rejectedCount += 1;
      queryCount += 1;
      return Object.freeze({
        ok: false,
        error: "cqrs_query_as_command_rejected",
        result: QBM_RESULT.REJECTED,
        phases: Object.freeze([...phaseHistory]),
        cqrsSeparated: true,
        neverMutatesState: true,
        neverCreatesDomainEvents: true
      });
    }

    if (
      meta.readEventStreamDirectly === true ||
      input.readEventStreamDirectly === true
    ) {
      rejectedCount += 1;
      queryCount += 1;
      return Object.freeze({
        ok: false,
        error: "direct_event_stream_read_rejected",
        result: QBM_RESULT.REJECTED,
        phases: Object.freeze([...phaseHistory]),
        noDirectEventStreamRead: true
      });
    }

    if (meta.forged === true || input.forged === true) {
      rejectedCount += 1;
      queryCount += 1;
      const failed = Object.freeze({
        ok: false,
        result: QBM_RESULT.VALIDATION_FAILED,
        error: "forged_query_blocked",
        phases: Object.freeze([...phaseHistory])
      });
      if (input.queryId) {
        storeResponse(String(input.queryId), failed);
      }
      return failed;
    }

    const desc = createQueryDescriptor({
      ...input,
      timestamp:
        typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
          ? meta.nowMs
          : input.timestamp
    });
    if (!desc.ok) {
      rejectedCount += 1;
      queryCount += 1;
      return Object.freeze({
        ok: false,
        result: QBM_RESULT.VALIDATION_FAILED,
        error: desc.error,
        phases: Object.freeze([...phaseHistory])
      });
    }

    const query = desc.descriptor;
    queryCount += 1;

    if (!handlers.has(query.queryType)) {
      rejectedCount += 1;
      const failed = Object.freeze({
        ok: false,
        queryId: query.queryId,
        result: QBM_RESULT.VALIDATION_FAILED,
        error: "query_type_not_registered",
        phases: Object.freeze([...phaseHistory])
      });
      storeResponse(query.queryId, failed);
      recordAudit({
        queryId: query.queryId,
        sender: query.sender,
        handler: null,
        receivedAt: startedAt,
        completedAt: Date.now(),
        result: QBM_RESULT.VALIDATION_FAILED,
        correlationId: query.correlationId
      });
      return failed;
    }

    // --- authorization ---
    phaseHistory.push("authorization");
    const blocked = gate(
      {
        ...authMeta,
        sender: query.sender,
        source: authMeta.source || query.sender
      },
      "execute"
    );
    if (blocked) {
      rejectedCount += 1;
      const failed = Object.freeze({
        ok: false,
        queryId: query.queryId,
        result: QBM_RESULT.VALIDATION_FAILED,
        error: blocked.error,
        phases: Object.freeze([...phaseHistory])
      });
      storeResponse(query.queryId, failed);
      recordAudit({
        queryId: query.queryId,
        sender: query.sender,
        handler: null,
        receivedAt: startedAt,
        completedAt: Date.now(),
        result: QBM_RESULT.VALIDATION_FAILED,
        correlationId: query.correlationId
      });
      return failed;
    }

    // --- routing ---
    phaseHistory.push("routing");
    const routed = handlers.get(query.queryType);
    // Sender does not know / select the handler — bus routes by type only.

    const mode = String(meta.mode || input.mode || "sync")
      .trim()
      .toLowerCase();

    if (mode === "async") {
      const pendingEntry = {
        query,
        meta: authMeta,
        phaseHistory: [...phaseHistory],
        startedAt,
        cancelled: false
      };
      pending.set(query.queryId, pendingEntry);

      const pendingResult = Object.freeze({
        ok: true,
        pending: true,
        queryId: query.queryId,
        result: QBM_RESULT.PENDING,
        phases: Object.freeze([...phaseHistory]),
        neverMutatesState: true
      });
      storeResponse(query.queryId, pendingResult);

      const work = () => {
        const slot = pending.get(query.queryId);
        if (!slot || slot.cancelled) return;
        pending.delete(query.queryId);

        const phases = [...slot.phaseHistory, "handler"];
        const handlerOutcome = runHandler(query, slot.meta);
        if (!handlerOutcome.ok) {
          errorCount += 1;
          const failed = Object.freeze({
            ok: false,
            queryId: query.queryId,
            result: handlerOutcome.result,
            error: handlerOutcome.error,
            phases: Object.freeze([...phases, "response"]),
            handler: handlerOutcome.handlerName || null
          });
          storeResponse(query.queryId, failed);
          recordAudit({
            queryId: query.queryId,
            sender: query.sender,
            handler: handlerOutcome.handlerName || null,
            receivedAt: slot.startedAt,
            completedAt: Date.now(),
            result: handlerOutcome.result,
            correlationId: query.correlationId
          });
          return;
        }

        finishSuccess(query, handlerOutcome, slot.meta, phases, slot.startedAt);
      };

      scheduleAsync(work);

      return Object.freeze({
        ...pendingResult,
        routedHandler: routed.meta.name || query.queryType,
        senderKnowsHandler: false
      });
    }

    // --- sync handler ---
    phaseHistory.push("handler");
    const handlerOutcome = runHandler(query, authMeta);
    if (!handlerOutcome.ok) {
      if (handlerOutcome.result === QBM_RESULT.EXECUTION_FAILED) {
        errorCount += 1;
      } else {
        rejectedCount += 1;
      }
      phaseHistory.push("response");
      const failed = Object.freeze({
        ok: false,
        queryId: query.queryId,
        result: handlerOutcome.result,
        error: handlerOutcome.error,
        phases: Object.freeze([...phaseHistory]),
        handler: handlerOutcome.handlerName || null,
        senderKnowsHandler: false,
        routedHandler: routed.meta.name || query.queryType
      });
      storeResponse(query.queryId, failed);
      recordAudit({
        queryId: query.queryId,
        sender: query.sender,
        handler: handlerOutcome.handlerName || null,
        receivedAt: startedAt,
        completedAt: Date.now(),
        result: handlerOutcome.result,
        correlationId: query.correlationId
      });
      return failed;
    }

    const success = finishSuccess(
      query,
      handlerOutcome,
      authMeta,
      phaseHistory,
      startedAt
    );
    return Object.freeze({
      ...success,
      senderKnowsHandler: false,
      routedHandler: routed.meta.name || query.queryType
    });
  }

  function execute(input = {}, meta = {}) {
    return executePipeline(input, meta);
  }

  function validate(input = {}, meta = {}) {
    return validateOnly(input, meta);
  }

  function authorize(input = {}, meta = {}) {
    return authorizeOnly(input, meta);
  }

  function cancel(queryId, meta = {}) {
    const blocked = gate(
      {
        ...meta,
        source: meta.source || meta.sender || meta.actor
      },
      "cancel"
    );
    if (blocked) return blocked;

    const id = String(queryId || "").trim();
    if (!id) return Object.freeze({ ok: false, error: "missing_queryId" });

    const slot = pending.get(id);
    if (!slot) {
      const existing = responses.get(id);
      if (existing && existing.result !== QBM_RESULT.PENDING) {
        return Object.freeze({
          ok: false,
          error: "query_already_completed",
          queryId: id,
          result: existing.result
        });
      }
      return Object.freeze({
        ok: false,
        error: "query_not_pending",
        queryId: id
      });
    }

    slot.cancelled = true;
    pending.delete(id);

    const cancelled = Object.freeze({
      ok: true,
      queryId: id,
      result: QBM_RESULT.CANCELLED,
      cancelled: true
    });
    storeResponse(id, cancelled);
    recordAudit({
      queryId: id,
      sender: slot.query.sender,
      handler: null,
      receivedAt: slot.startedAt,
      completedAt: Date.now(),
      result: QBM_RESULT.CANCELLED,
      correlationId: slot.query.correlationId
    });
    return cancelled;
  }

  function getResponse(queryId) {
    const id = String(queryId || "").trim();
    if (!id) return Object.freeze({ ok: false, error: "missing_queryId" });
    const entry = responses.get(id);
    if (!entry) {
      return Object.freeze({
        ok: false,
        error: "response_not_found",
        queryId: id
      });
    }
    return Object.freeze({ ok: true, queryId: id, ...entry });
  }

  function metrics() {
    return Object.freeze({
      queryCount,
      handlerCount: handlers.size,
      averageLatencyMs: latencySamples > 0 ? latencySumMs / latencySamples : 0,
      rejectedCount,
      errorCount,
      readModelHits,
      soleQueryBusAuthority: true,
      oneHandlerPerQuery: true,
      neverMutatesState: true,
      neverCreatesDomainEvents: true,
      cqrsSeparated: true,
      readsOnlyViaReadModel: true,
      noDirectEventStreamRead: true
    });
  }

  function queryAudit() {
    return Object.freeze([...queryAuditLog]);
  }

  function status() {
    return Object.freeze({
      ok: true,
      singleton: true,
      soleQueryBusAuthority: true,
      oneHandlerPerQuery: true,
      neverMutatesState: true,
      neverCreatesDomainEvents: true,
      cqrsSeparated: true,
      readsOnlyViaReadModel: true,
      noDirectEventStreamRead: true,
      components: QBM_COMPONENT_ORDER,
      pipeline: QBM_PIPELINE,
      handlerCount: handlers.size,
      queryCount,
      pendingCount: pending.size
    });
  }

  function mutate() {
    return rejectMutation("mutate");
  }
  function write() {
    return rejectMutation("write");
  }
  function appendEvent() {
    return rejectMutation("appendEvent");
  }
  function sendCommand() {
    return rejectMutation("sendCommand");
  }
  function transitionState() {
    return rejectMutation("transitionState");
  }

  const manager = Object.freeze({
    ok: true,
    execute,
    validate,
    authorize,
    cancel,
    getResponse,
    registerHandler,
    metrics,
    queryAudit,
    status,
    mutate,
    write,
    appendEvent,
    sendCommand,
    transitionState,
    isActive() {
      return active === true;
    }
  });

  activeQueryBusManager = {
    isActive: manager.isActive
  };

  return manager;
}

function clearQueryBusSingletonForTest() {
  activeQueryBusManager = null;
}

module.exports = {
  QBM_COMPONENT,
  QBM_COMPONENT_ORDER,
  QBM_PIPELINE,
  QBM_DESCRIPTOR_FIELDS,
  QBM_RESULT,
  QBM_AUTHORIZED_SOURCES,
  QBM_FLAGS,
  QBM_PUBLIC_API,
  QBM_SENSITIVE_KEYS,
  QBM_RUNTIME_ANCHORS,
  createQueryDescriptor,
  createQueryBusManager,
  clearQueryBusSingletonForTest,
  soleQueryBusAuthority: true,
  oneHandlerPerQuery: true,
  neverMutatesState: true,
  neverCreatesDomainEvents: true,
  cqrsSeparated: true,
  readsOnlyViaReadModel: true,
  noDirectEventStreamRead: true
};
