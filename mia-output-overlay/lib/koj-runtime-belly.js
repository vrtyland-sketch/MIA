/**
 * Koj runtime belly HUD + soft projector (gift/story/boss → belly plate).
 * Split phase C: HTML stays tick/boot orchestrator; layout + idle clock/weather here.
 * Overlay never surfaces coins — only media URLs already on overlay-state.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.KojRuntimeBelly = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const BELLY_IDLE_AFTER_MS = 20000;
  const BELLY_IDLE_CYCLE_MS = 4000;
  const BELLY_IDLE_PAGES = ["clock", "date", "weather"];
  const BELLY_WEEKDAYS_CS = ["ne", "po", "út", "st", "čt", "pá", "so"];
  const WMO_SHORT_CS = {
    0: "jasno",
    1: "skoro jasno",
    2: "polojasno",
    3: "zataženo",
    45: "mlha",
    48: "mlha",
    51: "mrholení",
    53: "mrholení",
    55: "mrholení",
    61: "déšť",
    63: "déšť",
    65: "silný déšť",
    71: "sněžení",
    73: "sněžení",
    75: "sněžení",
    80: "přeháňky",
    81: "přeháňky",
    82: "liják",
    95: "bouřka",
    96: "bouřka",
    99: "bouřka"
  };

  function safe(v) {
    return typeof v === "string" && v.trim() ? v.trim() : "";
  }

  function toNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  /**
   * Belly HUD during spam wave — miaPoints only, no coin/value fields.
   */
  function buildSpamWaveBellyContent(spam = {}) {
    if (!spam || !spam.active) return null;
    const target = Math.max(
      1,
      toNumber(spam.targetRewardPoints, toNumber(spam.pointsToNextReward, 1))
    );
    const current = Math.max(0, toNumber(spam.totalPoints, 0));
    const progressPct = Math.min(100, Math.round((current / target) * 100));
    const remainingSec = Math.max(0, toNumber(spam.remainingWindowSec, 0));
    const nextTier = safe(spam.nextRewardTier).toUpperCase();
    const main = nextTier ? `${progressPct}% → ${nextTier}` : `${progressPct}%`;
    const metaParts = [`🌊 vlna`, `${current} bodů`];
    if (remainingSec > 0) metaParts.push(`${remainingSec}s`);
    return {
      main,
      sub: metaParts.join(" · "),
      progressPct,
      urgent: Boolean(spam.spamConfirmed) && remainingSec > 0 && remainingSec <= 5,
      confirmed: Boolean(spam.spamConfirmed)
    };
  }

  function resolveMediaUrl(raw, apiBase) {
    const u = safe(raw);
    if (!u) return "";
    if (/^https?:\/\//i.test(u) || u.startsWith("data:")) return u;
    const base = safe(apiBase) || "http://127.0.0.1:3000";
    if (u.startsWith("/")) return `${base}${u}`;
    return `${base}/${u.replace(/^\/+/, "")}`;
  }

  function isLiveMoment(moment, now) {
    if (!moment || typeof moment !== "object") return false;
    const hold = Number(moment.holdUntilTs || moment.expiresAt || 0);
    if (hold > 0) return hold > now;
    const updated = Number(moment.updatedAt || 0);
    return updated > 0 && now - updated < 16000;
  }

  /**
   * Reuse existing overlay media — giftVisual / animationReaction / story / boss.
   * Never invent a parallel gift pipeline. No coins on overlay.
   */
  function resolveProjectorMedia(data, now, apiBase) {
    const giftVisual = data?.giftVisual;
    if (isLiveMoment(giftVisual, now) && safe(giftVisual.imageUrl)) {
      return {
        bellyUrl: resolveMediaUrl(giftVisual.imageUrl, apiBase),
        holoUrl: resolveMediaUrl(giftVisual.imageUrl, apiBase),
        project: true,
        reason: "giftVisual"
      };
    }

    const reaction = data?.animationReaction;
    if (reaction?.active && Number(reaction.holdUntilTs || 0) > now) {
      const sheet = safe(reaction.sheetUrl);
      const overlayImg = safe(reaction.overlay?.imageUrl || reaction.overlay?.thumbUrl);
      const url = resolveMediaUrl(overlayImg || sheet || giftVisual?.imageUrl, apiBase);
      return {
        bellyUrl: url || resolveMediaUrl(giftVisual?.imageUrl, apiBase),
        holoUrl: url,
        project: true,
        reason: "animationReaction"
      };
    }

    const story = data?.storyVisual;
    if (isLiveMoment(story, now)) {
      const frames = Array.isArray(story.frames) ? story.frames : [];
      const liveFrame = frames.find((f) => safe(f?.imageUrl));
      if (liveFrame) {
        const url = resolveMediaUrl(liveFrame.imageUrl, apiBase);
        return { bellyUrl: url, holoUrl: url, project: true, reason: "storyVisual" };
      }
    }

    const boss = data?.bossCinematic;
    if (isLiveMoment(boss, now) && safe(boss.heroImageUrl)) {
      const url = resolveMediaUrl(boss.heroImageUrl, apiBase);
      return { bellyUrl: url, holoUrl: url, project: true, reason: "bossCinematic" };
    }

    const vr = data?.kojVideoReaction || data?.kojDisplay?.videoReaction;
    if (vr?.active) {
      const url = resolveMediaUrl(vr.thumbUrl || vr.imageUrl || vr.posterUrl || "", apiBase);
      return {
        bellyUrl: url,
        holoUrl: url,
        project: true,
        reason: "kojVideoReaction"
      };
    }

    return { bellyUrl: "", holoUrl: "", project: false, reason: "" };
  }

  function formatBellyClock(now = new Date()) {
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  function formatBellyDate(now = new Date()) {
    const dd = String(now.getDate()).padStart(2, "0");
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const wd = BELLY_WEEKDAYS_CS[now.getDay()] || "";
    return { main: `${dd}.${mo}.${yyyy}`, sub: wd };
  }

  function weatherLabelFromCode(code) {
    const n = Number(code);
    if (!Number.isFinite(n)) return "počasí";
    return WMO_SHORT_CS[n] || WMO_SHORT_CS[Math.floor(n)] || "počasí";
  }

  /**
   * Layout box of the visible sprite inside the body mount — uses offset sizes,
   * NOT getBoundingClientRect. Avoids belly drift when the parent has a live transform.
   */
  function measureSpriteLayoutBox(img, containerEl) {
    if (!img || !containerEl) return null;
    const cw = containerEl.clientWidth;
    const ch = containerEl.clientHeight;
    const w = img.offsetWidth;
    const h = img.offsetHeight;
    if (cw < 8 || ch < 8 || w < 8 || h < 8) return null;
    const left = (cw - w) / 2;
    const top = ch - h;
    return { left, top, width: w, height: h };
  }

  function setProjectorImg(imgEl, url, lastKey) {
    if (!imgEl) return lastKey;
    if (!url) {
      imgEl.removeAttribute("src");
      return "";
    }
    if (url === lastKey) return lastKey;
    imgEl.src = url;
    return url;
  }

  function readBellyWeatherCoords(getSearch, weatherCfg) {
    const qs =
      typeof getSearch === "function"
        ? new URLSearchParams(getSearch() || "")
        : new URLSearchParams("");
    const cfg = weatherCfg && typeof weatherCfg === "object" ? weatherCfg : {};
    const lat = Number(
      qs.get("lat") || qs.get("weatherLat") || cfg.lat || cfg.latitude || 50.0755
    );
    const lon = Number(
      qs.get("lon") || qs.get("weatherLon") || cfg.lon || cfg.longitude || 14.4378
    );
    return {
      lat: Number.isFinite(lat) ? lat : 50.0755,
      lon: Number.isFinite(lon) ? lon : 14.4378
    };
  }

  /**
   * @param {object} opts
   * @param {HTMLElement} opts.stageEl
   * @param {HTMLElement} opts.spriteLayerEl
   * @param {HTMLElement} [opts.kojBodyMount]
   * @param {HTMLElement} [opts.kojHeadLayer]
   * @param {HTMLElement} opts.kojProjectorHost
   * @param {HTMLElement} opts.kojBellyScreen
   * @param {HTMLImageElement} opts.kojBellyImg
   * @param {HTMLElement} [opts.kojBellyIdleMain]
   * @param {HTMLElement} [opts.kojBellyIdleSub]
   * @param {HTMLElement} opts.kojEyeBeam
   * @param {HTMLElement} opts.kojHoloPlate
   * @param {HTMLImageElement} opts.kojHoloImg
   * @param {string} opts.apiBase
   * @param {() => HTMLImageElement[]} opts.getSpriteSlots
   * @param {() => number} opts.getActiveSlotIndex
   * @param {() => HTMLImageElement} opts.getSpriteA
   * @param {() => object|null} opts.getAnchors
   * @param {() => string} [opts.getSearch]
   * @param {() => object} [opts.getWeatherConfig]
   * @param {typeof fetch} [opts.fetchImpl]
   */
  function create(opts = {}) {
    const stageEl = opts.stageEl;
    const spriteLayerEl = opts.spriteLayerEl;
    const kojBodyMount = opts.kojBodyMount || null;
    const kojHeadLayer = opts.kojHeadLayer || null;
    const kojProjectorHost = opts.kojProjectorHost;
    const kojBellyScreen = opts.kojBellyScreen;
    const kojBellyImg = opts.kojBellyImg;
    const kojBellyIdleMain = opts.kojBellyIdleMain || null;
    const kojBellyIdleSub = opts.kojBellyIdleSub || null;
    const kojEyeBeam = opts.kojEyeBeam;
    const kojHoloPlate = opts.kojHoloPlate;
    const kojHoloImg = opts.kojHoloImg;
    const apiBase = safe(opts.apiBase) || "http://127.0.0.1:3000";
    const getSpriteSlots =
      typeof opts.getSpriteSlots === "function" ? opts.getSpriteSlots : () => [];
    const getActiveSlotIndex =
      typeof opts.getActiveSlotIndex === "function" ? opts.getActiveSlotIndex : () => 0;
    const getSpriteA =
      typeof opts.getSpriteA === "function" ? opts.getSpriteA : () => null;
    const getAnchors =
      typeof opts.getAnchors === "function" ? opts.getAnchors : () => null;
    const getSearch =
      typeof opts.getSearch === "function"
        ? opts.getSearch
        : () => (typeof location !== "undefined" ? location.search : "");
    const getWeatherConfig =
      typeof opts.getWeatherConfig === "function"
        ? opts.getWeatherConfig
        : () =>
            (typeof window !== "undefined" && window.__MIA_WEATHER__) || {};
    const fetchImpl =
      typeof opts.fetchImpl === "function"
        ? opts.fetchImpl
        : typeof fetch === "function"
          ? fetch.bind(globalThis)
          : null;

    let lastBellyUrl = "";
    let lastHoloUrl = "";
    let bellyIdlePageIdx = 0;
    let bellyIdlePageAt = 0;
    let lastProjectActivityAt = 0;
    let bellyWeather = { tempC: null, label: "", fetchedAt: 0, error: "" };
    let bellyWeatherFetchInFlight = false;

    async function refreshBellyWeather(force = false) {
      const now = Date.now();
      if (!force && bellyWeather.fetchedAt && now - bellyWeather.fetchedAt < 10 * 60 * 1000) {
        return bellyWeather;
      }
      if (bellyWeatherFetchInFlight) return bellyWeather;
      if (!fetchImpl) {
        bellyWeather = {
          ...bellyWeather,
          error: "fetch unavailable",
          fetchedAt: Date.now()
        };
        return bellyWeather;
      }
      bellyWeatherFetchInFlight = true;
      try {
        const { lat, lon } = readBellyWeatherCoords(getSearch, getWeatherConfig());
        const url =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${encodeURIComponent(lat)}` +
          `&longitude=${encodeURIComponent(lon)}` +
          `&current=temperature_2m,weather_code` +
          `&timezone=auto`;
        const res = await fetchImpl(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`weather HTTP ${res.status}`);
        const json = await res.json();
        const temp = Number(json?.current?.temperature_2m);
        const code = json?.current?.weather_code;
        bellyWeather = {
          tempC: Number.isFinite(temp) ? Math.round(temp) : null,
          label: weatherLabelFromCode(code),
          fetchedAt: Date.now(),
          error: ""
        };
      } catch (err) {
        bellyWeather = {
          ...bellyWeather,
          error: String(err && err.message ? err.message : err),
          fetchedAt: Date.now()
        };
      } finally {
        bellyWeatherFetchInFlight = false;
      }
      return bellyWeather;
    }

    function resolveBellyIdleContent(nowMs) {
      if (!bellyIdlePageAt) bellyIdlePageAt = nowMs;
      if (nowMs - bellyIdlePageAt >= BELLY_IDLE_CYCLE_MS) {
        bellyIdlePageIdx = (bellyIdlePageIdx + 1) % BELLY_IDLE_PAGES.length;
        bellyIdlePageAt = nowMs;
        if (BELLY_IDLE_PAGES[bellyIdlePageIdx] === "weather") {
          void refreshBellyWeather(false);
        }
      }
      const page = BELLY_IDLE_PAGES[bellyIdlePageIdx] || "clock";
      const d = new Date(nowMs);
      if (page === "date") {
        const f = formatBellyDate(d);
        return { page, main: f.main, sub: f.sub };
      }
      if (page === "weather") {
        void refreshBellyWeather(false);
        if (bellyWeather.tempC != null) {
          return {
            page,
            main: `${bellyWeather.tempC}°C`,
            sub: bellyWeather.label || "Praha"
          };
        }
        return { page, main: "…°C", sub: bellyWeather.error ? "offline" : "počasí" };
      }
      return { page, main: formatBellyClock(d), sub: "čas" };
    }

    function syncKojHeadLayer() {
      // v26-koj-WHOLE: head clip disabled — keep layer hidden to avoid split seam.
      if (kojHeadLayer) kojHeadLayer.classList.remove("ready");
    }

    function syncProjectorLayout() {
      if (!kojProjectorHost || !spriteLayerEl) return;
      const spriteSlots = getSpriteSlots() || [];
      const activeSlotIndex = getActiveSlotIndex();
      const spriteA = getSpriteA();
      const visible =
        spriteSlots.find(
          (s) => s && s.classList && s.classList.contains("visible") && !s.classList.contains("fading-out")
        ) ||
        spriteSlots.find((s) => s && s.classList && s.classList.contains("visible")) ||
        spriteSlots[activeSlotIndex] ||
        spriteA;
      if (!visible || !visible.naturalWidth) {
        kojProjectorHost.classList.remove("ready");
        if (kojHeadLayer) kojHeadLayer.classList.remove("ready");
        return;
      }
      const layoutRoot = kojBodyMount || spriteLayerEl;
      const box = measureSpriteLayoutBox(visible, layoutRoot);
      if (!box) {
        kojProjectorHost.classList.remove("ready");
        if (kojHeadLayer) kojHeadLayer.classList.remove("ready");
        return;
      }

      kojProjectorHost.style.left = `${box.left}px`;
      kojProjectorHost.style.top = `${box.top}px`;
      kojProjectorHost.style.width = `${box.width}px`;
      kojProjectorHost.style.height = `${box.height}px`;
      kojProjectorHost.style.transform = "none";
      kojProjectorHost.style.transformOrigin = "50% 50%";
      kojProjectorHost.classList.add("ready");

      const anchors = getAnchors();
      if (anchors) {
        if (kojBellyScreen && anchors.belly && typeof anchors.applyRectStyle === "function") {
          anchors.applyRectStyle(kojBellyScreen, anchors.belly);
          const b = anchors.belly;
          if (b && b.w > 0 && b.h > 0) {
            kojBellyScreen.style.transformOrigin = "50% 50%";
          }
        }
        if (kojEyeBeam && anchors.eye && typeof anchors.applyRectStyle === "function") {
          anchors.applyRectStyle(kojEyeBeam, anchors.eye);
        }
      }

      syncKojHeadLayer();
    }

    function syncKojProjector(data, now) {
      if (!kojBellyScreen || !kojEyeBeam || !kojHoloPlate) return;
      syncProjectorLayout();
      const qs = new URLSearchParams(getSearch() || "");
      const demo = qs.get("projectorDemo") === "1";
      const forceIdle = qs.get("bellyIdle") === "1" || qs.get("idleBelly") === "1";
      const forceIdlePage = safe(qs.get("bellyPage")).toLowerCase();

      const media = demo
        ? {
            bellyUrl: resolveMediaUrl("/assets/kojnozrout/moods/kojnozout-happy.png", apiBase),
            holoUrl: resolveMediaUrl("/assets/kojnozrout/moods/kojnozout-happy.png", apiBase),
            project: true,
            reason: "projectorDemo"
          }
        : resolveProjectorMedia(data, now, apiBase);

      if (media.project && media.bellyUrl) {
        lastProjectActivityAt = now;
      }

      const inactiveMs =
        lastProjectActivityAt > 0 ? now - lastProjectActivityAt : BELLY_IDLE_AFTER_MS + 1;
      const waveContent = buildSpamWaveBellyContent(data?.spamSession);
      const wantWaveHud = Boolean(waveContent) && !media.bellyUrl && !forceIdle;
      const wantIdle =
        forceIdle ||
        wantWaveHud ||
        (!media.bellyUrl && inactiveMs >= BELLY_IDLE_AFTER_MS);
      const wantGift = Boolean(media.bellyUrl) && !forceIdle;

      if (wantGift) {
        lastBellyUrl = setProjectorImg(kojBellyImg, media.bellyUrl, lastBellyUrl);
        lastHoloUrl = setProjectorImg(
          kojHoloImg,
          media.holoUrl || media.bellyUrl,
          lastHoloUrl
        );
        kojBellyScreen.classList.add("on", "mode-gift");
        kojBellyScreen.classList.remove("mode-idle");
        if (kojBellyIdleMain) kojBellyIdleMain.textContent = "";
        if (kojBellyIdleSub) kojBellyIdleSub.textContent = "";
        const softHolo = qs.get("holo") !== "0";
        kojEyeBeam.classList.toggle("on", softHolo && Boolean(media.project));
        kojHoloPlate.classList.toggle(
          "on",
          softHolo && Boolean(media.project && (media.holoUrl || media.bellyUrl))
        );
        if (stageEl) stageEl.classList.toggle("koj-projecting", Boolean(media.project));
        return;
      }

      lastBellyUrl = setProjectorImg(kojBellyImg, "", lastBellyUrl);
      lastHoloUrl = setProjectorImg(kojHoloImg, "", lastHoloUrl);
      kojEyeBeam.classList.remove("on");
      kojHoloPlate.classList.remove("on");
      if (stageEl) stageEl.classList.remove("koj-projecting");

      if (!wantIdle) {
        kojBellyScreen.classList.remove("on", "mode-idle", "mode-gift");
        return;
      }

      let idle = wantWaveHud && waveContent
        ? { page: "wave", main: waveContent.main, sub: waveContent.sub, wave: waveContent }
        : resolveBellyIdleContent(now);
      if (forceIdlePage && BELLY_IDLE_PAGES.includes(forceIdlePage)) {
        const d = new Date(now);
        if (forceIdlePage === "date") {
          const f = formatBellyDate(d);
          idle = { page: "date", main: f.main, sub: f.sub };
        } else if (forceIdlePage === "weather") {
          void refreshBellyWeather(false);
          idle = {
            page: "weather",
            main: bellyWeather.tempC != null ? `${bellyWeather.tempC}°C` : "…°C",
            sub: bellyWeather.label || (bellyWeather.error ? "offline" : "počasí")
          };
        } else {
          idle = { page: "clock", main: formatBellyClock(d), sub: "čas" };
        }
      }
      if (kojBellyIdleMain) kojBellyIdleMain.textContent = idle.main;
      if (kojBellyIdleSub) kojBellyIdleSub.textContent = idle.sub || "";
      kojBellyScreen.classList.add("on", "mode-idle");
      kojBellyScreen.classList.remove("mode-gift");
      kojBellyScreen.classList.toggle("mode-wave", Boolean(idle.wave));
      if (idle.wave) {
        kojBellyScreen.style.setProperty("--belly-wave-pct", `${idle.wave.progressPct}%`);
        kojBellyScreen.classList.toggle("wave-urgent", Boolean(idle.wave.urgent));
        kojBellyScreen.classList.toggle("wave-confirmed", Boolean(idle.wave.confirmed));
      } else {
        kojBellyScreen.classList.remove("mode-wave", "wave-urgent", "wave-confirmed");
        kojBellyScreen.style.removeProperty("--belly-wave-pct");
      }
    }

    return {
      BELLY_IDLE_AFTER_MS,
      BELLY_IDLE_PAGES,
      buildSpamWaveBellyContent,
      resolveMediaUrl: (raw) => resolveMediaUrl(raw, apiBase),
      resolveProjectorMedia: (data, now) => resolveProjectorMedia(data, now, apiBase),
      resolveBellyIdleContent,
      refreshBellyWeather,
      syncProjectorLayout,
      syncKojProjector,
      getBellyWeather: () => bellyWeather
    };
  }

  return {
    BELLY_IDLE_AFTER_MS,
    BELLY_IDLE_CYCLE_MS,
    BELLY_IDLE_PAGES,
    buildSpamWaveBellyContent,
    create,
    resolveMediaUrl,
    isLiveMoment,
    resolveProjectorMedia,
    formatBellyClock,
    formatBellyDate,
    weatherLabelFromCode,
    measureSpriteLayoutBox,
    setProjectorImg,
    readBellyWeatherCoords
  };
});
