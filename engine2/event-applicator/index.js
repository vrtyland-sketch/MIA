"use strict";

/**
 * Engine 2.0 — Event → GameState applicator stub (E2).
 * Applies minimal normalized gift/comment events into in-memory stub state.
 * Used only behind MIA_ENGINE2_STUB=1 — never wired to live ingest.
 */

const MAX_RECENT_GIFTS = 20;
const MAX_RECENT_CHAT = 50;

function createStubState(seed = {}) {
  return {
    koj: { mood: "calm", bowlPercent: 50, ...(seed.koj || {}) },
    world: { mode: "home", ...(seed.world || {}) },
    arena: { ...(seed.arena || {}) },
    economy: {
      miaPoints: 0,
      recentGifts: [],
      ...(seed.economy || {})
    },
    chat: { recent: [], ...(seed.chat || {}) },
    obs: { scene: "main", mediaQueue: [], ...(seed.obs || {}) },
    debug: { queueDepth: 0, health: "ok", engine2: true, ...(seed.debug || {}) }
  };
}

function deriveMiaPointsFromSupport(support = {}) {
  const explicit = Number(support.miaPoints);
  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.floor(explicit);
  }
  const totalCoins = Number(support.totalCoins);
  if (Number.isFinite(totalCoins) && totalCoins > 0) {
    return Math.max(1, Math.floor(totalCoins));
  }
  const coins = Number(support.coins);
  const repeat = Number(support.repeatCount) || 1;
  if (Number.isFinite(coins) && coins > 0) {
    return Math.max(1, Math.floor(coins * repeat));
  }
  return 1;
}

function applyGift(state, event) {
  const support = event.support || {};
  const delta = deriveMiaPointsFromSupport(support);
  const user =
    event.user?.nickname || event.user?.username || event.user?.displayName || "viewer";
  const giftName = support.giftName || "gift";

  state.economy.miaPoints = (state.economy.miaPoints || 0) + delta;
  const entry = Object.freeze({
    user,
    giftName,
    miaPoints: delta,
    eventId: event.eventId || null,
    ts: event.ts || Date.now()
  });
  state.economy.recentGifts = [entry, ...(state.economy.recentGifts || [])].slice(
    0,
    MAX_RECENT_GIFTS
  );
  state.koj = { ...state.koj, mood: "happy" };
  state.obs = {
    ...state.obs,
    scene: "gift-overlay",
    mediaQueue: [...(state.obs.mediaQueue || []), `stub:${giftName}`]
  };
  return { applied: true, eventType: "GIFT", deltaMiaPoints: delta };
}

function applyComment(state, event) {
  const user =
    event.user?.nickname || event.user?.username || event.user?.displayName || "viewer";
  const text = String(event.message || event.content || "").trim() || "(empty)";
  const entry = Object.freeze({
    user,
    text,
    eventId: event.eventId || null,
    ts: event.ts || Date.now()
  });
  state.chat.recent = [entry, ...(state.chat.recent || [])].slice(0, MAX_RECENT_CHAT);
  return { applied: true, eventType: "COMMENT" };
}

function applyNormalizedEvent(state, event) {
  if (!state || typeof state !== "object") {
    throw new Error("event-applicator: state required");
  }
  if (!event || typeof event !== "object") {
    throw new Error("event-applicator: event required");
  }

  const eventType = String(event.eventType || "").toUpperCase();
  switch (eventType) {
    case "GIFT":
      return applyGift(state, event);
    case "COMMENT":
      return applyComment(state, event);
    default:
      return { applied: false, eventType, reason: "unsupported_stub_event" };
  }
}

module.exports = {
  createStubState,
  applyNormalizedEvent,
  deriveMiaPointsFromSupport
};
