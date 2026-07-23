"use strict";

const assert = require("assert/strict");
const { createOverlayQueue } = require("../scripts/MIA_OVERLAY_QUEUE");
const { createVoicePriorityLayer } = require("../scripts/MIA_VOICE_PRIORITY");

const results = { passed: 0, failed: 0 };

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

function createClock(start = 10_000) {
  let current = start;
  return {
    now() {
      return current;
    },
    advance(ms) {
      current += Number(ms || 0);
    }
  };
}

function simulateExecuteOverlayImmediate({ payload, context, voicePriorityLayer, overlayQueue, emitted }) {
  if (voicePriorityLayer && typeof voicePriorityLayer.shouldBlockOverlay === "function") {
    const block = voicePriorityLayer.shouldBlockOverlay(payload);
    if (block?.blocked) {
      if (overlayQueue && context.fromQueue !== true) {
        overlayQueue.enqueue({ overlayPayload: payload, context });
        return {
          ok: true,
          emitted: false,
          reason: "overlay_queued",
          meta: { queued: true, queueSize: overlayQueue.size() }
        };
      }
      return { ok: true, emitted: false, reason: block.reason };
    }
  }

  emitted.push(payload);
  return { ok: true, emitted: true, reason: "ok" };
}

async function flushOverlayQueue({ overlayQueue, voicePriorityLayer, emitted }) {
  while (overlayQueue.size() > 0) {
    const nextItem = overlayQueue.peek();
    if (!nextItem) break;

    const block = voicePriorityLayer.shouldBlockOverlay(nextItem.overlayPayload);
    if (block?.blocked) break;

    const item = overlayQueue.dequeue();
    simulateExecuteOverlayImmediate({
      payload: item.overlayPayload,
      context: { ...(item.context || {}), fromQueue: true },
      voicePriorityLayer,
      overlayQueue,
      emitted
    });
  }
}

(async () => {
  await test("blocked koj overlay is queued during MIA voice lock and flushed after expiry", async () => {
    const clock = createClock();
    const voicePriorityLayer = createVoicePriorityLayer({
      nowTs: () => clock.now(),
      appendJsonLog() {}
    });
    const overlayQueue = createOverlayQueue({
      nowTs: () => clock.now(),
      appendJsonLog() {}
    });
    const emitted = [];

    voicePriorityLayer.activateVoicePriority({
      owner: "mia",
      stage: "voice",
      source: "tts_primary",
      holdMs: 2000
    });

    const queued = simulateExecuteOverlayImmediate({
      payload: { owner: "kojnozout", stage: "support", text: "Ham ham." },
      context: { source: "gift" },
      voicePriorityLayer,
      overlayQueue,
      emitted
    });

    assert.equal(queued.reason, "overlay_queued");
    assert.equal(overlayQueue.size(), 1);
    assert.equal(emitted.length, 0);

    clock.advance(2001);
    await flushOverlayQueue({ overlayQueue, voicePriorityLayer, emitted });

    assert.equal(overlayQueue.size(), 0);
    assert.equal(emitted.length, 1);
    assert.equal(emitted[0].text, "Ham ham.");
  });

  await test("high tier gift bypasses queue and emits immediately", async () => {
    const clock = createClock();
    const voicePriorityLayer = createVoicePriorityLayer({
      nowTs: () => clock.now(),
      appendJsonLog() {}
    });
    const overlayQueue = createOverlayQueue({
      nowTs: () => clock.now(),
      appendJsonLog() {}
    });
    const emitted = [];

    voicePriorityLayer.activateVoicePriority({
      owner: "mia",
      stage: "voice",
      holdMs: 5000
    });

    const result = simulateExecuteOverlayImmediate({
      payload: { owner: "kojnozout", stage: "support", tier: "T4", text: "Mega gift!" },
      context: { source: "gift" },
      voicePriorityLayer,
      overlayQueue,
      emitted
    });

    assert.equal(result.emitted, true);
    assert.equal(overlayQueue.size(), 0);
    assert.equal(emitted.length, 1);
  });

  await test("queue drains highest priority overlay first after lock clears", async () => {
    const clock = createClock();
    const voicePriorityLayer = createVoicePriorityLayer({
      nowTs: () => clock.now(),
      appendJsonLog() {}
    });
    const overlayQueue = createOverlayQueue({
      nowTs: () => clock.now(),
      appendJsonLog() {}
    });
    const emitted = [];

    voicePriorityLayer.activateVoicePriority({
      owner: "mia",
      stage: "voice",
      holdMs: 1000
    });

    simulateExecuteOverlayImmediate({
      payload: { owner: "kojnozout", stage: "chat", text: "chat low" },
      context: {},
      voicePriorityLayer,
      overlayQueue,
      emitted
    });
    simulateExecuteOverlayImmediate({
      payload: { owner: "kojnozout", stage: "support", tier: "T2", text: "gift t2" },
      context: {},
      voicePriorityLayer,
      overlayQueue,
      emitted
    });

    assert.equal(overlayQueue.size(), 2);

    clock.advance(1001);
    await flushOverlayQueue({ overlayQueue, voicePriorityLayer, emitted });

    assert.equal(emitted.length, 2);
    assert.equal(emitted[0].text, "gift t2");
    assert.equal(emitted[1].text, "chat low");
  });

  console.log("\n---- OVERLAY VOICE QUEUE INTEGRATION SMOKE SUMMARY ----");
  console.log(`passed: ${results.passed}`);
  console.log(`failed: ${results.failed}`);

  if (results.failed > 0) {
    process.exit(1);
  }
})();
