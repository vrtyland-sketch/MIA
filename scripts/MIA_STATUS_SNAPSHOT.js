"use strict";

/**
 * Rich runtime diagnostics for GET /status.
 */

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cloneJson(value, fallback = null) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_err) {
    return fallback;
  }
}

function summarizeShadowPipelineResult(shadowResult = {}) {
  const debug = shadowResult?.debug && typeof shadowResult.debug === "object"
    ? shadowResult.debug
    : {};
  const warnings = Array.isArray(debug.warnings) ? debug.warnings : [];
  const decision = shadowResult?.decisionResult || shadowResult?.decision || {};

  return {
    at: Date.now(),
    ok: Boolean(shadowResult?.ok),
    error: safeString(shadowResult?.error) || null,
    runtimePath: safeString(debug.runtimePath) || null,
    warningCount: warnings.length,
    warnings: cloneJson(warnings.slice(-8), []),
    decision: {
      reason: safeString(decision.reason) || null,
      speaker: safeString(decision.speaker) || null,
      route: safeString(decision.route) || null,
      tier: safeString(decision.tier) || null,
      supportAckMode: safeString(decision?.meta?.supportAckMode) || null,
      primarySpeakerPolicy: safeString(decision?.meta?.primarySpeakerPolicy) || null
    },
    shareBridge: debug.shareBridge && typeof debug.shareBridge === "object"
      ? cloneJson(debug.shareBridge, null)
      : null
  };
}

function buildProactiveHostStatus(ctx = {}) {
  const proactiveHostModule = ctx.proactiveHostModule || {};
  const outputState = ctx.outputState || {};
  const streamState = ctx.streamState || {};
  const overlayState = ctx.overlayState || {};
  const serverStartedAt = toNumber(ctx.serverStartedAt, Date.now());
  const supportPolicyModule = ctx.supportPolicyModule || {};

  const enabled =
    typeof proactiveHostModule.isEnabled === "function"
      ? proactiveHostModule.isEnabled()
      : false;

  const hostState =
    typeof proactiveHostModule.getProactiveHostState === "function"
      ? proactiveHostModule.getProactiveHostState(outputState)
      : outputState.proactiveHostState || {};

  const viewerCount = toNumber(streamState?.audience?.viewerCount, 0);
  const band =
    typeof supportPolicyModule.resolveAudienceBand === "function"
      ? supportPolicyModule.resolveAudienceBand(viewerCount)
      : "unknown";

  const lastSpokeAt = toNumber(hostState.lastSpokeAt, 0);
  const now = Date.now();

  let tick = null;
  if (enabled && typeof proactiveHostModule.evaluateProactiveHostTick === "function") {
    try {
      tick = proactiveHostModule.evaluateProactiveHostTick({
        streamState,
        outputState,
        overlayState,
        serverStartedAt,
        runtimeConfig: ctx.runtimeConfig || {},
        kojnozoutState: ctx.kojnozoutState || {}
      });
    } catch (_err) {
      tick = { shouldSpeak: false, reason: "evaluation_failed" };
    }
  }

  const quietThresholdMs =
    typeof proactiveHostModule.resolveQuietThresholdMs === "function"
      ? proactiveHostModule.resolveQuietThresholdMs(band)
      : null;
  const proactiveCooldownMs =
    typeof proactiveHostModule.resolveProactiveCooldownMs === "function"
      ? proactiveHostModule.resolveProactiveCooldownMs(band)
      : null;

  const behavior =
    typeof proactiveHostModule.resolveQuietBehavior === "function"
      ? proactiveHostModule.resolveQuietBehavior()
      : "solo_stream";

  return {
    enabled,
    behavior,
    audienceBand: band,
    state: {
      lastSpokeAt: lastSpokeAt || null,
      sinceLastSpokeMs: lastSpokeAt > 0 ? Math.max(0, now - lastSpokeAt) : null,
      escalationLevel: toNumber(hostState.escalationLevel, 0),
      speakCount: toNumber(hostState.speakCount, 0)
    },
    quietMs: toNumber(tick?.quietMs, 0) || null,
    quietThresholdMs: quietThresholdMs || toNumber(tick?.quietThresholdMs, 0) || null,
    proactiveCooldownMs,
    wouldSpeak: Boolean(tick?.shouldSpeak),
    blockReason: tick?.shouldSpeak ? null : safeString(tick?.reason, "disabled_or_idle"),
    nextLevel: toNumber(tick?.level, 0) || null
  };
}

