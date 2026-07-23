"use strict";

const assert = require("assert/strict");
const { createOverlayQueue } = require("../scripts/MIA_OVERLAY_QUEUE");

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

function createClock(start = 1_000) {
  let current = start;
  return {
    now() {
      return current;
    },
    set(value) {
      current = Number(value);
    },
    advance(ms) {
      current += Number(ms || 0);
    }
  };
}

function makeItem({ owner = "mia", stage = "support", tier = "", text = "" } = {}) {
  return {
    overlayPayload: {
      owner,
      stage,
      tier,
      text
    },
    context: {
      source: "test"
    }
  };
}

(async () => {
  await test("queue starts empty", async () => {
    const queue = createOverlayQueue();

    assert.equal(queue.size(), 0);
    assert.equal(queue.peek(), null);
    assert.equal(queue.dequeue(), null);
  });

  await test("enqueue stores item and exposes it through peek", async () => {
    const clock = createClock();
    const queue = createOverlayQueue({
      nowTs: () => clock.now(),
      appendJsonLog() {}
    });

    queue.enqueue(
      makeItem({
        owner: "mia",
        stage: "support",
        tier: "T1",
        text: "low support"
      })
    );

    assert.equal(queue.size(), 1);
    assert.equal(queue.peek().overlayPayload.text, "low support");
    assert.equal(queue.peek().priority, 20);
    assert.equal(queue.peek().enqueuedAt, 1000);
  });

  await test("dequeue returns highest priority item first", async () => {
    const clock = createClock();
    const queue = createOverlayQueue({
      nowTs: () => clock.now(),
      appendJsonLog() {}
    });

    queue.enqueue(
      makeItem({
        owner: "mia",
        stage: "chat",
        text: "chat one"
      })
    );

    clock.advance(10);
    queue.enqueue(
      makeItem({
        owner: "mia",
        stage: "support",
        tier: "T4",
        text: "gift t4"
      })
    );

    clock.advance(10);
    queue.enqueue(
      makeItem({
        owner: "mia",
        stage: "support",
        tier: "T2",
        text: "gift t2"
      })
    );

    const first = queue.dequeue();
    const second = queue.dequeue();
    const third = queue.dequeue();

    assert.equal(first.overlayPayload.text, "gift t4");
    assert.equal(first.priority, 100);

    assert.equal(second.overlayPayload.text, "gift t2");
    assert.equal(second.priority, 50);

    assert.equal(third.overlayPayload.text, "chat one");
    assert.equal(third.priority, 5);

    assert.equal(queue.size(), 0);
  });

  await test("same priority keeps FIFO order", async () => {
    const clock = createClock();
    const queue = createOverlayQueue({
      nowTs: () => clock.now(),
      appendJsonLog() {}
    });

    queue.enqueue(
      makeItem({
        owner: "mia",
        stage: "support",
        tier: "T1",
        text: "first t1"
      })
    );

    clock.advance(10);
    queue.enqueue(
      makeItem({
        owner: "kojnozout",
        stage: "support",
        tier: "T1",
        text: "second t1"
      })
    );

    const first = queue.dequeue();
    const second = queue.dequeue();

    assert.equal(first.overlayPayload.text, "first t1");
    assert.equal(second.overlayPayload.text, "second t1");
  });

  await test("voice stage gets priority 90", async () => {
    const queue = createOverlayQueue({
      appendJsonLog() {}
    });

    queue.enqueue(
      makeItem({
        owner: "mia",
        stage: "voice",
        text: "voice reply"
      })
    );

    assert.equal(queue.peek().priority, 90);
  });

  await test("tier priority mapping is correct", async () => {
    const queue = createOverlayQueue({
      appendJsonLog() {}
    });

    queue.enqueue(makeItem({ tier: "T1", text: "t1" }));
    queue.enqueue(makeItem({ tier: "T2", text: "t2" }));
    queue.enqueue(makeItem({ tier: "T3", text: "t3" }));
    queue.enqueue(makeItem({ tier: "T4", text: "t4" }));

    const p1 = queue.dequeue();
    const p2 = queue.dequeue();
    const p3 = queue.dequeue();
    const p4 = queue.dequeue();

    assert.equal(p1.overlayPayload.text, "t4");
    assert.equal(p1.priority, 100);

    assert.equal(p2.overlayPayload.text, "t3");
    assert.equal(p2.priority, 80);

    assert.equal(p3.overlayPayload.text, "t2");
    assert.equal(p3.priority, 50);

    assert.equal(p4.overlayPayload.text, "t1");
    assert.equal(p4.priority, 20);
  });

  await test("invalid enqueue input does not break queue", async () => {
    const queue = createOverlayQueue({
      appendJsonLog() {}
    });

    queue.enqueue(null);
    queue.enqueue(undefined);
    queue.enqueue("bad");
    queue.enqueue(123);

    assert.equal(queue.size(), 0);
    assert.equal(queue.peek(), null);
  });

  console.log("\n---- OVERLAY QUEUE SMOKE SUMMARY ----");
  console.log(`passed: ${results.passed}`);
  console.log(`failed: ${results.failed}`);

  if (results.failed > 0) {
    process.exit(1);
  }
})();