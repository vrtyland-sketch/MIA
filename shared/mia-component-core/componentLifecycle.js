"use strict";

/**
 * Master Canon 0004 — component lifecycle (§5).
 */

const COMPONENT_LIFECYCLE = Object.freeze({
  DESIGNED: "designed",
  IMPLEMENTED: "implemented",
  INITIALIZED: "initialized",
  RUNNING: "running",
  PAUSED: "paused",
  RESTARTING: "restarting",
  STOPPED: "stopped",
  ARCHIVED: "archived"
});

const COMPONENT_LIFECYCLE_ORDER = Object.freeze([
  COMPONENT_LIFECYCLE.DESIGNED,
  COMPONENT_LIFECYCLE.IMPLEMENTED,
  COMPONENT_LIFECYCLE.INITIALIZED,
  COMPONENT_LIFECYCLE.RUNNING,
  COMPONENT_LIFECYCLE.PAUSED,
  COMPONENT_LIFECYCLE.RESTARTING,
  COMPONENT_LIFECYCLE.STOPPED,
  COMPONENT_LIFECYCLE.ARCHIVED
]);

function isComponentLifecycleState(value) {
  return typeof value === "string" && COMPONENT_LIFECYCLE_ORDER.includes(value);
}

module.exports = {
  COMPONENT_LIFECYCLE,
  COMPONENT_LIFECYCLE_ORDER,
  isComponentLifecycleState
};
