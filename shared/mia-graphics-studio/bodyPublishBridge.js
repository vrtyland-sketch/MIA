"use strict";

const { publishBodyState } = require("./bodyPartState");
const { resolvePosePreset } = require("./poseCommands");

function resolveSpeakingHoldMs(args = {}) {
  const raw = args.speakingHoldMs ?? args.durationMs;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function syncBodyStateFromPose(poseId, args = {}) {
  if (args.syncBody === false) return null;
  const pose = resolvePosePreset(poseId);
  const payload = { mood: pose };
  if (args.speaking != null) payload.speaking = !!args.speaking;
  if (args.parts && typeof args.parts === "object") payload.parts = args.parts;
  const hold = resolveSpeakingHoldMs(args);
  if (hold > 0) {
    payload.speaking = true;
    payload.speakingHoldMs = hold;
  }
  return publishBodyState({
    ...payload,
    source: "studio",
    lockStudioMs: args.lockStudioMs
  });
}

function syncBodyStateFromLipSync(args = {}) {
  if (args.syncBody === false) return null;
  const hold = resolveSpeakingHoldMs(args) || 2400;
  const payload = {
    speaking: true,
    speakingHoldMs: hold
  };
  if (args.mood) payload.mood = String(args.mood).toLowerCase();
  if (args.parts && typeof args.parts === "object") payload.parts = args.parts;
  return publishBodyState({
    ...payload,
    source: "studio",
    lockStudioMs: args.lockStudioMs
  });
}

function syncBodyStateFromAvatar(args = {}) {
  if (args.syncBody === false) return null;
  return publishBodyState({
    mood: String(args.mood || "happy").toLowerCase(),
    speaking: false,
    parts: args.parts || { head: true, eyes: true, torso: true },
    source: "studio",
    lockStudioMs: args.lockStudioMs
  });
}

function syncBodyStateFromMotionResult(result, args = {}) {
  if (!result?.ok || args.syncBody === false) return null;
  if (result.pose || result.module === "pose") {
    return syncBodyStateFromPose(result.pose || args.pose, args);
  }
  if (result.module === "lip_sync") {
    return syncBodyStateFromLipSync(args);
  }
  return null;
}

module.exports = {
  syncBodyStateFromPose,
  syncBodyStateFromLipSync,
  syncBodyStateFromAvatar,
  syncBodyStateFromMotionResult
};
