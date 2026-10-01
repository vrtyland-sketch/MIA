"use strict";

/**
 * Master Canon 0082 — Workflow Engine.
 * Kernel Layer 0 sole central authority for defining and executing workflows.
 * WFE describes HOW a process runs (steps, decisions, parallel, loops).
 * Saga (0081) coordinates long-running business processes; WFE executes procedures.
 * Commands go ONLY via commandBusBridge.send — never direct handlers.
 */

const crypto = require("crypto");

const WFE_COMPONENT = Object.freeze({
  WORKFLOW_ENGINE: "workflow_engine",
  INTAKE_GATE: "intake_gate",
  DESCRIPTOR_FACTORY: "descriptor_factory",
  TYPE_REGISTRY: "type_registry",
  STEP_EXECUTOR: "step_executor",
  DECISION_ENGINE: "decision_engine",
  PARALLEL_COORDINATOR: "parallel_coordinator",
  LOOP_CONTROLLER: "loop_controller",
  ERROR_HANDLER: "error_handler",
  TIMEOUT_CONTROLLER: "timeout_controller",
  SECURITY_GATE: "security_gate",
  WORKFLOW_AUDIT: "workflow_audit"
});

const WFE_COMPONENT_ORDER = Object.freeze(Object.values(WFE_COMPONENT));

const WFE_DESCRIPTOR_FIELDS = Object.freeze([
  "workflowId",
  "workflowType",
  "version",
  "currentStep",
  "status",
  "started",
  "updated",
  "owner"
]);

const WFE_STATUS = Object.freeze({
  CREATED: "created",
  RUNNING: "running",
  WAITING: "waiting",
  PAUSED: "paused",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled"
});

const WFE_ACTIVE_STATUSES = Object.freeze([
  WFE_STATUS.CREATED,
  WFE_STATUS.RUNNING,
  WFE_STATUS.WAITING,
  WFE_STATUS.PAUSED
]);

const WFE_STATUS_TRANSITIONS = Object.freeze({
  [WFE_STATUS.CREATED]: Object.freeze([
    WFE_STATUS.RUNNING,
    WFE_STATUS.CANCELLED
  ]),
  [WFE_STATUS.RUNNING]: Object.freeze([
    WFE_STATUS.WAITING,
    WFE_STATUS.PAUSED,
    WFE_STATUS.COMPLETED,
    WFE_STATUS.FAILED,
    WFE_STATUS.CANCELLED
  ]),
  [WFE_STATUS.WAITING]: Object.freeze([
    WFE_STATUS.RUNNING,
    WFE_STATUS.PAUSED,
    WFE_STATUS.COMPLETED,
    WFE_STATUS.FAILED,
    WFE_STATUS.CANCELLED
  ]),
  [WFE_STATUS.PAUSED]: Object.freeze([
    WFE_STATUS.RUNNING,
    WFE_STATUS.WAITING,
    WFE_STATUS.CANCELLED
  ]),
  [WFE_STATUS.COMPLETED]: Object.freeze([]),
  [WFE_STATUS.FAILED]: Object.freeze([]),
  [WFE_STATUS.CANCELLED]: Object.freeze([])
});

const WFE_NODE_TYPE = Object.freeze({
  STEP: "step",
  DECISION: "decision",
  PARALLEL: "parallel",
  LOOP: "loop"
});

const WFE_AUTHORIZED_SOURCES = Object.freeze([
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
  "workflow_engine",
  "workflow-engine",
  "event_bus",
  "event-bus",
  "message_queue",
  "message-queue",
  "command_bus",
  "command-bus",
  "ai_engine",
  "battle_engine",
  "gift_engine",
  "inventory",
  "platform",
  "security",
  "monitoring"
]);

const WFE_FLAGS = Object.freeze({
  soleWorkflowAuthority: true,
  executesCommandsDirectly: false,
  createsBusinessLogic: false,
  commandsViaCommandBusOnly: true,
  executesProceduresNotSagas: true,
  sagaCoordinatesBusinessProcess: true
});

const WFE_PUBLIC_API = Object.freeze([
  "startWorkflow",
  "pauseWorkflow",
  "resumeWorkflow",
  "cancelWorkflow",
  "completeWorkflow",
  "getWorkflow"
]);

const WFE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-workflow-core/workflowEngine.js",
  "shared/mia-saga-core/sagaManager.js",
  "shared/mia-command-bus-core/commandBusManager.js",
  "shared/mia-message-queue-core/messageQueueManager.js",
  "shared/mia-scheduler-core/taskScheduler.js",
  "docs/master-canon/0082-workflow-engine.md"
]);

