"use strict";

/**
 * Master Canon 0054 — Dependency Manager: sole authority for dependency graph, validation, and init order.
 * Does not control services — only their relationships.
 */

const DM_COMPONENT = Object.freeze({
  DEPENDENCY_MANAGER: "dependency_manager",
  SERVICE_REGISTRY_VIEW: "service_registry_view",
  MODULE_REGISTRY_VIEW: "module_registry_view",
  PLUGIN_REGISTRY_VIEW: "plugin_registry_view",
  DEPENDENCY_GRAPH: "dependency_graph",
  CYCLE_DETECTOR: "cycle_detector",
  TOPOLOGICAL_SORTER: "topological_sorter",
  CONFLICT_DETECTOR: "conflict_detector",
  VALIDATOR: "validator",
  PLUGIN_PIPELINE: "plugin_pipeline",
  METRICS: "metrics",
  SECURITY_GATE: "security_gate"
});

const DM_COMPONENT_ORDER = Object.freeze(Object.values(DM_COMPONENT));

const DM_DEP_TYPE = Object.freeze({
  HARD: "hard",
  SOFT: "soft",
  OPTIONAL: "optional"
});

const DM_NODE_KIND = Object.freeze({
  SERVICE: "service",
  MODULE: "module",
  PLUGIN: "plugin",
  PLATFORM: "platform",
  GAME: "game",
  KERNEL: "kernel"
});

const DM_PUBLIC_API = Object.freeze([
  "register",
  "unregister",
  "validateForStartup",
  "computeInitOrder",
  "detectCycles",
  "detectConflicts",
  "addModule",
  "removeModule",
  "registerPlugin",
  "registerGame",
  "disconnectPlatform",
  "metrics",
  "graphSnapshot"
]);

const DM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-dependency-core/dependencyManager.js",
  "shared/mia-service-core/serviceManager.js",
  "shared/mia-startup-core/startupSequenceManager.js",
  "docs/master-canon/0054-dependency-manager.md"
]);

const DM_KERNEL_IDS = Object.freeze(["kernel", "runtime", "logger", "recovery", "event-bus", "memory"]);

const DM_PLUGIN_STEPS = Object.freeze([
  "signature",
  "compatibility",
  "dependencies",
  "permissions",
  "graph"
]);

function createDependencyDescriptor(input = {}) {
  const id = String(input.id || "").trim();
  if (!id) {
    return { ok: false, error: "missing_id" };
  }

  const dependsOn = normalizeIdList(input.dependsOn || input.hard || []);
  const soft = normalizeIdList(input.soft || []);
  const optional = normalizeIdList(input.optional || []);
  const conflicts = normalizeIdList(input.conflicts || []);

  return {
    ok: true,
    descriptor: Object.freeze({
      id,
      kind: input.kind || DM_NODE_KIND.SERVICE,
      version: String(input.version || "1.0.0"),
      dependsOn,
      soft,
      optional,
      conflicts,
      apiVersion: input.apiVersion || null,
      permissions: normalizeIdList(input.permissions || [])
    })
  };
}

function normalizeIdList(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map((x) => String(x).trim()).filter(Boolean))];
}

function assertValidationRequired(bypass) {
  if (bypass === true) {
    return { ok: false, error: "dependency_validation_bypass_forbidden" };
  }
  return { ok: true };
}

