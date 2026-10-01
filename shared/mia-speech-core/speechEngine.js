"use strict";

/**
 * Master Canon 0035 — Speech Engine: voice output layer for MIA platform.
 */

const crypto = require("crypto");

const SE_COMPONENT = Object.freeze({
  VOICE_MANAGER: "voice_manager",
  SPEECH_QUEUE: "speech_queue",
  TTS_MANAGER: "tts_manager",
  VOICE_PROFILE_MANAGER: "voice_profile_manager",
  EMOTION_VOICE_ADAPTER: "emotion_voice_adapter",
  LIP_SYNC_ENGINE: "lip_sync_engine",
  FACIAL_SYNC_MANAGER: "facial_sync_manager",
  GESTURE_SYNCHRONIZER: "gesture_synchronizer",
  OVERLAY_SYNCHRONIZER: "overlay_synchronizer",
  SPEECH_SCHEDULER: "speech_scheduler",
  SPEECH_CACHE: "speech_cache",
  VOICE_EFFECTS: "voice_effects",
  SPEECH_ANALYTICS: "speech_analytics",
  SPEECH_API: "speech_api"
});

const SE_COMPONENT_ORDER = Object.freeze(Object.values(SE_COMPONENT));

const SE_SPEAKER = Object.freeze({
  MIA: "mia",
  KOJNOZROUT: "kojnozout",
  SYSTEM: "system"
});

const SE_SPEECH_STATE = Object.freeze({
  QUEUED: "queued",
  SPEAKING: "speaking",
  COMPLETED: "completed",
  INTERRUPTED: "interrupted",
  CANCELLED: "cancelled"
});

const SE_INTERRUPT = Object.freeze({
  SOFT: "soft_interrupt",
  HARD: "hard_interrupt"
});

const SE_VOICE_EFFECT = Object.freeze({
  NONE: "none",
  ECHO: "echo",
  RADIO: "radio",
  PHONE: "phone",
  BATTLE_MEGAPHONE: "battle_megaphone",
  ROBOT: "robot",
  WHISPER: "whisper"
});

const SE_SYNC_TARGET = Object.freeze({
  HEAD: "mia_head",
  EYES: "mia_eyes",
  HANDS: "mia_hands",
  FEET: "mia_feet",
  OVERLAY: "speech_overlay",
  KOJ_RUNTIME: "kojnozout_runtime"
});

const SE_FORBIDDEN_ACTIVITIES = Object.freeze([
  "mutate_text_content",
  "decide_responses",
  "mutate_personality",
  "bypass_conversation_engine",
  "bypass_safety_rules"
]);

const SE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-speech-core/speechEngine.js",
  "scripts/MIA_TTS_ENGINE.js",
  "mia-output-overlay/speech-overlay.html",
  "mia-output-overlay/lib/mia-live-lip.js",
  "shared/mia-conversation-core/conversationEngine.js"
]);

const DEFAULT_VOICE_PROFILES = Object.freeze({
  [SE_SPEAKER.MIA]: Object.freeze({
    voiceId: "mia_voice",
    language: "cs",
    gender: "female",
    tone: "calm_friendly",
    style: "intelligent_warm",
    rate: 1,
    pitch: 1,
    energy: 0.75
  }),
  [SE_SPEAKER.KOJNOZROUT]: Object.freeze({
    voiceId: "kojnozout_voice",
    language: "cs",
    gender: "male",
    tone: "playful_gruff",
    style: "expressive",
    rate: 1.08,
    pitch: 0.95,
    energy: 0.9
  }),
  [SE_SPEAKER.SYSTEM]: Object.freeze({
    voiceId: "system_voice",
    language: "cs",
    gender: "neutral",
    tone: "neutral",
    style: "announcement",
    rate: 1,
    pitch: 1,
    energy: 0.6
  })
});

function manageVoice(speaker = SE_SPEAKER.MIA, overrides = {}) {
  const base = DEFAULT_VOICE_PROFILES[speaker] || DEFAULT_VOICE_PROFILES[SE_SPEAKER.MIA];
  return Object.freeze({
    ok: true,
    speaker,
    profile: Object.freeze({ ...base, ...overrides, voiceId: overrides.voiceId || base.voiceId }),
    component: SE_COMPONENT.VOICE_MANAGER
  });
}

function getVoiceProfile(speaker = SE_SPEAKER.MIA) {
  const profile = DEFAULT_VOICE_PROFILES[speaker];
  if (!profile) {
    return Object.freeze({ ok: false, error: "unknown_speaker", component: SE_COMPONENT.VOICE_PROFILE_MANAGER });
  }
  return Object.freeze({
    ok: true,
    speaker,
    profile,
    component: SE_COMPONENT.VOICE_PROFILE_MANAGER
  });
}

