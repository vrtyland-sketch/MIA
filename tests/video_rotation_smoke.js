"use strict";

const assert = require("assert/strict");
const { createVideoEngine } = require("../scripts/MIA_VIDEO_ENGINE");

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

function makeEngine() {
  return createVideoEngine({
    runtimeConfig: {
      obs: {
        sceneName: "SPINAK_ENGINE_GIFTS",
        tierSources: {
          T1: ["T1_VIDEO_01", "T1_VIDEO_02"],
          T2: ["T2_VIDEO_05"],
          T3: [],
          T4: []
        },
        tierPlaybackMs: { T1: 1000, T2: 1000, T3: 1000, T4: 1000 },
        autoSwitchProgramScene: false,
        restoreProgramSceneAfterPlayback: false,
        queue: { idlePollMs: 0, mergeEnabled: false }
      }
    },
    safeObsCall: async (requestType) => {
      if (requestType === "GetVersion") {
        return { ok: true, response: { obsVersion: "30.0.0" } };
      }
      if (requestType === "GetSceneItemId") {
        return { ok: true, response: { sceneItemId: 1 } };
      }
      return { ok: true, response: {} };
    },
    appendJsonLog: () => {},
    sleep: async () => {}
  });
}

(async () => {
  console.log("\n---- VIDEO ROTATION SMOKE ----\n");

  await test("tier pools rotate sequentially in order", async () => {
    const engine = makeEngine();
    const picked = [];

    for (let i = 0; i < 4; i += 1) {
      const result = await engine.enqueueGiftPlayback("T1", {
        eventType: "GIFT",
        user: { username: "tester" },
        support: { giftName: "Rose", tier: "T1" }
      });
      picked.push(result.sourceName);
    }

    assert.deepEqual(picked, [
      "T1_VIDEO_01",
      "T1_VIDEO_02",
      "T1_VIDEO_01",
      "T1_VIDEO_02"
    ]);
    assert.equal(engine.getSnapshot().rotationIndexByTier.T1, 0);
  });

  console.log("\n---- VIDEO ROTATION SUMMARY ----\n");
})();
