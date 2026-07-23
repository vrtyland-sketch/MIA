"use strict";

/**
 * MIA Gift Economy v1 — tier z coinů, XP, levely, combo, streak bonus.
 * Spec: docs/MIA_GIFT_ECONOMY.md
 */

const GIFT_ECONOMY_VERSION = "1.0.0";

const giftTiers = require("./MIA_GIFT_TIERS");
const {
  COIN_TIER_THRESHOLDS,
  normalizeStreamTier,
  resolveStreamTierFromCoins
} = giftTiers;

const GIFT_LEVELS = [
  { level: 1, label: "Nováček", minXp: 0 },
  { level: 2, label: "Fanoušek", minXp: 100 },
  { level: 3, label: "Podporovatel", minXp: 500 },
  { level: 4, label: "Elita", minXp: 2000 },
  { level: 5, label: "Hrdina", minXp: 5000 },
  { level: 6, label: "Legenda", minXp: 15000 },
  { level: 7, label: "Titan", minXp: 40000 },
  { level: 8, label: "Mýtus", minXp: 100000 }
];

const COMBO_THRESHOLDS = {
  COMBO_10: 10,
  COMBO_50: 50,
  COMBO_100: 100
};

const STREAK_BONUS = [
  { minDays: 30, bonusPct: 100 },
  { minDays: 7, bonusPct: 25 },
  { minDays: 3, bonusPct: 10 }
];

const BOSS_EVENT_BY_TIER = {
  T4: { key: "boss_arrival", banner: "PŘIŠEL BOSS" },
  T5: { key: "mega_boss", banner: "MEGA BOSS" },
  T6: { key: "legend_event", banner: "LEGENDA STREAMU" }
};

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mapStreamTierToObsTier(streamTier = "T1") {
  const tier = normalizeStreamTier(streamTier);
  if (tier === "T6") return "T5";
  return tier;
}

function resolveGiftLevel(cumulativeXp = 0) {
  const xp = Math.max(0, toNumber(cumulativeXp, 0));
  let current = GIFT_LEVELS[0];

  for (const row of GIFT_LEVELS) {
    if (xp >= row.minXp) {
      current = row;
    }
  }

  return {
    giftLevel: current.level,
    giftLevelLabel: current.label,
    cumulativeXp: xp
  };
}

function resolveComboTier(repeatCount = 1) {
  const count = Math.max(1, toNumber(repeatCount, 1));
  if (count >= COMBO_THRESHOLDS.COMBO_100) {
    return {
      comboEligible: true,
      comboTier: "ULTIMATE",
      comboLabel: `ULTIMATE COMBO ×${count}`,
      comboCount: count
    };
  }
  if (count >= COMBO_THRESHOLDS.COMBO_50) {
    return {
      comboEligible: true,
      comboTier: "SUPER",
      comboLabel: `SUPER COMBO ×${count}`,
      comboCount: count
    };
  }
  if (count >= COMBO_THRESHOLDS.COMBO_10) {
    return {
      comboEligible: true,
      comboTier: "COMBO",
      comboLabel: `COMBO ×${count}`,
      comboCount: count
    };
  }
  return {
    comboEligible: false,
    comboTier: null,
    comboLabel: "",
    comboCount: count
  };
}

function resolveStreakBonusPct(streakDays = 0) {
  const days = Math.max(0, toNumber(streakDays, 0));
  for (const row of STREAK_BONUS) {
    if (days >= row.minDays) {
      return row.bonusPct;
    }
  }
  return 0;
}

function applyXpBonus(baseXp = 0, bonusPct = 0) {
  const xp = Math.max(0, toNumber(baseXp, 0));
  const bonus = Math.max(0, toNumber(bonusPct, 0));
  return Math.floor(xp * (1 + bonus / 100));
}

function resolveReactionChannels(streamTier = "T1") {
  const tier = normalizeStreamTier(streamTier);
  const rank = Number(tier.replace(/\D/g, "")) || 1;
  const boss = BOSS_EVENT_BY_TIER[tier] || null;

  return {
    voiceReaction: true,
    videoReaction: rank >= 1,
    avatarFlyby: rank >= 2,
    aiText: rank >= 3,
    animation: true,
    soundEffect: rank >= 2,
    overlay: true,
    bossEvent: boss?.key || null,
    bossBanner: boss?.banner || null,
    miaInterrupt: rank >= 5,
    duelEligible: rank >= 5
  };
}

