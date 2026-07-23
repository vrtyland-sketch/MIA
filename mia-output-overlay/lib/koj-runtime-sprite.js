/**
 * Koj runtime dual-buffer sprite engine — crossfade, texture cache, height.
 * Split phase B: keep HTML as orchestrator (pose/mood/poll), sprite I/O here.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.KojRuntimeSprite = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function safe(v) {
    return typeof v === "string" && v.trim() ? v.trim() : "";
  }

  /**
   * @param {object} opts
   * @param {HTMLImageElement} opts.spriteA
   * @param {HTMLImageElement} opts.spriteB
   * @param {HTMLElement} opts.cssMascot
   * @param {HTMLElement} opts.spriteDock
   * @param {HTMLElement} opts.stageEl
   * @param {string} opts.apiBase
   * @param {string} [opts.cacheV]
   * @param {string} [opts.bootSpriteKey]
   * @param {string} [opts.bootSpritePath]
   * @param {Record<string, number>} [opts.evolutionScale]
   * @param {number} [opts.crossfadeMs]
   * @param {number} [opts.minSwapMs]
   * @param {number} [opts.minSwapEatingMs]
   * @param {number} [opts.minSwapSleepyMs]
   */
  function create(opts = {}) {
    const spriteA = opts.spriteA;
    const spriteB = opts.spriteB;
    const cssMascot = opts.cssMascot;
    const spriteDock = opts.spriteDock;
    const stageEl = opts.stageEl;
    const spriteSlots = [spriteA, spriteB].filter(Boolean);
    const apiBase = safe(opts.apiBase) || "http://127.0.0.1:3000";
    const cacheV = safe(opts.cacheV) || "38-koj-split";
    const bootSpriteKey = safe(opts.bootSpriteKey) || "idle";
    const bootSpritePath =
      safe(opts.bootSpritePath) || "assets/kojnozrout/moods/kojnozout-idle.png";
    const evolutionScale = opts.evolutionScale || {
      egg: 0.24,
      hatchling: 0.28,
      sprout: 0.32,
      guardian: 0.38,
      legend: 0.44
    };
    const CROSSFADE_MS = Number(opts.crossfadeMs) || 820;
    const MIN_SWAP_MS = Number(opts.minSwapMs) || 1100;
    const MIN_SWAP_EATING_MS = Number(opts.minSwapEatingMs) || 650;
    const MIN_SWAP_SLEEPY_MS = Number(opts.minSwapSleepyMs) || 3200;

    const state = opts.sharedState && typeof opts.sharedState === "object"
      ? opts.sharedState
      : {
          activeSlotIndex: 0,
          currentAssetKey: "",
          currentImgUrl: "",
          lastSwapAt: 0,
          lastSpriteKey: "",
          hasLoadedPng: false,
          pendingSwapToken: 0,
          pendingSprite: null
        };

    if (state.activeSlotIndex == null) state.activeSlotIndex = 0;
    if (state.currentAssetKey == null) state.currentAssetKey = "";
    if (state.currentImgUrl == null) state.currentImgUrl = "";
    if (state.lastSwapAt == null) state.lastSwapAt = 0;
    if (state.lastSpriteKey == null) state.lastSpriteKey = "";
    if (state.hasLoadedPng == null) state.hasLoadedPng = false;
    if (state.pendingSwapToken == null) state.pendingSwapToken = 0;
    if (!("pendingSprite" in state)) state.pendingSprite = null;

    let crossfadeHideTimer = null;
    const textureCache = new Map();

    function assetUrl(path) {
      const raw = safe(path);
      if (!raw) return "";
      if (raw.startsWith("http")) {
        if (raw.includes("?")) return raw;
        return `${raw}?v=${cacheV}`;
      }
      const clean = raw.replace(/^\/+/, "");
      return `${apiBase}/${clean}?v=${cacheV}`;
    }

    function moodAsset(m) {
      const key = safe(m).toLowerCase() || "idle";
      return `assets/kojnozrout/moods/kojnozout-${key}.png`;
    }

    function moodKey(mood, _bowl, spriteAsset) {
      const forced = safe(spriteAsset).toLowerCase();
      if (forced) return forced;
      return safe(mood).toLowerCase() || "idle";
    }

    function stageSize() {
      const w = Math.max(80, (stageEl && stageEl.clientWidth) || 400);
      const h = Math.max(80, (stageEl && stageEl.clientHeight) || 400);
      const dockW = Math.min(w * 0.92, 300);
      const dockH = Math.min(h * 0.88, 520);
      if (spriteDock) {
        spriteDock.style.width = `${dockW}px`;
        spriteDock.style.height = `${dockH}px`;
      }
      return { w: dockW, h: dockH };
    }

    function activeSpriteEl() {
      return spriteSlots[state.activeSlotIndex] || spriteA;
    }

    function idleSpriteEl() {
      return spriteSlots[state.activeSlotIndex === 0 ? 1 : 0] || spriteB;
    }

    function minSwapMs(mood = "", spriteAsset = "") {
      const m = safe(mood).toLowerCase();
      const s = safe(spriteAsset).toLowerCase();
      if (m.includes("sleep") || s.includes("sleep") || m === "rest" || m === "curl") {
        return MIN_SWAP_SLEEPY_MS;
      }
      if (
        m.startsWith("eating-") ||
        m === "eating" ||
        m === "feeding" ||
        m === "munch" ||
        m === "snack"
      ) {
        return MIN_SWAP_EATING_MS;
      }
      return MIN_SWAP_MS;
    }

    function crossfadeReveal(nextSlot, prevSlot, fadeMs = CROSSFADE_MS) {
      if (!nextSlot) return;
      if (crossfadeHideTimer) clearTimeout(crossfadeHideTimer);
      const dur = `${fadeMs}ms`;
      nextSlot.style.transitionDuration = dur;
      nextSlot.classList.remove("fading-out");
      if (prevSlot && prevSlot !== nextSlot) {
        prevSlot.style.transitionDuration = dur;
        prevSlot.classList.remove("fading-out");
        void prevSlot.offsetWidth;
        prevSlot.classList.add("fading-out");
      }
      nextSlot.classList.add("visible");
      if (cssMascot) cssMascot.classList.remove("visible");
      state.hasLoadedPng = true;
      crossfadeHideTimer = setTimeout(() => {
        if (prevSlot && prevSlot !== nextSlot) {
          prevSlot.classList.remove("visible", "fading-out");
        }
        crossfadeHideTimer = null;
      }, fadeMs + 40);
    }

    function applySpriteHeight(heightFraction) {
      const { h } = stageSize();
      const px = `${Math.round(h * heightFraction)}px`;
      spriteSlots.forEach((slot) => {
        slot.style.maxHeight = px;
      });
    }

    function revealSpriteSlot(slot) {
      spriteSlots.forEach((node) => node.classList.remove("visible"));
      if (slot) slot.classList.add("visible");
      if (cssMascot) cssMascot.classList.remove("visible");
      state.hasLoadedPng = true;
    }

    function preloadTexture(url) {
      const loadUrl = assetUrl(url);
      if (!loadUrl) return Promise.resolve(false);
      if (textureCache.has(loadUrl)) {
        return textureCache.get(loadUrl);
      }
      const promise = new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = loadUrl;
      });
      textureCache.set(loadUrl, promise);
      return promise;
    }

    async function resolveTexture(assetKey, displayMood, bowl, spriteUrl) {
      const serverUrl = assetUrl(spriteUrl);
      if (serverUrl) {
        if (await preloadTexture(serverUrl)) return serverUrl;
      }

      const primary = safe(assetKey).toLowerCase();
      const candidates = [
        primary,
        displayMood,
        moodKey(displayMood, bowl, primary),
        bootSpriteKey
      ];
      const seen = new Set();
      for (const candidate of candidates) {
        const key = String(candidate || "").toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const url = assetUrl(moodAsset(key));
        if (await preloadTexture(url)) return url;
      }
      return "";
    }

    function resolveSpriteHeightFraction(kojState, tier) {
      const normalizedTier = safe(tier).toLowerCase() || "egg";
      const sc = Number(kojState?.evolution?.scale);
      const hubScale =
        Number.isFinite(sc) && sc > 0
          ? sc
          : evolutionScale[normalizedTier] || evolutionScale.egg;
      const targetPx = Math.min(320, Math.round(110 + hubScale * 380));
      const { h } = stageSize();
      return clamp(targetPx / h, 0.42, 0.98);
    }

    async function crossfadeToTexture(url, heightFraction, mood = "", spriteAsset = "") {
      const loadUrl = assetUrl(url);
      if (!loadUrl) return false;

      applySpriteHeight(heightFraction);

      if (loadUrl === state.currentImgUrl) {
        revealSpriteSlot(activeSpriteEl());
        return true;
      }

      const now = Date.now();
      const minSwap = minSwapMs(mood, spriteAsset);
      if (state.currentImgUrl && now - state.lastSwapAt < minSwap) {
        return "throttled";
      }

      const swapToken = ++state.pendingSwapToken;
      const ok = await preloadTexture(loadUrl);
      if (swapToken !== state.pendingSwapToken || !ok) return false;

      const nextSlot = idleSpriteEl();
      const previousSlot = activeSpriteEl();

      await new Promise((resolve) => {
        nextSlot.onload = () => resolve(true);
        nextSlot.onerror = () => resolve(false);
        if (nextSlot.src === loadUrl && nextSlot.complete) {
          resolve(true);
          return;
        }
        nextSlot.src = loadUrl;
      });

      if (swapToken !== state.pendingSwapToken) return false;

      crossfadeReveal(nextSlot, previousSlot, CROSSFADE_MS);
      state.activeSlotIndex = state.activeSlotIndex === 0 ? 1 : 0;
      state.currentImgUrl = loadUrl;
      state.lastSwapAt = Date.now();
      return true;
    }

    async function showCssMascot(mood, bowl, spriteAsset, _serverEmoji, heightFraction) {
      const bootUrl = assetUrl(bootSpritePath);
      if (bootUrl) {
        return crossfadeToTexture(
          bootUrl,
          heightFraction || 0.55,
          mood,
          spriteAsset
        ).then((r) => r === true);
      }
      return false;
    }

    async function showImgTexture(url, heightFraction, mood, bowl, spriteAsset, serverEmoji) {
      if (!url) {
        if (!state.hasLoadedPng) {
          await showCssMascot(mood, bowl, spriteAsset, serverEmoji, heightFraction);
        }
        return false;
      }

      const result = await crossfadeToTexture(url, heightFraction, mood, spriteAsset);
      if (result === true) return true;
      if (result === "throttled") return "throttled";
      if (!state.hasLoadedPng) {
        await showCssMascot(mood, bowl, spriteAsset, serverEmoji, heightFraction);
      }
      return false;
    }

    return {
      CROSSFADE_MS,
      BOOT_SPRITE_KEY: bootSpriteKey,
      BOOT_SPRITE_PATH: bootSpritePath,
      state,
      get currentAssetKey() {
        return state.currentAssetKey;
      },
      set currentAssetKey(v) {
        state.currentAssetKey = v;
      },
      get currentImgUrl() {
        return state.currentImgUrl;
      },
      set currentImgUrl(v) {
        state.currentImgUrl = v;
      },
      get lastSwapAt() {
        return state.lastSwapAt;
      },
      set lastSwapAt(v) {
        state.lastSwapAt = v;
      },
      get lastSpriteKey() {
        return state.lastSpriteKey;
      },
      set lastSpriteKey(v) {
        state.lastSpriteKey = v;
      },
      get hasLoadedPng() {
        return state.hasLoadedPng;
      },
      set hasLoadedPng(v) {
        state.hasLoadedPng = Boolean(v);
      },
      get pendingSprite() {
        return state.pendingSprite;
      },
      set pendingSprite(v) {
        state.pendingSprite = v;
      },
      assetUrl,
      moodAsset,
      moodKey,
      stageSize,
      activeSpriteEl,
      idleSpriteEl,
      minSwapMs,
      crossfadeReveal,
      applySpriteHeight,
      revealSpriteSlot,
      preloadTexture,
      resolveTexture,
      resolveSpriteHeightFraction,
      crossfadeToTexture,
      showCssMascot,
      showImgTexture
    };
  }

  return { create };
});
