(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.MIA_SOUND_CUES = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CUE_PROFILES = {
    gift_soft: { freq: 520, dur: 0.12, type: "sine", gain: 0.08 },
    gift_rose: { freq: 640, dur: 0.18, type: "triangle", gain: 0.1, slide: 120 },
    gift_rose_burst: { freq: 720, dur: 0.28, type: "sine", gain: 0.12, slide: 200 },
    gift_heart: { freq: 580, dur: 0.16, type: "sine", gain: 0.09, slide: 80 },
    gift_heart_burst: { freq: 660, dur: 0.24, type: "triangle", gain: 0.11, slide: 140 },
    gift_feed: { freq: 420, dur: 0.14, type: "square", gain: 0.06 },
    gift_pet: { freq: 480, dur: 0.2, type: "sawtooth", gain: 0.07, slide: -60 },
    gift_music: { freq: 880, dur: 0.22, type: "sine", gain: 0.09 },
    gift_travel: { freq: 360, dur: 0.25, type: "triangle", gain: 0.08, slide: 180 },
    gift_power: { freq: 220, dur: 0.32, type: "sawtooth", gain: 0.1, slide: -100 },
    gift_soft_boss: { freq: 440, dur: 0.35, type: "sine", gain: 0.12, slide: 200 },
    gift_rose_boss: { freq: 520, dur: 0.4, type: "triangle", gain: 0.14, slide: 260 }
  };

  let audioCtx = null;
  const lastPlayed = new Map();
  const MIN_GAP_MS = 180;

  function safeCue(id) {
    const key = String(id || "gift_soft").toLowerCase();
    return CUE_PROFILES[key] || CUE_PROFILES.gift_soft;
  }

  function ensureCtx() {
    if (audioCtx) return audioCtx;
    const Ctx = root.AudioContext || root.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    return audioCtx;
  }

  function playSoundCue(cueId, options = {}) {
    // OBS browser bez Control audio hraje Web Audio do Windows speakers → echo s MIA_VOICE.
    // SFX jen s explicitním ?sfx=1 nebo force.
    try {
      const params = new URLSearchParams(String(location.search || ""));
      const allow =
        options.force === true ||
        params.get("sfx") === "1" ||
        params.get("sound") === "1";
      if (!allow) {
        return { ok: false, reason: "sfx_disabled_default" };
      }
    } catch (_err) {
      return { ok: false, reason: "sfx_guard_failed" };
    }

    const profile = safeCue(cueId);
    const now = Date.now();
    const key = String(cueId || "gift_soft");
    if (!options.force && now - (lastPlayed.get(key) || 0) < MIN_GAP_MS) {
      return { ok: false, reason: "throttled" };
    }
    lastPlayed.set(key, now);

    const ctx = ensureCtx();
    if (!ctx) return { ok: false, reason: "no_audio_context" };

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const t0 = ctx.currentTime;
    const dur = profile.dur;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = profile.type || "sine";
    osc.frequency.setValueAtTime(profile.freq, t0);
    if (profile.slide) {
      osc.frequency.linearRampToValueAtTime(profile.freq + profile.slide, t0 + dur);
    }
    const peak = options.gain != null ? options.gain : profile.gain || 0.08;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
    return { ok: true, cueId: key, duration: dur };
  }

  function listCueProfiles() {
    return Object.keys(CUE_PROFILES);
  }

  return {
    CUE_PROFILES,
    playSoundCue,
    listCueProfiles,
    ensureCtx
  };
});
