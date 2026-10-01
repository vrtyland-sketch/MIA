"use strict";

/**
 * Master Canon 0081 — Saga Manager.
 * Kernel Layer 0 sole central authority for long-running business process orchestration.
 * SM coordinates only — never calls command handlers directly, never invents domain
 * business logic beyond step orchestration / compensation routing.
 * Commands go ONLY via commandBusBridge.send. No global transactions.
 */

const crypto = require("crypto");

const SM_COMPONENT = Object.freeze({
  SAGA_MANAGER: "saga_manager",
  INTAKE_GATE: "intake_gate",
  DESCRIPTOR_FACTORY: "descriptor_factory",
  TYPE_REGISTRY: "type_registry",
  STEP_ORCHESTRATOR: "step_orchestrator",
  EVENT_ADAPTER: "event_adapter",
  COMMAND_DISPATCHER: "command_dispatcher",
  WAITING_CONTROLLER: "waiting_controller",
  TIMEOUT_CONTROLLER: "timeout_controller",
  COMPENSATION_ENGINE: "compensation_engine",
  SECURITY_GATE: "security_gate",
  SAGA_AUDIT: "saga_audit"
});

const SM_COMPONENT_ORDER = Object.freeze(Object.values(SM_COMPONENT));

const SM_DESCRIPTOR_FIELDS = Object.freeze([
  "sagaId",
  "sagaType",
  "currentStep",
  "status",
  "started",
  "updated",
  "correlationId",
  "version"
]);

/** Lifecycle: created → running → waiting → completed.
 *  Failure: running|waiting → compensating → failed.
 *  Also allow cancelled. */
const SM_STATUS = Object.freeze({
  CREATED: "created",
  RUNNING: "running",
  WAITING: "waiting",
  COMPLETED: "completed",
  COMPENSATING: "compensating",
  FAILED: "failed",
  CANCELLED: "cancelled"
});

const SM_ACTIVE_STATUSES = Object.freeze([
  SM_STATUS.CREATED,
  SM_STATUS.RUNNING,
  SM_STATUS.WAITING,
  SM_STATUS.COMPENSATING
]);

const SM_STATUS_TRANSITIONS = Object.freeze({
  [SM_STATUS.CREATED]: Object.freeze([SM_STATUS.RUNNING, SM_STATUS.CANCELLED]),
  [SM_STATUS.RUNNING]: Object.freeze([
    SM_STATUS.WAITING,
    SM_STATUS.COMPLETED,
    SM_STATUS.COMPENSATING,
    SM_STATUS.FAILED,
    SM_STATUS.CANCELLED
  ]),
  [SM_STATUS.WAITING]: Object.freeze([
    SM_STATUS.RUNNING,
    SM_STATUS.COMPLETED,
    SM_STATUS.COMPENSATING,
    SM_STATUS.FAILED,
    SM_STATUS.CANCELLED
  ]), // happy path: waiting → completed; also waiting → running to continue steps
  [SM_STATUS.COMPENSATING]: Object.freeze([SM_STATUS.FAILED, SM_STATUS.CANCELLED]),
  [SM_STATUS.COMPLETED]: Object.freeze([]),
  [SM_STATUS.FAILED]: Object.freeze([]),
  [SM_STATUS.CANCELLED]: Object.freeze([])
});

const SM_AUTHORIZED_SOURCES = Object.freeze([
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
  "saga_manager",
  "saga-manager",
  "event_bus",
  "event-bus",
  "event_store",
  "event-store",
  "message_queue",
  "message-queue",
  "command_bus",
  "command-bus",
  "query_bus",
  "query-bus",
  "projection_manager",
  "projection-manager",
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

const SM_FLAGS = Object.freeze({
  soleSagaAuthority: true,
  executesCommandsDirectly: false,
  createsBusinessLogic: false,
  usesGlobalTransactions: false,
  coordinatesOnly: true,
  commandsViaCommandBusOnly: true
});

const SM_PUBLIC_API = Object.freeze([
  "startSaga",
  "resumeSaga",
  "cancelSaga",
  "completeSaga",
  "compensateSaga",
  "getSaga"
]);

const SM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-saga-core/sagaManager.js",
  "shared/mia-event-store-core/eventStoreManager.js",
  "shared/mia-event-bus-core/eventBusManager.js",
  "shared/mia-message-queue-core/messageQueueManager.js",
  "shared/mia-command-bus-core/commandBusManager.js",
  "docs/master-canon/0081-saga-manager.md"
]);

let activeSagaManager = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function validateStatusTransition(from, to) {
  const src = String(from || "").trim();
  const dst = String(to || "").trim();
  if (!src || !dst) {
    return Object.freeze({ ok: false, error: "missing_status" });
  }
  if (!(src in SM_STATUS_TRANSITIONS)) {
    return Object.freeze({ ok: false, error: "unknown_status", from: src });
  }
  const allowed = SM_STATUS_TRANSITIONS[src];
  if (!allowed.includes(dst)) {
    return Object.freeze({
      ok: false,
      error: "invalid_status_transition",
      from: src,
      to: dst
    });
  }
  return Object.freeze({ ok: true, from: src, to: dst });
}

