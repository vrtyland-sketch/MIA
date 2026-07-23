"use strict";

const assert = require("assert/strict");
const path = require("path");

const TARGET = path.resolve(__dirname, "..", "index.js");

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

function clearTargetModule() {
  delete require.cache[TARGET];
}

function waitFor(predicate, timeoutMs = 300) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    function step() {
      try {
        if (predicate()) {
          resolve(true);
          return;
        }

        if (Date.now() - started >= timeoutMs) {
          reject(new Error("waitFor timeout"));
          return;
        }

        setTimeout(step, 5);
      } catch (err) {
        reject(err);
      }
    }

    step();
  });
}

function createResponseCapture() {
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

function loadIndexWithVoiceRoute(options = {}) {
  clearTargetModule();

  const routes = {
    post: new Map(),
    get: new Map()
  };

  const expressApp = {
    use() {},
    get(path, handler) {
      routes.get.set(path, handler);
    },
    post(path, handler) {
      routes.post.set(path, handler);
    },
    listen(_port, cb) {
      if (typeof cb === "function") cb();
      return {
        close() {},
        on() {
          return this;
        }
      };
    }
  };

  const expressStub = function express() {
    return expressApp;
  };
  expressStub.json = () => (_req, _res, next) => next && next();
  expressStub.urlencoded = () => (_req, _res, next) => next && next();
  expressStub.static = () => (_req, _res, next) => next && next();

  class OBSWebSocketStub {
    on() {}
    async connect() {
      return true;
    }
    async call() {
      return { ok: true };
    }
  }

  const stubs = {
    express: expressStub,
    "obs-websocket-js": { default: OBSWebSocketStub },
    "./scripts/MIA_GAME_CONFIG": {
      CHAT: {
        min_length: 3,
        allow_emoji_only: false,
        cooldown_sec: 0,
        cap_per_min: 999
      },
      ECONOMY: {
        coin_to_points: 7.5,
        comment_to_points: 7.5,
        thanks_threshold: 37.5,
        item_threshold: 75,
        video_threshold: 150,
        song_threshold: 250
      }
    },
    "./scripts/MIA_CONFIG": {
      buildRuntimeConfig() {
        return {
          server: { port: 3000 },
          obs: {
            url: "ws://127.0.0.1:4455",
            password: "",
            reconnect: {
              enabled: false,
              retryMs: 2500
            },
            tierSources: {
              T1: ["T1_VIDEO_01"],
              T2: ["T2_VIDEO_05"],
              T3: ["T3_VIDEO_09"],
              T4: ["T4_VIDEO_13"]
            }
          },
          overlay: {
            enabled: true,
            obsControlEnabled: false,
            maxChatFeedItems: 6,
            chatFeedMaxAgeMs: 15000,
            sceneMap: {}
          },
          bowl: {},
          kick: {
            enabled: true
          },
          outputPolicy: {},
          miaNext: {
            enabled: true,
            activeRuntime: "MIA_NEXT",
            share: {
              enabled: true,
              runtimeBridgeEnabled: true,
              debugRouteEnabled: true
            }
          }
        };
      }
    },
    "./shared/platform_normalizers/normalize_event": {
      normalizeEvent(raw) {
        return raw;
      }
    },
    "./scripts/MIA_OUTPUT_POLICY": {
      createOutputPolicy() {
        return {};
      },
      canEmitOutput() {
        return { allowed: true, reason: "ok" };
      },
      markOutputEmitted() {}
    },
    "./scripts/MIA_OUTPUT_STATE": {
      createOutputState() {
        return {};
      },
      markOutputEvent() {},
      setLastEvent() {},
      setLastChatMessage() {},
      setLastOverlay() {},
      setLastText() {},
      setQueueSize() {}
    },
    "./scripts/MIA_OVERLAY_STATE": {
      createOverlayState() {
        return {
          miaOverlay: null,
          kojnozoutOverlay: null,
          chatFeed: []
        };
      },
      setOverlay(_state, payload) {
        return {
          ...payload,
          accepted: true
        };
      },
      getOverlaySnapshot(state) {
        return state;
      },
      pushChatFeedItem() {}
    },
    "./scripts/MIA_STREAM_STATE": {
      createStreamState() {
        return {
          support: { totalCoins: 111, totalGiftEvents: 5 },
          chat: { totalMessages: 8 },
          counters: { supportEvents: 5, communityEvents: 8 }
        };
      },
      applySupportImpact(state) {
        return state;
      },
      applyCommunityImpact(state) {
        return state;
      },
      getStreamStateSnapshot(state) {
        return state;
      }
    },
    "./legacy/MIA_SUPPORT_RESOLVER": {
      enrichNormalizedSupport() {}
    },
    "./scripts/MIA_RESPONSE_ENGINE": {
      buildDirectChatResponse() {
        return null;
      }
    },
    "./scripts/MIA_CHAT_BRAIN": {
      decideChatReaction() {
        return { ok: false, reason: "disabled_in_test" };
      }
    },
    "./scripts/MIA_VIDEO_ENGINE": {
      createVideoEngine() {
        return {
          getSnapshot() {
            return { queueLength: 0 };
          },
          hasTierSources() {
            return true;
          },
          async enqueueGiftPlayback() {
            return { ok: true, snapshot: { queueLength: 0 } };
          },
          handleMediaPlaybackEnded() {}
        };
      }
    },
    "./scripts/KOJNOZROUT_BOWL_ENGINE": {
      processBowlCycle(state) {
        return { state };
      },
      forceResetBowl(state) {
        return { state, event: null };
      }
    },
    "./scripts/MIA_KOJNOZROUT_ENGINE": {
      createKojnozoutState() {
        return {
          bowlPercent: 77,
          mood: "happy",
          stage: "rest",
          hunger: 20,
          energy: 80
        };
      },
      applySupportToKojnozout(state) {
        return { state };
      },
      applyCommunityPingToKojnozout(state) {
        return { state };
      },
      getKojnozoutSnapshot(state) {
        return state;
      }
    },
    "./scripts/MIA_KICK_BRIDGE": {
      async startKickBridge() {
        return { ok: true, reason: "started" };
      },
      stop() {}
    },
    "./scripts/MIA_VOICE_CONTROL_LAYER": {
      createVoiceControlLayer() {
        return {
          resolveVoiceCommand(input) {
            if (input.text === "Kojnožroute sedni") {
              return {
                ok: true,
                accepted: true,
                domain: "kojnozout",
                target: "kojnozout",
                command: "sit",
                execution: {
                  kind: "entity_behavior",
                  obsSceneSwitchAllowed: false
                },
                response: {
                  speaker: "kojnozout",
                  text: "Sedím."
                }
              };
            }

            return {
              ok: true,
              accepted: true,
              domain: "system",
              target: "system",
              intent: {
                type: "world_mode",
                worldMode: "nejsem_tu"
              },
              execution: {
                kind: "world_mode_only",
                sceneMode: "nejsem_tu",
                obsSceneSwitchAllowed: false
              },
              response: {
                speaker: "mia",
                text: "Přepínám world mode."
              }
            };
          }
        };
      }
    },
    "./MIA_NEXT/engine_shadow_runtime": {
      runShadowPipeline() {
        return {
          ok: true,
          decisionResult: {},
          actionResult: {
            route: "community",
            shouldPlayVideo: false
          }
        };
      }
    },
    "./scripts/MIA_ANIMATION_TRACE": {
      buildAnimationTrace() {
        return { ok: true };
      }
    },
    "./shared/runtime_execution": {
      runRuntimeExecutionBridge: async () => ({
        overlay: { emitted: false, reason: "no_overlay" },
        video: { ok: true, skipped: true, reason: "no_video" }
      })
    },
    "./shared/runtime_execution/intent_resolver": {
      resolveIntent() {
        return { type: "none" };
      }
    },
    "./renderers/obs_overlay_render": {
      createObsOverlayRenderer() {
        return {
          async render() {
            return {
              emitted: false,
              reason: "scene_switch_disabled_variant_A"
            };
          }
        };
      }
    },
    "./shared/next/share_runtime_share_debug_route": {
      mountSharePreviewDebugRoute() {}
    },
    ...options.overrides
  };

  const Module = require("module");
  const originalLoad = Module._load;

  Module._load = function patched(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(stubs, request)) {
      return stubs[request];
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    require(TARGET);
    return routes;
  } finally {
    Module._load = originalLoad;
  }
}

(async () => {
  await test("registers /voice/command route", async () => {
    const routes = loadIndexWithVoiceRoute();

    await waitFor(() => routes.post.has("/voice/command"));
    assert.equal(typeof routes.post.get("/voice/command"), "function");
  });

  await test("rejects untrusted voice request", async () => {
    const routes = loadIndexWithVoiceRoute();

    await waitFor(() => routes.post.has("/voice/command"));
    const handler = routes.post.get("/voice/command");

    const req = {
      body: {
        text: "zapni nejsem tu",
        trusted: false,
        source: "streamer_voice"
      }
    };
    const res = createResponseCapture();

    await handler(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.error, "VOICE_COMMAND_UNTRUSTED_SOURCE");
  });

  await test("accepts trusted world mode command and returns voice state", async () => {
    const routes = loadIndexWithVoiceRoute();

    await waitFor(() => routes.post.has("/voice/command"));
    const handler = routes.post.get("/voice/command");

    const req = {
      body: {
        text: "zapni nejsem tu",
        trusted: true,
        source: "streamer_voice",
        speaker: "streamer"
      }
    };
    const res = createResponseCapture();

    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.accepted, true);
    assert.equal(res.body.voice.worldMode, "nejsem_tu");
    assert.equal(res.body.obs.autoSceneSwitch, false);
    assert.equal(res.body.decision.execution.obsSceneSwitchAllowed, false);
  });

  await test("accepts trusted Kojnozout pet command", async () => {
    const routes = loadIndexWithVoiceRoute();

    await waitFor(() => routes.post.has("/voice/command"));
    const handler = routes.post.get("/voice/command");

    const req = {
      body: {
        text: "Kojnožroute sedni",
        trusted: true,
        source: "streamer_voice",
        speaker: "streamer"
      }
    };
    const res = createResponseCapture();

    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.decision.domain, "kojnozout");
    assert.equal(res.body.decision.target, "kojnozout");
    assert.equal(res.body.decision.command, "sit");
    assert.equal(res.body.decision.response.speaker, "kojnozout");
    assert.equal(res.body.obs.autoSceneSwitch, false);
  });

  console.log("");
  console.log("---- VOICE ENDPOINT SMOKE SUMMARY ----");
  console.log(`passed: ${results.passed}`);
  console.log(`failed: ${results.failed}`);

  if (results.failed > 0) {
    process.exit(1);
  }

  process.exit(0);
})().catch((err) => {
  console.error("❌ voice endpoint smoke runner crashed");
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});