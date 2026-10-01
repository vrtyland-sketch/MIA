"use strict";

/**
 * Master Canon 0012 — Event Validator infrastructure, rules, and validation reports.
 * Never mutates payload — rejects invalid events only.
 */

const crypto = require("crypto");
const { EVENT_SCHEMA_VERSION, validateEventRecord } = require("./eventSchema");
const { getEventTypeDefinition } = require("./eventRegistry");
const { ensureCorrelationId } = require("./eventBusInfrastructure");

const VALIDATOR_COMPONENT = Object.freeze({
  SCHEMA: "schema_validator",
  METADATA: "metadata_validator",
  PAYLOAD: "payload_validator",
  VERSION: "version_validator",
  INTEGRITY: "integrity_validator",
  SECURITY: "security_validator",
  RULE: "rule_validator",
  SIZE: "size_validator",
  TIMESTAMP: "timestamp_validator",
  RESULT_BUILDER: "result_builder",
  VALIDATION_LOGGER: "validation_logger"
});

const VALIDATOR_COMPONENT_ORDER = Object.freeze(Object.values(VALIDATOR_COMPONENT));

const VALIDATION_RESULT = Object.freeze({
  VALID: "valid",
  VALID_WITH_WARNING: "valid_with_warning",
  INVALID: "invalid",
  SECURITY_BLOCKED: "security_blocked"
});

/** 0012 §5 — mandatory fields at validator boundary. */
const VALIDATOR_REQUIRED_FIELDS = Object.freeze([
  "eventId",
  "eventType",
  "source",
  "timestamp",
  "payload",
  "schemaVersion",
  "correlationId"
]);

const SUPPORTED_SCHEMA_VERSIONS = Object.freeze(["1.0"]);

const VALIDATOR_FORBIDDEN_ACTIVITIES = Object.freeze([
  "mutate_payload",
  "fill_business_data",
  "ai_decision",
  "persist_business_data",
  "route_events"
]);

const DEFAULT_MAX_PAYLOAD_BYTES = 256 * 1024;
const DEFAULT_MAX_OBJECT_DEPTH = 12;
const DEFAULT_MAX_TIMESTAMP_SKEW_MS = 24 * 60 * 60 * 1000;

/** Per-type payload rules (0012 §8) — structural only, no business tier logic. */
const PAYLOAD_RULES_BY_TYPE = Object.freeze({
  GIFT: Object.freeze({
    requiredPaths: [["user"], ["support", "giftName"]]
  }),
  GIFT_RECEIVED: Object.freeze({
    requiredPaths: [["user"], ["support", "giftName"]]
  }),
  COMMENT: Object.freeze({
    requiredPaths: [["user"], ["message"]]
  }),
  CHAT_MESSAGE: Object.freeze({
    requiredPaths: [["user"], ["message"]]
  }),
  AI_RESPONSE: Object.freeze({
    requiredPaths: [["model"], ["content"]]
  })
});

const VALIDATOR_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-event-core/eventValidator.js",
  "shared/mia-event-core/eventSchema.js",
  "scripts/MIA_INGEST_GUARD.js"
]);

const VALIDATOR_PIPELINE_AFTER_GATEWAY = Object.freeze([
  "event_gateway",
  "normalizer",
  "event_validator",
  "event_registry",
  "event_bus"
]);

const SECURITY_PATTERNS = Object.freeze([
  { id: "script_tag", pattern: /<script\b/i },
  { id: "javascript_uri", pattern: /javascript:/i },
  { id: "sql_union", pattern: /\bunion\s+select\b/i }
]);

function isValidationResult(value) {
  return typeof value === "string" && Object.values(VALIDATION_RESULT).includes(value);
}

function getAtPath(obj, path = []) {
  let cur = obj;
  for (const key of path) {
    if (!cur || typeof cur !== "object" || !(key in cur)) return undefined;
    cur = cur[key];
  }
  return cur;
}

