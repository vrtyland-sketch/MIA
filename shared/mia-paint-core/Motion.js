"use strict";

const boneRig = require("./boneRig");
const lipSync = require("./LipSync");
const cameraPresets = require("./cameraPresets");

let rigSeq = 0;

function nextRigId() {
  rigSeq += 1;
  return `rig_${rigSeq}_${Date.now().toString(36)}`;
}

const DEFAULT_TRANSFORM = Object.freeze({
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  opacity: 1
});

const DEFAULT_CAMERA = Object.freeze({
  panX: 0,
  panY: 0,
  zoom: 1,
  rotation: 0
});

function ensureMotion(timeline) {
  if (!timeline) return null;
  if (!timeline.motion) {
    timeline.motion = {
      durationMs: 2000,
      playheadMs: 0,
      layerTracks: {},
      cameraTrack: { keyframes: [] },
      rigs: []
    };
  }
  return timeline.motion;
}

function normalizeEasing(value) {
  const key = String(value || "linear").toLowerCase().replace(/_/g, "-");
  if (key === "ease" || key === "smooth" || key === "smoothstep") return "ease";
  if (key === "ease-in" || key === "in") return "ease-in";
  if (key === "ease-out" || key === "out") return "ease-out";
  if (key === "ease-in-out" || key === "in-out") return "ease-in-out";
  return "linear";
}

/** Easing curves for motion sampling (13p/13q). */
function easeSample(t, mode) {
  const x = Math.max(0, Math.min(1, Number(t) || 0));
  const m = normalizeEasing(mode);
  if (m === "ease" || m === "ease-in-out") return x * x * (3 - 2 * x);
  if (m === "ease-in") return x * x;
  if (m === "ease-out") {
    const y = 1 - x;
    return 1 - y * y;
  }
  return x;
}

function createTransformKeyframe(timeMs, props = {}) {
  return {
    timeMs: Math.max(0, Number(timeMs) || 0),
    x: Number(props.x) || 0,
    y: Number(props.y) || 0,
    scaleX: props.scaleX == null ? 1 : Number(props.scaleX),
    scaleY: props.scaleY == null ? 1 : Number(props.scaleY),
    rotation: Number(props.rotation) || 0,
    opacity: props.opacity == null ? 1 : Number(props.opacity),
    easing: normalizeEasing(props.easing)
  };
}

