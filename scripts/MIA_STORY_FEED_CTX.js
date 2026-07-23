"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped story-feed host bindings for createStoryFeedRuntime.
 */

function buildStoryFeedCtx(host = {}) {
  const { core = {}, modules = {}, state = {}, handlers = {}, media = {} } = host;

  return {
    writeLog: core.writeLog,
    safeString: core.safeString,
    getUserLabel: handlers.getUserLabel,
    getAvatarUrl: handlers.getAvatarUrl,
    storyAnimationEngineModule: modules.storyAnimationEngineModule,
    storyVideoEngineModule: modules.storyVideoEngineModule,
    overlayStateModule: modules.overlayStateModule,
    getOverlayState: state.getOverlayState,
    runtimeConfig: core.runtimeConfig,
    videoEngine: resolveRuntimeGetter(media.getVideoEngine, media.videoEngine),
    miaEyes: resolveRuntimeGetter(media.getMiaEyes, media.miaEyes),
    executeOverlay: handlers.executeOverlay
  };
}

module.exports = { buildStoryFeedCtx };
