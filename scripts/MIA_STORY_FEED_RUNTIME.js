"use strict";

/**
 * Story feed delivery — milestone stories after gift/care feed events.
 */

function createStoryFeedRuntime(deps = {}) {
  const {
    writeLog,
    safeString,
    getUserLabel,
    getAvatarUrl,
    storyAnimationEngineModule,
    storyVideoEngineModule,
    overlayStateModule,
    getOverlayState,
    runtimeConfig,
    videoEngine,
    miaEyes,
    executeOverlay
  } = deps;

  function overlayStateRef() {
    return typeof getOverlayState === "function" ? getOverlayState() : {};
  }

  async function scheduleStoryAnimationAfterFeed(normalized = {}, options = {}) {
    const hasObserve =
      typeof storyAnimationEngineModule?.observeFeedAndResolveStory === "function";
    const hasPreResolved = Boolean(options.preResolved?.triggered);
    if (!hasObserve && !hasPreResolved) {
      return;
    }

    const feedType = safeString(options.feedType, "gift");
    const userLabel = getUserLabel(normalized);
    if (!userLabel) return;

    const resolved = hasPreResolved
      ? options.preResolved
      : storyAnimationEngineModule.observeFeedAndResolveStory({
            userLabel,
            feedType,
            platform: safeString(normalized.platform, "unknown")
          });

    if (!resolved?.triggered || !resolved.story) return;

    const deliveryMode =
      typeof storyAnimationEngineModule.resolveStoryDeliveryMode === "function"
        ? storyAnimationEngineModule.resolveStoryDeliveryMode(resolved.story)
        : safeString(resolved.story.deliveryMode, "obs_video");

    try {
      if (deliveryMode === "obs_video") {
        if (typeof overlayStateModule?.clearStoryVisual === "function") {
          overlayStateModule.clearStoryVisual(overlayStateRef());
        }

        if (
          !storyVideoEngineModule ||
          typeof storyVideoEngineModule.playStoryVideoSequence !== "function"
        ) {
          writeLog("mia-errors", {
            source: "story_video",
            error: "story_video_engine_missing"
          });
          return;
        }

        const result = await storyVideoEngineModule.playStoryVideoSequence({
          story: resolved.story,
          userLabel,
          runtimeConfig,
          videoEngine,
          miaEyes,
          normalizedEvent: normalized,
          executeOverlay,
          platform: safeString(normalized.platform, "unknown")
        });

        if (result?.ok) {
          if (typeof storyAnimationEngineModule.markStoryPlayed === "function") {
            storyAnimationEngineModule.markStoryPlayed(userLabel, resolved.story.id);
          }
        }

        writeLog("mia-events", {
          ts: Date.now(),
          stage: result?.ok ? "story_video_played" : "story_video_failed",
          storyId: resolved.story.id,
          userLabel,
          feedCount: resolved.feedCount,
          milestone: resolved.milestone,
          deliveryMode: "obs_video",
          beatCount: result?.beatCount || 0,
          reason: result?.reason || null
        });
        return;
      }

      if (typeof storyAnimationEngineModule.composeStoryAnimation !== "function") {
        return;
      }

      const composed = await storyAnimationEngineModule.composeStoryAnimation({
        userLabel,
        avatarUrl: getAvatarUrl(normalized),
        story: resolved.story,
        feedCount: resolved.feedCount,
        milestone: resolved.milestone,
        isRepeat: resolved.isRepeat
      });

      if (!composed?.ok || !composed.frames?.length) return;

      if (typeof overlayStateModule?.setStoryVisual === "function") {
        overlayStateModule.setStoryVisual(overlayStateRef(), {
          playbackId: composed.playbackId,
          storyId: composed.storyId,
          title: composed.title,
          intro: composed.intro,
          outro: composed.outro,
          userLabel: composed.userLabel,
          feedCount: composed.feedCount,
          milestone: composed.milestone,
          isRepeat: composed.isRepeat,
          frames: composed.frames,
          frameMs: composed.frameMs,
          avatarLoaded: composed.avatarLoaded,
          expiresAt: composed.expiresAt
        });
      }

      writeLog("mia-events", {
        ts: Date.now(),
        stage: "story_animation_composed",
        storyId: composed.storyId,
        playbackId: composed.playbackId,
        userLabel: composed.userLabel,
        feedCount: composed.feedCount,
        milestone: composed.milestone,
        frameCount: composed.frames.length,
        avatarLoaded: composed.avatarLoaded,
        deliveryMode: "png_slideshow"
      });
    } catch (err) {
      writeLog("mia-errors", {
        source: deliveryMode === "obs_video" ? "story_video" : "story_animation_compose",
        error: err.message
      });
    }
  }

  return {
    scheduleStoryAnimationAfterFeed
  };
}

module.exports = { createStoryFeedRuntime };
