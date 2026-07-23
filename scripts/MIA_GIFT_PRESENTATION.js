"use strict";

/**
 * Gift presentation orchestrator — jedna cesta pro combo / speech / visual / story.
 * Kánon: boss T4 = combo flash only; T5+ = boss speech interrupt; combo speech ≠ duplicitní MIA bublina.
 */

const giftEconomy = require("./MIA_GIFT_ECONOMY");
const comboOverlay = require("./MIA_COMBO_OVERLAY");
const achievementMoment = require("./MIA_ACHIEVEMENT_MOMENT");
const bossCinematic = require("./MIA_BOSS_CINEMATIC");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function tierRank(tier = "T1") {
  return Number(safeString(tier, "T1").replace(/\D/g, "")) || 1;
}

function normalizeOwner(payload = {}) {
  return safeString(payload.owner || payload.speaker, "mia").toLowerCase();
}

function resolveGiftPresentationPlan(ctx = {}, options = {}) {
  if (!ctx || typeof ctx !== "object") {
    return emptyPlan();
  }

  const userLabel = safeString(options.userLabel, "Divák");
  const giftName = safeString(ctx.giftName, "gift");
  const bossPolicy =
    typeof giftEconomy.resolveBossPresentationPolicy === "function"
      ? giftEconomy.resolveBossPresentationPolicy(ctx.streamTier)
      : { useComboFlash: false, useSpeechBossSubtext: false, miaInterrupt: false };

  let comboMoment = null;

  if (ctx.comboTier && typeof comboOverlay.buildGiftComboMoment === "function") {
    comboMoment = comboOverlay.pickStrongerMoment(
      comboMoment,
      comboOverlay.buildGiftComboMoment(
        {
          comboTier: ctx.comboTier,
          comboLabel: ctx.comboLabel,
          comboCount: ctx.comboCount
        },
        { userLabel, giftName }
      )
    );
  }

  if (
    ctx.bossEvent &&
    bossPolicy.useComboFlash &&
    typeof comboOverlay.buildBossComboMoment === "function"
  ) {
    comboMoment = comboOverlay.pickStrongerMoment(
      comboMoment,
      comboOverlay.buildBossComboMoment(ctx)
    );
  }

  const spamVerdict = options.spamVerdict;
  if (spamVerdict && typeof comboOverlay.buildSpamComboMoment === "function") {
    comboMoment = comboOverlay.pickStrongerMoment(
      comboMoment,
      comboOverlay.buildSpamComboMoment(spamVerdict)
    );
  }

  // Phase 2 named moments (solo_combo / community_burst / …)
  if (options.phase2ComboMoment && typeof options.phase2ComboMoment === "object") {
    comboMoment = comboOverlay.pickStrongerMoment
      ? comboOverlay.pickStrongerMoment(comboMoment, options.phase2ComboMoment)
      : comboMoment || options.phase2ComboMoment;
  }

  let comboSpeechPayload = null;
  if (
    ctx.comboTier &&
    !bossPolicy.useSpeechBossSubtext &&
    typeof giftEconomy.buildComboOverlayPayload === "function"
  ) {
    comboSpeechPayload = giftEconomy.buildComboOverlayPayload(
      {
        comboTier: ctx.comboTier,
        comboLabel: ctx.comboLabel,
        comboCount: ctx.comboCount
      },
      { userLabel, giftName }
    );
  }

  const overlayPriority = Math.max(
    comboSpeechPayload?.priority || 3,
    comboMoment?.priority || 3,
    bossPolicy.miaInterrupt ? 7 : 0
  );

  const speechLane = resolveSpeechLane({
    ctx,
    bossPolicy,
    comboSpeechPayload,
    primaryOverlay: options.primaryOverlay || null
  });

  const postGift = resolvePostGiftExperiencePlan(ctx, options);

  const cinematicPayload =
    comboMoment &&
    typeof bossCinematic.buildBossCinematicPayload === "function"
      ? bossCinematic.buildBossCinematicPayload(comboMoment, {
          userLabel,
          giftName,
          streamTier: ctx.streamTier,
          obsTier: ctx.obsTier,
          miaPoints: ctx.miaPoints ?? ctx.giftMap?.miaPoints,
          env: options.env || process.env
        })
      : null;

  return {
    comboMoment,
    bossCinematic: cinematicPayload,
    comboSpeechPayload: speechLane.emitComboSpeech ? comboSpeechPayload : null,
    bossPolicy,
    voicePreempt: bossPolicy.miaInterrupt === true,
    overlayPriority,
    speechLane,
    postGift,
    phase2ComboMoment: options.phase2ComboMoment || null,
    lanes: {
      comboFlash: Boolean(comboMoment),
      bossCinematic: Boolean(cinematicPayload),
      speech: speechLane.mode,
      giftVisual: postGift.runGiftVisual,
      viewerStory: postGift.runViewerStory,
      milestoneStory: postGift.runMilestoneStory
    }
  };
}

