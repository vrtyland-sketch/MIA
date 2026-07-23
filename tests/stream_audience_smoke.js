"use strict";

const assert = require("assert/strict");

const audience = require("../scripts/MIA_STREAM_AUDIENCE");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

test("tikfinity totalLikeCount maps to viewer estimate", () => {
  const count = audience.estimateFromTikfinitySignals({
    platform: "tiktok",
    tikfinityUserId: "1",
    totalLikeCount: 100
  });
  assert.equal(count, 20);
});

test("mod commandParams numeric wins over default", () => {
  const resolved = audience.resolveAudienceCount(
    {
      platform: "tiktok",
      commandParams: "120"
    },
    {}
  );
  assert.equal(resolved.viewerCount, 120);
  assert.equal(resolved.source, "mod_command");
});

test("manual audience endpoint overrides tikfinity signals", () => {
  const state = audience.applyAudienceUpdate({}, { viewerCount: 80 }).state;
  const resolved = audience.resolveAudienceCount(
    {
      platform: "tiktok",
      tikfinityUserId: "1",
      totalLikeCount: 100
    },
    state
  );
  assert.equal(resolved.viewerCount, 80);
  assert.equal(resolved.source, "audience_endpoint");
});

test("applyAudienceUpdate rejects invalid viewerCount", () => {
  const result = audience.applyAudienceUpdate({}, { viewerCount: 0 });
  assert.equal(result.ok, false);
});
