"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createDeliveryRuntime } = require("../scripts/MIA_DELIVERY_RUNTIME");
const { createStartupOverlayRuntime } = require("../scripts/MIA_STARTUP_OVERLAY_RUNTIME");

const STARTUP_PHRASE =
  "MIA je online. Hlas funguje. Napiš mi do chatu nebo pošli gift Kojnožroutovi.";
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
  const startupMirrors = [];
  const startupInvalidations = [];
  const overlays = [];
  const replies = [];
  const logs = [];
  const events = [];
  const voiceCalls = [];
  let refreshCount = 0;
  let holdMs = options.holdMs == null ? 60000 : options.holdMs;

  const delivery = createDeliveryRuntime({
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
      resolveConfig: () => ({ enabled: options.ttsEnabled !== false }),
      speak: async (payload) => {
        events.push(`speak:${payload.text}`);
        if (typeof options.speak === "function") {
          return options.speak(payload, { spoken, logs, events });
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
    voiceCalls.push({ actionResult, plan, deliveryOptions });
    return originalDeliver(actionResult, plan, deliveryOptions);
  };

  const startup = createStartupOverlayRuntime({
    writeLog: (_file, row) => logs.push(row),
    startupCheckModule: {
      buildStartupCheck: () => ({
        ok: true,
        streamReady: true,
        readinessPercent: 100,
        streamReadyLabel: "OK",
        summary: { readinessPercent: 100 },
        checks: []
      })
    },
    mediaCatalogModule: {},
    ttsEngine:
      options.ttsEngine === null
        ? null
        : {
            resolveConfig: () => ({ enabled: options.ttsEnabled !== false }),
            speak: async () => {
              throw new Error("startup runtime must not call ttsEngine.speak");
            }
          },
    runtimeConfig: {},
    kickBridgeModule: {},
    runtimeSecurityModule: {},
    getPort: () => 3000,
    getBindHost: () => "127.0.0.1",
    getObsConnected: () => false,
    getObs: () => null,
    videoEngine: null,
    MIA_SPLIT_OVERLAYS: () => ({ startupCheck: "/startup-check.html", speech: "/speech" }),
    flashStartupCheckBrowserSource: async () => ({ ok: true }),
    executeOverlay: async (payload, opts) => {
      overlays.push({ payload, opts });
    },
    deliveryRuntime: () => delivery,
    mirrorSpeechOverlayFromVoice: (row) => {
      startupMirrors.push(row);
      events.push("startup-mirror");
    },
    invalidateOverlayStateCache: () => {
      startupInvalidations.push(startupMirrors.length);
    },
    voiceHoldUntilTs: () => {
      throw new Error("startup runtime must not compute its own hold");
    },
    obsBrowserRefreshOnConnectEnabled: () => options.refresh !== false,
    refreshObsMiaBrowserSources: async () => {
      refreshCount += 1;
      events.push("refresh");
      return { ok: true };
    },
    projectRoot: ROOT,
    preflightTestsModule: {}
  });

  async function sayPaid(text = "PAID-A") {
    return delivery.maybeDeliverMiaVoice(
      {
        ok: true,
        route: "support",
        eventType: "GIFT",
        tier: "T4",
        meta: { eventId: `${text}-id`, userId: "payer-a", source: "gift" },
        overlayPayload: {
          owner: "mia",
          text,
          userLabel: "Tomino"
        }
      },
      {
        shouldSpeak: true,
        text,
        voiceMode: "primary",
        voiceSpeaker: "mia",
        primaryOwner: "mia",
        tier: "T4"
      }
    );
  }

  async function release() {
    holdMs = 0;
    delivery.setVoicePlaybackState(null);
    let spins = 0;
    while (delivery.getVoiceSpeakQueueLength() > 0) {
      spins += 1;
      if (spins > 200) {
        throw new Error(`queue did not drain, length=${delivery.getVoiceSpeakQueueLength()}`);
      }
      await sleep(40);
    }
    await sleep(80);
  }

  return {
    delivery,
    startup,
    spoken,
    startupMirrors,
    startupInvalidations,
    overlays,
    replies,
    logs,
    events,
    voiceCalls,
    sayPaid,
    release,
    refreshCount: () => refreshCount,
    setHold(ms) {
      holdMs = ms;
    }
  };
}

function startupMirrorsOnly(mirrors) {
  return mirrors.filter((row) => row && row.source === "startup_voice_mirror");
}

function dropped(logs, reason) {
  return logs.filter(
    (entry) => entry && entry.stage === "voice_speak_dropped" && (!reason || entry.reason === reason)
  );
}

async function run() {
  process.env.MIA_ACTION_QUEUE = "0";

  await test("startup voice source does not write playback state itself", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "scripts", "MIA_STARTUP_OVERLAY_RUNTIME.js"),
      "utf8"
    );
    const start = src.indexOf("async function emitStartupOverlay");
    const end = src.indexOf("\n  return {", start);
    const fn = src.slice(start, end);
    assert.equal(start > 0 && end > start, true);
    assert.match(fn, /maybeDeliverMiaVoice/);
    assert.match(fn, /route:\s*"system"/);
    assert.match(fn, /source:\s*"startup_voice"/);
    assert.match(fn, /voiceMode:\s*"primary"/);
    assert.match(fn, /voiceSpeaker:\s*"mia"/);
    assert.match(fn, /recordReply:\s*false/);
    assert.match(fn, /onPlaybackStarted/);
    assert.match(fn, /presentStartupSpeech/);
    assert.match(src, /source: "startup_voice_mirror"/);
    assert.match(fn, /Server připojen — overlay funguje\. Pošli gift nebo napiš do chatu\./);
    assert.doesNotMatch(fn, /ttsEngine\.speak/);
    assert.doesNotMatch(fn, /setVoicePlaybackState/);
    assert.doesNotMatch(fn, /bumpVoicePlaybackSeq/);
    assert.doesNotMatch(fn, /bypassActionQueue/);
    assert.doesNotMatch(fn, /eventId/);
    assert.doesNotMatch(fn, /paid_support/);
    assert.doesNotMatch(fn, /voicePreempt/);
    assert.doesNotMatch(fn, /voiceHoldUntilTs/);
  });

  await test("free queue starts startup voice and refreshes OBS after admission", async () => {
    const harness = createHarness();
    const started = Date.now();
    await harness.startup.emitStartupOverlay();
    const elapsed = Date.now() - started;
    const playback = harness.delivery.getVoicePlaybackState();
    const call = harness.voiceCalls.find((row) => row.plan?.source === "startup_voice");

    assert.ok(elapsed < 2000, `startup waited ${elapsed}ms for playback hold`);
    assert.equal(harness.spoken.includes(STARTUP_PHRASE), true);
    assert.equal(playback.audioSink, "mia_voice");
    assert.equal(playback.exclusiveAudio, true);
    assert.ok(Number(playback.playbackId) > 0);
    assert.equal(playback.textPreview, STARTUP_PHRASE);
    assert.equal(call.actionResult.route, "system");
    assert.equal(call.plan.voiceMode, "primary");
    assert.equal(call.plan.voiceSpeaker, "mia");
    assert.equal(call.plan.recordReply, false);
    assert.equal(call.plan.preempt, undefined);
    assert.equal(call.actionResult.eventId, undefined);
    assert.equal(call.deliveryOptions.bypassActionQueue, undefined);
    assert.equal(typeof call.deliveryOptions.onPlaybackStarted, "function");
    assert.equal(harness.delivery.getVoiceSpeakQueueLength(), 0);

    const mirror = startupMirrorsOnly(harness.startupMirrors);
    assert.equal(mirror.length, 1);
    assert.equal(mirror[0].source, "startup_voice_mirror");
    assert.equal(mirror[0].text, STARTUP_PHRASE);
    assert.equal(mirror[0].holdUntilTs, playback.holdUntilTs);
    assert.ok(harness.startupInvalidations.some((count) => count >= 1));
    assert.deepEqual(
      harness.events.filter((name) => name === "speak:" + STARTUP_PHRASE || name === "startup-mirror" || name === "refresh"),
      [`speak:${STARTUP_PHRASE}`, "startup-mirror", "refresh"]
    );
    assert.equal(harness.refreshCount(), 1);
    assert.equal(harness.replies.length, 0);

    await harness.release();
    await harness.delivery.maybeDeliverMiaVoice(
      {
        ok: true,
        route: "community",
        eventType: "COMMENT",
        overlayPayload: { owner: "mia", text: "normal-reply", userLabel: "Ada" }
      },
      {
        shouldSpeak: true,
        text: "normal-reply",
        voiceMode: "primary",
        voiceSpeaker: "mia",
        primaryOwner: "mia"
      }
    );
    assert.equal(harness.replies.length, 1);
    assert.equal(harness.replies[0].text, "normal-reply");
  });

  await test("active paid speech keeps the floor and startup waits as system", async () => {
    const harness = createHarness();
    const paid = await harness.sayPaid("PAID-A");
    const paidPlayback = harness.delivery.getVoicePlaybackState();
    assert.equal(paid.voiceAdmission.started, true);
    assert.equal(paid.voiceAdmission.voiceClass, undefined);

    await harness.startup.emitStartupOverlay();

    assert.equal(harness.delivery.getVoicePlaybackState().playbackId, paidPlayback.playbackId);
    assert.equal(harness.delivery.getVoicePlaybackState().textPreview, "PAID-A");
    assert.equal(harness.spoken.includes(STARTUP_PHRASE), false);
    assert.equal(startupMirrorsOnly(harness.startupMirrors).length, 0);
    assert.equal(harness.refreshCount(), 1);
    assert.equal(harness.delivery.getVoiceSpeakQueueLength(), 1);
    const queued = harness.logs.filter((entry) => entry.stage === "voice_speak_queued");
    assert.equal(queued[queued.length - 1].voiceClass, "system");
    assert.equal(queued[queued.length - 1].textPreview, STARTUP_PHRASE.slice(0, 80));
    assert.ok(harness.events.includes("refresh"));
    assert.equal(harness.events.includes(`speak:${STARTUP_PHRASE}`), false);

    await harness.release();
    assert.equal(harness.spoken.includes(STARTUP_PHRASE), true);
    const mirror = startupMirrorsOnly(harness.startupMirrors);
    assert.equal(mirror.length, 1);
    assert.equal(mirror[0].holdUntilTs, harness.delivery.getVoicePlaybackState().holdUntilTs);
    assert.equal(
      harness.spoken.filter((text) => text === "PAID-A" || text === STARTUP_PHRASE).join(" > "),
      "PAID-A > " + STARTUP_PHRASE
    );
  });

  await test("startup older than 10s drops without synthesis or mirror", async () => {
    await withClock(async (clock) => {
      const harness = createHarness();
      const paid = await harness.sayPaid("PAID-HOLD");
      assert.equal(paid.voiceAdmission.started, true);
      const paidPlaybackId = harness.delivery.getVoicePlaybackState().playbackId;

      await harness.startup.emitStartupOverlay();
      assert.equal(harness.refreshCount(), 1);
      assert.equal(harness.delivery.getVoiceSpeakQueueLength(), 1);

      clock.advance(10001);
      assert.equal(harness.delivery.getVoicePlaybackState().playbackId, paidPlaybackId);
      assert.equal(harness.delivery.getVoicePlaybackState().textPreview, "PAID-HOLD");
      assert.equal(harness.spoken.includes(STARTUP_PHRASE), false);
      assert.equal(startupMirrorsOnly(harness.startupMirrors).length, 0);

      await harness.release();
      assert.equal(harness.spoken.includes(STARTUP_PHRASE), false);
      assert.equal(startupMirrorsOnly(harness.startupMirrors).length, 0);
      assert.equal(dropped(harness.logs, "stale_non_paid").length, 1);
      assert.equal(dropped(harness.logs, "stale_non_paid")[0].voiceClass, "system");
      assert.equal(
        dropped(harness.logs, "stale_non_paid")[0].textPreview,
        STARTUP_PHRASE.slice(0, 80)
      );
      assert.equal(harness.refreshCount(), 1);
    });
  });

  await test("a later paid line waits behind startup that is already speaking", async () => {
    const harness = createHarness();
    await harness.startup.emitStartupOverlay();
    const startupPlayback = harness.delivery.getVoicePlaybackState();
    assert.equal(startupPlayback.textPreview, STARTUP_PHRASE);
    assert.ok(Number(startupPlayback.playbackId) > 0);

    const paid = await harness.sayPaid("PAID-NEXT");
    assert.equal(paid.voiceAdmission.queued, true);
    assert.equal(paid.voiceAdmission.voiceClass, "paid_support");
    assert.equal(harness.delivery.getVoicePlaybackState().playbackId, startupPlayback.playbackId);
    assert.equal(harness.delivery.getVoicePlaybackState().textPreview, STARTUP_PHRASE);
    assert.equal(harness.spoken.includes("PAID-NEXT"), false);
    assert.equal(harness.delivery.getVoiceSpeakQueueLength(), 1);

    await harness.release();
    assert.deepEqual(
      harness.spoken.filter((text) => text === STARTUP_PHRASE || text === "PAID-NEXT"),
      [STARTUP_PHRASE, "PAID-NEXT"]
    );
  });

  await test("startup TTS failure does not create playback and still refreshes", async () => {
    const harness = createHarness({
      speak: async (payload, ctx) => {
        if (payload.text === STARTUP_PHRASE) {
          throw new Error("startup_tts_down");
        }
        return speakOk(payload.text, ctx.spoken);
      }
    });

    await harness.startup.emitStartupOverlay();
    assert.equal(harness.delivery.getVoicePlaybackState(), null);
    assert.equal(startupMirrorsOnly(harness.startupMirrors).length, 0);
    assert.equal(harness.spoken.includes(STARTUP_PHRASE), false);
    assert.equal(harness.refreshCount(), 1);
    assert.ok(
      harness.logs.some(
        (entry) => entry.source === "startup_voice" && entry.error === "startup_tts_down"
      )
    );

    const next = await harness.sayPaid("AFTER-FAIL");
    assert.equal(next.voiceAdmission.started, true);
    assert.equal(harness.spoken.includes("AFTER-FAIL"), true);
    assert.equal(harness.delivery.getVoicePlaybackState().textPreview, "AFTER-FAIL");
    await harness.release();
  });

  await test("disabled TTS keeps the text startup overlay and skips voice delivery", async () => {
    const harness = createHarness({ ttsEnabled: false });
    await harness.startup.emitStartupOverlay();

    assert.equal(harness.voiceCalls.length, 0);
    assert.equal(harness.spoken.length, 0);
    assert.equal(startupMirrorsOnly(harness.startupMirrors).length, 0);
    assert.equal(harness.delivery.getVoicePlaybackState(), null);
    const fallback = harness.overlays.find((row) => row.payload && row.payload.stage === "startup");
    assert.ok(fallback);
    assert.equal(
      fallback.payload.text,
      "Server připojen — overlay funguje. Pošli gift nebo napiš do chatu."
    );
    assert.equal(fallback.opts.source, "startup_ping");
    assert.equal(harness.refreshCount(), 1);
  });

  console.log("startup_voice_queue_contract: all passed");
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
