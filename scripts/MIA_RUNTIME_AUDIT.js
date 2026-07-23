"use strict";

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function buildEngagementTotals(entries = []) {
  const totals = { like: 0, follow: 0, share: 0, comment: 0, xpFromT0: 0 };

  for (const row of entries) {
    const counts = row?.engagementCounts || {};
    totals.like += toNumber(counts.like, 0);
    totals.follow += toNumber(counts.follow, 0);
    totals.share += toNumber(counts.share, 0);
    totals.comment += toNumber(counts.comment, 0);
  }

  totals.xpFromT0 =
    totals.like + totals.follow * 3 + totals.share * 2 + totals.comment;

  return totals;
}

function buildRuntimeAuditSnapshot(ctx = {}) {
  const giftEconomy =
    ctx.giftEconomy && typeof ctx.giftEconomy === "object" ? ctx.giftEconomy : {};
  const entries = Array.isArray(giftEconomy.entries) ? giftEconomy.entries : [];
  const lastGiftMapping =
    ctx.lastGiftMapping && typeof ctx.lastGiftMapping === "object"
      ? ctx.lastGiftMapping
      : null;
  const hostMode = ctx.hostMode && typeof ctx.hostMode === "object" ? ctx.hostMode : null;
  const teamScore =
    ctx.teamScore && typeof ctx.teamScore === "object" ? ctx.teamScore : null;

  const topSupporters = entries.slice(0, 8).map((row) => ({
    userLabel: safeString(row.userLabel, "Divák"),
    cumulativeXp: toNumber(row.cumulativeXp, 0),
    giftLevel: toNumber(row.giftLevel, 1),
    giftLevelLabel: safeString(row.giftLevelLabel, "Nováček"),
    giftCount: toNumber(row.giftCount, 0),
    engagementCounts: {
      like: toNumber(row.engagementCounts?.like, 0),
      follow: toNumber(row.engagementCounts?.follow, 0),
      share: toNumber(row.engagementCounts?.share, 0),
      comment: toNumber(row.engagementCounts?.comment, 0)
    },
    lastEngagementType: safeString(row.lastEngagementType),
    updatedAt: toNumber(row.updatedAt, 0)
  }));

  return {
    version: 1,
    updatedAt: Date.now(),
    supporterCount: toNumber(giftEconomy.count, entries.length),
    engagementTotals: buildEngagementTotals(entries),
    topSupporters,
    lastGiftMapping: lastGiftMapping
      ? {
          giftName: safeString(lastGiftMapping.giftName),
          totalCoins: toNumber(lastGiftMapping.totalCoins, 0),
          streamTier: safeString(lastGiftMapping.streamTier),
          canonicalKey: safeString(lastGiftMapping.canonicalKey),
          mappingSource: safeString(lastGiftMapping.mappingSource),
          mappingConfidence: toNumber(lastGiftMapping.mappingConfidence, 0),
          at: toNumber(lastGiftMapping.at, 0),
          atIso: safeString(lastGiftMapping.atIso)
        }
      : null,
    hostMode: hostMode
      ? {
          active: Boolean(hostMode.active || hostMode.badge === "HOST"),
          label: safeString(hostMode.label),
          badge: safeString(hostMode.badge),
          worldMode: safeString(hostMode.worldMode || ctx.worldMode)
        }
      : null,
    teamScore: teamScore
      ? {
          localTeamId: safeString(teamScore.localTeamId, "team_prstitel"),
          hostTeamId: safeString(teamScore.hostTeamId, "team_mia_host"),
          localPoints: toNumber(teamScore.localPoints, 0),
          hostPoints: toNumber(teamScore.hostPoints, 0),
          splitPct: toNumber(teamScore.splitPct, 0),
          lastAwardAt: toNumber(teamScore.lastAwardAt, 0)
        }
      : null
  };
}

module.exports = {
  buildEngagementTotals,
  buildRuntimeAuditSnapshot
};
