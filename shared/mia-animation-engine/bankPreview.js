"use strict";

/**
 * Phase 12x — operator Animation Bank preview (non-live).
 * Returns full sheet URLs regardless of quality; live gift path stays gated.
 */

const { loadBankIndex, getClipEntry, resolveClipForGift } = require("./AnimationBank");
const { resolveBankQuality, isLiveSheetEligible } = require("./GiftReactionOrchestrator");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function summarizeClip(clip) {
  if (!clip) return null;
  const quality = resolveBankQuality(clip);
  const giftOverride = clip.metadata?.giftOverride === true;
  const overrideActive = giftOverride && isLiveSheetEligible(quality);
  const { evaluateProductionReadiness } = require("./productionGate");
  const gate = evaluateProductionReadiness(clip.metadata || {}, {
    quality: clip.metadata?.quality || quality
  });
  return {
    id: clip.id,
    category: clip.category || clip.id?.split("/")[0] || null,
    label: clip.label || clip.metadata?.label || clip.id,
    quality,
    source: clip.metadata?.source || clip.manifest?.source || null,
    liveSheetEligible: isLiveSheetEligible(quality),
    giftOverride,
    overrideActive,
    overridePending: giftOverride && !isLiveSheetEligible(quality),
    productionReady: gate.ready,
    productionBlockers: gate.blockers,
    productionWarnings: gate.warnings,
    built: !!clip.built,
    giftKeys: clip.metadata?.giftKeys || clip.manifest?.giftKeys || [],
    emotion: clip.metadata?.emotion || null,
    spriteHint: clip.metadata?.spriteHint || clip.manifest?.spriteHint || null,
    sheetUrl: clip.sheetUrl || null,
    manifestUrl: clip.manifestUrl || null,
    frameCount: clip.manifest?.frameCount || clip.metadata?.frameCount || null,
    fps: clip.manifest?.fps || clip.metadata?.fps || null,
    trueAlpha: clip.metadata?.trueAlpha === true,
    avgAlphaRatio: clip.metadata?.avgAlphaRatio ?? null,
    phase: clip.metadata?.phase || null
  };
}

function listBankOperatorClips(bankRoot) {
  const bank = loadBankIndex(bankRoot);
  const clips = (bank.clips || []).map(summarizeClip).filter(Boolean);
  clips.sort((a, b) => {
    const qa = a.quality === "production" ? 0 : a.quality === "ai" ? 1 : 2;
    const qb = b.quality === "production" ? 0 : b.quality === "ai" ? 1 : 2;
    if (qa !== qb) return qa - qb;
    return String(a.id).localeCompare(String(b.id));
  });
  return {
    ok: true,
    phase: "12x",
    clipCount: clips.length,
    clips
  };
}

function resolvePreviewClip(input = {}, bank = null) {
  const bankIndex = bank || loadBankIndex(input.bankRoot);
  const clipId = safeString(input.clipId || input.id);
  if (clipId) {
    const clip = getClipEntry(bankIndex, clipId);
    if (clip) return clip;
  }
  const giftKey = safeString(input.giftKey).toLowerCase();
  if (giftKey) {
    return resolveClipForGift(bankIndex, {
      giftKey,
      effectProgram: safeString(input.effectProgram),
      emotion: safeString(input.emotion, "happy"),
      tier: safeString(input.tier, "T1")
    });
  }
  return null;
}

/**
 * Operator preview payload — always includes sheet URLs when built.
 * Does NOT go through live gift quality nulling.
 */
function previewBankClip(input = {}) {
  const clip = resolvePreviewClip(input);
  if (!clip) {
    return { ok: false, error: "clip_not_found", phase: "12x" };
  }
  if (!clip.built && !clip.sheetUrl) {
    return { ok: false, error: "clip_not_built", clipId: clip.id, phase: "12x" };
  }

  const summary = summarizeClip(clip);
  const holdMs = Math.max(
    1200,
    Math.round(((summary.frameCount || 4) / (summary.fps || 12)) * 1000 + 800)
  );

  return {
    ok: true,
    phase: "12x",
    studioPreview: true,
    liveSheetEligible: summary.liveSheetEligible,
    note: summary.liveSheetEligible
      ? "production_clip_also_live_eligible"
      : "studio_only_sheets_not_used_by_live_gifts",
    clip: summary,
    reaction: {
      animationId: clip.id,
      emotion: summary.emotion || "happy",
      effectProgram: safeString(input.effectProgram, "generic_support"),
      giftKey: safeString(input.giftKey),
      tier: "T0",
      animationOwner: "kojnozout",
      sheetUrl: summary.sheetUrl,
      manifestUrl: summary.manifestUrl,
      bankQuality: summary.quality,
      preferProductionSprite: false,
      studioPreview: true,
      spriteHint: summary.spriteHint || "happy",
      particles: null,
      soundCue: "",
      holdMs: Number(input.holdMs) || holdMs,
      overlay: { stageClass: "gift", scene: "party" }
    }
  };
}

function pushBankClipPreview(input = {}, deps = {}) {
  const preview = previewBankClip(input);
  if (!preview.ok) return preview;

  const overlayStateModule = deps.overlayStateModule;
  const getOverlayState = deps.getOverlayState;
  const overlayState =
    typeof getOverlayState === "function" ? getOverlayState() : deps.overlayState;

  if (!overlayStateModule || typeof overlayStateModule.setAnimationReaction !== "function") {
    return {
      ...preview,
      pushed: false,
      error: "overlay_state_unavailable",
      hint: "Otevři sheetUrl v prohlížeči nebo Koj overlay s ?animBank=1"
    };
  }
  if (!overlayState) {
    return { ...preview, pushed: false, error: "overlay_state_missing" };
  }

  const reaction = overlayStateModule.setAnimationReaction(overlayState, preview.reaction);
  if (typeof deps.invalidateOverlayStateCache === "function") {
    deps.invalidateOverlayStateCache();
  }

  let bodyPreview = null;
  let bodyMood = null;
  if (input.syncBody !== false) {
    try {
      const {
        resolveBodyMoodFromStudioPreview
      } = require("../mia-graphics-studio/bodyAnimationSync");
      const { publishBodyPreview } = require("../mia-graphics-studio/bodyPreviewCommands");
      bodyMood = resolveBodyMoodFromStudioPreview({
        clip: preview.clip,
        reaction: preview.reaction,
        mood: input.mood,
        giftKey: input.giftKey || preview.reaction.giftKey
      });
      bodyPreview = publishBodyPreview({
        mood: bodyMood,
        speaking: input.speaking === true,
        lockStudioMs: Number(input.holdMs) || preview.reaction.holdMs || 4000
      });
    } catch (_err) {
      bodyPreview = { ok: false, error: "body_preview_unavailable" };
    }
  }

  return {
    ...preview,
    phase: "13b",
    pushed: true,
    reaction,
    bodyMood,
    bodyPreview,
    unifiedPreview: true,
    kojPreviewUrl: "/kojnozrout-runtime.html?animBank=1"
  };
}

module.exports = {
  listBankOperatorClips,
  previewBankClip,
  pushBankClipPreview,
  summarizeClip,
  resolvePreviewClip
};
