"use strict";

const { resolvePosePreset } = require("./poseCommands");

/** Mapování animation bank emocí → kanonické body pózy (POSE_PRESETS). */
const EMOTION_TO_BODY_MOOD = {
  happy: "happy",
  excited: "gift",
  party: "combo",
  dance: "combo",
  hype: "combo",
  eating: "gift",
  hungry: "think",
  angry: "duel",
  annoyed: "duel",
  stressed: "think",
  sad: "think",
  sleepy: "idle",
  sick: "think",
  wave: "wave",
  gift: "gift",
  duel: "duel",
  combo: "combo",
  idle: "idle",
  think: "think"
};

/** Phase 13b — spriteHint z bank/Koj → body mood. */
const SPRITE_HINT_TO_BODY_MOOD = {
  "react-gift": "gift",
  love: "happy",
  warm: "happy",
  "party-pop": "combo",
  party: "combo",
  dance: "combo",
  wave: "wave",
  excited: "gift",
  happy: "happy",
  sad: "think",
  speak: "happy"
};

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isActiveAnimationReaction(reaction, now = Date.now()) {
  if (!reaction || typeof reaction !== "object") return false;
  const until = toNumber(reaction.holdUntilTs, 0);
  return until > now || reaction.active === true;
}

function mapAnimationEmotionToBodyMood(emotion) {
  const key = String(emotion || "idle").toLowerCase().trim();
  if (EMOTION_TO_BODY_MOOD[key]) return EMOTION_TO_BODY_MOOD[key];
  if (SPRITE_HINT_TO_BODY_MOOD[key]) return SPRITE_HINT_TO_BODY_MOOD[key];
  const pose = resolvePosePreset(key);
  return pose === "idle" && key !== "idle" ? "gift" : pose;
}

function resolveBodyMoodFromAnimationReaction(reaction, now = Date.now()) {
  if (!isActiveAnimationReaction(reaction, now)) return null;
  const fromEmotion = mapAnimationEmotionToBodyMood(reaction.emotion);
  if (fromEmotion && fromEmotion !== "idle") return fromEmotion;
  return mapAnimationEmotionToBodyMood(reaction.spriteHint || "idle");
}

/**
 * Phase 13b — resolve body mood for studio preview (clip metadata + reaction).
 */
function resolveBodyMoodFromStudioPreview(input = {}) {
  const clip = input.clip || {};
  const reaction = input.reaction || {};
  const candidates = [
    input.mood,
    reaction.emotion,
    clip.emotion,
    reaction.spriteHint,
    clip.spriteHint,
    input.giftKey,
    "happy"
  ];
  for (const raw of candidates) {
    if (raw == null || raw === "") continue;
    const mood = mapAnimationEmotionToBodyMood(raw);
    if (mood) return mood;
  }
  return "happy";
}

function resolveSpeakingFromAnimationReaction(reaction, now = Date.now()) {
  if (!isActiveAnimationReaction(reaction, now)) return false;
  const owner = String(
    reaction.speechIntent?.owner || reaction.animationOwner || ""
  ).toLowerCase();
  if (owner === "mia") return true;
  const tone = String(reaction.speechIntent?.tone || reaction.emotion || "").toLowerCase();
  return tone === "speak" || tone === "talking";
}

function resolveSpeakingUntilTsFromAnimationReaction(reaction, now = Date.now()) {
  if (!resolveSpeakingFromAnimationReaction(reaction, now)) return 0;
  const until = toNumber(reaction.holdUntilTs, 0);
  return until > now ? until : now + 1200;
}

module.exports = {
  EMOTION_TO_BODY_MOOD,
  SPRITE_HINT_TO_BODY_MOOD,
  isActiveAnimationReaction,
  mapAnimationEmotionToBodyMood,
  resolveBodyMoodFromAnimationReaction,
  resolveBodyMoodFromStudioPreview,
  resolveSpeakingFromAnimationReaction,
  resolveSpeakingUntilTsFromAnimationReaction
};
