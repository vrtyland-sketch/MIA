"use strict";

const assert = require("assert/strict");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createDeliveryRuntime } = require("../scripts/MIA_DELIVERY_RUNTIME");
const { createTtsEngine } = require("../scripts/MIA_TTS_ENGINE");
const { registerTtsRoutes } = require("../routes/tts");
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

function speakOk(text, spoken, extra = {}) {
  spoken.push(text);
  return {
    ok: true,
    audioUrl: extra.audioUrl || `/audio-cache/${spoken.length}.mp3`,
    durationMs: 1000,
    voice: extra.voice || "mock-voice",
    provider: extra.provider || "mock",
    prosody: extra.prosody || { rate: "+0%", pitch: "+0Hz", volume: "+0%" },
    cached: extra.cached === true,
    text
  };
}

function genesisWaitMs(body, now) {
  const hold = Number(body?.voicePlayback?.holdUntilTs || 0) - now;
  return Math.max(2800, Math.min(hold + 400, 12000));
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
  const speakPayloads = [];
  const testMirrors = [];
  const invalidations = [];
  const deliveryOverlays = [];
  const replies = [];
  const logs = [];
  const voiceCalls = [];
  let holdMs = options.holdMs == null ? 400 : options.holdMs;
  let releaseSpeak = null;

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
        speakPayloads.push(payload);
        if (typeof options.speak === "function") {
          return options.speak(payload, { spoken, logs, releaseSpeak: () => releaseSpeak });
        }
        if (payload.text === "PAID-HOLD") {
          await new Promise((resolve) => {
            releaseSpeak = resolve;
          });
        }
        const salt = safeString(payload.cacheKeySalt);
        return speakOk(payload.text, spoken, {
          audioUrl: `/audio-cache/${salt || "cached"}.mp3`,
          cached: !salt,
          voice: payload.speaker === "kojnozout" ? "koj-voice" : "mia-voice"
        });
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
      resolveConfig: () => ({ enabled: options.ttsEnabled !== false }),
      speak: async () => {
        throw new Error("/tts/test must not call ttsEngine.speak directly");
      }
    },
    languageModule: {
      normalizeLanguageCode: (code, fallback = "cs") =>
        safeString(code, fallback).toLowerCase() || fallback,
      resolveDefaultLanguage: () => "cs",
      getLanguageName: (code) => (code === "cs" ? "čeština" : code)
    },
    runtimeConfig: {},
    overlayStaticDir: ROOT,
    translationRuntime: { getState: () => ({}) },
    translateModule: {},
    deliverMicTranslation: async () => ({ ok: false }),
    MIA_OVERLAY_BASE: () => "http://127.0.0.1:3000",
    mirrorSpeechOverlayFromVoice: (row) => {
      testMirrors.push(row);
      return delivery.mirrorSpeechOverlayFromVoice(row);
    },
    invalidateOverlayStateCache: () => {
      invalidations.push(testMirrors.length);
    },
    maybeDeliverMiaVoice: async (actionResult, plan, deliveryOptions) => {
      const result = await delivery.maybeDeliverMiaVoice(actionResult, plan, deliveryOptions);
      voiceCalls.push({ actionResult, plan, deliveryOptions, result });
      return result;
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

  function getTest(query = "") {
    const params = new URLSearchParams(query.replace(/^\?/, ""));
    return invoke("get", "/tts/test", { query: Object.fromEntries(params), headers: {} });
  }

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

  async function settle() {
    holdMs = 30;
    if (delivery.getVoiceSpeakQueueLength() === 0 && delivery.getVoicePlaybackState()) {
      await delivery.maybeDeliverMiaVoice(
        {
          ok: true,
          route: "system",
          overlayPayload: { owner: "mia", route: "system", text: "settle-tick" }
        },
        {
          shouldSpeak: true,
          text: "settle-tick",
          voiceMode: "primary",
          voiceSpeaker: "mia",
          primaryOwner: "mia",
          source: "settle_tick",
          recordReply: false
        },
        { bypassActionQueue: true }
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
    await sleep(20);
  }

  return {
    delivery,
    spoken,
    speakPayloads,
    testMirrors,
    invalidations,
    deliveryOverlays,
    replies,
    logs,
    voiceCalls,
    getTest,
    sayPaid,
    setHold,
    settle,
    releaseHeldSpeak: () => {
      if (typeof releaseSpeak === "function") releaseSpeak();
    }
  };
}

async function run() {
  process.env.MIA_ACTION_QUEUE = "0";
  resetSharedActionQueueForTest();

  await test("free floor starts managed playback and keeps the HTTP contract", async () => {
    const harness = createHarness({ holdMs: 3200 });
    try {
      const res = await harness.getTest("speaker=mia&lang=cs&text=Sly%C5%A1%C3%AD%C5%A1%20m%C4%9B");
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.ok, true);
      assert.equal(res.body.speaker, "mia");
      assert.equal(res.body.language, "cs");
      assert.equal(res.body.languageName, "čeština");
      assert.equal(res.body.phrase, "Slyšíš mě");
      assert.equal(res.body.message, "MIA — cs (mia-voice)");
      assert.equal(res.body.audioUrl, "/audio-cache/cached.mp3");
      assert.equal(res.body.provider, "mock");
      assert.equal(res.body.voice, "mia-voice");
      assert.equal(res.body.prosody.rate, "+0%");
      assert.equal(res.body.cached, true);
      assert.ok(res.body.compareUrl.endsWith("/tts/compare"));
      assert.ok(res.body.altTest.includes("/tts/test"));
      assert.ok(res.body.obsUrl.endsWith("/mia-voice-overlay.html"));
      assert.ok(Array.isArray(res.body.langs));
      const playback = res.body.voicePlayback;
      assert.ok(playback.playbackId > 0);
      assert.equal(playback.audioSink, "mia_voice");
      assert.equal(playback.exclusiveAudio, true);
      assert.equal(playback.textPreview, "Slyšíš mě");
      assert.ok(playback.holdUntilTs > Date.now());
      assert.equal(harness.delivery.getVoicePlaybackState().holdUntilTs, playback.holdUntilTs);
      assert.equal(harness.testMirrors.length, 1);
      assert.equal(harness.testMirrors[0].source, "tts_test_mirror");
      assert.equal(harness.testMirrors[0].text, "Slyšíš mě");
      assert.equal(harness.testMirrors[0].holdUntilTs, playback.holdUntilTs);
      assert.equal(
        harness.deliveryOverlays.some((row) => row?.meta?.source === "tts_primary_mirror"),
        false
      );
      assert.equal(harness.invalidations.length, 1);
      assert.equal(harness.replies.length, 0);
      assert.equal(harness.delivery.getVoiceSpeakQueueLength(), 0);

      const call = harness.voiceCalls[0];
      assert.equal(call.plan.source, "tts_test");
      assert.equal(call.plan.voiceMode, "primary");
      assert.equal(call.plan.voiceSpeaker, "mia");
      assert.equal(call.plan.primaryOwner, "mia");
      assert.equal(call.plan.language, "cs");
      assert.equal(call.plan.recordReply, false);
      assert.equal(call.plan.eventId, undefined);
      assert.equal(call.plan.preempt, undefined);
      assert.equal(call.actionResult.route, "system");
      assert.equal(call.deliveryOptions.bypassActionQueue, true);
      assert.equal(call.deliveryOptions.requireImmediateStart, true);
      assert.equal("requireImmediateStart" in call.actionResult, false);
      assert.equal("requireImmediateStart" in call.plan, false);
      assert.equal(JSON.stringify(call.result).includes("requireImmediateStart"), false);
      assert.equal(JSON.stringify(res.body).includes("requireImmediateStart"), false);
      assert.equal(harness.speakPayloads[0].text, "Slyšíš mě");
      assert.equal(harness.speakPayloads[0].language, "cs");
      assert.equal(harness.speakPayloads[0].cacheKeySalt, undefined);

      const now = Date.now();
      const waitMs = genesisWaitMs(res.body, now);
      assert.ok(waitMs > 2800 && waitMs <= 12000);
      assert.ok(Math.abs(waitMs - (playback.holdUntilTs - now + 400)) < 30);
    } finally {
      await harness.settle();
    }
  });

  await test("busy floor returns 409 and never plays the test line", async () => {
    const harness = createHarness({ holdMs: 5000 });
    try {
      await harness.sayPaid("PAID-A");
      const before = { ...harness.delivery.getVoicePlaybackState() };
      const queueBefore = harness.delivery.getVoiceSpeakQueueLength();
      const res = await harness.getTest("text=Test+te%C4%8F");
      const after = harness.delivery.getVoicePlaybackState();
      assert.equal(res.statusCode, 409);
      assert.equal(res.body.ok, false);
      assert.equal(res.body.queued, false);
      assert.equal(res.body.started, false);
      assert.equal(res.body.error, "voice_busy");
      assert.equal(res.body.phrase, "Test teď");
      assert.equal(res.body.voicePlayback, undefined);
      assert.equal(after.playbackId, before.playbackId);
      assert.equal(after.holdUntilTs, before.holdUntilTs);
      assert.equal(after.audioUrl, before.audioUrl);
      assert.equal(after.textPreview, "PAID-A");
      assert.equal(harness.delivery.getVoiceSpeakQueueLength(), queueBefore);
      assert.equal(harness.spoken.includes("Test teď"), false);
      assert.equal(harness.testMirrors.length, 0);
      assert.equal(getSharedActionQueue().snapshot().size, 0);
      await harness.settle();
      assert.equal(harness.spoken.includes("Test teď"), false);
      assert.equal(harness.testMirrors.length, 0);
    } finally {
      await harness.settle();
    }
  });

  await test("processing floor rejects a second synthesis before playback is published", async () => {
    const harness = createHarness({ holdMs: 40 });
    const pending = harness.sayPaid("PAID-HOLD");
    await sleep(20);
    assert.equal(harness.delivery.getVoicePlaybackState(), null);
    const res = await harness.getTest("text=Ne+te%C4%8F");
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.error, "voice_busy");
    assert.equal(harness.spoken.includes("Ne teď"), false);
    assert.equal(harness.speakPayloads.some((row) => row.text === "Ne teď"), false);
    harness.releaseHeldSpeak();
    await pending;
    await sleep(30);
    assert.equal(harness.spoken.includes("PAID-HOLD"), true);
    assert.equal(harness.spoken.includes("Ne teď"), false);
    assert.equal(harness.testMirrors.length, 0);
    await harness.settle();
  });

  await test("action queue on keeps the test immediate and gifts still coalesce", async () => {
    process.env.MIA_ACTION_QUEUE = "1";
    resetSharedActionQueueForTest();
    const harness = createHarness({ holdMs: 400 });
    try {
      const res = await harness.getTest("text=Okam%C5%BEit%C4%9B");
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.ok, true);
      assert.equal(getSharedActionQueue().snapshot().size, 0);
      assert.equal(
        harness.logs.some((entry) => entry.stage === "action_queue_tts_enqueued"),
        false
      );
      assert.equal(
        harness.logs.some((entry) => entry.coalesceKey === "tts:anon:T1"),
        false
      );
      await harness.settle();

      await harness.sayPaid("PAID-A", "paid-a");
      const busy = await harness.getTest("text=Zanepr%C3%A1zdn%C4%9Bno");
      assert.equal(busy.statusCode, 409);
      assert.equal(getSharedActionQueue().snapshot().size, 0);
      assert.equal(harness.delivery.getVoiceSpeakQueueLength(), 0);

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
      const coalesced = harness.logs.filter((entry) => entry.stage === "action_queue_tts_coalesced");
      assert.equal(coalesced.length, 1);
      assert.equal(coalesced[0].coalesceKey, "tts:tomino:T1");
      await harness.settle();
      assert.equal(harness.spoken.includes("Zaneprázdněno"), false);
      assert.equal(
        harness.spoken.filter((text) => String(text).startsWith("gift thanks")).length,
        1
      );
    } finally {
      process.env.MIA_ACTION_QUEUE = "0";
      resetSharedActionQueueForTest();
      await harness.settle();
    }
  });

  await test("fresh=1 changes the cache key without leaking into visible text", async () => {
    const harness = createHarness({ holdMs: 40 });
    const first = await harness.getTest(
      `fresh=1&text=${encodeURIComponent("Čistá věta")}`
    );
    assert.equal(first.statusCode, 200);
    assert.equal(first.body.phrase, "Čistá věta");
    assert.equal(first.body.cached, false);
    assert.equal(first.body.voicePlayback.textPreview, "Čistá věta");
    assert.equal(harness.testMirrors[0].text, "Čistá věta");
    const freshPayloads = () =>
      harness.speakPayloads.filter((row) => row.text === "Čistá věta");
    const firstSalt = freshPayloads()[0].cacheKeySalt;
    assert.ok(firstSalt);
    assert.equal(String(first.body.phrase).includes(firstSalt), false);
    assert.equal(String(first.body.voicePlayback.textPreview).includes(firstSalt), false);
    await harness.settle();

    const second = await harness.getTest(
      `fresh=1&text=${encodeURIComponent("Čistá věta")}`
    );
    assert.equal(second.statusCode, 200);
    assert.equal(second.body.phrase, "Čistá věta");
    const secondSalt = freshPayloads()[1].cacheKeySalt;
    assert.notEqual(firstSalt, secondSalt);
    assert.notEqual(first.body.audioUrl, second.body.audioUrl);
    assert.equal(freshPayloads().length, 2);
    assert.equal(freshPayloads().every((row) => !String(row.text).includes(row.cacheKeySalt)), true);
    assert.equal(
      harness.testMirrors.every((row) => row.text === "Čistá věta"),
      true
    );
    await harness.settle();
  });

  await test("a repeated test without fresh reuses the cached audio", async () => {
    const harness = createHarness({ holdMs: 40 });
    const first = await harness.getTest("text=Stejn%C3%A1+v%C4%9Bta");
    await harness.settle();
    const second = await harness.getTest("text=Stejn%C3%A1+v%C4%9Bta");
    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 200);
    assert.equal(second.body.cached, true);
    assert.equal(second.body.audioUrl, first.body.audioUrl);
    assert.equal(second.body.phrase, "Stejná věta");
    assert.equal(harness.speakPayloads.every((row) => row.cacheKeySalt == null), true);
    await harness.settle();
  });

  await test("cache salt changes the engine file identity and leaves the spoken text clean", async () => {
    const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "tts-test-cache-"));
    const phrase = "Ahoj cache";
    const prosody = { rate: "-28%", pitch: "+16Hz", volume: "+0%" };
    const voiceKey = "cs-CZ-VlastaNeural";
    const runtimeConfig = {
      tts: {
        enabled: true,
        provider: "edge",
        edgeVoice: voiceKey,
        edgeRateMia: prosody.rate,
        edgePitchMia: prosody.pitch,
        edgeVolumeMia: prosody.volume,
        cacheDir
      }
    };
    function fileFor(salt) {
      const hash = crypto
        .createHash("sha1")
        .update(
          `v3:mia:edge:${voiceKey}:cs:${prosody.rate}:${prosody.pitch}:${prosody.volume}:${phrase}${salt ? `:${salt}` : ""}`
        )
        .digest("hex");
      fs.writeFileSync(path.join(cacheDir, `${hash}.mp3`), Buffer.alloc(200, 7));
      return `/audio-cache/${hash}.mp3`;
    }
    const plainUrl = fileFor("");
    const freshUrl = fileFor("salt-a");
    const engine = createTtsEngine({ cacheDir, appendJsonLog: () => {} });
    const plain = await engine.speak({
      text: phrase,
      speaker: "mia",
      runtimeConfig,
      language: "cs"
    });
    const fresh = await engine.speak({
      text: phrase,
      speaker: "mia",
      runtimeConfig,
      language: "cs",
      cacheKeySalt: "salt-a"
    });
    assert.equal(plain.ok, true);
    assert.equal(plain.cached, true);
    assert.equal(plain.text, phrase);
    assert.equal(plain.audioUrl, plainUrl);
    assert.equal(fresh.ok, true);
    assert.equal(fresh.cached, true);
    assert.equal(fresh.text, phrase);
    assert.equal(fresh.audioUrl, freshUrl);
    assert.notEqual(plain.audioUrl, fresh.audioUrl);
  });

  await test("tts failure and disabled TTS leave no playback or mirror", async () => {
    const failed = createHarness({
      holdMs: 40,
      speak: async (payload, ctx) => {
        if (payload.text === "Selže") return { ok: false, reason: "synth_rejected" };
        return speakOk(payload.text, ctx.spoken);
      }
    });
    const failure = await failed.getTest("text=Sel%C5%BEe");
    assert.equal(failure.statusCode, 500);
    assert.equal(failure.body.ok, false);
    assert.equal(failure.body.error, "synth_rejected");
    assert.equal(failed.delivery.getVoicePlaybackState(), null);
    assert.equal(failed.testMirrors.length, 0);
    assert.equal(failed.delivery.getVoiceSpeakQueueLength(), 0);
    const after = await failed.sayPaid("STILL-WORKS");
    assert.equal(after.voiceAdmission.started, true);
    await failed.settle();

    const disabled = createHarness({ ttsEnabled: false });
    const off = await disabled.getTest("text=Vypnuto");
    assert.equal(off.statusCode, 503);
    assert.equal(off.body.error, "tts_disabled");
    assert.equal(disabled.delivery.getVoicePlaybackState(), null);
    assert.equal(disabled.speakPayloads.length, 0);
    assert.equal(disabled.delivery.getVoiceSpeakQueueLength(), 0);
  });

  await test("genesis uses the real hold and falls back to 2800ms when voice is busy", async () => {
    const src = fs.readFileSync(
      path.join(ROOT, "mia-output-overlay/assets/genesis/genesis-birth-sequence.js"),
      "utf8"
    );
    assert.match(src, /voicePlayback\?\.holdUntilTs/);
    assert.match(src, /Math\.max\(2800, Math\.min\(hold \+ 400, 12000\)\)/);
    assert.doesNotMatch(src, /while\s*\(/);
    assert.equal(src.split('fetch(url').length, 2);

    const harness = createHarness({ holdMs: 3000 });
    const ok = await harness.getTest("text=Genesis+hold");
    const successWait = genesisWaitMs(ok.body, Date.now());
    assert.equal(ok.statusCode, 200);
    assert.ok(successWait > 2800 && successWait <= 12000);
    await harness.settle();

    await harness.sayPaid("PAID-A");
    const busy = await harness.getTest("text=Genesis+busy");
    assert.equal(busy.statusCode, 409);
    assert.equal(genesisWaitMs(busy.body, Date.now()), 2800);
    assert.ok(Number.isFinite(genesisWaitMs(busy.body, Date.now())));
    await harness.settle();
  });

  await test("dashboard, remote, and ops smoke calls succeed on a free floor", async () => {
    const harness = createHarness({ holdMs: 40 });
    const dashboard = await harness.getTest("speaker=mia&fresh=1");
    assert.equal(dashboard.statusCode, 200);
    assert.equal(dashboard.body.ok, true);
    assert.ok(dashboard.body.voicePlayback.holdUntilTs > Date.now() - 50);
    assert.equal(dashboard.body.speaker, "mia");
    await harness.settle();

    const remote = await harness.getTest("speaker=koj&fresh=1");
    assert.equal(remote.statusCode, 200);
    assert.equal(remote.body.ok, true);
    assert.equal(remote.body.speaker, "kojnozout");
    assert.equal(remote.body.voice, "koj-voice");
    assert.ok(remote.body.audioUrl);
    await harness.settle();

    const ops = await harness.getTest("");
    assert.equal(ops.statusCode, 200);
    assert.equal(ops.body.ok, true);
    assert.equal(ops.body.speaker, "mia");
    assert.ok(ops.body.phrase);
    assert.ok(ops.body.audioUrl);
    assert.ok(ops.body.voicePlayback.holdUntilTs > 0);
    assert.ok(ops.body.compareUrl);
    await harness.settle();
  });

  await test("tts_test classifies as system and /tts/compare stays synthesis-only", async () => {
    const harness = createHarness({ holdMs: 400 });
    await harness.sayPaid("PAID-A");
    await harness.delivery.maybeDeliverMiaVoice(
      {
        ok: true,
        route: "system",
        meta: { source: "tts_test", language: "cs" },
        overlayPayload: { owner: "mia", route: "system", text: "Klasifikace" }
      },
      {
        shouldSpeak: true,
        text: "Klasifikace",
        voiceMode: "primary",
        voiceSpeaker: "mia",
        primaryOwner: "mia",
        source: "tts_test",
        language: "cs",
        recordReply: false
      },
      { bypassActionQueue: true }
    );
    assert.equal(
      harness.logs.find((entry) => entry.textPreview === "Klasifikace")?.voiceClass,
      "system"
    );
    const blocked = await harness.getTest("text=Neza%C5%99adit");
    assert.equal(blocked.statusCode, 409);
    assert.equal(harness.delivery.getVoiceSpeakQueueLength(), 1);
    await harness.settle();

    const src = fs.readFileSync(path.join(ROOT, "routes/tts.js"), "utf8");
    const compare = src.slice(src.indexOf('app.get("/tts/compare"'));
    assert.match(compare, /ttsEngine\.speak/);
    assert.doesNotMatch(compare, /maybeDeliverMiaVoice/);
    assert.doesNotMatch(compare, /setVoicePlaybackState/);
    assert.doesNotMatch(compare, /requireImmediateStart/);
  });

  console.log("tts_test_voice_queue_contract: all passed");
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
