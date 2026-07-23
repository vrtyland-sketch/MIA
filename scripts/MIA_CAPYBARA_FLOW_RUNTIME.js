"use strict";

/**
 * Capybara waiting-room flow — wait prompt overlay/voice + comment replies.
 */

function createCapybaraFlowRuntime(deps = {}) {
  const {
    capybaraFlowModule,
    getOutputState,
    responseEngine,
    runtimeConfig,
    getKojnozoutState,
    ecosystemState,
    getEcosystemState,
    deliverActionVoice,
    executeOverlay,
    writeLog,
    safeString,
    getUserLabel,
    maybeDeliverMiaVoice
  } = deps;

  function resolveEcosystemState() {
    if (typeof getEcosystemState === "function") return getEcosystemState();
    return ecosystemState || {};
  }

  async function deliverCapybaraWaitPrompt(payload = {}) {
    if (!payload?.text) return;

    // Voice-first: TTS + speech mirror drží bublinu — neemitovat stejný text zvlášť.
    const voiced = await maybeDeliverMiaVoice({
      ok: true,
      route: "community",
      overlayPayload: payload,
      speech_text: safeString(payload.text),
      responseContract: {
        speaker: "mia",
        intent: "capybara_wait"
      }
    });

    if (voiced?.meta?.overlaySuppressed || voiced?.voicePlayback?.audioUrl) {
      return;
    }

    await executeOverlay(payload, {
      source: "capybara_flow",
      force: false,
      priority: payload.priority || 2
    });
  }

  async function tryHandleCapybaraWaitingComment(normalized = {}) {
    if (typeof capybaraFlowModule?.handleWaitingComment !== "function") {
      return { handled: false };
    }

    const outputState = typeof getOutputState === "function" ? getOutputState() : {};
    const kojnozoutState =
      typeof getKojnozoutState === "function" ? getKojnozoutState() : {};

    const result = await capybaraFlowModule.handleWaitingComment(outputState, normalized, {
      responseEngine,
      runtimeConfig,
      kojnozoutState,
      ecosystemState: resolveEcosystemState(),
      outputState
    });

    if (!result?.handled || !result.actionResult) {
      return result;
    }

    try {
      result.actionResult = await deliverActionVoice(result.actionResult);
    } catch (err) {
      writeLog("mia-errors", {
        source: "capybara_voice",
        error: err.message
      });
    }

    // Po voice-first policy je overlayPayload null — znovu neemitovat stejnou bublinu.
    if (
      result.actionResult?.overlayPayload &&
      !result.actionResult?.meta?.overlaySuppressed
    ) {
      await executeOverlay(result.actionResult.overlayPayload, {
        source: "capybara_flow",
        actionResult: result.actionResult,
        normalizedEvent: normalized
      });
    }

    writeLog("mia-events", {
      ts: Date.now(),
      stage: "capybara_comment_reply",
      user: getUserLabel(normalized),
      giftName: result.actionResult.meta?.giftName || null
    });

    return result;
  }

  return { deliverCapybaraWaitPrompt, tryHandleCapybaraWaitingComment };
}

module.exports = { createCapybaraFlowRuntime };