function buildComboOverlayPayload(combo = {}, ctx = {}) {
  if (!combo?.comboTier) return null;

  const userLabel = safeString(ctx.userLabel, "Divák");
  const giftName = safeString(ctx.giftName, "gift");

  return {
    owner: "mia",
    speaker: "mia",
    route: "community",
    title: "MIA",
    text: combo.comboLabel,
    subtext: `${userLabel} · ${giftName}`,
    mood: combo.comboTier === "ULTIMATE" ? "epic" : "excited",
    stage: "gift_combo",
    action: "combo_overlay",
    holdMs: combo.comboTier === "ULTIMATE" ? 9000 : combo.comboTier === "SUPER" ? 7600 : 6200,
    priority: 3,
    meta: {
      source: "gift_economy",
      comboTier: combo.comboTier,
      comboCount: combo.comboCount,
      giftName
    }
  };
}

function resolveBossPresentationPolicy(streamTier = "T1") {
  const tier = normalizeStreamTier(streamTier);
  const rank = Number(tier.replace(/\D/g, "")) || 1;

  return {
    streamTier: tier,
    useComboFlash: rank >= 4,
    useSpeechBossSubtext: rank >= 5,
    miaInterrupt: rank >= 5,
    holdMs: rank >= 6 ? 11000 : rank >= 5 ? 9500 : 8200
  };
}

function buildBossOverlayPatch(streamTier = "T1") {
  const boss = BOSS_EVENT_BY_TIER[normalizeStreamTier(streamTier)];
  if (!boss) return null;

  const policy = resolveBossPresentationPolicy(streamTier);

  return {
    subtext: boss.banner,
    mood: streamTier === "T6" ? "epic" : "focused",
    stage: boss.key,
    holdMs: policy.holdMs,
    meta: {
      bossEvent: boss.key,
      bossBanner: boss.banner,
      streamTier: normalizeStreamTier(streamTier)
    }
  };
}

