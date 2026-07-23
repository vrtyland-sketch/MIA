(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.MIA_HOST_TEAM_UI = api;
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

  function buildHostTeamBarModel(hostMode = {}, teamScore = {}) {
    const awayActive = Boolean(hostMode?.awayActive);
    const hostModeKind = safeString(hostMode?.hostMode).toLowerCase();
    const localPoints = Math.max(0, toNumber(teamScore?.localPoints, 0));
    const hostPoints = Math.max(0, toNumber(teamScore?.hostPoints, 0));
    const splitPct = Math.max(0, toNumber(teamScore?.splitPct, 0));
    const total = localPoints + hostPoints;

    const visible =
      awayActive ||
      hostModeKind === "nejsem_tu" ||
      hostPoints > 0 ||
      splitPct > 0;

    if (!visible) {
      return { visible: false };
    }

    const localPct = total > 0 ? Math.round((localPoints / total) * 100) : 50;
    const hostPct = total > 0 ? 100 - localPct : 50;

    return {
      visible: true,
      awayActive,
      hostModeKind,
      label: safeString(hostMode?.label, awayActive ? "NEJSEM TU" : "HOST"),
      localTeamId: safeString(teamScore?.localTeamId, "team_prstitel"),
      hostTeamId: safeString(teamScore?.hostTeamId, "team_mia_host"),
      localPoints,
      hostPoints,
      localPct,
      hostPct,
      splitPct,
      totalPoints: total
    };
  }

  return { buildHostTeamBarModel };
});