let activeWorkflowEngine = null;

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
  if (!(src in WFE_STATUS_TRANSITIONS)) {
    return Object.freeze({ ok: false, error: "unknown_status", from: src });
  }
  const allowed = WFE_STATUS_TRANSITIONS[src];
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
    error: "direct_handler_call_rejected",
    operation: op || "unknown",
    executesCommandsDirectly: false,
    commandsViaCommandBusOnly: true
  });
}

function createWorkflowDescriptor(input = {}) {
  const workflowType = String(input.workflowType || input.type || "").trim();
  if (!workflowType) return { ok: false, error: "missing_workflowType" };

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
    input.currentStep != null && String(input.currentStep).trim()
      ? String(input.currentStep).trim()
      : null;

  const status =
    String(input.status || WFE_STATUS.CREATED).trim() || WFE_STATUS.CREATED;

  const workflowId =
    input.workflowId != null && String(input.workflowId).trim()
      ? String(input.workflowId).trim()
      : makeId("wf");

  const owner =
    input.owner != null && String(input.owner).trim()
      ? String(input.owner).trim()
      : null;

  const descriptor = {
    workflowId,
    workflowType,
    version,
    currentStep,
    status,
    started,
    updated,
    owner
  };

  return {
    ok: true,
    descriptor: Object.freeze(descriptor)
  };
}

function normalizeOnError(raw) {
  if (raw == null) {
    return Object.freeze({ strategy: "abort", maxRetries: 0, alternative: null });
  }
  if (typeof raw !== "object") {
    return { ok: false, error: "invalid_onError" };
  }
  const strategy = String(raw.strategy || "abort").trim();
  if (!["retry", "alternative", "abort"].includes(strategy)) {
    return { ok: false, error: "invalid_error_strategy" };
  }
  const maxRetries =
    typeof raw.maxRetries === "number" && Number.isFinite(raw.maxRetries)
      ? Math.max(0, Math.floor(raw.maxRetries))
      : strategy === "retry"
        ? 1
        : 0;
  const alternative =
    raw.alternative != null && String(raw.alternative).trim()
      ? String(raw.alternative).trim()
      : null;
  if (strategy === "alternative" && !alternative) {
    return { ok: false, error: "missing_alternative" };
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({ strategy, maxRetries, alternative })
  });
}

function normalizeNode(raw, index) {
  if (raw == null || typeof raw !== "object") {
    return { ok: false, error: "invalid_node", index };
  }
  const id = String(raw.id || raw.name || `node_${index}`).trim();
  if (!id) return { ok: false, error: "missing_node_id", index };

  const type = String(raw.type || WFE_NODE_TYPE.STEP).trim();
  if (!Object.values(WFE_NODE_TYPE).includes(type)) {
    return { ok: false, error: "invalid_node_type", index, type };
  }

  const next =
    raw.next != null && String(raw.next).trim()
      ? String(raw.next).trim()
      : null;

  const errNorm = normalizeOnError(raw.onError);
  if (errNorm && errNorm.ok === false) {
    return { ok: false, error: errNorm.error, index };
  }
  const onError = errNorm && errNorm.value ? errNorm.value : errNorm;

  const timeoutMs =
    raw.timeoutMs != null
      ? (() => {
          const ms = Number(raw.timeoutMs);
          if (!Number.isFinite(ms) || ms < 0) return null;
          return Math.floor(ms);
        })()
      : null;
  if (raw.timeoutMs != null && timeoutMs == null) {
    return { ok: false, error: "invalid_timeoutMs", index };
  }

  if (type === WFE_NODE_TYPE.STEP) {
    const commandType =
      raw.commandType != null
        ? String(raw.commandType).trim()
        : raw.onEnter && raw.onEnter.commandType
          ? String(raw.onEnter.commandType).trim()
          : "";
    return {
      ok: true,
      node: Object.freeze({
        id,
        type,
        commandType: commandType || null,
        payload:
          raw.payload != null && typeof raw.payload === "object"
            ? Object.freeze({ ...raw.payload })
            : null,
        payloadBuilder:
          typeof raw.payloadBuilder === "function" ? raw.payloadBuilder : null,
        next,
        onError,
        timeoutMs
      })
    };
  }

  if (type === WFE_NODE_TYPE.DECISION) {
    if (typeof raw.when !== "function") {
      return { ok: false, error: "missing_decision_when", index };
    }
    const thenTo =
      raw.then != null && String(raw.then).trim()
        ? String(raw.then).trim()
        : null;
    const elseTo =
      raw.else != null && String(raw.else).trim()
        ? String(raw.else).trim()
        : null;
    if (!thenTo || !elseTo) {
      return { ok: false, error: "missing_decision_branches", index };
    }
    return {
      ok: true,
      node: Object.freeze({
        id,
        type,
        when: raw.when,
        then: thenTo,
        else: elseTo,
        onError,
        timeoutMs
      })
    };
  }

  if (type === WFE_NODE_TYPE.PARALLEL) {
    const branches = Array.isArray(raw.branches)
      ? raw.branches.map((b) => String(b).trim()).filter(Boolean)
      : [];
    if (branches.length < 2) {
      return { ok: false, error: "parallel_needs_branches", index };
    }
    const join =
      raw.join != null && String(raw.join).trim()
        ? String(raw.join).trim()
        : next;
    if (!join) return { ok: false, error: "missing_parallel_join", index };
    return {
      ok: true,
      node: Object.freeze({
        id,
        type,
        branches: Object.freeze([...branches]),
        join,
        joinMode: "waitAll",
        onError,
        timeoutMs
      })
    };
  }

  // loop
  if (typeof raw.continueWhen !== "function") {
    return { ok: false, error: "missing_loop_continueWhen", index };
  }
  const body =
    raw.body != null && String(raw.body).trim()
      ? String(raw.body).trim()
      : null;
  const exitTo =
    raw.exitTo != null && String(raw.exitTo).trim()
      ? String(raw.exitTo).trim()
      : next;
  if (!body || !exitTo) {
    return { ok: false, error: "missing_loop_body_or_exit", index };
  }
  const maxIterations =
    typeof raw.maxIterations === "number" && Number.isFinite(raw.maxIterations)
      ? Math.max(1, Math.floor(raw.maxIterations))
      : 100;
  return {
    ok: true,
    node: Object.freeze({
      id,
      type,
      body,
      exitTo,
      continueWhen: raw.continueWhen,
      maxIterations,
      onError,
      timeoutMs
    })
  };
}

