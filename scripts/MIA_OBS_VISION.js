"use strict";

/**
 * MIA OBS Vision — kontinuální „vidění“ scény + auto-layout pro TikTok / Kick.
 * Screenshot program scény, stav přehrávání z očí, chytré pozice overlay.
 */

const path = require("path");

const CANVAS_LANDSCAPE = { width: 1920, height: 1080 };
const CANVAS_PORTRAIT = { width: 1080, height: 1920 };
const CANVAS = CANVAS_LANDSCAPE;

function isPortraitCanvas(canvas) {
  return canvas.height > canvas.width * 1.05;
}

function referenceCanvas(canvas) {
  return isPortraitCanvas(canvas) ? CANVAS_PORTRAIT : CANVAS_LANDSCAPE;
}

function normalizeCanvas(canvas) {
  const width = Math.max(640, toNumber(canvas?.width, CANVAS.width));
  const height = Math.max(360, toNumber(canvas?.height, CANVAS.height));
  return { width, height };
}

function scaledSafe(platform, canvas) {
  const isPortrait = isPortraitCanvas(canvas);
  const ref = referenceCanvas(canvas);
  let base;
  if (platform === "tiktok" && isPortrait) {
    base = PLATFORM_SAFE.tiktok_portrait;
  } else {
    base = PLATFORM_SAFE[platform] || PLATFORM_SAFE.tiktok;
  }
  const sx = canvas.width / ref.width;
  const sy = canvas.height / ref.height;
  return {
    top: Math.round(base.top * sy),
    bottom: Math.round(base.bottom * sy),
    left: Math.round(base.left * sx),
    right: Math.round(base.right * sx)
  };
}

async function readObsCanvas(safeObsCall) {
  if (typeof safeObsCall !== "function") {
    return { ...CANVAS };
  }
  try {
    const resp = await safeObsCall("GetVideoSettings");
    const settings = resp?.response || resp || {};
    const width = toNumber(settings.baseWidth, CANVAS.width);
    const height = toNumber(settings.baseHeight, CANVAS.height);
    return normalizeCanvas({ width, height });
  } catch (_err) {
    return { ...CANVAS };
  }
}

const PLATFORM_SAFE = {
  tiktok: { top: 48, bottom: 150, left: 36, right: 36 },
  /** TikTok LIVE na telefonu — 9:16, lišty nahoře/dole */
  tiktok_portrait: { top: 120, bottom: 220, left: 44, right: 100 },
  kick: { top: 40, bottom: 72, left: 36, right: 340 }
};

const SOURCE_ROLES = [
  { role: "startup", pattern: /STARTUP_CHECK|startup-check/i },
  { role: "combo", pattern: /MIA_COMBO|combo-overlay/i },
  { role: "boss_cinematic", pattern: /MIA_BOSS_CINEMATIC|boss-cinematic/i },
  { role: "immersive_scene", pattern: /MIA_IMMERSIVE_SCENE|immersive-scene/i },
  { role: "flyby", pattern: /T0_FLYBY|t0-flyby/i },
  { role: "duel", pattern: /DUEL|duel-overlay/i },
  { role: "story", pattern: /MIA_STORY|story-moment/i },
  { role: "gift_animation", pattern: /GIFT_ANIMATION|gift-animation/i },
  { role: "gift_moment", pattern: /GIFT_MOMENT|gift-moment/i },
  { role: "evolution", pattern: /EVOLUTION|evolution-toast/i },
  { role: "backpack", pattern: /BACKPACK|backpack-overlay/i },
  { role: "away_loop", pattern: /MIA_AWAY_LOOP|nejsem tu smy|away-loop/i },
  { role: "host_mode", pattern: /MIA_HOST_MODE|HOST_MODE|host-mode/i },
  { role: "viewer_strip", pattern: /VIEWER_STRIP|viewer-strip/i },
  { role: "speech", pattern: /BUBBLE|SPEECH|speech-overlay/i },
  { role: "entity", pattern: /ENTITY|entity-overlay|LIVE_BADGE/i },
  { role: "bowl", pattern: /BOWL|MISKA/i },
  { role: "koj", pattern: /KOJNOZROUT_RUNTIME|KOJ_RUNTIME|kojnozrout-runtime/i },
  { role: "mia_head", pattern: /MIA_HEAD|mia-body-part.*part=head/i },
  { role: "mia_eyes", pattern: /MIA_EYES|mia-body-part.*part=eyes/i },
  { role: "mia_hands", pattern: /MIA_HANDS|mia-body-part.*part=hands/i },
  { role: "mia_feet", pattern: /MIA_FEET|mia-body-part.*part=feet/i },
  { role: "mia_torso", pattern: /MIA_TORSO|mia-body-part.*part=torso/i },
  { role: "graphics_preview", pattern: /MIA_GRAPHICS_PREVIEW|mia-graphics-preview/i },
  { role: "voice", pattern: /MIA_VOICE|voice-overlay/i },
  { role: "chat", pattern: /CHAT_OVERLAY|chat-overlay/i }
];

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function inferRole(sourceName = "", url = "") {
  const hay = `${sourceName} ${url}`;
  for (const rule of SOURCE_ROLES) {
    if (rule.pattern.test(hay)) {
      return rule.role;
    }
  }
  return "";
}

