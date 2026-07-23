"use strict";

/**
 * Intent Resolver
 * - čte overlayPayload.meta.intent
 * - rozhoduje co má OBS nebo runtime udělat
 */

function resolveIntent(actionResult = {}) {
  const meta = actionResult?.meta || {};
  const intent = meta.intent || null;

  if (!intent) {
    return {
      type: "none"
    };
  }

  switch (intent) {
    case "switch_scene":
      return {
        type: "scene",
        sceneMode: meta.sceneMode || "default"
      };

    case "battle_start":
      return {
        type: "battle",
        mode: "start"
      };

    case "battle_end":
      return {
        type: "battle",
        mode: "end"
      };

    default:
      return {
        type: "unknown",
        intent
      };
  }
}

module.exports = {
  resolveIntent
};