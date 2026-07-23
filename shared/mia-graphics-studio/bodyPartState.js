"use strict";

const bodyPartsCatalog = require("./bodyPartsCatalog");

const DEFAULT_PARTS = Object.fromEntries(
  bodyPartsCatalog.listBodyParts().map((row) => [row.part, row.defaultVisible === true])
);

const DEFAULT_STUDIO_LOCK_MS = 8000;

let bodyState = {
  mood: "idle",
  speaking: false,
  speakingUntilTs: 0,
  lipTrack: null,
  lipPlaybackId: null,
  lipStartedAt: 0,
  parts: { ...DEFAULT_PARTS },
  layout: "hero",
  source: "studio",
  lockSource: null,
  lockUntilTs: 0,
  liveSyncedAt: 0,
  updatedAt: 0
};

function resolveSpeakingLive(now = Date.now()) {
  if (bodyState.speakingUntilTs > now) return true;
  return !!bodyState.speaking;
}

function isStudioLocked(now = Date.now()) {
  return bodyState.lockUntilTs > now;
}

function applyStudioLock(now, input = {}) {
  const lockMs = Number(input.lockStudioMs);
  if (input.source === "studio" || (Number.isFinite(lockMs) && lockMs > 0)) {
    bodyState.lockSource = "studio";
    bodyState.lockUntilTs = now + (Number.isFinite(lockMs) && lockMs > 0 ? lockMs : DEFAULT_STUDIO_LOCK_MS);
  }
}

function publishBodyState(input = {}) {
  const nextParts =
    input.parts && typeof input.parts === "object"
      ? { ...bodyState.parts, ...input.parts }
      : bodyState.parts;

  const now = Date.now();
  let speaking = input.speaking != null ? !!input.speaking : bodyState.speaking;
  let speakingUntilTs = bodyState.speakingUntilTs || 0;

  if (input.speaking === false) {
    speakingUntilTs = 0;
  }

  const holdMs = Number(input.speakingHoldMs);
  if (Number.isFinite(holdMs) && holdMs > 0) {
    speaking = true;
    speakingUntilTs = now + holdMs;
  } else if (input.speakingUntilTs != null) {
    speakingUntilTs = Math.max(0, Number(input.speakingUntilTs) || 0);
  }

  applyStudioLock(now, input);

  const speakingLive = speaking && (speakingUntilTs > now || speaking);
  let lipTrack = bodyState.lipTrack;
  let lipPlaybackId = bodyState.lipPlaybackId;
  let lipStartedAt = bodyState.lipStartedAt;
  if (input.lipTrack !== undefined) {
    lipTrack = input.lipTrack;
    lipPlaybackId = input.lipPlaybackId != null ? input.lipPlaybackId : bodyState.lipPlaybackId;
    lipStartedAt = input.lipStartedAt != null ? Number(input.lipStartedAt) || now : now;
  }
  if (!speakingLive && input.speaking === false) {
    lipTrack = null;
    lipPlaybackId = null;
    lipStartedAt = 0;
  }

  bodyState = {
    mood: String(input.mood || bodyState.mood || "idle").toLowerCase(),
    speaking,
    speakingUntilTs,
    lipTrack,
    lipPlaybackId,
    lipStartedAt,
    parts: nextParts,
    layout: String(input.layout || bodyState.layout || "hero").toLowerCase(),
    source: String(input.source || "studio"),
    lockSource: bodyState.lockSource,
    lockUntilTs: bodyState.lockUntilTs,
    liveSyncedAt: bodyState.liveSyncedAt,
    updatedAt: now
  };

  return getBodyState();
}

function publishBodyStateFromLive(input = {}) {
  const now = Date.now();
  if (isStudioLocked(now)) {
    return getBodyState();
  }

  const nextParts = bodyState.parts;
  let speaking = input.speaking != null ? !!input.speaking : false;
  let speakingUntilTs = Math.max(0, Number(input.speakingUntilTs) || 0);

  if (input.speaking === false) {
    speakingUntilTs = 0;
  }

  const speakingLive = speaking && speakingUntilTs > now;
  let lipTrack = null;
  let lipPlaybackId = null;
  let lipStartedAt = 0;
  if (speakingLive && input.lipTrack?.keyframes?.length) {
    lipTrack = input.lipTrack;
    lipPlaybackId = input.lipPlaybackId != null ? input.lipPlaybackId : null;
    lipStartedAt = Number(input.lipStartedAt) || now;
  }

  bodyState = {
    mood: String(input.mood || bodyState.mood || "idle").toLowerCase(),
    speaking,
    speakingUntilTs,
    lipTrack,
    lipPlaybackId,
    lipStartedAt,
    parts: nextParts,
    layout: bodyState.layout || "hero",
    source: "live",
    lockSource: bodyState.lockSource,
    lockUntilTs: bodyState.lockUntilTs,
    liveSyncedAt: now,
    updatedAt: now
  };

  return getBodyState();
}

function getBodyState() {
  const now = Date.now();
  const speaking = resolveSpeakingLive(now);
  return {
    ok: true,
    phase: "12u",
    mood: bodyState.mood,
    speaking,
    speakingUntilTs: bodyState.speakingUntilTs,
    lipTrack: speaking ? bodyState.lipTrack : null,
    lipPlaybackId: speaking ? bodyState.lipPlaybackId : null,
    lipStartedAt: speaking ? bodyState.lipStartedAt : 0,
    parts: { ...bodyState.parts },
    layout: bodyState.layout || "hero",
    source: bodyState.source,
    lockSource: isStudioLocked(now) ? bodyState.lockSource : null,
    lockUntilTs: bodyState.lockUntilTs,
    liveSyncedAt: bodyState.liveSyncedAt,
    updatedAt: bodyState.updatedAt
  };
}

function resetBodyState() {
  bodyState = {
    mood: "idle",
    speaking: false,
    speakingUntilTs: 0,
    lipTrack: null,
    lipPlaybackId: null,
    lipStartedAt: 0,
    parts: { ...DEFAULT_PARTS },
    layout: "hero",
    source: "studio",
    lockSource: null,
    lockUntilTs: 0,
    liveSyncedAt: 0,
    updatedAt: Date.now()
  };
  return getBodyState();
}

module.exports = {
  publishBodyState,
  publishBodyStateFromLive,
  getBodyState,
  resetBodyState,
  isStudioLocked
};
