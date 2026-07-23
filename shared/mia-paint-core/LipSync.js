"use strict";

const VISEME_PRESETS = Object.freeze({
  sil: { mouthOpen: 0, mouthWide: 0, label: "silence" },
  A: { mouthOpen: 0.82, mouthWide: 0.28, label: "A" },
  E: { mouthOpen: 0.48, mouthWide: 0.62, label: "E" },
  I: { mouthOpen: 0.32, mouthWide: 0.72, label: "I" },
  O: { mouthOpen: 0.76, mouthWide: 0.18, label: "O" },
  U: { mouthOpen: 0.42, mouthWide: 0.12, label: "U" },
  M: { mouthOpen: 0.08, mouthWide: 0.22, label: "M" },
  F: { mouthOpen: 0.18, mouthWide: 0.38, label: "F" },
  L: { mouthOpen: 0.36, mouthWide: 0.48, label: "L" },
  W: { mouthOpen: 0.28, mouthWide: 0.55, label: "W" }
});

function ensureLipSync(motion) {
  if (!motion) return null;
  if (!motion.lipSync) {
    motion.lipSync = {
      layerId: null,
      keyframes: []
    };
  }
  return motion.lipSync;
}

function getVisemePreset(id = "sil") {
  const raw = String(id || "sil");
  const upper = raw.toUpperCase();
  const lower = raw.toLowerCase();
  return VISEME_PRESETS[upper] || VISEME_PRESETS[lower] || VISEME_PRESETS.sil;
}

function createVisemeKeyframe(timeMs, viseme = "sil", props = {}) {
  const preset = getVisemePreset(viseme);
  return {
    timeMs: Math.max(0, Number(timeMs) || 0),
    viseme: String(viseme).toUpperCase(),
    mouthOpen: props.mouthOpen ?? preset.mouthOpen,
    mouthWide: props.mouthWide ?? preset.mouthWide,
    jawY: Number(props.jawY) || 0
  };
}

function addVisemeKeyframe(timeline, props = {}) {
  const motion = timeline?.motion;
  if (!motion) return { ok: false, error: "no_timeline" };
  const lip = ensureLipSync(motion);
  if (props.layerId) lip.layerId = props.layerId;
  const kf = createVisemeKeyframe(
    props.timeMs ?? motion.playheadMs,
    props.viseme || "A",
    props
  );
  lip.keyframes.push(kf);
  lip.keyframes.sort((a, b) => a.timeMs - b.timeMs);
  motion.durationMs = Math.max(motion.durationMs, kf.timeMs + 1);
  return { ok: true, keyframe: kf, count: lip.keyframes.length };
}

function sampleVisemeKeyframes(keyframes, timeMs) {
  if (!Array.isArray(keyframes) || !keyframes.length) {
    return { viseme: "sil", mouthOpen: 0, mouthWide: 0, jawY: 0 };
  }
  const sorted = [...keyframes].sort((a, b) => a.timeMs - b.timeMs);
  if (timeMs <= sorted[0].timeMs) return { ...sorted[0] };
  if (timeMs >= sorted[sorted.length - 1].timeMs) return { ...sorted[sorted.length - 1] };

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (timeMs >= a.timeMs && timeMs <= b.timeMs) {
      const span = b.timeMs - a.timeMs || 1;
      const t = (timeMs - a.timeMs) / span;
      return {
        viseme: t < 0.5 ? a.viseme : b.viseme,
        mouthOpen: a.mouthOpen + (b.mouthOpen - a.mouthOpen) * t,
        mouthWide: a.mouthWide + (b.mouthWide - a.mouthWide) * t,
        jawY: (a.jawY || 0) + ((b.jawY || 0) - (a.jawY || 0)) * t
      };
    }
  }
  return { ...sorted[0] };
}

function sampleLipSync(timeline, timeMs) {
  const lip = timeline?.motion?.lipSync;
  if (!lip) return { viseme: "sil", mouthOpen: 0, mouthWide: 0, jawY: 0, layerId: null };
  const sampled = sampleVisemeKeyframes(lip.keyframes, timeMs);
  return { ...sampled, layerId: lip.layerId || null };
}

