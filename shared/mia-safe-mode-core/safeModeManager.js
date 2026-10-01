"use strict";

/**
 * Master Canon 0068 — Safe Mode Manager.
 * Kernel Layer 0 sole authority for restricted safe operation.
 * Goal is restricted operation — never system shutdown.
 */

const crypto = require("crypto");

const SMM_COMPONENT = Object.freeze({
  SAFE_MODE_MANAGER: "safe_mode_manager",
  ACTIVATION_GATE: "activation_gate",
  LEVEL_CONTROLLER: "level_controller",
  RESTRICTION_ENGINE: "restriction_engine",
  ISOLATION_CONTROLLER: "isolation_controller",
  KERNEL_GUARDIAN: "kernel_guardian",
  RUNTIME_GATE: "runtime_gate",
  AI_THROTTLE: "ai_throttle",
  PLATFORM_ISOLATOR: "platform_isolator",
  EXIT_VERIFIER: "exit_verifier",
  REPORT_ENGINE: "report_engine",
  METRICS_AUDIT: "metrics_audit"
});

const SMM_COMPONENT_ORDER = Object.freeze(Object.values(SMM_COMPONENT));

const SMM_LEVEL = Object.freeze({
  LIGHT: 1,
  PARTIAL: 2,
  ESSENTIAL_ONLY: 3,
  KERNEL_SURVIVAL: 4
});

const SMM_LEVEL_NAME = Object.freeze({
  1: "light",
  2: "partial",
  3: "essential_only",
  4: "kernel_survival"
});

const SMM_LEVEL_ORDER = Object.freeze([1, 2, 3, 4]);

const SMM_STATUS = Object.freeze({
  INACTIVE: "inactive",
  DECIDING: "deciding",
  ACTIVE: "active",
  EXITING: "exiting",
  EXITED: "exited",
  REJECTED: "rejected"
});

const SMM_STATUS_ORDER = Object.freeze([
  SMM_STATUS.INACTIVE,
  SMM_STATUS.DECIDING,
  SMM_STATUS.ACTIVE,
  SMM_STATUS.EXITING,
  SMM_STATUS.EXITED,
  SMM_STATUS.REJECTED
]);

const SMM_DESCRIPTOR_FIELDS = Object.freeze([
  "safeModeId",
  "level",
  "reason",
  "started",
  "ended",
  "runtimeId",
  "owner",
  "status"
]);

const SMM_ENTER_WORKFLOW = Object.freeze([
  "fault",
  "recovery_failed",
  "safe_mode_decision",
  "safe_mode_active"
]);

const SMM_EXIT_WORKFLOW = Object.freeze([
  "health_stable",
  "verification",
  "recovery_complete",
  "exit_safe_mode"
]);

const SMM_ACTIVATION_TRIGGERS = Object.freeze([
  "recovery_failed",
  "critical_fault",
  "config_corruption",
  "sustained_overload",
  "multi_service_outage",
  "admin_manual"
]);

/** Services that are NEVER disabled in Safe Mode. */
const SMM_PRESERVED_SERVICES = Object.freeze([
  "runtime",
  "fault_manager",
  "recovery_manager",
  "watchdog",
  "health_manager",
  "audit",
  "monitoring",
  "kernel"
]);

/** Features/services disabled starting at each level (cumulative). */
const SMM_DISABLED_BY_LEVEL = Object.freeze({
  1: Object.freeze(["diagnostics", "plugins"]),
  2: Object.freeze(["battle", "ai_heavy", "image_generation"]),
  3: Object.freeze([
    "non_essential",
    "experimental",
    "animations_heavy",
    "external_plugins"
  ]),
  4: Object.freeze(["everything_except_kernel_essentials"])
});

/** Services allowed to start at each level (beyond preserved). */
const SMM_ALLOWED_SERVICES_BY_LEVEL = Object.freeze({
  1: Object.freeze([
    ...SMM_PRESERVED_SERVICES,
    "communication",
    "battle",
    "ai",
    "obs",
    "tiktok",
    "kick",
    "twitch"
  ]),
  2: Object.freeze([
    ...SMM_PRESERVED_SERVICES,
    "communication",
    "ai",
    "obs",
    "tiktok",
    "kick",
    "twitch"
  ]),
  3: Object.freeze([
    ...SMM_PRESERVED_SERVICES,
    "communication",
    "recovery",
    "monitoring"
  ]),
  4: Object.freeze([...SMM_PRESERVED_SERVICES])
});

