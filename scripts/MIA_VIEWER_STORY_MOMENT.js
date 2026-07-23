"use strict";

const path = require("path");
const storyMemory = require("./MIA_STORY_MEMORY");
const { resolveStoryForFeed } = require("./MIA_STORY_ANIMATION_ENGINE");
const { loadCatalog, pickProfileForUser } = require("./MIA_MEDIA_CATALOG");
const { composeFromTemplate } = require("./MIA_MEDIA_TEMPLATE_RENDERER");
const { resolveGiftTemplateId } = require("./MIA_MEDIA_ORCHESTRATOR");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function tierRank(tier = "T1") {
  return Number(safeString(tier, "T1").replace(/\D/g, "")) || 1;
}

function resolveMinTier(env = process.env) {
  return Math.max(2, toNumber(env.MIA_VIEWER_STORY_MIN_TIER, 2));
}

function resolveFrameMs(env = process.env) {
  return Math.max(2400, toNumber(env.MIA_VIEWER_STORY_FRAME_MS, 3800));
}

function milestoneStoryPending(userLabel = "", stats = null) {
  const feedStats = stats || storyMemory.getUserFeedStats(userLabel);
  return Boolean(resolveStoryForFeed(userLabel, feedStats)?.story);
}

function shouldPublishViewerStory(input = {}, env = process.env) {
  const tier = safeString(input.tier, "T1");
  if (tierRank(tier) < resolveMinTier(env)) {
    return { ok: false, reason: "tier_below_min" };
  }

  const userLabel = safeString(input.userLabel);
  if (!userLabel) return { ok: false, reason: "missing_user" };

  if (input.milestoneStory === true || milestoneStoryPending(userLabel, input.feedStats)) {
    return { ok: false, reason: "milestone_story_priority" };
  }

  if (input.imageUrl || input.avatarUrl || input.profilePath) {
    return { ok: true };
  }

  return { ok: false, reason: "missing_viewer_photo" };
}

function buildViewerStoryVisual(input = {}, env = process.env) {
  const gate = shouldPublishViewerStory(input, env);
  if (!gate.ok) return null;

  const userLabel = safeString(input.userLabel, "Divák");
  const firstName = userLabel.split(/\s+/)[0] || userLabel;
  const tier = safeString(input.tier, "T2").toUpperCase();
  const giftName = safeString(input.giftName, "gift");
  const frameMs = resolveFrameMs(env);
  const imageUrl = safeString(input.imageUrl);
  const now = Date.now();
  const playbackId = `viewer-${now}-${hashSafe(userLabel)}`;

  const frames = [];

  if (imageUrl) {
    frames.push({
      id: "spotlight",
      imageUrl,
      caption: `${firstName} · ${giftName}`,
      durationMs: frameMs + 400,
      avatarLoaded: input.avatarLoaded !== false
    });
    frames.push({
      id: "thanks",
      imageUrl,
      caption: `${tier} · děkujeme, ${firstName}!`,
      durationMs: frameMs,
      avatarLoaded: input.avatarLoaded !== false
    });
  }

  if (!frames.length) {
    return null;
  }

  return {
    playbackId,
    storyId: "viewer_spotlight",
    title: "Příběh diváka",
    intro: `${firstName} právě podpořil stream.`,
    outro: "Spinák · Kojnožrout · komunita",
    userLabel,
    feedCount: toNumber(input.feedCount, 0),
    milestone: 0,
    isRepeat: false,
    frames: frames,
    frameMs,
    avatarLoaded: frames.some((frame) => frame.avatarLoaded),
    holdMs: frames.reduce((sum, frame) => sum + toNumber(frame.durationMs, frameMs), 0) + 5000,
    expiresAt: now + frames.reduce((sum, frame) => sum + toNumber(frame.durationMs, frameMs), 0) + 12000,
    source: "viewer_spotlight"
  };
}

function hashSafe(value = "") {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).slice(0, 8);
}

async function composeViewerStoryImage(input = {}) {
  const userLabel = safeString(input.userLabel, "Divák");
  const tier = safeString(input.tier, "T2").toUpperCase();
  const catalog = input.catalog || loadCatalog();
  const profilePath =
    safeString(input.profilePath) ||
    pickProfileForUser(catalog, userLabel) ||
    null;

  const templateId = resolveGiftTemplateId(tier) || "donator_spotlight";
  const composed = await composeFromTemplate(templateId, {
    userLabel,
    avatarUrl: safeString(input.avatarUrl),
    avatarLocalPath: profilePath,
    profilePath,
    catalog,
    tier,
    giftName: safeString(input.giftName, "gift"),
    caption: safeString(input.caption, `${userLabel} · Spinák`),
    subcaption: `${tier} · příběh diváka`
  });

  if (!composed?.ok || !composed.imageUrl) {
    return null;
  }

  return composed;
}

async function publishViewerStorySpotlight(ctx = {}) {
  const env = ctx.env || process.env;
  const userLabel = safeString(ctx.userLabel);
  const tier = safeString(ctx.tier, "T1");
  const support = ctx.normalized?.support || {};

  let imageUrl = safeString(ctx.composedGift?.imageUrl);
  let avatarLoaded = ctx.composedGift?.avatarLoaded !== false;

  if (!imageUrl) {
    const rendered = await composeViewerStoryImage({
      userLabel,
      tier,
      giftName: safeString(ctx.giftName || support.giftName),
      avatarUrl: safeString(ctx.avatarUrl),
      catalog: ctx.catalog
    });
    if (rendered?.imageUrl) {
      imageUrl = rendered.imageUrl;
      avatarLoaded = rendered.avatarLoaded !== false;
    }
  }

  const visual = buildViewerStoryVisual(
    {
      userLabel,
      tier,
      giftName: safeString(ctx.giftName || support.giftName),
      imageUrl,
      avatarUrl: safeString(ctx.avatarUrl),
      avatarLoaded,
      milestoneStory: ctx.milestoneStory === true
    },
    env
  );

  if (!visual?.frames?.length) {
    return { ok: false, reason: "viewer_story_not_built" };
  }

  if (typeof ctx.setStoryVisual === "function") {
    ctx.setStoryVisual(visual);
  }

  return { ok: true, visual };
}

module.exports = {
  resolveMinTier,
  shouldPublishViewerStory,
  buildViewerStoryVisual,
  composeViewerStoryImage,
  publishViewerStorySpotlight,
  milestoneStoryPending
};
