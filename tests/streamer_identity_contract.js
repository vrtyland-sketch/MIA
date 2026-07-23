"use strict";

const assert = require("assert/strict");
const identity = require("../scripts/MIA_STREAMER_IDENTITY");

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

console.log("\n---- STREAMER IDENTITY CONTRACT ----\n");

// Izolace: vždy začni bez pinu.
identity.clearPinnedBoss();

test("first boss use with stable kick userId pins identity (TOFU)", () => {
  identity.clearPinnedBoss();
  const v = identity.verifyBoss(
    { platform: "kick", userId: "kick_owner_1", username: "VasaSpinak", nickname: "VasaSpinak" },
    {}
  );
  assert.equal(v.ok, true);
  assert.equal(v.captured, true);
  const snap = identity.getIdentitySnapshot({});
  assert.equal(snap.locked, true);
  assert.equal(snap.userId, "kick_owner_1");
});

test("locked identity follows userId, not the display name", () => {
  const v = identity.verifyBoss(
    { platform: "kick", userId: "kick_owner_1", username: "Uplne Jine Jmeno" },
    {}
  );
  assert.equal(v.ok, true);
  assert.equal(v.reason, "pinned_match");
});

test("impostor reusing the boss name but different userId is rejected", () => {
  const v = identity.verifyBoss(
    { platform: "kick", userId: "kick_impostor_9", username: "VasaSpinak", nickname: "VasaSpinak" },
    {}
  );
  assert.equal(v.ok, false);
  assert.equal(v.reason, "not_pinned_boss");
});

test("random viewer is rejected once identity is locked", () => {
  const v = identity.verifyBoss({ platform: "kick", userId: "kick_77", username: "Random" }, {});
  assert.equal(v.ok, false);
});

test("boss name without a stable userId does not pin a placeholder", () => {
  identity.clearPinnedBoss();
  const v = identity.verifyBoss({ platform: "kick", username: "VasaSpinak" }, {});
  assert.equal(v.ok, false);
  assert.equal(v.reason, "no_stable_id_to_pin");
  assert.equal(identity.getIdentitySnapshot({}).locked, false);
});

test("config pin overrides store and locks to env userId", () => {
  identity.clearPinnedBoss();
  const cfg = { stream: { bossKickUserId: "kick_cfg_42", bossLabel: "VasaSpinak", bossPlatform: "kick" } };
  const ok = identity.verifyBoss({ platform: "kick", userId: "kick_cfg_42", username: "x" }, cfg);
  assert.equal(ok.ok, true);
  const bad = identity.verifyBoss({ platform: "kick", userId: "kick_other", username: "VasaSpinak" }, cfg);
  assert.equal(bad.ok, false);
});

// Úklid po testech.
identity.clearPinnedBoss();

console.log("\n---- STREAMER IDENTITY CONTRACT SUMMARY ----\n");
