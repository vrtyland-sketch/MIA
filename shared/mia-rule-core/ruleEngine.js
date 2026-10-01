"use strict";

/**
 * Master Canon 0083 — Rule Engine.
 * Kernel Layer 0 sole central authority for defining and evaluating rules.
 * RE separates business rules from application code.
 * Never executes business logic, never creates Commands, never creates Events.
 * Returns decisions only — callers (Workflow / Command Bus consumers) act on them.
 */

const crypto = require("crypto");

const RE_COMPONENT = Object.freeze({
  RULE_ENGINE: "rule_engine",
  INTAKE_GATE: "intake_gate",
  DESCRIPTOR_FACTORY: "descriptor_factory",
  TYPE_REGISTRY: "type_registry",
  CONDITION_EVALUATOR: "condition_evaluator",
  OPERATOR_ENGINE: "operator_engine",
  PRIORITY_RESOLVER: "priority_resolver",
  RULE_SET_MANAGER: "rule_set_manager",
  VERSION_CONTROLLER: "version_controller",
  DECISION_RECORDER: "decision_recorder",
  SECURITY_GATE: "security_gate",
  RULE_AUDIT: "rule_audit"
});

const RE_COMPONENT_ORDER = Object.freeze(Object.values(RE_COMPONENT));

const RE_DESCRIPTOR_FIELDS = Object.freeze([
  "ruleId",
  "ruleType",
  "version",
  "priority",
  "condition",
  "result",
  "created",
  "updated"
]);

const RE_RULE_TYPE = Object.freeze({
  GIFT: "gift",
  BATTLE: "battle",
  INVENTORY: "inventory",
  AI: "ai",
  OBS: "obs",
  SECURITY: "security"
});

const RE_OPERATOR = Object.freeze({
  AND: "AND",
  OR: "OR",
  NOT: "NOT",
  XOR: "XOR"
});

const RE_PRIORITY_STRATEGY = Object.freeze({
  FIRST_MATCH: "firstMatch",
  ALL_MATCH: "allMatch"
});

const RE_AUTHORIZED_SOURCES = Object.freeze([
  "kernel",
  "operator",
  "admin",
  "system",
  "runtime",
  "runtime_manager",
  "runtime-manager",
  "workflow_engine",
  "workflow-engine",
  "command_bus",
  "command-bus",
  "query_bus",
  "query-bus",
  "saga_manager",
  "saga-manager",
  "ai_engine",
  "battle_engine",
  "gift_engine",
  "inventory",
  "platform",
  "security",
  "monitoring"
]);

const RE_FLAGS = Object.freeze({
  soleRuleAuthority: true,
  executesBusinessLogic: false,
  createsCommands: false,
  createsEvents: false,
  returnsDecisionsOnly: true,
  mutatesContext: false
});

const RE_PUBLIC_API = Object.freeze([
  "evaluate",
  "loadRule",
  "reloadRules",
  "validateRule",
  "getRule"
]);

const RE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-rule-core/ruleEngine.js",
  "shared/mia-workflow-core/workflowEngine.js",
  "shared/mia-command-bus-core/commandBusManager.js",
  "shared/mia-query-bus-core/queryBusManager.js",
  "docs/master-canon/0083-rule-engine.md"
]);

let activeRuleEngine = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function deepFreezeClone(value) {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return Object.freeze(value.map((v) => deepFreezeClone(v)));
  }
  const out = {};
  for (const key of Object.keys(value)) {
    out[key] = deepFreezeClone(value[key]);
  }
  return Object.freeze(out);
}

