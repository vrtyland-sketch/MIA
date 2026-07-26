"use strict";

/**
 * Engine 2.0 — optional admin wiring (MIA_ENGINE2_STUB=1 only).
 */

const { isEngine2StubEnabled } = require("./flag");
const { createEngine2Pipeline } = require("./index");

function buildEngine2AdminSnapshot(ctx = {}) {
  if (!isEngine2StubEnabled()) {
    return undefined;
  }

  const getKoj =
    typeof ctx.getKojnozoutState === "function"
      ? ctx.getKojnozoutState
      : () => ctx.refs?.kojnozoutState || null;

  const pipeline = createEngine2Pipeline({
    loaders: {
      loadKoj: () => {
        const raw = getKoj();
        return raw ? { mood: raw.mood || "calm", bowlPercent: raw.bowlPercent } : { mood: "calm" };
      },
      loadWorld: () => ({ mode: "home" }),
      loadArena: () => ({}),
      loadEconomy: () => ({ miaPoints: 0, coins: 999, giftValue: 500 }),
      loadChat: () => ({ recent: [] }),
      loadObs: () => ({ scene: "main", mediaQueue: [] }),
      loadDebug: () => ({ queueDepth: 0, health: "ok", engine2: true })
    }
  });

  const projections = {};
  for (const platform of pipeline.renderer.renderAll()) {
    projections[platform.platform] = platform.payload;
  }

  return {
    enabled: true,
    version: pipeline.gameState.getSnapshot().version,
    projections
  };
}

module.exports = {
  buildEngine2AdminSnapshot
};
