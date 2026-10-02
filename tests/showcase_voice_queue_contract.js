"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createDeliveryRuntime } = require("../scripts/MIA_DELIVERY_RUNTIME");
const { createShowcaseRuntime } = require("../scripts/MIA_SHOWCASE_RUNTIME");
const {
  runKojStateShowcase,
  KOJ_STATE_SHOWCASE,
  getShowcaseKojForce
} = require("../scripts/MIA_STREAMER_SHOWCASE");
const {
  getSharedActionQueue,
  resetSharedActionQueueForTest
} = require("../core/action-queue");

const ROOT = path.resolve(__dirname, "..");
const PREV_ACTION_QUEUE = process.env.MIA_ACTION_QUEUE;

function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`ok - ${name}`))
    .catch((err) => {
      console.error(`fail - ${name}`);
      throw err;
    });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function withClock(run) {
  const originalNow = Date.now;
  let clock = originalNow();
  Date.now = () => clock;
  return Promise.resolve()
    .then(() => run({ advance(ms) { clock += Number(ms) || 0; } }))
    .finally(() => {
      Date.now = originalNow;
    });
}

function speakOk(text, spoken) {
  spoken.push(text);
  return {
    ok: true,
    audioUrl: `/audio-cache/${spoken.length}.mp3`,
    durationMs: 1000,
    voice: "mock-voice",
    provider: "mock"
  };
}

function assertNoFunctions(value, label) {
  const seen = new Set();
  const found = [];
  function walk(node, nodePath) {
    if (typeof node === "function") {
      found.push(nodePath);
      return;
    }
    if (!node || typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);
    for (const key of Object.keys(node)) {
      walk(node[key], `${nodePath}.${key}`);
    }
  }
  walk(value, label);
  assert.deepEqual(found, []);
}

function createHarness(options = {}) {
  const spoken = [];
  const showcaseMirrors = [];
  const invalidations = [];
  const deliveryOverlays = [];
  const replies = [];
  const logs = [];
  const voiceCalls = [];
  let holdMs = options.holdMs == null ? 60000 : options.holdMs;

  const delivery = createDeliveryRuntime({
    runtimeConfig: { voice: {} },
    writeLog: (_file, row) => logs.push(row),
    safeString,
    cloneJson: (value, fallback) => value || fallback,
    setOverlay: (payload) => {
      deliveryOverlays.push(payload);
      return { accepted: true };
    },
    getOverlayState: () => ({}),
    invalidateOverlayStateCache: () => {},
    getOutputState: () => ({}),
    getKojnozoutState: () => ({}),
    getObsConnected: () => false,
    getUserLabel: () => "Tomino",
    tryAutoBossMissionFromGift: async () => null,
    speakerRoutingModule: {},
    ttsEngine: {
      resolveConfig: () => ({ enabled: options.ttsEnabled !== false }),
      speak: async (payload) => {
        if (typeof options.speak === "function") {
          return options.speak(payload, { spoken, logs });
        }
        return speakOk(payload.text, spoken);
      }
    },
    languageModule: { resolveDefaultLanguage: () => "cs" },
    sessionMemoryModule: {
      observeBotReply(entry) {
        replies.push(entry);
      }
    },
    voiceHoldUntilTs: (now) => now + holdMs
  });

  const originalDeliver = delivery.maybeDeliverMiaVoice.bind(delivery);
  delivery.maybeDeliverMiaVoice = async (actionResult, plan, deliveryOptions) => {
    const result = await originalDeliver(actionResult, plan, deliveryOptions);
    voiceCalls.push({ actionResult, plan, deliveryOptions, result });
    return result;
  };

  const showcase = createShowcaseRuntime({
    safeString,
    ttsEngine: {
      resolveConfig: () => ({ enabled: options.ttsEnabled !== false }),
      speak: async () => ({ ok: true })
    },
    runtimeConfig: {},
    deliveryRuntime: () => delivery,
    mirrorSpeechOverlayFromVoice: (row) => {
      showcaseMirrors.push(row);
      return delivery.mirrorSpeechOverlayFromVoice(row);
    },
    invalidateOverlayStateCache: () => {
      invalidations.push(showcaseMirrors.length);
    }
  });

  async function sayPaid(text = "PAID-A", eventId = `${text}-id`) {
    return delivery.maybeDeliverMiaVoice(
      {
        ok: true,
        route: "support",
        eventType: "GIFT",
        tier: "T4",
        meta: { eventId, userId: "payer-a", source: "gift" },
        overlayPayload: { owner: "mia", text, userLabel: "Tomino" }
      },
      {
        shouldSpeak: true,
        text,
        voiceMode: "primary",
        voiceSpeaker: "mia",
        primaryOwner: "mia",
        tier: "T4",
        source: "gift",
        eventId
      }
    );
  }

  function setHold(ms) {
    holdMs = ms;
  }

  async function release() {
    holdMs = 40;
    delivery.setVoicePlaybackState(null);
    let spins = 0;
    while (delivery.getVoiceSpeakQueueLength() > 0) {
      spins += 1;
      if (spins > 200) {
        throw new Error(`queue did not drain, length=${delivery.getVoiceSpeakQueueLength()}`);
      }
      await sleep(20);
    }
    await sleep(30);
  }

  return {
    delivery,
    spoken,
    showcaseMirrors,
    invalidations,
    deliveryOverlays,
    replies,
    logs,
    voiceCalls,
    speak: showcase.speakMiaShowcaseLine,
    sayPaid,
    setHold,
    release
  };
}

