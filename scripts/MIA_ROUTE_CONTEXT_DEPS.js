"use strict";

/**
 * Route context deps bag — computed bridges for createRouteContextRuntime.
 */

function buildRouteContextDeps(ctx) {
  const resolveInterpreterRuntime = () =>
    typeof ctx.getInterpreterRuntime === "function"
      ? ctx.getInterpreterRuntime()
      : ctx.translationRuntime;

  return {
    ...ctx,
    getDuelStateActive: () => Boolean(ctx.getDuelState()?.active),
    bumpVoicePlaybackSeq: () => ctx.deliveryRuntime().bumpVoicePlaybackSeq(),
    setVoicePlaybackState: (next) => ctx.deliveryRuntime().setVoicePlaybackState(next),
    getInterpreterRuntime:
      typeof ctx.getInterpreterRuntime === "function"
        ? ctx.getInterpreterRuntime
        : () => ctx.translationRuntime,
    translationRuntime: resolveInterpreterRuntime()
  };
}

module.exports = { buildRouteContextDeps };
