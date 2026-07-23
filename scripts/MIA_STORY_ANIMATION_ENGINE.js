"use strict";

/**
 * User story animation generator for OBS:
 * profilovka + paměť krmení → sekvence PNG scén + titulky.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const storyMemory = require("./MIA_STORY_MEMORY");
const { composeStoryBeatFrame } = require("./kojnozrout_story_scene_renderer");
const { resolveVariantIndex } = require("./MIA_GIFT_VISUAL_COMPOSER");

const OUTPUT_DIR = path.resolve(__dirname, "..", "mia-output-overlay", "generated", "story-moments");
const MANIFEST_PATH = path.resolve(
  __dirname,
  "..",
  "mia-output-overlay",
  "assets",
  "kojnozrout",
  "story-bank-manifest.json"
);

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function hashKey(input = "") {
  return crypto.createHash("sha1").update(String(input)).digest("hex").slice(0, 12);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function loadStoryBank() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return { version: 1, stories: [buildDefaultSockRocketStory()] };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    if (!Array.isArray(parsed.stories) || !parsed.stories.length) {
      return { version: 1, stories: [buildDefaultSockRocketStory()] };
    }
    return parsed;
  } catch (_err) {
    return { version: 1, stories: [buildDefaultSockRocketStory()] };
  }
}

function buildDefaultSockRocketStory() {
  return {
    id: "sock_rocket_saga",
    title: "Ponožka a raketa",
    deliveryMode: "obs_video",
    minFeedCount: 3,
    milestones: [3, 8, 15, 25, 40],
    frameMs: 2800,
    beats: [
      {
        id: "arrival",
        caption: "{user} přichází za Kojnožroutem",
        subcaption: "Paměť si tě pamatuje…",
        bg: "pet_react",
        kojMood: "happy",
        layout: "arrival"
      },
      {
        id: "feeding",
        caption: "{user} znovu krmí Kojnožrouta!",
        subcaption: "Miska se plní",
        bg: "care_feed",
        kojMood: "eating",
        layout: "feeding"
      },
      {
        id: "sock_snatch",
        caption: "Koj ukradl ponožku!",
        subcaption: "Tohle nečekal…",
        bg: "celebration_burst",
        kojMood: "excited",
        layout: "sock_snatch"
      },
      {
        id: "rocket_board",
        caption: "Skáčou do rakety!",
        subcaption: "3… 2… 1…",
        bg: "cinematic_vehicle",
        kojMood: "excited",
        layout: "rocket_board"
      },
      {
        id: "space_fly",
        caption: "{user} a Koj letí do vesmíru!",
        subcaption: "Ponožka je taky na palubě",
        bg: "travel_motion",
        kojMood: "happy",
        layout: "space_fly"
      }
    ]
  };
}

function listStories() {
  return loadStoryBank().stories || [];
}

function findStory(storyId = "") {
  const id = safeString(storyId);
  return listStories().find((s) => s.id === id) || null;
}

function resolveStoryForFeed(userLabel = "", feedStats = null) {
  const stats = feedStats || storyMemory.getUserFeedStats(userLabel);
  const feedCount = toNumber(stats.feedCount, 0);
  const stories = listStories();

  for (const story of stories) {
    const milestones = Array.isArray(story.milestones)
      ? story.milestones
      : [toNumber(story.minFeedCount, 3)];
    const hit = milestones.find((m) => m === feedCount);
    if (!hit) continue;

    const played = stats.storiesPlayed?.[story.id];
    const repeatEvery = toNumber(story.repeatEveryFeeds, 0);
    if (played && repeatEvery > 0 && feedCount % repeatEvery !== 0) {
      continue;
    }

    return {
      story,
      milestone: hit,
      feedCount,
      isRepeat: Boolean(played)
    };
  }

  return null;
}

function shouldTriggerStoryAnimation(ctx = {}) {
  const userLabel = safeString(ctx.userLabel);
  if (!userLabel) return false;

  const feedType = safeString(ctx.feedType, "gift");
  if (feedType !== "gift" && feedType !== "care") return false;

  const stats = storyMemory.getUserFeedStats(userLabel);
  const resolved = resolveStoryForFeed(userLabel, stats);
  return Boolean(resolved?.story);
}

function buildNarrationLines(story, userLabel, isRepeat = false) {
  const firstName = userLabel.split(/\s+/)[0] || userLabel;
  const intro = isRepeat
    ? `${firstName} zase krmí Kojnožrouta — začíná speciální příběh!`
    : `${firstName} nakrmil Kojnožrouta už několikrát. MIA spouští příběh.`;
  const outro = `${firstName} a Koj míří do vesmíru. Ponožka je v bezpečí… nejspíš.`;
  return { intro, outro, title: safeString(story.title, "Příběh diváka") };
}

async function composeStoryAnimation(input = {}) {
  const userLabel = safeString(input.userLabel, "Divák");
  const avatarUrl = safeString(input.avatarUrl);
  const story =
    input.story ||
    findStory(input.storyId) ||
    buildDefaultSockRocketStory();
  const isRepeat = Boolean(input.isRepeat);
  const variantIndex = resolveVariantIndex({
    userLabel,
    kojMood: "excited",
    tier: "T3",
    giftKey: story.id
  });

  ensureDir(OUTPUT_DIR);
  const playbackId = `${Date.now()}-${hashKey(`${userLabel}:${story.id}`)}`;
  const frameMs = Math.max(1800, toNumber(story.frameMs, 2800));
  const beats = Array.isArray(story.beats) ? story.beats : [];
  const frames = [];

  for (let i = 0; i < beats.length; i += 1) {
    const beat = beats[i];
    const beatCaption = isRepeat && beat.id === "arrival"
      ? `{user} je zpátky!`
      : beat.caption;

    const composed = await composeStoryBeatFrame({
      beat: { ...beat, caption: beatCaption },
      userLabel,
      avatarUrl,
      variantIndex: variantIndex + i
    });

    const fileName = `story-${story.id}-${playbackId}-f${String(i + 1).padStart(2, "0")}.png`;
    const outPath = path.join(OUTPUT_DIR, fileName);
    fs.writeFileSync(outPath, composed.pngBuffer);

    frames.push({
      id: safeString(beat.id, `beat_${i + 1}`),
      imageUrl: `/generated/story-moments/${fileName}`,
      caption: composed.caption,
      durationMs: frameMs,
      avatarLoaded: composed.avatarLoaded
    });
  }

  const narration = buildNarrationLines(story, userLabel, isRepeat);
  const totalDurationMs = frames.reduce((sum, f) => sum + toNumber(f.durationMs, frameMs), 0);

  storyMemory.noteStoryPlayed(userLabel, story.id);

  return {
    ok: true,
    playbackId,
    storyId: story.id,
    title: narration.title,
    intro: narration.intro,
    outro: narration.outro,
    userLabel,
    feedCount: toNumber(input.feedCount, 0),
    milestone: toNumber(input.milestone, 0),
    isRepeat,
    frames,
    frameMs,
    totalDurationMs,
    avatarLoaded: frames.some((f) => f.avatarLoaded),
    expiresAt: Date.now() + totalDurationMs + 8000
  };
}

function observeFeedAndResolveStory(ctx = {}) {
  const observed = storyMemory.observeFeedEvent(ctx);
  const resolved = resolveStoryForFeed(observed.userLabel, storyMemory.getUserFeedStats(observed.userLabel));
  if (!resolved) {
    return { triggered: false, observed };
  }
  return {
    triggered: true,
    observed,
    story: resolved.story,
    milestone: resolved.milestone,
    feedCount: resolved.feedCount,
    isRepeat: resolved.isRepeat
  };
}

function resolveStoryDeliveryMode(story = {}) {
  return safeString(story.deliveryMode, "obs_video");
}

function markStoryPlayed(userLabel = "", storyId = "") {
  storyMemory.noteStoryPlayed(userLabel, storyId);
}

module.exports = {
  composeStoryAnimation,
  shouldTriggerStoryAnimation,
  observeFeedAndResolveStory,
  resolveStoryForFeed,
  resolveStoryDeliveryMode,
  markStoryPlayed,
  buildNarrationLines,
  listStories,
  findStory,
  loadStoryBank,
  OUTPUT_DIR,
  MANIFEST_PATH,
  buildDefaultSockRocketStory
};
