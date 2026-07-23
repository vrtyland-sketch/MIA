"use strict";

const assert = require("assert/strict");
const soloStream = require("../scripts/MIA_SOLO_STREAM");
const proactiveHost = require("../scripts/MIA_PROACTIVE_HOST");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

console.log("\n---- SOLO STREAM CONTRACT ----\n");

test("resolveSoloSceneName falls back through scene map keys", () => {
  const runtimeConfig = {
    obs: { sceneName: "SPINAK_ENGINE_GIFTS", returnSceneName: "" },
    overlay: {
      sceneMap: {
        default: "SPINAK_ENGINE_GIFTS",
        idle: "SPINAK_AFK",
        lobby: "SPINAK_LOBBY",
        mia: "MIA_HOST_SCENE"
      }
    }
  };

  const config = soloStream.resolveSoloStreamConfig(runtimeConfig, process.env);

  assert.equal(soloStream.resolveMainSceneName(config, runtimeConfig), "SPINAK_ENGINE_GIFTS");
  assert.equal(soloStream.resolveSoloSceneName(1, config, runtimeConfig), "SPINAK_AFK");
  assert.equal(soloStream.resolveSoloSceneName(2, config, runtimeConfig), "SPINAK_LOBBY");
  assert.equal(soloStream.resolveSoloSceneName(3, config, runtimeConfig), "MIA_HOST_SCENE");
});

test("quiet chat triggers solo enter action without wake-chat copy", () => {
  const outputState = {};
  const now = Date.now();
  const tick = proactiveHost.evaluateProactiveHostTick({
    streamState: {
      audience: { viewerCount: 12 },
      chat: { lastMessageAt: now - 130000 }
    },
    outputState,
    overlayState: {},
    serverStartedAt: now - 300000,
    kojnozoutState: { mood: "sleepy" }
  });

  const action = soloStream.evaluateSoloStreamAction({
    tick,
    outputState,
    streamState: {
      audience: { viewerCount: 12 },
      chat: { lastMessageAt: now - 130000 }
    },
    runtimeConfig: {
      soloStream: { enabled: true, obsSceneSwitch: true },
      obs: { sceneName: "SPINAK_ENGINE_GIFTS" },
      overlay: {
        sceneMap: {
          idle: "SPINAK_AFK",
          lobby: "SPINAK_LOBBY",
          mia: "MIA_HOST_SCENE",
          default: "SPINAK_ENGINE_GIFTS"
        }
      }
    },
    serverStartedAt: now - 300000,
    obsConnected: true,
    voiceActive: false,
    supportRouteActive: false,
    videoSnapshot: { processing: false }
  });

  assert.equal(tick.behavior, "solo_stream");
  assert.equal(action.action, "enter");
  assert.equal(action.targetScene, "MIA_HOST_SCENE");
});

test("recent chat triggers solo exit action", () => {
  const outputState = {
    soloStreamState: {
      phase: "solo",
      returnSceneName: "SPINAK_ENGINE_GIFTS",
      currentSceneName: "SPINAK_AFK",
      enteredAt: Date.now() - 120000,
      lastSwitchAt: Date.now() - 120000,
      lastSegmentLevel: 1,
      switchCount: 1
    }
  };
  const now = Date.now();

  const action = soloStream.evaluateSoloStreamAction({
    tick: { band: "small", quietMs: 2000, level: 1 },
    outputState,
    streamState: {
      chat: { lastMessageAt: now - 3000 }
    },
    runtimeConfig: {
      soloStream: { enabled: true, obsSceneSwitch: true },
      obs: { sceneName: "SPINAK_ENGINE_GIFTS" },
      overlay: { sceneMap: { idle: "SPINAK_AFK", default: "SPINAK_ENGINE_GIFTS" } }
    },
    serverStartedAt: now - 300000,
    obsConnected: true,
    voiceActive: false,
    supportRouteActive: false,
    videoSnapshot: { processing: false }
  });

  assert.equal(action.action, "exit");
  assert.equal(action.targetScene, "SPINAK_ENGINE_GIFTS");
});

test("gift video blocks scene switch with deferred enter", () => {
  const outputState = {};
  const now = Date.now();

  const action = soloStream.evaluateSoloStreamAction({
    tick: { band: "small", quietMs: 130000, level: 2, quietThresholdMs: 50000 },
    outputState,
    streamState: {
      chat: { lastMessageAt: now - 130000 }
    },
    runtimeConfig: {
      soloStream: { enabled: true, obsSceneSwitch: true },
      obs: { sceneName: "SPINAK_ENGINE_GIFTS" },
      overlay: { sceneMap: { lobby: "SPINAK_LOBBY", default: "SPINAK_ENGINE_GIFTS" } }
    },
    serverStartedAt: now - 300000,
    obsConnected: true,
    voiceActive: false,
    supportRouteActive: true,
    videoSnapshot: { processing: true, currentPlayback: { sourceName: "T1_VIDEO_01" } }
  });

  assert.equal(action.action, "enter_deferred");
  assert.ok(action.blockers.includes("gift_video_active"));
});

console.log("\n---- SOLO STREAM CONTRACT SUMMARY ----\n");