function isGiftVideoSource(sourceName = "") {
  return /^T[1-6]_(VIDEO|PHOTO)|^PROFILE_VIDEO/i.test(safeString(sourceName));
}

function resolvePlatform(platform = "tiktok", kickBridgeEnabled = false) {
  const raw = safeString(platform, "tiktok").toLowerCase();
  if (raw === "kick") return "kick";
  if (raw === "tiktok") return "tiktok";
  if (raw === "both" || raw === "auto") {
    return kickBridgeEnabled ? "kick" : "tiktok";
  }
  return "tiktok";
}

function resolveLayoutMode(ctx = {}) {
  if (ctx.startupSlideActive) return "startup";
  if (ctx.t0Flyby?.active) return "flyby";
  if (ctx.bossCinematic?.active) return "boss_cinematic";
  if (ctx.immersiveScene?.active) return "immersive_scene";
  if (ctx.comboMoment?.active) return "combo";
  if (ctx.storyVisual?.active) return "story";
  if (ctx.giftAnimation?.active) return "gift_animation";
  if (ctx.duel?.active) return "duel";
  if (ctx.giftMoment?.active) return "gift_moment";
  if (ctx.playingGiftVideo) return "gift_video";
  return "idle";
}

/** OBS scene-item alignment bitfield (position = anchor point on the source). */
const OBS_ALIGN = {
  CENTER: 0,
  TOP_LEFT: 5,
  TOP_RIGHT: 6,
  BOTTOM_LEFT: 9,
  BOTTOM_RIGHT: 10,
  BOTTOM_CENTER: 8
};

function place(x, y, scale, enabled, alignment) {
  return {
    enabled: enabled !== false,
    positionX: Math.round(x),
    positionY: Math.round(y),
    scaleX: scale,
    scaleY: scale,
    alignment
  };
}

