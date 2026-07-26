"use strict";

/**
 * Engine 2.0 — Platform Renderer.
 * Pipeline: GameState snapshot → Visibility → Projection → render payload.
 */

const { PLATFORM_IDS } = require("../platform-projection");

function createPlatformRenderer(deps = {}) {
  const gameState = deps.gameState;
  const visibilityEngine = deps.visibilityEngine;
  const project = deps.projectForPlatform;

  if (!gameState || typeof gameState.getSnapshot !== "function") {
    throw new Error("PlatformRenderer requires gameState with getSnapshot()");
  }
  if (!visibilityEngine || typeof visibilityEngine.filter !== "function") {
    throw new Error("PlatformRenderer requires visibilityEngine with filter()");
  }
  if (typeof project !== "function") {
    throw new Error("PlatformRenderer requires projectForPlatform function");
  }

  return {
    render(platform) {
      const id = String(platform || "").toLowerCase();
      const snapshot = gameState.getSnapshot();
      const visible = visibilityEngine.filter(snapshot, { platform: id });
      const payload = project(visible, id);
      return Object.freeze({
        platform: id,
        version: snapshot.version,
        payload,
        renderedAt: Date.now()
      });
    },

    renderAll(platforms = PLATFORM_IDS) {
      return platforms.map((platform) => this.render(platform));
    }
  };
}

module.exports = {
  createPlatformRenderer
};
