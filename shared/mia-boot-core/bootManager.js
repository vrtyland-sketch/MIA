"use strict";

/**
 * Master Canon 0051 — Boot Manager: first active component after Node.js runtime.
 * Prepares a stable Kernel environment. No domain/AI/game logic.
 */

const crypto = require("crypto");
const os = require("os");
const fs = require("fs");
const path = require("path");

const BM_COMPONENT = Object.freeze({
  BOOT_MANAGER: "boot_manager",
  ENVIRONMENT_VALIDATOR: "environment_validator",
  CONFIGURATION_LOADER: "configuration_loader",
  RUNTIME_CONTEXT: "runtime_context",
  FILESYSTEM_CHECK: "filesystem_check",
  REGISTRY_INIT: "registry_init",
  KERNEL_SERVICE_INIT: "kernel_service_init",
  DEPENDENCY_VALIDATOR: "dependency_validator",
  HEALTH_VERIFIER: "health_verifier",
  BOOT_REPORT: "boot_report",
  RECOVERY: "recovery",
  BOOT_API: "boot_api"
});

const BM_COMPONENT_ORDER = Object.freeze(Object.values(BM_COMPONENT));

const BM_PIPELINE = Object.freeze([
  "BOOT-00",
  "BOOT-01",
  "BOOT-02",
  "BOOT-03",
  "BOOT-04",
  "BOOT-05",
  "BOOT-06",
  "BOOT-07",
  "BOOT-08"
]);

const BM_PIPELINE_LABEL = Object.freeze({
  "BOOT-00": "power_on",
  "BOOT-01": "environment_validation",
  "BOOT-02": "load_configuration",
  "BOOT-03": "initialize_runtime_context",
  "BOOT-04": "initialize_registries",
  "BOOT-05": "initialize_kernel_services",
  "BOOT-06": "dependency_validation",
  "BOOT-07": "health_verification",
  "BOOT-08": "ready"
});

const BM_STATE = Object.freeze({
  IDLE: "idle",
  BOOTING: "booting",
  READY: "ready",
  FAILED: "failed",
  SAFE_BOOT: "safe_boot",
  STOPPED: "stopped"
});

const BM_ERROR_SEVERITY = Object.freeze({
  FATAL: "fatal",
  RECOVERABLE: "recoverable"
});

const BM_CONFIG_LAYERS = Object.freeze([
  "default",
  "environment",
  "secrets",
  "user",
  "runtime_overrides"
]);

const BM_REQUIRED_DIRS = Object.freeze([
  "config",
  "data",
  "runtime",
  "cache",
  "logs",
  "modules",
  "plugins",
  "backups",
  "temp"
]);

const BM_KERNEL_SERVICES = Object.freeze([
  "logger",
  "diagnostics",
  "monitoring",
  "scheduler",
  "recovery",
  "watchdog"
]);

const BM_REGISTRY_KIND = Object.freeze({
  SERVICE: "service",
  MODULE: "module",
  EVENT: "event",
  CONFIGURATION: "configuration",
  API: "api",
  FEATURE: "feature",
  PLATFORM: "platform"
});

const BM_DEFAULT_TIMEOUTS_MS = Object.freeze({
  environment_validation: 5000,
  configuration_load: 10000,
  registry_initialization: 10000,
  runtime_initialization: 15000,
  health_verification: 10000
});

const BM_PUBLIC_API = Object.freeze([
  "boot",
  "shutdown",
  "restart",
  "safeBoot",
  "verifyEnvironment",
  "generateBootReport",
  "status"
]);

const BM_FORBIDDEN_ACTIVITIES = Object.freeze([
  "business_logic",
  "ai_decision",
  "game_mechanics",
  "battle_control",
  "economy_mutation",
  "chat_reply",
  "obs_control",
  "tiktok_api"
]);

const BM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-boot-core/bootManager.js",
  "shared/mia-kernel-core/coreKernel.js",
  "shared/mia-core-canon/runtimeManager.js",
  "scripts/MIA_CONFIG.js",
  "scripts/MIA_SERVER_BOOTSTRAP.js",
  "scripts/MIA_ENV.js",
  "index.js",
  "server.js"
]);

