"use strict";

const assert = require("assert/strict");
const t0 = require("../scripts/MIA_T0_ENGAGEMENT");
const overlayState = require("../scripts/MIA_OVERLAY_STATE");
const duel = require("../scripts/MIA_KOJNOZROUT_DUEL");

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

console.log("\n---- SPRINT 6 CONTRACT ----\n");

test("T0 flyby moment includes avatar and event type", () => {
  process.env.MIA_T0_FLYBY = "on";
  const flyby = t0.buildT0FlybyMoment(
    "FOLLOW",
    { user: { nickname: "Rose Fan", avatarUrl: "https://example.com/a.png" } },
    {}
  );

  assert.equal(flyby.eventType, "FOLLOW");
  assert.equal(flyby.userLabel, "Rose Fan");
  assert.equal(flyby.avatarUrl, "https://example.com/a.png");
});

test("overlay state stores and expires t0 flyby", () => {
  const state = overlayState.createOverlayState();
  overlayState.setT0Flyby(state, {
    eventType: "SHARE",
    userLabel: "Fan",
    label: "Sdílení",
    holdMs: 5000
  });

  const snap = overlayState.getT0FlybySnapshot(state);
  assert.equal(snap.userLabel, "Fan");
  assert.equal(snap.eventType, "SHARE");
});

test("duel awards follow and share points", () => {
  let duelState = duel.startDuel({}, { durationMs: 60000 });
  const follow = duel.ingestDuelContribution(duelState, {
    eventType: "FOLLOW",
    userLabel: "Fan",
    miaPoints: 0
  });
  duelState = follow.state;
  const share = duel.ingestDuelContribution(duelState, {
    eventType: "SHARE",
    userLabel: "Fan",
    miaPoints: 0
  });

  assert.equal(share.applied, true);
  assert.equal(share.state.localSide.followPoints, 3);
  assert.equal(share.state.localSide.sharePoints, 2);
});

test("duel snapshot exposes animated power bar percentages", () => {
  let duelState = duel.startDuel({}, { durationMs: 60000 });
  duelState = duel.ingestDuelContribution(duelState, {
    eventType: "GIFT",
    userLabel: "Fan",
    miaPoints: 700
  }).state;
  duelState = duel.reportOpponentPoints(duelState, 300);

  const snap = duel.getDuelSnapshot(duelState);
  assert.equal(snap.powerBar.localPct, 70);
  assert.equal(snap.powerBar.opponentPct, 30);
});

test("resolvePowerBar handles zero total gracefully", () => {
  const bar = duel.resolvePowerBar(0, 0);
  assert.equal(bar.localPct, 50);
  assert.equal(bar.opponentPct, 50);
});
