"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createIngestDeduper } = require("../scripts/MIA_INGEST_GUARD");
const { createEventContext } = require("../scripts/MIA_EVENT_CONTEXT");
const { phaseSession, phaseObserve, runEventPipeline } = require("../scripts/pipeline/run");

const ROOT = path.resolve(__dirname, "..");

function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`ok - ${name}`))
    .catch((err) => {
      console.error(`fail - ${name}`);
      throw err;
    });
}

function gift(id, extra = {}) {
  return {
    eventType: "GIFT",
    platform: "tiktok",
    eventId: `tiktok_gift_${id}`,
    trustedSourceId: id,
    eventIdentityTrusted: true,
    user: { nickname: "Tomino", userId: "viewer-1" },
    message: "",
    support: { giftId: "5655", giftName: "Rose", coins: 1, repeatCount: 1 },
    ...extra
  };
}

function untrustedGift() {
  return {
    eventType: "GIFT",
    platform: "tiktok",
    eventId: "tiktok_gift_synthesized",
    eventIdentityTrusted: false,
    trustedSourceId: null,
    user: { nickname: "Tomino", userId: "viewer-1" },
    message: "",
    support: { giftId: "5655", giftName: "Rose", coins: 1, repeatCount: 1 }
  };
}

function commentEvent() {
  return {
    eventType: "COMMENT",
    platform: "tiktok",
    user: { userId: "0", username: "Tester", nickname: "Tester" },
    message: "ahoj mia"
  };
}

function makeCtx(normalized) {
  return createEventContext(normalized, {
    normalizeIncomingEvent: () => normalized,
    upper: (value) => String(value || "").toUpperCase(),
    safeString: (value, fallback = "") =>
      value == null || value === "" ? fallback : String(value),
    getStreamSession: () => ({ phase: "LIVE" }),
    getGiftSupporterProfile: () => ({}),
    getGiftUserLedger: () => ({}),
    getLastGiftMapping: () => null,
    getStreamState: () => ({}),
    getOutputState: () => ({}),
    getOverlayState: () => ({}),
    getKojnozoutState: () => ({}),
    getEcosystemState: () => ({})
  });
}

function harness(options = {}) {
  const logs = [];
  const effects = { bowl: 0, economy: 0, world: 0 };
  let now = options.now || 1_000_000;
  const deduper = createIngestDeduper({
    nowTs: () => now,
    windowMs: 4500,
    appendJsonLog: (channel, entry) => logs.push({ channel, entry })
  });

  function writeLog(channel, entry) {
    logs.push({ channel, entry });
  }

  const deps = {
    streamSessionModule: { noteIngest: (session) => session || { phase: "LIVE" } },
    ingestDeduper: deduper,
    writeLog,
    safeString: (value, fallback = "") =>
      value == null || value === "" ? fallback : String(value),
    recordIngestSummary: () => {},
    t0EngagementModule: {},
    pushRecentParticipant: () => {},
    pushChatFeed: () => {},
    proactiveHostModule: {},
    handleSoloStreamChatActivity: async () => {},
    chatLexiconModule: {},
    sessionMemoryModule: {},
    chatBrain: {},
    runtimeConfig: {},
    immersiveSceneModule: {},
    getUserLabel: () => "Tomino",
    applyCareQuestProgress: (normalized) => {
      const state = deduper.checkDuplicate(normalized);
      assert.equal(state.reason, "trusted_source_committed");
      effects.bowl += 1;
      return { questCompleted: false };
    },
    deliverQuestCompleteMoment: async () => {},
    setStreamSession: () => {},
    setGiftSupporterProfile: () => {},
    setGiftUserLedger: () => {},
    setLastGiftMapping: () => {},
    setStreamState: () => {}
  };

  async function observe(ctx) {
    return phaseObserve(ctx, deps);
  }

  async function economyWorld(ctx) {
    if (ctx.meta && ctx.meta.skipEconomy) return ctx;
    effects.economy += 1;
    effects.world += 1;
    return ctx;
  }

  return {
    logs,
    effects,
    deduper,
    deps,
    observe,
    economyWorld,
    setNow(value) {
      now = value;
    },
    advance(ms) {
      now += ms;
    }
  };
}

function hasLog(logs, channel, reason) {
  return logs.some(
    (row) => row.channel === channel && (!reason || row.entry?.reason === reason)
  );
}

