"use strict";

/**
 * 6-slot streamer camera rig — fyzické/virtuální kamery pro matting + depth.
 * CAM_01 = front primary, CAM_06 = wide establishing.
 */

const CAMERA_SLOTS = Object.freeze([
  {
    id: "CAM_01",
    role: "front",
    label: "Front",
    obsName: "MIA_CAM_01_FRONT",
    priority: 1,
    fov: "medium",
    useForMatte: true
  },
  {
    id: "CAM_02",
    role: "side_left",
    label: "Side L",
    obsName: "MIA_CAM_02_SIDE_L",
    priority: 3,
    fov: "medium",
    useForMatte: true
  },
  {
    id: "CAM_03",
    role: "side_right",
    label: "Side R",
    obsName: "MIA_CAM_03_SIDE_R",
    priority: 4,
    fov: "medium",
    useForMatte: true
  },
  {
    id: "CAM_04",
    role: "top",
    label: "Top",
    obsName: "MIA_CAM_04_TOP",
    priority: 5,
    fov: "wide",
    useForMatte: false
  },
  {
    id: "CAM_05",
    role: "detail",
    label: "Hands",
    obsName: "MIA_CAM_05_DETAIL",
    priority: 2,
    fov: "close",
    useForMatte: true
  },
  {
    id: "CAM_06",
    role: "wide",
    label: "Wide",
    obsName: "MIA_CAM_06_WIDE",
    priority: 6,
    fov: "wide",
    useForMatte: true
  }
]);

const LEGACY_ALIASES = Object.freeze({
  NOTEBOOK_CAMERA: "CAM_01",
  MIA_WEBCAM: "CAM_01",
  "Video Capture Device": "CAM_01"
});

function listCameraSlots() {
  return CAMERA_SLOTS.map((row) => ({ ...row }));
}

function getCameraSlot(id = "") {
  const raw = String(id || "").trim();
  const alias = LEGACY_ALIASES[raw] || raw.toUpperCase();
  return CAMERA_SLOTS.find((row) => row.id === alias || row.obsName === raw) || null;
}

function resolveCameraId(input = "") {
  const slot = getCameraSlot(input);
  if (slot) return slot.id;
  const upper = String(input || "").toUpperCase();
  if (/^CAM_0[1-6]$/.test(upper)) return upper;
  return "CAM_01";
}

function selectPrimaryMatteCamera(activeCameras = []) {
  const usable = CAMERA_SLOTS.filter((slot) => slot.useForMatte);
  const activeSet = new Set(activeCameras.map((id) => resolveCameraId(id)));
  for (const slot of usable.sort((a, b) => a.priority - b.priority)) {
    if (activeSet.has(slot.id)) return slot;
  }
  return usable[0] || CAMERA_SLOTS[0];
}

module.exports = {
  CAMERA_SLOTS,
  LEGACY_ALIASES,
  listCameraSlots,
  getCameraSlot,
  resolveCameraId,
  selectPrimaryMatteCamera
};
