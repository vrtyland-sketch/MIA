"use strict";

const assert = require("assert/strict");
const path = require("path");
const Module = require("module");
const realFs = require("fs");

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, timeoutMs = 1500, stepMs = 25) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const value = predicate();
    if (value) return value;
    await sleep(stepMs);
  }

  return null;
}

async function waitForKickLogs(loaded, timeoutMs = 1500) {
  return waitFor(() => {
    const logs = loaded.getLogEntries("kick-events");
    return logs.length > 0 ? logs : null;
  }, timeoutMs, 25);
}

function loadIndexWithStubs() {
  const indexPath = path.resolve(__dirname, "../index.js");
  const originalLoad = Module._load;

  const routeRegistry = {
    get: new Map(),
    post: new Map()
  };

  const expressApp = {
    use() {},
    get(route, handler) {
      routeRegistry.get.set(route, handler);
    },
    post(route, handler) {
      routeRegistry.post.set(route, handler);
    },
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

  function expressStub() {
    return expressApp;
  }
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

  let capturedKickOnEvent = null;
  const logWrites = [];

  const fsStub = {
    ...realFs,
    appendFileSync(filePath, content) {
      logWrites.push({
        filePath: String(filePath),
        content: String(content)
      });
    },
    appendFile(filePath, content, _encoding, cb) {
      logWrites.push({
        filePath: String(filePath),
        content: String(content)
      });
      if (typeof _encoding === "function") {
        _encoding();
      } else if (typeof cb === "function") {
        cb();
      }
    }
  };

  const videoEngineStub = {
    getSnapshot() {
      return {
        queueLength: 0,
        isPlaying: false
      };
    },
    async enqueueGiftPlayback(tier, normalizedEvent) {
      return {
        ok: true,
        skipped: false,
        reason: "ok",
        tier,
        normalizedEvent,
        snapshot: {
          queueLength: 1,
          isPlaying: false
        }
      };
    },
    hasTierSources() {
      return true;
    },
    handleMediaPlaybackEnded() {}
  };

  const outputStateStub = {
    lastEvent: null,
    lastOverlay: null,
    lastText: null,
    queueSize: 0,
    chatMessage: ""
  };

  const overlayStateStub = {
    miaOverlay: null,
    kojnozoutOverlay: null,
    chatFeed: []
  };

  const streamStateStub = {
    supportCount: 0,
    communityCount: 0
  };

  const kojnozoutStateStub = {
    bowlPercent: 0,
    mood: "idle"
  };

  const stubs = {
    fs: fsStub,
    express: expressStub,
    "obs-websocket-js": {
      default: OBSWebSocketStub
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
            }
          },
          outputPolicy: {},
          overlay: {
            maxChatFeedItems: 5,
            chatFeedMaxAgeMs: 15000
          },
          bowl: {
            fullVideoTier: "T4",
            fallbackVideoTier: "T3",
            specialCooldownMs: 12000
          },
          kick: {
            enabled: true
          }
        };
      }
    },
    "./scripts/MIA_GAME_CONFIG": {
      CHAT: {
        min_length: 3,
        allow_emoji_only: false,
        cooldown_sec: 1,
        cap_per_min: 20
      },
      ECONOMY: {
        coin_to_points: 7.5,
        comment_to_points: 7.5,
        song_threshold: 250,
        video_threshold: 150,
        item_threshold: 75,
        thanks_threshold: 37.5
      }
    },
    "./shared/platform_normalizers/normalize_event": {
      normalizeEvent(rawEvent) {
        const typeRaw = String(
          rawEvent?.eventType || rawEvent?.type || rawEvent?.rawType || ""
        ).toUpperCase();

        if (typeRaw.includes("COMMENT")) {
          return {
            eventType: "COMMENT",
            route: "community",
            platform: rawEvent?.platform || "tiktok",
            message:
              rawEvent?.message ||
              rawEvent?.content ||
              rawEvent?.text ||
              rawEvent?.comment ||
              "",
            comment:
              rawEvent?.comment ||
              rawEvent?.message ||
              rawEvent?.content ||
              rawEvent?.text ||
              "",
            content:
              rawEvent?.content ||
              rawEvent?.message ||
              rawEvent?.text ||
              rawEvent?.comment ||
              "",
            text:
              rawEvent?.text ||
              rawEvent?.message ||
              rawEvent?.content ||
              rawEvent?.comment ||
              "",
            user: {
              userId: rawEvent?.userId || rawEvent?.user?.userId || "u_comment",
              id: rawEvent?.userId || rawEvent?.user?.userId || "u_comment",
              username:
                rawEvent?.username || rawEvent?.user?.username || "comment_user",
              nickname:
                rawEvent?.nickname || rawEvent?.user?.nickname || "Comment User",
              displayName:
                rawEvent?.nickname || rawEvent?.user?.nickname || "Comment User",
              name: rawEvent?.nickname || rawEvent?.user?.nickname || "Comment User"
            },
            communityImpact: {
              score: 1
            }
          };
        }

        if (typeRaw.includes("GIFT")) {
          return {
            eventType: "GIFT",
            route: "support",
            platform: rawEvent?.platform || "tiktok",
            support: {
              tier: "T1",
              coins: Number(rawEvent?.coins || 1),
              count: Number(rawEvent?.count || 1),
              giftName: rawEvent?.giftName || "Rose"
            },
            user: {
              userId: rawEvent?.userId || rawEvent?.user?.userId || "u_gift",
              id: rawEvent?.userId || rawEvent?.user?.userId || "u_gift",
              username: rawEvent?.username || rawEvent?.user?.username || "gift_user",
              nickname: rawEvent?.nickname || rawEvent?.user?.nickname || "Gift User",
              displayName:
                rawEvent?.nickname || rawEvent?.user?.nickname || "Gift User",
              name: rawEvent?.nickname || rawEvent?.user?.nickname || "Gift User"
            }
          };
        }

        return {
          eventType: "UNKNOWN"
        };
      }
    },
    "./scripts/MIA_OUTPUT_POLICY": {
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
    },
    "./scripts/MIA_OUTPUT_STATE": {
      createOutputState() {
        return outputStateStub;
      },
      markOutputEvent(state, payload) {
        state.lastMarkedEvent = payload;
      },
      setLastOverlay(state, overlay) {
        state.lastOverlay = overlay;
      },
      setLastText(state, owner, text) {
        state.lastText = { owner, text };
      },
      setQueueSize(state, size) {
        state.queueSize = size;
      },
      setLastChatMessage(state, message) {
        state.chatMessage = message;
      },
      setLastEvent(state, event) {
        state.lastEvent = event;
      }
    },
    "./scripts/MIA_OVERLAY_STATE": {
      createOverlayState() {
        return overlayStateStub;
      },
      setOverlay(state, payload) {
        if (payload?.owner === "kojnozout") {
          state.kojnozoutOverlay = {
            ...payload,
            accepted: true,
            updatedAt: Date.now()
          };
          return state.kojnozoutOverlay;
        }

        state.miaOverlay = {
          ...payload,
          accepted: true,
          updatedAt: Date.now()
        };
        return state.miaOverlay;
      },
      getOverlaySnapshot(state) {
        return {
          miaOverlay: state.miaOverlay,
          kojnozoutOverlay: state.kojnozoutOverlay,
          chatFeed: state.chatFeed
        };
      },
      pushChatFeedItem(state, item, maxItems) {
        state.chatFeed.unshift(item);
        state.chatFeed = state.chatFeed.slice(0, maxItems || 5);
      }
    },
    "./scripts/MIA_STREAM_STATE": {
      createStreamState() {
        return streamStateStub;
      },
      applySupportImpact(state, support) {
        return {
          ...state,
          supportCount: (state.supportCount || 0) + 1,
          lastSupport: support || null
        };
      },
      applyCommunityImpact(state, impact, meta) {
        return {
          ...state,
          communityCount: (state.communityCount || 0) + 1,
          lastCommunityImpact: impact || null,
          lastCommunityMeta: meta || null
        };
      },
      getStreamStateSnapshot(state) {
        return { ...state };
      }
    },
    "./scripts/MIA_SUPPORT_RESOLVER": {
      enrichNormalizedSupport(normalizedEvent) {
        normalizedEvent.support = normalizedEvent.support || {};
        normalizedEvent.support.tier =
          normalizedEvent.support.tier ||
          (Number(normalizedEvent.support.coins || 0) >= 10 ? "T2" : "T1");
      }
    },
    "./scripts/MIA_RESPONSE_ENGINE": {
      buildDirectChatResponse(_outputState, input) {
        return {
          route: "community",
          overlayPayload: {
            owner: input?.target || "mia",
            text: `Reply to ${input?.userLabel || "user"}`
          }
        };
      }
    },
    "./scripts/MIA_CHAT_BRAIN": {
      decideChatReaction(input) {
        const message = String(input?.message || "").toLowerCase();
        if (message.includes("mia")) {
          return {
            ok: true,
            speaker: "mia"
          };
        }

        return {
          ok: false,
          reason: "not_targeted"
        };
      }
    },
    "./scripts/MIA_VIDEO_ENGINE": {
      createVideoEngine() {
        return videoEngineStub;
      }
    },
    "./scripts/KOJNOZROUT_BOWL_ENGINE": {
      processBowlCycle(state) {
        return {
          state,
          triggerFullEvent: false,
          shouldPlayFullVideo: false
        };
      },
      forceResetBowl(state) {
        return {
          state,
          event: { type: "reset" }
        };
      }
    },
    "./scripts/MIA_KOJNOZROUT_ENGINE": {
      createKojnozoutState() {
        return kojnozoutStateStub;
      },
      applySupportToKojnozout(state) {
        return { state };
      },
      applyCommunityPingToKojnozout(state) {
        return { state };
      },
      getKojnozoutSnapshot(state) {
        return { ...state };
      }
    },
    "./scripts/MIA_KICK_BRIDGE": {
      async startKickBridge({ onEvent } = {}) {
        capturedKickOnEvent = onEvent || null;
        return {
          ok: true,
          reason: "started_by_test"
        };
      }
    },
    "./MIA_NEXT/engine_shadow_runtime": {
      runShadowPipeline(input) {
        const eventType = input?.rawEvent?.eventType;

        if (eventType === "GIFT") {
          return {
            ok: true,
            decisionResult: {
              route: "support",
              speaker: "mia"
            },
            actionResult: {
              route: "support",
              tier: input?.rawEvent?.support?.tier || "T1",
              overlayPayload: {
                owner: "mia",
                text: "Support received"
              },
              shouldPlayVideo: true
            },
            animationTrace: {
              ok: true,
              effective: {
                owner: "mia",
                effectProgram: "generic_support"
              }
            }
          };
        }

        return {
          ok: true,
          decisionResult: {
            route: "community",
            speaker: "mia"
          },
          actionResult: {
            route: "community",
            overlayPayload: {
              owner: "mia",
              text: "Community event"
            },
            shouldPlayVideo: false
          },
          animationTrace: {
            ok: true,
            effective: {
              owner: "mia",
              effectProgram: "generic_community"
            }
          }
        };
      }
    },
    "./scripts/MIA_ANIMATION_TRACE": {
      buildAnimationTrace({ actionResult } = {}) {
        return {
          ok: true,
          effective: {
            owner:
              actionResult?.overlay?.owner ||
              actionResult?.overlayPayload?.owner ||
              "mia",
            effectProgram: actionResult?.shouldPlayVideo
              ? "generic_support"
              : "generic_community"
          }
        };
      }
    },
    "./scripts/MIA_PORT_GUARD": {
      async assertPortAvailableOrExit() {
        return true;
      },
      printPortInUseHelp() {}
    },
    "./scripts/MIA_STARTUP_CHECK": {
      buildStartupCheckPayload() {
        return { ok: true, checks: [] };
      },
      async emitStartupCheckSlide() {
        return { ok: true, skipped: true };
      }
    },
    "./shared/next/share_runtime_share_debug_route": {
      mountSharePreviewDebugRoute() {}
    },
    "./shared/runtime_execution": require("../shared/runtime_execution")
  };

  delete require.cache[indexPath];
  try {
    delete require.cache[require.resolve("fs")];
  } catch (_err) {
    // ignore
  }

  Module._load = function patchedLoader(request, parent, isMain) {
    if (parent && parent.filename === indexPath && stubs[request]) {
      return stubs[request];
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    require(indexPath);
  } finally {
    Module._load = originalLoad;
  }

  function getLogEntries(prefix) {
    return logWrites
      .filter((entry) => path.basename(entry.filePath).startsWith(`${prefix}-`))
      .flatMap((entry) =>
        String(entry.content)
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            try {
              return JSON.parse(line);
            } catch (_err) {
              return null;
            }
          })
          .filter(Boolean)
      );
  }

  return {
    app: expressApp,
    routeRegistry,
    getCapturedKickOnEvent() {
      return capturedKickOnEvent;
    },
    getLogEntries
  };
}

