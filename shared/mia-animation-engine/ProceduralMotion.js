"use strict";

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function buildBounceKeyframes(intensity = 0.6) {
  const i = clamp(intensity, 0, 1);
  const lift = Math.round(lerp(6, 18, i));
  const squash = lerp(0.02, 0.08, i);
  const stretch = lerp(0.03, 0.1, i);
  return [
    { t: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 },
    { t: 0.32, translateY: -lift, scaleX: 1 - squash, scaleY: 1 + stretch, rotate: -2 * i },
    { t: 0.52, translateY: -lift - 2, scaleX: 1 + squash * 0.5, scaleY: 1 - squash, rotate: 1 * i },
    { t: 0.72, translateY: Math.round(lift * 0.15), scaleX: 1 + squash, scaleY: 1 - stretch * 0.8, rotate: 0 },
    { t: 1, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 }
  ];
}

function buildPulseKeyframes(intensity = 0.5) {
  const i = clamp(intensity, 0, 1);
  const scale = lerp(1.02, 1.1, i);
  return [
    { t: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 },
    { t: 0.45, translateY: -4 * i, scaleX: scale, scaleY: scale, rotate: 0 },
    { t: 1, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 }
  ];
}

function buildShakeKeyframes(intensity = 0.5) {
  const i = clamp(intensity, 0, 1);
  const amp = lerp(3, 10, i);
  return [
    { t: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 },
    { t: 0.15, translateY: 0, scaleX: 1, scaleY: 1, rotate: -amp },
    { t: 0.3, translateY: 0, scaleX: 1, scaleY: 1, rotate: amp },
    { t: 0.45, translateY: 0, scaleX: 1, scaleY: 1, rotate: -amp * 0.7 },
    { t: 0.6, translateY: 0, scaleX: 1, scaleY: 1, rotate: amp * 0.5 },
    { t: 1, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 }
  ];
}

/** Soft hair/upper-body sway + micro eye bob (character, not transform bounce). */
function buildHairEyesKeyframes(intensity = 0.55) {
  const i = clamp(intensity, 0, 1);
  const sway = lerp(2, 7, i);
  const bob = lerp(1, 3.5, i);
  return [
    { t: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 },
    { t: 0.18, translateY: -bob * 0.4, scaleX: 1.01, scaleY: 0.99, rotate: -sway * 0.35 },
    { t: 0.36, translateY: bob * 0.2, scaleX: 0.995, scaleY: 1.01, rotate: sway * 0.55 },
    { t: 0.55, translateY: -bob, scaleX: 1.015, scaleY: 0.985, rotate: -sway * 0.25 },
    { t: 0.78, translateY: bob * 0.35, scaleX: 0.998, scaleY: 1.005, rotate: sway * 0.4 },
    { t: 1, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 }
  ];
}

/** Quick blink-like squash on Y (eyes / face layer). */
function buildBlinkKeyframes(intensity = 0.5) {
  const i = clamp(intensity, 0, 1);
  const squash = lerp(0.08, 0.22, i);
  return [
    { t: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 },
    { t: 0.12, translateY: 1 * i, scaleX: 1.02, scaleY: 1 - squash, rotate: 0 },
    { t: 0.22, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 },
    { t: 0.7, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 },
    { t: 0.82, translateY: 0.5 * i, scaleX: 1.01, scaleY: 1 - squash * 0.7, rotate: 0 },
    { t: 1, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 }
  ];
}

/** Gentle idle breath / sway. */
function buildBreathKeyframes(intensity = 0.45) {
  const i = clamp(intensity, 0, 1);
  const lift = lerp(1.5, 5, i);
  const scale = lerp(1.01, 1.04, i);
  return [
    { t: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 },
    { t: 0.5, translateY: -lift, scaleX: scale, scaleY: scale, rotate: 0.5 * i },
    { t: 1, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 }
  ];
}

/** Friendly nod gesture. */
function buildNodGestureKeyframes(intensity = 0.55) {
  const i = clamp(intensity, 0, 1);
  const dip = lerp(4, 12, i);
  const rot = lerp(3, 9, i);
  return [
    { t: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 },
    { t: 0.28, translateY: dip, scaleX: 1.01, scaleY: 0.97, rotate: rot },
    { t: 0.5, translateY: dip * 0.35, scaleX: 1, scaleY: 1, rotate: -rot * 0.35 },
    { t: 0.72, translateY: dip * 0.7, scaleX: 1.005, scaleY: 0.985, rotate: rot * 0.55 },
    { t: 1, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 }
  ];
}

