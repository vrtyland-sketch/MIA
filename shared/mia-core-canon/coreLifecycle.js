"use strict";

/**
 * Master Canon 0007 §6 — core lifecycle states.
 */

const CORE_LIFECYCLE = Object.freeze({
  CREATED: "created",
  INITIALIZED: "initialized",
  STARTING: "starting",
  RUNNING: "running",
  PAUSED: "paused",
  STOPPING: "stopping",
  STOPPED: "stopped",
  ARCHIVED: "archived"
});

const CORE_LIFECYCLE_ORDER = Object.freeze([
  CORE_LIFECYCLE.CREATED,
  CORE_LIFECYCLE.INITIALIZED,
  CORE_LIFECYCLE.STARTING,
  CORE_LIFECYCLE.RUNNING,
  CORE_LIFECYCLE.PAUSED,
  CORE_LIFECYCLE.STOPPING,
  CORE_LIFECYCLE.STOPPED,
  CORE_LIFECYCLE.ARCHIVED
]);

const LOG_LEVEL = Object.freeze({
  TRACE: "trace",
  DEBUG: "debug",
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical"
});

function isCoreLifecycleState(value) {
  return typeof value === "string" && CORE_LIFECYCLE_ORDER.includes(value);
}

module.exports = {
  CORE_LIFECYCLE,
  CORE_LIFECYCLE_ORDER,
  LOG_LEVEL,
  isCoreLifecycleState
};
