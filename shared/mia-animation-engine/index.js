"use strict";

const { BANK_VERSION, MANIFEST_KIND, validateClipMetadata, buildClipManifest } = require("./animationBankSchema");
const { packSpriteSheet, packClipDirectory } = require("./spriteSheetPack");
const {
  DEFAULT_BANK_ROOT,
  discoverClipDirs,
  loadBankIndex,
  getClipEntry,
  resolveClipForGift,
  findGiftOverrideClip,
  isGiftOverrideClip
} = require("./AnimationBank");
const { resolveGiftReactionPlan, resolveBankQuality, isLiveSheetEligible } = require("./GiftReactionOrchestrator");
const {
  promoteAiAnimationToBank,
  markBankClipProduction,
  bindGiftKeysToClip,
  listAiStagingClips
} = require("./promoteAiAnimation");
const { listBankOperatorClips, previewBankClip, pushBankClipPreview } = require("./bankPreview");
const { previewStagingClip, pushStagingClipPreview, encodeAiStagingPreview, assembleStagingClips, listStagingMediaUrls } = require("./stagingPreview");
const { evaluateProductionReadiness, DEFAULT_MIN_ALPHA } = require("./productionGate");
const { buildMotionKeyframes, sampleMotion, motionTransformCss, CHARACTER_MOTION_PRESETS } = require("./ProceduralMotion");
const {
  resolveParticlePreset,
  resolveSoundCue,
  resolveMotionPreset,
  resolveGiftAnimationId
} = require("./effectProgramPresets");

module.exports = {
  BANK_VERSION,
  MANIFEST_KIND,
  DEFAULT_BANK_ROOT,
  validateClipMetadata,
  buildClipManifest,
  packSpriteSheet,
  packClipDirectory,
  discoverClipDirs,
  loadBankIndex,
  getClipEntry,
  resolveClipForGift,
  findGiftOverrideClip,
  isGiftOverrideClip,
  resolveGiftReactionPlan,
  resolveBankQuality,
  isLiveSheetEligible,
  promoteAiAnimationToBank,
  markBankClipProduction,
  bindGiftKeysToClip,
  listAiStagingClips,
  listBankOperatorClips,
  previewBankClip,
  pushBankClipPreview,
  previewStagingClip,
  pushStagingClipPreview,
  encodeAiStagingPreview,
  assembleStagingClips,
  listStagingMediaUrls,
  evaluateProductionReadiness,
  DEFAULT_MIN_ALPHA,
  buildMotionKeyframes,
  CHARACTER_MOTION_PRESETS,
  sampleMotion,
  motionTransformCss,
  resolveParticlePreset,
  resolveSoundCue,
  resolveMotionPreset,
  resolveGiftAnimationId
};
