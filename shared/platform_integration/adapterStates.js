"use strict";

/** Canonical adapter lifecycle (aligns with canon 0021). */
const ADAPTER_STATES = Object.freeze([
  "CREATED",
  "INITIALIZING",
  "READY",
  "RUNNING",
  "DEGRADED",
  "FAILED",
  "STOPPING",
  "STOPPED"
]);

const ALLOWED_TRANSITIONS = Object.freeze({
  CREATED: ["INITIALIZING", "STOPPED"],
  INITIALIZING: ["READY", "FAILED", "STOPPED"],
  READY: ["RUNNING", "FAILED", "STOPPING", "STOPPED"],
  RUNNING: ["DEGRADED", "FAILED", "STOPPING", "STOPPED"],
  DEGRADED: ["RUNNING", "FAILED", "STOPPING", "STOPPED"],
  FAILED: ["INITIALIZING", "STOPPING", "STOPPED"],
  STOPPING: ["STOPPED", "FAILED"],
  STOPPED: ["INITIALIZING", "CREATED"]
});

function canTransition(from, to) {
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

function createStateMachine(initial = "CREATED") {
  let state = ADAPTER_STATES.includes(initial) ? initial : "CREATED";
  return {
    getState: () => state,
    transition(to) {
      if (!ADAPTER_STATES.includes(to)) {
        return { ok: false, error: "invalid_state", from: state, to };
      }
      if (!canTransition(state, to)) {
        return { ok: false, error: "illegal_transition", from: state, to };
      }
      const from = state;
      state = to;
      return { ok: true, from, to };
    }
  };
}

module.exports = {
  ADAPTER_STATES,
  ALLOWED_TRANSITIONS,
  canTransition,
  createStateMachine
};
