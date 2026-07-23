"use strict";

/**
 * OBS post-connect bootstrap — hands, hub, layouts, vision, browser refresh.
 */

function createObsPostConnectRuntime(deps = {}) {
  const {
    writeLog,
    safeString,
    runtimeConfig,
    ensureObsHands,
    configureObsMiaLiveHub,
    fixObsOverlayBrowserLayouts,
    fixObsOverlaySceneTransforms,
    ensureObsMiaSourceVisibleInProgramScene,
    videoEngine,
    ensureObsVoiceBrowserReady,
    obsVision,
    obsBrowserRefreshOnConnectEnabled,
    refreshObsMiaBrowserSources,
    miaEyes
  } = deps;

  async function bootstrapObsAfterConnect() {
    const handsResult = await ensureObsHands({ restartReason: "obs_hands_bootstrap" });
    const hubConfig = await configureObsMiaLiveHub();
    await fixObsOverlayBrowserLayouts();
    await fixObsOverlaySceneTransforms();
    await ensureObsMiaSourceVisibleInProgramScene(hubConfig?.configured || []);

    if (
      videoEngine &&
      typeof videoEngine.ensurePersistentStreamOverlaysOnTop === "function"
    ) {
      const sceneName =
        safeString(runtimeConfig?.obs?.sceneName) || "SPINAK_ENGINE_GIFTS";
      await videoEngine.ensurePersistentStreamOverlaysOnTop(sceneName, "");
    }

    await ensureObsVoiceBrowserReady();

    if (obsVision && typeof obsVision.startWatch === "function" && obsVision.isEnabled()) {
      const visionStart = obsVision.startWatch();
      if (visionStart?.ok) {
        console.log(
          `[OBS VISION] sledování scény zapnuto (${runtimeConfig?.obs?.vision?.intervalMs || 2500} ms)`
        );
      }
    }

    if (obsBrowserRefreshOnConnectEnabled()) {
      await refreshObsMiaBrowserSources();
    }

    if (miaEyes && typeof miaEyes.syncWebcamVisibility === "function") {
      try {
        const webcam = await miaEyes.syncWebcamVisibility();
        if (webcam?.action === "hide" || webcam?.action === "show") {
          console.log(
            `[MIA EYES] webcam ${webcam.action} (${webcam.sourceName}, lum=${webcam.avgLum})`
          );
        }
      } catch (err) {
        writeLog("mia-errors", { source: "mia_eyes_webcam_bootstrap", error: err.message });
      }
    }

    return { handsResult };
  }

  return { bootstrapObsAfterConnect };
}

module.exports = { createObsPostConnectRuntime };
