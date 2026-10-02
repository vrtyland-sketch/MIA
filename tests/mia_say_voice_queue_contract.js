"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createDeliveryRuntime } = require("../scripts/MIA_DELIVERY_RUNTIME");
const { registerTtsRoutes } = require("../routes/tts");
const { createLocalAdminGuard } = require("../scripts/MIA_RUNTIME_SECURITY");
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
    durationMs: 1200,
    voice: "mock-voice",
    provider: "mock"
  };
}

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

function createHarness(options = {}) {
  const spoken = [];
  const sayMirrors = [];
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

  const routes = { get: new Map(), post: new Map() };
  const app = {
    get(routePath, ...handlers) {
      routes.get.set(routePath, handlers);
    },
    post(routePath, ...handlers) {
      routes.post.set(routePath, handlers);
    }
  };

  registerTtsRoutes(app, {
    ttsEngine: {
      speak: async () => {
        throw new Error("mia/say must not call ttsEngine.speak directly");
      }
    },
    languageModule: {
      normalizeLanguageCode: (code) => safeString(code, "cs").toLowerCase() || "cs",
      resolveDefaultLanguage: () => "cs",
      detectLanguage: () => ({ code: "cs" }),
      getLanguageName: (code) => code
    },
    runtimeConfig: {},
    localAdminGuard: createLocalAdminGuard(),
    overlayStaticDir: ROOT,
    translationRuntime: { getState: () => ({}) },
    translateModule: {},
    deliverMicTranslation: async () => ({ ok: false }),
    MIA_OVERLAY_BASE: () => "http://127.0.0.1:3000",
    voiceHoldUntilTs: () => {
      throw new Error("mia/say must not compute its own hold");
    },
    mirrorSpeechOverlayFromVoice: (row) => {
      sayMirrors.push(row);
      return delivery.mirrorSpeechOverlayFromVoice(row);
    },
    invalidateOverlayStateCache: () => {
      invalidations.push(sayMirrors.length);
    },
    maybeDeliverMiaVoice: delivery.maybeDeliverMiaVoice,
    bumpVoicePlaybackSeq: () => {
      throw new Error("mia/say must not bump playback directly");
    },
    setVoicePlaybackState: () => {
      throw new Error("mia/say must not set playback directly");
    },
    getDuelStateActive: () => false
  });

  async function invoke(method, routePath, req) {
    const handlers = routes[method].get(routePath);
    assert.ok(handlers, `missing ${method} ${routePath}`);
    const res = createRes();
    let index = 0;
    async function next() {
      const handler = handlers[index];
      index += 1;
      if (!handler) return;
      await handler(req, res, next);
    }
    await next();
    return res;
  }

  async function postSay(body, reqExtras = {}) {
    return invoke("post", "/mia/say", {
      ip: "127.0.0.1",
      headers: {},
      query: {},
      body: body || {},
      socket: {},
      ...reqExtras
    });
  }

  async function sayPaid(text = "PAID-A") {
    return delivery.maybeDeliverMiaVoice(
      {
        ok: true,
        route: "support",
        eventType: "GIFT",
        tier: "T4",
        meta: { eventId: `${text}-id`, userId: "payer-a", source: "gift" },
        overlayPayload: { owner: "mia", text, userLabel: "Tomino" }
      },
      {
        shouldSpeak: true,
        text,
        voiceMode: "primary",
        voiceSpeaker: "mia",
        primaryOwner: "mia",
        tier: "T4",
        source: "gift"
      }
    );
  }

  async function release() {
    holdMs = 40;
    const playback = delivery.getVoicePlaybackState();
    if (
      delivery.getVoiceSpeakQueueLength() === 0 &&
      playback &&
      Number(playback.holdUntilTs) > Date.now()
    ) {
      await delivery.maybeDeliverMiaVoice(
        {
          ok: true,
          route: "system",
          meta: { source: "release_tick" },
          overlayPayload: { owner: "mia", text: "release-tick" }
        },
        {
          shouldSpeak: true,
          text: "release-tick",
          voiceMode: "primary",
          voiceSpeaker: "mia",
          primaryOwner: "mia",
          source: "release_tick",
          recordReply: false
        }
      );
    }
    delivery.setVoicePlaybackState(null);
    let spins = 0;
    while (delivery.getVoiceSpeakQueueLength() > 0) {
      spins += 1;
      if (spins > 200) {
        throw new Error(`queue did not drain, length=${delivery.getVoiceSpeakQueueLength()}`);
      }
      await sleep(20);
    }
    await sleep(80);
  }

  return {
    delivery,
    spoken,
    sayMirrors,
    invalidations,
    deliveryOverlays,
    replies,
    logs,
    voiceCalls,
    postSay,
    sayPaid,
    release
  };
}