function visemeToLayerOffset(sample = {}) {
  const open = Number(sample.mouthOpen) || 0;
  const wide = Number(sample.mouthWide) || 0;
  return {
    y: (Number(sample.jawY) || 0) + open * 8,
    scaleY: 1 + open * 0.06,
    scaleX: 1 + wide * 0.04
  };
}

/**
 * Phase 13w — map mouthOpen (0..1) → speak PNG index (closed → open).
 * frameCount typically 4 for masters/speak/01–04.
 */
function visemeToSpeakFrameIndex(sample = {}, frameCount = 4) {
  const n = Math.max(1, Math.floor(Number(frameCount) || 4));
  const open = Math.max(0, Math.min(1, Number(sample.mouthOpen) || 0));
  if (open < 0.12) return 0;
  if (n === 1) return 0;
  const idx = Math.round(open * (n - 1));
  return Math.max(0, Math.min(n - 1, idx));
}

function estimateMsPerCharForLip(text = "", durationMs = 0) {
  const cleaned = String(text || "").replace(/\s/g, "");
  const chars = Math.max(1, cleaned.length || String(text || "").length || 1);
  const dur = Math.max(0, Number(durationMs) || 0);
  if (dur > 0) return Math.max(35, Math.min(160, dur / chars));
  return 70;
}

/**
 * Phase 13w — live TTS lip track for speech overlay / voicePlayback.
 */
function buildLiveLipTrackFromText(text = "", opts = {}) {
  const raw = String(text || "").slice(0, 400);
  const durationMs =
    Math.max(600, Number(opts.durationMs) || estimateMsPerCharForLip(raw, 0) * Math.max(1, raw.replace(/\s/g, "").length));
  const msPerChar =
    opts.msPerChar != null
      ? Math.max(35, Math.min(160, Number(opts.msPerChar) || 70))
      : estimateMsPerCharForLip(raw, durationMs);
  const keyframes = buildVisemeTrackFromText(raw, Number(opts.startMs) || 0, msPerChar);
  // Ensure track ends closed
  const lastT = keyframes.length ? keyframes[keyframes.length - 1].timeMs : 0;
  if (lastT < durationMs) {
    keyframes.push(createVisemeKeyframe(durationMs, "sil"));
  }
  return {
    phase: "13w",
    provider: "text_viseme_v1",
    durationMs,
    msPerChar,
    keyframes,
    textPreview: raw.slice(0, 80)
  };
}

/**
 * Phase 13x — prefer amplitude from TTS audio; fallback text (13w).
 */
function buildLiveLipTrackSmart(opts = {}) {
  const text = String(opts.text || opts.textPreview || "").slice(0, 400);
  const durationHint = Math.max(0, Number(opts.durationMs) || 0);
  let buffer = null;
  if (Buffer.isBuffer(opts.audioBuffer)) buffer = opts.audioBuffer;
  else if (opts.audioPath) {
    try {
      const fs = require("fs");
      if (fs.existsSync(opts.audioPath)) buffer = fs.readFileSync(opts.audioPath);
    } catch (_err) {
      buffer = null;
    }
  } else if (typeof opts.audioBase64 === "string" && opts.audioBase64) {
    buffer = Buffer.from(opts.audioBase64, "base64");
  }

  if (buffer?.length) {
    const amp = buildVisemeTrackFromAudio(buffer, {
      startMs: Number(opts.startMs) || 0,
      stepMs: Number(opts.stepMs) || 40
    });
    if (amp.ok && amp.keyframes?.length) {
      let keyframes = amp.keyframes;
      // Optional: reshape open mouths with text visemes while keeping amp silence gates
      if (opts.blendText === true && text) {
        const textTrack = buildVisemeTrackFromText(
          text,
          Number(opts.startMs) || 0,
          estimateMsPerCharForLip(text, amp.durationMs || durationHint)
        );
        keyframes = gateTextVisemesWithAmplitude(textTrack, amp.keyframes);
      }
      return {
        phase: "13x",
        provider: "audio_amplitude_live_v1",
        durationMs: amp.durationMs || durationHint || 800,
        keyframes,
        textPreview: text.slice(0, 80),
        amplitude: { provider: amp.provider, keyframeCount: amp.keyframes.length }
      };
    }
  }

  if (!text) {
    return {
      phase: "13x",
      provider: "empty",
      ok: false,
      error: "no_text_or_audio",
      keyframes: [createVisemeKeyframe(0, "sil")],
      durationMs: durationHint || 600
    };
  }
  return buildLiveLipTrackFromText(text, {
    durationMs: durationHint,
    startMs: opts.startMs,
    msPerChar: opts.msPerChar
  });
}

