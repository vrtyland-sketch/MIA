"use strict";

/**
 * Vision context for OBS vision / MIA eyes — active overlay moments snapshot.
 */

function createVisionContextRuntime(deps = {}) {
  const {
    overlayStateModule,
    getOverlayState,
    runtimeConfig,
    kojnozoutDuelModule,
    getDuelState,
    kickBridgeModule,
    miaEyes,
    isStartupSlideActive
  } = deps;

  function buildVisionContext() {
    const overlayState = typeof getOverlayState === "function" ? getOverlayState() : {};
    const overlaySnap =
      typeof overlayStateModule?.getOverlaySnapshot === "function"
        ? overlayStateModule.getOverlaySnapshot(overlayState, {
            maxChatFeedItems: runtimeConfig?.overlay?.maxChatFeedItems || 6
          })
        : {};

    const duelState = typeof getDuelState === "function" ? getDuelState() : {};
    const duelSnapshot =
      typeof kojnozoutDuelModule?.getDuelSnapshot === "function"
        ? kojnozoutDuelModule.getDuelSnapshot(duelState)
        : null;

    const kickStatus =
      typeof kickBridgeModule?.getKickBridgeStatus === "function"
        ? kickBridgeModule.getKickBridgeStatus()
        : null;

    const eyesSnap =
      miaEyes && typeof miaEyes.getSnapshot === "function" ? miaEyes.getSnapshot() : null;
    const playingNow = eyesSnap?.lastView?.playingNow || [];
    const playingGiftVideo = playingNow.some((row) => row?.media?.playing);

    const activeMoment = (snap) => snap && typeof snap === "object" && Object.keys(snap).length > 0;

    return {
      startupSlideActive:
        typeof isStartupSlideActive === "function" ? isStartupSlideActive() : false,
      t0Flyby: activeMoment(overlaySnap.t0Flyby) ? { active: true, ...overlaySnap.t0Flyby } : null,
      comboMoment: activeMoment(overlaySnap.comboMoment)
        ? { active: true, ...overlaySnap.comboMoment }
        : null,
      bossCinematic: activeMoment(overlaySnap.bossCinematic)
        ? { active: true, ...overlaySnap.bossCinematic }
        : null,
      immersiveScene: activeMoment(overlaySnap.immersiveScene)
        ? { active: true, ...overlaySnap.immersiveScene }
        : null,
      storyVisual: activeMoment(overlaySnap.storyVisual)
        ? { active: true, ...overlaySnap.storyVisual }
        : null,
      giftMoment: activeMoment(overlaySnap.giftVisual)
        ? { active: true, ...overlaySnap.giftVisual }
        : null,
      giftAnimation: activeMoment(overlaySnap.giftAnimationMoment)
        ? { active: true, ...overlaySnap.giftAnimationMoment }
        : null,
      duel:
        duelSnapshot && duelSnapshot.active !== false && duelSnapshot.status !== "ended"
          ? { active: true, ...duelSnapshot }
          : null,
      playingGiftVideo,
      kickBridgeEnabled: kickStatus?.started === true
    };
  }

  return { buildVisionContext };
}

module.exports = { createVisionContextRuntime };
