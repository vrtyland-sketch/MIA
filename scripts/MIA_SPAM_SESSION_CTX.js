"use strict";

/**
 * Flatten grouped spam-session host bindings for configureSpamSession.
 */

function buildSpamSessionCtx(host = {}) {
  const { core = {} } = host;
  const spamConfig = core.spamConfig || {};

  return {
    windowMs: spamConfig.windowMs,
    minSequenceCount: spamConfig.minSequenceCount,
    rewardThresholds: spamConfig.rewardThresholds
  };
}

module.exports = { buildSpamSessionCtx };