function buildViewerAnchors(canvas, platform) {
  const safe = scaledSafe(platform, canvas);
  const w = canvas.width;
  const h = canvas.height;
  const isPortrait = isPortraitCanvas(canvas);
  const ref = referenceCanvas(canvas);
  const pad = 12;
  const speechScale = isPortrait
    ? Math.max(0.72, Math.min(1.0, w / ref.width))
    : Math.max(0.58, Math.min(0.82, w / CANVAS_LANDSCAPE.width));
  const kojScale = platform === "tiktok" ? (isPortrait ? 1.35 : 0.95) : isPortrait ? 1.0 : 0.86;
  const kojBrowserW = platform === "tiktok" ? 520 : 400;
  const kojRenderW = Math.round(kojBrowserW * kojScale);
  const kojX = w - safe.right - pad;
  const kojY = h - safe.bottom - pad;
  const bowlScaleDefault = 0.84;
  const bowlGap = Math.max(6, Math.round(8 * (w / ref.width)));
  const bowlY = safe.top + Math.round((isPortrait ? 100 : 86) * (h / ref.height));
  const chatY = safe.top + Math.round((isPortrait ? 88 : 62) * (h / ref.height));
  const kojLeft = kojX - kojRenderW;
  const bowlX = Math.max(safe.left + pad + Math.round(300 * bowlScaleDefault), kojLeft - bowlGap);

  const entity =
    platform === "kick"
      ? place(w - safe.right - pad, safe.top + pad, 1, true, OBS_ALIGN.TOP_RIGHT)
      : place(safe.left + pad, safe.top + pad, 1, true, OBS_ALIGN.TOP_LEFT);

  return {
    entity,
    entitySmall:
      platform === "kick"
        ? place(w - safe.right - pad, safe.top + pad, 0.95, true, OBS_ALIGN.TOP_RIGHT)
        : place(safe.left + pad, safe.top + pad, 0.95, true, OBS_ALIGN.TOP_LEFT),
    koj: place(kojX, kojY, kojScale, true, OBS_ALIGN.BOTTOM_RIGHT),
    kojGift: place(
      w - safe.right - pad,
      safe.top + Math.round(110 * (h / CANVAS.height)),
      0.44,
      true,
      OBS_ALIGN.TOP_RIGHT
    ),
    kojSmall: (scale, enabled = true) =>
      place(
        w - safe.right - pad,
        h - safe.bottom - pad,
        scale,
        enabled,
        OBS_ALIGN.BOTTOM_RIGHT
      ),
    bowl: (enabled = true, scale = bowlScaleDefault) =>
      place(
        bowlX,
        bowlY,
        scale,
        enabled,
        OBS_ALIGN.TOP_RIGHT
      ),
    // TikTok portrait: full-stage transparent speech (1080×1920) — TOP_LEFT @ 0,0.
    // Landscape: bottom-left strip anchor (legacy).
    speech: (enabled = true) =>
      isPortrait
        ? place(0, 0, 1, enabled, OBS_ALIGN.TOP_LEFT)
        : place(safe.left + pad, h - safe.bottom - pad, speechScale, enabled, OBS_ALIGN.BOTTOM_LEFT),
    chat:
      platform === "kick"
        ? place(w - safe.right - pad, chatY, 0.82, true, OBS_ALIGN.TOP_RIGHT)
        : place(safe.left + pad, chatY, 0.82, true, OBS_ALIGN.TOP_LEFT),
    chatSmall: place(safe.left + pad, chatY, 0.82, true, OBS_ALIGN.TOP_LEFT),
    voice: place(0, 0, 1, true, OBS_ALIGN.TOP_LEFT),
    screenCenter: (enabled = true, scale = 1) =>
      place(w / 2, h / 2, scale, enabled, OBS_ALIGN.CENTER),
    bottomCenter: (enabled = true, scale = 1) =>
      place(w / 2, h - safe.bottom - pad, scale, enabled, OBS_ALIGN.BOTTOM_CENTER),
    evolution: place(
      safe.left + pad,
      safe.top + Math.round(72 * (h / CANVAS.height)),
      1,
      false,
      OBS_ALIGN.TOP_LEFT
    ),
    backpack: place(
      safe.left + pad,
      h - safe.bottom - pad - Math.round(200 * (h / CANVAS.height)),
      0.9,
      false,
      OBS_ALIGN.TOP_LEFT
    )
  };
}

