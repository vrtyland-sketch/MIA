"use strict";

/**
 * Voice playback hold window — delegates to MIA_RUNTIME_PERF.computeVoiceHoldUntilTs.
 */

function createVoiceTiming(deps = {}) {
  const { runtimePerfModule, getEnv } = deps;

  function voiceHoldUntilTs(now, durationMs) {
    if (typeof runtimePerfModule?.computeVoiceHoldUntilTs === "function") {
      const env = typeof getEnv === "function" ? getEnv() : process.env;
      return runtimePerfModule.computeVoiceHoldUntilTs(now, durationMs, env);
    }
    const estimate = Number(durationMs || 0);
    return now + (estimate > 0 ? Math.max(estimate + 1200, 3500) : 8500);
  }

  return { voiceHoldUntilTs };
}

module.exports = { createVoiceTiming };
