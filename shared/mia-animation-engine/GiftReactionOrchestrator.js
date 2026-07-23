"use strict";

const { loadBankIndex, resolveClipForGift } = require("./AnimationBank");
const {
  resolveGiftAnimationId,
  resolveParticlePreset,
  resolveSoundCue,
  resolveMotionPreset
} = require("./effectProgramPresets");
const { buildMotionKeyframes } = require("./ProceduralMotion");
const { resolveCameraForContext } = require("../mia-paint-core/cameraPresets");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function resolveSpriteHint(input = {}, clip = null) {
  if (clip?.manifest?.spriteHint) return safeString(clip.manifest.spriteHint);
  if (clip?.metadata?.spriteHint) return safeString(clip.metadata.spriteHint);
  const giftKey = safeString(input.giftKey).toLowerCase();
  const emotion = safeString(input.emotion || input.mood || input.moodHint, "happy").toLowerCase();
  if (giftKey.includes("heart")) return "love";
  if (giftKey.includes("galaxy") || giftKey.includes("universe")) return "party-pop";
  if (giftKey.includes("lion")) return "excited";
  if (giftKey) return "react-gift";
  if (emotion === "love" || emotion === "warm") return emotion === "love" ? "love" : "warm";
  if (emotion === "sad") return "sad";
  if (emotion === "dance" || emotion === "party") return "dance";
  if (emotion === "wave") return "wave";
  return "happy";
}

function resolveBankQuality(clip = null) {
  const quality = safeString(clip?.manifest?.quality || clip?.metadata?.quality).toLowerCase();
  if (quality === "production") return "production";
  const source = safeString(clip?.manifest?.source || clip?.metadata?.source).toLowerCase();
  if (source === "production_moods") return "production";
  const tags = clip?.manifest?.tags || clip?.metadata?.tags || [];
  if (Array.isArray(tags) && tags.includes("production")) return "production";
  if (quality === "ai") return "ai";
  if (source === "ai_true_alpha_anim" || source === "openai") return "ai";
  if (Array.isArray(tags) && (tags.includes("ai-true-alpha") || tags.includes("ai"))) return "ai";
  return "procedural";
}

/** Live gift sheets only for production — ai/procedural keep Koj mood sprite. */
function isLiveSheetEligible(bankQuality) {
  return bankQuality === "production";
}

function resolveGiftReactionPlan(input = {}, bank = null) {
  const bankIndex = bank || loadBankIndex();
  const giftKey = safeString(input.giftKey).toLowerCase();
  const effectProgram = safeString(input.effectProgram, "generic_support").toLowerCase();
  const emotion = safeString(input.emotion || input.mood || input.moodHint, "happy").toLowerCase();
  const tier = safeString(input.tier, "T1").toUpperCase();
  const animationOwner = safeString(input.animationOwner, "kojnozout").toLowerCase();

  const clip = resolveClipForGift(bankIndex, {
    giftKey,
    effectProgram,
    emotion,
    tier
  });
  const cameraId = safeString(input.cameraId, resolveCameraForContext({ emotion, tier, giftKey })).toUpperCase();

  const particles = resolveParticlePreset(effectProgram);
  const soundCue = resolveSoundCue(effectProgram, tier);
  const motionSpec = resolveMotionPreset(effectProgram);
  const motion = buildMotionKeyframes(motionSpec);
  const bankQuality = resolveBankQuality(clip);
  const spriteHint = resolveSpriteHint({ giftKey, emotion, moodHint: input.moodHint }, clip);
  const preferProductionSprite = !isLiveSheetEligible(bankQuality);

  const holdMs = Math.max(
    1200,
    Math.round(
      ((clip?.manifest?.frameCount || 4) / (clip?.manifest?.fps || 14)) * 1000 + motion.durationMs * 0.35
    )
  );

  return {
    animationId: clip?.id || resolveGiftAnimationId(giftKey, effectProgram, emotion),
    clip,
    emotion,
    cameraId,
    effectProgram,
    giftKey,
    tier,
    animationOwner,
    particles,
    soundCue,
    motion,
    speechIntent: {
      moodHint: safeString(input.moodHint, emotion),
      owner: animationOwner === "mia" ? "mia" : "kojnozout",
      tone: emotion
    },
    overlay: {
      stageClass: giftKey ? "gift" : emotion,
      scene: effectProgram.startsWith("flower") ? "cave" : "party"
    },
    holdMs,
    sheetUrl: preferProductionSprite ? null : clip?.sheetUrl || null,
    manifestUrl: preferProductionSprite ? null : clip?.manifestUrl || null,
    bankQuality,
    preferProductionSprite,
    liveSheetEligible: isLiveSheetEligible(bankQuality),
    spriteHint
  };
}

module.exports = {
  resolveGiftReactionPlan,
  resolveSpriteHint,
  resolveBankQuality,
  isLiveSheetEligible
};
