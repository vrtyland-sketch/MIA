"use strict";

/**
 * Ingest normalization helpers — chat feed, support/community payload extractors.
 */

function createIngestUtilsRuntime(deps = {}) {
  const {
    safeString,
    getUserLabel,
    getAvatarUrl,
    overlayStateModule,
    getOverlayState,
    runtimeConfig
  } = deps;

  function extractSupportPayload(normalized = {}) {
    if (normalized?.support && typeof normalized.support === "object") {
      return {
        ...normalized.support,
        user: normalized.user || normalized.support.user || null
      };
    }

    return normalized;
  }

  function extractCommunityImpact(normalized = {}) {
    if (
      normalized?.communityImpact &&
      typeof normalized.communityImpact === "object"
    ) {
      return normalized.communityImpact;
    }

    return {};
  }

  function pushChatFeed(normalized = {}) {
    const text = safeString(
      normalized.message ||
        normalized.comment ||
        normalized.content ||
        normalized.text
    );

    if (!text) return;

    const overlayState =
      typeof getOverlayState === "function" ? getOverlayState() : {};
    const userLabel = getUserLabel(normalized);

    const item = {
      platform: safeString(normalized.platform, "unknown"),
      user: userLabel,
      userLabel,
      avatarUrl: getAvatarUrl(normalized),
      text,
      type: "chat",
      ts: Date.now()
    };

    if (typeof overlayStateModule?.pushChatFeedItem === "function") {
      overlayStateModule.pushChatFeedItem(
        overlayState,
        item,
        runtimeConfig?.overlay?.maxChatFeedItems || 6,
        { maxAgeMs: runtimeConfig?.overlay?.chatFeedMaxAgeMs || 15000 }
      );
    } else {
      overlayState.chatFeed = [item].concat(overlayState.chatFeed || []).slice(0, 6);
    }

    // Capture viewer words for gift-animation ask-words flow (if pending).
    try {
      const giftAnim = require("../shared/mia-gift-animation");
      giftAnim.tryCaptureWordsFromChat(userLabel, text);
    } catch (_err) {
      /* optional */
    }
  }

  return { pushChatFeed, extractSupportPayload, extractCommunityImpact };
}

module.exports = { createIngestUtilsRuntime };
