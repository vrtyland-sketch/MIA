"use strict";

/**
 * Master Canon 0078 — Command Bus Manager.
 * Kernel Layer 0 sole central authority for command delivery to ONE handler.
 * CBM delivers commands — NOT event distribution, NOT a queue store.
 * Distinct from Event Bus (0076), Message Queue (0077), Event Store (0075).
 */

const crypto = require("crypto");

const CBM_COMPONENT = Object.freeze({
  COMMAND_BUS_MANAGER: "command_bus_manager",
  INTAKE_GATE: "intake_gate",
  VALIDATOR: "validator",
  AUTHORIZATION_GATE: "authorization_gate",
  ROUTER: "router",
  HANDLER_REGISTRY: "handler_registry",
  PIPELINE_CONTROLLER: "pipeline_controller",
  RESULT_STORE: "result_store",
  ASYNC_BRIDGE: "async_bridge",
  SECURITY_GATE: "security_gate",
  COMMAND_AUDIT: "command_audit",
  METRICS_AUDIT: "metrics_audit"
});

const CBM_COMPONENT_ORDER = Object.freeze(Object.values(CBM_COMPONENT));

/** Unified pipeline for every command — exact order. */
const CBM_PIPELINE = Object.freeze([
  "validation",
  "authorization",
  "routing",
  "handler",
  "result"
]);

const CBM_DESCRIPTOR_FIELDS = Object.freeze([
  "commandId",
  "commandType",
  "sender",
  "timestamp",
  "payload",
  "priority",
  "correlationId",
  "version"
]);

const CBM_PRIORITY = Object.freeze({
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  CRITICAL: "critical"
});

const CBM_PRIORITY_ORDER = Object.freeze([
  CBM_PRIORITY.LOW,
  CBM_PRIORITY.NORMAL,
  CBM_PRIORITY.HIGH,
  CBM_PRIORITY.CRITICAL
]);

const CBM_PRIORITY_RANK = Object.freeze({
  [CBM_PRIORITY.LOW]: 0,
  [CBM_PRIORITY.NORMAL]: 1,
  [CBM_PRIORITY.HIGH]: 2,
  [CBM_PRIORITY.CRITICAL]: 3
});

const CBM_RESULT = Object.freeze({
  SUCCESS: "Success",
  VALIDATION_FAILED: "Validation Failed",
  EXECUTION_FAILED: "Execution Failed",
  CANCELLED: "Cancelled",
  PENDING: "Pending"
});

const CBM_AUTHORIZED_SOURCES = Object.freeze([
  "kernel",
  "operator",
  "admin",
  "system",
  "runtime",
  "runtime_manager",
  "runtime-manager",
  "scheduler",
  "task_scheduler",
  "service_manager",
  "service-manager",
  "command_bus",
  "command-bus",
  "command_bus_manager",
  "command-bus-manager",
  "event_bus",
  "event-bus",
  "event_store",
  "event-store",
  "message_queue",
  "message-queue",
  "ai_engine",
  "battle_engine",
  "gift_engine",
  "chat_engine",
  "overlay_engine",
  "obs_connector",
  "tiktok_connector",
  "kick_connector",
  "inventory",
  "platform",
  "security",
  "monitoring",
  "sender"
]);

const CBM_FLAGS = Object.freeze({
  soleCommandBusAuthority: true,
  oneHandlerPerCommand: true,
  doesNotStoreDomainEvents: true,
  doesNotStoreQueueMessages: true,
  separatedFromEventBus: true,
  idempotentOnce: true
});

const CBM_PUBLIC_API = Object.freeze([
  "send",
  "validate",
  "dispatch",
  "cancel",
  "getResult"
]);

const CBM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-command-bus-core/commandBusManager.js",
  "shared/mia-scheduler-core/taskScheduler.js",
  "shared/mia-event-store-core/eventStoreManager.js",
  "shared/mia-event-bus-core/eventBusManager.js",
  "shared/mia-message-queue-core/messageQueueManager.js",
  "docs/master-canon/0078-command-bus-manager.md"
]);

