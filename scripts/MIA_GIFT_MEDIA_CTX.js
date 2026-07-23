"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped gift-media host bindings for createGiftMediaRuntime.
 */

function buildGiftMediaCtx(host = {}) {
  const { core = {}, modules = {}, state = {}, handlers = {}, overlay = {} } = host;

  return {
    writeLog: core.writeLog,
    safeString: core.safeString,
    getUserLabel: handlers.getUserLabel,
    getAvatarUrl: handlers.getAvatarUrl,
    giftPresentationModule: modules.giftPresentationModule,
    scheduleStoryAnimationAfterFeed: resolveRuntimeGetter(
      handlers.getScheduleStoryAnimationAfterFeed,
      handlers.scheduleStoryAnimationAfterFeed
    ),
    animationReactionModule: modules.animationReactionModule,
    overlayStateModule: modules.overlayStateModule,
    giftAnimationContextModule: modules.giftAnimationContextModule,
    getOverlayState: state.getOverlayState,
    overlayStateCache: resolveRuntimeGetter(overlay.getOverlayStateCache, overlay.overlayStateCache),
    invalidateOverlayStateCache: handlers.invalidateOverlayStateCache,
    mediaOrchestratorModule: modules.mediaOrchestratorModule,
    giftMapModule: modules.giftMapModule,
    giftVisualComposerModule: modules.giftVisualComposerModule,
    mediaCatalogModule: modules.mediaCatalogModule,
    getKojnozoutState: state.getKojnozoutState,
    getStreamState: state.getStreamState,
    viewerStoryModule: modules.viewerStoryModule,
    storyAnimationEngineModule: modules.storyAnimationEngineModule
  };
}

module.exports = { buildGiftMediaCtx };
