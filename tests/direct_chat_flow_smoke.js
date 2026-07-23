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

function waitFor(predicate, timeoutMs = 3000) {
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

function loadIndexWithStubs(options = {}) {
  clearTargetModule();

  const shared = {
    overlayState: null,
    outputState: null,
    streamState: null,
    kojnozoutState: null,
    kickBridgeState: null,
    capturedKickResults: []
  };

  const expressApp = {
    use() {},
    get() {},
    post() {},
    listen(_port, hostOrCb, maybeCb) {
      const cb = typeof hostOrCb === "function" ? hostOrCb : maybeCb;
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

  const defaultChatBrain = {
    decideChatReaction({ message }) {
      if (!message || !String(message).trim()) {
        return { ok: false, reason: "empty_message" };
      }
      return {
        ok: true,
        speaker: "mia"
      };
    }
  };

  const defaultResponseEngine = {
    buildDirectChatResponse(_outputState, input) {
      return {
        route: "community",
        shouldPlayVideo: false,
        overlayPayload: {
          owner: input?.target === "kojnozout" ? "kojnozout" : "mia",
          route: "community",
          stage: "community",
          text: `Reply to: ${input?.message || ""}`,
          user: input?.userLabel || "někdo"
        }
      };
    }
  };

  const defaultOverlayStateModule = {
    createOverlayState() {
      shared.overlayState = {
        miaOverlay: null,
        kojnozoutOverlay: null,
        chatFeed: []
      };
      return shared.overlayState;
    },
    setOverlay(state, payload) {
      const accepted = {
        ...payload,
        accepted: true,
        reason: "ok",
        updatedAt: Date.now()
      };

      if ((payload?.owner || "mia") === "kojnozout") {
        state.kojnozoutOverlay = accepted;
      } else {
        state.miaOverlay = accepted;
      }

      return accepted;
    },
    getOverlaySnapshot(state) {
      const live = state?.kojnozoutOverlay || state?.miaOverlay || null;

      return {
        miaOverlay: state?.miaOverlay || null,
        kojnozoutOverlay: state?.kojnozoutOverlay || null,
        chatFeed: state?.chatFeed || [],
        owner: live?.owner || "",
        text: live?.text || "",
        route: live?.route || "",
        stage: live?.stage || ""
      };
    },
    pushChatFeedItem(state, item, maxItems) {
      state.chatFeed = [item].concat(state.chatFeed || []).slice(0, maxItems || 6);
    }
  };

  const defaultOutputPolicyModule = {
    createOutputPolicy() {
      return {};
    },
    canEmitOutput() {
      return {
        allowed: true,
        reason: "ok"
      };
    },
    markOutputEmitted() {}
  };

  const defaultOutputStateModule = {
    createOutputState() {
      shared.outputState = {};
      return shared.outputState;
    },
    markOutputEvent() {},
    setLastEvent() {},
    setLastChatMessage() {},
    setLastOverlay() {},
    setLastText() {},
    setQueueSize() {}
  };

  const defaultStreamStateModule = {
    createStreamState() {
      shared.streamState = {};
      return shared.streamState;
    },
    applySupportImpact(state) {
      return state;
    },
    applyCommunityImpact(state) {
      return state;
    },
    getStreamStateSnapshot(state) {
      return state || {};
    }
  };

  const defaultKojnozoutModule = {
    createKojnozoutState() {
      shared.kojnozoutState = {
        bowlPercent: 0,
        mood: "neutral"
      };
      return shared.kojnozoutState;
    },
    applySupportToKojnozout(state) {
      return { state };
    },
    applyCommunityPingToKojnozout(state) {
      return { state };
    },
    getKojnozoutSnapshot(state) {
      return state || {};
    }
  };

  const defaultKickBridgeModule = {
    async startKickBridge({ onEvent }) {
      shared.kickBridgeState = {
        onEvent: async (evt) => {
          const result = await onEvent(evt);
          shared.capturedKickResults.push({
            input: evt,
            result
          });
          return result;
        }
      };
      return { ok: true, reason: "started" };
    },
    stop() {}
  };

  const realRuntimeExecution = require("../shared/runtime_execution");

  const defaultRuntimeExecution = {
    runRuntimeExecutionBridge: realRuntimeExecution.runRuntimeExecutionBridge
  };

  const defaultConfigModule = {
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
          sceneMap: {
            mia: "MIA_SCENE",
            miaSupport: "MIA_SUPPORT_SCENE",
            miaShare: "MIA_SHARE_SCENE",
            miaCommunity: "MIA_SCENE",
            kojnozout: "KOJNOZROUT_SCENE",
            kojnozoutSupport: "KOJNOZROUT_SUPPORT_SCENE",
            kojnozoutShare: "KOJNOZROUT_SHARE_SCENE",
            kojnozoutCommunity: "KOJNOZROUT_SCENE"
          }
        },
        bowl: {},
        kick: {
          enabled: true
        },
        outputPolicy: {},
        tts: {
          enabled: false
        },
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
  };

  const defaultNormalizer = {
    normalizeEvent(raw) {
      if (!raw || typeof raw !== "object") return null;

      const message =
        raw.message ||
        raw.content ||
        raw.text ||
        raw.comment ||
        "";

      return {
        eventType: "COMMENT",
        route: "community",
        platform: raw.platform || "kick",
        message,
        comment: message,
        content: message,
        text: message,
        user: {
          userId: raw.userId || "u1",
          username: raw.username || "tester",
          nickname: raw.nickname || "Tester"
        }
      };
    }
  };

  const defaultSupportResolver = {
    enrichNormalizedSupport() {}
  };

  const defaultVideoEngineFactory = {
    createVideoEngine() {
      return {
        getSnapshot() {
          return { queueLength: 0 };
        },
        hasTierSources() {
          return true;
        },
        async enqueueGiftPlayback() {
          return {
            ok: true,
            skipped: false,
            snapshot: { queueLength: 1 }
          };
        },
        handleMediaPlaybackEnded() {}
      };
    }
  };

  const defaultBowlModule = {
    processBowlCycle(state) {
      return { state };
    },
    forceResetBowl(state) {
      return { state, event: null };
    }
  };

  const defaultShadowRuntime = {
        runShadowPipeline() {
          return {
            ok: true,
            decisionResult: {
              source: "shadow"
            },
            actionResult: {
              route: "community",
              shouldPlayVideo: false,
              overlayPayload: {
                owner: options.shadowOwner || "mia",
                route: "community",
                stage: "community",
                text: options.shadowText || "shadow overlay"
              }
            }
          };
        }
  };

  const defaultAnimationTrace = {
    buildAnimationTrace() {
      return {
        ok: true,
        effective: {
          owner: "mia",
          effectProgram: "generic_support"
        }
      };
    }
  };

  const defaultObsOverlayRenderer = {
    createObsOverlayRenderer() {
      return {
        async render() {
          return {
            emitted: false,
            reason: "scene_switch_disabled_variant_A",
            suggestedSceneMode: "community",
            obsAction: null
          };
        }
      };
    }
  };

  const defaultVoiceLayer = {
    createVoiceControlLayer() {
      return {
        resolveVoiceCommand() {
          return {
            ok: true,
            accepted: true,
            response: {
              speaker: "mia",
              text: "voice ok"
            }
          };
        }
      };
    }
  };

  const defaultTtsEngine = {
    createTtsEngine() {
      return {
        resolveConfig() {
          return { enabled: false };
        },
        async speak() {
          return { ok: false, reason: "tts_disabled_test" };
        }
      };
    }
  };

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
    "./scripts/MIA_CONFIG": defaultConfigModule,
    "./shared/platform_normalizers/normalize_event": defaultNormalizer,
    "./scripts/MIA_OUTPUT_POLICY": defaultOutputPolicyModule,
    "./scripts/MIA_OUTPUT_STATE": defaultOutputStateModule,
    "./scripts/MIA_OVERLAY_STATE": defaultOverlayStateModule,
    "./scripts/MIA_STREAM_STATE": defaultStreamStateModule,
    "./legacy/MIA_SUPPORT_RESOLVER": defaultSupportResolver,
    "./scripts/MIA_RESPONSE_ENGINE": defaultResponseEngine,
    "./scripts/MIA_CHAT_BRAIN": defaultChatBrain,
    "./scripts/MIA_VIDEO_ENGINE": defaultVideoEngineFactory,
    "./scripts/KOJNOZROUT_BOWL_ENGINE": defaultBowlModule,
    "./scripts/MIA_KOJNOZROUT_ENGINE": defaultKojnozoutModule,
    "./scripts/MIA_KICK_BRIDGE": defaultKickBridgeModule,
    "./scripts/MIA_VOICE_CONTROL_LAYER": defaultVoiceLayer,
    "./scripts/MIA_TTS_ENGINE": defaultTtsEngine,
    "./MIA_NEXT/engine_shadow_runtime": defaultShadowRuntime,
    "./scripts/MIA_ANIMATION_TRACE": defaultAnimationTrace,
    "./shared/runtime_execution": defaultRuntimeExecution,
    "./renderers/obs_overlay_render": defaultObsOverlayRenderer,
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
    return shared;
  } finally {
    Module._load = originalLoad;
  }
}

(async () => {
  await test("direct chat ai emits MIA overlay for comment event", async () => {
    const shared = loadIndexWithStubs({
      shadowText: "Reply to: Ahoj Mio"
    });

    await waitFor(() => Boolean(shared.kickBridgeState));
    assert.equal(typeof shared.kickBridgeState.onEvent, "function");

    await shared.kickBridgeState.onEvent({
      platform: "kick",
      type: "comment",
      eventType: "comment",
      message: "Ahoj Mio",
      content: "Ahoj Mio",
      username: "tester",
      nickname: "Tester",
      userId: "u1"
    });

    await waitFor(() => Boolean(shared.overlayState?.miaOverlay), 1500);

    assert.ok(shared.overlayState);
    assert.ok(shared.overlayState.miaOverlay);
    assert.equal(shared.overlayState.miaOverlay.owner, "mia");
    assert.match(shared.overlayState.miaOverlay.text, /Ahoj Mio/);
  });

  await test("direct chat ai emits Kojnozout overlay when chatBrain selects him", async () => {
    const shared = loadIndexWithStubs({
      overrides: {
        "./scripts/MIA_CHAT_BRAIN": {
          decideChatReaction() {
            return {
              ok: true,
              speaker: "kojnozout"
            };
          }
        }
      },
      shadowOwner: "kojnozout",
      shadowText: "Reply to: Kojnožroute ahoj"
    });

    await waitFor(() => Boolean(shared.kickBridgeState));
    assert.equal(typeof shared.kickBridgeState.onEvent, "function");

    await shared.kickBridgeState.onEvent({
      platform: "kick",
      type: "comment",
      eventType: "comment",
      message: "Kojnožroute ahoj",
      content: "Kojnožroute ahoj",
      username: "tester",
      nickname: "Tester",
      userId: "u2"
    });

    await waitFor(() => Boolean(shared.overlayState?.kojnozoutOverlay), 1500);

    assert.ok(shared.overlayState);
    assert.ok(shared.overlayState.kojnozoutOverlay);
    assert.equal(shared.overlayState.kojnozoutOverlay.owner, "kojnozout");
    assert.match(shared.overlayState.kojnozoutOverlay.text, /Kojnožroute ahoj/);
  });

  await test("direct chat ai path stores callback activity through kick bridge", async () => {
    const shared = loadIndexWithStubs({
      shadowText: "Reply to: test bez videa"
    });

    await waitFor(() => Boolean(shared.kickBridgeState));

    await shared.kickBridgeState.onEvent({
      platform: "kick",
      type: "comment",
      eventType: "comment",
      message: "test bez videa",
      content: "test bez videa",
      username: "tester",
      nickname: "Tester",
      userId: "u3"
    });

    await waitFor(() => Boolean(shared.overlayState?.miaOverlay), 1500);

    assert.equal(shared.capturedKickResults.length, 1);
    assert.ok(shared.capturedKickResults[0]);
    assert.equal(shared.capturedKickResults[0].input.userId, "u3");
    assert.equal(shared.overlayState.miaOverlay.owner, "mia");
    assert.match(shared.overlayState.miaOverlay.text, /test bez videa/);
  });

  console.log("");
  console.log("---- DIRECT CHAT FLOW SMOKE SUMMARY ----");
  console.log(`passed: ${results.passed}`);
  console.log(`failed: ${results.failed}`);

  if (results.failed > 0) {
    process.exit(1);
  }

  process.exit(0);
})().catch((err) => {
  console.error("❌ direct chat flow smoke runner crashed");
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});