function enqueueSpeech(queue = [], item = {}) {
  const entry = Object.freeze({
    speechId: item.speechId || `speech-${crypto.randomUUID()}`,
    speaker: item.speaker || SE_SPEAKER.MIA,
    text: item.text,
    priority: item.priority != null ? Number(item.priority) : 50,
    emotion: item.emotion || null,
    durationMs: item.durationMs != null ? Number(item.durationMs) : 0,
    state: SE_SPEECH_STATE.QUEUED,
    component: SE_COMPONENT.SPEECH_QUEUE
  });

  const next = [...queue, entry].sort((a, b) => b.priority - a.priority);
  return Object.freeze({
    ok: true,
    entry,
    queue: Object.freeze(next),
    component: SE_COMPONENT.SPEECH_QUEUE
  });
}

function scheduleSpeech(queue = [], options = {}) {
  const next = queue.find((item) => item.state === SE_SPEECH_STATE.QUEUED) || null;
  const interruptible = options.interruptible !== false;
  const canInterrupt = Boolean(options.allowInterrupt);

  return Object.freeze({
    ok: Boolean(next),
    next,
    interruptible,
    canInterrupt,
    speakerOrder: Object.freeze(queue.map((q) => q.speaker)),
    component: SE_COMPONENT.SPEECH_SCHEDULER
  });
}

function adaptEmotionVoice(profile = {}, emotion = {}) {
  const primary = emotion.primary || "calm";
  const intensity = emotion.intensity != null ? Number(emotion.intensity) : 50;

  let rate = profile.rate != null ? profile.rate : 1;
  let pitch = profile.pitch != null ? profile.pitch : 1;
  let volume = 1;
  let pauseMs = 120;

  if (primary === "joy") {
    rate += 0.08;
    pitch += 0.05;
    volume += intensity / 200;
    pauseMs = 80;
  } else if (primary === "tension") {
    rate -= 0.1;
    pitch -= 0.06;
    volume -= 0.05;
    pauseMs = 180;
  } else if (primary === "focus") {
    rate -= 0.03;
    pauseMs = 140;
  }

  return Object.freeze({
    ok: true,
    rate: Math.round(rate * 1000) / 1000,
    pitch: Math.round(pitch * 1000) / 1000,
    volume: Math.round(volume * 1000) / 1000,
    emphasis: intensity > 70 ? "high" : "medium",
    pauseMs,
    component: SE_COMPONENT.EMOTION_VOICE_ADAPTER
  });
}

function planLipSync(text = "", durationMs = 0) {
  const syllables = Math.max(1, Math.ceil(String(text).replace(/\s+/g, "").length / 3));
  const frames = [];
  const frameMs = Math.max(60, Math.floor(durationMs / syllables));

  for (let i = 0; i < syllables; i += 1) {
    frames.push(
      Object.freeze({
        timeMs: i * frameMs,
        viseme: i % 3 === 0 ? "A" : i % 3 === 1 ? "E" : "M",
        target: SE_SYNC_TARGET.HEAD
      })
    );
  }

  return Object.freeze({
    ok: true,
    frames: Object.freeze(frames),
    component: SE_COMPONENT.LIP_SYNC_ENGINE
  });
}

function planFacialSync(emotion = {}) {
  return Object.freeze({
    ok: true,
    blinkIntervalMs: 3200,
    eyebrowRaise: emotion.primary === "surprise" ? 0.7 : 0.2,
    eyeTarget: SE_SYNC_TARGET.EYES,
    component: SE_COMPONENT.FACIAL_SYNC_MANAGER
  });
}

function planGestureSync(emotion = {}) {
  const energy = emotion.intensity != null ? emotion.intensity : 50;
  return Object.freeze({
    ok: true,
    hands: Object.freeze({
      target: SE_SYNC_TARGET.HANDS,
      wave: energy > 60,
      emphasis: energy > 75
    }),
    feet: Object.freeze({
      target: SE_SYNC_TARGET.FEET,
      shift: emotion.primary === "joy"
    }),
    component: SE_COMPONENT.GESTURE_SYNCHRONIZER
  });
}

