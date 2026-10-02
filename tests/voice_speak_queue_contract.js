"use strict";

const assert = require("assert/strict");
const { createDeliveryRuntime } = require("../scripts/MIA_DELIVERY_RUNTIME");

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

function withClock(run) {
  const originalNow = Date.now;
  let clock = originalNow();
  Date.now = () => clock;
  const api = {
    now() {
      return clock;
    },
    advance(ms) {
      clock += Number(ms) || 0;
    }
  };
  return Promise.resolve()
    .then(() => run(api))
    .finally(() => {
      Date.now = originalNow;
    });
}

function speakOk(text, spoken) {
  spoken.push(text);
  return {
    ok: true,
    provider: "fake",
    voice: "test",
    durationMs: 20,
    audioUrl: "mem://voice"
  };
}

function createQueueHarness(options = {}) {
  const logs = [];
  const spoken = [];
  const overlays = [];
  const rewards = [];
  let holdMs = options.holdMs || 2000;
  const api = createDeliveryRuntime({
    runtimeConfig: {
      phase2: { director: { enabled: false } },
      phase1: { actionQueue: { enabled: false } }
    },
    writeLog: (_channel, entry) => {
      logs.push(entry);
    },
    safeString: (value, fallback = "") => {
      const text = value == null ? "" : String(value);
      return text.trim() ? text.trim() : fallback;
    },
    cloneJson: (value, fallback) =>
      value == null ? fallback : JSON.parse(JSON.stringify(value)),
    setOverlay: (payload) => {
      overlays.push(payload);
      return { accepted: true };
    },
    getOverlayState: () => ({}),
    overlayStateModule: options.overlayStateModule || {
      setComboMoment: (_state, payload) => {
        rewards.push({ kind: "combo", payload });
        return payload;
      },
      setT0Flyby: (_state, payload) => {
        rewards.push({ kind: "flyby", payload });
        return payload;
      },
      setBossCinematic: (_state, payload) => {
        rewards.push({ kind: "boss", payload });
        return payload;
      }
    },
    invalidateOverlayStateCache: () => {},
    getOutputState: () => ({}),
    getKojnozoutState: () => ({}),
    getObsConnected: () => false,
    getUserLabel: () => "Tomino",
    tryAutoBossMissionFromGift: async () => null,
    speakerRoutingModule: {},
    ttsEngine: {
      resolveConfig: () => ({ enabled: true }),
      speak: async (payload) => {
        if (typeof options.speak === "function") {
          return options.speak(payload, { spoken, overlays, logs });
        }
        return speakOk(payload.text, spoken);
      }
    },
    languageModule: { resolveDefaultLanguage: () => "cs" },
    sessionMemoryModule: {},
    voiceHoldUntilTs: (now) => now + holdMs
  });

  async function say(text, actionResult = {}) {
    return api.maybeDeliverMiaVoice(
      {
        ok: true,
        route: actionResult.route || "support",
        ...actionResult,
        overlayPayload: {
          owner: "kojnozout",
          text,
          userLabel: actionResult.userLabel || "Tomino",
          ...(actionResult.overlayPayload || {})
        }
      },
      {
        shouldSpeak: true,
        text,
        voiceMode: "primary",
        voiceSpeaker: "kojnozout",
        primaryOwner: "kojnozout",
        tier: actionResult.tier
      }
    );
  }

  async function anchorPlayback() {
    const result = await say("anchor-speaking", { route: "system" });
    assert.equal(result.ok, true);
    assert.equal(api.getVoiceSpeakQueueLength(), 0);
    assert.equal(spoken.length, 1);
    assert.equal(spoken[0], "anchor-speaking");
    return result;
  }

  async function release() {
    holdMs = 0;
    api.setVoicePlaybackState(null);
    let spins = 0;
    while (api.getVoiceSpeakQueueLength() > 0) {
      spins += 1;
      if (spins > 200) {
        throw new Error(`queue did not drain, length=${api.getVoiceSpeakQueueLength()}`);
      }
      await sleep(40);
    }
    await sleep(80);
  }

  return {
    api,
    logs,
    spoken,
    overlays,
    rewards,
    say,
    anchorPlayback,
    release,
    setHold(ms) {
      holdMs = ms;
    }
  };
}