function detectCycles(nodes) {
  const adj = buildAdjacency(nodes);
  const visiting = new Set();
  const visited = new Set();
  const cycle = [];

  function dfs(node, stack) {
    if (visiting.has(node)) {
      const start = stack.indexOf(node);
      cycle.push(...stack.slice(start), node);
      return true;
    }
    if (visited.has(node)) return false;
    visiting.add(node);
    stack.push(node);
    for (const next of adj.get(node) || []) {
      if (dfs(next, stack)) return true;
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
    return false;
  }

  for (const id of nodes.keys()) {
    if (dfs(id, [])) {
      return { ok: false, cyclic: true, cycle: Object.freeze([...cycle]), error: "circular_dependency" };
    }
  }
  return { ok: true, cyclic: false, cycle: Object.freeze([]) };
}

function buildAdjacency(nodes) {
  const adj = new Map();
  for (const [id, node] of nodes) {
    const edges = [
      ...node.descriptor.dependsOn,
      ...node.descriptor.soft,
      ...node.descriptor.optional
    ];
    adj.set(id, [...new Set(edges.filter((dep) => nodes.has(dep)))]);
  }
  return adj;
}

function computeInitOrder(nodes) {
  const started = Date.now();
  const cycleCheck = detectCycles(nodes);
  if (!cycleCheck.ok) {
    return {
      ok: false,
      error: cycleCheck.error,
      cycle: cycleCheck.cycle,
      order: Object.freeze([]),
      durationMs: Date.now() - started
    };
  }

  const indegree = new Map();
  const reverse = new Map();
  for (const id of nodes.keys()) {
    indegree.set(id, 0);
    reverse.set(id, []);
  }

  for (const [id, node] of nodes) {
    for (const dep of node.descriptor.dependsOn) {
      if (!nodes.has(dep)) continue;
      indegree.set(id, (indegree.get(id) || 0) + 1);
      reverse.get(dep).push(id);
    }
  }

  const queue = [];
  for (const [id, deg] of indegree) {
    if (deg === 0) queue.push(id);
  }
  queue.sort();

  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const child of reverse.get(id) || []) {
      indegree.set(child, indegree.get(child) - 1);
      if (indegree.get(child) === 0) {
        queue.push(child);
        queue.sort();
      }
    }
  }

  if (order.length !== nodes.size) {
    return {
      ok: false,
      error: "topological_sort_incomplete",
      order: Object.freeze(order),
      durationMs: Date.now() - started
    };
  }

  return {
    ok: true,
    order: Object.freeze(order),
    durationMs: Date.now() - started
  };
}

function detectConflicts(nodes) {
  const conflicts = [];
  const byBase = new Map();

  for (const [id, node] of nodes) {
    const base = id.replace(/@.*$/, "");
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base).push(node);

    for (const other of node.descriptor.conflicts) {
      if (nodes.has(other)) {
        conflicts.push({
          type: "forbidden_combination",
          a: id,
          b: other,
          handOff: "recovery_manager"
        });
      }
    }
  }

  for (const [base, list] of byBase) {
    if (list.length > 1) {
      const versions = [...new Set(list.map((n) => n.descriptor.version))];
      if (versions.length > 1) {
        conflicts.push({
          type: "version_conflict",
          module: base,
          versions,
          handOff: "recovery_manager"
        });
      } else {
        conflicts.push({
          type: "duplicate_service",
          module: base,
          ids: list.map((n) => n.descriptor.id),
          handOff: "recovery_manager"
        });
      }
    }
  }

  for (const [id, node] of nodes) {
    if (node.descriptor.apiVersion && node.incompatibleApi) {
      conflicts.push({
        type: "incompatible_api",
        id,
        apiVersion: node.descriptor.apiVersion,
        handOff: "recovery_manager"
      });
    }
  }

  return {
    ok: conflicts.length === 0,
    conflicts: Object.freeze(conflicts),
    handOffToRecovery: conflicts.length > 0
  };
}

function validateGraph(nodes, options = {}) {
  const bypass = assertValidationRequired(options.bypassValidation);
  if (!bypass.ok) return bypass;

  const missing = [];
  const invalidRefs = [];
  const softMissing = [];

  for (const [id, node] of nodes) {
    for (const dep of node.descriptor.dependsOn) {
      if (!nodes.has(dep)) {
        missing.push({ id, dependency: dep, type: DM_DEP_TYPE.HARD });
      }
    }
    for (const dep of node.descriptor.soft) {
      if (!nodes.has(dep)) {
        softMissing.push({ id, dependency: dep, type: DM_DEP_TYPE.SOFT });
      }
    }
    for (const dep of [...node.descriptor.optional, ...node.descriptor.conflicts]) {
      if (dep.includes(" ") || dep.includes("\0")) {
        invalidRefs.push({ id, ref: dep });
      }
    }
  }

  const cycles = detectCycles(nodes);
  const conflicts = detectConflicts(nodes);

  const hardFail =
    missing.length > 0 ||
    invalidRefs.length > 0 ||
    cycles.cyclic ||
    !conflicts.ok;

  return {
    ok: !hardFail,
    missing: Object.freeze(missing),
    softMissing: Object.freeze(softMissing),
    invalidRefs: Object.freeze(invalidRefs),
    cycles,
    conflicts,
    canContinue: !hardFail,
    blocksStartup: hardFail
  };
}

