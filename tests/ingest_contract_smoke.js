"use strict";

const assert = require("assert/strict");
const path = require("path");
const Module = require("module");
const realFs = require("fs");

const results = {
  passed: 0,
  failed: 0
};

// Keep obs_hands / self-restart from calling process.exit(0) before the summary.
process.env.MIA_SELF_RESTART = "0";

const realProcessExit = process.exit.bind(process);
process.exit = function ingestSmokeExit(code) {
  const nextCode = results.failed > 0 ? 1 : code == null ? 0 : code;
  return realProcessExit(nextCode);
};

process.on("beforeExit", (code) => {
  if (results.failed > 0 && code === 0) {
    realProcessExit(1);
  }
});

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

function loadIndexWithStubs() {
  const indexPath = path.resolve(__dirname, "../index.js");
  const originalLoad = Module._load;

  const routeRegistry = {
    get: new Map(),
    post: new Map()
  };

  const expressApp = {
    use() {},
    get(route, ...handlers) {
      routeRegistry.get.set(
        route,
        handlers.filter((handler) => typeof handler === "function")
      );
    },
    post(route, ...handlers) {
      routeRegistry.post.set(
        route,
        handlers.filter((handler) => typeof handler === "function")
      );
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
  let capturedKickStart = null;
  const logWrites = [];

  const restartStub = {
    isSelfRestartEnabled() {
      return false;
    },
    isRestartPending() {
      return false;
    },
    shouldRestartAfterHands() {
      return false;
    },
    shouldRestartAfterMediaApply() {
      return false;
    },
    scheduleInProcessRestart() {
      return { scheduled: false, reason: "stubbed_by_ingest_smoke" };
    },
    maybeScheduleRestartAfterHands() {
      return { scheduled: false, reason: "stubbed_by_ingest_smoke" };
    },
    maybeScheduleRestartAfterMediaApply() {
      return { scheduled: false, reason: "stubbed_by_ingest_smoke" };
    },
    spawnDetachedRestart() {
      return { scheduled: false, reason: "stubbed_by_ingest_smoke" };
    },
    triggerExternalRestart() {
      return { scheduled: false, reason: "stubbed_by_ingest_smoke" };
    }
  };

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
      async startKickBridge(options = {}) {
        capturedKickStart = options;
        capturedKickOnEvent = options.onEvent ?? null;
        return {
          ok: true,
          reason: "started_by_test"
        };
      },
      async start(options = {}) {
        capturedKickStart = options;
        capturedKickOnEvent = options.onEvent ?? null;
        return {
          ok: true,
          reason: "started_by_test"
        };
      }
    },
    "./scripts/MIA_SELF_RESTART": restartStub,
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

  const safeRequirePath = path.resolve(__dirname, "../scripts/MIA_SAFE_REQUIRE.js");
  const selfRestartPath = path.resolve(__dirname, "../scripts/MIA_SELF_RESTART.js");

  delete require.cache[indexPath];
  delete require.cache[selfRestartPath];
  try {
    delete require.cache[require.resolve("fs")];
  } catch (_err) {
    // ignore
  }
  try {
    delete require.cache[safeRequirePath];
  } catch (_err) {
    // ignore
  }

  function lookupStub(request) {
    if (Object.prototype.hasOwnProperty.call(stubs, request)) {
      return stubs[request];
    }
    try {
      const relFromRoot =
        "./" + path.relative(path.resolve(__dirname, ".."), request).replace(/\\/g, "/");
      if (Object.prototype.hasOwnProperty.call(stubs, relFromRoot)) {
        return stubs[relFromRoot];
      }
    } catch (_err) {
      // ignore
    }
    return undefined;
  }

  function isSelfRestartRequest(request) {
    const text = String(request || "").replace(/\\/g, "/");
    return /(?:^|\/)MIA_SELF_RESTART(?:\.js)?$/.test(text);
  }

  Module._load = function patchedLoader(request, parent, isMain) {
    if (isSelfRestartRequest(request)) {
      return restartStub;
    }
    if (parent) {
      const parentFile = parent.filename;
      if (parentFile === indexPath || parentFile === safeRequirePath) {
        const stub = lookupStub(request);
        if (stub !== undefined) {
          return stub;
        }
      }
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
    getCapturedKickStart() {
      return capturedKickStart;
    },
    getLogEntries
  };
}

async function invokeRoute(handlers, { method = "POST", body = {}, query = {}, ip = "127.0.0.1" } = {}) {
  assert.ok(Array.isArray(handlers) && handlers.length > 0, "route handlers missing");
  const req = {
    method,
    body,
    query,
    headers: {},
    ip,
    socket: { remoteAddress: ip }
  };
  let statusCode = 200;
  let jsonBody = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      jsonBody = payload;
      return this;
    }
  };

  let index = 0;
  async function next() {
    const handler = handlers[index];
    index += 1;
    if (typeof handler !== "function") return;
    await handler(req, res, next);
  }

  await next();
  return { status: statusCode, body: jsonBody };
}