const SMM_PLATFORM_IDS = Object.freeze([
  "tiktok",
  "kick",
  "twitch",
  "discord",
  "obs"
]);

const SMM_AI_RESTRICTIONS_BY_LEVEL = Object.freeze({
  1: Object.freeze({
    imageGeneration: false,
    textOnly: true,
    modelSizeLimit: "medium",
    maxParallel: 2
  }),
  2: Object.freeze({
    imageGeneration: false,
    textOnly: true,
    modelSizeLimit: "small",
    maxParallel: 1
  }),
  3: Object.freeze({
    imageGeneration: false,
    textOnly: true,
    modelSizeLimit: "tiny",
    maxParallel: 1
  }),
  4: Object.freeze({
    imageGeneration: false,
    textOnly: true,
    modelSizeLimit: "none",
    maxParallel: 0
  })
});

const SMM_PUBLIC_API = Object.freeze([
  "activate",
  "escalateLevel",
  "isolatePlatform",
  "canStartService",
  "aiRestrictions",
  "exit",
  "status",
  "current",
  "metrics",
  "auditTrail",
  "reportArchive",
  "getRestrictions"
]);

const SMM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-safe-mode-core/safeModeManager.js",
  "shared/mia-runtime-core/runtimeManager.js",
  "shared/mia-recovery-core/recoveryManager.js",
  "shared/mia-watchdog-core/watchdogEngine.js",
  "shared/mia-fault-core/faultManager.js",
  "docs/master-canon/0068-safe-mode-manager.md"
]);

const SMM_AUTHORIZED_SOURCES = Object.freeze([
  "kernel",
  "recovery_manager",
  "recovery-manager",
  "watchdog",
  "watchdog_engine",
  "fault_manager",
  "fault-manager",
  "runtime_manager",
  "runtime-manager",
  "operator",
  "admin",
  "system"
]);

const SMM_PRIVILEGED_EXIT_SOURCES = Object.freeze([
  "kernel",
  "recovery_manager",
  "recovery-manager",
  "operator",
  "admin",
  "system"
]);

const SMM_FLAGS = Object.freeze({
  soleSafeModeAuthority: true,
  shutsDownSystem: false,
  kernelAlwaysPreserved: true,
  exitRequiresVerification: true
});

let activeSafeModeManager = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function isValidLevel(level) {
  return SMM_LEVEL_ORDER.includes(level);
}

function isValidStatus(status) {
  return SMM_STATUS_ORDER.includes(status);
}

function isValidTrigger(trigger) {
  return SMM_ACTIVATION_TRIGGERS.includes(trigger);
}

function disabledFeaturesForLevel(level) {
  const out = [];
  for (const lvl of SMM_LEVEL_ORDER) {
    if (lvl > level) break;
    const set = SMM_DISABLED_BY_LEVEL[lvl] || [];
    for (const f of set) {
      if (!out.includes(f)) out.push(f);
    }
  }
  return Object.freeze(out);
}

function allowedServicesForLevel(level) {
  const list = SMM_ALLOWED_SERVICES_BY_LEVEL[level] || SMM_PRESERVED_SERVICES;
  return Object.freeze([...new Set(list)]);
}

function createSafeModeDescriptor(input = {}) {
  const level = input.level != null ? Number(input.level) : SMM_LEVEL.LIGHT;
  if (!isValidLevel(level)) {
    return { ok: false, error: "invalid_level", level };
  }

  const reason = String(input.reason || "").trim();
  if (!reason) return { ok: false, error: "missing_reason" };

  const runtimeId = String(input.runtimeId || "").trim();
  if (!runtimeId) return { ok: false, error: "missing_runtimeId" };

  const owner = String(input.owner || "").trim();
  if (!owner) return { ok: false, error: "missing_owner" };

  const status = input.status || SMM_STATUS.INACTIVE;
  if (!isValidStatus(status)) {
    return { ok: false, error: "invalid_status", status };
  }

  const started =
    typeof input.started === "number" && Number.isFinite(input.started)
      ? input.started
      : Date.now();

  const ended =
    input.ended == null
      ? null
      : typeof input.ended === "number" && Number.isFinite(input.ended)
        ? input.ended
        : null;

  const safeModeId = input.safeModeId || makeId("smm");

  return {
    ok: true,
    descriptor: Object.freeze({
      safeModeId,
      level,
      reason,
      started,
      ended,
      runtimeId,
      owner,
      status
    })
  };
}

