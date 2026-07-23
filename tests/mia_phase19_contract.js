"use strict";

const assert = require("assert");
const { PNG } = require("pngjs");
const { createMattingIngestBridge } = require("../scripts/MIA_MATTING_INGEST_BRIDGE");
const streamerMatting = require("../scripts/MIA_STREAMER_MATTING");
const immersiveScene = require("../scripts/MIA_IMMERSIVE_SCENE");
const overlayState = require("../scripts/MIA_OVERLAY_STATE");
const { createMiaEyes } = require("../scripts/MIA_EYES");

function solidPngBase64(r, g, b) {
  return new Promise((resolve, reject) => {
    const png = new PNG({ width: 64, height: 80 });
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = r;
      png.data[i + 1] = g;
      png.data[i + 2] = b;
      png.data[i + 3] = 255;
    }
    const chunks = [];
    png
      .pack()
      .on("data", (chunk) => chunks.push(chunk))
      .on("end", () => resolve(Buffer.concat(chunks).toString("base64")))
      .on("error", reject);
  });
}

function createMockObs(imageB64) {
  const sceneItems = {
    NOTEBOOK_CAMERA: { sceneItemId: 1, sceneItemEnabled: true },
    MIA_CAM_01_FRONT: { sceneItemId: 2, sceneItemEnabled: true }
  };

  return async function safeObsCall(requestType, requestData = {}) {
    switch (requestType) {
      case "GetSceneItemId": {
        const row = sceneItems[requestData.sourceName];
        if (!row) return { ok: false, reason: "not_found" };
        return { ok: true, response: { sceneItemId: row.sceneItemId } };
      }
      case "GetSceneItemEnabled": {
        const row = Object.values(sceneItems).find((x) => x.sceneItemId === requestData.sceneItemId);
        return { ok: true, response: { sceneItemEnabled: row?.sceneItemEnabled !== false } };
      }
      case "GetSourceScreenshot":
        return {
          ok: true,
          response: { imageData: imageB64 }
        };
      default:
        return { ok: false, reason: `unexpected_${requestType}` };
    }
  };
}

async function testBridgeIngestFromObs() {
  streamerMatting.clearMatteState();
  const imageB64 = await solidPngBase64(120, 90, 70);
  const bridge = createMattingIngestBridge({
    runtimeConfig: {
      obs: { sceneName: "TEST_SCENE" },
      mattingIngest: {
        enabled: true,
        onlyWhenImmersive: false,
        minLuminance: 8
      }
    },
    safeObsCall: createMockObs(imageB64),
    streamerMatting,
    getImmersiveSceneSnapshot: () => null,
    appendJsonLog: () => {}
  });

  const tick = await bridge.tick({ force: true });
  assert.equal(tick.ok, true);
  assert.ok(tick.okCount >= 1, "expected at least one successful capture");

  const matte = streamerMatting.getMatteState();
  assert.equal(matte.active, true);
  assert.ok(matte.matteDataUrl.startsWith("data:image/png;base64,"));
}

async function testBridgeOnlyWhenImmersive() {
  const bridge = createMattingIngestBridge({
    runtimeConfig: {
      mattingIngest: { enabled: true, onlyWhenImmersive: true }
    },
    safeObsCall: createMockObs(""),
    streamerMatting,
    getImmersiveSceneSnapshot: () => null
  });

  const idle = await bridge.tick();
  assert.equal(idle.action, "idle_no_immersive");
}

async function testCaptureScreenshotReturnsImageData() {
  const imageB64 = await solidPngBase64(40, 180, 40);
  const eyes = createMiaEyes({
    safeObsCall: createMockObs(imageB64),
    runtimeConfig: { obs: { sceneName: "TEST_SCENE" } },
    appendJsonLog: () => {}
  });

  const shot = await eyes.captureScreenshot({
    sourceName: "NOTEBOOK_CAMERA",
    save: false
  });
  assert.equal(shot.ok, true);
  assert.ok(shot.imageData && shot.imageData.length > 20);
}

function testChatAutoApplyCombat() {
  const state = overlayState.createOverlayState();
  immersiveScene.clearImmersiveScene(state);

  const first = immersiveScene.tryAutoApplyFromChat(
    state,
    { chatText: "jdeme do boje!", userLabel: "Tester" },
    { chatCooldownMs: 60000 }
  );
  assert.equal(first.ok, true);
  assert.equal(first.applied.mode, "combat");

  const snap = overlayState.getImmersiveSceneSnapshot(state);
  assert.equal(snap.environmentId, "arena_combat_neon");

  const second = immersiveScene.tryAutoApplyFromChat(
    state,
    { chatText: "bojujeme dál" },
    { chatCooldownMs: 60000 }
  );
  assert.equal(second.skipped, true);
  assert.equal(second.reason, "cooldown");

  immersiveScene.clearImmersiveScene(state);
}

function testShouldAutoApplyFromChat() {
  assert.equal(
    immersiveScene.shouldAutoApplyFromChat({ mode: "combat", environmentId: "arena_combat_neon" }),
    true
  );
  assert.equal(
    immersiveScene.shouldAutoApplyFromChat({ mode: "immersive", environmentId: "space_cockpit" }),
    true
  );
  assert.equal(
    immersiveScene.shouldAutoApplyFromChat({ mode: "immersive", environmentId: "studio_neutral" }),
    false
  );
}

async function main() {
  await testBridgeIngestFromObs();
  await testBridgeOnlyWhenImmersive();
  await testCaptureScreenshotReturnsImageData();
  testChatAutoApplyCombat();
  testShouldAutoApplyFromChat();
  console.log("mia_phase19_contract: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
