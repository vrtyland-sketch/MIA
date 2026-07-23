"use strict";

const { ensureMotion } = require("./Motion");
const { frameDurationMs, timelineDurationMs } = require("./Animation");

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function unifiedDurationMs(timeline) {
  if (!timeline) return 1000;
  const motion = ensureMotion(timeline);
  const frameDur = timelineDurationMs(timeline);
  const motionDur = toNumber(motion?.durationMs, 0);
  return Math.max(1000, frameDur, motionDur);
}

function frameIndexStartMs(timeline, index = 0) {
  if (!timeline?.frames?.length) return 0;
  const idx = clamp(Math.floor(index), 0, timeline.frames.length - 1);
  let acc = 0;
  for (let i = 0; i < idx; i += 1) {
    acc += frameDurationMs(timeline, timeline.frames[i]);
  }
  return acc;
}

function frameIndexEndMs(timeline, index = 0) {
  if (!timeline?.frames?.length) return 0;
  const idx = clamp(Math.floor(index), 0, timeline.frames.length - 1);
  return frameIndexStartMs(timeline, idx) + frameDurationMs(timeline, timeline.frames[idx]);
}

function timeMsToFrameIndex(timeline, timeMs = 0) {
  if (!timeline?.frames?.length) return 0;
  const t = Math.max(0, toNumber(timeMs, 0));
  let acc = 0;
  for (let i = 0; i < timeline.frames.length; i += 1) {
    const dur = frameDurationMs(timeline, timeline.frames[i]);
    if (t < acc + dur) return i;
    acc += dur;
  }
  return timeline.frames.length - 1;
}

function syncPlayheadFromFrame(timeline, mode = "start") {
  const motion = ensureMotion(timeline);
  if (!motion || !timeline?.frames?.length) return { ok: false };
  const idx = timeline.activeFrameIndex || 0;
  let ms = frameIndexStartMs(timeline, idx);
  if (mode === "center") {
    ms += Math.round(frameDurationMs(timeline, timeline.frames[idx]) / 2);
  } else if (mode === "end") {
    ms = frameIndexEndMs(timeline, idx);
  }
  motion.playheadMs = clamp(ms, 0, unifiedDurationMs(timeline));
  motion.durationMs = Math.max(motion.durationMs, motion.playheadMs + 1);
  return { ok: true, playheadMs: motion.playheadMs, frameIndex: idx };
}

function syncFrameFromPlayhead(timeline) {
  const motion = ensureMotion(timeline);
  if (!motion || !timeline?.frames?.length) return { ok: false };
  const idx = timeMsToFrameIndex(timeline, motion.playheadMs);
  timeline.activeFrameIndex = idx;
  return { ok: true, frameIndex: idx, playheadMs: motion.playheadMs };
}

function setUnifiedPlayhead(timeline, timeMs) {
  const motion = ensureMotion(timeline);
  if (!motion) return { ok: false };
  const duration = unifiedDurationMs(timeline);
  motion.playheadMs = clamp(toNumber(timeMs, 0), 0, duration);
  motion.durationMs = Math.max(motion.durationMs, duration);
  const frame = syncFrameFromPlayhead(timeline);
  return { ok: true, playheadMs: motion.playheadMs, frameIndex: frame.frameIndex, durationMs: duration };
}

function exportSampleTimes(timeline, opts = {}) {
  const duration = unifiedDurationMs(timeline);
  const fps = Math.max(1, toNumber(opts.fps || timeline?.fps, 12));
  const stepMs = Math.max(16, toNumber(opts.stepMs, Math.round(1000 / fps)));
  const times = [];
  for (let t = 0; t <= duration; t += stepMs) {
    times.push(t);
  }
  if (times[times.length - 1] !== duration) times.push(duration);
  return times;
}

module.exports = {
  unifiedDurationMs,
  frameIndexStartMs,
  frameIndexEndMs,
  timeMsToFrameIndex,
  syncPlayheadFromFrame,
  syncFrameFromPlayhead,
  setUnifiedPlayhead,
  exportSampleTimes
};
