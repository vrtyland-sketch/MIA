"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const awayScene = require("../scripts/MIA_OBS_AWAY_SCENE");
const { ensureObsOverlayHands, ensureSceneExists } = require("../scripts/MIA_OBS_HANDS");

const SPLIT_URLS = {
  hostMode: "http://127.0.0.1:3000/host-mode-overlay.html",
  speech: "http://127.0.0.1:3000/speech-overlay.html",
  combo: "http://127.0.0.1:3000/combo-overlay.html",
  voice: "http://127.0.0.1:3000/mia-voice-overlay.html",
  status: "http://127.0.0.1:3000/entity-overlay.html",
  viewerStrip: "http://127.0.0.1:3000/viewer-strip-overlay.html",
  startupCheck: "http://127.0.0.1:3000/startup-check.html"
};

function createMockObs(initial = {}) {
  const scenes = [...(initial.scenes || ["SPINAK_ENGINE_GIFTS"])];
  const inputs = [...(initial.inputs || [])];
  const sceneItemsByScene = { ...(initial.sceneItemsByScene || {}) };
  const settings = { ...(initial.settings || {}) };
  const calls = [];

  function sceneItems(sceneName) {
    if (!sceneItemsByScene[sceneName]) sceneItemsByScene[sceneName] = [];
    return sceneItemsByScene[sceneName];
  }

  async function obsCall(requestType, requestData = {}) {
    calls.push({ requestType, requestData });

    switch (requestType) {
      case "GetSceneList":
        return { scenes: scenes.map((sceneName) => ({ sceneName })) };
      case "CreateScene": {
        if (!scenes.includes(requestData.sceneName)) {
          scenes.push(requestData.sceneName);
        }
        return { ok: true };
      }
      case "GetInputList":
        return { inputs };
      case "GetInputSettings":
        return { inputSettings: settings[requestData.inputName] || { url: "" } };
      case "CreateInput": {
        const inputName = requestData.inputName;
        inputs.push({ inputName, inputKind: requestData.inputKind || "browser_source" });
        settings[inputName] = { ...(requestData.inputSettings || {}) };
        if (requestData.sceneName) {
          sceneItems(requestData.sceneName).push({
            sourceName: inputName,
            sceneItemId: sceneItems(requestData.sceneName).length + 1,
            sceneItemEnabled: requestData.sceneItemEnabled === true
          });
        }
        return { sceneItemId: sceneItems(requestData.sceneName).length };
      }
      case "GetSceneItemList":
        return { sceneItems: sceneItems(requestData.sceneName) };
      case "CreateSceneItem": {
        const list = sceneItems(requestData.sceneName);
        const sceneItemId = list.length + 1;
        list.push({
          sourceName: requestData.sourceName,
          sceneItemId,
          sceneItemEnabled: requestData.sceneItemEnabled === true
        });
        return { sceneItemId };
      }
      case "SetSceneItemEnabled":
      case "SetInputSettings":
      case "SetSceneItemTransform":
      case "SetSceneItemIndex":
        return { ok: true };
      default:
        throw new Error(`unexpected obs call ${requestType}`);
    }
  }

  return { obsCall, calls, scenes, sceneItemsByScene };
}

test("resolveAwaySceneName defaults to SPINAK_NEJSEM_TU", () => {
  assert.equal(awayScene.resolveAwaySceneName({}), "SPINAK_NEJSEM_TU");
  assert.equal(awayScene.resolveAwaySceneName({ MIA_AWAY_SCENE: "CUSTOM_AWAY" }), "CUSTOM_AWAY");
});

test("buildAwayVisibilityOverrides enables host_mode in away scene", () => {
  const map = awayScene.buildAwayVisibilityOverrides();
  assert.equal(map.host_mode, true);
  assert.equal(map.entity, true);
  assert.equal(map.combo, false);
  assert.equal(map.bowl, false);
});

test("ensureSceneExists creates missing scene", async () => {
  const mock = createMockObs({ scenes: ["SPINAK_ENGINE_GIFTS"] });
  const result = await ensureSceneExists(mock.obsCall, "SPINAK_NEJSEM_TU");
  assert.equal(result.ok, true);
  assert.equal(result.created, true);
  assert.ok(mock.scenes.includes("SPINAK_NEJSEM_TU"));
});

test("ensureObsAwayScene wires host_mode visible in away scene", async () => {
  const mock = createMockObs({ scenes: ["SPINAK_ENGINE_GIFTS"] });
  const result = await awayScene.ensureObsAwayScene(mock.obsCall, {
    sceneName: "SPINAK_NEJSEM_TU",
    splitUrls: SPLIT_URLS
  });

  assert.equal(result.ok, true);
  assert.equal(result.sceneName, "SPINAK_NEJSEM_TU");
  assert.ok(mock.scenes.includes("SPINAK_NEJSEM_TU"));

  const awayItems = mock.sceneItemsByScene["SPINAK_NEJSEM_TU"] || [];
  const hostItem = awayItems.find((row) => row.sourceName === "MIA_HOST_MODE");
  assert.ok(hostItem, "MIA_HOST_MODE should be in away scene");
  assert.equal(hostItem.sceneItemEnabled, true);

  const comboItem = awayItems.find((row) => row.sourceName === "MIA_COMBO");
  if (comboItem) {
    assert.equal(comboItem.sceneItemEnabled, false);
  }
});

test("buildAwaySceneManifest lists required away layers", () => {
  const manifest = awayScene.buildAwaySceneManifest({ port: 3000 });
  assert.equal(manifest.sceneName, "SPINAK_NEJSEM_TU");
  const host = manifest.layers.find((row) => row.id === "host_mode");
  assert.ok(host);
  assert.equal(host.sceneItemEnabled, true);
});

test("visibilityOverrides flow through ensureObsOverlayHands", async () => {
  const mock = createMockObs({ scenes: ["SPINAK_NEJSEM_TU"] });
  await ensureObsOverlayHands(mock.obsCall, {
    sceneName: "SPINAK_NEJSEM_TU",
    splitUrls: SPLIT_URLS,
    visibilityOverrides: { host_mode: true, combo: false },
    onlyIds: ["host_mode", "combo"]
  });

  const items = mock.sceneItemsByScene["SPINAK_NEJSEM_TU"] || [];
  const host = items.find((row) => row.sourceName === "MIA_HOST_MODE");
  assert.equal(host?.sceneItemEnabled, true);
});
