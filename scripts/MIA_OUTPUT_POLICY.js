"use strict";

/**
 * MIA_OUTPUT_POLICY.js
 *
 * Řídí, jestli MIA smí právě něco pustit ven:
 * - overlay
 * - console output
 * - public chat write
 * - tts
 *
 * UPDATE:
 * - oddělené cooldown lane pro SUPPORT vs COMMUNITY
 * - support overlay už neblokuje community lane navždy a opačně
 * - staré `minActionIntervalMs` zůstává jako fallback/default
 */

function nowTs() {
  return Date.now();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toBool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
    if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  }
  if (typeof value === "number") return value !== 0;
  return fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeRoute(route) {
  const safe = typeof route === "string" ? route.trim().toLowerCase() : "";

  if (safe === "support") return "support";
  if (safe === "community") return "community";
  if (safe === "wake") return "community";
  if (safe === "milestone") return "community";
  return "community";
}

function getLaneKeyFromOptions(options = {}) {
  return normalizeRoute(options.route);
}

function ensureLaneState(state) {
  if (!state.lanes || typeof state.lanes !== "object") {
    const fallbackLast = toNumber(state.lastOutputAt, 0);
    const defaultInterval = toNumber(state.minActionIntervalMs, 12000);

    state.lanes = {
      support: {
        minIntervalMs: toNumber(state.supportMinActionIntervalMs, 1500),
        lastOutputAt: fallbackLast
      },
      community: {
        minIntervalMs: toNumber(state.communityMinActionIntervalMs, defaultInterval),
        lastOutputAt: fallbackLast
      }
    };
  }

  if (!state.lanes.support || typeof state.lanes.support !== "object") {
    state.lanes.support = {
      minIntervalMs: toNumber(state.supportMinActionIntervalMs, 1500),
      lastOutputAt: toNumber(state.lastOutputAt, 0)
    };
  }

  if (!state.lanes.community || typeof state.lanes.community !== "object") {
    state.lanes.community = {
      minIntervalMs: toNumber(state.communityMinActionIntervalMs, state.minActionIntervalMs),
      lastOutputAt: toNumber(state.lastOutputAt, 0)
    };
  }

  state.lanes.support.minIntervalMs = toNumber(
    state.lanes.support.minIntervalMs,
    toNumber(state.supportMinActionIntervalMs, 1500)
  );
  state.lanes.support.lastOutputAt = toNumber(state.lanes.support.lastOutputAt, 0);

  state.lanes.community.minIntervalMs = toNumber(
    state.lanes.community.minIntervalMs,
    toNumber(state.communityMinActionIntervalMs, state.minActionIntervalMs)
  );
  state.lanes.community.lastOutputAt = toNumber(state.lanes.community.lastOutputAt, 0);

  return state.lanes;
}

function createOutputPolicy(input = {}) {
  const globalMinIntervalMs = toNumber(input.minActionIntervalMs, 12000);
  const lastOutputAt = toNumber(input.lastOutputAt, 0);

  return {
    overlayEnabled: toBool(input.overlayEnabled, true),
    consoleEnabled: toBool(input.consoleEnabled, true),
    publicChatWriteEnabled: toBool(input.publicChatWriteEnabled, false),
    ttsEnabled: toBool(input.ttsEnabled, false),

    minActionIntervalMs: globalMinIntervalMs,
    lastOutputAt,

    supportMinActionIntervalMs: toNumber(input.supportMinActionIntervalMs, 1500),
    communityMinActionIntervalMs: toNumber(input.communityMinActionIntervalMs, globalMinIntervalMs),

    lanes: {
      support: {
        minIntervalMs: toNumber(
          input?.lanes?.support?.minIntervalMs,
          toNumber(input.supportMinActionIntervalMs, 1500)
        ),
        lastOutputAt: toNumber(input?.lanes?.support?.lastOutputAt, lastOutputAt)
      },
      community: {
        minIntervalMs: toNumber(
          input?.lanes?.community?.minIntervalMs,
          toNumber(input.communityMinActionIntervalMs, globalMinIntervalMs)
        ),
        lastOutputAt: toNumber(input?.lanes?.community?.lastOutputAt, lastOutputAt)
      }
    }
  };
}

function getOutputPolicySnapshot(state) {
  if (!state) return createOutputPolicy();
  ensureLaneState(state);
  return clone(state);
}

