"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildStoryFeedCtx } = require("../scripts/MIA_STORY_FEED_CTX");
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
  await test("buildStoryFeedCtx flattens grouped host", () => {
    const getOverlayState = () => ({ storyVisual: null });
    const ctx = buildStoryFeedCtx({
      core: { writeLog: () => {}, safeString: String, runtimeConfig: {} },
      modules: { storyAnimationEngineModule: {}, storyVideoEngineModule: {}, overlayStateModule: {} },
      state: { getOverlayState },
      handlers: { getUserLabel: () => "Alice", getAvatarUrl: () => "", executeOverlay: async () => ({}) },
      media: { videoEngine: null, miaEyes: null }
    });
    assert.equal(ctx.getOverlayState, getOverlayState);
  });

  await test("createStoryFeedRuntime accepts buildStoryFeedCtx shape", () => {
    const api = createStoryFeedRuntime(
      buildStoryFeedCtx({
        core: { writeLog: () => {}, safeString: String, runtimeConfig: {} },
        modules: { storyAnimationEngineModule: {}, storyVideoEngineModule: {}, overlayStateModule: {} },
        state: { getOverlayState: () => ({}) },
        handlers: { getUserLabel: () => "Alice", getAvatarUrl: () => "", executeOverlay: async () => ({}) },
        media: { videoEngine: null, miaEyes: null }
      })
    );
    assert.equal(typeof api.scheduleStoryAnimationAfterFeed, "function");
  });

  await test("index.js uses collectStoryFeedHost and buildStoryFeedCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectStoryFeedHost\(\)/);
    assert.match(indexSrc, /MIA_STORY_FEED_CTX/);
    assert.match(indexSrc, /MIA_STORY_FEED_HOST/);
    assert.match(indexSrc, /buildHost\(collectStoryFeedBindingsHost\(\)\)/);
    assert.doesNotMatch(indexSrc, /createStoryFeedRuntime\(\{\s*writeLog,/);
  });

  console.log("story_feed_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
