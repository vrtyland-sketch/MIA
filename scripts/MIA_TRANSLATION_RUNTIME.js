"use strict";

/**
 * Bilingual interpreter — chat/mic translation with public captions + TTS.
 */

function createTranslationRuntime(deps = {}) {
  const {
    writeLog,
    safeString,
    ttsEngine,
    runtimeConfig,
    voiceHoldUntilTs,
    deliveryRuntime,
    translationRuntime,
    setOverlay,
    invalidateOverlayStateCache,
    translateModule,
    languageModule,
    getUserLabel
  } = deps;

  async function speakTranslatedLine({
    text,
    language = "cs",
    speaker = "mia",
    title = "Překlad",
    subtext = "",
    original = "",
    channel = "streamer",
    source = "translation"
  } = {}) {
    const phrase = safeString(text);
    if (!phrase) return { ok: false, reason: "empty" };
    if (!ttsEngine || typeof ttsEngine.speak !== "function") {
      return { ok: false, reason: "tts_disabled" };
    }

    const owner = speaker === "kojnozout" ? "kojnozout" : "mia";
    const voiceResult = await ttsEngine.speak({
      text: phrase,
      speaker: owner,
      runtimeConfig,
      language
    });
    if (!voiceResult?.ok) {
      return { ok: false, reason: voiceResult?.reason || "tts_failed" };
    }

    const now = Date.now();
    const holdUntil = voiceHoldUntilTs(now, voiceResult.durationMs);
    const holdMs = Math.max(9000, holdUntil - now);
    const captionMeta = {
      source,
      language,
      title,
      subtext: safeString(subtext),
      original: safeString(original || subtext),
      translated: phrase,
      channel,
      translation: true,
      publicCaption: true
    };

    const runtime = typeof deliveryRuntime === "function" ? deliveryRuntime() : null;
    const playbackId = runtime?.bumpVoicePlaybackSeq?.() ?? 0;
    runtime?.setVoicePlaybackState?.({
      playbackId,
      speaker: owner,
      audioUrl: voiceResult.audioUrl,
      textPreview: phrase,
      title,
      subtext: safeString(subtext),
      original: safeString(original || subtext),
      translated: phrase,
      channel,
      updatedAt: now,
      holdUntilTs: holdUntil,
      meta: captionMeta
    });

    if (typeof translationRuntime?.setLiveCaption === "function") {
      translationRuntime.setLiveCaption({
        ...captionMeta,
        speaker: owner,
        text: phrase,
        holdMs
      });
    }

    setOverlay(
      {
        owner,
        speaker: owner,
        route: "community",
        title,
        text: phrase,
        subtext: safeString(subtext),
        stage: "translation",
        mood: owner === "kojnozout" ? "playful" : "warm",
        holdMs,
        priority: 5,
        meta: captionMeta
      },
      { force: true, priority: 5, holdMs }
    );
    invalidateOverlayStateCache();

    const waitMs = Math.min(9000, Math.max(0, holdUntil - Date.now()));
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    return {
      ok: true,
      language,
      speaker: owner,
      voice: voiceResult.voice,
      audioUrl: voiceResult.audioUrl,
      durationMs: voiceResult.durationMs,
      title,
      subtext: safeString(subtext)
    };
  }

  async function deliverChatTranslation(normalized = {}) {
    if (typeof translateModule?.translateText !== "function") {
      return { ok: false, reason: "translate_missing" };
    }
    if (
      typeof translationRuntime?.isInterpreterEnabled === "function" &&
      !translationRuntime.isInterpreterEnabled()
    ) {
      return { ok: false, reason: "interpreter_disabled" };
    }

    const message = safeString(normalized.message);
    if (!message || message.length < 3) {
      return { ok: false, reason: "too_short" };
    }

    const streamerLang =
      typeof translateModule.resolveStreamerLanguage === "function"
        ? translateModule.resolveStreamerLanguage(runtimeConfig)
        : "cs";
    const sourceLang = safeString(
      normalized.language ||
        languageModule?.detectLanguage?.(message, { fallback: streamerLang })?.code,
      streamerLang
    );

    if (
      typeof translateModule.isSameLanguage === "function" &&
      translateModule.isSameLanguage(sourceLang, streamerLang)
    ) {
      return { ok: false, reason: "same_language", from: sourceLang };
    }

    translationRuntime.noteForeignLanguage(sourceLang);

    const plan =
      typeof translateModule.resolveChannelPlan === "function"
        ? translateModule.resolveChannelPlan("chat", {
            sourceLang,
            targetLang: streamerLang,
            foreignLang: sourceLang,
            runtimeConfig
          })
        : {
            channel: "chat",
            speaker: "mia",
            roleLabel: "MIA · Chat",
            sourceLang,
            targetLang: streamerLang
          };

    const translated = await translateModule.translateText({
      text: message,
      from: plan.sourceLang,
      to: plan.targetLang,
      runtimeConfig
    });

    if (!translated?.ok || !translated.text) {
      return { ok: false, reason: translated?.reason || "translate_failed", from: sourceLang };
    }

    const userLabel = typeof getUserLabel === "function" ? getUserLabel(normalized) : "divák";
    const caption =
      typeof translateModule.buildPublicCaption === "function"
        ? translateModule.buildPublicCaption({
            channel: plan.channel,
            roleLabel: plan.roleLabel,
            from: plan.sourceLang,
            to: plan.targetLang,
            original: message,
            translated: translated.text,
            userLabel
          })
        : {
            title: `MIA · Chat · ${userLabel}`,
            text: translated.text,
            subtext: message
          };

    const spoken = await speakTranslatedLine({
      text: caption.text,
      language: plan.targetLang,
      speaker: plan.speaker,
      title: caption.title,
      subtext: caption.subtext,
      original: message,
      channel: plan.channel,
      source: "chat_translation_public"
    });

    const payload = {
      ok: true,
      channel: plan.channel,
      speaker: plan.speaker,
      from: plan.sourceLang,
      to: plan.targetLang,
      original: message,
      translated: translated.text,
      userLabel,
      caption,
      public: true,
      voice: spoken
    };
    translationRuntime.setLastChatTranslation(payload);

    writeLog("mia-events", {
      ts: Date.now(),
      stage: "chat_translation_public",
      channel: plan.channel,
      speaker: plan.speaker,
      from: plan.sourceLang,
      to: plan.targetLang,
      userLabel,
      originalPreview: message.slice(0, 80),
      translatedPreview: translated.text.slice(0, 80)
    });

    return payload;
  }

  async function deliverMicTranslation({
    text = "",
    targetLang = "",
    sourceLang = "",
    channel = "",
    auto = true
  } = {}) {
    if (typeof translateModule?.translateText !== "function") {
      return { ok: false, reason: "translate_missing" };
    }
    if (
      typeof translationRuntime?.isInterpreterEnabled === "function" &&
      !translationRuntime.isInterpreterEnabled()
    ) {
      return { ok: false, reason: "interpreter_disabled" };
    }

    const source = safeString(text);
    if (!source) return { ok: false, reason: "empty_text" };

    const useAuto = auto !== false;
    const voiceState =
      typeof translationRuntime?.getVoiceState === "function"
        ? translationRuntime.getVoiceState()
        : {};
    let plan = null;

    if (useAuto && typeof translateModule.resolveAutoInterpreterPlan === "function") {
      plan = translateModule.resolveAutoInterpreterPlan(source, {
        channel: channel || "",
        streamerVoiceLang: voiceState.streamerVoiceLang,
        guestVoiceLang: voiceState.guestVoiceLang,
        lastForeignLanguage: translationRuntime.getReplyLanguage(""),
        runtimeConfig
      });
    } else {
      const foreignLang = translationRuntime.getReplyLanguage(
        targetLang || (safeString(channel).toLowerCase() === "guest" ? sourceLang : "")
      );
      plan =
        typeof translateModule.resolveChannelPlan === "function"
          ? translateModule.resolveChannelPlan(channel || "streamer", {
              sourceLang: sourceLang || "",
              targetLang: targetLang || "",
              foreignLang,
              runtimeConfig
            })
          : {
              channel: "streamer",
              speaker: "mia",
              roleLabel: "MIA · Ty",
              sourceLang: sourceLang || "cs",
              targetLang: targetLang || foreignLang,
              skip: false
            };

      const detected =
        typeof languageModule?.detectLanguage === "function"
          ? languageModule.detectLanguage(source, {
              fallback: plan.sourceLang || "cs"
            })
          : { code: plan.sourceLang };
      if (
        typeof translateModule.isSameLanguage === "function" &&
        translateModule.isSameLanguage(detected.code, plan.targetLang)
      ) {
        plan = {
          ...plan,
          skip: true,
          reason: "same_language",
          detectedLang: detected.code,
          auto: false
        };
      }
    }

    if (typeof translationRuntime?.noteVoiceLanguages === "function") {
      translationRuntime.noteVoiceLanguages({
        streamerLang: plan.streamerVoiceLang,
        guestLang: plan.guestVoiceLang
      });
    }

    if (plan?.skip || plan?.clearForeign) {
      if (plan?.clearForeign && typeof translationRuntime.clearForeignLanguage === "function") {
        translationRuntime.clearForeignLanguage();
        if (typeof translationRuntime.noteVoiceLanguages === "function") {
          translationRuntime.noteVoiceLanguages({
            streamerLang: plan.streamerVoiceLang || "cs",
            guestLang: plan.guestVoiceLang || "cs"
          });
        }
      }
    }

    if (plan?.skip) {
      const voices =
        typeof translationRuntime?.getVoiceState === "function"
          ? translationRuntime.getVoiceState()
          : {};
      const skipPayload = {
        ok: true,
        skipped: true,
        reason: plan.reason || "both_voices_czech",
        auto: plan.auto === true,
        detectedLang: plan.detectedLang || null,
        confidence: plan.confidence || null,
        streamerVoiceLang: voices.streamerVoiceLang || plan.streamerVoiceLang || null,
        guestVoiceLang: voices.guestVoiceLang || plan.guestVoiceLang || null,
        bothCzech: voices.bothCzech !== false,
        original: source,
        translated: source,
        channel: "none",
        public: false
      };
      if (typeof translationRuntime.setLastSkip === "function") {
        translationRuntime.setLastSkip(skipPayload);
      }
      writeLog("mia-events", {
        ts: Date.now(),
        stage: "interpreter_skip",
        reason: skipPayload.reason,
        detectedLang: skipPayload.detectedLang,
        streamerVoiceLang: skipPayload.streamerVoiceLang,
        guestVoiceLang: skipPayload.guestVoiceLang,
        originalPreview: source.slice(0, 80)
      });
      return skipPayload;
    }

    if (plan.noteForeign) {
      translationRuntime.noteForeignLanguage(plan.noteForeign);
    } else if (plan.channel === "guest") {
      translationRuntime.noteForeignLanguage(plan.sourceLang);
    }

    const translated = await translateModule.translateText({
      text: source,
      from: plan.sourceLang,
      to: plan.targetLang,
      runtimeConfig
    });

    if (!translated?.ok || !translated.text) {
      return { ok: false, reason: translated?.reason || "translate_failed" };
    }

    const caption =
      typeof translateModule.buildPublicCaption === "function"
        ? translateModule.buildPublicCaption({
            channel: plan.channel,
            roleLabel: plan.roleLabel,
            from: plan.sourceLang,
            to: plan.targetLang,
            original: source,
            translated: translated.text
          })
        : {
            title: plan.roleLabel,
            text: translated.text,
            subtext: source
          };

    const spoken = await speakTranslatedLine({
      text: caption.text,
      language: plan.targetLang,
      speaker: plan.speaker,
      title: caption.title,
      subtext: caption.subtext,
      original: source,
      channel: plan.channel,
      source: plan.channel === "guest" ? "guest_translation_public" : "mic_translation_public"
    });

    const payload = {
      ok: true,
      skipped: false,
      auto: plan.auto === true,
      reason: plan.reason || "translated",
      detectedLang: plan.detectedLang || plan.sourceLang,
      channel: plan.channel,
      speaker: plan.speaker,
      from: plan.sourceLang,
      to: plan.targetLang,
      original: source,
      translated: translated.text,
      caption,
      public: true,
      voice: spoken
    };

    if (plan.channel === "guest") {
      translationRuntime.setLastGuestTranslation(payload);
    } else {
      translationRuntime.setLastMicTranslation(payload);
    }

    writeLog("mia-events", {
      ts: Date.now(),
      stage: "interpreter_public",
      auto: payload.auto,
      channel: plan.channel,
      speaker: plan.speaker,
      from: plan.sourceLang,
      to: plan.targetLang,
      originalPreview: source.slice(0, 80),
      translatedPreview: translated.text.slice(0, 80)
    });

    return payload;
  }

  return {
    speakTranslatedLine,
    deliverChatTranslation,
    deliverMicTranslation
  };
}

module.exports = { createTranslationRuntime };
