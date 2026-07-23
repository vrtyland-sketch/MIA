"use strict";

const assert = require("assert/strict");
const liveSmoke = require("../scripts/mia_live_audit");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("evaluateStatusPayload requires MIA service + giftMap", () => {
  const good = liveSmoke.evaluateStatusPayload({
    ok: true,
    service: "MIA",
    giftMap: { queueLength: 0 },
    streamSession: { phase: "PRELIVE" },
    obs: { connected: true }
  });
  assert.equal(good.ok, true);
  assert.equal(good.hasGiftMap, true);
  assert.equal(good.hasStreamSession, true);
  assert.equal(good.streamPhase, "PRELIVE");

  const bad = liveSmoke.evaluateStatusPayload({ ok: true, service: "OTHER" });
  assert.equal(bad.ok, false);
});

test("evaluateStreamSessionPayload accepts canon phases", () => {
  for (const phase of ["PRELIVE", "LIVE", "ENDED"]) {
    const evalResult = liveSmoke.evaluateStreamSessionPayload({
      ok: true,
      session: { phase }
    });
    assert.equal(evalResult.ok, true, phase);
    assert.equal(evalResult.phase, phase);
  }
});

test("evaluateGiftMapStatusPayload requires catalog keys", () => {
  const good = liveSmoke.evaluateGiftMapStatusPayload({
    ok: true,
    giftMap: {},
    catalogKeys: ["ROSE", "LION"],
    spamWave: {},
    userThrottle: {}
  });
  assert.equal(good.ok, true);

  const bad = liveSmoke.evaluateGiftMapStatusPayload({ ok: true, giftMap: {}, catalogKeys: [] });
  assert.equal(bad.ok, false);
});

test("evaluateGiftMapMapping matches rose after ingest", () => {
  const hit = liveSmoke.evaluateGiftMapMapping(
    { lastMapping: { giftKey: "ROSE", streamTier: "T1" } },
    "rose"
  );
  assert.equal(hit.ok, true);

  const miss = liveSmoke.evaluateGiftMapMapping({ lastMapping: null }, "rose");
  assert.equal(miss.ok, false);
});

test("evaluateRemoteDevStatusPayload checks mode", () => {
  const good = liveSmoke.evaluateRemoteDevStatusPayload({
    ok: true,
    mode: "remote_dev",
    queueLength: 0
  });
  assert.equal(good.ok, true);

  const bad = liveSmoke.evaluateRemoteDevStatusPayload({ ok: true, mode: "other" });
  assert.equal(bad.ok, false);
});

test("evaluateCareIngestBody detects accepted ingest", () => {
  assert.equal(
    liveSmoke.evaluateCareIngestBody('{"ok":true,"accepted":true,"queued":true}').ok,
    true
  );
  assert.equal(liveSmoke.evaluateCareIngestBody('{"accepted":false}').ok, false);
});

test("evaluateGraphicsBodyStatePayload validates body parts", () => {
  const good = liveSmoke.evaluateGraphicsBodyStatePayload({
    ok: true,
    mood: "gift",
    parts: { head: true, eyes: true, hands: true, torso: false, feet: false }
  });
  assert.equal(good.ok, true);

  const bad = liveSmoke.evaluateGraphicsBodyStatePayload({
    ok: true,
    mood: "gift",
    parts: { head: true }
  });
  assert.equal(bad.ok, false);
});

test("evaluateOverlayPublicCoinSanitized rejects coin fields", () => {
  const bad = liveSmoke.evaluateOverlayPublicCoinSanitized({ support: { giftValue: 5 } });
  assert.equal(bad.ok, false);
  const good = liveSmoke.evaluateOverlayPublicCoinSanitized({ giftEconomy: { miaPoints: 100 } });
  assert.equal(good.ok, true);
});

console.log("live_smoke_checklist_contract: all passed");
