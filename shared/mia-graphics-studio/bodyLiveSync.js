"use strict";

const moodBrain = require("./moodBrain");
const bodyAnimationSync = require("./bodyAnimationSync");
const { publishBodyStateFromLive } = require("./bodyPartState");

let lastLiveSyncSignature = "";

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isMomentLive(slot, now) {
  if (!slot || typeof slot !== "object") return false;
  const until = toNumber(slot.holdUntilTs, 0);
  return until > now || slot.active === true;
}

function isActiveVoicePlayback(vp, now) {
  if (!vp || typeof vp !== "object") return false;
  const until = toNumber(vp.holdUntilTs, 0);
  if (until > now) return true;
  return vp.active === true || vp.playing === true;
}

function resolveMoodFromOverlay(data, now = Date.now()) {
  if (isMomentLive(data?.bossCinematic, now)) return "gift";
  const animationMood = bodyAnimationSync.resolveBodyMoodFromAnimationReaction(
    data?.animationReaction,
    now
  );
  if (animationMood) return animationMood;
  if (isMomentLive(data?.comboMoment, now) || data?.spamSession?.active) return "combo";
  if (isMomentLive(data?.duel, now)) return "duel";
  const overlay = data?.miaOverlay || data?.overlay;
  if (overlay?.route === "support" || overlay?.giftName) return "gift";
  if (overlay?.action === "wave") return "wave";
  const communityMood = moodBrain.resolveMiaMoodFromCommunity(data?.communityMood, now);
  if (communityMood) return communityMood;
  return "idle";
}

function resolveSpeakingFromOverlay(data, now = Date.now()) {
  if (bodyAnimationSync.resolveSpeakingFromAnimationReaction(data?.animationReaction, now)) {
    return true;
  }
  const vp = data?.voicePlayback;
  if (!vp || typeof vp !== "object") return false;
  const speaker = String(vp.speaker || vp.owner || "").toLowerCase();
  if (speaker && speaker !== "mia") return false;
  return isActiveVoicePlayback(vp, now);
}

function resolveSpeakingUntilTsFromOverlay(data, now = Date.now()) {
  const animationUntil = bodyAnimationSync.resolveSpeakingUntilTsFromAnimationReaction(
    data?.animationReaction,
    now
  );
  if (animationUntil > 0) return animationUntil;
  if (!resolveSpeakingFromOverlay(data, now)) return 0;
  const vp = data?.voicePlayback;
  const until = toNumber(vp?.holdUntilTs, 0);
  return until > now ? until : now + 1200;
}

function resolveLipTrackFromOverlay(data, now = Date.now()) {
  if (!resolveSpeakingFromOverlay(data, now)) {
    return { lipTrack: null, lipPlaybackId: null, lipStartedAt: 0 };
  }
  const vp = data?.voicePlayback;
  const lipTrack = vp?.lipTrack?.keyframes?.length ? vp.lipTrack : null;
  return {
    lipTrack,
    lipPlaybackId: vp?.playbackId != null ? vp.playbackId : null,
    lipStartedAt: toNumber(vp?.updatedAt, now) || now
  };
}

function syncFromOverlayPublic(snapshot, now = Date.now()) {
  if (!snapshot || typeof snapshot !== "object") return null;

  const mood = resolveMoodFromOverlay(snapshot, now);
  const speaking = resolveSpeakingFromOverlay(snapshot, now);
  const speakingUntilTs = resolveSpeakingUntilTsFromOverlay(snapshot, now);
  const lip = resolveLipTrackFromOverlay(snapshot, now);
  const animId =
    bodyAnimationSync.isActiveAnimationReaction(snapshot.animationReaction, now)
      ? String(snapshot.animationReaction.animationId || snapshot.animationReaction.emotion || "")
      : "";
  const lipSig = lip.lipTrack
    ? `${lip.lipPlaybackId || 0}:${lip.lipTrack.provider || ""}:${lip.lipTrack.keyframes.length}`
    : "0";
  const cm = snapshot.communityMood;
  const communitySig = cm
    ? `${cm.miaMood || ""}:${toNumber(cm.holdUntilTs, 0)}`
    : "0";
  const signature = `${mood}|${speaking ? 1 : 0}|${speakingUntilTs}|${animId}|${lipSig}|${communitySig}`;

  if (signature === lastLiveSyncSignature) return null;
  lastLiveSyncSignature = signature;

  return publishBodyStateFromLive({
    mood,
    speaking,
    speakingUntilTs: speaking ? speakingUntilTs : 0,
    lipTrack: lip.lipTrack,
    lipPlaybackId: lip.lipPlaybackId,
    lipStartedAt: lip.lipStartedAt
  });
}

function resetLiveSyncSignature() {
  lastLiveSyncSignature = "";
}

module.exports = {
  resolveMoodFromOverlay,
  resolveSpeakingFromOverlay,
  resolveSpeakingUntilTsFromOverlay,
  resolveLipTrackFromOverlay,
  syncFromOverlayPublic,
  resetLiveSyncSignature
};
