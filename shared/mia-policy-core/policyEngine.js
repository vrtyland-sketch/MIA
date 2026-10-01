"use strict";

/**
 * Master Canon 0084 — Policy Engine.
 * Kernel Layer 0 sole central authority for system policies.
 * PE decides what is allowed / denied / limited / redirected.
 * Distinct from Rule Engine (0083): policies = system strategy; rules = business rules.
 * Never executes Commands; returns decisions only.
 */

const crypto = require("crypto");
const { evaluateCondition } = require("../mia-rule-core/ruleEngine");

const PE_COMPONENT = Object.freeze({
  POLICY_ENGINE: "policy_engine",
  INTAKE_GATE: "intake_gate",
  DESCRIPTOR_FACTORY: "descriptor_factory",
  TYPE_REGISTRY: "type_registry",
  SCOPE_RESOLVER: "scope_resolver",
  CONDITION_EVALUATOR: "condition_evaluator",
  PRIORITY_RESOLVER: "priority_resolver",
  INHERITANCE_RESOLVER: "inheritance_resolver",
  EFFECT_RESOLVER: "effect_resolver",
  VERSION_CONTROLLER: "version_controller",
  SECURITY_GATE: "security_gate",
  POLICY_AUDIT: "policy_audit"
});

const PE_COMPONENT_ORDER = Object.freeze(Object.values(PE_COMPONENT));

const PE_DESCRIPTOR_FIELDS = Object.freeze([
  "policyId",
  "policyType",
  "version",
  "priority",
  "scope",
  "condition",
  "effect",
  "created",
  "updated"
]);

const PE_SCOPE = Object.freeze({
  SYSTEM: "system",
  MODULE: "module",
  SERVICE: "service",
  USER: "user",
  PLATFORM: "platform",
  BATTLE: "battle",
  AI: "ai"
});

const PE_EFFECT = Object.freeze({
  ALLOW: "ALLOW",
  DENY: "DENY",
  LIMIT: "LIMIT",
  REDIRECT: "REDIRECT"
});

const PE_AUTHORIZED_SOURCES = Object.freeze([
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
  "rule_engine",
  "rule-engine",
  "resource_manager",
  "resource-manager",
  "health_manager",
  "health-manager",
  "saga_manager",
  "platform",
  "security",
  "monitoring"
]);

const PE_FLAGS = Object.freeze({
  solePolicyAuthority: true,
  evaluatesSystemPolicies: true,
  evaluatesBusinessRules: false,
  createsCommands: false,
  returnsDecisionsOnly: true,
  separatedFromRuleEngine: true
});

const PE_PUBLIC_API = Object.freeze([
  "evaluate",
  "loadPolicy",
  "reloadPolicies",
  "validatePolicy",
  "getPolicy"
]);

const PE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-policy-core/policyEngine.js",
  "shared/mia-rule-core/ruleEngine.js",
  "shared/mia-command-bus-core/commandBusManager.js",
  "shared/mia-resource-core/resourceManager.js",
  "shared/mia-health-core/healthManager.js",
  "docs/master-canon/0084-policy-engine.md"
]);

let activePolicyEngine = null;

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

function normalizeEffect(raw) {
  const effect = String(raw || "").trim().toUpperCase();
  if (!Object.values(PE_EFFECT).includes(effect)) return null;
  return effect;
}

function normalizeScope(raw) {
  if (raw == null) return PE_SCOPE.SYSTEM;
  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    if (Object.values(PE_SCOPE).includes(s)) return s;
    return null;
  }
  if (typeof raw === "object") {
    const kind = String(raw.kind || raw.type || "").trim().toLowerCase();
    if (!Object.values(PE_SCOPE).includes(kind)) return null;
    return Object.freeze({
      kind,
      id: raw.id != null ? String(raw.id) : null,
      module: raw.module != null ? String(raw.module) : null
    });
  }
  return null;
}

