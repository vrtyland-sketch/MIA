"use strict";

/**
 * Master Canon 0025 — Procedural Memory: skills, workflows, automation.
 */

const crypto = require("crypto");
const {
  createMemoryRecord,
  validateMemoryRecord,
  MEMORY_TYPE,
  MEMORY_LIFECYCLE,
  MEMORY_RETENTION
} = require("./memorySystem");

const PM_COMPONENT = Object.freeze({
  SKILL_LIBRARY: "skill_library",
  PROCEDURE_ENGINE: "procedure_engine",
  WORKFLOW_MANAGER: "workflow_manager",
  STRATEGY_LIBRARY: "strategy_library",
  MACRO_ENGINE: "macro_engine",
  AUTOMATION_ENGINE: "automation_engine",
  OPTIMIZATION_ENGINE: "optimization_engine",
  SKILL_EVALUATOR: "skill_evaluator",
  SKILL_VERSIONING: "skill_versioning",
  LEARNING_PIPELINE: "learning_pipeline",
  PROCEDURE_INDEX: "procedure_index",
  PROCEDURE_SEARCH: "procedure_search",
  PROCEDURAL_API: "procedural_api"
});

const PM_COMPONENT_ORDER = Object.freeze(Object.values(PM_COMPONENT));

const PM_ENTRY_KIND = Object.freeze({
  SKILL: "skill",
  PROCEDURE: "procedure",
  WORKFLOW: "workflow",
  STRATEGY: "strategy",
  MACRO: "macro"
});

const SKILL_DOMAIN = Object.freeze({
  OBS: "obs",
  OVERLAY: "overlay",
  BATTLE: "battle",
  GRAPHICS: "graphics",
  API: "api",
  EVENT_BUS: "event_bus",
  STREAM: "stream"
});

const PROCEDURE_ORIGIN = Object.freeze({
  MANUAL: "manual",
  AI_ANALYSIS: "ai_analysis",
  REPEATED_USE: "repeated_use",
  DOCUMENTATION_IMPORT: "documentation_import",
  ADMIN_APPROVAL: "admin_approval"
});

const PM_OPERATION = Object.freeze({
  PUT: "put",
  GET: "get",
  EXECUTE: "execute",
  SEARCH: "search",
  VERSION: "version",
  VALIDATE: "validate",
  AUTOMATE: "automate"
});

const PM_FORBIDDEN_ACTIVITIES = Object.freeze([
  "store_personal_memories",
  "store_semantic_facts",
  "bypass_decision_engine",
  "mutate_system_architecture",
  "register_unvalidated_procedure"
]);

const PM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-memory-core/proceduralMemory.js",
  "shared/mia-memory-core/semanticMemory.js",
  "scripts/MIA_DELIVERY_RUNTIME.js"
]);

function normalizeSteps(steps = []) {
  return Object.freeze(
    steps.map((step, idx) =>
      Object.freeze({
        stepId: step.stepId || `step-${idx + 1}`,
        label: String(step.label || step.action || `step_${idx + 1}`),
        action: String(step.action || step.label || "noop"),
        params: Object.freeze(step.params || {})
      })
    )
  );
}

function validateProcedure(candidate = {}) {
  const errors = [];
  if (!String(candidate.name || "").trim()) errors.push("missing_name");
  if (!String(candidate.purpose || "").trim()) errors.push("missing_purpose");
  if (!Array.isArray(candidate.steps) || candidate.steps.length === 0) {
    errors.push("missing_steps");
  }
  if (!candidate.validated && candidate.origin !== PROCEDURE_ORIGIN.ADMIN_APPROVAL) {
    errors.push("not_validated");
  }
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    component: PM_COMPONENT.LEARNING_PIPELINE
  });
}

