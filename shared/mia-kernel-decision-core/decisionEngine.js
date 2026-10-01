"use strict";

/**
 * Master Canon 0085 — Kernel Decision Engine.
 * Kernel Layer 0 sole central authority for final decisions.
 * Unifies Rule Engine, Policy Engine, State, AI suggestions, Runtime, Workflow.
 * Distinct from AI Decision Engine (0028 / mia-decision-core).
 * Never executes Commands, never creates Events, never runs business logic.
 * Output is Decision only.
 */

const crypto = require("crypto");

const KDE_COMPONENT = Object.freeze({
  DECISION_ENGINE: "decision_engine",
  INTAKE_GATE: "intake_gate",
  DESCRIPTOR_FACTORY: "descriptor_factory",
  SOURCE_COLLECTOR: "source_collector",
  CONFLICT_RESOLVER: "conflict_resolver",
  PRIORITY_RESOLVER: "priority_resolver",
  STRATEGY_ENGINE: "strategy_engine",
  CONTEXT_GUARD: "context_guard",
  DETERMINISM_GATE: "determinism_gate",
  AI_ADVICE_ADAPTER: "ai_advice_adapter",
  SECURITY_GATE: "security_gate",
  DECISION_AUDIT: "decision_audit"
});

const KDE_COMPONENT_ORDER = Object.freeze(Object.values(KDE_COMPONENT));

const KDE_DESCRIPTOR_FIELDS = Object.freeze([
  "decisionId",
  "decisionType",
  "context",
  "priority",
  "source",
  "result",
  "timestamp",
  "correlationId"
]);

const KDE_SOURCE = Object.freeze({
  RULE: "rule_engine",
  POLICY: "policy_engine",
  STATE: "state_manager",
  AI: "ai",
  RUNTIME: "runtime",
  WORKFLOW: "workflow"
});

const KDE_PRIORITY = Object.freeze({
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  NORMAL: "NORMAL",
  LOW: "LOW"
});

const KDE_PRIORITY_RANK = Object.freeze({
  CRITICAL: 100,
  HIGH: 75,
  NORMAL: 50,
  LOW: 25
});

const KDE_STRATEGY = Object.freeze({
  FIRST_MATCH: "firstMatch",
  HIGHEST_PRIORITY: "highestPriority",
  MAJORITY: "majority",
  WEIGHTED: "weighted",
  CUSTOM: "custom"
});

const KDE_AUTHORIZED_SOURCES = Object.freeze([
  "kernel",
  "operator",
  "admin",
  "system",
  "runtime",
  "runtime_manager",
  "rule_engine",
  "rule-engine",
  "policy_engine",
  "policy-engine",
  "state_manager",
  "state-manager",
  "workflow_engine",
  "workflow-engine",
  "command_bus",
  "ai_engine",
  "battle_engine",
  "platform",
  "security",
  "monitoring"
]);

const KDE_FLAGS = Object.freeze({
  soleDecisionAuthority: true,
  executesCommands: false,
  createsEvents: false,
  executesBusinessLogic: false,
  returnsDecisionsOnly: true,
  aiMayOnlySuggest: true,
  deterministic: true,
  distinctFromAiDecisionEngine0028: true
});

const KDE_PUBLIC_API = Object.freeze([
  "evaluate",
  "resolve",
  "compare",
  "getDecision",
  "validate"
]);

const KDE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-kernel-decision-core/decisionEngine.js",
  "shared/mia-rule-core/ruleEngine.js",
  "shared/mia-policy-core/policyEngine.js",
  "shared/mia-state-core/stateManager.js",
  "shared/mia-decision-core/decisionEngine.js",
  "docs/master-canon/0085-decision-engine.md"
]);

let activeKernelDecisionEngine = null;

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

