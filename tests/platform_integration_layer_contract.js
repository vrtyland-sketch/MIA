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
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
