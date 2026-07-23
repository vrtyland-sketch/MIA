"use strict";

/**
 * Přehrání story beatů přes existující OBS gift videa (T1–T4).
 */

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function formatCaption(template = "", userLabel = "") {
  const first = safeString(userLabel, "Divák").split(/\s+/)[0] || userLabel;
  return safeString(template)
    .replace(/\{user\}/g, first)
    .replace(/\{fullUser\}/g, userLabel);
}

const DEFAULT_BEAT_TIERS = ["T1", "T1", "T2", "T3", "T4"];

const DEFAULT_BEAT_SOURCES = [
  "T1_VIDEO_01",
  "T1_VIDEO_02",
  "T2_VIDEO_05",
  "T3_VIDEO_09",
  "T4_VIDEO_13"
];

function resolveBeatVideoPlan(beat = {}, runtimeConfig = {}, beatIndex = 0) {
  const tier = safeString(beat.videoTier, DEFAULT_BEAT_TIERS[beatIndex] || "T1").toUpperCase();
  const pool =
    runtimeConfig?.obs?.tierSources?.[tier] &&
    Array.isArray(runtimeConfig.obs.tierSources[tier])
      ? runtimeConfig.obs.tierSources[tier]
      : [];

  const sourceName =
    safeString(beat.videoSource) ||
    safeString(DEFAULT_BEAT_SOURCES[beatIndex]) ||
    safeString(pool[beatIndex % pool.length]) ||
    safeString(pool[0]);

  return { tier, sourceName };
}

function buildStoryVideoPlan(story = {}, runtimeConfig = {}, userLabel = "", miaEyes = null) {
  if (miaEyes && typeof miaEyes.buildStoryPlanFromEyes === "function") {
    return miaEyes.buildStoryPlanFromEyes(story, userLabel);
  }

  try {
    const { loadCatalog, buildStoryBeatPlan } = require("./MIA_MEDIA_CATALOG");
    const catalog = loadCatalog();
    const fromCatalog = buildStoryBeatPlan(story, catalog, userLabel);
    if (fromCatalog.length) {
      return fromCatalog;
    }
  } catch (_err) {
    // fallback below
  }

  const beats = Array.isArray(story.beats) ? story.beats : [];
  return beats.map((beat, index) => {
    const video = resolveBeatVideoPlan(beat, runtimeConfig, index);
    return {
      id: safeString(beat.id, `beat_${index + 1}`),
      caption: formatCaption(beat.caption, userLabel),
      subcaption: formatCaption(beat.subcaption, userLabel),
      tier: video.tier,
      sourceName: video.sourceName,
      pickedBy: "static_map"
    };
  });
}

async function playStoryVideoSequence(ctx = {}) {
  const story = ctx.story || {};
  const userLabel = safeString(ctx.userLabel, "Divák");
  const runtimeConfig = ctx.runtimeConfig || {};
  const videoEngine = ctx.videoEngine || null;
  const miaEyes = ctx.miaEyes || null;
  const normalizedEvent = ctx.normalizedEvent || {
    eventType: "STORY",
    platform: safeString(ctx.platform, "mia"),
    user: { nickname: userLabel, username: userLabel },
    message: `story:${safeString(story.id)}`
  };
  const showCaption = ctx.showCaption !== false;
  const executeOverlay = typeof ctx.executeOverlay === "function" ? ctx.executeOverlay : null;

  if (!videoEngine || typeof videoEngine.playSpecialEvent !== "function") {
    return { ok: false, reason: "video_engine_missing" };
  }

  if (miaEyes && typeof miaEyes.scanCatalog === "function") {
    await miaEyes.scanCatalog({ force: true });
  }

  const plan = buildStoryVideoPlan(story, runtimeConfig, userLabel, miaEyes).filter(
    (beat) => beat.sourceName
  );

  if (!plan.length) {
    return { ok: false, reason: "story_video_plan_empty" };
  }

  const results = [];

  for (let i = 0; i < plan.length; i += 1) {
    const beat = plan[i];
    const isLast = i === plan.length - 1;

    if (showCaption && executeOverlay) {
      await executeOverlay(
        {
          owner: "mia",
          route: "community",
          stage: "story_beat",
          text: beat.caption,
          subtext: beat.subcaption || safeString(story.title),
          user: userLabel,
          userLabel,
          holdMs: 3200,
          meta: {
            storyId: safeString(story.id),
            storyBeat: beat.id,
            videoSource: beat.sourceName
          }
        },
        { source: "story_video_caption", force: true, holdMs: 3200 }
      );
    }

    const playback = await videoEngine.playSpecialEvent(
      beat.tier,
      normalizedEvent,
      {
        sourceName: beat.sourceName,
        reason: `story_${beat.id}`,
        waitForMediaEnd: true,
        restoreProgramScene: isLast
      }
    );

    let eyesObservation = null;
    if (miaEyes && typeof miaEyes.observePlayback === "function" && playback?.ok) {
      eyesObservation = await miaEyes.observePlayback(beat.sourceName);
    }

    results.push({
      beat: beat.id,
      tier: beat.tier,
      sourceName: beat.sourceName,
      caption: beat.caption,
      pickedBy: beat.pickedBy || "static_map",
      eyesSeen: beat.eyesSeen,
      transform: beat.transform || null,
      playback,
      eyes: eyesObservation
    });

    if (!playback?.ok) {
      return {
        ok: false,
        reason: playback?.reason || "story_video_playback_failed",
        failedBeat: beat.id,
        results
      };
    }
  }

  return {
    ok: true,
    deliveryMode: "obs_video",
    storyId: safeString(story.id),
    userLabel,
    beatCount: results.length,
    eyesUsed: Boolean(miaEyes),
    results
  };
}

module.exports = {
  buildStoryVideoPlan,
  playStoryVideoSequence,
  resolveBeatVideoPlan,
  formatCaption,
  DEFAULT_BEAT_SOURCES
};
