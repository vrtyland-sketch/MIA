const { normalizeTikTokRaw } = require("./MIA_TIKTOK_NORMALIZER");
const {
  normalizeKickComment,
  normalizeKickSupport
} = require("./MIA_PARSER_KICK");
const { classifyEvent } = require("./MIA_EVENT_CLASSIFIER");
const { resolveSupport } = require("./MIA_SUPPORT_RESOLVER");
const { resolveCommunityImpact } = require("./MIA_COMMUNITY_RESOLVER");
const {
  applyCommunityImpact,
  applySupportImpact
} = require("./MIA_STREAM_STATE");
const { evaluateState } = require("./MIA_DECISION_ENGINE");
const { executeAction } = require("./MIA_ACTION_ENGINE");

function detectRawSource(event) {
  if (
    event.platform === "tiktok" ||
    event.tikfinityUserId ||
    event.tikfinityUsername ||
    event.giftName
  ) {
    return "tiktok";
  }

  if (
    event.platform === "kick" ||
    event.kickUserId ||
    event.kickUsername
  ) {
    return "kick";
  }

  return "unknown";
}

function normalizeIncomingEvent(rawEvent) {
  const source = detectRawSource(rawEvent);

  if (source === "tiktok") {
    return normalizeTikTokRaw(rawEvent);
  }

  if (source === "kick") {
    if (
      rawEvent.type === "gift" ||
      rawEvent.amount ||
      Number(rawEvent.coins || 0) > 0
    ) {
      return normalizeKickSupport(rawEvent);
    }

    return normalizeKickComment(rawEvent);
  }

  return null;
}

async function handleIngest(rawEvent, helpers = {}) {
  const { nextVideo, playVideo } = helpers;

  console.log("RAW BODY:", rawEvent);

  const event = normalizeIncomingEvent(rawEvent);

  if (!event) {
    return {
      httpStatus: 400,
      body: {
        status: "error",
        error: "Unable to normalize event"
      }
    };
  }

  console.log("NORMALIZED EVENT:", event);

  const classification = classifyEvent(event);
  console.log("CLASSIFICATION:", classification);

  if (classification.streamType === "ignore") {
    return {
      httpStatus: 200,
      body: {
        status: "ignored",
        classification
      }
    };
  }

  if (classification.streamType === "community") {
    const impact = resolveCommunityImpact(event);
    console.log("COMMUNITY IMPACT:", impact);

    const state = applyCommunityImpact(impact);
    const decision = evaluateState(state);

    console.log("STREAM STATE:", state);
    console.log("DECISION:", decision);

    executeAction(decision, state);

    return {
      httpStatus: 200,
      body: {
        status: "ok",
        handledAs: "community",
        platform: event.platform,
        impact,
        state,
        decision
      }
    };
  }

  if (classification.streamType === "support") {
    const support = resolveSupport(event);
    console.log("SUPPORT RESOLVED:", support);

    const tier = support.tier;
    const source = nextVideo(tier);

    console.log("EVENT BUS ROUTE: support");
    console.log("TIER:", tier);
    console.log("SOURCE:", source);

    const played = await playVideo(source);
    const state = applySupportImpact(support);
    const decision = evaluateState(state);

    console.log("STREAM STATE:", state);
    console.log("DECISION:", decision);

    executeAction(decision, state);

    return {
      httpStatus: 200,
      body: {
        status: "ok",
        handledAs: "support",
        platform: event.platform,
        tier,
        source,
        played,
        support,
        state,
        decision
      }
    };
  }

  return {
    httpStatus: 200,
    body: {
      status: "ok",
      handledAs: "system"
    }
  };
}

module.exports = {
  detectRawSource,
  normalizeIncomingEvent,
  handleIngest
};