function createProcedure(input = {}) {
  const name = String(input.name || "").trim();
  const purpose = String(input.purpose || "").trim();
  if (!name) throw new Error("procedure name is required");
  if (!purpose) throw new Error("procedure purpose is required");

  const steps = normalizeSteps(input.steps || []);
  if (steps.length === 0) throw new Error("procedure steps are required");

  const validated = input.validated === true || input.origin === PROCEDURE_ORIGIN.ADMIN_APPROVAL;
  const validation = validateProcedure({ ...input, name, purpose, steps, validated });
  if (!validation.ok && !input.force) {
    throw new Error(`invalid procedure: ${validation.errors.join(",")}`);
  }

  const record = createMemoryRecord({
    what: name,
    why: `procedural:${input.domain || "general"}`,
    when: Date.now(),
    retention: MEMORY_RETENTION.PERMANENT,
    memoryType: MEMORY_TYPE.PROCEDURAL,
    lifecycle: MEMORY_LIFECYCLE.LONG_TERM
  });
  const recordValidation = validateMemoryRecord(record);
  if (!recordValidation.ok) {
    throw new Error(`invalid procedure record: ${recordValidation.errors.join(",")}`);
  }

  return Object.freeze({
    entryId: input.entryId || `procedure-${crypto.randomUUID()}`,
    kind: PM_ENTRY_KIND.PROCEDURE,
    procedureId: input.procedureId || `proc-${crypto.randomUUID()}`,
    name,
    purpose,
    domain: Object.values(SKILL_DOMAIN).includes(input.domain) ? input.domain : SKILL_DOMAIN.STREAM,
    inputs: Object.freeze(input.inputs || {}),
    prerequisites: Object.freeze(input.prerequisites || []),
    steps,
    expectedOutcome: String(input.expectedOutcome || input.result || "").trim() || null,
    terminationConditions: Object.freeze(input.terminationConditions || []),
    version: input.version != null ? Number(input.version) : 1,
    validated,
    origin: Object.values(PROCEDURE_ORIGIN).includes(input.origin)
      ? input.origin
      : PROCEDURE_ORIGIN.MANUAL,
    tags: Object.freeze((input.tags || []).map(String)),
    author: input.author || "system",
    record,
    auditId: `procedure-audit-${crypto.randomUUID()}`
  });
}

function createSkill(input = {}) {
  const name = String(input.name || "").trim();
  if (!name) throw new Error("skill name is required");

  return Object.freeze({
    entryId: input.entryId || `skill-${crypto.randomUUID()}`,
    kind: PM_ENTRY_KIND.SKILL,
    skillId: input.skillId || `skill-${crypto.randomUUID()}`,
    name,
    domain: Object.values(SKILL_DOMAIN).includes(input.domain) ? input.domain : SKILL_DOMAIN.API,
    procedureIds: Object.freeze((input.procedureIds || []).map(String)),
    version: input.version != null ? Number(input.version) : 1,
    record: createMemoryRecord({
      what: name,
      why: "procedural_skill",
      when: Date.now(),
      retention: MEMORY_RETENTION.PERMANENT,
      memoryType: MEMORY_TYPE.PROCEDURAL,
      lifecycle: MEMORY_LIFECYCLE.LONG_TERM
    }),
    auditId: `skill-audit-${crypto.randomUUID()}`
  });
}

function createWorkflow(input = {}) {
  const name = String(input.name || "").trim();
  if (!name) throw new Error("workflow name is required");
  const procedureIds = (input.procedureIds || []).map(String);
  if (procedureIds.length === 0) throw new Error("workflow requires procedureIds");

  return Object.freeze({
    entryId: input.entryId || `workflow-${crypto.randomUUID()}`,
    kind: PM_ENTRY_KIND.WORKFLOW,
    workflowId: input.workflowId || `workflow-${crypto.randomUUID()}`,
    name,
    procedureIds: Object.freeze(procedureIds),
    tags: Object.freeze((input.tags || []).map(String)),
    version: input.version != null ? Number(input.version) : 1,
    record: createMemoryRecord({
      what: name,
      why: "procedural_workflow",
      when: Date.now(),
      retention: MEMORY_RETENTION.PERMANENT,
      memoryType: MEMORY_TYPE.PROCEDURAL,
      lifecycle: MEMORY_LIFECYCLE.LONG_TERM
    }),
    auditId: `workflow-audit-${crypto.randomUUID()}`
  });
}

