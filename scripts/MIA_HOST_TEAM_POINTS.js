"use strict";

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isHostTeamSplitActive(ctx = {}) {
  if (ctx.hostModeActive === true) return true;
  const badge = safeString(ctx.hostBadge).toUpperCase();
  if (badge === "HOST") return true;
  const worldMode = safeString(ctx.worldMode).toLowerCase();
  return worldMode === "nejsem_tu" || worldMode === "spinak_nejsem_tu";
}

function resolveHostTeamSplit(points = 0, ctx = {}) {
  const teamPoints = Math.max(0, toNumber(points, 0));

  if (!isHostTeamSplitActive(ctx) || teamPoints <= 0) {
    return {
      active: false,
      teamId: safeString(ctx.defaultTeamId, "team_prstitel"),
      teamPoints,
      localTeamId: safeString(ctx.defaultTeamId, "team_prstitel"),
      hostTeamId: "team_mia_host",
      localShare: teamPoints,
      hostShare: 0,
      splitPct: 0
    };
  }

  const splitPct = clamp(
    toNumber(process.env.MIA_HOST_TEAM_SPLIT_PCT, 50),
    0,
    100
  );
  const hostShare = Math.round((teamPoints * splitPct) / 100);
  const localShare = Math.max(0, teamPoints - hostShare);

  return {
    active: true,
    teamId: "team_split",
    teamPoints,
    localTeamId: safeString(ctx.defaultTeamId, "team_prstitel"),
    hostTeamId: "team_mia_host",
    localShare,
    hostShare,
    splitPct
  };
}

function createHostTeamScoreState(seed = {}) {
  return {
    localTeamId: safeString(seed.localTeamId, "team_prstitel"),
    hostTeamId: safeString(seed.hostTeamId, "team_mia_host"),
    localPoints: toNumber(seed.localPoints, 0),
    hostPoints: toNumber(seed.hostPoints, 0),
    splitPct: toNumber(seed.splitPct, 0),
    lastAwardAt: toNumber(seed.lastAwardAt, 0)
  };
}

function applyHostTeamScore(state = {}, split = {}) {
  const next = createHostTeamScoreState(state);
  if (!split?.active) {
    next.localPoints += toNumber(split?.localShare ?? split?.teamPoints, 0);
    next.splitPct = 0;
  } else {
    next.localPoints += toNumber(split.localShare, 0);
    next.hostPoints += toNumber(split.hostShare, 0);
    next.splitPct = toNumber(split.splitPct, next.splitPct);
  }
  next.lastAwardAt = Date.now();
  return next;
}

module.exports = {
  isHostTeamSplitActive,
  resolveHostTeamSplit,
  createHostTeamScoreState,
  applyHostTeamScore
};
