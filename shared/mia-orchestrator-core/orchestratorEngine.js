"use strict";

/**
 * Master Canon 0086 — Orchestrator Engine.
 * Kernel Layer 0 sole central authority for real-time service coordination.
 * Distinct from Workflow (defines WHAT), Saga (business transactions),
 * and Action Orchestrator 0029 (AI action plans).
 * OE coordinates WHO and WHEN — never owns service internal logic.
 */

const crypto = require("crypto");

const OE_COMPONENT = Object.freeze({
  ORCHESTRATOR_ENGINE: "orchestrator_engine",
  INTAKE_GATE: "intake_gate",
  DESCRIPTOR_FACTORY: "descriptor_factory",
  SERVICE_COORDINATOR: "service_coordinator",
  DEPENDENCY_RESOLVER: "dependency_resolver",
  PARALLEL_SCHEDULER: "parallel_scheduler",
  SYNC_CONTROLLER: "sync_controller",
  ROUTING_ENGINE: "routing_engine",
  FAILURE_RECOVERY: "failure_recovery",
  SERVICE_BRIDGE: "service_bridge",
  SECURITY_GATE: "security_gate",
  ORCHESTRATION_AUDIT: "orchestration_audit"
});

const OE_COMPONENT_ORDER = Object.freeze(Object.values(OE_COMPONENT));

const OE_DESCRIPTOR_FIELDS = Object.freeze([
  "orchestrationId",
  "type",
  "status",
  "services",
  "started",
  "updated",
  "priority",
  "correlationId"
]);

const OE_STATUS = Object.freeze({
  CREATED: "created",
  RUNNING: "running",
  WAITING: "waiting",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled"
});

const OE_STATUS_TRANSITIONS = Object.freeze({
  [OE_STATUS.CREATED]: Object.freeze([OE_STATUS.RUNNING, OE_STATUS.CANCELLED]),
  [OE_STATUS.RUNNING]: Object.freeze([
    OE_STATUS.WAITING,
    OE_STATUS.COMPLETED,
    OE_STATUS.FAILED,
    OE_STATUS.CANCELLED
  ]),
  [OE_STATUS.WAITING]: Object.freeze([
    OE_STATUS.RUNNING,
    OE_STATUS.COMPLETED,
    OE_STATUS.FAILED,
    OE_STATUS.CANCELLED
  ]),
  [OE_STATUS.COMPLETED]: Object.freeze([]),
  [OE_STATUS.FAILED]: Object.freeze([]),
  [OE_STATUS.CANCELLED]: Object.freeze([])
});

const OE_ROUTING_MODE = Object.freeze({
  NORMAL: "normal",
  EMERGENCY: "emergency"
});

const OE_AUTHORIZED_SOURCES = Object.freeze([
  "kernel",
  "operator",
  "admin",
  "system",
  "runtime",
  "decision_engine",
  "decision-engine",
  "workflow_engine",
  "workflow-engine",
  "service_manager",
  "service-manager",
  "saga_manager",
  "command_bus",
  "platform",
  "security",
  "monitoring"
]);

const OE_FLAGS = Object.freeze({
  soleOrchestratorAuthority: true,
  definesWorkflow: false,
  handlesSagaTransactions: false,
  ownsServiceInternalLogic: false,
  coordinatesOnly: true,
  executesDecisionsNotMakesThem: true,
  distinctFromActionOrchestrator0029: true
});

const OE_PUBLIC_API = Object.freeze([
  "start",
  "coordinate",
  "synchronize",
  "cancel",
  "complete",
  "getStatus"
]);

const OE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-orchestrator-core/orchestratorEngine.js",
  "shared/mia-service-core/serviceManager.js",
  "shared/mia-kernel-decision-core/decisionEngine.js",
  "shared/mia-workflow-core/workflowEngine.js",
  "shared/mia-saga-core/sagaManager.js",
  "shared/mia-action-core/actionOrchestrator.js",
  "docs/master-canon/0086-orchestrator-engine.md"
]);

let activeOrchestratorEngine = null;

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
  if (!(src in OE_STATUS_TRANSITIONS)) {
    return Object.freeze({ ok: false, error: "unknown_status", from: src });
  }
  if (!OE_STATUS_TRANSITIONS[src].includes(dst)) {
    return Object.freeze({
      ok: false,
      error: "invalid_status_transition",
      from: src,
      to: dst
    });
  }
  return Object.freeze({ ok: true, from: src, to: dst });
}

