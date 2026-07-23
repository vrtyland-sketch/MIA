"use strict";

/**
 * MIA_NEXT decision wrapper
 *
 * Cíl:
 * - dát shadow runtime stabilní kontrakt i bez legacy spam override hacků
 * - umět běžet pro support i community eventy
 */

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeTier(value) {
  const tier = safeString(value).toUpperCase();
  return ["T1", "T2", "T3", "T4"].includes(tier) ? tier : "";
}

function buildSupportDecision(normalizedEvent = {}) {
  const support = normalizedEvent.support || {};
  const tier = normalizeTier(support.tier) || "T1";

  return {
    route: "support",
    decisionType: "support",
    shouldPlayVideo: true,
    tier,
    reason: "SUPPORT_RESOLVED",
    resolvedSupport: {
      tier,
      coins: Number(support.coins || 0),
      giftName: safeString(support.giftName)
    }
  };
}

function buildCommunityDecision() {
  return {
    route: "community",
    decisionType: "community",
    shouldPlayVideo: false,
    tier: "",
    reason: "COMMUNITY_OBSERVE"
  };
}

function buildIgnoreDecision(route = "ignore", reason = "IGNORE") {
  return {
    route,
    decisionType: route === "system" ? "system" : "ignore",
    shouldPlayVideo: false,
    tier: "",
    reason
  };
}

function wrapDecision(input = {}) {
  const route = safeString(input.route || input?.normalizedEvent?.route).toLowerCase();

  if (route === "support") {
    const resolvedSupport = input.resolvedSupport || input?.normalizedEvent?.support || {};
    const tier = normalizeTier(resolvedSupport.tier);

    if (!tier) {
      return {
        route: "support",
        decisionType: "support",
        shouldPlayVideo: false,
        tier: null,
        reason: "NO_TIER",
        resolvedSupport: null
      };
    }

    if (input.legacyResponseType === "support_next_spam_compat") {
      console.log("[MIA DECISION] ignoring legacy spam compat");
    }

    return {
      route: "support",
      decisionType: "support",
      shouldPlayVideo: true,
      tier,
      reason: "SUPPORT_RESOLVED",
      resolvedSupport: {
        ...resolvedSupport,
        tier
      }
    };
  }

  if (route === "community") {
    return buildCommunityDecision();
  }

  return buildIgnoreDecision(route || "ignore", "UNHANDLED_ROUTE");
}

function runDecision(normalizedEvent = {}) {
  const route = safeString(normalizedEvent.route).toLowerCase();

  if (route === "support") {
    return buildSupportDecision(normalizedEvent);
  }

  if (route === "community") {
    return buildCommunityDecision();
  }

  if (route === "system") {
    return buildIgnoreDecision("system", "SYSTEM_EVENT");
  }

  return buildIgnoreDecision("ignore", "UNHANDLED_ROUTE");
}

module.exports = {
  wrapDecision,
  runDecision
};