function createWorkflowEngine(options = {}) {
  if (
    activeWorkflowEngine &&
    activeWorkflowEngine.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "workflow_engine_already_active",
      soleWorkflowAuthority: true
    });
  }

  const authorized = new Set(options.authorizedSources || WFE_AUTHORIZED_SOURCES);
  const commandBusBridge = options.commandBusBridge || null;

  /** @type {Map<string, { start: string, nodes: Map<string, object>, timeoutMs: number|null }>} */
  const typeRegistry = new Map();

  /** @type {Map<string, object>} */
  const workflows = new Map();

  const workflowAuditLog = [];

  let activeCount = 0;
  let completedCount = 0;
  let errorCount = 0;
  let timeoutCount = 0;
  let parallelBranchCount = 0;
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
    if (requireAuth && !isAuthorized(meta)) {
      return Object.freeze({ ok: false, error: "unauthorized_workflow" });
    }
    if (!isSourceVerified(meta)) {
      return Object.freeze({ ok: false, error: "forged_workflow_blocked" });
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
    workflowAuditLog.push(
      Object.freeze({
        workflowId: entry.workflowId != null ? entry.workflowId : null,
        workflowType: entry.workflowType != null ? entry.workflowType : null,
        currentStep: entry.currentStep != null ? entry.currentStep : null,
        changedAt: entry.changedAt != null ? entry.changedAt : Date.now(),
        result: entry.result || "unknown",
        owner: entry.owner != null ? entry.owner : null
      })
    );
  }

  function freezeView(entry) {
    return Object.freeze({
      ...entry.descriptor,
      payload: entry.payload,
      pendingBranches: entry.pendingBranches
        ? Object.freeze([...(entry.pendingBranches || [])])
        : null,
      loopCount: entry.loopCount || 0,
      retryCount: entry.retryCount || 0,
      waitDeadline: entry.waitDeadline,
      soleWorkflowAuthority: true,
      executesCommandsDirectly: false,
      commandsViaCommandBusOnly: true,
      executesProceduresNotSagas: true
    });
  }

  function bumpActive() {
    let n = 0;
    for (const e of workflows.values()) {
      if (WFE_ACTIVE_STATUSES.includes(e.descriptor.status)) n += 1;
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
      workflowId: entry.descriptor.workflowId,
      workflowType: entry.descriptor.workflowType,
      currentStep: entry.descriptor.currentStep,
      changedAt: t,
      result: resultLabel || `transition_${from}_to_${nextStatus}`,
      owner: entry.descriptor.owner
    });

    bumpActive();
    return Object.freeze({ ok: true, from, to: nextStatus });
  }

  function setCurrentStep(entry, stepId, meta = {}) {
    const t = nowMs(meta);
    entry.descriptor = Object.freeze({
      ...entry.descriptor,
      currentStep: stepId,
      updated: t,
      version: entry.descriptor.version + 1
    });
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
        correlationId: entry.correlationId || meta.correlationId || null,
        sender: "workflow_engine",
        workflowId: entry.descriptor.workflowId
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

  function finishWorkflow(entry, status, meta, resultLabel) {
    const t = nowMs(meta);
    const set = setStatus(entry, status, meta, resultLabel);
    if (!set.ok) return set;
    entry.waitDeadline = null;
    entry.pendingBranches = null;
    const duration = Math.max(0, t - entry.descriptor.started);
    durationSumMs += duration;
    durationSamples += 1;
    if (status === WFE_STATUS.COMPLETED) completedCount += 1;
    if (status === WFE_STATUS.FAILED) errorCount += 1;
    if (status === WFE_STATUS.CANCELLED && resultLabel === "timeout") {
      timeoutCount += 1;
    }
    bumpActive();
    return Object.freeze({
      ok: true,
      workflowId: entry.descriptor.workflowId,
      status,
      workflow: freezeView(entry)
    });
  }

  function resolveNode(entry, nodeId) {
    const def = typeRegistry.get(entry.descriptor.workflowType);
    if (!def) return null;
    return def.nodes.get(nodeId) || null;
  }

  function handleStepError(entry, node, sendResult, meta) {
    errorCount += 1;
    const strategy = (node.onError && node.onError.strategy) || "abort";
    if (strategy === "retry") {
      const max = (node.onError && node.onError.maxRetries) || 0;
      if ((entry.retryCount || 0) < max) {
        entry.retryCount = (entry.retryCount || 0) + 1;
        recordAudit({
          workflowId: entry.descriptor.workflowId,
          workflowType: entry.descriptor.workflowType,
          currentStep: node.id,
          changedAt: nowMs(meta),
          result: `retry_${entry.retryCount}`,
          owner: entry.descriptor.owner
        });
        return advanceTo(entry, node.id, meta);
      }
    }
    if (strategy === "alternative" && node.onError && node.onError.alternative) {
      entry.retryCount = 0;
      recordAudit({
        workflowId: entry.descriptor.workflowId,
        workflowType: entry.descriptor.workflowType,
        currentStep: node.id,
        changedAt: nowMs(meta),
        result: "alternative_step",
        owner: entry.descriptor.owner
      });
      return advanceTo(entry, node.onError.alternative, meta);
    }
    return finishWorkflow(
      entry,
      WFE_STATUS.FAILED,
      meta,
      sendResult && sendResult.error ? sendResult.error : "step_failed"
    );
  }

  function advanceTo(entry, nodeId, meta = {}) {
    if (
      entry.descriptor.status === WFE_STATUS.PAUSED ||
      entry.descriptor.status === WFE_STATUS.COMPLETED ||
      entry.descriptor.status === WFE_STATUS.FAILED ||
      entry.descriptor.status === WFE_STATUS.CANCELLED
    ) {
      return Object.freeze({
        ok: false,
        error: "workflow_not_runnable",
        status: entry.descriptor.status
      });
    }

    if (nodeId == null) {
      return finishWorkflow(entry, WFE_STATUS.COMPLETED, meta, "completed");
    }

    const node = resolveNode(entry, nodeId);
    if (!node) {
      return finishWorkflow(entry, WFE_STATUS.FAILED, meta, "invalid_step");
    }

    // block skipping to unknown / protect transitions
    if (
      entry.descriptor.status === WFE_STATUS.CREATED ||
      entry.descriptor.status === WFE_STATUS.WAITING
    ) {
      const toRunning = setStatus(entry, WFE_STATUS.RUNNING, meta, "advance");
      if (!toRunning.ok && entry.descriptor.status !== WFE_STATUS.RUNNING) {
        return toRunning;
      }
    }

    setCurrentStep(entry, node.id, meta);
    entry.waitDeadline = null;

    const def = typeRegistry.get(entry.descriptor.workflowType);
    const typeTimeout = def && def.timeoutMs != null ? def.timeoutMs : null;
    const nodeTimeout = node.timeoutMs != null ? node.timeoutMs : typeTimeout;

    if (node.type === WFE_NODE_TYPE.DECISION) {
      let branch = false;
      try {
        branch = !!node.when({
          payload: entry.payload,
          workflow: freezeView(entry)
        });
      } catch (_err) {
        return finishWorkflow(entry, WFE_STATUS.FAILED, meta, "decision_error");
      }
      const target = branch ? node.then : node.else;
      recordAudit({
        workflowId: entry.descriptor.workflowId,
        workflowType: entry.descriptor.workflowType,
        currentStep: node.id,
        changedAt: nowMs(meta),
        result: branch ? "decision_then" : "decision_else",
        owner: entry.descriptor.owner
      });
      return advanceTo(entry, target, meta);
    }

    if (node.type === WFE_NODE_TYPE.PARALLEL) {
      entry.pendingBranches = [...node.branches];
      parallelBranchCount += node.branches.length;
      const wait = setStatus(entry, WFE_STATUS.WAITING, meta, "parallel_wait_all");
      if (!wait.ok) return wait;
      if (nodeTimeout != null) {
        entry.waitDeadline = nowMs(meta) + nodeTimeout;
      }
      // fan-out: execute each branch step command if they are step nodes
      for (const branchId of node.branches) {
        const branchNode = resolveNode(entry, branchId);
        if (branchNode && branchNode.type === WFE_NODE_TYPE.STEP && branchNode.commandType) {
          let payload = branchNode.payload ? { ...branchNode.payload } : {};
          if (typeof branchNode.payloadBuilder === "function") {
            try {
              payload = {
                ...payload,
                ...branchNode.payloadBuilder({
                  payload: entry.payload,
                  workflow: freezeView(entry)
                })
              };
            } catch (_err) {
              /* keep base payload */
            }
          }
          const sent = sendCommand(branchNode.commandType, payload, entry, meta);
          if (!sent.ok) {
            return handleStepError(entry, branchNode, sent, meta);
          }
        }
      }
      recordAudit({
        workflowId: entry.descriptor.workflowId,
        workflowType: entry.descriptor.workflowType,
        currentStep: node.id,
        changedAt: nowMs(meta),
        result: "parallel_started",
        owner: entry.descriptor.owner
      });
      return Object.freeze({
        ok: true,
        workflowId: entry.descriptor.workflowId,
        status: entry.descriptor.status,
        waiting: true,
        pendingBranches: Object.freeze([...entry.pendingBranches]),
        workflow: freezeView(entry)
      });
    }

    if (node.type === WFE_NODE_TYPE.LOOP) {
      let cont = false;
      try {
        cont = !!node.continueWhen({
          payload: entry.payload,
          loopCount: entry.loopCount || 0,
          workflow: freezeView(entry)
        });
      } catch (_err) {
        return finishWorkflow(entry, WFE_STATUS.FAILED, meta, "loop_error");
      }
      if (!cont) {
        entry.loopCount = 0;
        return advanceTo(entry, node.exitTo, meta);
      }
      if ((entry.loopCount || 0) >= node.maxIterations) {
        return finishWorkflow(entry, WFE_STATUS.FAILED, meta, "loop_max_iterations");
      }
      entry.loopCount = (entry.loopCount || 0) + 1;
      // after body completes, return to this loop node via body's next pointing back
      // body node should next → loop id
      recordAudit({
        workflowId: entry.descriptor.workflowId,
        workflowType: entry.descriptor.workflowType,
        currentStep: node.id,
        changedAt: nowMs(meta),
        result: `loop_iteration_${entry.loopCount}`,
        owner: entry.descriptor.owner
      });
      return advanceTo(entry, node.body, meta);
    }

    // STEP
    if (node.commandType) {
      let payload = node.payload ? { ...node.payload } : {};
      if (typeof node.payloadBuilder === "function") {
        try {
          payload = {
            ...payload,
            ...node.payloadBuilder({
              payload: entry.payload,
              workflow: freezeView(entry)
            })
          };
        } catch (_err) {
          /* keep base */
        }
      }
      const sent = sendCommand(node.commandType, { ...entry.payload, ...payload }, entry, meta);
      if (!sent.ok) {
        return handleStepError(entry, node, sent, meta);
      }
      entry.retryCount = 0;
    }

    recordAudit({
      workflowId: entry.descriptor.workflowId,
      workflowType: entry.descriptor.workflowType,
      currentStep: node.id,
      changedAt: nowMs(meta),
      result: "step_executed",
      owner: entry.descriptor.owner
    });

    if (node.next == null) {
      return finishWorkflow(entry, WFE_STATUS.COMPLETED, meta, "completed");
    }
    return advanceTo(entry, node.next, meta);
  }

  function registerWorkflowType(workflowType, definition = {}, meta = {}) {
    const blocked = gate(meta, "registerWorkflowType");
    if (blocked) return blocked;

    const type = String(workflowType || "").trim();
    if (!type) return Object.freeze({ ok: false, error: "missing_workflowType" });
    if (typeRegistry.has(type)) {
      return Object.freeze({ ok: false, error: "workflow_type_already_registered" });
    }

    const nodesRaw = Array.isArray(definition.nodes)
      ? definition.nodes
      : Array.isArray(definition.steps)
        ? definition.steps
        : null;
    if (!nodesRaw || nodesRaw.length === 0) {
      return Object.freeze({ ok: false, error: "missing_nodes" });
    }

    const nodes = new Map();
    for (let i = 0; i < nodesRaw.length; i += 1) {
      const norm = normalizeNode(nodesRaw[i], i);
      if (!norm.ok) return Object.freeze(norm);
      if (nodes.has(norm.node.id)) {
        return Object.freeze({ ok: false, error: "duplicate_node_id", id: norm.node.id });
      }
      nodes.set(norm.node.id, norm.node);
    }

    const start =
      definition.start != null && String(definition.start).trim()
        ? String(definition.start).trim()
        : nodesRaw[0].id || nodesRaw[0].name || [...nodes.keys()][0];

    if (!nodes.has(start)) {
      return Object.freeze({ ok: false, error: "invalid_start_node" });
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
        start,
        nodes,
        timeoutMs,
        meta: Object.freeze({ ...(definition.meta || {}) })
      })
    );

    return Object.freeze({
      ok: true,
      workflowType: type,
      nodeCount: nodes.size,
      start
    });
  }

  function startWorkflow(input = {}, meta = {}) {
    const blocked = gate(meta, "startWorkflow");
    if (blocked) return blocked;

    const workflowType = String(input.workflowType || input.type || "").trim();
    if (!workflowType) {
      return Object.freeze({ ok: false, error: "missing_workflowType" });
    }
    const def = typeRegistry.get(workflowType);
    if (!def) {
      return Object.freeze({ ok: false, error: "unknown_workflow_type" });
    }

    const descResult = createWorkflowDescriptor({
      workflowId: input.workflowId,
      workflowType,
      owner: input.owner,
      nowMs: nowMs(meta),
      status: WFE_STATUS.CREATED,
      currentStep: def.start,
      version: 0
    });
    if (!descResult.ok) return Object.freeze(descResult);

    if (workflows.has(descResult.descriptor.workflowId)) {
      return Object.freeze({ ok: false, error: "duplicate_workflow_start" });
    }

    const entry = {
      descriptor: descResult.descriptor,
      payload:
        input.payload != null && typeof input.payload === "object"
          ? { ...input.payload }
          : {},
      correlationId:
        input.correlationId != null ? String(input.correlationId) : null,
      pendingBranches: null,
      loopCount: 0,
      retryCount: 0,
      waitDeadline: null,
      resumeNode: null
    };

    // global timeout on whole workflow
    if (def.timeoutMs != null) {
      entry.waitDeadline = nowMs(meta) + def.timeoutMs;
    }

    workflows.set(entry.descriptor.workflowId, entry);
    bumpActive();

    recordAudit({
      workflowId: entry.descriptor.workflowId,
      workflowType,
      currentStep: def.start,
      changedAt: nowMs(meta),
      result: "started",
      owner: entry.descriptor.owner
    });

    const run = setStatus(entry, WFE_STATUS.RUNNING, meta, "start");
    if (!run.ok) return run;

    const advanced = advanceTo(entry, def.start, meta);
    return Object.freeze({
      ok: advanced.ok !== false,
      workflowId: entry.descriptor.workflowId,
      status: entry.descriptor.status,
      ...(advanced.ok === false ? { error: advanced.error } : {}),
      workflow: freezeView(entry)
    });
  }

  function pauseWorkflow(workflowId, meta = {}) {
    const blocked = gate(meta, "pauseWorkflow");
    if (blocked) return blocked;
    const id = String(workflowId || "").trim();
    const entry = workflows.get(id);
    if (!entry) return Object.freeze({ ok: false, error: "workflow_not_found" });
    const set = setStatus(entry, WFE_STATUS.PAUSED, meta, "paused");
    if (!set.ok) return set;
    entry.resumeNode = entry.descriptor.currentStep;
    return Object.freeze({
      ok: true,
      workflowId: id,
      status: entry.descriptor.status,
      workflow: freezeView(entry)
    });
  }

  function resumeWorkflow(workflowId, meta = {}) {
    const blocked = gate(meta, "resumeWorkflow");
    if (blocked) return blocked;
    const id = String(workflowId || "").trim();

    // crash recovery via persisted snapshot
    if (meta.persisted && typeof meta.persisted === "object") {
      const p = meta.persisted;
      const descResult = createWorkflowDescriptor({
        workflowId: p.workflowId || id,
        workflowType: p.workflowType,
        version: p.version,
        currentStep: p.currentStep,
        status: WFE_STATUS.PAUSED,
        started: p.started,
        updated: p.updated,
        owner: p.owner,
        nowMs: nowMs(meta)
      });
      if (!descResult.ok) return Object.freeze(descResult);
      if (!typeRegistry.has(descResult.descriptor.workflowType)) {
        return Object.freeze({ ok: false, error: "unknown_workflow_type" });
      }
      const recovered = {
        descriptor: descResult.descriptor,
        payload:
          p.payload != null && typeof p.payload === "object" ? { ...p.payload } : {},
        correlationId: p.correlationId || null,
        pendingBranches: Array.isArray(p.pendingBranches)
          ? [...p.pendingBranches]
          : null,
        loopCount: p.loopCount || 0,
        retryCount: 0,
        waitDeadline: null,
        resumeNode: p.currentStep
      };
      workflows.set(recovered.descriptor.workflowId, recovered);
      bumpActive();
      const unpause = setStatus(recovered, WFE_STATUS.RUNNING, meta, "resumed");
      if (!unpause.ok) return unpause;
      // if recovering mid-flow after completed steps, continue from next
      const node = resolveNode(recovered, recovered.resumeNode);
      if (node && node.type === WFE_NODE_TYPE.STEP && node.next) {
        const advanced = advanceTo(recovered, node.next, meta);
        return Object.freeze({
          ok: advanced.ok !== false,
          resumed: true,
          workflowId: recovered.descriptor.workflowId,
          status: recovered.descriptor.status,
          workflow: freezeView(recovered)
        });
      }
      const advanced = advanceTo(recovered, recovered.resumeNode, meta);
      return Object.freeze({
        ok: advanced.ok !== false,
        resumed: true,
        workflowId: recovered.descriptor.workflowId,
        status: recovered.descriptor.status,
        workflow: freezeView(recovered)
      });
    }

    const entry = workflows.get(id);
    if (!entry) return Object.freeze({ ok: false, error: "workflow_not_found" });
    if (entry.descriptor.status !== WFE_STATUS.PAUSED) {
      return Object.freeze({ ok: false, error: "workflow_not_paused" });
    }
    const set = setStatus(entry, WFE_STATUS.RUNNING, meta, "resumed");
    if (!set.ok) return set;
    // resume continues from current step without re-executing if already done —
    // re-enter current node
    const advanced = advanceTo(
      entry,
      entry.resumeNode || entry.descriptor.currentStep,
      meta
    );
    return Object.freeze({
      ok: advanced.ok !== false,
      resumed: true,
      workflowId: id,
      status: entry.descriptor.status,
      workflow: freezeView(entry)
    });
  }

  function cancelWorkflow(workflowId, meta = {}) {
    const blocked = gate(meta, "cancelWorkflow");
    if (blocked) return blocked;
    const entry = workflows.get(String(workflowId || "").trim());
    if (!entry) return Object.freeze({ ok: false, error: "workflow_not_found" });
    return finishWorkflow(
      entry,
      WFE_STATUS.CANCELLED,
      meta,
      meta.reason || "cancelled"
    );
  }

  function completeWorkflow(workflowId, meta = {}) {
    const blocked = gate(meta, "completeWorkflow");
    if (blocked) return blocked;
    const entry = workflows.get(String(workflowId || "").trim());
    if (!entry) return Object.freeze({ ok: false, error: "workflow_not_found" });
    return finishWorkflow(entry, WFE_STATUS.COMPLETED, meta, "force_complete");
  }

  function getWorkflow(workflowId) {
    const entry = workflows.get(String(workflowId || "").trim());
    if (!entry) return Object.freeze({ ok: false, error: "workflow_not_found" });
    return Object.freeze({ ok: true, workflow: freezeView(entry) });
  }

  function completeBranch(workflowId, branchId, meta = {}) {
    const blocked = gate(meta, "completeBranch");
    if (blocked) return blocked;
    const entry = workflows.get(String(workflowId || "").trim());
    if (!entry) return Object.freeze({ ok: false, error: "workflow_not_found" });
    if (entry.descriptor.status !== WFE_STATUS.WAITING) {
      return Object.freeze({ ok: false, error: "workflow_not_waiting" });
    }
    if (!Array.isArray(entry.pendingBranches)) {
      return Object.freeze({ ok: false, error: "no_pending_branches" });
    }
    const bid = String(branchId || "").trim();
    const idx = entry.pendingBranches.indexOf(bid);
    if (idx < 0) {
      return Object.freeze({ ok: false, error: "unknown_branch" });
    }
    entry.pendingBranches.splice(idx, 1);
    recordAudit({
      workflowId: entry.descriptor.workflowId,
      workflowType: entry.descriptor.workflowType,
      currentStep: entry.descriptor.currentStep,
      changedAt: nowMs(meta),
      result: `branch_complete_${bid}`,
      owner: entry.descriptor.owner
    });

    if (entry.pendingBranches.length > 0) {
      return Object.freeze({
        ok: true,
        waiting: true,
        pendingBranches: Object.freeze([...entry.pendingBranches]),
        workflow: freezeView(entry)
      });
    }

    // Wait All satisfied — continue to join
    const parallelNode = resolveNode(entry, entry.descriptor.currentStep);
    const join = parallelNode && parallelNode.join ? parallelNode.join : null;
    entry.pendingBranches = null;
    const run = setStatus(entry, WFE_STATUS.RUNNING, meta, "parallel_synced");
    if (!run.ok) return run;
    const advanced = advanceTo(entry, join, meta);
    return Object.freeze({
      ok: advanced.ok !== false,
      synced: true,
      workflowId: entry.descriptor.workflowId,
      status: entry.descriptor.status,
      workflow: freezeView(entry)
    });
  }

  function tickTimeouts(now, meta = {}) {
    const blocked = gate(meta, "tickTimeouts");
    if (blocked) return blocked;
    const t =
      typeof now === "number" && Number.isFinite(now) ? now : nowMs(meta);
    const timedOut = [];
    for (const entry of workflows.values()) {
      if (
        entry.waitDeadline != null &&
        t >= entry.waitDeadline &&
        (entry.descriptor.status === WFE_STATUS.WAITING ||
          entry.descriptor.status === WFE_STATUS.RUNNING)
      ) {
        const result = finishWorkflow(entry, WFE_STATUS.CANCELLED, { ...meta, nowMs: t }, "timeout");
        timedOut.push({
          workflowId: entry.descriptor.workflowId,
          action: "cancel",
          result
        });
      }
    }
    return Object.freeze({ ok: true, timedOut: Object.freeze(timedOut) });
  }

  function metrics() {
    return Object.freeze({
      activeCount,
      completedCount,
      errorCount,
      timeoutCount,
      averageDurationMs:
        durationSamples > 0 ? durationSumMs / durationSamples : 0,
      parallelBranchCount
    });
  }

  function workflowAudit() {
    return Object.freeze([...workflowAuditLog]);
  }

  function status() {
    return Object.freeze({
      active,
      singleton: true,
      soleWorkflowAuthority: true,
      registeredTypes: typeRegistry.size,
      workflowCount: workflows.size,
      executesCommandsDirectly: false,
      commandsViaCommandBusOnly: true,
      executesProceduresNotSagas: true
    });
  }

  function forSagaBridge(input = {}, meta = {}) {
    // Saga may start a workflow as part of coordination
    return startWorkflow(input, {
      ...meta,
      source: meta.source || "saga_manager",
      authorized: true
    });
  }

  function directHandlerCall() {
    return rejectDirectHandlerCall("directHandlerCall");
  }

  function skipToStep() {
    return Object.freeze({
      ok: false,
      error: "invalid_step_skip_blocked",
      soleWorkflowAuthority: true
    });
  }

  function isActive() {
    return active === true;
  }

  function shutdown() {
    active = false;
    if (activeWorkflowEngine === api) {
      activeWorkflowEngine = null;
    }
    return Object.freeze({ ok: true });
  }

  const api = {
    ok: true,
    registerWorkflowType,
    startWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    cancelWorkflow,
    completeWorkflow,
    getWorkflow,
    completeBranch,
    tickTimeouts,
    metrics,
    workflowAudit,
    status,
    forSagaBridge,
    directHandlerCall,
    skipToStep,
    isActive,
    shutdown,
    soleWorkflowAuthority: true,
    executesCommandsDirectly: false,
    commandsViaCommandBusOnly: true,
    executesProceduresNotSagas: true
  };

  activeWorkflowEngine = api;
  return Object.freeze(api);
}

function clearWorkflowSingletonForTest() {
  if (activeWorkflowEngine) {
    try {
      activeWorkflowEngine.shutdown();
    } catch (_err) {
      /* ignore */
    }
  }
  activeWorkflowEngine = null;
}

function getActiveWorkflowEngine() {
  return activeWorkflowEngine;
}

module.exports = {
  WFE_COMPONENT,
  WFE_COMPONENT_ORDER,
  WFE_DESCRIPTOR_FIELDS,
  WFE_STATUS,
  WFE_ACTIVE_STATUSES,
  WFE_STATUS_TRANSITIONS,
  WFE_NODE_TYPE,
  WFE_AUTHORIZED_SOURCES,
  WFE_FLAGS,
  WFE_PUBLIC_API,
  WFE_RUNTIME_ANCHORS,
  soleWorkflowAuthority: true,
  executesCommandsDirectly: false,
  createsBusinessLogic: false,
  commandsViaCommandBusOnly: true,
  executesProceduresNotSagas: true,
  sagaCoordinatesBusinessProcess: true,
  validateStatusTransition,
  createWorkflowDescriptor,
  createWorkflowEngine,
  clearWorkflowSingletonForTest,
  getActiveWorkflowEngine
};