function createCameraKeyframe(timeMs, props = {}) {
  return {
    timeMs: Math.max(0, Number(timeMs) || 0),
    panX: Number(props.panX) || 0,
    panY: Number(props.panY) || 0,
    zoom: props.zoom == null ? 1 : Number(props.zoom),
    rotation: Number(props.rotation) || 0,
    easing: normalizeEasing(props.easing)
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function sampleKeyframes(keyframes, timeMs, defaults = DEFAULT_TRANSFORM) {
  if (!Array.isArray(keyframes) || !keyframes.length) {
    return { ...defaults };
  }
  const sorted = [...keyframes].sort((a, b) => a.timeMs - b.timeMs);
  if (timeMs <= sorted[0].timeMs) return { ...defaults, ...sorted[0] };
  if (timeMs >= sorted[sorted.length - 1].timeMs) {
    return { ...defaults, ...sorted[sorted.length - 1] };
  }
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (timeMs >= a.timeMs && timeMs <= b.timeMs) {
      const span = b.timeMs - a.timeMs || 1;
      const t = (timeMs - a.timeMs) / span;
      const easeMode = normalizeEasing(a.easing || b.easing);
      const te = easeSample(t, easeMode);
      const out = { ...defaults };
      for (const key of Object.keys(defaults)) {
        if (a[key] != null && b[key] != null) {
          out[key] = lerp(Number(a[key]), Number(b[key]), te);
        } else if (a[key] != null) {
          out[key] = a[key];
        }
      }
      for (const key of Object.keys(a)) {
        if (key === "easing" || key === "timeMs") continue;
        if (!(key in defaults) && a[key] != null && b[key] != null && typeof a[key] === "number") {
          out[key] = lerp(Number(a[key]), Number(b[key]), te);
        }
      }
      out.easing = easeMode;
      return out;
    }
  }
  return { ...defaults, ...sorted[0] };
}

function ensureLayerTrack(motion, layerId) {
  if (!motion.layerTracks[layerId]) {
    motion.layerTracks[layerId] = { keyframes: [] };
  }
  return motion.layerTracks[layerId];
}

function addLayerKeyframe(timeline, layerId, props = {}) {
  const motion = ensureMotion(timeline);
  if (!motion || !layerId) return { ok: false, error: "invalid_layer" };
  const track = ensureLayerTrack(motion, layerId);
  const kf = createTransformKeyframe(props.timeMs ?? motion.playheadMs, props);
  track.keyframes.push(kf);
  track.keyframes.sort((a, b) => a.timeMs - b.timeMs);
  motion.durationMs = Math.max(motion.durationMs, kf.timeMs + 1);
  return { ok: true, layerId, keyframe: kf, count: track.keyframes.length };
}

function addCameraKeyframe(timeline, props = {}) {
  const motion = ensureMotion(timeline);
  if (!motion) return { ok: false, error: "no_timeline" };
  const kf = createCameraKeyframe(props.timeMs ?? motion.playheadMs, props);
  motion.cameraTrack.keyframes.push(kf);
  motion.cameraTrack.keyframes.sort((a, b) => a.timeMs - b.timeMs);
  motion.durationMs = Math.max(motion.durationMs, kf.timeMs + 1);
  return { ok: true, keyframe: kf, count: motion.cameraTrack.keyframes.length };
}

function createBonesRig(timeline, opts = {}) {
  const motion = ensureMotion(timeline);
  if (!motion) return { ok: false, error: "no_timeline" };
  const rig = {
    id: opts.id || nextRigId(),
    layerId: opts.layerId || null,
    pivotX: Number(opts.pivotX) || 0,
    pivotY: Number(opts.pivotY) || 0,
    deformScale: opts.deformScale == null ? 0.45 : Number(opts.deformScale),
    bones: [
      { id: "root", parentId: null, length: Number(opts.rootLength) || 48, angle: 0 },
      { id: "mid", parentId: "root", length: Number(opts.midLength) || 40, angle: 0 },
      { id: "tip", parentId: "mid", length: Number(opts.tipLength) || 32, angle: 0 }
    ],
    boneKeyframes: {},
    ikTarget: null
  };
  motion.rigs.push(rig);
  return { ok: true, rig };
}

function computeBoneChainForRig(rig, timeMs = 0) {
  return boneRig.computeBoneChainWorld(rig, sampleBoneAngle, timeMs);
}

function applyIkToRig(timeline, rigId, targetX, targetY, timeMs) {
  const motion = ensureMotion(timeline);
  const rig = motion?.rigs?.find((r) => r.id === rigId);
  if (!rig) return { ok: false, error: "rig_not_found" };
  const t = Math.max(0, Number(timeMs ?? motion.playheadMs) || 0);
  const solved = boneRig.solveRigIK(rig, targetX, targetY, t, sampleBoneAngle);
  if (!solved.ok) return solved;
  for (const [boneId, angle] of Object.entries(solved.angles)) {
    addBoneKeyframe(timeline, rigId, boneId, t, angle);
  }
  rig.ikTarget = { x: Number(targetX) || 0, y: Number(targetY) || 0, timeMs: t };
  motion.durationMs = Math.max(motion.durationMs, t + 1);
  return { ok: true, rigId, angles: solved.angles, ikTarget: rig.ikTarget, chain: solved.chain };
}

function addBoneKeyframe(timeline, rigId, boneId, timeMs, angle) {
  const motion = ensureMotion(timeline);
  const rig = motion?.rigs?.find((r) => r.id === rigId);
  if (!rig) return { ok: false, error: "rig_not_found" };
  if (!rig.boneKeyframes[boneId]) rig.boneKeyframes[boneId] = [];
  const kf = { timeMs: Math.max(0, Number(timeMs) || 0), angle: Number(angle) || 0 };
  rig.boneKeyframes[boneId].push(kf);
  rig.boneKeyframes[boneId].sort((a, b) => a.timeMs - b.timeMs);
  return { ok: true, rigId, boneId, keyframe: kf };
}

function sampleBoneAngle(rig, boneId, timeMs) {
  const bone = rig.bones.find((b) => b.id === boneId);
  const kfs = (rig.boneKeyframes[boneId] || []).map((k) => ({
    timeMs: k.timeMs,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: k.angle,
    opacity: 1
  }));
  const sampled = sampleKeyframes(kfs, timeMs, { ...DEFAULT_TRANSFORM, rotation: bone?.angle || 0 });
  return sampled.rotation;
}

function computeBoneWorldAngles(rig, timeMs) {
  const world = {};
  for (const bone of rig.bones) {
    const local = sampleBoneAngle(rig, bone.id, timeMs);
    if (bone.parentId && world[bone.parentId] != null) {
      world[bone.id] = world[bone.parentId] + local;
    } else {
      world[bone.id] = local;
    }
  }
  return world;
}

function sampleBoneRig(rig, timeMs) {
  if (!rig) return { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, boneAngles: {} };
  const world = computeBoneWorldAngles(rig, timeMs);
  const chain = boneRig.computeBoneChainWorld(rig, sampleBoneAngle, timeMs);
  const restChain = boneRig.computeBoneChainWorld(
    rig,
    (_r, boneId) => {
      const bone = rig.bones.find((b) => b.id === boneId);
      return Number(bone?.angle) || 0;
    },
    0
  );
  const tip = chain[chain.length - 1];
  const tipRest = restChain[restChain.length - 1];
  const mid = chain[1] || tip;
  // Phase 13u — tip delta from rest pose drives layer transform (lite mesh substitute)
  const deform = Math.max(0, Math.min(1, Number(rig.deformScale ?? 0.45)));
  const dx = tip && tipRest ? (tip.endX - tipRest.endX) * deform : 0;
  const dy = tip && tipRest ? (tip.endY - tipRest.endY) * deform : 0;
  const dRot = tip && tipRest ? (tip.worldAngle - tipRest.worldAngle) * deform : 0;
  const midBend = Math.abs(Number(mid?.localAngle) || 0);
  const tipBend = tip && tipRest ? tip.worldAngle - tipRest.worldAngle : 0;
  // Phase 13v — soft skew mesh substitute (canvas/WebGL affine)
  const skewX = (tipBend * 0.004 + midBend * 0.006) * deform;
  const skewY = midBend * 0.003 * deform;
  return {
    rotation: dRot,
    x: dx,
    y: dy,
    scaleX: 1 + midBend * 0.0015 * deform,
    scaleY: 1 - midBend * 0.001 * deform,
    skewX,
    skewY,
    boneAngles: world,
    chain
  };
}

function listMotionTracks(timeline, documentLayers = []) {
  const motion = ensureMotion(timeline);
  if (!motion) return [];
  const tracks = [];
  for (const layer of documentLayers) {
    const track = motion.layerTracks[layer.id];
    tracks.push({
      kind: "layer",
      id: layer.id,
      label: layer.name || layer.id,
      keyframes: (track?.keyframes || []).map((kf, index) => ({ ...kf, index, trackKind: "layer", trackId: layer.id }))
    });
  }
  tracks.push({
    kind: "camera",
    id: "camera",
    label: "Kamera",
    keyframes: (motion.cameraTrack?.keyframes || []).map((kf, index) => ({
      ...kf,
      index,
      trackKind: "camera",
      trackId: "camera"
    }))
  });
  const lip = motion.lipSync;
  if (lip?.keyframes?.length) {
    tracks.push({
      kind: "lip",
      id: "lip_sync",
      layerId: lip.layerId,
      label: lip.layerId ? `Viseme (${lip.layerId.slice(0, 8)})` : "Viseme",
      keyframes: lip.keyframes.map((kf, index) => ({
        ...kf,
        index,
        trackKind: "lip",
        trackId: "lip_sync"
      }))
    });
  }
  for (const rig of motion.rigs || []) {
    for (const bone of rig.bones) {
      const keyframes = (rig.boneKeyframes[bone.id] || []).map((kf, index) => ({
        ...kf,
        angle: kf.angle,
        index,
        trackKind: "bone",
        trackId: rig.id,
        boneId: bone.id,
        rigLayerId: rig.layerId
      }));
      tracks.push({
        kind: "bone",
        id: `${rig.id}:${bone.id}`,
        rigId: rig.id,
        boneId: bone.id,
        layerId: rig.layerId,
        label: `Bone ${bone.id}`,
        keyframes
      });
    }
  }
  return tracks;
}

function findKeyframeIndex(keyframes, timeMs, toleranceMs = 8) {
  if (!Array.isArray(keyframes)) return -1;
  const t = toNumber(timeMs, 0);
  let best = -1;
  let bestDist = Infinity;
  keyframes.forEach((kf, index) => {
    const dist = Math.abs(toNumber(kf.timeMs, 0) - t);
    if (dist <= toleranceMs && dist < bestDist) {
      best = index;
      bestDist = dist;
    }
  });
  return best;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function deleteLayerKeyframe(timeline, layerId, timeMs) {
  const motion = ensureMotion(timeline);
  const track = motion?.layerTracks?.[layerId];
  if (!track) return { ok: false, error: "track_not_found" };
  const idx = findKeyframeIndex(track.keyframes, timeMs);
  if (idx < 0) return { ok: false, error: "keyframe_not_found" };
  const removed = track.keyframes.splice(idx, 1)[0];
  return { ok: true, removed, count: track.keyframes.length };
}

function updateLayerKeyframe(timeline, layerId, timeMs, props = {}) {
  const motion = ensureMotion(timeline);
  const track = motion?.layerTracks?.[layerId];
  if (!track) return { ok: false, error: "track_not_found" };
  const idx = findKeyframeIndex(track.keyframes, timeMs);
  if (idx < 0) return { ok: false, error: "keyframe_not_found" };
  const next = { ...props };
  if (next.easing != null) next.easing = normalizeEasing(next.easing);
  track.keyframes[idx] = {
    ...track.keyframes[idx],
    ...next,
    timeMs: next.timeMs ?? track.keyframes[idx].timeMs
  };
  track.keyframes.sort((a, b) => a.timeMs - b.timeMs);
  return { ok: true, keyframe: track.keyframes[idx] };
}

function deleteCameraKeyframe(timeline, timeMs) {
  const motion = ensureMotion(timeline);
  const track = motion?.cameraTrack;
  if (!track) return { ok: false, error: "no_camera_track" };
  const idx = findKeyframeIndex(track.keyframes, timeMs);
  if (idx < 0) return { ok: false, error: "keyframe_not_found" };
  const removed = track.keyframes.splice(idx, 1)[0];
  return { ok: true, removed, count: track.keyframes.length };
}

function updateCameraKeyframe(timeline, timeMs, props = {}) {
  const motion = ensureMotion(timeline);
  const track = motion?.cameraTrack;
  if (!track) return { ok: false, error: "no_camera_track" };
  const idx = findKeyframeIndex(track.keyframes, timeMs);
  if (idx < 0) return { ok: false, error: "keyframe_not_found" };
  track.keyframes[idx] = { ...track.keyframes[idx], ...props, timeMs: props.timeMs ?? track.keyframes[idx].timeMs };
  track.keyframes.sort((a, b) => a.timeMs - b.timeMs);
  return { ok: true, keyframe: track.keyframes[idx] };
}

function deleteBoneKeyframe(timeline, rigId, boneId, timeMs) {
  const motion = ensureMotion(timeline);
  const rig = motion?.rigs?.find((r) => r.id === rigId);
  if (!rig) return { ok: false, error: "rig_not_found" };
  const list = rig.boneKeyframes[boneId];
  if (!list) return { ok: false, error: "bone_track_not_found" };
  const idx = findKeyframeIndex(list, timeMs);
  if (idx < 0) return { ok: false, error: "keyframe_not_found" };
  const removed = list.splice(idx, 1)[0];
  return { ok: true, removed, count: list.length };
}

function updateBoneKeyframe(timeline, rigId, boneId, timeMs, props = {}) {
  const motion = ensureMotion(timeline);
  const rig = motion?.rigs?.find((r) => r.id === rigId);
  if (!rig) return { ok: false, error: "rig_not_found" };
  const list = rig.boneKeyframes[boneId];
  if (!list) return { ok: false, error: "bone_track_not_found" };
  const idx = findKeyframeIndex(list, timeMs);
  if (idx < 0) return { ok: false, error: "keyframe_not_found" };
  list[idx] = {
    ...list[idx],
    timeMs: props.timeMs ?? list[idx].timeMs,
    angle: props.angle ?? list[idx].angle
  };
  list.sort((a, b) => a.timeMs - b.timeMs);
  return { ok: true, keyframe: list[idx] };
}

function motionAddBoneKeyframe(timeline, rigId, boneId, props = {}) {
  const motion = ensureMotion(timeline);
  const rig = motion?.rigs?.find((r) => r.id === rigId);
  if (!rig) return { ok: false, error: "rig_not_found" };
  const timeMs = props.timeMs ?? motion.playheadMs ?? 0;
  const angle = props.angle ?? sampleBoneAngle(rig, boneId, timeMs);
  return addBoneKeyframe(timeline, rigId, boneId, timeMs, angle);
}

function sampleMotion(timeline, timeMs) {
  const motion = ensureMotion(timeline);
  if (!motion) {
    return { layers: {}, camera: { ...DEFAULT_CAMERA }, rigs: [] };
  }
  const t = Math.max(0, Number(timeMs) || 0);
  const layers = {};
  for (const [layerId, track] of Object.entries(motion.layerTracks)) {
    layers[layerId] = sampleKeyframes(track.keyframes, t, DEFAULT_TRANSFORM);
  }
  for (const rig of motion.rigs) {
    if (!rig.layerId) continue;
    const bone = sampleBoneRig(rig, t);
    const base = layers[rig.layerId] || { ...DEFAULT_TRANSFORM };
    layers[rig.layerId] = {
      ...base,
      x: base.x + bone.x,
      y: base.y + bone.y,
      rotation: base.rotation + bone.rotation,
      scaleX: (base.scaleX == null ? 1 : base.scaleX) * (bone.scaleX == null ? 1 : bone.scaleX),
      scaleY: (base.scaleY == null ? 1 : base.scaleY) * (bone.scaleY == null ? 1 : bone.scaleY),
      skewX: (base.skewX || 0) + (bone.skewX || 0),
      skewY: (base.skewY || 0) + (bone.skewY || 0)
    };
  }
  const lipSample = lipSync.sampleLipSync(timeline, t);
  if (lipSample.layerId) {
    if (!layers[lipSample.layerId]) {
      layers[lipSample.layerId] = { ...DEFAULT_TRANSFORM };
    }
    const offset = lipSync.visemeToLayerOffset(lipSample);
    const base = layers[lipSample.layerId];
    layers[lipSample.layerId] = {
      ...base,
      y: base.y + offset.y,
      scaleX: base.scaleX * offset.scaleX,
      scaleY: base.scaleY * offset.scaleY
    };
  }
  const baseCamera = sampleKeyframes(motion.cameraTrack.keyframes, t, DEFAULT_CAMERA);
  const presetSample = cameraPresets.sampleCameraPreset(motion);
  const camera = motion.cameraRig
    ? cameraPresets.mergeCameraWithPreset(baseCamera, presetSample)
    : baseCamera;
  return {
    layers,
    camera,
    lipSync: lipSample,
    cameraPresetId: presetSample.presetId,
    playheadMs: t,
    durationMs: motion.durationMs
  };
}

function setPlayhead(timeline, timeMs) {
  const motion = ensureMotion(timeline);
  if (!motion) return { ok: false };
  motion.playheadMs = Math.max(0, Math.min(motion.durationMs, Number(timeMs) || 0));
  return { ok: true, playheadMs: motion.playheadMs };
}

module.exports = {
  DEFAULT_TRANSFORM,
  DEFAULT_CAMERA,
  ensureMotion,
  normalizeEasing,
  easeSample,
  createTransformKeyframe,
  createCameraKeyframe,
  addLayerKeyframe,
  addCameraKeyframe,
  createBonesRig,
  addBoneKeyframe,
  motionAddBoneKeyframe,
  sampleKeyframes,
  sampleBoneAngle,
  computeBoneWorldAngles,
  sampleBoneRig,
  listMotionTracks,
  findKeyframeIndex,
  deleteLayerKeyframe,
  updateLayerKeyframe,
  deleteCameraKeyframe,
  updateCameraKeyframe,
  deleteBoneKeyframe,
  updateBoneKeyframe,
  sampleMotion,
  setPlayhead,
  computeBoneChainForRig,
  applyIkToRig,
  ...lipSync,
  ...cameraPresets
};