function createSafeModeManager(options = {}) {
  if (
    activeSafeModeManager &&
    activeSafeModeManager.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "safe_mode_manager_already_active",
      soleSafeModeAuthority: true
    });
  }

  const authorized = new Set(
    options.authorizedSources || SMM_AUTHORIZED_SOURCES
  );
  const privilegedExit = new Set(
    options.privilegedExitSources || SMM_PRIVILEGED_EXIT_SOURCES
  );

  const runtimeBridge =
    options.runtimeBridge ||
    Object.freeze({
      notify() {
        return { ok: false, error: "runtime_bridge_not_wired" };
      }
    });

  const exitVerifier =
    typeof options.exitVerifier === "function"
      ? options.exitVerifier
      : null;

  const audit = [];
  const archive = [];
  const phaseHistory = [];
  const history = [];
  const isolatedPlatforms = new Set();

  let current = null;
  let activationCount = 0;
  let totalActiveMs = 0;
  let rejectedCount = 0;
  const byLevel = { 1: 0, 2: 0, 3: 0, 4: 0 };

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

  function isPrivilegedExit(meta = {}) {
    return (
      privilegedExit.has(meta.source || "") ||
      privilegedExit.has(meta.actor || "") ||
      (meta.authorized === true &&
        (meta.source === "operator" ||
          meta.source === "admin" ||
          meta.source === "kernel" ||
          meta.source === "system" ||
          meta.source === "recovery_manager" ||
          meta.source === "recovery-manager"))
    );
  }

  function appendAudit(record) {
    audit.push(
      Object.freeze({
        ...record,
        at: record.at != null ? record.at : Date.now(),
        immutable: true
      })
    );
  }

  function pushPhase(phase, detail = {}) {
    phaseHistory.push(
      Object.freeze({
        phase,
        at: detail.at != null ? detail.at : Date.now(),
        safeModeId: detail.safeModeId || (current && current.safeModeId) || null,
        ...detail
      })
    );
  }

  function snapshotCurrent() {
    if (!current) return null;
    return Object.freeze({
      safeModeId: current.safeModeId,
      level: current.level,
      reason: current.reason,
      started: current.started,
      ended: current.ended,
      runtimeId: current.runtimeId,
      owner: current.owner,
      status: current.status,
      trigger: current.trigger,
      affectedComponents: Object.freeze([...(current.affectedComponents || [])]),
      isolatedPlatforms: Object.freeze([...isolatedPlatforms]),
      kernelPreserved: true,
      phases: Object.freeze([...(current.phases || [])])
    });
  }

  function getRestrictionsFor(level) {
    const disabled = disabledFeaturesForLevel(level);
    const preserved = [...SMM_PRESERVED_SERVICES];
    const allowed = allowedServicesForLevel(level);
    return Object.freeze({
      level,
      levelName: SMM_LEVEL_NAME[level],
      disabled: Object.freeze([...disabled]),
      preserved: Object.freeze(preserved),
      allowedServices: Object.freeze([...allowed]),
      kernelPreserved: true
    });
  }

  function notifyRuntime(event, detail) {
    if (typeof runtimeBridge.notify === "function") {
      try {
        runtimeBridge.notify(event, detail);
      } catch (_err) {
        /* notify-only; ignore bridge errors */
      }
    }
  }

  function activate(input = {}, meta = {}) {
    if (meta.forged === true) {
      rejectedCount += 1;
      appendAudit({ action: "reject", reason: "forged", at: Date.now() });
      return { ok: false, error: "forged_activation_blocked" };
    }
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      rejectedCount += 1;
      appendAudit({
        action: "reject",
        reason: "unauthorized",
        source: meta.source || null,
        at: Date.now()
      });
      return { ok: false, error: "unauthorized_activation" };
    }

    if (current && current.status === SMM_STATUS.ACTIVE) {
      return {
        ok: false,
        error: "safe_mode_already_active",
        hint: "use_escalateLevel"
      };
    }

    const level = input.level != null ? Number(input.level) : SMM_LEVEL.LIGHT;
    if (!isValidLevel(level)) {
      return { ok: false, error: "invalid_level", level };
    }

    const trigger = input.trigger || "admin_manual";
    if (!isValidTrigger(trigger)) {
      return { ok: false, error: "invalid_trigger", trigger };
    }

    const nowMs = meta.nowMs != null ? meta.nowMs : Date.now();

    pushPhase("fault", { at: nowMs, trigger });
    pushPhase("recovery_failed", { at: nowMs, trigger });
    pushPhase("safe_mode_decision", { at: nowMs, level });

    const desc = createSafeModeDescriptor({
      safeModeId: input.safeModeId,
      level,
      reason: input.reason,
      started: nowMs,
      ended: null,
      runtimeId: input.runtimeId,
      owner: input.owner || meta.source || "system",
      status: SMM_STATUS.ACTIVE
    });
    if (!desc.ok) return desc;

    const affectedComponents = Array.isArray(input.affectedComponents)
      ? [...input.affectedComponents]
      : [];

    current = {
      safeModeId: desc.descriptor.safeModeId,
      level: desc.descriptor.level,
      reason: desc.descriptor.reason,
      started: desc.descriptor.started,
      ended: null,
      runtimeId: desc.descriptor.runtimeId,
      owner: desc.descriptor.owner,
      status: SMM_STATUS.ACTIVE,
      trigger,
      affectedComponents,
      phases: [...SMM_ENTER_WORKFLOW],
      initiator: meta.source || meta.actor || "system"
    };

    activationCount += 1;
    byLevel[level] = (byLevel[level] || 0) + 1;
    isolatedPlatforms.clear();

    pushPhase("safe_mode_active", {
      at: nowMs,
      safeModeId: current.safeModeId,
      level
    });

    appendAudit({
      action: "activate",
      safeModeId: current.safeModeId,
      runtimeId: current.runtimeId,
      reason: current.reason,
      level: current.level,
      trigger,
      initiator: current.initiator,
      result: "ACTIVE",
      at: nowMs
    });

    notifyRuntime("safe_mode_active", snapshotCurrent());

    return Object.freeze({
      ok: true,
      safeMode: snapshotCurrent(),
      safeModeId: current.safeModeId,
      phases: Object.freeze([...current.phases]),
      kernelPreserved: true,
      restrictions: getRestrictionsFor(level)
    });
  }

  function escalateLevel(toLevel, meta = {}) {
    if (meta.forged === true) {
      return { ok: false, error: "forged_escalation_blocked" };
    }
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      return { ok: false, error: "unauthorized_escalation" };
    }
    if (!current || current.status !== SMM_STATUS.ACTIVE) {
      return { ok: false, error: "safe_mode_not_active" };
    }

    const next = Number(toLevel);
    if (!isValidLevel(next)) {
      return { ok: false, error: "invalid_level", level: next };
    }
    if (next <= current.level) {
      return {
        ok: false,
        error: "level_must_escalate",
        from: current.level,
        to: next
      };
    }

    const nowMs = meta.nowMs != null ? meta.nowMs : Date.now();
    const from = current.level;
    current.level = next;
    byLevel[next] = (byLevel[next] || 0) + 1;

    appendAudit({
      action: "escalate",
      safeModeId: current.safeModeId,
      runtimeId: current.runtimeId,
      reason: current.reason,
      level: next,
      fromLevel: from,
      toLevel: next,
      initiator: meta.source || meta.actor || current.initiator,
      result: "ESCALATED",
      at: nowMs
    });

    notifyRuntime("safe_mode_escalated", snapshotCurrent());

    return Object.freeze({
      ok: true,
      fromLevel: from,
      toLevel: next,
      safeMode: snapshotCurrent(),
      restrictions: getRestrictionsFor(next),
      kernelPreserved: true
    });
  }

  function isolatePlatform(platformId, meta = {}) {
    if (meta.forged === true) {
      return { ok: false, error: "forged_isolation_blocked" };
    }
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      return { ok: false, error: "unauthorized_isolation" };
    }
    if (!current || current.status !== SMM_STATUS.ACTIVE) {
      return { ok: false, error: "safe_mode_not_active" };
    }

    const id = String(platformId || "")
      .trim()
      .toLowerCase();
    if (!id) return { ok: false, error: "missing_platformId" };

    isolatedPlatforms.add(id);
    if (!current.affectedComponents.includes(id)) {
      current.affectedComponents.push(id);
    }

    const nowMs = meta.nowMs != null ? meta.nowMs : Date.now();
    const activePlatforms = SMM_PLATFORM_IDS.filter(
      (p) => !isolatedPlatforms.has(p)
    );

    appendAudit({
      action: "isolate_platform",
      safeModeId: current.safeModeId,
      runtimeId: current.runtimeId,
      platformId: id,
      level: current.level,
      reason: current.reason,
      initiator: meta.source || meta.actor || current.initiator,
      result: "ISOLATED",
      at: nowMs
    });

    return Object.freeze({
      ok: true,
      platformId: id,
      isolated: true,
      isolatedPlatforms: Object.freeze([...isolatedPlatforms]),
      otherPlatformsActive: Object.freeze(activePlatforms),
      kernelPreserved: true,
      kernelStopped: false
    });
  }

  function canStartService(serviceId) {
    const id = String(serviceId || "")
      .trim()
      .toLowerCase();
    if (!id) {
      return Object.freeze({
        ok: false,
        allowed: false,
        error: "missing_serviceId"
      });
    }

    if (SMM_PRESERVED_SERVICES.includes(id) || id === "kernel") {
      return Object.freeze({
        ok: true,
        allowed: true,
        serviceId: id,
        preserved: true,
        reason: "preserved_service"
      });
    }

    if (!current || current.status !== SMM_STATUS.ACTIVE) {
      return Object.freeze({
        ok: true,
        allowed: true,
        serviceId: id,
        restricted: false
      });
    }

    if (isolatedPlatforms.has(id)) {
      return Object.freeze({
        ok: true,
        allowed: false,
        serviceId: id,
        reason: "platform_isolated"
      });
    }

    const allowed = allowedServicesForLevel(current.level);
    const isAllowed = allowed.includes(id);

    if (current.level === SMM_LEVEL.KERNEL_SURVIVAL && !isAllowed) {
      return Object.freeze({
        ok: true,
        allowed: false,
        serviceId: id,
        reason: "kernel_survival_only"
      });
    }

    if (id === "diagnostics" || id === "plugins") {
      if (current.level >= 1) {
        return Object.freeze({
          ok: true,
          allowed: false,
          serviceId: id,
          reason: "level_restriction"
        });
      }
    }
    if (id === "battle" && current.level >= 2) {
      return Object.freeze({
        ok: true,
        allowed: false,
        serviceId: id,
        reason: "level_restriction"
      });
    }
    if (
      (id === "ai_heavy" || id === "image_generation") &&
      current.level >= 2
    ) {
      return Object.freeze({
        ok: true,
        allowed: false,
        serviceId: id,
        reason: "level_restriction"
      });
    }
    if (current.level >= 3 && !isAllowed) {
      return Object.freeze({
        ok: true,
        allowed: false,
        serviceId: id,
        reason: "essential_only"
      });
    }

    return Object.freeze({
      ok: true,
      allowed: isAllowed || current.level < 3,
      serviceId: id,
      level: current.level
    });
  }

  function isRestricted(feature) {
    const f = String(feature || "")
      .trim()
      .toLowerCase();
    if (!current || current.status !== SMM_STATUS.ACTIVE) {
      return false;
    }
    if (SMM_PRESERVED_SERVICES.includes(f) || f === "kernel") {
      return false;
    }
    const disabled = disabledFeaturesForLevel(current.level);
    if (disabled.includes(f)) return true;
    if (f === "battle" && current.level >= 2) return true;
    if (f === "diagnostics" && current.level >= 1) return true;
    if (f === "plugins" && current.level >= 1) return true;
    if (current.level >= 4 && !SMM_PRESERVED_SERVICES.includes(f)) return true;
    if (current.level >= 3) {
      const allowed = allowedServicesForLevel(current.level);
      return !allowed.includes(f);
    }
    return false;
  }

  function isKernelProtected() {
    return true;
  }

  function aiRestrictions() {
    if (!current || current.status !== SMM_STATUS.ACTIVE) {
      return null;
    }
    return SMM_AI_RESTRICTIONS_BY_LEVEL[current.level] || null;
  }

  function getRestrictions() {
    if (!current || current.status !== SMM_STATUS.ACTIVE) {
      return Object.freeze({
        active: false,
        level: null,
        disabled: Object.freeze([]),
        preserved: Object.freeze([...SMM_PRESERVED_SERVICES]),
        kernelPreserved: true
      });
    }
    return getRestrictionsFor(current.level);
  }

  function restrictedRuntime() {
    if (!current || current.status !== SMM_STATUS.ACTIVE) {
      return Object.freeze({
        restricted: false,
        level: null,
        allowedServices: null
      });
    }
    return Object.freeze({
      restricted: true,
      level: current.level,
      levelName: SMM_LEVEL_NAME[current.level],
      allowedServices: allowedServicesForLevel(current.level),
      isolatedPlatforms: Object.freeze([...isolatedPlatforms]),
      kernelPreserved: true
    });
  }

  function runVerification(meta = {}) {
    if (meta.verified === true && isPrivilegedExit(meta)) {
      return Object.freeze({
        ok: true,
        verified: true,
        method: "meta_verified"
      });
    }
    if (typeof exitVerifier === "function") {
      const result = exitVerifier({
        safeMode: snapshotCurrent(),
        meta
      });
      if (result && result.ok === true && result.verified === true) {
        return Object.freeze({
          ok: true,
          verified: true,
          method: "injected_verifier"
        });
      }
      return Object.freeze({
        ok: false,
        verified: false,
        error: (result && result.error) || "verification_failed"
      });
    }
    return Object.freeze({
      ok: false,
      verified: false,
      error: "verification_required"
    });
  }

  function exit(meta = {}) {
    if (meta.forged === true) {
      rejectedCount += 1;
      appendAudit({
        action: "reject",
        reason: "forged_exit",
        at: Date.now()
      });
      return { ok: false, error: "forged_exit_blocked" };
    }
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      rejectedCount += 1;
      appendAudit({
        action: "reject",
        reason: "unauthorized_exit",
        source: meta.source || null,
        at: Date.now()
      });
      return { ok: false, error: "unauthorized_exit" };
    }
    if (!current || current.status !== SMM_STATUS.ACTIVE) {
      return { ok: false, error: "safe_mode_not_active" };
    }

    const nowMs = meta.nowMs != null ? meta.nowMs : Date.now();
    pushPhase("health_stable", { at: nowMs });
    pushPhase("verification", { at: nowMs });

    const verification = runVerification(meta);
    if (!verification.ok || !verification.verified) {
      appendAudit({
        action: "exit_blocked",
        safeModeId: current.safeModeId,
        runtimeId: current.runtimeId,
        reason: current.reason,
        level: current.level,
        initiator: meta.source || meta.actor || null,
        result: "VERIFICATION_FAILED",
        at: nowMs
      });
      return {
        ok: false,
        error: verification.error || "verification_failed",
        verified: false
      };
    }

    pushPhase("recovery_complete", { at: nowMs });
    pushPhase("exit_safe_mode", { at: nowMs });

    const duration = nowMs - current.started;
    totalActiveMs += duration;
    current.status = SMM_STATUS.EXITED;
    current.ended = nowMs;
    current.phases.push(...SMM_EXIT_WORKFLOW);

    const exitMethod = meta.exitMethod || verification.method || "verified_exit";
    const result = meta.result || "RECOVERED";

    const report = Object.freeze({
      safeModeId: current.safeModeId,
      reason: current.reason,
      level: current.level,
      affectedComponents: Object.freeze([...(current.affectedComponents || [])]),
      duration,
      exitMethod,
      result,
      runtimeId: current.runtimeId,
      started: current.started,
      ended: current.ended
    });
    archive.push(report);
    history.push(snapshotCurrent());

    appendAudit({
      action: "exit",
      safeModeId: current.safeModeId,
      runtimeId: current.runtimeId,
      reason: current.reason,
      level: current.level,
      initiator: meta.source || meta.actor || current.initiator,
      result,
      exitMethod,
      duration,
      at: nowMs
    });

    notifyRuntime("safe_mode_exited", report);

    const exited = snapshotCurrent();
    current = null;
    isolatedPlatforms.clear();

    return Object.freeze({
      ok: true,
      verified: true,
      safeMode: exited,
      report,
      phases: Object.freeze([...SMM_EXIT_WORKFLOW])
    });
  }

  function metrics() {
    return Object.freeze({
      active: !!(current && current.status === SMM_STATUS.ACTIVE),
      currentLevel:
        current && current.status === SMM_STATUS.ACTIVE ? current.level : null,
      activationCount,
      totalActiveMs,
      historyCount: history.length,
      byLevel: Object.freeze({ ...byLevel }),
      rejectedCount,
      archivedReports: archive.length,
      isolatedPlatformCount: isolatedPlatforms.size
    });
  }

  function rejectShutdown(op) {
    appendAudit({
      action: "blocked",
      operation: op,
      reason: "safe_mode_does_not_shutdown",
      at: Date.now()
    });
    return Object.freeze({
      ok: false,
      error: "safe_mode_does_not_shutdown",
      shutsDownSystem: false,
      operation: op
    });
  }

  function blockedHistoryMutation(op) {
    appendAudit({
      action: "blocked",
      operation: op,
      reason: "audit_immutable",
      at: Date.now()
    });
    return Object.freeze({
      ok: false,
      error: "history_mutation_blocked",
      operation: op
    });
  }

  const engine = Object.freeze({
    ok: true,
    activate,
    escalateLevel,
    isolatePlatform,
    canStartService,
    isRestricted,
    isKernelProtected,
    aiRestrictions,
    exit,
    getRestrictions,
    restrictedRuntime,
    current() {
      return snapshotCurrent();
    },
    metrics,
    auditTrail() {
      return Object.freeze([...audit]);
    },
    reportArchive() {
      return Object.freeze([...archive]);
    },
    phaseHistory() {
      return Object.freeze([...phaseHistory]);
    },
    history() {
      return Object.freeze([...history]);
    },
    status() {
      return Object.freeze({
        singleton: true,
        soleSafeModeAuthority: SMM_FLAGS.soleSafeModeAuthority,
        shutsDownSystem: SMM_FLAGS.shutsDownSystem,
        kernelAlwaysPreserved: SMM_FLAGS.kernelAlwaysPreserved,
        exitRequiresVerification: SMM_FLAGS.exitRequiresVerification,
        active: !!(current && current.status === SMM_STATUS.ACTIVE),
        currentLevel:
          current && current.status === SMM_STATUS.ACTIVE
            ? current.level
            : null,
        status:
          current && current.status === SMM_STATUS.ACTIVE
            ? SMM_STATUS.ACTIVE
            : SMM_STATUS.INACTIVE,
        components: SMM_COMPONENT_ORDER,
        activationCount
      });
    },
    isActive() {
      return true;
    },
    deleteHistory() {
      return blockedHistoryMutation("deleteHistory");
    },
    clearHistory() {
      return blockedHistoryMutation("clearHistory");
    },
    purge() {
      return blockedHistoryMutation("purge");
    },
    shutdown() {
      return rejectShutdown("shutdown");
    },
    kill() {
      return rejectShutdown("kill");
    },
    killProcess() {
      return rejectShutdown("killProcess");
    },
    halt() {
      return rejectShutdown("halt");
    },
    powerOff() {
      return rejectShutdown("powerOff");
    }
  });

  activeSafeModeManager = {
    isActive: engine.isActive
  };

  return engine;
}

function clearSafeModeSingletonForTest() {
  activeSafeModeManager = null;
}

module.exports = {
  SMM_COMPONENT,
  SMM_COMPONENT_ORDER,
  SMM_LEVEL,
  SMM_LEVEL_NAME,
  SMM_LEVEL_ORDER,
  SMM_STATUS,
  SMM_STATUS_ORDER,
  SMM_DESCRIPTOR_FIELDS,
  SMM_ENTER_WORKFLOW,
  SMM_EXIT_WORKFLOW,
  SMM_ACTIVATION_TRIGGERS,
  SMM_PRESERVED_SERVICES,
  SMM_DISABLED_BY_LEVEL,
  SMM_ALLOWED_SERVICES_BY_LEVEL,
  SMM_PLATFORM_IDS,
  SMM_AI_RESTRICTIONS_BY_LEVEL,
  SMM_PUBLIC_API,
  SMM_RUNTIME_ANCHORS,
  SMM_AUTHORIZED_SOURCES,
  SMM_PRIVILEGED_EXIT_SOURCES,
  SMM_FLAGS,
  createSafeModeDescriptor,
  disabledFeaturesForLevel,
  allowedServicesForLevel,
  createSafeModeManager,
  clearSafeModeSingletonForTest
};
