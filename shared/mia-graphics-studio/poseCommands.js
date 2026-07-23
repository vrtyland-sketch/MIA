"use strict";

const paintCore = require("../mia-paint-core");
const bodyPartsCatalog = require("./bodyPartsCatalog");

/** Kanonické pózy sladěné s MIA_FACE / body-part overlay. */
const POSE_PRESETS = {
  idle: { rotation: 0, scaleX: 1, scaleY: 1, y: 0, x: 0 },
  happy: { rotation: -5, scaleX: 1.03, scaleY: 1.03, y: -5, x: 0 },
  wave: { rotation: -8, scaleX: 1.04, scaleY: 1.02, y: -4, x: 6 },
  think: { rotation: 4, scaleX: 0.98, scaleY: 1.01, y: 2, x: -2 },
  combo: { rotation: -4, scaleX: 1.05, scaleY: 1.05, y: -3, x: 0 },
  gift: { rotation: -3, scaleX: 1.06, scaleY: 1.06, y: -6, x: 0 },
  duel: { rotation: 6, scaleX: 1.02, scaleY: 0.98, y: 0, x: 4 }
};

function listPosePresets() {
  return Object.keys(POSE_PRESETS).map((id) => ({
    id,
    faceAsset: bodyPartsCatalog.MIA_FACE[id] || bodyPartsCatalog.MIA_FACE.idle || null
  }));
}

function resolvePosePreset(name) {
  const key = String(name || "idle").toLowerCase();
  return POSE_PRESETS[key] ? key : "idle";
}

function applyPoseToDocument(doc, args = {}) {
  if (!doc?.timeline) return { ok: false, error: "no_timeline" };

  const layerId = args.layerId || doc.activeLayerId;
  if (!layerId) return { ok: false, error: "no_layer" };

  const poseId = resolvePosePreset(args.pose || args.preset || args.mood);
  const preset = POSE_PRESETS[poseId];
  const timeMs = Math.max(0, Number(args.timeMs ?? doc.timeline.motion?.playheadMs ?? 0));

  const result = paintCore.addLayerKeyframe(doc.timeline, layerId, {
    timeMs,
    x: args.x ?? preset.x,
    y: args.y ?? preset.y,
    scaleX: args.scaleX ?? preset.scaleX,
    scaleY: args.scaleY ?? preset.scaleY,
    rotation: args.rotation ?? preset.rotation,
    opacity: args.opacity == null ? 1 : Number(args.opacity)
  });

  if (!result.ok) return result;

  return {
    ok: true,
    api: "MIA.pose",
    module: "pose",
    phase: "12j",
    pose: poseId,
    layerId,
    timeMs,
    preset,
    provider: "procedural_pose_v1",
    ...result
  };
}

module.exports = {
  POSE_PRESETS,
  listPosePresets,
  resolvePosePreset,
  applyPoseToDocument
};
