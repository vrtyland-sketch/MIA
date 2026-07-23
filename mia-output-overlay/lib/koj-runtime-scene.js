/**
 * Koj runtime scene backdrop + viewer chip strip.
 * Split phase D: mood→scene resolve, optional PNG accents, recent participant chips.
 * Donor badge = recognition only (no coin/value on overlay).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.KojRuntimeScene = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SCENE_CLASSES = [
    "scene-den",
    "scene-cave",
    "scene-cozy",
    "scene-feast",
    "scene-party",
    "scene-night"
  ];

  /** Malé PNG fragmenty — různé crop/object-position, nikdy celá obrazovka. */
  const SCENE_ACCENT_SPECS = {
    den: [{ side: "center", width: "48%", bottom: "0", op: 0.36, pos: "50% 92%" }],
    cave: [
      { side: "left", width: "36%", bottom: "0", op: 0.44, pos: "8% 88%" },
      { side: "right", width: "32%", bottom: "0", op: 0.4, pos: "92% 82%" }
    ],
    cozy: [
      { side: "left", width: "40%", bottom: "0", op: 0.38, pos: "18% 78%" },
      { side: "right", width: "34%", bottom: "2%", op: 0.34, pos: "82% 70%" }
    ],
    feast: [{ side: "center", width: "44%", bottom: "0", op: 0.4, pos: "50% 85%" }],
    party: [
      { side: "top", width: "56%", bottom: "auto", op: 0.34, pos: "50% 18%" },
      { side: "left", width: "28%", bottom: "0", op: 0.3, pos: "10% 90%" }
    ],
    night: [{ side: "top", width: "50%", bottom: "auto", op: 0.38, pos: "50% 12%" }]
  };

  const MAX_VIEWER_CHIPS = 7;
  const DEFAULT_FOLLOWER = "/assets/viewers/default-follower.png";

  function safe(v) {
    return typeof v === "string" && v.trim() ? v.trim() : "";
  }

  function resolveScene(displayMood, data) {
    const mood = safe(displayMood).toLowerCase();
    const vr = data?.kojVideoReaction || data?.kojDisplay?.videoReaction;
    if (vr?.active) return "cozy";

    const serverScene = safe(data?.scene || data?.kojDisplay?.scene).toLowerCase();
    if (SCENE_CLASSES.includes(`scene-${serverScene}`)) return serverScene;

    if (["sleepy", "sick", "rest", "curl", "yawn", "calm-deep"].includes(mood)) {
      return "night";
    }
    if (
      mood === "eating" ||
      mood === "feeding" ||
      mood === "full" ||
      mood === "munch" ||
      mood === "snack" ||
      mood === "sip" ||
      /^eating-\d/.test(mood) ||
      data?.kojDisplay?.feeding
    ) {
      return "feast";
    }
    if (
      mood.startsWith("celebrate") ||
      mood.startsWith("party") ||
      mood.startsWith("combo") ||
      mood.startsWith("cheer") ||
      mood.startsWith("hype") ||
      mood.startsWith("duel") ||
      mood.startsWith("proud")
    ) {
      return "party";
    }
    if (
      mood.startsWith("quest") ||
      mood.startsWith("story") ||
      mood.startsWith("gift") ||
      mood.startsWith("thanks") ||
      mood === "flyby" ||
      mood === "flyby-fast" ||
      mood === "react-gift" ||
      mood === "curious" ||
      mood === "thinking" ||
      mood === "peek"
    ) {
      return "cave";
    }
    return "den";
  }

  function initials(label) {
    const s = safe(label).replace(/[^\p{L}\p{N} ]/gu, "").trim();
    if (!s) return "?";
    const parts = s.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return s.slice(0, 2).toUpperCase();
  }

  function isDonorParticipant(p) {
    const type = safe(p?.type).toLowerCase();
    return type === "gift" || !!safe(p?.giftName) || !!safe(p?.tier);
  }

  /**
   * @param {object} opts
   * @param {HTMLElement} opts.stageEl
   * @param {HTMLElement} opts.sceneLayer
   * @param {HTMLElement} [opts.sceneAccentsEl]
   * @param {HTMLElement} [opts.viewerStrip]
   * @param {(path: string) => string} opts.assetUrl
   * @param {() => string} [opts.getSearch]
   * @param {typeof document.createElement} [opts.createElement]
   */
  function create(opts = {}) {
    const stageEl = opts.stageEl;
    const sceneLayer = opts.sceneLayer;
    const sceneAccentsEl = opts.sceneAccentsEl || null;
    const viewerStrip = opts.viewerStrip || null;
    const assetUrl =
      typeof opts.assetUrl === "function"
        ? opts.assetUrl
        : (p) => String(p || "");
    const getSearch =
      typeof opts.getSearch === "function"
        ? opts.getSearch
        : () => (typeof location !== "undefined" ? location.search : "");
    const createElement =
      typeof opts.createElement === "function"
        ? opts.createElement
        : (tag) => document.createElement(tag);

    const sceneAccentEnabled =
      new URLSearchParams(getSearch() || "").get("sceneAccents") === "1";

    let currentScene = "";
    let lastViewerSignature = "";

    function syncSceneAccents(scene) {
      if (!sceneAccentsEl || !stageEl) return;
      sceneAccentsEl.innerHTML = "";
      if (!sceneAccentEnabled) {
        stageEl.classList.remove("scene-accents");
        return;
      }
      const specs = SCENE_ACCENT_SPECS[scene] || [];
      if (!specs.length) {
        stageEl.classList.remove("scene-accents");
        return;
      }
      for (const spec of specs) {
        const img = createElement("img");
        img.className = `scene-accent ${spec.side}`;
        img.alt = "";
        img.decoding = "async";
        img.src = assetUrl(`assets/kojnozrout/scenes/scene-${scene}.png`);
        img.style.width = spec.width;
        if (spec.bottom !== "auto") img.style.bottom = spec.bottom;
        img.style.setProperty("--accent-op", String(spec.op));
        img.style.objectPosition = spec.pos;
        img.onload = () => img.classList.add("visible");
        img.onerror = () => img.remove();
        sceneAccentsEl.appendChild(img);
      }
      stageEl.classList.add("scene-accents");
    }

    function syncScene(displayMood, data, now) {
      void now;
      if (!sceneLayer || !stageEl) return;
      const scene = resolveScene(displayMood, data);
      if (scene !== currentScene) {
        sceneLayer.classList.remove(...SCENE_CLASSES);
        sceneLayer.classList.add(`scene-${scene}`, "show");
        syncSceneAccents(scene);
        currentScene = scene;
      }
      const calm = scene === "den" || scene === "night" || scene === "cozy";
      stageEl.classList.toggle("alive", calm);
    }

    function renderViewers(data) {
      if (!viewerStrip) return;
      const participants = Array.isArray(data?.recentParticipants)
        ? data.recentParticipants
        : [];
      const gifts = Array.isArray(data?.recentGifts) ? data.recentGifts : [];
      const donorKeys = new Set();
      gifts.forEach((g) => {
        const key =
          safe(g?.userId) || safe(g?.user || g?.userLabel || g?.nickname).toLowerCase();
        if (key) donorKeys.add(key);
      });

      const chips = participants.slice(0, MAX_VIEWER_CHIPS);
      const signature = chips
        .map(
          (p) =>
            `${safe(p?.user || p?.userLabel)}:${safe(p?.avatarUrl)}:${
              isDonorParticipant(p) ? "d" : ""
            }`
        )
        .join("|");
      if (signature === lastViewerSignature) return;
      lastViewerSignature = signature;

      viewerStrip.innerHTML = "";
      chips.forEach((p) => {
        const label = safe(p?.userLabel || p?.user) || "Divák";
        const key = safe(p?.userId) || label.toLowerCase();
        const donor = isDonorParticipant(p) || donorKeys.has(key);
        const chip = createElement("div");
        chip.className = "viewer-chip" + (donor ? " donor" : "");
        chip.title = label;
        const avatar = safe(p?.avatarUrl);
        const img = createElement("img");
        img.alt = label;
        img.src = avatar || DEFAULT_FOLLOWER;
        img.onerror = () => {
          if (img.src.indexOf(DEFAULT_FOLLOWER) === -1) {
            img.src = DEFAULT_FOLLOWER;
          } else {
            img.remove();
            chip.textContent = initials(label);
          }
        };
        chip.appendChild(img);
        if (donor) {
          const badge = createElement("span");
          badge.className = "gift-badge";
          badge.textContent = "🎁";
          chip.appendChild(badge);
        }
        viewerStrip.appendChild(chip);
      });
    }

    return {
      SCENE_CLASSES,
      resolveScene,
      syncSceneAccents,
      syncScene,
      renderViewers,
      getCurrentScene: () => currentScene,
      initials,
      isDonorParticipant
    };
  }

  return {
    SCENE_CLASSES,
    SCENE_ACCENT_SPECS,
    MAX_VIEWER_CHIPS,
    DEFAULT_FOLLOWER,
    create,
    resolveScene,
    initials,
    isDonorParticipant
  };
});