function assertBootForbiddenActivity(activity) {
  const forbidden = BM_FORBIDDEN_ACTIVITIES.includes(activity);
  return Object.freeze({ ok: !forbidden, activity, forbidden });
}

function hashConfiguration(config = {}) {
  const payload = JSON.stringify(config);
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

function verifyEnvironment(input = {}) {
  const nodeVersion = process.versions.node;
  const major = Number(String(nodeVersion).split(".")[0]);
  const minNode = input.minNodeMajor != null ? Number(input.minNodeMajor) : 18;
  const platform = process.platform;
  const supportedOs = input.supportedOs || ["win32", "linux", "darwin"];
  const freeMem = os.freemem();
  const totalMem = os.totalmem();
  const cpus = os.cpus().length;
  const errors = [];

  if (!supportedOs.includes(platform)) {
    errors.push({ severity: BM_ERROR_SEVERITY.FATAL, code: "unsupported_os", detail: platform });
  }
  if (major < minNode) {
    errors.push({
      severity: BM_ERROR_SEVERITY.FATAL,
      code: "node_version_incompatible",
      detail: `node=${nodeVersion} minMajor=${minNode}`
    });
  }
  if (input.requirePackages) {
    for (const pkg of input.requirePackages) {
      try {
        require.resolve(pkg);
      } catch {
        errors.push({
          severity: BM_ERROR_SEVERITY.RECOVERABLE,
          code: "package_missing",
          detail: pkg
        });
      }
    }
  }
  if (input.minFreeMemMb != null && freeMem < input.minFreeMemMb * 1024 * 1024) {
    errors.push({
      severity: BM_ERROR_SEVERITY.FATAL,
      code: "insufficient_ram",
      detail: `freeMem=${freeMem}`
    });
  }

  const fatal = errors.filter((e) => e.severity === BM_ERROR_SEVERITY.FATAL);
  return Object.freeze({
    ok: fatal.length === 0,
    platform,
    nodeVersion,
    cpus,
    freeMem,
    totalMem,
    hostname: os.hostname(),
    errors: Object.freeze(errors),
    fatalCount: fatal.length,
    component: BM_COMPONENT.ENVIRONMENT_VALIDATOR
  });
}

function loadConfiguration(layers = {}) {
  const merged = {};
  const applied = [];
  for (const layer of BM_CONFIG_LAYERS) {
    const chunk = layers[layer];
    if (chunk && typeof chunk === "object") {
      Object.assign(merged, chunk);
      applied.push(layer);
    }
  }
  if (layers.secretsInRepo === true) {
    return Object.freeze({
      ok: false,
      error: "secrets_in_repo_forbidden",
      severity: BM_ERROR_SEVERITY.FATAL,
      component: BM_COMPONENT.CONFIGURATION_LOADER
    });
  }
  return Object.freeze({
    ok: true,
    config: Object.freeze({ ...merged }),
    layersApplied: Object.freeze(applied),
    configurationHash: hashConfiguration(merged),
    component: BM_COMPONENT.CONFIGURATION_LOADER
  });
}

function createBootRuntimeContext(input = {}) {
  return Object.freeze({
    ok: true,
    runtimeId: input.runtimeId || `rt-${crypto.randomUUID()}`,
    bootId: input.bootId || `boot-${crypto.randomUUID()}`,
    startTime: input.startTime || Date.now(),
    environment: input.environment || "development",
    version: input.version || "1.0.0",
    build: input.build || "canon-0051",
    hostname: input.hostname || os.hostname(),
    loadedModules: Object.freeze(input.loadedModules || []),
    loadedServices: Object.freeze(input.loadedServices || []),
    configurationHash: input.configurationHash || null,
    readOnly: true,
    component: BM_COMPONENT.RUNTIME_CONTEXT
  });
}

function checkFilesystemStructure(rootDir, options = {}) {
  const missing = [];
  const created = [];
  const autoCreate = options.autoCreate !== false;
  for (const dir of BM_REQUIRED_DIRS) {
    const full = path.join(rootDir, dir);
    if (!fs.existsSync(full)) {
      if (autoCreate && options.allowCreate === true) {
        fs.mkdirSync(full, { recursive: true });
        created.push(dir);
      } else {
        missing.push(dir);
      }
    }
  }
  return Object.freeze({
    ok: missing.length === 0,
    required: BM_REQUIRED_DIRS,
    missing: Object.freeze(missing),
    created: Object.freeze(created),
    severity: missing.length > 0 ? BM_ERROR_SEVERITY.RECOVERABLE : null,
    component: BM_COMPONENT.FILESYSTEM_CHECK
  });
}

function initializeRegistries() {
  const registries = {};
  for (const kind of Object.values(BM_REGISTRY_KIND)) {
    registries[kind] = Object.freeze({});
  }
  return Object.freeze({
    ok: true,
    registries: Object.freeze(registries),
    locked: true,
    kinds: Object.freeze(Object.values(BM_REGISTRY_KIND)),
    component: BM_COMPONENT.REGISTRY_INIT
  });
}

function initializeKernelServices(serviceIds = BM_KERNEL_SERVICES) {
  const started = serviceIds.map((serviceId) =>
    Object.freeze({
      serviceId,
      status: "running",
      layer: "kernel"
    })
  );
  return Object.freeze({
    ok: true,
    services: Object.freeze(started),
    higherLayersRunning: false,
    component: BM_COMPONENT.KERNEL_SERVICE_INIT
  });
}

function validateDependencies(nodes = []) {
  const edges = [];
  for (const node of nodes) {
    for (const dep of node.dependencies || []) {
      edges.push(Object.freeze({ from: dep, to: node.id }));
    }
  }
  const visiting = new Set();
  const visited = new Set();
  let cyclic = false;

  function dfs(id) {
    if (visiting.has(id)) {
      cyclic = true;
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const edge of edges) {
      if (edge.from === id) dfs(edge.to);
    }
    visiting.delete(id);
    visited.add(id);
  }

  for (const node of nodes) dfs(node.id);

  return Object.freeze({
    ok: !cyclic,
    cyclic,
    nodes: Object.freeze(nodes.map((n) => n.id)),
    edges: Object.freeze(edges),
    severity: cyclic ? BM_ERROR_SEVERITY.FATAL : null,
    component: BM_COMPONENT.DEPENDENCY_VALIDATOR
  });
}

function verifyHealth(input = {}) {
  const checks = Object.freeze({
    runtimeContext: input.runtimeContext === true,
    registries: input.registries === true,
    kernelServices: input.kernelServices === true,
    dependencies: input.dependencies === true
  });
  const ok = Object.values(checks).every(Boolean);
  return Object.freeze({
    ok,
    checks,
    severity: ok ? null : BM_ERROR_SEVERITY.FATAL,
    component: BM_COMPONENT.HEALTH_VERIFIER
  });
}

function classifyError(error = {}) {
  const code = error.code || error.message || "unknown";
  const fatalCodes = new Set([
    "corrupted_configuration",
    "missing_runtime",
    "invalid_kernel_version",
    "unsupported_os",
    "node_version_incompatible",
    "insufficient_ram",
    "cyclic_dependency",
    "boot_pipeline_order_violation",
    "timeout"
  ]);
  const severity = fatalCodes.has(code) || error.severity === BM_ERROR_SEVERITY.FATAL
    ? BM_ERROR_SEVERITY.FATAL
    : BM_ERROR_SEVERITY.RECOVERABLE;
  return Object.freeze({
    ok: severity !== BM_ERROR_SEVERITY.FATAL,
    code,
    severity,
    blocksBoot: severity === BM_ERROR_SEVERITY.FATAL,
    component: BM_COMPONENT.RECOVERY
  });
}

function runRecovery(input = {}) {
  const maxAttempts = input.maxAttempts != null ? Number(input.maxAttempts) : 3;
  const attempts = [];
  let recovered = false;
  for (let i = 1; i <= maxAttempts; i += 1) {
    attempts.push(
      Object.freeze({
        attempt: i,
        phase: "detect_log_retry_recover_verify"
      })
    );
    if (input.recoverOnAttempt == null || i >= Number(input.recoverOnAttempt)) {
      recovered = input.fatal !== true;
      if (recovered) break;
    }
  }
  return Object.freeze({
    ok: recovered,
    attempts: Object.freeze(attempts),
    maxAttempts,
    pipeline: Object.freeze(["detect", "log", "retry", "recover", "verify", "continue"]),
    component: BM_COMPONENT.RECOVERY
  });
}

function generateBootReport(input = {}) {
  return Object.freeze({
    ok: true,
    bootId: input.bootId,
    durationMs: input.durationMs != null ? Number(input.durationMs) : 0,
    startedServices: Object.freeze(input.startedServices || []),
    disabledModules: Object.freeze(input.disabledModules || []),
    warnings: Object.freeze(input.warnings || []),
    errors: Object.freeze(input.errors || []),
    version: input.version || "1.0.0",
    state: input.state || BM_STATE.READY,
    logged: true,
    component: BM_COMPONENT.BOOT_REPORT
  });
}

function runBootPipeline(completed = {}) {
  const pipeline = BM_PIPELINE.map((step) =>
    Object.freeze({
      step,
      label: BM_PIPELINE_LABEL[step],
      done: completed[step] === true
    })
  );
  let orderOk = true;
  for (let i = 0; i < BM_PIPELINE.length; i += 1) {
    const step = BM_PIPELINE[i];
    if (!completed[step]) continue;
    for (let j = 0; j < i; j += 1) {
      if (completed[BM_PIPELINE[j]] !== true) {
        orderOk = false;
      }
    }
  }
  return Object.freeze({
    ok: pipeline.every((s) => s.done) && orderOk,
    pipeline: Object.freeze(pipeline),
    orderOk,
    immutableOrder: true,
    component: BM_COMPONENT.BOOT_MANAGER
  });
}

function createBootManager(options = {}) {
  const timeouts = { ...BM_DEFAULT_TIMEOUTS_MS, ...(options.timeouts || {}) };
  const maxRecoveryAttempts = options.maxRecoveryAttempts != null ? Number(options.maxRecoveryAttempts) : 3;
  const rootDir = options.rootDir || process.cwd();
  let state = BM_STATE.IDLE;
  let context = null;
  let lastReport = null;
  let recoveryCount = 0;
  let disabledModules = [];
  const audit = [];
  let handedOffToStartupSequence = false;
  let singletonGuard = true;

  function auditAction(action, detail = {}) {
    audit.push(Object.freeze({ at: Date.now(), action, detail: Object.freeze(detail) }));
  }

  function status() {
    return Object.freeze({
      ok: true,
      state,
      singleton: singletonGuard,
      publicApi: BM_PUBLIC_API,
      handedOffToStartupSequence,
      context,
      lastReport,
      recoveryCount,
      component: BM_COMPONENT.BOOT_API
    });
  }

  function boot(input = {}) {
    if (state === BM_STATE.READY || state === BM_STATE.BOOTING) {
      return Object.freeze({
        ok: false,
        error: "boot_already_active",
        state,
        component: BM_COMPONENT.BOOT_API
      });
    }

    state = BM_STATE.BOOTING;
    const startedAt = Date.now();
    const warnings = [];
    const errors = [];
    const completed = {};

    completed["BOOT-00"] = true;

    const env = verifyEnvironment(input.environment || {});
    if (!env.ok) {
      state = BM_STATE.FAILED;
      const report = generateBootReport({
        bootId: `boot-${crypto.randomUUID()}`,
        durationMs: Date.now() - startedAt,
        errors: env.errors,
        state: BM_STATE.FAILED,
        version: input.version || "1.0.0"
      });
      lastReport = report;
      auditAction("boot_failed", { phase: "BOOT-01" });
      return Object.freeze({
        ok: false,
        error: "environment_validation_failed",
        severity: BM_ERROR_SEVERITY.FATAL,
        env,
        report,
        component: BM_COMPONENT.BOOT_API
      });
    }
    completed["BOOT-01"] = true;

    const config = loadConfiguration(input.configuration || {
      default: { healthIntervalMs: 5000 },
      environment: { environment: input.environmentName || "development" },
      user: input.userConfig || {},
      runtime_overrides: input.runtimeOverrides || {}
    });
    if (!config.ok) {
      state = BM_STATE.FAILED;
      return Object.freeze({
        ok: false,
        error: config.error,
        severity: BM_ERROR_SEVERITY.FATAL,
        component: BM_COMPONENT.BOOT_API
      });
    }
    completed["BOOT-02"] = true;

    const bootId = `boot-${crypto.randomUUID()}`;
    context = createBootRuntimeContext({
      bootId,
      environment: config.config.environment || "development",
      version: input.version || "1.0.0",
      build: input.build || "canon-0051",
      hostname: env.hostname,
      configurationHash: config.configurationHash,
      loadedModules: [],
      loadedServices: []
    });
    completed["BOOT-03"] = true;

    const fsCheck = checkFilesystemStructure(rootDir, {
      autoCreate: true,
      allowCreate: input.allowCreateDirs === true
    });
    if (!fsCheck.ok) {
      for (const dir of fsCheck.missing) {
        warnings.push({ code: "missing_directory", detail: dir, severity: BM_ERROR_SEVERITY.RECOVERABLE });
      }
      if (input.strictFilesystem === true) {
        state = BM_STATE.FAILED;
        return Object.freeze({
          ok: false,
          error: "filesystem_validation_failed",
          severity: BM_ERROR_SEVERITY.FATAL,
          fsCheck,
          component: BM_COMPONENT.BOOT_API
        });
      }
    }

    const registries = initializeRegistries();
    completed["BOOT-04"] = true;

    const services = initializeKernelServices(input.kernelServices || BM_KERNEL_SERVICES);
    context = createBootRuntimeContext({
      ...context,
      loadedServices: services.services.map((s) => s.serviceId),
      loadedModules: input.disabledModules ? [] : context.loadedModules
    });
    completed["BOOT-05"] = true;

    const depNodes = input.dependencyNodes || [
      { id: "kernel", dependencies: [] },
      { id: "logger", dependencies: ["kernel"] },
      { id: "configuration", dependencies: ["logger"] },
      { id: "registry", dependencies: ["configuration"] },
      { id: "runtime", dependencies: ["registry"] }
    ];
    const deps = validateDependencies(depNodes);
    if (!deps.ok) {
      state = BM_STATE.FAILED;
      return Object.freeze({
        ok: false,
        error: "cyclic_dependency",
        severity: BM_ERROR_SEVERITY.FATAL,
        deps,
        component: BM_COMPONENT.BOOT_API
      });
    }
    completed["BOOT-06"] = true;

    if (Array.isArray(input.disabledModules)) {
      disabledModules = [...input.disabledModules];
      for (const mod of disabledModules) {
        warnings.push({
          code: "module_disabled",
          detail: mod,
          severity: BM_ERROR_SEVERITY.RECOVERABLE
        });
      }
    }
    if (input.experimentalPluginMissing === true) {
      const classified = classifyError({ code: "experimental_plugin_missing" });
      if (classified.ok) {
        warnings.push({
          code: "experimental_plugin_missing",
          severity: BM_ERROR_SEVERITY.RECOVERABLE
        });
      }
    }

    const health = verifyHealth({
      runtimeContext: Boolean(context && context.readOnly),
      registries: registries.locked === true,
      kernelServices: services.ok === true,
      dependencies: deps.ok === true
    });
    if (!health.ok) {
      state = BM_STATE.FAILED;
      return Object.freeze({
        ok: false,
        error: "health_verification_failed",
        severity: BM_ERROR_SEVERITY.FATAL,
        health,
        component: BM_COMPONENT.BOOT_API
      });
    }
    completed["BOOT-07"] = true;
    completed["BOOT-08"] = true;

    const pipeline = runBootPipeline(completed);
    if (!pipeline.ok) {
      state = BM_STATE.FAILED;
      return Object.freeze({
        ok: false,
        error: "boot_pipeline_order_violation",
        severity: BM_ERROR_SEVERITY.FATAL,
        pipeline,
        component: BM_COMPONENT.BOOT_API
      });
    }

    state = input.safeBoot === true ? BM_STATE.SAFE_BOOT : BM_STATE.READY;
    handedOffToStartupSequence = true;
    const report = generateBootReport({
      bootId,
      durationMs: Date.now() - startedAt,
      startedServices: services.services.map((s) => s.serviceId),
      disabledModules,
      warnings,
      errors,
      version: context.version,
      state
    });
    lastReport = report;
    auditAction("boot", { bootId, state });

    return Object.freeze({
      ok: true,
      state,
      context,
      pipeline,
      registries,
      services,
      deps,
      health,
      report,
      warnings: Object.freeze(warnings),
      handedOffToStartupSequence: true,
      mutatesDomain: false,
      timeouts: Object.freeze({ ...timeouts }),
      component: BM_COMPONENT.BOOT_API
    });
  }

  function safeBoot(input = {}) {
    return boot({
      ...input,
      safeBoot: true,
      kernelServices: ["logger", "diagnostics", "configuration"].concat(
        (input.kernelServices || []).filter((s) => BM_KERNEL_SERVICES.includes(s))
      ).filter((v, i, a) => a.indexOf(v) === i)
    });
  }

  function shutdown() {
    state = BM_STATE.STOPPED;
    handedOffToStartupSequence = false;
    auditAction("shutdown");
    return Object.freeze({
      ok: true,
      state,
      dataPreserved: true,
      component: BM_COMPONENT.BOOT_API
    });
  }

  function restart(input = {}) {
    const stopped = shutdown();
    if (!stopped.ok) return stopped;
    return boot(input);
  }

  function recoverFromError(error = {}, optionsRecover = {}) {
    const classified = classifyError(error);
    recoveryCount += 1;
    if (!classified.ok) {
      state = BM_STATE.FAILED;
      auditAction("fatal_error", { code: classified.code });
      return Object.freeze({
        ok: false,
        classified,
        recovery: null,
        component: BM_COMPONENT.RECOVERY
      });
    }
    const recovery = runRecovery({
      maxAttempts: optionsRecover.maxAttempts != null ? optionsRecover.maxAttempts : maxRecoveryAttempts,
      recoverOnAttempt: optionsRecover.recoverOnAttempt || 1,
      fatal: false
    });
    auditAction("recoverable_error", { code: classified.code, recovered: recovery.ok });
    return Object.freeze({
      ok: recovery.ok,
      classified,
      recovery,
      continuesBoot: recovery.ok,
      component: BM_COMPONENT.RECOVERY
    });
  }

  return {
    boot,
    shutdown,
    restart,
    safeBoot,
    verifyEnvironment: (input) => verifyEnvironment(input || {}),
    generateBootReport: (input) => generateBootReport(input || lastReport || {}),
    status,
    recoverFromError,
    getTimeouts() {
      return Object.freeze({ ...timeouts });
    },
    setTimeouts(next = {}) {
      Object.assign(timeouts, next);
      return Object.freeze({ ok: true, timeouts: Object.freeze({ ...timeouts }), component: BM_COMPONENT.BOOT_API });
    },
    auditTrail() {
      return Object.freeze([...audit]);
    },
    snapshot() {
      return Object.freeze({
        ok: true,
        state,
        singleton: singletonGuard,
        recoveryCount,
        auditCount: audit.length,
        component: BM_COMPONENT.BOOT_MANAGER
      });
    }
  };
}

module.exports = {
  BM_COMPONENT,
  BM_COMPONENT_ORDER,
  BM_PIPELINE,
  BM_PIPELINE_LABEL,
  BM_STATE,
  BM_ERROR_SEVERITY,
  BM_CONFIG_LAYERS,
  BM_REQUIRED_DIRS,
  BM_KERNEL_SERVICES,
  BM_REGISTRY_KIND,
  BM_DEFAULT_TIMEOUTS_MS,
  BM_PUBLIC_API,
  BM_FORBIDDEN_ACTIVITIES,
  BM_RUNTIME_ANCHORS,
  assertBootForbiddenActivity,
  hashConfiguration,
  verifyEnvironment,
  loadConfiguration,
  createBootRuntimeContext,
  checkFilesystemStructure,
  initializeRegistries,
  initializeKernelServices,
  validateDependencies,
  verifyHealth,
  classifyError,
  runRecovery,
  generateBootReport,
  runBootPipeline,
  createBootManager
};