function scopeMatches(policyScope, requestScope) {
  const req =
    typeof requestScope === "string"
      ? { kind: requestScope.toLowerCase(), id: null }
      : requestScope && typeof requestScope === "object"
        ? {
            kind: String(requestScope.kind || requestScope.type || "system")
              .trim()
              .toLowerCase(),
            id:
              requestScope.id != null
                ? String(requestScope.id)
                : requestScope.module != null
                  ? String(requestScope.module)
                  : null
          }
        : { kind: "system", id: null };

  const ps =
    typeof policyScope === "string"
      ? { kind: policyScope, id: null }
      : policyScope;

  if (!ps || !ps.kind) return false;
  // system policies apply to everything
  if (ps.kind === PE_SCOPE.SYSTEM) return true;
  if (ps.kind !== req.kind) return false;
  if (ps.id != null && req.id != null && ps.id !== req.id) return false;
  return true;
}

function createPolicyDescriptor(input = {}) {
  const policyType = String(input.policyType || input.type || "").trim();
  if (!policyType) return { ok: false, error: "missing_policyType" };

  const effect = normalizeEffect(input.effect);
  if (!effect) return { ok: false, error: "invalid_effect" };

  const scopeRaw = normalizeScope(input.scope != null ? input.scope : PE_SCOPE.SYSTEM);
  if (scopeRaw == null) return { ok: false, error: "invalid_scope" };
  const scope =
    typeof scopeRaw === "string"
      ? Object.freeze({ kind: scopeRaw, id: null })
      : scopeRaw;

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

  const policyId =
    input.policyId != null && String(input.policyId).trim()
      ? String(input.policyId).trim()
      : makeId("policy");

  const condition =
    input.condition != null
      ? typeof input.condition === "function"
        ? input.condition
        : deepFreezeClone(input.condition)
      : Object.freeze({ path: "_always", op: "==", value: true });

  const descriptor = {
    policyId,
    policyType,
    version,
    priority,
    scope,
    condition,
    effect,
    created,
    updated
  };

  return { ok: true, descriptor: Object.freeze(descriptor) };
}

function validatePolicy(input = {}) {
  if (input == null || typeof input !== "object") {
    return Object.freeze({ ok: false, error: "invalid_policy" });
  }
  if (!String(input.policyType || input.type || "").trim()) {
    return Object.freeze({ ok: false, error: "missing_policyType" });
  }
  if (!normalizeEffect(input.effect)) {
    return Object.freeze({ ok: false, error: "invalid_effect" });
  }
  if (normalizeScope(input.scope != null ? input.scope : PE_SCOPE.SYSTEM) == null) {
    return Object.freeze({ ok: false, error: "invalid_scope" });
  }
  if (input.condition == null) {
    return Object.freeze({ ok: false, error: "missing_condition" });
  }
  if (
    input.inheritsFrom != null &&
    !String(input.inheritsFrom).trim()
  ) {
    return Object.freeze({ ok: false, error: "invalid_inheritsFrom" });
  }
  return Object.freeze({ ok: true });
}