function stableStringify(value) {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

function normalizePriority(raw) {
  const p = String(raw || KDE_PRIORITY.NORMAL).trim().toUpperCase();
  if (!(p in KDE_PRIORITY_RANK)) return null;
  return p;
}

function createDecisionDescriptor(input = {}) {
  const decisionType = String(input.decisionType || input.type || "").trim();
  if (!decisionType) return { ok: false, error: "missing_decisionType" };

  const priority = normalizePriority(input.priority);
  if (!priority) return { ok: false, error: "invalid_priority" };

  const source = String(input.source || "").trim();
  if (!source) return { ok: false, error: "missing_source" };

  const timestamp =
    typeof input.timestamp === "number" && Number.isFinite(input.timestamp)
      ? input.timestamp
      : typeof input.nowMs === "number" && Number.isFinite(input.nowMs)
        ? input.nowMs
        : Date.now();

  const decisionId =
    input.decisionId != null && String(input.decisionId).trim()
      ? String(input.decisionId).trim()
      : makeId("decision");

  const correlationId =
    input.correlationId != null && String(input.correlationId).trim()
      ? String(input.correlationId).trim()
      : null;

  const context =
    input.context != null ? deepFreezeClone(input.context) : Object.freeze({});

  const result =
    input.result !== undefined ? deepFreezeClone(input.result) : null;

  const descriptor = {
    decisionId,
    decisionType,
    context,
    priority,
    source,
    result,
    timestamp,
    correlationId
  };

  return { ok: true, descriptor: Object.freeze(descriptor) };
}

function validateDecision(input = {}) {
  if (input == null || typeof input !== "object") {
    return Object.freeze({ ok: false, error: "invalid_decision" });
  }
  if (!String(input.decisionType || input.type || "").trim()) {
    return Object.freeze({ ok: false, error: "missing_decisionType" });
  }
  if (!normalizePriority(input.priority || KDE_PRIORITY.NORMAL)) {
    return Object.freeze({ ok: false, error: "invalid_priority" });
  }
  if (!String(input.source || "").trim()) {
    return Object.freeze({ ok: false, error: "missing_source" });
  }
  if (input.result === undefined) {
    return Object.freeze({ ok: false, error: "missing_result" });
  }
  return Object.freeze({ ok: true });
}

function createKernelDecisionEngine(options = {}) {
  if (
    activeKernelDecisionEngine &&
    activeKernelDecisionEngine.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "decision_engine_already_active",
      soleDecisionAuthority: true
    });
  }

  const authorized = new Set(options.authorizedSources || KDE_AUTHORIZED_SOURCES);
  const defaultStrategy = options.defaultStrategy || KDE_STRATEGY.HIGHEST_PRIORITY;
  const conflictPolicyWins = options.conflictPolicyWins !== false;

  /** @type {Map<string, object>} */
  const decisions = new Map();
  const decisionAuditLog = [];
  const registeredStrategies = new Set(Object.values(KDE_STRATEGY));

  let decisionCount = 0;
  let conflictCount = 0;
  let denyCount = 0;
  let evaluationDurationSumMs = 0;
  let active = true;

  // deterministic cache: fingerprint → decisionId
  const fingerprintCache = new Map();

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
        executesCommands: false
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
    if (meta && meta.aiDecidesAlone === true) {
      return Object.freeze({
        ok: false,
        error: "ai_alone_decision_rejected",
        aiMayOnlySuggest: true
      });
    }
    if (!isAuthorized(meta)) {
      return Object.freeze({ ok: false, error: "unauthorized_decision" });
    }
    if (!isSourceVerified(meta)) {
      return Object.freeze({ ok: false, error: "forged_decision_blocked" });
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
    decisionAuditLog.push(
      Object.freeze({
        decisionId: entry.decisionId != null ? entry.decisionId : null,
        context: entry.context != null ? deepFreezeClone(entry.context) : null,
        strategy: entry.strategy != null ? entry.strategy : null,
        ruleResults:
          entry.ruleResults != null ? deepFreezeClone(entry.ruleResults) : null,
        policyResults:
          entry.policyResults != null
            ? deepFreezeClone(entry.policyResults)
            : null,
        finalDecision:
          entry.finalDecision != null
            ? deepFreezeClone(entry.finalDecision)
            : null,
        evaluatedAt: entry.evaluatedAt != null ? entry.evaluatedAt : Date.now()
      })
    );
  }

  function normalizeInput(raw, index) {
    if (raw == null || typeof raw !== "object") {
      return { ok: false, error: "invalid_input", index };
    }
    const source = String(raw.source || "").trim();
    if (!Object.values(KDE_SOURCE).includes(source) && !source) {
      return { ok: false, error: "missing_source", index };
    }
    if (!source) return { ok: false, error: "missing_source", index };

    const priority = normalizePriority(raw.priority || KDE_PRIORITY.NORMAL);
    if (!priority) return { ok: false, error: "invalid_priority", index };

    const weight =
      typeof raw.weight === "number" && Number.isFinite(raw.weight)
        ? raw.weight
        : KDE_PRIORITY_RANK[priority] / 100;

    return {
      ok: true,
      input: Object.freeze({
        source,
        priority,
        weight,
        result: raw.result !== undefined ? deepFreezeClone(raw.result) : null,
        matched: raw.matched !== false,
        deny:
          raw.deny === true ||
          raw.result === "DENY" ||
          (raw.result &&
            typeof raw.result === "object" &&
            raw.result.effect === "DENY"),
        allow:
          raw.allow === true ||
          raw.result === "ALLOW" ||
          (raw.result &&
            typeof raw.result === "object" &&
            raw.result.effect === "ALLOW"),
        suggestion: raw.suggestion === true || source === KDE_SOURCE.AI
      })
    };
  }

  function resolve(candidates = [], meta = {}) {
    const blocked = gate(meta, "resolve");
    if (blocked) return blocked;

    const strategy = String(meta.strategy || defaultStrategy).trim();
    if (!registeredStrategies.has(strategy) && strategy !== KDE_STRATEGY.CUSTOM) {
      return Object.freeze({ ok: false, error: "unknown_strategy" });
    }

    const normalized = [];
    for (let i = 0; i < candidates.length; i += 1) {
      const n = normalizeInput(candidates[i], i);
      if (!n.ok) return Object.freeze(n);
      if (n.input.matched) normalized.push(n.input);
    }

    if (normalized.length === 0) {
      return Object.freeze({
        ok: true,
        conflict: false,
        result: null,
        source: null,
        priority: null,
        strategy
      });
    }

    // Configurable conflict: Policy DENY beats Rule TRUE
    if (conflictPolicyWins) {
      const policyDeny = normalized.find(
        (c) => c.source === KDE_SOURCE.POLICY && c.deny
      );
      const ruleTrue = normalized.find(
        (c) =>
          c.source === KDE_SOURCE.RULE &&
          (c.result === true || c.allow === true || c.matched)
      );
      if (policyDeny && ruleTrue) {
        conflictCount += 1;
        return Object.freeze({
          ok: true,
          conflict: true,
          conflictResolved: true,
          result: policyDeny.result != null ? policyDeny.result : "DENY",
          source: KDE_SOURCE.POLICY,
          priority: policyDeny.priority,
          strategy: "conflictPolicyWins",
          inputs: Object.freeze(normalized)
        });
      }
    }

    let chosen = null;
    let conflict = false;

    if (strategy === KDE_STRATEGY.FIRST_MATCH) {
      chosen = normalized[0];
    } else if (strategy === KDE_STRATEGY.HIGHEST_PRIORITY) {
      const sorted = [...normalized].sort(
        (a, b) => KDE_PRIORITY_RANK[b.priority] - KDE_PRIORITY_RANK[a.priority]
      );
      const topRank = KDE_PRIORITY_RANK[sorted[0].priority];
      const top = sorted.filter((c) => KDE_PRIORITY_RANK[c.priority] === topRank);
      if (top.length > 1) {
        const results = new Set(top.map((c) => stableStringify(c.result)));
        if (results.size > 1) {
          conflict = true;
          conflictCount += 1;
        }
        // DENY wins among same priority
        chosen = top.find((c) => c.deny) || top[0];
      } else {
        chosen = sorted[0];
      }
    } else if (strategy === KDE_STRATEGY.MAJORITY) {
      const counts = new Map();
      for (const c of normalized) {
        const key = stableStringify(c.result);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      let bestKey = null;
      let bestCount = -1;
      // deterministic: sort keys
      for (const key of [...counts.keys()].sort()) {
        const n = counts.get(key);
        if (n > bestCount) {
          bestCount = n;
          bestKey = key;
        }
      }
      chosen = normalized.find((c) => stableStringify(c.result) === bestKey);
      if ([...counts.values()].filter((n) => n === bestCount).length > 1) {
        conflict = true;
        conflictCount += 1;
      }
    } else if (strategy === KDE_STRATEGY.WEIGHTED) {
      const scores = new Map();
      for (const c of normalized) {
        const key = stableStringify(c.result);
        scores.set(key, (scores.get(key) || 0) + c.weight);
      }
      let bestKey = null;
      let bestScore = -Infinity;
      for (const key of [...scores.keys()].sort()) {
        const s = scores.get(key);
        if (s > bestScore) {
          bestScore = s;
          bestKey = key;
        }
      }
      chosen = normalized.find((c) => stableStringify(c.result) === bestKey);
    } else if (strategy === KDE_STRATEGY.CUSTOM) {
      if (typeof meta.customResolver !== "function") {
        return Object.freeze({ ok: false, error: "missing_custom_resolver" });
      }
      try {
        const custom = meta.customResolver(normalized, meta);
        if (!custom || custom.ok === false) {
          return Object.freeze({
            ok: false,
            error: (custom && custom.error) || "custom_resolver_failed"
          });
        }
        chosen = custom.chosen || custom;
      } catch (err) {
        return Object.freeze({
          ok: false,
          error: "custom_resolver_failed",
          message: err && err.message ? String(err.message) : "unknown"
        });
      }
    }

    if (!chosen) {
      return Object.freeze({ ok: false, error: "resolve_failed", strategy });
    }

    return Object.freeze({
      ok: true,
      conflict,
      result: chosen.result,
      source: chosen.source,
      priority: chosen.priority,
      strategy,
      inputs: Object.freeze(normalized)
    });
  }

  function compare(a, b, meta = {}) {
    const blocked = gate(meta, "compare");
    if (blocked) return blocked;
    if (!a || !b) return Object.freeze({ ok: false, error: "missing_compare_args" });

    const pa = normalizePriority(a.priority || KDE_PRIORITY.NORMAL);
    const pb = normalizePriority(b.priority || KDE_PRIORITY.NORMAL);
    if (!pa || !pb) return Object.freeze({ ok: false, error: "invalid_priority" });

    const rankDiff = KDE_PRIORITY_RANK[pa] - KDE_PRIORITY_RANK[pb];
    const sameResult = stableStringify(a.result) === stableStringify(b.result);

    return Object.freeze({
      ok: true,
      sameResult,
      higher:
        rankDiff > 0 ? "a" : rankDiff < 0 ? "b" : "tie",
      priorityA: pa,
      priorityB: pb,
      rankDiff
    });
  }

  function evaluate(input = {}, meta = {}) {
    const blocked = gate(meta, "evaluate");
    if (blocked) return blocked;

    const started = nowMs(meta);
    const decisionType = String(input.decisionType || input.type || "generic").trim();
    const strategy = String(input.strategy || meta.strategy || defaultStrategy);

    const contextIn =
      input.context != null && typeof input.context === "object"
        ? input.context
        : {};
    const contextJson = stableStringify(contextIn);
    const context = deepFreezeClone(contextIn);

    // Collect inputs from bridges / provided arrays
    const candidates = [];

    if (Array.isArray(input.inputs)) {
      for (const c of input.inputs) candidates.push(c);
    }

    if (input.ruleResult != null) {
      candidates.push({
        source: KDE_SOURCE.RULE,
        priority: input.rulePriority || KDE_PRIORITY.NORMAL,
        result: input.ruleResult,
        matched: input.ruleMatched !== false
      });
    }
    if (input.policyResult != null) {
      candidates.push({
        source: KDE_SOURCE.POLICY,
        priority: input.policyPriority || KDE_PRIORITY.HIGH,
        result: input.policyResult,
        deny:
          input.policyResult === "DENY" ||
          (input.policyResult && input.policyResult.effect === "DENY"),
        matched: input.policyMatched !== false
      });
    }
    if (input.stateResult != null) {
      candidates.push({
        source: KDE_SOURCE.STATE,
        priority: input.statePriority || KDE_PRIORITY.NORMAL,
        result: input.stateResult,
        matched: true
      });
    }
    if (input.aiSuggestion != null) {
      // AI only suggests — never sole authority
      candidates.push({
        source: KDE_SOURCE.AI,
        priority: input.aiPriority || KDE_PRIORITY.LOW,
        result: input.aiSuggestion,
        suggestion: true,
        weight: typeof input.aiWeight === "number" ? input.aiWeight : 0.25,
        matched: true
      });
    }
    if (input.runtimeResult != null) {
      candidates.push({
        source: KDE_SOURCE.RUNTIME,
        priority: input.runtimePriority || KDE_PRIORITY.NORMAL,
        result: input.runtimeResult,
        matched: true
      });
    }
    if (input.workflowResult != null) {
      candidates.push({
        source: KDE_SOURCE.WORKFLOW,
        priority: input.workflowPriority || KDE_PRIORITY.NORMAL,
        result: input.workflowResult,
        matched: true
      });
    }

    if (meta.aiDecidesAlone === true || input.aiDecidesAlone === true) {
      return Object.freeze({
        ok: false,
        error: "ai_alone_decision_rejected",
        aiMayOnlySuggest: true
      });
    }

    const resolved = resolve(candidates, {
      ...meta,
      strategy,
      customResolver: input.customResolver || meta.customResolver
    });
    if (!resolved.ok) return resolved;

    // Deterministic id from fingerprint (optional reuse)
    const fingerprint = stableStringify({
      decisionType,
      strategy,
      context: contextJson,
      candidates: candidates.map((c) => ({
        source: c.source,
        priority: c.priority,
        result: c.result,
        matched: c.matched !== false
      }))
    });

    let decisionId = fingerprintCache.get(fingerprint);
    if (!decisionId) {
      decisionId =
        input.decisionId != null && String(input.decisionId).trim()
          ? String(input.decisionId).trim()
          : makeId("decision");
      fingerprintCache.set(fingerprint, decisionId);
    }

    const desc = createDecisionDescriptor({
      decisionId,
      decisionType,
      context,
      priority: resolved.priority || KDE_PRIORITY.NORMAL,
      source: resolved.source || "decision_engine",
      result: resolved.result,
      timestamp: nowMs(meta),
      correlationId: input.correlationId,
      nowMs: nowMs(meta)
    });
    if (!desc.ok) return Object.freeze(desc);

    decisions.set(desc.descriptor.decisionId, desc.descriptor);
    decisionCount += 1;
    const elapsed = Math.max(0, nowMs(meta) - started);
    evaluationDurationSumMs += elapsed;

    const isDeny =
      resolved.result === "DENY" ||
      resolved.result === false ||
      (resolved.result &&
        typeof resolved.result === "object" &&
        resolved.result.effect === "DENY");
    if (isDeny) denyCount += 1;

    const ruleResults = candidates
      .filter((c) => c.source === KDE_SOURCE.RULE)
      .map((c) => c.result);
    const policyResults = candidates
      .filter((c) => c.source === KDE_SOURCE.POLICY)
      .map((c) => c.result);

    recordAudit({
      decisionId: desc.descriptor.decisionId,
      context,
      strategy: resolved.strategy || strategy,
      ruleResults,
      policyResults,
      finalDecision: desc.descriptor,
      evaluatedAt: nowMs(meta)
    });

    // prove context not mutated
    if (stableStringify(contextIn) !== contextJson) {
      return Object.freeze({ ok: false, error: "context_mutated" });
    }

    return Object.freeze({
      ok: true,
      decision: desc.descriptor,
      conflict: !!resolved.conflict,
      strategy: resolved.strategy || strategy,
      durationMs: elapsed,
      executesCommands: false,
      createsEvents: false,
      executesBusinessLogic: false,
      aiMayOnlySuggest: true,
      deterministic: true
    });
  }

  function getDecision(decisionId) {
    const d = decisions.get(String(decisionId || "").trim());
    if (!d) return Object.freeze({ ok: false, error: "decision_not_found" });
    return Object.freeze({ ok: true, decision: d });
  }

  function registerStrategy(name, meta = {}) {
    const blocked = gate(meta, "registerStrategy");
    if (blocked) return blocked;
    const n = String(name || "").trim();
    if (!n) return Object.freeze({ ok: false, error: "missing_strategy" });
    registeredStrategies.add(n);
    return Object.freeze({ ok: true, strategy: n });
  }

  function dispatchCommand() {
    return Object.freeze({
      ok: false,
      error: "command_creation_rejected",
      executesCommands: false
    });
  }

  function emitEvent() {
    return Object.freeze({
      ok: false,
      error: "event_creation_rejected",
      createsEvents: false
    });
  }

  function metrics() {
    return Object.freeze({
      decisionCount,
      conflictCount,
      averageEvaluationMs:
        decisionCount > 0 ? evaluationDurationSumMs / decisionCount : 0,
      strategyCount: registeredStrategies.size,
      denyCount,
      engineLoad:
        decisionCount > 0
          ? Number((evaluationDurationSumMs / decisionCount).toFixed(4))
          : 0
    });
  }

  function decisionAudit() {
    return Object.freeze([...decisionAuditLog]);
  }

  function status() {
    return Object.freeze({
      active,
      singleton: true,
      soleDecisionAuthority: true,
      decisionCount: decisions.size,
      executesCommands: false,
      createsEvents: false,
      executesBusinessLogic: false,
      aiMayOnlySuggest: true,
      deterministic: true,
      distinctFromAiDecisionEngine0028: true,
      strategies: Object.freeze([...registeredStrategies])
    });
  }

  function isActive() {
    return active === true;
  }

  function shutdown() {
    active = false;
    if (activeKernelDecisionEngine === api) {
      activeKernelDecisionEngine = null;
    }
    return Object.freeze({ ok: true });
  }

  const api = {
    ok: true,
    evaluate,
    resolve,
    compare,
    getDecision,
    validate: validateDecision,
    registerStrategy,
    dispatchCommand,
    emitEvent,
    metrics,
    decisionAudit,
    status,
    isActive,
    shutdown,
    soleDecisionAuthority: true,
    executesCommands: false,
    createsEvents: false,
    executesBusinessLogic: false,
    aiMayOnlySuggest: true,
    deterministic: true,
    distinctFromAiDecisionEngine0028: true
  };

  activeKernelDecisionEngine = api;
  return Object.freeze(api);
}

