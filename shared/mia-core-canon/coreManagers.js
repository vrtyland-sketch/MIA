"use strict";

/**
 * Master Canon 0007 §4 — Core System managers registry.
 */

const { CORE_LIFECYCLE } = require("./coreLifecycle");

const CORE_MANAGER_ID = Object.freeze({
  RUNTIME: "core.runtime_manager",
  LIFECYCLE: "core.lifecycle_manager",
  EVENT_BUS: "core.event_bus",
  SCHEDULER: "core.scheduler",
  CONFIG: "core.configuration_manager",
  DEPENDENCY: "core.dependency_manager",
  HEALTH: "core.health_manager",
  ERROR: "core.error_manager",
  LOGGING: "core.logging_manager",
  METRICS: "core.metrics_manager",
  PLUGIN: "core.plugin_loader",
  SHUTDOWN: "core.shutdown_manager"
});

/** Systems Core must NOT depend on (0007 §18). */
const CORE_FORBIDDEN_UPSTREAM = Object.freeze([
  "ai",
  "game",
  "graphics",
  "stream",
  "economy"
]);

function defineManager(input) {
  return Object.freeze({
    id: input.id,
    name: input.name,
    section: input.section,
    purpose: input.purpose,
    runtime: Object.freeze(input.runtime || []),
    mustNotContain: Object.freeze(input.mustNotContain || []),
    status: input.status || "partial",
    nextDocId: input.nextDocId || null
  });
}

