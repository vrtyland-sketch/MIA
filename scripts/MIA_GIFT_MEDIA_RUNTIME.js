"use strict";

/**
 * Gift media experiences — visual compose, animation reaction, post-gift stories.
 */

function createGiftMediaRuntime(deps = {}) {
  const {
    writeLog,
    safeString,
    getUserLabel,
    getAvatarUrl,
    giftPresentationModule,
    scheduleStoryAnimationAfterFeed,
    animationReactionModule,
    overlayStateModule,
    giftAnimationContextModule,
    getOverlayState,
    overlayStateCache,
    invalidateOverlayStateCache,
    mediaOrchestratorModule,
    giftMapModule,
    giftVisualComposerModule,
    mediaCatalogModule,
    getKojnozoutState,
    getStreamState,
    viewerStoryModule,
    storyAnimationEngineModule
  } = deps;

  function overlayStateRef() {
    return typeof getOverlayState === "function" ? getOverlayState() : {};
  }

  function applyGiftAnimationReaction(
    normalized = {},
    actionResult = {},
    giftProfile = {},
    giftAnimation = {},
    kojMood = ""
  ) {
    if (typeof animationReactionModule?.shouldRunGiftAnimationReaction === "function") {
      if (!animationReactionModule.shouldRunGiftAnimationReaction(normalized, actionResult)) {
        return null;
      }
    }
    if (typeof animationReactionModule?.buildGiftAnimationReactionPayload !== "function") {
      return null;
    }
    if (typeof overlayStateModule?.setAnimationReaction !== "function") {
      return null;
    }

    const support = normalized?.support || {};
    const payload = animationReactionModule.buildGiftAnimationReactionPayload({
      giftProfile,
      giftAnimation,
      giftKey: giftProfile.key,
      effectProgram: giftProfile.effectProgram,
      giftName: safeString(support.giftName || normalized.giftName),
      tier: safeString(actionResult?.tier || support.tier, "T1"),
      userLabel: getUserLabel(normalized),
      mood: kojMood,
      resolveMood:
        typeof giftAnimationContextModule?.resolveGiftReactionMood === "function"
          ? (ctx, profile) => giftAnimationContextModule.resolveGiftReactionMood(ctx, profile)
          : null
    });

    if (!payload?.animationId) return null;

    overlayStateModule.setAnimationReaction(overlayStateRef(), payload);
    writeLog("mia-events", {
      ts: Date.now(),
      stage: "gift_animation_reaction",
      animationId: payload.animationId,
      effectProgram: payload.effectProgram,
      soundCue: payload.soundCue,
      giftKey: payload.giftKey
    });
    return payload;
  }

  async function scheduleGiftVisualCompose(normalized = {}, actionResult = {}) {
    const kojnozoutState = getKojnozoutState?.() || {};
    const streamState = getStreamState?.() || {};

    if (typeof mediaOrchestratorModule?.composeGiftOverlay === "function") {
      const support = normalized?.support || {};
      const giftProfile =
        typeof giftMapModule?.resolveGiftProfile === "function"
          ? giftMapModule.resolveGiftProfile(support)
          : {};

      try {
        const giftAnimation =
          typeof giftAnimationContextModule?.buildGiftAnimationContext === "function"
            ? giftAnimationContextModule.buildGiftAnimationContext(
                kojnozoutState,
                streamState,
                giftProfile
              )
            : null;

        const composed = await mediaOrchestratorModule.composeGiftOverlay(normalized, {
          ...actionResult,
          overlayPayload: actionResult?.overlayPayload,
          kojnozoutState,
          streamState,
          giftAnimation
        });

        if (!composed?.ok || !composed.imageUrl) return null;

        if (typeof overlayStateModule?.setGiftVisual === "function") {
          overlayStateModule.setGiftVisual(overlayStateRef(), {
            imageUrl: composed.imageUrl,
            text: composed.lines?.[0],
            subtext: composed.lines?.[1],
            userLabel: getUserLabel(normalized),
            giftName: safeString(support.giftName || normalized.giftName),
            tier: safeString(actionResult?.tier || support.tier, "T1"),
            variantIndex: composed.variantIndex,
            effectProgram: composed.effectProgram || giftProfile.effectProgram,
            avatarLoaded: composed.avatarLoaded,
            templateId: composed.templateId || composed.deliveryMode,
            kojMood: composed.kojMood,
            primaryNeed: composed.primaryNeed,
            expiresAt: composed.expiresAt || Date.now() + 45000
          });
        }
        applyGiftAnimationReaction(
          normalized,
          actionResult,
          giftProfile,
          giftAnimation,
          composed.kojMood
        );

        try {
          const giftAnim = require("../shared/mia-gift-animation");
          giftAnim.bindOverlayHooks({
            getOverlayState,
            overlayStateModule,
            invalidateOverlayStateCache,
            writeLog
          });
          void giftAnim.maybeQueueFromGift(
            {
              ...normalized,
              userLabel: getUserLabel(normalized),
              avatarUrl: getAvatarUrl(normalized)
            },
            actionResult,
            giftProfile
          );
        } catch (_err) {
          /* optional */
        }

        return composed;
      } catch (err) {
        writeLog("mia-errors", {
          source: "scheduleGiftVisualCompose.orchestrator",
          error: err.message
        });
      }
    }

    if (typeof giftVisualComposerModule?.composeGiftMoment !== "function") return null;
    if (
      typeof giftVisualComposerModule.shouldComposeGiftVisual === "function" &&
      !giftVisualComposerModule.shouldComposeGiftVisual(normalized, actionResult)
    ) {
      return null;
    }

    const support = normalized?.support || {};
    const giftProfile =
      typeof giftMapModule?.resolveGiftProfile === "function"
        ? giftMapModule.resolveGiftProfile(support)
        : {};

    try {
      const catalog =
        typeof mediaCatalogModule?.loadCatalog === "function"
          ? mediaCatalogModule.loadCatalog()
          : null;
      const avatarLocalPath =
        typeof mediaCatalogModule?.pickProfileForUser === "function"
          ? mediaCatalogModule.pickProfileForUser(catalog, getUserLabel(normalized))
          : null;

      const giftAnimation =
        typeof giftAnimationContextModule?.buildGiftAnimationContext === "function"
          ? giftAnimationContextModule.buildGiftAnimationContext(
              kojnozoutState,
              streamState,
              giftProfile
            )
          : {};
      const kojMood =
        typeof giftAnimationContextModule?.resolveGiftReactionMood === "function"
          ? giftAnimationContextModule.resolveGiftReactionMood(giftAnimation, giftProfile)
          : safeString(kojnozoutState?.mood, "happy");
      const careOffset =
        typeof giftAnimationContextModule?.resolveCareVariantOffset === "function"
          ? giftAnimationContextModule.resolveCareVariantOffset(giftAnimation)
          : 0;

      const composed = await giftVisualComposerModule.composeGiftMoment({
        userLabel: getUserLabel(normalized),
        avatarUrl: getAvatarUrl(normalized),
        avatarLocalPath,
        giftName: safeString(support.giftName || normalized.giftName),
        tier: safeString(actionResult?.tier || support.tier, "T1"),
        giftKey: safeString(giftProfile.key),
        effectProgram: safeString(giftProfile.effectProgram, "generic_support"),
        kojMood,
        giftAnimation,
        careOffset,
        primaryNeed: giftAnimation.primaryNeed,
        thankText: safeString(actionResult?.overlayPayload?.text)
      });

      if (!composed?.ok || !composed.imageUrl) return null;

      if (typeof overlayStateModule?.setGiftVisual === "function") {
        overlayStateModule.setGiftVisual(overlayStateRef(), {
          imageUrl: composed.imageUrl,
          text: composed.lines?.[0],
          subtext: composed.lines?.[1],
          userLabel: getUserLabel(normalized),
          giftName: safeString(support.giftName || normalized.giftName),
          tier: safeString(actionResult?.tier || support.tier, "T1"),
          variantIndex: composed.variantIndex,
          effectProgram: composed.effectProgram,
          avatarLoaded: composed.avatarLoaded,
          expiresAt: composed.expiresAt
        });
      }

      applyGiftAnimationReaction(
        normalized,
        actionResult,
        giftProfile,
        giftAnimation,
        kojMood
      );

      writeLog("mia-events", {
        ts: Date.now(),
        stage: "gift_visual_composed",
        imageUrl: composed.imageUrl,
        variantIndex: composed.variantIndex,
        effectProgram: composed.effectProgram,
        avatarLoaded: composed.avatarLoaded
      });

      // Optional stream gift→animation (procedural ~10s). Controlled by
      // MIA_GIFT_ANIM_AUTO / data/gift-animation-config.json — never blocks gift visual.
      // When Action Queue is ON, present cues go through gift_present (coalesce + priority).
      try {
        const giftAnim = require("../shared/mia-gift-animation");
        giftAnim.bindOverlayHooks({
          getOverlayState,
          overlayStateModule,
          invalidateOverlayStateCache,
          writeLog
        });
        const runGiftAnim = () =>
          giftAnim.maybeQueueFromGift(
            {
              ...normalized,
              userLabel: getUserLabel(normalized),
              avatarUrl: getAvatarUrl(normalized)
            },
            actionResult,
            giftProfile
          );

        const actionQueue = require("../core/action-queue");
        if (actionQueue.isActionQueueEnabled({})) {
          const support = normalized?.support || {};
          const tier = safeString(
            actionResult?.tier || support.obsTier || support.streamTier || support.tier,
            "T1"
          );
          const direction =
            actionResult?.meta?.miaDirection ||
            normalized?.miaDirection ||
            null;
          const shell = actionQueue.giftPresentToQueueAction(
            {
              userId: support.userId || normalized?.userId,
              userLabel: getUserLabel(normalized),
              giftKey: giftProfile.key || support.giftKey,
              giftName: safeString(support.giftName || normalized.giftName),
              tier,
              miaPoints: Number(support.miaPoints || actionResult?.meta?.miaPoints || 0),
              avatarUrl: getAvatarUrl(normalized),
              directorIntensity: direction?.intensity,
              delivery: { run: runGiftAnim }
            },
            {
              directorIntensity: direction?.intensity,
              coalesceWindowMs: direction?.coalescePolicy?.windowMs
            }
          );
          const aq = actionQueue.getSharedActionQueue({
            coalesceWindowMs: direction?.coalescePolicy?.windowMs
          });
          const queued = aq.enqueue(shell);
          writeLog("mia-events", {
            ts: Date.now(),
            stage: queued.coalesced
              ? "action_queue_gift_present_coalesced"
              : "action_queue_gift_present_enqueued",
            queueSize: aq.size(),
            priority: queued.action?.priority,
            coalesceKey: shell.coalesceKey,
            giftKey: shell.payload?.giftKey || null,
            miaPoints: shell.payload?.miaPoints || 0
          });
          if (!queued.coalesced) {
            const runner = actionQueue.getSharedActionQueueRunner({
              giftPresent: async (action) => {
                const delivery = action?.payload?.delivery;
                if (!delivery || typeof delivery.run !== "function") {
                  return { ok: true, skipped: true, reason: "no_delivery" };
                }
                const result = await delivery.run();
                return { ok: true, result };
              },
              onError: (err, action) => {
                writeLog("mia-errors", {
                  source: "action_queue_gift_present",
                  type: action?.type || null,
                  error: err?.message || String(err)
                });
              }
            });
            runner.kick(0);
          }
        } else {
          void runGiftAnim();
        }
      } catch (_err) {
        /* gift animation optional */
      }

      return composed;
    } catch (err) {
      writeLog("mia-errors", {
        source: "gift_visual_compose",
        error: err.message
      });
    }

    return null;
  }

  async function schedulePostGiftMediaExperiences(normalized = {}, actionResult = {}) {
    const postGift =
      actionResult?.meta?.presentationPlan?.postGift ||
      (typeof giftPresentationModule?.resolvePostGiftExperiencePlan === "function"
        ? giftPresentationModule.resolvePostGiftExperiencePlan(
            normalized?.support?.giftContext || {},
            { env: process.env }
          )
        : { runGiftVisual: true, runMilestoneStory: true, runViewerStory: true });

    if (!postGift.runGiftVisual && !postGift.runViewerStory && !postGift.runMilestoneStory) {
      return;
    }

    let composedGift = null;

    if (postGift.runGiftVisual) {
      try {
        composedGift = await scheduleGiftVisualCompose(normalized, actionResult);
      } catch (err) {
        writeLog("mia-errors", {
          source: "gift_visual_compose_async",
          error: err?.message || String(err)
        });
      }
    }

    const userLabel = getUserLabel(normalized);
    const support = normalized?.support || {};
    const tier = safeString(
      actionResult?.tier || support.obsTier || support.streamTier || support.tier,
      "T1"
    );

    try {
      const bodyGiftMoment = require("./MIA_BODY_GIFT_MOMENT");
      const graphicsStudio = require("../shared/mia-graphics-studio");
      let bodyMood;
      let bodySpeaking = false;

      if (typeof overlayStateModule?.getAnimationReactionSnapshot === "function") {
        const reaction = overlayStateModule.getAnimationReactionSnapshot(overlayStateRef());
        if (reaction?.emotion) {
          bodyMood = graphicsStudio.mapAnimationEmotionToBodyMood(reaction.emotion);
          bodySpeaking = graphicsStudio.resolveSpeakingFromAnimationReaction(reaction);
        }
      }

      bodyGiftMoment.scheduleGiftBodyMomentShow({
        tier,
        mood: bodyMood,
        speaking: bodySpeaking,
        giftName: safeString(support.giftName || normalized.giftName),
        port: Number(process.env.PORT) || 3000
      }).catch((err) => {
        writeLog("mia-errors", {
          source: "gift_body_moment",
          error: err?.message || String(err)
        });
      });
    } catch (_err) {
      // optional graphics/OBS bridge
    }

    let storyResolved = null;
    if (
      postGift.runMilestoneStory &&
      typeof storyAnimationEngineModule?.observeFeedAndResolveStory === "function" &&
      userLabel
    ) {
      try {
        storyResolved = storyAnimationEngineModule.observeFeedAndResolveStory({
          userLabel,
          feedType: "gift",
          platform: safeString(normalized.platform, "unknown")
        });
      } catch (err) {
        writeLog("mia-errors", {
          source: "story_observe_feed",
          error: err.message
        });
      }
    }

    if (storyResolved?.triggered && storyResolved.story) {
      try {
        await scheduleStoryAnimationAfterFeed(normalized, {
          feedType: "gift",
          preResolved: storyResolved
        });
      } catch (err) {
        writeLog("mia-errors", {
          source: "story_animation_async",
          error: err.message
        });
      }
      return;
    }

    if (!postGift.runViewerStory) {
      return;
    }

    if (typeof viewerStoryModule?.publishViewerStorySpotlight !== "function") {
      return;
    }

    try {
      const result = await viewerStoryModule.publishViewerStorySpotlight({
        normalized,
        userLabel,
        tier,
        giftName: safeString(support.giftName || normalized.giftName),
        avatarUrl: getAvatarUrl(normalized),
        composedGift,
        milestoneStory: false,
        env: process.env,
        setStoryVisual: (visual) => {
          if (typeof overlayStateModule?.setStoryVisual === "function") {
            overlayStateModule.setStoryVisual(overlayStateRef(), visual);
            if (overlayStateCache && typeof overlayStateCache.invalidate === "function") {
              invalidateOverlayStateCache?.();
            }
          }
        }
      });

      if (result?.ok) {
        writeLog("mia-events", {
          ts: Date.now(),
          stage: "viewer_story_spotlight",
          userLabel,
          tier,
          frameCount: result.visual?.frames?.length || 0,
          storyId: result.visual?.storyId || "viewer_spotlight"
        });
      }
    } catch (err) {
      writeLog("mia-errors", {
        source: "viewer_story_spotlight",
        error: err.message
      });
    }
  }

  return {
    applyGiftAnimationReaction,
    scheduleGiftVisualCompose,
    schedulePostGiftMediaExperiences
  };
}

module.exports = { createGiftMediaRuntime };