async function run() {
  await test("commit sits before the first irreversible gift write", () => {
    const observeSrc = fs.readFileSync(
      path.join(ROOT, "scripts/pipeline/phase_observe.js"),
      "utf8"
    );
    const momentsSrc = fs.readFileSync(
      path.join(ROOT, "scripts/MIA_KOJ_MOMENTS_RUNTIME.js"),
      "utf8"
    );
    const commitAt = observeSrc.indexOf("commitTrustedGift");
    const careAt = observeSrc.indexOf("applyCareQuestProgress(normalized)");
    const questFn = momentsSrc.slice(momentsSrc.indexOf("function applyCareQuestProgress"));
    const setAt = questFn.indexOf("setKojnozoutState(kojnozoutState)");
    const saveAt = questFn.indexOf("scheduleSaveKojnozoutState");
    assert.ok(commitAt > 0 && careAt > commitAt);
    assert.ok(setAt > 0 && saveAt > setAt);
  });

  await test("pending reservation does not expire into a second execution", () => {
    const env = harness();
    const first = env.deduper.checkDuplicate(gift("hold"));
    assert.equal(first.duplicate, false);
    assert.equal(first.reservation, "pending");
    env.advance(10_000);
    const second = env.deduper.checkDuplicate(gift("hold"));
    assert.equal(second.duplicate, true);
    assert.equal(second.reason, "trusted_source_pending");
    assert.equal(second.reservation, "pending");
  });

  await test("committed gift stays duplicate for the 4.5s window", () => {
    const env = harness();
    assert.equal(env.deduper.checkDuplicate(gift("win")).duplicate, false);
    assert.equal(env.deduper.commitTrustedGift(gift("win")).committed, true);
    env.advance(4499);
    const inside = env.deduper.checkDuplicate(gift("win"));
    assert.equal(inside.duplicate, true);
    assert.equal(inside.reason, "trusted_source_committed");
    env.advance(1);
    const expired = env.deduper.checkDuplicate(gift("win"));
    assert.equal(expired.duplicate, false);
    assert.equal(expired.reservation, "pending");
  });

  await test("failure before gift side effects releases the reservation and admits a retry", async () => {
    const env = harness();
    const normalized = gift("retry-before");
    const phases = [
      phaseSession,
      async () => {
        throw new Error("before-side-effects");
      },
      env.observe,
      env.economyWorld
    ];

    await assert.rejects(
      () => runEventPipeline(makeCtx(normalized), env.deps, phases),
      /before-side-effects/
    );
    assert.equal(env.effects.bowl, 0);
    assert.equal(env.effects.economy, 0);
    assert.equal(env.effects.world, 0);
    assert.equal(hasLog(env.logs, "ingest-dedupe-lifecycle", "reservation_released_before_side_effects"), true);
    assert.equal(hasLog(env.logs, "ingest-deduped"), false);
    assert.equal(hasLog(env.logs, "ingest-dedupe-lifecycle", "downstream_failure_after_commit"), false);

    const retry = await runEventPipeline(makeCtx(normalized), env.deps, [
      phaseSession,
      env.observe,
      env.economyWorld
    ]);
    assert.equal(retry.body.ok, true);
    assert.equal(retry.body.deduped, undefined);
    assert.equal(env.effects.bowl, 1);
    assert.equal(env.effects.economy, 1);
    assert.equal(env.effects.world, 1);
  });

  await test("a second trusted gift does not execute while the first reservation is pending", async () => {
    const env = harness();
    let entered = 0;
    let release;
    const hold = new Promise((resolve) => {
      release = resolve;
    });
    const normalized = gift("inflight");
    const phases = [
      phaseSession,
      async (ctx) => {
        entered += 1;
        if (entered === 1) await hold;
        return env.observe(ctx);
      },
      env.economyWorld
    ];

    const first = runEventPipeline(makeCtx(normalized), env.deps, phases);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(entered, 1);

    const second = await runEventPipeline(makeCtx(normalized), env.deps, phases);
    assert.equal(second.body.deduped, true);
    assert.equal(entered, 1);
    assert.equal(env.effects.bowl, 0);
    assert.equal(env.effects.economy, 0);
    assert.equal(hasLog(env.logs, "ingest-deduped", "trusted_source_pending"), true);

    release();
    const finished = await first;
    assert.equal(finished.body.ok, true);
    assert.equal(entered, 1);
    assert.equal(env.effects.bowl, 1);
    assert.equal(env.effects.economy, 1);
    assert.equal(env.effects.world, 1);
  });

  await test("a successful trusted gift suppresses a retry inside the window", async () => {
    const env = harness();
    const normalized = gift("done");
    const phases = [phaseSession, env.observe, env.economyWorld];
    const first = await runEventPipeline(makeCtx(normalized), env.deps, phases);
    const second = await runEventPipeline(makeCtx(normalized), env.deps, phases);
    assert.equal(first.body.ok, true);
    assert.equal(second.body.deduped, true);
    assert.equal(env.effects.bowl, 1);
    assert.equal(env.effects.economy, 1);
    assert.equal(env.effects.world, 1);
    assert.equal(hasLog(env.logs, "ingest-deduped", "trusted_source_committed"), true);
  });

  await test("failure after gift side effects keeps the id committed and does not replay bowl economy or world", async () => {
    const env = harness();
    const normalized = gift("after");
    const phases = [
      phaseSession,
      env.observe,
      async (ctx) => {
        await env.economyWorld(ctx);
        throw new Error("downstream-after-commit");
      }
    ];

    await assert.rejects(
      () => runEventPipeline(makeCtx(normalized), env.deps, phases),
      /downstream-after-commit/
    );
    assert.equal(env.effects.bowl, 1);
    assert.equal(env.effects.economy, 1);
    assert.equal(env.effects.world, 1);
    assert.equal(hasLog(env.logs, "ingest-dedupe-lifecycle", "downstream_failure_after_commit"), true);
    assert.equal(hasLog(env.logs, "ingest-dedupe-lifecycle", "reservation_released_before_side_effects"), false);

    const retry = await runEventPipeline(makeCtx(normalized), env.deps, phases);
    assert.equal(retry.body.deduped, true);
    assert.equal(env.effects.bowl, 1);
    assert.equal(env.effects.economy, 1);
    assert.equal(env.effects.world, 1);
    assert.equal(hasLog(env.logs, "ingest-deduped", "trusted_source_committed"), true);
  });

  await test("a swallowed care-quest error after commit does not release the reservation", async () => {
    const env = harness();
    env.deps.applyCareQuestProgress = () => {
      env.effects.bowl += 1;
      throw new Error("care-after-commit");
    };
    const normalized = gift("care-throw");
    const phases = [phaseSession, env.observe, env.economyWorld];
    const first = await runEventPipeline(makeCtx(normalized), env.deps, phases);
    assert.equal(first.body.ok, true);
    assert.equal(env.effects.bowl, 1);
    assert.equal(env.effects.economy, 1);
    assert.equal(hasLog(env.logs, "ingest-dedupe-lifecycle", "reservation_released_before_side_effects"), false);

    const retry = await runEventPipeline(makeCtx(normalized), env.deps, phases);
    assert.equal(retry.body.deduped, true);
    assert.equal(env.effects.bowl, 1);
    assert.equal(env.effects.economy, 1);
    assert.equal(env.effects.world, 1);
  });

  await test("different trusted gift ids both process", async () => {
    const env = harness();
    const phases = [phaseSession, env.observe, env.economyWorld];
    const first = await runEventPipeline(makeCtx(gift("one")), env.deps, phases);
    const second = await runEventPipeline(makeCtx(gift("two")), env.deps, phases);
    assert.equal(first.body.ok, true);
    assert.equal(second.body.ok, true);
    assert.equal(env.effects.bowl, 2);
    assert.equal(env.effects.economy, 2);
    assert.equal(env.effects.world, 2);
    assert.equal(hasLog(env.logs, "ingest-deduped"), false);
  });

  await test("untrusted gifts stay admitted and do not reserve a trusted id", async () => {
    const env = harness();
    env.deps.applyCareQuestProgress = () => {
      env.effects.bowl += 1;
      return { questCompleted: false };
    };
    const phases = [phaseSession, env.observe, env.economyWorld];
    const first = await runEventPipeline(makeCtx(untrustedGift()), env.deps, phases);
    const second = await runEventPipeline(makeCtx(untrustedGift()), env.deps, phases);
    assert.equal(first.body.ok, true);
    assert.equal(second.body.ok, true);
    assert.equal(env.effects.bowl, 2);
    assert.equal(env.effects.economy, 2);
    assert.equal(hasLog(env.logs, "ingest-identity", "no_trusted_gift_source_id"), true);
    assert.equal(hasLog(env.logs, "ingest-deduped"), false);
    assert.equal(hasLog(env.logs, "ingest-dedupe-lifecycle"), false);
    assert.equal(
      env.logs.filter((row) => row.channel === "ingest-identity").length,
      2
    );
  });

  await test("non-gift dedupe still records immediately and is unchanged by gift reservation", async () => {
    const env = harness();
    const phases = [
      phaseSession,
      async () => {
        throw new Error("comment-failed");
      }
    ];
    await assert.rejects(
      () => runEventPipeline(makeCtx(commentEvent()), env.deps, phases),
      /comment-failed/
    );
    const retry = await runEventPipeline(makeCtx(commentEvent()), env.deps, [phaseSession]);
    assert.equal(retry.body.deduped, true);
    assert.equal(hasLog(env.logs, "ingest-deduped"), true);
    assert.equal(hasLog(env.logs, "ingest-dedupe-lifecycle"), false);
    const deduped = env.logs.find((row) => row.channel === "ingest-deduped");
    assert.equal(deduped.entry.reason, null);
    assert.equal(deduped.entry.reservation, null);
    assert.equal(env.deduper.checkDuplicate(commentEvent()).duplicate, true);
    assert.equal(env.deduper.abortTrustedGift(commentEvent(), new Error("nope")).action, "ignored");
  });

  console.log("gift_dedupe_lifecycle_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
