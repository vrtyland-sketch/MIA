"use strict";

const paintCore = require("../mia-paint-core");
const {
  buildMotionKeyframes,
  CHARACTER_MOTION_PRESETS,
  normalizeMotionStyle
} = require("../mia-animation-engine/ProceduralMotion");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function motionStylePresets() {
  return CHARACTER_MOTION_PRESETS.slice();
}

function generateAiMotionKeyframes(timeline, layerId, opts = {}) {
  if (!timeline?.motion || !layerId) {
    return { ok: false, error: "invalid_timeline_or_layer" };
  }

  const style = normalizeMotionStyle(opts.style || "bounce");
  const intensity = Math.max(0, Math.min(1, Number(opts.intensity ?? 0.6)));
  const durationMs = Math.max(200, Number(opts.durationMs) || timeline.motion.durationMs || 1200);
  const startMs = Math.max(0, Number(opts.startMs ?? timeline.motion.playheadMs ?? 0));
  const alsoCamera = opts.camera === true || style === "zoom_pulse";

  const procedural = buildMotionKeyframes({ style, intensity, durationMs });
  const layerKeyframes = [];
  const cameraKeyframes = [];

  for (const kf of procedural.keyframes) {
    const timeMs = Math.round(startMs + kf.t * durationMs);
    layerKeyframes.push({
      timeMs,
      x: 0,
      y: kf.translateY,
      scaleX: kf.scaleX,
      scaleY: kf.scaleY,
      rotation: kf.rotate,
      opacity: 1,
      easing: "ease"
    });
    if (alsoCamera && style === "zoom_pulse") {
      cameraKeyframes.push({
        timeMs,
        panX: 0,
        panY: 0,
        zoom: 1 + (kf.scaleX - 1) * 0.35,
        rotation: 0
      });
    }
  }

  for (const kf of layerKeyframes) {
    paintCore.addLayerKeyframe(timeline, layerId, kf);
  }
  for (const kf of cameraKeyframes) {
    paintCore.addCameraKeyframe(timeline, kf);
  }

  timeline.motion.durationMs = Math.max(timeline.motion.durationMs, startMs + durationMs);

  return {
    ok: true,
    style: procedural.style,
    character: procedural.character === true,
    intensity,
    durationMs,
    startMs,
    layerId,
    keyframeCount: layerKeyframes.length,
    cameraKeyframeCount: cameraKeyframes.length,
    provider: "procedural_motion_v2",
    phase: "13o"
  };
}

function generateAiMotionFromSpeech(timeline, layerId, text = "", opts = {}) {
  const lipKeyframes = paintCore.buildVisemeTrackFromText(
    text,
    Number(opts.startMs) || timeline.motion?.playheadMs || 0,
    Number(opts.msPerChar) || 85
  );
  paintCore.applyVisemeTrack(timeline, lipKeyframes, layerId);
  return {
    ok: true,
    visemeCount: lipKeyframes.length,
    layerId,
    provider: "viseme_track_v1"
  };
}

module.exports = {
  motionStylePresets,
  generateAiMotionKeyframes,
  generateAiMotionFromSpeech
};