function emptyPlan() {
  return {
    comboMoment: null,
    bossCinematic: null,
    comboSpeechPayload: null,
    achievementKojOverlay: null,
    achievementVoicePlan: null,
    bossPolicy: null,
    voicePreempt: false,
    overlayPriority: 3,
    speechLane: { mode: "primary", suppressPrimaryOverlay: false, emitComboSpeech: false },
    postGift: resolvePostGiftExperiencePlan({}, {}),
    lanes: {
      comboFlash: false,
      bossCinematic: false,
      achievementMoment: false,
      speech: "primary",
      giftVisual: true,
      viewerStory: false,
      milestoneStory: true
    }
  };
}

function attachAchievementMomentToPlan(plan = {}, support = {}, userLabel = "Divák") {
  const unlocked = resolvePublicAchievements(support);
  const achievement = unlocked[0] || null;
  if (!achievement) return plan;

  const delivery =
    typeof achievementMoment.buildAchievementDelivery === "function"
      ? achievementMoment.buildAchievementDelivery(achievement, { userLabel })
      : null;
  if (!delivery) return plan;

  const nextCombo = comboOverlay.pickStrongerMoment(
    plan.comboMoment,
    delivery.comboMoment
  );

  return {
    ...plan,
    comboMoment: nextCombo,
    achievementKojOverlay: delivery.kojOverlay,
    achievementVoicePlan: delivery.voicePlan,
    overlayPriority: Math.max(plan.overlayPriority || 3, nextCombo?.priority || 3, 4),
    lanes: {
      ...(plan.lanes || {}),
      comboFlash: Boolean(nextCombo),
      achievementMoment: Boolean(delivery.comboMoment || delivery.kojOverlay)
    }
  };
}

function resolveSpeechLane({ ctx = {}, bossPolicy = {}, comboSpeechPayload = null, primaryOverlay = null } = {}) {
  const primaryOwner = normalizeOwner(primaryOverlay || {});
  const bossFlashOnly =
    Boolean(ctx.bossEvent) &&
    bossPolicy.useComboFlash === true &&
    bossPolicy.useSpeechBossSubtext !== true;

  if (bossPolicy.useSpeechBossSubtext) {
    return {
      mode: "boss",
      suppressPrimaryOverlay: false,
      emitComboSpeech: false,
      reason: "boss_speech_interrupt"
    };
  }

  if (bossFlashOnly && primaryOwner === "mia") {
    return {
      mode: "combo_flash",
      suppressPrimaryOverlay: true,
      emitComboSpeech: false,
      reason: "boss_t4_flash_only"
    };
  }

  if (comboSpeechPayload && primaryOwner === "mia") {
    return {
      mode: "combo",
      suppressPrimaryOverlay: true,
      emitComboSpeech: true,
      reason: "combo_speech_replaces_mia_bubble"
    };
  }

  if (comboSpeechPayload) {
    return {
      mode: "combo_plus_primary",
      suppressPrimaryOverlay: false,
      emitComboSpeech: true,
      reason: "combo_speech_with_koj_primary"
    };
  }

  return {
    mode: "primary",
    suppressPrimaryOverlay: false,
    emitComboSpeech: false,
    reason: "default_primary"
  };
}

function resolvePostGiftExperiencePlan(ctx = {}, options = {}) {
  const env = options.env || process.env;
  const tier = safeString(ctx.streamTier || ctx.obsTier || ctx.tier, "T1");
  const minStoryTier = Math.max(2, toNumber(env.MIA_VIEWER_STORY_MIN_TIER, 2));
  const rank = tierRank(tier);

  return {
    runGiftVisual: ctx.videoReaction !== false,
    runMilestoneStory: true,
    runViewerStory: rank >= minStoryTier,
    skipViewerStoryIfMilestone: true,
    minStoryTier
  };
}