function buildVisemeTrackFromText(text = "", startMs = 0, msPerChar = 80) {
  const chars = String(text).toUpperCase().replace(/[^A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ\s]/g, "");
  const map = {
    A: "A",
    Á: "A",
    E: "E",
    É: "E",
    Ě: "E",
    I: "I",
    Í: "I",
    O: "O",
    Ó: "O",
    U: "U",
    Ú: "U",
    Ů: "U",
    M: "M",
    B: "M",
    P: "M",
    F: "F",
    V: "F",
    L: "L",
    W: "W",
    " ": "sil"
  };
  const keyframes = [];
  let t = startMs;
  for (const ch of chars) {
    const viseme = map[ch] || "A";
    keyframes.push(createVisemeKeyframe(t, viseme));
    t += msPerChar;
  }
  if (!keyframes.length) keyframes.push(createVisemeKeyframe(startMs, "sil"));
  return keyframes;
}

/** Minimal WAV PCM extractor (16-bit mono/stereo). */
function extractWavPcm(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 44) return null;
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    return null;
  }
  let offset = 12;
  let channels = 1;
  let sampleRate = 16000;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataSize = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (id === "fmt ") {
      channels = buffer.readUInt16LE(chunkStart + 2);
      sampleRate = buffer.readUInt32LE(chunkStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkStart + 14);
    } else if (id === "data") {
      dataOffset = chunkStart;
      dataSize = size;
      break;
    }
    offset = chunkStart + size + (size % 2);
  }
  if (dataOffset < 0 || bitsPerSample !== 16) return null;
  const sampleCount = Math.floor(dataSize / (bitsPerSample / 8));
  const samples = new Float32Array(Math.floor(sampleCount / channels));
  let si = 0;
  for (let i = 0; i + channels * 2 <= dataSize && si < samples.length; i += channels * 2) {
    let sum = 0;
    for (let c = 0; c < channels; c += 1) {
      sum += buffer.readInt16LE(dataOffset + i + c * 2) / 32768;
    }
    samples[si] = sum / channels;
    si += 1;
  }
  return { samples: samples.subarray(0, si), sampleRate };
}