function clearKernelDecisionSingletonForTest() {
  if (activeKernelDecisionEngine) {
    try {
      activeKernelDecisionEngine.shutdown();
    } catch (_err) {
      /* ignore */
    }
  }
  activeKernelDecisionEngine = null;
}

module.exports = {
  KDE_COMPONENT,
  KDE_COMPONENT_ORDER,
  KDE_DESCRIPTOR_FIELDS,
  KDE_SOURCE,
  KDE_PRIORITY,
  KDE_PRIORITY_RANK,
  KDE_STRATEGY,
  KDE_AUTHORIZED_SOURCES,
  KDE_FLAGS,
  KDE_PUBLIC_API,
  KDE_RUNTIME_ANCHORS,
  soleDecisionAuthority: true,
  executesCommands: false,
  createsEvents: false,
  executesBusinessLogic: false,
  aiMayOnlySuggest: true,
  deterministic: true,
  distinctFromAiDecisionEngine0028: true,
  createDecisionDescriptor,
  validateDecision,
  createKernelDecisionEngine,
  // alias for clarity in contracts
  createDecisionEngine: createKernelDecisionEngine,
  clearKernelDecisionSingletonForTest,
  clearDecisionSingletonForTest: clearKernelDecisionSingletonForTest,
  getActiveKernelDecisionEngine: () => activeKernelDecisionEngine
};
