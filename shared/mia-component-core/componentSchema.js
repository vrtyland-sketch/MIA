"use strict";

/**
 * Master Canon 0004 — mandatory component fields (§4) + validation.
 */

const { COMPONENT_LIFECYCLE, isComponentLifecycleState } = require("./componentLifecycle");
const { COMPONENT_TYPE, isComponentType } = require("./componentTypes");

const REQUIRED_COMPONENT_FIELDS = Object.freeze([
  "componentId",
  "name",
  "version",
  "purpose",
  "inputs",
  "outputs",
  "state",
  "dependencies",
  "logging",
  "configuration"
]);

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeStringList(values) {
  if (!Array.isArray(values)) return [];
  return values.map((v) => safeString(v)).filter(Boolean);
}

function validateComponentRecord(record = {}) {
  const errors = [];
  if (!record || typeof record !== "object") {
    return { ok: false, errors: ["not_an_object"], normalized: null };
  }

  const componentId = safeString(record.componentId);
  if (!componentId) errors.push("missing_componentId");

  const name = safeString(record.name);
  if (!name) errors.push("missing_name");

  const version = safeString(record.version);
  if (!version) errors.push("missing_version");

  const purpose = safeString(record.purpose);
  if (!purpose) errors.push("missing_purpose");

  const inputs = normalizeStringList(record.inputs);
  if (inputs.length === 0) errors.push("missing_inputs");

  const outputs = normalizeStringList(record.outputs);
  if (outputs.length === 0) errors.push("missing_outputs");

  const state = safeString(record.state);
  if (!isComponentLifecycleState(state)) errors.push("invalid_state");

  const dependencies = normalizeStringList(record.dependencies);

  const logging = safeString(record.logging);
  if (!logging) errors.push("missing_logging");

  const configuration = record.configuration;
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
    errors.push("invalid_configuration");
  }

  const componentType = record.componentType != null ? safeString(record.componentType) : "";
  if (componentType && !isComponentType(componentType)) errors.push("invalid_componentType");

  const normalized =
    errors.length === 0
      ? {
          componentId,
          name,
          version,
          purpose,
          inputs,
          outputs,
          state,
          dependencies,
          logging,
          configuration: { ...configuration },
          ...(componentType ? { componentType } : {}),
          ...(record.module ? { module: safeString(record.module) } : {}),
          ...(record.listensTo ? { listensTo: normalizeStringList(record.listensTo) } : {}),
          ...(record.emits ? { emits: normalizeStringList(record.emits) } : {}),
          ...(record.errors ? { errors: normalizeStringList(record.errors) } : {})
        }
      : null;

  return { ok: errors.length === 0, errors, normalized };
}

function createComponentRecord(input = {}) {
  const draft = {
    componentId: input.componentId,
    name: input.name,
    version: input.version || "1.0",
    purpose: input.purpose,
    inputs: input.inputs || [],
    outputs: input.outputs || [],
    state: input.state || COMPONENT_LIFECYCLE.RUNNING,
    dependencies: input.dependencies || [],
    logging: input.logging || "mia-errors",
    configuration: input.configuration || { sources: ["env"] },
    componentType: input.componentType,
    module: input.module,
    listensTo: input.listensTo,
    emits: input.emits,
    errors: input.errors
  };
  return validateComponentRecord(draft);
}

module.exports = {
  REQUIRED_COMPONENT_FIELDS,
  COMPONENT_LIFECYCLE,
  COMPONENT_TYPE,
  validateComponentRecord,
  createComponentRecord
};