function getPath(ctx, pathExpr) {
  if (pathExpr == null) return undefined;
  const parts = String(pathExpr).split(".").filter(Boolean);
  let cur = ctx;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

function compareValues(left, op, right) {
  switch (op) {
    case "==":
    case "eq":
      return left === right;
    case "!=":
    case "neq":
      return left !== right;
    case ">":
    case "gt":
      return Number(left) > Number(right);
    case ">=":
    case "gte":
      return Number(left) >= Number(right);
    case "<":
    case "lt":
      return Number(left) < Number(right);
    case "<=":
    case "lte":
      return Number(left) <= Number(right);
    case "in":
      return Array.isArray(right) && right.includes(left);
    case "contains":
      if (Array.isArray(left)) return left.includes(right);
      if (typeof left === "string") return left.includes(String(right));
      return false;
    default:
      return null;
  }
}

/**
 * Condition forms:
 * - { path, op, value }
 * - { op: AND|OR|XOR, of: [cond, ...] }
 * - { op: NOT, of: cond }
 * - function(context) => boolean (deterministic caller responsibility)
 */
function evaluateCondition(condition, context) {
  if (typeof condition === "function") {
    try {
      const matched = !!condition(context);
      return { ok: true, matched, value: matched };
    } catch (err) {
      return {
        ok: false,
        error: "condition_function_failed",
        message: err && err.message ? String(err.message) : "unknown"
      };
    }
  }

  if (condition == null || typeof condition !== "object") {
    return { ok: false, error: "invalid_condition" };
  }

  const op = condition.op != null ? String(condition.op).trim().toUpperCase() : null;

  if (op === RE_OPERATOR.AND || op === RE_OPERATOR.OR || op === RE_OPERATOR.XOR) {
    const list = Array.isArray(condition.of) ? condition.of : null;
    if (!list || list.length === 0) {
      return { ok: false, error: "missing_operator_operands" };
    }
    const results = [];
    for (const child of list) {
      const r = evaluateCondition(child, context);
      if (!r.ok) return r;
      results.push(!!r.matched);
    }
    let matched = false;
    if (op === RE_OPERATOR.AND) matched = results.every(Boolean);
    else if (op === RE_OPERATOR.OR) matched = results.some(Boolean);
    else {
      // XOR: odd number of trues
      matched = results.filter(Boolean).length % 2 === 1;
    }
    return { ok: true, matched, value: matched, operator: op };
  }

  if (op === RE_OPERATOR.NOT) {
    const child = Array.isArray(condition.of) ? condition.of[0] : condition.of;
    const r = evaluateCondition(child, context);
    if (!r.ok) return r;
    return { ok: true, matched: !r.matched, value: !r.matched, operator: op };
  }

  const path = condition.path != null ? String(condition.path) : null;
  const cmp = condition.op != null ? String(condition.op).trim() : "==";
  if (!path) return { ok: false, error: "missing_condition_path" };

  const left = getPath(context, path);
  const compared = compareValues(left, cmp, condition.value);
  if (compared == null) {
    return { ok: false, error: "unknown_comparison_op", op: cmp };
  }
  return {
    ok: true,
    matched: compared,
    value: compared,
    path,
    left
  };
}

function createRuleDescriptor(input = {}) {
  const ruleType = String(input.ruleType || input.type || "").trim();
  if (!ruleType) return { ok: false, error: "missing_ruleType" };

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
      : 1;

  const priority =
    typeof input.priority === "number" && Number.isFinite(input.priority)
      ? Math.floor(input.priority)
      : 0;

  const ruleId =
    input.ruleId != null && String(input.ruleId).trim()
      ? String(input.ruleId).trim()
      : makeId("rule");

  const condition =
    input.condition != null
      ? typeof input.condition === "function"
        ? input.condition
        : deepFreezeClone(input.condition)
      : null;

  const result =
    input.result !== undefined ? deepFreezeClone(input.result) : true;

  const descriptor = {
    ruleId,
    ruleType,
    version,
    priority,
    condition,
    result,
    created,
    updated
  };

  return { ok: true, descriptor: Object.freeze(descriptor) };
}

function validateRule(input = {}) {
  if (input == null || typeof input !== "object") {
    return Object.freeze({ ok: false, error: "invalid_rule" });
  }
  const ruleType = String(input.ruleType || input.type || "").trim();
  if (!ruleType) return Object.freeze({ ok: false, error: "missing_ruleType" });
  if (input.condition == null) {
    return Object.freeze({ ok: false, error: "missing_condition" });
  }
  if (
    typeof input.condition !== "function" &&
    typeof input.condition !== "object"
  ) {
    return Object.freeze({ ok: false, error: "invalid_condition" });
  }
  if (
    input.priority != null &&
    (!Number.isFinite(Number(input.priority)) || Number.isNaN(Number(input.priority)))
  ) {
    return Object.freeze({ ok: false, error: "invalid_priority" });
  }
  // dry-run condition shape with empty context for structural ops
  if (typeof input.condition === "object") {
    const probe = evaluateCondition(input.condition, {});
    if (!probe.ok && probe.error === "unknown_comparison_op") {
      return Object.freeze({ ok: false, error: probe.error });
    }
    if (!probe.ok && probe.error === "missing_operator_operands") {
      return Object.freeze({ ok: false, error: probe.error });
    }
    if (!probe.ok && probe.error === "missing_condition_path") {
      return Object.freeze({ ok: false, error: probe.error });
    }
  }
  return Object.freeze({ ok: true, ruleType });
}

function createRuleEngine(options = {}) {
  if (
    activeRuleEngine &&
    activeRuleEngine.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "rule_engine_already_active",
      soleRuleAuthority: true
    });
  }

  const authorized = new Set(options.authorizedSources || RE_AUTHORIZED_SOURCES);
  const customTypes = new Set(
    Object.values(RE_RULE_TYPE).concat(options.extraRuleTypes || [])
  );
  const priorityStrategy =
    options.priorityStrategy || RE_PRIORITY_STRATEGY.FIRST_MATCH;

  /** @type {Map<string, object>} */
  const rules = new Map();
  /** @type {Map<string, { ruleIds: string[], protected: boolean }>} */
  const ruleSets = new Map();

  const ruleAuditLog = [];
  let evaluationCount = 0;
  let errorCount = 0;
  let evaluationDurationSumMs = 0;
  let active = true;
  let loadGeneration = 0;

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
    if (meta && meta.createCommand === true) {
      return Object.freeze({
        ok: false,
        error: "command_creation_rejected",
        createsCommands: false
      });
    }
    if (meta && meta.createEvent === true) {
      return Object.freeze({
        ok: false,
        error: "event_creation_rejected",
        createsEvents: false
      });
    }
    if (meta && meta.executeBusinessLogic === true) {
      return Object.freeze({
        ok: false,
        error: "business_logic_execution_rejected",
        executesBusinessLogic: false
      });
    }
    if (requireAuth && !isAuthorized(meta)) {
      return Object.freeze({ ok: false, error: "unauthorized_rule" });
    }
    if (!isSourceVerified(meta)) {
      return Object.freeze({ ok: false, error: "forged_rule_blocked" });
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
    ruleAuditLog.push(
      Object.freeze({
        ruleId: entry.ruleId != null ? entry.ruleId : null,
        ruleSet: entry.ruleSet != null ? entry.ruleSet : null,
        context: entry.context != null ? deepFreezeClone(entry.context) : null,
        result: entry.result,
        evaluatedAt: entry.evaluatedAt != null ? entry.evaluatedAt : Date.now(),
        version: entry.version != null ? entry.version : null
      })
    );
  }

  function registerRuleType(typeName, meta = {}) {
    const blocked = gate(meta, "registerRuleType");
    if (blocked) return blocked;
    const t = String(typeName || "").trim();
    if (!t) return Object.freeze({ ok: false, error: "missing_ruleType" });
    customTypes.add(t);
    return Object.freeze({ ok: true, ruleType: t });
  }

  function loadRule(input = {}, meta = {}) {
    const blocked = gate(meta, "loadRule");
    if (blocked) return blocked;

    const validation = validateRule(input);
    if (!validation.ok) return validation;

    const ruleType = String(input.ruleType || input.type).trim();
    if (!customTypes.has(ruleType) && meta.allowUnknownType !== true) {
      // still allow — types are extensible; register implicitly
      customTypes.add(ruleType);
    }

    const existingId =
      input.ruleId != null && String(input.ruleId).trim()
        ? String(input.ruleId).trim()
        : null;

    let version = 1;
    let created = nowMs(meta);
    if (existingId && rules.has(existingId)) {
      if (meta.authorized !== true && !authorized.has(meta.source || "")) {
        return Object.freeze({ ok: false, error: "unauthorized_rule_mutate" });
      }
      const prev = rules.get(existingId);
      version = prev.descriptor.version + 1;
      created = prev.descriptor.created;
    }

    const desc = createRuleDescriptor({
      ...input,
      ruleId: existingId || input.ruleId,
      ruleType,
      version,
      created,
      updated: nowMs(meta),
      priority: input.priority,
      condition: input.condition,
      result: input.result !== undefined ? input.result : true
    });
    if (!desc.ok) return Object.freeze(desc);

    const entry = {
      descriptor: desc.descriptor,
      ruleSet: input.ruleSet != null ? String(input.ruleSet) : null,
      enabled: input.enabled !== false
    };
    rules.set(entry.descriptor.ruleId, entry);

    if (entry.ruleSet) {
      const set = ruleSets.get(entry.ruleSet) || {
        ruleIds: [],
        protected: false
      };
      if (!set.ruleIds.includes(entry.descriptor.ruleId)) {
        set.ruleIds.push(entry.descriptor.ruleId);
      }
      ruleSets.set(entry.ruleSet, set);
    }

    loadGeneration += 1;
    return Object.freeze({
      ok: true,
      ruleId: entry.descriptor.ruleId,
      version: entry.descriptor.version,
      rule: Object.freeze({ ...entry.descriptor })
    });
  }

  function loadRuleSet(setName, ruleList = [], meta = {}) {
    const blocked = gate(meta, "loadRuleSet");
    if (blocked) return blocked;
    const name = String(setName || "").trim();
    if (!name) return Object.freeze({ ok: false, error: "missing_ruleSet" });

    const existing = ruleSets.get(name);
    if (existing && existing.protected && meta.authorized !== true) {
      return Object.freeze({ ok: false, error: "rule_set_protected" });
    }

    const ids = [];
    for (const raw of ruleList) {
      const loaded = loadRule({ ...raw, ruleSet: name }, meta);
      if (!loaded.ok) return loaded;
      ids.push(loaded.ruleId);
    }
    ruleSets.set(name, {
      ruleIds: ids,
      protected: meta.protect === true
    });
    return Object.freeze({
      ok: true,
      ruleSet: name,
      ruleCount: ids.length
    });
  }

  function reloadRules(sourceRules = [], meta = {}) {
    const blocked = gate(meta, "reloadRules");
    if (blocked) return blocked;
    if (meta.authorized !== true && !authorized.has("admin")) {
      // require explicit authorized for full reload
      if (!isAuthorized({ ...meta, source: meta.source || "admin" })) {
        return Object.freeze({ ok: false, error: "unauthorized_rule_reload" });
      }
    }

    rules.clear();
    ruleSets.clear();
    let loaded = 0;
    for (const raw of sourceRules) {
      const r = loadRule(raw, { ...meta, authorized: true });
      if (!r.ok) return r;
      loaded += 1;
    }
    loadGeneration += 1;
    return Object.freeze({ ok: true, loaded, generation: loadGeneration });
  }

  function getRule(ruleId) {
    const entry = rules.get(String(ruleId || "").trim());
    if (!entry) return Object.freeze({ ok: false, error: "rule_not_found" });
    return Object.freeze({
      ok: true,
      rule: Object.freeze({
        ...entry.descriptor,
        ruleSet: entry.ruleSet,
        enabled: entry.enabled
      })
    });
  }

  function listRulesForEval(input) {
    if (input.ruleId) {
      const e = rules.get(String(input.ruleId));
      return e ? [e] : [];
    }
    if (input.ruleSet) {
      const set = ruleSets.get(String(input.ruleSet));
      if (!set) return [];
      return set.ruleIds.map((id) => rules.get(id)).filter(Boolean);
    }
    if (input.ruleType) {
      const t = String(input.ruleType);
      return [...rules.values()].filter((e) => e.descriptor.ruleType === t);
    }
    return [...rules.values()];
  }

  function evaluate(input = {}, meta = {}) {
    const blocked = gate(meta, "evaluate");
    if (blocked) return blocked;

    const started = nowMs(meta);
    const contextIn =
      input.context != null && typeof input.context === "object"
        ? input.context
        : {};
    // never mutate caller context — work on snapshot
    const context = deepFreezeClone(contextIn);

    let candidates = listRulesForEval(input).filter((e) => e.enabled !== false);
    candidates = candidates.slice().sort(
      (a, b) => b.descriptor.priority - a.descriptor.priority
    );

    if (candidates.length === 0 && input.ruleId) {
      errorCount += 1;
      return Object.freeze({ ok: false, error: "rule_not_found" });
    }
    if (candidates.length === 0 && input.ruleSet) {
      errorCount += 1;
      return Object.freeze({ ok: false, error: "rule_set_not_found" });
    }

    const decisions = [];
    let firstMatch = null;

    for (const entry of candidates) {
      const cond = evaluateCondition(entry.descriptor.condition, context);
      if (!cond.ok) {
        errorCount += 1;
        recordAudit({
          ruleId: entry.descriptor.ruleId,
          ruleSet: entry.ruleSet,
          context,
          result: { error: cond.error },
          evaluatedAt: nowMs(meta),
          version: entry.descriptor.version
        });
        return Object.freeze({
          ok: false,
          error: cond.error,
          ruleId: entry.descriptor.ruleId
        });
      }

      const matched = !!cond.matched;
      const decisionValue = matched
        ? entry.descriptor.result !== undefined
          ? entry.descriptor.result
          : true
        : false;

      const decision = Object.freeze({
        ruleId: entry.descriptor.ruleId,
        ruleType: entry.descriptor.ruleType,
        priority: entry.descriptor.priority,
        version: entry.descriptor.version,
        matched,
        decision: decisionValue,
        boolean: matched === true
      });
      decisions.push(decision);

      recordAudit({
        ruleId: entry.descriptor.ruleId,
        ruleSet: entry.ruleSet || input.ruleSet || null,
        context,
        result: decisionValue,
        evaluatedAt: nowMs(meta),
        version: entry.descriptor.version
      });

      if (matched && firstMatch == null) {
        firstMatch = decision;
        if (priorityStrategy === RE_PRIORITY_STRATEGY.FIRST_MATCH) {
          break;
        }
      }
    }

    evaluationCount += 1;
    const elapsed = Math.max(0, nowMs(meta) - started);
    evaluationDurationSumMs += elapsed;

    // prove context not mutated: compare keys shallow for caller object
    // (caller still holds original; we never wrote into contextIn)

    const payload = Object.freeze({
      ok: true,
      matched: firstMatch != null,
      decision: firstMatch ? firstMatch.decision : false,
      boolean: firstMatch ? firstMatch.boolean : false,
      ruleId: firstMatch ? firstMatch.ruleId : null,
      decisions:
        priorityStrategy === RE_PRIORITY_STRATEGY.ALL_MATCH
          ? Object.freeze(decisions)
          : Object.freeze(firstMatch ? [firstMatch] : []),
      durationMs: elapsed,
      returnsDecisionsOnly: true,
      mutatesContext: false,
      createsCommands: false,
      createsEvents: false
    });
    return payload;
  }

  function forWorkflowBridge(input = {}, meta = {}) {
    return evaluate(input, {
      ...meta,
      source: meta.source || "workflow_engine",
      authorized: true
    });
  }

  function dispatchCommand() {
    return Object.freeze({
      ok: false,
      error: "command_creation_rejected",
      createsCommands: false,
      returnsDecisionsOnly: true
    });
  }

  function emitEvent() {
    return Object.freeze({
      ok: false,
      error: "event_creation_rejected",
      createsEvents: false,
      returnsDecisionsOnly: true
    });
  }

  function metrics() {
    return Object.freeze({
      ruleCount: rules.size,
      evaluationCount,
      averageEvaluationMs:
        evaluationCount > 0 ? evaluationDurationSumMs / evaluationCount : 0,
      errorCount,
      ruleSetCount: ruleSets.size,
      loadGeneration,
      engineLoad:
        evaluationCount > 0
          ? Number((evaluationDurationSumMs / evaluationCount).toFixed(4))
          : 0
    });
  }

  function ruleAudit() {
    return Object.freeze([...ruleAuditLog]);
  }

  function status() {
    return Object.freeze({
      active,
      singleton: true,
      soleRuleAuthority: true,
      ruleCount: rules.size,
      ruleSetCount: ruleSets.size,
      executesBusinessLogic: false,
      createsCommands: false,
      createsEvents: false,
      returnsDecisionsOnly: true,
      mutatesContext: false,
      ruleTypes: Object.freeze([...customTypes])
    });
  }

  function isActive() {
    return active === true;
  }

  function shutdown() {
    active = false;
    if (activeRuleEngine === api) activeRuleEngine = null;
    return Object.freeze({ ok: true });
  }

  const api = {
    ok: true,
    evaluate,
    loadRule,
    loadRuleSet,
    reloadRules,
    validateRule,
    getRule,
    registerRuleType,
    forWorkflowBridge,
    dispatchCommand,
    emitEvent,
    metrics,
    ruleAudit,
    status,
    isActive,
    shutdown,
    soleRuleAuthority: true,
    executesBusinessLogic: false,
    createsCommands: false,
    createsEvents: false,
    returnsDecisionsOnly: true,
    mutatesContext: false
  };

  activeRuleEngine = api;
  return Object.freeze(api);
}

function clearRuleSingletonForTest() {
  if (activeRuleEngine) {
    try {
      activeRuleEngine.shutdown();
    } catch (_err) {
      /* ignore */
    }
  }
  activeRuleEngine = null;
}

module.exports = {
  RE_COMPONENT,
  RE_COMPONENT_ORDER,
  RE_DESCRIPTOR_FIELDS,
  RE_RULE_TYPE,
  RE_OPERATOR,
  RE_PRIORITY_STRATEGY,
  RE_AUTHORIZED_SOURCES,
  RE_FLAGS,
  RE_PUBLIC_API,
  RE_RUNTIME_ANCHORS,
  soleRuleAuthority: true,
  executesBusinessLogic: false,
  createsCommands: false,
  createsEvents: false,
  returnsDecisionsOnly: true,
  mutatesContext: false,
  evaluateCondition,
  createRuleDescriptor,
  validateRule,
  createRuleEngine,
  clearRuleSingletonForTest,
  getActiveRuleEngine: () => activeRuleEngine
};