function canEmitOutput(state, options = {}) {
  if (!state) {
    return {
      allowed: true,
      reason: "no_state",
      lane: getLaneKeyFromOptions(options)
    };
  }

  const laneKey = getLaneKeyFromOptions(options);
  const lanes = ensureLaneState(state);
  const lane = lanes[laneKey] || lanes.community;

  const minInterval = toNumber(lane.minIntervalMs, 0);
  const lastOutputAt = toNumber(lane.lastOutputAt, 0);
  const diff = nowTs() - lastOutputAt;

  if (diff < minInterval) {
    return {
      allowed: false,
      reason: "cooldown",
      lane: laneKey,
      remainingMs: minInterval - diff,
      diffMs: diff,
      minIntervalMs: minInterval
    };
  }

  return {
    allowed: true,
    reason: "ok",
    lane: laneKey,
    remainingMs: 0,
    diffMs: diff,
    minIntervalMs: minInterval
  };
}

function markOutputEmitted(state, options = {}) {
  if (!state) return null;

  const laneKey = getLaneKeyFromOptions(options);
  const lanes = ensureLaneState(state);
  const ts = nowTs();

  lanes[laneKey].lastOutputAt = ts;
  state.lastOutputAt = ts;

  return ts;
}

function patchOutputPolicy(state, patch = {}) {
  if (!state) return createOutputPolicy(patch);

  if (Object.prototype.hasOwnProperty.call(patch, "overlayEnabled")) {
    state.overlayEnabled = toBool(patch.overlayEnabled, state.overlayEnabled);
  }

  if (Object.prototype.hasOwnProperty.call(patch, "consoleEnabled")) {
    state.consoleEnabled = toBool(patch.consoleEnabled, state.consoleEnabled);
  }

  if (Object.prototype.hasOwnProperty.call(patch, "publicChatWriteEnabled")) {
    state.publicChatWriteEnabled = toBool(
      patch.publicChatWriteEnabled,
      state.publicChatWriteEnabled
    );
  }

  if (Object.prototype.hasOwnProperty.call(patch, "ttsEnabled")) {
    state.ttsEnabled = toBool(patch.ttsEnabled, state.ttsEnabled);
  }

  if (Object.prototype.hasOwnProperty.call(patch, "minActionIntervalMs")) {
    state.minActionIntervalMs = toNumber(
      patch.minActionIntervalMs,
      state.minActionIntervalMs
    );
  }

  if (Object.prototype.hasOwnProperty.call(patch, "lastOutputAt")) {
    state.lastOutputAt = toNumber(patch.lastOutputAt, state.lastOutputAt);
  }

  if (Object.prototype.hasOwnProperty.call(patch, "supportMinActionIntervalMs")) {
    state.supportMinActionIntervalMs = toNumber(
      patch.supportMinActionIntervalMs,
      state.supportMinActionIntervalMs
    );
  }

  if (Object.prototype.hasOwnProperty.call(patch, "communityMinActionIntervalMs")) {
    state.communityMinActionIntervalMs = toNumber(
      patch.communityMinActionIntervalMs,
      state.communityMinActionIntervalMs
    );
  }

  ensureLaneState(state);

  if (patch.lanes && typeof patch.lanes === "object") {
    if (patch.lanes.support && typeof patch.lanes.support === "object") {
      if (Object.prototype.hasOwnProperty.call(patch.lanes.support, "minIntervalMs")) {
        state.lanes.support.minIntervalMs = toNumber(
          patch.lanes.support.minIntervalMs,
          state.lanes.support.minIntervalMs
        );
      }
      if (Object.prototype.hasOwnProperty.call(patch.lanes.support, "lastOutputAt")) {
        state.lanes.support.lastOutputAt = toNumber(
          patch.lanes.support.lastOutputAt,
          state.lanes.support.lastOutputAt
        );
      }
    }

    if (patch.lanes.community && typeof patch.lanes.community === "object") {
      if (Object.prototype.hasOwnProperty.call(patch.lanes.community, "minIntervalMs")) {
        state.lanes.community.minIntervalMs = toNumber(
          patch.lanes.community.minIntervalMs,
          state.lanes.community.minIntervalMs
        );
      }
      if (Object.prototype.hasOwnProperty.call(patch.lanes.community, "lastOutputAt")) {
        state.lanes.community.lastOutputAt = toNumber(
          patch.lanes.community.lastOutputAt,
          state.lanes.community.lastOutputAt
        );
      }
    }
  }

  return state;
}

function resetOutputPolicyTimers(state) {
  if (!state) return null;

  ensureLaneState(state);

  state.lastOutputAt = 0;
  state.lanes.support.lastOutputAt = 0;
  state.lanes.community.lastOutputAt = 0;

  return 0;
}

module.exports = {
  createOutputPolicy,
  getOutputPolicySnapshot,
  canEmitOutput,
  markOutputEmitted,
  patchOutputPolicy,
  resetOutputPolicyTimers
};