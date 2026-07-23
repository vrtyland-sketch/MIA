"use strict";

/**
 * OBS layout pro 6-kamerový matting rig + immersive overlay spec.
 */

const { listCameraSlots, LEGACY_ALIASES } = require("./streamerCameraRig");

const IMMERSIVE_OVERLAY = Object.freeze({
  id: "immersive_scene",
  inputName: "MIA_IMMERSIVE_SCENE",
  file: "immersive-scene-overlay.html",
  urlKey: "immersiveScene",
  width: 1920,
  height: 1080,
  defaultVisible: false,
  zIndex: 91
});

/** Kamery jen pro matting — mimo program (screenshot stále funguje). */
const MATTING_STAGE_TRANSFORM = Object.freeze({
  positionX: -2400,
  positionY: -2400,
  scaleX: 1,
  scaleY: 1,
  alignment: 5,
  boundsType: "OBS_BOUNDS_SCALE_INNER",
  boundsWidth: 640,
  boundsHeight: 480
});

/** CAM_01 / NOTEBOOK_CAMERA — viditelný preview v rohu streamu. */
const PRIMARY_CAMERA_TRANSFORM = Object.freeze({
  positionX: 40,
  positionY: 520,
  scaleX: 1,
  scaleY: 1,
  alignment: 5,
  boundsType: "OBS_BOUNDS_SCALE_INNER",
  boundsWidth: 320,
  boundsHeight: 180
});

function resolvePrimaryLegacyName(explicit = "") {
  const named = typeof explicit === "string" ? explicit.trim() : "";
  return (
    named ||
    process.env.MIA_OBS_CAMERA_NAME ||
    LEGACY_ALIASES.NOTEBOOK_CAMERA ||
    "NOTEBOOK_CAMERA"
  );
}

function resolveCameraTransform(slot, aliasedPrimary = false) {
  if (slot.id === "CAM_01" || aliasedPrimary) {
    return { ...PRIMARY_CAMERA_TRANSFORM };
  }
  return { ...MATTING_STAGE_TRANSFORM };
}

function resolveDefaultSceneItemEnabled(slot, aliasedPrimary = false) {
  if (slot.id === "CAM_01" || aliasedPrimary) return true;
  return false;
}

function buildCameraEnsurePlans(options = {}) {
  const legacyPrimary = resolvePrimaryLegacyName(options.legacyPrimaryName);
  const existing = new Set((options.existingInputNames || []).map((n) => String(n)));
  const slots = listCameraSlots();

  return slots.map((slot) => {
    let sourceName = slot.obsName;
    let aliased = false;

    if (slot.id === "CAM_01" && existing.has(legacyPrimary)) {
      sourceName = legacyPrimary;
      aliased = true;
    }

    return {
      cameraId: slot.id,
      role: slot.role,
      label: slot.label,
      sourceName,
      obsName: slot.obsName,
      aliased,
      useForMatte: slot.useForMatte,
      sceneItemEnabled: resolveDefaultSceneItemEnabled(slot, aliased),
      transform: resolveCameraTransform(slot, aliased),
      inputKind: resolveInputKindEnv(slot.id, options),
      ndiSourceName:
        options.ndiNames?.[slot.id] || resolveNdiSourceEnv(slot.id, options) || null
    };
  });
}

function resolveInputKindEnv(cameraId, options = {}) {
  const envKey = `MIA_${cameraId}_KIND`;
  const fromEnv = process.env[envKey] || options.inputKinds?.[cameraId];
  if (fromEnv) return String(fromEnv);
  return cameraId === "CAM_01" ? "dshow_input" : "dshow_input";
}

function resolveNdiSourceEnv(cameraId, options = {}) {
  const envKey = `MIA_${cameraId}_NDI_NAME`;
  return process.env[envKey] || options.ndiNames?.[cameraId] || "";
}

function buildDshowSettings(deviceName = "", resolution = "1280x720") {
  const device = String(deviceName || "").replace(/:$/, "");
  const deviceId = device ? `${device}:` : "";
  return {
    video_device_id: deviceId,
    last_video_device_id: deviceId,
    resolution,
    res_type: 1,
    video_format: 400,
    flip_v: false
  };
}

function buildNdiSettings(sourceName = "") {
  return {
    ndi_source_name: String(sourceName || ""),
    ndi_filter: ""
  };
}

function buildInputSettingsForPlan(plan, options = {}) {
  const resolution = options.resolution || "1280x720";
  if (/ndi/i.test(plan.inputKind)) {
    return buildNdiSettings(plan.ndiSourceName || plan.sourceName);
  }
  return buildDshowSettings(options.primaryDevice || "", resolution);
}

function applyNdiMappingToPlans(plans = [], ndiMapping = []) {
  const byCamera = new Map((ndiMapping || []).map((row) => [row.cameraId, row]));
  return plans.map((plan) => {
    const ndi = byCamera.get(plan.cameraId);
    if (!ndi?.mapped || !ndi.ndiSourceName) return plan;
    return {
      ...plan,
      inputKind: "ndi_source",
      ndiSourceName: ndi.ndiSourceName
    };
  });
}

module.exports = {
  IMMERSIVE_OVERLAY,
  MATTING_STAGE_TRANSFORM,
  PRIMARY_CAMERA_TRANSFORM,
  resolvePrimaryLegacyName,
  resolveCameraTransform,
  buildCameraEnsurePlans,
  applyNdiMappingToPlans,
  buildInputSettingsForPlan,
  buildDshowSettings,
  buildNdiSettings
};