function canStart(nodes, serviceId) {
  const node = nodes.get(serviceId);
  if (!node) {
    return { ok: false, error: "unknown_service", canStart: false };
  }
  const unmet = node.descriptor.dependsOn.filter((dep) => !nodes.has(dep));
  if (unmet.length) {
    return {
      ok: false,
      error: "unmet_hard_dependencies",
      unmet: Object.freeze(unmet),
      canStart: false
    };
  }
  const softUnmet = node.descriptor.soft.filter((dep) => !nodes.has(dep));
  return {
    ok: true,
    canStart: true,
    degraded: softUnmet.length > 0,
    softUnmet: Object.freeze(softUnmet)
  };
}

function createDependencyManager(options = {}) {
  const singleton = options.singleton !== false;
  const nodes = new Map();
  let dynamicChanges = 0;
  let lastOrderDurationMs = 0;
  const conflictLog = [];

  function register(input, meta = {}) {
    const built = createDependencyDescriptor(input);
    if (!built.ok) return built;

    const { descriptor } = built;
    if (nodes.has(descriptor.id)) {
      return { ok: false, error: "duplicate_id", id: descriptor.id };
    }

    if (meta.kernelProtected === false && DM_KERNEL_IDS.includes(descriptor.id)) {
      return { ok: false, error: "kernel_id_reserved" };
    }

    nodes.set(descriptor.id, {
      descriptor,
      active: meta.active !== false,
      kind: descriptor.kind,
      incompatibleApi: Boolean(input.incompatibleApi),
      registeredAt: Date.now()
    });

    return { ok: true, id: descriptor.id, descriptor };
  }

  function unregister(id) {
    if (DM_KERNEL_IDS.includes(id) && options.allowKernelUnregister !== true) {
      return { ok: false, error: "kernel_protected" };
    }
    if (!nodes.has(id)) {
      return { ok: false, error: "not_found" };
    }
    nodes.delete(id);
    dynamicChanges += 1;
    return { ok: true, id };
  }

  function validateForStartup() {
    return validateGraph(nodes);
  }

  function order() {
    const result = computeInitOrder(nodes);
    lastOrderDurationMs = result.durationMs || 0;
    return result;
  }

  function addModule(input) {
    const validation = assertValidationRequired(input && input.bypassValidation);
    if (!validation.ok) return validation;

    const registered = register({ ...input, kind: input.kind || DM_NODE_KIND.MODULE });
    if (!registered.ok) return registered;

    const graphCheck = validateGraph(nodes);
    if (!graphCheck.ok) {
      nodes.delete(registered.id);
      return {
        ok: false,
        error: "dynamic_add_rejected",
        validation: graphCheck,
        kernelRestartRequired: false
      };
    }

    dynamicChanges += 1;
    return {
      ok: true,
      id: registered.id,
      graphUpdated: true,
      runtimeUpdated: true,
      kernelRestartRequired: false
    };
  }

  function removeModule(id) {
    if (DM_KERNEL_IDS.includes(id)) {
      return { ok: false, error: "cannot_remove_kernel_node" };
    }
    const dependents = [];
    for (const [nid, node] of nodes) {
      if (node.descriptor.dependsOn.includes(id)) {
        dependents.push(nid);
      }
    }
    if (dependents.length) {
      return {
        ok: false,
        error: "hard_dependents_present",
        dependents: Object.freeze(dependents)
      };
    }
    const result = unregister(id);
    if (result.ok) {
      return { ...result, graphUpdated: true, kernelRestartRequired: false };
    }
    return result;
  }

  function registerPlugin(input = {}, checks = {}) {
    const steps = {
      signature: checks.signatureValid === true,
      compatibility: checks.compatible !== false,
      dependencies: true,
      permissions: checks.permissionsOk === true,
      graph: false
    };

    if (!steps.signature) {
      return { ok: false, error: "plugin_signature_invalid", steps: DM_PLUGIN_STEPS };
    }
    if (!steps.compatibility) {
      return { ok: false, error: "plugin_incompatible", steps: DM_PLUGIN_STEPS };
    }
    if (!steps.permissions) {
      return { ok: false, error: "plugin_permissions_denied", steps: DM_PLUGIN_STEPS };
    }

    const probe = createDependencyDescriptor({
      ...input,
      kind: DM_NODE_KIND.PLUGIN
    });
    if (!probe.ok) return probe;

    for (const dep of probe.descriptor.dependsOn) {
      if (!nodes.has(dep)) {
        steps.dependencies = false;
        return {
          ok: false,
          error: "plugin_hard_dependency_missing",
          missing: dep,
          steps: DM_PLUGIN_STEPS
        };
      }
    }

    const added = addModule({ ...input, kind: DM_NODE_KIND.PLUGIN });
    if (!added.ok) {
      return { ...added, steps: DM_PLUGIN_STEPS };
    }
    steps.graph = true;
    return {
      ok: true,
      id: added.id,
      activated: true,
      stepsCompleted: Object.freeze([...DM_PLUGIN_STEPS]),
      steps
    };
  }

  function registerGame(input = {}) {
    return addModule({
      ...input,
      kind: DM_NODE_KIND.GAME,
      dependsOn: input.dependsOn || ["event-bus"]
    });
  }

  function disconnectPlatform(platformId) {
    const node = nodes.get(platformId);
    if (!node || node.kind !== DM_NODE_KIND.PLATFORM) {
      return { ok: false, error: "not_a_platform" };
    }

    const othersIntact = [];
    for (const [id, other] of nodes) {
      if (id === platformId) continue;
      if (other.kind === DM_NODE_KIND.KERNEL || other.kind === DM_NODE_KIND.SERVICE) {
        othersIntact.push(id);
      }
    }

    node.active = false;
    dynamicChanges += 1;
    return {
      ok: true,
      disconnected: platformId,
      systemIntact: true,
      othersIntact: Object.freeze(othersIntact),
      damagesOthers: false
    };
  }

  function handOffConflicts() {
    const detected = detectConflicts(nodes);
    if (detected.conflicts.length) {
      conflictLog.push({
        at: Date.now(),
        conflicts: detected.conflicts,
        target: "recovery_manager"
      });
    }
    return detected;
  }

  function metrics() {
    let edges = 0;
    let active = 0;
    for (const node of nodes.values()) {
      edges +=
        node.descriptor.dependsOn.length +
        node.descriptor.soft.length +
        node.descriptor.optional.length;
      if (node.active) active += 1;
    }
    const conflictCount = detectConflicts(nodes).conflicts.length;
    return Object.freeze({
      nodes: nodes.size,
      edges,
      conflicts: conflictCount,
      dynamicChanges,
      orderDurationMs: lastOrderDurationMs,
      activeModules: active
    });
  }

  function graphSnapshot() {
    const edges = [];
    for (const [id, node] of nodes) {
      for (const dep of node.descriptor.dependsOn) {
        edges.push({ from: id, to: dep, type: DM_DEP_TYPE.HARD });
      }
      for (const dep of node.descriptor.soft) {
        edges.push({ from: id, to: dep, type: DM_DEP_TYPE.SOFT });
      }
      for (const dep of node.descriptor.optional) {
        edges.push({ from: id, to: dep, type: DM_DEP_TYPE.OPTIONAL });
      }
    }
    return Object.freeze({
      nodes: Object.freeze([...nodes.keys()]),
      edges: Object.freeze(edges),
      acyclic: detectCycles(nodes).ok
    });
  }

  if (options.seedDefaults !== false) {
    const defaults = [
      { id: "kernel", kind: DM_NODE_KIND.KERNEL, version: "1.0.0", dependsOn: [] },
      { id: "logger", kind: DM_NODE_KIND.KERNEL, version: "1.0.0", dependsOn: ["kernel"] },
      { id: "configuration", kind: DM_NODE_KIND.SERVICE, version: "1.0.0", dependsOn: ["logger"] },
      { id: "runtime", kind: DM_NODE_KIND.KERNEL, version: "1.0.0", dependsOn: ["configuration"] },
      { id: "event-bus", kind: DM_NODE_KIND.SERVICE, version: "1.0.0", dependsOn: ["runtime"] },
      { id: "memory", kind: DM_NODE_KIND.SERVICE, version: "1.0.0", dependsOn: ["event-bus"] },
      { id: "decision", kind: DM_NODE_KIND.SERVICE, version: "1.0.0", dependsOn: ["memory"] },
      { id: "inventory-engine", kind: DM_NODE_KIND.SERVICE, version: "1.0.0", dependsOn: ["event-bus"] },
      { id: "economy-engine", kind: DM_NODE_KIND.SERVICE, version: "1.0.0", dependsOn: ["inventory-engine"] },
      {
        id: "battle-engine",
        kind: DM_NODE_KIND.GAME,
        version: "4.2.0",
        dependsOn: ["event-bus", "inventory-engine", "economy-engine", "memory"],
        optional: ["discord-module"],
        conflicts: ["legacy-battle-engine"]
      },
      { id: "obs", kind: DM_NODE_KIND.SERVICE, version: "1.0.0", dependsOn: ["event-bus"], soft: ["speech-engine"] },
      { id: "tiktok", kind: DM_NODE_KIND.PLATFORM, version: "1.0.0", dependsOn: ["event-bus"], soft: ["obs"] },
      { id: "recovery", kind: DM_NODE_KIND.KERNEL, version: "1.0.0", dependsOn: ["kernel"] }
    ];
    for (const def of defaults) {
      register(def);
    }
  }

  return {
    register,
    unregister,
    validateForStartup,
    computeInitOrder: order,
    detectCycles: () => detectCycles(nodes),
    detectConflicts: handOffConflicts,
    canStart: (serviceId) => canStart(nodes, serviceId),
    addModule,
    removeModule,
    registerPlugin,
    registerGame,
    disconnectPlatform,
    metrics,
    graphSnapshot,
    assertValidationRequired,
    status() {
      return Object.freeze({
        singleton,
        nodeCount: nodes.size,
        component: DM_COMPONENT.DEPENDENCY_MANAGER,
        managesServices: false,
        managesRelationshipsOnly: true
      });
    },
    list() {
      return Object.freeze({
        nodes: Object.freeze(
          [...nodes.entries()].map(([id, n]) =>
            Object.freeze({
              id,
              kind: n.kind,
              version: n.descriptor.version,
              dependsOn: n.descriptor.dependsOn,
              soft: n.descriptor.soft,
              optional: n.descriptor.optional,
              active: n.active
            })
          )
        )
      });
    },
    getDescriptor(id) {
      const node = nodes.get(id);
      return node ? node.descriptor : null;
    },
    snapshot() {
      return Object.freeze({
        ok: true,
        singleton,
        metrics: metrics(),
        graph: graphSnapshot()
      });
    }
  };
}

module.exports = {
  DM_COMPONENT,
  DM_COMPONENT_ORDER,
  DM_DEP_TYPE,
  DM_NODE_KIND,
  DM_PUBLIC_API,
  DM_RUNTIME_ANCHORS,
  DM_KERNEL_IDS,
  DM_PLUGIN_STEPS,
  createDependencyDescriptor,
  assertValidationRequired,
  detectCycles,
  computeInitOrder,
  detectConflicts,
  validateGraph,
  canStart,
  createDependencyManager
};
