"use strict";

/**
 * Master Canon 0075 — Event Store Manager.
 * Kernel Layer 0 sole central authority for append-only domain event streams,
 * replay/state reconstruction, and snapshot optimization.
 * ESM stores domain events only — NOT operational logs, NOT admin audit.
 */

const crypto = require("crypto");

const ESM_COMPONENT = Object.freeze({
  EVENT_STORE_MANAGER: "event_store_manager",
  INTAKE_GATE: "intake_gate",
  DESCRIPTOR_FACTORY: "descriptor_factory",
  STREAM_INDEX: "stream_index",
  VERSION_CONTROLLER: "version_controller",
  APPEND_ENGINE: "append_engine",
  REPLAY_ENGINE: "replay_engine",
  SNAPSHOT_ENGINE: "snapshot_engine",
  ARCHIVE_CONTROLLER: "archive_controller",
  STATE_BRIDGE: "state_bridge",
  SECURITY_GATE: "security_gate",
  METRICS_AUDIT: "metrics_audit"
});

const ESM_COMPONENT_ORDER = Object.freeze(Object.values(ESM_COMPONENT));

const ESM_DESCRIPTOR_FIELDS = Object.freeze([
  "eventId",
  "aggregateId",
  "aggregateType",
  "eventType",
  "version",
  "timestamp",
  "payload",
  "correlationId",
  "runtimeId"
]);

const ESM_AUTHORIZED_SOURCES = Object.freeze([
  "kernel",
  "operator",
  "admin",
  "system",
  "runtime",
  "runtime_manager",
  "runtime-manager",
  "state_manager",
  "state-manager",
  "logging_manager",
  "logging-manager",
  "audit_manager",
  "audit-manager",
  "event_store",
  "event-store",
  "event_store_manager",
  "event-store-manager",
  "scheduler",
  "task_scheduler",
  "security",
  "monitoring"
]);

const ESM_FLAGS = Object.freeze({
  soleEventStoreAuthority: true,
  storesOperationalLogs: false,
  storesAdminAudit: false,
  eventsImmutable: true,
  onlyAppendWrites: true,
  snapshotsAreOptimization: true
});

const ESM_PUBLIC_API = Object.freeze([
  "appendEvent",
  "loadStream",
  "loadAggregate",
  "replay",
  "createSnapshot",
  "archiveStream",
  "getSnapshot",
  "metrics",
  "accessTrail",
  "status"
]);

const ESM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-event-store-core/eventStoreManager.js",
  "shared/mia-scheduler-core/taskScheduler.js",
  "shared/mia-state-core/stateManager.js",
  "shared/mia-logging-core/loggingManager.js",
  "shared/mia-audit-core/auditManager.js",
  "docs/master-canon/0075-event-store-manager.md"
]);

const ESM_MUTATING_VERBS = Object.freeze([
  "update",
  "delete",
  "rewrite",
  "purge",
  "mutate",
  "edit",
  "patch",
  "clear",
  "reorder",
  "insert"
]);

let activeEventStoreManager = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function resolveStreamKey(aggregateType, aggregateId) {
  const id = String(aggregateId || "").trim();
  const type = String(aggregateType || "").trim();
  if (!id && !type) return "";
  if (!type) return id;
  if (!id) return type;
  if (id.startsWith(`${type}-`) || id.startsWith(`${type}:`)) return id;
  return `${type}:${id}`;
}

function defaultReducer(state, event) {
  const base =
    state && typeof state === "object" && !Array.isArray(state) ? { ...state } : {};
  const payload =
    event && event.payload && typeof event.payload === "object"
      ? event.payload
      : {};
  return Object.assign(base, payload, {
    lastEventType: event.eventType,
    version: event.version
  });
}

function createEventDescriptor(input = {}) {
  const aggregateId = String(input.aggregateId || "").trim();
  if (!aggregateId) return { ok: false, error: "missing_aggregateId" };

  const aggregateType = String(input.aggregateType || "").trim();
  if (!aggregateType) return { ok: false, error: "missing_aggregateType" };

  const eventType = String(input.eventType || "").trim();
  if (!eventType) return { ok: false, error: "missing_eventType" };

  const runtimeId = String(input.runtimeId || "").trim();
  if (!runtimeId) return { ok: false, error: "missing_runtimeId" };

  const timestamp =
    typeof input.timestamp === "number" && Number.isFinite(input.timestamp)
      ? input.timestamp
      : Date.now();

  const correlationId =
    input.correlationId != null && String(input.correlationId).trim()
      ? String(input.correlationId).trim()
      : makeId("corr");

  const eventId = input.eventId || makeId("evt");

  const version =
    input.version != null && Number.isFinite(Number(input.version))
      ? Number(input.version)
      : null;

  const descriptor = {
    eventId,
    aggregateId,
    aggregateType,
    eventType,
    version,
    timestamp,
    payload:
      input.payload != null && typeof input.payload === "object"
        ? Object.freeze({ ...input.payload })
        : Object.freeze({}),
    correlationId,
    runtimeId
  };

  if (input.eventSchemaVersion != null) {
    descriptor.eventSchemaVersion = String(input.eventSchemaVersion);
  }

  return {
    ok: true,
    descriptor: Object.freeze(descriptor)
  };
}

