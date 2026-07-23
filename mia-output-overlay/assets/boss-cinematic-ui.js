(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.MIA_BOSS_CINEMATIC_UI = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function safeString(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function buildBossCinematicModel(payload = {}) {
    if (!payload || payload.active === false) {
      return { visible: false };
    }

    const kind = safeString(payload.kind, "MEGA_BOSS").toUpperCase();
    const tier = safeString(payload.tier || payload.meta?.streamTier, "T5").toUpperCase();
    const holdUntilTs = toNumber(payload.holdUntilTs, 0);
    const holdMs = Math.max(4000, toNumber(payload.holdMs, 9500));
    const remainingMs = holdUntilTs > 0 ? Math.max(0, holdUntilTs - Date.now()) : holdMs;

    if (remainingMs <= 0 && !payload.momentId) {
      return { visible: false };
    }

    const isLegend = kind === "LEGEND" || tier === "T6";
    const badge = isLegend ? "LEGENDA" : "MEGA BOSS";
    const title = safeString(payload.title, isLegend ? "LEGENDA STREAMU" : "MEGA BOSS");
    const subtext = safeString(payload.subtext);
    const userLabel = safeString(payload.userLabel);
    const giftName = safeString(payload.giftName);
    const accent = safeString(payload.accent, isLegend ? "#ffd060" : "#ff6040");
    const glow = safeString(
      payload.glow,
      isLegend ? "rgba(255,208,96,0.55)" : "rgba(255,96,64,0.5)"
    );
    const heroImageUrl = safeString(payload.heroImageUrl);
    const miaPoints = toNumber(payload.miaPoints ?? payload.meta?.miaPoints, 0);

    let detailLine = subtext;
    if (userLabel && giftName) {
      detailLine = `${userLabel} · ${giftName}`;
    } else if (userLabel) {
      detailLine = userLabel;
    } else if (giftName) {
      detailLine = giftName;
    }

    return {
      visible: true,
      momentId: safeString(payload.momentId),
      kind,
      tier,
      badge,
      title,
      detailLine,
      pointsLine: miaPoints > 0 ? `+${Math.round(miaPoints)} MIA bodů` : "",
      accent,
      glow,
      heroImageUrl,
      isLegend,
      isMegaBoss: !isLegend,
      holdMs,
      remainingMs,
      particleBurst: isLegend ? 220 : 160,
      ringScale: isLegend ? 1.08 : 1
    };
  }

  return {
    buildBossCinematicModel
  };
});
