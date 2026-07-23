"use strict";

const assert = require("assert/strict");
const {
  tryBuildShareBridgeResult
} = require("../shared/next/share_runtime_bridge");

const results = {
  passed: 0,
  failed: 0
};

async function test(name, fn) {
  try {
    await fn();
    results.passed += 1;
    console.log(`✅ ${name}`);
  } catch (err) {
    results.failed += 1;
    console.error(`❌ ${name}`);
    console.error(err);
  }
}

function makeShareContext() {
  return {
    rawEvent: {
      eventType: "share",
      type: "share",
      platform: "tiktok",
      userId: "u1",
      username: "tester",
      nickname: "Tester"
    },
    streamState: {
      userActivity: {
        u1: { shareCount: 1 },
        u2: { shareCount: 2 },
        u3: { shareCount: 3 }
      }
    },
    kojnozoutState: {
      bowlPercent: 50,
      mood: "neutral"
    },
    nextShareBridgeEnabled: true
  };
}

(async () => {

  await test("share bridge returns valid result", async () => {
    const result = tryBuildShareBridgeResult(makeShareContext());

    assert.equal(result.ok, true);
    assert.equal(result.actionResult.meta.domain, "share");
    assert.ok(result.actionResult.overlayPayload);
  });

  await test("share bridge disables correctly", async () => {
    const ctx = makeShareContext();
    ctx.nextShareBridgeEnabled = false;

    const result = tryBuildShareBridgeResult(ctx);

    assert.equal(result.ok, false);
    assert.equal(result.skipped, true);
  });

  console.log("");
  console.log("---- SHARE FLOW SMOKE SUMMARY ----");
  console.log(`passed: ${results.passed}`);
  console.log(`failed: ${results.failed}`);

  if (results.failed > 0) process.exit(1);
  process.exit(0);

})();