function rejectDirectHandlerCall(op) {
  return Object.freeze({
    ok: false,
    error: `direct_handler_call_rejected`,
    operation: op || "unknown",
    executesCommandsDirectly: false,
    commandsViaCommandBusOnly: true,
    coordinatesOnly: true
  });
}

function rejectGlobalTransaction(op) {
  return Object.freeze({
    ok: false,
    error: "global_transaction_rejected",
    operation: op || "unknown",
    usesGlobalTransactions: false
  });
}

function createSagaDescriptor(input = {}) {
  const sagaType = String(input.sagaType || input.type || "").trim();
  if (!sagaType) return { ok: false, error: "missing_sagaType" };

  const now =
    typeof input.nowMs === "number" && Number.isFinite(input.nowMs)
      ? input.nowMs
      : Date.now();

  const started =
    typeof input.started === "number" && Number.isFinite(input.started)
      ? input.started
      : now;

  const updated =
    typeof input.updated === "number" && Number.isFinite(input.updated)
      ? input.updated
      : started;

  const version =
    typeof input.version === "number" && Number.isFinite(input.version)
      ? Math.max(0, Math.floor(input.version))
      : 0;

  const currentStep =
    typeof input.currentStep === "number" && Number.isFinite(input.currentStep)
      ? Math.max(0, Math.floor(input.currentStep))
      : 0;

  const status = String(input.status || SM_STATUS.CREATED).trim() || SM_STATUS.CREATED;

  const sagaId =
    input.sagaId != null && String(input.sagaId).trim()
      ? String(input.sagaId).trim()
      : makeId("saga");

  const correlationId =
    input.correlationId != null && String(input.correlationId).trim()
      ? String(input.correlationId).trim()
      : null;

  const descriptor = {
    sagaId,
    sagaType,
    currentStep,
    status,
    started,
    updated,
    correlationId,
    version
  };

  return {
    ok: true,
    descriptor: Object.freeze(descriptor)
  };
}

function normalizeStep(raw, index) {
  if (raw == null || typeof raw !== "object") {
    return { ok: false, error: "invalid_step", index };
  }
  const name = String(raw.name || `step_${index}`).trim();
  if (!name) return { ok: false, error: "missing_step_name", index };

  const step = {
    name,
    onEnter: null,
    waitFor: null,
    onTimeout: null,
    compensate: null,
    timeoutMs: null
  };

  if (raw.onEnter != null) {
    if (typeof raw.onEnter !== "object") {
      return { ok: false, error: "invalid_onEnter", index };
    }
    const commandType = String(raw.onEnter.commandType || "").trim();
    if (!commandType) return { ok: false, error: "missing_onEnter_commandType", index };
    step.onEnter = Object.freeze({
      commandType,
      payloadBuilder:
        typeof raw.onEnter.payloadBuilder === "function"
          ? raw.onEnter.payloadBuilder
          : null,
      payload:
        raw.onEnter.payload != null && typeof raw.onEnter.payload === "object"
          ? Object.freeze({ ...raw.onEnter.payload })
          : null
    });
  }

  if (raw.waitFor != null) {
    const waitFor = String(raw.waitFor).trim();
    if (!waitFor) return { ok: false, error: "invalid_waitFor", index };
    step.waitFor = waitFor;
  }

  if (raw.onTimeout != null) {
    const ot = String(raw.onTimeout).trim();
    if (ot !== "compensate" && ot !== "fail") {
      return { ok: false, error: "invalid_onTimeout", index };
    }
    step.onTimeout = ot;
  }

  if (raw.compensate != null) {
    if (typeof raw.compensate !== "object") {
      return { ok: false, error: "invalid_compensate", index };
    }
    const commandType = String(raw.compensate.commandType || "").trim();
    if (!commandType) return { ok: false, error: "missing_compensate_commandType", index };
    step.compensate = Object.freeze({
      commandType,
      payload:
        raw.compensate.payload != null && typeof raw.compensate.payload === "object"
          ? Object.freeze({ ...raw.compensate.payload })
          : null
    });
  }

  if (raw.timeoutMs != null) {
    const ms = Number(raw.timeoutMs);
    if (!Number.isFinite(ms) || ms < 0) {
      return { ok: false, error: "invalid_timeoutMs", index };
    }
    step.timeoutMs = Math.floor(ms);
  }

  return { ok: true, step: Object.freeze(step) };
}

