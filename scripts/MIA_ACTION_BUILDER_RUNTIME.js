"use strict";

/**
 * Shadow pipeline fallback actions — direct chat, support gift, result normalization.
 */

function createActionBuilderRuntime(deps = {}) {
  const {
    safeString,
    getUserLabel,
    chatBrain,
    runtimeConfig,
    getKojnozoutState,
    getOutputState,
    responseEngine
  } = deps;

  async function buildDirectChatAction(normalized) {
    const message = safeString(
      normalized.message ||
        normalized.comment ||
        normalized.content ||
        normalized.text
    );

    const userLabel = getUserLabel(normalized);
    let target = "";

    if (typeof chatBrain?.decideChatReaction === "function") {
      const reaction = chatBrain.decideChatReaction({
        message,
        userLabel,
        normalizedEvent: normalized
      });

      if (reaction && reaction.ok !== false) {
        target = safeString(reaction.speaker || reaction.target);
      }
    }

    if (!target && typeof chatBrain?.resolveChatIntent === "function") {
      const intent = chatBrain.resolveChatIntent(message);
      target = safeString(intent?.speakerHint || intent?.addressedTo);
    }

    const kojnozoutState =
      typeof getKojnozoutState === "function" ? getKojnozoutState() : {};
    const outputState = typeof getOutputState === "function" ? getOutputState() : {};

    const input = {
      message,
      userLabel,
      target,
      speaker: target || "mia",
      normalizedEvent: normalized,
      runtimeConfig,
      kojnozoutState
    };

    const outputStateWithKoj = {
      ...outputState,
      kojnozoutSnapshot: kojnozoutState,
      kojnozoutState
    };

    let result = null;

    if (typeof responseEngine?.buildDirectChatResponse === "function") {
      result = responseEngine.buildDirectChatResponse(outputStateWithKoj, input);
    }

    return (
      result || {
        ok: true,
        shouldPlayVideo: false,
        overlayPayload: {
          owner: target === "kojnozout" ? "kojnozout" : "mia",
          route: "community",
          stage: "community",
          text: message || "MIA je aktivní.",
          user: userLabel,
          userLabel
        }
      }
    );
  }

  function buildSupportAction(normalized) {
    const outputState = typeof getOutputState === "function" ? getOutputState() : {};
    const userLabel = getUserLabel(normalized);

    if (typeof responseEngine?.buildSupportResponse === "function") {
      const result = responseEngine.buildSupportResponse(outputState, normalized);
      if (result) return result;
    }

    return {
      ok: true,
      route: "support",
      shouldPlayVideo: true,
      overlayPayload: {
        owner: "kojnozout",
        route: "support",
        stage: "support",
        text: `${userLabel} nakrmil/a Kojnožrouta.`,
        user: userLabel,
        userLabel,
        giftName: safeString(
          normalized.giftName || normalized.support?.giftName,
          "gift"
        )
      }
    };
  }

  function normalizeActionResult(result, fallbackAction) {
    const shadowFailed =
      result &&
      typeof result === "object" &&
      result.ok === false &&
      !result.actionResult &&
      !result.overlayPayload &&
      !result.overlay;

    const action = shadowFailed
      ? fallbackAction || {}
      : result?.actionResult ||
        result?.action ||
        result ||
        fallbackAction ||
        {};

    if (
      action.overlayPayload ||
      action.overlay ||
      action.companionOverlay ||
      action.companionOverlayPayload
    ) {
      return action;
    }

    if (fallbackAction?.overlayPayload || fallbackAction?.companionOverlayPayload) {
      return fallbackAction;
    }

    return action;
  }

  return { buildDirectChatAction, buildSupportAction, normalizeActionResult };
}

module.exports = { createActionBuilderRuntime };
