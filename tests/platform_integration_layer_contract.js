"use strict";

const assert = require("assert/strict");
const {
  validateAdapterShape,
  wrapLegacyBridge,
  canTransition,
  toMiaEventType,
  CHAT_ONLY_KINDS,
  registry,
  readiness,
  testHarness,
  tokenStore
} = require("../shared/platform_integration");
const { detectPlatform, detectSource } = require("../shared/platform_normalizers/normalize_event");

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
  await test("registry lists four stream platforms", () => {
    const ids = registry.streamPlatforms().map((p) => p.id);
    assert.deepEqual(ids, ["tiktok", "kick", "twitch", "youtube"]);
  });

  await test("event kinds map chat/subscribe", () => {
    assert.equal(toMiaEventType("chat"), "COMMENT");
    assert.equal(toMiaEventType("subscribe"), "GIFT");
    assert.ok(CHAT_ONLY_KINDS.includes("COMMENT"));
  });

  await test("state transitions enforce machine", () => {
    assert.equal(canTransition("CREATED", "INITIALIZING"), true);
    assert.equal(canTransition("CREATED", "RUNNING"), false);
    assert.equal(canTransition("RUNNING", "DEGRADED"), true);
  });

  await test("wrapLegacyBridge satisfies contract", async () => {
    const calls = [];
    const bridge = {
      async start(opts) {
        calls.push(["start", opts]);
        return { ok: true };
      },
      async stop() {
        calls.push(["stop"]);
      },
      getStatus() {
        return { started: true };
      }
    };
    const adapter = wrapLegacyBridge(
      {
        id: "twitch",
        displayName: "Twitch",
        capabilities: { chat: true, chatOnlyDefault: true },
        requiredEnv: []
      },
      bridge
    );
    const shape = validateAdapterShape(adapter);
    assert.equal(shape.ok, true, shape.errors.join(","));
    const started = await adapter.start({ config: {} });
    assert.equal(started.ok, true);
    assert.equal(adapter.getStatus().state, "RUNNING");
    await adapter.shutdown();
    assert.equal(adapter.getStatus().state, "STOPPED");
    assert.ok(calls.some((c) => c[0] === "start"));
  });

  await test("test harness tags platforms", () => {
    const burst = testHarness.buildFourPlatformChatBurst("x");
    assert.equal(burst.length, 4);
    assert.equal(detectPlatform(burst[2]), "twitch");
    assert.equal(detectPlatform(burst[3]), "youtube");
    const yt = { liveChatId: "test-live-chat" };
    assert.equal(detectSource(yt, "youtube"), "youtube_live_chat");
  });

  await test("tokenStore masks secrets", () => {
    assert.equal(tokenStore.maskToken("abcdefghijklmnop"), "abcd…mnop");
  });

  await test("assessAll returns summary shape", () => {
    const report = readiness.assessAll({
      MIA_KICK_ENABLED: "0",
      MIA_TWITCH_ENABLED: "0",
      MIA_YOUTUBE_ENABLED: "0"
    });
    assert.ok(report.summary);
    assert.ok(Array.isArray(report.platforms));
    assert.equal(report.platforms.length, 4);
    assert.equal(report.summary.impliesLiveInputs, false);
    assert.equal(report.summary.configuredReady, false);
    assert.equal(report.summary.liveReady, false);
    assert.equal(report.summary.runtimeReady, false);
  });

  await test("credentials do not mark four live inputs ready", () => {
    const secret = "synthetic-twitch-token-not-a-live-proof";
    const report = readiness.assessAll({
      MIA_KICK_ENABLED: "1",
      MIA_TWITCH_ENABLED: "1",
      MIA_YOUTUBE_ENABLED: "1",
      TWITCH_CLIENT_ID: "synthetic-client",
      TWITCH_ACCESS_TOKEN: secret,
      TWITCH_CHANNEL_LOGIN: "example_channel",
      YOUTUBE_API_KEY: "synthetic-youtube-key",
      YOUTUBE_LIVE_CHAT_ID: "synthetic-live-chat"
    });
    assert.equal(report.summary.configuredReady, true);
    assert.equal(report.summary.fourWayReady, true);
    assert.equal(report.summary.fourWayConfiguredReady, true);
    assert.equal(report.summary.liveReady, false);
    assert.equal(report.summary.runtimeReady, false);
    assert.equal(report.summary.fourWayLiveReady, false);
    assert.equal(report.summary.impliesLiveInputs, false);
    assert.equal(JSON.stringify(report).includes(secret), false);
    for (const row of report.platforms) {
      assert.equal(row.liveReady, false);
      assert.equal(row.runtimeReady, false);
    }
  });

  await test("liveReady requires a recent observed ingest per platform", () => {
    const env = {
      MIA_KICK_ENABLED: "1",
      MIA_TWITCH_ENABLED: "1",
      MIA_YOUTUBE_ENABLED: "1",
      TWITCH_CLIENT_ID: "synthetic-client",
      TWITCH_ACCESS_TOKEN: "synthetic-twitch-token",
      TWITCH_CHANNEL_LOGIN: "example_channel",
      YOUTUBE_API_KEY: "synthetic-youtube-key",
      YOUTUBE_LIVE_CHAT_ID: "synthetic-live-chat"
    };
    const now = Date.now();
    const fresh = ["tiktok", "kick", "twitch", "youtube"].reduce((acc, id) => {
      acc[id] = { at: now - 1000, eventType: "COMMENT" };
      return acc;
    }, {});
    const live = readiness.assessAll(env, { liveSignals: fresh, now });
    assert.equal(live.summary.configuredReady, true);
    assert.equal(live.summary.liveReady, true);
    assert.equal(live.summary.runtimeReady, true);
    assert.equal(live.summary.fourWayLiveReady, true);
    assert.equal(live.summary.impliesLiveInputs, false);

    const stale = readiness.assessAll(env, {
      now,
      liveSignals: {
        ...fresh,
        youtube: { at: now - readiness.LIVE_SIGNAL_WINDOW_MS - 1000, eventType: "COMMENT" }
      }
    });
    assert.equal(stale.summary.configuredReady, true);
    assert.equal(stale.summary.liveReady, false);
    assert.equal(stale.platforms.find((row) => row.id === "youtube").liveReady, false);
    assert.equal(stale.platforms.find((row) => row.id === "tiktok").liveReady, true);
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
