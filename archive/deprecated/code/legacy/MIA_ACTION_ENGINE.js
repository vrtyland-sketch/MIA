"use strict";

/**
 * MIA_ACTION_ENGINE.js
 *
 * Legacy compat action engine.
 *
 * OPRAVA PRO TENHLE ZIP:
 * - sjednocen kontrakt se současným MIA_SPAM_ENGINE.js
 * - spam engine vrací:
 *   { type: "support" | "none", tier, spamBoost, debug }
 * - support event nikdy nesmí spadnout do support_none jen proto,
 *   že action engine čekal staré typy first/direct/video/overlay_spam
 */

const kojnozoutEngine = require("../scripts/MIA_KOJNOZROUT_ENGINE");
const spamEngine = require("./MIA_SPAM_ENGINE");

// ----------------------
// HELPERS
// ----------------------

function safeString(v, d = "") {
  return typeof v === "string" && v.trim() ? v.trim() : d;
}

function toNumber(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function normalizeMode(mode) {
  const m = safeString(mode, "OBSERVE").toUpperCase();
  return m === "ACT" ? "ACT" : "OBSERVE";
}

function getUserLabel(user) {
  if (!user) return "někdo";
  return (
    safeString(user.nickname) ||
    safeString(user.username) ||
    safeString(user.displayName) ||
    safeString(user.name) ||
    "někdo"
  );
}

function normalizeTier(tier, fallback = "T1") {
  const t = safeString(tier).toUpperCase();
  if (t === "T1" || t === "T2" || t === "T3" || t === "T4") {
    return t;
  }
  return fallback;
}

function getSupportGiftLabel(normalized = {}) {
  const support = normalized.support || {};
  return (
    safeString(support.giftName) ||
    safeString(normalized.giftName) ||
    "gift"
  );
}

// ----------------------
// OVERLAY BUILDERS
// ----------------------

function buildSupportOverlay(normalized, state, tier, textOverride = "") {
  const text =
    textOverride ||
    `${getUserLabel(normalized.user)} poslal ${getSupportGiftLabel(normalized)}`;

  return {
    type: "mia",
    owner: "mia",
    route: "support",
    title: "MIA",
    text,
    user: getUserLabel(normalized.user),
    tier: safeString(tier),
    giftName: getSupportGiftLabel(normalized),
    bowlPercent: toNumber(state?.bowlPercent, 0),
    bowlVisualLevel: safeString(state?.bowlVisualLevel, "low"),
    mood: safeString(state?.mood, "idle"),
    stage: safeString(state?.stage, "idle"),
    ts: Date.now()
  };
}

function buildCommunityOverlay(normalized, state) {
  return {
    type: "mia",
    owner: "mia",
    route: "community",
    title: "Chat",
    text: `${getUserLabel(normalized.user)}: ${safeString(normalized.message, "")}`,
    user: getUserLabel(normalized.user),
    bowlPercent: toNumber(state?.bowlPercent, 0),
    bowlVisualLevel: safeString(state?.bowlVisualLevel, "low"),
    mood: safeString(state?.mood, "idle"),
    stage: safeString(state?.stage, "idle"),
    ts: Date.now()
  };
}

// ----------------------
// SUPPORT
// ----------------------

function handleSupport(decision, context, result) {
  const normalized = context.normalized || {};
  const state = context.kojnozoutState || {};
  const support = normalized.support || {};
  const useNextSpamCompat = Boolean(context.useNextSpamCompat);

  // miska se vždy aplikuje
  const outcome = kojnozoutEngine.applySupportToKojnozout(state, support);
  Object.assign(state, outcome.state);

  /**
   * NEXT compat režim:
   * - legacy engine udělá bowl/statePatch
   * - starý spam engine nespouští
   * - video/tier/overlay nechá na MIA_NEXT wrapperu
   */
  if (useNextSpamCompat) {
    result.shouldPlayVideo = false;
    result.tier = null;
    result.overlay = null;
    result.response = {
      type: "support_next_spam_compat"
    };
    result.statePatch = {
      kojnozoutState: clone(state)
    };
    return result;
  }

  const spam = spamEngine.processSupport(support);

  console.log("SPAM DEBUG:", spam.debug);

  /**
   * NOVÝ KANONICKÝ KONTRAKT:
   * spam.type:
   * - "support" = validní support, video může jet
   * - "none"    = nevalidní / nulový support
   *
   * spam.tier:
   * - T1/T2/T3/T4
   *
   * spam.spamBoost:
   * - false = normální support
   * - true  = spam buildup / boost, ale pořád support
   */

  if (spam.type === "support") {
    const selectedTier = normalizeTier(
      spam.tier || support.tier || decision?.recommendedAction?.tier || "T1",
      "T1"
    );

    result.shouldPlayVideo = true;
    result.tier = selectedTier;
    result.overlay = buildSupportOverlay(
      normalized,
      state,
      selectedTier,
      selectedTier === "T1" ? "❤️ díky!" : "🔥 díky moc!"
    );
    result.response = {
      type: spam.spamBoost ? "support_spam_boost" : "support_direct",
      spam
    };
    result.statePatch = {
      kojnozoutState: clone(state)
    };
    return result;
  }

  if (spam.type === "none") {
    result.shouldPlayVideo = false;
    result.tier = null;
    result.overlay = null;
    result.response = {
      type: "support_none",
      spam
    };
    result.statePatch = {
      kojnozoutState: clone(state)
    };
    return result;
  }

  // fallback bezpečnostně:
  // když support engine vrátí něco neznámého, nech support radši jako T1
  result.shouldPlayVideo = true;
  result.tier = normalizeTier(
    support.tier || decision?.recommendedAction?.tier || "T1",
    "T1"
  );
  result.overlay = buildSupportOverlay(normalized, state, result.tier, "❤️ díky!");
  result.response = {
    type: "support_fallback",
    spam
  };
  result.statePatch = {
    kojnozoutState: clone(state)
  };

  return result;
}

// ----------------------
// COMMUNITY
// ----------------------

function handleCommunity(decision, context, result) {
  const normalized = context.normalized || {};
  const state = context.kojnozoutState || {};

  if (typeof kojnozoutEngine.applyCommunityPingToKojnozout === "function") {
    const outcome = kojnozoutEngine.applyCommunityPingToKojnozout(
      state,
      { engagementDelta: 1 },
      { user: normalized.user }
    );

    Object.assign(state, outcome.state);
  }

  result.shouldPlayVideo = false;
  result.tier = null;
  result.overlay = buildCommunityOverlay(normalized, state);
  result.response = {
    type: "community_overlay"
  };
  result.statePatch = {
    kojnozoutState: clone(state)
  };

  return result;
}

// ----------------------
// MAIN
// ----------------------

function executeAction(decision = {}, context = {}) {
  const normalized = context.normalized || {};
  const state = context.kojnozoutState || {};

  const result = {
    ok: true,
    route: normalized.route || "unknown",
    mode: normalizeMode(decision.mode),
    shouldPlayVideo: false,
    tier: null,
    overlay: null,
    response: null,
    statePatch: {
      kojnozoutState: clone(state)
    },
    debug: {
      ts: Date.now(),
      eventType: normalized.eventType || "UNKNOWN",
      route: normalized.route || "unknown",
      useNextSpamCompat: Boolean(context.useNextSpamCompat)
    }
  };

  if (result.mode !== "ACT") {
    return result;
  }

  if (normalized.route === "support") {
    return handleSupport(decision, context, result);
  }

  if (normalized.route === "community") {
    return handleCommunity(decision, context, result);
  }

  return result;
}

module.exports = {
  executeAction
};