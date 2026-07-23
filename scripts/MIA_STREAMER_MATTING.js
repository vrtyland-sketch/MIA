"use strict";

const {
  listCameraSlots,
  resolveCameraId,
  selectPrimaryMatteCamera,
  getCameraSlot
} = require("../shared/mia-scene-engine/streamerCameraRig");
const {
  processFrameMatting,
  bufferToDataUrl
} = require("../shared/mia-scene-engine/mattingPipeline");

const STALE_MS = 2500;
const MAX_CACHE_BYTES = 2_500_000;

const state = {
  cameras: {},
  composite: null,
  updatedAt: 0
};

function nowMs() {
  return Date.now();
}

function purgeStale() {
  const now = nowMs();
  for (const [id, row] of Object.entries(state.cameras)) {
    if (now - (row.updatedAt || 0) > STALE_MS * 4) {
      delete state.cameras[id];
    }
  }
}

function activeCameraIds() {
  const now = nowMs();
  return Object.entries(state.cameras)
    .filter(([, row]) => now - (row.updatedAt || 0) <= STALE_MS)
    .map(([id]) => id);
}

async function ingestCameraFrame(input = {}) {
  const cameraId = resolveCameraId(input.cameraId || input.obsName || input.sourceName);
  const slot = getCameraSlot(cameraId);
  const frameBase64 = input.frameBase64 || input.pngBase64 || input.dataBase64;
  if (!frameBase64) return { ok: false, error: "missing_frame" };

  const autoMatte = input.autoMatte !== false;
  const mode = input.mode || "auto";
  let matteResult = null;

  if (autoMatte) {
    matteResult = await processFrameMatting(frameBase64, {
      mode,
      tolerance: input.tolerance,
      creatureParams: input.creatureParams
    });
    if (!matteResult.ok) return matteResult;
  }

  const matteBase64 = matteResult?.buffer ? matteResult.buffer.toString("base64") : null;
  if (matteBase64 && matteBase64.length > MAX_CACHE_BYTES) {
    return { ok: false, error: "frame_too_large" };
  }

  state.cameras[cameraId] = {
    cameraId,
    role: slot?.role || "unknown",
    label: slot?.label || cameraId,
    width: matteResult?.width || input.width || 0,
    height: matteResult?.height || input.height || 0,
    frameBase64: String(frameBase64).replace(/^data:image\/\w+;base64,/, "").slice(0, MAX_CACHE_BYTES),
    matteBase64,
    mode: matteResult?.mode || mode,
    updatedAt: nowMs()
  };

  await rebuildComposite(input.creatureParams ? { creatureParams: input.creatureParams } : {});
  purgeStale();

  return {
    ok: true,
    cameraId,
    role: slot?.role,
    width: state.cameras[cameraId].width,
    height: state.cameras[cameraId].height,
    matteReady: !!matteBase64,
    activeCameras: activeCameraIds()
  };
}

async function rebuildComposite(opts = {}) {
  const active = activeCameraIds();
  const primary = selectPrimaryMatteCamera(active);
  const row = state.cameras[primary.id];
  if (!row?.matteBase64) {
    state.composite = null;
    return { ok: false, error: "no_matte_ready" };
  }

  let buffer = Buffer.from(row.matteBase64, "base64");
  if (opts.creatureParams) {
    const tinted = await processFrameMatting(buffer, {
      mode: "corner",
      creatureParams: opts.creatureParams
    });
    if (tinted.ok) buffer = tinted.buffer;
  }

  state.composite = {
    cameraId: primary.id,
    role: primary.role,
    label: primary.label,
    width: row.width,
    height: row.height,
    matteDataUrl: bufferToDataUrl(buffer),
    activeCameraCount: active.length,
    activeCameras: active,
    updatedAt: nowMs(),
    provider: "mia_matting_v1"
  };
  state.updatedAt = state.composite.updatedAt;
  return { ok: true, composite: { ...state.composite, matteDataUrl: "[data_url]" } };
}

function getMatteState() {
  purgeStale();
  const composite = state.composite;
  const now = nowMs();
  if (!composite || now - (composite.updatedAt || 0) > STALE_MS) {
    return {
      ok: true,
      active: false,
      stale: true,
      activeCameras: activeCameraIds(),
      slots: listCameraSlots()
    };
  }
  return {
    ok: true,
    active: true,
    stale: false,
    cameraId: composite.cameraId,
    role: composite.role,
    label: composite.label,
    width: composite.width,
    height: composite.height,
    matteDataUrl: composite.matteDataUrl,
    activeCameraCount: composite.activeCameraCount,
    activeCameras: composite.activeCameras,
    updatedAt: composite.updatedAt,
    provider: composite.provider,
    slots: listCameraSlots()
  };
}

function getCameraRigStatus() {
  purgeStale();
  const now = nowMs();
  return {
    ok: true,
    slots: listCameraSlots().map((slot) => {
      const row = state.cameras[slot.id];
      const fresh = row && now - (row.updatedAt || 0) <= STALE_MS;
      return {
        ...slot,
        live: !!fresh,
        updatedAt: row?.updatedAt || null,
        hasMatte: !!row?.matteBase64
      };
    }),
    activeCameras: activeCameraIds(),
    compositeReady: !!(state.composite && now - (state.composite.updatedAt || 0) <= STALE_MS)
  };
}

function clearMatteState() {
  state.cameras = {};
  state.composite = null;
  state.updatedAt = 0;
  return { ok: true, cleared: true };
}

module.exports = {
  ingestCameraFrame,
  rebuildComposite,
  getMatteState,
  getCameraRigStatus,
  clearMatteState,
  activeCameraIds
};
