"use strict";

/**
 * Phase 13w — lightweight live lip helpers for speech overlay (browser).
 * Keep in sync with shared/mia-paint-core/LipSync.js viseme → speak frame map.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.MiaLiveLip = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const VISEME_PRESETS = Object.freeze({
    sil: { mouthOpen: 0, mouthWide: 0 },
    A: { mouthOpen: 0.82, mouthWide: 0.28 },
    E: { mouthOpen: 0.48, mouthWide: 0.62 },
    I: { mouthOpen: 0.32, mouthWide: 0.72 },
    O: { mouthOpen: 0.76, mouthWide: 0.18 },
    U: { mouthOpen: 0.42, mouthWide: 0.12 },
    M: { mouthOpen: 0.08, mouthWide: 0.22 },
    F: { mouthOpen: 0.18, mouthWide: 0.38 },
    L: { mouthOpen: 0.36, mouthWide: 0.48 },
    W: { mouthOpen: 0.28, mouthWide: 0.55 }
  });

  function getVisemePreset(id) {
    const raw = String(id || "sil");
    const upper = raw.toUpperCase();
    const lower = raw.toLowerCase();
    return VISEME_PRESETS[upper] || VISEME_PRESETS[lower] || VISEME_PRESETS.sil;
  }

  function createVisemeKeyframe(timeMs, viseme) {
    const preset = getVisemePreset(viseme);
    return {
      timeMs: Math.max(0, Number(timeMs) || 0),
      viseme: String(viseme).toUpperCase(),
      mouthOpen: preset.mouthOpen,
      mouthWide: preset.mouthWide,
      jawY: 0
    };
  }

  function sampleVisemeKeyframes(keyframes, timeMs) {
    if (!Array.isArray(keyframes) || !keyframes.length) {
      return { viseme: "sil", mouthOpen: 0, mouthWide: 0, jawY: 0 };
    }
    const sorted = keyframes.slice().sort((a, b) => a.timeMs - b.timeMs);
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

  function visemeToSpeakFrameIndex(sample, frameCount) {
    const n = Math.max(1, Math.floor(Number(frameCount) || 4));
    const open = Math.max(0, Math.min(1, Number(sample && sample.mouthOpen) || 0));
    if (open < 0.12) return 0;
    if (n === 1) return 0;
    const idx = Math.round(open * (n - 1));
    return Math.max(0, Math.min(n - 1, idx));
  }

  function estimateMsPerCharForLip(text, durationMs) {
    const cleaned = String(text || "").replace(/\s/g, "");
    const chars = Math.max(1, cleaned.length || String(text || "").length || 1);
    const dur = Math.max(0, Number(durationMs) || 0);
    if (dur > 0) return Math.max(35, Math.min(160, dur / chars));
    return 70;
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

  function buildVisemeTrackFromSamples(samples, sampleRate, opts) {
    opts = opts || {};
    const startMs = Math.max(0, Number(opts.startMs) || 0);
    const stepMs = Math.max(20, Math.min(200, Number(opts.stepMs) || 50));
    const rate = Math.max(1, Number(sampleRate) || 16000);
    if (!samples || !samples.length) {
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
    const peak = Math.max.apply(null, energies.concat([1e-6]));
    const keyframes = [];
    let lastViseme = null;
    energies.forEach(function (e, index) {
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
      provider: "audio_amplitude_live_v1",
      phase: "13x",
      durationMs: endMs - startMs,
      sampleRate: rate,
      stepMs
    };
  }

  function buildVisemeTrackFromText(text, startMs, msPerChar) {
    const chars = String(text || "")
      .toUpperCase()
      .replace(/[^A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ\s]/g, "");
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
    let t = Math.max(0, Number(startMs) || 0);
    const step = Math.max(35, Number(msPerChar) || 70);
    for (let i = 0; i < chars.length; i += 1) {
      const viseme = map[chars[i]] || "A";
      keyframes.push(createVisemeKeyframe(t, viseme));
      t += step;
    }
    if (!keyframes.length) keyframes.push(createVisemeKeyframe(startMs || 0, "sil"));
    return keyframes;
  }

  function buildLiveLipTrackFromText(text, opts) {
    opts = opts || {};
    const raw = String(text || "").slice(0, 400);
    const durationMs = Math.max(
      600,
      Number(opts.durationMs) ||
        estimateMsPerCharForLip(raw, 0) * Math.max(1, raw.replace(/\s/g, "").length)
    );
    const msPerChar =
      opts.msPerChar != null
        ? Math.max(35, Math.min(160, Number(opts.msPerChar) || 70))
        : estimateMsPerCharForLip(raw, durationMs);
    const keyframes = buildVisemeTrackFromText(raw, Number(opts.startMs) || 0, msPerChar);
    const lastT = keyframes.length ? keyframes[keyframes.length - 1].timeMs : 0;
    if (lastT < durationMs) keyframes.push(createVisemeKeyframe(durationMs, "sil"));
    return {
      phase: "13w",
      provider: "text_viseme_v1",
      durationMs,
      msPerChar,
      keyframes,
      textPreview: raw.slice(0, 80)
    };
  }

  return {
    sampleVisemeKeyframes,
    visemeToSpeakFrameIndex,
    estimateMsPerCharForLip,
    buildVisemeTrackFromText,
    buildVisemeTrackFromSamples,
    buildLiveLipTrackFromText,
    phase: "13w"
  };
});
