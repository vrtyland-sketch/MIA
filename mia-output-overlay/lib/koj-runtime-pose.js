/**
 * Koj runtime multi-frame pose player + prop (ball/mic/hand/bowl) sync.
 * Split phase E: HTML keeps stage-mood/wander orchestration; pose I/O + prop rules here.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.KojRuntimePose = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const BALL_KEYS = new Set([
    "play",
    "play-a",
    "play-b",
    "hop",
    "hop-a",
    "hop-b",
    "bounce",
    "excited",
    "excited-a",
    "excited-b",
    "hatch-wiggle",
    "wink"
  ]);
  const BALL_MOODS = new Set(["play"]);
  const MIC_KEYS = new Set([
    "celebrate",
    "celebrate-a",
    "celebrate-b",
    "party",
    "party-pop",
    "cheer",
    "cheer-loud",
    "cheer-soft",
    "dance",
    "dance-a",
    "dance-b",
    "dance-c",
    "groove",
    "groove-a",
    "groove-b",
    "party-a",
    "party-b",
    "hype",
    "hype-jump",
    "proud-stand",
    "proud-stand-a",
    "proud-stand-b",
    "laugh",
    "laugh-a",
    "laugh-b",
    "combo",
    "combo-a",
    "combo-b",
    "combo-fire",
    "combo-fire-a",
    "combo-fire-b",
    "react-chat",
    "react-chat-a",
    "react-chat-b",
    "wave",
    "wave-a",
    "wave-b",
    "wave-left",
    "wave-right"
  ]);
  const MIC_MOODS = new Set([
    "react-chat",
    "wave",
    "wave-left",
    "wave-right",
    "dance",
    "groove",
    "party"
  ]);
  const HAND_KEYS = new Set([
    "love-hug",
    "love-hug-a",
    "love-hug-b",
    "comfort",
    "love",
    "love-a",
    "love-b",
    "bond-warm",
    "bond-warm-a",
    "bond-warm-b",
    "heal-glow",
    "thanks-bow"
  ]);
  const BOWL_KEYS = new Set([
    "rest",
    "rest-a",
    "rest-b",
    "curl",
    "curl-a",
    "curl-b",
    "yawn",
    "yawn-a",
    "yawn-b",
    "sleepy",
    "cozy",
    "cozy-a",
    "cozy-b",
    "cozy-blanket",
    "cozy-blanket-a",
    "cozy-blanket-b",
    "calm-deep",
    "calm-deep-a",
    "calm-deep-b",
    "egg-rest",
    "egg-rest-a",
    "egg-rest-b",
    "guard",
    "guard-a",
    "guard-b",
    "hungry",
    "munch",
    "snack",
    "snack-a",
    "snack-b",
    "sip",
    "sip-a",
    "sip-b",
    "full",
    "alert",
    "alert-a",
    "alert-b"
  ]);

  function safe(v) {
    return typeof v === "string" && v.trim() ? v.trim() : "";
  }

  /** Soft Neon cyborg: rest/sleep/cozy banks must stay on idle/warm/happy — never purple curl. */
  function forceCyborgRestFrames(poseCycles) {
    const cycles = Array.isArray(poseCycles) ? poseCycles : [];
    const CYBORG_REST = ["idle", "warm", "happy"];
    const REST_MOODS = [
      "sleepy",
      "curl",
      "rest",
      "yawn",
      "cozy",
      "cozy-blanket",
      "calm-deep",
      "egg-rest",
      "idle",
      "warm",
      "happy"
    ];
    for (const id of ["rest", "cozy", "cozy-blanket", "yawn", "calm-deep", "egg-rest"]) {
      const cycle = cycles.find((c) => c && c.id === id);
      if (!cycle) continue;
      cycle.frames = CYBORG_REST.slice();
      cycle.halfMs = id === "rest" ? 1400 : Math.max(900, Number(cycle.halfMs) || 1100);
      const moods = Array.isArray(cycle.moods) ? cycle.moods.slice() : [];
      for (const m of REST_MOODS) {
        if (!moods.includes(m)) moods.push(m);
      }
      cycle.moods = moods;
    }
    const rest = cycles.find((c) => c && c.id === "rest");
    if (rest) rest.moods = REST_MOODS.slice();
    return cycles;
  }

  function wantsBallProp(key, displayMood) {
    return BALL_KEYS.has(key) || BALL_MOODS.has(key) || BALL_MOODS.has(displayMood);
  }

  function wantsMicProp(key, displayMood) {
    return MIC_KEYS.has(key) || MIC_MOODS.has(key) || MIC_MOODS.has(displayMood);
  }

  function playsWithProp(key, displayMood) {
    return wantsBallProp(key, displayMood) || wantsMicProp(key, displayMood);
  }

  function isEatingAtBowlKey(key = "") {
    const k = safe(key).toLowerCase();
    return (
      k === "eating" ||
      k === "feeding" ||
      k.startsWith("eating-") ||
      k === "munch" ||
      k === "snack" ||
      k === "sip"
    );
  }

  /**
   * @param {object} opts
   * @param {HTMLElement} opts.stageEl
   * @param {(path: string) => string} opts.assetUrl
   * @param {(mood: string) => string} opts.moodAsset
   * @param {(url: string) => Promise<boolean>} opts.preloadTexture
   * @param {(n: number) => void} opts.applySpriteHeight
   * @param {() => HTMLImageElement} opts.activeSpriteEl
   * @param {() => HTMLImageElement} opts.idleSpriteEl
   * @param {(next: HTMLElement, prev: HTMLElement, ms: number) => void} opts.crossfadeReveal
   * @param {() => number} opts.getLastStepDurMs
   * @param {(url: string, assetKey: string) => void} opts.onPoseFrameShown
   * @param {() => void} opts.onPoseStopped
   * @param {number} [opts.crossfadePoseMs]
   * @param {number} [opts.crossfadePoseWalkMs]
   * @param {() => HTMLElement|null} [opts.getPropBall]
   * @param {() => HTMLElement|null} [opts.getPropMic]
   * @param {() => HTMLElement|null} [opts.getPropHand]
   * @param {() => HTMLElement|null} [opts.getPropBowl]
   * @param {(data: object, now: number) => boolean} [opts.isKojSpeaking]
   * @param {typeof requestAnimationFrame} [opts.raf]
   * @param {typeof cancelAnimationFrame} [opts.caf]
   */
  function create(opts = {}) {
    const stageEl = opts.stageEl;
    const assetUrl = opts.assetUrl || ((p) => String(p || ""));
    const moodAsset = opts.moodAsset || ((m) => `assets/kojnozrout/moods/kojnozout-${safe(m) || "idle"}.png`);
    const preloadTexture =
      opts.preloadTexture || (() => Promise.resolve(false));
    const applySpriteHeight = opts.applySpriteHeight || (() => {});
    const activeSpriteEl = opts.activeSpriteEl || (() => null);
    const idleSpriteEl = opts.idleSpriteEl || (() => null);
    const crossfadeReveal = opts.crossfadeReveal || (() => {});
    const getLastStepDurMs =
      typeof opts.getLastStepDurMs === "function" ? opts.getLastStepDurMs : () => 780;
    const onPoseFrameShown =
      typeof opts.onPoseFrameShown === "function" ? opts.onPoseFrameShown : () => {};
    const onPoseStopped =
      typeof opts.onPoseStopped === "function" ? opts.onPoseStopped : () => {};
    const CROSSFADE_POSE_MS = Number(opts.crossfadePoseMs) || 280;
    const CROSSFADE_POSE_WALK_MS = Number(opts.crossfadePoseWalkMs) || 150;
    const getPropBall = opts.getPropBall || (() => null);
    const getPropMic = opts.getPropMic || (() => null);
    const getPropHand = opts.getPropHand || (() => null);
    const getPropBowl = opts.getPropBowl || (() => null);
    const isKojSpeaking =
      typeof opts.isKojSpeaking === "function" ? opts.isKojSpeaking : () => false;
    const raf =
      typeof opts.raf === "function"
        ? opts.raf
        : typeof requestAnimationFrame === "function"
          ? requestAnimationFrame.bind(globalThis)
          : (fn) => setTimeout(() => fn(Date.now()), 16);
    const caf =
      typeof opts.caf === "function"
        ? opts.caf
        : typeof cancelAnimationFrame === "function"
          ? cancelAnimationFrame.bind(globalThis)
          : clearTimeout;

    const poseFramePlayer = {
      active: false,
      cycleId: null,
      frames: [],
      frameIndex: 0,
      currentFrameKey: "",
      raf: null,
      lastFrameTs: 0,
      accMs: 0,
      halfMs: 400,
      start(cycle, heightFraction) {
        if (!cycle || !Array.isArray(cycle.frames)) return;
        if (heightFraction) applySpriteHeight(heightFraction);
        if (this.active && this.cycleId === cycle.id) return;
        this.stop();
        this.active = true;
        this.cycleId = cycle.id;
        this.frames = cycle.frames.slice();
        this.halfMs =
          cycle.id === "walk"
            ? Math.max(160, Math.round(getLastStepDurMs() / 2))
            : cycle.halfMs || 480;
        if (stageEl) {
          stageEl.classList.toggle("pose-walk-frames", cycle.id === "walk");
          stageEl.classList.add("pose-frames-active");
        }
        this.frameIndex = 0;
        this.accMs = 0;
        this.lastFrameTs = 0;
        this.frames.forEach((f) => void preloadTexture(assetUrl(moodAsset(f))));
        void this.showFrame(0);
        this.scheduleLoop();
      },
      scheduleLoop() {
        if (this.raf) caf(this.raf);
        const loop = (ts) => {
          if (!this.active) return;
          if (!this.lastFrameTs) this.lastFrameTs = ts;
          const dt = ts - this.lastFrameTs;
          this.lastFrameTs = ts;
          this.accMs += dt;
          if (this.accMs >= this.halfMs) {
            this.accMs = 0;
            this.frameIndex = (this.frameIndex + 1) % this.frames.length;
            void this.showFrame(this.frameIndex);
          }
          this.raf = raf(loop);
        };
        this.raf = raf(loop);
      },
      async showFrame(i) {
        const frameKey = this.frames[i];
        if (!frameKey) return;
        this.currentFrameKey = frameKey;
        const url = assetUrl(moodAsset(frameKey));
        const ok = await preloadTexture(url);
        if (!this.active || !ok) return;
        const nextSlot = idleSpriteEl();
        const prevSlot = activeSpriteEl();
        if (!nextSlot) return;
        if (nextSlot.src === url && nextSlot.classList.contains("visible")) return;
        await new Promise((resolve) => {
          nextSlot.onload = () => resolve(true);
          nextSlot.onerror = () => resolve(false);
          if (nextSlot.src === url && nextSlot.complete) {
            resolve(true);
            return;
          }
          nextSlot.src = url;
        });
        if (!this.active) return;
        const fadeMs =
          this.cycleId === "walk" ? CROSSFADE_POSE_WALK_MS : CROSSFADE_POSE_MS;
        crossfadeReveal(nextSlot, prevSlot, fadeMs);
        onPoseFrameShown(url, `__pose__${this.cycleId}`);
      },
      stop() {
        if (!this.active && !this.raf) return;
        this.active = false;
        this.cycleId = null;
        if (stageEl) {
          stageEl.classList.remove("pose-walk-frames", "pose-frames-active");
        }
        if (this.raf) caf(this.raf);
        this.raf = null;
        this.lastFrameTs = 0;
        this.accMs = 0;
        this.currentFrameKey = "";
        onPoseStopped();
      }
    };

    function resolvePropKey(data = {}) {
      const kd = data.kojDisplay || {};
      if (poseFramePlayer.active && poseFramePlayer.frames.length) {
        const frameKey = poseFramePlayer.frames[poseFramePlayer.frameIndex];
        if (frameKey) return safe(frameKey).toLowerCase();
      }
      return safe(kd.spriteAsset).toLowerCase() || safe(kd.mood).toLowerCase();
    }

    function resolvePropDisplayMood(data = {}) {
      return safe(data?.kojDisplay?.mood).toLowerCase();
    }

    function syncProps(data, now) {
      const kd = data?.kojDisplay || {};
      const itemUse = kd.itemUse;
      const state = data?.kojnozoutState || data?.kojnozroutState || {};
      const key = resolvePropKey(data);
      const displayMood = resolvePropDisplayMood(data);
      const speaking = isKojSpeaking(data, now);
      const vr = data?.kojVideoReaction || kd.videoReaction;
      const blocked =
        key === "sleepy" || key === "sick" || key === "sad" || (vr && vr.active);
      const lastCareAt = Number(state.lastCareAt || 0);
      const carePetting =
        safe(state.behavior).toLowerCase() === "care_react" && now - lastCareAt < 4500;

      const forcedProp = itemUse?.active ? safe(itemUse.prop).toLowerCase() : "";
      const wantHand =
        forcedProp === "hand" || carePetting || (!blocked && HAND_KEYS.has(key));
      const wantMic =
        !forcedProp && !blocked && !wantHand && (speaking || wantsMicProp(key, displayMood));
      const wantBall =
        forcedProp === "ball" ||
        (!forcedProp && !blocked && !wantHand && !wantMic && wantsBallProp(key, displayMood));
      const eatingAtBowl =
        isEatingAtBowlKey(key) || kd.feeding === true || key === "hungry" || key === "munch";
      const restingAtBowl =
        stageEl &&
        stageEl.classList.contains("corner-rest") &&
        (BOWL_KEYS.has(key) ||
          ["rest", "curl", "yawn", "sleepy", "cozy", "calm-deep", "guard"].includes(key));
      const wantBowl =
        forcedProp === "bowl" ||
        (!(vr && vr.active) &&
          !wantHand &&
          (eatingAtBowl || restingAtBowl) &&
          !(wantMic && !eatingAtBowl) &&
          !(wantBall && !eatingAtBowl));

      const propBowl = getPropBowl();
      const propHand = getPropHand();
      const propMic = getPropMic();
      const propBall = getPropBall();
      if (propBowl) propBowl.classList.toggle("on", wantBowl);
      if (propHand) propHand.classList.toggle("on", wantHand);
      if (propMic) propMic.classList.toggle("on", wantMic);
      if (propBall) propBall.classList.toggle("on", wantBall);
      if (stageEl) {
        stageEl.classList.toggle("prop-ball", wantBall);
        stageEl.classList.toggle("prop-mic", wantMic);
        stageEl.classList.toggle("prop-hand", wantHand);
      }
    }

    return {
      poseFramePlayer,
      resolvePropKey,
      resolvePropDisplayMood,
      wantsBallProp,
      wantsMicProp,
      playsWithProp,
      isEatingAtBowlKey,
      syncProps,
      BALL_KEYS,
      MIC_KEYS,
      HAND_KEYS,
      BOWL_KEYS
    };
  }

  return {
    BALL_KEYS,
    BALL_MOODS,
    MIC_KEYS,
    MIC_MOODS,
    HAND_KEYS,
    BOWL_KEYS,
    forceCyborgRestFrames,
    wantsBallProp,
    wantsMicProp,
    playsWithProp,
    isEatingAtBowlKey,
    create
  };
});