function createStrategy(input = {}) {
  const name = String(input.name || "").trim();
  const rule = String(input.rule || input.body || "").trim();
  if (!name) throw new Error("strategy name is required");
  if (!rule) throw new Error("strategy rule is required");

  return Object.freeze({
    entryId: input.entryId || `strategy-${crypto.randomUUID()}`,
    kind: PM_ENTRY_KIND.STRATEGY,
    strategyId: input.strategyId || `strategy-${crypto.randomUUID()}`,
    name,
    rule,
    domain: input.domain || SKILL_DOMAIN.BATTLE,
    version: input.version != null ? Number(input.version) : 1,
    record: createMemoryRecord({
      what: name,
      why: `strategy:${input.domain || "general"}`,
      when: Date.now(),
      retention: MEMORY_RETENTION.PERMANENT,
      memoryType: MEMORY_TYPE.PROCEDURAL,
      lifecycle: MEMORY_LIFECYCLE.LONG_TERM
    }),
    auditId: `strategy-audit-${crypto.randomUUID()}`
  });
}

function createMacro(input = {}) {
  const name = String(input.name || "").trim();
  const steps = normalizeSteps(input.steps || []);
  if (!name) throw new Error("macro name is required");
  if (steps.length === 0) throw new Error("macro steps are required");

  return Object.freeze({
    entryId: input.entryId || `macro-${crypto.randomUUID()}`,
    kind: PM_ENTRY_KIND.MACRO,
    macroId: input.macroId || `macro-${crypto.randomUUID()}`,
    name,
    steps,
    version: input.version != null ? Number(input.version) : 1,
    record: createMemoryRecord({
      what: name,
      why: "procedural_macro",
      when: Date.now(),
      retention: MEMORY_RETENTION.PERMANENT,
      memoryType: MEMORY_TYPE.PROCEDURAL,
      lifecycle: MEMORY_LIFECYCLE.LONG_TERM
    }),
    auditId: `macro-audit-${crypto.randomUUID()}`
  });
}

function evaluateSkill(metrics = {}) {
  const successCount = Number(metrics.successCount || 0);
  const failureCount = Number(metrics.failureCount || 0);
  const totalRuns = successCount + failureCount;
  const successRate = totalRuns > 0 ? successCount / totalRuns : 0;
  const errorRate = totalRuns > 0 ? failureCount / totalRuns : 0;
  const averageTimeMs = Number(metrics.averageTimeMs || 0);
  const usageCount = Number(metrics.usageCount || totalRuns);
  const reliabilityScore = Math.round((successRate * 0.6 + (1 - errorRate) * 0.4) * 1000) / 1000;

  return Object.freeze({
    successRate,
    averageTimeMs,
    errorRate,
    usageCount,
    reliabilityScore,
    component: PM_COMPONENT.SKILL_EVALUATOR
  });
}

function optimizeProcedure(procedure = {}, stats = {}) {
  const stepCount = Array.isArray(procedure.steps) ? procedure.steps.length : 0;
  const successRate = stats.successRate != null ? Number(stats.successRate) : 1;
  const averageTimeMs = stats.averageTimeMs != null ? Number(stats.averageTimeMs) : 0;
  const errorRate = stats.errorRate != null ? Number(stats.errorRate) : 0;

  const suggestions = [];
  if (stepCount > 8) suggestions.push("reduce_steps");
  if (averageTimeMs > 5000) suggestions.push("parallelize_slow_steps");
  if (errorRate > 0.2) suggestions.push("add_validation_step");
  if (successRate < 0.7) suggestions.push("review_prerequisites");

  return Object.freeze({
    procedureId: procedure.procedureId || procedure.entryId,
    stepCount,
    successRate,
    averageTimeMs,
    errorRate,
    suggestions: Object.freeze(suggestions),
    component: PM_COMPONENT.OPTIMIZATION_ENGINE
  });
}

