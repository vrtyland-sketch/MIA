"use strict";

const assert = require("assert/strict");
const {
  syncObsBodyPreviewVisibility,
  hideAllObsBodyParts,
  BODY_PART_SPECS
} = require("../scripts/MIA_OBS_BODY_PREVIEW");
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
  const calls = [];

  async function obsCall(requestType, requestData = {}) {
    calls.push({ requestType, requestData });
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
        return {
          sceneItems: sceneItems.filter(() => requestData.sceneName === sceneName)
        };
      case "SetSceneItemEnabled":
        return { ok: true };
      case "SetSceneItemTransform":
        return { ok: true };
      default:
        throw new Error(`unexpected obs call ${requestType}`);
    }
  }

  return { obsCall, settings, calls, sceneName };
}

(async () => {
  await test("BODY_PART_SPECS cover five parts", () => {
    assert.equal(BODY_PART_SPECS.length, 5);
    assert.ok(BODY_PART_SPECS.some((row) => row.inputName === "MIA_HEAD"));
  });

  await test("syncObsBodyPreviewVisibility enables preview parts", async () => {
    const mock = createMockObs({
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

    const result = await syncObsBodyPreviewVisibility({
      obsCall: mock.obsCall,
      sceneName: mock.sceneName,
      port: 3000,
      parts: { head: true, eyes: true, hands: true, torso: false, feet: false }
    });

    assert.equal(result.ok, true);
    assert.equal(result.phase, "13e");
    assert.match(mock.settings.MIA_HEAD.url, /sync=hybrid/);
    assert.ok(
      mock.calls.some(
        (call) =>
          call.requestType === "SetSceneItemEnabled" &&
          call.requestData.sceneItemId === 1 &&
          call.requestData.sceneItemEnabled === true
      )
    );
    assert.ok(
      mock.calls.some(
        (call) =>
          call.requestType === "SetSceneItemEnabled" &&
          call.requestData.sceneItemId === 4 &&
          call.requestData.sceneItemEnabled === false
      )
    );
  });

  await test("hideAllObsBodyParts disables every body layer", async () => {
    const mock = createMockObs({
      inputs: [
        { inputName: "MIA_HEAD", inputKind: "browser_source" },
        { inputName: "MIA_EYES", inputKind: "browser_source" },
        { inputName: "MIA_HANDS", inputKind: "browser_source" },
        { inputName: "MIA_TORSO", inputKind: "browser_source" },
        { inputName: "MIA_FEET", inputKind: "browser_source" }
      ],
      settings: {
        MIA_HEAD: {
          url: "http://127.0.0.1:3000/mia-body-part-overlay.html?part=head&sync=hybrid"
        },
        MIA_EYES: {
          url: "http://127.0.0.1:3000/mia-body-part-overlay.html?part=eyes&sync=hybrid"
        },
        MIA_HANDS: {
          url: "http://127.0.0.1:3000/mia-body-part-overlay.html?part=hands&sync=hybrid"
        },
        MIA_TORSO: {
          url: "http://127.0.0.1:3000/mia-body-part-overlay.html?part=torso&sync=hybrid"
        },
        MIA_FEET: {
          url: "http://127.0.0.1:3000/mia-body-part-overlay.html?part=feet&sync=hybrid"
        }
      },
      sceneItems: [
        { sourceName: "MIA_HEAD", sceneItemId: 9 },
        { sourceName: "MIA_EYES", sceneItemId: 10 },
        { sourceName: "MIA_HANDS", sceneItemId: 11 },
        { sourceName: "MIA_TORSO", sceneItemId: 12 },
        { sourceName: "MIA_FEET", sceneItemId: 13 }
      ]
    });

    const result = await hideAllObsBodyParts({
      obsCall: mock.obsCall,
      sceneName: mock.sceneName,
      port: 3000
    });

    assert.equal(result.ok, true);
    assert.ok(
      mock.calls.some(
        (call) =>
          call.requestType === "SetSceneItemEnabled" &&
          call.requestData.sceneItemId === 9 &&
          call.requestData.sceneItemEnabled === false
      )
    );
  });

  await test("preview routes return obsSync payload", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "routes", "mia_paint.js"), "utf8");
    assert.match(src, /obsSync/);
    assert.match(src, /MIA_OBS_BODY_PREVIEW/);
    assert.match(src, /syncObs !== false/);
  });

  await test("dashboard passes syncObs true", () => {
    const html = fs.readFileSync(
      path.join(__dirname, "..", "mia-output-overlay", "mia-streamer-dashboard.html"),
      "utf8"
    );
    assert.match(html, /syncObs:\s*true/);
    assert.match(html, /setBodyObsStatus/);
    assert.match(html, /bodyPreviewObs/);
  });

  console.log("mia_graphics_studio_12n_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