function buildResolvedGiftContext(input = {}) {
  const support = input.support && typeof input.support === "object" ? input.support : {};
  const giftProfile =
    input.giftProfile ||
    support.giftProfile ||
    (typeof input.giftProfile === "object" ? input.giftProfile : {});

  const supporter =
    input.supporter && typeof input.supporter === "object" ? input.supporter : {};

  const totalCoins = Math.max(
    0,
    toNumber(support.totalCoins, toNumber(support.coins, 0))
  );
  const streamTier = normalizeStreamTier(
    support.streamTier || support.tier,
    resolveStreamTierFromCoins(totalCoins)
  );
  const obsTier = safeString(support.obsTier, mapStreamTierToObsTier(streamTier));
  const baseXp = Math.max(0, toNumber(support.xpBase, totalCoins));
  const xpAward = Math.max(0, toNumber(support.xp, baseXp));
  const streakBonusPct = toNumber(
    supporter.streakBonusPct ?? support.streakBonusPct,
    0
  );
  const combo = resolveComboTier(
    support.repeatCount || support.giftCount || 1
  );
  const level = resolveGiftLevel(
    toNumber(supporter.cumulativeXp, toNumber(support.cumulativeXp, xpAward))
  );
  const giftVoice =
    (support.giftVoice && typeof support.giftVoice === "object" && support.giftVoice) ||
    (support.giftMap?.voice && typeof support.giftMap.voice === "object"
      ? support.giftMap.voice
      : null) ||
    {};
  const reactions = resolveReactionChannels(streamTier);
  if (giftVoice.speak === false || safeString(giftVoice.owner).toLowerCase() === "none") {
    reactions.voiceReaction = false;
  }
  const animation = input.animation && typeof input.animation === "object" ? input.animation : {};
  const profileTeamPoints = Math.max(
    0,
    toNumber(giftProfile.teamPoints, totalCoins)
  );
  const profileRewards = Array.isArray(giftProfile.rewards)
    ? giftProfile.rewards.slice()
    : [];

  const giftMapOverlay =
    support.giftOverlay && typeof support.giftOverlay === "object"
      ? support.giftOverlay
      : support.giftMap?.overlay && typeof support.giftMap.overlay === "object"
        ? support.giftMap.overlay
        : null;

  const coinTier = normalizeStreamTier(
    support.coinTier,
    resolveStreamTierFromCoins(totalCoins)
  );
  const mapTier = safeString(support.giftMap?.tier || support.mapTier, "").toUpperCase();

  return {
    version: GIFT_ECONOMY_VERSION,
    giftName: safeString(support.giftName || giftProfile.giftName),
    giftKey: safeString(
      support.giftKey || giftProfile.canonicalKey || giftProfile.key,
      "unknown_gift"
    ),
    giftValue: totalCoins,
    /** Playback / boss — max(coin, katalog). */
    streamTier,
    obsTier,
    tier: streamTier,
    /** Jen z coinů (bez katalogového boostu). */
    coinTier,
    /** Katalog gift mapy (může být T0). */
    mapTier: mapTier || null,
    /** Explicitní druhy tierů — ať se neplete se spamRewardTier. */
    tierKinds: {
      stream: streamTier,
      obs: obsTier,
      coin: coinTier,
      map: mapTier || null
    },
    overlayText: safeString(
      support.giftMapRuntime?.overlay?.text || giftMapOverlay?.text
    ),
    overlayStyle: safeString(giftMapOverlay?.style),
    overlayColor: safeString(giftMapOverlay?.color),
    overlayIcon: safeString(giftMapOverlay?.icon),
    giftCare: safeString(support.giftCare || support.giftMap?.care),
    giftPriority: toNumber(support.giftPriority || support.giftMap?.priority, 0),
    xp: xpAward,
    xpBase: baseXp,
    miaPoints: toNumber(support.miaPoints, 0),
    power: totalCoins,
    teamPoints: profileTeamPoints,
    teamId: safeString(input.teamId, "team_prstitel"),
    rewards: profileRewards,
    giftLevel: level.giftLevel,
    giftLevelLabel: level.giftLevelLabel,
    cumulativeXp: level.cumulativeXp,
    comboEligible: combo.comboEligible,
    comboTier: combo.comboTier,
    comboLabel: combo.comboLabel,
    comboCount: combo.comboCount,
    streakDays: toNumber(supporter.streakDays, 0),
    streakBonusPct,
    voiceReaction: reactions.voiceReaction,
    videoReaction: reactions.videoReaction,
    avatarFlyby: reactions.avatarFlyby,
    aiText: reactions.aiText,
    animation: {
      effectProgram: safeString(giftProfile.effectProgram, "generic_support"),
      animationOwner: safeString(giftProfile.animationOwner, "kojnozout"),
      variantIndex: toNumber(animation.variantIndex, 0) || null,
      kojMood: safeString(animation.kojMood)
    },
    duelImpact: {
      power: totalCoins,
      side: "local"
    },
    communityImpact: {
      bowlDelta: Math.max(0, Math.min(12, Math.floor(totalCoins / 100) + 1)),
      bondDelta: Math.max(0, Math.min(5, totalCoins / 500))
    },
    leaderboard: {
      hallOfFameEligible: streamTier === "T6"
    },
    bossEvent: reactions.bossEvent,
    bossBanner: reactions.bossBanner,
    miaInterrupt: reactions.miaInterrupt,
    duelEligible: reactions.duelEligible,
    mappingSource: safeString(giftProfile.mappingSource),
    mappingConfidence: toNumber(giftProfile.mappingConfidence, 0)
  };
}

module.exports = {
  GIFT_ECONOMY_VERSION,
  COIN_TIER_THRESHOLDS,
  GIFT_LEVELS,
  COMBO_THRESHOLDS,
  STREAK_BONUS,
  normalizeStreamTier,
  resolveStreamTierFromCoins,
  mapStreamTierToObsTier,
  resolveGiftLevel,
  resolveComboTier,
  resolveStreakBonusPct,
  applyXpBonus,
  resolveReactionChannels,
  resolveBossPresentationPolicy,
  buildComboOverlayPayload,
  buildBossOverlayPatch,
  buildResolvedGiftContext,
  BOSS_EVENT_BY_TIER
};