function createOrchestrationDescriptor(input = {}) {
  const type = String(input.type || input.orchestrationType || "").trim();
  if (!type) return { ok: false, error: "missing_type" };

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

  const priority =
    typeof input.priority === "number" && Number.isFinite(input.priority)
      ? Math.floor(input.priority)
      : 0;

  const orchestrationId =
    input.orchestrationId != null && String(input.orchestrationId).trim()
      ? String(input.orchestrationId).trim()
      : makeId("orch");

  const services = Array.isArray(input.services)
    ? Object.freeze(input.services.map((s) => String(s)))
    : Object.freeze([]);

  const status = String(input.status || OE_STATUS.CREATED).trim() || OE_STATUS.CREATED;

  const correlationId =
    input.correlationId != null && String(input.correlationId).trim()
      ? String(input.correlationId).trim()
      : null;

  return {
    ok: true,
    descriptor: Object.freeze({
      orchestrationId,
      type,
      status,
      services,
      started,
      updated,
      priority,
      correlationId
    })
  };
}

function topologicalPhases(nodes) {
  // nodes: [{ id, dependsOn: [], parallelGroup?: string }]
  const byId = new Map();
  for (const n of nodes) byId.set(n.id, n);

  const remaining = new Set(nodes.map((n) => n.id));
  const completed = new Set();
  const phases = [];

  while (remaining.size > 0) {
    const ready = [...remaining].filter((id) => {
      const n = byId.get(id);
      const deps = n.dependsOn || [];
      return deps.every((d) => completed.has(d));
    });
    if (ready.length === 0) {
      return { ok: false, error: "dependency_cycle" };
    }
    // group by parallelGroup if set, else each alone unless no deps between them
    const groups = new Map();
    for (const id of ready) {
      const n = byId.get(id);
      const key = n.parallelGroup != null ? String(n.parallelGroup) : id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(id);
    }
    const phase = [];
    for (const ids of groups.values()) {
      phase.push(...ids);
    }
    phases.push(Object.freeze([...phase]));
    for (const id of phase) {
      remaining.delete(id);
      completed.add(id);
    }
  }
  return { ok: true, phases: Object.freeze(phases) };
}

function applyRouting(nodes, mode) {
  if (mode === OE_ROUTING_MODE.EMERGENCY) {
    // Prefer OBS/Overlay before AI when emergency
    const score = (id) => {
      const s = String(id).toLowerCase();
      if (s === "obs") return 0;
      if (s === "overlay") return 1;
      if (s === "speech") return 2;
      if (s === "ai") return 90;
      return 50;
    };
    return [...nodes].sort((a, b) => score(a.id) - score(b.id));
  }
  return nodes;
}

