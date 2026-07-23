"use strict";

const assert = require("assert/strict");
const {
  PRIORITY,
  createActionQueue,
  createActionQueueRunner,
  resolveSpeakPriority,
  resolvePriorityFromTier,
  resolveCoalesceWindowMs,
  applyDirectorIntensityToPriority,
  isActionQueueEnabled,
  setActionQueueEnabled,
  eventToQueueAction,
  giftPresentToQueueAction,
  flushSharedActionQueue,
  getSharedActionQueue,
  resetSharedActionQueueForTest
} = require("../core/action-queue");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("priorities match roadmap order", () => {
  assert.equal(PRIORITY.technical_error, 100);
  assert.equal(PRIORITY.t4_gift, 90);
  assert.equal(PRIORITY.battle_result, 85);
  assert.equal(PRIORITY.t3_gift, 70);
  assert.equal(PRIORITY.t2_gift, 60);
  assert.equal(PRIORITY.mia_direct, 50);
  assert.equal(PRIORITY.t1_gift, 40);
  assert.equal(PRIORITY.idle, 10);
  assert.ok(PRIORITY.t4_gift > PRIORITY.t1_gift);
});

test("resolvePriorityFromTier", () => {
  assert.equal(resolvePriorityFromTier("T4"), PRIORITY.t4_gift);
  assert.equal(resolvePriorityFromTier("T1"), PRIORITY.t1_gift);
});

test("enqueue / dequeue by priority", () => {
  const q = createActionQueue({ maxSize: 10 });
  q.enqueue({ type: "tts_speak", priority: PRIORITY.t1_gift, payload: { n: 1 } });
  q.enqueue({ type: "tts_speak", priority: PRIORITY.t4_gift, payload: { n: 4 } });
  q.enqueue({ type: "idle", priority: PRIORITY.idle, payload: { n: 0 } });

  const first = q.dequeue();
  assert.equal(first.priority, PRIORITY.t4_gift);
  assert.equal(first.payload.n, 4);
  assert.equal(q.dequeue().payload.n, 1);
});

test("coalesce spam gifts with same coalesceKey", () => {
  const q = createActionQueue({ coalesceWindowMs: 5000 });
  const a = q.enqueue({
    type: "tts_speak",
    priority: PRIORITY.t1_gift,
    coalesceKey: "tts:pepa:T1",
    payload: { text: "díky" }
  });
  assert.equal(a.coalesced, false);

  const b = q.enqueue({
    type: "tts_speak",
    priority: PRIORITY.t1_gift,
    coalesceKey: "tts:pepa:T1",
    payload: { text: "díky znovu" }
  });
  assert.equal(b.coalesced, true);
  assert.equal(b.action.count, 2);
  assert.equal(q.size(), 1);
});

test("gift_thanks coalesce respects director window on action", () => {
  const q = createActionQueue({ coalesceWindowMs: 200 });
  q.enqueue({
    type: "gift_thanks",
    priority: PRIORITY.t1_gift,
    coalesceKey: "tts:u:T1",
    coalesceWindowMs: 5000,
    payload: { text: "a", directorCoalesceMs: 5000 }
  });
  const b = q.enqueue({
    type: "gift_thanks",
    priority: PRIORITY.t1_gift,
    coalesceKey: "tts:u:T1",
    coalesceWindowMs: 5000,
    payload: { text: "b", directorCoalesceMs: 5000 }
  });
  assert.equal(b.coalesced, true);
  assert.equal(b.action.count, 2);
});

test("interrupt: high priority preempts current", () => {
  const q = createActionQueue();
  q.enqueue({ type: "tts_speak", priority: PRIORITY.t1_gift, id: "low" });
  const low = q.dequeue();
  assert.equal(low.id, "low");

  const hi = q.enqueue({
    type: "tts_speak",
    priority: PRIORITY.t4_gift,
    preempt: true,
    id: "hi"
  });
  assert.equal(hi.interrupted, true);
});

test("interrupt: director intensity can preempt lower speak", () => {
  const q = createActionQueue();
  q.enqueue({ type: "gift_thanks", priority: PRIORITY.t1_gift, id: "calm" });
  q.dequeue();
  const hi = q.enqueue({
    type: "gift_thanks",
    priority: PRIORITY.t2_gift,
    directorIntensity: 0.9,
    id: "spectacle"
  });
  assert.equal(hi.interrupted, true);
});

test("resolveSpeakPriority from plan tier", () => {
  assert.equal(resolveSpeakPriority({ tier: "T3" }, {}), PRIORITY.t3_gift);
});

test("director intensity bumps speak priority", () => {
  assert.equal(
    applyDirectorIntensityToPriority(PRIORITY.t1_gift, 0.95),
    PRIORITY.t4_gift
  );
  assert.equal(
    resolveSpeakPriority({ tier: "T1", directorIntensity: 0.8 }, {}),
    PRIORITY.t3_gift
  );
  assert.equal(
    resolveSpeakPriority({ tier: "T1", director: { intensity: 0.6 } }, {}),
    PRIORITY.t2_gift
  );
});

test("resolveCoalesceWindowMs prefers director policy", () => {
  assert.equal(
    resolveCoalesceWindowMs({ directorCoalesceMs: 3200 }, {}, 2500),
    3200
  );
  assert.equal(
    resolveCoalesceWindowMs({}, { phase1: { actionQueue: { coalesceWindowMs: 1800 } } }),
    1800
  );
});