let activeCommandBusManager = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function normalizePriority(value) {
  const raw = String(value || CBM_PRIORITY.NORMAL)
    .trim()
    .toLowerCase();
  if (Object.prototype.hasOwnProperty.call(CBM_PRIORITY_RANK, raw)) return raw;
  return null;
}

function createCommandDescriptor(input = {}) {
  const commandType = String(input.commandType || input.type || "").trim();
  if (!commandType) return { ok: false, error: "missing_commandType" };

  const sender = String(input.sender || input.source || "").trim();
  if (!sender) return { ok: false, error: "missing_sender" };

  const priority = normalizePriority(input.priority);
  if (!priority) return { ok: false, error: "invalid_priority" };

  if (input.payload == null || typeof input.payload !== "object") {
    return { ok: false, error: "missing_or_invalid_payload" };
  }

  const version =
    input.version != null && String(input.version).trim()
      ? String(input.version).trim()
      : "1.0.0";

  const timestamp =
    typeof input.timestamp === "number" && Number.isFinite(input.timestamp)
      ? input.timestamp
      : Date.now();

  const correlationId =
    input.correlationId != null && String(input.correlationId).trim()
      ? String(input.correlationId).trim()
      : makeId("corr");

  const commandId =
    input.commandId != null && String(input.commandId).trim()
      ? String(input.commandId).trim()
      : makeId("cmd");

  const payloadRaw = Array.isArray(input.payload)
    ? [...input.payload]
    : { ...input.payload };

  const descriptor = {
    commandId,
    commandType,
    sender,
    timestamp,
    payload: Object.freeze(payloadRaw),
    priority,
    correlationId,
    version
  };

  return {
    ok: true,
    descriptor: Object.freeze(descriptor)
  };
}