function droppedEntries(logs) {
  return logs.filter((entry) => entry && entry.stage === "voice_speak_dropped");
}

function droppedTexts(logs) {
  return droppedEntries(logs).map((entry) => entry.textPreview);
}

function chatAction(eventId) {
  return {
    route: "community",
    meta: eventId ? { eventId, source: "comment" } : { source: "comment" }
  };
}

function paidAction(eventId, extra = {}) {
  return {
    route: "support",
    tier: extra.tier || "T4",
    userLabel: extra.userLabel || "Tomino",
    meta: {
      eventId,
      userId: extra.userId || "tomino",
      tier: extra.tier || "T4",
      ...(extra.meta || {})
    }
  };
}

async function run() {
  const previousActionQueue = process.env.MIA_ACTION_QUEUE;
  process.env.MIA_ACTION_QUEUE = "0";

  try {
    await test("seven equal-priority paid lines evict the oldest paid acknowledgement", async () => {
      const harness = createQueueHarness();
      await harness.anchorPlayback();
      assert.equal(harness.api.getVoicePlaybackState().textPreview, "anchor-speaking");
      const returned = [];
      for (let i = 1; i <= 7; i += 1) {
        returned.push(await harness.say(`gift-${i}`, paidAction(`evt-${i}`)));
      }

      assert.equal(harness.api.getVoiceSpeakQueueLength(), 6);
      assert.equal(harness.api.getVoicePlaybackSnapshot().queueLength, 6);
      assert.equal(harness.api.getVoicePlaybackState().textPreview, "anchor-speaking");
      assert.deepEqual(droppedTexts(harness.logs), ["gift-1"]);
      assert.deepEqual(
        droppedEntries(harness.logs).map((entry) => entry.reason),
        ["evict_oldest_paid_support"]
      );
      assert.equal(returned[6].ok, true);
      assert.equal(returned[6].route, "support");
      await sleep(200);
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 6);
      harness.api.setVoicePlaybackState(null);
      const head = harness.api.getVoicePlaybackSnapshot();
      assert.equal(head.textPreview, "gift-2");
      await harness.release();
      assert.deepEqual(
        harness.spoken.filter((text) => text.startsWith("gift-")),
        ["gift-2", "gift-3", "gift-4", "gift-5", "gift-6", "gift-7"]
      );
      assert.deepEqual(
        harness.overlays.map((row) => row.text).filter((text) => String(text).startsWith("gift-")),
        ["gift-2", "gift-3", "gift-4", "gift-5", "gift-6", "gift-7"]
      );
      assert.equal(harness.overlays.some((row) => row.text === "gift-1"), false);
    });

    await test("twenty rapid paid lines keep only the newest six", async () => {
      const harness = createQueueHarness();
      await harness.anchorPlayback();
      for (let i = 1; i <= 20; i += 1) {
        const result = await harness.say(`burst20-${i}`, paidAction(`b20-${i}`));
        assert.equal(result.ok, true);
      }
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 6);
      const dropped = droppedEntries(harness.logs);
      assert.equal(dropped.length, 14);
      assert.equal(dropped[0].textPreview, "burst20-1");
      assert.equal(dropped[13].textPreview, "burst20-14");
      assert.ok(dropped.every((entry) => entry.reason === "evict_oldest_paid_support"));
      harness.api.setVoicePlaybackState(null);
      assert.equal(harness.api.getVoicePlaybackSnapshot().textPreview, "burst20-15");
      await harness.release();
      assert.deepEqual(
        harness.spoken.filter((text) => text.startsWith("burst20-")),
        ["burst20-15", "burst20-16", "burst20-17", "burst20-18", "burst20-19", "burst20-20"]
      );
    });

    await test("one hundred rapid paid lines still keep only the newest six", async () => {
      const harness = createQueueHarness();
      await harness.anchorPlayback();
      for (let i = 1; i <= 100; i += 1) {
        await harness.say(`burst100-${i}`, paidAction(`b100-${i}`));
      }
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 6);
      const dropped = droppedEntries(harness.logs);
      assert.equal(dropped.length, 94);
      assert.equal(dropped[0].textPreview, "burst100-1");
      assert.equal(dropped[93].textPreview, "burst100-94");
      assert.ok(dropped.every((entry) => entry.reason === "evict_oldest_paid_support"));
      harness.api.setVoicePlaybackState(null);
      assert.equal(harness.api.getVoicePlaybackSnapshot().textPreview, "burst100-95");
      await harness.release();
      assert.deepEqual(
        harness.spoken.filter((text) => text.startsWith("burst100-")),
        ["burst100-95", "burst100-96", "burst100-97", "burst100-98", "burst100-99", "burst100-100"]
      );
    });

    await test("identical paid lines are not coalesced by text when event ids differ", async () => {
      const harness = createQueueHarness();
      await harness.anchorPlayback();
      for (let i = 0; i < 7; i += 1) {
        await harness.say("Tomino, díky za Rose.", paidAction(`dup-${i}`, { tier: "T4" }));
      }
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 6);
      assert.equal(droppedTexts(harness.logs).length, 1);
      assert.equal(droppedEntries(harness.logs)[0].reason, "evict_oldest_paid_support");
      assert.equal(
        harness.logs.some((entry) => entry.stage === "voice_speak_coalesced"),
        false
      );
      await harness.release();
      const roses = harness.spoken.filter((text) => text === "Tomino, díky za Rose.");
      assert.deepEqual(roses, ["Tomino, díky za Rose."]);
      assert.ok(harness.logs.some((entry) => entry.stage === "tts_speak_deduped"));
    });

    await test("seven low-priority chats evict the oldest chat", async () => {
      const harness = createQueueHarness();
      await harness.anchorPlayback();
      for (let i = 1; i <= 7; i += 1) {
        await harness.say(`chat-${i}`, chatAction(`chat-${i}`));
      }
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 6);
      assert.deepEqual(droppedTexts(harness.logs), ["chat-1"]);
      assert.equal(droppedEntries(harness.logs)[0].reason, "evict_oldest_lowest_priority");
      assert.equal(droppedEntries(harness.logs)[0].voiceClass, "chat");
      const queued = harness.logs.filter((entry) => entry.stage === "voice_speak_queued");
      assert.ok(queued.every((entry) => entry.voiceClass === "chat"));
      assert.ok(queued.every((entry) => Number(entry.queuedAt) > 0));
      await harness.release();
      assert.deepEqual(
        harness.spoken.filter((text) => text.startsWith("chat-")),
        ["chat-2", "chat-3", "chat-4", "chat-5", "chat-6", "chat-7"]
      );
    });

    await test("incoming chat is dropped when six paid gifts are waiting", async () => {
      const harness = createQueueHarness();
      await harness.anchorPlayback();
      for (let i = 1; i <= 6; i += 1) {
        await harness.say(`gift-${i}`, paidAction(`paid-${i}`, { userId: `viewer-${i}` }));
      }
      await harness.say("late-chat", chatAction("late-chat"));
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 6);
      assert.deepEqual(droppedTexts(harness.logs), ["late-chat"]);
      assert.equal(
        droppedEntries(harness.logs)[0].reason,
        "drop_incoming_protect_paid_support"
      );
      await harness.release();
      assert.deepEqual(
        harness.spoken.filter((text) => text.startsWith("gift-")),
        ["gift-1", "gift-2", "gift-3", "gift-4", "gift-5", "gift-6"]
      );
      assert.equal(harness.spoken.includes("late-chat"), false);
    });

    await test("incoming paid gift evicts the oldest chat when the queue is chat", async () => {
      const harness = createQueueHarness();
      await harness.anchorPlayback();
      for (let i = 1; i <= 6; i += 1) {
        await harness.say(`chat-${i}`, chatAction(`chat-${i}`));
      }
      await harness.say("paid-new", paidAction("paid-new"));
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 6);
      assert.deepEqual(droppedTexts(harness.logs), ["chat-1"]);
      assert.equal(droppedEntries(harness.logs)[0].reason, "evict_oldest_lowest_priority");
      assert.equal(droppedEntries(harness.logs)[0].voiceClass, "chat");
      await harness.release();
      assert.deepEqual(
        harness.spoken.filter((text) => text !== "anchor-speaking"),
        ["chat-2", "chat-3", "chat-4", "chat-5", "chat-6", "paid-new"]
      );
    });

    await test("mixed priorities evict the oldest lowest class first", async () => {
      const harness = createQueueHarness();
      await harness.anchorPlayback();
      await harness.say("proactive-old", {
        route: "community",
        responseContract: { intent: "proactive_host" },
        meta: { source: "proactive_host", eventId: "pro-old" }
      });
      await harness.say("media-a", {
        route: "community",
        responseContract: { intent: "streamer_media_ack" },
        meta: { eventId: "media-a" }
      });
      await harness.say("chat-a", chatAction("chat-a"));
      await harness.say("system-a", {
        route: "voice",
        meta: { source: "voice_command", eventId: "system-a" }
      });
      await harness.say("proactive-new", {
        route: "community",
        responseContract: { intent: "solo_stream" },
        meta: { source: "solo_stream", eventId: "pro-new" }
      });
      await harness.say("paid-a", paidAction("paid-a"));
      await harness.say("paid-b", paidAction("paid-b", { userId: "other" }));
      await harness.say("chat-b", chatAction("chat-b"));
      await harness.say("proactive-dropped", {
        route: "community",
        responseContract: { intent: "proactive_host" },
        meta: { source: "proactive_host", eventId: "pro-drop" }
      });

      assert.deepEqual(droppedTexts(harness.logs), [
        "proactive-old",
        "proactive-new",
        "proactive-dropped"
      ]);
      assert.deepEqual(
        droppedEntries(harness.logs).map((entry) => entry.reason),
        [
          "evict_oldest_lowest_priority",
          "evict_oldest_lowest_priority",
          "drop_incoming_lower_priority"
        ]
      );
      const classes = harness.logs
        .filter((entry) => entry.stage === "voice_speak_queued")
        .map((entry) => `${entry.textPreview}:${entry.voiceClass}`);
      assert.deepEqual(classes, [
        "proactive-old:proactive",
        "media-a:media",
        "chat-a:chat",
        "system-a:system",
        "proactive-new:proactive",
        "paid-a:paid_support",
        "paid-b:paid_support",
        "chat-b:chat"
      ]);
      await harness.release();
      assert.deepEqual(
        harness.spoken.filter((text) => text !== "anchor-speaking"),
        ["media-a", "chat-a", "system-a", "paid-a", "paid-b", "chat-b"]
      );
    });

    await test("non-paid speech older than 10s is skipped when the queue drains", async () => {
      await withClock(async (clock) => {
        const harness = createQueueHarness();
        harness.setHold(60000);
        await harness.anchorPlayback();
        await harness.say("stale-chat", chatAction("stale-chat"));
        clock.advance(10001);
        await harness.release();
        assert.equal(harness.spoken.includes("stale-chat"), false);
        assert.equal(droppedEntries(harness.logs)[0].reason, "stale_non_paid");
        assert.equal(droppedEntries(harness.logs)[0].textPreview, "stale-chat");
        assert.equal(droppedEntries(harness.logs)[0].voiceClass, "chat");
      });
    });

    await test("six stale chats are pruned before a fresh proactive is admitted", async () => {
      await withClock(async (clock) => {
        const harness = createQueueHarness();
        harness.setHold(60000);
        await harness.anchorPlayback();
        for (let i = 1; i <= 6; i += 1) {
          await harness.say(`stale-chat-${i}`, chatAction(`stale-chat-${i}`));
        }
        assert.equal(harness.api.getVoiceSpeakQueueLength(), 6);
        clock.advance(10001);
        await harness.say("fresh-proactive", {
          route: "community",
          responseContract: { intent: "proactive_host" },
          meta: { source: "proactive_host", eventId: "fresh-proactive" }
        });
        assert.equal(harness.api.getVoiceSpeakQueueLength(), 1);
        assert.deepEqual(droppedTexts(harness.logs), [
          "stale-chat-1",
          "stale-chat-2",
          "stale-chat-3",
          "stale-chat-4",
          "stale-chat-5",
          "stale-chat-6"
        ]);
        assert.ok(
          droppedEntries(harness.logs).every((entry) => entry.reason === "stale_non_paid")
        );
        const queued = harness.logs.filter((entry) => entry.stage === "voice_speak_queued");
        assert.equal(queued[queued.length - 1].textPreview, "fresh-proactive");
        assert.equal(queued[queued.length - 1].voiceClass, "proactive");
        await harness.release();
        assert.deepEqual(
          harness.spoken.filter((text) => text !== "anchor-speaking"),
          ["fresh-proactive"]
        );
      });
    });

    await test("six stale chats are pruned before a fresh media line is admitted", async () => {
      await withClock(async (clock) => {
        const harness = createQueueHarness();
        harness.setHold(60000);
        await harness.anchorPlayback();
        for (let i = 1; i <= 6; i += 1) {
          await harness.say(`stale-chat-${i}`, chatAction(`stale-chat-${i}`));
        }
        clock.advance(10001);
        await harness.say("fresh-media", {
          route: "community",
          responseContract: { intent: "streamer_media_ack" },
          meta: { eventId: "fresh-media" }
        });
        assert.equal(harness.api.getVoiceSpeakQueueLength(), 1);
        assert.equal(droppedEntries(harness.logs).length, 6);
        assert.ok(
          droppedEntries(harness.logs).every(
            (entry) => entry.reason === "stale_non_paid" && entry.voiceClass === "chat"
          )
        );
        await harness.release();
        assert.deepEqual(
          harness.spoken.filter((text) => text !== "anchor-speaking"),
          ["fresh-media"]
        );
      });
    });

    await test("paid entries older than 10s stay through enqueue pruning", async () => {
      await withClock(async (clock) => {
        const harness = createQueueHarness();
        harness.setHold(60000);
        await harness.anchorPlayback();
        for (let i = 1; i <= 6; i += 1) {
          await harness.say(`old-gift-${i}`, paidAction(`old-gift-${i}`, { userId: `viewer-${i}` }));
        }
        clock.advance(15000);
        await harness.say("fresh-proactive", {
          route: "community",
          responseContract: { intent: "proactive_host" },
          meta: { source: "proactive_host", eventId: "fresh-proactive" }
        });
        assert.equal(harness.api.getVoiceSpeakQueueLength(), 6);
        assert.deepEqual(droppedTexts(harness.logs), ["fresh-proactive"]);
        assert.equal(
          droppedEntries(harness.logs)[0].reason,
          "drop_incoming_protect_paid_support"
        );
        assert.equal(
          droppedEntries(harness.logs).some((entry) => entry.reason === "stale_non_paid"),
          false
        );
        await harness.release();
        assert.deepEqual(
          harness.spoken.filter((text) => text.startsWith("old-gift-")),
          ["old-gift-1", "old-gift-2", "old-gift-3", "old-gift-4", "old-gift-5", "old-gift-6"]
        );
      });
    });

    await test("enqueue pruning removes only stale non-paid entries", async () => {
      await withClock(async (clock) => {
        const harness = createQueueHarness();
        harness.setHold(60000);
        await harness.anchorPlayback();
        await harness.say("paid-old", paidAction("paid-old"));
        await harness.say("stale-chat", chatAction("stale-chat"));
        await harness.say("stale-system", {
          route: "voice",
          meta: { source: "voice_command", eventId: "stale-system" }
        });
        clock.advance(6000);
        await harness.say("live-chat", chatAction("live-chat"));
        clock.advance(5001);
        await harness.say("fresh-proactive", {
          route: "community",
          responseContract: { intent: "proactive_host" },
          meta: { source: "proactive_host", eventId: "fresh-proactive" }
        });
        assert.deepEqual(droppedTexts(harness.logs), ["stale-chat", "stale-system"]);
        assert.ok(
          droppedEntries(harness.logs).every((entry) => entry.reason === "stale_non_paid")
        );
        assert.equal(harness.api.getVoiceSpeakQueueLength(), 3);
        await harness.release();
        assert.deepEqual(
          harness.spoken.filter((text) => text !== "anchor-speaking"),
          ["paid-old", "live-chat", "fresh-proactive"]
        );
      });
    });

    await test("paid gift older than 10s stays eligible", async () => {
      await withClock(async (clock) => {
        const harness = createQueueHarness();
        harness.setHold(60000);
        await harness.anchorPlayback();
        await harness.say("old-gift", paidAction("old-gift"));
        clock.advance(15000);
        await harness.release();
        assert.ok(harness.spoken.includes("old-gift"));
        assert.equal(
          droppedEntries(harness.logs).some((entry) => entry.reason === "stale_non_paid"),
          false
        );
      });
    });

    await test("same-viewer small gifts inside 2.5s coalesce to one acknowledgement", async () => {
      await withClock(async (clock) => {
        const harness = createQueueHarness();
        harness.setHold(60000);
        await harness.anchorPlayback();
        await harness.say(
          "thanks-first",
          paidAction("small-1", { tier: "T1", userId: "tomino" })
        );
        clock.advance(2500);
        await harness.say(
          "thanks-second",
          paidAction("small-2", { tier: "T1", userId: "tomino" })
        );
        assert.equal(harness.api.getVoiceSpeakQueueLength(), 1);
        const merged = harness.logs.filter((entry) => entry.stage === "voice_speak_coalesced");
        assert.equal(merged.length, 1);
        assert.equal(merged[0].reason, "small_gift_same_viewer");
        assert.equal(merged[0].count, 2);
        assert.equal(merged[0].textPreview, "thanks-first");
        assert.equal(droppedEntries(harness.logs).length, 0);
        await harness.release();
        assert.deepEqual(
          harness.spoken.filter((text) => text.startsWith("thanks-")),
          ["thanks-first"]
        );
      });
    });

    await test("different viewers do not coalesce small gifts", async () => {
      const harness = createQueueHarness();
      await harness.anchorPlayback();
      await harness.say("ana-rose", paidAction("ana-1", { tier: "T1", userId: "ana" }));
      await harness.say("beta-rose", paidAction("beta-1", { tier: "T1", userId: "beta" }));
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 2);
      assert.equal(
        harness.logs.some((entry) => entry.stage === "voice_speak_coalesced"),
        false
      );
      await harness.release();
      assert.deepEqual(
        harness.spoken.filter((text) => text.endsWith("-rose")),
        ["ana-rose", "beta-rose"]
      );
    });

    await test("same viewer outside 2.5s does not coalesce", async () => {
      await withClock(async (clock) => {
        const harness = createQueueHarness();
        harness.setHold(60000);
        await harness.anchorPlayback();
        await harness.say("early-rose", paidAction("early", { tier: "T1", userId: "tomino" }));
        clock.advance(2501);
        await harness.say("late-rose", paidAction("late", { tier: "T1", userId: "tomino" }));
        assert.equal(harness.api.getVoiceSpeakQueueLength(), 2);
        assert.equal(
          harness.logs.some((entry) => entry.stage === "voice_speak_coalesced"),
          false
        );
        await harness.release();
        assert.deepEqual(
          harness.spoken.filter((text) => text.endsWith("-rose")),
          ["early-rose", "late-rose"]
        );
      });
    });

    await test("duplicate real event id does not consume another slot", async () => {
      const harness = createQueueHarness();
      await harness.anchorPlayback();
      await harness.say("first-copy", paidAction("evt-same", { tier: "T4" }));
      const second = await harness.say("second-copy", paidAction("evt-same", { tier: "T4" }));
      assert.equal(second.ok, true);
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 1);
      assert.deepEqual(droppedTexts(harness.logs), ["second-copy"]);
      assert.equal(droppedEntries(harness.logs)[0].reason, "duplicate_event_id");
      assert.equal(droppedEntries(harness.logs)[0].eventId, "evt-same");
      await harness.release();
      assert.deepEqual(
        harness.spoken.filter((text) => text.endsWith("-copy")),
        ["first-copy"]
      );
    });

    await test("missing queue metadata still delivers", async () => {
      const harness = createQueueHarness();
      await harness.anchorPlayback();
      const result = await harness.say("bare-line", {
        route: "community",
        userLabel: "",
        meta: {}
      });
      assert.equal(result.ok, true);
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 1);
      const queued = harness.logs.find((entry) => entry.stage === "voice_speak_queued");
      assert.equal(queued.voiceClass, "chat");
      assert.equal(queued.eventId, null);
      await harness.release();
      assert.ok(harness.spoken.includes("bare-line"));
    });

    await test("the line already speaking is never replaced", async () => {
      const gate = {};
      let calls = 0;
      const harness = createQueueHarness({
        speak: async ({ text }, ctx) => {
          calls += 1;
          if (calls === 1) {
            await new Promise((resolve) => {
              gate.release = resolve;
            });
          }
          return speakOk(text, ctx.spoken);
        }
      });
      const pending = harness.say("LIVE-LINE", { route: "system" });
      await sleep(30);
      assert.equal(calls, 1);
      for (let i = 1; i <= 8; i += 1) {
        await harness.say(`wait-${i}`, chatAction(`wait-${i}`));
      }
      assert.equal(calls, 1);
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 6);
      assert.equal(droppedTexts(harness.logs).includes("LIVE-LINE"), false);
      assert.equal(harness.api.getVoicePlaybackState(), null);
      gate.release();
      await pending;
      assert.equal(harness.spoken[0], "LIVE-LINE");
      assert.equal(harness.api.getVoicePlaybackState().textPreview, "LIVE-LINE");
      await harness.release();
      assert.equal(harness.spoken[0], "LIVE-LINE");
      assert.deepEqual(
        harness.spoken.filter((text) => text.startsWith("wait-")),
        ["wait-3", "wait-4", "wait-5", "wait-6", "wait-7", "wait-8"]
      );
    });

    await test("a failed speak still lets the queue drain", async () => {
      let failures = 0;
      const harness = createQueueHarness({
        speak: async ({ text }, ctx) => {
          if (text !== "anchor-speaking" && failures === 0) {
            failures += 1;
            throw new Error("synth_failed");
          }
          return speakOk(text, ctx.spoken);
        }
      });
      await harness.anchorPlayback();
      await harness.say("fails-once", chatAction("fails-once"));
      await harness.say("speaks-next", chatAction("speaks-next"));
      await harness.release();
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 0);
      assert.equal(harness.spoken.includes("fails-once"), false);
      assert.ok(harness.spoken.includes("speaks-next"));
      assert.ok(
        harness.logs.some(
          (entry) => entry.source === "voice_speak_queue" && entry.error === "synth_failed"
        )
      );
    });

    await test("gift bubbles and rewards stay when speech is dropped", async () => {
      const harness = createQueueHarness();
      await harness.anchorPlayback();
      for (let i = 1; i <= 7; i += 1) {
        await harness.say(`chat-${i}`, chatAction(`chat-${i}`));
      }
      assert.deepEqual(droppedTexts(harness.logs), ["chat-1"]);
      await harness.api.executeGiftPresentationOverlays(
        {
          user: { nickname: "Tomino" },
          support: { giftContext: { giftName: "Rose" } }
        },
        {
          comboSpeechPayload: {
            owner: "kojnozout",
            text: "GIFT-BUBBLE-ROSE",
            stage: "gift"
          },
          comboMoment: { id: "combo-rose", label: "Rose combo" }
        }
      );
      assert.equal(harness.rewards.length, 1);
      assert.equal(harness.rewards[0].payload.id, "combo-rose");
      assert.ok(harness.overlays.some((row) => row.text === "GIFT-BUBBLE-ROSE"));
      assert.equal(harness.overlays.some((row) => row.text === "chat-1"), false);
      assert.equal(
        harness.logs.some((entry) =>
          /bowl|reward|score|battle/i.test(String(entry.stage || ""))
        ),
        false
      );
      const rewardCount = harness.rewards.length;
      await harness.release();
      assert.equal(harness.rewards.length, rewardCount);
      assert.ok(harness.overlays.some((row) => row.text === "GIFT-BUBBLE-ROSE"));
    });

    console.log("");
    console.log("---- VOICE SPEAK QUEUE CONTRACT ----");
    console.log("passed");
  } finally {
    if (previousActionQueue === undefined) delete process.env.MIA_ACTION_QUEUE;
    else process.env.MIA_ACTION_QUEUE = previousActionQueue;
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
