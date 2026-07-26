"use strict";

/**
 * Engine 2.0 — Visibility Engine.
 * Decides what each platform channel may see; strips coin/gift value fields.
 */

const { stripValueFieldsForPublic } = require("../../scripts/MIA_OVERLAY_PUBLIC_RESPONSE");

const PLATFORMS = Object.freeze(["tiktok", "kick", "obs", "admin"]);

function cloneSnapshot(snapshot) {
  return JSON.parse(JSON.stringify(snapshot));
}

function createVisibilityEngine(options = {}) {
  const strip =
    typeof options.stripValueFields === "function"
      ? options.stripValueFields
      : stripValueFieldsForPublic;

  return {
    filter(snapshot, { platform } = {}) {
      const id = String(platform || "tiktok").toLowerCase();
      if (!PLATFORMS.includes(id)) {
        throw new Error(`visibility: unknown platform "${platform}"`);
      }

      const sanitized = strip(cloneSnapshot(snapshot));

      switch (id) {
        case "tiktok":
          return Object.freeze({
            platform: id,
            koj: sanitized.koj || {},
            world: sanitized.world || {},
            economy: sanitized.economy || {},
            chat: sanitized.chat || { recent: [] },
            recentGifts: sanitized.economy?.recentGifts || []
          });
        case "kick":
          return Object.freeze({
            platform: id,
            koj: sanitized.koj || {},
            chat: sanitized.chat || { recent: [] },
            economy: { miaPoints: sanitized.economy?.miaPoints ?? 0 }
          });
        case "obs":
          return Object.freeze({
            platform: id,
            koj: { mood: sanitized.koj?.mood || "calm" },
            obs: sanitized.obs || { scene: "main", mediaQueue: [] }
          });
        case "admin":
          return Object.freeze({
            platform: id,
            koj: sanitized.koj || {},
            arena: sanitized.arena || {},
            world: sanitized.world || {},
            economy: sanitized.economy || {},
            debug: sanitized.debug || {},
            chat: sanitized.chat || { recent: [] }
          });
        default:
          return Object.freeze({ platform: id });
      }
    }
  };
}

module.exports = {
  PLATFORMS,
  createVisibilityEngine
};
