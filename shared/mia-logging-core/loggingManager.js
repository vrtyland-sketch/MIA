"use strict";

/**
 * Master Canon 0071 — Logging Manager.
 * Kernel Layer 0 sole central ingress for recording, classifying, storing,
 * rotating, and feeding logs. Does NOT analyze or interpret logs.
 */

const crypto = require("crypto");

const LM_COMPONENT = Object.freeze({
  LOGGING_MANAGER: "logging_manager",
  INTAKE_GATE: "intake_gate",
  LEVEL_CLASSIFIER: "level_classifier",
  CATEGORY_REGISTRY: "category_registry",
  STRUCTURED_ENCODER: "structured_encoder",
  CORRELATION_INDEX: "correlation_index",
  ROTATION_CONTROLLER: "rotation_controller",
  STORAGE_ADAPTER: "storage_adapter",
  FAULT_BRIDGE: "fault_bridge",
  DIAGNOSTICS_FEED: "diagnostics_feed",
  SECURITY_GATE: "security_gate",
  METRICS_AUDIT: "metrics_audit"
});

const LM_COMPONENT_ORDER = Object.freeze(Object.values(LM_COMPONENT));

const LM_LEVEL = Object.freeze({
  TRACE: "trace",
  DEBUG: "debug",
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical",
  FATAL: "fatal"
});

const LM_LEVEL_ORDER = Object.freeze([
  LM_LEVEL.TRACE,
  LM_LEVEL.DEBUG,
  LM_LEVEL.INFO,
  LM_LEVEL.WARNING,
  LM_LEVEL.ERROR,
  LM_LEVEL.CRITICAL,
  LM_LEVEL.FATAL
]);

const LM_CATEGORY = Object.freeze({
  KERNEL: "kernel",
  RUNTIME: "runtime",
  BATTLE: "battle",
  AI: "ai",
  OBS: "obs",
  PLATFORM: "platform",
  SECURITY: "security",
  NETWORK: "network",
  PERFORMANCE: "performance",
  DIAGNOSTICS: "diagnostics"
});

const LM_CATEGORY_ORDER = Object.freeze(Object.values(LM_CATEGORY));

const LM_DESCRIPTOR_FIELDS = Object.freeze([
  "logId",
  "timestamp",
  "runtimeId",
  "component",
  "category",
  "level",
  "message",
  "correlationId",
  "source"
]);

const LM_STORAGE_BACKEND = Object.freeze({
  MEMORY: "memory",
  FILE: "file",
  DATABASE: "database",
  CLOUD: "cloud",
  EXTERNAL: "external"
});

const LM_STORAGE_BACKEND_ORDER = Object.freeze(Object.values(LM_STORAGE_BACKEND));

const LM_FAULT_SEVERITY_TO_LEVEL = Object.freeze({
  info: LM_LEVEL.INFO,
  warning: LM_LEVEL.WARNING,
  error: LM_LEVEL.ERROR,
  critical: LM_LEVEL.CRITICAL,
  fatal: LM_LEVEL.FATAL,
  trace: LM_LEVEL.TRACE,
  debug: LM_LEVEL.DEBUG
});

const LM_SENSITIVE_KEYS = Object.freeze([
  "password",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "authorization",
  "credential",
  "credentials"
]);

const LM_AUTHORIZED_SOURCES = Object.freeze([
  "kernel",
  "operator",
  "admin",
  "system",
  "runtime",
  "runtime_manager",
  "runtime-manager",
  "fault_manager",
  "fault-manager",
  "diagnostics_manager",
  "diagnostics-manager",
  "logging_manager",
  "logging-manager",
  "ai",
  "monitoring",
  "recovery_manager",
  "recovery-manager"
]);

const LM_PRIVILEGED_SOURCES = Object.freeze([
  "kernel",
  "operator",
  "admin",
  "system",
  "logging_manager",
  "logging-manager"
]);

