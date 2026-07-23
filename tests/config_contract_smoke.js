"use strict";

const assert = require("assert/strict");
const {
  buildRuntimeConfig,
  buildOverlaySceneMap
} = require("../scripts/MIA_CONFIG");

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

(async () => {
  await test("buildOverlaySceneMap returns stable defaults", async () => {
    const map = buildOverlaySceneMap({});

    assert.deepEqual(map, {
      mia: "MIA_SCENE",
      miaSupport: "MIA_SUPPORT_SCENE",
      miaShare: "MIA_SHARE_SCENE",
      miaCommunity: "MIA_SCENE",
      miaBattle: "MIA_BATTLE_SCENE",

      kojnozout: "KOJNOZROUT_SCENE",
      kojnozoutSupport: "KOJNOZROUT_SUPPORT_SCENE",
      kojnozoutShare: "KOJNOZROUT_SHARE_SCENE",
      kojnozoutCommunity: "KOJNOZROUT_SCENE",
      kojnozoutBattle: "KOJNOZROUT_BATTLE_SCENE",

      battle: "BATTLE_SCENE",
      combat: "BATTLE_SCENE",
      default: "",
      idle: "",
      lobby: "",
      intro: "",
      outro: ""
    });
  });

  await test("buildRuntimeConfig returns stable server and overlay defaults", async () => {
    const config = buildRuntimeConfig({});

    assert.equal(config.server.port, 3000);

    assert.equal(config.overlay.enabled, true);
    assert.equal(config.overlay.obsControlEnabled, false);
    assert.equal(config.overlay.maxChatFeedItems, 6);
    assert.equal(config.overlay.chatFeedMaxAgeMs, 35000);

    assert.ok(config.overlay.sceneMap);
    assert.equal(config.overlay.sceneMap.mia, "MIA_SCENE");
    assert.equal(config.overlay.sceneMap.miaBattle, "MIA_BATTLE_SCENE");
    assert.equal(config.overlay.sceneMap.kojnozout, "KOJNOZROUT_SCENE");
    assert.equal(
      config.overlay.sceneMap.kojnozoutBattle,
      "KOJNOZROUT_BATTLE_SCENE"
    );
    assert.equal(config.overlay.sceneMap.battle, "BATTLE_SCENE");
    assert.equal(config.overlay.sceneMap.combat, "BATTLE_SCENE");
  });

  await test("buildRuntimeConfig returns stable obs defaults", async () => {
    const config = buildRuntimeConfig({});

    assert.equal(config.obs.url, "ws://127.0.0.1:4455");
    assert.equal(config.obs.password, "");
    assert.equal(config.obs.sceneName, "SPINAK_ENGINE_GIFTS");

    assert.deepEqual(config.obs.tierSources.T1, [
      "T1_VIDEO_01",
      "T1_VIDEO_02",
      "T1_VIDEO_03",
      "T1_VIDEO_04",
      "T1_VIDEO_05",
      "T1_VIDEO_06"
    ]);

    assert.deepEqual(config.obs.tierSources.T2, [
      "T2_VIDEO_05",
      "T2_VIDEO_06",
      "T2_VIDEO_07",
      "T2_VIDEO_08",
      "T2_VIDEO_09",
      "T2_VIDEO_10"
    ]);

    assert.deepEqual(config.obs.tierSources.T3, [
      "T3_VIDEO_09",
      "T3_VIDEO_10",
      "T3_VIDEO_11",
      "T3_VIDEO_12",
      "T3_VIDEO_13",
      "T3_VIDEO_14"
    ]);

    assert.deepEqual(config.obs.tierSources.T4, [
      "T4_VIDEO_13",
      "T4_VIDEO_14",
      "T4_VIDEO_15",
      "T4_VIDEO_16",
      "T4_VIDEO_17",
      "T4_VIDEO_18"
    ]);

    assert.equal(config.obs.giftWaitMediaEnd, true);
    assert.equal(config.obs.stopPreviousOnly, true);

    assert.equal(config.obs.reconnect.enabled, true);
    assert.equal(config.obs.reconnect.retryMs, 2500);
    assert.equal(config.obs.reconnect.maxWaitForReadyMs, 15000);
  });

  await test("buildRuntimeConfig respects explicit env overrides", async () => {
    const config = buildRuntimeConfig({
      PORT: "4444",
      OBS_WS_URL: "ws://192.168.0.10:4455",
      OBS_WS_PASSWORD: "secret",
      MIA_OBS_CONTROL_ENABLED: "true",
      MIA_OVERLAY_MAX_CHAT_FEED_ITEMS: "9",
      MIA_OVERLAY_CHAT_FEED_MAX_AGE_MS: "22000",
      MIA_OBS_SCENE_MIA: "MIA_MAIN",
      MIA_OBS_SCENE_MIA_BATTLE: "MIA_BATTLE",
      MIA_OBS_SCENE_KOJNOZOUT: "KOJ_MAIN",
      MIA_OBS_SCENE_KOJNOZOUT_BATTLE: "KOJ_BATTLE",
      MIA_OBS_SCENE_BATTLE: "GLOBAL_BATTLE",
      MIA_OBS_SCENE_IDLE: "GLOBAL_IDLE",
      KICK_ENABLED: "false",
      MIA_ACTIVE_RUNTIME: "MIA_NEXT",
      MIA_NEXT_SHARE_ENABLED: "true",
      MIA_NEXT_SHARE_BRIDGE_ENABLED: "true",
      MIA_NEXT_SHARE_DEBUG_ROUTE_ENABLED: "false"
    });

    assert.equal(config.server.port, 4444);
    assert.equal(config.obs.url, "ws://192.168.0.10:4455");
    assert.equal(config.obs.password, "secret");

    assert.equal(config.overlay.obsControlEnabled, true);
    assert.equal(config.overlay.maxChatFeedItems, 9);
    assert.equal(config.overlay.chatFeedMaxAgeMs, 22000);
    assert.equal(config.overlay.sceneMap.mia, "MIA_MAIN");
    assert.equal(config.overlay.sceneMap.miaBattle, "MIA_BATTLE");
    assert.equal(config.overlay.sceneMap.kojnozout, "KOJ_MAIN");
    assert.equal(config.overlay.sceneMap.kojnozoutBattle, "KOJ_BATTLE");
    assert.equal(config.overlay.sceneMap.battle, "GLOBAL_BATTLE");
    assert.equal(config.overlay.sceneMap.idle, "GLOBAL_IDLE");

    assert.equal(config.kick.enabled, false);

    assert.equal(config.miaNext.enabled, true);
    assert.equal(config.miaNext.activeRuntime, "MIA_NEXT");
    assert.equal(config.miaNext.share.enabled, true);
    assert.equal(config.miaNext.share.runtimeBridgeEnabled, true);
    assert.equal(config.miaNext.share.debugRouteEnabled, false);
  });

  await test("buildOverlaySceneMap supports legacy combat aliases", async () => {
    const map = buildOverlaySceneMap({
      MIA_OBS_SCENE_MIA_COMBAT: "MIA_COMBAT",
      MIA_OBS_SCENE_KOJNOZOUT_COMBAT: "KOJ_COMBAT",
      MIA_OBS_SCENE_COMBAT: "GLOBAL_COMBAT"
    });

    assert.equal(map.miaBattle, "MIA_COMBAT");
    assert.equal(map.kojnozoutBattle, "KOJ_COMBAT");
    assert.equal(map.battle, "GLOBAL_COMBAT");
    assert.equal(map.combat, "GLOBAL_COMBAT");
  });

  await test("buildRuntimeConfig keeps runtime switch in sync", async () => {
    const config = buildRuntimeConfig({
      MIA_ACTIVE_RUNTIME: "MIA_NEXT",
      MIA_NEXT_STRICT_PARITY: "true",
      MIA_NEXT_LOG_PARITY: "true"
    });

    assert.equal(config.miaNext.activeRuntime, "MIA_NEXT");
    assert.equal(config.miaNext.enabled, true);
    assert.equal(config.miaNext.strictParity, true);
    assert.equal(config.miaNext.logParity, true);

    assert.equal(config.miaNext.runtimeSwitch.activeRuntime, "MIA_NEXT");
    assert.equal(config.miaNext.runtimeSwitch.enableNextRuntime, true);
    assert.equal(config.miaNext.runtimeSwitch.strictParity, true);
    assert.equal(config.miaNext.runtimeSwitch.logParity, true);

    assert.equal(config.miaNext.shadow.enabled, false);
  });

  console.log("");
  console.log("---- CONFIG CONTRACT SMOKE SUMMARY ----");
  console.log(`passed: ${results.passed}`);
  console.log(`failed: ${results.failed}`);

  if (results.failed > 0) {
    process.exit(1);
  }

  process.exit(0);
})().catch((err) => {
  console.error("❌ config contract smoke runner crashed");
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});