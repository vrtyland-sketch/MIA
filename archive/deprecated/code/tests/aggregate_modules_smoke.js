"use strict";

const assert = require("assert/strict");
const { createAggregateModules } = require("../shared/aggregate");

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
    console.error(err && err.stack ? err.stack : err);
  }
}

function createClock(start = 1000) {
  let now = start;
  return {
    now: () => now,
    set(value) {
      now = value;
    },
    add(ms) {
      now += Number(ms) || 0;
    }
  };
}

function makeComment(text, userLabel = "Tester", userId = "u1") {
  return {
    eventType: "COMMENT",
    platform: "tiktok",
    message: text,
    user: {
      nickname: userLabel,
      userId
    }
  };
}

function makeGift() {
  return {
    eventType: "GIFT",
    route: "support",
    platform: "tiktok",
    support: {
      coins: 1,
      tier: "T1",
      giftName: "Rose",
      count: 1
    },
    user: {
      nickname: "GiftUser",
      userId: "gift1"
    }
  };
}

(async () => {
  await test("aggregate module exports processEvent and snapshot", async () => {
    const clock = createClock();
    const aggregate = createAggregateModules({
      nowTs: clock.now,
      appendJsonLog() {}
    });

    assert.equal(typeof aggregate.processEvent, "function");
    assert.equal(typeof aggregate.getSnapshot, "function");

    const snapshot = aggregate.getSnapshot();
    assert.equal(snapshot.ok, true);
    assert.ok(snapshot.modules);
    assert.ok(snapshot.modules.greeting);
    assert.ok(snapshot.modules.care);
  });

  await test("general greeting is captured and swallowed", async () => {
    const clock = createClock();
    const aggregate = createAggregateModules({
      nowTs: clock.now,
      appendJsonLog() {}
    });

    const result = await aggregate.processEvent({
      eventId: "evt1",
      normalizedEvent: makeComment("ahoj všichni", "Pinda", "u1")
    });

    assert.equal(result.ok, true);
    assert.equal(result.handled, true);
    assert.equal(result.passthroughEvents.length, 0);
    assert.equal(result.overlayPayloads.length, 0);
    assert.equal(result.meta.aggregateType, "greeting");
  });

  await test("targeted greeting for MIA passes through and is not aggregated", async () => {
    const clock = createClock();
    const aggregate = createAggregateModules({
      nowTs: clock.now,
      appendJsonLog() {}
    });

    const result = await aggregate.processEvent({
      eventId: "evt1",
      normalizedEvent: makeComment("ahoj mio", "Pinda", "u1")
    });

    assert.equal(result.ok, true);
    assert.equal(result.handled, false);
    assert.equal(result.passthroughEvents.length, 1);
    assert.equal(result.overlayPayloads.length, 0);
  });

  await test("multiple general greetings are aggregated and flushed on follow-up event", async () => {
    const clock = createClock();
    const aggregate = createAggregateModules({
      nowTs: clock.now,
      appendJsonLog() {},
      runtimeConfig: {
        aggregate: {
          greetingWindowMs: 1200
        }
      }
    });

    let result = await aggregate.processEvent({
      eventId: "evt1",
      normalizedEvent: makeComment("ahoj všichni", "Pinda", "u1")
    });

    assert.equal(result.handled, true);
    assert.equal(result.overlayPayloads.length, 0);

    clock.add(300);

    result = await aggregate.processEvent({
      eventId: "evt2",
      normalizedEvent: makeComment("čau lidi", "Karel", "u2")
    });

    assert.equal(result.handled, true);
    assert.equal(result.overlayPayloads.length, 0);

    clock.add(1500);

    result = await aggregate.processEvent({
      eventId: "evt3",
      normalizedEvent: makeGift()
    });

    assert.equal(result.handled, false);
    assert.equal(result.passthroughEvents.length, 1);
    assert.equal(result.overlayPayloads.length, 1);
    assert.equal(result.overlayPayloads[0].meta.aggregated, true);
    assert.equal(result.overlayPayloads[0].meta.count, 2);
    assert.match(result.overlayPayloads[0].text, /Pinda/);
    assert.match(result.overlayPayloads[0].text, /Karel/);
  });

  await test("care comment is captured and swallowed", async () => {
    const clock = createClock();
    const aggregate = createAggregateModules({
      nowTs: clock.now,
      appendJsonLog() {}
    });

    const result = await aggregate.processEvent({
      eventId: "evt1",
      normalizedEvent: makeComment("pohlaďte kojnožrouta", "Lucka", "u1")
    });

    assert.equal(result.ok, true);
    assert.equal(result.handled, true);
    assert.equal(result.passthroughEvents.length, 0);
    assert.equal(result.overlayPayloads.length, 0);
    assert.equal(result.meta.aggregateType, "care");
  });

  await test("care flush emits overlay and synthetic event", async () => {
    const clock = createClock();
    const aggregate = createAggregateModules({
      nowTs: clock.now,
      appendJsonLog() {},
      runtimeConfig: {
        aggregate: {
          careWindowMs: 1000
        }
      }
    });

    let result = await aggregate.processEvent({
      eventId: "evt1",
      normalizedEvent: makeComment("pohlaďte kojnožrouta", "Lucka", "u1")
    });

    assert.equal(result.handled, true);
    assert.equal(result.overlayPayloads.length, 0);

    clock.add(1300);

    result = await aggregate.processEvent({
      eventId: "evt2",
      normalizedEvent: makeGift()
    });

    assert.equal(result.handled, false);
    assert.equal(result.passthroughEvents.length, 1);
    assert.equal(result.overlayPayloads.length, 1);
    assert.equal(result.syntheticEvents.length, 1);
    assert.equal(result.overlayPayloads[0].owner, "kojnozout");
    assert.equal(result.overlayPayloads[0].meta.source, "care_aggregator");
    assert.equal(result.syntheticEvents[0].communityImpact.kojnozoutFeedDelta > 0, true);
  });

  await test("non greeting event passes through when nothing is buffered", async () => {
    const clock = createClock();
    const aggregate = createAggregateModules({
      nowTs: clock.now,
      appendJsonLog() {}
    });

    const result = await aggregate.processEvent({
      eventId: "evt1",
      normalizedEvent: makeGift()
    });

    assert.equal(result.ok, true);
    assert.equal(result.handled, false);
    assert.equal(result.passthroughEvents.length, 1);
    assert.equal(result.overlayPayloads.length, 0);
  });

  console.log("");
  console.log("---- AGGREGATE MODULES SMOKE SUMMARY ----");
  console.log(`passed: ${results.passed}`);
  console.log(`failed: ${results.failed}`);

  if (results.failed > 0) process.exit(1);
  process.exit(0);
})();