function buildLayoutPlan(mode = "idle", platform = "tiktok", canvasInput) {
  const canvas = normalizeCanvas(canvasInput);
  const a = buildViewerAnchors(canvas, platform);
  const bossOff = a.screenCenter(false);
  const bossOn = a.screenCenter(true);

  const plans = {
    idle: {
      entity: a.entity,
      koj: a.koj,
      bowl: a.bowl(true),
      speech: a.speech(true),
      combo: a.screenCenter(false),
      boss_cinematic: bossOff,
      flyby: a.screenCenter(false),
      duel: a.bottomCenter(false),
      story: a.screenCenter(false),
      gift_moment: a.screenCenter(false),
      evolution: a.evolution,
      backpack: a.backpack,
      chat: a.chat,
      voice: a.voice,
      startup: a.screenCenter(false)
    },
    gift_video: {
      entity: a.entitySmall,
      koj: a.koj,
      bowl: a.bowl(false),
      speech: a.speech(true),
      combo: a.screenCenter(false),
      boss_cinematic: bossOff,
      flyby: a.screenCenter(false),
      duel: a.bottomCenter(false),
      story: a.screenCenter(false),
      gift_moment: a.screenCenter(false),
      evolution: a.evolution,
      backpack: a.backpack,
      chat: place(a.chat.positionX, a.chat.positionY, 0.78, true, a.chat.alignment),
      voice: a.voice,
      startup: a.screenCenter(false)
    },
    combo: {
      entity: a.entity,
      koj: a.kojSmall(0.5),
      bowl: a.bowl(false, 0.7),
      speech: a.speech(false),
      combo: a.screenCenter(true),
      boss_cinematic: bossOff,
      flyby: a.screenCenter(false),
      duel: a.bottomCenter(false),
      story: a.screenCenter(false),
      gift_moment: a.screenCenter(false),
      evolution: a.evolution,
      backpack: a.backpack,
      chat: a.chatSmall,
      voice: a.voice,
      startup: a.screenCenter(false)
    },
    boss_cinematic: {
      entity: a.entity,
      koj: a.kojSmall(0.46),
      bowl: a.bowl(false, 0.65),
      speech: a.speech(true),
      combo: a.screenCenter(true),
      boss_cinematic: bossOn,
      flyby: a.screenCenter(false),
      duel: a.bottomCenter(false),
      story: a.screenCenter(false),
      gift_moment: a.screenCenter(false),
      evolution: a.evolution,
      backpack: a.backpack,
      chat: a.chatSmall,
      voice: a.voice,
      startup: a.screenCenter(false)
    },
    story: {
      entity: a.entity,
      koj: a.kojSmall(0.55),
      bowl: a.bowl(false, 0.7),
      speech: a.speech(false),
      combo: a.screenCenter(false),
      boss_cinematic: bossOff,
      flyby: a.screenCenter(false),
      duel: a.bottomCenter(false),
      story: a.screenCenter(true),
      gift_moment: a.screenCenter(false),
      evolution: a.evolution,
      backpack: a.backpack,
      chat: a.chatSmall,
      voice: a.voice,
      startup: a.screenCenter(false)
    },
    duel: {
      entity: a.entity,
      koj: a.kojSmall(0.62),
      bowl: a.bowl(false, 0.75),
      speech: a.speech(true),
      combo: a.screenCenter(false),
      boss_cinematic: bossOff,
      flyby: a.screenCenter(false),
      duel: a.bottomCenter(true),
      story: a.screenCenter(false),
      gift_moment: a.screenCenter(false),
      evolution: a.evolution,
      backpack: a.backpack,
      chat: a.chatSmall,
      voice: a.voice,
      startup: a.screenCenter(false)
    },
    flyby: {
      entity: a.entity,
      koj: a.kojSmall(0.55, false),
      bowl: a.bowl(false, 0.7),
      speech: a.speech(false),
      combo: a.screenCenter(false),
      boss_cinematic: bossOff,
      flyby: a.screenCenter(true),
      duel: a.bottomCenter(false),
      story: a.screenCenter(false),
      gift_moment: a.screenCenter(false),
      evolution: a.evolution,
      backpack: a.backpack,
      chat: place(a.chat.positionX, a.chat.positionY, 0.78, true, a.chat.alignment),
      voice: a.voice,
      startup: a.screenCenter(false)
    },
    gift_moment: {
      entity: a.entity,
      koj: a.kojSmall(0.52),
      bowl: a.bowl(false, 0.7),
      speech: a.speech(false),
      combo: a.screenCenter(false),
      boss_cinematic: bossOff,
      flyby: a.screenCenter(false),
      duel: a.bottomCenter(false),
      story: a.screenCenter(false),
      gift_moment: a.screenCenter(true),
      evolution: a.evolution,
      backpack: a.backpack,
      chat: a.chatSmall,
      voice: a.voice,
      startup: a.screenCenter(false)
    },
    gift_animation: {
      entity: a.entity,
      koj: a.kojSmall(0.48),
      bowl: a.bowl(false, 0.65),
      speech: a.speech(true),
      combo: a.screenCenter(false),
      boss_cinematic: bossOff,
      flyby: a.screenCenter(false),
      duel: a.bottomCenter(false),
      story: a.screenCenter(false),
      gift_moment: a.screenCenter(false),
      gift_animation: a.screenCenter(true),
      evolution: a.evolution,
      backpack: a.backpack,
      chat: a.chatSmall,
      voice: a.voice,
      startup: a.screenCenter(false)
    },
    startup: {
      entity: a.entity,
      koj: a.koj,
      bowl: a.bowl(true),
      speech: a.speech(true),
      combo: a.screenCenter(false),
      boss_cinematic: bossOff,
      flyby: a.screenCenter(false),
      duel: a.bottomCenter(false),
      story: a.screenCenter(false),
      gift_moment: a.screenCenter(false),
      evolution: a.evolution,
      backpack: a.backpack,
      chat: a.chat,
      voice: a.voice,
      startup: a.screenCenter(true)
    }
  };

  // Gift animation overlay self-hides via CSS — keep OBS source enabled so polling never stops.
  for (const key of Object.keys(plans)) {
    if (!plans[key].gift_animation) {
      plans[key].gift_animation = a.screenCenter(true);
    }
  }

  return plans[mode] || plans.idle;
}