const LM_FLAGS = Object.freeze({
  soleLoggingAuthority: true,
  analyzesLogs: false,
  logsImmutable: true,
  centralLogIngress: true
});

const LM_PUBLIC_API = Object.freeze([
  "log",
  "trace",
  "debug",
  "info",
  "warning",
  "error",
  "critical",
  "fatal",
  "fromFault",
  "forDiagnostics",
  "forAi",
  "rotate",
  "getByCorrelation",
  "registerCategory",
  "setStorageBackend",
  "metrics",
  "auditTrail",
  "archive",
  "status"
]);

const LM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-logging-core/loggingManager.js",
  "shared/mia-fault-core/faultManager.js",
  "shared/mia-diagnostics-core/diagnosticsManager.js",
  "shared/mia-runtime-core/runtimeManager.js",
  "docs/master-canon/0071-logging-manager.md"
]);

const LM_MUTATING_VERBS = Object.freeze([
  "mutate",
  "update",
  "delete",
  "rewrite",
  "clear",
  "edit",
  "patch"
]);

let activeLoggingManager = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function isValidLevel(level) {
  return LM_LEVEL_ORDER.includes(level);
}

function maskSensitive(value, depth = 0) {
  if (depth > 8) return value;
  if (value == null) return value;
  if (Array.isArray(value)) {
    return value.map((v) => maskSensitive(v, depth + 1));
  }
  if (typeof value !== "object") return value;
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    const lower = String(key).toLowerCase();
    const sensitive = LM_SENSITIVE_KEYS.some(
      (s) => lower === s.toLowerCase() || lower.includes(s.toLowerCase())
    );
    if (sensitive) {
      out[key] = "***";
    } else if (val && typeof val === "object") {
      out[key] = maskSensitive(val, depth + 1);
    } else {
      out[key] = val;
    }
  }
  return out;
}

function createLogDescriptor(input = {}) {
  const level = input.level || LM_LEVEL.INFO;
  if (!isValidLevel(level)) {
    return { ok: false, error: "invalid_level", level };
  }

  const runtimeId = String(input.runtimeId || "").trim();
  if (!runtimeId) return { ok: false, error: "missing_runtimeId" };

  const component = String(input.component || "").trim();
  if (!component) return { ok: false, error: "missing_component" };

  const category = String(input.category || "").trim();
  if (!category) return { ok: false, error: "missing_category" };

  const source = String(input.source || "").trim();
  if (!source) return { ok: false, error: "missing_source" };

  const timestamp =
    typeof input.timestamp === "number" && Number.isFinite(input.timestamp)
      ? input.timestamp
      : Date.now();

  const logId = input.logId || makeId("lm");
  const correlationId =
    input.correlationId == null || input.correlationId === ""
      ? logId
      : String(input.correlationId);

  const message =
    input.message == null ? "" : String(input.message);

  return {
    ok: true,
    descriptor: Object.freeze({
      logId,
      timestamp,
      runtimeId,
      component,
      category,
      level,
      message,
      correlationId,
      source
    })
  };
}