function createSagaManager(options = {}) {
  if (
    activeSagaManager &&
    activeSagaManager.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "saga_manager_already_active",
      soleSagaAuthority: true
    });
  }

  const authorized = new Set(options.authorizedSources || SM_AUTHORIZED_SOURCES);
  const commandBusBridge = options.commandBusBridge || null;
  const eventStoreBridge = options.eventStoreBridge || null;

  /** @type {Map<string, { steps: object[], timeoutMs: number|null, meta: object }>} */
  const typeRegistry = new Map();

  /** @type {Map<string, object>} */
  const sagas = new Map();

  const sagaAuditLog = [];

  let activeCount = 0;
  let completedCount = 0;
  let compensationCount = 0;
  let timeoutCount = 0;
  let failureCount = 0;
  let durationSumMs = 0;
  let durationSamples = 0;
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
    if (meta && meta.directHandlerCall === true) {
      return rejectDirectHandlerCall(_operation);
    }
    if (meta && meta.globalTransaction === true) {
      return rejectGlobalTransaction(_operation);
    }
    if (requireAuth && !isAuthorized(meta)) {
      return Object.freeze({ ok: false, error: "unauthorized_saga" });
    }
    if (!isSourceVerified(meta)) {
      return Object.freeze({ ok: false, error: "forged_saga_blocked" });
    }
    return null;
  }

  function nowMs(meta = {}) {
    if (typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)) {
      return meta.nowMs;
    }
    return Date.now();
  }

  function recordAudit(entry) {
    sagaAuditLog.push(
      Object.freeze({
        sagaId: entry.sagaId != null ? entry.sagaId : null,
        sagaType: entry.sagaType != null ? entry.sagaType : null,
        currentStep: entry.currentStep != null ? entry.currentStep : null,
        status: entry.status != null ? entry.status : null,
        changedAt: entry.changedAt != null ? entry.changedAt : Date.now(),
        result: entry.result || "unknown",
        correlationId: entry.correlationId != null ? entry.correlationId : null
      })
    );
  }

  function freezeView(entry) {
    return Object.freeze({
      ...entry.descriptor,
      payload: entry.payload,
      waitFor: entry.waitFor,
      waitDeadline: entry.waitDeadline,
      completedSteps: Object.freeze([...(entry.completedSteps || [])]),
      soleSagaAuthority: true,
      coordinatesOnly: true,
      executesCommandsDirectly: false,
      createsBusinessLogic: false,
      usesGlobalTransactions: false,
      commandsViaCommandBusOnly: true
    });
  }

  function bumpActive() {
    let n = 0;
    for (const e of sagas.values()) {
      if (SM_ACTIVE_STATUSES.includes(e.descriptor.status)) n += 1;
    }
    activeCount = n;
  }

  function setStatus(entry, nextStatus, meta = {}, resultLabel = null) {
    const from = entry.descriptor.status;
    const check = validateStatusTransition(from, nextStatus);
    if (!check.ok) return check;

    const t = nowMs(meta);
    entry.descriptor = Object.freeze({
      ...entry.descriptor,
      status: nextStatus,
      updated: t,
      version: entry.descriptor.version + 1
    });

    recordAudit({
      sagaId: entry.descriptor.sagaId,
      sagaType: entry.descriptor.sagaType,
      currentStep: entry.descriptor.currentStep,
      status: nextStatus,
      changedAt: t,
      result: resultLabel || `transition_${from}_to_${nextStatus}`,
      correlationId: entry.descriptor.correlationId || meta.correlationId || null
    });

    bumpActive();
    return Object.freeze({ ok: true, from, to: nextStatus });
  }

  function appendLifecycleEvent(eventType, entry, meta = {}) {
    if (!eventStoreBridge || typeof eventStoreBridge.appendEvent !== "function") {
      return;
    }
    try {
      eventStoreBridge.appendEvent({
        eventType,
        streamId: `saga:${entry.descriptor.sagaId}`,
        payload: {
          sagaId: entry.descriptor.sagaId,
          sagaType: entry.descriptor.sagaType,
          status: entry.descriptor.status,
          currentStep: entry.descriptor.currentStep,
          correlationId: entry.descriptor.correlationId
        },
        correlationId: entry.descriptor.correlationId || meta.correlationId || null,
        sender: "saga_manager"
      });
    } catch (_err) {
      // optional bridge — failures must not break coordination
    }
  }

  function sendCommand(commandType, payload, entry, meta = {}) {
    if (meta.directHandlerCall === true) {
      return rejectDirectHandlerCall("sendCommand");
    }
    if (!commandBusBridge || typeof commandBusBridge.send !== "function") {
      return Object.freeze({
        ok: false,
        error: "command_bus_bridge_missing",
        commandsViaCommandBusOnly: true
      });
    }
    try {
      const result = commandBusBridge.send({
        commandType,
        payload: payload && typeof payload === "object" ? { ...payload } : {},
        correlationId: entry.descriptor.correlationId || meta.correlationId || null,
        sender: "saga_manager",
        sagaId: entry.descriptor.sagaId
      });
      return result && typeof result === "object"
        ? Object.freeze({ ok: result.ok !== false, ...result })
        : Object.freeze({ ok: true, result });
    } catch (err) {
      return Object.freeze({
        ok: false,
        error: "command_bus_send_failed",
        message: err && err.message ? String(err.message) : "unknown"
      });
    }
  }

  function buildPayload(stepOnEnter, entry, inputPayload) {
    if (stepOnEnter && typeof stepOnEnter.payloadBuilder === "function") {
      try {
        const built = stepOnEnter.payloadBuilder({
          saga: entry.descriptor,
          payload: inputPayload || entry.payload || {},
          step: stepOnEnter
        });
        if (built != null && typeof built === "object") return { ...built };
      } catch (_err) {
        // fall through
      }
    }
    if (stepOnEnter && stepOnEnter.payload) return { ...stepOnEnter.payload };
    if (inputPayload && typeof inputPayload === "object") return { ...inputPayload };
    if (entry.payload && typeof entry.payload === "object") return { ...entry.payload };
    return {};
  }

  function getTypeDef(sagaType) {
    return typeRegistry.get(String(sagaType || "").trim()) || null;
  }

  function runStep(entry, meta = {}) {
    const typeDef = getTypeDef(entry.descriptor.sagaType);
    if (!typeDef) {
      return Object.freeze({ ok: false, error: "saga_type_not_registered" });
    }

    const stepIndex = entry.descriptor.currentStep;
    const steps = typeDef.steps;

    if (stepIndex >= steps.length) {
      return completeSaga(entry.descriptor.sagaId, meta);
    }

    const step = steps[stepIndex];
    const t = nowMs(meta);

    // ensure running while executing step (may come from waiting)
    if (entry.descriptor.status === SM_STATUS.WAITING) {
      const toRunning = setStatus(entry, SM_STATUS.RUNNING, meta, "resume_from_waiting");
      if (!toRunning.ok) return toRunning;
    } else if (entry.descriptor.status === SM_STATUS.CREATED) {
      const toRunning = setStatus(entry, SM_STATUS.RUNNING, meta, "start_running");
      if (!toRunning.ok) return toRunning;
    }

    if (step.onEnter) {
      const payload = buildPayload(step.onEnter, entry, meta.payload);
      const sent = sendCommand(step.onEnter.commandType, payload, entry, meta);
      if (!sent.ok) {
        // step failure → compensate
        const comp = compensateSaga(entry.descriptor.sagaId, {
          ...meta,
          reason: "step_command_failed",
          stepError: sent.error
        });
        return Object.freeze({
          ok: false,
          error: sent.error || "step_command_failed",
          compensated: comp.ok === true,
          compensation: comp
        });
      }
      entry.completedSteps.push(stepIndex);
      entry.lastCommand = Object.freeze({
        commandType: step.onEnter.commandType,
        at: t
      });
    } else {
      // no command — step still counts as entered
      entry.completedSteps.push(stepIndex);
    }

    if (step.waitFor) {
      const timeoutMs =
        step.timeoutMs != null
          ? step.timeoutMs
          : typeDef.timeoutMs != null
            ? typeDef.timeoutMs
            : null;
      entry.waitFor = step.waitFor;
      entry.waitDeadline =
        timeoutMs != null ? t + timeoutMs : null;
      entry.onTimeout = step.onTimeout || "compensate";

      const toWait = setStatus(entry, SM_STATUS.WAITING, meta, `waiting_${step.waitFor}`);
      if (!toWait.ok) return toWait;

      entry.descriptor = Object.freeze({
        ...entry.descriptor,
        updated: nowMs(meta)
      });

      return Object.freeze({
        ok: true,
        sagaId: entry.descriptor.sagaId,
        status: SM_STATUS.WAITING,
        waitFor: step.waitFor,
        currentStep: stepIndex,
        saga: freezeView(entry)
      });
    }

    // advance to next step immediately
    entry.waitFor = null;
    entry.waitDeadline = null;
    entry.onTimeout = null;

    const nextStep = stepIndex + 1;
    entry.descriptor = Object.freeze({
      ...entry.descriptor,
      currentStep: nextStep,
      updated: nowMs(meta),
      version: entry.descriptor.version + 1
    });

    if (nextStep >= steps.length) {
      return completeSaga(entry.descriptor.sagaId, meta);
    }

    return runStep(entry, meta);
  }

  function registerSagaType(sagaType, definition, meta = {}) {
    const blocked = gate(meta, "registerSagaType");
    if (blocked) return blocked;

    const type = String(sagaType || "").trim();
    if (!type) return Object.freeze({ ok: false, error: "missing_sagaType" });
    if (typeRegistry.has(type) && meta.force !== true) {
      return Object.freeze({
        ok: false,
        error: "saga_type_already_registered",
        sagaType: type
      });
    }
    if (!definition || typeof definition !== "object") {
      return Object.freeze({ ok: false, error: "missing_definition" });
    }
    if (!Array.isArray(definition.steps) || definition.steps.length === 0) {
      return Object.freeze({ ok: false, error: "missing_steps" });
    }

    const steps = [];
    for (let i = 0; i < definition.steps.length; i += 1) {
      const norm = normalizeStep(definition.steps[i], i);
      if (!norm.ok) return Object.freeze({ ok: false, ...norm });
      steps.push(norm.step);
    }

    let timeoutMs = null;
    if (definition.timeoutMs != null) {
      const ms = Number(definition.timeoutMs);
      if (!Number.isFinite(ms) || ms < 0) {
        return Object.freeze({ ok: false, error: "invalid_timeoutMs" });
      }
      timeoutMs = Math.floor(ms);
    }

    typeRegistry.set(
      type,
      Object.freeze({
        sagaType: type,
        steps: Object.freeze(steps),
        timeoutMs,
        meta: Object.freeze({ ...(meta || {}) })
      })
    );

    return Object.freeze({
      ok: true,
      sagaType: type,
      stepCount: steps.length
    });
  }

  function findActiveByCorrelation(sagaType, correlationId) {
    if (!correlationId) return null;
    for (const entry of sagas.values()) {
      if (
        entry.descriptor.sagaType === sagaType &&
        entry.descriptor.correlationId === correlationId &&
        SM_ACTIVE_STATUSES.includes(entry.descriptor.status)
      ) {
        return entry;
      }
    }
    return null;
  }

  function startSaga(input = {}, meta = {}) {
    const blocked = gate(meta, "startSaga");
    if (blocked) return blocked;

    const sagaType = String(input.sagaType || input.type || "").trim();
    if (!sagaType) {
      return Object.freeze({ ok: false, error: "missing_sagaType" });
    }

    const typeDef = getTypeDef(sagaType);
    if (!typeDef) {
      return Object.freeze({ ok: false, error: "saga_type_not_registered", sagaType });
    }

    const correlationId =
      input.correlationId != null && String(input.correlationId).trim()
        ? String(input.correlationId).trim()
        : meta.correlationId != null && String(meta.correlationId).trim()
          ? String(meta.correlationId).trim()
          : null;

    if (input.sagaId != null && String(input.sagaId).trim()) {
      const existingId = String(input.sagaId).trim();
      if (sagas.has(existingId)) {
        return Object.freeze({
          ok: false,
          error: "duplicate_saga_start",
          sagaId: existingId
        });
      }
    }

    if (correlationId) {
      const dup = findActiveByCorrelation(sagaType, correlationId);
      if (dup) {
        return Object.freeze({
          ok: false,
          error: "duplicate_saga_start",
          sagaId: dup.descriptor.sagaId,
          correlationId
        });
      }
    }

    const t = nowMs(meta);
    const desc = createSagaDescriptor({
      sagaId: input.sagaId,
      sagaType,
      currentStep: 0,
      status: SM_STATUS.CREATED,
      started: t,
      updated: t,
      correlationId,
      version: 0,
      nowMs: t
    });
    if (!desc.ok) return Object.freeze({ ok: false, error: desc.error });

    const entry = {
      descriptor: desc.descriptor,
      payload:
        input.payload != null && typeof input.payload === "object"
          ? Object.freeze({ ...input.payload })
          : Object.freeze({}),
      completedSteps: [],
      waitFor: null,
      waitDeadline: null,
      onTimeout: null,
      lastCommand: null,
      persistedSteps: typeDef.steps
    };
    sagas.set(desc.descriptor.sagaId, entry);

    recordAudit({
      sagaId: desc.descriptor.sagaId,
      sagaType,
      currentStep: 0,
      status: SM_STATUS.CREATED,
      changedAt: t,
      result: "created",
      correlationId
    });
    bumpActive();

    appendLifecycleEvent("SagaStarted", entry, meta);

    const run = runStep(entry, { ...meta, payload: entry.payload });
    return Object.freeze({
      ok: run.ok !== false,
      sagaId: entry.descriptor.sagaId,
      status: entry.descriptor.status,
      currentStep: entry.descriptor.currentStep,
      saga: freezeView(entry),
      ...(run.ok === false ? { error: run.error, compensation: run.compensation } : {}),
      coordinatesOnly: true,
      executesCommandsDirectly: false,
      commandsViaCommandBusOnly: true,
      usesGlobalTransactions: false
    });
  }

  function getSaga(sagaId) {
    const id = String(sagaId || "").trim();
    if (!id) return Object.freeze({ ok: false, error: "missing_sagaId" });
    const entry = sagas.get(id);
    if (!entry) {
      return Object.freeze({ ok: false, error: "saga_not_found", sagaId: id });
    }
    return Object.freeze({
      ok: true,
      sagaId: id,
      saga: freezeView(entry),
      readOnly: true
    });
  }

  function completeSaga(sagaId, meta = {}) {
    const blocked = gate(meta, "completeSaga");
    if (blocked) return blocked;

    const id = String(sagaId || "").trim();
    const entry = sagas.get(id);
    if (!entry) {
      return Object.freeze({ ok: false, error: "saga_not_found", sagaId: id });
    }

    if (entry.descriptor.status === SM_STATUS.COMPLETED) {
      return Object.freeze({
        ok: true,
        sagaId: id,
        status: SM_STATUS.COMPLETED,
        alreadyComplete: true,
        saga: freezeView(entry)
      });
    }

    // allow complete from running or waiting
    if (
      entry.descriptor.status !== SM_STATUS.RUNNING &&
      entry.descriptor.status !== SM_STATUS.WAITING &&
      entry.descriptor.status !== SM_STATUS.CREATED
    ) {
      // force path: if already terminal-ish, reject
      if (
        entry.descriptor.status === SM_STATUS.FAILED ||
        entry.descriptor.status === SM_STATUS.CANCELLED ||
        entry.descriptor.status === SM_STATUS.COMPENSATING
      ) {
        return Object.freeze({
          ok: false,
          error: "invalid_status_transition",
          from: entry.descriptor.status,
          to: SM_STATUS.COMPLETED
        });
      }
    }

    // if waiting, go running first then completed (or allow waiting→completed via running)
    if (entry.descriptor.status === SM_STATUS.WAITING) {
      const toRun = setStatus(entry, SM_STATUS.RUNNING, meta, "complete_via_running");
      if (!toRun.ok) return toRun;
    } else if (entry.descriptor.status === SM_STATUS.CREATED) {
      const toRun = setStatus(entry, SM_STATUS.RUNNING, meta, "complete_via_running");
      if (!toRun.ok) return toRun;
    }

    const done = setStatus(entry, SM_STATUS.COMPLETED, meta, "completed");
    if (!done.ok) return done;

    entry.waitFor = null;
    entry.waitDeadline = null;

    const duration = Math.max(0, nowMs(meta) - entry.descriptor.started);
    durationSumMs += duration;
    durationSamples += 1;
    completedCount += 1;
    bumpActive();

    appendLifecycleEvent("SagaCompleted", entry, meta);

    return Object.freeze({
      ok: true,
      sagaId: id,
      status: SM_STATUS.COMPLETED,
      saga: freezeView(entry),
      durationMs: duration
    });
  }

  function cancelSaga(sagaId, meta = {}) {
    const blocked = gate(meta, "cancelSaga");
    if (blocked) return blocked;

    const id = String(sagaId || "").trim();
    const entry = sagas.get(id);
    if (!entry) {
      return Object.freeze({ ok: false, error: "saga_not_found", sagaId: id });
    }

    if (
      entry.descriptor.status === SM_STATUS.COMPLETED ||
      entry.descriptor.status === SM_STATUS.FAILED ||
      entry.descriptor.status === SM_STATUS.CANCELLED
    ) {
      return Object.freeze({
        ok: false,
        error: "saga_already_terminal",
        status: entry.descriptor.status
      });
    }

    const cancelled = setStatus(entry, SM_STATUS.CANCELLED, meta, "cancelled");
    if (!cancelled.ok) return cancelled;

    entry.waitFor = null;
    entry.waitDeadline = null;
    bumpActive();

    return Object.freeze({
      ok: true,
      sagaId: id,
      status: SM_STATUS.CANCELLED,
      saga: freezeView(entry)
    });
  }

  function compensateSaga(sagaId, meta = {}) {
    const blocked = gate(meta, "compensateSaga");
    if (blocked) return blocked;

    const id = String(sagaId || "").trim();
    const entry = sagas.get(id);
    if (!entry) {
      return Object.freeze({ ok: false, error: "saga_not_found", sagaId: id });
    }

    if (entry.descriptor.status === SM_STATUS.FAILED) {
      return Object.freeze({
        ok: true,
        sagaId: id,
        status: SM_STATUS.FAILED,
        alreadyFailed: true,
        saga: freezeView(entry)
      });
    }

    if (
      entry.descriptor.status !== SM_STATUS.COMPENSATING &&
      entry.descriptor.status !== SM_STATUS.RUNNING &&
      entry.descriptor.status !== SM_STATUS.WAITING
    ) {
      // allow from created via running path only if forced
      if (entry.descriptor.status === SM_STATUS.CREATED) {
        const toRun = setStatus(entry, SM_STATUS.RUNNING, meta, "compensate_prep");
        if (!toRun.ok) return toRun;
      } else if (
        entry.descriptor.status === SM_STATUS.COMPLETED ||
        entry.descriptor.status === SM_STATUS.CANCELLED
      ) {
        return Object.freeze({
          ok: false,
          error: "invalid_status_transition",
          from: entry.descriptor.status,
          to: SM_STATUS.COMPENSATING
        });
      }
    }

    if (entry.descriptor.status !== SM_STATUS.COMPENSATING) {
      const toComp = setStatus(entry, SM_STATUS.COMPENSATING, meta, "compensating");
      if (!toComp.ok) return toComp;
    }

    compensationCount += 1;

    const typeDef = getTypeDef(entry.descriptor.sagaType);
    const steps = typeDef ? typeDef.steps : entry.persistedSteps || [];
    const completed = [...(entry.completedSteps || [])].sort((a, b) => b - a);
    const compensationResults = [];

    for (const stepIndex of completed) {
      const step = steps[stepIndex];
      if (!step || !step.compensate) continue;
      const payload =
        step.compensate.payload != null
          ? { ...step.compensate.payload }
          : entry.payload && typeof entry.payload === "object"
            ? { ...entry.payload }
            : {};
      const sent = sendCommand(step.compensate.commandType, payload, entry, meta);
      compensationResults.push(
        Object.freeze({
          stepIndex,
          commandType: step.compensate.commandType,
          ok: sent.ok !== false,
          error: sent.error || null
        })
      );
    }

    entry.waitFor = null;
    entry.waitDeadline = null;

    const failed = setStatus(entry, SM_STATUS.FAILED, meta, "compensated_failed");
    if (!failed.ok) return failed;

    failureCount += 1;
    bumpActive();
    appendLifecycleEvent("SagaFailed", entry, meta);

    return Object.freeze({
      ok: true,
      sagaId: id,
      status: SM_STATUS.FAILED,
      compensationResults: Object.freeze(compensationResults),
      usesGlobalTransactions: false,
      saga: freezeView(entry)
    });
  }

  function resumeSaga(sagaId, meta = {}) {
    const blocked = gate(meta, "resumeSaga");
    if (blocked) return blocked;

    const id = String(sagaId || "").trim();
    let entry = sagas.get(id);

    // recovery from persisted descriptor
    if (!entry && meta.persisted && typeof meta.persisted === "object") {
      const p = meta.persisted;
      const desc = createSagaDescriptor({
        sagaId: p.sagaId || id,
        sagaType: p.sagaType,
        currentStep: p.currentStep,
        status: p.status || SM_STATUS.RUNNING,
        started: p.started,
        updated: p.updated,
        correlationId: p.correlationId,
        version: p.version
      });
      if (!desc.ok) return Object.freeze({ ok: false, error: desc.error });

      const typeDef = getTypeDef(desc.descriptor.sagaType);
      if (!typeDef && !meta.persisted.steps) {
        return Object.freeze({
          ok: false,
          error: "saga_type_not_registered",
          sagaType: desc.descriptor.sagaType
        });
      }

      entry = {
        descriptor: desc.descriptor,
        payload:
          p.payload != null && typeof p.payload === "object"
            ? Object.freeze({ ...p.payload })
            : Object.freeze({}),
        completedSteps: Array.isArray(p.completedSteps) ? [...p.completedSteps] : [],
        waitFor: p.waitFor || null,
        waitDeadline: p.waitDeadline != null ? p.waitDeadline : null,
        onTimeout: p.onTimeout || null,
        lastCommand: null,
        persistedSteps: typeDef ? typeDef.steps : p.steps || []
      };
      sagas.set(desc.descriptor.sagaId, entry);
      bumpActive();
      recordAudit({
        sagaId: desc.descriptor.sagaId,
        sagaType: desc.descriptor.sagaType,
        currentStep: desc.descriptor.currentStep,
        status: desc.descriptor.status,
        changedAt: nowMs(meta),
        result: "recovered",
        correlationId: desc.descriptor.correlationId
      });
    }

    if (!entry) {
      return Object.freeze({ ok: false, error: "saga_not_found", sagaId: id });
    }

    if (
      entry.descriptor.status === SM_STATUS.COMPLETED ||
      entry.descriptor.status === SM_STATUS.FAILED ||
      entry.descriptor.status === SM_STATUS.CANCELLED
    ) {
      return Object.freeze({
        ok: false,
        error: "saga_already_terminal",
        status: entry.descriptor.status,
        saga: freezeView(entry)
      });
    }

    // if waiting, stay waiting until event/timeout unless forceContinue
    if (entry.descriptor.status === SM_STATUS.WAITING && meta.forceContinue !== true) {
      return Object.freeze({
        ok: true,
        sagaId: entry.descriptor.sagaId,
        status: SM_STATUS.WAITING,
        resumed: true,
        waiting: true,
        saga: freezeView(entry)
      });
    }

    if (entry.descriptor.status === SM_STATUS.CREATED) {
      const toRun = setStatus(entry, SM_STATUS.RUNNING, meta, "resume_running");
      if (!toRun.ok) return toRun;
    } else if (entry.descriptor.status === SM_STATUS.WAITING && meta.forceContinue === true) {
      const toRun = setStatus(entry, SM_STATUS.RUNNING, meta, "force_continue");
      if (!toRun.ok) return toRun;
      entry.waitFor = null;
      entry.waitDeadline = null;
    }

    const run = runStep(entry, meta);
    return Object.freeze({
      ok: run.ok !== false,
      sagaId: entry.descriptor.sagaId,
      status: entry.descriptor.status,
      currentStep: entry.descriptor.currentStep,
      resumed: true,
      saga: freezeView(entry),
      ...(run.ok === false ? { error: run.error } : {})
    });
  }

  function onEvent(event, meta = {}) {
    const blocked = gate(meta, "onEvent", { requireAuth: false });
    if (blocked && blocked.error === "forged_saga_blocked") return blocked;
    // events from bus: authorize via event_bus source if provided
    if (meta && meta.requireAuth === true) {
      const authBlocked = gate(meta, "onEvent");
      if (authBlocked) return authBlocked;
    }

    if (event == null || typeof event !== "object") {
      return Object.freeze({ ok: false, error: "invalid_event" });
    }
    if (event.forged === true || event.integrityOk === false) {
      return Object.freeze({ ok: false, error: "forged_saga_blocked" });
    }

    const eventType = String(
      event.eventType || event.type || event.name || ""
    ).trim();
    if (!eventType) {
      return Object.freeze({ ok: false, error: "missing_eventType" });
    }

    const correlationId =
      event.correlationId != null
        ? String(event.correlationId).trim()
        : meta.correlationId != null
          ? String(meta.correlationId).trim()
          : null;

    const advanced = [];
    const skipped = [];

    for (const entry of sagas.values()) {
      if (entry.descriptor.status !== SM_STATUS.WAITING) {
        skipped.push(entry.descriptor.sagaId);
        continue;
      }
      if (!entry.waitFor || entry.waitFor !== eventType) {
        skipped.push(entry.descriptor.sagaId);
        continue;
      }
      if (
        correlationId &&
        entry.descriptor.correlationId &&
        entry.descriptor.correlationId !== correlationId
      ) {
        skipped.push(entry.descriptor.sagaId);
        continue;
      }

      // matching event — advance
      entry.waitFor = null;
      entry.waitDeadline = null;
      entry.onTimeout = null;

      const nextStep = entry.descriptor.currentStep + 1;
      entry.descriptor = Object.freeze({
        ...entry.descriptor,
        currentStep: nextStep,
        updated: nowMs(meta),
        version: entry.descriptor.version + 1
      });

      recordAudit({
        sagaId: entry.descriptor.sagaId,
        sagaType: entry.descriptor.sagaType,
        currentStep: nextStep,
        status: entry.descriptor.status,
        changedAt: nowMs(meta),
        result: `event_${eventType}`,
        correlationId: entry.descriptor.correlationId
      });

      const run = runStep(entry, meta);
      advanced.push(
        Object.freeze({
          sagaId: entry.descriptor.sagaId,
          ok: run.ok !== false,
          status: entry.descriptor.status,
          currentStep: entry.descriptor.currentStep,
          error: run.error || null
        })
      );
    }

    return Object.freeze({
      ok: true,
      eventType,
      advanced: Object.freeze(advanced),
      skippedCount: skipped.length
    });
  }

  function fromEventBus(envelope, meta = {}) {
    const event =
      envelope && envelope.event
        ? envelope.event
        : envelope;
    const mergedMeta = {
      source: "event_bus",
      authorized: true,
      ...(meta || {}),
      correlationId:
        (envelope && envelope.correlationId) ||
        (meta && meta.correlationId) ||
        (event && event.correlationId) ||
        null
    };
    return onEvent(event, mergedMeta);
  }

  function tickTimeouts(nowInput, meta = {}) {
    const t =
      typeof nowInput === "number" && Number.isFinite(nowInput)
        ? nowInput
        : nowMs(meta);

    const timedOut = [];

    for (const entry of sagas.values()) {
      if (entry.descriptor.status !== SM_STATUS.WAITING) continue;
      if (entry.waitDeadline == null) continue;
      if (t < entry.waitDeadline) continue;

      timeoutCount += 1;
      const action = entry.onTimeout || "compensate";

      if (action === "fail") {
        // waiting → compensating → failed, or direct fail via compensate path
        const comp = compensateSaga(entry.descriptor.sagaId, {
          ...meta,
          nowMs: t,
          reason: "timeout_fail"
        });
        timedOut.push(
          Object.freeze({
            sagaId: entry.descriptor.sagaId,
            action: "fail",
            ok: comp.ok === true,
            status: entry.descriptor.status
          })
        );
      } else {
        const comp = compensateSaga(entry.descriptor.sagaId, {
          ...meta,
          nowMs: t,
          reason: "timeout_compensate"
        });
        timedOut.push(
          Object.freeze({
            sagaId: entry.descriptor.sagaId,
            action: "compensate",
            ok: comp.ok === true,
            status: entry.descriptor.status
          })
        );
      }
    }

    return Object.freeze({
      ok: true,
      nowMs: t,
      timedOut: Object.freeze(timedOut),
      timeoutCount
    });
  }

  function directHandlerCall() {
    return rejectDirectHandlerCall("directHandlerCall");
  }

  function beginGlobalTransaction() {
    return rejectGlobalTransaction("beginGlobalTransaction");
  }

  function metrics() {
    bumpActive();
    return Object.freeze({
      activeCount,
      completedCount,
      compensationCount,
      timeoutCount,
      averageDurationMs: durationSamples > 0 ? durationSumMs / durationSamples : 0,
      failureCount,
      soleSagaAuthority: true,
      executesCommandsDirectly: false,
      createsBusinessLogic: false,
      usesGlobalTransactions: false,
      coordinatesOnly: true,
      commandsViaCommandBusOnly: true
    });
  }

  function sagaAudit() {
    return Object.freeze([...sagaAuditLog]);
  }

  function status() {
    bumpActive();
    return Object.freeze({
      ok: true,
      singleton: true,
      soleSagaAuthority: true,
      executesCommandsDirectly: false,
      createsBusinessLogic: false,
      usesGlobalTransactions: false,
      coordinatesOnly: true,
      commandsViaCommandBusOnly: true,
      components: SM_COMPONENT_ORDER,
      typeCount: typeRegistry.size,
      sagaCount: sagas.size,
      activeCount
    });
  }

  const manager = Object.freeze({
    ok: true,
    startSaga,
    resumeSaga,
    cancelSaga,
    completeSaga,
    compensateSaga,
    getSaga,
    registerSagaType,
    onEvent,
    fromEventBus,
    tickTimeouts,
    metrics,
    sagaAudit,
    status,
    directHandlerCall,
    beginGlobalTransaction,
    isActive() {
      return active === true;
    }
  });

  activeSagaManager = {
    isActive: manager.isActive
  };

  return manager;
}

function clearSagaSingletonForTest() {
  activeSagaManager = null;
}

module.exports = {
  SM_COMPONENT,
  SM_COMPONENT_ORDER,
  SM_DESCRIPTOR_FIELDS,
  SM_STATUS,
  SM_ACTIVE_STATUSES,
  SM_STATUS_TRANSITIONS,
  SM_AUTHORIZED_SOURCES,
  SM_FLAGS,
  SM_PUBLIC_API,
  SM_RUNTIME_ANCHORS,
  createSagaDescriptor,
  validateStatusTransition,
  createSagaManager,
  clearSagaSingletonForTest,
  soleSagaAuthority: true,
  executesCommandsDirectly: false,
  createsBusinessLogic: false,
  usesGlobalTransactions: false,
  coordinatesOnly: true,
  commandsViaCommandBusOnly: true
};