function buildSupportAckStatus(ctx = {}) {
  const supportPolicyModule = ctx.supportPolicyModule || {};
  const outputState = ctx.outputState || {};
  const streamState = ctx.streamState || {};

  const viewerCount = toNumber(streamState?.audience?.viewerCount, 0);
  const band =
    typeof supportPolicyModule.resolveAudienceBand === "function"
      ? supportPolicyModule.resolveAudienceBand(viewerCount)
      : "unknown";

  const ackState =
    typeof supportPolicyModule.getSupportAckState === "function"
      ? supportPolicyModule.getSupportAckState(outputState)
      : outputState.supportAckState || {};

  const cooldownMs =
    typeof supportPolicyModule.getAckCooldownMs === "function"
      ? supportPolicyModule.getAckCooldownMs(band)
      : null;

  const lastPublicAckAt = toNumber(ackState.lastPublicAckAt, 0);
  const lastWaveAckAt = toNumber(ackState.lastWaveAckAt, 0);
  const now = Date.now();
  const sinceLastPublicAckMs = lastPublicAckAt > 0 ? Math.max(0, now - lastPublicAckAt) : null;

  const inCooldown =
    typeof supportPolicyModule.isWithinAckCooldown === "function"
      ? supportPolicyModule.isWithinAckCooldown(outputState, band)
      : cooldownMs && sinceLastPublicAckMs !== null
        ? sinceLastPublicAckMs < cooldownMs
        : false;

  return {
    mode:
      typeof supportPolicyModule.getAckModeSetting === "function"
        ? supportPolicyModule.getAckModeSetting()
        : "adaptive",
    reactMode:
      typeof supportPolicyModule.getReactMode === "function"
        ? supportPolicyModule.getReactMode()
        : "koj_primary",
    audienceBand: band,
    viewerCount,
    cooldownMs,
    inCooldown,
    state: {
      lastPublicAckAt: lastPublicAckAt || null,
      lastWaveAckAt: lastWaveAckAt || null,
      sinceLastPublicAckMs,
      giftsSinceAck: toNumber(ackState.giftsSinceAck, 0)
    }
  };
}

function buildShadowPipelineStatus(lastShadowPipelineSummary = null) {
  if (!lastShadowPipelineSummary || typeof lastShadowPipelineSummary !== "object") {
    return {
      lastRun: null,
      hasWarnings: false,
      warningCount: 0
    };
  }

  const warningCount = toNumber(lastShadowPipelineSummary.warningCount, 0);

  return {
    lastRun: cloneJson(lastShadowPipelineSummary, null),
    hasWarnings: warningCount > 0,
    warningCount
  };
}

function buildMiaRuntimeDiagnostics(ctx = {}) {
  const soloStreamModule = ctx.soloStreamModule || {};
  const soloStream =
    typeof soloStreamModule.getSoloStreamSnapshot === "function"
      ? soloStreamModule.getSoloStreamSnapshot({
          runtimeConfig: ctx.runtimeConfig || {},
          outputState: ctx.outputState || {},
          streamState: ctx.streamState || {},
          serverStartedAt: ctx.serverStartedAt,
          kojnozoutState: ctx.kojnozoutState || {},
          obsConnected: ctx.obsConnected,
          tick: null
        })
      : null;

  return {
    proactiveHost: buildProactiveHostStatus(ctx),
    soloStream,
    supportAck: buildSupportAckStatus(ctx),
    shadowPipeline: buildShadowPipelineStatus(ctx.lastShadowPipelineSummary)
  };
}

module.exports = {
  summarizeShadowPipelineResult,
  buildProactiveHostStatus,
  buildSupportAckStatus,
  buildShadowPipelineStatus,
  buildMiaRuntimeDiagnostics
};
