"use strict";

/**
 * MIA NEXT RUNTIME
 * = jediný mozek systému
 *
 * flow:
 * normalized_event → spam_session(optional) → decision → action_result
 */

const decisionEngine = require("../shared/platform_runtime_rules/decision_engine");
const actionBuilder = require("../shared/platform_runtime/action_builder");
const supportReactionPolicy = require("../scripts/MIA_SUPPORT_REACTION_POLICY");
const spamSessionEngine = require("./engine_spam_session");
const normalizedEventContract = require("../shared/platform_runtime_contracts/core_contracts_normalized_event");
const actionResultContract = require("../shared/platform_runtime_contracts/core_contracts_action_result");
const overlayPayloadContract = require("../shared/platform_runtime_contracts/core_contracts_overlay_payload");
const shareRuntimeBridge = require("../shared/next/share_runtime_bridge");
const { buildAnimationTrace } = require("../scripts/MIA_ANIMATION_TRACE");
const ecosystemOrchestrator = require("../scripts/MIA_ECOSYSTEM_ORCHESTRATOR");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeTier(value, fallback = "") {
  const tier = safeString(value).toUpperCase();
  return tier === "T1" || tier === "T2" || tier === "T3" || tier === "T4"
    ? tier
    : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getEventType(event = {}) {
  return safeString(event.eventType || event.type).toUpperCase();
}

function getRoute(event = {}) {
  return safeString(event.route).toLowerCase();
}

function isSupportEvent(event = {}) {
  const route = getRoute(event);
  const eventType = getEventType(event);
  return route === "support" || eventType === "GIFT";
}

function cloneJson(value, fallback = null) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (err) {
    return fallback;
  }
}

function pushDebugWarning(debug, code, details = null) {
  if (!debug || typeof debug !== "object") return;

  if (!Array.isArray(debug.warnings)) {
    debug.warnings = [];
  }

  debug.warnings.push({
    code: safeString(code, "UNKNOWN_WARNING"),
    details: details && typeof details === "object" ? cloneJson(details, null) : details || null
  });
}

function setRuntimeDebugPath(debug, runtimePath = "legacy_runtime", details = {}) {
  if (!debug || typeof debug !== "object") return;

  debug.runtimePath = safeString(runtimePath, "legacy_runtime");
  debug.runtimePathDetails = {
    ...(debug.runtimePathDetails || {}),
    ...(details && typeof details === "object" ? cloneJson(details, {}) : {})
  };
}

function resolveSpamIntensity(tier = "") {
  const normalizedTier = normalizeTier(tier);
  if (normalizedTier === "T4") return 4;
  if (normalizedTier === "T3") return 3;
  if (normalizedTier === "T2") return 2;
  if (normalizedTier === "T1") return 1;
  return 0;
}

function applySpamMeta(next = {}, spamVerdict = null) {
  const contributorCount = toNumber(
    spamVerdict?.contributorCount ??
      spamVerdict?.participantCount,
    0
  );

  return {
    ...(next.meta || {}),
    spamState: safeString(spamVerdict?.state),
    spamReason: safeString(spamVerdict?.reason),
    contributorCount,
    participantCount: contributorCount,
    singleContributor: Boolean(spamVerdict?.singleContributor),
    eventCount: toNumber(spamVerdict?.eventCount, 0),
    totalPoints: toNumber(spamVerdict?.totalPoints, 0),
    rewardTier: normalizeTier(spamVerdict?.rewardTier),
    highestReachedTier: normalizeTier(spamVerdict?.highestReachedTier),
    lastRewardTierGranted: normalizeTier(spamVerdict?.lastRewardTierGranted),
    rewardState: safeString(spamVerdict?.rewardState),
    newlyConfirmed: Boolean(spamVerdict?.newlyConfirmed)
  };
}

