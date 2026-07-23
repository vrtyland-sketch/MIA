"use strict";

const textBankModule = require("./MIA_TEXT_BANK");

const TEXT_BANK = textBankModule.TEXT_BANK || {};

const ACHIEVEMENT_STYLE = {
  accent: "#ffd86f",
  glow: "rgba(255,214,111,0.48)",
  holdMs: 7200
};

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function firstName(userLabel = "") {
  return safeString(userLabel).split(/\s+/).filter(Boolean)[0] || "někdo";
}

function applyTemplate(template, vars = {}) {
  let text = safeString(template);
  for (const [key, value] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, "g"), safeString(value));
  }
  return text.replace(/\s+/g, " ").trim();
}

function pickLine(bankKey, vars, fallback) {
  const variants = Array.isArray(TEXT_BANK[bankKey]) ? TEXT_BANK[bankKey] : [];
  if (variants.length === 0) {
    return applyTemplate(fallback, vars);
  }
  const template = variants[Math.floor(Math.random() * variants.length)];
  return applyTemplate(template, vars);
}

function buildAchievementComboMoment(achievement = {}, ctx = {}) {
  const id = safeString(achievement.id);
  const label = safeString(achievement.label, id);
  if (!id || !label) return null;

  const userLabel = safeString(ctx.userLabel, "Divák");

  return {
    kind: "ACHIEVEMENT",
    title: label,
    subtext: userLabel,
    count: 0,
    accent: ACHIEVEMENT_STYLE.accent,
    glow: ACHIEVEMENT_STYLE.glow,
    holdMs: ACHIEVEMENT_STYLE.holdMs,
    source: "achievement",
    priority: 4,
    meta: {
      achievementId: id,
      achievementLabel: label,
      userLabel
    }
  };
}

function buildAchievementKojOverlay(achievement = {}, ctx = {}) {
  const id = safeString(achievement.id);
  const label = safeString(achievement.label, id);
  if (!id || !label) return null;

  const actor = firstName(ctx.userLabel);
  const text = pickLine(
    "koj_achievement_unlock",
    { name: actor, label },
    "{name}, odemkl jsi milník {label}! Jsem hrdý!"
  );

  return {
    owner: "kojnozout",
    route: "community",
    title: "Kojnožrout",
    text,
    subtext: label,
    action: "achievement_unlock",
    mood: "celebrate",
    stage: "celebrate",
    priority: 6,
    holdMs: 6200,
    meta: {
      achievementId: id,
      achievementLabel: label,
      achievementUnlock: true,
      animationHint: {
        owner: "kojnozout",
        visualFamily: "celebrate",
        effectProgram: "achievement_unlock",
        moodHint: "celebrate",
        label,
        tags: ["achievement", "celebrate"]
      }
    }
  };
}

function buildAchievementVoicePlan(achievement = {}, ctx = {}) {
  const id = safeString(achievement.id);
  const label = safeString(achievement.label, id);
  if (!id || !label) return null;

  const actor = firstName(ctx.userLabel);
  const text = pickLine(
    "koj_achievement_voice",
    { name: actor, label },
    "{name}, odemkl jsi milník {label}!"
  );

  return {
    shouldSpeak: true,
    voiceMode: "primary",
    text,
    voiceSpeaker: "kojnozout",
    primaryOwner: "kojnozout",
    companionOwner: "mia",
    companionVoiceText: ""
  };
}

function buildAchievementDelivery(achievement = {}, ctx = {}) {
  if (!achievement || achievement.public === false) {
    return {
      comboMoment: null,
      kojOverlay: null,
      voicePlan: null
    };
  }

  return {
    comboMoment: buildAchievementComboMoment(achievement, ctx),
    kojOverlay: buildAchievementKojOverlay(achievement, ctx),
    voicePlan: buildAchievementVoicePlan(achievement, ctx)
  };
}

module.exports = {
  ACHIEVEMENT_STYLE,
  buildAchievementComboMoment,
  buildAchievementKojOverlay,
  buildAchievementVoicePlan,
  buildAchievementDelivery
};
