"use strict";

/**
 * Virtuální záběry (shot presets) pro export / multi-angle Animation Bank.
 * C1–C6 = framing na stejném dokumentu, ne fyzické kamery streamera.
 */

const CAMERA_PRESETS = Object.freeze([
  {
    id: "C1",
    label: "Wide",
    description: "Celá postava + scéna",
    panX: 0,
    panY: 0,
    zoom: 0.85,
    rotation: 0
  },
  {
    id: "C2",
    label: "Medium",
    description: "Pas nahoru",
    panX: 0,
    panY: 24,
    zoom: 1.05,
    rotation: 0
  },
  {
    id: "C3",
    label: "Close",
    description: "Obličej / emoce / lip sync",
    panX: 0,
    panY: 48,
    zoom: 1.35,
    rotation: 0
  },
  {
    id: "C4",
    label: "Detail",
    description: "Ruce / gift zona",
    panX: -32,
    panY: 56,
    zoom: 1.5,
    rotation: -4
  },
  {
    id: "C5",
    label: "Hero",
    description: "Dramatický úhel",
    panX: 16,
    panY: 32,
    zoom: 1.2,
    rotation: 8
  },
  {
    id: "C6",
    label: "Profile",
    description: "Bok / reakce",
    panX: 40,
    panY: 28,
    zoom: 1.15,
    rotation: -12
  }
]);

function listCameraPresets() {
  return CAMERA_PRESETS.map((row) => ({ ...row }));
}

function getCameraPreset(id = "C1") {
  const key = String(id || "C1").toUpperCase();
  return CAMERA_PRESETS.find((row) => row.id === key) || CAMERA_PRESETS[0];
}

function ensureCameraRig(motion) {
  if (!motion) return null;
  if (!motion.cameraRig) {
    motion.cameraRig = {
      activePresetId: "C1",
      presets: listCameraPresets()
    };
  }
  return motion.cameraRig;
}

function setActiveCameraPreset(timeline, presetId = "C1") {
  const motion = timeline?.motion;
  if (!motion) return { ok: false, error: "no_timeline" };
  const preset = getCameraPreset(presetId);
  if (!preset) return { ok: false, error: "unknown_preset" };
  const rig = ensureCameraRig(motion);
  rig.activePresetId = preset.id;
  return { ok: true, presetId: preset.id, preset: { ...preset } };
}

function sampleCameraPreset(motion, presetId) {
  if (!motion?.cameraRig) {
    return { panX: 0, panY: 0, zoom: 1, rotation: 0, presetId: null, label: null };
  }
  const id = presetId || motion.cameraRig.activePresetId || "C1";
  const preset = getCameraPreset(id);
  return {
    panX: preset.panX,
    panY: preset.panY,
    zoom: preset.zoom,
    rotation: preset.rotation,
    presetId: preset.id,
    label: preset.label
  };
}

function mergeCameraWithPreset(baseCamera = {}, presetSample = {}) {
  return {
    panX: (Number(baseCamera.panX) || 0) + (Number(presetSample.panX) || 0),
    panY: (Number(baseCamera.panY) || 0) + (Number(presetSample.panY) || 0),
    zoom: (Number(baseCamera.zoom) || 1) * (Number(presetSample.zoom) || 1),
    rotation: (Number(baseCamera.rotation) || 0) + (Number(presetSample.rotation) || 0),
    presetId: presetSample.presetId || null
  };
}

const TIER_CAMERA = Object.freeze({
  T0: "C2",
  T1: "C1",
  T2: "C2",
  T3: "C3",
  T4: "C4",
  T5: "C5",
  T6: "C5"
});

const EMOTION_CAMERA = Object.freeze({
  idle: "C2",
  happy: "C2",
  sad: "C3",
  dance: "C1",
  gift: "C4",
  wave: "C2",
  think: "C3",
  duel: "C5",
  combo: "C5"
});

function resolveCameraForContext(opts = {}) {
  if (opts.cameraId) return String(opts.cameraId).toUpperCase();
  const tier = String(opts.tier || "").toUpperCase();
  if (tier && TIER_CAMERA[tier]) return TIER_CAMERA[tier];
  const emotion = String(opts.emotion || opts.mood || "").toLowerCase();
  if (emotion && EMOTION_CAMERA[emotion]) return EMOTION_CAMERA[emotion];
  return "C2";
}

function clipIdForCamera(baseClipId, cameraId = "C1") {
  const base = String(baseClipId || "custom/clip_001")
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");
  const cam = String(cameraId || "C1").toLowerCase();
  if (base.toLowerCase().endsWith(`/${cam}`) || base.toLowerCase().endsWith(`_${cam}`)) {
    return base;
  }
  return `${base}/${cam}`;
}

module.exports = {
  CAMERA_PRESETS,
  listCameraPresets,
  getCameraPreset,
  ensureCameraRig,
  setActiveCameraPreset,
  sampleCameraPreset,
  mergeCameraWithPreset,
  TIER_CAMERA,
  EMOTION_CAMERA,
  resolveCameraForContext,
  clipIdForCamera
};