(async () => {
  await test("index module loads with test stubs", async () => {
    const loaded = loadIndexWithStubs();
    assert.ok(loaded);
    assert.equal(typeof loaded.getCapturedKickOnEvent, "function");
  });

  await test("bootstrap starts Kick on unified /ingest with onEvent null", async () => {
    const loaded = loadIndexWithStubs();
    const startOpts = await waitFor(
      () => loaded.getCapturedKickStart(),
      1500,
      25
    );

    assert.ok(startOpts, "kick bridge start was not called");
    assert.equal(startOpts.onEvent, null);
    assert.match(String(startOpts.config?.ingestUrl || ""), /\/ingest$/);
  });

  await test("POST /ingest accepts a comment without a kick onEvent callback", async () => {
    const loaded = loadIndexWithStubs();
    const startOpts = await waitFor(
      () => loaded.getCapturedKickStart(),
      1500,
      25
    );
    assert.equal(startOpts && startOpts.onEvent, null);

    const response = await invokeRoute(loaded.routeRegistry.post.get("/ingest"), {
      body: {
        source: "debug",
        platform: "tiktok",
        type: "comment",
        eventType: "comment",
        content: "Ahoj MIA",
        message: "Ahoj MIA",
        username: "tester",
        nickname: "Tester",
        userId: "u_comment"
      }
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.accepted, true);
    assert.equal(response.body.queued, true);
    assert.equal(typeof response.body.lane, "string");
  });

  await test("POST /ingest accepts a gift without a kick onEvent callback", async () => {
    const loaded = loadIndexWithStubs();
    const startOpts = await waitFor(
      () => loaded.getCapturedKickStart(),
      1500,
      25
    );
    assert.equal(startOpts && startOpts.onEvent, null);

    const response = await invokeRoute(loaded.routeRegistry.post.get("/ingest"), {
      body: {
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
      }
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.accepted, true);
    assert.equal(response.body.queued, true);
    assert.equal(typeof response.body.lane, "string");
  });

  await test("tikfinity and tiktok aliases share the unified /ingest gateway", async () => {
    const loaded = loadIndexWithStubs();
    const aliases = ["/ingest", "/tikfinity/ingest", "/tiktok/ingest"];

    for (const route of aliases) {
      const handlers = loaded.routeRegistry.post.get(route);
      assert.ok(Array.isArray(handlers) && handlers.length >= 2, route);
      const response = await invokeRoute(handlers, {
        body: {
          source: "debug",
          platform: "tiktok",
          type: "comment",
          eventType: "comment",
          content: "Ahoj MIA",
          username: "tester",
          userId: "u_alias"
        }
      });
      assert.equal(response.status, 200, route);
      assert.equal(response.body.ok, true, route);
      assert.equal(response.body.accepted, true, route);
    }
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