function hasNonEmptyAtPath(obj, path = []) {
  const value = getAtPath(obj, path);
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function measureObjectDepth(value, depth = 0) {
  if (value == null || typeof value !== "object") return depth;
  if (Array.isArray(value)) {
    return value.reduce((max, item) => Math.max(max, measureObjectDepth(item, depth + 1)), depth);
  }
  return Object.keys(value).reduce(
    (max, key) => Math.max(max, measureObjectDepth(value[key], depth + 1)),
    depth
  );
}

function estimatePayloadBytes(payload) {
  try {
    return Buffer.byteLength(JSON.stringify(payload), "utf8");
  } catch (_err) {
    return Number.MAX_SAFE_INTEGER;
  }
}

function parseTimestampMs(value) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function collectSecurityIssues(payload) {
  const issues = [];
  const walk = (node, path = "") => {
    if (typeof node === "string") {
      for (const rule of SECURITY_PATTERNS) {
        if (rule.pattern.test(node)) {
          issues.push({ code: rule.id, path: path || "root" });
        }
      }
      return;
    }
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${path}[${index}]`));
      return;
    }
    for (const [key, val] of Object.entries(node)) {
      walk(val, path ? `${path}.${key}` : key);
    }
  };
  walk(payload);
  return issues;
}

function checkGiftIntegrity(payload = {}) {
  const support = payload.support || {};
  const coins = Number(support.coins ?? support.totalCoins);
  const giftValue = Number(support.giftValue ?? support.value);
  if (!Number.isFinite(coins) || !Number.isFinite(giftValue)) return [];
  if (coins > 0 && giftValue === 0) {
    return [{ code: "integrity_gift_value_mismatch", coins, giftValue }];
  }
  return [];
}

function normalizeValidatorInput(record = {}) {
  const timestamp =
    record.timestamp ||
    record.createdAt ||
    record.receiveTime ||
    (record.ts != null ? new Date(record.ts).toISOString() : null);

  return {
    ...record,
    eventId: record.eventId,
    eventType: record.eventType,
    source: record.source,
    timestamp,
    payload: record.payload,
    schemaVersion: record.schemaVersion || EVENT_SCHEMA_VERSION,
    correlationId: ensureCorrelationId({
      eventId: record.eventId,
      correlationId: record.correlationId,
      traceId: record.traceId
    }),
    metadata: record.metadata || null
  };
}

function validateEventCanon(record = {}, options = {}) {
  const startedAt = Date.now();
  const issues = [];
  const warnings = [];
  const input = normalizeValidatorInput(record);

  for (const field of VALIDATOR_REQUIRED_FIELDS) {
    if (input[field] == null || input[field] === "") {
      issues.push({ code: `missing_${field}`, component: VALIDATOR_COMPONENT.SCHEMA });
    }
  }

  const schemaCheck = validateEventRecord({
    eventId: input.eventId,
    eventType: input.eventType,
    createdAt: input.timestamp,
    source: input.source,
    target: input.target,
    priority: input.priority,
    payload: input.payload,
    state: input.state || "created",
    schemaVersion: input.schemaVersion,
    traceId: input.correlationId
  });

  if (!schemaCheck.ok) {
    for (const err of schemaCheck.errors) {
      issues.push({ code: err, component: VALIDATOR_COMPONENT.SCHEMA });
    }
  }

  const schemaVersion = String(input.schemaVersion || "");
  if (!SUPPORTED_SCHEMA_VERSIONS.includes(schemaVersion)) {
    issues.push({
      code: "unsupported_schema_version",
      component: VALIDATOR_COMPONENT.VERSION,
      schemaVersion
    });
  }

  const tsMs = parseTimestampMs(input.timestamp);
  const now = options.now != null ? Number(options.now) : Date.now();
  const maxSkew = options.maxTimestampSkewMs ?? DEFAULT_MAX_TIMESTAMP_SKEW_MS;
  if (tsMs == null) {
    issues.push({ code: "invalid_timestamp", component: VALIDATOR_COMPONENT.TIMESTAMP });
  } else if (Math.abs(now - tsMs) > maxSkew) {
    warnings.push({ code: "timestamp_skew", component: VALIDATOR_COMPONENT.TIMESTAMP, skewMs: now - tsMs });
  }

  const payload = input.payload && typeof input.payload === "object" ? input.payload : {};
  const maxBytes = options.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD_BYTES;
  const payloadBytes = estimatePayloadBytes(payload);
  if (payloadBytes > maxBytes) {
    issues.push({
      code: "payload_too_large",
      component: VALIDATOR_COMPONENT.SIZE,
      payloadBytes,
      maxBytes
    });
  }

  const depth = measureObjectDepth(payload);
  const maxDepth = options.maxObjectDepth ?? DEFAULT_MAX_OBJECT_DEPTH;
  if (depth > maxDepth) {
    issues.push({
      code: "payload_depth_exceeded",
      component: VALIDATOR_COMPONENT.SIZE,
      depth,
      maxDepth
    });
  }

  const eventType = String(input.eventType || "").toUpperCase();
  const payloadRules = PAYLOAD_RULES_BY_TYPE[eventType];
  if (payloadRules) {
    for (const path of payloadRules.requiredPaths) {
      if (!hasNonEmptyAtPath(payload, path)) {
        issues.push({
          code: "payload_missing_field",
          component: VALIDATOR_COMPONENT.PAYLOAD,
          path: path.join(".")
        });
      }
    }
  }

  if (eventType === "GIFT" || eventType === "GIFT_RECEIVED") {
    for (const integrityIssue of checkGiftIntegrity(payload)) {
      issues.push({ ...integrityIssue, component: VALIDATOR_COMPONENT.INTEGRITY });
    }
  }

  const securityIssues = collectSecurityIssues(payload);
  for (const sec of securityIssues) {
    issues.push({ ...sec, component: VALIDATOR_COMPONENT.SECURITY });
  }

  const def = getEventTypeDefinition(eventType);
  if (!def && !options.allowUnknownEventType) {
    warnings.push({ code: "unknown_event_type", component: VALIDATOR_COMPONENT.RULE, eventType });
  } else if (def && def.status !== "active" && !options.allowNonActiveEventType) {
    warnings.push({
      code: "non_active_event_type",
      component: VALIDATOR_COMPONENT.RULE,
      eventType,
      status: def.status
    });
  }

  if (input.metadata && typeof input.metadata === "object") {
    for (const key of ["gatewayId", "sessionId", "environment", "receiveTime"]) {
      if (input.metadata[key] == null || input.metadata[key] === "") {
        warnings.push({ code: `metadata_missing_${key}`, component: VALIDATOR_COMPONENT.METADATA });
      }
    }
  }

  let result = VALIDATION_RESULT.VALID;
  if (securityIssues.length > 0) {
    result = VALIDATION_RESULT.SECURITY_BLOCKED;
  } else if (issues.length > 0) {
    result = VALIDATION_RESULT.INVALID;
  } else if (warnings.length > 0) {
    result = VALIDATION_RESULT.VALID_WITH_WARNING;
  }

  const durationMs = Date.now() - startedAt;
  const report = createValidationReport({
    eventId: String(input.eventId || "unknown"),
    result,
    durationMs,
    issues: [...issues, ...warnings],
    rulesVersion: options.rulesVersion || "1.0"
  });

  return Object.freeze({
    result,
    ok: result === VALIDATION_RESULT.VALID || result === VALIDATION_RESULT.VALID_WITH_WARNING,
    issues,
    warnings,
    normalized: result === VALIDATION_RESULT.INVALID || result === VALIDATION_RESULT.SECURITY_BLOCKED
      ? null
      : schemaCheck.normalized,
    report
  });
}

function createValidationReport(input = {}) {
  const eventId = String(input.eventId || "").trim();
  if (!eventId) throw new Error("eventId is required");

  const result = input.result || VALIDATION_RESULT.INVALID;
  if (!isValidationResult(result)) throw new Error(`invalid validation result: ${result}`);

  const validationId =
    typeof input.validationId === "string" && input.validationId.trim()
      ? input.validationId.trim()
      : `validation-${crypto.randomUUID()}`;

  return Object.freeze({
    validationId,
    eventId,
    result,
    validatedAt: input.validatedAt != null ? Number(input.validatedAt) : Date.now(),
    durationMs: input.durationMs != null ? Number(input.durationMs) : 0,
    issues: Object.freeze(Array.isArray(input.issues) ? input.issues : []),
    rulesVersion: String(input.rulesVersion || "1.0")
  });
}

function createValidationLogRecord(input = {}) {
  const eventId = String(input.eventId || "").trim();
  if (!eventId) throw new Error("eventId is required");

  return Object.freeze({
    eventId,
    eventType: String(input.eventType || "unknown"),
    source: String(input.source || "unknown"),
    result: String(input.result || VALIDATION_RESULT.INVALID),
    durationMs: input.durationMs != null ? Number(input.durationMs) : 0,
    validatedAt: input.validatedAt != null ? Number(input.validatedAt) : Date.now(),
    errors: Object.freeze(Array.isArray(input.errors) ? input.errors : [])
  });
}

function assertValidatorForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !VALIDATOR_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function describeValidatorPipeline() {
  return VALIDATOR_PIPELINE_AFTER_GATEWAY.join(" → ");
}

module.exports = {
  VALIDATOR_COMPONENT,
  VALIDATOR_COMPONENT_ORDER,
  VALIDATION_RESULT,
  VALIDATOR_REQUIRED_FIELDS,
  SUPPORTED_SCHEMA_VERSIONS,
  VALIDATOR_FORBIDDEN_ACTIVITIES,
  PAYLOAD_RULES_BY_TYPE,
  VALIDATOR_RUNTIME_ANCHORS,
  VALIDATOR_PIPELINE_AFTER_GATEWAY,
  DEFAULT_MAX_PAYLOAD_BYTES,
  isValidationResult,
  validateEventCanon,
  createValidationReport,
  createValidationLogRecord,
  assertValidatorForbiddenActivity,
  describeValidatorPipeline
};
