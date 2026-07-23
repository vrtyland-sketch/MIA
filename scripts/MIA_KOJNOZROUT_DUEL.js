"use strict";

/**
 * TikTok duel — ne deathmatch, ale závod o MIA body v časovém limitu.
 * Diváci plní batoh, itemy a akce přidávají body týmu streamu.
 */

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function nowTs() {
  return Date.now();
}

function createDuelSide(seed = {}) {
  return {
    label: safeString(seed.label, "Stream"),
    streamId: safeString(seed.streamId, "local"),
    miaPoints: toNumber(seed.miaPoints, 0),
    giftPoints: toNumber(seed.giftPoints, 0),
    chatPoints: toNumber(seed.chatPoints, 0),
    likePoints: toNumber(seed.likePoints, 0),
    followPoints: toNumber(seed.followPoints, 0),
    sharePoints: toNumber(seed.sharePoints, 0),
    itemBonusPoints: toNumber(seed.itemBonusPoints, 0),
    contributors: seed.contributors && typeof seed.contributors === "object" ? seed.contributors : {}
  };
}

function createDuelState(seed = {}) {
  return {
    active: Boolean(seed.active),
    phase: safeString(seed.phase, "idle"),
    startedAt: toNumber(seed.startedAt, 0),
    endsAt: toNumber(seed.endsAt, 0),
    durationMs: toNumber(seed.durationMs, 300000),
    localSide: createDuelSide(seed.localSide || { label: "Náš Kojnožrout", streamId: "local" }),
    opponentSide: createDuelSide(
      seed.opponentSide || { label: "Soupeř", streamId: "opponent" }
    ),
    peerUrl: safeString(seed.peerUrl, ""),
    winner: seed.winner || null,
    lastEventAt: toNumber(seed.lastEventAt, 0)
  };
}

function bumpContributor(side, userLabel, points) {
  const key = safeString(userLabel, "anonymous").toLowerCase();
  if (!side.contributors[key]) {
    side.contributors[key] = { userLabel: safeString(userLabel, key), points: 0 };
  }
  side.contributors[key].points = toNumber(side.contributors[key].points, 0) + points;
}

function startDuel(currentState = {}, options = {}) {
  const durationMs = Math.max(30000, toNumber(options.durationMs, 300000));
  const now = nowTs();

  return createDuelState({
    active: true,
    phase: "active",
    startedAt: now,
    endsAt: now + durationMs,
    durationMs,
    localSide: createDuelSide({
      label: safeString(options.localLabel, "Náš Kojnožrout"),
      streamId: safeString(options.localStreamId, "local"),
      miaPoints: 0
    }),
    opponentSide: createDuelSide({
      label: safeString(options.opponentLabel, "Soupeř"),
      streamId: safeString(options.opponentStreamId, "opponent"),
      miaPoints: toNumber(options.opponentSeedPoints, 0)
    }),
    peerUrl: safeString(options.peerUrl, ""),
    winner: null
  });
}

function reportOpponentPoints(currentState = {}, points = 0) {
  const state = createDuelState(currentState);
  if (!state.active) return state;
  state.opponentSide.miaPoints = toNumber(state.opponentSide.miaPoints, 0) + Math.max(0, points);
  state.lastEventAt = nowTs();
  return state;
}

function ingestDuelContribution(currentState = {}, payload = {}) {
  const state = createDuelState(currentState);
  if (!state.active || state.phase !== "active") {
    return { state, applied: false, reason: "duel_not_active" };
  }

  if (nowTs() >= state.endsAt) {
    return { state: finishDuel(state), applied: false, reason: "duel_expired" };
  }

  const sideKey = safeString(payload.side, "local").toLowerCase() === "opponent"
    ? "opponentSide"
    : "localSide";
  const side = state[sideKey];
  const eventType = safeString(payload.eventType).toUpperCase();
  const miaPoints = Math.max(0, toNumber(payload.miaPoints, 0));
  const itemPower = Math.max(0, toNumber(payload.itemPower, 0));
  const userLabel = safeString(payload.userLabel, "anonymous");

  let appliedPoints = miaPoints + itemPower;

  if (eventType === "LIKE") {
    appliedPoints = Math.max(appliedPoints, 1.5);
    side.likePoints = toNumber(side.likePoints, 0) + appliedPoints;
  } else if (eventType === "FOLLOW") {
    appliedPoints = Math.max(appliedPoints, 3);
    side.followPoints = toNumber(side.followPoints, 0) + appliedPoints;
  } else if (eventType === "SHARE") {
    appliedPoints = Math.max(appliedPoints, 2);
    side.sharePoints = toNumber(side.sharePoints, 0) + appliedPoints;
  } else if (eventType === "COMMENT") {
    appliedPoints = Math.max(appliedPoints, 2);
    side.chatPoints = toNumber(side.chatPoints, 0) + appliedPoints;
  } else if (eventType === "GIFT") {
    side.giftPoints = toNumber(side.giftPoints, 0) + appliedPoints;
  }

  if (itemPower > 0) {
    side.itemBonusPoints = toNumber(side.itemBonusPoints, 0) + itemPower;
  }

  side.miaPoints = toNumber(side.miaPoints, 0) + appliedPoints;
  bumpContributor(side, userLabel, appliedPoints);
  state.lastEventAt = nowTs();

  return { state, applied: true, appliedPoints, side: sideKey };
}