function createLoggingManager(options = {}) {
  if (
    activeLoggingManager &&
    activeLoggingManager.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "logging_manager_already_active",
      soleLoggingAuthority: true
    });
  }

  const authorized = new Set(options.authorizedSources || LM_AUTHORIZED_SOURCES);
  const privileged = new Set(options.privilegedSources || LM_PRIVILEGED_SOURCES);

  const categories = new Set(LM_CATEGORY_ORDER);
  if (Array.isArray(options.extraCategories)) {
    for (const c of options.extraCategories) {
      if (c) categories.add(String(c));
    }
  }

  const requiresStructured =
    options.requiresStructured !== false &&
    !(options.policy && options.policy.requiresStructured === false);

  const sensitiveKeys = new Set(
    (options.maskSensitiveKeys || LM_SENSITIVE_KEYS).map((k) =>
      String(k).toLowerCase()
    )
  );

  const rotationPolicy = {
    maxEntries:
      typeof (options.rotation && options.rotation.maxEntries) === "number"
        ? options.rotation.maxEntries
        : typeof options.maxEntries === "number"
          ? options.maxEntries
          : 10000,
    maxAgeMs:
      typeof (options.rotation && options.rotation.maxAgeMs) === "number"
        ? options.rotation.maxAgeMs
        : typeof options.maxAgeMs === "number"
          ? options.maxAgeMs
          : 24 * 60 * 60 * 1000,
    maxBytes:
      typeof (options.rotation && options.rotation.maxBytes) === "number"
        ? options.rotation.maxBytes
        : typeof options.maxBytes === "number"
          ? options.maxBytes
          : 5 * 1024 * 1024
  };

  // Approximate bytes via entry count when no real byte size available
  const approxBytesPerEntry =
    typeof options.approxBytesPerEntry === "number"
      ? options.approxBytesPerEntry
      : 256;

  let storageBackend = LM_STORAGE_BACKEND.MEMORY;
  if (
    options.storageBackend &&
    LM_STORAGE_BACKEND_ORDER.includes(options.storageBackend)
  ) {
    storageBackend = options.storageBackend;
  }

  const storageBridge =
    options.storageBridge && typeof options.storageBridge === "object"
      ? options.storageBridge
      : null;

  const activeLogs = [];
  const archivedLogs = [];
  const audit = [];
  const correlationIndex = new Map();

  let logCount = 0;
  let errorCount = 0;
  let warningCount = 0;
  let archiveCount = 0;
  let writeTimestamps = [];
  const writeRateWindowMs =
    typeof options.writeRateWindowMs === "number"
      ? options.writeRateWindowMs
      : 60000;

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

  function isPrivileged(meta = {}) {
    const actor = meta.source || meta.actor || "";
    return privileged.has(actor) || meta.privileged === true;
  }

  function appendAudit(record) {
    audit.push(
      Object.freeze({
        logId: record.logId || null,
        runtimeId: record.runtimeId || null,
        actor: record.actor || record.source || "system",
        operation: record.operation || record.action || "unknown",
        time: record.time != null ? record.time : Date.now(),
        result: record.result || null,
        storageState: record.storageState || storageBackend,
        immutable: true,
        ...record
      })
    );
  }

  function maskValue(value, depth = 0) {
    if (depth > 8) return value;
    if (value == null) return value;
    if (Array.isArray(value)) {
      return value.map((v) => maskValue(v, depth + 1));
    }
    if (typeof value !== "object") return value;
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      const lower = String(key).toLowerCase();
      let sensitive = false;
      for (const s of sensitiveKeys) {
        if (lower === s || lower.includes(s)) {
          sensitive = true;
          break;
        }
      }
      if (sensitive) {
        out[key] = "***";
      } else if (val && typeof val === "object") {
        out[key] = maskValue(val, depth + 1);
      } else {
        out[key] = val;
      }
    }
    return out;
  }

  function estimateBytes() {
    if (storageBridge && typeof storageBridge.byteSize === "function") {
      try {
        const n = storageBridge.byteSize();
        if (typeof n === "number" && Number.isFinite(n)) return n;
      } catch (_err) {
        /* fall through */
      }
    }
    return activeLogs.length * approxBytesPerEntry;
  }

  function storageFillRatio() {
    const byEntries =
      rotationPolicy.maxEntries > 0
        ? activeLogs.length / rotationPolicy.maxEntries
        : 0;
    const byBytes =
      rotationPolicy.maxBytes > 0
        ? estimateBytes() / rotationPolicy.maxBytes
        : 0;
    return Math.min(1, Math.max(byEntries, byBytes));
  }

  function writeRate() {
    const now = Date.now();
    writeTimestamps = writeTimestamps.filter(
      (t) => now - t <= writeRateWindowMs
    );
    return writeTimestamps.length;
  }

  function indexCorrelation(entry) {
    const cid = entry.correlationId;
    if (!cid) return;
    if (!correlationIndex.has(cid)) correlationIndex.set(cid, []);
    correlationIndex.get(cid).push(entry.logId);
  }

  function persistEntry(entry) {
    activeLogs.push(entry);
    indexCorrelation(entry);
    if (storageBridge && typeof storageBridge.write === "function") {
      try {
        storageBridge.write(entry);
      } catch (_err) {
        /* memory remains source of truth for tests */
      }
    }
  }

  function buildStructured(input, level, descriptor) {
    let structured = null;
    if (input.structured && typeof input.structured === "object") {
      structured = { ...input.structured };
    } else if (input.event != null || input.data != null) {
      structured = {};
    }

    if (structured) {
      if (structured.runtime == null) structured.runtime = descriptor.runtimeId;
      if (structured.component == null) {
        structured.component = descriptor.component;
      }
      if (structured.level == null) structured.level = level;
      if (input.event != null && structured.event == null) {
        structured.event = input.event;
      }
      if (input.data != null && structured.data == null) {
        structured.data = input.data;
      }
      if (input.faultId != null && structured.faultId == null) {
        structured.faultId = input.faultId;
      }
      structured = maskValue(structured);
    }
    return structured;
  }

  function hasStructuredPayload(input) {
    if (input.structured && typeof input.structured === "object") return true;
    if (input.event != null && String(input.event).trim() !== "") return true;
    return false;
  }

  function writeLog(level, input = {}, meta = {}) {
    const nowMs =
      typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
        ? meta.nowMs
        : typeof input.timestamp === "number" && Number.isFinite(input.timestamp)
          ? input.timestamp
          : Date.now();

    if (!isAuthorized(meta)) {
      appendAudit({
        operation: "write",
        result: "unauthorized_logging",
        actor: meta.source || meta.actor || "unknown",
        time: nowMs
      });
      return Object.freeze({
        ok: false,
        error: "unauthorized_logging",
        level
      });
    }

    if (!isSourceVerified(meta)) {
      appendAudit({
        operation: "write",
        result: "forged_logging_blocked",
        actor: meta.source || meta.actor || "unknown",
        time: nowMs
      });
      return Object.freeze({
        ok: false,
        error: "forged_logging_blocked",
        level
      });
    }

    if (!isValidLevel(level)) {
      return Object.freeze({ ok: false, error: "invalid_level", level });
    }

    if (requiresStructured && !hasStructuredPayload(input)) {
      appendAudit({
        operation: "write",
        result: "unstructured_rejected",
        actor: meta.source || meta.actor || "unknown",
        time: nowMs
      });
      return Object.freeze({
        ok: false,
        error: "unstructured_rejected",
        requiresStructured: true
      });
    }

    const category = String(input.category || LM_CATEGORY.RUNTIME).trim();
    if (!categories.has(category)) {
      return Object.freeze({
        ok: false,
        error: "unknown_category",
        category
      });
    }

    const descResult = createLogDescriptor({
      logId: input.logId,
      timestamp: nowMs,
      runtimeId: input.runtimeId || meta.runtimeId || "runtime-unknown",
      component: input.component || meta.component || "unknown",
      category,
      level,
      message: input.message != null ? input.message : "",
      correlationId: input.correlationId || meta.correlationId,
      source: meta.source || input.source || "system"
    });

    if (!descResult.ok) {
      return Object.freeze({ ok: false, error: descResult.error });
    }

    const descriptor = descResult.descriptor;
    const structured = buildStructured(input, level, descriptor);

    const entry = Object.freeze({
      ...descriptor,
      structured: structured ? Object.freeze(structured) : null,
      faultId: input.faultId || null,
      immutable: true,
      analyzesLogs: false
    });

    // Enforce immutability of stored records — never mutate/update/delete
    persistEntry(entry);

    logCount += 1;
    writeTimestamps.push(nowMs);
    if (level === LM_LEVEL.ERROR) errorCount += 1;
    if (level === LM_LEVEL.WARNING) warningCount += 1;
    if (level === LM_LEVEL.CRITICAL || level === LM_LEVEL.FATAL) {
      errorCount += 1;
    }

    appendAudit({
      logId: entry.logId,
      runtimeId: entry.runtimeId,
      actor: entry.source,
      operation: "write",
      time: nowMs,
      result: "ok",
      level,
      storageState: storageBackend
    });

    // Auto-rotate when near capacity (deterministic with nowMs)
    if (
      activeLogs.length > rotationPolicy.maxEntries ||
      estimateBytes() > rotationPolicy.maxBytes
    ) {
      rotateInternal(nowMs, { reason: "capacity" });
    }

    return Object.freeze({
      ok: true,
      log: entry,
      logId: entry.logId,
      correlationId: entry.correlationId
    });
  }

  function levelWriter(level) {
    return function levelLog(input = {}, meta = {}) {
      const payload =
        typeof input === "string" ? { message: input, event: "message" } : input;
      return writeLog(level, payload, meta);
    };
  }

  function rotateInternal(nowMs, meta = {}) {
    const cutoffAge = nowMs - rotationPolicy.maxAgeMs;
    const keepCount = Math.max(0, Math.floor(rotationPolicy.maxEntries * 0.7));
    const keepBytes = Math.max(
      0,
      Math.floor(rotationPolicy.maxBytes * 0.7)
    );

    const toArchive = [];
    const remain = [];

    for (let i = 0; i < activeLogs.length; i += 1) {
      const entry = activeLogs[i];
      const tooOld = entry.timestamp < cutoffAge;
      const overflowByCount = i < activeLogs.length - keepCount;
      const overflowByBytes =
        (activeLogs.length - i) * approxBytesPerEntry > keepBytes &&
        i < activeLogs.length - keepCount;

      if (tooOld || overflowByCount || overflowByBytes) {
        toArchive.push(entry);
      } else {
        remain.push(entry);
      }
    }

    // Prefer archiving oldest first when over capacity
    if (
      toArchive.length === 0 &&
      (activeLogs.length > rotationPolicy.maxEntries ||
        estimateBytes() > rotationPolicy.maxBytes)
    ) {
      const excess = Math.max(
        0,
        activeLogs.length - keepCount,
        Math.ceil(
          (estimateBytes() - keepBytes) / approxBytesPerEntry
        )
      );
      for (let i = 0; i < excess && i < activeLogs.length; i += 1) {
        toArchive.push(activeLogs[i]);
      }
      remain.length = 0;
      for (let i = toArchive.length; i < activeLogs.length; i += 1) {
        remain.push(activeLogs[i]);
      }
    }

    if (toArchive.length === 0) {
      appendAudit({
        operation: "rotate",
        result: "noop",
        time: nowMs,
        actor: meta.source || "logging_manager",
        reason: meta.reason || "manual"
      });
      return Object.freeze({
        ok: true,
        archived: 0,
        remaining: activeLogs.length,
        archiveCount
      });
    }

    for (const entry of toArchive) {
      archivedLogs.push(
        Object.freeze({
          ...entry,
          archivedAt: nowMs,
          archived: true
        })
      );
    }

    activeLogs.length = 0;
    for (const entry of remain) activeLogs.push(entry);

    // Rebuild correlation index for active only (archive retained separately)
    correlationIndex.clear();
    for (const entry of activeLogs) indexCorrelation(entry);
    for (const entry of archivedLogs) indexCorrelation(entry);

    archiveCount += 1;

    if (storageBridge && typeof storageBridge.archive === "function") {
      try {
        storageBridge.archive(toArchive, nowMs);
      } catch (_err) {
        /* ignore */
      }
    }

    appendAudit({
      operation: "rotate",
      result: "ok",
      time: nowMs,
      actor: meta.source || "logging_manager",
      archived: toArchive.length,
      remaining: activeLogs.length,
      reason: meta.reason || "manual",
      storageState: storageBackend
    });

    return Object.freeze({
      ok: true,
      archived: toArchive.length,
      remaining: activeLogs.length,
      archiveCount
    });
  }

  function rotate(meta = {}) {
    if (!isAuthorized(meta) && meta.authorized !== true) {
      // Allow internal/system rotate without strict auth when called as maintenance
      if (!meta.internal) {
        return Object.freeze({ ok: false, error: "unauthorized_logging" });
      }
    }
    if (meta.forged === true) {
      return Object.freeze({ ok: false, error: "forged_logging_blocked" });
    }
    const nowMs =
      typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
        ? meta.nowMs
        : Date.now();
    return rotateInternal(nowMs, meta);
  }

  function fromFault(faultRecord, meta = {}) {
    if (!faultRecord || typeof faultRecord !== "object") {
      return Object.freeze({ ok: false, error: "missing_fault" });
    }

    const severity = String(
      faultRecord.severity || faultRecord.level || "error"
    ).toLowerCase();
    const level =
      LM_FAULT_SEVERITY_TO_LEVEL[severity] || LM_LEVEL.ERROR;

    const faultId =
      faultRecord.faultId || faultRecord.id || makeId("fault");
    const correlationId =
      faultRecord.correlationId || faultId;

    return writeLog(
      level,
      {
        runtimeId: faultRecord.runtimeId || meta.runtimeId || "runtime-unknown",
        component: faultRecord.component || "fault_manager",
        category: faultRecord.category || LM_CATEGORY.KERNEL,
        message:
          faultRecord.message ||
          faultRecord.summary ||
          `Fault ${faultId}`,
        correlationId,
        faultId,
        event: faultRecord.event || "FaultDetected",
        structured: {
          runtime: faultRecord.runtimeId || meta.runtimeId || "runtime-unknown",
          component: faultRecord.component || "fault_manager",
          level,
          event: faultRecord.event || "FaultDetected",
          faultId,
          severity
        }
      },
      {
        source: meta.source || "fault_manager",
        authorized: meta.authorized !== false,
        ...meta
      }
    );
  }

  function filterLogs(query = {}) {
    let pool = [...activeLogs, ...archivedLogs];
    if (query.activeOnly === true) pool = [...activeLogs];
    if (query.archiveOnly === true) pool = [...archivedLogs];

    if (query.correlationId) {
      pool = pool.filter((e) => e.correlationId === query.correlationId);
    }
    if (query.level) {
      pool = pool.filter((e) => e.level === query.level);
    }
    if (query.category) {
      pool = pool.filter((e) => e.category === query.category);
    }
    if (query.runtimeId) {
      pool = pool.filter((e) => e.runtimeId === query.runtimeId);
    }
    if (query.component) {
      pool = pool.filter((e) => e.component === query.component);
    }

    pool.sort((a, b) => a.timestamp - b.timestamp);

    const limit =
      typeof query.limit === "number" && query.limit >= 0
        ? query.limit
        : pool.length;
    return pool.slice(0, limit).map((e) => Object.freeze({ ...e }));
  }

  function forDiagnostics(query = {}, meta = {}) {
    if (!isAuthorized(meta)) {
      return Object.freeze({
        ok: false,
        error: "unauthorized_logging",
        readOnly: true
      });
    }
    if (meta.forged === true || meta.mutateRequested === true) {
      return Object.freeze({
        ok: false,
        error:
          meta.mutateRequested === true
            ? "diagnostics_cannot_mutate_logs"
            : "forged_logging_blocked",
        readOnly: true
      });
    }

    const logs = filterLogs(query);
    appendAudit({
      operation: "forDiagnostics",
      result: "ok",
      actor: meta.source || "diagnostics_manager",
      time: Date.now(),
      count: logs.length
    });

    return Object.freeze({
      ok: true,
      readOnly: true,
      analyzesLogs: false,
      logs: Object.freeze(logs),
      count: logs.length
    });
  }

  function forAi(query = {}, meta = {}) {
    if (!isAuthorized(meta)) {
      return Object.freeze({
        ok: false,
        error: "unauthorized_logging",
        readOnly: true
      });
    }
    if (meta.forged === true) {
      return Object.freeze({
        ok: false,
        error: "forged_logging_blocked",
        readOnly: true
      });
    }

    const mutateRequested =
      meta.mutateRequested === true ||
      query.mutateRequested === true ||
      query.deleteRequested === true ||
      query.rewriteRequested === true ||
      LM_MUTATING_VERBS.some(
        (v) =>
          query[v] === true ||
          meta[v] === true ||
          String(query.action || "").toLowerCase() === v
      );

    if (mutateRequested) {
      appendAudit({
        operation: "forAi",
        result: "ai_cannot_mutate_logs",
        actor: meta.source || "ai",
        time: Date.now()
      });
      return Object.freeze({
        ok: false,
        error: "ai_cannot_mutate_logs",
        readOnly: true
      });
    }

    const logs = filterLogs(query);
    appendAudit({
      operation: "forAi",
      result: "ok",
      actor: meta.source || "ai",
      time: Date.now(),
      count: logs.length
    });

    return Object.freeze({
      ok: true,
      readOnly: true,
      analyzesLogs: false,
      package: Object.freeze({
        logs: Object.freeze(logs),
        count: logs.length,
        readOnly: true
      }),
      logs: Object.freeze(logs),
      count: logs.length
    });
  }

  function getByCorrelation(correlationId, meta = {}) {
    if (correlationId == null || correlationId === "") {
      return Object.freeze({ ok: false, error: "missing_correlationId" });
    }
    const logs = filterLogs({ correlationId: String(correlationId) });
    return Object.freeze({
      ok: true,
      correlationId: String(correlationId),
      logs: Object.freeze(logs),
      count: logs.length,
      readOnly: true
    });
  }

  function registerCategory(name, meta = {}) {
    if (!isAuthorized(meta) || !isPrivileged(meta)) {
      return Object.freeze({ ok: false, error: "unauthorized_logging" });
    }
    if (meta.forged === true) {
      return Object.freeze({ ok: false, error: "forged_logging_blocked" });
    }
    const cat = String(name || "").trim();
    if (!cat) return Object.freeze({ ok: false, error: "missing_category" });
    categories.add(cat);
    appendAudit({
      operation: "registerCategory",
      result: "ok",
      actor: meta.source || "admin",
      category: cat,
      time: Date.now()
    });
    return Object.freeze({
      ok: true,
      category: cat,
      categories: Object.freeze([...categories])
    });
  }

  function setStorageBackend(name, meta = {}) {
    if (!isAuthorized(meta) || !isPrivileged(meta)) {
      return Object.freeze({ ok: false, error: "unauthorized_logging" });
    }
    if (meta.forged === true) {
      return Object.freeze({ ok: false, error: "forged_logging_blocked" });
    }
    const backend = String(name || "").trim().toLowerCase();
    if (!LM_STORAGE_BACKEND_ORDER.includes(backend)) {
      return Object.freeze({
        ok: false,
        error: "unknown_storage_backend",
        backend
      });
    }
    // Live file/DB/cloud wiring is partial — only memory writes without bridge
    if (
      backend !== LM_STORAGE_BACKEND.MEMORY &&
      !storageBridge &&
      meta.requireBridge !== false
    ) {
      // Allow config change for future wiring; do not write real files
      storageBackend = backend;
      appendAudit({
        operation: "setStorageBackend",
        result: "configured_without_live_bridge",
        actor: meta.source || "admin",
        backend,
        time: Date.now(),
        storageState: backend
      });
      return Object.freeze({
        ok: true,
        backend,
        liveWiring: false,
        note: "bridge_required_for_persistence"
      });
    }
    storageBackend = backend;
    appendAudit({
      operation: "setStorageBackend",
      result: "ok",
      actor: meta.source || "admin",
      backend,
      time: Date.now(),
      storageState: backend
    });
    return Object.freeze({ ok: true, backend, liveWiring: !!storageBridge });
  }

  function metrics() {
    const fill = storageFillRatio();
    return Object.freeze({
      logCount,
      errorCount,
      warningCount,
      writeRate: writeRate(),
      storageFillRatio: fill,
      archiveCount,
      activeEntries: activeLogs.length,
      archivedEntries: archivedLogs.length,
      overload: fill >= 0.9,
      storageBackend,
      analyzesLogs: false
    });
  }

  function status() {
    return Object.freeze({
      ok: true,
      singleton: true,
      soleLoggingAuthority: true,
      analyzesLogs: false,
      logsImmutable: true,
      centralLogIngress: true,
      storageBackend,
      activeEntries: activeLogs.length,
      archivedEntries: archivedLogs.length,
      categories: Object.freeze([...categories]),
      components: LM_COMPONENT_ORDER,
      levels: LM_LEVEL_ORDER
    });
  }

  function rejectMutation(op) {
    appendAudit({
      operation: op,
      result: "logs_immutable",
      actor: "logging_manager",
      time: Date.now()
    });
    return Object.freeze({
      ok: false,
      error: "logs_immutable",
      operation: op,
      logsImmutable: true
    });
  }

  const manager = Object.freeze({
    ok: true,
    log(input = {}, meta = {}) {
      const level = (input && input.level) || LM_LEVEL.INFO;
      return writeLog(level, input, meta);
    },
    trace: levelWriter(LM_LEVEL.TRACE),
    debug: levelWriter(LM_LEVEL.DEBUG),
    info: levelWriter(LM_LEVEL.INFO),
    warning: levelWriter(LM_LEVEL.WARNING),
    error: levelWriter(LM_LEVEL.ERROR),
    critical: levelWriter(LM_LEVEL.CRITICAL),
    fatal: levelWriter(LM_LEVEL.FATAL),
    fromFault,
    forDiagnostics,
    forAi,
    rotate,
    getByCorrelation,
    registerCategory,
    setStorageBackend,
    metrics,
    auditTrail() {
      return Object.freeze([...audit]);
    },
    archive() {
      return Object.freeze([...archivedLogs]);
    },
    status,
    records() {
      return Object.freeze([...activeLogs]);
    },
    getCategories() {
      return Object.freeze([...categories]);
    },
    isActive() {
      return true;
    },
    update() {
      return rejectMutation("update");
    },
    delete() {
      return rejectMutation("delete");
    },
    rewrite() {
      return rejectMutation("rewrite");
    },
    mutate() {
      return rejectMutation("mutate");
    },
    clear() {
      return rejectMutation("clear");
    }
  });

  activeLoggingManager = {
    isActive: manager.isActive
  };

  return manager;
}

function clearLoggingSingletonForTest() {
  activeLoggingManager = null;
}

module.exports = {
  LM_COMPONENT,
  LM_COMPONENT_ORDER,
  LM_LEVEL,
  LM_LEVEL_ORDER,
  LM_CATEGORY,
  LM_CATEGORY_ORDER,
  LM_DESCRIPTOR_FIELDS,
  LM_STORAGE_BACKEND,
  LM_STORAGE_BACKEND_ORDER,
  LM_FAULT_SEVERITY_TO_LEVEL,
  LM_AUTHORIZED_SOURCES,
  LM_FLAGS,
  LM_PUBLIC_API,
  LM_RUNTIME_ANCHORS,
  createLogDescriptor,
  maskSensitive,
  createLoggingManager,
  clearLoggingSingletonForTest
};
