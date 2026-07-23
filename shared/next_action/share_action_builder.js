"use strict";

/**
 * shared/next_action/share_action_builder.js
 *
 * NOVÁ ČISTÁ SHARE ACTION VRSTVA
 *
 * DŮLEŽITÉ:
 * - vrací oficiální MIA_NEXT action_result kontrakt
 * - overlay jde přes oficiální overlay_payload kontrakt
 * - texty už nejsou natvrdo tady, ale v share_text_bank
 */

const {
  createActionResult,
  validateActionResult
} = require("../platform_runtime_contracts/core_contracts_action_result");

const {
  createOverlayPayload,
  validateOverlayPayload
} = require("../platform_runtime_contracts/core_contracts_overlay_payload");

const {
  buildShareTextPackage
} = require("./share_text_bank");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clone(value, fallback = null) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_err) {
    return fallback;
  }
}

function buildOverlayPayload(decision = {}) {
  const textPack = buildShareTextPackage({
    mode: safeString(decision.shareMode, "share_single"),
    speaker: safeString(decision.speaker, "mia"),
    userLabel: safeString(decision?.meta?.userLabel, "někdo"),
    userShareCount: toNumber(decision?.meta?.userShareCount, 0),
    totalCommunityShares: toNumber(decision?.meta?.totalCommunityShares, 0),
    platform: safeString(decision?.meta?.platform, "unknown"),
    bowlPercent: clamp(toNumber(decision?.meta?.bowlPercent, 0), 0, 100),
    mood: safeString(decision?.meta?.mood, "neutral")
  });

  return createOverlayPayload({
    owner: safeString(decision.speaker, "mia"),
    route: "community",
    text: textPack.text,
    subtext: textPack.subtext,
    priority: textPack.priority,
    holdMs: textPack.holdMs,
    user: safeString(decision?.meta?.userLabel),
    giftName: "",
    tier: "",
    mood: safeString(decision?.meta?.mood, "neutral"),
    stage: "share",
    meta: {
      domain: "share",
      shareMode: safeString(decision.shareMode, "share_single"),
      userShareCount: toNumber(decision?.meta?.userShareCount, 0),
      totalCommunityShares: toNumber(decision?.meta?.totalCommunityShares, 0),
      platform: safeString(decision?.meta?.platform, "unknown"),
      bowlPercent: clamp(toNumber(decision?.meta?.bowlPercent, 0), 0, 100)
    }
  });
}

function buildStatePatch(decision = {}) {
  return {
    route: "community",
    lastReason: safeString(decision.reason, "NEXT_SHARE_DECISION"),
    lastSpeaker: safeString(decision.speaker, "mia"),
    lastTier: "",
    lastUser: safeString(decision?.meta?.userLabel),
    bowlPercent: clamp(toNumber(decision?.meta?.bowlPercent, 0), 0, 100),
    mood: safeString(decision?.meta?.mood, "neutral"),
    stage: "share"
  };
}

function createShareAction(decision = {}) {
  const overlayPayload = buildOverlayPayload(decision);
  const overlayValidation = validateOverlayPayload(overlayPayload);

  if (!overlayValidation.ok) {
    throw new Error(
      `share overlay payload invalid: ${overlayValidation.errors.join(", ")}`
    );
  }

  const actionResult = createActionResult({
    route: "community",
    decisionType: "community",
    shouldPlayVideo: false,
    tier: "",
    overlayPayload,
    statePatch: buildStatePatch(decision),
    legacyDecision: clone(decision, {}),
    legacyNormalizedEvent: clone(decision?.legacy?.event, null),
    reason: safeString(decision.reason, "NEXT_SHARE_DECISION"),
    source: "shared/next_action/share_action_builder",
    meta: {
      domain: "share",
      speaker: safeString(decision.speaker, "mia"),
      intensity: clamp(toNumber(decision.intensity, 2), 1, 4),
      shareMode: safeString(decision.shareMode, "share_single"),
      actorRoles: clone(decision?.actorRoles, null),
      companion: {
        allowCompanion: Boolean(decision?.actorRoles?.allowCompanion),
        companion: safeString(decision?.actorRoles?.companion, "kojnozout"),
        reason: safeString(decision?.actorRoles?.companionReason)
      },
      tts: {
        enabled: true,
        owner: safeString(decision.speaker, "mia"),
        text: safeString(overlayPayload.text)
      }
    }
  });

  const actionValidation = validateActionResult(actionResult);

  if (!actionValidation.ok) {
    throw new Error(
      `share action_result invalid: ${actionValidation.errors.join(", ")}`
    );
  }

  return actionResult;
}

function isShareAction(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    value.meta &&
    value.meta.domain === "share"
  );
}

module.exports = {
  createShareAction,
  isShareAction,
  buildOverlayPayload
};