function finishDuel(currentState = {}) {
  const state = createDuelState(currentState);
  if (!state.active && state.phase === "finished") return state;

  const localPoints = toNumber(state.localSide.miaPoints, 0);
  const opponentPoints = toNumber(state.opponentSide.miaPoints, 0);

  state.active = false;
  state.phase = "finished";
  state.winner =
    localPoints === opponentPoints
      ? "draw"
      : localPoints > opponentPoints
        ? "local"
        : "opponent";

  return state;
}

function tickDuel(currentState = {}) {
  const state = createDuelState(currentState);
  if (!state.active) return state;
  if (nowTs() < state.endsAt) return state;
  return finishDuel(state);
}

function resolvePowerBar(localPoints = 0, opponentPoints = 0) {
  const local = Math.max(0, toNumber(localPoints, 0));
  const opponent = Math.max(0, toNumber(opponentPoints, 0));
  const total = local + opponent;

  if (total <= 0) {
    return { localPct: 50, opponentPct: 50, total: 0 };
  }

  const localPct = Math.round((local / total) * 1000) / 10;
  return {
    localPct,
    opponentPct: Math.round((100 - localPct) * 10) / 10,
    total: round1(total)
  };
}

function getDuelSnapshot(currentState = {}) {
  const state = tickDuel(currentState);
  const now = nowTs();
  const remainingMs = state.active ? Math.max(0, state.endsAt - now) : 0;
  const localPoints = round1(state.localSide.miaPoints);
  const opponentPoints = round1(state.opponentSide.miaPoints);
  const powerBar = resolvePowerBar(localPoints, opponentPoints);

  return {
    active: state.active,
    phase: state.phase,
    durationMs: state.durationMs,
    remainingSec: Math.ceil(remainingMs / 1000),
    startedAt: state.startedAt,
    endsAt: state.endsAt,
    winner: state.winner,
    powerBar,
    local: {
      label: state.localSide.label,
      miaPoints: localPoints,
      giftPoints: round1(state.localSide.giftPoints),
      chatPoints: round1(state.localSide.chatPoints),
      likePoints: round1(state.localSide.likePoints),
      followPoints: round1(state.localSide.followPoints),
      sharePoints: round1(state.localSide.sharePoints),
      itemBonusPoints: round1(state.localSide.itemBonusPoints)
    },
    opponent: {
      label: state.opponentSide.label,
      miaPoints: opponentPoints,
      giftPoints: round1(state.opponentSide.giftPoints),
      chatPoints: round1(state.opponentSide.chatPoints),
      likePoints: round1(state.opponentSide.likePoints),
      followPoints: round1(state.opponentSide.followPoints),
      sharePoints: round1(state.opponentSide.sharePoints),
      itemBonusPoints: round1(state.opponentSide.itemBonusPoints)
    },
    lead:
      state.localSide.miaPoints === state.opponentSide.miaPoints
        ? "tie"
        : state.localSide.miaPoints > state.opponentSide.miaPoints
          ? "local"
          : "opponent",
    peerUrl: state.peerUrl || null
  };
}

function round1(value) {
  return Math.round(toNumber(value, 0) * 10) / 10;
}

function exportLocalSide(currentState = {}) {
  const state = createDuelState(currentState);
  return {
    streamId: state.localSide.streamId,
    label: state.localSide.label,
    miaPoints: round1(state.localSide.miaPoints),
    giftPoints: round1(state.localSide.giftPoints),
    chatPoints: round1(state.localSide.chatPoints),
    likePoints: round1(state.localSide.likePoints),
    itemBonusPoints: round1(state.localSide.itemBonusPoints),
    duelActive: state.active,
    phase: state.phase,
    endsAt: state.endsAt,
    exportedAt: nowTs()
  };
}

function syncOpponentFromPeer(currentState = {}, peerExport = {}) {
  const state = createDuelState(currentState);
  if (!state.active) return { state, synced: false, reason: "duel_not_active" };

  state.opponentSide = createDuelSide({
    label: safeString(peerExport.label, state.opponentSide.label),
    streamId: safeString(peerExport.streamId, state.opponentSide.streamId),
    miaPoints: toNumber(peerExport.miaPoints, state.opponentSide.miaPoints),
    giftPoints: toNumber(peerExport.giftPoints, state.opponentSide.giftPoints),
    chatPoints: toNumber(peerExport.chatPoints, state.opponentSide.chatPoints),
    likePoints: toNumber(peerExport.likePoints, state.opponentSide.likePoints),
    itemBonusPoints: toNumber(
      peerExport.itemBonusPoints,
      state.opponentSide.itemBonusPoints
    ),
    contributors: state.opponentSide.contributors
  });
  state.lastEventAt = nowTs();

  return { state, synced: true };
}

module.exports = {
  createDuelState,
  startDuel,
  reportOpponentPoints,
  ingestDuelContribution,
  finishDuel,
  tickDuel,
  getDuelSnapshot,
  resolvePowerBar,
  exportLocalSide,
  syncOpponentFromPeer
};
