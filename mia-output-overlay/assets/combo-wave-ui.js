(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.MIA_COMBO_WAVE_UI = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function safeString(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function extractTopParticipants(participants = {}, limit = 3) {
    if (!participants || typeof participants !== "object") return [];
    return Object.values(participants)
      .filter((row) => row && safeString(row.userLabel))
      .sort((a, b) => toNumber(b.points, 0) - toNumber(a.points, 0))
      .slice(0, Math.max(1, limit))
      .map((row) => safeString(row.userLabel));
  }

  function buildWaveHudModel(spam = {}) {
    if (!spam || !spam.active) {
      return { visible: false };
    }

    const target = Math.max(
      1,
      toNumber(spam.targetRewardPoints, toNumber(spam.pointsToNextReward, 1))
    );
    const current = Math.max(0, toNumber(spam.totalPoints, 0));
    const progressPct = Math.min(100, Math.round((current / target) * 100));
    const confirmed = Boolean(spam.spamConfirmed);
    const remainingSec = Math.max(0, toNumber(spam.remainingWindowSec, 0));
    const urgent = confirmed && remainingSec > 0 && remainingSec <= 5;
    const nextTier = safeString(spam.nextRewardTier).toUpperCase() || null;
    const lastTier = safeString(spam.lastRewardTierGranted).toUpperCase() || null;
    const participantNames = extractTopParticipants(spam.participants, 3);
    const participantCount = Math.max(
      toNumber(spam.participantCount, 0),
      participantNames.length
    );

    let statusLabel = "Budování vlny";
    if (confirmed && nextTier) {
      statusLabel = `Cíl ${nextTier}`;
    } else if (confirmed) {
      statusLabel = "Vlna aktivní";
    }

    const metaParts = [
      `${toNumber(spam.eventCount, 0)} dárků`,
      `${participantCount} lidí`,
      `${current} bodů`
    ];
    if (remainingSec > 0) {
      metaParts.push(`${remainingSec}s`);
    }
    if (lastTier) {
      metaParts.push(`milník ${lastTier}`);
    }

    return {
      visible: true,
      confirmed,
      urgent,
      pulse: confirmed && progressPct >= 72,
      progressPct,
      currentPoints: current,
      targetPoints: target,
      pointsToNext: Math.max(0, target - current),
      statusLabel,
      nextTier,
      lastTier,
      remainingSec,
      eventCount: toNumber(spam.eventCount, 0),
      participantCount,
      participantNames,
      metaLine: metaParts.join(" · "),
      accent: confirmed ? "#00eaff" : "#7ad7ff",
      glow: confirmed ? "rgba(0,234,255,0.42)" : "rgba(122,215,255,0.28)"
    };
  }

  function resolveSpamMomentPresentation(moment = {}) {
    const kind = safeString(moment.kind).toUpperCase();
    if (kind === "SPAM_MILESTONE") {
      return { badge: "Milník vlny", accent: "#38d976", glow: "rgba(56,217,118,0.48)" };
    }
    if (kind === "SPAM_WAVE") {
      return { badge: "Dárková vlna", accent: "#00eaff", glow: "rgba(0,234,255,0.45)" };
    }
    return null;
  }

  return {
    buildWaveHudModel,
    resolveSpamMomentPresentation,
    extractTopParticipants
  };
});
