"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const languageModule = require("./MIA_LANGUAGE");
const axios = require("axios");

let edgeTtsUniversal = null;

async function loadEdgeTtsUniversal() {
  if (edgeTtsUniversal) return edgeTtsUniversal;
  try {
    edgeTtsUniversal = await import("edge-tts-universal");
  } catch (_err) {
    edgeTtsUniversal = null;
  }
  return edgeTtsUniversal;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function resolveConfig(runtimeConfig = {}) {
  const tts = runtimeConfig?.tts || {};
  const env = process.env;
  const apiKey =
    safeString(tts.apiKey) ||
    safeString(env.MIA_TTS_API_KEY) ||
    safeString(env.MIA_LLM_API_KEY) ||
    safeString(env.OPENAI_API_KEY);

  const envEnabled = env.MIA_TTS_ENABLED;
  const enabled =
    tts.enabled === true ||
    envEnabled === "1" ||
    envEnabled === "true" ||
    (envEnabled !== "0" && envEnabled !== "false" && tts.enabled !== false);

  const provider = safeString(
    tts.provider || env.MIA_TTS_PROVIDER,
    apiKey ? "openai" : "edge"
  ).toLowerCase();

  return {
    enabled,
    provider: provider === "openai" ? "openai" : "edge",
    apiKey,
    baseUrl: safeString(
      tts.baseUrl || env.MIA_TTS_BASE_URL || env.MIA_LLM_BASE_URL,
      "https://api.openai.com/v1"
    ).replace(/\/+$/, ""),
    model: safeString(tts.model || env.MIA_TTS_MODEL, "tts-1"),
    voice: safeString(tts.voice || env.MIA_TTS_VOICE, "nova"),
    edgeVoice: safeString(
      tts.edgeVoice || env.MIA_TTS_EDGE_VOICE,
      "cs-CZ-VlastaNeural"
    ),
    edgeVoiceKoj: safeString(
      tts.edgeVoiceKoj || env.MIA_TTS_EDGE_VOICE_KOJ,
      "cs-CZ-AntoninNeural"
    ),
    edgeProsodyMia: {
      rate: safeString(tts.edgeRateMia || env.MIA_TTS_EDGE_RATE_MIA, "-28%"),
      volume: safeString(tts.edgeVolumeMia || env.MIA_TTS_EDGE_VOLUME_MIA, "+0%"),
      pitch: safeString(tts.edgePitchMia || env.MIA_TTS_EDGE_PITCH_MIA, "+16Hz")
    },
    edgeProsodyKoj: {
      rate: safeString(tts.edgeRateKoj || env.MIA_TTS_EDGE_RATE_KOJ, "+32%"),
      volume: safeString(tts.edgeVolumeKoj || env.MIA_TTS_EDGE_VOLUME_KOJ, "+4%"),
      pitch: safeString(tts.edgePitchKoj || env.MIA_TTS_EDGE_PITCH_KOJ, "-32Hz")
    },
    maxChars: toNumber(tts.maxChars ?? env.MIA_TTS_MAX_CHARS, 900),
    timeoutMs: toNumber(tts.timeoutMs ?? env.MIA_TTS_TIMEOUT_MS, 25000),
    cacheDir: safeString(tts.cacheDir, "")
  };
}

function estimateDurationMs(text = "") {
  const words = safeString(text).split(/\s+/).filter(Boolean).length;
  return Math.max(2500, Math.round((words / 145) * 60000) + 800);
}

function ensureCacheDir(cacheDir) {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
}

async function synthesizeOpenAi(cfg, clipped, filePath) {
  const response = await axios.post(
    `${cfg.baseUrl}/audio/speech`,
    {
      model: cfg.model,
      voice: cfg.voice,
      input: clipped,
      response_format: "mp3"
    },
    {
      timeout: cfg.timeoutMs,
      responseType: "arraybuffer",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json"
      },
      validateStatus: (status) => status >= 200 && status < 500
    }
  );

  if (response.status >= 400) {
    return { ok: false, reason: `tts_http_${response.status}` };
  }

  fs.writeFileSync(filePath, Buffer.from(response.data));
  return { ok: true, provider: "openai" };
}

const VOICE_PROFILE_VERSION = "v3";

