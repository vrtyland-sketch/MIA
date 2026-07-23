"use strict";

/**
 * Assemble grouped story-feed host bindings from flat index bindings.
 */

function buildStoryFeedHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      writeLog: b.writeLog,
      safeString: b.safeString,
      runtimeConfig: b.runtimeConfig
    },
    modules: {
      storyAnimationEngineModule: b.storyAnimationEngineModule,
      storyVideoEngineModule: b.storyVideoEngineModule,
      overlayStateModule: b.overlayStateModule
    },
    state: {
      getOverlayState: b.getOverlayState
    },
    handlers: {
      getUserLabel: b.getUserLabel,
      getAvatarUrl: b.getAvatarUrl,
      executeOverlay: b.executeOverlay
    },
    media: {
      getVideoEngine: b.getVideoEngine,
      getMiaEyes: b.getMiaEyes
    }
  };
}

module.exports = { buildStoryFeedHost };
