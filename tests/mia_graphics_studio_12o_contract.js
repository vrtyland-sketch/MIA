"use strict";

const assert = require("assert/strict");
const graphicsStudio = require("../shared/mia-graphics-studio");
const bodyGiftMoment = require("../scripts/MIA_BODY_GIFT_MOMENT");
const fs = require("fs");
const path = require("path");

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

function createMockObs(initial = {}) {
  const inputs = [...(initial.inputs || [])];
  const settings = { ...(initial.settings || {}) };
  const sceneItems = [...(initial.sceneItems || [])];
  const sceneName = initial.sceneName || "SPINAK_ENGINE_GIFTS";

  async function obsCall(requestType, requestData = {}) {
    switch (requestType) {
      case "GetInputList":
        return { inputs };
      case "GetInputSettings":
        return { inputSettings: settings[requestData.inputName] || { url: "" } };
      case "SetInputSettings":
        settings[requestData.inputName] = {
          ...(settings[requestData.inputName] || {}),
          ...(requestData.inputSettings || {})
        };
        return { ok: true };
      case "GetSceneItemList":
        return { sceneItems: sceneItems.filter(() => requestData.sceneName === sceneName) };
      case "SetSceneItemEnabled":
      case "SetSceneItemTransform":
        return { ok: true };
      default:
        throw new Error(`unexpected obs call ${requestType}`);
    }
  }

  return { obsCall, settings, sceneName };
}

function buildFullBodyMock() {
  return createMockObs({
    inputs: [
      { inputName: "MIA_HEAD", inputKind: "browser_source" },
      { inputName: "MIA_EYES", inputKind: "browser_source" },
      { inputName: "MIA_HANDS", inputKind: "browser_source" },
      { inputName: "MIA_TORSO", inputKind: "browser_source" },
      { inputName: "MIA_FEET", inputKind: "browser_source" }
    ],
    settings: {
      MIA_HEAD: { url: "http://127.0.0.1:3000/mia-body-part-overlay.html?part=head" },
      MIA_EYES: { url: "http://127.0.0.1:3000/mia-body-part-overlay.html?part=eyes" },
      MIA_HANDS: { url: "http://127.0.0.1:3000/mia-body-part-overlay.html?part=hands" },
      MIA_TORSO: { url: "http://127.0.0.1:3000/mia-body-part-overlay.html?part=torso" },
      MIA_FEET: { url: "http://127.0.0.1:3000/mia-body-part-overlay.html?part=feet" }
    },
    sceneItems: [
      { sourceName: "MIA_HEAD", sceneItemId: 1 },
      { sourceName: "MIA_EYES", sceneItemId: 2 },
      { sourceName: "MIA_HANDS", sceneItemId: 3 },
      { sourceName: "MIA_TORSO", sceneItemId: 4 },
      { sourceName: "MIA_FEET", sceneItemId: 5 }
    ]
  });
}

(async () => {
  await test("shouldRunGiftBodyMoment requires T3+", () => {
    assert.equal(bodyGiftMoment.shouldRunGiftBodyMoment("T2"), false);
    assert.equal(bodyGiftMoment.shouldRunGiftBodyMoment("T3"), true);
    assert.equal(bodyGiftMoment.shouldRunGiftBodyMoment("T5"), true);
  });

  await test("resolveHoldMsForTier scales with tier", () => {
    assert.ok(bodyGiftMoment.resolveHoldMsForTier("T3") >= 4000);
    assert.ok(bodyGiftMoment.resolveHoldMsForTier("T6") > bodyGiftMoment.resolveHoldMsForTier("T3"));
  });

  await test("showGiftBodyMoment skips low tiers", async () => {
    bodyGiftMoment.resetGiftBodyMomentStateForTests();
    const result = await bodyGiftMoment.showGiftBodyMoment({ tier: "T2", syncObs: false });
    assert.equal(result.skipped, true);
  });

  await test("showGiftBodyMoment enables preview then auto hides", async () => {
    bodyGiftMoment.resetGiftBodyMomentStateForTests();
    graphicsStudio.resetBodyPreview();
    const mock = buildFullBodyMock();

    const shown = await bodyGiftMoment.showGiftBodyMoment({
      tier: "T4",
      holdMs: 60,
      syncObs: true,
      obsCall: mock.obsCall,
      sceneName: mock.sceneName,
      port: 3000
    });

    assert.equal(shown.ok, true);
    assert.equal(shown.phase, "12o");
    assert.equal(shown.published.mood, "duel");
    assert.equal(graphicsStudio.getBodyState().parts.head, true);
    assert.match(mock.settings.MIA_HEAD.url, /sync=hybrid/);

    await new Promise((resolve) => setTimeout(resolve, 120));
    assert.equal(graphicsStudio.getBodyState().parts.head, false);
  });

  await test("gift media runtime schedules body moment", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "..", "scripts", "MIA_GIFT_MEDIA_RUNTIME.js"),
      "utf8"
    );
    assert.match(src, /MIA_BODY_GIFT_MOMENT/);
    assert.match(src, /scheduleGiftBodyMomentShow/);
  });

  await test("feature flag disables gift body moment", async () => {
    bodyGiftMoment.resetGiftBodyMomentStateForTests();
    const result = await bodyGiftMoment.showGiftBodyMoment({
      tier: "T5",
      syncObs: false,
      env: { ...process.env, MIA_BODY_GIFT_MOMENT: "0" }
    });
    assert.equal(result.skipped, true);
  });

  console.log("mia_graphics_studio_12o_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