function applyPresentationLanes(actionResult = {}, plan = {}) {
  if (!actionResult || typeof actionResult !== "object") {
    return actionResult;
  }

  const next = { ...actionResult };
  const speechLane = plan.speechLane || {};

  if (speechLane.suppressPrimaryOverlay) {
    next.overlayPayload = null;
    next.overlay = null;
  }

  next.meta = {
    ...(next.meta || {}),
    presentationPlan: plan,
    presentationSpeechLane: speechLane.mode,
    presentationSpeechReason: speechLane.reason || null
  };

  if (plan.voicePreempt) {
    next.voicePreempt = true;
  }

  return next;
}

function resolvePublicAchievements(support = {}) {
  const list = Array.isArray(support?.giftStats?.achievements)
    ? support.giftStats.achievements
    : [];
  return list.filter((row) => row && row.public !== false && safeString(row.label || row.id));
}

function applyGiftMapOverlay(actionResult = {}, support = {}, ctx = {}) {
  const mapOverlayText = safeString(
    support?.giftMapRuntime?.overlay?.text ||
      support?.giftOverlay?.text ||
      ctx?.overlayText
  );

  const next = { ...actionResult };
  const basePayload = next.overlayPayload || next.overlay || null;
  if (!basePayload || typeof basePayload !== "object") {
    return actionResult;
  }

  const memoryApplied =
    basePayload?.meta?.giftMemoryApplied === true ||
    next.meta?.giftMemoryApplied === true;

  // Personalizovaná paměť má přednost před katalogovým „X poslal Rose“.
  const overlayText = memoryApplied
    ? safeString(basePayload.text, mapOverlayText)
    : mapOverlayText || safeString(basePayload.text);

  if (!overlayText && !resolvePublicAchievements(support).length) {
    return actionResult;
  }

  const color = safeString(
    support?.giftOverlay?.color || ctx?.overlayColor,
    basePayload.color
  );
  const icon = safeString(
    support?.giftOverlay?.icon || ctx?.overlayIcon,
    basePayload.icon
  );

  const unlocked = resolvePublicAchievements(support);
  const achievement = unlocked[0] || null;
  const achievementLabel = achievement
    ? safeString(achievement.label, achievement.id)
    : "";

  const streak = support?.giftMapRuntime?.streak || null;
  const streakSub =
    streak && (streak.kind === "wave" || streak.kind === "combo")
      ? safeString(streak.label)
      : "";

  const subtext = achievementLabel || streakSub || safeString(basePayload.subtext);

  next.overlayPayload = {
    ...basePayload,
    text: overlayText || basePayload.text,
    color: color || basePayload.color,
    icon: icon || basePayload.icon,
    subtext,
    holdMs:
      Math.max(
        toNumber(basePayload.holdMs, 0),
        toNumber(
          support?.giftOverlay?.displayMs ||
            support?.giftMapRuntime?.overlay?.displayMs,
          0
        ),
        achievement ? 7000 : 0
      ) || basePayload.holdMs,
    meta: {
      ...(basePayload.meta || {}),
      giftMapOverlay: true,
      giftMemoryApplied: memoryApplied,
      giftKey: safeString(support?.giftKey || ctx?.giftKey),
      giftCare: safeString(support?.giftCare || ctx?.giftCare),
      streak,
      achievementUnlock: achievement
        ? { id: achievement.id, label: achievementLabel }
        : null
    }
  };

  if (next.overlay && next.overlay === basePayload) {
    next.overlay = next.overlayPayload;
  }

  next.meta = {
    ...(next.meta || {}),
    giftMapOverlayText: overlayText,
    giftMemoryApplied: memoryApplied,
    giftKey: safeString(support?.giftKey || ctx?.giftKey),
    achievementUnlock: next.overlayPayload.meta.achievementUnlock
  };

  return next;
}