function audioBufferToWavPcm(audioBuffer) {
  const direct = extractWavPcm(audioBuffer);
  if (direct) return direct;
  // ffmpeg decode → temp wav
  try {
    const fs = require("fs");
    const os = require("os");
    const path = require("path");
    const { spawnSync } = require("child_process");
    const { resolveFfmpeg } = require("../mia-graphics-studio/animationEncoder");
    const ffmpeg = resolveFfmpeg();
    if (!ffmpeg) return null;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mia-lip-"));
    const inPath = path.join(tmp, "in.bin");
    const outPath = path.join(tmp, "out.wav");
    try {
      fs.writeFileSync(inPath, audioBuffer);
      const result = spawnSync(
        ffmpeg,
        ["-y", "-i", inPath, "-ac", "1", "-ar", "16000", "-f", "wav", outPath],
        { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }
      );
      if (result.status !== 0 || !fs.existsSync(outPath)) return null;
      return extractWavPcm(fs.readFileSync(outPath));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  } catch (_err) {
    return null;
  }
}

function energyToViseme(norm) {
  const n = Math.max(0, Math.min(1, Number(norm) || 0));
  if (n < 0.08) return "sil";
  if (n < 0.18) return "M";
  if (n < 0.35) return "E";
  if (n < 0.55) return "A";
  if (n < 0.75) return "O";
  return "A";
}

/** Build visemes from Float32 mono samples (browser AudioContext or WAV PCM). */
function buildVisemeTrackFromSamples(samples, sampleRate, opts = {}) {
  const startMs = Math.max(0, Number(opts.startMs) || 0);
  const stepMs = Math.max(20, Math.min(200, Number(opts.stepMs) || 50));
  const rate = Math.max(1, Number(sampleRate) || 16000);
  if (!samples?.length) {
    return { ok: false, error: "missing_samples", keyframes: [] };
  }
  const window = Math.max(1, Math.round((rate * stepMs) / 1000));
  const energies = [];
  for (let i = 0; i < samples.length; i += window) {
    let sum = 0;
    const end = Math.min(samples.length, i + window);
    for (let j = i; j < end; j += 1) {
      const v = samples[j];
      sum += v * v;
    }
    energies.push(Math.sqrt(sum / Math.max(1, end - i)));
  }
  const peak = Math.max(...energies, 1e-6);
  const keyframes = [];
  let lastViseme = null;
  energies.forEach((e, index) => {
    const viseme = energyToViseme(e / peak);
    const timeMs = startMs + index * stepMs;
    if (viseme === lastViseme && viseme === "sil" && index % 3 !== 0) return;
    if (viseme === lastViseme && index > 0 && index % 2 !== 0) return;
    keyframes.push(createVisemeKeyframe(timeMs, viseme));
    lastViseme = viseme;
  });
  if (!keyframes.length) keyframes.push(createVisemeKeyframe(startMs, "sil"));
  const endMs = startMs + energies.length * stepMs;
  keyframes.push(createVisemeKeyframe(endMs, "sil"));
  return {
    ok: true,
    keyframes,
    provider: "audio_amplitude_v1",
    phase: "13u",
    durationMs: endMs - startMs,
    sampleRate: rate,
    windowCount: energies.length,
    stepMs
  };
}

/**
 * Phase 13u — amplitude envelope → viseme track (no cloud STT).
 * Accepts WAV buffer or any audio ffmpeg can decode.
 */
function buildVisemeTrackFromAudio(audioInput, opts = {}) {
  let buffer = null;
  if (Buffer.isBuffer(audioInput)) buffer = audioInput;
  else if (typeof audioInput === "string") buffer = Buffer.from(audioInput, "base64");
  else if (audioInput?.audioBase64) buffer = Buffer.from(String(audioInput.audioBase64), "base64");
  if (!buffer?.length) {
    return { ok: false, error: "missing_audio", keyframes: [] };
  }

  const pcm = audioBufferToWavPcm(buffer);
  if (!pcm?.samples?.length) {
    return {
      ok: false,
      error: "audio_decode_failed",
      keyframes: [],
      hint: "Použij WAV/MP3 nebo nastav MIA_FFMPEG_PATH"
    };
  }
  return buildVisemeTrackFromSamples(pcm.samples, pcm.sampleRate, opts);
}

function buildWhisperMultipart(audioBuffer, ext, language) {
  const boundary = `----miawhisper${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  const filename = `speech.${ext}`;
  const parts = [];
  const pushField = (name, value) => {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
        "utf8"
      )
    );
  };
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
      "utf8"
    )
  );
  parts.push(audioBuffer);
  parts.push(Buffer.from("\r\n", "utf8"));
  pushField("model", "whisper-1");
  pushField("language", language);
  pushField("response_format", "verbose_json");
  parts.push(Buffer.from(`--${boundary}--\r\n`, "utf8"));
  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

/**
 * Phase 13v — OpenAI Whisper transcription (optional; needs API key).
 */
async function transcribeAudioWhisper(audioBuffer, opts = {}) {
  const env = opts.env || process.env;
  const key = env.MIA_LLM_API_KEY || env.OPENAI_API_KEY;
  if (!key) return { ok: false, error: "no_api_key" };
  if (!Buffer.isBuffer(audioBuffer) || !audioBuffer.length) {
    return { ok: false, error: "missing_audio" };
  }
  const ext = String(opts.audioExt || "wav")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 8) || "wav";
  const language = opts.language || opts.lang || "cs";

  try {
    const axios = require("axios");
    const multipart = buildWhisperMultipart(audioBuffer, ext, language);
    const resp = await axios.post("https://api.openai.com/v1/audio/transcriptions", multipart.body, {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": multipart.contentType
      },
      timeout: 180000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    return {
      ok: true,
      text: String(resp.data?.text || "").trim(),
      language: resp.data?.language || language,
      duration: resp.data?.duration || null,
      provider: "openai_whisper"
    };
  } catch (err) {
    const detail =
      err?.response?.data?.error?.message ||
      err?.response?.data ||
      err?.message ||
      err;
    return {
      ok: false,
      error: "whisper_failed",
      detail: String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 200)
    };
  }
}

function gateTextVisemesWithAmplitude(textKeyframes, ampKeyframes) {
  if (!Array.isArray(textKeyframes) || !Array.isArray(ampKeyframes) || !ampKeyframes.length) {
    return textKeyframes;
  }
  const ampAt = (ms) => {
    let best = ampKeyframes[0];
    let bestDist = Infinity;
    for (const kf of ampKeyframes) {
      const d = Math.abs((kf.timeMs || 0) - ms);
      if (d < bestDist) {
        bestDist = d;
        best = kf;
      }
    }
    return best;
  };
  return textKeyframes.map((kf) => {
    const amp = ampAt(kf.timeMs || 0);
    const ampVis = String(amp?.viseme || "SIL").toUpperCase();
    if (ampVis === "SIL" || ampVis === "M") {
      return createVisemeKeyframe(kf.timeMs, ampVis === "M" ? "M" : "sil", {
        mouthOpen: amp.mouthOpen,
        mouthWide: amp.mouthWide
      });
    }
    return kf;
  });
}

/**
 * Phase 13v — Whisper STT → text visemes, fallback amplitude (13u).
 */
async function buildVisemeTrackFromAudioSmart(audioInput, opts = {}) {
  const startMs = Math.max(0, Number(opts.startMs) || 0);
  let buffer = null;
  if (Buffer.isBuffer(audioInput)) buffer = audioInput;
  else if (typeof audioInput === "string") buffer = Buffer.from(audioInput, "base64");
  else if (audioInput?.audioBase64) buffer = Buffer.from(String(audioInput.audioBase64), "base64");

  const amp = buildVisemeTrackFromAudio(buffer || audioInput, opts);
  if (opts.useStt === false) {
    return { ...amp, phase: amp.ok ? "13u" : amp.phase };
  }

  if (!buffer?.length) return amp;

  const stt = await transcribeAudioWhisper(buffer, {
    env: opts.env,
    audioExt: opts.audioExt,
    language: opts.language || opts.lang || "cs"
  });
  if (!stt.ok || !stt.text) {
    return {
      ...amp,
      stt,
      provider: amp.provider || "audio_amplitude_v1",
      phase: amp.ok ? "13u" : amp.phase
    };
  }

  const durationMs =
    (stt.duration != null ? Number(stt.duration) * 1000 : null) ||
    amp.durationMs ||
    Math.max(800, stt.text.length * 70);
  const msPerChar = Math.max(35, Math.min(140, durationMs / Math.max(1, stt.text.replace(/\s/g, "").length || stt.text.length)));
  let keyframes = buildVisemeTrackFromText(stt.text, startMs, msPerChar);
  if (opts.gateWithAmplitude !== false && amp.ok && amp.keyframes?.length) {
    keyframes = gateTextVisemesWithAmplitude(keyframes, amp.keyframes);
  }

  return {
    ok: true,
    keyframes,
    provider: "whisper_viseme_v1",
    phase: "13v",
    transcript: stt.text,
    language: stt.language,
    durationMs,
    msPerChar,
    stt,
    amplitude: amp.ok ? { provider: amp.provider, keyframeCount: amp.keyframes.length } : null
  };
}

function applyVisemeTrack(timeline, keyframes = [], layerId = null) {
  const motion = timeline?.motion;
  if (!motion) return { ok: false, error: "no_timeline" };
  const lip = ensureLipSync(motion);
  if (layerId) lip.layerId = layerId;
  lip.keyframes = keyframes.slice().sort((a, b) => a.timeMs - b.timeMs);
  const last = lip.keyframes[lip.keyframes.length - 1];
  if (last) motion.durationMs = Math.max(motion.durationMs, last.timeMs + 1);
  return { ok: true, count: lip.keyframes.length };
}

function findVisemeKeyframeIndex(keyframes, timeMs, toleranceMs = 8) {
  if (!Array.isArray(keyframes)) return -1;
  const t = Math.max(0, Number(timeMs) || 0);
  let best = -1;
  let bestDist = Infinity;
  keyframes.forEach((kf, index) => {
    const dist = Math.abs((Number(kf.timeMs) || 0) - t);
    if (dist <= toleranceMs && dist < bestDist) {
      best = index;
      bestDist = dist;
    }
  });
  return best;
}

function deleteVisemeKeyframe(timeline, timeMs) {
  const motion = timeline?.motion;
  const lip = motion?.lipSync;
  if (!lip?.keyframes?.length) return { ok: false, error: "no_lip_track" };
  const idx = findVisemeKeyframeIndex(lip.keyframes, timeMs);
  if (idx < 0) return { ok: false, error: "keyframe_not_found" };
  const removed = lip.keyframes.splice(idx, 1)[0];
  return { ok: true, removed, count: lip.keyframes.length };
}

function updateVisemeKeyframe(timeline, timeMs, props = {}) {
  const motion = timeline?.motion;
  const lip = motion?.lipSync;
  if (!lip?.keyframes?.length) return { ok: false, error: "no_lip_track" };
  const idx = findVisemeKeyframeIndex(lip.keyframes, timeMs);
  if (idx < 0) return { ok: false, error: "keyframe_not_found" };
  const prev = lip.keyframes[idx];
  const preset = props.viseme ? getVisemePreset(props.viseme) : null;
  lip.keyframes[idx] = {
    ...prev,
    ...props,
    timeMs: props.timeMs ?? prev.timeMs,
    viseme: props.viseme ? String(props.viseme).toUpperCase() : prev.viseme,
    mouthOpen: props.mouthOpen ?? preset?.mouthOpen ?? prev.mouthOpen,
    mouthWide: props.mouthWide ?? preset?.mouthWide ?? prev.mouthWide
  };
  lip.keyframes.sort((a, b) => a.timeMs - b.timeMs);
  motion.durationMs = Math.max(motion.durationMs, lip.keyframes[lip.keyframes.length - 1].timeMs + 1);
  return { ok: true, keyframe: lip.keyframes[idx] };
}

module.exports = {
  VISEME_PRESETS,
  ensureLipSync,
  getVisemePreset,
  createVisemeKeyframe,
  addVisemeKeyframe,
  sampleVisemeKeyframes,
  sampleLipSync,
  visemeToLayerOffset,
  visemeToSpeakFrameIndex,
  estimateMsPerCharForLip,
  buildLiveLipTrackFromText,
  buildLiveLipTrackSmart,
  buildVisemeTrackFromText,
  buildVisemeTrackFromAudio,
  buildVisemeTrackFromSamples,
  buildVisemeTrackFromAudioSmart,
  transcribeAudioWhisper,
  applyVisemeTrack,
  findVisemeKeyframeIndex,
  deleteVisemeKeyframe,
  updateVisemeKeyframe
};
