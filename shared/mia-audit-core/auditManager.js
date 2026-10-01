"use strict";

/**
 * Master Canon 0074 — Audit Manager.
 * Kernel Layer 0 sole central authority for creating, protecting, verifying,
 * searching, and archiving immutable audit records.
 * AuM is the official source of truth for audit history — NOT operational
 * logging and NOT diagnostics. Does NOT dual-write to Logging Manager.
 */

const crypto = require("crypto");

const AUM_COMPONENT = Object.freeze({
  AUDIT_MANAGER: "audit_manager",
  INTAKE_GATE: "intake_gate",
  DESCRIPTOR_FACTORY: "descriptor_factory",
  INTEGRITY_ENGINE: "integrity_engine",
  STORE_CONTROLLER: "store_controller",
  LIFECYCLE_CONTROLLER: "lifecycle_controller",
  SEARCH_ENGINE: "search_engine",
  ARCHIVE_CONTROLLER: "archive_controller",
  FAULT_BRIDGE: "fault_bridge",
  ALERT_LINKER: "alert_linker",
  SECURITY_GATE: "security_gate",
  METRICS_AUDIT: "metrics_audit"
});

const AUM_COMPONENT_ORDER = Object.freeze(Object.values(AUM_COMPONENT));

const AUM_CATEGORY = Object.freeze({
  RUNTIME: "runtime",
  CONFIGURATION: "configuration",
  SECURITY: "security",
  ADMINISTRATION: "administration",
  AI: "ai",
  BATTLE: "battle",
  PLUGIN: "plugin",
  USER_MANAGEMENT: "user_management",
  API: "api"
});

const AUM_CATEGORY_ORDER = Object.freeze(Object.values(AUM_CATEGORY));

const AUM_LIFECYCLE = Object.freeze({
  CREATED: "created",
  STORED: "stored",
  VERIFIED: "verified",
  ARCHIVED: "archived",
  RETAINED: "retained"
});

const AUM_LIFECYCLE_ORDER = Object.freeze([
  AUM_LIFECYCLE.CREATED,
  AUM_LIFECYCLE.STORED,
  AUM_LIFECYCLE.VERIFIED,
  AUM_LIFECYCLE.ARCHIVED,
  AUM_LIFECYCLE.RETAINED
]);

/** Content fields hashed for integrity (excludes lifecycle status). */
const AUM_INTEGRITY_FIELDS = Object.freeze([
  "auditId",
  "runtimeId",
  "timestamp",
  "component",
  "actor",
  "action",
  "result",
  "correlationId",
  "category",
  "faultId",
  "alertId",
  "detail"
]);

const AUM_DESCRIPTOR_FIELDS = Object.freeze([
  "auditId",
  "runtimeId",
  "timestamp",
  "component",
  "actor",
  "action",
  "result",
  "correlationId",
  "integrityHash"
]);

const AUM_AUTHORIZED_SOURCES = Object.freeze([
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
  "alert_manager",
  "alert-manager",
  "audit_manager",
  "audit-manager",
  "security",
  "monitoring"
]);

const AUM_PRIVILEGED_SOURCES = Object.freeze([
  "kernel",
  "operator",
  "admin",
  "system",
  "audit_manager",
  "audit-manager"
]);

const AUM_FLAGS = Object.freeze({
  soleAuditAuthority: true,
  isOperationalLogging: false,
  runsDiagnostics: false,
  recordsImmutable: true,
  onlyCreateWrites: true,
  separatesOperationalLogging: true
});

const AUM_PUBLIC_API = Object.freeze([
  "createAudit",
  "verifyAudit",
  "findAudit",
  "exportAudit",
  "archiveAudit",
  "fromFault",
  "linkAlert",
  "registerCategory",
  "metrics",
  "accessTrail",
  "auditTrail",
  "reportArchive",
  "status"
]);

const AUM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-audit-core/auditManager.js",
  "shared/mia-fault-core/faultManager.js",
  "shared/mia-diagnostics-core/diagnosticsManager.js",
  "shared/mia-logging-core/loggingManager.js",
  "shared/mia-alert-core/alertManager.js",
  "docs/master-canon/0074-audit-manager.md"
]);

const AUM_MUTATING_VERBS = Object.freeze([
  "update",
  "delete",
  "rewrite",
  "purge",
  "mutate",
  "edit",
  "patch",
  "clear"
]);

const AUM_CRITICAL_FAULT_SEVERITIES = Object.freeze(["critical", "fatal"]);

