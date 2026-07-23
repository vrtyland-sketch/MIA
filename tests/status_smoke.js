"use strict";

const assert = require("assert/strict");
const { getKickBridgeStatus } = require("../scripts/MIA_KICK_BRIDGE");

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

test("kick bridge status exposes shape", () => {
  const status = getKickBridgeStatus();
  assert.equal(typeof status.started, "boolean");
  assert.equal(typeof status.connected, "boolean");
  assert.equal(typeof status.chatroomId, "string");
});

(async () => {
  try {
    const res = await fetch("http://127.0.0.1:3000/status");
    if (!res.ok) {
      throw new Error(`status HTTP ${res.status}`);
    }
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, "MIA");
    assert.equal(typeof body.obs, "object");
    assert.equal(typeof body.kick, "object");
    assert.equal(typeof body.audience, "object");
    assert.equal(typeof body.spam, "object");
    assert.equal(typeof body.video, "object");
    assert.equal(typeof body.proactiveHost, "object");
    assert.equal(typeof body.supportAck, "object");
    assert.equal(typeof body.shadowPipeline, "object");
    assert.equal(typeof body.proactiveHost.wouldSpeak, "boolean");
    assert.equal(typeof body.supportAck.inCooldown, "boolean");
    console.log("✅ /status live endpoint");
  } catch (err) {
    console.error("❌ /status live endpoint");
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
})();
