"use strict";

async function phaseObserve(ctx, deps) {
  const {
    t0EngagementModule,
    executeOverlay,
    activateT0Flyby,
    getUserLabel,
    pushRecentParticipant,
    pushChatFeed,
    proactiveHostModule,
    handleSoloStreamChatActivity,
    chatLexiconModule,
    sessionMemoryModule,
    chatBrain,
    runtimeConfig,
    immersiveSceneModule,
    applyCareQuestProgress,
    deliverQuestCompleteMoment,
    writeLog,
    safeString
  } = deps;

  const { normalized, eventType } = ctx;
  const { outputState, overlayState } = ctx.refs;

  if (
    typeof t0EngagementModule.processT0Engagement === "function" &&
    typeof t0EngagementModule.isT0CommunityEvent === "function" &&
    t0EngagementModule.isT0CommunityEvent(eventType)
  ) {
    try {
      const t0Result = t0EngagementModule.processT0Engagement({
        state: ctx.runtime.giftSupporterProfile,
        normalized,
        eventType
      });

      if (t0Result?.state) {
        ctx.runtime.giftSupporterProfile = t0Result.state;
      }
      if (t0Result?.overlayPlan) {
        await executeOverlay(t0Result.overlayPlan, { source: "t0_engagement" });
      }
      if (t0Result?.flybyPlan) {
        activateT0Flyby(t0Result.flybyPlan);
      }
      if (!t0Result?.skipped) {
        writeLog("t0-engagement", {
          eventType,
          user: getUserLabel(normalized),
          xpAward: t0Result?.xpAward || 0,
          cumulativeXp: t0Result?.recorded?.supporter?.cumulativeXp || 0,
          giftLevel: t0Result?.recorded?.supporter?.giftLevel || 1,
          overlay: Boolean(t0Result?.overlayPlan)
        });
      }
    } catch (err) {
      writeLog("mia-errors", { source: "t0_engagement", error: err.message });
    }
  }

  if (eventType === "FOLLOW" || eventType === "SHARE") {
    pushRecentParticipant(normalized, eventType === "FOLLOW" ? "follow" : "share");
  }

  if (eventType === "COMMENT") {
    pushChatFeed(normalized);
    pushRecentParticipant(normalized, "chat");

    if (typeof proactiveHostModule.resetProactiveHostOnChat === "function") {
      try {
        proactiveHostModule.resetProactiveHostOnChat(outputState);
      } catch (err) {
        writeLog("mia-errors", { source: "proactive_host_reset", error: err.message });
      }
    }

    handleSoloStreamChatActivity().catch((err) => {
      writeLog("mia-errors", { source: "solo_stream_chat_exit", error: err.message });
    });

    if (typeof chatLexiconModule.observeChatMessage === "function") {
      try {
        chatLexiconModule.observeChatMessage({
          message: safeString(normalized.message),
          userLabel: getUserLabel(normalized),
          platform: safeString(normalized.platform, "unknown")
        });
      } catch (err) {
        writeLog("mia-errors", { source: "chat_lexicon_observe", error: err.message });
      }
    }

    if (typeof sessionMemoryModule.observeChatMessage === "function") {
      try {
        const intent =
          typeof chatBrain.resolveChatIntent === "function"
            ? chatBrain.resolveChatIntent(safeString(normalized.message))
            : null;
        sessionMemoryModule.observeChatMessage({
          message: safeString(normalized.message),
          userLabel: getUserLabel(normalized),
          intentType: safeString(intent?.type)
        });

        try {
          const moodBrainRuntime = require("../MIA_MOOD_BRAIN");
          if (typeof moodBrainRuntime.observeCommentMood === "function") {
            moodBrainRuntime.observeCommentMood(overlayState, {
              message: safeString(normalized.message),
              intent
            });
          }
        } catch (moodErr) {
          writeLog("mia-errors", { source: "mood_brain_observe", error: moodErr.message });
        }
      } catch (err) {
        writeLog("mia-errors", { source: "session_memory_observe", error: err.message });
      }
    }

    if (
      runtimeConfig?.immersiveScene?.chatAutoApply === true &&
      typeof immersiveSceneModule.tryAutoApplyFromChat === "function"
    ) {
      try {
        const autoScene = immersiveSceneModule.tryAutoApplyFromChat(
          overlayState,
          {
            chatText: safeString(normalized.message),
            userLabel: getUserLabel(normalized),
            nickname: getUserLabel(normalized)
          },
          { chatCooldownMs: runtimeConfig?.immersiveScene?.chatCooldownMs }
        );
        if (autoScene?.ok) {
          writeLog("mia-events", {
            source: "immersive_chat_auto",
            environmentId: autoScene.applied?.environmentId,
            mode: autoScene.applied?.mode,
            userLabel: getUserLabel(normalized)
          });
        }
      } catch (err) {
        writeLog("mia-errors", { source: "immersive_chat_auto", error: err.message });
      }
    }
  }

  if (
    eventType === "COMMENT" ||
    eventType === "GIFT" ||
    eventType === "LIKE" ||
    eventType === "FOLLOW" ||
    eventType === "SHARE"
  ) {
    try {
      const questProgress = applyCareQuestProgress(normalized);
      if (questProgress.questCompleted) {
        await deliverQuestCompleteMoment(questProgress.questDef);
      }
    } catch (err) {
      writeLog("mia-errors", { source: "care_quest_progress", error: err.message });
    }
  }

  return ctx;
}

module.exports = { phaseObserve };
