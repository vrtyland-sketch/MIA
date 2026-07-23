"use strict";

const assert = require("assert/strict");
const streamSession = require("../scripts/MIA_STREAM_SESSION");
const economyConfig = require("../scripts/MIA_STREAM_ECONOMY_CONFIG");
const giftTiers = require("../scripts/MIA_GIFT_TIERS");
const userAck = require("../scripts/MIA_USER_ACK_THROTTLE");
const { registerRemoteDevRoutes } = require("../routes/remote_dev");
const { registerStreamSessionRoutes } = require("../routes/stream_session");
const { registerStatusRoutes } = require("../routes/status");
const { registerAllRoutes } = require("../routes");
const { createCareCommandHandler } = require("../routes/care_commands");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("stream session PRELIVE → LIVE → ENDED", () => {
  let session = streamSession.createStreamSession();
  assert.equal(session.phase, "PRELIVE");

  session = streamSession.markLive(session, "ingest");
  assert.equal(session.phase, "LIVE");
  assert.ok(session.liveAt);

  session = streamSession.markEnded(session, "shutdown");
  assert.equal(session.phase, "ENDED");
  assert.ok(session.endedAt);
});

test("shouldMarkLiveFromEvent skips test/debug platform", () => {
  assert.equal(streamSession.shouldMarkLiveFromEvent({ platform: "test" }), false);
  assert.equal(streamSession.shouldMarkLiveFromEvent({ platform: "tiktok" }), true);
});

test("economy config matches gift tiers", () => {
  const tiers = economyConfig.getTierConfig();
  assert.equal(tiers.miaPointsPerCoin, giftTiers.MIA_POINTS_PER_COIN);
  assert.deepEqual(tiers.coinThresholds, giftTiers.COIN_TIER_THRESHOLDS);
});

test("user ack throttle loads from economy config", () => {
  const cfg = economyConfig.getUserAckThrottleConfig();
  assert.equal(userAck.GIFT_ACK_COOLDOWN_MS.medium, cfg.giftAckCooldownMs.medium);
});

test("remote dev routes module registers endpoints", () => {
  const routes = { get: [], post: [] };
  const app = {
    get(path, handler) {
      routes.get.push(path);
    },
    post(path, handler) {
      routes.post.push(path);
    }
  };
  const result = registerRemoteDevRoutes(app, {
    localAdminGuard: (_req, _res, next) => next && next(),
    remoteDevModule: { getStatus: () => ({ ok: true }) },
    giftMapEnterprise: {},
    getLastGiftMapping: () => null,
    getServerStartedAt: () => Date.now(),
    writeLog: () => {},
    safeString: (v, f = "") => (typeof v === "string" && v.trim() ? v.trim() : f)
  });
  assert.equal(result.ok, true);
  assert.ok(routes.get.includes("/mia/remote/dev/status"));
  assert.ok(routes.post.includes("/mia/remote/dev/command"));
});

test("stream session routes module registers endpoints", () => {
  const routes = { get: [], post: [] };
  const app = {
    get(path) {
      routes.get.push(path);
    },
    post(path) {
      routes.post.push(path);
    }
  };
  let session = streamSession.createStreamSession();
  const result = registerStreamSessionRoutes(app, {
    localAdminGuard: (_req, _res, next) => next && next(),
    streamSessionModule: streamSession,
    getStreamSession: () => session,
    setStreamSession: (next) => {
      session = next;
      return session;
    },
    writeLog: () => {},
    safeString: (v, f = "") => (typeof v === "string" && v.trim() ? v.trim() : f)
  });
  assert.equal(result.ok, true);
  assert.ok(routes.get.includes("/stream/session"));
  assert.ok(routes.post.includes("/stream/session/end"));
  assert.ok(routes.post.includes("/stream/session/reset"));
});

