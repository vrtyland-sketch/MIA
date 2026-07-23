"use strict";

/**
 * Auto-apply boss mission arc when T5/T6 gift arrives (giftAutoApply config).
 */

function createBossMissionRuntime(deps = {}) {
  const {
    runtimeConfig,
    bossMissionModule,
    getOverlayState,
    safeString,
    getUserLabel,
    videoEngine,
    writeLog
  } = deps;

  async function tryAutoBossMissionFromGift(normalized = {}) {
    if (runtimeConfig?.bossMission?.giftAutoApply !== true) return null;
    if (typeof bossMissionModule?.applyBossMission !== "function") return null;

    const tier = safeString(
      normalized?.support?.giftContext?.obsTier ||
        normalized?.support?.giftContext?.streamTier
    ).toUpperCase();
    if (!/^T[56]$/.test(tier)) return null;

    const overlayState =
      typeof getOverlayState === "function" ? getOverlayState() : {};

    try {
      const userLabel = getUserLabel(normalized);
      const applied = bossMissionModule.applyBossMission(overlayState, {
        userLabel,
        nickname: userLabel,
        trigger: "gift_auto",
        chatText: "boss mise"
      });
      if (!applied?.ok) return applied;

      if (
        applied.playHint &&
        videoEngine &&
        typeof videoEngine.playSpecialEvent === "function"
      ) {
        await videoEngine.playSpecialEvent(applied.playHint.tier, normalized, {
          sourceName: applied.playHint.sourceName,
          mediaRel: applied.playHint.mediaRel,
          reason: "boss_mission_gate",
          waitForMediaEnd: true
        });
      }

      writeLog("mia-events", {
        ts: Date.now(),
        stage: "boss_mission_auto_gift",
        arcId: applied.plan?.arcId,
        userLabel,
        tier
      });
      return applied;
    } catch (err) {
      writeLog("mia-errors", {
        source: "boss_mission_auto_gift",
        error: err.message
      });
      return null;
    }
  }

  return { tryAutoBossMissionFromGift };
}

module.exports = { createBossMissionRuntime };