function planOverlaySync(speechId = "") {
  return Object.freeze({
    ok: true,
    speechId,
    timeline: Object.freeze([
      { phase: "speech_start", target: SE_SYNC_TARGET.OVERLAY },
      { phase: "bubble_show", target: SE_SYNC_TARGET.OVERLAY },
      { phase: "mouth_sync", target: SE_SYNC_TARGET.HEAD },
      { phase: "eyes_sync", target: SE_SYNC_TARGET.EYES },
      { phase: "speech_end", target: SE_SYNC_TARGET.OVERLAY },
      { phase: "bubble_hide", target: SE_SYNC_TARGET.OVERLAY }
    ]),
    component: SE_COMPONENT.OVERLAY_SYNCHRONIZER
  });
}

function applyVoiceEffects(effect = SE_VOICE_EFFECT.NONE, profile = {}) {
  const allowed = Object.values(SE_VOICE_EFFECT).includes(effect);
  const claritySafe = effect === SE_VOICE_EFFECT.WHISPER ? profile.volume > 0.5 : true;

  return Object.freeze({
    ok: allowed && claritySafe,
    effect: allowed ? effect : SE_VOICE_EFFECT.NONE,
    claritySafe,
    component: SE_COMPONENT.VOICE_EFFECTS
  });
}

function cacheKeyForSpeech(speaker, text, voiceProfile = {}) {
  return crypto
    .createHash("sha1")
    .update(`${speaker}:${voiceProfile.voiceId}:${text}`)
    .digest("hex");
}

function lookupSpeechCache(cache = {}, speaker, text, voiceProfile = {}) {
  const key = cacheKeyForSpeech(speaker, text, voiceProfile);
  const hit = cache[key] || null;

  return Object.freeze({
    ok: Boolean(hit),
    key,
    hit,
    component: SE_COMPONENT.SPEECH_CACHE
  });
}

function storeSpeechCache(cache = {}, speaker, text, voiceProfile = {}, payload = {}) {
  const key = cacheKeyForSpeech(speaker, text, voiceProfile);
  const next = { ...cache, [key]: { ...payload, key, storedAt: Date.now() } };

  return Object.freeze({
    ok: true,
    key,
    cache: Object.freeze(next),
    component: SE_COMPONENT.SPEECH_CACHE
  });
}

function collectSpeechAnalytics(run = {}) {
  return Object.freeze({
    speechId: run.speechId,
    durationMs: run.durationMs || 0,
    generationMs: run.generationMs || 0,
    latencyMs: run.latencyMs || 0,
    sentenceCount: run.sentenceCount || 1,
    cacheHit: Boolean(run.cacheHit),
    ttsProvider: run.ttsProvider || "edge",
    component: SE_COMPONENT.SPEECH_ANALYTICS
  });
}

function interruptSpeech(current = {}, mode = SE_INTERRUPT.SOFT) {
  const state =
    mode === SE_INTERRUPT.HARD ? SE_SPEECH_STATE.INTERRUPTED : SE_SPEECH_STATE.CANCELLED;

  return Object.freeze({
    ok: true,
    speechId: current.speechId,
    mode,
    state,
    waitForSentenceEnd: mode === SE_INTERRUPT.SOFT,
    component: SE_COMPONENT.SPEECH_SCHEDULER
  });
}

function validateSpeechInput(input = {}) {
  const errors = [];
  if (!input.text || !String(input.text).trim()) errors.push("missing_text");
  if (!input.fromConversationEngine) errors.push("conversation_engine_required");
  if (input.mutatedText === true) errors.push("text_mutation_forbidden");
  if (input.speaker === SE_SPEAKER.KOJNOZROUT && input.voiceProfileId === "mia_voice") {
    errors.push("koj_cannot_use_mia_voice");
  }

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    component: SE_COMPONENT.SPEECH_API
  });
}

function estimateDurationMs(text = "", rate = 1) {
  const chars = String(text).trim().length;
  return Math.max(500, Math.round((chars / 14) * 1000 / Math.max(0.5, rate)));
}

function assertSpeechForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !SE_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function createSpeechEngine(options = {}) {
  const queue = [];
  const cache = {};
  const history = [];
  let activeSpeech = null;

  return {
    speak(input = {}, adapters = {}) {
      const startedAt = Date.now();
      const validation = validateSpeechInput({
        text: input.text,
        fromConversationEngine: input.fromConversationEngine === true,
        mutatedText: input.mutatedText === true,
        speaker: input.speaker,
        voiceProfileId: input.voiceProfileId
      });

      if (!validation.ok) {
        return Object.freeze({
          ok: false,
          error: "invalid_speech_input",
          validation,
          decides: false,
          component: SE_COMPONENT.SPEECH_API
        });
      }

      const speaker = input.speaker || SE_SPEAKER.MIA;
      const voice = manageVoice(speaker);
      const profile = getVoiceProfile(speaker);
      const emotionVoice = adaptEmotionVoice(profile.profile, input.emotion || {});
      const durationMs = input.durationMs || estimateDurationMs(input.text, emotionVoice.rate);

      const cacheLookup = lookupSpeechCache(cache, speaker, input.text, profile.profile);
      const queued = enqueueSpeech(queue, {
        speaker,
        text: input.text,
        priority: input.priority,
        emotion: input.emotion,
        durationMs
      });
      queue.length = 0;
      queue.push(...queued.queue);

      const scheduled = scheduleSpeech(queue, { allowInterrupt: input.allowInterrupt });
      const lipSync = planLipSync(input.text, durationMs);
      const facial = planFacialSync(input.emotion || {});
      const gesture = planGestureSync(input.emotion || {});
      const overlay = planOverlaySync(queued.entry.speechId);
      const effects = applyVoiceEffects(input.effect || SE_VOICE_EFFECT.NONE, emotionVoice);

      let ttsResult = { ok: true, provider: "edge", cached: cacheLookup.ok };
      if (!cacheLookup.ok && adapters.ttsEngine && typeof adapters.ttsEngine.speak === "function") {
        ttsResult = { ok: false, reason: "tts_deferred_to_runtime" };
      } else if (cacheLookup.ok) {
        ttsResult = { ok: true, provider: "cache", cached: true, audioUrl: cacheLookup.hit.audioUrl };
      }

      if (!cacheLookup.ok) {
        const stored = storeSpeechCache(cache, speaker, input.text, profile.profile, {
          audioUrl: `/audio-cache/${cacheLookup.key}.mp3`,
          durationMs
        });
        Object.assign(cache, stored.cache);
      }

      activeSpeech = Object.freeze({
        ...queued.entry,
        state: SE_SPEECH_STATE.SPEAKING
      });

      const analytics = collectSpeechAnalytics({
        speechId: queued.entry.speechId,
        durationMs,
        generationMs: Date.now() - startedAt,
        latencyMs: Date.now() - startedAt,
        cacheHit: cacheLookup.ok,
        ttsProvider: ttsResult.provider
      });

      const result = Object.freeze({
        ok: true,
        speechId: queued.entry.speechId,
        speaker,
        text: input.text,
        voice: voice.profile,
        emotionVoice,
        lipSync,
        facial,
        gesture,
        overlay,
        effects,
        scheduled,
        tts: ttsResult,
        syncTargets: Object.freeze([
          SE_SYNC_TARGET.HEAD,
          SE_SYNC_TARGET.EYES,
          SE_SYNC_TARGET.HANDS,
          SE_SYNC_TARGET.FEET,
          SE_SYNC_TARGET.OVERLAY,
          speaker === SE_SPEAKER.KOJNOZROUT ? SE_SYNC_TARGET.KOJ_RUNTIME : null
        ].filter(Boolean)),
        analytics,
        decides: false,
        mutatesText: false,
        forObs: true,
        component: SE_COMPONENT.SPEECH_API
      });

      history.push(
        Object.freeze({
          ...result,
          completedAt: Date.now(),
          state: SE_SPEECH_STATE.COMPLETED
        })
      );
      activeSpeech = null;

      return result;
    },
    interrupt(mode = SE_INTERRUPT.SOFT) {
      const result = interruptSpeech(activeSpeech || { speechId: "none" }, mode);
      if (activeSpeech) activeSpeech = null;
      return result;
    },
    queue() {
      return Object.freeze([...queue]);
    },
    history() {
      return Object.freeze([...history]);
    }
  };
}

function createSpeechApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    decides: false,
    executes: options.executes === true,
    data,
    component: SE_COMPONENT.SPEECH_API
  });
}

module.exports = {
  SE_COMPONENT,
  SE_COMPONENT_ORDER,
  SE_SPEAKER,
  SE_SPEECH_STATE,
  SE_INTERRUPT,
  SE_VOICE_EFFECT,
  SE_SYNC_TARGET,
  SE_FORBIDDEN_ACTIVITIES,
  SE_RUNTIME_ANCHORS,
  manageVoice,
  getVoiceProfile,
  enqueueSpeech,
  scheduleSpeech,
  adaptEmotionVoice,
  planLipSync,
  planFacialSync,
  planGestureSync,
  planOverlaySync,
  applyVoiceEffects,
  lookupSpeechCache,
  storeSpeechCache,
  collectSpeechAnalytics,
  interruptSpeech,
  validateSpeechInput,
  estimateDurationMs,
  createSpeechEngine,
  createSpeechApiResponse,
  assertSpeechForbiddenActivity
};