let activeAuditManager = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function isValidLifecycle(state) {
  return AUM_LIFECYCLE_ORDER.includes(state);
}

function isValidCategory(category, categories) {
  if (categories) return categories.has(category);
  return AUM_CATEGORY_ORDER.includes(category);
}

/**
 * Integrity hash covers content fields only — excludes lifecycle status
 * so archive/retain transitions do not invalidate the hash.
 */
function computeIntegrityHash(payload = {}) {
  const canonical = {};
  for (const field of AUM_INTEGRITY_FIELDS) {
    if (payload[field] !== undefined) {
      canonical[field] = payload[field];
    }
  }
  // Also include any extra content keys except integrityHash / lifecycle / storage
  for (const [key, val] of Object.entries(payload)) {
    if (
      key === "integrityHash" ||
      key === "lifecycle" ||
      key === "archivedAt" ||
      key === "verifiedAt" ||
      key === "retainedAt" ||
      key === "storedAt"
    ) {
      continue;
    }
    if (!(key in canonical)) {
      canonical[key] = val;
    }
  }
  const ordered = {};
  for (const key of Object.keys(canonical).sort()) {
    ordered[key] = canonical[key];
  }
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(ordered))
    .digest("hex");
}

function createAuditDescriptor(input = {}) {
  const runtimeId = String(input.runtimeId || "").trim();
  if (!runtimeId) return { ok: false, error: "missing_runtimeId" };

  const component = String(input.component || "").trim();
  if (!component) return { ok: false, error: "missing_component" };

  const actor = String(input.actor || "").trim();
  if (!actor) return { ok: false, error: "missing_actor" };

  const action = String(input.action || "").trim();
  if (!action) return { ok: false, error: "missing_action" };

  const result =
    input.result == null ? "ok" : String(input.result);

  const timestamp =
    typeof input.timestamp === "number" && Number.isFinite(input.timestamp)
      ? input.timestamp
      : Date.now();

  const correlationId =
    input.correlationId != null && String(input.correlationId).trim()
      ? String(input.correlationId).trim()
      : makeId("corr");

  const auditId = input.auditId || makeId("audit");
  const category =
    input.category != null && String(input.category).trim()
      ? String(input.category).trim()
      : AUM_CATEGORY.ADMINISTRATION;

  const content = {
    auditId,
    runtimeId,
    timestamp,
    component,
    actor,
    action,
    result,
    correlationId,
    category
  };

  if (input.faultId != null) content.faultId = String(input.faultId);
  if (input.alertId != null) content.alertId = String(input.alertId);
  if (input.detail != null) content.detail = input.detail;

  const integrityHash =
    input.integrityHash || computeIntegrityHash(content);

  return {
    ok: true,
    descriptor: Object.freeze({
      auditId,
      runtimeId,
      timestamp,
      component,
      actor,
      action,
      result,
      correlationId,
      integrityHash,
      category
    })
  };
}

