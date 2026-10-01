"use strict";

const { ADAPTER_STATES } = require("./adapterStates");

/**
 * PlatformAdapter contract — Multi-Platform Integration Layer.
 * Existing bridges (Kick/Twitch/YouTube/…) implement this de-facto via start/stop/status.
 * New adapters MUST expose this shape; Stream Core stays behind processEvent/normalize only.
 */

const REQUIRED_METHODS = Object.freeze([
  "initialize",
  "validate",
  "start",
  "getStatus",
  "getSnapshot",
  "shutdown"
]);

/**
 * @typedef {object} PlatformCapabilities
 * @property {boolean} chat
 * @property {boolean} gift
 * @property {boolean} follow
 * @property {boolean} subscribe
 * @property {boolean} like
 * @property {boolean} chatOnlyDefault
 */

/**
 * @typedef {object} PlatformAdapterDescriptor
 * @property {string} id
 * @property {string} displayName
 * @property {PlatformCapabilities} capabilities
 * @property {string[]} authModes  e.g. oauth, api_key, webhook, pusher, tikfinity
 * @property {string[]} requiredEnv
 * @property {string[]} optionalEnv
 * @property {string} [bridgeModule] relative path under scripts/
 */

function validateAdapterShape(adapter) {
  const errors = [];
  if (!adapter || typeof adapter !== "object") {
    return { ok: false, errors: ["adapter must be object"] };
  }
  if (!adapter.id || typeof adapter.id !== "string") {
    errors.push("missing id");
  }
  for (const method of REQUIRED_METHODS) {
    if (typeof adapter[method] !== "function") {
      errors.push(`missing method: ${method}`);
    }
  }
  if (adapter.capabilities && typeof adapter.capabilities !== "object") {
    errors.push("capabilities must be object");
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Wrap a legacy bridge { start, stop, getStatus? } into PlatformAdapter shape.
 * Does not change bridge behaviour — facade only.
 */
function wrapLegacyBridge(descriptor, bridge = {}) {
  const sm = require("./adapterStates").createStateMachine("CREATED");
  let lastError = null;
  let lastStart = null;

  const adapter = {
    id: descriptor.id,
    displayName: descriptor.displayName || descriptor.id,
    capabilities: descriptor.capabilities || {},
    authModes: descriptor.authModes || [],
    ...descriptor,

    async initialize() {
      sm.transition("INITIALIZING");
      if (typeof bridge.initialize === "function") {
        await bridge.initialize();
      }
      sm.transition("READY");
      return { ok: true, state: sm.getState() };
    },

    validate(input = {}) {
      const missing = (descriptor.requiredEnv || []).filter((k) => {
        const v = input.env?.[k] ?? process.env[k];
        return !String(v || "").trim();
      });
      if (missing.length) {
        return { ok: false, errors: missing.map((k) => `missing_env:${k}`) };
      }
      return { ok: true, errors: [] };
    },

    async start(options = {}) {
      const v = adapter.validate(options);
      if (!v.ok) {
        if (sm.getState() === "CREATED") sm.transition("INITIALIZING");
        sm.transition("FAILED");
        lastError = v.errors;
        return { ok: false, reason: "validate_failed", errors: v.errors };
      }
      if (typeof bridge.start !== "function") {
        if (sm.getState() === "CREATED") sm.transition("INITIALIZING");
        sm.transition("FAILED");
        return { ok: false, reason: "bridge_missing_start" };
      }
      try {
        if (sm.getState() === "CREATED") {
          sm.transition("INITIALIZING");
          sm.transition("READY");
        } else if (sm.getState() === "STOPPED") {
          sm.transition("INITIALIZING");
          sm.transition("READY");
        }
        lastStart = await bridge.start(options);
        if (lastStart && lastStart.ok === false) {
          sm.transition("FAILED");
          lastError = lastStart.reason || lastStart;
          return lastStart;
        }
        sm.transition("RUNNING");
        return { ok: true, result: lastStart, state: sm.getState() };
      } catch (err) {
        lastError = err.message;
        sm.transition("FAILED");
        return { ok: false, reason: "exception", error: err.message };
      }
    },

    getStatus() {
      const bridgeStatus =
        typeof bridge.getStatus === "function"
          ? bridge.getStatus()
          : typeof bridge.getTwitchBridgeStatus === "function"
            ? bridge.getTwitchBridgeStatus()
            : typeof bridge.getKickBridgeStatus === "function"
              ? bridge.getKickBridgeStatus()
              : null;
      return {
        id: descriptor.id,
        state: sm.getState(),
        statesAllowed: ADAPTER_STATES,
        lastError,
        bridge: bridgeStatus
      };
    },

    getSnapshot() {
      return {
        id: descriptor.id,
        state: sm.getState(),
        capabilities: descriptor.capabilities,
        lastStart,
        lastError,
        at: Date.now()
      };
    },

    async shutdown() {
      const cur = sm.getState();
      if (cur === "STOPPED") return { ok: true, state: cur };
      if (cur === "CREATED") {
        sm.transition("STOPPED");
        return { ok: true, state: sm.getState() };
      }
      sm.transition("STOPPING");
      if (typeof bridge.stop === "function") {
        await bridge.stop();
      }
      sm.transition("STOPPED");
      return { ok: true, state: sm.getState() };
    }
  };

  return adapter;
}

module.exports = {
  REQUIRED_METHODS,
  validateAdapterShape,
  wrapLegacyBridge
};