function applyBossSpeechPatch(actionResult = {}, ctx = {}) {
  if (!ctx?.bossEvent || !actionResult?.overlayPayload) {
    return actionResult;
  }

  const policy =
    typeof giftEconomy.resolveBossPresentationPolicy === "function"
      ? giftEconomy.resolveBossPresentationPolicy(ctx.streamTier)
      : null;

  if (!policy?.useSpeechBossSubtext) {
    return actionResult;
  }

  if (typeof giftEconomy.buildBossOverlayPatch !== "function") {
    return actionResult;
  }

  const bossPatch = giftEconomy.buildBossOverlayPatch(ctx.streamTier);
  if (!bossPatch) return actionResult;

  const next = { ...actionResult };
  next.overlayPayload = {
    ...next.overlayPayload,
    text: safeString(bossPatch.subtext, next.overlayPayload.text),
    subtext: safeString(ctx.giftName, next.overlayPayload.subtext),
    mood: bossPatch.mood || next.overlayPayload.mood,
    stage: bossPatch.stage || next.overlayPayload.stage,
    priority: Math.max(next.overlayPayload.priority || 3, policy.miaInterrupt ? 7 : 5),
    holdMs: Math.max(next.overlayPayload.holdMs || 8500, bossPatch.holdMs || 10000),
    meta: {
      ...(next.overlayPayload.meta || {}),
      ...(bossPatch.meta || {}),
      bossPresentation: "speech_interrupt"
    }
  };
  next.meta = {
    ...(next.meta || {}),
    bossEvent: ctx.bossEvent,
    miaInterrupt: policy.miaInterrupt === true
  };
  next.voicePreempt = policy.miaInterrupt === true;

  return next;
}

function prepareGiftPresentation(normalized = {}, actionResult = {}, shadowResult = null) {
  const ctx = normalized?.support?.giftContext;
  if (!ctx || typeof ctx !== "object") {
    return { actionResult, plan: null };
  }

  const spamVerdict =
    shadowResult?.spamVerdict || shadowResult?.decisionResult?.spamVerdict || null;

  const plan = resolveGiftPresentationPlan(ctx, {
    userLabel: safeString(
      normalized?.user?.nickname || normalized?.user?.displayName,
      "Divák"
    ),
    spamVerdict,
    primaryOverlay: actionResult?.overlayPayload || actionResult?.overlay || null,
    env: process.env,
    phase2ComboMoment: normalized?.phase2ComboMoment || null
  });

  let next = { ...actionResult };
  next.meta = {
    ...(next.meta || {}),
    giftContext: ctx,
    streamTier: ctx.streamTier,
    giftLevel: ctx.giftLevel,
    giftLevelLabel: ctx.giftLevelLabel,
    comboTier: ctx.comboTier || null,
    miaDirection: normalized?.miaDirection || null
  };
  if (normalized?.miaDirection) {
    next.normalized = {
      ...(next.normalized || {}),
      miaDirection: normalized.miaDirection,
      miaRuntimeEvent: normalized.miaRuntimeEvent || null,
      viewerMemory: normalized.viewerMemory || null,
      phase2ComboMoment: normalized.phase2ComboMoment || null
    };
  }

  if (ctx.obsTier) {
    next.tier = ctx.obsTier;
    next.meta.videoTier = ctx.obsTier;
  } else if (ctx.streamTier) {
    next.tier = ctx.streamTier;
  }

  next = applyGiftMapOverlay(next, normalized?.support || {}, ctx);
  next = applyBossSpeechPatch(next, ctx);

  const userLabel = safeString(
    normalized?.user?.nickname || normalized?.user?.displayName,
    "Divák"
  );
  const planWithAchievement = attachAchievementMomentToPlan(
    plan,
    normalized?.support || {},
    userLabel
  );

  next = applyPresentationLanes(next, planWithAchievement);

  if (
    ctx.voiceReaction === false ||
    normalized?.support?.giftVoice?.speak === false
  ) {
    next.meta = {
      ...(next.meta || {}),
      suppressVoice: true,
      suppressGiftVoice: true
    };
  }

  return { actionResult: next, plan: planWithAchievement };
}

module.exports = {
  resolveGiftPresentationPlan,
  resolveSpeechLane,
  resolvePostGiftExperiencePlan,
  applyPresentationLanes,
  applyGiftMapOverlay,
  applyBossSpeechPatch,
  prepareGiftPresentation
};