function createOrchestratorEngine(options = {}) {
  if (
    activeOrchestratorEngine &&
    activeOrchestratorEngine.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "orchestrator_engine_already_active",
      soleOrchestratorAuthority: true
    });
  }

  const authorized = new Set(options.authorizedSources || OE_AUTHORIZED_SOURCES);
  const serviceBridge = options.serviceBridge || null;

  /** @type {Map<string, object>} */
  const orchestrations = new Map();
  const auditLog = [];

  let activeCount = 0;
  let serviceInvokeCount = 0;
  let parallelRunCount = 0;
  let errorCount = 0;
  let redirectCount = 0;
  let durationSumMs = 0;
  let durationSamples = 0;
  let active = true;

  function isAuthorized(meta = {}) {
    return (
      meta.authorized === true ||
      authorized.has(meta.source || "") ||
      authorized.has(meta.actor || "")
    );
  }

  function isSourceVerified(meta = {}) {
    if (meta.forged === true) return false;
    if (meta.sourceVerified === false) return false;
    if (meta.sourceVerified === true) return true;
    return isAuthorized(meta);
  }

  function gate(meta, _operation) {
    if (meta && meta.defineWorkflow === true) {
      return Object.freeze({
        ok: false,
        error: "workflow_definition_rejected",
        definesWorkflow: false
      });
    }
    if (meta && meta.sagaTransaction === true) {
      return Object.freeze({
        ok: false,
        error: "saga_transaction_rejected",
        handlesSagaTransactions: false
      });
    }
    if (meta && meta.serviceInternalLogic === true) {
      return Object.freeze({
        ok: false,
        error: "service_internal_logic_rejected",
        ownsServiceInternalLogic: false
      });
    }
    if (!isAuthorized(meta)) {
      return Object.freeze({ ok: false, error: "unauthorized_orchestrator" });
    }
    if (!isSourceVerified(meta)) {
      return Object.freeze({ ok: false, error: "forged_orchestrator_blocked" });
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
    auditLog.push(
      Object.freeze({
        orchestrationId: entry.orchestrationId != null ? entry.orchestrationId : null,
        services: entry.services != null ? Object.freeze([...(entry.services || [])]) : null,
        executionOrder:
          entry.executionOrder != null
            ? Object.freeze([...(entry.executionOrder || [])])
            : null,
        changedAt: entry.changedAt != null ? entry.changedAt : Date.now(),
        result: entry.result || "unknown",
        correlationId: entry.correlationId != null ? entry.correlationId : null
      })
    );
  }

  function bumpActive() {
    let n = 0;
    for (const e of orchestrations.values()) {
      if (
        e.descriptor.status === OE_STATUS.CREATED ||
        e.descriptor.status === OE_STATUS.RUNNING ||
        e.descriptor.status === OE_STATUS.WAITING
      ) {
        n += 1;
      }
    }
    activeCount = n;
  }

  function setStatus(entry, next, meta = {}, resultLabel = null) {
    const check = validateStatusTransition(entry.descriptor.status, next);
    if (!check.ok) return check;
    const t = nowMs(meta);
    entry.descriptor = Object.freeze({
      ...entry.descriptor,
      status: next,
      updated: t
    });
    recordAudit({
      orchestrationId: entry.descriptor.orchestrationId,
      services: entry.descriptor.services,
      executionOrder: entry.executionOrder,
      changedAt: t,
      result: resultLabel || `transition_to_${next}`,
      correlationId: entry.descriptor.correlationId
    });
    bumpActive();
    return Object.freeze({ ok: true, to: next });
  }

  function isServiceAvailable(serviceId, meta = {}) {
    if (!serviceBridge || typeof serviceBridge.isAvailable !== "function") {
      return true;
    }
    try {
      return serviceBridge.isAvailable(serviceId, meta) !== false;
    } catch (_err) {
      return false;
    }
  }

  function invokeService(serviceId, payload, entry, meta = {}) {
    if (!isServiceAvailable(serviceId, meta)) {
      return Object.freeze({ ok: false, error: "service_unavailable", serviceId });
    }
    if (!serviceBridge || typeof serviceBridge.invoke !== "function") {
      return Object.freeze({
        ok: false,
        error: "service_bridge_missing",
        serviceId
      });
    }
    serviceInvokeCount += 1;
    try {
      const result = serviceBridge.invoke({
        serviceId,
        payload: payload && typeof payload === "object" ? { ...payload } : {},
        orchestrationId: entry.descriptor.orchestrationId,
        correlationId: entry.descriptor.correlationId,
        sender: "orchestrator_engine"
      });
      return result && typeof result === "object"
        ? Object.freeze({ ok: result.ok !== false, ...result })
        : Object.freeze({ ok: true, result });
    } catch (err) {
      return Object.freeze({
        ok: false,
        error: "service_invoke_failed",
        message: err && err.message ? String(err.message) : "unknown"
      });
    }
  }

  function freezeView(entry) {
    return Object.freeze({
      ...entry.descriptor,
      phaseIndex: entry.phaseIndex,
      phases: entry.phases,
      pendingSync: entry.pendingSync
        ? Object.freeze([...(entry.pendingSync || [])])
        : null,
      executionOrder: Object.freeze([...(entry.executionOrder || [])]),
      routingMode: entry.routingMode,
      soleOrchestratorAuthority: true,
      coordinatesOnly: true
    });
  }

  function finish(entry, status, meta, label) {
    const set = setStatus(entry, status, meta, label);
    if (!set.ok) return set;
    entry.pendingSync = null;
    const t = nowMs(meta);
    durationSumMs += Math.max(0, t - entry.descriptor.started);
    durationSamples += 1;
    if (status === OE_STATUS.FAILED) errorCount += 1;
    bumpActive();
    return Object.freeze({
      ok: status !== OE_STATUS.FAILED,
      orchestrationId: entry.descriptor.orchestrationId,
      status,
      orchestration: freezeView(entry)
    });
  }

  function runPhase(entry, meta = {}) {
    if (entry.phaseIndex >= entry.phases.length) {
      return finish(entry, OE_STATUS.COMPLETED, meta, "completed");
    }

    const phase = entry.phases[entry.phaseIndex];
    if (phase.length > 1) parallelRunCount += 1;

    if (entry.descriptor.status === OE_STATUS.CREATED) {
      const run = setStatus(entry, OE_STATUS.RUNNING, meta, "start_phase");
      if (!run.ok) return run;
    } else if (entry.descriptor.status === OE_STATUS.WAITING) {
      const run = setStatus(entry, OE_STATUS.RUNNING, meta, "resume_phase");
      if (!run.ok) return run;
    }

    const failures = [];
    for (const serviceId of phase) {
      const node = entry.nodeById.get(serviceId);
      const invoked = invokeService(
        serviceId,
        entry.payload,
        entry,
        meta
      );
      if (!invoked.ok) {
        // failure recovery
        const alt = node && node.alternative ? node.alternative : null;
        if (alt) {
          redirectCount += 1;
          const altResult = invokeService(alt, entry.payload, entry, meta);
          if (altResult.ok) {
            entry.executionOrder.push(alt);
            recordAudit({
              orchestrationId: entry.descriptor.orchestrationId,
              services: entry.descriptor.services,
              executionOrder: entry.executionOrder,
              changedAt: nowMs(meta),
              result: `alternative_${serviceId}_to_${alt}`,
              correlationId: entry.descriptor.correlationId
            });
            continue;
          }
        }
        failures.push({ serviceId, error: invoked.error });
      } else {
        entry.executionOrder.push(serviceId);
      }
    }

    if (failures.length > 0) {
      return finish(entry, OE_STATUS.FAILED, meta, "service_failed");
    }

    // sync point: if phase has multiple services, wait for synchronize() unless autoSync
    if (phase.length > 1 && entry.autoSync !== true) {
      entry.pendingSync = [...phase];
      const wait = setStatus(entry, OE_STATUS.WAITING, meta, "sync_wait");
      if (!wait.ok) return wait;
      return Object.freeze({
        ok: true,
        waiting: true,
        pendingSync: Object.freeze([...entry.pendingSync]),
        orchestration: freezeView(entry)
      });
    }

    entry.phaseIndex += 1;
    return runPhase(entry, meta);
  }

  function buildPlan(input) {
    let nodes = Array.isArray(input.plan)
      ? input.plan.map((raw, i) => {
          const id = String(raw.id || raw.service || `svc_${i}`).trim();
          return {
            id,
            dependsOn: Array.isArray(raw.dependsOn)
              ? raw.dependsOn.map((d) => String(d))
              : [],
            parallelGroup:
              raw.parallelGroup != null ? String(raw.parallelGroup) : null,
            alternative:
              raw.alternative != null ? String(raw.alternative).trim() : null
          };
        })
      : Array.isArray(input.services)
        ? input.services.map((s, i) => ({
            id: String(s),
            dependsOn: i > 0 ? [String(input.services[i - 1])] : [],
            parallelGroup: null,
            alternative: null
          }))
        : null;

    if (!nodes || nodes.length === 0) {
      return { ok: false, error: "missing_plan" };
    }

    const mode = String(input.routingMode || OE_ROUTING_MODE.NORMAL).trim();
    nodes = applyRouting(nodes, mode);

    // After emergency reorder, rebuild linear depends if no explicit deps were given
    if (mode === OE_ROUTING_MODE.EMERGENCY && !Array.isArray(input.plan)) {
      nodes = nodes.map((n, i) => ({
        ...n,
        dependsOn: i > 0 ? [nodes[i - 1].id] : []
      }));
    }

    const topo = topologicalPhases(nodes);
    if (!topo.ok) return topo;

    return {
      ok: true,
      nodes,
      phases: topo.phases,
      routingMode: mode,
      serviceIds: Object.freeze(nodes.map((n) => n.id))
    };
  }

  function start(input = {}, meta = {}) {
    const blocked = gate(meta, "start");
    if (blocked) return blocked;

    const plan = buildPlan(input);
    if (!plan.ok) return Object.freeze(plan);

    // verify all services available via Service Manager bridge
    for (const id of plan.serviceIds) {
      if (!isServiceAvailable(id, meta)) {
        return Object.freeze({ ok: false, error: "service_unavailable", serviceId: id });
      }
    }

    const desc = createOrchestrationDescriptor({
      orchestrationId: input.orchestrationId,
      type: input.type || "generic",
      status: OE_STATUS.CREATED,
      services: plan.serviceIds,
      priority: input.priority,
      correlationId: input.correlationId,
      nowMs: nowMs(meta)
    });
    if (!desc.ok) return Object.freeze(desc);

    if (orchestrations.has(desc.descriptor.orchestrationId)) {
      return Object.freeze({ ok: false, error: "duplicate_orchestration" });
    }

    const entry = {
      descriptor: desc.descriptor,
      phases: plan.phases,
      phaseIndex: 0,
      nodeById: new Map(plan.nodes.map((n) => [n.id, n])),
      pendingSync: null,
      executionOrder: [],
      routingMode: plan.routingMode,
      payload:
        input.payload != null && typeof input.payload === "object"
          ? { ...input.payload }
          : {},
      autoSync: input.autoSync === true,
      decisionId: input.decisionId || null
    };

    orchestrations.set(entry.descriptor.orchestrationId, entry);
    bumpActive();
    recordAudit({
      orchestrationId: entry.descriptor.orchestrationId,
      services: entry.descriptor.services,
      executionOrder: [],
      changedAt: nowMs(meta),
      result: "started",
      correlationId: entry.descriptor.correlationId
    });

    return runPhase(entry, meta);
  }

  function coordinate(orchestrationId, meta = {}) {
    const blocked = gate(meta, "coordinate");
    if (blocked) return blocked;
    const entry = orchestrations.get(String(orchestrationId || "").trim());
    if (!entry) return Object.freeze({ ok: false, error: "orchestration_not_found" });
    if (
      entry.descriptor.status !== OE_STATUS.RUNNING &&
      entry.descriptor.status !== OE_STATUS.CREATED
    ) {
      return Object.freeze({
        ok: false,
        error: "orchestration_not_runnable",
        status: entry.descriptor.status
      });
    }
    return runPhase(entry, meta);
  }

  function synchronize(orchestrationId, serviceId, meta = {}) {
    const blocked = gate(meta, "synchronize");
    if (blocked) return blocked;
    const entry = orchestrations.get(String(orchestrationId || "").trim());
    if (!entry) return Object.freeze({ ok: false, error: "orchestration_not_found" });
    if (entry.descriptor.status !== OE_STATUS.WAITING) {
      return Object.freeze({ ok: false, error: "orchestration_not_waiting" });
    }
    if (!Array.isArray(entry.pendingSync)) {
      return Object.freeze({ ok: false, error: "no_pending_sync" });
    }
    const sid = String(serviceId || "").trim();
    const idx = entry.pendingSync.indexOf(sid);
    if (idx < 0) {
      return Object.freeze({ ok: false, error: "unknown_sync_service" });
    }
    entry.pendingSync.splice(idx, 1);
    recordAudit({
      orchestrationId: entry.descriptor.orchestrationId,
      services: entry.descriptor.services,
      executionOrder: entry.executionOrder,
      changedAt: nowMs(meta),
      result: `sync_${sid}`,
      correlationId: entry.descriptor.correlationId
    });

    if (entry.pendingSync.length > 0) {
      return Object.freeze({
        ok: true,
        waiting: true,
        pendingSync: Object.freeze([...entry.pendingSync]),
        orchestration: freezeView(entry)
      });
    }

    entry.pendingSync = null;
    entry.phaseIndex += 1;
    return runPhase(entry, meta);
  }

  function cancel(orchestrationId, meta = {}) {
    const blocked = gate(meta, "cancel");
    if (blocked) return blocked;
    const entry = orchestrations.get(String(orchestrationId || "").trim());
    if (!entry) return Object.freeze({ ok: false, error: "orchestration_not_found" });
    return finish(entry, OE_STATUS.CANCELLED, meta, meta.reason || "cancelled");
  }

  function complete(orchestrationId, meta = {}) {
    const blocked = gate(meta, "complete");
    if (blocked) return blocked;
    const entry = orchestrations.get(String(orchestrationId || "").trim());
    if (!entry) return Object.freeze({ ok: false, error: "orchestration_not_found" });
    return finish(entry, OE_STATUS.COMPLETED, meta, "force_complete");
  }

  function getStatus(orchestrationId) {
    if (orchestrationId == null || orchestrationId === "") {
      return Object.freeze({
        ok: true,
        active,
        singleton: true,
        soleOrchestratorAuthority: true,
        activeCount,
        orchestrationCount: orchestrations.size
      });
    }
    const entry = orchestrations.get(String(orchestrationId).trim());
    if (!entry) return Object.freeze({ ok: false, error: "orchestration_not_found" });
    return Object.freeze({ ok: true, orchestration: freezeView(entry) });
  }

  function fromDecision(decision = {}, meta = {}) {
    // Decision Engine decides; OE executes coordination
    return start(
      {
        type: decision.decisionType || decision.type || "from_decision",
        decisionId: decision.decisionId,
        correlationId: decision.correlationId,
        payload: decision.result != null ? { decision: decision.result } : {},
        services: decision.services,
        plan: decision.plan,
        routingMode: decision.routingMode,
        autoSync: decision.autoSync,
        priority: decision.priority
      },
      { ...meta, source: meta.source || "decision_engine", authorized: true }
    );
  }

  function fromWorkflow(input = {}, meta = {}) {
    return start(input, {
      ...meta,
      source: meta.source || "workflow_engine",
      authorized: true
    });
  }

  function metrics() {
    return Object.freeze({
      activeCount,
      serviceCount: serviceInvokeCount,
      parallelRunCount,
      errorCount,
      averageDurationMs: durationSamples > 0 ? durationSumMs / durationSamples : 0,
      redirectCount
    });
  }

  function orchestrationAudit() {
    return Object.freeze([...auditLog]);
  }

  function status() {
    return Object.freeze({
      active,
      singleton: true,
      soleOrchestratorAuthority: true,
      activeCount,
      definesWorkflow: false,
      handlesSagaTransactions: false,
      ownsServiceInternalLogic: false,
      coordinatesOnly: true,
      distinctFromActionOrchestrator0029: true
    });
  }

  function isActive() {
    return active === true;
  }

  function shutdown() {
    active = false;
    if (activeOrchestratorEngine === api) activeOrchestratorEngine = null;
    return Object.freeze({ ok: true });
  }

  const api = {
    ok: true,
    start,
    coordinate,
    synchronize,
    cancel,
    complete,
    getStatus,
    fromDecision,
    fromWorkflow,
    metrics,
    orchestrationAudit,
    status,
    isActive,
    shutdown,
    validateStatusTransition,
    soleOrchestratorAuthority: true,
    definesWorkflow: false,
    handlesSagaTransactions: false,
    ownsServiceInternalLogic: false,
    coordinatesOnly: true,
    distinctFromActionOrchestrator0029: true
  };

  activeOrchestratorEngine = api;
  return Object.freeze(api);
}

function clearOrchestratorSingletonForTest() {
  if (activeOrchestratorEngine) {
    try {
      activeOrchestratorEngine.shutdown();
    } catch (_err) {
      /* ignore */
    }
  }
  activeOrchestratorEngine = null;
}

module.exports = {
  OE_COMPONENT,
  OE_COMPONENT_ORDER,
  OE_DESCRIPTOR_FIELDS,
  OE_STATUS,
  OE_STATUS_TRANSITIONS,
  OE_ROUTING_MODE,
  OE_AUTHORIZED_SOURCES,
  OE_FLAGS,
  OE_PUBLIC_API,
  OE_RUNTIME_ANCHORS,
  soleOrchestratorAuthority: true,
  definesWorkflow: false,
  handlesSagaTransactions: false,
  ownsServiceInternalLogic: false,
  coordinatesOnly: true,
  distinctFromActionOrchestrator0029: true,
  validateStatusTransition,
  createOrchestrationDescriptor,
  createOrchestratorEngine,
  clearOrchestratorSingletonForTest,
  getActiveOrchestratorEngine: () => activeOrchestratorEngine
};
