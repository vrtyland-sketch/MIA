/**
 * Koj runtime stage mood classes, wander variation, speaking/video visuals.
 * Split phase F: HTML keeps tick/boot; CSS class orchestration lives here.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.KojRuntimeStage = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const STAGE_MOOD_CLASSES = [
    "sleepy",
    "sick",
    "sad",
    "annoyed",
    "stressed",
    "full",
    "celebrate",
    "gift",
    "combo",
    "duel",
    "eating",
    "item-use-active",
    "item-use-food",
    "item-use-heal",
    "item-use-care",
    "item-use-comfort",
    "item-use-duel"
  ];

  function safe(v) {
    return typeof v === "string" && v.trim() ? v.trim() : "";
  }

  function toNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function isMomentLive(moment, now = Date.now()) {
    if (!moment || typeof moment !== "object") return false;
    const holdUntil = toNumber(moment.holdUntilTs || moment.expiresAt || moment.until, 0);
    if (holdUntil > 0) return holdUntil > now;
    return Boolean(moment.active);
  }

  function resolveDisplayMood(state, care) {
    const need = safe(care?.need).toLowerCase();
    if (state?.isSleeping || need === "sleepy") return "sleepy";
    if (state?.affliction === "sick" || need === "sick") return "sick";
    if (state?.affliction === "sad" || need === "sad") return "sad";
    if (state?.affliction === "annoyed" || need === "annoyed") return "annoyed";
    return safe(state?.mood) || "idle";
  }

  /** Visual mouth/pose only — TTS audio is exclusive to MIA_VOICE (vp.audioSink). */
  function isKojSpeaking(data, now) {
    const vp = data?.voicePlayback;
    if (!vp) return false;
    const speaker = safe(vp.speaker).toLowerCase();
    if (speaker !== "kojnozout" && speaker !== "kojnozrout") return false;
    const holdUntil = Number(vp.holdUntilTs || 0);
    if (holdUntil > now) return true;
    const updatedAt = Number(vp.updatedAt || 0);
    return updatedAt > 0 && now - updatedAt < 12000;
  }

  /**
   * @param {object} opts
   * @param {HTMLElement} opts.stageEl
   * @param {(data?: object) => string} [opts.resolvePropKey]
   * @param {(key: string, mood: string) => boolean} [opts.playsWithProp]
   * @param {(key: string) => boolean} [opts.isCalmWanderMood]
   * @param {(data?: object) => boolean} [opts.shouldForceWander]
   * @param {(ms: number) => void} [opts.setLastStepDurMs]
   * @param {() => { setSpeaking?: (on: boolean) => void }|null} [opts.getLiveMotion]
   * @param {() => number} [opts.random]
   */
  function create(opts = {}) {
    const stageEl = opts.stageEl;
    const resolvePropKey =
      typeof opts.resolvePropKey === "function" ? opts.resolvePropKey : () => "";
    const playsWithProp =
      typeof opts.playsWithProp === "function" ? opts.playsWithProp : () => false;
    const isCalmWanderMood =
      typeof opts.isCalmWanderMood === "function"
        ? opts.isCalmWanderMood
        : (key) => key === "idle";
    const shouldForceWander =
      typeof opts.shouldForceWander === "function"
        ? opts.shouldForceWander
        : (data) =>
            data?.kojDisplay?.walk?.active === true &&
            data?.kojDisplay?.walk?.kind === "care";
    const setLastStepDurMs =
      typeof opts.setLastStepDurMs === "function" ? opts.setLastStepDurMs : () => {};
    const getLiveMotion =
      typeof opts.getLiveMotion === "function" ? opts.getLiveMotion : () => null;
    const random =
      typeof opts.random === "function" ? opts.random : () => Math.random();

    let isWandering = false;

    function startWanderVariation() {
      if (!stageEl || isWandering) return;
      isWandering = true;
      const walkDur = (15 + random() * 6).toFixed(1);
      const stepDur = 0.68 + random() * 0.22;
      setLastStepDurMs(Math.round(stepDur * 1000));
      stageEl.style.setProperty("--koj-walk-dur", `${walkDur}s`);
      stageEl.style.setProperty("--koj-step-dur", `${stepDur.toFixed(2)}s`);
    }

    function stopWanderVariation() {
      isWandering = false;
    }

    function applyStageMood(mood, data) {
      if (!stageEl) return;
      const vr = data?.kojVideoReaction || data?.kojDisplay?.videoReaction;
      stageEl.classList.remove(
        ...STAGE_MOOD_CLASSES,
        "calm-idle",
        "wander",
        "corner-rest",
        "battle-active",
        "battle-attack-stage",
        "battle-hit-stage"
      );
      if (vr?.active) return;

      const itemUse = data?.kojDisplay?.itemUse;
      if (itemUse?.active) {
        const role = safe(itemUse.role).toLowerCase() || "comfort";
        stageEl.classList.add("item-use-active", `item-use-${role}`);
        if (role === "food") {
          stageEl.classList.add("eating", "corner-rest");
          return;
        }
        if (role === "heal" || role === "care") {
          stageEl.classList.add("gift");
          return;
        }
        if (role === "comfort") {
          stageEl.classList.add("combo");
          return;
        }
        if (role === "duel") {
          stageEl.classList.add("duel", "battle-attack-stage");
          return;
        }
        return;
      }

      const key = safe(mood).toLowerCase();
      if (
        key.startsWith("annoyed") ||
        key.startsWith("stressed") ||
        key === "guard" ||
        key === "chaos-spin" ||
        key === "alert"
      ) {
        stageEl.classList.add(key.includes("stress") ? "stressed" : "annoyed");
        if (key === "guard") stageEl.classList.add("corner-rest");
        return;
      }
      if (key.startsWith("celebrate") || key.startsWith("proud") || key.startsWith("party")) {
        stageEl.classList.add("celebrate");
        return;
      }
      if (key.startsWith("gift") || key.startsWith("thanks") || key === "react-gift") {
        stageEl.classList.add("gift");
        return;
      }
      if (key.startsWith("combo") || key.startsWith("cheer") || key.startsWith("hype")) {
        stageEl.classList.add("combo");
        return;
      }
      if (key.startsWith("duel")) {
        stageEl.classList.add("duel");
        return;
      }
      if (data?.kojBattle?.active) {
        const phase = safe(data.kojBattle.phase).toLowerCase();
        stageEl.classList.add("battle-active", "duel");
        if (phase.includes("attack") || phase.includes("item")) {
          stageEl.classList.add("battle-attack-stage");
        } else if (phase.includes("hit")) {
          stageEl.classList.add("battle-hit-stage");
        } else if (phase.includes("won")) {
          stageEl.classList.add("celebrate");
        }
        return;
      }
      if (
        key === "eating" ||
        key === "feeding" ||
        key.startsWith("eating-") ||
        key === "munch" ||
        key === "snack" ||
        data?.kojDisplay?.feeding
      ) {
        stageEl.classList.add("eating");
        stageEl.classList.add("corner-rest");
        return;
      }
      if (key === "hungry" || key === "munch" || key === "snack" || key === "sip" || key === "alert") {
        stageEl.classList.add("hungry");
        stageEl.classList.add("corner-rest");
        return;
      }
      if (key === "full" || key.startsWith("stretch")) {
        stageEl.classList.add("full");
        stageEl.classList.add("corner-rest");
        return;
      }
      if (
        ["sleepy", "sick", "sad", "rest", "curl", "yawn", "cozy", "calm-deep"].includes(key) ||
        key.startsWith("neglect") ||
        key === "comfort"
      ) {
        const restByBowl = ["rest", "curl", "yawn", "sleepy", "cozy", "calm-deep"].includes(key);
        if (restByBowl) stageEl.classList.add("corner-rest");
        stageEl.classList.add(
          restByBowl
            ? "sleepy"
            : key.startsWith("neglect") || key === "comfort"
              ? "sad"
              : key
        );
        return;
      }

      stageEl.classList.add("calm-idle");
      const propKey = resolvePropKey(data);
      const propMood = safe(mood).toLowerCase();
      const playsWithPropNow = playsWithProp(propKey, propMood);
      const careWalk = shouldForceWander(data);
      if (careWalk) {
        stageEl.classList.add("wander");
        startWanderVariation();
        return;
      }
      if (isCalmWanderMood(key) && !isKojSpeaking(data, Date.now()) && !playsWithPropNow) {
        stageEl.classList.add("wander");
        startWanderVariation();
      } else {
        stopWanderVariation();
      }
    }

    function syncSpeakingVisual(data, now) {
      if (!stageEl) return;
      const speaking = isKojSpeaking(data, now);
      if (speaking) stageEl.classList.add("speaking");
      else stageEl.classList.remove("speaking");
      const live = getLiveMotion();
      if (live && typeof live.setSpeaking === "function") {
        live.setSpeaking(speaking);
      }
    }

    function syncVideoReactionVisual(data, now) {
      if (!stageEl) return;
      stageEl.classList.remove("gift-watch", "groove", "dance", "hype");
      if (isKojSpeaking(data, now)) return;

      const vr = data?.kojVideoReaction || data?.kojDisplay?.videoReaction;
      if (!vr?.active) return;

      const state = data?.kojnozoutState || data?.kojnozroutState || {};
      const care = data?.careOpportunities || {};
      const displayMood = safe(data?.kojDisplay?.mood) || resolveDisplayMood(state, care);
      if (["sleepy", "sick"].includes(displayMood)) return;

      const phase = safe(vr.phase) || "watch";
      if (phase === "hype") stageEl.classList.add("hype");
      else if (phase === "dance") stageEl.classList.add("dance");
      else if (phase === "groove") stageEl.classList.add("groove");
      else stageEl.classList.add("gift-watch");
    }

    /** Combo/spam wave stage FX — runs after applyStageMood (combo class may be re-added). */
    function syncComboVisual(data, now) {
      if (!stageEl) return;
      const spam = data?.spamSession;
      const spamActive = Boolean(spam?.active);
      const comboLive = isMomentLive(data?.comboMoment, now);
      stageEl.classList.toggle("spam-wave", spamActive);
      if (comboLive || spamActive) {
        stageEl.classList.add("combo");
      }
      if (spamActive) {
        const target = Math.max(
          1,
          toNumber(spam.targetRewardPoints, toNumber(spam.pointsToNextReward, 1))
        );
        const current = Math.max(0, toNumber(spam.totalPoints, 0));
        const progressPct = Math.min(100, Math.round((current / target) * 100));
        const urgent =
          Boolean(spam.spamConfirmed) &&
          toNumber(spam.remainingWindowSec, 0) > 0 &&
          toNumber(spam.remainingWindowSec, 0) <= 5;
        const pulse = Boolean(spam.spamConfirmed) && progressPct >= 72;
        stageEl.classList.toggle("combo-pulse", pulse);
        stageEl.classList.toggle("combo-urgent", urgent);
        stageEl.style.setProperty("--koj-wave-pct", `${progressPct}%`);
      } else {
        stageEl.classList.remove("combo-pulse", "combo-urgent");
        stageEl.style.removeProperty("--koj-wave-pct");
      }
    }

    return {
      STAGE_MOOD_CLASSES,
      resolveDisplayMood,
      isKojSpeaking,
      isMomentLive,
      applyStageMood,
      startWanderVariation,
      stopWanderVariation,
      syncSpeakingVisual,
      syncVideoReactionVisual,
      syncComboVisual,
      isWandering: () => isWandering
    };
  }

  return {
    STAGE_MOOD_CLASSES,
    resolveDisplayMood,
    isKojSpeaking,
    isMomentLive,
    create
  };
});