function createPolicyEngine(options = {}) {
  if (
    activePolicyEngine &&
    activePolicyEngine.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "policy_engine_already_active",
      solePolicyAuthority: true
    });
  }

  const authorized = new Set(options.authorizedSources || PE_AUTHORIZED_SOURCES);

  /** @type {Map<string, object>} */
  const policies = new Map();

  const policyAuditLog = [];
  let evaluationCount = 0;
  let denyCount = 0;
  let conflictCount = 0;
  let versionChangeCount = 0;
  let evaluationDurationSumMs = 0;
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
    if (meta && meta.createCommand === true) {
      return Object.freeze({
        ok: false,
        error: "command_creation_rejected",
        createsCommands: false
      });
    }
    if (meta && meta.evaluateAsRule === true) {
      return Object.freeze({
        ok: false,
        error: "business_rule_evaluation_rejected",
        evaluatesBusinessRules: false,
        separatedFromRuleEngine: true
      });
    }
    if (!isAuthorized(meta)) {
      return Object.freeze({ ok: false, error: "unauthorized_policy" });
    }
    if (!isSourceVerified(meta)) {
      return Object.freeze({ ok: false, error: "forged_policy_blocked" });
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
    policyAuditLog.push(
      Object.freeze({
        policyId: entry.policyId != null ? entry.policyId : null,
        scope: entry.scope != null ? deepFreezeClone(entry.scope) : null,
        request: entry.request != null ? deepFreezeClone(entry.request) : null,
        decision: entry.decision,
        evaluatedAt: entry.evaluatedAt != null ? entry.evaluatedAt : Date.now(),
        version: entry.version != null ? entry.version : null
      })
    );
  }

  function loadPolicy(input = {}, meta = {}) {
    const blocked = gate(meta, "loadPolicy");
    if (blocked) return blocked;

    const validation = validatePolicy(input);
    if (!validation.ok) return validation;

    const existingId =
      input.policyId != null && String(input.policyId).trim()
        ? String(input.policyId).trim()
        : null;

    let version = 1;
    let created = nowMs(meta);
    if (existingId && policies.has(existingId)) {
      const prev = policies.get(existingId);
      version = prev.descriptor.version + 1;
      created = prev.descriptor.created;
      versionChangeCount += 1;
    }

    const inheritsFrom =
      input.inheritsFrom != null && String(input.inheritsFrom).trim()
        ? String(input.inheritsFrom).trim()
        : null;

    if (inheritsFrom && !policies.has(inheritsFrom) && meta.allowMissingParent !== true) {
      // allow forward-ref only when explicitly permitted; otherwise require parent
      if (!input.allowMissingParent) {
        return Object.freeze({ ok: false, error: "missing_parent_policy" });
      }
    }

    const desc = createPolicyDescriptor({
      ...input,
      policyId: existingId || input.policyId,
      version,
      created,
      updated: nowMs(meta)
    });
    if (!desc.ok) return Object.freeze(desc);

    // always-true helper for empty conditions using _always
    let condition = desc.descriptor.condition;
    if (
      condition &&
      typeof condition === "object" &&
      condition.path === "_always"
    ) {
      condition = () => true;
    }

    const entry = {
      descriptor: Object.freeze({
        ...desc.descriptor,
        condition:
          typeof condition === "function"
            ? condition
            : desc.descriptor.condition
      }),
      inheritsFrom,
      effectPayload:
        input.effectPayload != null
          ? deepFreezeClone(input.effectPayload)
          : input.limit != null
            ? Object.freeze({ limit: input.limit })
            : input.redirect != null
              ? Object.freeze({ redirect: input.redirect })
              : null,
      enabled: input.enabled !== false
    };

    // re-freeze descriptor with possibly function condition
    entry.descriptor = Object.freeze({
      policyId: desc.descriptor.policyId,
      policyType: desc.descriptor.policyType,
      version: desc.descriptor.version,
      priority: desc.descriptor.priority,
      scope: desc.descriptor.scope,
      condition:
        typeof condition === "function" ? condition : desc.descriptor.condition,
      effect: desc.descriptor.effect,
      created: desc.descriptor.created,
      updated: desc.descriptor.updated
    });

    policies.set(entry.descriptor.policyId, entry);
    return Object.freeze({
      ok: true,
      policyId: entry.descriptor.policyId,
      version: entry.descriptor.version,
      policy: Object.freeze({
        ...entry.descriptor,
        inheritsFrom: entry.inheritsFrom,
        effectPayload: entry.effectPayload
      })
    });
  }

  function reloadPolicies(list = [], meta = {}) {
    const blocked = gate(meta, "reloadPolicies");
    if (blocked) return blocked;
    policies.clear();
    let loaded = 0;
    // two-pass: parents first
    const ordered = [...list].sort((a, b) => {
      const ap = a.inheritsFrom ? 1 : 0;
      const bp = b.inheritsFrom ? 1 : 0;
      return ap - bp;
    });
    for (const raw of ordered) {
      const r = loadPolicy(raw, { ...meta, authorized: true, allowMissingParent: true });
      if (!r.ok) return r;
      loaded += 1;
    }
    return Object.freeze({ ok: true, loaded });
  }

  function getPolicy(policyId) {
    const entry = policies.get(String(policyId || "").trim());
    if (!entry) return Object.freeze({ ok: false, error: "policy_not_found" });
    return Object.freeze({
      ok: true,
      policy: Object.freeze({
        ...entry.descriptor,
        inheritsFrom: entry.inheritsFrom,
        effectPayload: entry.effectPayload,
        enabled: entry.enabled
      })
    });
  }

  function evaluate(input = {}, meta = {}) {
    const blocked = gate(meta, "evaluate");
    if (blocked) return blocked;

    const started = nowMs(meta);
    const request =
      input.request != null && typeof input.request === "object"
        ? input.request
        : {};
    const context =
      input.context != null && typeof input.context === "object"
        ? { ...input.context, ...request }
        : { ...request };
    const frozenRequest = deepFreezeClone(request);
    const requestScope = input.scope != null ? input.scope : request.scope || PE_SCOPE.SYSTEM;

    // snapshot for immutability proof
    const requestJson = JSON.stringify(request);

    let candidates = [...policies.values()].filter((e) => e.enabled !== false);
    candidates = candidates.filter((e) =>
      scopeMatches(e.descriptor.scope, requestScope)
    );

    candidates.sort(
      (a, b) => b.descriptor.priority - a.descriptor.priority
    );

    const matches = [];
    for (const entry of candidates) {
      const condCtx = {
        ...context,
        _always: true
      };
      const cond = evaluateCondition(entry.descriptor.condition, condCtx);
      if (!cond.ok) {
        return Object.freeze({
          ok: false,
          error: cond.error,
          policyId: entry.descriptor.policyId
        });
      }
      if (cond.matched) {
        matches.push(entry);
      }
    }

    // Inheritance: if a child matched, drop matched ancestors (specific overrides general)
    const filtered = matches.filter((entry) => {
      for (const other of matches) {
        if (other === entry) continue;
        // if `other` inherits from this entry (directly or transitively), drop this parent
        let cur = other;
        const seen = new Set();
        while (cur && cur.inheritsFrom) {
          if (seen.has(cur.inheritsFrom)) break;
          seen.add(cur.inheritsFrom);
          if (cur.inheritsFrom === entry.descriptor.policyId) return false;
          cur = policies.get(cur.inheritsFrom);
        }
      }
      return true;
    });

    // conflict: same priority, different effects among remaining
    if (filtered.length >= 2) {
      const topPri = filtered[0].descriptor.priority;
      const top = filtered.filter((m) => m.descriptor.priority === topPri);
      const effects = new Set(top.map((m) => m.descriptor.effect));
      if (effects.size > 1) conflictCount += 1;
    }

    let chosen = null;
    if (filtered.length > 0) {
      filtered.sort(
        (a, b) => b.descriptor.priority - a.descriptor.priority
      );
      const topPri = filtered[0].descriptor.priority;
      const top = filtered.filter((m) => m.descriptor.priority === topPri);
      chosen =
        top.find((m) => m.descriptor.effect === PE_EFFECT.DENY) || top[0];
    }

    const decision = chosen
      ? Object.freeze({
          effect: chosen.descriptor.effect,
          policyId: chosen.descriptor.policyId,
          scope: chosen.descriptor.scope,
          version: chosen.descriptor.version,
          priority: chosen.descriptor.priority,
          effectPayload: chosen.effectPayload,
          allowed: chosen.descriptor.effect === PE_EFFECT.ALLOW,
          denied: chosen.descriptor.effect === PE_EFFECT.DENY
        })
      : Object.freeze({
          effect: PE_EFFECT.ALLOW,
          policyId: null,
          scope: null,
          version: null,
          priority: null,
          effectPayload: null,
          allowed: true,
          denied: false,
          defaultAllow: true
        });

    if (decision.denied) denyCount += 1;
    evaluationCount += 1;
    const elapsed = Math.max(0, nowMs(meta) - started);
    evaluationDurationSumMs += elapsed;

    recordAudit({
      policyId: decision.policyId,
      scope: chosen ? chosen.descriptor.scope : requestScope,
      request: frozenRequest,
      decision: decision.effect,
      evaluatedAt: nowMs(meta),
      version: decision.version
    });

    // immutability: caller request unchanged
    if (JSON.stringify(request) !== requestJson) {
      return Object.freeze({ ok: false, error: "request_mutated" });
    }

    return Object.freeze({
      ok: true,
      decision,
      effect: decision.effect,
      matched: chosen != null,
      durationMs: elapsed,
      createsCommands: false,
      evaluatesBusinessRules: false,
      separatedFromRuleEngine: true
    });
  }

  function forWorkflowBridge(input = {}, meta = {}) {
    return evaluate(input, {
      ...meta,
      source: meta.source || "workflow_engine",
      authorized: true
    });
  }

  function forCommandBusBridge(input = {}, meta = {}) {
    return evaluate(input, {
      ...meta,
      source: meta.source || "command_bus",
      authorized: true
    });
  }

  /** Policy then Rule — PE does not evaluate business rules itself. */
  function forRuleBridge(input = {}, meta = {}) {
    const policyResult = evaluate(input, {
      ...meta,
      source: meta.source || "rule_engine",
      authorized: true
    });
    return Object.freeze({
      ok: policyResult.ok,
      policy: policyResult,
      next: "rule_engine",
      order: Object.freeze(["policy", "rule", "execution"]),
      continueToRules:
        policyResult.ok &&
        policyResult.effect !== PE_EFFECT.DENY
    });
  }

  function dispatchCommand() {
    return Object.freeze({
      ok: false,
      error: "command_creation_rejected",
      createsCommands: false
    });
  }

  function metrics() {
    return Object.freeze({
      policyCount: policies.size,
      evaluationCount,
      denyCount,
      averageEvaluationMs:
        evaluationCount > 0 ? evaluationDurationSumMs / evaluationCount : 0,
      versionChangeCount,
      conflictCount
    });
  }

  function policyAudit() {
    return Object.freeze([...policyAuditLog]);
  }

  function status() {
    return Object.freeze({
      active,
      singleton: true,
      solePolicyAuthority: true,
      policyCount: policies.size,
      evaluatesSystemPolicies: true,
      evaluatesBusinessRules: false,
      createsCommands: false,
      separatedFromRuleEngine: true
    });
  }

  function isActive() {
    return active === true;
  }

  function shutdown() {
    active = false;
    if (activePolicyEngine === api) activePolicyEngine = null;
    return Object.freeze({ ok: true });
  }

  const api = {
    ok: true,
    evaluate,
    loadPolicy,
    reloadPolicies,
    validatePolicy,
    getPolicy,
    forWorkflowBridge,
    forCommandBusBridge,
    forRuleBridge,
    dispatchCommand,
    metrics,
    policyAudit,
    status,
    isActive,
    shutdown,
    solePolicyAuthority: true,
    evaluatesSystemPolicies: true,
    evaluatesBusinessRules: false,
    createsCommands: false,
    separatedFromRuleEngine: true
  };

  activePolicyEngine = api;
  return Object.freeze(api);
}

function clearPolicySingletonForTest() {
  if (activePolicyEngine) {
    try {
      activePolicyEngine.shutdown();
    } catch (_err) {
      /* ignore */
    }
  }
  activePolicyEngine = null;
}

module.exports = {
  PE_COMPONENT,
  PE_COMPONENT_ORDER,
  PE_DESCRIPTOR_FIELDS,
  PE_SCOPE,
  PE_EFFECT,
  PE_AUTHORIZED_SOURCES,
  PE_FLAGS,
  PE_PUBLIC_API,
  PE_RUNTIME_ANCHORS,
  solePolicyAuthority: true,
  evaluatesSystemPolicies: true,
  evaluatesBusinessRules: false,
  createsCommands: false,
  separatedFromRuleEngine: true,
  createPolicyDescriptor,
  validatePolicy,
  scopeMatches,
  createPolicyEngine,
  clearPolicySingletonForTest,
  getActivePolicyEngine: () => activePolicyEngine
};
