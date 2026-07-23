"use strict";

/**
 * Viewer strip — recent participants on overlay state.
 */

function createParticipantRuntime(deps = {}) {
  const {
    safeString,
    getUserLabel,
    getAvatarUrl,
    overlayStateModule,
    getOverlayState,
    runtimeConfig
  } = deps;

  function overlayStateRef() {
    return typeof getOverlayState === "function" ? getOverlayState() : {};
  }

  function pushRecentParticipant(normalized = {}, type = "chat") {
    const userLabel = getUserLabel(normalized);
    if (!userLabel) return;

    const support = normalized?.support || {};
    const item = {
      platform: safeString(normalized.platform, "unknown"),
      user: userLabel,
      userLabel,
      userId: normalized?.user?.userId ?? null,
      avatarUrl: getAvatarUrl(normalized),
      type,
      giftName: safeString(support.giftName || normalized?.giftName),
      giftCount: Math.max(
        1,
        Number(support.giftCount || support.repeatCount || normalized?.giftCount || 1)
      ),
      tier: safeString(support.tier).toUpperCase(),
      ts: Date.now()
    };

    const state = overlayStateRef();
    const maxRecent = runtimeConfig?.overlay?.maxRecentParticipants || 8;
    const maxAgeMs = runtimeConfig?.overlay?.recentParticipantsMaxAgeMs || 300000;

    if (typeof overlayStateModule?.pushRecentParticipant === "function") {
      overlayStateModule.pushRecentParticipant(state, item, maxRecent, { maxAgeMs });
    } else {
      state.recentParticipants = [item].concat(state.recentParticipants || []).slice(0, maxRecent);
    }
  }

  return { pushRecentParticipant };
}

module.exports = { createParticipantRuntime };