function overlaySources(overlays) {
  return overlays.map((row) => row?.meta?.source || null);
}

async function run() {
  process.env.MIA_ACTION_QUEUE = "0";
  resetSharedActionQueueForTest();

  await test("free showcase starts immediately and waits out its own hold", async () => {
    const harness = createHarness({ holdMs: 220 });
    let resolved = false;
    const pending = harness.speak("Koj je happy", "mia").then((result) => {
      resolved = true;
      return result;
    });

    await sleep(40);
    assert.equal(resolved, false);
    assert.deepEqual(harness.spoken, ["Koj je happy"]);
    const playback = harness.delivery.getVoicePlaybackState();
    assert.equal(playback.audioSink, "mia_voice");
    assert.equal(playback.exclusiveAudio, true);
    assert.equal(playback.textPreview, "Koj je happy");
    assert.equal(harness.showcaseMirrors.length, 1);
    assert.equal(harness.showcaseMirrors[0].source, "koj_state_showcase_voice");
    assert.equal(harness.showcaseMirrors[0].speaker, "mia");
    assert.equal(harness.showcaseMirrors[0].text, "Koj je happy");
    assert.equal(harness.showcaseMirrors[0].holdUntilTs, playback.holdUntilTs);
    assert.deepEqual(overlaySources(harness.deliveryOverlays), ["koj_state_showcase_voice"]);
    assert.equal(harness.invalidations.length, 1);
    assert.equal(harness.replies.length, 0);

    const call = harness.voiceCalls.find((row) => row.plan?.source === "koj_state_showcase_voice");
    assert.equal(call.plan.voiceMode, "primary");
    assert.equal(call.plan.voiceSpeaker, "mia");
    assert.equal(call.plan.primaryOwner, "mia");
    assert.equal(call.plan.recordReply, false);
    assert.equal(call.plan.eventId, undefined);
    assert.equal(call.plan.preempt, undefined);
    assert.equal(call.deliveryOptions.bypassActionQueue, true);
    assert.equal(call.result.voiceAdmission.started, true);

    const result = await pending;
    assert.equal(resolved, true);
    assert.equal(result.ok, true);
    assert.equal(result.started, true);
    assert.ok(result.waitMs >= 150 && result.waitMs <= 220);
    assert.equal(harness.showcaseMirrors.length, 1);
  });

  await test("showcase wait uses playback hold and caps at 9000ms", async () => {
    const harness = createHarness({ holdMs: 20000 });
    const original = global.setTimeout;
    const delays = [];
    global.setTimeout = (fn, ms, ...args) => {
      delays.push(ms);
      return original(fn, ms >= 9000 ? 15 : ms, ...args);
    };
    try {
      const result = await harness.speak("Dlouhý popis stavu");
      assert.equal(result.ok, true);
      assert.equal(result.waitMs, 9000);
      assert.ok(delays.includes(9000));
      assert.equal(harness.showcaseMirrors.length, 1);
      assert.deepEqual(overlaySources(harness.deliveryOverlays), ["koj_state_showcase_voice"]);
    } finally {
      global.setTimeout = original;
      harness.setHold(30);
      await harness.delivery.maybeDeliverMiaVoice(
        {
          ok: true,
          route: "system",
          overlayPayload: { owner: "mia", route: "system", text: "cap-release" }
        },
        {
          shouldSpeak: true,
          text: "cap-release",
          voiceMode: "primary",
          voiceSpeaker: "mia",
          primaryOwner: "mia",
          source: "cap_release",
          recordReply: false
        },
        { bypassActionQueue: true }
      );
      harness.delivery.setVoicePlaybackState(null);
      await sleep(80);
    }
  });

  await test("paid playback keeps the showcase sequence paused until that line's hold", async () => {
    const harness = createHarness({ holdMs: 60000 });
    await harness.sayPaid("PAID-A");
    let resolved = false;
    const pending = harness.speak("Koj je happy").then((result) => {
      resolved = true;
      return result;
    });

    await sleep(50);
    assert.equal(resolved, false);
    assert.deepEqual(harness.spoken, ["PAID-A"]);
    assert.equal(harness.showcaseMirrors.length, 0);
    assert.equal(harness.delivery.getVoiceSpeakQueueLength(), 1);
    assert.equal(
      harness.logs.find(
        (entry) => entry.stage === "voice_speak_queued" && entry.textPreview === "Koj je happy"
      )?.voiceClass,
      "system"
    );
    const waiting = harness.delivery.getVoicePlaybackSnapshot();
    assert.equal(waiting.queueLength, 1);
    assert.equal(waiting.textPreview, "PAID-A");

    harness.setHold(240);
    harness.delivery.setVoicePlaybackState({ holdUntilTs: Date.now() - 1 });
    await sleep(40);
    assert.equal(resolved, false);
    assert.deepEqual(harness.spoken, ["PAID-A", "Koj je happy"]);
    assert.equal(harness.showcaseMirrors.length, 1);
    assert.equal(harness.showcaseMirrors[0].source, "koj_state_showcase_voice");
    const playback = harness.delivery.getVoicePlaybackState();
    assert.equal(playback.audioSink, "mia_voice");
    assert.equal(playback.exclusiveAudio, true);
    assert.equal(harness.showcaseMirrors[0].holdUntilTs, playback.holdUntilTs);

    const result = await pending;
    assert.equal(resolved, true);
    assert.equal(result.ok, true);
    assert.ok(result.waitMs >= 160 && result.waitMs <= 240);
    assert.equal(harness.showcaseMirrors.length, 1);
    assert.equal(
      harness.deliveryOverlays.some(
        (row) => row?.meta?.source === "tts_primary_mirror" && row.text === "Koj je happy"
      ),
      false
    );
    assert.equal(
      harness.deliveryOverlays.some(
        (row) =>
          row?.meta?.source === "koj_state_showcase_voice" && row.text === "Koj je happy"
      ),
      true
    );
  });

  await test("stale showcase drop resolves without synthesis or mirror", async () => {
    await withClock(async ({ advance }) => {
      const harness = createHarness({ holdMs: 60000 });
      await harness.sayPaid("PAID-A");
      let resolved = false;
      const pending = harness.speak("Koj čeká").then((result) => {
        resolved = true;
        return result;
      });
      await sleep(30);
      assert.equal(resolved, false);
      assert.deepEqual(harness.spoken, ["PAID-A"]);

      advance(10001);
      harness.delivery.setVoicePlaybackState({ holdUntilTs: Date.now() - 1 });
      const result = await Promise.race([
        pending,
        sleep(500).then(() => {
          throw new Error("showcase hung after stale drop");
        })
      ]);

      assert.equal(resolved, true);
      assert.equal(result.ok, false);
      assert.equal(result.skipped, true);
      assert.equal(result.reason, "stale_non_paid");
      assert.deepEqual(harness.spoken, ["PAID-A"]);
      assert.equal(harness.showcaseMirrors.length, 0);
      assert.equal(harness.delivery.getVoiceSpeakQueueLength(), 0);
    });
  });

  await test("overflow eviction resolves the waiting showcase line", async () => {
    const harness = createHarness({ holdMs: 60000 });
    await harness.sayPaid("PAID-ACTIVE", "paid-active");
    let resolved = false;
    const pending = harness.speak("Koj je ve frontě").then((result) => {
      resolved = true;
      return result;
    });
    await sleep(20);
    assert.equal(harness.delivery.getVoiceSpeakQueueLength(), 1);

    for (let i = 1; i <= 6; i += 1) {
      await harness.sayPaid(`PAID-${i}`, `paid-wait-${i}`);
    }

    const result = await Promise.race([
      pending,
      sleep(500).then(() => {
        throw new Error("showcase hung after eviction");
      })
    ]);
    assert.equal(resolved, true);
    assert.equal(result.ok, false);
    assert.equal(result.skipped, true);
    assert.equal(result.reason, "evict_oldest_lowest_priority");
    assert.deepEqual(harness.spoken, ["PAID-ACTIVE"]);
    assert.equal(harness.showcaseMirrors.length, 0);
    assert.equal(harness.delivery.getVoiceSpeakQueueLength(), 6);
    assert.equal(
      harness.logs.some(
        (entry) =>
          entry.stage === "voice_speak_dropped" &&
          entry.reason === "evict_oldest_lowest_priority" &&
          entry.textPreview === "Koj je ve frontě"
      ),
      true
    );
    await harness.release();
  });

  await test("immediate TTS failure resolves without a mirror", async () => {
    const harness = createHarness({
      holdMs: 500,
      speak: async () => ({ ok: false, reason: "synth_rejected" })
    });
    const result = await harness.speak("Koj mlčí");
    assert.equal(result.ok, false);
    assert.equal(result.skipped, true);
    assert.equal(result.reason, "synth_rejected");
    assert.deepEqual(harness.spoken, []);
    assert.equal(harness.showcaseMirrors.length, 0);
    assert.equal(harness.delivery.getVoiceSpeakQueueLength(), 0);
  });

  await test("queued TTS failure resolves and the queue keeps draining", async () => {
    const harness = createHarness({
      holdMs: 60000,
      speak: async (payload, ctx) => {
        if (payload.text === "Koj selže") {
          return { ok: false, reason: "synth_rejected" };
        }
        return speakOk(payload.text, ctx.spoken);
      }
    });
    await harness.sayPaid("PAID-A");
    const pending = harness.speak("Koj selže");
    await harness.delivery.maybeDeliverMiaVoice(
      {
        ok: true,
        route: "system",
        meta: { source: "after_fail" },
        overlayPayload: { owner: "mia", route: "system", text: "Po selhání" }
      },
      {
        shouldSpeak: true,
        text: "Po selhání",
        voiceMode: "primary",
        voiceSpeaker: "mia",
        primaryOwner: "mia",
        source: "after_fail",
        recordReply: false
      },
      { bypassActionQueue: true }
    );
    assert.equal(harness.spoken.includes("Koj selže"), false);
    await harness.release();
    const result = await Promise.race([
      pending,
      sleep(500).then(() => {
        throw new Error("showcase hung after queued TTS failure");
      })
    ]);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "synth_rejected");
    assert.equal(harness.showcaseMirrors.length, 0);
    assert.equal(harness.spoken.includes("Koj selže"), false);
    assert.equal(harness.spoken.includes("Po selhání"), true);
    assert.equal(harness.delivery.getVoiceSpeakQueueLength(), 0);
  });

  await test("queued TTS throw resolves and does not stall the queue", async () => {
    const harness = createHarness({
      holdMs: 60000,
      speak: async (payload, ctx) => {
        if (payload.text === "Koj spadne") {
          throw new Error("synth_down");
        }
        return speakOk(payload.text, ctx.spoken);
      }
    });
    await harness.sayPaid("PAID-A");
    const pending = harness.speak("Koj spadne");
    await harness.delivery.maybeDeliverMiaVoice(
      {
        ok: true,
        route: "system",
        overlayPayload: { owner: "mia", route: "system", text: "Pokračuj" }
      },
      {
        shouldSpeak: true,
        text: "Pokračuj",
        voiceMode: "primary",
        voiceSpeaker: "mia",
        primaryOwner: "mia",
        source: "after_throw",
        recordReply: false
      },
      { bypassActionQueue: true }
    );
    await harness.release();
    const result = await Promise.race([
      pending,
      sleep(500).then(() => {
        throw new Error("showcase hung after TTS throw");
      })
    ]);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "synth_down");
    assert.equal(harness.showcaseMirrors.length, 0);
    assert.equal(harness.spoken.includes("Pokračuj"), true);
    assert.equal(
      harness.logs.some(
        (entry) => entry.source === "voice_speak_queue" && entry.error === "synth_down"
      ),
      true
    );
  });

  await test("a throwing drop hook is logged and does not stall draining", async () => {
    const harness = createHarness({ holdMs: 60000 });
    await harness.sayPaid("PAID-ACTIVE", "paid-active");
    let dropped = false;
    const pending = harness.delivery.maybeDeliverMiaVoice(
      {
        ok: true,
        route: "system",
        overlayPayload: { owner: "mia", route: "system", text: "Drop me" }
      },
      {
        shouldSpeak: true,
        text: "Drop me",
        voiceMode: "primary",
        voiceSpeaker: "mia",
        primaryOwner: "mia",
        source: "drop_probe",
        recordReply: false
      },
      {
        bypassActionQueue: true,
        onDropped() {
          dropped = true;
          throw new Error("drop hook boom");
        }
      }
    );
    await pending;
    for (let i = 1; i <= 6; i += 1) {
      await harness.sayPaid(`PAID-${i}`, `paid-drop-${i}`);
    }
    assert.equal(dropped, true);
    assert.equal(
      harness.logs.some(
        (entry) =>
          entry.source === "voice_playback_dropped_hook" && entry.error === "drop hook boom"
      ),
      true
    );
    harness.setHold(40);
    await harness.release();
    assert.ok(harness.spoken.includes("PAID-1"));
    assert.equal(harness.spoken.includes("Drop me"), false);
  });

  await test("action queue on bypasses coalescing and does not serialize hooks", async () => {
    process.env.MIA_ACTION_QUEUE = "1";
    resetSharedActionQueueForTest();
    const harness = createHarness({ holdMs: 60000 });
    try {
      await harness.sayPaid("PAID-A", "paid-a");
      const pending = harness.speak("Koj bypass");
      await sleep(40);

      const call = harness.voiceCalls.find(
        (row) => row.plan?.source === "koj_state_showcase_voice"
      );
      assert.equal(call.deliveryOptions.bypassActionQueue, true);
      assert.equal(call.result.voiceAdmission.queued, true);
      assert.equal(call.result.voiceAdmission.via, undefined);
      assert.equal("onPlaybackStarted" in call.actionResult, false);
      assert.equal("onDropped" in call.actionResult, false);
      assert.equal("onPlaybackFailed" in call.actionResult, false);
      assert.equal("onPlaybackStarted" in call.plan, false);
      assert.equal("onDropped" in call.plan, false);
      assert.equal("onPlaybackFailed" in call.plan, false);
      assert.equal("bypassActionQueue" in call.actionResult, false);
      assert.equal("bypassActionQueue" in call.plan, false);
      assertNoFunctions(call.actionResult, "actionResult");
      assertNoFunctions(call.plan, "plan");
      assertNoFunctions(call.result, "result");
      assert.equal(JSON.stringify(call.result).includes("onPlaybackStarted"), false);
      assert.equal(JSON.stringify(call.result).includes("onDropped"), false);
      assert.equal(JSON.stringify(call.result).includes("onPlaybackFailed"), false);
      assert.equal(JSON.stringify(call.plan).includes("onDropped"), false);
      assertNoFunctions(harness.delivery.getVoicePlaybackSnapshot(), "snapshot");

      const aq = getSharedActionQueue();
      assert.equal(aq.snapshot().size, 0);
      assert.equal(
        harness.logs.some((entry) => entry.stage === "action_queue_tts_enqueued"),
        false
      );
      assert.equal(
        harness.logs.some((entry) => entry.coalesceKey === "tts:anon:T1"),
        false
      );
      assert.equal(harness.delivery.getVoiceSpeakQueueLength(), 1);

      const payloads = [];
      const originalEnqueue = aq.enqueue.bind(aq);
      aq.enqueue = (input) => {
        payloads.push(input);
        return originalEnqueue(input);
      };

      async function gift(text, eventId) {
        return harness.delivery.maybeDeliverMiaVoice(
          {
            ok: true,
            route: "support",
            eventType: "GIFT",
            tier: "T1",
            meta: { eventId, userId: "tomino", tier: "T1" },
            overlayPayload: { owner: "mia", text, userLabel: "Tomino" }
          },
          {
            shouldSpeak: true,
            text,
            voiceMode: "primary",
            voiceSpeaker: "mia",
            primaryOwner: "mia",
            tier: "T1",
            source: "gift"
          }
        );
      }

      await gift("gift thanks one", "gift-1");
      await gift("gift thanks two", "gift-2");
      await sleep(40);

      assert.equal(payloads.length, 2);
      for (const payload of payloads) {
        assertNoFunctions(payload, "actionPayload");
        assert.equal(JSON.stringify(payload).includes("onPlaybackStarted"), false);
        assert.equal(JSON.stringify(payload).includes("onDropped"), false);
        assert.equal(JSON.stringify(payload).includes("onPlaybackFailed"), false);
        assert.equal(JSON.stringify(payload).includes("Koj bypass"), false);
      }
      const coalesced = harness.logs.filter((entry) => entry.stage === "action_queue_tts_coalesced");
      assert.equal(coalesced.length, 1);
      assert.equal(coalesced[0].coalesceKey, "tts:tomino:T1");
      assert.equal(
        harness.logs.some((entry) => entry.coalesceKey === "tts:anon:T1"),
        false
      );

      harness.setHold(40);
      await harness.release();
      const result = await pending;
      assert.equal(result.ok, true);
      assert.equal(harness.spoken.includes("Koj bypass"), true);
      assert.equal(
        harness.spoken.filter((text) => String(text).startsWith("gift thanks")).length,
        1
      );
      assert.deepEqual(
        harness.showcaseMirrors.map((row) => row.text),
        ["Koj bypass"]
      );
      assert.equal(harness.showcaseMirrors[0].source, "koj_state_showcase_voice");
    } finally {
      process.env.MIA_ACTION_QUEUE = "0";
      resetSharedActionQueueForTest();
    }
  });

  await test("showcase narration is not stored as a viewer reply", async () => {
    const harness = createHarness({ holdMs: 0 });
    const showcase = await harness.speak("Koj je veselý");
    assert.equal(showcase.ok, true);
    assert.equal(harness.replies.length, 0);

    await harness.delivery.maybeDeliverMiaVoice(
      {
        ok: true,
        route: "chat",
        overlayPayload: {
          owner: "mia",
          userLabel: "Viewer",
          text: "Ahoj diváku",
          route: "chat"
        }
      },
      {
        shouldSpeak: true,
        text: "Ahoj diváku",
        voiceMode: "primary",
        voiceSpeaker: "mia",
        primaryOwner: "mia",
        source: "chat"
      }
    );
    assert.equal(harness.replies.length, 1);
    assert.equal(harness.replies[0].userLabel, "Viewer");
    assert.equal(harness.replies[0].text, "Ahoj diváku");
    assert.equal(
      harness.replies.some((entry) => entry.text === "Koj je veselý"),
      false
    );
  });

  await test("runKojStateShowcase still waits for speech before the mood overlay", async () => {
    const showcaseSrc = fs.readFileSync(
      path.join(ROOT, "scripts/MIA_STREAMER_SHOWCASE.js"),
      "utf8"
    );
    assert.match(
      showcaseSrc,
      /await ctx\.speakLine\(text, "mia"\);[\s\S]*?await ctx\.executeOverlay\(/
    );

    const harness = createHarness({ holdMs: 80 });
    const events = [];
    async function speakStep(text) {
      events.push(`speak-start:${text}`);
      await harness.speak(text);
      events.push(`speak-settled:${text}`);
      events.push(`overlay:${text}`);
    }
    const sequence = (async () => {
      await speakStep("První stav");
      await sleep(10);
      await speakStep("Druhý stav");
    })();
    await sleep(20);
    assert.deepEqual(events, ["speak-start:První stav"]);
    await sequence;
    assert.deepEqual(events, [
      "speak-start:První stav",
      "speak-settled:První stav",
      "overlay:První stav",
      "speak-start:Druhý stav",
      "speak-settled:Druhý stav",
      "overlay:Druhý stav"
    ]);

    const originalTimeout = global.setTimeout;
    global.setTimeout = (fn, ms, ...args) => originalTimeout(fn, ms > 40 ? 1 : ms, ...args);
    const order = [];
    try {
      const report = await runKojStateShowcase({
        userLabel: "VasaSpinak",
        runtimeConfig: {},
        speakLine: async (text) => {
          const mood = getShowcaseKojForce()?.mood || null;
          order.push(`speak-start:${text}`);
          await new Promise((resolve) => originalTimeout(resolve, 12));
          order.push(`speak-settled:${text}:${mood}`);
        },
        executeOverlay: async (payload) => {
          order.push(`overlay:${payload.text}`);
        }
      });
      assert.equal(report.ok, true);
      assert.equal(report.kind, "koj_states");
      assert.equal(report.total, KOJ_STATE_SHOWCASE.length);

      for (let i = 0; i < KOJ_STATE_SHOWCASE.length; i += 1) {
        const line = KOJ_STATE_SHOWCASE[i].line;
        const mood = KOJ_STATE_SHOWCASE[i].mood;
        const settled = order.indexOf(`speak-settled:${line}:${mood}`);
        const overlay = order.indexOf(`overlay:${line}`);
        assert.ok(settled >= 0, `missing settled ${line}`);
        assert.ok(overlay > settled, `overlay before speech settled for ${line}`);
        if (i + 1 < KOJ_STATE_SHOWCASE.length) {
          const nextStart = order.indexOf(`speak-start:${KOJ_STATE_SHOWCASE[i + 1].line}`);
          assert.ok(nextStart > overlay, `next state started before overlay for ${line}`);
        }
      }
    } finally {
      global.setTimeout = originalTimeout;
    }
  });

  console.log("showcase_voice_queue_contract: all passed");
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    if (PREV_ACTION_QUEUE == null) delete process.env.MIA_ACTION_QUEUE;
    else process.env.MIA_ACTION_QUEUE = PREV_ACTION_QUEUE;
    resetSharedActionQueueForTest();
  });