function createProceduralMemoryStore() {
  const entries = new Map();
  const versions = new Map();
  const automations = new Map();
  const metrics = new Map();
  const index = new Map();

  function allEntries() {
    return Array.from(entries.values());
  }

  function indexEntry(entry) {
    const keys = new Set();
    if (entry.name) keys.add(String(entry.name).toLowerCase());
    if (entry.domain) keys.add(String(entry.domain).toLowerCase());
    if (Array.isArray(entry.tags)) {
      for (const tag of entry.tags) keys.add(String(tag).toLowerCase());
    }
    for (const key of keys) {
      const bucket = index.get(key) || [];
      if (!bucket.includes(entry.entryId)) bucket.push(entry.entryId);
      index.set(key, bucket);
    }
  }

  function put(entryInput = {}) {
    let entry;
    if (entryInput.kind === PM_ENTRY_KIND.SKILL) {
      entry = createSkill(entryInput);
    } else if (entryInput.kind === PM_ENTRY_KIND.WORKFLOW) {
      entry = createWorkflow(entryInput);
    } else if (entryInput.kind === PM_ENTRY_KIND.STRATEGY || entryInput.rule) {
      entry = createStrategy(entryInput);
    } else if (entryInput.kind === PM_ENTRY_KIND.MACRO) {
      entry = createMacro(entryInput);
    } else {
      entry = createProcedure(entryInput);
    }

    entries.set(entry.entryId, entry);
    indexEntry(entry);
    return Object.freeze({ ok: true, entry, operation: PM_OPERATION.PUT });
  }

  function get(entryId) {
    const entry = entries.get(String(entryId));
    if (!entry) return Object.freeze({ ok: false, error: "not_found" });
    return Object.freeze({ ok: true, entry, operation: PM_OPERATION.GET });
  }

  return {
    put,
    get,
    list(kind = null) {
      const all = allEntries();
      return kind ? all.filter((e) => e.kind === kind) : all;
    },
    registerProcedure(input = {}) {
      const validation = validateProcedure(input);
      if (!validation.ok) {
        return Object.freeze({ ok: false, validation, error: "validation_failed" });
      }
      const result = put({ ...input, validated: true, kind: PM_ENTRY_KIND.PROCEDURE });
      return Object.freeze({
        ...result,
        validation,
        component: PM_COMPONENT.LEARNING_PIPELINE
      });
    },
    versionProcedure(entryId, patch = {}) {
      const current = entries.get(String(entryId));
      if (!current || current.kind !== PM_ENTRY_KIND.PROCEDURE) {
        return Object.freeze({ ok: false, error: "not_found" });
      }

      const history = versions.get(entryId) || [];
      history.push(Object.freeze({ ...current }));
      versions.set(entryId, history);

      const nextVersion = (current.version || 1) + 1;
      const updated = createProcedure({
        ...current,
        ...patch,
        entryId: `${entryId}:v${nextVersion}`,
        procedureId: current.procedureId,
        version: nextVersion,
        validated: true,
        force: true
      });

      entries.set(updated.entryId, updated);
      indexEntry(updated);
      entries.set(entryId, Object.freeze({ ...current, supersededBy: updated.entryId }));

      return Object.freeze({
        ok: true,
        entry: updated,
        previousVersion: current.version || 1,
        operation: PM_OPERATION.VERSION,
        component: PM_COMPONENT.SKILL_VERSIONING
      });
    },
    recordExecution(procedureId, result = {}) {
      const key = String(procedureId);
      const current = metrics.get(key) || {
        successCount: 0,
        failureCount: 0,
        totalTimeMs: 0,
        usageCount: 0
      };
      const success = result.success !== false;
      const durationMs = Number(result.durationMs || 0);
      const next = {
        successCount: current.successCount + (success ? 1 : 0),
        failureCount: current.failureCount + (success ? 0 : 1),
        totalTimeMs: current.totalTimeMs + durationMs,
        usageCount: current.usageCount + 1
      };
      metrics.set(key, next);
      const evaluation = evaluateSkill({
        ...next,
        averageTimeMs: next.usageCount > 0 ? next.totalTimeMs / next.usageCount : 0
      });
      return Object.freeze({ ok: true, metrics: next, evaluation });
    },
    optimize(entryId) {
      const entry = entries.get(String(entryId));
      if (!entry || entry.kind !== PM_ENTRY_KIND.PROCEDURE) {
        return Object.freeze({ ok: false, error: "not_found" });
      }
      const stat = metrics.get(entry.procedureId || entry.entryId) || {};
      const evaluation = evaluateSkill({
        successCount: stat.successCount,
        failureCount: stat.failureCount,
        averageTimeMs: stat.usageCount > 0 ? stat.totalTimeMs / stat.usageCount : 0,
        usageCount: stat.usageCount
      });
      const optimization = optimizeProcedure(entry, evaluation);
      return Object.freeze({ ok: true, optimization });
    },
    addAutomation(trigger, procedureId, options = {}) {
      const ruleId = options.ruleId || `auto-${crypto.randomUUID()}`;
      const rule = Object.freeze({
        ruleId,
        trigger: String(trigger),
        procedureId: String(procedureId),
        enabled: options.enabled !== false,
        auditId: `auto-audit-${crypto.randomUUID()}`
      });
      automations.set(ruleId, rule);
      return Object.freeze({
        ok: true,
        rule,
        operation: PM_OPERATION.AUTOMATE,
        component: PM_COMPONENT.AUTOMATION_ENGINE
      });
    },
    runAutomation(trigger, context = {}) {
      const matches = Array.from(automations.values()).filter(
        (r) => r.enabled && r.trigger === String(trigger)
      );
      const executed = [];
      for (const rule of matches) {
        const proc = allEntries().find(
          (e) =>
            e.kind === PM_ENTRY_KIND.PROCEDURE &&
            (e.procedureId === rule.procedureId || e.entryId === rule.procedureId)
        );
        if (!proc) continue;
        executed.push(
          Object.freeze({
            ruleId: rule.ruleId,
            procedureId: proc.procedureId,
            steps: proc.steps,
            context: Object.freeze(context)
          })
        );
      }
      return Object.freeze({
        ok: true,
        executed: Object.freeze(executed),
        operation: PM_OPERATION.EXECUTE,
        component: PM_COMPONENT.AUTOMATION_ENGINE
      });
    },
    search(query = {}) {
      const q = String(query.q || query.name || "").toLowerCase();
      const domain = query.domain ? String(query.domain) : null;
      const tag = query.tag ? String(query.tag).toLowerCase() : null;
      const author = query.author ? String(query.author) : null;
      const minVersion = query.minVersion != null ? Number(query.minVersion) : null;
      const minReliability =
        query.minReliability != null ? Number(query.minReliability) : null;

      let results = allEntries();
      if (q) {
        const ids = index.get(q) || [];
        results =
          ids.length > 0
            ? ids.map((id) => entries.get(id)).filter(Boolean)
            : results.filter((e) => String(e.name || "").toLowerCase().includes(q));
      }
      if (domain) results = results.filter((e) => e.domain === domain);
      if (tag) results = results.filter((e) => (e.tags || []).map((t) => t.toLowerCase()).includes(tag));
      if (author) results = results.filter((e) => e.author === author);
      if (minVersion != null) results = results.filter((e) => (e.version || 1) >= minVersion);

      if (minReliability != null) {
        results = results.filter((e) => {
          if (e.kind !== PM_ENTRY_KIND.PROCEDURE) return true;
          const stat = metrics.get(e.procedureId || e.entryId);
          if (!stat) return false;
          const evaluation = evaluateSkill({
            successCount: stat.successCount,
            failureCount: stat.failureCount,
            usageCount: stat.usageCount
          });
          return evaluation.reliabilityScore >= minReliability;
        });
      }

      return Object.freeze({
        ok: true,
        results: Object.freeze(results),
        count: results.length,
        operation: PM_OPERATION.SEARCH,
        component: PM_COMPONENT.PROCEDURE_SEARCH
      });
    },
    indexSnapshot() {
      return Object.freeze(
        Array.from(index.entries()).map(([key, ids]) =>
          Object.freeze({ key, entryIds: Object.freeze(ids) })
        )
      );
    }
  };
}

function createProceduralApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    readOnly: options.readOnly !== false,
    data,
    component: PM_COMPONENT.PROCEDURAL_API
  });
}

function assertProceduralForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !PM_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

module.exports = {
  PM_COMPONENT,
  PM_COMPONENT_ORDER,
  PM_ENTRY_KIND,
  SKILL_DOMAIN,
  PROCEDURE_ORIGIN,
  PM_OPERATION,
  PM_FORBIDDEN_ACTIVITIES,
  PM_RUNTIME_ANCHORS,
  validateProcedure,
  createProcedure,
  createSkill,
  createWorkflow,
  createStrategy,
  createMacro,
  evaluateSkill,
  optimizeProcedure,
  createProceduralMemoryStore,
  createProceduralApiResponse,
  assertProceduralForbiddenActivity
};