function sayMirrorsOnly(mirrors) {
  return mirrors.filter((row) => row && row.source === "mia_say_remote");
}

async function run() {
  process.env.MIA_ACTION_QUEUE = "0";

  await test("mia/say source uses managed delivery and /tts/test stays immediate-only", () => {
    const src = fs.readFileSync(path.join(ROOT, "routes", "tts.js"), "utf8");
    const sayStart = src.indexOf('app.post("/mia/say"');
    const sayEnd = src.indexOf('app.get("/mia-mic"');
    const say = src.slice(sayStart, sayEnd);
    const testRoute = src.slice(src.indexOf('app.get("/tts/test"'), sayStart);
    const compare = src.slice(src.indexOf('app.get("/tts/compare"'), src.indexOf("return {", src.indexOf('app.get("/tts/compare"')));
    assert.match(say, /maybeDeliverMiaVoice/);
    assert.match(say, /route:\s*"system"/);
    assert.match(say, /source:\s*"mia_say_remote"/);
    assert.match(say, /voiceMode:\s*"primary"/);
    assert.match(say, /recordReply:\s*false/);
    assert.match(say, /bypassActionQueue:\s*true/);
    assert.match(say, /onPlaybackStarted/);
    assert.match(say, /localAdminGuard/);
    assert.match(say, /missing_text/);
    assert.doesNotMatch(say, /ttsEngine\.speak/);
    assert.doesNotMatch(say, /setVoicePlaybackState/);
    assert.doesNotMatch(say, /bumpVoicePlaybackSeq/);
    assert.doesNotMatch(say, /eventId/);
    assert.doesNotMatch(say, /voicePreempt/);
    assert.match(testRoute, /maybeDeliverMiaVoice/);
    assert.match(testRoute, /requireImmediateStart:\s*true/);
    assert.match(testRoute, /source:\s*"tts_test"/);
    assert.match(testRoute, /bypassActionQueue:\s*true/);
    assert.doesNotMatch(testRoute, /ttsEngine\.speak/);
    assert.doesNotMatch(testRoute, /setVoicePlaybackState/);
    assert.doesNotMatch(testRoute, /bumpVoicePlaybackSeq/);
    assert.doesNotMatch(testRoute, /localAdminGuard/);
    assert.match(compare, /ttsEngine\.speak/);
    assert.doesNotMatch(compare, /maybeDeliverMiaVoice/);
    assert.doesNotMatch(compare, /setVoicePlaybackState/);

    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(
      indexSrc,
      /async function maybeDeliverMiaVoice\(actionResult = \{\}, voicePlanOverride = null, deliveryOptions = null\)/
    );
    assert.match(
      indexSrc,
      /return deliveryRuntime\(\)\.maybeDeliverMiaVoice\(actionResult, voicePlanOverride, deliveryOptions\)/
    );
  });

  await test("missing text stays 400 and remote requests stay forbidden", async () => {
    const harness = createHarness();
    const missing = await harness.postSay({});
    assert.equal(missing.statusCode, 400);
    assert.equal(missing.body.error, "missing_text");
    assert.equal(harness.voiceCalls.length, 0);

    const remote = await harness.postSay(
      { text: "remote" },
      { ip: "8.8.8.8", headers: {} }
    );
    assert.equal(remote.statusCode, 403);
    assert.equal(remote.body.error, "local_admin_only");
    assert.equal(harness.voiceCalls.length, 0);
    assert.equal(harness.spoken.includes("remote"), false);
  });

  await test("free queue starts operator speech and skips session memory", async () => {
    const harness = createHarness();
    const startedAt = Date.now();
    const res = await harness.postSay({ text: "Ahoj z panelu", speaker: "mia", lang: "cs" });
    const elapsed = Date.now() - startedAt;
    const playback = harness.delivery.getVoicePlaybackState();
    const call = harness.voiceCalls.find((row) => row.plan?.source === "mia_say_remote");

    assert.ok(elapsed < 2000, `mia/say waited ${elapsed}ms`);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.started, true);
    assert.equal(res.body.queued, false);
    assert.equal(res.body.speaker, "mia");
    assert.equal(res.body.language, "cs");
    assert.equal(res.body.text, "Ahoj z panelu");
    assert.equal(res.body.audioUrl, playback.audioUrl);
    assert.equal(res.body.playbackId, playback.playbackId);
    assert.equal(res.body.voicePlayback.audioSink, "mia_voice");
    assert.equal(res.body.voicePlayback.exclusiveAudio, true);
    assert.ok(Number(playback.playbackId) > 0);
    assert.equal(playback.audioSink, "mia_voice");
    assert.equal(playback.exclusiveAudio, true);
    assert.equal(call.plan.recordReply, false);
    assert.equal(call.plan.voiceMode, "primary");
    assert.equal(call.plan.voiceSpeaker, "mia");
    assert.equal(call.actionResult.route, "system");
    assert.equal(call.deliveryOptions.bypassActionQueue, true);
    assert.equal(call.actionResult.bypassActionQueue, undefined);
    assert.equal(call.plan.bypassActionQueue, undefined);
    assert.equal(call.plan.onPlaybackStarted, undefined);
    assert.equal(call.result.bypassActionQueue, undefined);
    assert.equal(call.result.onPlaybackStarted, undefined);
    assert.equal(JSON.stringify(res.body).includes("bypassActionQueue"), false);
    assert.equal(JSON.stringify(res.body).includes("onPlaybackStarted"), false);
    assert.equal(JSON.stringify(call.result).includes("bypassActionQueue"), false);
    assert.equal(harness.replies.length, 0);

    const mirror = sayMirrorsOnly(harness.sayMirrors);
    assert.equal(mirror.length, 1);
    assert.equal(mirror[0].text, "Ahoj z panelu");
    assert.equal(mirror[0].holdUntilTs, playback.holdUntilTs);
    assert.equal(mirror[0].source, "mia_say_remote");
    assert.deepEqual(
      harness.deliveryOverlays
        .filter((row) => row.text === "Ahoj z panelu" && row.meta?.voiceMirror)
        .map((row) => row.meta.source),
      ["mia_say_remote"]
    );
    assert.ok(harness.invalidations.some((count) => count >= 1));

    const koj = await harness.postSay({ text: "Koj line", speaker: "koj", language: "en" });
    assert.equal(koj.body.speaker, "kojnozout");
    assert.equal(koj.body.language, "en");
    const kojCall = harness.voiceCalls.filter((row) => row.plan?.text === "Koj line").pop();
    assert.equal(kojCall.plan.voiceSpeaker, "kojnozout");
    assert.equal(kojCall.actionResult.route, "system");
    await harness.release();

    const memory = createHarness({ holdMs: 0 });
    await memory.delivery.maybeDeliverMiaVoice(
      {
        ok: true,
        route: "community",
        eventType: "COMMENT",
        overlayPayload: { owner: "mia", text: "viewer reply", userLabel: "Ada" }
      },
      {
        shouldSpeak: true,
        text: "viewer reply",
        voiceMode: "primary",
        voiceSpeaker: "mia",
        primaryOwner: "mia",
        source: "viewer_reply"
      }
    );
    assert.equal(memory.replies.length, 1);
    assert.equal(memory.replies[0].text, "viewer reply");
    assert.ok(
      memory.deliveryOverlays.some(
        (row) => row.text === "viewer reply" && row.meta?.source === "tts_primary_mirror"
      )
    );
    await memory.release();
  });

  await test("paid speech stays active while operator line waits", async () => {
    const harness = createHarness();
    const paid = await harness.sayPaid("PAID-A");
    assert.equal(paid.voiceAdmission.started, true);
    const paidPlayback = harness.delivery.getVoicePlaybackState();

    const res = await harness.postSay({ text: "operator waits", lang: "cs" });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.queued, true);
    assert.equal(res.body.started, false);
    assert.equal(res.body.speaker, "mia");
    assert.equal(res.body.language, "cs");
    assert.equal(res.body.text, "operator waits");
    assert.equal(res.body.audioUrl, undefined);
    assert.equal(res.body.voice, undefined);
    assert.equal(res.body.voicePlayback, undefined);
    assert.equal(res.body.playbackId, undefined);
    assert.equal(harness.delivery.getVoicePlaybackState().playbackId, paidPlayback.playbackId);
    assert.equal(harness.delivery.getVoicePlaybackState().textPreview, "PAID-A");
    assert.equal(harness.spoken.includes("operator waits"), false);
    assert.equal(sayMirrorsOnly(harness.sayMirrors).length, 0);
    const queued = harness.logs.filter((entry) => entry.stage === "voice_speak_queued");
    assert.equal(queued[queued.length - 1].voiceClass, "system");
    assert.equal(queued[queued.length - 1].textPreview, "operator waits");

    await harness.release();
    const playback = harness.delivery.getVoicePlaybackState();
    const mirror = sayMirrorsOnly(harness.sayMirrors);
    assert.equal(harness.spoken.includes("operator waits"), true);
    assert.equal(mirror.length, 1);
    assert.equal(mirror[0].holdUntilTs, playback.holdUntilTs);
    assert.equal(playback.textPreview, "operator waits");
  });

  await test("operator line older than 10s drops without synthesis or mirror", async () => {
    await withClock(async (clock) => {
      const harness = createHarness();
      await harness.sayPaid("PAID-HOLD");
      const res = await harness.postSay({ text: "stale operator" });
      assert.equal(res.body.queued, true);
      assert.equal(res.body.started, false);
      clock.advance(10001);
      assert.equal(harness.delivery.getVoicePlaybackState().textPreview, "PAID-HOLD");
      await harness.release();
      assert.equal(harness.spoken.includes("stale operator"), false);
      assert.equal(sayMirrorsOnly(harness.sayMirrors).length, 0);
      const drop = harness.logs.find(
        (entry) => entry.stage === "voice_speak_dropped" && entry.reason === "stale_non_paid"
      );
      assert.equal(drop.voiceClass, "system");
      assert.equal(drop.textPreview, "stale operator");
      assert.equal(res.body.ok, true);
    });
  });

  await test("a later paid line waits behind an active operator line", async () => {
    const harness = createHarness();
    const res = await harness.postSay({ text: "operator first" });
    assert.equal(res.body.started, true);
    const operatorPlayback = harness.delivery.getVoicePlaybackState();
    const paid = await harness.sayPaid("PAID-NEXT");
    assert.equal(paid.voiceAdmission.queued, true);
    assert.equal(paid.voiceAdmission.voiceClass, "paid_support");
    assert.equal(harness.delivery.getVoicePlaybackState().playbackId, operatorPlayback.playbackId);
    assert.equal(harness.spoken.includes("PAID-NEXT"), false);
    await harness.release();
    assert.deepEqual(
      harness.spoken.filter((text) => text === "operator first" || text === "PAID-NEXT"),
      ["operator first", "PAID-NEXT"]
    );
  });

  await test("immediate TTS failure returns an error and leaves the queue usable", async () => {
    const harness = createHarness({
      speak: async (payload, ctx) => {
        if (payload.text === "broken now") {
          return { ok: false, reason: "tts_failed" };
        }
        return speakOk(payload.text, ctx.spoken);
      }
    });
    const res = await harness.postSay({ text: "broken now" });
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.error, "tts_failed");
    assert.equal(res.body.started, false);
    assert.equal(harness.delivery.getVoicePlaybackState(), null);
    assert.equal(sayMirrorsOnly(harness.sayMirrors).length, 0);
    const next = await harness.postSay({ text: "after failure" });
    assert.equal(next.body.started, true);
    assert.equal(harness.spoken.includes("after failure"), true);
    await harness.release();
  });

  await test("a queued operator line that fails synthesis does not mirror and the queue continues", async () => {
    const harness = createHarness({
      speak: async (payload, ctx) => {
        if (payload.text === "fails later") {
          throw new Error("say_tts_down");
        }
        return speakOk(payload.text, ctx.spoken);
      }
    });
    await harness.sayPaid("PAID-A");
    const res = await harness.postSay({ text: "fails later" });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.queued, true);
    await harness.sayPaid("PAID-AFTER");
    await harness.release();
    assert.equal(harness.spoken.includes("fails later"), false);
    assert.equal(sayMirrorsOnly(harness.sayMirrors).length, 0);
    assert.equal(harness.spoken.includes("PAID-AFTER"), true);
    assert.ok(
      harness.logs.some(
        (entry) => entry.source === "voice_speak_queue" && entry.error === "say_tts_down"
      )
    );
  });

  await test("action queue on keeps operator speech out of gift coalescing", async () => {
    process.env.MIA_ACTION_QUEUE = "1";
    resetSharedActionQueueForTest();
    const harness = createHarness();
    await harness.sayPaid("PAID-A");
    const res = await harness.postSay({ text: "operator bypass" });
    await sleep(40);

    const call = harness.voiceCalls.find((row) => row.plan?.source === "mia_say_remote");
    assert.equal(res.body.queued, true);
    assert.equal(res.body.started, false);
    assert.equal(res.body.audioUrl, undefined);
    assert.equal(call.deliveryOptions.bypassActionQueue, true);
    assert.equal(JSON.stringify(res.body).includes("bypassActionQueue"), false);
    assert.equal(JSON.stringify(call.result).includes("onPlaybackStarted"), false);
    assert.equal(getSharedActionQueue().snapshot().size, 0);
    assert.equal(harness.delivery.getVoiceSpeakQueueLength(), 1);
    assert.equal(
      harness.logs.some((entry) => entry.stage === "action_queue_tts_enqueued"),
      false
    );
    assert.equal(
      harness.logs.some((entry) => entry.coalesceKey === "tts:anon:T1"),
      false
    );
    assert.equal(
      harness.logs.find((entry) => entry.stage === "voice_speak_queued").voiceClass,
      "system"
    );

    await harness.delivery.maybeDeliverMiaVoice(
      {
        ok: true,
        route: "support",
        eventType: "GIFT",
        tier: "T1",
        meta: { eventId: "gift-1", userId: "tomino", tier: "T1" },
        overlayPayload: { owner: "mia", text: "gift thanks one", userLabel: "Tomino" }
      },
      {
        shouldSpeak: true,
        text: "gift thanks one",
        voiceMode: "primary",
        voiceSpeaker: "mia",
        primaryOwner: "mia",
        tier: "T1",
        source: "gift"
      }
    );
    await harness.delivery.maybeDeliverMiaVoice(
      {
        ok: true,
        route: "support",
        eventType: "GIFT",
        tier: "T1",
        meta: { eventId: "gift-2", userId: "tomino", tier: "T1" },
        overlayPayload: { owner: "mia", text: "gift thanks two", userLabel: "Tomino" }
      },
      {
        shouldSpeak: true,
        text: "gift thanks two",
        voiceMode: "primary",
        voiceSpeaker: "mia",
        primaryOwner: "mia",
        tier: "T1",
        source: "gift"
      }
    );
    await sleep(40);

    const coalesced = harness.logs.filter((entry) => entry.stage === "action_queue_tts_coalesced");
    assert.equal(coalesced.length, 1);
    assert.equal(coalesced[0].coalesceKey, "tts:tomino:T1");
    assert.equal(
      harness.logs.filter(
        (entry) =>
          entry.stage === "action_queue_tts_enqueued" &&
          String(entry.textPreview || "").startsWith("operator")
      ).length,
      0
    );
    assert.equal(harness.delivery.getVoiceSpeakQueueLength(), 2);
    await harness.release();
    assert.equal(harness.spoken.includes("operator bypass"), true);
    assert.equal(
      harness.spoken.filter((text) => String(text).startsWith("gift thanks")).length,
      1
    );
    assert.deepEqual(
      sayMirrorsOnly(harness.sayMirrors).map((row) => row.text),
      ["operator bypass"]
    );
  });

  console.log("mia_say_voice_queue_contract: all passed");
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    if (PREV_ACTION_QUEUE == null) delete process.env.MIA_ACTION_QUEUE;
    else process.env.MIA_ACTION_QUEUE = PREV_ACTION_QUEUE;
  });
