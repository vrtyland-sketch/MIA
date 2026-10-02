"use strict";

const assert = require("assert/strict");
const { createDeliveryRuntime } = require("../scripts/MIA_DELIVERY_RUNTIME");
const { createTranslationRuntime } = require("../scripts/MIA_TRANSLATION_RUNTIME");
const {
  getSharedActionQueue,
  resetSharedActionQueueForTest
} = require("../core/action-queue");

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
    audioUrl: `/audio-cache/${spoken.length}.mp3`,
    durationMs: 1200,
    voice: "mock",
    provider: "mock"
  };
}

function createHarness(options = {}) {
  const spoken = [];
  const captions = [];
  const overlays = [];
  const replies = [];
  const logs = [];
  let holdMs = options.holdMs == null ? 60000 : options.holdMs;
  const api = createDeliveryRuntime({
    runtimeConfig: { voice: {} },
    writeLog: (_file, row) => logs.push(row),
    safeString,
    cloneJson: (value, fallback) => value || fallback,
    setOverlay: () => ({ accepted: true }),
    getOverlayState: () => ({}),
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

  const translation = createTranslationRuntime({
    writeLog: () => {},
    safeString,
    ttsEngine: {
      speak: async () => {
        throw new Error("translation must not call ttsEngine.speak");
      }
    },
    runtimeConfig: {},
    voiceHoldUntilTs: (now) => now + 9000,
    deliveryRuntime: () => api,
    translationRuntime: {
      isInterpreterEnabled: () => true,
      noteForeignLanguage() {},
      setLastChatTranslation() {},
      setLastMicTranslation() {},
      setLastGuestTranslation() {},
      setLastSkip() {},
      getReplyLanguage: () => "en",
      getVoiceState: () => ({ streamerVoiceLang: "cs", guestVoiceLang: "en", bothCzech: false }),
      noteVoiceLanguages() {},
      setLiveCaption(row) {
        captions.push({ ...row, spokenSnapshot: spoken.slice() });
      }
    },
    setOverlay: (row) => {
      overlays.push(row);
    },
    invalidateOverlayStateCache: () => {},
    translateModule: options.translateModule || {
      translateText: async ({ text }) => ({ ok: true, text: `cs:${text}` }),
      resolveStreamerLanguage: () => "cs",
      isSameLanguage: (a, b) => a === b,
      resolveChannelPlan: () => ({
        channel: "chat",
        speaker: "mia",
        roleLabel: "MIA · Chat",
        sourceLang: "en",
        targetLang: "cs"
      }),
      buildPublicCaption: ({ translated, original, roleLabel }) => ({
        title: roleLabel,
        text: translated,
        subtext: original
      })
    },
    languageModule: { detectLanguage: () => ({ code: "en" }) },
    getUserLabel: () => "Ada"
  });

  async function say(text, actionResult = {}, planExtras = {}) {
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
        voiceSpeaker: "mia",
        primaryOwner: "mia",
        tier: actionResult.tier,
        ...planExtras
      }
    );
  }

  async function anchor(text = "PAID-A") {
    const result = await say(text, {
      route: "support",
      eventType: "GIFT",
      tier: "T4",
      meta: { eventId: `${text}-id`, userId: "payer-a" }
    });
    assert.equal(result.voiceAdmission.started, true);
    assert.equal(api.getVoiceSpeakQueueLength(), 0);
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
    translation,
    spoken,
    captions,
    overlays,
    replies,
    logs,
    say,
    anchor,
    release,
    setHold(ms) {
      holdMs = ms;
    }
  };
}

function queuedLogs(logs) {
  return logs.filter((entry) => entry && entry.stage === "voice_speak_queued");
}

function dropped(logs) {
  return logs.filter((entry) => entry && entry.stage === "voice_speak_dropped");
}