function applySpamVerdictToDecision(decisionResult = {}, rawEvent = {}, spamVerdict = null) {
  if (!decisionResult || typeof decisionResult !== "object") {
    return decisionResult;
  }

  if (!spamVerdict || typeof spamVerdict !== "object") {
    return {
      ...decisionResult
    };
  }

  const next = {
    ...decisionResult,
    spamVerdict: cloneJson(spamVerdict, null)
  };

  const rewardTier = normalizeTier(spamVerdict.rewardTier);
  const interruptTier = normalizeTier(spamVerdict.interruptTier);

  if (spamVerdict.shouldInterruptDirect && interruptTier) {
    next.shouldPlayVideo = true;
    next.tier = interruptTier;
    next.intensity = resolveSpamIntensity(interruptTier);
    next.reason = "SUPPORT_DIRECT_INTERRUPT";
    next.meta = applySpamMeta(next, spamVerdict);
    return next;
  }

  /**
   * Spam reward:
   * - pouští video jen při novém milestone
   * - spam je kanonicky capnutý na T3
   */
  if (spamVerdict.shouldRewardSpam && rewardTier) {
    const cappedRewardTier = rewardTier === "T4" ? "T3" : rewardTier;

    next.shouldPlayVideo = true;
    next.tier = cappedRewardTier;
    next.intensity = resolveSpamIntensity(cappedRewardTier);
    next.reason = "SUPPORT_SPAM_REWARD";
    next.meta = applySpamMeta(next, {
      ...spamVerdict,
      rewardTier: cappedRewardTier
    });
    return next;
  }

  /**
   * Spam potvrzen, ale reward milestone už byl dřív odměněný.
   * Per-gift tier video zůstává — spam milestone je bonus navíc.
   */
  if (
    safeString(spamVerdict.reason) === "spam_confirmed_already_rewarded" ||
    safeString(spamVerdict.rewardState) === "already_granted"
  ) {
    next.meta = applySpamMeta(next, spamVerdict);
    next.reason = "SUPPORT_SPAM_BUILDUP";
    return next;
  }

  /**
   * Spam potvrzen bez nového reward prahu — overlay/buildup, ale tier video z giftu běží dál.
   */
  if (
    safeString(spamVerdict.reason) === "spam_confirmed_no_reward" ||
    safeString(spamVerdict.state) === "spam_confirmed_no_reward"
  ) {
    next.meta = applySpamMeta(next, spamVerdict);
    next.reason = "SUPPORT_SPAM_BUILDUP";
    return next;
  }

  /**
   * Buildup před potvrzením — až od 2. dárku ve spam okně,
   * izolovaný T1 na malém streamu zůstane běžný SUPPORT_RESOLVED.
   */
  if (
    safeString(spamVerdict.reason) === "spam_buildup" ||
    spamVerdict.shouldConfirmSpam ||
    spamVerdict.isSpamActive
  ) {
    next.meta = applySpamMeta(next, spamVerdict);

    const spamEventCount = toNumber(spamVerdict.eventCount, 0);
    const spamConfirmed = Boolean(
      spamVerdict.isSpamConfirmed || spamVerdict.spamConfirmed
    );

    if (spamEventCount >= 2 || spamConfirmed) {
      next.reason = "SUPPORT_SPAM_BUILDUP";
    }

    return next;
  }

  return next;
}

/**
 * Hlavní vstup runtime
 */