/** Layout pro scénu SPINAK_NEJSEM TU — smyčka fullscreen dole, host panel nad ní. */
function buildAwayLayoutPlan(platform = "tiktok", canvasInput) {
  const canvas = normalizeCanvas(canvasInput);
  const a = buildViewerAnchors(canvas, platform);
  const safe = scaledSafe(platform, canvas);
  const w = canvas.width;
  const h = canvas.height;
  const fullScreen = (enabled = true) =>
    place(w / 2, h / 2, 1, enabled, OBS_ALIGN.CENTER);
  const stripY = h - safe.bottom - Math.round(48 * (h / CANVAS.height));

  return {
    away_loop: fullScreen(true),
    host_mode: fullScreen(true),
    entity: a.entity,
    viewer_strip: place(
      safe.left + 12,
      stripY,
      0.95,
      true,
      OBS_ALIGN.BOTTOM_LEFT
    ),
    speech: fullScreen(true),
    voice: a.voice,
    combo: a.screenCenter(false),
    boss_cinematic: a.screenCenter(false),
    flyby: a.screenCenter(false),
    duel: a.bottomCenter(false),
    story: a.screenCenter(false),
    gift_moment: a.screenCenter(false),
    gift_animation: a.screenCenter(true),
    evolution: a.evolution,
    backpack: a.backpack,
    chat: a.chat,
    startup: a.screenCenter(false),
    koj: a.screenCenter(false),
    bowl: a.bowl(false)
  };
}

function normalizeGiftTier(tier = "T1") {
  const raw = safeString(tier).toUpperCase();
  if (raw === "T6") return "T5";
  if (["T1", "T2", "T3", "T4", "T5", "PROFILE"].includes(raw)) return raw;
  return "T1";
}

/**
 * Střed scény pro gift video — respektuje TikTok safe zones, Koj PNG se nehýbe.
 */