async function run() {
  const previousActionQueue = process.env.MIA_ACTION_QUEUE;
  process.env.MIA_ACTION_QUEUE = "0";

  try {
    await test("paid speech stays ahead of a foreign chat translation", async () => {
      const harness = createHarness();
      await harness.anchor("PAID-A");
      await harness.say("PAID-B", {
        route: "support",
        eventType: "GIFT",
        tier: "T4",
        meta: { eventId: "paid-b", userId: "payer-b" }
      });
      const started = Date.now();
      const translated = await harness.translation.deliverChatTranslation({
        message: "hello stream",
        eventId: "comment-live-1",
        language: "en"
      });
      assert.ok(Date.now() - started < 500);
      await harness.say("MIA-REPLY", {
        route: "community",
        eventType: "COMMENT",
        meta: { eventId: "comment-live-1-reply", source: "comment" }
      });

      assert.equal(translated.ok, true);
      assert.equal(translated.voice.ok, true);
      assert.equal(translated.voice.queued, true);
      assert.equal(translated.voice.started, false);
      assert.equal(translated.voice.audioUrl, undefined);
      assert.equal(translated.voice.durationMs, undefined);
      assert.deepEqual(harness.spoken, ["PAID-A"]);
      assert.equal(harness.api.getVoicePlaybackState().textPreview, "PAID-A");
      assert.equal(harness.api.getVoicePlaybackState().audioSink, "mia_voice");
      assert.equal(harness.captions.length, 0);
      assert.equal(harness.overlays.length, 0);
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 3);
      assert.deepEqual(
        queuedLogs(harness.logs).map((entry) => ({
          text: entry.textPreview,
          voiceClass: entry.voiceClass,
          eventId: entry.eventId
        })),
        [
          { text: "PAID-B", voiceClass: "paid_support", eventId: "paid-b" },
          { text: "cs:hello stream", voiceClass: "chat", eventId: "comment-live-1" },
          { text: "MIA-REPLY", voiceClass: "chat", eventId: "comment-live-1-reply" }
        ]
      );
      assert.equal(harness.replies.length, 1);
      assert.equal(harness.replies[0].text, "PAID-A");

      await harness.release();
      assert.deepEqual(harness.spoken, ["PAID-A", "PAID-B", "cs:hello stream", "MIA-REPLY"]);
      assert.equal(harness.captions.length, 1);
      assert.equal(harness.captions[0].translated, "cs:hello stream");
      assert.equal(harness.captions[0].original, "hello stream");
      assert.equal(harness.captions[0].source, "chat_translation_public");
      assert.equal(harness.captions[0].language, "cs");
      assert.equal(harness.captions[0].channel, "chat");
      assert.equal(harness.captions[0].translation, true);
      assert.equal(harness.captions[0].publicCaption, true);
      assert.equal(harness.captions[0].title, "MIA · Chat");
      assert.deepEqual(harness.captions[0].spokenSnapshot, [
        "PAID-A",
        "PAID-B",
        "cs:hello stream"
      ]);
      assert.equal(harness.overlays.length, 1);
      assert.equal(harness.overlays[0].stage, "translation");
      assert.equal(
        harness.replies.some((entry) => entry.text === "cs:hello stream"),
        false
      );
      assert.ok(harness.replies.some((entry) => entry.text === "MIA-REPLY"));
    });

    await test("a free translation starts immediately and a later paid gift waits", async () => {
      const harness = createHarness();
      const spoken = await harness.translation.speakTranslatedLine({
        text: "preklad hned",
        language: "cs",
        source: "chat_translation_public",
        eventId: "comment-free",
        title: "MIA · Chat",
        subtext: "hello",
        original: "hello",
        channel: "chat"
      });
      assert.equal(spoken.started, true);
      assert.equal(spoken.queued, false);
      assert.equal(spoken.audioUrl, "/audio-cache/1.mp3");
      assert.equal(harness.api.getVoicePlaybackState().textPreview, "preklad hned");
      assert.equal(harness.captions.length, 1);
      assert.equal(harness.captions[0].translated, "preklad hned");
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 0);

      await harness.say("PAID-AFTER", {
        route: "support",
        eventType: "GIFT",
        tier: "T3",
        meta: { eventId: "paid-after", userId: "payer-c" }
      });
      assert.equal(harness.api.getVoicePlaybackState().textPreview, "preklad hned");
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 1);
      assert.deepEqual(harness.spoken, ["preklad hned"]);
      assert.equal(queuedLogs(harness.logs)[0].voiceClass, "paid_support");

      await harness.release();
      assert.deepEqual(harness.spoken, ["preklad hned", "PAID-AFTER"]);
      assert.equal(harness.captions.length, 1);
    });

    await test("a translation waiting over 10s is dropped without speech or caption", async () => {
      await withClock(async (clock) => {
        const harness = createHarness();
        await harness.anchor("PAID-A");
        await harness.say("PAID-B", {
          route: "support",
          eventType: "GIFT",
          tier: "T4",
          meta: { eventId: "paid-b", userId: "payer-b" }
        });
        const queued = await harness.translation.speakTranslatedLine({
          text: "stale translation",
          source: "chat_translation_public",
          eventId: "comment-stale",
          original: "late",
          channel: "chat"
        });
        assert.equal(queued.queued, true);
        clock.advance(10001);
        await harness.release();
        assert.deepEqual(
          harness.spoken.filter((text) => text !== "PAID-A"),
          ["PAID-B"]
        );
        assert.equal(harness.captions.length, 0);
        assert.equal(harness.overlays.length, 0);
        assert.ok(
          dropped(harness.logs).some(
            (entry) =>
              entry.reason === "stale_non_paid" &&
              entry.voiceClass === "chat" &&
              entry.textPreview === "stale translation"
          )
        );
      });
    });

    await test("a waiting translation is evicted by paid traffic without a caption", async () => {
      const harness = createHarness();
      await harness.anchor("PAID-A");
      await harness.translation.speakTranslatedLine({
        text: "waiting translation",
        source: "chat_translation_public",
        eventId: "comment-evict",
        channel: "chat"
      });
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 1);
      for (let i = 1; i <= 6; i += 1) {
        await harness.say(`PAID-${i}`, {
          route: "support",
          eventType: "GIFT",
          tier: "T4",
          meta: { eventId: `paid-evict-${i}`, userId: `payer-${i}` }
        });
      }
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 6);
      assert.ok(
        dropped(harness.logs).some(
          (entry) =>
            entry.reason === "evict_oldest_lowest_priority" &&
            entry.textPreview === "waiting translation"
        )
      );
      await harness.release();
      assert.equal(harness.spoken.includes("waiting translation"), false);
      assert.equal(harness.captions.length, 0);
      assert.deepEqual(
        harness.spoken.filter((text) => text.startsWith("PAID-") && text !== "PAID-A"),
        ["PAID-1", "PAID-2", "PAID-3", "PAID-4", "PAID-5", "PAID-6"]
      );
    });

    await test("the same comment event id does not take a second translation slot", async () => {
      const harness = createHarness();
      await harness.anchor("PAID-A");
      const first = await harness.translation.speakTranslatedLine({
        text: "first translation",
        source: "chat_translation_public",
        eventId: "comment-same",
        channel: "chat"
      });
      const second = await harness.translation.speakTranslatedLine({
        text: "second translation",
        source: "chat_translation_public",
        eventId: "comment-same",
        channel: "chat"
      });
      assert.equal(first.queued, true);
      assert.equal(second.ok, false);
      assert.equal(second.reason, "duplicate_event_id");
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 1);
      assert.equal(harness.captions.length, 0);
      await harness.release();
      assert.deepEqual(
        harness.spoken.filter((text) => text.includes("translation")),
        ["first translation"]
      );
      assert.equal(harness.captions.length, 1);
      assert.equal(harness.captions[0].translated, "first translation");
    });

    await test("mic translation is queued as non-paid and is not paid support", async () => {
      const harness = createHarness();
      await harness.anchor("PAID-A");
      const mic = await harness.translation.speakTranslatedLine({
        text: "mic translation",
        source: "mic_translation_public",
        channel: "streamer",
        title: "MIA · Ty"
      });
      assert.equal(mic.queued, true);
      const row = queuedLogs(harness.logs).find((entry) => entry.textPreview === "mic translation");
      assert.equal(row.voiceClass, "system");
      assert.equal(row.voiceClass === "paid_support", false);
      assert.equal(harness.captions.length, 0);
      await harness.release();
      assert.equal(harness.captions.length, 1);
      assert.equal(harness.captions[0].source, "mic_translation_public");
    });

    await test("failed translation synthesis starts no caption and the queue continues", async () => {
      const harness = createHarness({
        speak: async (payload, ctx) => {
          if (payload.text === "broken translation") {
            return { ok: false, reason: "tts_failed" };
          }
          return speakOk(payload.text, ctx.spoken);
        }
      });
      await harness.anchor("PAID-A");
      const broken = await harness.translation.speakTranslatedLine({
        text: "broken translation",
        source: "chat_translation_public",
        eventId: "comment-broken",
        channel: "chat"
      });
      await harness.say("NEXT-CHAT", {
        route: "community",
        eventType: "COMMENT",
        meta: { eventId: "next-chat", source: "comment" }
      });
      assert.equal(broken.queued, true);
      assert.equal(harness.captions.length, 0);
      await harness.release();
      assert.equal(harness.spoken.includes("broken translation"), false);
      assert.ok(harness.spoken.includes("NEXT-CHAT"));
      assert.equal(harness.captions.length, 0);
      assert.ok(
        harness.logs.some(
          (entry) => entry.source === "tts_speak" && entry.reason === "tts_failed"
        )
      );
    });

    await test("a playback hook error does not stall the managed queue", async () => {
      const harness = createHarness();
      await harness.anchor("PAID-A");
      await harness.api.maybeDeliverMiaVoice(
        {
          route: "community",
          eventType: "COMMENT",
          meta: { eventId: "hook-boom", source: "comment" },
          overlayPayload: { text: "hook line", userLabel: "Ada" }
        },
        {
          shouldSpeak: true,
          text: "hook line",
          voiceMode: "primary",
          voiceSpeaker: "mia",
          primaryOwner: "mia"
        },
        {
          onPlaybackStarted() {
            throw new Error("caption_boom");
          }
        }
      );
      await harness.say("AFTER-HOOK", {
        route: "community",
        eventType: "COMMENT",
        meta: { eventId: "after-hook", source: "comment" }
      });
      await harness.release();
      assert.ok(harness.spoken.includes("hook line"));
      assert.ok(harness.spoken.includes("AFTER-HOOK"));
      assert.ok(
        harness.logs.some(
          (entry) =>
            entry.source === "voice_playback_started_hook" && entry.error === "caption_boom"
        )
      );
    });

    await test("action queue on keeps two translations paired with their own captions", async () => {
      process.env.MIA_ACTION_QUEUE = "1";
      resetSharedActionQueueForTest();
      const harness = createHarness();
      await harness.anchor("PAID-A");
      const first = await harness.translation.speakTranslatedLine({
        text: "caption A",
        source: "chat_translation_public",
        eventId: "comment-a",
        channel: "chat",
        title: "A",
        original: "alpha"
      });
      const second = await harness.translation.speakTranslatedLine({
        text: "caption B",
        source: "chat_translation_public",
        eventId: "comment-b",
        channel: "chat",
        title: "B",
        original: "beta"
      });
      await sleep(40);

      assert.equal(first.queued, true);
      assert.equal(second.queued, true);
      assert.equal(first.bypassActionQueue, undefined);
      assert.equal(second.onPlaybackStarted, undefined);
      assert.equal(JSON.stringify(first).includes("bypassActionQueue"), false);
      assert.equal(JSON.stringify(second).includes("onPlaybackStarted"), false);
      assert.deepEqual(harness.spoken, ["PAID-A"]);
      assert.equal(harness.api.getVoicePlaybackState().textPreview, "PAID-A");
      assert.equal(harness.captions.length, 0);
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 2);
      assert.equal(getSharedActionQueue().snapshot().size, 0);
      assert.equal(
        harness.logs.some((entry) => entry.stage === "action_queue_tts_coalesced"),
        false
      );
      assert.equal(
        harness.logs.some((entry) => entry.coalesceKey === "tts:anon:T1"),
        false
      );
      assert.deepEqual(
        queuedLogs(harness.logs).map((entry) => ({
          text: entry.textPreview,
          eventId: entry.eventId,
          voiceClass: entry.voiceClass
        })),
        [
          { text: "caption A", eventId: "comment-a", voiceClass: "chat" },
          { text: "caption B", eventId: "comment-b", voiceClass: "chat" }
        ]
      );

      await harness.release();
      assert.deepEqual(harness.spoken, ["PAID-A", "caption A", "caption B"]);
      assert.deepEqual(
        harness.captions.map((row) => row.translated),
        ["caption A", "caption B"]
      );
      assert.deepEqual(harness.captions[0].spokenSnapshot, ["PAID-A", "caption A"]);
      assert.deepEqual(harness.captions[1].spokenSnapshot, ["PAID-A", "caption A", "caption B"]);
      assert.equal(harness.captions[0].original, "alpha");
      assert.equal(harness.captions[1].original, "beta");
    });

    await test("action queue on still keeps a waiting paid line ahead of translation", async () => {
      process.env.MIA_ACTION_QUEUE = "1";
      resetSharedActionQueueForTest();
      const harness = createHarness();
      await harness.anchor("PAID-A");
      await harness.say("PAID-B", {
        route: "support",
        eventType: "GIFT",
        tier: "T4",
        meta: { eventId: "paid-b", userId: "payer-b" }
      });
      await sleep(40);
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 1);
      const translated = await harness.translation.speakTranslatedLine({
        text: "after paid",
        source: "chat_translation_public",
        eventId: "comment-after-paid",
        channel: "chat"
      });
      assert.equal(translated.queued, true);
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 2);
      assert.deepEqual(
        queuedLogs(harness.logs).map((entry) => entry.textPreview),
        ["PAID-B", "after paid"]
      );
      assert.equal(queuedLogs(harness.logs)[0].voiceClass, "paid_support");
      assert.equal(queuedLogs(harness.logs)[1].voiceClass, "chat");
      await harness.release();
      assert.deepEqual(harness.spoken, ["PAID-A", "PAID-B", "after paid"]);
    });

    await test("action queue on still drops a stale translation without speech or caption", async () => {
      process.env.MIA_ACTION_QUEUE = "1";
      resetSharedActionQueueForTest();
      await withClock(async (clock) => {
        const harness = createHarness();
        await harness.anchor("PAID-A");
        const queued = await harness.translation.speakTranslatedLine({
          text: "stale while action queue on",
          source: "chat_translation_public",
          eventId: "comment-stale-aq",
          channel: "chat"
        });
        assert.equal(queued.queued, true);
        assert.equal(getSharedActionQueue().snapshot().size, 0);
        clock.advance(10001);
        await harness.release();
        assert.deepEqual(harness.spoken, ["PAID-A"]);
        assert.equal(harness.captions.length, 0);
        assert.ok(
          dropped(harness.logs).some(
            (entry) =>
              entry.reason === "stale_non_paid" &&
              entry.textPreview === "stale while action queue on"
          )
        );
      });
    });

    await test("action queue on still dedupes one real comment event id", async () => {
      process.env.MIA_ACTION_QUEUE = "1";
      resetSharedActionQueueForTest();
      const harness = createHarness();
      await harness.anchor("PAID-A");
      const first = await harness.translation.speakTranslatedLine({
        text: "only once",
        source: "chat_translation_public",
        eventId: "comment-once",
        channel: "chat"
      });
      const second = await harness.translation.speakTranslatedLine({
        text: "only once again",
        source: "chat_translation_public",
        eventId: "comment-once",
        channel: "chat"
      });
      assert.equal(first.queued, true);
      assert.equal(second.reason, "duplicate_event_id");
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 1);
      assert.equal(getSharedActionQueue().snapshot().size, 0);
      await harness.release();
      assert.deepEqual(
        harness.spoken.filter((text) => text !== "PAID-A"),
        ["only once"]
      );
      assert.deepEqual(
        harness.captions.map((row) => row.translated),
        ["only once"]
      );
    });

    await test("action queue on still lets paid traffic evict a waiting translation", async () => {
      process.env.MIA_ACTION_QUEUE = "1";
      resetSharedActionQueueForTest();
      const harness = createHarness();
      await harness.anchor("PAID-A");
      await harness.translation.speakTranslatedLine({
        text: "evicted translation",
        source: "chat_translation_public",
        eventId: "comment-evict-aq",
        channel: "chat"
      });
      for (let i = 1; i <= 6; i += 1) {
        await harness.say(`PAID-AQ-${i}`, {
          route: "support",
          eventType: "GIFT",
          tier: "T4",
          meta: { eventId: `paid-aq-${i}`, userId: `payer-aq-${i}` }
        });
      }
      await sleep(40);
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 6);
      assert.ok(
        dropped(harness.logs).some(
          (entry) =>
            entry.reason === "evict_oldest_lowest_priority" &&
            entry.textPreview === "evicted translation"
        )
      );
      await harness.release();
      assert.equal(harness.spoken.includes("evicted translation"), false);
      assert.equal(harness.captions.length, 0);
      assert.deepEqual(
        harness.spoken.filter((text) => text.startsWith("PAID-AQ-")),
        ["PAID-AQ-1", "PAID-AQ-2", "PAID-AQ-3", "PAID-AQ-4", "PAID-AQ-5", "PAID-AQ-6"]
      );
    });

    await test("action queue on still coalesces ordinary same-viewer gifts", async () => {
      process.env.MIA_ACTION_QUEUE = "1";
      resetSharedActionQueueForTest();
      const harness = createHarness();
      await harness.anchor("PAID-A");
      await harness.say("gift thanks one", {
        route: "support",
        eventType: "GIFT",
        tier: "T1",
        userLabel: "Tomino",
        meta: { eventId: "gift-1", userId: "tomino", tier: "T1" }
      });
      await harness.say("gift thanks two", {
        route: "support",
        eventType: "GIFT",
        tier: "T1",
        userLabel: "Tomino",
        meta: { eventId: "gift-2", userId: "tomino", tier: "T1" }
      });
      await sleep(40);
      assert.equal(
        harness.logs.filter((entry) => entry.stage === "action_queue_tts_coalesced").length,
        1
      );
      assert.equal(
        harness.logs.find((entry) => entry.stage === "action_queue_tts_coalesced").coalesceKey,
        "tts:tomino:T1"
      );
      assert.equal(
        queuedLogs(harness.logs).filter((entry) => entry.textPreview.startsWith("gift thanks"))
          .length,
        1
      );
      assert.equal(harness.api.getVoiceSpeakQueueLength(), 1);
      await harness.release();
      assert.equal(
        harness.spoken.filter((text) => text.startsWith("gift thanks")).length,
        1
      );
    });

    await test("recordReply false skips session memory while normal voices still record", async () => {
      const harness = createHarness({ holdMs: 0 });
      await harness.say("normal reply", {
        route: "community",
        eventType: "COMMENT",
        userLabel: "Ada",
        meta: { eventId: "normal-reply", source: "comment" }
      });
      await harness.api.maybeDeliverMiaVoice(
        {
          route: "community",
          eventType: "COMMENT",
          userLabel: "Ada",
          meta: { eventId: "translated-reply", source: "chat_translation_public" },
          overlayPayload: { text: "translated reply", userLabel: "Ada" }
        },
        {
          shouldSpeak: true,
          text: "translated reply",
          voiceMode: "primary",
          voiceSpeaker: "mia",
          primaryOwner: "mia",
          recordReply: false
        }
      );
      assert.deepEqual(
        harness.replies.map((entry) => entry.text),
        ["normal reply"]
      );
    });

    console.log("");
    console.log("---- TRANSLATION VOICE QUEUE CONTRACT ----");
    console.log("passed");
  } finally {
    resetSharedActionQueueForTest();
    if (previousActionQueue === undefined) delete process.env.MIA_ACTION_QUEUE;
    else process.env.MIA_ACTION_QUEUE = previousActionQueue;
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
