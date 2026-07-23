"use strict";

/**
 * Assemble grouped gift-media host bindings from flat index bindings.
 */

function buildGiftMediaHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      writeLog: b.writeLog,
      safeString: b.safeString
    },
    modules: {
      giftPresentationModule: b.giftPresentationModule,
      animationReactionModule: b.animationReactionModule,
      overlayStateModule: b.overlayStateModule,
      giftAnimationContextModule: b.giftAnimationContextModule,
      mediaOrchestratorModule: b.mediaOrchestratorModule,
      giftMapModule: b.giftMapModule,
      giftVisualComposerModule: b.giftVisualComposerModule,
      mediaCatalogModule: b.mediaCatalogModule,
      viewerStoryModule: b.viewerStoryModule,
      storyAnimationEngineModule: b.storyAnimationEngineModule
    },
    state: {
      getOverlayState: b.getOverlayState,
      getKojnozoutState: b.getKojnozoutState,
      getStreamState: b.getStreamState
    },
    handlers: {
      getUserLabel: b.getUserLabel,
      getAvatarUrl: b.getAvatarUrl,
      getScheduleStoryAnimationAfterFeed: b.getScheduleStoryAnimationAfterFeed,
      scheduleStoryAnimationAfterFeed: b.scheduleStoryAnimationAfterFeed,
      invalidateOverlayStateCache: b.invalidateOverlayStateCache
    },
    overlay: {
      getOverlayStateCache: b.getOverlayStateCache,
      overlayStateCache: b.overlayStateCache
    }
  };
}

module.exports = { buildGiftMediaHost };