function buildGiftVideoTransform(tier = "T1", canvasInput, platform = "tiktok") {
  const canvas = normalizeCanvas(canvasInput);
  const safe = scaledSafe(platform, canvas);
  const w = canvas.width;
  const h = canvas.height;
  const isPortrait = isPortraitCanvas(canvas);
  const pad = 8;
  const stageW = w - safe.left - safe.right - pad * 2;
  const stageH = h - safe.top - safe.bottom - pad * 2;
  const centerX = safe.left + pad + stageW / 2;
  const centerY = safe.top + pad + stageH / 2;
  const safeTier = normalizeGiftTier(tier);

  const tierFrac = {
    T1: 0.5,
    T2: 0.56,
    T3: 0.66,
    T4: 0.76,
    T5: 0.86,
    PROFILE: isPortrait ? 0.7 : 0.44
  };
  const frac = tierFrac[safeTier] || tierFrac.T1;

  let boundsW = Math.round(stageW * frac);
  let boundsH = Math.round(stageH * frac);

  if ((safeTier === "T4" || safeTier === "T5") && !isPortrait) {
    boundsH = Math.round(boundsW * (9 / 16));
  } else if (safeTier === "PROFILE" && isPortrait) {
    boundsW = Math.round(stageW * 0.82);
    boundsH = Math.round(stageH * 0.52);
  } else if (safeTier === "PROFILE") {
    boundsH = Math.round(stageH * 0.72);
  }

  return {
    alignment: OBS_ALIGN.CENTER,
    boundsType: "OBS_BOUNDS_SCALE_INNER",
    boundsAlignment: 0,
    boundsWidth: Math.max(160, boundsW),
    boundsHeight: Math.max(160, boundsH),
    positionX: Math.round(centerX),
    positionY: Math.round(centerY),
    scaleX: 1,
    scaleY: 1,
    rotation: 0
  };
}