test("status routes module registers endpoints", () => {
  const routes = { get: [] };
  const app = {
    get(path) {
      routes.get.push(path);
    }
  };
  const result = registerStatusRoutes(app, {
    buildMiaStatusResponse: () => ({ ok: true })
  });
  assert.equal(result.ok, true);
  assert.ok(routes.get.includes("/status"));
  assert.ok(routes.get.includes("/gift-map/status"));
  assert.ok(routes.get.includes("/obs/live-manifest"));
});

test("care command handler factory returns async function", () => {
  const handler = createCareCommandHandler({
    safeString: (v, f = "") => (typeof v === "string" && v.trim() ? v.trim() : f),
    upper: (v) => String(v || "").toUpperCase(),
    getUserLabel: () => "Tester",
    getRuntimeConfig: () => ({}),
    getStreamState: () => ({}),
    getOutputState: () => ({}),
    setOutputState: () => {},
    getKojnozoutState: () => ({}),
    setKojnozoutState: () => {},
    getKojnozoutBackpackState: () => ({}),
    setKojnozoutBackpackState: () => {},
    getItemDisplayState: () => ({}),
    setItemDisplayState: () => {},
    getKojnozoutDuelState: () => ({}),
    setKojnozoutDuelState: () => {},
    executeOverlay: async () => ({}),
    deliverQuestCompleteMoment: async () => {},
    scheduleWorldSave: () => {},
    scheduleStoryAnimationAfterFeed: async () => {},
    writeLog: () => {},
    giftMapEnterprise: {},
    modules: {}
  });
  assert.equal(typeof handler, "function");
});

test("registerAllRoutes wires core route packages", () => {
  const routes = { get: [], post: [] };
  const app = {
    get(path) {
      routes.get.push(path);
    },
    post(path) {
      routes.post.push(path);
    },
    use() {}
  };
  const noop = () => {};
  const result = registerAllRoutes(app, {
    buildHealthPayload: () => ({ ok: true }),
    buildDiagnosePayload: () => ({ ok: true }),
    buildStartupCheckPayload: () => ({ ok: true }),
    ingestAuthGuard: (_req, _res, next) => next && next(),
    handleIngest: async () => ({}),
    handleAudienceIngest: async () => ({}),
    localAdminGuard: (_req, _res, next) => next && next(),
    buildPublicOverlayStateResponse: () => ({}),
    resetOverlayState: noop,
    PORT: 3000,
    mediaCatalogModule: {},
    mediaOrchestratorModule: {},
    mediaApplyObsModule: {},
    mediaTemplateRendererModule: {},
    videoEngine: {},
    bowlFullVideoModule: {},
    safeObsCall: async () => ({}),
    miaEyes: {},
    deliverActionVoice: async () => ({}),
    getVoicePlaybackSnapshot: () => ({}),
    speakerRoutingModule: {},
    runtimeConfig: {},
    obs: {},
    writeLog: noop,
    safeString: (v, f = "") => (typeof v === "string" && v.trim() ? v.trim() : f),
    safeRequire: () => ({}),
    remoteDevModule: { getStatus: () => ({ ok: true }) },
    giftMapEnterprise: {},
    getLastGiftMapping: () => null,
    getServerStartedAt: () => Date.now(),
    streamSessionModule: streamSession,
    getStreamSession: () => streamSession.createStreamSession(),
    setStreamSession: () => {},
    buildMiaStatusResponse: () => ({ ok: true })
  });
  assert.equal(result.ok, true);
  assert.ok(result.routeCount >= 20, `expected many routes, got ${result.routeCount}`);
  assert.ok(routes.get.includes("/health"));
  assert.ok(routes.get.includes("/overlay-state"));
  assert.ok(routes.post.includes("/ingest"));
  assert.ok(routes.post.includes("/system/restart"));
  assert.ok(routes.get.includes("/tts/test"));
  assert.ok(routes.get.includes("/mia/vision"));
  assert.ok(routes.post.includes("/voice/command"));
});

console.log("p2_architecture_contract: all passed");
