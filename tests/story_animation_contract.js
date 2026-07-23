"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");

const storyMemory = require("../scripts/MIA_STORY_MEMORY");
const storyEngine = require("../scripts/MIA_STORY_ANIMATION_ENGINE");
const storyVideo = require("../scripts/MIA_STORY_VIDEO_ENGINE");
const overlayState = require("../scripts/MIA_OVERLAY_STATE");
const { composeStoryBeatFrame } = require("../scripts/kojnozrout_story_scene_renderer");

const tmpStore = path.join(os.tmpdir(), `mia-story-memory-${Date.now()}.json`);

storyMemory.loadStore(tmpStore);
storyMemory.resetStoreForTests();

async function run() {
  const beat = await composeStoryBeatFrame({
    beat: {
      caption: "Karel přichází za Kojnožroutem",
      subcaption: "test",
      bg: "pet_react",
      kojMood: "happy",
      layout: "arrival"
    },
    userLabel: "Karel",
    avatarUrl: ""
  });
  assert.ok(beat.pngBuffer && beat.pngBuffer.length > 500, "beat frame png generated");
  assert.equal(beat.caption, "Karel přichází za Kojnožroutem");

  storyMemory.observeFeedEvent({ userLabel: "Karel", feedType: "gift" });
  storyMemory.observeFeedEvent({ userLabel: "Karel", feedType: "gift" });
  const third = storyMemory.observeFeedEvent({ userLabel: "Karel", feedType: "care" });
  assert.equal(third.feedCount, 3);
  assert.equal(third.milestone, 3);

  const resolved = storyEngine.resolveStoryForFeed("Karel");
  assert.ok(resolved, "milestone 3 triggers sock rocket saga");
  assert.equal(resolved.story.id, "sock_rocket_saga");
  assert.equal(storyEngine.resolveStoryDeliveryMode(resolved.story), "obs_video");

  const videoPlan = storyVideo.buildStoryVideoPlan(resolved.story, {}, "Karel");
  assert.equal(videoPlan.length, 5);
  assert.equal(videoPlan[0].sourceName, "T1_VIDEO_01");
  assert.equal(videoPlan[0].caption, "Karel přichází za Kojnožroutem");
  assert.equal(videoPlan[4].sourceName, "T4_VIDEO_13");

  const composed = await storyEngine.composeStoryAnimation({
    userLabel: "Karel",
    avatarUrl: "",
    story: { ...resolved.story, deliveryMode: "png_slideshow" },
    feedCount: 3,
    milestone: 3,
    isRepeat: false
  });
  assert.equal(composed.ok, true);
  assert.equal(composed.frames.length, 5);
  assert.ok(composed.frames[0].imageUrl.includes("/generated/story-moments/"));
  assert.ok(
    fs.existsSync(
      path.join(
        __dirname,
        "..",
        "mia-output-overlay",
        composed.frames[0].imageUrl.replace(/^\//, "")
      )
    )
  );

  const state = overlayState.createOverlayState();
  overlayState.setStoryVisual(state, composed);
  const snap = overlayState.getOverlaySnapshot(state);
  assert.ok(snap.storyVisual);
  assert.equal(snap.storyVisual.frames.length, 5);

  const manifestPath = storyEngine.MANIFEST_PATH;
  assert.ok(fs.existsSync(manifestPath), "story bank manifest exists");

  try {
    fs.unlinkSync(tmpStore);
  } catch (_err) {
    /* ignore */
  }

  console.log("✅ story animation contract passed");
}

run().catch((err) => {
  console.error("❌ story animation contract failed:", err);
  process.exit(1);
});
