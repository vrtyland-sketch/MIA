"use strict";

const animationEngine = require("../shared/mia-animation-engine");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function buildGiftAnimationReactionPayload(input = {}) {
  const giftProfile = input.giftProfile || {};
  const giftAnimation = input.giftAnimation || {};
  const mood =
    input.mood ||
    (typeof input.resolveMood === "function"
      ? input.resolveMood(giftAnimation, giftProfile)
      : giftAnimation.rawMood);

  const plan = animationEngine.resolveGiftReactionPlan({
    giftKey: safeString(input.giftKey || giftProfile.key),
    effectProgram: safeString(input.effectProgram || giftProfile.effectProgram, "generic_support"),
    emotion: safeString(mood, "happy"),
    moodHint: safeString(giftProfile.moodHint, mood),
    animationOwner: safeString(giftProfile.animationOwner, "kojnozout"),
    tier: safeString(input.tier, "T1")
  });

  return {
    animationId: plan.animationId,
    emotion: plan.emotion,
    effectProgram: plan.effectProgram,
    giftKey: plan.giftKey || safeString(giftProfile.key),
    giftName: safeString(input.giftName),
    tier: plan.tier,
    userLabel: safeString(input.userLabel),
    animationOwner: plan.animationOwner,
    sheetUrl: plan.sheetUrl,
    manifestUrl: plan.manifestUrl,
    particles: plan.particles,
    soundCue: plan.soundCue,
    motion: plan.motion,
    speechIntent: plan.speechIntent,
    overlay: plan.overlay,
    holdMs: plan.holdMs,
    bankQuality: plan.bankQuality,
    preferProductionSprite: plan.preferProductionSprite === true,
    spriteHint: plan.spriteHint || "react-gift"
  };
}

function shouldRunGiftAnimationReaction(normalized = {}, actionResult = {}) {
  if (!normalized || normalized.kind !== "gift") return false;
  if (actionResult?.duelActive) return false;
  if (actionResult?.videoReaction === false) return false;
  return true;
}

module.exports = {
  buildGiftAnimationReactionPayload,
  shouldRunGiftAnimationReaction,
  resolveGiftReactionPlan: animationEngine.resolveGiftReactionPlan,
  loadBankIndex: animationEngine.loadBankIndex
};
