"use strict";

const { createActionResult } = require("./core_contracts_action_result");
const responseEngine = require("../scripts/MIA_RESPONSE_ENGINE");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function isValidTier(tier) {
  return tier === "T1" || tier === "T2" || tier === "T3" || tier === "T4";
}

function getUserLabel(user) {
  if (!user || typeof user !== "object") return "někdo";
  return (
    safeString(user.nickname) ||
    safeString(user.username) ||
    safeString(user.displayName) ||
    safeString(user.name) ||
    "někdo"
  );
}

function pickSpeakerForSupport(decisionResult = {}) {
  const explicitSpeaker = safeString(decisionResult?.speaker).toLowerCase();
  if (explicitSpeaker === "kojnozout" || explicitSpeaker === "mia") {
    return explicitSpeaker;
  }

  const actorRoles = decisionResult?.actorRoles || {};
  const primary = safeString(actorRoles.primary).toLowerCase();

  if (primary === "kojnozout" || primary === "mia") {
    return primary;
  }

  return "mia";
}

function mapSupportInput(normalizedEvent = {}, decisionResult = {}, context = {}) {
  const support = normalizedEvent?.support || {};
  const spamVerdict = decisionResult?.spamVerdict || {};
  const speaker = pickSpeakerForSupport(decisionResult);
  const tier = isValidTier(decisionResult?.tier) ? decisionResult.tier : "";

  return {
    route: "support",
    speaker,
    tier,
    intensity: Number(decisionResult?.intensity || 1),
    userLabel: getUserLabel(normalizedEvent.user),
    giftName: safeString(support.giftName),
    burstCount: Number(
      spamVerdict?.session?.spamEventCount ||
      spamVerdict?.spamEventCount ||
      support.repeatCount ||
      1
    ),
    totalCoins: Number(
      spamVerdict?.session?.spamCoins ||
      support.totalCoins ||
      support.coins ||
      support.rawValue ||
      0
    ),
    bowlPercent: Number(context?.kojnozoutState?.bowlPercent || 0),
    decision: {
      recommendedAction: {
        type: safeString(decisionResult?.reason, "support_reaction").toLowerCase(),
        bankKey: "",
        speaker,
        intensity: Number(decisionResult?.intensity || 1),
        tier
      },
      meta: {
        supportUser: getUserLabel(normalizedEvent.user),
        giftName: safeString(support.giftName)
      }
    }
  };
}

function mapCommunityInput(normalizedEvent = {}, decisionResult = {}, context = {}) {
  const speaker =
    safeString(decisionResult?.speaker).toLowerCase() === "kojnozout"
      ? "kojnozout"
      : "mia";

  const message =
    safeString(normalizedEvent?.message) ||
    safeString(normalizedEvent?.comment) ||
    safeString(normalizedEvent?.content) ||
    safeString(normalizedEvent?.text);

  return {
    route: "community",
    speaker,
    intensity: Number(decisionResult?.intensity || 1),
    userLabel: getUserLabel(normalizedEvent.user),
    bowlPercent: Number(context?.kojnozoutState?.bowlPercent || 0),
    message,
    decision: {
      recommendedAction: {
        type: safeString(decisionResult?.reason, "community_reaction").toLowerCase(),
        bankKey: "community_ping",
        speaker,
        intensity: Number(decisionResult?.intensity || 1),
        tier: ""
      }
    }
  };
}

function toOverlayPayloadFromResponse(response = {}, fallbackRoute = "community") {
  const overlay = response?.overlay || {};

  return {
    contractVersion: "v1",
    owner: safeString(overlay.owner || overlay.creature, "mia"),
    route: safeString(overlay.route, fallbackRoute),
    text: safeString(overlay.text || response?.text),
    subtext: safeString(overlay.subtext),
    priority: Number(overlay.priority || 1),
    holdMs: Number(overlay.holdMs || 4000),
    user: safeString(overlay.user || overlay.userLabel),
    giftName: safeString(overlay.giftName),
    tier: safeString(overlay.tier),
    mood: safeString(overlay.mood),
    stage: safeString(overlay.stage),
    meta:
      overlay.meta && typeof overlay.meta === "object"
        ? JSON.parse(JSON.stringify(overlay.meta))
        : null
  };
}

function wrapActionResult(result = {}) {
  const route = safeString(result.route).toLowerCase() || "ignore";
  const decisionType = safeString(result.decisionType).toLowerCase() || route;
  const shouldPlayVideo = Boolean(result.shouldPlayVideo);
  const tier = isValidTier(result.tier) ? result.tier : "";
  const overlayPayload =
    result.overlayPayload && typeof result.overlayPayload === "object"
      ? result.overlayPayload
      : null;

  return createActionResult({
    route,
    decisionType,
    shouldPlayVideo: route === "support" ? shouldPlayVideo && Boolean(tier) : false,
    tier: route === "support" && shouldPlayVideo ? tier : "",
    overlayPayload,
    statePatch: result.statePatch || null,
    legacyDecision: result.legacyDecision || null,
    legacyNormalizedEvent: result.legacyNormalizedEvent || null,
    reason: safeString(result.reason),
    source: safeString(result.source, "MIA_NEXT"),
    meta: result.meta || null
  });
}

function runAction(decisionResult = {}, context = {}) {
  const normalizedEvent = context.normalizedEvent || {};
  const route = safeString(decisionResult.route || normalizedEvent.route).toLowerCase() || "ignore";
  const tier = isValidTier(decisionResult.tier) ? decisionResult.tier : "";
  const outputState = context.outputState || null;

  if (route === "support") {
    const response = responseEngine.buildSupportResponse(
      outputState,
      mapSupportInput(normalizedEvent, decisionResult, context)
    );

    return wrapActionResult({
      route: "support",
      decisionType: safeString(decisionResult.decisionType, "support"),
      shouldPlayVideo: Boolean(decisionResult.shouldPlayVideo) && Boolean(tier),
      tier,
      overlayPayload: toOverlayPayloadFromResponse(response, "support"),
      reason: safeString(decisionResult.reason, "SUPPORT_ACTION"),
      source: "MIA_NEXT",
      meta: decisionResult?.spamVerdict
        ? {
            spamVerdict: decisionResult.spamVerdict
          }
        : null
    });
  }

  if (route === "community") {
    const response = responseEngine.buildCommunityResponse(
      outputState,
      mapCommunityInput(normalizedEvent, decisionResult, context)
    );

    return wrapActionResult({
      route: "community",
      decisionType: safeString(decisionResult.decisionType, "community"),
      shouldPlayVideo: false,
      tier: "",
      overlayPayload: toOverlayPayloadFromResponse(response, "community"),
      reason: safeString(decisionResult.reason, "COMMUNITY_ACTION"),
      source: "MIA_NEXT"
    });
  }

  return wrapActionResult({
    route,
    decisionType: safeString(decisionResult.decisionType, route || "ignore"),
    shouldPlayVideo: false,
    tier: "",
    overlayPayload: null,
    reason: safeString(decisionResult.reason, "IGNORE_ACTION"),
    source: "MIA_NEXT"
  });
}

module.exports = {
  wrapActionResult,
  runAction
};