test("action queue disabled by default; phase1 config + kill switch", () => {
  const prev = process.env.MIA_ACTION_QUEUE;
  delete process.env.MIA_ACTION_QUEUE;
  resetSharedActionQueueForTest();
  assert.equal(isActionQueueEnabled({}), false);
  assert.equal(
    isActionQueueEnabled({ phase1: { actionQueue: { enabled: true } } }),
    true
  );
  assert.equal(isActionQueueEnabled({ actionQueue: { enabled: true } }), true);

  process.env.MIA_ACTION_QUEUE = "1";
  assert.equal(isActionQueueEnabled({}), true);

  process.env.MIA_ACTION_QUEUE = "0";
  assert.equal(isActionQueueEnabled({ phase1: { actionQueue: { enabled: true } } }), false);

  if (prev === undefined) delete process.env.MIA_ACTION_QUEUE;
  else process.env.MIA_ACTION_QUEUE = prev;
  resetSharedActionQueueForTest();
});

test("admin setActionQueueEnabled toggles without env", () => {
  const prev = process.env.MIA_ACTION_QUEUE;
  delete process.env.MIA_ACTION_QUEUE;
  resetSharedActionQueueForTest();
  const runtime = { phase1: { actionQueue: { enabled: false } } };
  const on = setActionQueueEnabled(true, runtime);
  assert.equal(on.ok, true);
  assert.equal(runtime.phase1.actionQueue.enabled, true);
  assert.equal(isActionQueueEnabled(runtime), true);
  const off = setActionQueueEnabled(false, runtime);
  assert.equal(off.enabled, false);
  assert.equal(runtime.phase1.actionQueue.enabled, false);
  if (prev === undefined) delete process.env.MIA_ACTION_QUEUE;
  else process.env.MIA_ACTION_QUEUE = prev;
  resetSharedActionQueueForTest();
});

test("eventToQueueAction maps gift and chat", () => {
  const gift = eventToQueueAction({
    type: "gift",
    user: { id: "u1", name: "Pepa" },
    gift: { name: "Rose", miaPoints: 7.5 }
  });
  assert.equal(gift.type, "tts_speak");
  assert.ok(gift.coalesceKey.includes("u1"));

  const chat = eventToQueueAction({
    type: "chat",
    user: { name: "Ada" },
    text: "ahoj"
  });
  assert.equal(chat.type, "overlay");
});

test("giftPresentToQueueAction uses miaPoints only + coalesce key", () => {
  const shell = giftPresentToQueueAction({
    userId: "u9",
    userLabel: "Ada",
    giftKey: "ROSE",
    giftName: "Rose",
    tier: "T1",
    miaPoints: 7.5
  });
  assert.equal(shell.type, "gift_present");
  assert.equal(shell.payload.miaPoints, 7.5);
  assert.equal(shell.payload.coins, undefined);
  assert.ok(shell.coalesceKey.includes("ROSE"));
  assert.equal(shell.priority, PRIORITY.t1_gift);
});

test("gift_present coalesce spam", () => {
  const q = createActionQueue({ coalesceWindowMs: 4000 });
  const a = q.enqueue(
    giftPresentToQueueAction({
      userId: "u1",
      giftKey: "ROSE",
      tier: "T1",
      miaPoints: 7.5
    })
  );
  const b = q.enqueue(
    giftPresentToQueueAction({
      userId: "u1",
      giftKey: "ROSE",
      tier: "T1",
      miaPoints: 7.5
    })
  );
  assert.equal(a.coalesced, false);
  assert.equal(b.coalesced, true);
  assert.equal(q.size(), 1);
});

test("flush shared queue", () => {
  resetSharedActionQueueForTest();
  const q = getSharedActionQueue();
  q.enqueue({ type: "idle", priority: PRIORITY.idle });
  assert.ok(q.size() >= 1);
  const flushed = flushSharedActionQueue();
  assert.equal(flushed.ok, true);
  assert.equal(q.size(), 0);
  resetSharedActionQueueForTest();
});

(async () => {
  await testAsync("runner drains speak + overlay + gift_present", async () => {
    const q = createActionQueue();
    const seen = [];
    q.enqueue({ type: "overlay", priority: PRIORITY.mia_direct, payload: { text: "hi" } });
    q.enqueue({
      type: "tts_speak",
      priority: PRIORITY.t4_gift,
      payload: { text: "thanks" }
    });
    q.enqueue({
      type: "gift_present",
      priority: PRIORITY.t3_gift,
      payload: { giftKey: "LION", miaPoints: 7500 }
    });
    const runner = createActionQueueRunner(q, {
      speak: async (action) => {
        seen.push(`speak:${action.payload.text}`);
        return { ok: true };
      },
      overlay: async (action) => {
        seen.push(`overlay:${action.payload.text}`);
        return { ok: true };
      },
      giftPresent: async (action) => {
        seen.push(`gift:${action.payload.giftKey}`);
        return { ok: true };
      }
    });
    const result = await runner.drainOnce();
    assert.equal(result.processed, 3);
    assert.deepEqual(seen, ["speak:thanks", "gift:LION", "overlay:hi"]);
    assert.equal(q.size(), 0);
  });

  console.log("phase1_action_queue_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
