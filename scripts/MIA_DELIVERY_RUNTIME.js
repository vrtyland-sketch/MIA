"use strict";

/**
 * Overlay, voice, gift presentation, and video delivery runtime.
 */

const actionQueueModule = require("../core/action-queue");
const miaDirector = require("../core/mia-director");

function createDeliveryRuntime(deps = {}) {
  const {
    runtimeConfig,
    writeLog,
    safeString,
    cloneJson,
    setOverlay,
    getOverlayState,
    overlayStateModule,
    overlayStateCache,
    invalidateOverlayStateCache,
    overlayTiming,
    overlayQueue,
    voicePriorityLayer,
    obsOverlayRenderer,
    obsBrowserRefreshOnOverlayEnabled,
    scheduleObsBrowserRefresh,
    overlayEmitResultModule,
    videoEngine,
    videoEngineModule,
    bowlFullVideoModule,
    getOutputState,
    getKojnozoutState,
    getObsConnected,
    forceReconnectObs,
    ensureObsConnectedWithRetry,
    getUserLabel,
    tryAutoBossMissionFromGift,
    speakerRoutingModule,
    ttsEngine,
    languageModule,
    sessionMemoryModule,
    voiceHoldUntilTs
  } = deps;

  let overlayExecutionChain = Promise.resolve();
  let overlayQueueFlushTimer = null;
  let voicePlaybackState = null;
  let voicePlaybackSeq = 0;
  let lastTtsSpeakKey = "";
  let lastTtsTextKey = "";
  let lastTtsSpeakAt = 0;
  let voiceSpeakQueue = [];
  let voiceSpeakDrainTimer = null;
  let voiceSpeakProcessing = false;
  // Ephemeral playback hooks. Never copied onto actionResult or persisted queue payloads.
  const playbackStartHooks = new Map();
  const MAX_VOICE_SPEAK_QUEUE = Math.max(
    1,
    Number(process.env.MIA_VOICE_SPEAK_QUEUE_MAX || runtimeConfig?.voice?.speakQueueMax || 6)
  );

  function overlayStateRef() {
    return typeof getOverlayState === "function" ? getOverlayState() : {};
  }

function isVoicePlaybackActive(now = Date.now()) {
  if (!voicePlaybackState) return false;
  return Number(voicePlaybackState.holdUntilTs || 0) > now;
}

// Waiting-queue policy. The cap stays 6. Higher rank is kept.
// proactive < media < system < chat < paid_support.
const VOICE_SPEAK_STALE_MS = 10000;
const VOICE_SPEAK_COALESCE_MS = 2500;
const VOICE_CLASS_RANK = {
  proactive: 10,
  media: 20,
  system: 30,
  chat: 40,
  paid_support: 50
};

function voiceClassRank(voiceClass) {
  return VOICE_CLASS_RANK[voiceClass] || VOICE_CLASS_RANK.system;
}

function deriveVoiceSpeakClass(actionResult = {}, plan = {}) {
  const route = safeString(
    actionResult?.route || actionResult?.overlayPayload?.route
  ).toLowerCase();
  const source = safeString(
    actionResult?.meta?.source ||
      actionResult?.overlayPayload?.meta?.source ||
      plan?.source ||
      plan?.kind
  ).toLowerCase();
  const intent = safeString(
    actionResult?.responseContract?.intent ||
      actionResult?.meta?.intent ||
      plan?.intent
  ).toLowerCase();
  const eventType = safeString(
    actionResult?.eventType || actionResult?.normalized?.eventType
  ).toUpperCase();

  if (
    route === "support" ||
    eventType === "GIFT" ||
    actionResult?.meta?.giftMapOverlay === true ||
    actionResult?.overlayPayload?.meta?.giftMapOverlay === true ||
    plan?.kind === "gift"
  ) {
    return "paid_support";
  }

  if (
    source === "solo_stream" ||
    source === "proactive_host" ||
    source === "idle" ||
    intent === "solo_stream" ||
    intent === "proactive_host" ||
    plan?.kind === "idle"
  ) {
    return "proactive";
  }

  if (
    source === "streamer_media_command" ||
    intent === "streamer_media_ack" ||
    intent === "streamer_media_reject"
  ) {
    return "media";
  }

  if (
    source === "voice_command" ||
    route === "voice" ||
    route === "system" ||
    intent === "voice_command" ||
    intent === "capybara_wait" ||
    actionResult?.meta?.achievementVoice === true ||
    actionResult?.meta?.companionVoiceOnly === true
  ) {
    return "system";
  }

  if (
    route === "community" ||
    route === "comment" ||
    route === "chat" ||
    eventType === "COMMENT" ||
    eventType === "LIKE" ||
    eventType === "FOLLOW" ||
    eventType === "SHARE" ||
    eventType === "JOIN"
  ) {
    return "chat";
  }

  return "system";
}

function voiceUserKey(actionResult = {}, plan = {}) {
  return safeString(
    actionResult?.meta?.userId ||
      actionResult?.user?.userId ||
      actionResult?.normalized?.user?.userId ||
      actionResult?.userLabel ||
      actionResult?.overlayPayload?.userLabel ||
      actionResult?.overlayPayload?.user ||
      plan?.userKey
  ).toLowerCase();
}

function readVoiceEventId(actionResult = {}, plan = {}) {
  return safeString(
    actionResult?.meta?.eventId ||
      actionResult?.eventId ||
      actionResult?.normalized?.eventId ||
      plan?.eventId
  );
}

function readVoiceTier(actionResult = {}, plan = {}) {
  return safeString(
    plan?.tier ||
      actionResult?.tier ||
      actionResult?.meta?.streamTier ||
      actionResult?.meta?.tier ||
      actionResult?.support?.tier ||
      actionResult?.overlayPayload?.tier
  ).toUpperCase();
}

function buildVoiceQueueMeta(actionResult = {}, plan = {}) {
  try {
    const voiceClass = deriveVoiceSpeakClass(actionResult, plan);
    const tier = readVoiceTier(actionResult, plan);
    const eventId = readVoiceEventId(actionResult, plan);
    return {
      class: voiceClass,
      user: voiceUserKey(actionResult, plan),
      eventId,
      eventIds: eventId ? [eventId] : [],
      queuedAt: Date.now(),
      count: 1,
      tier,
      smallGift: voiceClass === "paid_support" && (tier === "T0" || tier === "T1")
    };
  } catch (_err) {
    return {
      class: "system",
      user: "",
      eventId: "",
      eventIds: [],
      queuedAt: Date.now(),
      count: 1,
      tier: "",
      smallGift: false
    };
  }
}

function queueHasEventId(eventId) {
  if (!eventId) return false;
  return voiceSpeakQueue.some((item) => {
    if (safeString(item?.meta?.eventId) === eventId) return true;
    return (
      Array.isArray(item?.meta?.eventIds) && item.meta.eventIds.includes(eventId)
    );
  });
}

function isStaleNonPaidVoice(entry, now = Date.now()) {
  if (entry?.meta?.class === "paid_support") return false;
  const queuedAt = Number(entry?.meta?.queuedAt);
  if (!Number.isFinite(queuedAt) || queuedAt <= 0) return false;
  return now - queuedAt > VOICE_SPEAK_STALE_MS;
}

function pruneStaleNonPaidVoice(now = Date.now()) {
  let write = 0;
  for (let read = 0; read < voiceSpeakQueue.length; read += 1) {
    const item = voiceSpeakQueue[read];
    if (isStaleNonPaidVoice(item, now)) {
      logVoiceSpeakDrop(item, "stale_non_paid");
      continue;
    }
    voiceSpeakQueue[write] = item;
    write += 1;
  }
  voiceSpeakQueue.length = write;
}

function logVoiceSpeakDrop(entry, reason) {
  writeLog("mia-events", {
    ts: Date.now(),
    stage: "voice_speak_dropped",
    reason,
    policy: reason,
    voiceClass: entry?.meta?.class || null,
    user: entry?.meta?.user || null,
    eventId: entry?.meta?.eventId || null,
    queuedAt: entry?.meta?.queuedAt || null,
    maxQueue: MAX_VOICE_SPEAK_QUEUE,
    speaker: entry?.plan?.voiceSpeaker || entry?.plan?.primaryOwner || "mia",
    textPreview: safeString(entry?.plan?.text).slice(0, 80)
  });
}

function tryCoalesceSmallGift(meta) {
  if (meta?.class !== "paid_support" || meta.smallGift !== true || !meta.user) {
    return false;
  }

  const match = voiceSpeakQueue.find((item) => {
    if (item?.meta?.class !== "paid_support" || item?.meta?.smallGift !== true) {
      return false;
    }
    if (item.meta.user !== meta.user) return false;
    if (safeString(item.meta.tier).toUpperCase() !== meta.tier) return false;
    const age = Number(meta.queuedAt) - Number(item.meta.queuedAt || 0);
    return age >= 0 && age <= VOICE_SPEAK_COALESCE_MS;
  });
  if (!match) return false;

  match.meta.count = Number(match.meta.count || 1) + 1;
  if (meta.eventId) {
    if (!Array.isArray(match.meta.eventIds)) match.meta.eventIds = [];
    if (!match.meta.eventIds.includes(meta.eventId)) {
      match.meta.eventIds.push(meta.eventId);
    }
  }

  writeLog("mia-events", {
    ts: Date.now(),
    stage: "voice_speak_coalesced",
    reason: "small_gift_same_viewer",
    policy: "small_gift_same_viewer",
    voiceClass: "paid_support",
    user: match.meta.user,
    eventId: meta.eventId || null,
    queuedAt: match.meta.queuedAt,
    count: match.meta.count,
    windowMs: VOICE_SPEAK_COALESCE_MS,
    tier: match.meta.tier || null,
    textPreview: safeString(match?.plan?.text).slice(0, 80)
  });
  return true;
}

function scheduleVoiceSpeakDrain(delayMs = null, options = {}) {
  const force = options?.force === true;
  if (voiceSpeakDrainTimer) {
    if (!force) return;
    clearTimeout(voiceSpeakDrainTimer);
    voiceSpeakDrainTimer = null;
  }

  const now = Date.now();
  const delay =
    delayMs ??
    (isVoicePlaybackActive(now)
      ? Math.max(250, Number(voicePlaybackState.holdUntilTs || 0) - now + 220)
      : 150);

  voiceSpeakDrainTimer = setTimeout(() => {
    voiceSpeakDrainTimer = null;
    void drainVoiceSpeakQueue();
  }, delay);
}

async function drainVoiceSpeakQueue() {
  if (voiceSpeakProcessing || isVoicePlaybackActive()) {
    scheduleVoiceSpeakDrain();
    return;
  }

  let next = null;
  while (voiceSpeakQueue.length > 0) {
    if (!isStaleNonPaidVoice(voiceSpeakQueue[0])) {
      next = voiceSpeakQueue.shift();
      break;
    }
    logVoiceSpeakDrop(voiceSpeakQueue.shift(), "stale_non_paid");
  }
  if (!next) return;

  voiceSpeakProcessing = true;
  try {
    await executeVoicePlanDelivery(next.actionResult, next.plan, {
      onPlaybackStarted: next.onPlaybackStarted
    });
  } catch (err) {
    writeLog("mia-errors", {
      source: "voice_speak_queue",
      error: err.message
    });
  } finally {
    voiceSpeakProcessing = false;
  }

  if (!isVoicePlaybackActive()) {
    void flushOverlayQueue().catch((err) => {
      writeLog("mia-errors", {
        source: "overlay_queue_flush_after_voice",
        error: err?.message || "flush_failed"
      });
    });
  }

  if (voiceSpeakQueue.length > 0) {
    scheduleVoiceSpeakDrain(180);
  }
}

function mirrorSpeechOverlayFromVoice({
  speaker = "mia",
  text = "",
  holdUntilTs = 0,
  source = "voice_mirror",
  meta = {}
} = {}) {
  const safeText = safeString(text);
  if (!safeText) return null;

  const owner =
    safeString(speaker).toLowerCase() === "kojnozout" ||
    safeString(speaker).toLowerCase() === "kojnozrout"
      ? "kojnozout"
      : "mia";
  const now = Date.now();
  const holdMs = Math.max(8000, Number(holdUntilTs || 0) - now);

  return setOverlay(
    {
      owner,
      speaker: owner,
      route: "community",
      title: owner === "kojnozout" ? "Kojnožrout" : "MIA",
      text: safeText,
      subtext: "",
      stage: "voice",
      mood: owner === "kojnozout" ? "playful" : "warm",
      holdMs,
      priority: 3,
      meta: {
        source,
        voiceMirror: true,
        ...(meta && typeof meta === "object" ? meta : {})
      }
    },
    { force: true, priority: 3, holdMs }
  );
}

async function executeGiftPresentationOverlays(normalized = {}, plan = null) {
  if (!plan || typeof plan !== "object") {
    return;
  }

  if (plan.comboSpeechPayload) {
    await executeOverlay(plan.comboSpeechPayload, {
      source: "gift_presentation_combo",
      priority: plan.overlayPriority || plan.comboSpeechPayload.priority || 3
    });
  }

  if (plan.comboMoment) {
    activateComboMoment(plan.comboMoment);
  }

  // Phase 2: named combo moment from detector (if not already on plan).
  if (!plan.comboMoment && plan.phase2ComboMoment) {
    activateComboMoment(plan.phase2ComboMoment);
  } else if (
    !plan.comboMoment &&
    normalized?.phase2ComboMoment &&
    typeof activateComboMoment === "function"
  ) {
    activateComboMoment(normalized.phase2ComboMoment);
  }

  if (plan.bossCinematic) {
    activateBossCinematic(plan.bossCinematic);

    writeLog("mia-events", {
      ts: Date.now(),
      stage: "boss_cinematic",
      tier: plan.bossCinematic.tier || null,
      kind: plan.bossCinematic.kind || null,
      title: plan.bossCinematic.title || null,
      userLabel: getUserLabel(normalized),
      giftName: safeString(normalized?.support?.giftContext?.giftName)
    });
  }

  await tryAutoBossMissionFromGift(normalized);

  if (plan.achievementKojOverlay) {
    await executeOverlay(plan.achievementKojOverlay, {
      source: "achievement_moment",
      priority: plan.achievementKojOverlay.priority || 6,
      holdMs: plan.achievementKojOverlay.holdMs || 6200
    });

    writeLog("mia-events", {
      ts: Date.now(),
      stage: "achievement_moment",
      achievementId: plan.achievementKojOverlay?.meta?.achievementId || null,
      label: plan.achievementKojOverlay?.meta?.achievementLabel || null,
      userLabel: getUserLabel(normalized)
    });
  }

  if (plan.achievementVoicePlan?.shouldSpeak) {
    await maybeDeliverMiaVoice(
      {
        meta: {
          achievementVoice: true,
          achievementId: plan.achievementKojOverlay?.meta?.achievementId || null
        }
      },
      plan.achievementVoicePlan
    );
  }
}

function activateComboMoment(momentPayload = null) {
  if (
    !momentPayload ||
    typeof overlayStateModule.setComboMoment !== "function"
  ) {
    return null;
  }

  const saved = overlayStateModule.setComboMoment(overlayStateRef(), momentPayload);
  if (overlayStateCache && typeof overlayStateCache.invalidate === "function") {
    overlayStateCache.invalidate();
  }
  return saved;
}

function activateBossCinematic(cinematicPayload = null) {
  if (
    !cinematicPayload ||
    typeof overlayStateModule.setBossCinematic !== "function"
  ) {
    return null;
  }

  const saved = overlayStateModule.setBossCinematic(overlayStateRef(), cinematicPayload);
  if (overlayStateCache && typeof overlayStateCache.invalidate === "function") {
    overlayStateCache.invalidate();
  }
  return saved;
}

function activateT0Flyby(flybyPayload = null) {
  if (!flybyPayload || typeof overlayStateModule.setT0Flyby !== "function") {
    return null;
  }

  const saved = overlayStateModule.setT0Flyby(overlayStateRef(), flybyPayload);
  if (overlayStateCache && typeof overlayStateCache.invalidate === "function") {
    overlayStateCache.invalidate();
  }
  return saved;
}

async function executeOverlay(payload, context = {}) {
  const task = () => executeOverlayImmediate(payload, context);
  overlayExecutionChain = overlayExecutionChain.then(task, task);
  return overlayExecutionChain;
}

function scheduleOverlayQueueFlush(lockUntilTs) {
  if (!overlayQueue || overlayQueue.size() === 0) return;

  const delayMs = Math.max(50, Number(lockUntilTs || 0) - Date.now() + 50);

  if (overlayQueueFlushTimer) {
    clearTimeout(overlayQueueFlushTimer);
  }

  overlayQueueFlushTimer = setTimeout(() => {
    overlayQueueFlushTimer = null;
    flushOverlayQueue().catch((err) => {
      writeLog("mia-errors", {
        source: "overlay_queue_flush",
        reason: err?.message || "flush_failed"
      });
    });
  }, delayMs);
}

async function flushOverlayQueue() {
  if (!overlayQueue || overlayQueue.size() === 0) return;

  while (overlayQueue.size() > 0) {
    const nextItem = overlayQueue.peek();
    if (!nextItem) break;

    if (
      voicePriorityLayer &&
      typeof voicePriorityLayer.shouldBlockOverlay === "function"
    ) {
      const block = voicePriorityLayer.shouldBlockOverlay(nextItem.overlayPayload);
      if (block?.blocked) {
        scheduleOverlayQueueFlush(block.snapshot?.lockUntilTs);
        break;
      }
    }

    const item = overlayQueue.dequeue();
    if (!item) break;

    await executeOverlay(item.overlayPayload, {
      ...(item.context || {}),
      fromQueue: true
    });
  }
}

async function executeOverlayImmediate(payload, context = {}) {
  if (voicePriorityLayer && typeof voicePriorityLayer.shouldBlockOverlay === "function") {
    const block = voicePriorityLayer.shouldBlockOverlay(payload);
    if (block?.blocked) {
      if (
        overlayQueue &&
        typeof overlayQueue.enqueue === "function" &&
        context.fromQueue !== true
      ) {
        overlayQueue.enqueue({ overlayPayload: payload, context });
        scheduleOverlayQueueFlush(block.snapshot?.lockUntilTs);

        return {
          ok: true,
          emitted: false,
          reason: "overlay_queued",
          meta: {
            voicePriority: block.snapshot || null,
            queued: true,
            queueSize: overlayQueue.size()
          }
        };
      }

      return {
        ok: true,
        emitted: false,
        reason: block.reason || "voice_priority_lock_active",
        meta: { voicePriority: block.snapshot || null }
      };
    }
  }

  if (overlayTiming && typeof overlayTiming.canEmitNow === "function") {
    const remaining = overlayTiming.getRemainingMs?.() || 0;
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
  }

  const acceptedOverlay = setOverlay(payload, {
    force: context.force !== false,
    holdMs: payload?.holdMs,
    priority: context.priority ?? payload?.priority
  });

  let renderResult = {
    ok: true,
    emitted: true,
    reason: "ok",
    meta: { acceptedOverlay }
  };

  try {
    let rendererResult = null;

    if (obsOverlayRenderer && typeof obsOverlayRenderer.render === "function") {
      rendererResult = await obsOverlayRenderer.render(payload, context);
    }

    renderResult = finalizeOverlayRenderResult(
      acceptedOverlay,
      renderResult,
      rendererResult
    );

    if (acceptedOverlay?.accepted) {
      if (overlayTiming && typeof overlayTiming.markEmitted === "function") {
        overlayTiming.markEmitted();
      }
      renderResult.meta = {
        ...(renderResult.meta || {}),
        browserRefresh: {
          ok: true,
          skipped: !obsBrowserRefreshOnOverlayEnabled(),
          reason: obsBrowserRefreshOnOverlayEnabled()
            ? "obs_refresh_scheduled"
            : "hub_poll_only_no_obs_refresh"
        }
      };
      scheduleObsBrowserRefresh();
    }
  } catch (err) {
    renderResult = {
      ok: false,
      emitted: false,
      reason: "obs_render_failed",
      error: err.message,
      meta: { acceptedOverlay }
    };
  }

  return renderResult;
}

function finalizeOverlayRenderResult(acceptedOverlay, baseResult, rendererResult) {
  if (typeof overlayEmitResultModule.finalizeOverlayEmitResult === "function") {
    return overlayEmitResultModule.finalizeOverlayEmitResult(
      acceptedOverlay,
      baseResult,
      rendererResult
    );
  }

  const accepted = Boolean(acceptedOverlay?.accepted);
  return {
    ...(baseResult || {}),
    ...(rendererResult || {}),
    emitted: accepted || Boolean(rendererResult?.emitted),
    reason: accepted ? "overlay_state_updated" : safeString(rendererResult?.reason, "overlay_rejected"),
    meta: {
      ...(baseResult?.meta || {}),
      ...(rendererResult?.meta || {}),
      acceptedOverlay
    }
  };
}

async function attachGiftVideoPlan(actionResult = {}) {
  if (actionResult?.shouldPlayVideo !== true) {
    return actionResult;
  }

  if (!videoEngine || typeof videoEngine.peekNextGiftMediaPick !== "function") {
    return actionResult;
  }

  const tier = safeString(
    actionResult.tier ||
      actionResult.videoTier ||
      actionResult.support?.tier,
    "T1"
  ).toUpperCase();

  const giftVideoPick = videoEngine.peekNextGiftMediaPick(tier);
  if (!giftVideoPick) {
    return actionResult;
  }

  const timing =
    giftVideoPick.timing ||
    (typeof videoEngineModule.resolveGiftVideoTiming === "function"
      ? videoEngineModule.resolveGiftVideoTiming(giftVideoPick, runtimeConfig, tier)
      : null);

  const snapshot =
    typeof videoEngine.getSnapshot === "function" ? videoEngine.getSnapshot() : {};
  const queueAhead =
    (snapshot.processing ? 1 : 0) + Number(snapshot.queueLength || 0);
  const settleMs = Number(runtimeConfig?.obs?.sceneSwitchSettleMs) || 280;
  const playbackMs = Number(timing?.playbackMs) || 5000;
  const maxWaitMs = Number(timing?.maxWaitMs) || playbackMs + 5000;
  const deferVoiceMs = queueAhead * playbackMs + maxWaitMs + settleMs + 180;

  return {
    ...actionResult,
    meta: {
      ...(actionResult.meta || {}),
      giftVideoPick,
      giftVideoTiming: {
        ...(timing || {}),
        queueAhead,
        deferVoiceMs
      }
    }
  };
}

async function executeVideo(actionResult, normalizedEvent, eventId, options = {}) {
  if (!videoEngine || typeof videoEngine.enqueueGiftPlayback !== "function") {
    return { ok: false, skipped: true, reason: "video_engine_missing" };
  }

  const tier =
    actionResult?.tier ||
    actionResult?.videoTier ||
    actionResult?.support?.tier ||
    normalizedEvent?.support?.tier ||
    "T1";

  const maxWaitMs =
    runtimeConfig?.obs?.reconnect?.maxWaitForReadyMs ?? 15000;

  if (!getObsConnected()) {
    await forceReconnectObs("gift_video_precheck");
  }

  const obsReady = await ensureObsConnectedWithRetry(
    "gift_video",
    maxWaitMs
  );

  if (!obsReady.ok) {
    writeLog("mia-events", {
      ts: Date.now(),
      stage: "video_skipped_obs_offline",
      tier,
      eventId,
      attempts: obsReady.attempts || 1
    });

    return {
      ok: false,
      skipped: true,
      reason: "obs_not_connected",
      tier,
      hint: "Spusť OBS a zapni WebSocket server na portu 4455."
    };
  }

  const bowlPlan =
    typeof bowlFullVideoModule.resolveBowlFullSpecialPlayback === "function"
      ? bowlFullVideoModule.resolveBowlFullSpecialPlayback(actionResult, {
          runtimeConfig,
          outputState: getOutputState(),
          kojnozoutState: getKojnozoutState(),
          bowlBeforeImpact: options.bowlBeforeImpact,
          bowlAfterImpact: getKojnozoutState()?.bowlPercent,
          now: Date.now()
        })
      : { play: false };

  if (bowlPlan.play && typeof videoEngine.playSpecialEvent === "function") {
    const specialOptions = {
      reason: "bowl_full_special",
      waitForMediaEnd: false
    };

    if (bowlPlan.sourceName) {
      specialOptions.sourceName = bowlPlan.sourceName;
    }

    if (typeof bowlFullVideoModule.noteBowlFullSpecialPlayed === "function") {
      bowlFullVideoModule.noteBowlFullSpecialPlayed(getOutputState(), {
        at: Date.now(),
        reason: bowlPlan.reason,
        tier: bowlPlan.tier,
        sourceName: bowlPlan.sourceName
      });
    }

    writeLog("mia-events", {
      ts: Date.now(),
      stage: "bowl_full_special_video_started",
      tier: bowlPlan.tier,
      sourceName: bowlPlan.sourceName || null,
      eventId,
      bowlBefore: bowlPlan.bowlBefore,
      bowlAfter: bowlPlan.bowlAfter,
      trigger: bowlPlan.reason
    });

    void videoEngine
      .playSpecialEvent(bowlPlan.tier || "T4", normalizedEvent, specialOptions)
      .then((specialResult) => {
        if (!specialResult?.ok) {
          writeLog("mia-events", {
            ts: Date.now(),
            stage: "bowl_full_special_failed",
            tier: bowlPlan.tier,
            eventId,
            specialReason: specialResult?.reason || "unknown"
          });
        }
      })
      .catch((err) => {
        writeLog("mia-errors", {
          source: "executeVideo.bowlFullSpecial",
          tier: bowlPlan.tier,
          eventId,
          error: err.message
        });
      });

    return {
      ok: true,
      skipped: false,
      started: true,
      mode: "special",
      tier: bowlPlan.tier,
      sourceName: bowlPlan.sourceName || null,
      reason: "bowl_full_special"
    };
  }

  let playbackTier = tier;

  if (bowlPlan.play) {
    playbackTier = bowlPlan.tier || tier;
  }

  try {
    return await videoEngine.enqueueGiftPlayback(
      playbackTier,
      {
        ...normalizedEvent,
        giftVideoPick: actionResult?.meta?.giftVideoPick || null
      },
      eventId
    );
  } catch (err) {
    writeLog("mia-errors", {
      source: "executeVideo",
      tier,
      eventId,
      error: err.message
    });

    return {
      ok: false,
      skipped: false,
      reason: "video_enqueue_failed",
      error: err.message
    };
  }
}

function voiceAdmission(result, admission) {
  const base = result && typeof result === "object" ? result : {};
  return { ...base, voiceAdmission: admission };
}

async function runPlaybackStartedHook(hook, playback) {
  if (typeof hook !== "function") return;
  if (!playback || Number(playback.playbackId) <= 0) return;
  try {
    await hook(playback);
  } catch (err) {
    writeLog("mia-errors", {
      source: "voice_playback_started_hook",
      playbackId: playback.playbackId,
      error: err?.message || String(err)
    });
  }
}

async function maybeDeliverMiaVoice(actionResult = {}, voicePlanOverride = null, deliveryOptions = null) {
  const ttsCfg =
    ttsEngine && typeof ttsEngine.resolveConfig === "function"
      ? ttsEngine.resolveConfig(runtimeConfig)
      : null;

  const onPlaybackStarted =
    typeof deliveryOptions?.onPlaybackStarted === "function"
      ? deliveryOptions.onPlaybackStarted
      : null;

  if (!ttsCfg?.enabled || !ttsEngine || typeof ttsEngine.speak !== "function") {
    return voiceAdmission(actionResult, {
      accepted: false,
      queued: false,
      started: false,
      reason: "tts_disabled"
    });
  }

  const plan =
    voicePlanOverride && voicePlanOverride.shouldSpeak
      ? voicePlanOverride
      : typeof speakerRoutingModule.resolveVoiceDeliveryPlan === "function"
        ? speakerRoutingModule.resolveVoiceDeliveryPlan(actionResult)
        : null;

  if (!plan?.shouldSpeak) {
    return voiceAdmission(actionResult, {
      accepted: false,
      queued: false,
      started: false,
      reason: "not_speaking"
    });
  }

  if (actionResult?.voicePreempt || actionResult?.meta?.miaInterrupt) {
    plan.preempt = true;
  }

  if (isVoicePlaybackActive() || voiceSpeakProcessing) {
    const admission = enqueueVoiceSpeak(actionResult, plan, {
      preempt: Boolean(plan.preempt || actionResult?.voicePreempt || actionResult?.meta?.miaInterrupt),
      onPlaybackStarted,
      bypassActionQueue: deliveryOptions?.bypassActionQueue === true
    });
    return voiceAdmission(
      actionResult,
      admission || {
        accepted: false,
        queued: false,
        started: false,
        reason: "not_queued"
      }
    );
  }

  voiceSpeakProcessing = true;
  try {
    return await executeVoicePlanDelivery(actionResult, plan, { onPlaybackStarted });
  } finally {
    voiceSpeakProcessing = false;
  }
}

async function executeVoicePlanDelivery(actionResult = {}, plan = {}, deliveryOptions = null) {
  const onPlaybackStarted =
    typeof deliveryOptions?.onPlaybackStarted === "function"
      ? deliveryOptions.onPlaybackStarted
      : null;
  const ttsCfg =
    ttsEngine && typeof ttsEngine.resolveConfig === "function"
      ? ttsEngine.resolveConfig(runtimeConfig)
      : null;

  if (!ttsCfg?.enabled || !ttsEngine || typeof ttsEngine.speak !== "function") {
    return voiceAdmission(actionResult, {
      accepted: false,
      queued: false,
      started: false,
      reason: "tts_disabled"
    });
  }

  if (!plan?.shouldSpeak) {
    return voiceAdmission(actionResult, {
      accepted: false,
      queued: false,
      started: false,
      reason: "not_speaking"
    });
  }

  const {
    text,
    voiceMode,
    voiceSpeaker = "mia",
    primaryOwner,
    companionOwner,
    companionVoiceText = ""
  } = plan;

  const speakerHint = safeString(
    voiceSpeaker || primaryOwner || companionOwner
  ).toLowerCase();
  const speaker =
    speakerHint === "kojnozout" || speakerHint === "kojnozrout"
      ? "kojnozout"
      : "mia";
  const ttsDedupeKey = `${voiceMode}|${speaker}|${text.slice(0, 180)}`;
  const nowBeforeSpeak = Date.now();
  const normalizeSpeakText =
    typeof speakerRoutingModule.normalizeSpeakText === "function"
      ? speakerRoutingModule.normalizeSpeakText
      : (value) =>
          safeString(value)
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();
  const isSameUtterance =
    typeof speakerRoutingModule.isSameUtterance === "function"
      ? speakerRoutingModule.isSameUtterance
      : (a, b) => normalizeSpeakText(a) === normalizeSpeakText(b);
  const textKey = normalizeSpeakText(text).slice(0, 200);

  if (
    ttsDedupeKey === lastTtsSpeakKey &&
    nowBeforeSpeak - lastTtsSpeakAt < 4500
  ) {
  writeLog("mia-events", {
    ts: nowBeforeSpeak,
    stage: "tts_speak_deduped",
    voiceMode,
    speaker,
    textPreview: text.slice(0, 80)
  });
    return voiceAdmission(actionResult, {
      accepted: false,
      queued: false,
      started: false,
      reason: "tts_speak_deduped"
    });
  }

  // Stejná věta nesmí znít podruhé jiným characterem (MIA+Koj double speak).
  if (
    textKey &&
    textKey === lastTtsTextKey &&
    nowBeforeSpeak - lastTtsSpeakAt < 6000
  ) {
    writeLog("mia-events", {
      ts: nowBeforeSpeak,
      stage: "tts_speak_deduped_utterance",
      voiceMode,
      speaker,
    textPreview: text.slice(0, 80)
  });
    return voiceAdmission(actionResult, {
      accepted: false,
      queued: false,
      started: false,
      reason: "tts_speak_deduped_utterance"
    });
  }

  const voiceResult = await ttsEngine.speak({
    text,
    speaker,
    runtimeConfig,
    language:
      actionResult?.meta?.language ||
      actionResult?.overlayPayload?.meta?.language ||
      languageModule.resolveDefaultLanguage?.(runtimeConfig) ||
      "cs"
  });

  if (!voiceResult?.ok) {
    writeLog("mia-errors", {
      source: "tts_speak",
      speaker,
      reason: voiceResult?.reason || "tts_failed",
      text: text.slice(0, 120)
    });
    return voiceAdmission(actionResult, {
      accepted: false,
      queued: false,
      started: false,
      reason: voiceResult?.reason || "tts_failed"
    });
  }

  writeLog("mia-events", {
    ts: Date.now(),
    stage: "tts_speak",
    speaker,
    voiceMode,
    provider: voiceResult.provider,
    voice: voiceResult.voice,
    cached: Boolean(voiceResult.cached),
    chars: text.length,
    audioUrl: voiceResult.audioUrl
  });

  lastTtsSpeakKey = ttsDedupeKey;
  lastTtsTextKey = textKey;
  lastTtsSpeakAt = nowBeforeSpeak;

  const now = Date.now();
  voicePlaybackSeq += 1;
  const durationMs = Math.max(
    800,
    Number(voiceResult.durationMs) || Math.max(1200, text.length * 70)
  );
  const playbackId = voicePlaybackSeq;
  let lipTrack = null;
  try {
    const paintCore = require("../shared/mia-paint-core");
    if (typeof paintCore.buildLiveLipTrackFromText === "function") {
      lipTrack = paintCore.buildLiveLipTrackFromText(text, { durationMs });
    }
  } catch (_err) {
    lipTrack = null;
  }
  voicePlaybackState = {
    playbackId,
    speaker,
    audioUrl: voiceResult.audioUrl,
    textPreview: text,
    updatedAt: now,
    holdUntilTs: voiceHoldUntilTs(now, voiceResult.durationMs),
    lipTrack,
    // Jediný audio authority — Koj/MIA bubble overlaye nesmí hrát stejný TTS.
    audioSink: "mia_voice",
    exclusiveAudio: true
  };

  await runPlaybackStartedHook(onPlaybackStarted, {
    playbackId: voicePlaybackState.playbackId,
    speaker,
    audioUrl: voicePlaybackState.audioUrl,
    text,
    holdUntilTs: voicePlaybackState.holdUntilTs,
    durationMs: voiceResult.durationMs,
    language: actionResult?.meta?.language || plan?.language || ""
  });

  // Phase 13x — async upgrade to amplitude lip from TTS file (non-blocking)
  const audioPath =
    voiceResult.filePath ||
    (voiceResult.audioUrl && String(voiceResult.audioUrl).startsWith("/audio-cache/")
      ? require("path").join(
          __dirname,
          "..",
          "mia-output-overlay",
          "audio-cache",
          require("path").basename(voiceResult.audioUrl)
        )
      : null);
  if (audioPath) {
    setImmediate(() => {
      try {
        const paintCore = require("../shared/mia-paint-core");
        if (typeof paintCore.buildLiveLipTrackSmart !== "function") return;
        const ampTrack = paintCore.buildLiveLipTrackSmart({
          text,
          audioPath,
          durationMs
        });
        if (
          ampTrack?.provider === "audio_amplitude_live_v1" &&
          voicePlaybackState?.playbackId === playbackId
        ) {
          voicePlaybackState = {
            ...voicePlaybackState,
            lipTrack: ampTrack
          };
          invalidateOverlayStateCache();
        }
      } catch (_err) {
        /* keep text lipTrack */
      }
    });
  }

  mirrorSpeechOverlayFromVoice({
    speaker,
    text,
    holdUntilTs: voicePlaybackState.holdUntilTs,
    source: voiceMode === "companion" ? "tts_companion_mirror" : "tts_primary_mirror",
    meta: {
      voiceMode,
      playbackId: voicePlaybackState.playbackId
    }
  });
  invalidateOverlayStateCache();

  if (voicePriorityLayer && typeof voicePriorityLayer.activateVoicePriority === "function") {
    voicePriorityLayer.activateVoicePriority({
      owner: speaker,
      stage: "voice",
      source: voiceMode === "companion" ? "tts_companion" : "tts_primary",
      holdMs: Math.max(2500, voicePlaybackState.holdUntilTs - now)
    });
  }

  scheduleVoiceSpeakDrain();

  recordVoicePlanReply(actionResult, plan, speaker, text);

  const pendingCompanion =
    companionVoiceText ||
    safeString(actionResult?.meta?.pendingCompanionVoice);
  const companionIsDuplicate =
    pendingCompanion && isSameUtterance(text, pendingCompanion);
  const dualVoiceEnabled =
    typeof speakerRoutingModule.isDualVoiceEnabled === "function"
      ? speakerRoutingModule.isDualVoiceEnabled()
      : String(process.env.MIA_DUAL_VOICE || "").trim() === "1";

  if (
    dualVoiceEnabled &&
    pendingCompanion &&
    !companionIsDuplicate &&
    voiceMode === "primary" &&
    speaker === "kojnozout"
  ) {
    const companionDelayMs = Math.max(
      350,
      Number(voiceResult.durationMs || 2500) + 220
    );
    setTimeout(() => {
      const companionUserLabel =
        safeString(actionResult?.overlayPayload?.userLabel) ||
        safeString(actionResult?.overlayPayload?.user) ||
        safeString(actionResult?.userLabel);

      void maybeDeliverMiaVoice({
        overlayPayload: {
          owner: "mia",
          userLabel: companionUserLabel,
          user: companionUserLabel
        },
        companionOverlayPayload: {
          owner: "mia",
          text: pendingCompanion
        },
        meta: {
          companionVoiceOnly: true,
          userLabel: companionUserLabel
        }
      }).catch((err) => {
        writeLog("mia-errors", {
          source: "mia_voice_companion_after_koj",
          error: err.message
        });
      });
    }, companionDelayMs);
  } else if (companionIsDuplicate) {
    writeLog("mia-events", {
      ts: Date.now(),
      stage: "tts_companion_suppressed_duplicate",
      speaker,
      textPreview: String(pendingCompanion || "").slice(0, 80)
    });
  } else if (pendingCompanion && !dualVoiceEnabled) {
    writeLog("mia-events", {
      ts: Date.now(),
      stage: "tts_companion_suppressed_dual_voice_off",
      speaker,
      textPreview: String(pendingCompanion || "").slice(0, 80)
    });
  }

  const withMeta = {
    ...actionResult,
    voicePlayback: voicePlaybackState,
    meta: {
      ...(actionResult.meta || {}),
      miaVoice: speaker === "mia",
      kojVoice: speaker === "kojnozout",
      miaVoiceMode: voiceMode,
      voiceSpeaker: speaker,
      overlaySuppressed: voiceMode === "primary" || voiceMode === "companion",
      speechRouting: {
        primaryOwner,
        companionOwner,
        kojOverlaySuppressed: speaker === "kojnozout" && voiceMode === "primary",
        pendingCompanionVoice:
          dualVoiceEnabled && !companionIsDuplicate && pendingCompanion
            ? pendingCompanion
            : null,
        companionSuppressedReason: companionIsDuplicate
          ? "duplicate_utterance"
          : pendingCompanion && !dualVoiceEnabled
            ? "dual_voice_disabled"
            : null
      }
    }
  };

  const delivered =
    typeof speakerRoutingModule.applyVoiceOverlayPolicy === "function"
      ? speakerRoutingModule.applyVoiceOverlayPolicy(withMeta, voiceMode, speaker)
      : withMeta;

  return voiceAdmission(delivered, {
    accepted: true,
    queued: false,
    started: true,
    playbackId: voicePlaybackState.playbackId
  });
}

function recordVoicePlanReply(actionResult = {}, plan = {}, speaker = "mia", text = "") {
  if (plan?.recordReply === false) return;
  if (typeof sessionMemoryModule.observeBotReply !== "function") {
    return;
  }

  const userLabel =
    safeString(actionResult?.overlayPayload?.userLabel) ||
    safeString(actionResult?.overlayPayload?.user) ||
    safeString(actionResult?.userLabel) ||
    safeString(actionResult?.meta?.userLabel);

  const safeText = safeString(text);
  if (!userLabel || !safeText) {
    return;
  }

  try {
    sessionMemoryModule.observeBotReply({
      speaker,
      userLabel,
      text: safeText,
      source: safeString(plan.voiceMode, "voice"),
      intentType: safeString(actionResult.responseContract?.intent)
    });
  } catch (err) {
    writeLog("mia-errors", {
      source: "session_memory_bot_reply",
      error: err.message
    });
  }
}

async function deliverActionVoice(actionResult = {}) {
  const voicePlan =
    typeof speakerRoutingModule.resolveVoiceDeliveryPlan === "function"
      ? speakerRoutingModule.resolveVoiceDeliveryPlan(actionResult)
      : null;

  if (!voicePlan?.shouldSpeak) {
    return actionResult;
  }

  const kojPrimary =
    safeString(voicePlan.voiceSpeaker || voicePlan.primaryOwner).toLowerCase() ===
      "kojnozout" ||
    safeString(voicePlan.voiceSpeaker || voicePlan.primaryOwner).toLowerCase() ===
      "kojnozrout";

  const deferMiaForVideo =
    typeof speakerRoutingModule.shouldDeferVoiceForGiftVideo === "function" &&
    speakerRoutingModule.shouldDeferVoiceForGiftVideo(actionResult);

  if (kojPrimary) {
    actionResult = await maybeDeliverMiaVoice(actionResult, voicePlan);
  }

  if (deferMiaForVideo) {
    const deferredVoicePlan =
      typeof speakerRoutingModule.resolveDeferredVoicePlan === "function"
        ? speakerRoutingModule.resolveDeferredVoicePlan(actionResult)
        : null;

    if (
      deferredVoicePlan?.shouldSpeak &&
      typeof speakerRoutingModule.applyVoiceOverlayPolicy === "function"
    ) {
      actionResult = speakerRoutingModule.applyVoiceOverlayPolicy(
        actionResult,
        deferredVoicePlan.voiceMode,
        deferredVoicePlan.voiceSpeaker || "mia"
      );
    }

    return {
      ...actionResult,
      meta: {
        ...(actionResult.meta || {}),
        miaVoiceDeferredForVideo: Boolean(deferredVoicePlan?.shouldSpeak),
        deferredVoicePlan
      }
    };
  }

  if (!kojPrimary) {
    actionResult = await maybeDeliverMiaVoice(actionResult, voicePlan);
  }

  return actionResult;
}

function scheduleDeferredMiaVoice(actionResult = {}, delayMs = 0) {
  const safeDelay = Math.max(0, Number(delayMs) || 0);
  const deferredPlan = actionResult?.meta?.deferredVoicePlan || null;

  writeLog("mia-events", {
    ts: Date.now(),
    stage: "tts_deferred_for_gift_video",
    delayMs: safeDelay,
    tier: actionResult?.tier || actionResult?.support?.tier || null,
    hasDeferredPlan: Boolean(deferredPlan?.text),
    speaker: deferredPlan?.voiceSpeaker || deferredPlan?.primaryOwner || null,
    voiceMode: deferredPlan?.voiceMode || null
  });

  setTimeout(() => {
    void maybeDeliverMiaVoice(actionResult, deferredPlan).catch((err) => {
      writeLog("mia-errors", {
        source: "mia_voice_deferred",
        error: err.message
      });
    });
  }, safeDelay);
}

function getVoicePlaybackSnapshot() {
  const queueLength = voiceSpeakQueue.length;
  const now = Date.now();

  if (!voicePlaybackState || Number(voicePlaybackState.holdUntilTs || 0) <= now) {
    if (queueLength === 0 && !voiceSpeakProcessing) {
      voicePlaybackState = null;
      return null;
    }

    return {
      speaker: voiceSpeakProcessing ? "processing" : "queued",
      textPreview: voiceSpeakQueue[0]?.plan?.text?.slice?.(0, 80) || "",
      queueLength,
      queueProcessing: voiceSpeakProcessing,
      holdUntilTs: 0,
      updatedAt: now
    };
  }

  return {
    ...cloneJson(voicePlaybackState, voicePlaybackState),
    queueLength,
    queueProcessing: voiceSpeakProcessing
  };
}

function enqueueVoiceSpeak(actionResult = {}, plan = {}, options = {}) {
  const preempt =
    options.preempt === true ||
    plan.preempt === true ||
    actionResult?.voicePreempt === true ||
    actionResult?.meta?.miaInterrupt === true;

  // Phase 2: consult Director when enabled (speaker / coalesce / no dual revive).
  let directedPlan = { ...plan };
  try {
    if (miaDirector.isDirectorEnabled(runtimeConfig)) {
      const direction =
        actionResult?.meta?.miaDirection ||
        actionResult?.normalized?.miaDirection ||
        options.direction ||
        miaDirector.planDirection({
          event: actionResult?.normalized?.miaRuntimeEvent || {
            type: "gift",
            user: {
              id: actionResult?.meta?.userId,
              name: actionResult?.overlayPayload?.userLabel
            },
            gift: {
              miaPoints: actionResult?.meta?.miaPoints,
              streamTier: plan.tier || actionResult?.meta?.streamTier
            }
          },
          runtimeConfig,
          kojVitals:
            typeof getKojnozoutState === "function" ? getKojnozoutState() : {},
          viewerMemory: actionResult?.normalized?.viewerMemory || null,
          comboMoment: actionResult?.normalized?.phase2ComboMoment || null,
          preferredSpeaker: plan.voiceSpeaker || plan.primaryOwner
        });
      directedPlan = miaDirector.applyDirectorToVoicePlan(directedPlan, direction);
      actionResult = {
        ...actionResult,
        meta: {
          ...(actionResult.meta || {}),
          miaDirection: direction
        }
      };
    }
  } catch (_dirErr) {
    directedPlan = plan;
  }

  function pushVoiceSpeakEntry(entryActionResult, entryPlan, entryPreempt, entryOptions = null) {
    const onPlaybackStarted =
      typeof entryOptions?.onPlaybackStarted === "function"
        ? entryOptions.onPlaybackStarted
        : null;
    const meta = buildVoiceQueueMeta(entryActionResult, entryPlan);
    pruneStaleNonPaidVoice(meta.queuedAt);

    if (meta.eventId && queueHasEventId(meta.eventId)) {
      logVoiceSpeakDrop(
        { actionResult: entryActionResult, plan: entryPlan, meta },
        "duplicate_event_id"
      );
      scheduleVoiceSpeakDrain();
      return {
        accepted: false,
        queued: false,
        started: false,
        reason: "duplicate_event_id",
        voiceClass: meta.class
      };
    }

    if (tryCoalesceSmallGift(meta)) {
      scheduleVoiceSpeakDrain();
      return {
        accepted: true,
        queued: false,
        started: false,
        coalesced: true,
        reason: "small_gift_same_viewer",
        voiceClass: meta.class
      };
    }

    if (voiceSpeakQueue.length >= MAX_VOICE_SPEAK_QUEUE) {
      const incomingRank = voiceClassRank(meta.class);
      let lowestRank = Infinity;
      for (const item of voiceSpeakQueue) {
        const rank = voiceClassRank(item?.meta?.class);
        if (rank < lowestRank) lowestRank = rank;
      }

      if (incomingRank < lowestRank) {
        const protectsPaid = voiceSpeakQueue.every(
          (item) => item?.meta?.class === "paid_support"
        );
        logVoiceSpeakDrop(
          { actionResult: entryActionResult, plan: entryPlan, meta },
          protectsPaid
            ? "drop_incoming_protect_paid_support"
            : "drop_incoming_lower_priority"
        );
        scheduleVoiceSpeakDrain();
        return {
          accepted: false,
          queued: false,
          started: false,
          reason: protectsPaid
            ? "drop_incoming_protect_paid_support"
            : "drop_incoming_lower_priority",
          voiceClass: meta.class
        };
      }

      let evictIndex = -1;
      let oldestTs = Infinity;
      for (let i = 0; i < voiceSpeakQueue.length; i += 1) {
        const item = voiceSpeakQueue[i];
        if (voiceClassRank(item?.meta?.class) !== lowestRank) continue;
        const ts = Number(item?.meta?.queuedAt) || 0;
        if (evictIndex < 0 || ts < oldestTs || (ts === oldestTs && i < evictIndex)) {
          evictIndex = i;
          oldestTs = ts;
        }
      }

      if (evictIndex >= 0) {
        const dropped = voiceSpeakQueue.splice(evictIndex, 1)[0];
        logVoiceSpeakDrop(
          dropped,
          dropped?.meta?.class === "paid_support"
            ? "evict_oldest_paid_support"
            : "evict_oldest_lowest_priority"
        );
      }
    }

    const entry = {
      actionResult: entryActionResult,
      plan: { ...entryPlan },
      meta
    };
    if (onPlaybackStarted) entry.onPlaybackStarted = onPlaybackStarted;
    if (entryPreempt) voiceSpeakQueue.unshift(entry);
    else voiceSpeakQueue.push(entry);

    writeLog("mia-events", {
      ts: Date.now(),
      stage: entryPreempt ? "voice_speak_preempt_queued" : "voice_speak_queued",
      queueLength: voiceSpeakQueue.length,
      maxQueue: MAX_VOICE_SPEAK_QUEUE,
      voiceClass: meta.class,
      user: meta.user || null,
      eventId: meta.eventId || null,
      queuedAt: meta.queuedAt,
      speaker: entryPlan.voiceSpeaker || entryPlan.primaryOwner || "mia",
      textPreview: safeString(entryPlan.text).slice(0, 80)
    });
    scheduleVoiceSpeakDrain();
    return {
      accepted: true,
      queued: true,
      started: false,
      voiceClass: meta.class
    };
  }

  // Phase 1 / Post-DoD: optional Action Queue — coalesce + single runner (default OFF).
  // Enable: MIA_ACTION_QUEUE=1 | runtimeConfig.phase1.actionQueue.enabled | admin toggle
  // Kill switch: MIA_ACTION_QUEUE=0
  // bypassActionQueue is ephemeral delivery options only. It is not copied onto actionResult.
  if (
    actionQueueModule.isActionQueueEnabled(runtimeConfig) &&
    options.bypassActionQueue !== true
  ) {
    const coalesceMs = actionQueueModule.resolveCoalesceWindowMs(
      directedPlan,
      runtimeConfig,
      runtimeConfig?.actionQueue?.coalesceWindowMs ??
        runtimeConfig?.phase1?.actionQueue?.coalesceWindowMs ??
        actionQueueModule.DEFAULT_COALESCE_MS
    );
    const aq = actionQueueModule.getSharedActionQueue({
      coalesceWindowMs: coalesceMs,
      maxSize: Math.max(16, MAX_VOICE_SPEAK_QUEUE * 4)
    });
    const userKey = safeString(
      actionResult?.meta?.userId ||
        actionResult?.user?.userId ||
        actionResult?.normalized?.user?.userId ||
        directedPlan.userKey ||
        "anon"
    );
    const tierKey = safeString(
      directedPlan.tier ||
        actionResult?.meta?.streamTier ||
        actionResult?.meta?.tier ||
        "T1"
    );
    const directorIntensity = Number(
      directedPlan.directorIntensity ??
        directedPlan.director?.intensity ??
        actionResult?.meta?.miaDirection?.intensity
    );
    const intensity = Number.isFinite(directorIntensity) ? directorIntensity : 0;
    const coalesceKey = `tts:${userKey}:${tierKey}`;
    const speakPriority = actionQueueModule.resolveSpeakPriority(
      { ...directedPlan, directorIntensity: intensity },
      actionResult
    );
    const queued = aq.enqueue({
      type: "gift_thanks",
      priority: speakPriority,
      coalesceKey,
      coalesceWindowMs: coalesceMs,
      preempt,
      directorIntensity: intensity,
      count: 1,
      payload: {
        text: safeString(directedPlan.text).slice(0, 120),
        speaker:
          directedPlan.voiceSpeaker || directedPlan.primaryOwner || "mia",
        directorCoalesceMs: coalesceMs,
        directorIntensity: intensity,
        delivery: { actionResult, plan: { ...directedPlan }, preempt }
      }
    });
    const playbackHook =
      typeof options.onPlaybackStarted === "function" ? options.onPlaybackStarted : null;

    writeLog("mia-events", {
      ts: Date.now(),
      stage: queued.coalesced
        ? "action_queue_tts_coalesced"
        : "action_queue_tts_enqueued",
      queueSize: aq.size(),
      priority: queued.action?.priority,
      coalesceKey,
      coalescedCount: queued.action?.count || 1,
      textPreview: safeString(directedPlan.text).slice(0, 80),
      directorMood: directedPlan.director?.mood || null,
      directorIntensity: intensity
    });

    if (queued.coalesced) {
      // Spam gift thanks merged — skip duplicate TTS speak; runner keeps latest payload.
      // The incoming playback hook is not attached to the already queued line.
      return {
        accepted: true,
        queued: false,
        started: false,
        coalesced: true,
        reason: "action_queue_coalesced"
      };
    }

    if (playbackHook && queued.action?.id) {
      playbackStartHooks.set(queued.action.id, playbackHook);
    }

    const runner = actionQueueModule.getSharedActionQueueRunner({
      speak: async (action) => {
        const delivery = action?.payload?.delivery;
        if (!delivery) {
          return { ok: false, reason: "missing_delivery" };
        }
        const hook = playbackStartHooks.get(action?.id);
        if (action?.id) playbackStartHooks.delete(action.id);
        pushVoiceSpeakEntry(
          delivery.actionResult,
          delivery.plan,
          delivery.preempt === true || action.preempt === true,
          hook ? { onPlaybackStarted: hook } : null
        );
        return { ok: true };
      },
      overlay: async (action) => {
        const payload = action?.payload?.overlayPayload || action?.payload;
        if (!payload || typeof executeOverlay !== "function") {
          return { ok: false, reason: "overlay_unavailable" };
        }
        await executeOverlay(payload, {
          source: "action_queue",
          actionId: action.id
        });
        return { ok: true };
      },
      giftPresent: async (action) => {
        const delivery = action?.payload?.delivery;
        if (!delivery || typeof delivery.run !== "function") {
          return { ok: true, skipped: true, reason: "no_gift_present_delivery" };
        }
        const result = await delivery.run();
        return { ok: true, result };
      },
      onError: (err, action) => {
        writeLog("mia-errors", {
          source: "action_queue_runner",
          type: action?.type || null,
          error: err?.message || String(err)
        });
      }
    });
    runner.kick(0);
    return {
      accepted: true,
      queued: true,
      started: false,
      via: "action_queue"
    };
  }

  return pushVoiceSpeakEntry(actionResult, directedPlan, preempt, {
    onPlaybackStarted: options.onPlaybackStarted
  });
}
  return {
    executeOverlay,
    executeOverlayImmediate,
    flushOverlayQueue,
    executeGiftPresentationOverlays,
    activateComboMoment,
    activateBossCinematic,
    activateT0Flyby,
    attachGiftVideoPlan,
    executeVideo,
    deliverActionVoice,
    maybeDeliverMiaVoice,
    scheduleDeferredMiaVoice,
    getVoicePlaybackSnapshot,
    mirrorSpeechOverlayFromVoice,
    isVoicePlaybackActive,
    bumpVoicePlaybackSeq: () => {
      voicePlaybackSeq += 1;
      return voicePlaybackSeq;
    },
    setVoicePlaybackState: (next) => {
      voicePlaybackState = next;
      if (
        !isVoicePlaybackActive() &&
        voiceSpeakQueue.length > 0 &&
        !voiceSpeakProcessing
      ) {
        scheduleVoiceSpeakDrain(0, { force: true });
      }
    },
    getVoicePlaybackState: () => voicePlaybackState,
    getVoicePlaybackSeq: () => voicePlaybackSeq,
    getVoiceSpeakQueueLength: () => voiceSpeakQueue.length
  };
}

module.exports = { createDeliveryRuntime };
