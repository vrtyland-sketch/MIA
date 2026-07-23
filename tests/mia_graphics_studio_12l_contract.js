"use strict";

const assert = require("assert/strict");
const manifest = require("../scripts/MIA_OBS_LIVE_MANIFEST");
const { resolveBodySyncMode, applyBodySyncToSplitUrls } = require("../scripts/MIA_OBS_BODY_SYNC");
const { buildObsRecommendedSpecs, ensureObsOverlayHands } = require("../scripts/MIA_OBS_HANDS");
const { applyObsHands } = require("../scripts/obs_apply_hands");
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
  const sceneItems = [...(initial.sceneItems || [])];
  const settings = { ...(initial.settings || {}) };

  async function obsCall(requestType, requestData = {}) {
    switch (requestType) {
      case "GetInputList":
        return { inputs };
      case "GetInputSettings":
        return { inputSettings: settings[requestData.inputName] || { url: "" } };
      case "CreateInput": {
        const inputName = requestData.inputName;
        inputs.push({ inputName, inputKind: requestData.inputKind || "browser_source" });
        settings[inputName] = { ...(requestData.inputSettings || {}) };
        return { sceneItemId: sceneItems.length + 1 };
      }
      case "GetSceneItemList":
        return {
          sceneItems: sceneItems.filter(
            () => requestData.sceneName === (initial.sceneName || "SPINAK_ENGINE_GIFTS")
          )
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
      case "SetSceneItemTransform":
        return { ok: true };
      case "SetInputSettings":
        settings[requestData.inputName] = {
          ...(settings[requestData.inputName] || {}),
          ...(requestData.inputSettings || {})
        };
        return { ok: true };
      default:
        throw new Error(`unexpected obs call ${requestType}`);
    }
  }

  return { obsCall, settings };
}

(async () => {
  await test("buildSplitUrls applies hybrid sync for body parts", () => {
    const urls = manifest.buildSplitUrls(3000, { bodySync: "hybrid" });
    assert.match(urls.miaHead, /part=head/);
    assert.match(urls.miaHead, /sync=hybrid/);
    assert.match(urls.miaHands, /part=hands&sync=hybrid/);
    assert.match(urls.speech, /speech-overlay\.html/);
    assert.doesNotMatch(urls.speech, /sync=hybrid/);
  });

  await test("buildLiveManifest exposes bodySync and hybrid urls", () => {
    const live = manifest.buildLiveManifest({ port: 3000, bodySync: "hybrid" });
    assert.equal(live.bodySync, "hybrid");
    assert.match(live.splitUrls.miaEyes, /sync=hybrid/);
    const eyes = live.browserLayers.find((row) => row.id === "mia_eyes");
    assert.match(eyes.url, /sync=hybrid/);
  });

  await test("obs:apply-hands defaults body sync to hybrid", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "scripts", "obs_apply_hands.js"), "utf8");
    assert.match(src, /resolveHandsBodySyncMode/);
    assert.match(src, /bodySyncMode/);
    assert.match(src, /buildSplitUrls\(port, \{ bodySync: bodySyncMode \}\)/);
  });

  await test("ensureObsOverlayHands upgrades legacy body url to hybrid", async () => {
    const splitUrls = manifest.buildSplitUrls(3000, { bodySync: "hybrid" });
    const mock = createMockObs({
      sceneName: "SPINAK_ENGINE_GIFTS",
      inputs: [{ inputName: "MIA_HEAD", inputKind: "browser_source" }],
      settings: {
        MIA_HEAD: { url: "http://127.0.0.1:3000/mia-body-part-overlay.html?part=head" }
      },
      sceneItems: [{ sourceName: "MIA_HEAD", sceneItemId: 3, sceneItemEnabled: false }]
    });

    const result = await ensureObsOverlayHands(mock.obsCall, {
      sceneName: "SPINAK_ENGINE_GIFTS",
      splitUrls,
      onlyIds: ["mia_head"],
      layoutLocked: true
    });

    assert.equal(result.ok, true);
    assert.ok(result.configured.includes("MIA_HEAD"));
    assert.equal(mock.settings.MIA_HEAD.url, splitUrls.miaHead);
    const specs = buildObsRecommendedSpecs(splitUrls);
    assert.ok(specs.some((row) => row.id === "mia_head" && /sync=hybrid/.test(row.targetUrl)));
  });

  await test("resolveBodySyncMode honors env override", () => {
    const prev = process.env.MIA_OBS_BODY_SYNC;
    process.env.MIA_OBS_BODY_SYNC = "graphics";
    assert.equal(resolveBodySyncMode({}), "graphics");
    process.env.MIA_OBS_BODY_SYNC = "off";
    assert.equal(resolveBodySyncMode({}), "none");
    if (prev == null) delete process.env.MIA_OBS_BODY_SYNC;
    else process.env.MIA_OBS_BODY_SYNC = prev;
  });

  await test("applyObsHands exports bodySyncMode in result shape", () => {
    assert.equal(typeof applyObsHands, "function");
    const urls = applyBodySyncToSplitUrls(
      { miaHead: "http://127.0.0.1:3000/mia-body-part-overlay.html?part=head" },
      "http://127.0.0.1:3000",
      "hybrid"
    );
    assert.match(urls.miaHead, /sync=hybrid/);
  });

  console.log("mia_graphics_studio_12l_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
