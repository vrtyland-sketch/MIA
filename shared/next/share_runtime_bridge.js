"use strict";

/**
 * shared/next/share_runtime_bridge.js
 *
 * SOFT BRIDGE mezi novou SHARE architekturou a MIA_NEXT runtime.
 *
 * Pravidla:
 * - bridge se aktivuje jen když je explicitně povolený
 * - bridge zpracovává pouze SHARE eventy
 * - když selže, runtime nespadne a pokračuje legacy větví
 */

const { createShareDecision } = require("../next_decision/share_decision_engine");
const { createShareAction } = require("../next_action/share_action_builder");
const actionResultContract = require("../platform_runtime_contracts/core_contracts_action_result");
const overlayPayloadContract = require("../platform_runtime_contracts/core_contracts_overlay_payload");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toBool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
  }

  return fallback;
}

function cloneJson(value, fallback = null) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_err) {
    return fallback;
  }
}

function getEventType(event = {}) {
  return safeString(event.eventType || event.type).toUpperCase();
}

function isShareEvent(event = {}) {
  return getEventType(event) === "SHARE";
}

function resolveBridgeEnabled(ctx = {}) {
  if (typeof ctx.nextShareBridgeEnabled === "boolean") {
    return ctx.nextShareBridgeEnabled;
  }

  if (ctx.runtimeConfig?.miaNext?.share) {
    const cfg = ctx.runtimeConfig.miaNext.share;

    if (typeof cfg.runtimeBridgeEnabled === "boolean") {
      return cfg.runtimeBridgeEnabled;
    }

    if (typeof cfg.enabled === "boolean") {
      return cfg.enabled;
    }
  }

  return toBool(process.env.MIA_NEXT_SHARE_BRIDGE_ENABLED, false);
}

function validateBridgeArtifacts(actionResult = {}) {
  const actionValidation = actionResultContract.validateActionResult(actionResult);

  if (!actionValidation?.ok) {
    throw new Error(
      `share bridge action invalid: ${(actionValidation?.errors || []).join(", ")}`
    );
  }

  if (actionResult?.overlayPayload) {
    const overlayValidation = overlayPayloadContract.validateOverlayPayload(
      actionResult.overlayPayload
    );

    if (!overlayValidation?.ok) {
      throw new Error(
        `share bridge overlay invalid: ${(overlayValidation?.errors || []).join(", ")}`
      );
    }
  }
}

function tryBuildShareBridgeResult(ctx = {}) {
  const rawEvent = ctx.rawEvent || {};

  if (!resolveBridgeEnabled(ctx)) {
    return {
      ok: false,
      skipped: true,
      reason: "share_bridge_disabled"
    };
  }

  if (!isShareEvent(rawEvent)) {
    return {
      ok: false,
      skipped: true,
      reason: "not_share_event"
    };
  }

  const decisionResult = createShareDecision(
    rawEvent,
    ctx.streamState || {},
    ctx.kojnozoutState || {}
  );

  const actionResult = createShareAction(decisionResult);
  validateBridgeArtifacts(actionResult);

  return {
    ok: true,
    source: "shared/next/share_runtime_bridge",
    decisionResult,
    actionResult,
    debug: {
      bridge: "share",
      enabled: true,
      eventType: getEventType(rawEvent),
      shareMode: safeString(decisionResult?.shareMode, "share_single")
    },
    legacySnapshot: {
      rawEvent: cloneJson(rawEvent, {}),
      streamState: {
        hasUserActivity: Boolean(ctx.streamState?.userActivity)
      }
    }
  };
}

module.exports = {
  tryBuildShareBridgeResult,
  resolveBridgeEnabled,
  isShareEvent
};