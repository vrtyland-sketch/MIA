(function () {
  "use strict";

  const API =
    location.origin && location.protocol.startsWith("http")
      ? location.origin
      : "http://127.0.0.1:3000";

  const params = new URLSearchParams(location.search);
  const PART = String(params.get("part") || "head").toLowerCase();
  const SYNC_MODE = String(params.get("sync") || "").toLowerCase();
  const SYNC_GRAPHICS = SYNC_MODE === "graphics";
  const SYNC_HYBRID = SYNC_MODE === "hybrid";
  const GRAPHICS_STATE_URL = `${API}/mia/graphics/body/state`;
  const OVERLAY_STATE_URL = `${API}/overlay-state`;

  const PRESENCE = window.MiaLivePresence;

  /** Dedicated part assets (Phase 12u) — not CSS crop of full-body masters. */
  const PART_ASSETS = {
    head: {
      idle: PRESENCE.faces.idle,
      happy: PRESENCE.faces.happy,
      gift: PRESENCE.faces.gift,
      duel: PRESENCE.faces.duel,
      combo: PRESENCE.faces.combo,
      think: PRESENCE.faces.think,
      wave: PRESENCE.faces.wave,
      lip: PRESENCE.lipLadder.slice()
    },
    eyes: {
      speak: [
        "/assets/mia/parts/eyes/01.png",
        "/assets/mia/parts/eyes/02.png",
        "/assets/mia/parts/eyes/03.png",
        "/assets/mia/parts/eyes/04.png",
        "/assets/mia/parts/eyes/02.png",
        "/assets/mia/parts/eyes/01.png"
      ],
      /** Phase 13y — unique openness ladder (same as #miaHolo speak lip) */
      lip: [
        "/assets/mia/parts/eyes/01.png",
        "/assets/mia/parts/eyes/02.png",
        "/assets/mia/parts/eyes/03.png",
        "/assets/mia/parts/eyes/04.png"
      ]
    },
    hands: {
      idle: "/assets/mia/parts/hands/idle.png",
      wave: "/assets/mia/parts/hands/wave.png"
    },
    torso: {
      idle: "/assets/mia/parts/torso/idle.png"
    },
    feet: {
      idle: "/assets/mia/parts/feet/idle.png"
    }
  };

  const sprite = document.getElementById("sprite");
  const spriteB = document.getElementById("spriteB");
  let speakIdx = 0;
  let speakTimer = null;
  let speaking = false;
  let mood = "idle";
  let lastUrl = "";
  let poseFrontIsA = true;
  let partVisible = true;
  let lipTrack = null;
  let lipPlaybackId = null;
  let lipStartedAt = 0;
  let lastLipFrameIdx = 0;
  let lastLipFrameAt = 0;
  const LIP_TICK_MS = PRESENCE.lipTickMs;
  const LIP_HOLD_MS = PRESENCE.lipHoldMs;
  const POSE_FADE_MS = Math.max(200, Math.min(400, Number(PRESENCE.poseCrossfadeMs) || 320));

  function bust(url) {
    return PRESENCE.bustUrl(url);
  }

  function frontSprite() {
    return poseFrontIsA ? sprite : spriteB;
  }

  function backSprite() {
    return poseFrontIsA ? spriteB : sprite;
  }

  function applySpriteOpts(el, opts) {
    if (!el) return;
    el.style.objectFit = opts.objectFit || "contain";
    el.style.objectPosition = opts.objectPosition || "center center";
    el.style.transform = opts.transform || "";
    if (opts.opacity != null && el.classList.contains("on")) {
      el.style.opacity = String(opts.opacity);
    }
  }

  function setSprite(url, opts = {}) {
    if ((!sprite && !spriteB) || !url) return;
    const next = bust(url);
    const a = sprite || spriteB;
    const b = spriteB || sprite;

    if (!b || a === b) {
      // single-slot fallback
      if (lastUrl !== next) {
        a.src = next;
        lastUrl = next;
      }
      a.classList.add("on");
      a.style.opacity = opts.opacity == null ? "1" : String(opts.opacity);
      a.style.transform = opts.transform || "";
      a.style.objectFit = opts.objectFit || "contain";
      a.style.objectPosition = opts.objectPosition || "center center";
      return;
    }

    a.style.transitionDuration = POSE_FADE_MS + "ms";
    b.style.transitionDuration = POSE_FADE_MS + "ms";

    if (!lastUrl) {
      a.src = next;
      a.classList.add("on");
      a.style.opacity = opts.opacity == null ? "1" : String(opts.opacity);
      b.classList.remove("on");
      b.style.opacity = "0";
      poseFrontIsA = true;
      lastUrl = next;
      applySpriteOpts(a, opts);
      return;
    }

    if (lastUrl === next) {
      applySpriteOpts(frontSprite(), opts);
      return;
    }

    const front = frontSprite();
    const back = backSprite();
    lastUrl = next;

    const reveal = () => {
      applySpriteOpts(back, opts);
      back.classList.add("on");
      back.style.opacity = opts.opacity == null ? "1" : String(opts.opacity);
      front.classList.remove("on");
      front.style.opacity = "0";
      poseFrontIsA = !poseFrontIsA;
    };

    if (back.getAttribute("src") === next) {
      reveal();
      return;
    }
    const onReady = () => {
      back.removeEventListener("load", onReady);
      reveal();
    };
    back.addEventListener("load", onReady);
    back.src = next;
    if (back.complete) {
      back.removeEventListener("load", onReady);
      reveal();
    }
  }

  function hideSprite() {
    if (sprite) {
      sprite.classList.remove("on");
      sprite.style.opacity = "0";
      sprite.removeAttribute("src");
    }
    if (spriteB) {
      spriteB.classList.remove("on");
      spriteB.style.opacity = "0";
      spriteB.removeAttribute("src");
    }
    lastUrl = "";
    poseFrontIsA = true;
  }

  function headForMood(nextMood) {
    const key = String(nextMood || "idle").toLowerCase();
    return PART_ASSETS.head[key] || PART_ASSETS.head.idle;
  }

  function lipLadder() {
    if (PART === "head") return PART_ASSETS.head.lip;
    return PART_ASSETS.eyes.lip;
  }

  function canLipSpeak() {
    return PART === "eyes" || PART === "head";
  }

  function clearLipTrack() {
    lipTrack = null;
    lipPlaybackId = null;
    lipStartedAt = 0;
    lastLipFrameIdx = 0;
    lastLipFrameAt = 0;
  }

  function bindLipTrack(track, playbackId, startedAt) {
    if (!track?.keyframes?.length) {
      clearLipTrack();
      return;
    }
    lipTrack = track;
    lipPlaybackId = playbackId == null ? null : playbackId;
    lipStartedAt = Number(startedAt) || Date.now();
  }

  function sampleLipFrameUrl() {
    const lip = typeof window !== "undefined" ? window.MiaLiveLip : null;
    const ladder = lipLadder();
    if (!lip || !lipTrack?.keyframes?.length || !ladder?.length) return null;
    const elapsed = Math.max(0, Date.now() - (lipStartedAt || Date.now()));
    const sample = lip.sampleVisemeKeyframes(lipTrack.keyframes, elapsed);
    let idx = lip.visemeToSpeakFrameIndex(sample, ladder.length);
    const now = Date.now();
    if (now - lastLipFrameAt < LIP_HOLD_MS) {
      idx = lastLipFrameIdx;
    } else if (idx !== lastLipFrameIdx) {
      const step = Math.sign(idx - lastLipFrameIdx) || 1;
      idx = Math.max(0, Math.min(ladder.length - 1, lastLipFrameIdx + step));
      lastLipFrameIdx = idx;
      lastLipFrameAt = now;
    }
    return ladder[idx] || ladder[0];
  }

  function stopSpeakLoop() {
    if (speakTimer) {
      clearInterval(speakTimer);
      speakTimer = null;
    }
    speakIdx = 0;
    clearLipTrack();
  }

  function startSpeakLoop() {
    if (speakTimer || !canLipSpeak()) return;
    const ladder = lipLadder();
    speakIdx = 0;
    lastLipFrameIdx = 0;
    lastLipFrameAt = 0;
    const headOpts =
      PART === "head"
        ? { opacity: 1, objectPosition: "center center" }
        : { opacity: 0.95 };
    // Head hero: single idle↔speak crossfade (no lip/01↔02 carousel).
    // Eyes keep openness ladder via lip track / gentle tick.
    if (PART === "head") {
      const speakUrl =
        (PRESENCE && PRESENCE.speakFace) ||
        (ladder && ladder[ladder.length - 1]) ||
        ladder[0];
      setSprite(speakUrl, headOpts);
      return;
    }
    const lipUrl = sampleLipFrameUrl();
    setSprite(lipUrl || ladder[0], headOpts);
    speakTimer = setInterval(() => {
      const fromLip = sampleLipFrameUrl();
      if (fromLip) {
        setSprite(fromLip, headOpts);
        return;
      }
      speakIdx = speakIdx === 0 ? 1 : 0;
      setSprite(ladder[speakIdx] || ladder[0], headOpts);
    }, LIP_TICK_MS);
  }

  function setSpeaking(on) {
    const next = !!on;
    if (next === speaking) return;
    speaking = next;
    if (canLipSpeak()) {
      if (next) startSpeakLoop();
      else {
        stopSpeakLoop();
        if (PART === "eyes") hideSprite();
        else renderPart();
      }
      return;
    }
    if (PART === "hands") {
      const url = speaking ? PART_ASSETS.hands.wave : PART_ASSETS.hands.idle;
      setSprite(url, {
        opacity: speaking ? 1 : 0.55,
        transform: speaking ? "scale(1.04) rotate(-3deg)" : "scale(1)"
      });
    }
  }

  function applyLipFromPayload(data) {
    if (!canLipSpeak()) return;
    const track = data?.lipTrack || data?.voicePlayback?.lipTrack;
    const playbackId =
      data?.lipPlaybackId != null
        ? data.lipPlaybackId
        : data?.voicePlayback?.playbackId;
    const startedAt =
      data?.lipStartedAt || data?.voicePlayback?.updatedAt || Date.now();
    if (!track?.keyframes?.length) return;
    const same = playbackId === lipPlaybackId;
    const upgraded =
      same &&
      track.provider &&
      lipTrack?.provider &&
      track.provider !== lipTrack.provider;
    if (!same || upgraded || !lipTrack) {
      bindLipTrack(track, playbackId, startedAt);
    }
  }

  function renderPart() {
    switch (PART) {
      case "head":
        if (speaking) return;
        setSprite(headForMood(mood));
        break;
      case "eyes":
        if (!speaking) hideSprite();
        break;
      case "hands":
        setSprite(speaking ? PART_ASSETS.hands.wave : PART_ASSETS.hands.idle, {
          opacity: speaking ? 1 : 0.55,
          transform: speaking ? "scale(1.05) rotate(-4deg)" : "scale(1)"
        });
        break;
      case "feet":
        setSprite(PART_ASSETS.feet.idle);
        break;
      case "torso":
      default:
        setSprite(PART_ASSETS.torso.idle);
        break;
    }
  }

  function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function isMomentLive(slot, now) {
    if (!slot || typeof slot !== "object") return false;
    const until = toNumber(slot.holdUntilTs, 0);
    return until > now || slot.active === true;
  }

  function isActiveVoicePlayback(vp, now) {
    if (!vp || typeof vp !== "object") return false;
    const until = toNumber(vp.holdUntilTs, 0);
    if (until > now) return true;
    return vp.active === true || vp.playing === true;
  }

  function resolveMood(data, now) {
    if (isMomentLive(data?.bossCinematic, now)) return "gift";
    if (isMomentLive(data?.comboMoment, now) || data?.spamSession?.active) return "combo";
    if (isMomentLive(data?.duel, now)) return "duel";
    const overlay = data?.miaOverlay || data?.overlay;
    if (overlay?.route === "support" || overlay?.giftName) return "gift";
    if (overlay?.action === "wave") return "wave";
    return "idle";
  }

  function resolveMiaSpeaking(data, now) {
    const vp = data?.voicePlayback;
    if (!vp || typeof vp !== "object") return false;
    const speaker = String(vp.speaker || vp.owner || "").toLowerCase();
    if (speaker && speaker !== "mia") return false;
    return isActiveVoicePlayback(vp, now);
  }

  function resolveGraphicsSpeaking(data) {
    const until = toNumber(data?.speakingUntilTs, 0);
    if (until > Date.now()) return true;
    return !!data?.speaking;
  }

  function applyPartVisibility(visible) {
    partVisible = visible !== false;
    if (!partVisible) {
      stopSpeakLoop();
      hideSprite();
    }
  }

  function applyGraphicsMood(nextMood) {
    const key = String(nextMood || "idle").toLowerCase();
    mood = PART_ASSETS.head[key] ? key : "idle";
  }

  async function pollGraphics() {
    try {
      const resp = await fetch(GRAPHICS_STATE_URL, { cache: "no-store" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (!data || data.ok === false) return;

      applyPartVisibility(data.parts?.[PART]);
      if (!partVisible) return;

      applyGraphicsMood(data.mood);
      applyLipFromPayload(data);
      setSpeaking(resolveGraphicsSpeaking(data));
      if (!speaking) renderPart();
    } catch (_err) {
      if (partVisible && !lastUrl) renderPart();
    }
  }

  async function pollOverlay() {
    try {
      const resp = await fetch(OVERLAY_STATE_URL, { cache: "no-store" });
      const data = await resp.json();
      const now = Date.now();
      partVisible = true;
      mood = resolveMood(data, now);
      applyLipFromPayload(data);
      setSpeaking(resolveMiaSpeaking(data, now));
      if (!speaking) renderPart();
    } catch (_err) {
      if (!lastUrl) renderPart();
    }
  }

  async function pollHybrid() {
    try {
      const resp = await fetch(GRAPHICS_STATE_URL, { cache: "no-store" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (!data || data.ok === false) throw new Error("graphics_state_unavailable");

      applyPartVisibility(data.parts?.[PART]);
      if (!partVisible) return;

      applyGraphicsMood(data.mood);
      applyLipFromPayload(data);
      setSpeaking(resolveGraphicsSpeaking(data));
      if (!speaking) renderPart();
    } catch (_err) {
      return pollOverlay();
    }
  }

  async function poll() {
    if (SYNC_HYBRID) return pollHybrid();
    if (SYNC_GRAPHICS) return pollGraphics();
    return pollOverlay();
  }

  renderPart();
  setInterval(poll, 350);
  poll();
})();