function runShadowPipeline(ctx = {}) {
  const ts = Date.now();
  const debug = {
    ts,
    warnings: [],
    runtimePath: "legacy_runtime",
    runtimePathDetails: {
      source: "engine_shadow_runtime"
    },
    shareBridge: {
      attempted: false,
      handled: false,
      enabled: false,
      skipped: true,
      reason: "not_evaluated"
    }
  };

  try {
    const {
      rawEvent,
      streamState,
      outputState,
      kojnozoutState,
      runtimeConfig,
      ecosystemState
    } = ctx;

    if (!rawEvent || typeof rawEvent !== "object") {
      return fail("invalid_raw_event", null, debug);
    }

    /**
     * 0️⃣ DEBUG VALIDACE NORMALIZED EVENTU
     * Nezastavuje runtime, jen zapisuje warnings
     */
    try {
      const normalizedEvent = normalizedEventContract.createNormalizedEvent(
        rawEvent || {}
      );

      const normalizedEventValidation = normalizedEventContract.validateNormalizedEvent(
        normalizedEvent
      );

      if (!normalizedEventValidation?.ok) {
        pushDebugWarning(debug, "NORMALIZED_EVENT_INVALID", {
          errors: normalizedEventValidation?.errors || []
        });
      }
    } catch (contractErr) {
      pushDebugWarning(debug, "NORMALIZED_EVENT_CONTRACT_ERROR", {
        message: contractErr?.message || String(contractErr)
      });
    }

    let spamVerdict = null;

    /**
     * 0.5️⃣ NEXT SHARE BRIDGE
     * Jen když je explicitně povolený.
     * Když selže nebo je vypnutý, runtime pokračuje legacy větví.
     */
    try {
      debug.shareBridge.attempted = true;

      const shareBridgeResult = shareRuntimeBridge.tryBuildShareBridgeResult({
        ...ctx,
        rawEvent,
        streamState,
        outputState,
        kojnozoutState,
        runtimeConfig
      });

      debug.shareBridge = {
        attempted: true,
        handled: Boolean(shareBridgeResult?.ok),
        enabled: Boolean(shareBridgeResult?.debug?.enabled),
        skipped: Boolean(shareBridgeResult?.skipped),
        reason: safeString(
          shareBridgeResult?.reason,
          shareBridgeResult?.ok ? "share_bridge_handled" : "unknown"
        ),
        eventType: getEventType(rawEvent),
        shareMode: safeString(shareBridgeResult?.debug?.shareMode)
      };

      if (shareBridgeResult?.ok) {
        setRuntimeDebugPath(debug, "next_share_bridge", {
          bridge: "share",
          eventType: getEventType(rawEvent),
          shareMode: safeString(shareBridgeResult?.debug?.shareMode, "share_single")
        });

        const animationTrace = buildAnimationTrace({
          actionResult: shareBridgeResult.actionResult
        });

        return {
          ok: true,
          ts,
          spamVerdict: null,
          decisionResult: shareBridgeResult.decisionResult,
          actionResult: shareBridgeResult.actionResult,
          animationTrace,
          debug: {
            ...debug,
            shareBridge: cloneJson(shareBridgeResult.debug, null) || debug.shareBridge,
            animationTrace: cloneJson(animationTrace, null)
          }
        };
      }

      if (shareBridgeResult?.skipped) {
        setRuntimeDebugPath(debug, "legacy_runtime", {
          bridge: "share_skipped",
          reason: safeString(shareBridgeResult?.reason, "share_bridge_skipped"),
          eventType: getEventType(rawEvent)
        });
      }

      if (shareBridgeResult && !shareBridgeResult.ok && !shareBridgeResult.skipped) {
        pushDebugWarning(debug, "NEXT_SHARE_BRIDGE_FAILED", {
          reason: shareBridgeResult.reason || "unknown_share_bridge_failure"
        });

        setRuntimeDebugPath(debug, "legacy_runtime", {
          bridge: "share_failed_fallback",
          reason: safeString(shareBridgeResult?.reason, "share_bridge_failed"),
          eventType: getEventType(rawEvent)
        });
      }
    } catch (shareBridgeErr) {
      debug.shareBridge = {
        attempted: true,
        handled: false,
        enabled: false,
        skipped: false,
        reason: "share_bridge_error",
        eventType: getEventType(rawEvent),
        shareMode: ""
      };

      pushDebugWarning(debug, "NEXT_SHARE_BRIDGE_ERROR", {
        message: shareBridgeErr?.message || String(shareBridgeErr)
      });

      setRuntimeDebugPath(debug, "legacy_runtime", {
        bridge: "share_error_fallback",
        reason: shareBridgeErr?.message || "share_bridge_error",
        eventType: getEventType(rawEvent)
      });
    }

    /**
     * 1️⃣ SPAM SESSION
     * Jen pro support eventy
     */
    if (isSupportEvent(rawEvent)) {
      try {
        spamVerdict = spamSessionEngine.processSupport(rawEvent, {
          streamState,
          kojnozoutState
        });
      } catch (err) {
        spamVerdict = {
          state: "spam_engine_error",
          reason: err?.message || "spam_engine_error"
        };

        pushDebugWarning(debug, "SPAM_ENGINE_ERROR", {
          reason: spamVerdict.reason
        });
      }
    }

    /**
     * 2️⃣ DECISION
     */
    let decisionResult = decisionEngine.decide({
      event: rawEvent,
      streamState,
      kojnozoutState,
      outputState
    });

    if (!decisionResult || typeof decisionResult !== "object") {
      return fail("decision_failed", null, debug);
    }

    if (spamVerdict) {
      decisionResult = applySpamVerdictToDecision(
        decisionResult,
        rawEvent,
        spamVerdict
      );
    }

    if (isSupportEvent(rawEvent)) {
      decisionResult = supportReactionPolicy.applySupportPresentation(
        decisionResult,
        rawEvent,
        kojnozoutState,
        streamState,
        outputState
      );
    }

    // #region agent log
    if (isSupportEvent(rawEvent)) {
      fetch("http://127.0.0.1:7529/ingest/053e8a6a-2697-4d34-8107-829d81a8fdc5", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "844269" },
        body: JSON.stringify({
          sessionId: "844269",
          runId: "post-fix",
          hypothesisId: "H1-H2",
          location: "engine_shadow_runtime.js:support_decision",
          message: "support decision after spam+policy",
          data: {
            reason: safeString(decisionResult?.reason),
            tier: safeString(decisionResult?.tier),
            shouldPlayVideo: Boolean(decisionResult?.shouldPlayVideo),
            supportAckMode: safeString(decisionResult?.meta?.supportAckMode),
            supportAckReason: safeString(decisionResult?.meta?.supportAckReason),
            spamShouldReward: Boolean(decisionResult?.spamVerdict?.shouldRewardSpam),
            spamRewardTier: safeString(decisionResult?.spamVerdict?.rewardTier),
            spamEventCount: toNumber(decisionResult?.spamVerdict?.eventCount, 0),
            spamTotalPoints: toNumber(decisionResult?.spamVerdict?.totalPoints, 0),
            bowlPercent: toNumber(kojnozoutState?.bowlPercent, 0),
            kojMood: safeString(kojnozoutState?.mood),
            kojAffliction: safeString(kojnozoutState?.affliction)
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
    }
    // #endregion

    /**
     * 2.5️⃣ ECOSYSTEM ORCHESTRATOR (multi-agent routing)
     * 3. entita — koordinace MIA ↔ Kojnožrout ↔ asistent v jednom runtime
     */
    let ecosystemPlan = null;

    if (
      ecosystemOrchestrator.isEnabled(runtimeConfig) &&
      typeof ecosystemOrchestrator.planEventRouting === "function"
    ) {
      ecosystemPlan = ecosystemOrchestrator.planEventRouting({
        event: rawEvent,
        decisionResult,
        streamState,
        outputState,
        kojnozoutState,
        runtimeConfig,
        ecosystemState
      });

      decisionResult = ecosystemOrchestrator.applyOrchestrationToDecision(
        decisionResult,
        ecosystemPlan
      );

      debug.ecosystem = {
        domain: safeString(ecosystemPlan?.domain),
        summary: safeString(ecosystemPlan?.summary),
        hostMode: Boolean(ecosystemPlan?.hostMode),
        activeAgents: cloneJson(ecosystemPlan?.activeAgents, [])
      };
    }

    /**
     * 3️⃣ ACTION RESULT
     */
    let actionResult = actionBuilder.buildActionResult({
      decision: decisionResult,
      event: rawEvent,
      streamState,
      outputState,
      kojnozoutState
    });

    if (!actionResult || typeof actionResult !== "object") {
      return fail("action_build_failed", null, debug);
    }

    if (ecosystemPlan && ecosystemState) {
      actionResult = ecosystemOrchestrator.finalizeActionResult(
        actionResult,
        ecosystemPlan,
        {
          ecosystemState,
          streamState,
          kojnozoutState,
          runtimeConfig
        }
      );

      ecosystemOrchestrator.recordTurn(
        ecosystemState,
        ecosystemPlan,
        actionResult
      );
    }

    const animationTrace = buildAnimationTrace({
      actionResult
    });

    /**
     * 4️⃣ DEBUG VALIDACE KONTRAKTŮ
     * Nezastavuje runtime, jen zapisuje warnings
     */
    try {
      const normalizedActionResult = actionResultContract.createActionResult(
        actionResult || {}
      );

      const actionValidation = actionResultContract.validateActionResult(
        normalizedActionResult
      );

      if (!actionValidation?.ok) {
        pushDebugWarning(debug, "ACTION_RESULT_INVALID", {
          errors: actionValidation?.errors || []
        });
      }

      if (normalizedActionResult?.overlayPayload) {
        const normalizedOverlayPayload = overlayPayloadContract.createOverlayPayload(
          normalizedActionResult.overlayPayload
        );

        const overlayValidation = overlayPayloadContract.validateOverlayPayload(
          normalizedOverlayPayload
        );

        if (!overlayValidation?.ok) {
          pushDebugWarning(debug, "OVERLAY_PAYLOAD_INVALID", {
            errors: overlayValidation?.errors || []
          });
        }
      }

      if (actionResult?.companionOverlayPayload) {
        const normalizedCompanionOverlayPayload = overlayPayloadContract.createOverlayPayload(
          actionResult.companionOverlayPayload
        );

        const companionOverlayValidation = overlayPayloadContract.validateOverlayPayload(
          normalizedCompanionOverlayPayload
        );

        if (!companionOverlayValidation?.ok) {
          pushDebugWarning(debug, "COMPANION_OVERLAY_PAYLOAD_INVALID", {
            errors: companionOverlayValidation?.errors || []
          });
        }
      }
    } catch (contractErr) {
      pushDebugWarning(debug, "CONTRACT_VALIDATION_ERROR", {
        message: contractErr?.message || String(contractErr)
      });
    }

    setRuntimeDebugPath(debug, "legacy_runtime", {
      bridge: "legacy_decision_action_path",
      eventType: getEventType(rawEvent),
      route: getRoute(rawEvent)
    });

    return {
      ok: true,
      ts,
      spamVerdict: spamVerdict || null,
      decisionResult,
      actionResult,
      animationTrace,
      debug: {
        ...debug,
        animationTrace: cloneJson(animationTrace, null)
      }
    };
  } catch (err) {
    return fail(err?.message || "runtime_error", err, debug);
  }
}

function fail(reason, err = null, debug = null) {
  return {
    ok: false,
    error: reason,
    detail: err?.stack || null,
    ts: Date.now(),
    debug: debug && typeof debug === "object" ? debug : { warnings: [] }
  };
}

function shadowProducedAction(shadowResult) {
  if (!shadowResult || shadowResult.ok === false) return false;
  if (shadowResult.actionResult && typeof shadowResult.actionResult === "object") {
    return true;
  }
  if (shadowResult.action && typeof shadowResult.action === "object") {
    return true;
  }
  return false;
}

async function resolvePipelineAction(input = {}) {
  const {
    shadowResult,
    eventType,
    normalized,
    buildSupportAction,
    buildDirectChatAction,
    normalizeActionResult
  } = input;

  let fallbackAction = null;
  if (!shadowProducedAction(shadowResult)) {
    fallbackAction =
      eventType === "GIFT"
        ? buildSupportAction(normalized)
        : eventType === "COMMENT"
          ? await buildDirectChatAction(normalized)
          : null;
  }

  return {
    actionResult: normalizeActionResult(shadowResult, fallbackAction),
    fallbackUsed: Boolean(fallbackAction)
  };
}

module.exports = {
  runShadowPipeline,
  shadowProducedAction,
  resolvePipelineAction
};