(async () => {
  await test("index module loads with test stubs", async () => {
    const loaded = loadIndexWithStubs();
    assert.ok(loaded);
    assert.equal(typeof loaded.getCapturedKickOnEvent, "function");
  });

  await test("bootstrap wires kick onEvent callback", async () => {
    const loaded = loadIndexWithStubs();
    const onEvent = await waitFor(
      () => loaded.getCapturedKickOnEvent(),
      1500,
      25
    );

    assert.equal(typeof onEvent, "function");
  });

  await test("comment ingest through kick callback logs valid runtime result", async () => {
    const loaded = loadIndexWithStubs();
    const onEvent = await waitFor(
      () => loaded.getCapturedKickOnEvent(),
      1500,
      25
    );

    assert.equal(typeof onEvent, "function");

    const commentEvent = {
      source: "debug",
      platform: "tiktok",
      type: "comment",
      eventType: "comment",
      content: "Ahoj MIA",
      message: "Ahoj MIA",
      username: "tester",
      nickname: "Tester",
      userId: "u_comment"
    };

    await assert.doesNotReject(async () => {
      await onEvent(commentEvent);
    });

    const kickLogs = await waitForKickLogs(loaded);
    assert.ok(kickLogs && kickLogs.length > 0);

    const lastKickLog = kickLogs[kickLogs.length - 1];
    assert.ok(lastKickLog.result);
    assert.equal(lastKickLog.result.status, 200);
    assert.equal(lastKickLog.result.body.ok, true);
    assert.ok(lastKickLog.result.body.animationTrace);
    assert.ok(lastKickLog.result.body.overlayEmit);
  });

  await test("gift ingest through kick callback logs executionResult", async () => {
    const loaded = loadIndexWithStubs();
    const onEvent = await waitFor(
      () => loaded.getCapturedKickOnEvent(),
      1500,
      25
    );

    assert.equal(typeof onEvent, "function");

    const giftEvent = {
      source: "debug",
      platform: "tiktok",
      type: "gift",
      eventType: "gift",
      giftName: "Rose",
      coins: 5,
      count: 1,
      username: "gifter",
      nickname: "Gifter",
      userId: "u_gift"
    };

    await assert.doesNotReject(async () => {
      await onEvent(giftEvent);
    });

    const kickLogs = await waitForKickLogs(loaded);
    assert.ok(kickLogs && kickLogs.length > 0);

    const lastKickLog = kickLogs[kickLogs.length - 1];
    assert.ok(lastKickLog.result);
    assert.equal(lastKickLog.result.status, 200);
    assert.equal(lastKickLog.result.body.ok, true);
    assert.ok(lastKickLog.result.body.executionResult);
    assert.ok(lastKickLog.result.body.animationTrace);
    assert.ok(lastKickLog.result.body.videoResult);
    assert.equal(
      typeof lastKickLog.result.body.executionResult.status,
      "string"
    );
  });

  await test("gift ingest path reaches shared execution-compatible response shape", async () => {
    const loaded = loadIndexWithStubs();
    const onEvent = await waitFor(
      () => loaded.getCapturedKickOnEvent(),
      1500,
      25
    );

    assert.equal(typeof onEvent, "function");

    const giftEvent = {
      source: "debug",
      platform: "tiktok",
      type: "gift",
      eventType: "gift",
      giftName: "Rose",
      coins: 5,
      count: 1,
      username: "gifter",
      nickname: "Gifter",
      userId: "u_gift"
    };

    await assert.doesNotReject(async () => {
      await onEvent(giftEvent);
    });

    const kickLogs = await waitForKickLogs(loaded);
    assert.ok(kickLogs && kickLogs.length > 0);
    const lastKickLog = kickLogs[kickLogs.length - 1];
    const body = lastKickLog.result.body;

    assert.equal(body.runtime.selectedRuntime, "MIA_NEXT");
    assert.ok(body.decision);
    assert.ok(body.actionResult);
    assert.ok(body.executionResult);
    assert.ok(body.overlayEmit);
    assert.ok(body.videoResult);
    assert.ok(body.animationTrace);
  });

  console.log("");
  console.log("---- INGEST CONTRACT SMOKE SUMMARY ----");
  console.log(`passed: ${results.passed}`);
  console.log(`failed: ${results.failed}`);

  if (results.failed > 0) {
    process.exit(1);
  }

  process.exit(0);
})().catch((err) => {
  console.error("❌ ingest contract smoke runner crashed");
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});