/** Side sway for hands / torso. */
function buildSwayKeyframes(intensity = 0.5) {
  const i = clamp(intensity, 0, 1);
  const rot = lerp(4, 12, i);
  const xLift = lerp(1, 3, i);
  return [
    { t: 0, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 },
    { t: 0.25, translateY: -xLift, scaleX: 1, scaleY: 1, rotate: -rot },
    { t: 0.5, translateY: 0, scaleX: 1, scaleY: 1, rotate: rot * 0.15 },
    { t: 0.75, translateY: -xLift * 0.6, scaleX: 1, scaleY: 1, rotate: rot },
    { t: 1, translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 }
  ];
}

const CHARACTER_MOTION_PRESETS = [
  "bounce",
  "pulse",
  "shake",
  "hair_eyes",
  "hair_eyes_subtle",
  "blink",
  "breath",
  "nod_gesture",
  "sway",
  "zoom_pulse"
];

function normalizeMotionStyle(style) {
  const key = String(style || "bounce").toLowerCase().replace(/-/g, "_");
  if (key === "hair_eyes_subtle" || key === "hair" || key === "eyes" || key === "vlasy") {
    return "hair_eyes";
  }
  if (key === "nod" || key === "kyv") return "nod_gesture";
  if (key === "idle_breath" || key === "breathe") return "breath";
  if (key === "wave_sway" || key === "hands") return "sway";
  return key;
}

function buildMotionKeyframes(input = {}) {
  const style = normalizeMotionStyle(input.style);
  const intensity = clamp(toNumber(input.intensity, 0.6), 0, 1);
  const durationMs = Math.max(120, toNumber(input.durationMs, 800));

  let frames;
  if (style === "pulse" || style === "zoom_pulse") frames = buildPulseKeyframes(intensity);
  else if (style === "shake") frames = buildShakeKeyframes(intensity);
  else if (style === "hair_eyes") frames = buildHairEyesKeyframes(intensity);
  else if (style === "blink") frames = buildBlinkKeyframes(intensity);
  else if (style === "breath") frames = buildBreathKeyframes(intensity);
  else if (style === "nod_gesture") frames = buildNodGestureKeyframes(intensity);
  else if (style === "sway") frames = buildSwayKeyframes(intensity);
  else frames = buildBounceKeyframes(intensity);

  return {
    style,
    intensity,
    durationMs,
    easing: safeString(input.easing, "cubic-bezier(0.34, 1.3, 0.5, 1)"),
    keyframes: frames,
    character: ["hair_eyes", "blink", "breath", "nod_gesture", "sway"].includes(style)
  };
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function sampleMotion(motion, progress = 0) {
  const p = clamp(progress, 0, 1);
  const frames = motion?.keyframes || [];
  if (!frames.length) {
    return { translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 };
  }
  if (frames.length === 1) return frames[0];

  let prev = frames[0];
  for (let i = 1; i < frames.length; i += 1) {
    const next = frames[i];
    if (p <= next.t) {
      const span = Math.max(0.0001, next.t - prev.t);
      const local = (p - prev.t) / span;
      return {
        translateY: lerp(prev.translateY, next.translateY, local),
        scaleX: lerp(prev.scaleX, next.scaleX, local),
        scaleY: lerp(prev.scaleY, next.scaleY, local),
        rotate: lerp(prev.rotate, next.rotate, local)
      };
    }
    prev = next;
  }
  return frames[frames.length - 1];
}

function motionTransformCss(sample) {
  const y = toNumber(sample?.translateY, 0);
  const sx = toNumber(sample?.scaleX, 1);
  const sy = toNumber(sample?.scaleY, 1);
  const rot = toNumber(sample?.rotate, 0);
  return `translateY(${y}px) scale(${sx}, ${sy}) rotate(${rot}deg)`;
}

module.exports = {
  CHARACTER_MOTION_PRESETS,
  normalizeMotionStyle,
  buildMotionKeyframes,
  sampleMotion,
  motionTransformCss
};
