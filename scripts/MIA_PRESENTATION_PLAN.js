"use strict";

/**
 * PresentationPlan — strukturovaný plán overlay/voice/video z actionResult.
 */

function buildPresentationPlan(ctx = {}, deps = {}) {
  const { safeString } = deps;
  const actionResult = ctx.scratch?.actionResult || {};
  const normalized = ctx.normalized || {};
  const eventType = ctx.eventType || "";

  const meta = actionResult.meta || {};
  const plan = {
    eventType,
    overlays: [],
    voice: {
      deferForVideo: meta.miaVoiceDeferredForVideo === true,
      deferredPlan: meta.deferredVoicePlan || null,
      delivered: false
    },
    video: {
      shouldPlay: actionResult.shouldPlayVideo === true,
      pick: meta.giftVideoPick || null,
      tier: actionResult.tier || actionResult.support?.tier || null
    },
    giftPresentation: {
      plan:
        meta.giftPresentationPlan ||
        meta.presentationPlan ||
        null
    },
    overlayPayload: actionResult.overlayPayload || null,
    animationOwner: safeString(actionResult?.overlayPayload?.owner, "mia")
  };

  if (plan.overlayPayload) {
    plan.overlays.push({
      kind: "primary",
      payload: plan.overlayPayload
    });
  }

  if (eventType === "GIFT" && plan.giftPresentation.plan) {
    plan.overlays.push({
      kind: "gift_presentation",
      plan: plan.giftPresentation.plan
    });
  }

  return plan;
}

module.exports = { buildPresentationPlan };