function createCommandBusManager(options = {}) {
  if (
    activeCommandBusManager &&
    activeCommandBusManager.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "command_bus_manager_already_active",
      soleCommandBusAuthority: true
    });
  }

  const authorized = new Set(
    options.authorizedSources || CBM_AUTHORIZED_SOURCES
  );
  const eventStoreBridge = options.eventStoreBridge || null;
  const eventBusBridge = options.eventBusBridge || null;
  const messageQueueBridge = options.messageQueueBridge || null;
  const scheduleAsync =
    typeof options.scheduleAsync === "function"
      ? options.scheduleAsync
      : (fn) => {
          setImmediate(fn);
        };

  /** @type {Map<string, { handlerFn: Function, meta: object }>} */
  const handlers = new Map();
  /** @type {Map<string, object>} */
  const results = new Map();
  /** @type {Set<string>} */
  const processedIds = new Set();
  /** @type {Map<string, object>} */
  const pending = new Map();
  const commandAuditLog = [];

  let commandCount = 0;
  let successCount = 0;
  let rejectedCount = 0;
  let errorCount = 0;
  let execSumMs = 0;
  let execSamples = 0;
  let active = true;

  function isAuthorized(meta = {}) {
    return (
      meta.authorized === true ||
      authorized.has(meta.source || "") ||
      authorized.has(meta.actor || "") ||
      authorized.has(meta.sender || "") ||
      authorized.has(String(meta.command && meta.command.sender) || "")
    );
  }

  function isSourceVerified(meta = {}) {
    if (meta.forged === true) return false;
    if (meta.sourceVerified === false) return false;
    if (meta.sourceVerified === true) return true;
    return isAuthorized(meta);
  }

  function gate(meta, _operation, { requireAuth = true } = {}) {
    if (requireAuth && !isAuthorized(meta)) {
      return Object.freeze({ ok: false, error: "unauthorized_command_bus" });
    }
    if (!isSourceVerified(meta)) {
      return Object.freeze({ ok: false, error: "forged_command_blocked" });
    }
    return null;
  }

  function recordAudit(entry) {
    commandAuditLog.push(
      Object.freeze({
        commandId: entry.commandId,
        sender: entry.sender != null ? entry.sender : null,
        handler: entry.handler != null ? entry.handler : null,
        receivedAt: entry.receivedAt != null ? entry.receivedAt : null,
        completedAt: entry.completedAt != null ? entry.completedAt : null,
        result: entry.result || "unknown",
        correlationId:
          entry.correlationId != null ? entry.correlationId : null
      })
    );
  }

  function storeResult(commandId, entry) {
    results.set(commandId, Object.freeze({ ...entry }));
  }

  function registerHandler(commandType, handlerFn, meta = {}) {
    const type = String(commandType || "").trim();
    if (!type) {
      return Object.freeze({ ok: false, error: "missing_commandType" });
    }
    if (typeof handlerFn !== "function") {
      return Object.freeze({ ok: false, error: "invalid_handler" });
    }
    if (handlers.has(type)) {
      return Object.freeze({
        ok: false,
        error: "handler_already_registered",
        commandType: type,
        oneHandlerPerCommand: true
      });
    }
    handlers.set(type, {
      handlerFn,
      meta: Object.freeze({ ...(meta || {}) })
    });
    return Object.freeze({
      ok: true,
      commandType: type,
      oneHandlerPerCommand: true
    });
  }

  function validateOnly(input = {}, meta = {}) {
    const authMeta = {
      ...meta,
      sender: meta.sender || input.sender || meta.source,
      source: meta.source || input.sender || meta.sender
    };

    if (meta.forged === true || input.forged === true) {
      return Object.freeze({
        ok: false,
        valid: false,
        error: "forged_command_blocked",
        result: CBM_RESULT.VALIDATION_FAILED
      });
    }

    const desc = createCommandDescriptor(input);
    if (!desc.ok) {
      return Object.freeze({
        ok: false,
        valid: false,
        error: desc.error,
        result: CBM_RESULT.VALIDATION_FAILED
      });
    }

    const d = desc.descriptor;
    if (!handlers.has(d.commandType)) {
      return Object.freeze({
        ok: false,
        valid: false,
        error: "command_type_not_registered",
        commandType: d.commandType,
        result: CBM_RESULT.VALIDATION_FAILED,
        descriptor: d
      });
    }

    if (!d.version) {
      return Object.freeze({
        ok: false,
        valid: false,
        error: "missing_version",
        result: CBM_RESULT.VALIDATION_FAILED,
        descriptor: d
      });
    }

    return Object.freeze({
      ok: true,
      valid: true,
      descriptor: d,
      phases: Object.freeze(["validation"])
    });
  }

  function appendDomainEventIfNeeded(command, handlerReturn, meta) {
    if (
      meta.writeCommandToEventStore === true ||
      (meta.options && meta.options.writeCommandToEventStore === true)
    ) {
      return Object.freeze({
        ok: false,
        error: "write_command_to_event_store_rejected",
        doesNotStoreDomainEvents: true
      });
    }

    const emit =
      (handlerReturn && handlerReturn.domainEvent) ||
      (meta.emitDomainEvent != null ? meta.emitDomainEvent : null) ||
      (meta.options && meta.options.emitDomainEvent) ||
      null;

    if (!emit) {
      return Object.freeze({ ok: true, appended: false });
    }

    if (
      !eventStoreBridge ||
      typeof eventStoreBridge.appendEvent !== "function"
    ) {
      return Object.freeze({
        ok: false,
        error: "event_store_bridge_unavailable",
        appended: false
      });
    }

    // Never append the command itself — only the domain event.
    const appendResult = eventStoreBridge.appendEvent(emit, {
      ...meta,
      source: meta.source || "command_bus",
      correlationId: command.correlationId,
      fromCommandId: command.commandId
    });

    return Object.freeze({
      ok: appendResult && appendResult.ok !== false,
      appended: true,
      appendResult: appendResult || null,
      domainEvent: emit
    });
  }

  function publishBusIfNeeded(command, domainEvent, meta) {
    if (!domainEvent) return Object.freeze({ ok: true, published: false });
    if (meta.publishToEventBus === false) {
      return Object.freeze({ ok: true, published: false });
    }
    if (!eventBusBridge || typeof eventBusBridge.publish !== "function") {
      return Object.freeze({ ok: true, published: false });
    }
    const pub = eventBusBridge.publish(
      {
        eventType: domainEvent.eventType || domainEvent.type,
        publisher: meta.source || "command_bus",
        payload: domainEvent.payload || domainEvent,
        correlationId: command.correlationId,
        priority: command.priority
      },
      { ...meta, source: meta.source || "command_bus", authorized: true }
    );
    return Object.freeze({
      ok: pub && pub.ok !== false,
      published: true,
      publishResult: pub || null
    });
  }

  function runHandler(command, meta) {
    const entry = handlers.get(command.commandType);
    if (!entry) {
      return {
        ok: false,
        result: CBM_RESULT.VALIDATION_FAILED,
        error: "command_type_not_registered"
      };
    }

    try {
      const raw = entry.handlerFn(command, meta);
      if (raw && raw.ok === false) {
        return {
          ok: false,
          result: CBM_RESULT.EXECUTION_FAILED,
          error: raw.error || "handler_execution_failed",
          handlerReturn: raw,
          handlerName: entry.meta.name || command.commandType
        };
      }
      return {
        ok: true,
        result: CBM_RESULT.SUCCESS,
        handlerReturn: raw || { ok: true },
        handlerName: entry.meta.name || command.commandType
      };
    } catch (err) {
      return {
        ok: false,
        result: CBM_RESULT.EXECUTION_FAILED,
        error: err && err.message ? err.message : "handler_threw",
        handlerName: entry.meta.name || command.commandType
      };
    }
  }

  function finishSuccess(command, handlerOutcome, meta, phaseHistory, startedAt) {
    const storeAttempt = appendDomainEventIfNeeded(
      command,
      handlerOutcome.handlerReturn,
      meta
    );
    if (storeAttempt.ok === false && storeAttempt.error === "write_command_to_event_store_rejected") {
      rejectedCount += 1;
      const failed = Object.freeze({
        ok: false,
        commandId: command.commandId,
        result: CBM_RESULT.VALIDATION_FAILED,
        error: storeAttempt.error,
        phases: Object.freeze([...phaseHistory, "result"]),
        doesNotStoreDomainEvents: true
      });
      storeResult(command.commandId, failed);
      recordAudit({
        commandId: command.commandId,
        sender: command.sender,
        handler: handlerOutcome.handlerName,
        receivedAt: startedAt,
        completedAt: Date.now(),
        result: CBM_RESULT.VALIDATION_FAILED,
        correlationId: command.correlationId
      });
      return failed;
    }

    const busPub = publishBusIfNeeded(
      command,
      storeAttempt.domainEvent || null,
      meta
    );

    const elapsed = Math.max(0, Date.now() - startedAt);
    execSumMs += elapsed;
    execSamples += 1;
    successCount += 1;

    phaseHistory.push("result");
    const out = Object.freeze({
      ok: true,
      commandId: command.commandId,
      result: CBM_RESULT.SUCCESS,
      phases: Object.freeze([...phaseHistory]),
      handler: handlerOutcome.handlerName,
      handlerReturn: handlerOutcome.handlerReturn || null,
      domainEventAppended: storeAttempt.appended === true,
      eventBusPublished: busPub.published === true,
      executionMs: elapsed,
      soleCommandBusAuthority: true,
      oneHandlerPerCommand: true,
      doesNotStoreDomainEvents: true,
      doesNotStoreQueueMessages: true,
      separatedFromEventBus: true,
      idempotentOnce: true
    });

    storeResult(command.commandId, out);
    recordAudit({
      commandId: command.commandId,
      sender: command.sender,
      handler: handlerOutcome.handlerName,
      receivedAt: startedAt,
      completedAt: Date.now(),
      result: CBM_RESULT.SUCCESS,
      correlationId: command.correlationId
    });
    return out;
  }

  function executePipeline(input = {}, meta = {}) {
    const startedAt =
      typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
        ? meta.nowMs
        : Date.now();

    const authMeta = {
      ...meta,
      sender: meta.sender || input.sender || meta.source,
      source: meta.source || input.sender || meta.sender
    };

    if (
      meta.writeCommandToEventStore === true ||
      input.writeCommandToEventStore === true ||
      (meta.options && meta.options.writeCommandToEventStore === true)
    ) {
      rejectedCount += 1;
      return Object.freeze({
        ok: false,
        error: "write_command_to_event_store_rejected",
        result: CBM_RESULT.VALIDATION_FAILED,
        doesNotStoreDomainEvents: true
      });
    }

    const phaseHistory = [];

    // --- validation ---
    phaseHistory.push("validation");
    if (meta.forged === true || input.forged === true) {
      rejectedCount += 1;
      commandCount += 1;
      const failed = Object.freeze({
        ok: false,
        result: CBM_RESULT.VALIDATION_FAILED,
        error: "forged_command_blocked",
        phases: Object.freeze([...phaseHistory])
      });
      if (input.commandId) {
        processedIds.add(String(input.commandId));
        storeResult(String(input.commandId), failed);
      }
      return failed;
    }

    const desc = createCommandDescriptor({
      ...input,
      timestamp:
        typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
          ? meta.nowMs
          : input.timestamp
    });
    if (!desc.ok) {
      rejectedCount += 1;
      commandCount += 1;
      return Object.freeze({
        ok: false,
        result: CBM_RESULT.VALIDATION_FAILED,
        error: desc.error,
        phases: Object.freeze([...phaseHistory])
      });
    }

    const command = desc.descriptor;
    commandCount += 1;

    // Idempotency: same commandId processed only once
    if (processedIds.has(command.commandId) || results.has(command.commandId)) {
      const prior = results.get(command.commandId);
      return Object.freeze({
        ok: prior ? prior.ok === true : false,
        error: "duplicate_commandId",
        commandId: command.commandId,
        result: prior ? prior.result : CBM_RESULT.VALIDATION_FAILED,
        priorResult: prior || null,
        idempotentOnce: true,
        reexecuted: false
      });
    }

    if (!handlers.has(command.commandType)) {
      rejectedCount += 1;
      processedIds.add(command.commandId);
      const failed = Object.freeze({
        ok: false,
        commandId: command.commandId,
        result: CBM_RESULT.VALIDATION_FAILED,
        error: "command_type_not_registered",
        phases: Object.freeze([...phaseHistory])
      });
      storeResult(command.commandId, failed);
      recordAudit({
        commandId: command.commandId,
        sender: command.sender,
        handler: null,
        receivedAt: startedAt,
        completedAt: Date.now(),
        result: CBM_RESULT.VALIDATION_FAILED,
        correlationId: command.correlationId
      });
      return failed;
    }

    // --- authorization ---
    phaseHistory.push("authorization");
    const blocked = gate(
      {
        ...authMeta,
        sender: command.sender,
        source: authMeta.source || command.sender
      },
      "dispatch"
    );
    if (blocked) {
      rejectedCount += 1;
      processedIds.add(command.commandId);
      const failed = Object.freeze({
        ok: false,
        commandId: command.commandId,
        result: CBM_RESULT.VALIDATION_FAILED,
        error: blocked.error,
        phases: Object.freeze([...phaseHistory])
      });
      storeResult(command.commandId, failed);
      recordAudit({
        commandId: command.commandId,
        sender: command.sender,
        handler: null,
        receivedAt: startedAt,
        completedAt: Date.now(),
        result: CBM_RESULT.VALIDATION_FAILED,
        correlationId: command.correlationId
      });
      return failed;
    }

    // --- routing ---
    phaseHistory.push("routing");
    const routed = handlers.get(command.commandType);
    // Sender does not know / select the handler — bus routes by type only.

    const mode = String(meta.mode || input.mode || "sync")
      .trim()
      .toLowerCase();

    if (mode === "async") {
      processedIds.add(command.commandId);
      const pendingEntry = {
        command,
        meta: authMeta,
        phaseHistory: [...phaseHistory],
        startedAt,
        cancelled: false
      };
      pending.set(command.commandId, pendingEntry);

      const pendingResult = Object.freeze({
        ok: true,
        pending: true,
        commandId: command.commandId,
        result: CBM_RESULT.PENDING,
        phases: Object.freeze([...phaseHistory]),
        doesNotStoreQueueMessages: true
      });
      storeResult(command.commandId, pendingResult);

      const work = () => {
        const slot = pending.get(command.commandId);
        if (!slot || slot.cancelled) return;
        pending.delete(command.commandId);

        const phases = [...slot.phaseHistory, "handler"];
        const handlerOutcome = runHandler(command, slot.meta);
        if (!handlerOutcome.ok) {
          errorCount += 1;
          const failed = Object.freeze({
            ok: false,
            commandId: command.commandId,
            result: handlerOutcome.result,
            error: handlerOutcome.error,
            phases: Object.freeze([...phases, "result"]),
            handler: handlerOutcome.handlerName || null
          });
          storeResult(command.commandId, failed);
          recordAudit({
            commandId: command.commandId,
            sender: command.sender,
            handler: handlerOutcome.handlerName || null,
            receivedAt: slot.startedAt,
            completedAt: Date.now(),
            result: handlerOutcome.result,
            correlationId: command.correlationId
          });
          if (
            eventBusBridge &&
            typeof eventBusBridge.publish === "function" &&
            slot.meta.publishCompletion !== false
          ) {
            try {
              eventBusBridge.publish(
                {
                  eventType: "command.completed",
                  publisher: "command_bus",
                  payload: {
                    commandId: command.commandId,
                    result: handlerOutcome.result
                  },
                  correlationId: command.correlationId
                },
                { source: "command_bus", authorized: true }
              );
            } catch (_err) {
              /* optional completion publish */
            }
          }
          return;
        }

        finishSuccess(command, handlerOutcome, slot.meta, phases, slot.startedAt);
      };

      // Async: enqueue via injected queue bridge (CBM does not store messages)
      // OR schedule locally without a local message store.
      let enqueued = false;
      if (
        messageQueueBridge &&
        typeof messageQueueBridge.enqueue === "function"
      ) {
        try {
          const qRes = messageQueueBridge.enqueue(
            {
              queueId: meta.queueId || "platform",
              type: "command_async",
              payload: {
                commandId: command.commandId,
                commandType: command.commandType
              },
              correlationId: command.correlationId
            },
            { ...authMeta, source: authMeta.source || "command_bus" }
          );
          enqueued = qRes && qRes.ok === true;
        } catch (_err) {
          enqueued = false;
        }
      }

      if (enqueued && typeof meta.onQueueWork === "function") {
        meta.onQueueWork(work);
      } else {
        scheduleAsync(work);
      }

      return Object.freeze({
        ...pendingResult,
        asyncEnqueued: enqueued,
        routedHandler: routed.meta.name || command.commandType,
        senderKnowsHandler: false
      });
    }

    // --- sync handler ---
    phaseHistory.push("handler");
    processedIds.add(command.commandId);
    const handlerOutcome = runHandler(command, authMeta);
    if (!handlerOutcome.ok) {
      if (handlerOutcome.result === CBM_RESULT.EXECUTION_FAILED) {
        errorCount += 1;
      } else {
        rejectedCount += 1;
      }
      phaseHistory.push("result");
      const failed = Object.freeze({
        ok: false,
        commandId: command.commandId,
        result: handlerOutcome.result,
        error: handlerOutcome.error,
        phases: Object.freeze([...phaseHistory]),
        handler: handlerOutcome.handlerName || null,
        senderKnowsHandler: false,
        routedHandler: routed.meta.name || command.commandType
      });
      storeResult(command.commandId, failed);
      recordAudit({
        commandId: command.commandId,
        sender: command.sender,
        handler: handlerOutcome.handlerName || null,
        receivedAt: startedAt,
        completedAt: Date.now(),
        result: handlerOutcome.result,
        correlationId: command.correlationId
      });
      return failed;
    }

    const success = finishSuccess(
      command,
      handlerOutcome,
      authMeta,
      phaseHistory,
      startedAt
    );
    return Object.freeze({
      ...success,
      senderKnowsHandler: false,
      routedHandler: routed.meta.name || command.commandType
    });
  }

  function send(input = {}, meta = {}) {
    return executePipeline(input, meta);
  }

  function dispatch(input = {}, meta = {}) {
    return executePipeline(input, meta);
  }

  function validate(input = {}, meta = {}) {
    return validateOnly(input, meta);
  }

  function cancel(commandId, meta = {}) {
    const blocked = gate(
      {
        ...meta,
        source: meta.source || meta.sender || meta.actor
      },
      "cancel"
    );
    if (blocked) return blocked;

    const id = String(commandId || "").trim();
    if (!id) return Object.freeze({ ok: false, error: "missing_commandId" });

    const slot = pending.get(id);
    if (!slot) {
      const existing = results.get(id);
      if (existing && existing.result === CBM_RESULT.PENDING) {
        // race: treat as not cancellable if already finished path
      }
      if (existing && existing.result !== CBM_RESULT.PENDING) {
        return Object.freeze({
          ok: false,
          error: "command_already_completed",
          commandId: id,
          result: existing.result
        });
      }
      return Object.freeze({
        ok: false,
        error: "command_not_pending",
        commandId: id
      });
    }

    slot.cancelled = true;
    pending.delete(id);

    const cancelled = Object.freeze({
      ok: true,
      commandId: id,
      result: CBM_RESULT.CANCELLED,
      cancelled: true
    });
    storeResult(id, cancelled);
    recordAudit({
      commandId: id,
      sender: slot.command.sender,
      handler: null,
      receivedAt: slot.startedAt,
      completedAt: Date.now(),
      result: CBM_RESULT.CANCELLED,
      correlationId: slot.command.correlationId
    });
    return cancelled;
  }

  function getResult(commandId) {
    const id = String(commandId || "").trim();
    if (!id) return Object.freeze({ ok: false, error: "missing_commandId" });
    const entry = results.get(id);
    if (!entry) {
      return Object.freeze({ ok: false, error: "result_not_found", commandId: id });
    }
    return Object.freeze({ ok: true, commandId: id, ...entry });
  }

  function metrics() {
    return Object.freeze({
      commandCount,
      handlerCount: handlers.size,
      successCount,
      rejectedCount,
      averageExecutionMs: execSamples > 0 ? execSumMs / execSamples : 0,
      errorCount,
      soleCommandBusAuthority: true,
      oneHandlerPerCommand: true,
      doesNotStoreDomainEvents: true,
      doesNotStoreQueueMessages: true,
      separatedFromEventBus: true,
      idempotentOnce: true
    });
  }

  function commandAudit() {
    return Object.freeze([...commandAuditLog]);
  }

  function status() {
    return Object.freeze({
      ok: true,
      singleton: true,
      soleCommandBusAuthority: true,
      oneHandlerPerCommand: true,
      doesNotStoreDomainEvents: true,
      doesNotStoreQueueMessages: true,
      separatedFromEventBus: true,
      idempotentOnce: true,
      components: CBM_COMPONENT_ORDER,
      pipeline: CBM_PIPELINE,
      handlerCount: handlers.size,
      commandCount,
      pendingCount: pending.size
    });
  }

  const manager = Object.freeze({
    ok: true,
    send,
    validate,
    dispatch,
    cancel,
    getResult,
    registerHandler,
    metrics,
    commandAudit,
    status,
    isActive() {
      return active === true;
    }
  });

  activeCommandBusManager = {
    isActive: manager.isActive
  };

  return manager;
}

function clearCommandBusSingletonForTest() {
  activeCommandBusManager = null;
}

module.exports = {
  CBM_COMPONENT,
  CBM_COMPONENT_ORDER,
  CBM_PIPELINE,
  CBM_DESCRIPTOR_FIELDS,
  CBM_PRIORITY,
  CBM_PRIORITY_ORDER,
  CBM_PRIORITY_RANK,
  CBM_RESULT,
  CBM_AUTHORIZED_SOURCES,
  CBM_FLAGS,
  CBM_PUBLIC_API,
  CBM_RUNTIME_ANCHORS,
  createCommandDescriptor,
  createCommandBusManager,
  clearCommandBusSingletonForTest,
  soleCommandBusAuthority: true,
  oneHandlerPerCommand: true,
  doesNotStoreDomainEvents: true,
  doesNotStoreQueueMessages: true,
  separatedFromEventBus: true,
  idempotentOnce: true
};
