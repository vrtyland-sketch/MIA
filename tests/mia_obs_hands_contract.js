"use strict";

const assert = require("assert");
const {
  buildObsRecommendedSpecs,
  resolveExistingInputName,
  ensureObsOverlayHands
} = require("../scripts/MIA_OBS_HANDS");

const SPLIT_URLS = {
  startupCheck: "http://127.0.0.1:3000/startup-check.html",
  speech: "http://127.0.0.1:3000/speech-overlay.html",
  combo: "http://127.0.0.1:3000/combo-overlay.html",
  bowl: "http://127.0.0.1:3000/kojnozrout-bowl-overlay.html",
  runtime: "http://127.0.0.1:3000/kojnozrout-runtime.html",
  voice: "http://127.0.0.1:3000/mia-voice-overlay.html",
  status: "http://127.0.0.1:3000/entity-overlay.html",
  giftMoment: "http://127.0.0.1:3000/gift-moment-overlay.html",
  evolutionToast: "http://127.0.0.1:3000/evolution-toast-overlay.html",
  backpack: "http://127.0.0.1:3000/kojnozrout-backpack-overlay.html",
  storyMoment: "http://127.0.0.1:3000/story-moment-overlay.html",
  t0Flyby: "http://127.0.0.1:3000/t0-flyby-overlay.html",
  duel: "http://127.0.0.1:3000/kojnozrout-duel-overlay.html",
  viewerStrip: "http://127.0.0.1:3000/viewer-strip-overlay.html",
  graphicsPreview: "http://127.0.0.1:3000/mia-graphics-preview.html",
  miaHead: "http://127.0.0.1:3000/mia-body-part-overlay.html?part=head",
  miaEyes: "http://127.0.0.1:3000/mia-body-part-overlay.html?part=eyes",
  miaHands: "http://127.0.0.1:3000/mia-body-part-overlay.html?part=hands",
  miaFeet: "http://127.0.0.1:3000/mia-body-part-overlay.html?part=feet",
  miaTorso: "http://127.0.0.1:3000/mia-body-part-overlay.html?part=torso"
};

function createMockObs(initial = {}) {
  const inputs = [...(initial.inputs || [])];
  const sceneItems = [...(initial.sceneItems || [])];
  const settings = { ...(initial.settings || {}) };
  const calls = [];

  async function obsCall(requestType, requestData = {}) {
    calls.push({ requestType, requestData });

    switch (requestType) {
      case "GetInputList":
        return { inputs };
      case "GetInputSettings":
        return {
          inputSettings: settings[requestData.inputName] || { url: "" }
        };
      case "CreateInput": {
        const inputName = requestData.inputName;
        inputs.push({ inputName, inputKind: requestData.inputKind || "browser_source" });
        settings[inputName] = { ...(requestData.inputSettings || {}) };
        if (requestData.sceneName) {
          sceneItems.push({
            sourceName: inputName,
            sceneItemId: sceneItems.length + 1,
            sceneItemEnabled: requestData.sceneItemEnabled === true
          });
        }
        return { sceneItemId: sceneItems.length };
      }
      case "GetSceneItemList":
        return {
          sceneItems: sceneItems.filter(() => requestData.sceneName === (initial.sceneName || "SPINAK_ENGINE_GIFTS"))
        };
      case "CreateSceneItem": {
        const sceneItemId = sceneItems.length + 1;
        sceneItems.push({
          sourceName: requestData.sourceName,
          sceneItemId,
          sceneItemEnabled: requestData.sceneItemEnabled === true
        });
        return { sceneItemId };
      }
      case "SetSceneItemEnabled":
        return { ok: true };
      case "SetInputSettings":
        settings[requestData.inputName] = {
          ...(settings[requestData.inputName] || {}),
          ...(requestData.inputSettings || {})
        };
        return { ok: true };
      case "SetSceneItemTransform":
        return { ok: true };
      default:
        throw new Error(`unexpected obs call ${requestType}`);
    }
  }

  return { obsCall, inputs, sceneItems, settings, calls };
}

function testManifest() {
  const specs = buildObsRecommendedSpecs(SPLIT_URLS);
  assert.ok(specs.length >= 20, "obs recommended manifest should cover split overlays + MIA body");
  const startup = specs.find((row) => row.id === "startup");
  assert.ok(startup, "startup spec missing");
  assert.strictEqual(startup.inputName, "MIA_STARTUP_CHECK");
  assert.strictEqual(startup.width, 1920);
}

function testAliasResolution() {
  const inputs = [
    { inputName: "MIA_BUBBLE", inputKind: "browser_source" },
    { inputName: "KOJNOZROUT_RUNTIME", inputKind: "browser_source" }
  ];
  const urlByInput = {
    MIA_BUBBLE: "http://127.0.0.1:3000/speech-overlay.html",
    KOJNOZROUT_RUNTIME: "http://127.0.0.1:3000/kojnozrout-runtime.html"
  };
  const speechSpec = buildObsRecommendedSpecs(SPLIT_URLS).find((row) => row.id === "speech");
  const runtimeSpec = buildObsRecommendedSpecs(SPLIT_URLS).find((row) => row.id === "runtime");

  assert.strictEqual(resolveExistingInputName(speechSpec, inputs, urlByInput), "MIA_BUBBLE");
  assert.strictEqual(resolveExistingInputName(runtimeSpec, inputs, urlByInput), "KOJNOZROUT_RUNTIME");
}

async function testCreatesStartupWhenMissing() {
  const mock = createMockObs({ sceneName: "SPINAK_ENGINE_GIFTS" });
  const result = await ensureObsOverlayHands(mock.obsCall, {
    sceneName: "SPINAK_ENGINE_GIFTS",
    splitUrls: SPLIT_URLS,
    onlyIds: ["startup"],
    layoutLocked: true
  });

  assert.strictEqual(result.ok, true);
  assert.ok(result.created.includes("MIA_STARTUP_CHECK"), "should create startup source");
  assert.ok(
    mock.calls.some((call) => call.requestType === "CreateInput" && call.requestData.inputName === "MIA_STARTUP_CHECK"),
    "CreateInput for startup expected"
  );
}

async function testSkipsDuplicateSpeechAlias() {
  const mock = createMockObs({
    sceneName: "SPINAK_ENGINE_GIFTS",
    inputs: [{ inputName: "MIA_BUBBLE", inputKind: "browser_source" }],
    settings: {
      MIA_BUBBLE: { url: SPLIT_URLS.speech }
    },
    sceneItems: [{ sourceName: "MIA_BUBBLE", sceneItemId: 7, sceneItemEnabled: true }]
  });

  const result = await ensureObsOverlayHands(mock.obsCall, {
    sceneName: "SPINAK_ENGINE_GIFTS",
    splitUrls: SPLIT_URLS,
    onlyIds: ["speech"],
    layoutLocked: true
  });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.created.length, 0, "should not create MIA_SPEECH when MIA_BUBBLE exists");
  assert.ok(
    !mock.calls.some((call) => call.requestType === "CreateInput"),
    "no CreateInput when alias exists"
  );
}

async function run() {
  testManifest();
  testAliasResolution();
  await testCreatesStartupWhenMissing();
  await testSkipsDuplicateSpeechAlias();
  console.log("mia_obs_hands_contract OK");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