async function synthesizeEdge(cfg, clipped, filePath, speaker, voiceOverride = "") {
  const isKoj = speaker === "kojnozout";
  const voice = safeString(voiceOverride) ||
    (isKoj
      ? safeString(cfg.edgeVoiceKoj, "cs-CZ-AntoninNeural")
      : cfg.edgeVoice);
  const prosody = isKoj ? cfg.edgeProsodyKoj : cfg.edgeProsodyMia;

  const mod = await loadEdgeTtsUniversal();
  const EdgeTTS = mod?.EdgeTTS;
  if (typeof EdgeTTS !== "function") {
    return { ok: false, reason: "edge_tts_missing" };
  }

  const tts = new EdgeTTS(clipped, voice, {
    rate: safeString(prosody?.rate, "+0%"),
    volume: safeString(prosody?.volume, "+0%"),
    pitch: safeString(prosody?.pitch, "+0Hz")
  });
  const result = await tts.synthesize();
  const audioBuffer = Buffer.from(await result.audio.arrayBuffer());
  if (!audioBuffer.length) {
    return { ok: false, reason: "edge_tts_empty" };
  }
  fs.writeFileSync(filePath, audioBuffer);
  return { ok: true, provider: "edge", voice };
}

function createTtsEngine(deps = {}) {
  const appendJsonLog = deps.appendJsonLog || (() => {});
  const nowTs = deps.nowTs || (() => Date.now());
  const defaultCacheDir =
    deps.cacheDir ||
    path.join(__dirname, "..", "mia-output-overlay", "audio-cache");

  async function speak({ text, speaker = "mia", runtimeConfig = {}, language = "" } = {}) {
    const cfg = resolveConfig(runtimeConfig);
    const clean = safeString(text);
    if (!clean) {
      return { ok: false, reason: "empty_text" };
    }
    if (!cfg.enabled) {
      return { ok: false, reason: "tts_disabled" };
    }

    const clipped = clean.slice(0, cfg.maxChars);
    const cacheDir = cfg.cacheDir || defaultCacheDir;
    ensureCacheDir(cacheDir);

    const langCode = languageModule.normalizeLanguageCode(
      language || languageModule.resolveDefaultLanguage(runtimeConfig),
      languageModule.resolveDefaultLanguage(runtimeConfig)
    );
    const edgeVoiceOverride = languageModule.resolveEdgeVoice(langCode, speaker, runtimeConfig);

    const prosody =
      speaker === "kojnozout" ? cfg.edgeProsodyKoj : cfg.edgeProsodyMia;
    const voiceKey =
      speaker === "kojnozout"
        ? safeString(edgeVoiceOverride, cfg.edgeVoiceKoj)
        : safeString(edgeVoiceOverride, cfg.edgeVoice);
    const hash = crypto
      .createHash("sha1")
      .update(
        `${VOICE_PROFILE_VERSION}:${speaker}:${cfg.provider}:${voiceKey}:${langCode}:${prosody?.rate}:${prosody?.pitch}:${prosody?.volume}:${clipped}`
      )
      .digest("hex");
    const fileName = `${hash}.mp3`;
    const filePath = path.join(cacheDir, fileName);
    const audioUrl = `/audio-cache/${fileName}`;

    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 128) {
      return {
        ok: true,
        speaker,
        provider: cfg.provider,
        voice: voiceKey,
        language: langCode,
        prosody,
        text: clipped,
        audioUrl,
        filePath,
        durationMs: estimateDurationMs(clipped),
        cached: true
      };
    }

    try {
      let synth = null;
      if (cfg.provider === "openai" && cfg.apiKey && speaker !== "kojnozout") {
        synth = await synthesizeOpenAi(cfg, clipped, filePath);
      } else {
        synth = await synthesizeEdge(cfg, clipped, filePath, speaker, voiceKey);
      }

      if (!synth?.ok) {
        synth = await synthesizeEdge(cfg, clipped, filePath, speaker, voiceKey);
      }

      if (!synth?.ok) {
        return { ok: false, reason: synth?.reason || "tts_synth_failed" };
      }

      appendJsonLog("mia-events", {
        ts: nowTs(),
        stage: "tts_speak",
        speaker,
        provider: synth.provider,
        voice: synth.voice || cfg.voice,
        chars: clipped.length,
        audioUrl
      });

      return {
        ok: true,
        speaker,
        provider: synth.provider,
        voice: synth.voice || voiceKey,
        language: langCode,
        prosody,
        text: clipped,
        audioUrl,
        filePath,
        durationMs: estimateDurationMs(clipped),
        cached: false
      };
    } catch (err) {
      return {
        ok: false,
        reason: safeString(err?.message, "tts_error")
      };
    }
  }

  return { speak, resolveConfig, estimateDurationMs };
}

function resolveVoice(speaker) {
  if (speaker === "kojnozout") return "pet_voice";
  return "mia_voice";
}

module.exports = {
  createTtsEngine,
  resolveConfig,
  resolveVoice,
  estimateDurationMs
};
