"use strict";

/**
 * OBS → matting ingest bridge — periodicky screenshotuje CAM sloty a posílá do MIA_STREAMER_MATTING.
 * Používá GetSourceScreenshot (stejně jako MIA oči), ne HTTP loopback.
 */

const {
  listCameraSlots,
  resolveCameraId
} = require("../shared/mia-scene-engine/streamerCameraRig");
const {
  analyzePngBase64Luminance,
  normalizeScreenshotBase64
} = require("./MIA_EYES");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function createMattingIngestBridge(deps = {}) {
  const safeObsCall =
    typeof deps.safeObsCall === "function" ? deps.safeObsCall : null;
  const streamerMatting = deps.streamerMatting || null;
  const runtimeConfig = deps.runtimeConfig || {};
  const getImmersiveSceneSnapshot =
    typeof deps.getImmersiveSceneSnapshot === "function"
      ? deps.getImmersiveSceneSnapshot
      : () => null;
  const appendJsonLog =
    typeof deps.appendJsonLog === "function" ? deps.appendJsonLog : () => {};
  const nowTs = typeof deps.nowTs === "function" ? deps.nowTs : () => Date.now();

  const mattingCfg = runtimeConfig.mattingIngest || {};
  const cfg = {
    enabled: mattingCfg.enabled !== false,
    pollMs: Math.max(800, toNumber(mattingCfg.pollMs, 1200)),
    onlyWhenImmersive: mattingCfg.onlyWhenImmersive !== false,
    sceneName: safeString(runtimeConfig?.obs?.sceneName, "SPINAK_ENGINE_GIFTS"),
    screenshotWidth: toNumber(mattingCfg.screenshotWidth, 480),
    screenshotHeight: toNumber(mattingCfg.screenshotHeight, 640),
    minLuminance: toNumber(mattingCfg.minLuminance, 12),
    maxCamerasPerTick: Math.max(1, Math.min(6, toNumber(mattingCfg.maxCamerasPerTick, 2))),
    legacyPrimarySource: safeString(
      mattingCfg.legacyPrimarySource,
      safeString(process.env.MIA_OBS_CAMERA_NAME, "NOTEBOOK_CAMERA")
    )
  };

  const state = {
    lastTickAt: 0,
    tickIndex: 0,
    lastResults: [],
    lastError: null,
    running: false,
    capturesOk: 0,
    capturesSkip: 0,
    enabled: cfg.enabled
  };

  function resolveSourceCandidates(slot) {
    const names = [slot.obsName];
    if (slot.id === "CAM_01") {
      names.push(
        cfg.legacyPrimarySource,
        "NOTEBOOK_CAMERA",
        "MIA_WEBCAM",
        "Video Capture Device"
      );
    }
    return [...new Set(names.map((n) => safeString(n)).filter(Boolean))];
  }

  async function findSourceInScene(sourceName) {
    const idResp = await safeObsCall("GetSceneItemId", {
      sceneName: cfg.sceneName,
      sourceName
    });
    if (!idResp?.ok) return null;

    const sceneItemId = idResp.response?.sceneItemId ?? idResp.sceneItemId;
    const enabledResp = await safeObsCall("GetSceneItemEnabled", {
      sceneName: cfg.sceneName,
      sceneItemId
    });
    const sceneItemEnabled = Boolean(
      enabledResp?.response?.sceneItemEnabled ?? enabledResp?.sceneItemEnabled
    );

    return { sourceName, sceneItemId, sceneItemEnabled };
  }

  async function captureSource(sourceName) {
    const shot = await safeObsCall("GetSourceScreenshot", {
      sourceName,
      imageFormat: "png",
      imageWidth: cfg.screenshotWidth,
      imageHeight: cfg.screenshotHeight
    });
    if (!shot?.ok) {
      return { ok: false, reason: shot?.reason || "GetSourceScreenshot_failed", sourceName };
    }

    const imageData = normalizeScreenshotBase64(
      shot.response?.imageData || shot.imageData || ""
    );
    if (!imageData) {
      return { ok: false, reason: "empty_screenshot", sourceName };
    }

    const lum = await analyzePngBase64Luminance(imageData);
    if (!lum.ok) {
      return { ok: false, reason: lum.reason || "luminance_failed", sourceName };
    }
    if (lum.avgLum < cfg.minLuminance) {
      return {
        ok: false,
        skipped: true,
        reason: "no_signal",
        sourceName,
        avgLum: lum.avgLum
      };
    }

    return { ok: true, sourceName, imageData, avgLum: lum.avgLum };
  }

  async function captureSlot(slot, creatureParams = null) {
    if (!slot.useForMatte) {
      return { ok: false, skipped: true, reason: "not_for_matte", cameraId: slot.id };
    }

    for (const candidate of resolveSourceCandidates(slot)) {
      const meta = await findSourceInScene(candidate);
      if (!meta) continue;

      if (!meta.sceneItemEnabled) {
        return {
          ok: false,
          skipped: true,
          reason: "source_disabled",
          cameraId: slot.id,
          sourceName: candidate
        };
      }

      const capture = await captureSource(candidate);
      if (!capture.ok) {
        if (capture.skipped) {
          return { ...capture, cameraId: slot.id };
        }
        continue;
      }

      if (
        !streamerMatting ||
        typeof streamerMatting.ingestCameraFrame !== "function"
      ) {
        return { ok: false, reason: "matting_module_missing", cameraId: slot.id };
      }

      const ingested = await streamerMatting.ingestCameraFrame({
        cameraId: slot.id,
        obsName: candidate,
        frameBase64: capture.imageData,
        mode: "auto",
        creatureParams: creatureParams || undefined
      });

      return {
        ok: ingested.ok === true,
        cameraId: slot.id,
        sourceName: candidate,
        role: slot.role,
        avgLum: capture.avgLum,
        matteReady: ingested.matteReady,
        error: ingested.error || null
      };
    }

    return {
      ok: false,
      skipped: true,
      reason: "source_not_found",
      cameraId: slot.id,
      candidates: resolveSourceCandidates(slot)
    };
  }

  async function tick(options = {}) {
    if (state.running && options.force !== true) {
      return { ok: false, reason: "already_running" };
    }
    if (!state.enabled && options.force !== true) {
      return { ok: true, action: "disabled" };
    }
    if (!safeObsCall) {
      return { ok: false, reason: "no_obs" };
    }

    if (cfg.onlyWhenImmersive && options.force !== true) {
      const scene = getImmersiveSceneSnapshot();
      if (!scene?.active) {
        return { ok: true, action: "idle_no_immersive" };
      }
    }

    state.running = true;
    try {
      const slots = listCameraSlots().filter((row) => row.useForMatte);
      const startIdx = state.tickIndex % Math.max(1, slots.length);
      const batch = [];
      for (let i = 0; i < Math.min(cfg.maxCamerasPerTick, slots.length); i += 1) {
        batch.push(slots[(startIdx + i) % slots.length]);
      }
      state.tickIndex += cfg.maxCamerasPerTick;

      const creatureParams = getImmersiveSceneSnapshot()?.creature?.params || null;
      const results = [];
      for (const slot of batch) {
        results.push(await captureSlot(slot, creatureParams));
      }

      const okCount = results.filter((row) => row.ok).length;
      const skipCount = results.filter((row) => row.skipped).length;
      state.capturesOk += okCount;
      state.capturesSkip += skipCount;
      state.lastResults = results;
      state.lastTickAt = nowTs();
      state.lastError = null;

      appendJsonLog("mia-events", {
        ts: state.lastTickAt,
        stage: "matting_ingest_tick",
        okCount,
        skipCount,
        batch: batch.map((row) => row.id)
      });

      return { ok: true, results, okCount, skipCount };
    } catch (err) {
      state.lastError = err.message || "tick_failed";
      return { ok: false, error: state.lastError };
    } finally {
      state.running = false;
    }
  }

  function getStatus() {
    const matte =
      streamerMatting && typeof streamerMatting.getMatteState === "function"
        ? streamerMatting.getMatteState()
        : null;
    return {
      ok: true,
      enabled: state.enabled,
      onlyWhenImmersive: cfg.onlyWhenImmersive,
      pollMs: cfg.pollMs,
      lastTickAt: state.lastTickAt,
      running: state.running,
      capturesOk: state.capturesOk,
      capturesSkip: state.capturesSkip,
      lastResults: state.lastResults,
      lastError: state.lastError,
      matteActive: matte?.active === true,
      activeCameras: matte?.activeCameras || []
    };
  }

  function setEnabled(value) {
    state.enabled = value !== false;
    cfg.enabled = state.enabled;
    return { ok: true, enabled: state.enabled };
  }

  return {
    tick,
    getStatus,
    setEnabled,
    resolveCameraId
  };
}

module.exports = {
  createMattingIngestBridge
};
