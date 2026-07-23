"use strict";

const path = require("path");
const { validateApp, safeString } = require("./_helpers");

const TTS_TEST_PHRASES = {
  cs: {
    mia: "Ahoj. Jsem MIA. Posloucháš mě? Tady je můj hlas.",
    kojnozout: "Přijímám energii. Miska roste. Digitální signál stabilní."
  },
  en: {
    mia: "Hello. I am MIA. Can you hear me? This is my voice.",
    kojnozout: "I am absorbing energy. The bowl is growing. Signal is stable."
  },
  de: {
    mia: "Hallo. Ich bin MIA. Hörst du mich? Das ist meine Stimme.",
    kojnozout: "Ich nehme Energie auf. Die Schüssel wächst. Signal stabil."
  },
  es: {
    mia: "Hola. Soy MIA. Me escuchas? Esta es mi voz.",
    kojnozout: "Absorbo energía. El bol crece. Señal estable."
  },
  fr: {
    mia: "Bonjour. Je suis MIA. Tu m'entends? Voici ma voix.",
    kojnozout: "J'absorbe l'énergie. Le bol grandit. Signal stable."
  }
};

function registerTtsRoutes(app, ctx = {}) {
  const check = validateApp(app);
  if (!check.ok) return check;

  const {
    ttsEngine,
    languageModule,
    runtimeConfig,
    localAdminGuard,
    overlayStaticDir,
    translationRuntime,
    translateModule,
    deliverMicTranslation,
    MIA_OVERLAY_BASE,
    voiceHoldUntilTs,
    mirrorSpeechOverlayFromVoice,
    invalidateOverlayStateCache,
    bumpVoicePlaybackSeq,
    getVoicePlaybackState,
    setVoicePlaybackState,
    getDuelStateActive
  } = ctx;

  app.get("/tts/test", async (req, res) => {
    try {
      if (!ttsEngine) {
        return res.status(503).json({ ok: false, error: "tts_engine_missing" });
      }

      const speaker =
        safeString(req.query.speaker).toLowerCase() === "koj" ||
        safeString(req.query.speaker).toLowerCase() === "kojnozout"
          ? "kojnozout"
          : "mia";

      const langCode =
        typeof languageModule.normalizeLanguageCode === "function"
          ? languageModule.normalizeLanguageCode(
              req.query.lang || req.query.language,
              languageModule.resolveDefaultLanguage?.(runtimeConfig) || "cs"
            )
          : "cs";
      const pack = TTS_TEST_PHRASES[langCode] || TTS_TEST_PHRASES.cs;
      const phrase =
        safeString(req.query.text) ||
        (speaker === "kojnozout" ? pack.kojnozout : pack.mia);
      const forceFresh = safeString(req.query.fresh).toLowerCase() === "1";
      const voiceResult = await ttsEngine.speak({
        text: forceFresh ? `${phrase} ${Date.now()}` : phrase,
        speaker,
        runtimeConfig,
        language: langCode
      });

      if (!voiceResult?.ok) {
        return res.status(500).json({ ok: false, error: voiceResult?.reason || "tts_failed" });
      }

      const now = Date.now();
      const playbackId = typeof bumpVoicePlaybackSeq === "function" ? bumpVoicePlaybackSeq() : 0;
      const voicePlaybackState = {
        playbackId,
        speaker,
        audioUrl: voiceResult.audioUrl,
        textPreview: phrase,
        updatedAt: now,
        holdUntilTs: voiceHoldUntilTs(now, voiceResult.durationMs)
      };
      if (typeof setVoicePlaybackState === "function") {
        setVoicePlaybackState(voicePlaybackState);
      }

      mirrorSpeechOverlayFromVoice({
        speaker,
        text: phrase,
        holdUntilTs: voicePlaybackState.holdUntilTs,
        source: "tts_test_mirror",
        meta: { language: langCode, voice: voiceResult.voice }
      });
      invalidateOverlayStateCache();

      const base = typeof MIA_OVERLAY_BASE === "function" ? MIA_OVERLAY_BASE() : "";
      res.json({
        ok: true,
        speaker,
        language: langCode,
        languageName:
          typeof languageModule.getLanguageName === "function"
            ? languageModule.getLanguageName(langCode)
            : langCode,
        message:
          speaker === "kojnozout"
            ? `Kojnožrout — ${langCode} (${voiceResult.voice})`
            : `MIA — ${langCode} (${voiceResult.voice})`,
        phrase,
        audioUrl: voiceResult.audioUrl,
        provider: voiceResult.provider,
        voice: voiceResult.voice,
        prosody: voiceResult.prosody || null,
        cached: Boolean(voiceResult.cached),
        voicePlayback: voicePlaybackState,
        compareUrl: `${base}/tts/compare`,
        altTest: `${base}/tts/test?speaker=${speaker === "kojnozout" ? "koj" : "mia"}&lang=${langCode}&fresh=1`,
        langs: Object.keys(TTS_TEST_PHRASES),
        obsUrl: `${base}/mia-voice-overlay.html`
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/mia/say", localAdminGuard, async (req, res) => {
    try {
      if (!ttsEngine) {
        return res.status(503).json({ ok: false, error: "tts_engine_missing" });
      }
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const text = safeString(body.text || req.query?.text);
      if (!text) {
        return res.status(400).json({ ok: false, error: "missing_text" });
      }
      const speakerRaw = safeString(body.speaker || req.query?.speaker).toLowerCase();
      const speaker = speakerRaw === "koj" || speakerRaw === "kojnozout" ? "kojnozout" : "mia";
      const langCode =
        typeof languageModule.normalizeLanguageCode === "function"
          ? languageModule.normalizeLanguageCode(
              body.lang ||
                body.language ||
                req.query?.lang ||
                req.query?.language ||
                (typeof languageModule.detectLanguage === "function"
                  ? languageModule.detectLanguage(text).code
                  : "cs"),
              languageModule.resolveDefaultLanguage?.(runtimeConfig) || "cs"
            )
          : "cs";

      const voiceResult = await ttsEngine.speak({
        text,
        speaker,
        runtimeConfig,
        language: langCode
      });
      if (!voiceResult?.ok) {
        return res.status(500).json({ ok: false, error: voiceResult?.reason || "tts_failed" });
      }

      const now = Date.now();
      const playbackId = typeof bumpVoicePlaybackSeq === "function" ? bumpVoicePlaybackSeq() : 0;
      const voicePlaybackState = {
        playbackId,
        speaker,
        audioUrl: voiceResult.audioUrl,
        textPreview: text.slice(0, 120),
        updatedAt: now,
        holdUntilTs: voiceHoldUntilTs(now, voiceResult.durationMs)
      };
      if (typeof setVoicePlaybackState === "function") {
        setVoicePlaybackState(voicePlaybackState);
      }

      mirrorSpeechOverlayFromVoice({
        speaker,
        text,
        holdUntilTs: voicePlaybackState.holdUntilTs,
        source: "mia_say_remote",
        meta: { language: langCode, voice: voiceResult.voice }
      });
      invalidateOverlayStateCache();

      res.json({
        ok: true,
        speaker,
        language: langCode,
        voice: voiceResult.voice,
        text,
        audioUrl: voiceResult.audioUrl,
        voicePlayback: voicePlaybackState
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/mia-mic", (_req, res) => {
    res.sendFile(path.join(overlayStaticDir, "mia-mic.html"));
  });

  app.get("/mia/translate/state", localAdminGuard, (_req, res) => {
    const duelActive =
      typeof getDuelStateActive === "function" ? Boolean(getDuelStateActive()) : false;
    if (duelActive && typeof translationRuntime.setDuelInterpreter === "function") {
      translationRuntime.setDuelInterpreter(true);
    }
    res.json({
      ok: true,
      duelActive,
      ...(translationRuntime.getState() || {})
    });
  });

  app.post("/mia/translate/mode", localAdminGuard, (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (Object.prototype.hasOwnProperty.call(body, "enabled")) {
      translationRuntime.setInterpreterEnabled(body.enabled !== false);
    }
    if (Object.prototype.hasOwnProperty.call(body, "duel")) {
      translationRuntime.setDuelInterpreter(body.duel === true);
    }
    if (body.clearForeign === true || body.foreignLang === "" || body.foreignLang === null) {
      if (typeof translationRuntime.clearForeignLanguage === "function") {
        translationRuntime.clearForeignLanguage();
      }
    }
    if (body.foreignLang) {
      translationRuntime.noteForeignLanguage(body.foreignLang);
    }
    res.json({ ok: true, ...(translationRuntime.getState() || {}) });
  });

  app.post("/mia/translate/text", localAdminGuard, async (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const text = safeString(body.text);
      if (!text) return res.status(400).json({ ok: false, error: "missing_text" });

      const result = await translateModule.translateText({
        text,
        from: body.from || body.sourceLang || "",
        to: body.to || body.targetLang || "cs",
        runtimeConfig
      });
      res.status(result.ok ? 200 : 500).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/mia/mic/utterance", localAdminGuard, async (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const text = safeString(body.text || body.transcript);
      if (!text) return res.status(400).json({ ok: false, error: "missing_text" });

      const result = await deliverMicTranslation({
        text,
        channel: body.channel || body.role || "",
        targetLang: body.targetLang || body.lang || body.to || "",
        sourceLang: body.sourceLang || body.from || "",
        auto: body.auto !== false
      });

      res.status(result.ok ? 200 : 500).json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post("/mia/mic/audio", localAdminGuard, async (req, res) => {
    try {
      if (typeof translateModule.transcribeAudio !== "function") {
        return res.status(503).json({ ok: false, error: "stt_missing" });
      }

      const body = req.body && typeof req.body === "object" ? req.body : {};
      const b64 = safeString(body.audioBase64 || body.audio);
      if (!b64) return res.status(400).json({ ok: false, error: "missing_audio" });

      const buffer = Buffer.from(b64.replace(/^data:audio\/[^;]+;base64,/, ""), "base64");
      const streamerLang =
        typeof translateModule.resolveStreamerLanguage === "function"
          ? translateModule.resolveStreamerLanguage(runtimeConfig)
          : "cs";

      const transcript = await translateModule.transcribeAudio({
        buffer,
        mimeType: safeString(body.mimeType, "audio/webm"),
        language: body.sourceLang || streamerLang,
        runtimeConfig
      });

      if (!transcript?.ok || !transcript.text) {
        return res.status(500).json({
          ok: false,
          error: transcript?.reason || "stt_failed"
        });
      }

      if (body.replyLang || body.targetLang || body.lang) {
        translationRuntime.noteForeignLanguage(body.replyLang || body.targetLang || body.lang);
      }

      const channel = body.channel || body.role || "streamer";
      const result = await deliverMicTranslation({
        text: transcript.text,
        channel,
        targetLang: body.targetLang || body.lang || body.to || "",
        sourceLang: body.sourceLang || transcript.language || streamerLang
      });

      res.status(result.ok ? 200 : 500).json({
        ...result,
        transcript: transcript.text,
        stt: transcript.reason
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/tts/compare", async (_req, res) => {
    try {
      if (!ttsEngine) {
        return res.status(503).json({ ok: false, error: "tts_engine_missing" });
      }

      const phrase = "Toto je test hlasu. Jeden dva tri. Slysis rozdil?";
      const cfg =
        typeof ttsEngine.resolveConfig === "function"
          ? ttsEngine.resolveConfig(runtimeConfig)
          : null;

      const [miaResult, kojResult] = await Promise.all([
        ttsEngine.speak({ text: phrase, speaker: "mia", runtimeConfig }),
        ttsEngine.speak({ text: phrase, speaker: "kojnozout", runtimeConfig })
      ]);

      res.json({
        ok: true,
        phrase,
        mia: {
          ok: miaResult?.ok,
          voice: miaResult?.voice,
          prosody: miaResult?.prosody,
          audioUrl: miaResult?.audioUrl,
          profile: "zena · pomalu · tichounce · RE horor"
        },
        koj: {
          ok: kojResult?.ok,
          voice: kojResult?.voice,
          prosody: kojResult?.prosody,
          audioUrl: kojResult?.audioUrl,
          profile: "muz · rychle · hluboko · UFO digital"
        },
        hint: "Stejna veta, jiny hlas. Otevri oba audioUrl v prohlizeci za sebou.",
        config: cfg
          ? {
              edgeVoice: cfg.edgeVoice,
              edgeVoiceKoj: cfg.edgeVoiceKoj,
              edgeProsodyMia: cfg.edgeProsodyMia,
              edgeProsodyKoj: cfg.edgeProsodyKoj
            }
          : null
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return {
    ok: true,
    routes: [
      "GET /tts/test",
      "GET /tts/compare",
      "POST /mia/say",
      "GET /mia-mic",
      "GET /mia/translate/state",
      "POST /mia/translate/mode",
      "POST /mia/translate/text",
      "POST /mia/mic/utterance",
      "POST /mia/mic/audio"
    ]
  };
}

module.exports = { registerTtsRoutes, TTS_TEST_PHRASES };
