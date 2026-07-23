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

function scheduleVoiceSpeakDrain(delayMs = null) {
  if (voiceSpeakDrainTimer) return;

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

  const next = voiceSpeakQueue.shift();
  if (!next) return;

  voiceSpeakProcessing = true;
  try {
    await executeVoicePlanDelivery(next.actionResult, next.plan);
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

async function maybeDeliverMiaVoice(actionResult = {}, voicePlanOverride = null) {
  const ttsCfg =
    ttsEngine && typeof ttsEngine.resolveConfig === "function"
      ? ttsEngine.resolveConfig(runtimeConfig)
      : null;

  if (!ttsCfg?.enabled || !ttsEngine || typeof ttsEngine.speak !== "function") {
    return actionResult;
  }

  const plan =
    voicePlanOverride && voicePlanOverride.shouldSpeak
      ? voicePlanOverride
      : typeof speakerRoutingModule.resolveVoiceDeliveryPlan === "function"
        ? speakerRoutingModule.resolveVoiceDeliveryPlan(actionResult)
        : null;

  if (!plan?.shouldSpeak) {
    return actionResult;
  }

  if (actionResult?.voicePreempt || actionResult?.meta?.miaInterrupt) {
    plan.preempt = true;
  }

  if (isVoicePlaybackActive() || voiceSpeakProcessing) {
    enqueueVoiceSpeak(actionResult, plan, {
      preempt: Boolean(plan.preempt || actionResult?.voicePreempt || actionResult?.meta?.miaInterrupt)
    });
    return actionResult;
  }

  voiceSpeakProcessing = true;
  try {
    return await executeVoicePlanDelivery(actionResult, plan);
  } finally {
    voiceSpeakProcessing = false;
  }
}

async function executeVoicePlanDelivery(actionResult = {}, plan = {}) {
  const ttsCfg =
    ttsEngine && typeof ttsEngine.resolveConfig === "function"
      ? ttsEngine.resolveConfig(runtimeConfig)
      : null;

  if (!ttsCfg?.enabled || !ttsEngine || typeof ttsEngine.speak !== "function") {
    return actionResult;
  }

  if (!plan?.shouldSpeak) {
    return actionResult;
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
    return actionResult;
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
    return actionResult;
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
    return actionResult;
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

  return typeof speakerRoutingModule.applyVoiceOverlayPolicy === "function"
    ? speakerRoutingModule.applyVoiceOverlayPolicy(withMeta, voiceMode, speaker)
    : withMeta;
}

function recordVoicePlanReply(actionResult = {}, plan = {}, speaker = "mia", text = "") {
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

  function pushVoiceSpeakEntry(entryActionResult, entryPlan, entryPreempt) {
    while (voiceSpeakQueue.length >= MAX_VOICE_SPEAK_QUEUE) {
      const dropped = voiceSpeakQueue.shift();
      writeLog("mia-events", {
        ts: Date.now(),
        stage: "voice_speak_dropped",
        reason: "queue_overflow",
        maxQueue: MAX_VOICE_SPEAK_QUEUE,
        speaker: dropped?.plan?.voiceSpeaker || dropped?.plan?.primaryOwner || "mia",
        textPreview: safeString(dropped?.plan?.text).slice(0, 80)
      });
    }

    const entry = { actionResult: entryActionResult, plan: { ...entryPlan } };
    if (entryPreempt) voiceSpeakQueue.unshift(entry);
    else voiceSpeakQueue.push(entry);

    writeLog("mia-events", {
      ts: Date.now(),
      stage: entryPreempt ? "voice_speak_preempt_queued" : "voice_speak_queued",
      queueLength: voiceSpeakQueue.length,
      maxQueue: MAX_VOICE_SPEAK_QUEUE,
      speaker: entryPlan.voiceSpeaker || entryPlan.primaryOwner || "mia",
      textPreview: safeString(entryPlan.text).slice(0, 80)
    });
    scheduleVoiceSpeakDrain();
  }

  // Phase 1 / Post-DoD: optional Action Queue — coalesce + single runner (default OFF).
  // Enable: MIA_ACTION_QUEUE=1 | runtimeConfig.phase1.actionQueue.enabled | admin toggle
  // Kill switch: MIA_ACTION_QUEUE=0
  if (actionQueueModule.isActionQueueEnabled(runtimeConfig)) {
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
      return;
    }

    const runner = actionQueueModule.getSharedActionQueueRunner({
      speak: async (action) => {
        const delivery = action?.payload?.delivery;
        if (!delivery) {
          return { ok: false, reason: "missing_delivery" };
        }
        pushVoiceSpeakEntry(
          delivery.actionResult,
          delivery.plan,
          delivery.preempt === true || action.preempt === true
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
    return;
  }

  pushVoiceSpeakEntry(actionResult, directedPlan, preempt);
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
    },
    getVoicePlaybackState: () => voicePlaybackState,
    getVoicePlaybackSeq: () => voicePlaybackSeq,
    getVoiceSpeakQueueLength: () => voiceSpeakQueue.length
  };
}

module.exports = { createDeliveryRuntime };