function createAuditManager(options = {}) {
  if (
    activeAuditManager &&
    activeAuditManager.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "audit_manager_already_active",
      soleAuditAuthority: true
    });
  }

  const authorized = new Set(options.authorizedSources || AUM_AUTHORIZED_SOURCES);
  const privileged = new Set(options.privilegedSources || AUM_PRIVILEGED_SOURCES);

  const categories = new Set(AUM_CATEGORY_ORDER);
  if (Array.isArray(options.extraCategories)) {
    for (const c of options.extraCategories) {
      if (c) categories.add(String(c));
    }
  }

  // In-memory active store + archive store (live durable store is 🟡)
  const store = new Map();
  const archiveStore = new Map();
  const alertLinks = [];
  const accessTrailLog = [];
  const opsAudit = [];
  const reportArchiveStore = [];

  let eventCount = 0;
  let verifiedCount = 0;
  let archiveCount = 0;
  let integrityCheckCount = 0;
  let accessCount = 0;

  // Optional logging bridge — createAudit must NEVER call it (separation).
  const loggingBridge =
    options.loggingBridge && typeof options.loggingBridge === "object"
      ? options.loggingBridge
      : null;

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

  function appendOps(record) {
    opsAudit.push(
      Object.freeze({
        auditId: record.auditId || null,
        actor: record.actor || record.source || "system",
        operation: record.operation || "unknown",
        time: record.time != null ? record.time : Date.now(),
        result: record.result || null,
        immutable: true,
        ...record
      })
    );
  }

  function recordAccess(meta, operation, target = null) {
    accessCount += 1;
    accessTrailLog.push(
      Object.freeze({
        accessId: makeId("access"),
        actor: meta.source || meta.actor || "unknown",
        operation,
        target,
        time: meta.nowMs != null ? meta.nowMs : Date.now(),
        authorized: isAuthorized(meta),
        result: "recorded"
      })
    );
  }

  function gate(meta, operation, { requireAuth = true } = {}) {
    if (requireAuth && !isAuthorized(meta)) {
      appendOps({
        operation,
        result: "unauthorized_audit",
        actor: meta.source || meta.actor || "unknown",
        time: Date.now()
      });
      return Object.freeze({ ok: false, error: "unauthorized_audit" });
    }
    if (!isSourceVerified(meta)) {
      appendOps({
        operation,
        result: "forged_audit_blocked",
        actor: meta.source || meta.actor || "unknown",
        time: Date.now()
      });
      return Object.freeze({ ok: false, error: "forged_audit_blocked" });
    }
    return null;
  }

  function snapshot(rec) {
    return Object.freeze({
      auditId: rec.auditId,
      runtimeId: rec.runtimeId,
      timestamp: rec.timestamp,
      component: rec.component,
      actor: rec.actor,
      action: rec.action,
      result: rec.result,
      correlationId: rec.correlationId,
      integrityHash: rec.integrityHash,
      category: rec.category,
      lifecycle: rec.lifecycle,
      faultId: rec.faultId || null,
      alertId: rec.alertId || null,
      detail: rec.detail != null ? rec.detail : null,
      storedAt: rec.storedAt || null,
      verifiedAt: rec.verifiedAt || null,
      archivedAt: rec.archivedAt || null,
      retainedAt: rec.retainedAt || null
    });
  }

  /**
   * createAudit — sole write path for new audit records.
   * Must NOT call Logging Manager write APIs (no dual-write).
   */
  function createAudit(input = {}, meta = {}) {
    const blocked = gate(meta, "createAudit");
    if (blocked) return blocked;

    // Hard separation: never invoke logging write APIs
    if (loggingBridge && typeof loggingBridge.log === "function") {
      // Intentionally unused — AuM is not operational logging.
    }
    if (meta.writeToLogging === true) {
      appendOps({
        operation: "createAudit",
        result: "logging_dual_write_rejected",
        actor: meta.source || meta.actor || "unknown"
      });
      return Object.freeze({
        ok: false,
        error: "logging_dual_write_rejected",
        separatesOperationalLogging: true,
        isOperationalLogging: false
      });
    }

    const category = String(input.category || AUM_CATEGORY.ADMINISTRATION).trim();
    if (!isValidCategory(category, categories)) {
      return Object.freeze({ ok: false, error: "invalid_category", category });
    }

    const desc = createAuditDescriptor({
      ...input,
      category,
      actor: input.actor || meta.actor || meta.source || "system",
      timestamp:
        typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
          ? meta.nowMs
          : input.timestamp
    });
    if (!desc.ok) return Object.freeze(desc);

    const d = desc.descriptor;
    const contentPayload = {
      auditId: d.auditId,
      runtimeId: d.runtimeId,
      timestamp: d.timestamp,
      component: d.component,
      actor: d.actor,
      action: d.action,
      result: d.result,
      correlationId: d.correlationId,
      category: d.category
    };
    if (input.faultId != null) contentPayload.faultId = String(input.faultId);
    if (input.alertId != null) contentPayload.alertId = String(input.alertId);
    if (input.detail != null) contentPayload.detail = input.detail;

    const integrityHash = computeIntegrityHash(contentPayload);
    const now = d.timestamp;

    // Mutable internal record for lifecycle only; content fields never rewritten
    const rec = {
      auditId: d.auditId,
      runtimeId: d.runtimeId,
      timestamp: d.timestamp,
      component: d.component,
      actor: d.actor,
      action: d.action,
      result: d.result,
      correlationId: d.correlationId,
      integrityHash,
      category: d.category,
      faultId: contentPayload.faultId || null,
      alertId: contentPayload.alertId || null,
      detail: contentPayload.detail != null ? contentPayload.detail : null,
      lifecycle: AUM_LIFECYCLE.CREATED,
      storedAt: null,
      verifiedAt: null,
      archivedAt: null,
      retainedAt: null
    };

    // create → hash → store
    rec.lifecycle = AUM_LIFECYCLE.STORED;
    rec.storedAt = now;
    store.set(rec.auditId, rec);
    eventCount += 1;

    appendOps({
      operation: "createAudit",
      auditId: rec.auditId,
      actor: d.actor,
      result: "created",
      time: now
    });

    return Object.freeze({
      ok: true,
      auditId: rec.auditId,
      audit: snapshot(rec),
      onlyCreateWrites: true,
      isOperationalLogging: false,
      runsDiagnostics: false
    });
  }

  function getRecord(auditId) {
    if (store.has(auditId)) return store.get(auditId);
    if (archiveStore.has(auditId)) return archiveStore.get(auditId);
    return null;
  }

  function verifyAudit(auditId, meta = {}) {
    const blocked = gate(meta, "verifyAudit");
    if (blocked) return blocked;
    recordAccess(meta, "verifyAudit", auditId);

    const id = String(auditId || "").trim();
    const rec = getRecord(id);
    if (!rec) {
      return Object.freeze({ ok: false, error: "audit_not_found", auditId: id });
    }

    integrityCheckCount += 1;
    const contentPayload = {
      auditId: rec.auditId,
      runtimeId: rec.runtimeId,
      timestamp: rec.timestamp,
      component: rec.component,
      actor: rec.actor,
      action: rec.action,
      result: rec.result,
      correlationId: rec.correlationId,
      category: rec.category
    };
    if (rec.faultId != null) contentPayload.faultId = rec.faultId;
    if (rec.alertId != null) contentPayload.alertId = rec.alertId;
    if (rec.detail != null) contentPayload.detail = rec.detail;

    const recomputed = computeIntegrityHash(contentPayload);
    const valid = recomputed === rec.integrityHash;

    if (valid) {
      verifiedCount += 1;
      if (
        rec.lifecycle === AUM_LIFECYCLE.STORED ||
        rec.lifecycle === AUM_LIFECYCLE.CREATED
      ) {
        rec.lifecycle = AUM_LIFECYCLE.VERIFIED;
        rec.verifiedAt = meta.nowMs != null ? meta.nowMs : Date.now();
      }
    }

    appendOps({
      operation: "verifyAudit",
      auditId: id,
      actor: meta.source || meta.actor || "system",
      result: valid ? "verified" : "integrity_mismatch",
      time: Date.now()
    });

    return Object.freeze({
      ok: valid,
      auditId: id,
      valid,
      integrityHash: rec.integrityHash,
      recomputed,
      error: valid ? undefined : "integrity_mismatch",
      audit: snapshot(rec)
    });
  }

  function findAudit(query = {}, meta = {}) {
    const blocked = gate(meta, "findAudit");
    if (blocked) return blocked;
    recordAccess(meta, "findAudit", query.auditId || null);

    const results = [];
    const pools = [store, archiveStore];
    for (const pool of pools) {
      for (const rec of pool.values()) {
        if (query.auditId && rec.auditId !== query.auditId) continue;
        if (query.runtimeId && rec.runtimeId !== query.runtimeId) continue;
        if (query.component && rec.component !== query.component) continue;
        if (query.actor && rec.actor !== query.actor) continue;
        if (query.category && rec.category !== query.category) continue;
        if (query.correlationId && rec.correlationId !== query.correlationId) {
          continue;
        }
        if (
          query.fromTimestamp != null &&
          rec.timestamp < query.fromTimestamp
        ) {
          continue;
        }
        if (query.toTimestamp != null && rec.timestamp > query.toTimestamp) {
          continue;
        }
        if (
          query.timestamp != null &&
          rec.timestamp !== query.timestamp
        ) {
          continue;
        }
        results.push(snapshot(rec));
      }
    }

    return Object.freeze({
      ok: true,
      count: results.length,
      audits: Object.freeze(results),
      readOnly: true
    });
  }

  function exportAudit(auditId, meta = {}) {
    const blocked = gate(meta, "exportAudit");
    if (blocked) return blocked;
    recordAccess(meta, "exportAudit", auditId);

    const id = String(auditId || "").trim();
    const rec = getRecord(id);
    if (!rec) {
      return Object.freeze({ ok: false, error: "audit_not_found", auditId: id });
    }

    const report = Object.freeze({
      auditId: rec.auditId,
      time: rec.timestamp,
      actor: rec.actor,
      action: rec.action,
      result: rec.result,
      integrity: rec.integrityHash,
      correlationId: rec.correlationId,
      component: rec.component,
      category: rec.category,
      lifecycle: rec.lifecycle,
      immutable: true
    });

    reportArchiveStore.push(report);
    appendOps({
      operation: "exportAudit",
      auditId: id,
      actor: meta.source || meta.actor || "system",
      result: "exported",
      time: Date.now()
    });

    return Object.freeze({
      ok: true,
      report,
      createReport: report
    });
  }

  function archiveAudit(auditId, meta = {}) {
    const blocked = gate(meta, "archiveAudit");
    if (blocked) return blocked;
    recordAccess(meta, "archiveAudit", auditId);

    const id = String(auditId || "").trim();
    const rec = store.get(id);
    if (!rec) {
      if (archiveStore.has(id)) {
        return Object.freeze({
          ok: true,
          alreadyArchived: true,
          audit: snapshot(archiveStore.get(id)),
          integrityPreserved: true
        });
      }
      return Object.freeze({ ok: false, error: "audit_not_found", auditId: id });
    }

    const hashBefore = rec.integrityHash;
    // Lifecycle move only — content frozen; hash covers content fields only
    rec.lifecycle = AUM_LIFECYCLE.ARCHIVED;
    rec.archivedAt = meta.nowMs != null ? meta.nowMs : Date.now();
    store.delete(id);
    archiveStore.set(id, rec);
    archiveCount += 1;

    appendOps({
      operation: "archiveAudit",
      auditId: id,
      actor: meta.source || meta.actor || "system",
      result: "archived",
      time: Date.now()
    });

    return Object.freeze({
      ok: true,
      auditId: id,
      audit: snapshot(rec),
      integrityPreserved: rec.integrityHash === hashBefore,
      integrityHash: rec.integrityHash
    });
  }

  /**
   * fromFault — only critical/fatal (or explicit policy) creates an Audit Event.
   */
  function fromFault(fault = {}, meta = {}) {
    const blocked = gate(meta, "fromFault");
    if (blocked) return blocked;

    const severity = String(fault.severity || "").toLowerCase();
    const policyForce = meta.forceAudit === true || fault.forceAudit === true;
    if (!AUM_CRITICAL_FAULT_SEVERITIES.includes(severity) && !policyForce) {
      return Object.freeze({
        ok: true,
        audited: false,
        reason: "not_every_fault_creates_audit",
        severity
      });
    }

    const created = createAudit(
      {
        runtimeId: fault.runtimeId || "runtime-unknown",
        component: fault.component || "fault_manager",
        actor: meta.actor || meta.source || "fault_manager",
        action: "fault_critical",
        result: severity,
        category: AUM_CATEGORY.RUNTIME,
        correlationId: fault.correlationId || makeId("corr"),
        faultId: fault.faultId || null,
        detail: fault.message || fault.reason || null
      },
      meta
    );

    if (!created.ok) return created;
    return Object.freeze({
      ok: true,
      audited: true,
      auditId: created.auditId,
      audit: created.audit,
      faultId: fault.faultId || null,
      correlationId: created.audit.correlationId
    });
  }

  /**
   * Bidirectional alert↔audit link recorded immutably (append-only link table
   * + optional new audit record).
   */
  function linkAlert(alertId, auditId, meta = {}) {
    const blocked = gate(meta, "linkAlert");
    if (blocked) return blocked;

    const aId = String(alertId || "").trim();
    const auId = String(auditId || "").trim();
    if (!aId || !auId) {
      return Object.freeze({ ok: false, error: "missing_alertId_or_auditId" });
    }

    const rec = getRecord(auId);
    if (!rec) {
      return Object.freeze({ ok: false, error: "audit_not_found", auditId: auId });
    }

    const link = Object.freeze({
      linkId: makeId("link"),
      alertId: aId,
      auditId: auId,
      time: meta.nowMs != null ? meta.nowMs : Date.now(),
      actor: meta.source || meta.actor || "system",
      immutable: true
    });
    alertLinks.push(link);

    // Append-only link audit (new record; does not mutate prior content)
    const linkAudit = createAudit(
      {
        runtimeId: rec.runtimeId,
        component: "alert_linker",
        actor: meta.actor || meta.source || "alert_manager",
        action: "link_alert",
        result: "linked",
        category: AUM_CATEGORY.SECURITY,
        correlationId: rec.correlationId,
        alertId: aId,
        detail: { linkedAuditId: auId }
      },
      meta
    );

    appendOps({
      operation: "linkAlert",
      auditId: auId,
      alertId: aId,
      actor: meta.source || meta.actor || "system",
      result: "linked",
      time: Date.now()
    });

    return Object.freeze({
      ok: true,
      link,
      linkAuditId: linkAudit.ok ? linkAudit.auditId : null,
      alertId: aId,
      auditId: auId
    });
  }

  function registerCategory(category, meta = {}) {
    const blocked = gate(meta, "registerCategory");
    if (blocked) return blocked;
    const cat = String(category || "").trim();
    if (!cat) return Object.freeze({ ok: false, error: "missing_category" });
    categories.add(cat);
    appendOps({
      operation: "registerCategory",
      actor: meta.source || meta.actor || "system",
      result: "registered",
      category: cat,
      time: Date.now()
    });
    return Object.freeze({
      ok: true,
      category: cat,
      categories: Object.freeze([...categories])
    });
  }

  function metrics() {
    return Object.freeze({
      eventCount,
      verifiedCount,
      archiveCount,
      integrityCheckCount,
      accessCount,
      activeCount: store.size,
      archivedStoreCount: archiveStore.size,
      linkCount: alertLinks.length,
      soleAuditAuthority: true,
      isOperationalLogging: false,
      runsDiagnostics: false,
      recordsImmutable: true,
      onlyCreateWrites: true,
      separatesOperationalLogging: true
    });
  }

  function status() {
    return Object.freeze({
      ok: true,
      singleton: true,
      soleAuditAuthority: true,
      isOperationalLogging: false,
      runsDiagnostics: false,
      recordsImmutable: true,
      onlyCreateWrites: true,
      separatesOperationalLogging: true,
      categories: Object.freeze([...categories]),
      components: AUM_COMPONENT_ORDER,
      lifecycle: AUM_LIFECYCLE_ORDER,
      eventCount,
      archiveCount
    });
  }

  function rejectMutation(op) {
    appendOps({
      operation: op,
      result: "records_immutable",
      actor: "audit_manager",
      time: Date.now()
    });
    return Object.freeze({
      ok: false,
      error: "records_immutable",
      blocked: true,
      operation: op,
      recordsImmutable: true,
      onlyCreateWrites: true
    });
  }

  /**
   * Test-only helper: mutate internal content to simulate tampering.
   * Public API never exposes this.
   */
  function __tamperForTest(auditId, patch = {}) {
    const rec = getRecord(String(auditId || "").trim());
    if (!rec) return Object.freeze({ ok: false, error: "audit_not_found" });
    for (const [k, v] of Object.entries(patch)) {
      if (k === "integrityHash" || k === "lifecycle") continue;
      rec[k] = v;
    }
    return Object.freeze({ ok: true, auditId: rec.auditId });
  }

  const manager = Object.freeze({
    ok: true,
    createAudit,
    verifyAudit,
    findAudit,
    exportAudit,
    archiveAudit,
    fromFault,
    linkAlert,
    registerCategory,
    metrics,
    accessTrail() {
      return Object.freeze([...accessTrailLog]);
    },
    auditTrail() {
      return Object.freeze([...opsAudit]);
    },
    reportArchive() {
      return Object.freeze([...reportArchiveStore]);
    },
    alertLinks() {
      return Object.freeze([...alertLinks]);
    },
    status,
    isActive() {
      return true;
    },
    updateAudit() {
      return rejectMutation("updateAudit");
    },
    deleteAudit() {
      return rejectMutation("deleteAudit");
    },
    rewriteAudit() {
      return rejectMutation("rewriteAudit");
    },
    purge() {
      return rejectMutation("purge");
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
    __tamperForTest
  });

  activeAuditManager = {
    isActive: manager.isActive
  };

  return manager;
}

function clearAuditSingletonForTest() {
  activeAuditManager = null;
}

module.exports = {
  AUM_COMPONENT,
  AUM_COMPONENT_ORDER,
  AUM_CATEGORY,
  AUM_CATEGORY_ORDER,
  AUM_LIFECYCLE,
  AUM_LIFECYCLE_ORDER,
  AUM_DESCRIPTOR_FIELDS,
  AUM_INTEGRITY_FIELDS,
  AUM_AUTHORIZED_SOURCES,
  AUM_FLAGS,
  AUM_PUBLIC_API,
  AUM_RUNTIME_ANCHORS,
  AUM_MUTATING_VERBS,
  AUM_CRITICAL_FAULT_SEVERITIES,
  computeIntegrityHash,
  createAuditDescriptor,
  createAuditManager,
  clearAuditSingletonForTest,
  separatesOperationalLogging: true
};