function createObsVision(deps = {}) {
  const runtimeConfig = deps.runtimeConfig || {};
  const safeObsCall =
    typeof deps.safeObsCall === "function"
      ? deps.safeObsCall
      : async () => ({ ok: false, reason: "missing_safeObsCall" });
  const getContext =
    typeof deps.getContext === "function" ? deps.getContext : () => ({});
  const miaEyes = deps.miaEyes || null;
  const appendJsonLog =
    typeof deps.appendJsonLog === "function" ? deps.appendJsonLog : () => {};
  const nowTs = typeof deps.nowTs === "function" ? deps.nowTs : () => Date.now();

  const visionConfig = runtimeConfig?.obs?.vision || {};
  const sceneName = safeString(runtimeConfig?.obs?.sceneName, "SPINAK_ENGINE_GIFTS");

  const state = {
    running: false,
    timer: null,
    tick: 0,
    lastMode: "",
    lastPlatform: "",
    lastAppliedAt: 0,
    lastScreenshot: null,
    lastView: null,
    lastLayout: null,
    lastError: null,
    appliedCount: 0,
    screenshotFailStreak: 0,
    screenshotCooldownUntil: 0
  };

  function isEnabled() {
    return visionConfig.enabled === true;
  }

  function isAutoLayoutEnabled() {
    if (runtimeConfig?.obs?.layoutLocked !== false) {
      return false;
    }
    return visionConfig.autoLayout !== false && isEnabled();
  }

  async function readSceneSources() {
    const list = await safeObsCall("GetSceneItemList", { sceneName });
    const items = list?.response?.sceneItems || list?.sceneItems || [];
    const enriched = [];

    for (const item of items) {
      const sourceName = safeString(item?.sourceName);
      if (!sourceName || isGiftVideoSource(sourceName)) continue;

      let url = "";
      try {
        const settings = await safeObsCall("GetInputSettings", { inputName: sourceName });
        url = safeString(settings?.response?.inputSettings?.url || settings?.inputSettings?.url);
      } catch (_err) {
        // ignore
      }

      enriched.push({
        sourceName,
        sceneItemId: item.sceneItemId,
        role: inferRole(sourceName, url),
        url
      });
    }

    return enriched;
  }

  async function applyTransform(sourceName, transform, enabled) {
    const idResp = await safeObsCall("GetSceneItemId", { sceneName, sourceName });
    const sceneItemId = idResp?.response?.sceneItemId ?? idResp?.sceneItemId;
    if (sceneItemId == null) {
      return { ok: false, reason: "scene_item_missing", sourceName };
    }

    if (typeof enabled === "boolean") {
      await safeObsCall("SetSceneItemEnabled", {
        sceneName,
        sceneItemId,
        sceneItemEnabled: enabled
      });
    }

    if (transform) {
      await safeObsCall("SetSceneItemTransform", {
        sceneName,
        sceneItemId,
        sceneItemTransform: {
          positionX: transform.positionX,
          positionY: transform.positionY,
          scaleX: transform.scaleX,
          scaleY: transform.scaleY,
          alignment: transform.alignment ?? OBS_ALIGN.CENTER,
          rotation: transform.rotation ?? 0,
          boundsType: "OBS_BOUNDS_NONE"
        }
      });
    }

    return { ok: true, sourceName, sceneItemId };
  }

  async function applyLayoutPlan(plan = {}, sources = []) {
    const applied = [];
    for (const source of sources) {
      const spec = plan[source.role];
      if (!spec) continue;

      const result = await applyTransform(source.sourceName, spec, spec.enabled);
      if (result.ok) {
        applied.push({ role: source.role, sourceName: source.sourceName, ...spec });
      }
    }
    return applied;
  }

  async function captureProgramFrame(ctx = {}, view = null) {
    if (!miaEyes || typeof miaEyes.captureScreenshot !== "function") {
      return { ok: false, reason: "eyes_missing" };
    }

    // Po encode fail nezatěžuj OBS — cooldown (OBS „Failed to encode screenshot“).
    if (state.screenshotCooldownUntil && nowTs() < state.screenshotCooldownUntil) {
      return {
        ok: false,
        reason: "screenshot_cooldown",
        until: state.screenshotCooldownUntil
      };
    }

    const playing = (view?.playingNow || []).map((row) => safeString(row.sourceName)).filter(Boolean);
    const fallbackSources = [
      "KOJNOZROUT_RUNTIME",
      "MIA_BUBBLE",
      sceneName
    ];
    const candidates = [...playing, ...fallbackSources];
    const tried = [];

    for (const sourceName of candidates) {
      if (!sourceName || tried.includes(sourceName)) continue;
      tried.push(sourceName);

      const shot = await miaEyes.captureScreenshot({
        sourceName,
        sceneName,
        save: true,
        imageWidth: visionConfig.screenshotWidth || 640,
        imageHeight: visionConfig.screenshotHeight || 360
      });
      if (shot?.ok) {
        state.screenshotFailStreak = 0;
        return { ...shot, pickedSource: sourceName, tried };
      }
    }

    state.screenshotFailStreak = toNumber(state.screenshotFailStreak, 0) + 1;
    // Po 2 fail streak: 45s pauza — méně tlaku na OBS encoder.
    if (state.screenshotFailStreak >= 2) {
      state.screenshotCooldownUntil = nowTs() + 45000;
      state.screenshotFailStreak = 0;
    }

    return { ok: false, reason: "screenshot_failed", tried };
  }

  async function tick() {
    if (!isEnabled()) return { ok: false, reason: "disabled" };

    const ctx = getContext();
    const platform = resolvePlatform(visionConfig.platform, ctx.kickBridgeEnabled === true);
    const mode = resolveLayoutMode(ctx);
    const canvas = await readObsCanvas(safeObsCall);
    const plan = buildLayoutPlan(mode, platform, canvas);

    let view = null;
    if (miaEyes && typeof miaEyes.getPlaybackView === "function") {
      view = await miaEyes.getPlaybackView({ includeMedia: true, sceneName });
      state.lastView = view;
    }

    state.tick += 1;
    const shotEvery = Math.max(1, toNumber(visionConfig.screenshotEvery, 3));
    if (state.tick % shotEvery === 0) {
      const shot = await captureProgramFrame(ctx, view);
      if (shot?.ok) {
        state.lastScreenshot = shot;
      }
    }

    let applied = [];
    if (isAutoLayoutEnabled()) {
      const modeChanged = mode !== state.lastMode || platform !== state.lastPlatform;
      const forceInterval = toNumber(visionConfig.reapplyMs, 12000);
      const shouldApply =
        modeChanged || nowTs() - state.lastAppliedAt >= forceInterval;

      if (shouldApply) {
        const sources = await readSceneSources();
        applied = await applyLayoutPlan(plan, sources);
        state.lastAppliedAt = nowTs();
        state.lastMode = mode;
        state.lastPlatform = platform;
        state.appliedCount += applied.length;
      }
    }

    state.lastLayout = {
      mode,
      platform,
      canvas,
      plan,
      appliedCount: applied.length,
      at: nowTs()
    };

    appendJsonLog("mia-events", {
      ts: nowTs(),
      stage: "mia_obs_vision_tick",
      mode,
      platform,
      playingVideos: (view?.playingNow || []).map((x) => x.sourceName),
      applied: applied.length,
      previewUrl: state.lastScreenshot?.publicUrl || ""
    });

    return {
      ok: true,
      mode,
      platform,
      view,
      layout: state.lastLayout,
      screenshot: state.lastScreenshot,
      applied
    };
  }

  function startWatch() {
    if (!isEnabled() || state.running) {
      return { ok: false, reason: state.running ? "already_running" : "disabled" };
    }

    const intervalMs = Math.max(1200, toNumber(visionConfig.intervalMs, 2500));
    state.running = true;
    state.timer = setInterval(() => {
      tick().catch((err) => {
        state.lastError = { ts: nowTs(), message: err.message };
      });
    }, intervalMs);

    void tick().catch((err) => {
      state.lastError = { ts: nowTs(), message: err.message };
    });

    return { ok: true, intervalMs };
  }

  function stopWatch() {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
    state.running = false;
    return { ok: true };
  }

  function getSnapshot() {
    return {
      enabled: isEnabled(),
      autoLayout: isAutoLayoutEnabled(),
      running: state.running,
      intervalMs: visionConfig.intervalMs || 2500,
      platform: visionConfig.platform || "auto",
      lastMode: state.lastMode,
      lastPlatform: state.lastPlatform,
      lastAppliedAt: state.lastAppliedAt,
      appliedCount: state.appliedCount,
      lastScreenshot: state.lastScreenshot,
      lastView: state.lastView,
      lastLayout: state.lastLayout,
      lastError: state.lastError,
      previewUrl: state.lastScreenshot?.publicUrl || ""
    };
  }

  return {
    isEnabled,
    isAutoLayoutEnabled,
    resolveLayoutMode,
    resolvePlatform,
    buildLayoutPlan,
    normalizeCanvas,
    readObsCanvas: () => readObsCanvas(safeObsCall),
    tick,
    startWatch,
    stopWatch,
    getSnapshot,
    applyLayoutPlan,
    readSceneSources
  };
}

module.exports = {
  createObsVision,
  CANVAS,
  CANVAS_LANDSCAPE,
  CANVAS_PORTRAIT,
  isPortraitCanvas,
  referenceCanvas,
  PLATFORM_SAFE,
  SOURCE_ROLES,
  inferRole,
  resolveLayoutMode,
  resolvePlatform,
  buildLayoutPlan,
  buildAwayLayoutPlan,
  buildGiftVideoTransform,
  normalizeCanvas,
  readObsCanvas,
  OBS_ALIGN,
  isGiftVideoSource
};
