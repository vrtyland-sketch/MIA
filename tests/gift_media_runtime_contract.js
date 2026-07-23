"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
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
  await test("createGiftMediaRuntime exposes gift media API", () => {
    const api = createGiftMediaRuntime({
      writeLog: () => {},
      safeString: (v, d) => String(v ?? d ?? ""),
      getUserLabel: () => "viewer",
      getAvatarUrl: () => "",
      giftPresentationModule: {},
      scheduleStoryAnimationAfterFeed: async () => {},
      animationReactionModule: {},
      overlayStateModule: {},
      giftAnimationContextModule: {},
      getOverlayState: () => ({}),
      overlayStateCache: null,
      invalidateOverlayStateCache: () => {},
      mediaOrchestratorModule: {},
      giftMapModule: {},
      giftVisualComposerModule: {},
      mediaCatalogModule: {},
      getKojnozoutState: () => ({}),
      getStreamState: () => ({}),
      viewerStoryModule: {},
      storyAnimationEngineModule: {}
    });

    for (const key of [
      "applyGiftAnimationReaction",
      "scheduleGiftVisualCompose",
      "schedulePostGiftMediaExperiences"
    ]) {
      assert.equal(typeof api[key], "function", `missing ${key}`);
    }
  });

  await test("applyGiftAnimationReaction sets overlay animation payload", () => {
    const overlayState = {};
    let reactionPayload = null;

    const api = createGiftMediaRuntime({
      writeLog: () => {},
      safeString: (v, d) => String(v ?? d ?? ""),
      getUserLabel: () => "Alice",
      getAvatarUrl: () => "",
      giftPresentationModule: {},
      scheduleStoryAnimationAfterFeed: async () => {},
      animationReactionModule: {
        shouldRunGiftAnimationReaction: () => true,
        buildGiftAnimationReactionPayload: () => ({
          animationId: "sparkle",
          effectProgram: "rose",
          soundCue: "ping"
        })
      },
      overlayStateModule: {
        setAnimationReaction: (state, payload) => {
          reactionPayload = payload;
          state.lastReaction = payload.animationId;
        }
      },
      giftAnimationContextModule: {},
      getOverlayState: () => overlayState,
      overlayStateCache: null,
      invalidateOverlayStateCache: () => {},
      mediaOrchestratorModule: {},
      giftMapModule: {},
      giftVisualComposerModule: {},
      mediaCatalogModule: {},
      getKojnozoutState: () => ({}),
      getStreamState: () => ({}),
      viewerStoryModule: {},
      storyAnimationEngineModule: {}
    });

    const result = api.applyGiftAnimationReaction(
      { support: { giftName: "Rose", tier: "T1" } },
      { tier: "T1" },
      { key: "rose", effectProgram: "rose" },
      {},
      "happy"
    );

    assert.equal(result.animationId, "sparkle");
    assert.equal(overlayState.lastReaction, "sparkle");
    assert.equal(reactionPayload.animationId, "sparkle");
  });

  await test("schedulePostGiftMediaExperiences skips when plan disables all", async () => {
    const api = createGiftMediaRuntime({
      writeLog: () => {},
      safeString: (v, d) => String(v ?? d ?? ""),
      getUserLabel: () => "Bob",
      getAvatarUrl: () => "",
      giftPresentationModule: {
        resolvePostGiftExperiencePlan: () => ({
          runGiftVisual: false,
          runMilestoneStory: false,
          runViewerStory: false
        })
      },
      scheduleStoryAnimationAfterFeed: async () => {},
      animationReactionModule: {},
      overlayStateModule: {},
      giftAnimationContextModule: {},
      getOverlayState: () => ({}),
      overlayStateCache: null,
      invalidateOverlayStateCache: () => {},
      mediaOrchestratorModule: {},
      giftMapModule: {},
      giftVisualComposerModule: {},
      mediaCatalogModule: {},
      getKojnozoutState: () => ({}),
      getStreamState: () => ({}),
      viewerStoryModule: {},
      storyAnimationEngineModule: {}
    });

    // scheduleGiftVisualCompose is internal - test via full flow with orchestrator noop
    await api.schedulePostGiftMediaExperiences({}, { meta: {} });
  });

  await test("index.js wires giftMediaRuntime without inline scheduleGiftVisualCompose body", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initGiftMediaRuntime/);
    assert.match(indexSrc, /MIA_GIFT_MEDIA_RUNTIME/);
    assert.match(indexSrc, /MIA_GIFT_MEDIA_CTX/);
    assert.match(indexSrc, /function schedulePostGiftMediaExperiences/);
    assert.doesNotMatch(indexSrc, /mediaOrchestratorModule\.composeGiftOverlay\(/);
  });

  console.log("gift_media_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