const CORE_MANAGERS = Object.freeze({
  [CORE_MANAGER_ID.RUNTIME]: defineManager({
    id: CORE_MANAGER_ID.RUNTIME,
    name: "Runtime Manager",
    section: 5,
    purpose: "Spuštění platformy a hlavní smyčka.",
    runtime: [
      "server.js",
      "index.js",
      "scripts/MIA_SERVER_BOOTSTRAP.js",
      "scripts/MIA_SERVER_BOOTSTRAP_CTX.js"
    ],
    mustNotContain: ["gift logic", "koj logic", "ai conversation"],
    status: "partial",
    nextDocId: "0009"
  }),
  [CORE_MANAGER_ID.LIFECYCLE]: defineManager({
    id: CORE_MANAGER_ID.LIFECYCLE,
    name: "Lifecycle Manager",
    section: 6,
    purpose: "Životní cyklus systémů, modulů, služeb a komponent.",
    runtime: [
      "shared/mia-core-canon/lifecycleManager.js",
      "shared/mia-component-core/componentLifecycle.js",
      "scripts/MIA_STREAM_SESSION.js"
    ],
    status: "partial",
    nextDocId: "0010"
  }),
  [CORE_MANAGER_ID.EVENT_BUS]: defineManager({
    id: CORE_MANAGER_ID.EVENT_BUS,
    name: "Event Bus",
    section: 7,
    purpose: "Centrální doprava událostí bez business logiky.",
    runtime: [
      "shared/mia-event-core/eventBusInfrastructure.js",
      "shared/mia-event-core/eventGateway.js",
      "shared/mia-event-core/eventValidator.js",
      "shared/mia-event-core/eventRegistry.js",
      "shared/mia-event-core/eventRouter.js",
      "shared/mia-event-core/priorityManager.js",
      "shared/mia-event-core/queueManager.js",
      "shared/mia-event-core/eventDispatcher.js",
      "routes/ingest.js",
      "scripts/MIA_INGEST_QUEUE.js",
      "scripts/pipeline/run.js"
    ],
    mustNotContain: ["gift tier decisions", "overlay text"],
    status: "partial",
    nextDocId: "0018"
  }),
  [CORE_MANAGER_ID.SCHEDULER]: defineManager({
    id: CORE_MANAGER_ID.SCHEDULER,
    name: "Scheduler",
    section: 8,
    purpose: "Časovače a periodické úlohy.",
    runtime: ["scripts/MIA_RUNTIME_LOOPS.js", "scripts/MIA_OBS_WATCHDOG.js"],
    status: "implemented"
  }),
  [CORE_MANAGER_ID.CONFIG]: defineManager({
    id: CORE_MANAGER_ID.CONFIG,
    name: "Configuration Manager",
    section: 9,
    purpose: "Načítání a audit konfigurace.",
    runtime: ["scripts/MIA_CONFIG.js", "scripts/MIA_ENV.js", "shared/stream_economy_config.json"],
    status: "implemented"
  }),
  [CORE_MANAGER_ID.DEPENDENCY]: defineManager({
    id: CORE_MANAGER_ID.DEPENDENCY,
    name: "Dependency Manager",
    section: 10,
    purpose: "Pořadí startu a acyklické závislosti.",
    runtime: ["scripts/MIA_*_HOST.js", "shared/mia-component-core/componentDependencies.js"],
    status: "partial"
  }),
  [CORE_MANAGER_ID.HEALTH]: defineManager({
    id: CORE_MANAGER_ID.HEALTH,
    name: "Health Manager",
    section: 11,
    purpose: "Stav modulů a provozní vitalita.",
    runtime: ["scripts/mia_health.js", "routes/health"],
    status: "implemented"
  }),
  [CORE_MANAGER_ID.ERROR]: defineManager({
    id: CORE_MANAGER_ID.ERROR,
    name: "Error Manager",
    section: 12,
    purpose: "Centralizované zachycení a záznam chyb.",
    runtime: ["writeLog mia-errors", "scripts/MIA_INGEST_QUEUE.js"],
    status: "partial"
  }),
  [CORE_MANAGER_ID.LOGGING]: defineManager({
    id: CORE_MANAGER_ID.LOGGING,
    name: "Logging Manager",
    section: 13,
    purpose: "Jednotné strukturované logování.",
    runtime: ["writeLog", "logs/", "scripts/MIA_LOG_ROTATION.js"],
    status: "implemented"
  }),
  [CORE_MANAGER_ID.METRICS]: defineManager({
    id: CORE_MANAGER_ID.METRICS,
    name: "Metrics Manager",
    section: 14,
    purpose: "Provozní metriky bez rozhodovací logiky.",
    runtime: ["scripts/MIA_RUNTIME_PERF.js", "scripts/MIA_PIPELINE_SUMMARY_HOST.js"],
    status: "partial"
  }),
  [CORE_MANAGER_ID.PLUGIN]: defineManager({
    id: CORE_MANAGER_ID.PLUGIN,
    name: "Plugin Loader",
    section: 15,
    purpose: "Bezpečné načítání rozšíření přes veřejná API.",
    runtime: ["routes/index.js", "routes/"],
    status: "partial"
  }),
  [CORE_MANAGER_ID.SHUTDOWN]: defineManager({
    id: CORE_MANAGER_ID.SHUTDOWN,
    name: "Shutdown Manager",
    section: 16,
    purpose: "Korektní ukončení bez ztráty dat.",
    runtime: ["scripts/mia_stop.js", "scripts/mia_restart.js"],
    status: "implemented"
  })
});

function listCoreManagers() {
  return Object.values(CORE_MANAGERS);
}

function getCoreManager(managerId) {
  return CORE_MANAGERS[managerId] || null;
}

/**
 * Core module paths must not import forbidden domain engines at load time.
 * Checks registry metadata only — full static analysis is future tooling.
 */
function assertCoreForbiddenDependencies(dependencyEdges = []) {
  const violations = [];
  for (const edge of dependencyEdges) {
    const from = String(edge.from || "");
    const to = String(edge.to || "");
    if (!from.startsWith("core.")) continue;
    if (CORE_FORBIDDEN_UPSTREAM.some((sys) => to === sys || to.startsWith(`${sys}.`))) {
      violations.push({ from, to });
    }
  }
  return { ok: violations.length === 0, violations };
}

module.exports = {
  CORE_MANAGER_ID,
  CORE_FORBIDDEN_UPSTREAM,
  CORE_MANAGERS,
  CORE_LIFECYCLE,
  listCoreManagers,
  getCoreManager,
  assertCoreForbiddenDependencies
};
