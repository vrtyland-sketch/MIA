"use strict";

const { BOSS_EVENT_BY_TIER } = require("./MIA_GIFT_ECONOMY");

const COMBO_STYLE = {
  COMBO: { accent: "#ffb400", glow: "rgba(255,180,0,0.45)", holdMs: 6200 },
  SUPER: { accent: "#b07cff", glow: "rgba(176,124,255,0.5)", holdMs: 7600 },
  ULTIMATE: { accent: "#ff4060", glow: "rgba(255,64,96,0.55)", holdMs: 9000 },
  SPAM_WAVE: { accent: "#00eaff", glow: "rgba(0,234,255,0.45)", holdMs: 6800 },
  SPAM_MILESTONE: { accent: "#38d976", glow: "rgba(56,217,118,0.48)", holdMs: 8200 },
  BOSS: { accent: "#ff6040", glow: "rgba(255,96,64,0.5)", holdMs: 8200 }
};

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function resolveStyle(kind = "COMBO") {
  return COMBO_STYLE[kind] || COMBO_STYLE.COMBO;
}

function buildGiftComboMoment(combo = {}, ctx = {}) {
  if (!combo?.comboTier) return null;

  const style = resolveStyle(combo.comboTier);
  const userLabel = safeString(ctx.userLabel, "Divák");
  const giftName = safeString(ctx.giftName, "gift");

  return {
    kind: combo.comboTier,
    title: combo.comboLabel || `COMBO ×${combo.comboCount || "?"}`,
    subtext: `${userLabel} · ${giftName}`,
    count: toNumber(combo.comboCount, 0),
    accent: style.accent,
    glow: style.glow,
    holdMs: style.holdMs,
    source: "gift_repeat",
    priority: combo.comboTier === "ULTIMATE" ? 5 : combo.comboTier === "SUPER" ? 4 : 3
  };
}

function buildBossComboMoment(ctx = {}) {
  const tier = safeString(ctx.streamTier, "T4").toUpperCase();
  const boss = BOSS_EVENT_BY_TIER[tier];
  if (!boss && !ctx?.bossEvent && !ctx?.bossBanner) return null;

  const style = resolveStyle("BOSS");
  const rank = Number(tier.replace(/\D/g, "")) || 4;

  return {
    kind: rank >= 6 ? "LEGEND" : rank >= 5 ? "MEGA_BOSS" : "BOSS",
    title: safeString(ctx.bossBanner, boss?.banner || "BOSS EVENT"),
    subtext: `${tier} · ${safeString(ctx.giftName, "gift")}`,
    count: 0,
    accent: rank >= 6 ? "#ffd060" : style.accent,
    glow: rank >= 6 ? "rgba(255,208,96,0.55)" : style.glow,
    holdMs: rank >= 6 ? 11000 : rank >= 5 ? 9500 : style.holdMs,
    source: "boss_event",
    priority: rank >= 6 ? 7 : rank >= 5 ? 6 : 5,
    meta: {
      bossEvent: ctx.bossEvent || boss?.key || null,
      bossBanner: ctx.bossBanner || boss?.banner || null,
      streamTier: tier
    }
  };
}

function buildSpamComboMoment(spamVerdict = {}) {
  if (!spamVerdict || typeof spamVerdict !== "object") return null;

  if (spamVerdict.shouldRewardSpam && spamVerdict.rewardTier) {
    const style = resolveStyle("SPAM_MILESTONE");
    const points = toNumber(spamVerdict.totalPoints, 0);
    const participants = toNumber(
      spamVerdict.participantCount ?? spamVerdict.contributorCount,
      0
    );

    return {
      kind: "SPAM_MILESTONE",
      title: `DÁRKOVÁ VLNA · ${spamVerdict.rewardTier}`,
      subtext: `${points} bodů · ${participants} lidí`,
      count: toNumber(spamVerdict.eventCount, 0),
      accent: style.accent,
      glow: style.glow,
      holdMs: style.holdMs,
      source: "spam_reward",
      priority: 5,
      meta: {
        rewardTier: spamVerdict.rewardTier,
        totalPoints: points
      }
    };
  }

  if (spamVerdict.newlyConfirmed) {
    const style = resolveStyle("SPAM_WAVE");
    const points = toNumber(spamVerdict.totalPoints, 0);
    const participants = toNumber(
      spamVerdict.participantCount ?? spamVerdict.contributorCount,
      0
    );

    return {
      kind: "SPAM_WAVE",
      title: "DÁRKOVÁ VLNA!",
      subtext: `${toNumber(spamVerdict.eventCount, 0)} dárků · ${participants} lidí · ${points} bodů`,
      count: toNumber(spamVerdict.eventCount, 0),
      accent: style.accent,
      glow: style.glow,
      holdMs: style.holdMs,
      source: "spam_confirmed",
      priority: 4
    };
  }

  return null;
}

function pickStrongerMoment(current = null, next = null) {
  if (!next) return current;
  if (!current) return next;
  return toNumber(next.priority, 0) >= toNumber(current.priority, 0) ? next : current;
}

module.exports = {
  COMBO_STYLE,
  buildGiftComboMoment,
  buildBossComboMoment,
  buildSpamComboMoment,
  pickStrongerMoment
};
