"use strict";

const assert = require("assert/strict");
const {
  resolveGiftVideoTiming,
  buildJobTimingFields,
  createVideoEngine
} = require("../scripts/MIA_VIDEO_ENGINE");

function runtimeConfig(overrides = {}) {
  return {
    obs: {
      giftWaitMediaEnd: true,
      giftPlaybackBufferMs: 1500,
      giftLongAudioMinMs: 60000,
      giftPlaybackMaxSleepMs: 120000,
      giftPlaybackMaxWaitMs: 600000,
      stopPreviousOnly: true,
      tierPlaybackMs: { T1: 5000, T3: 15000 },
      sceneSwitchSettleMs: 280,
      sceneName: "SPINAK_ENGINE_GIFTS",
      autoSwitchProgramScene: false,
      restoreProgramSceneAfterPlayback: false,
      queue: { idlePollMs: 0, mergeEnabled: false },
      tierSources: {
        T1: ["T1_VIDEO_01"],
        T3: ["T3_VIDEO_09"]
      },
      ...overrides
    }
  };
}

const pending = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      const p = result.then(
        () => console.log(`✅ ${name}`),
        (err) => {
          console.error(`❌ ${name}`);
          console.error(err && err.stack ? err.stack : err);
          process.exitCode = 1;
        }
      );
      pending.push(p);
      return;
    }
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

console.log("\n---- VIDEO TIMING CONTRACT ----\n");

test("short silent clip uses waitForMediaEnd with capped sleep", () => {
  const timing = resolveGiftVideoTiming(
    { durationMs: 8000, hasEmbeddedAudio: false },
    runtimeConfig(),
    "T1"
  );

  assert.equal(timing.waitForMediaEnd, true);
  assert.equal(timing.longAudioFullPlay, false);
  assert.equal(timing.playbackMs, 9500);
  assert.ok(timing.maxWaitMs >= 14500);
});

test("long audio video must play fully via media end", () => {
  const durationMs = 130000;
  const timing = resolveGiftVideoTiming(
    { durationMs, hasEmbeddedAudio: true },
    runtimeConfig(),
    "T3"
  );

  assert.equal(timing.longAudioFullPlay, true);
  assert.equal(timing.waitForMediaEnd, true);
  assert.equal(timing.playbackMs, durationMs + 1500);
  assert.equal(timing.maxWaitMs, durationMs + 1500 + 8000);
  assert.ok(timing.playbackMs > 120000, "long audio must not use 120s sleep cap");
});

test("long audio full play enforced even when wait flag disabled", () => {
  const timing = resolveGiftVideoTiming(
    { durationMs: 75000, hasEmbeddedAudio: true },
    runtimeConfig({ giftWaitMediaEnd: false }),
    "T3"
  );

  assert.equal(timing.waitForMediaEnd, true);
  assert.equal(timing.longAudioFullPlay, true);
});

test("engine job carries timing fields for gift enqueue", async () => {
  const calls = [];
  const engine = createVideoEngine({
    runtimeConfig: runtimeConfig(),
    pickNextMediaForTier: () => ({
      obsSource: "T3_VIDEO_09",
      rel: "videos/story.mp4",
      abs: "C:/MIA/incoming-images/videos/story.mp4",
      durationMs: 130000,
      hasEmbeddedAudio: true,
      pickedBy: "tier_rotation_pool"
    }),
    safeObsCall: async (requestType) => {
      calls.push(requestType);
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

  const result = await engine.enqueueGiftPlayback("T3", {
    eventType: "GIFT",
    user: { username: "fan" },
    support: { giftName: "Galaxy", tier: "T3" }
  });

  assert.equal(result.ok, true);
  assert.equal(result.timing.longAudioFullPlay, true);
  assert.equal(result.timing.waitForMediaEnd, true);
  assert.equal(result.timing.maxWaitMs, 130000 + 1500 + 8000);

  const job = engine.getSnapshot().lastJob;
  assert.equal(job.longAudioFullPlay, true);
  assert.equal(job.waitForMediaEnd, true);
  assert.ok(!calls.includes("GetSceneItemList") || calls.filter((c) => c === "SetSceneItemEnabled").length <= 2);
});

test("buildJobTimingFields mirrors resolveGiftVideoTiming", () => {
  const mediaPick = { durationMs: 65000, hasEmbeddedAudio: true };
  const fields = buildJobTimingFields(mediaPick, runtimeConfig(), "T4");
  const timing = resolveGiftVideoTiming(mediaPick, runtimeConfig(), "T4");

  assert.deepEqual(fields, {
    playbackMs: timing.playbackMs,
    waitForMediaEnd: timing.waitForMediaEnd,
    maxWaitMs: timing.maxWaitMs,
    longAudioFullPlay: timing.longAudioFullPlay,
    durationMs: timing.durationMs,
    hasEmbeddedAudio: timing.hasEmbeddedAudio
  });
});

Promise.allSettled(pending).then(() => {
  console.log("\n---- VIDEO TIMING SUMMARY ----\n");
  process.exit(process.exitCode || 0);
});
