"use strict";

/**
 * Master Canon 0003 — event lifecycle (§4).
 */

const EVENT_LIFECYCLE = Object.freeze({
  CREATED: "created",
  QUEUED: "queued",
  DISPATCHED: "dispatched",
  PROCESSING: "processing",
  COMPLETED: "completed",
  ARCHIVED: "archived",
  FAILED: "failed"
});

const EVENT_LIFECYCLE_ORDER = Object.freeze([
  EVENT_LIFECYCLE.CREATED,
  EVENT_LIFECYCLE.QUEUED,
  EVENT_LIFECYCLE.DISPATCHED,
  EVENT_LIFECYCLE.PROCESSING,
  EVENT_LIFECYCLE.COMPLETED,
  EVENT_LIFECYCLE.ARCHIVED
]);

const TERMINAL_EVENT_STATES = new Set([
  EVENT_LIFECYCLE.COMPLETED,
  EVENT_LIFECYCLE.ARCHIVED,
  EVENT_LIFECYCLE.FAILED
]);

function isEventLifecycleState(value) {
  return (
    typeof value === "string" &&
    (EVENT_LIFECYCLE_ORDER.includes(value) || value === EVENT_LIFECYCLE.FAILED)
  );
}

function isEventTerminal(state) {
  return TERMINAL_EVENT_STATES.has(state);
}

module.exports = {
  EVENT_LIFECYCLE,
  EVENT_LIFECYCLE_ORDER,
  TERMINAL_EVENT_STATES,
  isEventLifecycleState,
  isEventTerminal
};
