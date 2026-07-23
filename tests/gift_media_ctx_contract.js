"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildGiftMediaCtx } = require("../scripts/MIA_GIFT_MEDIA_CTX");
const { createGiftMediaRuntime } = require("../scripts/MIA_GIFT_MEDIA_RUNTIME");

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
  await test("buildGiftMediaCtx passes live getStreamState getter", () => {
    let count = 0;
    const ctx = buildGiftMediaCtx({
      core: { writeLog: () => {}, safeString: String },
      modules: {
        giftPresentationModule: {},
        animationReactionModule: {},
        overlayStateModule: {},
        giftAnimationContextModule: {},
        mediaOrchestratorModule: {},
        giftMapModule: {},
        giftVisualComposerModule: {},
        mediaCatalogModule: {},
        viewerStoryModule: {},
        storyAnimationEngineModule: {}
      },
      state: {
        getOverlayState: () => ({}),
        getKojnozoutState: () => ({}),
        getStreamState: () => ({ audience: { viewerCount: ++count } })
      },
      handlers: {
        getUserLabel: () => "viewer",
        getAvatarUrl: () => "",
        scheduleStoryAnimationAfterFeed: async () => {},
        invalidateOverlayStateCache: () => {}
      },
      overlay: { overlayStateCache: null }
    });
    assert.equal(ctx.getStreamState().audience.viewerCount, 1);
    assert.equal(ctx.getStreamState().audience.viewerCount, 2);
  });

  await test("createGiftMediaRuntime accepts buildGiftMediaCtx shape", () => {
    const api = createGiftMediaRuntime(
      buildGiftMediaCtx({
        core: { writeLog: () => {}, safeString: String },
        modules: {
          giftPresentationModule: {},
          animationReactionModule: {},
          overlayStateModule: {},
          giftAnimationContextModule: {},
          mediaOrchestratorModule: {},
          giftMapModule: {},
          giftVisualComposerModule: {},
          mediaCatalogModule: {},
          viewerStoryModule: {},
          storyAnimationEngineModule: {}
        },
        state: {
          getOverlayState: () => ({}),
          getKojnozoutState: () => ({}),
          getStreamState: () => ({})
        },
        handlers: {
          getUserLabel: () => "viewer",
          getAvatarUrl: () => "",
          scheduleStoryAnimationAfterFeed: async () => {},
          invalidateOverlayStateCache: () => {}
        },
        overlay: { overlayStateCache: null }
      })
    );
    assert.equal(typeof api.schedulePostGiftMediaExperiences, "function");
  });

  await test("index.js uses collectGiftMediaHost and buildGiftMediaCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectGiftMediaHost\(\)/);
    assert.match(indexSrc, /MIA_GIFT_MEDIA_CTX/);
    assert.match(indexSrc, /MIA_GIFT_MEDIA_HOST/);
    assert.match(indexSrc, /buildHost\(collectGiftMediaBindingsHost\(\)\)/);
    assert.doesNotMatch(indexSrc, /createGiftMediaRuntime\(\{\s*writeLog,/);
  });

  console.log("gift_media_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
