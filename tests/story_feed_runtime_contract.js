"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createStoryFeedRuntime } = require("../scripts/MIA_STORY_FEED_RUNTIME");

const ROOT = path.resolve(__dirname, "..");

function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`ok - ${name}`))
    .catch((err) => {
      console.error(`fail - ${name}`);
      throw err;
    });
}

async function run() {
  await test("createStoryFeedRuntime exposes scheduleStoryAnimationAfterFeed", () => {
    const api = createStoryFeedRuntime({
      writeLog: () => {},
      safeString: (v, d) => String(v ?? d ?? ""),
      getUserLabel: () => "Alice",
      getAvatarUrl: () => "",
      storyAnimationEngineModule: {},
      storyVideoEngineModule: {},
      overlayStateModule: {},
      getOverlayState: () => ({}),
      runtimeConfig: {},
      videoEngine: null,
      miaEyes: null,
      executeOverlay: async () => {}
    });

    assert.equal(typeof api.scheduleStoryAnimationAfterFeed, "function");
  });

  await test("scheduleStoryAnimationAfterFeed uses preResolved story", async () => {
    let played = false;
    const overlayState = {};

    const api = createStoryFeedRuntime({
      writeLog: () => {},
      safeString: (v, d) => String(v ?? d ?? ""),
      getUserLabel: () => "Alice",
      getAvatarUrl: () => "",
      storyAnimationEngineModule: {
        resolveStoryDeliveryMode: () => "obs_video",
        markStoryPlayed: () => {
          played = true;
        }
      },
      storyVideoEngineModule: {
        playStoryVideoSequence: async () => ({ ok: true, beatCount: 3 })
      },
      overlayStateModule: {
        clearStoryVisual: (state) => {
          state.cleared = true;
        }
      },
      getOverlayState: () => overlayState,
      runtimeConfig: {},
      videoEngine: null,
      miaEyes: null,
      executeOverlay: async () => {}
    });

    await api.scheduleStoryAnimationAfterFeed(
      { platform: "tiktok", user: { nickname: "Alice" } },
      {
        feedType: "gift",
        preResolved: {
          triggered: true,
          story: { id: "sock_rocket_saga", deliveryMode: "obs_video" },
          feedCount: 3,
          milestone: 3
        }
      }
    );

    assert.equal(overlayState.cleared, true);
    assert.equal(played, true);
  });

  await test("scheduleStoryAnimationAfterFeed composes png slideshow", async () => {
    const overlayState = {};
    let visual = null;

    const api = createStoryFeedRuntime({
      writeLog: () => {},
      safeString: (v, d) => String(v ?? d ?? ""),
      getUserLabel: () => "Bob",
      getAvatarUrl: () => "https://example.com/a.png",
      storyAnimationEngineModule: {
        observeFeedAndResolveStory: () => ({
          triggered: true,
          story: { id: "mini_saga", deliveryMode: "png_slideshow" },
          feedCount: 2,
          milestone: 2,
          isRepeat: false
        }),
        resolveStoryDeliveryMode: () => "png_slideshow",
        composeStoryAnimation: async () => ({
          ok: true,
          playbackId: "pb-1",
          storyId: "mini_saga",
          title: "Story",
          intro: "Hi",
          outro: "Bye",
          userLabel: "Bob",
          feedCount: 2,
          milestone: 2,
          isRepeat: false,
          frames: [{ imageUrl: "/generated/story-moments/x.png" }],
          frameMs: 900,
          avatarLoaded: true,
          expiresAt: Date.now() + 10000
        })
      },
      storyVideoEngineModule: {},
      overlayStateModule: {
        setStoryVisual: (state, payload) => {
          visual = payload;
          state.storyVisual = payload.storyId;
        }
      },
      getOverlayState: () => overlayState,
      runtimeConfig: {},
      videoEngine: null,
      miaEyes: null,
      executeOverlay: async () => {}
    });

    await api.scheduleStoryAnimationAfterFeed({ platform: "tiktok" }, { feedType: "care" });

    assert.equal(visual.storyId, "mini_saga");
    assert.equal(overlayState.storyVisual, "mini_saga");
    assert.equal(visual.frames.length, 1);
  });

  await test("index.js wires storyFeedRuntime without inline playStoryVideoSequence", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initStoryFeedRuntime/);
    assert.match(indexSrc, /MIA_STORY_FEED_RUNTIME/);
    assert.match(indexSrc, /MIA_STORY_FEED_CTX/);
    assert.match(indexSrc, /function scheduleStoryAnimationAfterFeed/);
    assert.doesNotMatch(indexSrc, /storyVideoEngineModule\.playStoryVideoSequence\(/);
  });

  console.log("story_feed_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
