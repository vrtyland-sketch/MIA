"use strict";

/**
 * Phase 14b — observe hook: chat → communityMood on overlay state.
 */

const chatLexicon = require("./MIA_CHAT_LEXICON");
const overlayStateModule = require("./MIA_OVERLAY_STATE");
const moodBrain = require("../shared/mia-graphics-studio/moodBrain");

function observeCommentMood(overlayState, input = {}) {
  if (!overlayState || typeof overlayState !== "object") return null;

  const lexiconSnapshot =
    typeof chatLexicon.getLexiconSnapshot === "function"
      ? chatLexicon.getLexiconSnapshot()
      : null;
  const messagesSeen = toNumber(lexiconSnapshot?.stats?.messagesSeen, 0);
  if (messagesSeen < 4) return null;

  const now = Date.now();
  const previousSlot = overlayStateModule.getCommunityMoodSnapshot(overlayState);
  const computed = moodBrain.computeCommunityMood(
    {
      lexiconTone: lexiconSnapshot?.tone || {},
      intent: input.intent || null,
      previousSlot
    },
    now
  );
  if (!computed) return previousSlot;

  return overlayStateModule.setCommunityMood(overlayState, computed);
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

module.exports = {
  observeCommentMood
};
