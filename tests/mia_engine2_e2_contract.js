"use strict";

const assert = require("assert/strict");
const {
  isEngine2StubEnabled,
  createEngine2Pipeline,
  createStubState,
  applyNormalizedEvent,
  ingestNormalizedEvent,
  routeObsProjection,
  ROUTE_VERSION
} = require("../engine2");
const { buildEngine2AdminSnapshot } = require("../engine2/wiring");
const { normalizeEvent } = require("../shared/platform_normalizers/normalize_event");

const FORBIDDEN_KEYS = [
  "coins",
  "coinValue",
  "giftValue",
  "totalCoins",
  "totalFedCoins",
  "rawValue",
  "coin_value"
];

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

function collectKeys(obj, out = new Set()) {
  if (!obj || typeof obj !== "object") return out;
  for (const key of Object.keys(obj)) {
    out.add(key);
    collectKeys(obj[key], out);
  }
  return out;
}

function assertNoForbiddenKeys(payload, label) {
  const keys = collectKeys(payload);
  for (const forbidden of FORBIDDEN_KEYS) {
    assert.ok(!keys.has(forbidden), `${label} must not expose ${forbidden}`);
  }
}

test("MIA_ENGINE2_STUB defaults OFF — E2 admin snapshot undefined", () => {
  const prev = process.env.MIA_ENGINE2_STUB;
  delete process.env.MIA_ENGINE2_STUB;
  assert.equal(isEngine2StubEnabled(), false);
  assert.equal(buildEngine2AdminSnapshot({}), undefined);
  if (prev === undefined) delete process.env.MIA_ENGINE2_STUB;
  else process.env.MIA_ENGINE2_STUB = prev;
});

test("event applicator applies GIFT and COMMENT into stub state", () => {
  const state = createStubState();
  const gift = normalizeEvent({
    source: "tiktok",
    eventType: "GIFT",
    giftName: "Rose",
    coins: 5,
    repeatCount: 2,
    uniqueId: "fan1",
    nickname: "FanOne"
  });
  const giftResult = applyNormalizedEvent(state, gift);
  assert.equal(giftResult.applied, true);
  assert.ok(state.economy.miaPoints >= 10);
  assert.equal(state.economy.recentGifts[0].user, "FanOne");
  assert.equal(state.economy.recentGifts[0].coins, undefined);

  const comment = normalizeEvent({
    source: "kick",
    eventType: "COMMENT",
    message: "hello engine2",
    username: "Chatter"
  });
  const commentResult = applyNormalizedEvent(state, comment);
  assert.equal(commentResult.applied, true);
  assert.equal(state.chat.recent[0].user, "Chatter");
  assert.equal(state.chat.recent[0].text, "hello engine2");
});

test("event bus stub normalizes raw input before apply", () => {
  const state = createStubState();
  const { normalized, result } = ingestNormalizedEvent(state, {
    source: "tiktok",
    eventType: "COMMENT",
    comment: "via bus",
    uniqueId: "u1",
    nickname: "BusUser"
  });
  assert.equal(normalized.eventType, "COMMENT");
  assert.equal(result.applied, true);
  assert.equal(state.chat.recent[0].user, "BusUser");
});

test("OBS router maps obs projection to stable renderRoute envelope", () => {
  const state = createStubState({
    obs: { scene: "arena", mediaQueue: ["a.webm", "b.webm"] },
    koj: { mood: "excited" }
  });
  const pipeline = createEngine2Pipeline({
    loaders: {
      loadKoj: () => state.koj,
      loadWorld: () => state.world,
      loadArena: () => state.arena,
      loadEconomy: () => state.economy,
      loadChat: () => state.chat,
      loadObs: () => state.obs,
      loadDebug: () => state.debug
    }
  });
  const obsRender = pipeline.render("obs");
  const route = routeObsProjection(obsRender);
  assert.equal(route.kind, "obs.renderRoute");
  assert.equal(route.version, ROUTE_VERSION);
  assert.equal(route.scene, "arena");
  assert.deepEqual(route.mediaQueue, ["a.webm", "b.webm"]);
  assert.equal(route.kojMood, "excited");
  assertNoForbiddenKeys(route, "obsRoute");
});

test("MIA_ENGINE2_STUB=1 admin snapshot includes projections, obsRoute, eventBus", () => {
  const prev = process.env.MIA_ENGINE2_STUB;
  process.env.MIA_ENGINE2_STUB = "1";
  const snap = buildEngine2AdminSnapshot({});
  assert.equal(snap.enabled, true);
  assert.equal(snap.phase, "E2");
  assert.ok(snap.projections.tiktok);
  assert.ok(snap.projections.obs);
  assert.ok(snap.obsRoute);
  assert.equal(snap.obsRoute.kind, "obs.renderRoute");
  assert.ok(snap.eventBus);
  assert.ok(snap.eventBus.ingested >= 2);
  assert.ok(snap.eventBus.events.some((e) => e.eventType === "GIFT" && e.applied));
  assert.ok(snap.eventBus.events.some((e) => e.eventType === "COMMENT" && e.applied));
  for (const platform of Object.keys(snap.projections)) {
    assertNoForbiddenKeys(snap.projections[platform], `projection.${platform}`);
  }
  assertNoForbiddenKeys(snap.obsRoute, "admin.obsRoute");
  if (prev === undefined) delete process.env.MIA_ENGINE2_STUB;
  else process.env.MIA_ENGINE2_STUB = prev;
});

test("unsupported event types are no-op in applicator stub", () => {
  const state = createStubState();
  const beforePoints = state.economy.miaPoints;
  const result = applyNormalizedEvent(state, {
    eventType: "LIKE",
    eventId: "like-1",
    ts: Date.now()
  });
  assert.equal(result.applied, false);
  assert.equal(state.economy.miaPoints, beforePoints);
});

console.log("mia_engine2_e2_contract: all passed");