function createEventStoreManager(options = {}) {
  if (
    activeEventStoreManager &&
    activeEventStoreManager.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "event_store_manager_already_active",
      soleEventStoreAuthority: true
    });
  }

  const authorized = new Set(
    options.authorizedSources || ESM_AUTHORIZED_SOURCES
  );

  // Active streams + archive (live durable store is 🟡)
  const streams = new Map();
  const archiveStreams = new Map();
  const snapshots = new Map();
  const eventIds = new Set();
  const accessTrailLog = [];
  const opsAudit = [];

  let eventCount = 0;
  let replayCount = 0;
  let snapshotCount = 0;
  let accessCount = 0;
  let appendTimestamps = [];

  const loggingBridge =
    options.loggingBridge && typeof options.loggingBridge === "object"
      ? options.loggingBridge
      : null;
  const auditBridge =
    options.auditBridge && typeof options.auditBridge === "object"
      ? options.auditBridge
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
        result: "unauthorized_event_store",
        actor: meta.source || meta.actor || "unknown",
        time: Date.now()
      });
      return Object.freeze({ ok: false, error: "unauthorized_event_store" });
    }
    if (!isSourceVerified(meta)) {
      appendOps({
        operation,
        result: "forged_event_store_blocked",
        actor: meta.source || meta.actor || "unknown",
        time: Date.now()
      });
      return Object.freeze({ ok: false, error: "forged_event_store_blocked" });
    }
    return null;
  }

  function findStreamEntry(aggregateIdOrKey, { includeArchived = false } = {}) {
    const key = String(aggregateIdOrKey || "").trim();
    if (!key) return null;

    if (streams.has(key)) {
      return { key, entry: streams.get(key), archived: false };
    }
    for (const [k, entry] of streams.entries()) {
      if (entry.aggregateId === key) {
        return { key: k, entry, archived: false };
      }
    }

    if (includeArchived) {
      if (archiveStreams.has(key)) {
        return { key, entry: archiveStreams.get(key), archived: true };
      }
      for (const [k, entry] of archiveStreams.entries()) {
        if (entry.aggregateId === key) {
          return { key: k, entry, archived: true };
        }
      }
    }
    return null;
  }

  function getOrCreateStream(aggregateType, aggregateId) {
    const key = resolveStreamKey(aggregateType, aggregateId);
    if (streams.has(key)) return { key, entry: streams.get(key) };
    if (archiveStreams.has(key)) {
      return { key, entry: archiveStreams.get(key), archived: true };
    }
    const entry = {
      streamKey: key,
      aggregateId: String(aggregateId).trim(),
      aggregateType: String(aggregateType).trim(),
      events: [],
      currentVersion: 0,
      archived: false
    };
    streams.set(key, entry);
    return { key, entry };
  }

  function freezeEvent(rec) {
    const out = {
      eventId: rec.eventId,
      aggregateId: rec.aggregateId,
      aggregateType: rec.aggregateType,
      eventType: rec.eventType,
      version: rec.version,
      timestamp: rec.timestamp,
      payload: Object.freeze({ ...(rec.payload || {}) }),
      correlationId: rec.correlationId,
      runtimeId: rec.runtimeId
    };
    if (rec.eventSchemaVersion != null) {
      out.eventSchemaVersion = rec.eventSchemaVersion;
    }
    return Object.freeze(out);
  }

  /**
   * appendEvent — sole write path for domain events.
   * Must NOT write to Logging or Audit bridges.
   */
  function appendEvent(input = {}, meta = {}) {
    const blocked = gate(meta, "appendEvent");
    if (blocked) return blocked;

    if (meta.asOperationalLog === true) {
      appendOps({
        operation: "appendEvent",
        result: "operational_log_rejected",
        actor: meta.source || meta.actor || "unknown"
      });
      return Object.freeze({
        ok: false,
        error: "operational_log_rejected",
        storesOperationalLogs: false,
        separatesLoggingAndAudit: true
      });
    }
    if (meta.asAdminAudit === true) {
      appendOps({
        operation: "appendEvent",
        result: "admin_audit_rejected",
        actor: meta.source || meta.actor || "unknown"
      });
      return Object.freeze({
        ok: false,
        error: "admin_audit_rejected",
        storesAdminAudit: false,
        separatesLoggingAndAudit: true
      });
    }

    // Hard separation — never invoke logging/audit write APIs
    if (loggingBridge && typeof loggingBridge.log === "function") {
      // Intentionally unused
    }
    if (auditBridge && typeof auditBridge.createAudit === "function") {
      // Intentionally unused
    }

    const desc = createEventDescriptor({
      ...input,
      timestamp:
        typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
          ? meta.nowMs
          : input.timestamp,
      runtimeId: input.runtimeId || meta.runtimeId || "runtime-unknown"
    });
    if (!desc.ok) return Object.freeze(desc);

    const d = desc.descriptor;
    if (eventIds.has(d.eventId)) {
      return Object.freeze({
        ok: false,
        error: "duplicate_eventId",
        eventId: d.eventId
      });
    }

    const { entry, archived } = getOrCreateStream(d.aggregateType, d.aggregateId);
    if (archived) {
      return Object.freeze({
        ok: false,
        error: "stream_archived",
        aggregateId: d.aggregateId
      });
    }

    const expectedVersion =
      input.expectedVersion != null
        ? Number(input.expectedVersion)
        : meta.expectedVersion != null
          ? Number(meta.expectedVersion)
          : null;

    let nextVersion;
    if (expectedVersion != null && Number.isFinite(expectedVersion)) {
      if (expectedVersion !== entry.currentVersion) {
        return Object.freeze({
          ok: false,
          error: "version_conflict",
          expectedVersion,
          currentVersion: entry.currentVersion
        });
      }
      nextVersion = entry.currentVersion + 1;
    } else if (d.version != null && Number.isFinite(d.version)) {
      if (d.version !== entry.currentVersion + 1) {
        return Object.freeze({
          ok: false,
          error: "out_of_order_version",
          requestedVersion: d.version,
          expectedNext: entry.currentVersion + 1
        });
      }
      nextVersion = d.version;
    } else {
      nextVersion = entry.currentVersion + 1;
    }

    if (nextVersion !== entry.currentVersion + 1) {
      return Object.freeze({
        ok: false,
        error: "version_gap_or_reorder",
        nextVersion,
        currentVersion: entry.currentVersion
      });
    }

    const rec = {
      eventId: d.eventId,
      aggregateId: entry.aggregateId,
      aggregateType: entry.aggregateType,
      eventType: d.eventType,
      version: nextVersion,
      timestamp: d.timestamp,
      payload: { ...(d.payload || {}) },
      correlationId: d.correlationId,
      runtimeId: d.runtimeId
    };
    if (d.eventSchemaVersion != null) {
      rec.eventSchemaVersion = d.eventSchemaVersion;
    } else if (input.eventSchemaVersion != null) {
      rec.eventSchemaVersion = String(input.eventSchemaVersion);
    }

    entry.events.push(rec);
    entry.currentVersion = nextVersion;
    eventIds.add(rec.eventId);
    eventCount += 1;
    appendTimestamps.push(Date.now());
    if (appendTimestamps.length > 100) appendTimestamps.shift();

    appendOps({
      operation: "appendEvent",
      eventId: rec.eventId,
      aggregateId: rec.aggregateId,
      actor: meta.source || meta.actor || "system",
      result: "appended",
      version: nextVersion,
      time: rec.timestamp
    });

    return Object.freeze({
      ok: true,
      eventId: rec.eventId,
      event: freezeEvent(rec),
      version: nextVersion,
      streamKey: entry.streamKey,
      onlyAppendWrites: true,
      eventsImmutable: true,
      storesOperationalLogs: false,
      storesAdminAudit: false
    });
  }

  function loadStream(aggregateId, meta = {}) {
    const opts =
      meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {};
    // Support loadStream(id, { includeArchived }) or loadStream(id, meta)
    // where includeArchived may be on meta; also allow first-arg object form.
    let id = aggregateId;
    let includeArchived = false;
    let authMeta = opts;

    if (aggregateId && typeof aggregateId === "object" && !Array.isArray(aggregateId)) {
      id = aggregateId.aggregateId || aggregateId.streamKey || "";
      includeArchived = aggregateId.includeArchived === true;
      authMeta = aggregateId;
    } else {
      includeArchived = opts.includeArchived === true;
    }

    const blocked = gate(authMeta, "loadStream");
    if (blocked) return blocked;
    recordAccess(authMeta, "loadStream", id);

    const found = findStreamEntry(id, { includeArchived });
    if (!found) {
      return Object.freeze({
        ok: false,
        error: "stream_not_found",
        aggregateId: String(id || "")
      });
    }

    const events = Object.freeze(found.entry.events.map(freezeEvent));
    return Object.freeze({
      ok: true,
      streamKey: found.key,
      aggregateId: found.entry.aggregateId,
      aggregateType: found.entry.aggregateType,
      currentVersion: found.entry.currentVersion,
      archived: found.archived === true,
      events,
      eventCount: events.length,
      eventsImmutable: true,
      orderImmutable: true
    });
  }

  function loadAggregate(aggregateId, meta = {}) {
    const blocked = gate(meta, "loadAggregate");
    if (blocked) return blocked;
    recordAccess(meta, "loadAggregate", aggregateId);

    const found = findStreamEntry(aggregateId, {
      includeArchived: meta.includeArchived === true
    });
    if (!found) {
      return Object.freeze({
        ok: false,
        error: "aggregate_not_found",
        aggregateId: String(aggregateId || "")
      });
    }

    const events = Object.freeze(found.entry.events.map(freezeEvent));
    return Object.freeze({
      ok: true,
      aggregateId: found.entry.aggregateId,
      aggregateType: found.entry.aggregateType,
      streamKey: found.key,
      currentVersion: found.entry.currentVersion,
      archived: found.archived === true,
      events,
      metadata: Object.freeze({
        streamKey: found.key,
        aggregateId: found.entry.aggregateId,
        aggregateType: found.entry.aggregateType,
        currentVersion: found.entry.currentVersion,
        eventCount: events.length,
        archived: found.archived === true
      })
    });
  }

  function getSnapshot(aggregateId, meta = {}) {
    const blocked = gate(meta, "getSnapshot");
    if (blocked) return blocked;
    recordAccess(meta, "getSnapshot", aggregateId);

    const key = String(aggregateId || "").trim();
    let snap = snapshots.get(key);
    if (!snap) {
      for (const [k, s] of snapshots.entries()) {
        if (s.aggregateId === key || s.streamKey === key) {
          snap = s;
          break;
        }
      }
    }
    if (!snap) {
      return Object.freeze({
        ok: false,
        error: "snapshot_not_found",
        aggregateId: key
      });
    }
    return Object.freeze({
      ok: true,
      snapshot: Object.freeze({
        aggregateId: snap.aggregateId,
        streamKey: snap.streamKey,
        version: snap.version,
        state: Object.freeze({ ...(snap.state || {}) }),
        meta: Object.freeze({ ...(snap.meta || {}) }),
        createdAt: snap.createdAt
      }),
      snapshotsAreOptimization: true
    });
  }

  function createSnapshot(aggregateId, state, meta = {}) {
    const blocked = gate(meta, "createSnapshot");
    if (blocked) return blocked;
    recordAccess(meta, "createSnapshot", aggregateId);

    const found = findStreamEntry(aggregateId, {
      includeArchived: meta.includeArchived === true
    });
    if (!found) {
      return Object.freeze({
        ok: false,
        error: "stream_not_found",
        aggregateId: String(aggregateId || "")
      });
    }

    const version =
      meta.version != null && Number.isFinite(Number(meta.version))
        ? Number(meta.version)
        : found.entry.currentVersion;

    const snap = {
      aggregateId: found.entry.aggregateId,
      streamKey: found.key,
      version,
      state: state && typeof state === "object" ? { ...state } : {},
      meta: meta.snapshotMeta && typeof meta.snapshotMeta === "object"
        ? { ...meta.snapshotMeta }
        : {},
      createdAt: meta.nowMs != null ? meta.nowMs : Date.now()
    };
    snapshots.set(found.key, snap);
    snapshots.set(found.entry.aggregateId, snap);
    snapshotCount += 1;

    appendOps({
      operation: "createSnapshot",
      aggregateId: found.entry.aggregateId,
      actor: meta.source || meta.actor || "system",
      result: "snapshot_created",
      version,
      time: snap.createdAt
    });

    return Object.freeze({
      ok: true,
      aggregateId: found.entry.aggregateId,
      streamKey: found.key,
      version,
      snapshotsAreOptimization: true,
      historyPreserved: true
    });
  }

  function replay(aggregateId, options = {}, meta = {}) {
    // Support replay(id, { fromVersion, reducer, snapshot }, meta)
    // or replay(id, options) where options may include auth fields
    let opts = options && typeof options === "object" ? options : {};
    let authMeta = meta && typeof meta === "object" ? meta : {};
    if (
      opts.source ||
      opts.authorized != null ||
      opts.forged != null ||
      opts.actor
    ) {
      authMeta = { ...authMeta, ...opts };
    }

    const blocked = gate(authMeta, "replay");
    if (blocked) return blocked;
    recordAccess(authMeta, "replay", aggregateId);

    const found = findStreamEntry(aggregateId, { includeArchived: true });
    if (!found) {
      return Object.freeze({
        ok: false,
        error: "stream_not_found",
        aggregateId: String(aggregateId || "")
      });
    }

    const fromVersion =
      opts.fromVersion != null && Number.isFinite(Number(opts.fromVersion))
        ? Number(opts.fromVersion)
        : 1;

    const reducer =
      typeof opts.reducer === "function" ? opts.reducer : defaultReducer;

    let state = {};
    let startVersion = fromVersion;

    // Optional snapshot bootstrap
    let snap = null;
    if (opts.snapshot && typeof opts.snapshot === "object") {
      snap = opts.snapshot;
    } else if (opts.useSnapshot !== false) {
      const snapRes = snapshots.get(found.key) || snapshots.get(found.entry.aggregateId);
      if (snapRes) snap = snapRes;
    }

    if (snap && snap.state != null) {
      state =
        snap.state && typeof snap.state === "object" ? { ...snap.state } : {};
      startVersion = (snap.version || 0) + 1;
      if (opts.fromVersion != null && Number.isFinite(Number(opts.fromVersion))) {
        startVersion = Math.max(startVersion, Number(opts.fromVersion));
      }
    }

    const applied = [];
    for (const ev of found.entry.events) {
      if (ev.version < startVersion) continue;
      if (opts.toVersion != null && ev.version > Number(opts.toVersion)) break;
      state = reducer(state, freezeEvent(ev));
      applied.push(freezeEvent(ev));
    }

    replayCount += 1;
    const reconstructed = Object.freeze(
      state && typeof state === "object" ? { ...state } : { value: state }
    );

    return Object.freeze({
      ok: true,
      aggregateId: found.entry.aggregateId,
      aggregateType: found.entry.aggregateType,
      streamKey: found.key,
      archived: found.archived === true,
      fromVersion: startVersion,
      appliedCount: applied.length,
      events: Object.freeze(applied),
      state: reconstructed,
      reconstructed,
      snapshotsAreOptimization: true
    });
  }

  function archiveStream(aggregateId, meta = {}) {
    const blocked = gate(meta, "archiveStream");
    if (blocked) return blocked;
    recordAccess(meta, "archiveStream", aggregateId);

    const found = findStreamEntry(aggregateId, { includeArchived: false });
    if (!found) {
      const already = findStreamEntry(aggregateId, { includeArchived: true });
      if (already && already.archived) {
        return Object.freeze({
          ok: true,
          alreadyArchived: true,
          streamKey: already.key,
          aggregateId: already.entry.aggregateId,
          orderPreserved: true,
          versionsPreserved: true
        });
      }
      return Object.freeze({
        ok: false,
        error: "stream_not_found",
        aggregateId: String(aggregateId || "")
      });
    }

    const entry = found.entry;
    entry.archived = true;
    streams.delete(found.key);
    archiveStreams.set(found.key, entry);

    appendOps({
      operation: "archiveStream",
      aggregateId: entry.aggregateId,
      actor: meta.source || meta.actor || "system",
      result: "archived",
      time: Date.now()
    });

    return Object.freeze({
      ok: true,
      streamKey: found.key,
      aggregateId: entry.aggregateId,
      currentVersion: entry.currentVersion,
      eventCount: entry.events.length,
      orderPreserved: true,
      versionsPreserved: true
    });
  }

  function forStateManager(aggregateId, meta = {}) {
    const found = findStreamEntry(aggregateId, {
      includeArchived: meta.includeArchived === true
    });
    if (!found) {
      return Object.freeze({
        ok: false,
        error: "stream_not_found",
        historySource: "event_store"
      });
    }
    const events = Object.freeze(found.entry.events.map(freezeEvent));
    let reconstructed;
    if (meta.reconstruct === true) {
      const r = replay(aggregateId, { useSnapshot: true }, {
        ...meta,
        authorized: meta.authorized !== false ? true : meta.authorized,
        source: meta.source || "state_manager"
      });
      if (r.ok) reconstructed = r.reconstructed;
    }
    const out = {
      ok: true,
      historySource: "event_store",
      aggregateId: found.entry.aggregateId,
      events
    };
    if (reconstructed !== undefined) out.reconstructed = reconstructed;
    return Object.freeze(out);
  }

  function computeAppendRate() {
    if (appendTimestamps.length < 2) {
      return appendTimestamps.length > 0 ? appendTimestamps.length : 0;
    }
    const first = appendTimestamps[0];
    const last = appendTimestamps[appendTimestamps.length - 1];
    const elapsedSec = Math.max(0.001, (last - first) / 1000);
    return Number((appendTimestamps.length / elapsedSec).toFixed(4));
  }

  function estimateStoreSize() {
    let size = 0;
    for (const entry of streams.values()) {
      size += entry.events.length;
    }
    for (const entry of archiveStreams.values()) {
      size += entry.events.length;
    }
    size += snapshots.size;
    return size;
  }

  function metrics() {
    return Object.freeze({
      eventCount,
      streamCount: streams.size + archiveStreams.size,
      activeStreamCount: streams.size,
      archivedStreamCount: archiveStreams.size,
      replayCount,
      snapshotCount,
      storeSize: estimateStoreSize(),
      appendRate: computeAppendRate(),
      accessCount,
      soleEventStoreAuthority: true,
      storesOperationalLogs: false,
      storesAdminAudit: false,
      eventsImmutable: true,
      onlyAppendWrites: true,
      snapshotsAreOptimization: true,
      separatesLoggingAndAudit: true
    });
  }

  function status() {
    return Object.freeze({
      ok: true,
      singleton: true,
      soleEventStoreAuthority: true,
      storesOperationalLogs: false,
      storesAdminAudit: false,
      eventsImmutable: true,
      onlyAppendWrites: true,
      snapshotsAreOptimization: true,
      separatesLoggingAndAudit: true,
      components: ESM_COMPONENT_ORDER,
      eventCount,
      streamCount: streams.size + archiveStreams.size,
      snapshotCount,
      replayCount
    });
  }

  function rejectMutation(op) {
    appendOps({
      operation: op,
      result: "events_immutable",
      actor: "event_store_manager",
      time: Date.now()
    });
    return Object.freeze({
      ok: false,
      error: "events_immutable",
      blocked: true,
      operation: op,
      eventsImmutable: true,
      onlyAppendWrites: true
    });
  }

  const manager = Object.freeze({
    ok: true,
    appendEvent,
    loadStream,
    loadAggregate,
    replay,
    createSnapshot,
    archiveStream,
    getSnapshot,
    forStateManager,
    metrics,
    accessTrail() {
      return Object.freeze([...accessTrailLog]);
    },
    opsTrail() {
      return Object.freeze([...opsAudit]);
    },
    status,
    isActive() {
      return true;
    },
    updateEvent() {
      return rejectMutation("updateEvent");
    },
    deleteEvent() {
      return rejectMutation("deleteEvent");
    },
    rewriteEvent() {
      return rejectMutation("rewriteEvent");
    },
    purge() {
      return rejectMutation("purge");
    },
    reorderEvents() {
      return rejectMutation("reorderEvents");
    },
    insertEvent() {
      return rejectMutation("insertEvent");
    },
    update() {
      return rejectMutation("update");
    },
    delete() {
      return rejectMutation("delete");
    },
    rewrite() {
      return rejectMutation("rewrite");
    }
  });

  activeEventStoreManager = {
    isActive: manager.isActive
  };

  return manager;
}

function clearEventStoreSingletonForTest() {
  activeEventStoreManager = null;
}

module.exports = {
  ESM_COMPONENT,
  ESM_COMPONENT_ORDER,
  ESM_DESCRIPTOR_FIELDS,
  ESM_AUTHORIZED_SOURCES,
  ESM_FLAGS,
  ESM_PUBLIC_API,
  ESM_RUNTIME_ANCHORS,
  ESM_MUTATING_VERBS,
  resolveStreamKey,
  defaultReducer,
  createEventDescriptor,
  createEventStoreManager,
  clearEventStoreSingletonForTest,
  separatesLoggingAndAudit: true
};
