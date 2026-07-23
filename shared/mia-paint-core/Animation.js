"use strict";

const { ensureMotion } = require("./Motion");

let timelineSeq = 0;
let frameSeq = 0;

function nextTimelineId() {
  timelineSeq += 1;
  return `timeline_${timelineSeq}_${Date.now().toString(36)}`;
}

function nextFrameId() {
  frameSeq += 1;
  return `frame_${frameSeq}_${Date.now().toString(36)}`;
}

function createFrame(opts = {}) {
  return {
    id: opts.id || nextFrameId(),
    label: opts.label || "Snímek",
    durationMs: Math.max(16, Number(opts.durationMs) || 83),
    /** Per-layer tile snapshot keys — filled by GPU engine */
    layerSnapshots: opts.layerSnapshots || {}
  };
}

function createTimeline(opts = {}) {
  const first = createFrame({ label: "1" });
  const tl = {
    id: opts.id || nextTimelineId(),
    fps: Math.max(1, Math.min(60, Number(opts.fps) || 12)),
    frames: Array.isArray(opts.frames) && opts.frames.length ? opts.frames.slice() : [first],
    activeFrameIndex: 0,
    onionBefore: Math.max(0, Math.min(5, Number(opts.onionBefore) || 1)),
    onionAfter: Math.max(0, Math.min(5, Number(opts.onionAfter) || 1)),
    playing: false,
    motion: opts.motion || null
  };
  ensureMotion(tl);
  return tl;
}

function getActiveFrame(timeline) {
  if (!timeline?.frames?.length) return null;
  const idx = Math.max(0, Math.min(timeline.frames.length - 1, timeline.activeFrameIndex || 0));
  return timeline.frames[idx];
}

function addFrame(timeline, opts = {}) {
  const frame = createFrame({
    label: opts.label || String(timeline.frames.length + 1),
    durationMs: opts.durationMs || Math.round(1000 / (timeline.fps || 12))
  });
  timeline.frames.push(frame);
  timeline.activeFrameIndex = timeline.frames.length - 1;
  return frame;
}

function frameDurationMs(timeline, frame) {
  if (frame?.durationMs) return frame.durationMs;
  return Math.round(1000 / (timeline?.fps || 12));
}

function timelineDurationMs(timeline) {
  if (!timeline?.frames?.length) return 0;
  return timeline.frames.reduce((sum, f) => sum + frameDurationMs(timeline, f), 0);
}

function onionFrameIndices(timeline) {
  const idx = timeline.activeFrameIndex || 0;
  const before = [];
  const after = [];
  for (let i = 1; i <= timeline.onionBefore; i += 1) {
    const j = idx - i;
    if (j >= 0) before.push(j);
  }
  for (let i = 1; i <= timeline.onionAfter; i += 1) {
    const j = idx + i;
    if (j < timeline.frames.length) after.push(j);
  }
  return { before, after, current: idx };
}

module.exports = {
  createTimeline,
  createFrame,
  getActiveFrame,
  addFrame,
  frameDurationMs,
  timelineDurationMs,
  onionFrameIndices,
  nextTimelineId,
  nextFrameId
};
