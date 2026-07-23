"use strict";

/**
 * Pořadí reakcí — kánon: nejdřív MIA, poté Kojnožrout (emoční momenty).
 */

const DEFAULT_KOJ_DELAY_MS = 3200;

const EMOTIONAL_INTENTS = new Set([
  "emotional_statement",
  "direct_statement",
  "sadness_report",
  "loss_report",
  "stress_report",
  "frustration_report",
  "relief_report"
]);

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function firstName(userLabel = "") {
  return safeString(userLabel).split(/\s+/).filter(Boolean)[0] || "kamaráde";
}

function shouldKojFollowMia(intent = {}, speaker = "mia") {
  if (safeString(speaker).toLowerCase() !== "mia") return false;
  const type = safeString(intent?.type).toLowerCase();
  if (EMOTIONAL_INTENTS.has(type)) return true;
  const emotion = safeString(intent?.emotion?.type).toLowerCase();
  return ["stress", "frustration", "joy", "relief"].includes(emotion);
}

function buildKojEmotionalCompanion(userLabel = "", intent = {}) {
  const name = firstName(userLabel);
  const emotion = safeString(intent?.emotion?.type, "neutral").toLowerCase();
  const type = safeString(intent?.type).toLowerCase();

  let text = `${name}, držím s tebou parťáka — přitulím se.`;
  let mood = "warm";

  if (type === "sadness_report" || emotion === "stress") {
    text = `${name}, přinesu imaginární ponožku štěstí. Drž se.`;
    mood = "shy";
  } else if (emotion === "frustration") {
    text = `${name}, nafouknu bříško a udělám místo na klid.`;
    mood = "calm";
  } else if (emotion === "joy" || emotion === "relief") {
    text = `${name}, tohle je hezký moment — oslavím to s tebou!`;
    mood = "celebrate";
  }

  return {
    delayMs: DEFAULT_KOJ_DELAY_MS,
    overlayPayload: {
      owner: "kojnozout",
      route: "community",
      stage: "care",
      text,
      user: userLabel,
      mood,
      holdMs: 5200,
      meta: {
        source: "reaction_order",
        miaFirst: true,
        intent: type || emotion,
        companionAfterMia: true
      }
    }
  };
}

module.exports = {
  DEFAULT_KOJ_DELAY_MS,
  EMOTIONAL_INTENTS,
  shouldKojFollowMia,
  buildKojEmotionalCompanion
};
